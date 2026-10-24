import { randomUUID } from "node:crypto";
import { GENERAL_ID } from "../../../../src/core/omp-chat-view";
import { drawnPhase, GENERAL_INITIAL, type GeneralEffect, type GeneralEvent, type GeneralMachine, GeneralQueue, generalStep, returnedText } from "../../../../src/core/omp-chat-general";
import { exitReason, savedEnv } from "../../../../src/core/omp-chat-conversation";
import type { GeneralError } from "../../omp-chat-protocol";
import type { ChatViewPort, Disposable, OmpClientPort, OmpExit, OmpLaunch, OmpSessionPort, OutgoingMessage } from "./ports";
import type { ConversationStore } from "./conversations";

/** The saved entry of General (`trama.ompChat.general` in `workspaceState`): enough to resume its session in a new process. */
export interface SavedGeneral {
  id: string;
  sessionId: string;
  args: string[];
  env: Record<string, string>;
  startedAt: string;
}

export const GENERAL_KEY = "trama.ompChat.general";

/** The saved entry read back, or undefined when it is missing or unreadable (then it is dropped and General starts a new session). */
export function readSavedGeneral(store: ConversationStore): SavedGeneral | undefined {
  const value = store.get(GENERAL_KEY) as Partial<SavedGeneral> | undefined;
  if (value === undefined) return undefined;
  const valid = typeof value.id === "string" && typeof value.sessionId === "string" && value.sessionId !== "" && Array.isArray(value.args) && typeof value.env === "object" && value.env !== null && typeof value.startedAt === "string";
  return valid ? (value as SavedGeneral) : undefined;
}

/**
 * The arguments of a start or a resume: `--append-system-prompt <file>` before the `acp` subcommand, after the options (`omp [--model m] acp [--yolo]`).
 * The saved arguments never carry it: every start and resume adds it again, from the file of this extension.
 */
export function withGeneralInstructions(args: string[], file: string): string[] {
  const at = args.indexOf("acp");
  if (at < 0) throw new Error("omp's arguments have no acp subcommand.");
  return [...args.slice(0, at), "--append-system-prompt", file, ...args.slice(at)];
}

/** What the host gives General: the window, the settings, the ACP client, the view and the ends of work it needs. */
export interface GeneralDeps {
  client: OmpClientPort;
  view: ChatViewPort;
  store: ConversationStore;
  /** The folder the window has open, undefined when none. */
  folder(): string | undefined;
  /** omp Chat is on (`trama.ompChat`) and this window can open conversations. */
  usable(): boolean;
  /** `trama.ompPath`, trimmed. */
  ompPath(): string;
  /** The program omp runs as, undefined when omp is not installed. */
  findOmp(ompPath: string): Promise<string | undefined>;
  /** The launch of a new session: `omp [--model m] acp [--yolo]` with Trama's environment for `terminalId`. */
  launch(root: string, terminalId: string): Promise<OmpLaunch>;
  /** The launch of a saved session: the saved arguments and variables, with the endpoint and PATH of this window. */
  resumeLaunch(root: string, args: string[], env: Record<string, string>): Promise<OmpLaunch>;
  /** The file of General's instructions (`media/general.md`) in this extension's package, undefined when the package has none: every start and resume passes it to omp. */
  instructions(): string | undefined;
  /** Ends General's work as a terminal's end does (the same `endAgentWork` the agent terminals use): releases what it took, withdraws its announcements, and forgets its process. It never disposes or idles a terminal. */
  endWork(terminalId: string, root: string): void;
  /** The confirmation of a clear or a close while the agent is in a turn. */
  confirm(message: string, detail: string, button: string): Promise<boolean>;
  /** Runs Install omp, as Settings does. */
  install(): void;
  /** The clock of `startedAt` (tests). */
  now?: () => Date;
}

const CLEAR_MESSAGE = "Clear General and stop its agent?";
const CLEAR_DETAIL = "The conversation and its agent end; a new conversation starts.";
const CLEAR_BUTTON = "Clear";

/**
 * The conversation General of omp Chat (Machine `omp-chat-general`): one process of omp per window that has a folder, started on its own, never a Trama
 * job. The transitions are `generalStep`; this class runs their effects and reports the result back as events.
 */
export class GeneralConversation implements Disposable {
  private machine: GeneralMachine = GENERAL_INITIAL;
  private readonly queue = new GeneralQueue();
  private readonly subscriptions: Disposable[] = [];
  private session: OmpSessionPort | undefined;
  private exitListener: Disposable | undefined;
  private record: SavedGeneral | undefined;
  /** The identity of General's process: kept after its entry is discarded, so the announcements it made are still withdrawn. */
  private terminalId: string | undefined;
  private failure: GeneralError | undefined;
  private pendingFailure: GeneralError | undefined;
  private newSession = false;
  /** Bumped when a start, a resume or the process of General is dropped: an open that finishes late is stopped. */
  private token = 0;
  private stopping: Promise<void> = Promise.resolve();

  constructor(private readonly deps: GeneralDeps) {
    const { view } = deps;
    this.subscriptions.push(
      view.onStopRequested((id) => id === GENERAL_ID && this.dispatch({ type: "stop" })),
      view.onCloseRequested((id) => id === GENERAL_ID && this.close()),
      view.onClearGeneralRequested(() => void this.clear()),
      view.onInstallOmpRequested(() => deps.install()),
      view.onGeneralMessage((message) => this.send(message)),
    );
  }

  /** The window opened or the setting changed: General starts, resumes, stays or goes as omp Chat is on and the window has a folder. */
  start(): void {
    this.record = readSavedGeneral(this.deps.store);
    if (this.record === undefined && this.deps.store.get(GENERAL_KEY) !== undefined) void this.deps.store.update(GENERAL_KEY, undefined);
    this.settings();
  }

  /** `trama.ompChat` changed in this window: General starts, or leaves as it is switched off. */
  settingsChanged(): void {
    this.settings();
  }

  /** `editor.WINDOW_CLOSED`: the process of General stops; its session stays saved for the next window. Resolves when the process is gone. */
  async windowClosed(): Promise<void> {
    this.dispatch({ type: "windowClosed" });
    await this.stopping;
  }

  dispose(): void {
    for (const subscription of this.subscriptions) subscription.dispose();
    this.exitListener?.dispose();
  }

  /** The developer sent a message from General's field. While General's agent works, the message goes to it at once in the chosen mode; otherwise it waits for the session. */
  private send(message: OutgoingMessage): void {
    if (message.text === "") return;
    const session = this.session;
    if (session !== undefined && session.inTurn) {
      session.send({ text: message.text }, message.mode, message.report).catch(() => this.deps.view.returnToField(GENERAL_ID, message.text));
      return;
    }
    this.queue.push(message.text);
    this.dispatch({ type: "send" });
  }

  private settings(): void {
    const folder = this.deps.folder();
    const usable = folder !== undefined && this.deps.usable();
    const inTurn = this.session?.inTurn === true;
    this.dispatch({ type: "settings", usable, inTurn, saved: this.record !== undefined });
    // A saved session at the start of the window is resumed as soon as General is waiting for it.
    if (this.machine.phase === "waiting") this.dispatch({ type: "reopen" });
  }

  private async clear(): Promise<void> {
    if (this.machine.phase === "absent") return;
    if (this.session?.inTurn === true && !(await this.deps.confirm(CLEAR_MESSAGE, CLEAR_DETAIL, CLEAR_BUTTON))) return;
    this.dispatch({ type: "clear" });
  }

  private close(): void {
    if (this.machine.phase !== "kept") return;
    void (async () => {
      if (this.session?.inTurn === true && !(await this.deps.confirm(CLEAR_MESSAGE, CLEAR_DETAIL, CLEAR_BUTTON))) return;
      this.dispatch({ type: "close" });
    })();
  }

  private dispatch(event: GeneralEvent): void {
    const step = generalStep(this.machine, event);
    this.machine = step.next;
    for (const effect of step.effects) this.run(effect);
    this.publish();
  }

  private run(effect: GeneralEffect): void {
    switch (effect) {
      case "show":
        this.deps.view.showGeneral();
        return;
      case "removed":
        this.deps.view.removeGeneral();
        return;
      case "start":
        void this.open("start");
        return;
      case "startNew":
        void this.open("startNew");
        return;
      case "resume":
        void this.open("resume");
        return;
      case "stop":
        this.stopSession();
        return;
      case "discard":
        this.discardRecord();
        return;
      case "withdraw":
        {
          const root = this.deps.folder();
          if (this.terminalId !== undefined && root !== undefined) this.deps.endWork(this.terminalId, root);
        }
        return;
      case "save":
        if (this.record !== undefined) void this.deps.store.update(GENERAL_KEY, this.record);
        return;
      case "deliver":
        this.deliver();
        return;
      case "wait":
        return;
      case "cancel":
        this.session?.cancel();
        return;
      case "failed": {
        this.failure = this.pendingFailure;
        const text = returnedText(this.queue.take());
        if (text !== "") this.deps.view.returnToField(GENERAL_ID, text);
        return;
      }
      case "missing":
        // The error is set by `failed`: the phase and the notice of General show it; no editor notice.
        return;
      case "exited":
        this.failure = this.pendingFailure;
        return;
      case "cleared":
        this.failure = undefined;
        this.newSession = false;
        this.queue.take();
        this.deps.view.generalCleared();
        return;
    }
  }

  /** Sends the waiting messages to the session that is open; a message that the session refuses goes back into the field. */
  private deliver(): void {
    const session = this.session;
    const text = returnedText(this.queue.take());
    if (text === "") return;
    if (session === undefined) {
      this.deps.view.returnToField(GENERAL_ID, text);
      return;
    }
    session.sendPrompt({ text }).catch(() => this.deps.view.returnToField(GENERAL_ID, text));
  }

  private publish(): void {
    const phase = drawnPhase(this.machine.phase);
    if (phase === undefined) return;
    this.deps.view.generalStatus({ phase, ...(this.failure === undefined ? {} : { error: this.failure }), ...(this.newSession ? { newSession: true } : {}) });
  }

  /** Opens a process of omp: a new session, or the saved session of the previous process (`resume`). Any outcome is an event of the machine. */
  private async open(mode: "start" | "startNew" | "resume"): Promise<void> {
    const token = ++this.token;
    const folder = this.deps.folder();
    if (folder === undefined) return;
    this.pendingFailure = undefined;
    const ompPath = this.deps.ompPath();
    if ((await this.deps.findOmp(ompPath)) === undefined) {
      this.pendingFailure = { kind: "missing" };
      if (token === this.token) this.dispatch({ type: "startFailed", missing: true });
      return;
    }
    const instructions = this.deps.instructions();
    if (instructions === undefined) {
      this.pendingFailure = { kind: "start", reason: "its instructions are missing from the extension's package" };
      if (token === this.token) this.dispatch({ type: "startFailed", missing: false });
      return;
    }
    const saved = mode === "resume" ? this.record : undefined;
    const terminalId = saved?.id ?? randomUUID();
    let opened: { session: OmpSessionPort; launch: OmpLaunch } | undefined;
    try {
      const launch = saved === undefined ? await this.deps.launch(folder, terminalId) : await this.deps.resumeLaunch(folder, saved.args, saved.env);
      const started: OmpLaunch = { ...launch, args: withGeneralInstructions(launch.args, instructions) };
      const session = saved === undefined ? await this.deps.client.start(started) : await this.deps.client.resume(started, saved.sessionId);
      opened = { session, launch };
    } catch (err) {
      if (token !== this.token) return;
      const reason = err instanceof Error ? err.message : String(err);
      if (saved !== undefined) {
        // The saved session did not come back: its entry goes before the new session writes its own.
        this.discardRecord();
        this.dispatch({ type: "sessionNotResumed" });
        return;
      }
      this.pendingFailure = { kind: "start", reason };
      this.dispatch({ type: "startFailed", missing: false });
      return;
    }
    if (token !== this.token) {
      void opened.session.stop();
      return;
    }
    this.attach(opened.session, opened.launch, terminalId, saved !== undefined, mode === "startNew");
    this.dispatch({ type: saved !== undefined ? "sessionResumed" : "sessionStarted" });
  }

  /** The session of a process is General's: its exit is an event (except a stop Trama asked for), and its saved entry is written. */
  private attach(session: OmpSessionPort, launch: OmpLaunch, terminalId: string, resumed: boolean, fresh: boolean): void {
    this.session = session;
    this.terminalId = terminalId;
    this.newSession = fresh;
    this.failure = undefined;
    this.record = {
      id: terminalId,
      sessionId: session.sessionId,
      args: [...launch.args],
      env: savedEnv(launch.env),
      startedAt: resumed && this.record !== undefined ? this.record.startedAt : (this.deps.now?.() ?? new Date()).toISOString(),
    };
    this.exitListener = session.onExit((exit: OmpExit) => this.exited(session, exit));
    this.deps.view.setGeneralSession(session);
    this.run("save");
  }

  private exited(session: OmpSessionPort, exit: OmpExit): void {
    if (this.session !== session) return;
    this.exitListener?.dispose();
    this.exitListener = undefined;
    this.session = undefined;
    this.deps.view.setGeneralSession(undefined);
    this.pendingFailure = { kind: "exited", reason: exitReason(exit.code, exit.signal) ?? "omp exited" };
    this.dispatch({ type: "exited" });
  }

  /** Stops the process of General (cancelled turn, permissions and forms gone); no exit event is raised for it. */
  private stopSession(): void {
    this.token++;
    const session = this.session;
    this.exitListener?.dispose();
    this.exitListener = undefined;
    this.session = undefined;
    this.deps.view.setGeneralSession(undefined);
    if (session === undefined) return;
    session.cancel();
    this.stopping = session.stop().catch(() => undefined);
  }

  private discardRecord(): void {
    this.record = undefined;
    void this.deps.store.update(GENERAL_KEY, undefined);
  }
}
