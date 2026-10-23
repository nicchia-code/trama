// The ACP client of omp Chat: it spawns `omp acp` (with `--yolo` only when `trama.ompChatApproval` is `yolo`) and talks to it over the process's stdio with `ClientSideConnection` of @agentclientprotocol/sdk.
//
// Verified with omp 18.12.6, which `omp acp` honours the options given before `acp`: `--hook` loads Trama's module (`trama hook start` is called with the
// process's pid), `--config` applies the overlay, `--advisor` turns the advisors on, and `--model` and `--slow` choose the models. So the options of a
// job are passed as they are in front of `acp` (`ompArguments` in `terminal-agent.ts`) and nothing has to be sent another way.
//
// What omp declares and this client uses: `_meta.steering.supported` in `initialize` (a message sent in the middle of a turn goes through the `_session/steering`
// extension method; a second `session/prompt` would cancel the running turn), the select of category `model` in the session's configuration options
// (`session/set_config_option`), and `loadSession` or `sessionCapabilities.resume` to reopen a saved session.
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
import { modelChoices, type ModelChoices, permissionOutcome, promptBlocks, reopenMethod, type StartProblem, startFailureReason, steeringSupported } from "../../../../src/core/omp-acp";
import { type AcpMcpServer, readMcpServers } from "../../../../src/core/omp-mcp";
import { RESUME_TIMEOUT_MS, ResumeTimeout, within } from "../../../../src/core/omp-chat-conversation";
import { type ModelList, ompModels, ompPathVariable } from "../model-lists";
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
} from "./ports";

/** The grace a stopped process has before it is killed. */
export const STOP_GRACE_MS = 3000;

export interface OmpClientDeps {
  /** The omp program, read at every start: the one found for `trama.ompPath`; empty means `omp` from the editor's PATH. */
  ompPath(): string | Promise<string>;
  /** The models omp lists (`omp models --json`), for a session that declares none. */
  models?(ompPath: string): Promise<ModelList>;
  /** The MCP servers of the project's native files. */
  mcpServers?(root: string): AcpMcpServer[];
  /** How long `initialize` may stay unanswered; 30 s. */
  initializeTimeoutMs?: number;
  /** How long a stopped process may take before it is killed; 3 s. */
  stopGraceMs?: number;
}

type Listeners<T> = Set<(value: T) => void>;

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
  private steering = false;

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
  private readonly waiting: { prompt: OmpPrompt; resolve: () => void; reject: (error: unknown) => void }[] = [];

  private starting = true;
  private stopping: Promise<void> | undefined;
  private exit: OmpExit | undefined;
  private failure: ((problem: StartProblem) => void) | undefined;

  constructor(
    private readonly child: ChildProcess,
    private readonly deps: OmpClientDeps,
    private readonly cwd: string,
    /** `--yolo`: omp runs without asking, and a request that comes anyway is answered with an allow option. Otherwise every request waits for the developer. */
    private readonly yolo: boolean,
  ) {
    child.stdin?.on("error", () => {});
    child.stderr?.resume();
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
    if (this.stopping === undefined && this.exit !== undefined) for (const listener of [...this.exitListeners]) listener(this.exit);
  }

  /** Runs the beginning of the session; `reopen` is the session to load or resume. */
  async open(root: string, servers: AcpMcpServer[], timeoutMs: number, reopen?: string): Promise<void> {
    this.initialized = await within(
      this.connection.initialize({ protocolVersion: PROTOCOL_VERSION, clientCapabilities: { elicitation: { form: {} } } }),
      timeoutMs,
    );
    this.steering = steeringSupported(this.initialized);
    const mcpServers = servers as never;
    if (reopen === undefined) {
      const created = await this.connection.newSession({ cwd: root, mcpServers });
      this.sessionId = created.sessionId;
      this.choices = modelChoices(created.configOptions);
      return;
    }
    const method = reopenMethod(this.initialized);
    if (method === undefined) throw new OmpStartFailure("omp cannot reopen a saved session");
    this.sessionId = reopen;
    const reopened =
      method === "load" ? await this.connection.loadSession({ sessionId: reopen, cwd: root, mcpServers }) : await this.connection.resumeSession({ sessionId: reopen, cwd: root, mcpServers });
    this.choices = modelChoices(reopened.configOptions);
  }

  /** The session is open: from now on an exit is `onExit`, not a failed start. */
  opened(): void {
    this.starting = false;
  }

  // --- Client (what omp asks of the editor) ---

  sessionUpdate(params: SessionNotification): void {
    this.updates.push(params);
    for (const listener of [...this.updateListeners]) listener(params);
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

  sendPrompt(prompt: OmpPrompt): Promise<void> {
    if (this.turn === undefined) return this.begin(prompt);
    const running = this.turn;
    if (!this.steering) return this.queue(prompt);
    return this.steer(prompt, running);
  }

  /** Sends `prompt` into the running turn; when omp does not take it (the turn ended, or it refused), it waits for the end of the turn as any other message. */
  private async steer(prompt: OmpPrompt, running: Promise<void>): Promise<void> {
    let injected = false;
    try {
      const answer = (await this.connection.extMethod("_session/steering", { sessionId: this.sessionId, prompt: promptBlocks(prompt.text, prompt.attachment) })) as { outcome?: string };
      injected = answer.outcome === "injected";
    } catch {
      injected = false;
    }
    if (injected) return running;
    return this.turn === undefined ? this.begin(prompt) : this.queue(prompt);
  }

  private queue(prompt: OmpPrompt): Promise<void> {
    const { promise, resolve, reject } = Promise.withResolvers<void>();
    this.waiting.push({ prompt, resolve, reject });
    return promise;
  }

  private begin(prompt: OmpPrompt): Promise<void> {
    const turn = this.run(prompt);
    this.turn = turn;
    return turn;
  }

  private async run(prompt: OmpPrompt): Promise<void> {
    this.setBusy(true);
    try {
      await this.connection.prompt({ sessionId: this.sessionId, prompt: promptBlocks(prompt.text, prompt.attachment) });
    } finally {
      const next = this.waiting.shift();
      if (next === undefined) {
        this.turn = undefined;
        this.setBusy(false);
      } else {
        const turn = this.run(next.prompt);
        this.turn = turn;
        turn.then(next.resolve, next.reject);
      }
    }
  }

  cancel(): void {
    this.cancelPermissions();
    void this.connection.cancel({ sessionId: this.sessionId }).catch(() => {});
  }

  stop(): Promise<void> {
    if (this.stopping !== undefined) return this.stopping;
    this.refuseForms();
    this.cancelPermissions();
    const done = Promise.withResolvers<void>();
    this.stopping = done.promise;
    if (this.child.pid === undefined || this.exit !== undefined || this.child.exitCode !== null || this.child.signalCode !== null) {
      done.resolve();
      return done.promise;
    }
    this.child.once("exit", () => done.resolve());
    this.child.kill("SIGTERM");
    const timer = setTimeout(() => this.child.kill("SIGKILL"), this.deps.stopGraceMs ?? STOP_GRACE_MS);
    void done.promise.then(() => clearTimeout(timer));
    return done.promise;
  }

  onExit(listener: (exit: OmpExit) => void): Disposable {
    const subscription = disposer(this.exitListeners, listener);
    if (this.exit !== undefined && this.stopping === undefined && !this.starting) queueMicrotask(() => this.exitListeners.has(listener) && listener(this.exit!));
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
  }

  onPermissionCancelled(listener: (requestId: string) => void): Disposable {
    return disposer(this.cancelledListeners, listener);
  }

  /** The requests still waiting are answered `cancelled`: Stop, the closing of the conversation or the end of the process. */
  private cancelPermissions(): void {
    for (const [id, pending] of [...this.permissions]) {
      this.permissions.delete(id);
      pending.resolve({ outcome: { outcome: "cancelled" } });
      for (const listener of [...this.cancelledListeners]) listener(id);
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
    if (this.choices !== undefined) return { available: this.choices.available, ...(this.choices.current === undefined ? {} : { current: this.choices.current }) };
    const listed = await (this.deps.models ?? ompModels)(await this.deps.ompPath());
    return { available: listed.models.map((model) => ({ id: model.value, name: model.label ?? model.value })) };
  }

  async setModel(id: string): Promise<void> {
    try {
      if (this.choices === undefined) {
        await this.connection.request("session/set_model", { sessionId: this.sessionId, modelId: id });
        return;
      }
      const answer = await this.connection.setSessionConfigOption({ sessionId: this.sessionId, configId: this.choices.configId, value: id });
      this.choices = modelChoices(answer.configOptions) ?? { ...this.choices, current: id };
    } catch (error) {
      throw new Error(messageOf(error));
    }
  }
}

/** The ACP client of omp: one process of `omp acp` (with `--yolo` for the yolo approval) for each session. */
export class OmpClient implements OmpClientPort {
  constructor(private readonly deps: OmpClientDeps) {}

  start(launch: OmpLaunch, first?: OmpPrompt): Promise<OmpSessionPort> {
    return this.open(launch, undefined, first);
  }

  resume(launch: OmpLaunch, sessionId: string): Promise<OmpSessionPort> {
    return this.open(launch, sessionId);
  }

  private async open(launch: OmpLaunch, reopen: string | undefined, first?: OmpPrompt): Promise<OmpSessionPort> {
    const ompPath = await this.deps.ompPath();
    const env = { ...process.env, ...launch.env };
    // The folder of the omp program and the folder of bun go in front of the launch's PATH, so a script of omp finds its runtime.
    env["PATH"] = ompPathVariable(ompPath, env);
    const child = spawn(ompPath === "" ? "omp" : ompPath, launch.args, { cwd: launch.cwd, env, shell: false, stdio: "pipe" });
    const session = new OmpSession(child, this.deps, launch.cwd, launch.args.includes("--yolo"));
    const failed = session.watchStart();
    try {
      session.connect();
      const servers = (this.deps.mcpServers ?? readMcpServers)(launch.cwd);
      const opening = session.open(launch.cwd, servers, this.deps.initializeTimeoutMs ?? RESUME_TIMEOUT_MS, reopen);
      opening.catch(() => {});
      await Promise.race([opening, failed]);
    } catch (error) {
      const problem = await explained(error, failed);
      await session.stop();
      throw new OmpStartFailure(startFailureReason(problem, ompPath));
    }
    session.opened();
    if (first !== undefined) session.sendPrompt(first).catch(() => {});
    return session;
  }
}

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
