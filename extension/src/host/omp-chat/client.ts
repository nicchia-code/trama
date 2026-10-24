// The ACP client of omp Chat: it spawns `omp acp` (with `--yolo` only when `trama.ompChatApproval` is `yolo`) and talks to it over the process's stdio with `ClientSideConnection` of @agentclientprotocol/sdk.
//
// Verified with omp 18.12.6, which `omp acp` honours the options given before `acp`: `--hook` loads Trama's module, `--config` applies the overlay, `--advisor`
// turns the advisors on, and `--model` and `--slow` choose the models. So the options of a job are passed as they are in front of `acp` (`ompArguments` in
// `terminal-agent.ts`) and nothing has to be sent another way. `TRAMA_ACP=1` tells the hook it is in a conversation, so it never reports idle or start.
//
// What omp 18.12.6 declares and this client relies on, with no fallback for an older omp (`missingDeclaration`): `_meta.steering.supported` in `initialize` (a
// message sent in the middle of a turn goes through the `_session/steering` extension method; a second `session/prompt` would cancel the running turn),
// `sessionCapabilities.close` (`session/close` when a process is stopped), `loadSession` (`session/load` reopens a saved session) and the select of category
// `model` in the session's configuration options (`session/set_config_option`). The process leads its own group, so stopping it stops what it started.
import { type ChildProcess, spawn } from "node:child_process";
import { Readable, Writable } from "node:stream";
import {
  type Client,
  ClientSideConnection,
  type CreateElicitationRequest,
  type CreateElicitationResponse,
  type ElicitationSchema,
  ndJsonStream,
  PROTOCOL_VERSION,
  RequestError,
  type RequestPermissionRequest,
  type RequestPermissionResponse,
  type SessionNotification,
} from "@agentclientprotocol/sdk";
import { modelChoices, type ModelChoices, missingDeclaration, permissionOutcome, promptBlocks, type StartProblem, startFailureReason, StderrTail, steeringAnswer } from "../../../../src/core/omp-acp";
import { type AcpMcpServer, readMcpServers } from "../../../../src/core/omp-mcp";
import { RESUME_TIMEOUT_MS, ResumeTimeout, type TurnEnd, within } from "../../../../src/core/omp-chat-conversation";
import { QUESTION_TOOL_REFUSAL } from "../../../../src/core/questions";
import { ompPathVariable } from "../model-lists";
import type { SendMode } from "../../omp-chat-protocol";
import {
  type Disposable,
  type FormAnswer,
  type FormRequest,
  type OmpClientPort,
  type OmpExit,
  type OmpLaunch,
  type OmpPrompt,
  OmpStartFailure,
  type OmpSessionPort,
  type PermissionRequest,
  type SendStatus,
} from "./ports";

/** The grace a stopped process has before its group is killed. */
export const STOP_GRACE_MS = 3000;

/** How long `session/close` is waited for when a process is stopped. */
const CLOSE_WAIT_MS = 2000;

/** What the view learns of a message sent while the agent worked, and the reason a held message is not delivered when the conversation stops. */
const DISCARDED = "the agent stopped before the message reached it";

export interface OmpClientDeps {
  /** The omp program, read at every start: the one found for `trama.ompPath`; empty means `omp` from the editor's PATH. */
  ompPath(): string | Promise<string>;
  /** The MCP servers of the project's native files. */
  mcpServers?(root: string): AcpMcpServer[];
  /** How long the whole opening may take, from the start of the process to the open session; 30 s. */
  openTimeoutMs?: number;
  /** How long `session/close` may take when a process is stopped; 2 s. */
  closeTimeoutMs?: number;
  /** How long a stopped process may take before it is killed; 3 s. */
  stopGraceMs?: number;
}

type Listeners<T> = Set<(value: T) => void>;

type Report = (status: SendStatus) => void;

/** A message waiting for the end of the running turn; `report`, when given, is what the view learns of it. */
interface Waiting {
  prompt: OmpPrompt;
  report?: Report;
  resolve: () => void;
  reject: (error: unknown) => void;
}

/** A message held while a permission request waits: it goes as a follow-up once the developer answers. */
interface Held {
  prompt: OmpPrompt;
  report: Report;
  resolve: () => void;
  reject: (error: unknown) => void;
}

const disposer = <T>(set: Listeners<T>, listener: (value: T) => void): Disposable => {
  set.add(listener);
  return { dispose: () => void set.delete(listener) };
};

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** One process of omp and its ACP session. */
class OmpSession implements OmpSessionPort, Client {
  sessionId = "";
  private connection!: ClientSideConnection;
  private initialized: unknown;
  private choices: ModelChoices | undefined;

  private readonly updates: SessionNotification[] = [];
  private readonly updateListeners: Listeners<SessionNotification> = new Set();
  private readonly turnListeners: Listeners<boolean> = new Set();
  private readonly formListeners: Listeners<FormRequest> = new Set();
  private readonly permissionListeners: Listeners<PermissionRequest> = new Set();
  private readonly exitListeners: Listeners<OmpExit> = new Set();
  private readonly forms = new Map<string, { request: FormRequest; resolve: (answer: FormAnswer) => void }>();
  private readonly permissions = new Map<string, { request: PermissionRequest; resolve: (response: RequestPermissionResponse) => void }>();
  private readonly cancelledListeners: Listeners<string> = new Set();
  private formCount = 0;
  private permissionCount = 0;

  private turn: Promise<void> | undefined;
  private busy = false;
  /** The messages waiting for the end of the running turn. */
  private readonly waiting: Waiting[] = [];
  /** The messages held while a permission request waits: omp is sent nothing until the developer answers. */
  private readonly held: Held[] = [];
  /** The `queue` messages omp took into its turn, in order, until the session shows them. */
  private readonly takenQueued: { text: string; report: Report }[] = [];

  private starting = true;
  private stopping: Promise<void> | undefined;
  private exit: OmpExit | undefined;
  private failure: ((problem: StartProblem) => void) | undefined;

  /** The last lines omp wrote on its error output, and the moment it has no more to write. */
  private readonly stderr = new StderrTail();
  private readonly stderrDone: Promise<void>;
  /** Whether the end of the process Trama had not asked for was taken up (it is reported once), and the report `onExit` replays to a listener that comes late. */
  private reporting = false;
  private reported: OmpExit | undefined;

  /** Whether the prompt of the work is running or waiting: the answer of the turn that ends it, with no message of the developer waiting, is `onTurnEnd`. */
  private working = false;
  private readonly turnEndListeners: Listeners<TurnEnd> = new Set();
  /** The end of the work that came before a listener of `onTurnEnd` did. */
  private earlyEnd: TurnEnd | undefined;

  constructor(
    private readonly child: ChildProcess,
    private readonly deps: OmpClientDeps,
    private readonly cwd: string,
    /** `--yolo`: omp runs without asking, and a request that comes anyway is answered with an allow option. Otherwise every request waits for the developer. */
    private readonly yolo: boolean,
    /** A job conversation with Trama's hook: omp's forms are declined at once (`createElicitation`). */
    private readonly declineForms: boolean,
  ) {
    child.stdin?.on("error", () => {});
    child.stderr?.on("data", (chunk: Buffer) => this.stderr.push(chunk));
    const { promise: stderrDone, resolve: stderrEnded } = Promise.withResolvers<void>();
    this.stderrDone = stderrDone;
    if (child.stderr === null) stderrEnded();
    else {
      child.stderr.once("close", () => stderrEnded());
      child.stderr.once("end", () => stderrEnded());
    }
    child.once("error", (error: NodeJS.ErrnoException) => this.ended({ kind: "spawn", ...(error.code === undefined ? {} : { code: error.code }), message: error.message }));
    child.once("exit", (code, signal) => {
      this.exit = { code, signal };
      this.ended({ kind: "exit", code, signal });
    });
  }

  /** Connects the process's stdio to an ACP connection. */
  connect(): void {
    const { child } = this;
    if (child.stdin === null || child.stdout === null) throw new OmpStartFailure("omp has no standard input or output");
    const stream = ndJsonStream(Writable.toWeb(child.stdin) as unknown as WritableStream<Uint8Array>, Readable.toWeb(child.stdout) as unknown as ReadableStream<Uint8Array>);
    this.connection = new ClientSideConnection(() => this, stream);
    // The connection closing with no exit of the process is the end of the process all the same: the exit has a moment to say it first.
    void this.connection.closed.then(() => {
      if (this.starting) return;
      this.refuseForms();
      this.cancelPermissions();
      setTimeout(() => {
        if (this.exit === undefined) this.report({ code: null, signal: null });
      }, EVENT_GRACE_MS).unref();
    });
  }

  /** Resolves with the problem that ends the start: a spawn error or an exit before the session is open. */
  watchStart(): Promise<never> {
    const { promise, reject } = Promise.withResolvers<never>();
    promise.catch(() => {});
    this.failure = (problem) => reject(problem);
    return promise;
  }

  private ended(problem: StartProblem): void {
    if (this.starting) return this.failure?.(problem);
    if (problem.kind !== "exit") return;
    this.refuseForms();
    this.cancelPermissions();
    if (this.exit !== undefined) this.report(this.exit);
  }

  /** Resolves once omp's error output is complete, or after a moment when a command that omp started still holds the pipe. */
  private async settled(): Promise<void> {
    const timer = Promise.withResolvers<void>();
    const handle = setTimeout(() => timer.resolve(), STDERR_GRACE_MS);
    await Promise.race([this.stderrDone, timer.promise]);
    clearTimeout(handle);
  }

  /** The last lines of omp's error output once they are complete, or undefined when omp wrote none. */
  async errorOutput(): Promise<string | undefined> {
    await this.settled();
    const lines = this.stderr.lines();
    return lines === "" ? undefined : lines;
  }

  /** `omp-acp.EXITED`, once, unless Trama is stopping the process; the last lines of omp's error output go with it. */
  private report(exit: OmpExit): void {
    if (this.reporting || this.stopping !== undefined) return;
    this.reporting = true;
    void this.errorOutput().then((details) => {
      if (this.stopping !== undefined) return;
      const reported = { ...exit, ...(details === undefined ? {} : { details }) };
      this.reported = reported;
      for (const listener of [...this.exitListeners]) listener(reported);
    });
  }

  /** Runs the beginning of the session; `reopen` is the session to load or resume. */
  async open(root: string, servers: AcpMcpServer[], reopen?: string): Promise<void> {
    this.initialized = await this.connection.initialize({ protocolVersion: PROTOCOL_VERSION, clientCapabilities: { elicitation: { form: {} } } });
    // There is no fallback for an omp that declares less than 18.12.6 does: the start fails with what is missing.
    const missing = missingDeclaration(this.initialized, reopen !== undefined);
    if (missing !== undefined) throw new OmpStartFailure(missing);
    const mcpServers = servers as never;
    if (reopen === undefined) {
      const created = await this.connection.newSession({ cwd: root, mcpServers });
      this.choices = this.modelOption(created.configOptions);
      this.sessionId = created.sessionId;
      return;
    }
    const reopened = await this.connection.loadSession({ sessionId: reopen, cwd: root, mcpServers });
    this.choices = this.modelOption(reopened.configOptions);
    this.sessionId = reopen;
  }

  /** The model option the session declares; a session without one is a failed start. */
  private modelOption(configOptions: unknown): ModelChoices {
    const choices = modelChoices(configOptions);
    if (choices === undefined) throw new OmpStartFailure("omp declares no model option for the session");
    return choices;
  }

  /** The session is open: from now on an exit is `onExit`, not a failed start. */
  opened(): void {
    this.starting = false;
  }

  // --- Client (what omp asks of the editor) ---

  sessionUpdate(params: SessionNotification): void {
    this.updates.push(params);
    this.showTaken(params);
    for (const listener of [...this.updateListeners]) listener(params);
  }

  /** A message omp took into its turn is shown in the session: it is delivered, the first one shown being the first one taken. */
  private showTaken(params: SessionNotification): void {
    const { update } = params;
    if (update.sessionUpdate !== "user_message_chunk" || update.content.type !== "text") return;
    const next = this.takenQueued[0];
    if (next === undefined || next.text !== update.content.text) return;
    this.takenQueued.shift();
    next.report({ status: "delivered" });
  }

  requestPermission(params: RequestPermissionRequest): Promise<RequestPermissionResponse> {
    if (this.yolo) return Promise.resolve({ outcome: permissionOutcome(params.options) });
    const requestId = `permission-${++this.permissionCount}`;
    const { promise, resolve } = Promise.withResolvers<RequestPermissionResponse>();
    const request: PermissionRequest = { requestId, toolCall: params.toolCall, options: params.options };
    this.permissions.set(requestId, { request, resolve });
    for (const listener of [...this.permissionListeners]) listener(request);
    return promise;
  }

  createElicitation(params: CreateElicitationRequest): Promise<CreateElicitationResponse> {
    // A job conversation never shows a form, even when the hook that refuses omp's question tool did not load: the form is declined with the tool's refusal, and the view hears nothing.
    if (this.declineForms) return Promise.resolve({ action: "decline", _meta: { message: QUESTION_TOOL_REFUSAL } });
    const schema = params.mode === "form" ? (params as { requestedSchema?: ElicitationSchema }).requestedSchema : undefined;
    if (schema === undefined) return Promise.resolve({ action: "decline" });
    const requestId = `form-${++this.formCount}`;
    const { promise, resolve } = Promise.withResolvers<FormAnswer>();
    const request: FormRequest = { requestId, message: params.message, schema };
    this.forms.set(requestId, { request, resolve });
    for (const listener of [...this.formListeners]) listener(request);
    return promise;
  }

  // --- OmpSessionPort ---

  get pid(): number | undefined {
    return this.child.pid;
  }

  get inTurn(): boolean {
    return this.busy;
  }

  private setBusy(busy: boolean): void {
    if (this.busy === busy) return;
    this.busy = busy;
    for (const listener of [...this.turnListeners]) listener(busy);
  }

  /** A prompt of the host (the first message, a resume, General's pending text): starts a turn when none runs, else waits for the end of the running one. */
  sendPrompt(prompt: OmpPrompt): Promise<void> {
    return this.turn === undefined ? this.begin(prompt) : this.queue(prompt);
  }

  send(prompt: OmpPrompt, mode: SendMode, report: Report): Promise<void> {
    if (this.turn === undefined) return this.begin(prompt);
    // A permission request waits: omp is sent nothing until the developer answers it (`answerPermission`).
    if (this.permissions.size > 0) return this.hold(prompt, report);
    // omp declares steering (`start` refuses an omp that does not), so a message in the middle of a turn goes through `_session/steering`.
    return this.inject(prompt, mode, report);
  }

  /** Sends the message into the running turn: `steer` is taken by the turn at once, `queue` after the turn's own work. */
  private async inject(prompt: OmpPrompt, mode: SendMode, report: Report): Promise<void> {
    const running = this.turn ?? Promise.resolve();
    const queued = mode === "queue";
    let answer: unknown;
    try {
      answer = await this.connection.extMethod("_session/steering", {
        sessionId: this.sessionId,
        prompt: promptBlocks(prompt.text, prompt.attachment),
        ...(queued ? { _meta: { steering: { queue: "followUp" } } } : {}),
      });
    } catch (error) {
      report({ status: "failed", reason: messageOf(error) });
      return;
    }
    const outcome = steeringAnswer(answer);
    if (outcome === "injected") {
      if (queued) {
        report({ status: "queued" });
        this.takenQueued.push({ text: prompt.text, report });
      } else {
        report({ status: "delivered" });
      }
      return running;
    }
    if (typeof outcome !== "string") {
      report({ status: "failed", reason: outcome.failed });
      return;
    }
    // promptRequired: no turn of omp takes the message, so it goes as a prompt of its own, or waits when a turn has started meanwhile.
    if (this.turn === undefined) {
      report({ status: "delivered" });
      return this.begin(prompt);
    }
    report({ status: "queued" });
    return this.queue(prompt, report);
  }

  private queue(prompt: OmpPrompt, report?: Report): Promise<void> {
    const { promise, resolve, reject } = Promise.withResolvers<void>();
    this.waiting.push({ prompt, ...(report === undefined ? {} : { report }), resolve, reject });
    return promise;
  }

  private hold(prompt: OmpPrompt, report: Report): Promise<void> {
    const { promise, resolve, reject } = Promise.withResolvers<void>();
    this.held.push({ prompt, report, resolve, reject });
    report({ status: "queued" });
    return promise;
  }

  private begin(prompt: OmpPrompt): Promise<void> {
    const turn = this.run(prompt);
    this.turn = turn;
    return turn;
  }

  private async run(prompt: OmpPrompt, report?: Report): Promise<void> {
    if (prompt.work === true) this.working = true;
    this.setBusy(true);
    report?.({ status: "delivered" });
    let answer: TurnEnd | undefined;
    let failure: { error: unknown } | undefined;
    try {
      const response = await this.connection.prompt({ sessionId: this.sessionId, prompt: promptBlocks(prompt.text, prompt.attachment) });
      answer = { stopReason: response.stopReason };
    } catch (error) {
      failure = { error };
      // Only omp's own error answer is an answer; a connection that closes is the end of the process, which `onExit` reports.
      if (error instanceof RequestError) answer = { error: error.message };
    }
    // The turn is over: omp has answered what it took into it.
    for (const taken of this.takenQueued.splice(0)) taken.report({ status: "delivered" });
    // A permission request still open belongs to the turn that is over: it is closed as cancelled and goes from the view, and the messages held behind it go on
    // in the order they were written, each as the prompt of a new turn, so none is lost and the end of the work is the answer to the last of them.
    this.closePermissions();
    for (const held of this.held.splice(0)) this.waiting.push(held);
    const delivering = this.waiting.length > 0 || this.held.length > 0;
    const next = this.waiting.shift();
    if (next === undefined) {
      this.turn = undefined;
      this.setBusy(false);
    } else {
      const turn = this.run(next.prompt, next.report);
      this.turn = turn;
      turn.then(next.resolve, next.reject);
    }
    // The work ends with the answer of the turn, unless a message of the developer still waits to be delivered: the turn that delivers it ends it then.
    if (this.working && !delivering && answer !== undefined) {
      this.working = false;
      this.turnEnded(answer);
    }
    // The prompt of the work reports through `onTurnEnd`; its promise never rejects.
    if (failure !== undefined && prompt.work !== true) throw failure.error;
  }

  private turnEnded(end: TurnEnd): void {
    if (this.turnEndListeners.size === 0) this.earlyEnd = end;
    else for (const listener of [...this.turnEndListeners]) listener(end);
  }

  cancel(): void {
    this.cancelPermissions();
    void this.connection.cancel({ sessionId: this.sessionId }).catch(() => {});
  }

  /**
   * Stops the process: `session/cancel` when a turn runs, then `session/close` (at most `closeTimeoutMs`, skipped on deactivation, where there is little time),
   * then SIGTERM to omp's whole process group and, after the grace, SIGKILL to the group. Resolves when the process is gone; it never produces `onExit`.
   */
  stop(options: { deactivating?: boolean } = {}): Promise<void> {
    if (this.stopping !== undefined) return this.stopping;
    this.refuseForms();
    this.cancelPermissions();
    const done = Promise.withResolvers<void>();
    this.stopping = done.promise;
    const { child } = this;
    if (child.pid === undefined || this.exit !== undefined || child.exitCode !== null || child.signalCode !== null) {
      done.resolve();
      return done.promise;
    }
    child.once("exit", () => done.resolve());
    void this.terminate(options.deactivating === true).then(() => this.signalGroup());
    return done.promise;
  }

  /** SIGTERM to the group, unless its leader already left, and SIGKILL to the group at the end of the grace, unless nothing of the group is left by then. */
  private signalGroup(): void {
    const { child } = this;
    if (child.exitCode === null && child.signalCode === null) this.killGroup("SIGTERM");
    const kill = setTimeout(() => this.killGroup("SIGKILL"), this.deps.stopGraceMs ?? STOP_GRACE_MS);
    kill.unref();
    void this.stopping?.then(() => {
      if (!this.groupAlive()) clearTimeout(kill);
    });
  }

  /** What comes before the signals: the turn in progress is cancelled and the session is closed, waiting for omp's answer a moment. */
  private async terminate(deactivating: boolean): Promise<void> {
    if (this.busy) void this.connection.cancel({ sessionId: this.sessionId }).catch(() => {});
    if (deactivating || this.sessionId === "") return;
    const waited = Promise.withResolvers<void>();
    const timer = setTimeout(() => waited.resolve(), this.deps.closeTimeoutMs ?? CLOSE_WAIT_MS);
    void this.connection.closeSession({ sessionId: this.sessionId }).then(() => undefined, () => undefined).then(() => waited.resolve());
    await waited.promise;
    clearTimeout(timer);
  }

  /** Whether a process of the group omp led is still there (always false where the process does not lead a group). */
  private groupAlive(): boolean {
    const pid = this.child.pid;
    if (pid === undefined || process.platform === "win32") return false;
    try {
      process.kill(-pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  /** `signal` to omp's whole process group; on Windows `taskkill /T` takes the process tree (`/F` for SIGKILL). */
  private killGroup(signal: "SIGTERM" | "SIGKILL"): void {
    const pid = this.child.pid;
    if (pid === undefined) return;
    if (process.platform === "win32") {
      spawn("taskkill", ["/T", ...(signal === "SIGKILL" ? ["/F"] : []), "/PID", String(pid)], { stdio: "ignore", windowsHide: true }).once("error", () => {});
      return;
    }
    try {
      process.kill(-pid, signal);
    } catch {
      // The group is gone, or this system cannot signal it: the leader alone gets the signal.
      try {
        this.child.kill(signal);
      } catch {
        // Already gone.
      }
    }
  }

  onExit(listener: (exit: OmpExit) => void): Disposable {
    const subscription = disposer(this.exitListeners, listener);
    if (this.reported !== undefined) queueMicrotask(() => this.exitListeners.has(listener) && this.stopping === undefined && listener(this.reported!));
    return subscription;
  }

  onTurnEnd(listener: (end: TurnEnd) => void): Disposable {
    const subscription = disposer(this.turnEndListeners, listener);
    const early = this.earlyEnd;
    if (early !== undefined) {
      this.earlyEnd = undefined;
      queueMicrotask(() => this.turnEndListeners.has(listener) && listener(early));
    }
    return subscription;
  }

  onUpdate(listener: (notification: SessionNotification) => void): Disposable {
    for (const notification of this.updates) listener(notification);
    return disposer(this.updateListeners, listener);
  }

  onTurn(listener: (inTurn: boolean) => void): Disposable {
    return disposer(this.turnListeners, listener);
  }

  onFormRequest(listener: (request: FormRequest) => void): Disposable {
    for (const { request } of [...this.forms.values()]) listener(request);
    return disposer(this.formListeners, listener);
  }

  answerForm(requestId: string, answer: FormAnswer): void {
    const form = this.forms.get(requestId);
    if (form === undefined) return;
    this.forms.delete(requestId);
    form.resolve(answer);
  }

  onPermissionRequest(listener: (request: PermissionRequest) => void): Disposable {
    for (const { request } of [...this.permissions.values()]) listener(request);
    return disposer(this.permissionListeners, listener);
  }

  answerPermission(requestId: string, optionId: string): void {
    const pending = this.permissions.get(requestId);
    if (pending === undefined || !pending.request.options.some((option) => option.optionId === optionId)) return;
    this.permissions.delete(requestId);
    pending.resolve({ outcome: { outcome: "selected", optionId } });
    if (this.permissions.size === 0) this.releaseHeld();
  }

  onPermissionCancelled(listener: (requestId: string) => void): Disposable {
    return disposer(this.cancelledListeners, listener);
  }

  /** The requests still waiting are answered `cancelled`: Stop, the closing of the conversation or the end of the process. */
  private cancelPermissions(): void {
    this.discardHeld();
    this.closePermissions();
  }

  /** Answers every request still waiting `cancelled` and tells the view they are gone. */
  private closePermissions(): void {
    for (const [id, pending] of [...this.permissions]) {
      this.permissions.delete(id);
      pending.resolve({ outcome: { outcome: "cancelled" } });
      for (const listener of [...this.cancelledListeners]) listener(id);
    }
  }

  /** The permission requests are all answered: the messages held meanwhile go on as follow-ups, right after the answer. */
  private releaseHeld(): void {
    for (const held of this.held.splice(0)) this.send(held.prompt, "queue", held.report).then(held.resolve, held.reject);
  }

  /** The messages held for a permission request are not delivered when the conversation stops, closes or its process ends. */
  private discardHeld(): void {
    for (const held of this.held.splice(0)) {
      held.report({ status: "failed", reason: DISCARDED });
      held.resolve();
    }
  }

  /** The forms still waiting are refused: the conversation is closing or its process ended. */
  private refuseForms(): void {
    for (const [id, form] of [...this.forms]) {
      this.forms.delete(id);
      form.resolve({ action: "decline" });
    }
  }

  async models(): Promise<{ available: { id: string; name: string }[]; current?: string }> {
    const choices = this.choices;
    if (choices === undefined) return { available: [] };
    return { available: choices.available, ...(choices.current === undefined ? {} : { current: choices.current }) };
  }

  async setModel(id: string): Promise<void> {
    const choices = this.choices;
    if (choices === undefined) throw new Error("the session is not open");
    try {
      const answer = await this.connection.setSessionConfigOption({ sessionId: this.sessionId, configId: choices.configId, value: id });
      this.choices = modelChoices(answer.configOptions) ?? { ...choices, current: id };
    } catch (error) {
      throw new Error(messageOf(error));
    }
  }
}

/** The ACP client of omp: one process of `omp acp` (with `--yolo` for the yolo approval) for each session. */
export class OmpClient implements OmpClientPort {
  constructor(private readonly deps: OmpClientDeps) {}

  start(launch: OmpLaunch, first?: OmpPrompt, spawned?: (pid: number) => void): Promise<OmpSessionPort> {
    return this.open(launch, undefined, first, spawned);
  }

  resume(launch: OmpLaunch, sessionId: string, spawned?: (pid: number) => void): Promise<OmpSessionPort> {
    return this.open(launch, sessionId, undefined, spawned);
  }

  private async open(launch: OmpLaunch, reopen: string | undefined, first?: OmpPrompt, spawned?: (pid: number) => void): Promise<OmpSessionPort> {
    const ompPath = await this.deps.ompPath();
    const env = { ...process.env, ...launch.env };
    // The folder of the omp program and the folder of bun go in front of the launch's PATH, so a script of omp finds its runtime.
    env["PATH"] = ompPathVariable(ompPath, env);
    // The process leads its own group on Linux and macOS, so that stopping it stops every command omp started (`OmpSession.stop`).
    const child = spawn(ompPath === "" ? "omp" : ompPath, launch.args, { cwd: launch.cwd, env, shell: false, stdio: "pipe", detached: process.platform !== "win32" });
    // The process stands: its pid is known the moment `spawn` succeeds, and a spawn that failed has none.
    if (child.pid !== undefined) spawned?.(child.pid);
    const session = new OmpSession(child, this.deps, launch.cwd, launch.args.includes("--yolo"), launch.hook === true);
    const failed = session.watchStart();
    try {
      session.connect();
      const servers = (this.deps.mcpServers ?? readMcpServers)(launch.cwd);
      const opening = session.open(launch.cwd, servers, reopen);
      opening.catch(() => {});
      // One limit covers the whole opening: `initialize` and `session/new` (or the loading of the session), counted from the start of the process.
      await Promise.race([within(opening, this.deps.openTimeoutMs ?? RESUME_TIMEOUT_MS), failed]);
    } catch (error) {
      const problem = await explained(error, failed);
      await session.stop();
      throw new OmpStartFailure(startFailureReason(problem, ompPath), await session.errorOutput());
    }
    session.opened();
    if (first !== undefined) {
      // The first message is the prompt of the job's work: omp's answer to it, even a refusal, is `onTurnEnd`, so its promise never rejects and nothing is swallowed.
      void session.sendPrompt({ ...first, work: true });
    }
    return session;
  }
}

/** How long the error output of a process that ended may take to be complete: a command omp started can hold its pipe open. */
const STDERR_GRACE_MS = 300;

/** How long the process's own event may take to follow the closing of its pipes. */
const EVENT_GRACE_MS = 1000;

/**
 * What went wrong, from what a start threw: a problem the process's events recorded, a timeout, or omp's own refusal. The pipes close a moment before the
 * process reports its exit or its spawn error, so a closed connection waits briefly for the event that explains it.
 */
async function explained(error: unknown, failed: Promise<never>): Promise<StartProblem> {
  if (typeof error === "object" && error !== null && "kind" in error) return error as StartProblem;
  if (error instanceof ResumeTimeout) return { kind: "timeout" };
  if (error instanceof RequestError || error instanceof OmpStartFailure) return { kind: "refused", message: error.message };
  const timer = Promise.withResolvers<undefined>();
  const handle = setTimeout(() => timer.resolve(undefined), EVENT_GRACE_MS);
  const problem = await Promise.race([failed.catch((caught: StartProblem) => caught), timer.promise]);
  clearTimeout(handle);
  return problem ?? { kind: "refused", message: messageOf(error) };
}
