import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { createConnection, createServer, type Server, type Socket } from "node:net";
import { homedir, tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { writeFileAtomic } from "./atomic-write";
import { TramaError, UsageError } from "./errors";
import { type AgentOrigin, CURSOR_AGENT_ENV } from "./announcements";
import type { CursorHook } from "./cursor-chat";
import { parseQuestionRequest, questionAborted, questionFailure, QuestionInterruptedError, unavailableQuestions, type QuestionContext, type QuestionHandler, type QuestionRequest, type QuestionResult } from "./questions";
import { type Project, projectAt } from "./store";

export const QUESTION_ENDPOINT_ENV = "TRAMA_QUESTION_ENDPOINT";
/** Set by Cursor in the commands of its agent when they run in its sandbox (Linux). */
const CURSOR_SANDBOX_ENV = "CURSOR_SANDBOX";
/** Cursor's sandbox maps the commands to UID 0; the real UID of the user is here. */
const CURSOR_ORIG_UID_ENV = "CURSOR_ORIG_UID";


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
  /** Random secret of this window's start: every request to the editor carries it, and the editor never sends it back. */
  secret: string;
}

interface ServerOptions {
  project: Project;
  windowId?: string;
  handler: QuestionHandler;
  /** Whether this window still serves its project; a window that does not refuses before any round is submitted. */
  serves?: () => boolean;
  runtimeDir?: string;
  focusedAt?: number;
  /** A hook of Cursor's chat, forwarded by `trama hook cursor`; true when this window knows the conversation as Trama's (the question tool's check). */
  onCursorHook?: (hook: CursorHook) => boolean | void;
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

/** Inside Cursor's Linux sandbox the record folder is named after the real UID, not the mapped one (UID 0). */
function runtimeUid(): number | string {
  const original = process.env[CURSOR_ORIG_UID_ENV]?.trim();
  if (process.env[CURSOR_SANDBOX_ENV] && original !== undefined && /^\d+$/.test(original)) return original;
  return process.getuid!();
}

function runtimeDirectory(override?: string): string {
  if (override) return resolve(override);
  if (process.platform === "win32") return join(process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"), "Trama", "questions");
  return join(process.env.XDG_RUNTIME_DIR ?? tmpdir(), `trama-q-${runtimeUid()}`);
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

/** Linux and macOS keep the runtime folder private to the user; Windows trusts the default permissions of `%LOCALAPPDATA%`. */
function runtimeDirectoryReady(directory: string, create: boolean): boolean {
  if (process.platform !== "win32") return privateUnixDirectory(directory, create);
  if (create) mkdirSync(directory, { recursive: true });
  return existsSync(directory);
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
  if (typeof record.projectId !== "string" || typeof record.windowId !== "string" || typeof record.endpoint !== "string" || typeof record.focusedAt !== "number" || !Number.isFinite(record.focusedAt) || typeof record.secret !== "string" || record.secret === "") return null;
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

async function probeCoordinatorOwner(directory: string, lease: CoordinatorLease): Promise<"live" | "stale" | "unverified"> {
  const controller = new AbortController();
  const sockets = new Set<Socket>();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
    for (const socket of sockets) socket.destroy();
  }, 2_000);
  try {
    const record = records(directory, lease.projectId).find((candidate) => candidate.endpoint === lease.endpoint);
    const editor = record ? await connectEditor(record, controller.signal, sockets) : null;
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
  const privateDirectory = runtimeDirectoryReady(directory, false);
  if (!privateDirectory || !owner.windowId || !owner.endpoint) return null;

  const path = coordinatorLeasePath(directory, projectId);
  const lease: CoordinatorLease = { projectId, windowId: owner.windowId, endpoint: owner.endpoint };
  const current = readCoordinatorLease(path, projectId);
  if (current === null) return null;
  if (current && !sameCoordinatorLease(current, lease) && await probeCoordinatorOwner(directory, current) !== "stale") return null;

  if (!records(directory, projectId).some((record) =>
    record.windowId === lease.windowId && record.endpoint === lease.endpoint)) return null;
  if (await probeCoordinatorOwner(directory, lease) !== "live") return null;
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
  const privateDirectory = runtimeDirectoryReady(directory, false);
  if (!privateDirectory || !sameCoordinatorLease(readCoordinatorLease(coordinatorLeasePath(directory, projectId), projectId), lease)
    || !records(directory, projectId).some((record) => record.windowId === lease.windowId && record.endpoint === lease.endpoint)) return false;
  return await probeCoordinatorOwner(directory, lease) === "live";
}

/**
 * Whether the editor window `windowId` of the project is lost: no discovery record names it, or every record of it no
 * longer answers on its endpoint. An unverified answer (a timeout) is not a loss, so nothing is forgotten by guess.
 */
export async function editorWindowLost(
  project: Project,
  windowId: string,
  options: { runtimeDir?: string } = {},
): Promise<boolean> {
  const projectId = questionProjectId(project);
  let directory: string;
  try {
    directory = runtimeDirectory(options.runtimeDir);
    outsideProject(directory, project);
  } catch { return false; }
  const privateDirectory = runtimeDirectoryReady(directory, false);
  if (!privateDirectory) return false;
  const found = records(directory, projectId).filter((record) => record.windowId === windowId);
  if (found.length === 0) return true;
  const states = await Promise.all(found.map((record) => probeCoordinatorOwner(directory, { projectId, windowId, endpoint: record.endpoint })));
  return states.every((state) => state === "stale");
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
  const privateDirectory = runtimeDirectoryReady(directory, false);
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

/** Every request to an editor is one line carrying the secret of the discovery record the editor was reached by. */
function requestLine(record: EditorRecord, message: object): string {
  return `${JSON.stringify({ ...message, secret: record.secret })}\n`;
}

/** Compares secrets in constant time; a missing or different secret matches nothing. */
function sameSecret(given: unknown, secret: string): boolean {
  if (typeof given !== "string") return false;
  const left = Buffer.from(given);
  const right = Buffer.from(secret);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** The request on a line when it carries the window's secret; any other line gets no answer at all. */
function authenticatedRequest(line: string, secret: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(line);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const message = value as Record<string, unknown>;
    return sameSecret(message.secret, secret) ? message : null;
  } catch { return null; }
}

/** An editor named by an endpoint is reached only through its own discovery record, which supplies the secret. */
function connectEndpoint(directory: string, projectId: string, endpoint: string, signal: AbortSignal | undefined, sockets: Set<Socket>): Promise<EditorConnection | null> {
  const record = records(directory, projectId).find((candidate) => candidate.endpoint === endpoint);
  return record ? connectEditor(record, signal, sockets) : Promise.resolve(null);
}

function connectEditor(record: EditorRecord, signal: AbortSignal | undefined, sockets: Set<Socket>): Promise<EditorConnection | null> {
  if (signal?.aborted) return Promise.reject(questionAborted());
  if (!localEndpoint(record.endpoint)) return Promise.resolve(null);
  const { promise, resolve: accept, reject } = Promise.withResolvers<EditorConnection | null>();
  const socket = createConnection({ path: record.endpoint });
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
      // The ready answer names the window only: the editor never sends the secret back.
      const value = JSON.parse(line) as { type?: unknown; projectId?: unknown; windowId?: unknown; endpoint?: unknown };
      finish(value.type === "ready" && value.projectId === record.projectId && value.windowId === record.windowId && value.endpoint === record.endpoint ? { socket, record } : null);
    } catch { finish(null); }
  });
  socket.on("error", lost);
  socket.on("close", lost);
  socket.on("end", lost);
  socket.once("connect", () => socket.write(requestLine(record, { type: "hello", projectId: record.projectId })));
  return promise;
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
    socket.write(requestLine(editor.record, { type: "ask", projectId, request, fromTramaTerminal: context.fromTramaTerminal === true, fromCursorChat: context.fromCursorChat === true }));
  });
}

/** The live editor of the project that was focused last, found through the local discovery records; null without one. */
async function liveEditor(projectId: string, signal: AbortSignal | undefined, sockets: Set<Socket>, runtimeDir?: string): Promise<EditorConnection | null> {
  const directory = runtimeDirectory(runtimeDir);
  const privateDirectory = runtimeDirectoryReady(directory, false);
  if (!privateDirectory) return null;
  const live = (await Promise.all(records(directory, projectId).map((record) => connectEditor(record, signal, sockets))))
    .filter((connection): connection is EditorConnection => connection !== null && !connection.socket.destroyed && !connection.socket.readableEnded)
    .sort((a, b) => b.record.focusedAt - a.record.focusedAt || a.record.windowId.localeCompare(b.record.windowId));
  for (const unused of live.slice(1)) unused.socket.destroy();
  return live[0] ?? null;
}

interface CoordinatorRelayResult {
  delivered: number;
  /** Live editors the message was addressed to, including those that did not answer in time; every one must acknowledge it. */
  live: number;
  error?: "no-live-receiver";
  responses: CoordinatorMessage[];
}

/** Marks a live editor that did not answer its probe in time: it is live, so its jobs are unknown. */
const UNANSWERED = Symbol("unanswered");

/** Probes one discovery record; with `timeoutMs` an editor that does not answer in time is `UNANSWERED`. */
async function probeEditor(record: EditorRecord, timeoutMs: number | undefined): Promise<EditorConnection | null | typeof UNANSWERED> {
  if (timeoutMs === undefined) return connectEditor(record, undefined, new Set());
  const sockets = new Set<Socket>();
  let timer: NodeJS.Timeout | undefined;
  const unanswered = new Promise<typeof UNANSWERED>((resolve) => {
    timer = setTimeout(() => {
      for (const socket of sockets) socket.destroy();
      resolve(UNANSWERED);
    }, timeoutMs);
  });
  const connection = await Promise.race([connectEditor(record, undefined, sockets), unanswered]);
  clearTimeout(timer);
  return connection;
}

async function relayCoordinatorMessage(
  project: Project,
  message: CoordinatorMessage,
  options: { runtimeDir?: string; timeoutMs?: number } = {},
): Promise<CoordinatorRelayResult> {
  const payload = coordinatorMessage(message);
  if (!payload) throw new UsageError("Coordinator message must be a JSON object");
  const projectId = questionProjectId(project);
  const directory = runtimeDirectory(options.runtimeDir);
  const privateDirectory = runtimeDirectoryReady(directory, false);
  if (!privateDirectory) return { delivered: 0, live: 0, error: "no-live-receiver", responses: [] };
  const candidates = records(directory, projectId);
  const probed = await Promise.all(candidates.map((record) => probeEditor(record, options.timeoutMs)));
  const unanswered = probed.filter((probe) => probe === UNANSWERED).length;
  const connections = probed.filter((connection): connection is EditorConnection => {
    if (!connection || connection === UNANSWERED) return false;
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
      let timer: NodeJS.Timeout | undefined;
      const finish = (ok: boolean, response?: CoordinatorMessage) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        stopLines();
        connection.socket.removeListener("error", lost);
        connection.socket.removeListener("end", lost);
        connection.socket.removeListener("close", lost);
        connection.socket.destroy();
        if (response) responses.push(response);
        resolve(ok);
      };
      if (options.timeoutMs !== undefined) timer = setTimeout(() => finish(false), options.timeoutMs);
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
      connection.socket.write(requestLine(connection.record, { type: "coordinator-message", projectId, messageId, message: payload }));
    });
  }));
  const count = delivered.filter(Boolean).length;
  return { delivered: count, live: connections.length + unanswered, ...(count === 0 ? { error: "no-live-receiver" as const } : {}), responses };
}

export async function sendCoordinatorMessage(
  project: Project,
  message: CoordinatorMessage,
  options: { runtimeDir?: string; timeoutMs?: number } = {},
): Promise<{ delivered: number; live: number; error?: "no-live-receiver" }> {
  const { delivered, live, error } = await relayCoordinatorMessage(project, message, options);
  return { delivered, live, ...(error ? { error } : {}) };
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
      ? await connectEndpoint(runtimeDirectory(options.runtimeDir), projectId, endpoint, context.signal, sockets)
      : await liveEditor(projectId, context.signal, sockets, options.runtimeDir);
    if (context.signal?.aborted) throw questionAborted();
    if (!editor) return unavailableQuestions(!!process.env[CURSOR_SANDBOX_ENV]);
    return await submit(editor, projectId, validated, { ...context, fromTramaTerminal: endpoint !== undefined, fromCursorChat: env[CURSOR_AGENT_ENV] === "1" });
  } finally {
    context.signal?.removeEventListener("abort", abort);
    for (const socket of sockets) socket.destroy();
    sockets.clear();
  }
}

/** Whether an editor's answer to a hook says that its conversation is Trama's; a cut or other answer does not. */
function saysTrama(chunk: unknown): boolean {
  try {
    const answer: unknown = JSON.parse(String(chunk).trim());
    return typeof answer === "object" && answer !== null && "trama" in answer && answer.trama === true;
  } catch {
    return false;
  }
}

/**
 * Hands `message` to every live editor window of the project, each window on its own, and says for each one whether it
 * answers that the conversation is Trama's; a window that fails, is slow or does not answer says no.
 */
async function editorsSayTrama(projectId: string, message: { type: "cursor-hook"; hook: CursorHook }, signal: AbortSignal, sockets: Set<Socket>, runtimeDir?: string): Promise<boolean[]> {
  return Promise.all(records(runtimeDirectory(runtimeDir), projectId).map(async (record) => {
    try {
      const editor = await connectEditor(record, signal, sockets);
      if (!editor || signal.aborted) return false;
      return await new Promise<boolean>((done) => {
        const { socket } = editor;
        socket.once("data", (chunk) => done(saysTrama(chunk)));
        socket.once("close", () => done(false));
        socket.write(requestLine(editor.record, { ...message, projectId }));
      });
    } catch {
      return false;
    }
  }));
}

/**
 * Hands a hook of Cursor's chat to every live editor window of its project, each window on its own, and waits until they
 * have taken it, for at most `timeoutMs` (1 second for a prompt or the question tool's check, 5 for the other hooks). A
 * window that is slow or does not answer holds back none of the others. Returns whether a window says the conversation is
 * Trama's, which only the question tool's check asks; never throws, since Cursor must not be held up.
 */
export async function sendCursorHook(hook: CursorHook, options: { timeoutMs?: number; runtimeDir?: string } = {}): Promise<boolean> {
  const controller = new AbortController();
  const sockets = new Set<Socket>();
  const timeoutMs = options.timeoutMs ?? (hook.hook === "beforeSubmitPrompt" || hook.hook === "preToolUse" ? 1000 : 5000);
  const timer = setTimeout(() => { controller.abort(); for (const socket of sockets) socket.destroy(); }, timeoutMs);
  try {
    const projectId = questionProjectId(projectAt(hook.root));
    if (!runtimeDirectoryReady(runtimeDirectory(options.runtimeDir), false)) return false;
    return (await editorsSayTrama(projectId, { type: "cursor-hook", hook }, controller.signal, sockets, options.runtimeDir)).some(Boolean);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
    for (const socket of sockets) socket.destroy();
  }
}

/**
 * Tells the editor of the project one thing a `trama` command of the agent knows, found as for `trama question new`; never
 * throws, waits at most `timeoutMs`. Without an editor nothing happens.
 */
async function tellEditor(project: Project, message: object, options: { env?: Record<string, string | undefined>; runtimeDir?: string; timeoutMs?: number }): Promise<void> {
  const controller = new AbortController();
  const sockets = new Set<Socket>();
  const timer = setTimeout(() => { controller.abort(); for (const socket of sockets) socket.destroy(); }, options.timeoutMs ?? 1000);
  try {
    const projectId = questionProjectId(project);
    const endpoint = (options.env ?? process.env)[QUESTION_ENDPOINT_ENV];
    const editor = endpoint !== undefined ? await connectEndpoint(runtimeDirectory(options.runtimeDir), projectId, endpoint, controller.signal, sockets) : await liveEditor(projectId, controller.signal, sockets, options.runtimeDir);
    if (!editor || controller.signal.aborted) return;
    await new Promise<void>((done) => {
      editor.socket.once("data", () => done());
      editor.socket.once("close", () => done());
      editor.socket.write(requestLine(editor.record, { ...message, projectId }));
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

function socketConnection(socket: Socket): ChannelConnection {
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
  const record: EditorRecord = { projectId: questionProjectId(options.project), windowId: options.windowId ?? id, endpoint, focusedAt: options.focusedAt ?? Date.now(), secret: randomBytes(32).toString("hex") };
  const connections = new Set<ChannelConnection>();
  let native: Server | undefined;
  let published = false;
  let closed = false;
  let closing: Promise<void> | undefined;

  const publish = () => writeFileAtomic(recordPath, JSON.stringify(record), { mode: 0o600 });
  const dispose = (): Promise<void> => {
    if (closed) return closing ?? Promise.resolve();
    closed = true;
    closing = (async () => {
      try { if (published) options.onClose?.(); }
      finally {
        for (const connection of connections) connection.close();
        connections.clear();
        try {
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
      const message = authenticatedRequest(line, record.secret);
      // A request without the window's secret gets no answer at all: its connection just closes.
      if (!message) { connection.close(); return; }
      try {
        // Only the window's own project.
        if (phase === "hello" && message.projectId === record.projectId) from = { id: record.projectId, project: options.project };
        if (!from || message.projectId !== from.id) { finish(unavailableQuestions()); return; }
        if (phase === "hello" && message.type === "hello") {
          if (options.serves && !options.serves()) { finish(unavailableQuestions()); return; }
          phase = "ready";
          connection.send({ type: "ready", projectId: record.projectId, windowId: record.windowId, endpoint: record.endpoint });
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
          const trama = options.onCursorHook?.(hook) === true;
          finish({ type: "taken", trama });
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
    if (!runtimeDirectoryReady(directory, true)) throw new TramaError("Question runtime directory is not owned exclusively by the current user");
    native = createServer((socket) => accept(socketConnection(socket)));
    native.on("close", lostListener);
    native.on("error", () => { if (published) lostListener(); });
    await new Promise<void>((done, fail) => {
      native!.once("error", fail);
      native!.listen({ path: endpoint, readableAll: false, writableAll: false }, () => { native!.removeListener("error", fail); done(); });
    });
    // A Windows named pipe has no file mode to set: its access is the window's secret, checked on every request.
    if (process.platform !== "win32") chmodSync(endpoint, 0o600);
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
