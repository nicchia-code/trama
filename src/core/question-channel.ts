import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync } from "node:fs";
import { createConnection, createServer, type Server, type Socket } from "node:net";
import { homedir, tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { writeFileAtomic } from "./atomic-write";
import { TramaError, UsageError } from "./errors";
import { terminalFromEnv, type AgentOrigin } from "./announcements";
import { parseQuestionRequest, questionAborted, questionFailure, QuestionInterruptedError, unavailableQuestions, type QuestionContext, type QuestionHandler, type QuestionRequest, type QuestionResult } from "./questions";
import { type Project } from "./store";

export const QUESTION_ENDPOINT_ENV = "TRAMA_QUESTION_ENDPOINT";



export type CoordinatorJson = null | boolean | number | string | CoordinatorJson[] | { [key: string]: CoordinatorJson };
export type CoordinatorMessage = { [key: string]: CoordinatorJson };

/**
 * The provenance of a card an agent files, as the editor learns it: the `holder`, the agent's terminal (`TRAMA_TERMINAL`).
 * Empty without a terminal: such a card waits for no agent.
 */
export function filingOrigin(origin: AgentOrigin): { holder?: string } {
  return origin.terminal === undefined ? {} : { holder: origin.terminal };
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
  /** Whether `terminal` is a terminal or omp Chat conversation this window opened and that still exists, working or idle, in the window's project `root`. A round for any other terminal is answered `unavailable` and never reaches the handler. Without it every terminal named is accepted. */
  ownsTerminal?: (terminal: string, root: string) => boolean;
  runtimeDir?: string;
  focusedAt?: number;
  /** A command of the agent changed something: where it ran, as Trama reports it. */
  onActivity?: (origin: AgentOrigin) => void;
  /** The agent in the terminal `terminal` (the hook of its agent said so) has settled: nothing is left to do. `root` is this window's project. */
  onAgentIdle?: (terminal: string, root: string) => void;
  /** The agent in the terminal `terminal` (the hook of its agent said so) runs as the process `pid`. `root` is this window's project. */
  onAgentStarted?: (terminal: string, pid: number, root: string) => void;
  /** Which of `holders` (Trama terminals; an omp Chat conversation has its terminal's identity) this window follows, asked by another window's execution check. */
  onFollowedHolders?: (holders: string[]) => string[];
  /** A project-scoped notice from a command or another window, independent of question rounds. `false` says this window does not expect the notice (for example the result of a review it never asked for). */
  onCoordinatorMessage?: (message: CoordinatorMessage) => boolean | void | Promise<boolean | void>;
  /** `trama task check`: runs this window's execution check for the Task `task` (its permanent identity) and says who holds it or why it was released. Without it the window answers that it cannot verify. */
  onCheckTask?: (task: string) => TaskCheckReply | Promise<TaskCheckReply>;
  /** `trama team show`: the members of the project's team, or why they cannot be read (Team not available). Without it the window does not answer `team`. */
  onTeam?: () => TeamAnswer | Promise<TeamAnswer>;
  /** The briefing of a comparison (`tech#issue/Published`): where the published issues are, from the last read of GitHub. Without it the window answers none, and the briefing says the state of publication. */
  onIssueStates?: () => readonly IssueStateRead[] | Promise<readonly IssueStateRead[]>;
  onClose?: () => void;
}

/** Canonical project roots, never the caller's current directory, identify an editor. */
export function questionProjectId(project: Project): string {
  let root = resolve(project.root);
  try { root = realpathSync(root); } catch { /* A missing root cannot have a live editor. */ }
  if (process.platform === "win32") root = root.toLowerCase();
  return createHash("sha256").update(root).digest("hex");
}


export function runtimeDirectory(override?: string): string {
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

/** Linux and macOS keep the runtime folder private to the user; Windows trusts the default permissions of `%LOCALAPPDATA%`. */
export function runtimeDirectoryReady(directory: string, create: boolean): boolean {
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
  // The window refused the round at once: the terminal that asked it is not one it opened.
  if (result.status === "unavailable" && typeof result.reason === "string") return unavailableQuestions();
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
    socket.write(requestLine(editor.record, { type: "ask", projectId, request, terminal: context.terminal }));
  });
}

/** The live editor of the project that was focused last, found through the local discovery records; null without one. Only the commands that tell the editor something use it: a round is never asked this way. */
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

/** Hands `message` to every live editor window of the project, each on its own; `live` counts the windows it was addressed to. */
export async function sendCoordinatorMessage(
  project: Project,
  message: CoordinatorMessage,
  options: { runtimeDir?: string } = {},
): Promise<{ delivered: number; live: number; unexpected?: number; error?: "no-live-receiver" }> {
  const payload = coordinatorMessage(message);
  if (!payload) throw new UsageError("Coordinator message must be a JSON object");
  const projectId = questionProjectId(project);
  const directory = runtimeDirectory(options.runtimeDir);
  const privateDirectory = runtimeDirectoryReady(directory, false);
  if (!privateDirectory) return { delivered: 0, live: 0, error: "no-live-receiver" };
  const candidates = records(directory, projectId);
  const probed = await Promise.all(candidates.map((record) => connectEditor(record, undefined, new Set())));
  const connections = probed.filter((connection): connection is EditorConnection => {
    if (!connection) return false;
    const matched = !connection.socket.destroyed && !connection.socket.readableEnded
      && connection.record.projectId === projectId
      && candidates.some((record) => record.endpoint === connection.record.endpoint
        && record.windowId === connection.record.windowId && record.projectId === connection.record.projectId);
    if (!matched) connection.socket.destroy();
    return matched;
  });
  const delivered = await Promise.all(connections.map((connection) => {
    const messageId = randomUUID();
    return new Promise<"lost" | "expected" | "unexpected">((resolve) => {
      let done = false;
      const finish = (ok: "lost" | "expected" | "unexpected") => {
        if (done) return;
        done = true;
        stopLines();
        connection.socket.removeListener("error", lost);
        connection.socket.removeListener("end", lost);
        connection.socket.removeListener("close", lost);
        connection.socket.destroy();
        resolve(ok);
      };
      const lost = () => finish("lost");
      const stopLines = lines(connection.socket, (line) => {
        try {
          const reply: unknown = JSON.parse(line);
          if (!reply || typeof reply !== "object" || Array.isArray(reply)) { finish("lost"); return; }
          const value = reply as Record<string, unknown>;
          finish(value.type === "coordinator-received" && value.messageId === messageId ? (value.expected === false ? "unexpected" : "expected") : "lost");
        } catch { finish("lost"); }
      });
      connection.socket.on("error", lost);
      connection.socket.on("end", lost);
      connection.socket.on("close", lost);
      connection.socket.write(requestLine(connection.record, { type: "coordinator-message", projectId, messageId, message: payload }));
    });
  }));
  const count = delivered.filter((d) => d !== "lost").length;
  const unexpected = delivered.filter((d) => d === "unexpected").length;
  return { delivered: count, live: connections.length, ...(unexpected > 0 ? { unexpected } : {}), ...(count === 0 ? { error: "no-live-receiver" as const } : {}) };
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

/**
 * Asks `record`'s window which of `holders` it follows. A window whose record does not connect follows nothing, and a
 * window that connects but does not answer within `timeoutMs` follows nothing either.
 */
async function askWindow(record: EditorRecord, projectId: string, holders: string[], timeoutMs: number): Promise<string[]> {
  const sockets = new Set<Socket>();
  try {
    const editor = await connectEditor(record, undefined, sockets);
    if (!editor) return [];
    const { promise, resolve: done } = Promise.withResolvers<string[]>();
    const timer = setTimeout(() => finish([]), timeoutMs);
    const finish = (value: string[]) => { clearTimeout(timer); stop(); editor.socket.destroy(); done(value); };
    const stop = lines(editor.socket, (line) => {
      try {
        const reply: unknown = JSON.parse(line);
        const list = reply !== null && typeof reply === "object" && "holders" in reply ? reply.holders : undefined;
        finish(Array.isArray(list) ? list.filter((h): h is string => typeof h === "string" && holders.includes(h)) : []);
      } catch { finish([]); }
    });
    editor.socket.once("close", () => finish([]));
    editor.socket.write(requestLine(editor.record, { type: "followed-holders", projectId, holders }));
    return await promise;
  } catch { return []; }
  finally { for (const socket of sockets) socket.destroy(); }
}

/**
 * Asks the other live windows of the project (all but `ownWindow`) which of `holders` they follow, and returns the ones some
 * window follows. `registered` names, for a holder, the window its registered process says follows it: that window is asked
 * first, and only the holders it does not follow go on to every other live window. A window whose record does not connect,
 * and one that connects but does not answer within `timeoutMs` (one second), follow nothing: for the holders nobody follows
 * the registered process decides.
 */
export async function askFollowedHolders(
  project: Project,
  holders: string[],
  options: { ownWindow?: string; registered?: Readonly<Record<string, string | undefined>>; timeoutMs?: number; runtimeDir?: string } = {},
): Promise<Set<string>> {
  const followed = new Set<string>();
  if (holders.length === 0) return followed;
  const directory = runtimeDirectory(options.runtimeDir);
  if (!runtimeDirectoryReady(directory, false)) return followed;
  const projectId = questionProjectId(project);
  const timeoutMs = options.timeoutMs ?? 1000;
  const others = records(directory, projectId).filter((record) => record.windowId !== options.ownWindow);
  const first = others.filter((record) => holders.some((holder) => options.registered?.[holder] === record.windowId));
  const answered = await Promise.all(first.map((record) => askWindow(record, projectId, holders.filter((holder) => options.registered?.[holder] === record.windowId), timeoutMs)));
  for (const answer of answered) for (const holder of answer) followed.add(holder);
  const rest = holders.filter((holder) => !followed.has(holder));
  if (rest.length === 0) return followed;
  const everyone = await Promise.all(others.map((record) => askWindow(record, projectId, rest, timeoutMs)));
  for (const answer of everyone) for (const holder of answer) followed.add(holder);
  return followed;
}



/**
 * Connect to the window that launched the agent and send the validated round to it. The round needs both `TRAMA_QUESTION_ENDPOINT` and a recognised
 * `TRAMA_TERMINAL` (Trama's own terminal or conversation, which owns the round): without either, as for an agent Trama did not launch, the answer is
 * `unavailable` at once, with no search for a window.
 */
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
    const terminal = terminalFromEnv(env);
    if (endpoint === undefined || terminal === undefined) return unavailableQuestions();
    const editor = await connectEndpoint(runtimeDirectory(options.runtimeDir), projectId, endpoint, context.signal, sockets);
    if (context.signal?.aborted) throw questionAborted();
    if (!editor) return unavailableQuestions();
    return await submit(editor, projectId, validated, { ...context, terminal });
  } finally {
    context.signal?.removeEventListener("abort", abort);
    for (const socket of sockets) socket.destroy();
    sockets.clear();
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
 * agent's run: `origin` is the terminal, none for an agent Trama cannot tell.
 */
export const sendActivity = (project: Project, origin: AgentOrigin, options: { env?: Record<string, string | undefined>; runtimeDir?: string; timeoutMs?: number } = {}): Promise<void> =>
  tellEditor(project, { type: "activity", ...origin }, options);
/** Tells the editor of the project that the agent in `terminal` has settled. */
export const sendAgentIdle = (project: Project, terminal: string, options: { env?: Record<string, string | undefined>; runtimeDir?: string; timeoutMs?: number } = {}): Promise<void> =>
  tellEditor(project, { type: "agent-idle", terminal }, options);
/** Tells the editor of the project which process is the agent in `terminal` (`agent-hook.STARTED`). */
export const sendAgentStarted = (project: Project, terminal: string, pid: number, options: { env?: Record<string, string | undefined>; runtimeDir?: string; timeoutMs?: number } = {}): Promise<void> =>
  tellEditor(project, { type: "agent-started", terminal, pid }, options);

/** What a window answers to `check-task`: who holds the Task and is alive, or why the Task was released; `unavailable` when the window cannot tell. */
export type TaskCheckReply =
  | { result: "alive"; holder: string }
  | { result: "released"; reason: string }
  | { result: "unavailable" };

/** How long `trama task check` waits for the window, the question to the other windows included. */
const TASK_CHECK_WAIT_MS = 5000;

function taskCheckReply(value: unknown): TaskCheckReply | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const reply = value as Record<string, unknown>;
  if (reply.type !== "task-checked") return null;
  if (reply.result === "alive" && typeof reply.holder === "string" && reply.holder !== "") return { result: "alive", holder: reply.holder };
  if (reply.result === "released" && typeof reply.reason === "string" && reply.reason !== "") return { result: "released", reason: reply.reason };
  return reply.result === "unavailable" ? { result: "unavailable" } : null;
}

/**
 * Asks an editor window of the project, found as for `trama question new`, to run the execution check of `task` at once
 * and waits for its answer for at most `timeoutMs` (5 seconds). Without a reachable window, or without an answer in
 * time, the answer is `unavailable`; never throws.
 */
export async function checkTaskInEditor(project: Project, task: string, options: { env?: Record<string, string | undefined>; runtimeDir?: string; timeoutMs?: number } = {}): Promise<TaskCheckReply> {
  const controller = new AbortController();
  const sockets = new Set<Socket>();
  const timer = setTimeout(() => { controller.abort(); for (const socket of sockets) socket.destroy(); }, options.timeoutMs ?? TASK_CHECK_WAIT_MS);
  try {
    const projectId = questionProjectId(project);
    const endpoint = (options.env ?? process.env)[QUESTION_ENDPOINT_ENV];
    const editor = endpoint !== undefined
      ? await connectEndpoint(runtimeDirectory(options.runtimeDir), projectId, endpoint, controller.signal, sockets)
      : await liveEditor(projectId, controller.signal, sockets, options.runtimeDir);
    if (!editor || controller.signal.aborted) return { result: "unavailable" };
    return await new Promise<TaskCheckReply>((done) => {
      const { socket } = editor;
      const stop = lines(socket, (line) => {
        stop();
        try { done(taskCheckReply(JSON.parse(line)) ?? { result: "unavailable" }); } catch { done({ result: "unavailable" }); }
      });
      socket.once("close", () => done({ result: "unavailable" }));
      socket.once("error", () => done({ result: "unavailable" }));
      socket.write(requestLine(editor.record, { type: "check-task", projectId, task }));
    });
  } catch {
    return { result: "unavailable" };
  } finally {
    clearTimeout(timer);
    for (const socket of sockets) socket.destroy();
  }
}

/** A member of the team as the editor answers it: the name and the GitHub handle, and the rest of the person's fields as stored. */
export interface TeamMember {
  name: string;
  handle: string;
  [field: string]: unknown;
}

/** What a window gives for `team`: its members (at least their name and handle; the rest is as stored), or the reason Team is not available. */
export type TeamAnswer = { members: readonly { name: string; handle: string }[] } | { error: string };

/** What the editor answers to `team` (`cli#team`): the members of the project's team, or why they cannot be read. */
export type TeamReply = { ok: true; members: TeamMember[] } | { ok: false; reason: string };

/** Where one published issue is, as the last read of GitHub found it: its GitHub number and its state (`IssueStatus`). */
export interface IssueStateRead {
  number: number;
  status: string;
}

/** How long the editor has to answer `issue-states`: a briefing does not wait for GitHub, only for the editor's memory of it. */
const ISSUE_STATES_WAIT_MS = 3_000;

/**
 * Asks the editor window that launched this agent where the published issues were at its last read of GitHub (`issue-states`), through the endpoint and the secret of
 * `trama question new`. Null when there is no such editor, it does not answer in 3 seconds or it has nothing: the briefing then says the state of publication. Never throws.
 */
export async function askIssueStates(project: Project, options: { env?: Record<string, string | undefined>; runtimeDir?: string; timeoutMs?: number } = {}): Promise<IssueStateRead[] | null> {
  const env = options.env ?? process.env;
  const endpoint = env[QUESTION_ENDPOINT_ENV];
  const terminal = terminalFromEnv(env);
  if (endpoint === undefined || terminal === undefined) return null;
  const controller = new AbortController();
  const sockets = new Set<Socket>();
  const timer = setTimeout(() => { controller.abort(); for (const socket of sockets) socket.destroy(); }, options.timeoutMs ?? ISSUE_STATES_WAIT_MS);
  try {
    const editor = await connectEndpoint(runtimeDirectory(options.runtimeDir), questionProjectId(project), endpoint, controller.signal, sockets);
    if (!editor || controller.signal.aborted) return null;
    const { promise, resolve } = Promise.withResolvers<IssueStateRead[] | null>();
    const { socket } = editor;
    const stop = lines(socket, (line) => {
      stop();
      try {
        const reply: unknown = JSON.parse(line);
        const states = typeof reply === "object" && reply !== null && (reply as Record<string, unknown>).type === "issue-states" ? (reply as Record<string, unknown>).states : undefined;
        resolve(Array.isArray(states) ? states.filter((s): s is IssueStateRead => typeof s === "object" && s !== null && Number.isInteger((s as IssueStateRead).number) && typeof (s as IssueStateRead).status === "string") : null);
      } catch {
        resolve(null);
      }
    });
    socket.once("close", () => resolve(null));
    socket.once("error", () => resolve(null));
    socket.write(requestLine(editor.record, { type: "issue-states", projectId: questionProjectId(project), root: project.root, terminal }));
    return await promise;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    for (const socket of sockets) socket.destroy();
  }
}

/** Why the team cannot be read from outside an agent started by Trama. */
export const TEAM_NEEDS_EDITOR = "trama team show needs the editor: only an agent started by Trama can read the team.";
/** Why the team cannot be read when the editor stays silent. */
export const TEAM_NO_ANSWER = "The editor did not answer: open the project in the editor with Trama.";
/** How long the editor has to answer `team`. */
const TEAM_WAIT_MS = 10_000;

function teamReply(value: unknown): TeamReply | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const reply = value as Record<string, unknown>;
  if (reply.type !== "team") return null;
  if (typeof reply.error === "string" && reply.error !== "") return { ok: false, reason: reply.error };
  if (!Array.isArray(reply.members)) return null;
  const members = reply.members.filter((m): m is TeamMember => typeof m === "object" && m !== null && typeof (m as TeamMember).handle === "string" && typeof (m as TeamMember).name === "string");
  return members.length === reply.members.length ? { ok: true, members } : null;
}

/**
 * Asks the editor window that launched this agent for the members of the project's team, through the endpoint and the secret of `trama question new`, with the
 * `team` request (`tech#team`). Without `TRAMA_QUESTION_ENDPOINT` and a recognised `TRAMA_TERMINAL` it is `TEAM_NEEDS_EDITOR`; without an answer in 10 seconds,
 * `TEAM_NO_ANSWER`; an editor that answers with an error (Team not available) gives that reason. Never throws.
 */
export async function askTeam(project: Project, options: { env?: Record<string, string | undefined>; runtimeDir?: string; timeoutMs?: number } = {}): Promise<TeamReply> {
  const env = options.env ?? process.env;
  const endpoint = env[QUESTION_ENDPOINT_ENV];
  const terminal = terminalFromEnv(env);
  if (endpoint === undefined || terminal === undefined) return { ok: false, reason: TEAM_NEEDS_EDITOR };
  const controller = new AbortController();
  const sockets = new Set<Socket>();
  const timer = setTimeout(() => { controller.abort(); for (const socket of sockets) socket.destroy(); }, options.timeoutMs ?? TEAM_WAIT_MS);
  const silent: TeamReply = { ok: false, reason: TEAM_NO_ANSWER };
  try {
    const projectId = questionProjectId(project);
    const editor = await connectEndpoint(runtimeDirectory(options.runtimeDir), projectId, endpoint, controller.signal, sockets);
    if (!editor || controller.signal.aborted) return silent;
    const { promise, resolve } = Promise.withResolvers<TeamReply>();
    const { socket } = editor;
    const stop = lines(socket, (line) => {
      stop();
      try {
        resolve(teamReply(JSON.parse(line)) ?? silent);
      } catch {
        resolve(silent);
      }
    });
    socket.once("close", () => resolve(silent));
    socket.once("error", () => resolve(silent));
    socket.write(requestLine(editor.record, { type: "team", projectId, root: project.root, terminal }));
    return await promise;
  } catch {
    return silent;
  } finally {
    clearTimeout(timer);
    for (const socket of sockets) socket.destroy();
  }
}




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
          void Promise.resolve(options.onCoordinatorMessage(payload)).then((expected) => {
            finish({ type: "coordinator-received", messageId: message.messageId, ...(expected === false ? { expected: false } : {}) });
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
        if (phase === "ready" && message.type === "agent-started") {
          if (typeof message.terminal !== "string" || message.terminal === "") throw new UsageError("A started agent needs its terminal");
          if (typeof message.pid !== "number" || !Number.isSafeInteger(message.pid) || message.pid <= 0) throw new UsageError("A started agent needs its process");
          options.onAgentStarted?.(message.terminal, message.pid, options.project.root);
          finish({ type: "taken" });
          return;
        }
        if (phase === "ready" && message.type === "check-task") {
          if (typeof message.task !== "string" || message.task === "") throw new UsageError("A task check needs the Task identity");
          const task = message.task;
          phase = "waiting";
          void Promise.resolve().then(() => options.onCheckTask?.(task) ?? { result: "unavailable" as const }).then(
            (reply) => finish({ type: "task-checked", ...reply }),
            () => finish({ type: "task-checked", result: "unavailable" }),
          );
          return;
        }
        if (phase === "ready" && message.type === "team") {
          // Only a terminal or conversation this window opened reads the team; any other asker is told it is not an agent started by Trama.
          const asking = typeof message.terminal === "string" && message.terminal !== "" ? message.terminal : undefined;
          if (asking === undefined || options.ownsTerminal?.(asking, options.project.root) === false) { finish({ type: "team", error: TEAM_NEEDS_EDITOR }); return; }
          const onTeam = options.onTeam;
          if (onTeam === undefined) { finish({ type: "team", error: TEAM_NO_ANSWER }); return; }
          phase = "waiting";
          void Promise.resolve().then(onTeam).then(
            (answer) => finish({ type: "team", ...answer }),
            () => finish({ type: "team", error: TEAM_NO_ANSWER }),
          );
          return;
        }
        if (phase === "ready" && message.type === "issue-states") {
          // As for `team`: only a terminal or conversation this window opened asks; any other asker gets nothing, and its briefing says the state of publication.
          const asking = typeof message.terminal === "string" && message.terminal !== "" ? message.terminal : undefined;
          const onIssueStates = options.onIssueStates;
          if (asking === undefined || options.ownsTerminal?.(asking, options.project.root) === false || onIssueStates === undefined) { finish({ type: "issue-states", states: [] }); return; }
          phase = "waiting";
          void Promise.resolve().then(onIssueStates).then(
            (states) => finish({ type: "issue-states", states }),
            () => finish({ type: "issue-states", states: [] }),
          );
          return;
        }
        if (phase === "ready" && message.type === "followed-holders") {
          const asked = Array.isArray(message.holders) ? message.holders.filter((h): h is string => typeof h === "string") : [];
          finish({ type: "followed", holders: options.onFollowedHolders?.(asked) ?? [] });
          return;
        }
        if (phase !== "ready" || message.type !== "ask") throw new UsageError("Identify the editor before submitting a question round");
        const request = parseQuestionRequest(message.request);
        const terminal = typeof message.terminal === "string" && message.terminal !== "" ? message.terminal : undefined;
        // The round belongs to a terminal or conversation this window opened: any other agent is told the editor is unavailable.
        if (terminal === undefined || options.ownsTerminal?.(terminal, options.project.root) === false) { finish(unavailableQuestions()); return; }
        phase = "waiting";
        const { project } = from;
        void Promise.resolve().then(() => {
          if (controller.signal.aborted || closed) throw questionAborted();
          return options.handler(project, request, { signal: controller.signal, terminal });
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
