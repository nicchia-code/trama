import { spawn, execFile, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { createConnection, createServer, type Server, type Socket } from "node:net";
import { homedir, tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { TramaError, UsageError } from "./errors";
import { parseQuestionRequest, questionAborted, questionFailure, QuestionInterruptedError, unavailableQuestions, type QuestionContext, type QuestionHandler, type QuestionRequest, type QuestionResult } from "./questions";
import type { Project } from "./store";

export const QUESTION_ENDPOINT_ENV = "TRAMA_QUESTION_ENDPOINT";

export interface QuestionServer {
  endpoint: string;
  focus(focusedAt?: number): Promise<void>;
  dispose(): Promise<void>;
}

interface EditorRecord {
  projectId: string;
  windowId: string;
  endpoint: string;
  focusedAt: number;
}

interface ServerOptions {
  project: Project;
  windowId?: string;
  handler: QuestionHandler;
  runtimeDir?: string;
  focusedAt?: number;
  onClose?: () => void;
}

/** Canonical project roots, never the caller's current directory, identify an editor. */
export function questionProjectId(project: Project): string {
  let root = resolve(project.root);
  try { root = realpathSync(root); } catch { /* A missing root cannot have a live editor. */ }
  if (process.platform === "win32") root = root.toLowerCase();
  return createHash("sha256").update(root).digest("hex");
}

function runtimeDirectory(override?: string): string {
  if (override) return resolve(override);
  if (process.platform === "win32") return join(process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"), "Trama", "questions");
  return join(process.env.XDG_RUNTIME_DIR ?? tmpdir(), `trama-q-${process.getuid!()}`);
}

function outsideProject(directory: string, project: Project): void {
  const root = realpathSync(project.root);
  let location = resolve(directory);
  // Resolve existing parents as well: a symlink must not move runtime data into the project.
  let ancestor = location;
  const missing: string[] = [];
  while (!existsSync(ancestor)) {
    const parent = resolve(ancestor, "..");
    if (parent === ancestor) break;
    missing.unshift(relative(parent, ancestor));
    ancestor = parent;
  }
  location = resolve(realpathSync(ancestor), ...missing);
  const within = relative(root, location);
  if (within === "" || (!within.startsWith(`..${sep}`) && within !== ".." && !isAbsolute(within))) {
    throw new TramaError("Question runtime storage must be outside the project");
  }
}

function privateUnixDirectory(directory: string, create: boolean): boolean {
  if (create) mkdirSync(directory, { recursive: true, mode: 0o700 });
  try {
    const stat = lstatSync(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== process.getuid!()) return false;
    if (create) chmodSync(directory, 0o700);
    return (lstatSync(directory).mode & 0o777) === 0o700;
  } catch { return false; }
}

function localEndpoint(endpoint: string): boolean {
  if (process.platform === "win32") return /^\\\\[.?]\\pipe\\trama-question-[a-f0-9-]+$/i.test(endpoint);
  if (!isAbsolute(endpoint)) return false;
  try {
    const stat = lstatSync(endpoint);
    return stat.isSocket() && stat.uid === process.getuid!() && (stat.mode & 0o077) === 0;
  } catch { return false; }
}

function recordValue(value: unknown): EditorRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<EditorRecord>;
  if (typeof record.projectId !== "string" || typeof record.windowId !== "string" || typeof record.endpoint !== "string" || typeof record.focusedAt !== "number" || !Number.isFinite(record.focusedAt)) return null;
  return record as EditorRecord;
}

function records(directory: string, projectId: string): EditorRecord[] {
  const found: EditorRecord[] = [];
  let names: string[];
  try { names = readdirSync(directory); } catch { return found; }
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    try {
      const path = join(directory, name);
      const stat = lstatSync(path);
      if (!stat.isFile() || stat.isSymbolicLink()) continue;
      if (process.platform !== "win32" && (stat.uid !== process.getuid!() || (stat.mode & 0o077) !== 0)) continue;
      const record = recordValue(JSON.parse(readFileSync(path, "utf8")));
      if (record?.projectId === projectId) found.push(record);
    } catch { /* Incomplete, invalid and stale discovery files do not identify live editors. */ }
  }
  return found;
}

/** Return complete lines without retaining any already-consumed question content. */
function lines(stream: NodeJS.ReadableStream, receive: (line: string) => void): () => void {
  let buffer = "";
  const data = (chunk: string | Buffer) => {
    buffer += chunk.toString();
    let end: number;
    while ((end = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, end);
      buffer = buffer.slice(end + 1);
      receive(line);
    }
  };
  stream.on("data", data);
  return () => { stream.removeListener("data", data); buffer = ""; };
}

interface EditorConnection { socket: Socket; record: EditorRecord }

function connectEditor(endpoint: string, projectId: string, signal: AbortSignal | undefined, sockets: Set<Socket>): Promise<EditorConnection | null> {
  if (signal?.aborted) return Promise.reject(questionAborted());
  if (!localEndpoint(endpoint)) return Promise.resolve(null);
  return new Promise((accept, reject) => {
    const socket = createConnection({ path: endpoint });
    socket.setEncoding("utf8");
    sockets.add(socket);
    let done = false;
    const finish = (editor: EditorConnection | null) => {
      if (done) return;
      done = true;
      stopLines();
      socket.removeListener("close", lost);
      socket.removeListener("end", lost);
      socket.removeListener("error", lost);
      // Keep errors handled between discovery and submission, including unused probe sockets.
      socket.on("error", () => {});
      if (!editor) socket.destroy();
      if (signal?.aborted) { socket.destroy(); reject(questionAborted()); }
      else accept(editor);
    };
    const lost = () => finish(null);
    const stopLines = lines(socket, (line) => {
      try {
        const value = JSON.parse(line) as { type?: unknown };
        const record = recordValue(value);
        finish(value.type === "ready" && record?.projectId === projectId && record.endpoint === endpoint ? { socket, record } : null);
      } catch { finish(null); }
    });
    socket.on("error", lost);
    socket.on("close", lost);
    socket.on("end", lost);
    socket.once("connect", () => socket.write(`${JSON.stringify({ type: "hello", projectId })}\n`));
  });
}

function resultValue(value: unknown, request: QuestionRequest): QuestionResult | null {
  if (!value || typeof value !== "object") return null;
  const result = value as Record<string, unknown>;
  if (result.status !== "answered" || !result.answers || typeof result.answers !== "object" || Array.isArray(result.answers)) return null;
  const answers = result.answers as Record<string, unknown>;
  if (Object.keys(answers).length !== request.questions.length) return null;
  for (const question of request.questions) {
    if (!Object.hasOwn(answers, question.id)) return null;
    const value = answers[question.id];
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const answer = value as Record<string, unknown>;
    if (answer.status === "skipped") {
      if (Object.keys(answer).some((key) => key !== "status")) return null;
      continue;
    }
    if (answer.status !== "answered" || !Array.isArray(answer.selected)) return null;
    if (!question.multi && answer.selected.length > 1) return null;
    if (answer.selected.some((label) => typeof label !== "string" || !question.options.some((option) => option.label === label))) return null;
    if (answer.text !== undefined && (typeof answer.text !== "string" || answer.text.trim() === "")) return null;
    if (answer.selected.length === 0 && answer.text === undefined) return null;
  }
  return result as unknown as QuestionResult;
}

function submit(editor: EditorConnection, projectId: string, request: QuestionRequest, context: QuestionContext): Promise<QuestionResult> {
  const { socket } = editor;
  if (context.signal?.aborted) return Promise.reject(questionAborted());
  if (socket.destroyed || socket.readableEnded) return Promise.resolve(unavailableQuestions());
  return new Promise((accept, reject) => {
    let done = false;
    let submitted = false;
    const finish = (result?: QuestionResult, error?: Error) => {
      if (done) return;
      done = true;
      stopLines();
      socket.removeListener("end", lost);
      socket.removeListener("close", lost);
      socket.removeListener("error", lost);
      socket.destroy();
      if (context.signal?.aborted) reject(questionAborted());
      else if (error) reject(error);
      else accept(result!);
    };
    const lost = () => {
      if (submitted) finish(undefined, new QuestionInterruptedError());
      else finish(unavailableQuestions());
    };
    const stopLines = lines(socket, (line) => {
      try {
        const value: unknown = JSON.parse(line);
        if (value && typeof value === "object" && "error" in value) {
          const error = value.error;
          if (!error || typeof error !== "object" || !("code" in error) || !("message" in error) || typeof error.code !== "string" || typeof error.message !== "string") { lost(); return; }
          finish(undefined, error.code === "editor-interrupted" ? new QuestionInterruptedError()
            : error.code === "cancelled" ? questionAborted()
            : error.code === "invalid-input" ? new UsageError(error.message) : new TramaError(error.message));
          return;
        }
        const result = resultValue(value, request);
        if (!result) lost();
        else finish(result);
      } catch { lost(); }
    });
    socket.on("error", lost);
    socket.on("end", lost);
    socket.on("close", lost);
    // From this write onwards the validated round belongs to this editor: never reroute it.
    submitted = true;
    socket.write(`${JSON.stringify({ type: "ask", projectId, request, fromTramaTerminal: context.fromTramaTerminal === true })}\n`);
  });
}

/** Connect and identify editors before sending the validated round to exactly one window. */
export async function askEditor(project: Project, request: QuestionRequest, context: QuestionContext, options: { env?: Record<string, string | undefined>; runtimeDir?: string } = {}): Promise<QuestionResult> {
  const validated = parseQuestionRequest(request);
  if (context.signal?.aborted) throw questionAborted();
  const projectId = questionProjectId(project);
  const sockets = new Set<Socket>();
  const abort = () => { for (const socket of sockets) socket.destroy(); };
  context.signal?.addEventListener("abort", abort, { once: true });
  try {
    const endpoint = (options.env ?? process.env)[QUESTION_ENDPOINT_ENV];
    let editor: EditorConnection | null;
    if (endpoint !== undefined) {
      editor = await connectEditor(endpoint, projectId, context.signal, sockets);
    } else {
      const directory = runtimeDirectory(options.runtimeDir);
      const privateDirectory = process.platform === "win32" ? await privateWindowsDirectory(directory, context.signal) : privateUnixDirectory(directory, false);
      if (!privateDirectory) return unavailableQuestions();
      const candidates = records(directory, projectId);
      const live = (await Promise.all(candidates.map((record) => connectEditor(record.endpoint, projectId, context.signal, sockets))))
        .filter((connection): connection is EditorConnection => connection !== null && !connection.socket.destroyed && !connection.socket.readableEnded)
        .sort((a, b) => b.record.focusedAt - a.record.focusedAt || a.record.windowId.localeCompare(b.record.windowId));
      editor = live[0] ?? null;
      for (const unused of live.slice(1)) unused.socket.destroy();
    }
    if (context.signal?.aborted) throw questionAborted();
    if (!editor) return unavailableQuestions();
    return await submit(editor, projectId, validated, { ...context, fromTramaTerminal: endpoint !== undefined });
  } finally {
    context.signal?.removeEventListener("abort", abort);
    for (const socket of sockets) socket.destroy();
    sockets.clear();
  }
}

interface ChannelConnection {
  send(value: object, finish?: boolean): void;
  close(): void;
  receive(listener: (line: string) => void): void;
  closed(listener: () => void): void;
}

function unixConnection(socket: Socket): ChannelConnection {
  socket.setEncoding("utf8");
  socket.on("error", () => socket.destroy());
  return {
    send(value, finish = false) {
      const line = `${JSON.stringify(value)}\n`;
      if (finish) socket.end(line);
      else socket.write(line);
    },
    close: () => socket.destroy(),
    receive: (listener) => { const stop = lines(socket, listener); socket.once("close", stop); },
    closed: (listener) => { socket.once("close", listener); socket.once("end", listener); },
  };
}

export async function createQuestionServer(options: ServerOptions): Promise<QuestionServer> {
  const directory = runtimeDirectory(options.runtimeDir);
  outsideProject(directory, options.project);
  const id = randomUUID();
  const endpoint = process.platform === "win32" ? `\\\\.\\pipe\\trama-question-${id}` : join(directory, `${id}.sock`);
  if (process.platform !== "win32" && Buffer.byteLength(endpoint) > (process.platform === "darwin" ? 103 : 107)) throw new TramaError("Question runtime socket path is too long");
  const recordPath = join(directory, `${id}.json`);
  const record: EditorRecord = { projectId: questionProjectId(options.project), windowId: options.windowId ?? id, endpoint, focusedAt: options.focusedAt ?? Date.now() };
  const connections = new Set<ChannelConnection>();
  let native: Server | undefined;
  let windows: WindowsListener | undefined;
  let published = false;
  let closed = false;
  let closing: Promise<void> | undefined;

  const publish = () => {
    const temporary = `${recordPath}.tmp`;
    try {
      writeFileSync(temporary, JSON.stringify(record), { mode: 0o600, flag: "wx" });
      renameSync(temporary, recordPath);
    } finally { rmSync(temporary, { force: true }); }
  };
  const dispose = (): Promise<void> => {
    if (closed) return closing ?? Promise.resolve();
    closed = true;
    closing = (async () => {
      try { if (published) options.onClose?.(); }
      finally {
        for (const connection of connections) connection.close();
        connections.clear();
        try {
          if (windows) await windows.dispose();
          if (native?.listening) await new Promise<void>((done, fail) => native!.close((error) => error ? fail(error) : done()));
        } finally { rmSync(recordPath, { force: true }); }
      }
    })();
    return closing;
  };
  const lostListener = () => { if (!closed) void dispose().catch(() => {}); };
  const accept = (connection: ChannelConnection) => {
    if (!published || closed) { connection.close(); return; }
    connections.add(connection);
    const controller = new AbortController();
    let phase: "hello" | "ready" | "waiting" | "done" = "hello";
    connection.closed(() => {
      connections.delete(connection);
      if (phase !== "done") controller.abort();
      phase = "done";
    });
    const finish = (value: object) => {
      if (phase === "done" || closed || controller.signal.aborted) return;
      phase = "done";
      connection.send(value, true);
    };
    connection.receive((line) => {
      if (phase === "done" || phase === "waiting") return;
      try {
        const value: unknown = JSON.parse(line);
        if (!value || typeof value !== "object" || Array.isArray(value)) throw new UsageError("Question channel message must be an object");
        const message = value as Record<string, unknown>;
        if (message.projectId !== record.projectId) { finish(unavailableQuestions()); return; }
        if (phase === "hello" && message.type === "hello") {
          phase = "ready";
          connection.send({ type: "ready", ...record });
          return;
        }
        if (phase !== "ready" || message.type !== "ask") throw new UsageError("Identify the editor before submitting a question round");
        const request = parseQuestionRequest(message.request);
        const fromTramaTerminal = message.fromTramaTerminal === true;
        phase = "waiting";
        void Promise.resolve().then(() => {
          if (controller.signal.aborted || closed) throw questionAborted();
          return options.handler(options.project, request, { signal: controller.signal, fromTramaTerminal });
        }).then((result) => finish(result.status === "unavailable" ? questionFailure(new QuestionInterruptedError()) : result), (error) => finish(questionFailure(error)));
      } catch (error) { finish(questionFailure(error)); }
    });
  };

  try {
    if (process.platform === "win32") {
      windows = await windowsListener(directory, `trama-question-${id}`, accept, lostListener);
    } else {
      if (!privateUnixDirectory(directory, true)) throw new TramaError("Question runtime directory is not owned exclusively by the current user");
      native = createServer((socket) => accept(unixConnection(socket)));
      native.on("close", lostListener);
      native.on("error", () => { if (published) lostListener(); });
      await new Promise<void>((done, fail) => {
        native!.once("error", fail);
        native!.listen({ path: endpoint, readableAll: false, writableAll: false }, () => { native!.removeListener("error", fail); done(); });
      });
      chmodSync(endpoint, 0o600);
    }
    if (closed) throw new TramaError("The editor question listener closed during startup");
    publish();
    published = true;
  } catch (error) { await dispose(); throw error; }

  return {
    endpoint,
    async focus(focusedAt = Date.now()) {
      if (closed) return;
      if (!Number.isFinite(focusedAt)) throw new UsageError("Editor focus recency must be finite");
      record.focusedAt = focusedAt;
      publish();
    },
    dispose,
  };
}

function powershell(): string {
  return join(process.env.SystemRoot ?? "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
}

function powershellArguments(script: string): string[] {
  return ["-NoLogo", "-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(script, "utf16le").toString("base64")];
}

async function privateWindowsDirectory(directory: string, signal?: AbortSignal): Promise<boolean> {
  if (!existsSync(directory)) return false;
  const script = `$ErrorActionPreference = 'Stop'
$dir = Get-Item -LiteralPath $env:TRAMA_QUESTION_RUNTIME_DIR
if (-not $dir.PSIsContainer -or ($dir.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Invalid runtime directory' }
$sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
$acl = $dir.GetAccessControl()
if (-not $acl.AreAccessRulesProtected -or $acl.GetOwner([Security.Principal.SecurityIdentifier]) -ne $sid) { throw 'Runtime directory is not private' }
foreach ($rule in $acl.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier])) {
  if ($rule.AccessControlType -eq [Security.AccessControl.AccessControlType]::Allow -and $rule.IdentityReference -ne $sid) { throw 'Runtime directory is not private' }
}`;
  return new Promise((done, fail) => {
    execFile(powershell(), powershellArguments(script), { windowsHide: true, signal, env: { ...process.env, TRAMA_QUESTION_RUNTIME_DIR: directory } }, (error) => {
      if (signal?.aborted) fail(questionAborted());
      else done(!error);
    });
  });
}

interface WindowsListener { dispose(): Promise<void> }

/**
 * Windows' default named-pipe DACL permits Everyone/anonymous reads. Node cannot
 * restrict it, so OS Windows PowerShell/.NET Framework creates every instance
 * with PipeSecurity instead. The helper relays question and answer bytes in
 * memory only. A missing/failed helper fails closed.
 */
async function windowsListener(directory: string, name: string, accept: (connection: ChannelConnection) => void, lost: () => void): Promise<WindowsListener> {
  const script = `$ErrorActionPreference = 'Stop'
Add-Type -ReferencedAssemblies 'System.dll','System.Core.dll' -TypeDefinition @'
${WINDOWS_PIPE_SOURCE}
'@
[TramaQuestionPipe]::Run($env:TRAMA_QUESTION_RUNTIME_DIR, $env:TRAMA_QUESTION_PIPE_NAME)`;
  const child: ChildProcessWithoutNullStreams = spawn(powershell(), powershellArguments(script), {
    windowsHide: true, stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, TRAMA_QUESTION_RUNTIME_DIR: directory, TRAMA_QUESTION_PIPE_NAME: name },
  });
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  const connections = new Map<string, { line?: (line: string) => void; close?: () => void }>();
  let diagnostic = "";
  child.stderr.on("data", (chunk: string) => { diagnostic = (diagnostic + chunk).slice(-4096); });
  let ready = false;
  let stopping = false;
  let ended = false;
  let resolveStartup!: () => void;
  let rejectStartup!: (error: Error) => void;
  const startup = new Promise<void>((done, fail) => { resolveStartup = done; rejectStartup = fail; });
  let resolveExit!: () => void;
  const exit = new Promise<void>((done) => { resolveExit = done; });
  const send = (operation: string, id: string, value?: object) => {
    if (ended || child.stdin.destroyed) return;
    const payload = value === undefined ? "" : `\t${Buffer.from(JSON.stringify(value)).toString("base64")}`;
    child.stdin.write(`${operation}\t${id}${payload}\n`);
  };
  const closed = () => {
    if (ended) return;
    ended = true;
    stopLines();
    if (!ready) rejectStartup(new TramaError(`Could not start the private Windows question pipe${diagnostic ? `: ${diagnostic.trim()}` : ""}`));
    else if (!stopping) lost();
    for (const connection of connections.values()) connection.close?.();
    connections.clear();
    resolveExit();
  };
  child.on("error", (error) => { diagnostic = error.message; closed(); });
  child.on("exit", closed);
  child.stdin.on("error", () => { child.kill(); });
  const stopLines = lines(child.stdout, (line) => {
    const [operation, id, payload] = line.replace(/\r$/, "").split("\t");
    if (operation === "ready") { ready = true; resolveStartup(); return; }
    if (operation === "error") { diagnostic = Buffer.from(id ?? "", "base64").toString(); child.kill(); return; }
    if (!id) return;
    if (operation === "open") {
      const callbacks: { line?: (line: string) => void; close?: () => void } = {};
      connections.set(id, callbacks);
      accept({
        send: (value, finish = false) => send(finish ? "end" : "write", id, value),
        close: () => send("close", id),
        receive: (listener) => { callbacks.line = listener; },
        closed: (listener) => { callbacks.close = listener; },
      });
    } else if (operation === "data") {
      connections.get(id)?.line?.(Buffer.from(payload ?? "", "base64").toString("utf8"));
    } else if (operation === "close") {
      connections.get(id)?.close?.();
      connections.delete(id);
    }
  });
  try { await startup; }
  catch (error) { child.kill(); await exit; throw error; }
  return { async dispose() { stopping = true; if (!ended) child.stdin.end("stop\n"); await exit; } };
}

// Framework APIs are available in OS Windows PowerShell 5.1; PowerShell 7 is not required.
const WINDOWS_PIPE_SOURCE = String.raw`
using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Pipes;
using System.Security.AccessControl;
using System.Security.Principal;
using System.Text;
using System.Threading;

public static class TramaQuestionPipe {
  sealed class Connection {
    public NamedPipeServerStream Pipe;
    public StreamWriter Writer;
    public readonly object Gate = new object();
  }
  static readonly object Output = new object();
  static readonly object Gate = new object();
  static readonly Dictionary<string, Connection> Connections = new Dictionary<string, Connection>();
  static NamedPipeServerStream Pending;
  static bool Stopping;
  static int Sequence;

  static void Emit(string line) { lock (Output) { Console.Out.WriteLine(line); Console.Out.Flush(); } }
  static string Encode(string text) { return Convert.ToBase64String(Encoding.UTF8.GetBytes(text)); }
  static void Close(string id) {
    Connection connection;
    lock (Gate) {
      if (!Connections.TryGetValue(id, out connection)) return;
      Connections.Remove(id);
    }
    connection.Pipe.Dispose();
    Emit("close\t" + id);
  }
  static void Read(string id, Connection connection) {
    try {
      var reader = new StreamReader(connection.Pipe, new UTF8Encoding(false, true));
      string line;
      while ((line = reader.ReadLine()) != null) Emit("data\t" + id + "\t" + Encode(line));
    } catch (IOException) { } catch (ObjectDisposedException) { } catch (DecoderFallbackException) { }
    finally { Close(id); }
  }
  static NamedPipeServerStream Create(string name, PipeSecurity security) {
    return new NamedPipeServerStream(name, PipeDirection.InOut, NamedPipeServerStream.MaxAllowedServerInstances,
      PipeTransmissionMode.Byte, PipeOptions.Asynchronous, 65536, 65536, security);
  }
  static void Accept(string name, PipeSecurity security, NamedPipeServerStream first) {
    var pipe = first;
    try {
      while (true) {
        pipe.WaitForConnection();
        var connection = new Connection { Pipe = pipe, Writer = new StreamWriter(pipe, new UTF8Encoding(false)) { AutoFlush = true } };
        string id;
        lock (Gate) {
          if (Stopping) { pipe.Dispose(); return; }
          id = (++Sequence).ToString();
          Connections.Add(id, connection);
          // Keep a secured listening instance alive before announcing the accepted one.
          Pending = Create(name, security);
          pipe = Pending;
        }
        Emit("open\t" + id);
        ThreadPool.QueueUserWorkItem(delegate { Read(id, connection); });
      }
    } catch (Exception error) {
      lock (Gate) { if (!Stopping) Emit("error\t" + Encode(error.Message)); }
    }
  }
  static void Send(string operation, string id, string payload) {
    Connection connection;
    lock (Gate) { if (!Connections.TryGetValue(id, out connection)) return; }
    try {
      lock (connection.Gate) {
        connection.Writer.WriteLine(Encoding.UTF8.GetString(Convert.FromBase64String(payload)));
        if (operation == "end") connection.Pipe.WaitForPipeDrain();
      }
    } catch (IOException) { } catch (ObjectDisposedException) { }
    finally { if (operation == "end") Close(id); }
  }
  static void PrivateDirectory(string path, SecurityIdentifier sid) {
    var security = new DirectorySecurity();
    security.SetAccessRuleProtection(true, false);
    security.SetOwner(sid);
    security.AddAccessRule(new FileSystemAccessRule(sid, FileSystemRights.FullControl,
      InheritanceFlags.ContainerInherit | InheritanceFlags.ObjectInherit, PropagationFlags.None, AccessControlType.Allow));
    if (Directory.Exists(path)) {
      var info = new DirectoryInfo(path);
      if ((info.Attributes & FileAttributes.ReparsePoint) != 0) throw new IOException("Runtime directory must not be a reparse point");
      var old = info.GetAccessControl();
      if (!old.AreAccessRulesProtected || !old.GetOwner(typeof(SecurityIdentifier)).Equals(sid)) throw new IOException("Runtime directory must be private and owned by the current user");
      foreach (FileSystemAccessRule rule in old.GetAccessRules(true, true, typeof(SecurityIdentifier)))
        if (rule.AccessControlType == AccessControlType.Allow && !rule.IdentityReference.Equals(sid)) throw new IOException("Runtime directory is accessible to another user");
    } else Directory.CreateDirectory(path, security);
  }
  public static void Run(string directory, string name) {
    Console.InputEncoding = new UTF8Encoding(false);
    Console.OutputEncoding = new UTF8Encoding(false);
    var sid = WindowsIdentity.GetCurrent().User;
    PrivateDirectory(directory, sid);
    var security = new PipeSecurity();
    security.SetAccessRuleProtection(true, false);
    security.SetOwner(sid);
    security.AddAccessRule(new PipeAccessRule(new SecurityIdentifier(WellKnownSidType.NetworkSid, null), PipeAccessRights.FullControl, AccessControlType.Deny));
    security.AddAccessRule(new PipeAccessRule(sid, PipeAccessRights.FullControl, AccessControlType.Allow));
    Pending = Create(name, security);
    var first = Pending;
    var accepting = new Thread(delegate() { Accept(name, security, first); });
    accepting.IsBackground = true;
    accepting.Start();
    Emit("ready");
    try {
      string line;
      while ((line = Console.ReadLine()) != null && line != "stop") {
        var fields = line.Split(new char[] { '\t' }, 3);
        if (fields.Length < 2) continue;
        var operation = fields[0];
        var id = fields[1];
        if (operation == "close") Close(id);
        else if (fields.Length == 3 && (operation == "write" || operation == "end")) {
          var payload = fields[2];
          ThreadPool.QueueUserWorkItem(delegate { Send(operation, id, payload); });
        }
      }
    } finally {
      string[] ids;
      lock (Gate) {
        Stopping = true;
        Pending.Dispose();
        ids = new string[Connections.Count];
        Connections.Keys.CopyTo(ids, 0);
      }
      foreach (var id in ids) Close(id);
    }
  }
}
`;
