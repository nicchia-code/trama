import { spawn, execFile, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { createConnection, createServer, type Server, type Socket } from "node:net";
import { homedir, tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { TramaError, UsageError } from "./errors";
import { type AgentOrigin, CURSOR_AGENT_ENV } from "./announcements";
import type { CursorHook } from "./cursor-chat";
import { parseQuestionRequest, questionAborted, questionFailure, QuestionInterruptedError, unavailableQuestions, type QuestionContext, type QuestionHandler, type QuestionRequest, type QuestionResult } from "./questions";
import type { CopilotHook } from "./copilot-chat";
import { type Project, projectAt } from "./store";

export const QUESTION_ENDPOINT_ENV = "TRAMA_QUESTION_ENDPOINT";


export type CoordinatorJson = null | boolean | number | string | CoordinatorJson[] | { [key: string]: CoordinatorJson };
export type CoordinatorMessage = { [key: string]: CoordinatorJson };

export interface CoordinatorLease {
  projectId: string;
  windowId: string;
  endpoint: string;
}


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
  /** A hook of Cursor's chat, forwarded by `trama cursor-hook`. */
  onCursorHook?: (hook: CursorHook) => void;
  /** A hook of Copilot's chat, forwarded by `trama copilot-hook`. */
  onCopilotHook?: (hook: CopilotHook) => void;
  /** A command of the agent changed something: where it ran, as Trama reports it. */
  onActivity?: (origin: AgentOrigin) => void;
  /** The agent in the terminal `terminal` (the hook of its agent said so) has settled: nothing is left to do. `root` is this window's project. */
  onAgentIdle?: (terminal: string, root: string) => void;
  /** A project-scoped runtime coordinator event, independent of question rounds. */
  onCoordinatorMessage?: (message: CoordinatorMessage) => CoordinatorJson | void | Promise<CoordinatorJson | void>;
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

function coordinatorMessage(value: unknown, seen = new Set<object>()): CoordinatorMessage | null {
  const valid = (item: unknown): boolean => {
    if (item === null || typeof item === "string" || typeof item === "boolean") return true;
    if (typeof item === "number") return Number.isFinite(item);
    if (typeof item !== "object" || seen.has(item)) return false;
    seen.add(item);
    const ok = Array.isArray(item)
      ? item.every(valid)
      : (Object.getPrototypeOf(item) === Object.prototype || Object.getPrototypeOf(item) === null)
        && Object.values(item).every(valid);
    seen.delete(item);
    return ok;
  };
  return value !== null && typeof value === "object" && !Array.isArray(value) && valid(value) ? value as CoordinatorMessage : null;
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

function coordinatorLeaseValue(value: unknown, projectId: string): CoordinatorLease | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const lease = value as Partial<CoordinatorLease>;
  const endpointLooksLocal = typeof lease.endpoint === "string" && (process.platform === "win32"
    ? /^\\\\[.?]\\pipe\\trama-question-[a-f0-9-]+$/i.test(lease.endpoint)
    : isAbsolute(lease.endpoint));
  if (Object.keys(value).sort().join(",") !== "endpoint,projectId,windowId"
    || lease.projectId !== projectId || typeof lease.windowId !== "string" || lease.windowId === "" || !endpointLooksLocal) return null;
  return lease as CoordinatorLease;
}

function readCoordinatorLease(path: string, projectId: string): CoordinatorLease | null | undefined {
  try {
    const stat = lstatSync(path);
    if (!stat.isFile() || stat.isSymbolicLink()
      || (process.platform !== "win32" && (stat.uid !== process.getuid!() || (stat.mode & 0o077) !== 0))) return null;
    return coordinatorLeaseValue(JSON.parse(readFileSync(path, "utf8")), projectId);
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "ENOENT" ? undefined : null;
  }
}

function sameCoordinatorLease(left: CoordinatorLease | null | undefined, right: CoordinatorLease): boolean {
  return !!left && left.projectId === right.projectId && left.windowId === right.windowId && left.endpoint === right.endpoint;
}

function coordinatorLeasePath(directory: string, projectId: string): string {
  return join(directory, `${projectId}.lease`);
}

async function probeCoordinatorOwner(lease: CoordinatorLease): Promise<"live" | "stale" | "unverified"> {
  const controller = new AbortController();
  const sockets = new Set<Socket>();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
    for (const socket of sockets) socket.destroy();
  }, 2_000);
  try {
    const editor = await connectEditor(lease.endpoint, lease.projectId, controller.signal, sockets);
    if (!editor) return timedOut ? "unverified" : "stale";
    if (editor.record.windowId !== lease.windowId || editor.record.endpoint !== lease.endpoint
      || editor.record.projectId !== lease.projectId) return "unverified";
    return "live";
  } catch {
    return timedOut ? "unverified" : "stale";
  } finally {
    clearTimeout(timer);
    for (const socket of sockets) socket.destroy();
  }
}

/** Claim the project coordinator role for a discovered live editor window. */
export async function acquireCoordinatorLease(
  project: Project,
  owner: Pick<CoordinatorLease, "windowId" | "endpoint">,
  options: { runtimeDir?: string } = {},
): Promise<CoordinatorLease | null> {
  const projectId = questionProjectId(project);
  let directory: string;
  try {
    directory = runtimeDirectory(options.runtimeDir);
    outsideProject(directory, project);
  } catch { return null; }
  const privateDirectory = process.platform === "win32" ? await privateWindowsDirectory(directory) : privateUnixDirectory(directory, false);
  if (!privateDirectory || !owner.windowId || !owner.endpoint) return null;

  const path = coordinatorLeasePath(directory, projectId);
  const lease: CoordinatorLease = { projectId, windowId: owner.windowId, endpoint: owner.endpoint };
  const current = readCoordinatorLease(path, projectId);
  if (current === null) return null;
  if (current && !sameCoordinatorLease(current, lease) && await probeCoordinatorOwner(current) !== "stale") return null;

  if (!records(directory, projectId).some((record) =>
    record.windowId === lease.windowId && record.endpoint === lease.endpoint)) return null;
  if (await probeCoordinatorOwner(lease) !== "live") return null;
  if (current && sameCoordinatorLease(current, lease)) return current;

  if (current) {
    if (!sameCoordinatorLease(readCoordinatorLease(path, projectId), current)) return null;
    try { unlinkSync(path); } catch { return null; }
  }
  try {
    writeFileSync(path, JSON.stringify(lease), { mode: 0o600, flag: "wx" });
    return lease;
  } catch {
    const winner = readCoordinatorLease(path, projectId);
    return winner && sameCoordinatorLease(winner, lease) ? winner : null;
  }
}

/** Confirm the lease owner is still the discovered, live editor for its project. */
export async function renewCoordinatorLease(
  project: Project,
  lease: CoordinatorLease,
  options: { runtimeDir?: string } = {},
): Promise<boolean> {
  const projectId = questionProjectId(project);
  if (lease.projectId !== projectId) return false;
  let directory: string;
  try {
    directory = runtimeDirectory(options.runtimeDir);
    outsideProject(directory, project);
  } catch { return false; }
  const privateDirectory = process.platform === "win32" ? await privateWindowsDirectory(directory) : privateUnixDirectory(directory, false);
  if (!privateDirectory || !sameCoordinatorLease(readCoordinatorLease(coordinatorLeasePath(directory, projectId), projectId), lease)
    || !records(directory, projectId).some((record) => record.windowId === lease.windowId && record.endpoint === lease.endpoint)) return false;
  return await probeCoordinatorOwner(lease) === "live";
}

/** Release only this window's lease, leaving another owner's claim untouched. */
export async function releaseCoordinatorLease(
  project: Project,
  lease: CoordinatorLease,
  options: { runtimeDir?: string } = {},
): Promise<boolean> {
  const projectId = questionProjectId(project);
  if (lease.projectId !== projectId) return false;
  let directory: string;
  try {
    directory = runtimeDirectory(options.runtimeDir);
    outsideProject(directory, project);
  } catch { return false; }
  const privateDirectory = process.platform === "win32" ? await privateWindowsDirectory(directory) : privateUnixDirectory(directory, false);
  const path = coordinatorLeasePath(directory, projectId);
  if (!privateDirectory || !sameCoordinatorLease(readCoordinatorLease(path, projectId), lease)) return false;
  try {
    if (!sameCoordinatorLease(readCoordinatorLease(path, projectId), lease)) return false;
    unlinkSync(path);
    return true;
  } catch { return false; }
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
        const value = JSON.parse(line) as { type?: unknown; caller?: unknown };
        const record = recordValue(value);
        finish(value.type === "ready" && record?.endpoint === endpoint && (record.projectId === projectId || value.caller === projectId) ? { socket, record } : null);
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
    socket.write(`${JSON.stringify({ type: "ask", projectId, request, fromTramaTerminal: context.fromTramaTerminal === true, fromCursorChat: context.fromCursorChat === true })}\n`);
  });
}

/** The live editor of the project that was focused last, found through the local discovery records; null without one. */
async function liveEditor(projectId: string, signal: AbortSignal | undefined, sockets: Set<Socket>, runtimeDir?: string): Promise<EditorConnection | null> {
  const directory = runtimeDirectory(runtimeDir);
  const privateDirectory = process.platform === "win32" ? await privateWindowsDirectory(directory, signal) : privateUnixDirectory(directory, false);
  if (!privateDirectory) return null;
  const live = (await Promise.all(records(directory, projectId).map((record) => connectEditor(record.endpoint, projectId, signal, sockets))))
    .filter((connection): connection is EditorConnection => connection !== null && !connection.socket.destroyed && !connection.socket.readableEnded)
    .sort((a, b) => b.record.focusedAt - a.record.focusedAt || a.record.windowId.localeCompare(b.record.windowId));
  for (const unused of live.slice(1)) unused.socket.destroy();
  return live[0] ?? null;
}

interface CoordinatorRelayResult {
  delivered: number;
  error?: "no-live-receiver";
  responses: CoordinatorMessage[];
}

async function relayCoordinatorMessage(
  project: Project,
  message: CoordinatorMessage,
  options: { runtimeDir?: string } = {},
): Promise<CoordinatorRelayResult> {
  const payload = coordinatorMessage(message);
  if (!payload) throw new UsageError("Coordinator message must be a JSON object");
  const projectId = questionProjectId(project);
  const directory = runtimeDirectory(options.runtimeDir);
  const privateDirectory = process.platform === "win32" ? await privateWindowsDirectory(directory) : privateUnixDirectory(directory, false);
  if (!privateDirectory) return { delivered: 0, error: "no-live-receiver", responses: [] };
  const candidates = records(directory, projectId);
  const probed = await Promise.all(candidates.map((record) => connectEditor(record.endpoint, projectId, undefined, new Set())));
  const connections = probed.filter((connection): connection is EditorConnection => {
    if (!connection) return false;
    const matched = !connection.socket.destroyed && !connection.socket.readableEnded
      && connection.record.projectId === projectId
      && candidates.some((record) => record.endpoint === connection.record.endpoint
        && record.windowId === connection.record.windowId && record.projectId === connection.record.projectId);
    if (!matched) connection.socket.destroy();
    return matched;
  });
  const responses: CoordinatorMessage[] = [];
  const delivered = await Promise.all(connections.map((connection) => {
    const messageId = randomUUID();
    return new Promise<boolean>((resolve) => {
      let done = false;
      const finish = (ok: boolean, response?: CoordinatorMessage) => {
        if (done) return;
        done = true;
        stopLines();
        connection.socket.removeListener("error", lost);
        connection.socket.removeListener("end", lost);
        connection.socket.removeListener("close", lost);
        connection.socket.destroy();
        if (response) responses.push(response);
        resolve(ok);
      };
      const lost = () => finish(false);
      const stopLines = lines(connection.socket, (line) => {
        try {
          const reply: unknown = JSON.parse(line);
          if (!reply || typeof reply !== "object" || Array.isArray(reply)) { finish(false); return; }
          const value = reply as Record<string, unknown>;
          const valid = value.type === "coordinator-received" && value.messageId === messageId;
          const response = coordinatorMessage(value.response);
          finish(valid, response ?? undefined);
        } catch { finish(false); }
      });
      connection.socket.on("error", lost);
      connection.socket.on("end", lost);
      connection.socket.on("close", lost);
      connection.socket.write(`${JSON.stringify({ type: "coordinator-message", projectId, messageId, message: payload })}\n`);
    });
  }));
  const count = delivered.filter(Boolean).length;
  return { delivered: count, ...(count === 0 ? { error: "no-live-receiver" as const } : {}), responses };
}

export async function sendCoordinatorMessage(
  project: Project,
  message: CoordinatorMessage,
  options: { runtimeDir?: string } = {},
): Promise<{ delivered: number; error?: "no-live-receiver" }> {
  const { delivered, error } = await relayCoordinatorMessage(project, message, options);
  return { delivered, ...(error ? { error } : {}) };
}

const commandMessages = new Set<Promise<unknown>>();

/**
 * Sends `message` to the project's editor while the command goes on. The executable calls `settleCoordinatorMessages`
 * before it exits, so the exit does not cut the message off; `undelivered` reports a message no editor received, and
 * `settled` runs once the attempt is over, delivered or not.
 */
export function sendCoordinatorMessageSoon(project: Project, message: CoordinatorMessage, undelivered: (reason: string) => void, settled: () => void = () => {}): void {
  const sent: Promise<unknown> = sendCoordinatorMessage(project, message)
    .then(({ delivered, error }) => { if (delivered === 0) undelivered(error ?? "no-live-receiver"); })
    .catch((error: unknown) => undelivered(error instanceof Error ? error.message : String(error)))
    .finally(() => { settled(); commandMessages.delete(sent); });
  commandMessages.add(sent);
}

/** Waits until every message sent by `sendCoordinatorMessageSoon` has been delivered or has failed. */
export async function settleCoordinatorMessages(): Promise<void> {
  await Promise.all(commandMessages);
}

/** Broadcasts a scoped read-only request to live project editors and returns their coordinator responses. */
export async function requestCoordinatorMessage(
  project: Project,
  message: CoordinatorMessage,
  options: { runtimeDir?: string } = {},
): Promise<CoordinatorMessage[]> {
  const { responses } = await relayCoordinatorMessage(project, message, options);
  return responses;
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
    const env = options.env ?? process.env;
    const endpoint = env[QUESTION_ENDPOINT_ENV];
    const editor = endpoint !== undefined
      ? await connectEditor(endpoint, projectId, context.signal, sockets)
      : await liveEditor(projectId, context.signal, sockets, options.runtimeDir);
    if (context.signal?.aborted) throw questionAborted();
    if (!editor) return unavailableQuestions();
    return await submit(editor, projectId, validated, { ...context, fromTramaTerminal: endpoint !== undefined, fromCursorChat: env[CURSOR_AGENT_ENV] === "1" });
  } finally {
    context.signal?.removeEventListener("abort", abort);
    for (const socket of sockets) socket.destroy();
    sockets.clear();
  }
}

/**
 * Hands a hook of Cursor's chat to the editor of its project and waits until the editor has taken it, for at most
 * `timeoutMs`. Returns whether an editor took it; never throws, since Cursor must not be held up.
 */
export async function sendCursorHook(hook: CursorHook, options: { timeoutMs?: number; runtimeDir?: string } = {}): Promise<boolean> {
  const controller = new AbortController();
  const sockets = new Set<Socket>();
  const timer = setTimeout(() => { controller.abort(); for (const socket of sockets) socket.destroy(); }, options.timeoutMs ?? 1000);
  try {
    const projectId = questionProjectId(projectAt(hook.root));
    const editor = await liveEditor(projectId, controller.signal, sockets, options.runtimeDir);
    if (!editor || controller.signal.aborted) return false;
    return await new Promise<boolean>((done) => {
      const { socket } = editor;
      socket.once("data", () => done(true));
      socket.once("close", () => done(false));
      socket.write(`${JSON.stringify({ type: "cursor-hook", projectId, hook })}\n`);
    });
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
    for (const socket of sockets) socket.destroy();
  }
}

/** Hands a Copilot hook to its project's editor without holding up Copilot. */
export async function sendCopilotHook(hook: CopilotHook, options: { timeoutMs?: number; runtimeDir?: string } = {}): Promise<boolean> {
  const controller = new AbortController();
  const sockets = new Set<Socket>();
  const timer = setTimeout(() => { controller.abort(); for (const socket of sockets) socket.destroy(); }, options.timeoutMs ?? 1000);
  try {
    const projectId = questionProjectId(projectAt(hook.root));
    const editor = await liveEditor(projectId, controller.signal, sockets, options.runtimeDir);
    if (!editor || controller.signal.aborted) return false;
    return await new Promise<boolean>((done) => {
      const { socket } = editor;
      socket.once("data", () => done(true));
      socket.once("close", () => done(false));
      socket.write(`${JSON.stringify({ type: "copilot-hook", projectId, hook })}\n`);
    });
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
    for (const socket of sockets) socket.destroy();
  }
}

/**
 * Tells the editor of the project one thing a `trama` command of the agent knows, found as for `trama ask`; never
 * throws, waits at most `timeoutMs`. Without an editor nothing happens.
 */
async function tellEditor(project: Project, message: object, options: { env?: Record<string, string | undefined>; runtimeDir?: string; timeoutMs?: number }): Promise<void> {
  const controller = new AbortController();
  const sockets = new Set<Socket>();
  const timer = setTimeout(() => { controller.abort(); for (const socket of sockets) socket.destroy(); }, options.timeoutMs ?? 1000);
  try {
    const projectId = questionProjectId(project);
    const endpoint = (options.env ?? process.env)[QUESTION_ENDPOINT_ENV];
    const editor = endpoint !== undefined ? await connectEditor(endpoint, projectId, controller.signal, sockets) : await liveEditor(projectId, controller.signal, sockets, options.runtimeDir);
    if (!editor || controller.signal.aborted) return;
    await new Promise<void>((done) => {
      editor.socket.once("data", () => done());
      editor.socket.once("close", () => done());
      editor.socket.write(`${JSON.stringify({ ...message, projectId })}\n`);
    });
  } catch {
    // The editor just goes on following the run by its other signals.
  } finally {
    clearTimeout(timer);
    for (const socket of sockets) socket.destroy();
  }
}

/**
 * Tells the editor of the project that a command of the agent changed something, so it counts as the activity of the
 * agent's run: `origin` is the terminal or the Cursor chat it ran in, none for an agent Trama cannot tell.
 */
export const sendActivity = (project: Project, origin: AgentOrigin, options: { env?: Record<string, string | undefined>; runtimeDir?: string; timeoutMs?: number } = {}): Promise<void> =>
  tellEditor(project, { type: "activity", ...origin }, options);
/** Tells the editor of the project that the agent in `terminal` has settled. */
export const sendAgentIdle = (project: Project, terminal: string, options: { env?: Record<string, string | undefined>; runtimeDir?: string; timeoutMs?: number } = {}): Promise<void> =>
  tellEditor(project, { type: "agent-idle", terminal }, options);




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
    let from: { id: unknown; project: Project } | undefined;
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
        // Only the window's own project.
        if (phase === "hello" && message.projectId === record.projectId) from = { id: record.projectId, project: options.project };
        if (!from || message.projectId !== from.id) { finish(unavailableQuestions()); return; }
        if (phase === "hello" && message.type === "hello") {
          phase = "ready";
          connection.send({ type: "ready", ...record, caller: from.id });
          return;
        }
        if (phase === "ready" && message.type === "coordinator-message") {
          const payload = coordinatorMessage(message.message);
          if (!payload || typeof message.messageId !== "string") throw new UsageError("A coordinator message needs a JSON object and message identity");
          if (!options.onCoordinatorMessage) { finish({ type: "coordinator-unavailable", messageId: message.messageId }); return; }
          void Promise.resolve(options.onCoordinatorMessage(payload)).then((response) => {
            const wrapped = response === undefined ? undefined : coordinatorMessage({ response });
            if (response !== undefined && !wrapped) throw new UsageError("Coordinator response must be JSON");
            finish({ type: "coordinator-received", messageId: message.messageId, ...(wrapped ? { response: wrapped["response"] } : {}) });
          }).catch((error: unknown) => finish({
            type: "coordinator-received",
            messageId: message.messageId,
            error: error instanceof Error ? error.message : String(error),
          }));
          return;
        }
        if (phase === "ready" && message.type === "activity") {
          options.onActivity?.({
            ...(typeof message.terminal === "string" ? { terminal: message.terminal } : {}),
            ...(message.chat === "cursor" ? { chat: "cursor" as const } : {}),
          });
          finish({ type: "taken" });
          return;
        }
        if (phase === "ready" && message.type === "agent-idle") {
          if (typeof message.terminal !== "string" || message.terminal === "") throw new UsageError("An idle agent needs its terminal");
          options.onAgentIdle?.(message.terminal, options.project.root);
          finish({ type: "taken" });
          return;
        }
        // Hooks from older versions may still send this message; consume it without changing editor state.
        if (phase === "ready" && message.type === "agent-alive") {
          finish({ type: "taken" });
          return;
        }
        if (phase === "ready" && message.type === "cursor-hook") {
          const hook = message.hook as CursorHook | undefined;
          if (!hook || typeof hook !== "object" || typeof hook.conversation !== "string" || typeof hook.root !== "string") throw new UsageError("A Cursor hook needs a conversation and a project folder");
          options.onCursorHook?.(hook);
          finish({ type: "taken" });
          return;
        }
        if (phase === "ready" && message.type === "copilot-hook") {
          const hook = message.hook as CopilotHook | undefined;
          if (!hook || typeof hook !== "object" || typeof hook.conversation !== "string" || typeof hook.root !== "string") throw new UsageError("A Copilot hook needs a conversation and a project folder");
          options.onCopilotHook?.(hook);
          finish({ type: "taken" });
          return;
        }
        if (phase !== "ready" || message.type !== "ask") throw new UsageError("Identify the editor before submitting a question round");
        const request = parseQuestionRequest(message.request);
        const fromTramaTerminal = message.fromTramaTerminal === true;
        const fromCursorChat = message.fromCursorChat === true;
        phase = "waiting";
        const { project } = from;
        void Promise.resolve().then(() => {
          if (controller.signal.aborted || closed) throw questionAborted();
          return options.handler(project, request, { signal: controller.signal, fromTramaTerminal, fromCursorChat });
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
