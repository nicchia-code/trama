import {
  CONVERSATIONS_KEY,
  closeDialog,
  closeNeedsConfirmation,
  type ConversationEffect,
  type ConversationEvent,
  conversationStep,
  type ConversationState,
  RESUME_PROMPT,
  readSavedConversations,
  resumeDecision,
  type SavedConversation,
  type SavedJob,
  savedEnv,
  SESSION_NOT_RESUMED_REASON,
  type TurnEnd,
  within,
  withoutSavedConversation,
  withSavedConversation,
} from "../../../../src/core/omp-chat-conversation";
import { type ChatViewPort, type Disposable, type OmpClientPort, type OmpLaunch, type OmpPrompt, OmpStartFailure, type OmpSessionPort, type PendingInstruction } from "./ports";

/**
 * What the window's away notices (`away-notices.ts`) hear of the conversations. Every call but `opened` is about a conversation with Trama's hook, the only ones that give
 * notices; `opened` is told of every conversation (`job` says it has the hook), for a conversation of omp Chat opening cancels a finished notice.
 */
export interface ConversationNotices {
  opened(conversation: ConversationInfo, job: boolean): void;
  /** The conversation went from the window, however it ended. */
  closed(conversation: ConversationInfo): void;
  /** `omp-acp.TURN_ENDED` from Agent running, once the job ended and the conversation moved. */
  turnEnded(conversation: ConversationInfo, end: TurnEnd): void;
  /** `omp-acp.EXITED`, with whether the agent was in Agent running. */
  exited(conversation: ConversationInfo, wasRunning: boolean): void;
  /** A `session/update` or a message of the developer. */
  activity(conversation: ConversationInfo): void;
  /** A `session/request_permission` waits for the developer. */
  permissionAsked(conversation: ConversationInfo, request: string): void;
  /** The developer chose an option of the request, or it was answered `cancelled`. */
  permissionSettled(conversation: ConversationInfo, request: string): void;
}

/** What the conversations need of the rest of the host (`agent.ts`): the end of a job's work, the registry of agent processes, the dialogs and the settings. */
export interface ConversationHooks {
  /** `trama.autoExit`, read when omp answers the prompt of the work. */
  autoExit(): boolean;
  /** Ends the work of the conversation as the end of a terminal's work does: releases what it took, withdraws its announcements, ends its job (with `abnormal` when the end is not normal) and forgets its registered process. */
  endWork(conversation: ConversationInfo, abnormal?: string): void;
  /** The Board notice that Trama stopped following `name`, with its reason and, when omp wrote any, the last lines of its error output. */
  reportStopped(name: string, reason: string, details?: string): void;
  /** The Board notice that the agent of `name` stopped abnormally: the model refused, a limit was reached or omp refused the prompt. */
  reportAgentStopped(name: string, reason: string): void;
  /** Registers the process of the conversation's agent in the registry of every window's execution check, as soon as it is started. */
  registerProcess(conversation: ConversationInfo, pid: number): void;
  /** Forgets the registered process of a conversation that did not open: its process is stopped. */
  unregisterProcess(conversation: ConversationInfo): void;
  /** Interrupts the question round the conversation is waiting on, if any. */
  interruptQuestions(conversation: ConversationInfo): void;
  /** Puts the saved job of a conversation to resume back in the registry of jobs, with its announcement. */
  restoreJob(conversation: ConversationInfo, job: SavedJob): void;
  /** The project a window's saved conversations belong to, or undefined when there is none. */
  projectRoot(): string | undefined;
  /** The launch of a saved conversation: its arguments, its saved Trama variables and the ones made again (question endpoint, PATH). */
  resumeLaunch(root: string, args: string[], env: Record<string, string>): Promise<OmpLaunch>;
  /** A modal confirmation of the editor: true when the developer pressed `button`. */
  confirm(message: string, detail: string, button: string): Promise<boolean>;
  /** What the window's away notices hear of the conversations. */
  notices: ConversationNotices;
}

/** Where the open conversations are saved: `ExtensionContext.workspaceState`. */
export interface ConversationStore {
  get(key: string): unknown;
  update(key: string, value: unknown): PromiseLike<void>;
}

/** What the rest of the host knows about a conversation. */
export interface ConversationInfo {
  /** The identity: the `TRAMA_TERMINAL` of the conversation's process. */
  id: string;
  jobId?: string;
  root: string;
  name: string;
  since: number;
}

interface Conversation extends ConversationInfo {
  state: ConversationState;
  session?: OmpSessionPort;
  args: string[];
  env: Record<string, string>;
  /** Whether it is a job conversation with Trama's hook: omp's forms are declined at once in it. Saved with the entry, never derived from the arguments. */
  hook: boolean;
  job?: SavedJob;
  openedAt: string;
  exitListener?: Disposable;
  turnListener?: Disposable;
  /** The listeners of the away notices on the session's port, disposed when the conversation closes. */
  noticeListeners?: Disposable[];
  /** An Ask more that has not had its first message: nothing of it is saved, and a window that closes ends it at once. */
  empty?: true;
}

/** Ask more's instruction, held for the first message of its conversation: the placeholder of the empty field, the prompt that message goes as (`compose`), and
 * what runs as that message starts (`announce`: the work card). */
export interface HeldInstruction {
  placeholder: string;
  compose(message: string): OmpPrompt;
  announce(): void;
}

/** What opens a conversation: everything the terminal that it replaces would have been given. The job and announcement are already written by the caller under `id`. */
export interface OpenConversation {
  id: string;
  root: string;
  name: string;
  launch: OmpLaunch;
  /** The first message, when there is one (Ask more has one). */
  first?: OmpPrompt;
  /** Ask more takes the focus; jobs do not. */
  focus: boolean;
  /** Whether it is a job conversation with Trama's hook (a job whose package carries the hook module); Ask more and General are not. Omp's forms are declined at once in it, even when the hook did not load. */
  hook: boolean;
  job?: SavedJob;
  /** Ask more's instruction, held for the developer's first message: the conversation opens with no message of its own. */
  instruction?: HeldInstruction;
}

/** A conversation that did not open: why, and the last lines omp wrote on its error output. */
export type OpenResult = { opened: true } | { opened: false; reason: string; details?: string };

const messageOf = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/** The result of a start that failed: its reason and, when omp wrote some, the tail of its error output. */
const notOpened = (err: unknown): OpenResult => ({ opened: false, reason: messageOf(err), ...(err instanceof OmpStartFailure && err.details !== undefined ? { details: err.details } : {}) });

/** The conversations of omp Chat of one window (`omp-chat-conversation` Machine): each has its process, its state and its place in the registry of jobs. */
export class OmpConversations {
  private readonly conversations = new Map<string, Conversation>();
  private saved: SavedConversation[] = [];
  private readonly subscriptions: Disposable[];

  constructor(
    private readonly client: OmpClientPort,
    private readonly view: ChatViewPort,
    private readonly store: ConversationStore,
    private readonly hooks: ConversationHooks,
  ) {
    this.subscriptions = [
      view.onStopRequested((id) => void this.stopRequested(id)),
      view.onCloseRequested((id) => void this.closeRequested(id)),
    ];
  }

  /** The conversation `id`, if this window has it open. */
  has(id: string): boolean {
    return this.conversations.has(id);
  }

  /** Whether `id` is a conversation of a job that has not ended, working or waiting to resume: every conversation with Trama's hook is one, with or without a job in the registry (a job without the hook module is one too), and it is followed by its turn end. */
  followsJob(id: string): boolean {
    const conversation = this.conversations.get(id);
    return conversation !== undefined && (conversation.hook || conversation.job !== undefined) && (conversation.state === "running" || conversation.state === "waiting");
  }

  /** The name of the conversation `id` (the one on its tab) and its project, when this window has it open. */
  named(id: string): { name: string; root: string } | undefined {
    const conversation = this.conversations.get(id);
    return conversation === undefined ? undefined : { name: conversation.name, root: conversation.root };
  }

  /** Whether a job conversation of this window is in Agent running: one with Trama's hook (or a job of the registry) whose agent works. Ask more and General never count. */
  workingJobs(): boolean {
    return [...this.conversations.values()].some((conversation) => (conversation.hook || conversation.job !== undefined) && conversation.state === "running");
  }

  /** Opens a conversation. On a failed start nothing stays open or saved, and the reason is returned: the caller sends the same instruction to a terminal. */
  async open(spec: OpenConversation): Promise<OpenResult> {
    if (spec.instruction !== undefined) return this.openHeld(spec, spec.instruction);
    const conversation: Conversation = {
      id: spec.id,
      ...(spec.job === undefined ? {} : { jobId: spec.job.id, job: spec.job }),
      root: spec.root,
      name: spec.name,
      since: Date.now(),
      state: "running",
      args: spec.launch.args,
      env: savedEnv(spec.launch.env),
      hook: spec.hook,
      openedAt: new Date().toISOString(),
    };
    this.conversations.set(spec.id, conversation);
    this.hooks.notices.opened(conversation, spec.hook);
    let session: OmpSessionPort;
    try {
      // The first message is the prompt of the job's work: the client marks it, and omp's answer to it ends the work.
      session = await this.client.start({ ...spec.launch, hook: spec.hook }, spec.first, (pid) => this.hooks.registerProcess(conversation, pid));
    } catch (err) {
      this.conversations.delete(spec.id);
      this.hooks.notices.closed(conversation);
      this.hooks.unregisterProcess(conversation);
      return notOpened(err);
    }
    this.attach(conversation, session);
    this.persist(conversation);
    this.view.open({ id: conversation.id, name: conversation.name }, session, { focus: spec.focus, ...(spec.first === undefined ? {} : { first: spec.first }) });
    this.view.setWorking(conversation.id, true);
    return { opened: true };
  }

  /**
   * Opens a conversation that waits for the developer's first message (Ask more): its tab shows at once, while omp starts, and nothing is sent. The conversation
   * stays idle until that message, which takes the instruction: then it is saved, followed and announced as any other. A failed start leaves nothing and returns the reason.
   */
  private async openHeld(spec: OpenConversation, held: HeldInstruction): Promise<OpenResult> {
    const conversation: Conversation = {
      id: spec.id,
      root: spec.root,
      name: spec.name,
      since: Date.now(),
      state: "idle",
      args: spec.launch.args,
      env: savedEnv(spec.launch.env),
      hook: spec.hook,
      openedAt: new Date().toISOString(),
      empty: true,
    };
    this.conversations.set(spec.id, conversation);
    this.hooks.notices.opened(conversation, spec.hook);
    const instruction: PendingInstruction = {
      placeholder: held.placeholder,
      compose: (message) => held.compose(message),
      sent: () => this.heldSent(conversation, held.announce),
    };
    this.view.open({ id: spec.id, name: spec.name }, undefined, { focus: spec.focus, instruction });
    let session: OmpSessionPort;
    try {
      session = await this.client.start({ ...spec.launch, hook: spec.hook }, undefined, (pid) => this.hooks.registerProcess(conversation, pid));
    } catch (err) {
      this.conversations.delete(spec.id);
      this.hooks.notices.closed(conversation);
      this.hooks.unregisterProcess(conversation);
      this.view.close(spec.id);
      return notOpened(err);
    }
    // The developer may have closed the tab while omp started: nothing is open to take the process then, so it is stopped.
    if (this.conversations.get(spec.id) !== conversation) {
      await session.stop().catch(() => undefined);
      this.hooks.unregisterProcess(conversation);
      return { opened: true };
    }
    this.attach(conversation, session);
    this.view.setSession(spec.id, session);
    return { opened: true };
  }

  /** The first message of a held conversation starts: the conversation is working for Trama, it is saved, and its work is announced. */
  private heldSent(conversation: Conversation, announce: () => void): void {
    if (this.conversations.get(conversation.id) !== conversation) return;
    conversation.state = "running";
    delete conversation.empty;
    this.persist(conversation);
    this.view.setWorking(conversation.id, true);
    announce();
  }

  /** `developer.STOP_CHAT_AGENT`: after the confirmation, the turn of the agent is cancelled. */
  async stopRequested(id: string): Promise<void> {
    const conversation = this.conversations.get(id);
    if (conversation === undefined || conversation.session === undefined) return;
    if (!(await this.hooks.confirm(`Stop the agent in ${conversation.name}?`, "The agent stops its current turn.", "Stop"))) return;
    if (conversation.state === "running") this.step(conversation, { type: "developer.STOP_CHAT_AGENT" });
    // At rest for Trama the agent may be in a turn for a message of the developer: Stop ends it all the same, and Trama follows nothing.
    else if (conversation.state === "idle") {
      conversation.session.cancel();
      this.hooks.interruptQuestions(conversation);
    }
  }

  /** Closes the conversation `id` without asking, when it is running or idle: Stop of a PR Check. Returns whether this window had it. */
  close(id: string): boolean {
    const conversation = this.conversations.get(id);
    if (conversation === undefined || (conversation.state !== "running" && conversation.state !== "idle")) return false;
    this.step(conversation, { type: "developer.CLOSE_CHAT_CONVERSATION" });
    return true;
  }

  /** `developer.CLOSE_CHAT_CONVERSATION`: confirmed first only when the agent is in a turn. */
  async closeRequested(id: string): Promise<void> {
    const conversation = this.conversations.get(id);
    if (conversation === undefined || (conversation.state !== "running" && conversation.state !== "idle")) return;
    if (closeNeedsConfirmation(conversation.session?.inTurn === true)) {
      const dialog = closeDialog(conversation.name);
      const confirmed = await this.hooks.confirm(dialog.message, dialog.detail, dialog.button);
      if (!confirmed) return;
    }
    if (this.conversations.get(id) !== conversation) return;
    this.step(conversation, { type: "developer.CLOSE_CHAT_CONVERSATION" });
  }

  /**
   * `editor.WINDOW_CLOSED`: the window closes or reloads. Every conversation stops its process and keeps its saved entry, its job and its announcements, to be
   * resumed. A conversation with no hook (Ask more) saves whether its agent was in a turn as its state. Resolves when the processes are gone.
   */
  async windowClosed(): Promise<void> {
    const stopped: Promise<void>[] = [];
    for (const conversation of [...this.conversations.values()]) {
      // Ask more (no hook, no job) saves whether its agent was in a turn as its state, and reopens at rest either way; a job's conversation keeps its own state, with or without the hook.
      if (conversation.state === "running" && !conversation.hook && conversation.job === undefined) this.persist(conversation, conversation.session?.inTurn === true ? "running" : "idle");
      const stops = this.step(conversation, { type: "editor.WINDOW_CLOSED" });
      stopped.push(...stops);
    }
    for (const subscription of this.subscriptions) subscription.dispose();
    await Promise.all(stopped);
  }

  /**
   * Resumes the conversations saved by this window (activation). Each reopens its session in a new process with the same arguments and identity: back as it was
   * (working with the fixed prompt, or at rest with its history) or, when it cannot, lost with its job ended as for a vanished agent. An unreadable entry is
   * deleted at once without a resume. A conversation's Tasks are not released before its outcome: it is followed while it waits.
   */
  async resume(): Promise<void> {
    const { entries, unreadable } = readSavedConversations(this.store.get(CONVERSATIONS_KEY));
    const root = this.hooks.projectRoot();
    this.saved = entries;
    if (unreadable.length > 0 || (this.store.get(CONVERSATIONS_KEY) !== undefined && entries.length === 0)) void this.store.update(CONVERSATIONS_KEY, entries);
    if (root !== undefined) {
      for (const lost of unreadable) {
        // A conversation with the hook is a job's, with or without a job in the registry: its work ends as for a resume that failed.
        if (lost.id === undefined || (lost.job === undefined && lost.hook !== true)) continue;
        this.hooks.endWork({ id: lost.id, ...(lost.job === undefined ? {} : { jobId: lost.job.id }), root, name: lost.name ?? lost.job?.name ?? lost.id, since: Date.now() }, SESSION_NOT_RESUMED_REASON);
      }
    }
    const waiting = entries.map((entry): Conversation => {
      const conversation: Conversation = {
        id: entry.id,
        ...(entry.job === undefined || entry.state !== "running" ? {} : { jobId: entry.job.id, job: entry.job }),
        root: root ?? "",
        name: entry.name,
        since: Date.now(),
        state: "waiting",
        args: entry.args,
        env: entry.env,
        hook: entry.hook,
        openedAt: entry.openedAt,
      };
      this.conversations.set(entry.id, conversation);
      return conversation;
    });
    // The jobs stand again before the execution check can look at their Tasks; a conversation is followed while it waits (`followsJob`).
    for (const conversation of waiting) {
      if (root !== undefined && conversation.job !== undefined) this.hooks.restoreJob(conversation, conversation.job);
    }
    await Promise.all(waiting.map((conversation, index) => this.resumeOne(conversation, entries[index] as SavedConversation, root)));
  }

  private async resumeOne(conversation: Conversation, entry: SavedConversation, root: string | undefined): Promise<void> {
    const wasRunning = resumeDecision(entry).wasRunning;
    const lost = (cause?: unknown) =>
      this.step(conversation, {
        type: "omp-acp.SESSION_NOT_RESUMED",
        wasRunning,
        ...(cause === undefined ? {} : { cause: messageOf(cause) }),
        ...(cause instanceof OmpStartFailure && cause.details !== undefined ? { details: cause.details } : {}),
      });
    if (root === undefined) {
      lost();
      return;
    }
    let attempt: Promise<OmpSessionPort> | undefined;
    let session: OmpSessionPort;
    try {
      const launch = await this.hooks.resumeLaunch(root, entry.args, entry.env);
      attempt = this.client.resume({ ...launch, hook: entry.hook }, entry.sessionId, (pid) => this.hooks.registerProcess(conversation, pid));
      session = await within(attempt);
    } catch (err) {
      // A late answer of a resume that was given up is stopped: no process stays orphan.
      void attempt?.then((late) => late.stop(), () => undefined);
      lost(err);
      return;
    }
    this.attach(conversation, session);
    const decision = resumeDecision(entry);
    this.view.open({ id: conversation.id, name: conversation.name }, session, { focus: false, ...(decision.notice === undefined ? {} : { notice: decision.notice }) });
    this.step(conversation, { type: "omp-acp.SESSION_RESUMED", wasRunning: decision.wasRunning });
    this.hooks.notices.opened(conversation, conversation.hook);
    this.view.setWorking(conversation.id, conversation.state === "running");
  }

  /**
   * Binds the session to the conversation: the end of the process Trama did not ask for is `omp-acp.EXITED` and, for a job, omp's answer to the prompt of the work
   * is `omp-acp.TURN_ENDED`. The session keeps an end that came before this, so no end is missed.
   */
  private attach(conversation: Conversation, session: OmpSessionPort): void {
    conversation.session = session;
    const current = (): boolean => this.conversations.get(conversation.id) === conversation;
    conversation.exitListener = session.onExit((exit) => {
      if (!current()) return;
      const before = conversation.state;
      this.step(conversation, { type: "omp-acp.EXITED", code: exit.code, signal: exit.signal, ...(exit.details === undefined ? {} : { details: exit.details }) });
      if (conversation.hook && (before === "running" || before === "idle")) this.hooks.notices.exited(conversation, before === "running");
    });
    // A conversation with Trama's hook is a job's work whether or not it has a job in the registry, and so is a job without the hook: its turn end ends the work.
    if (conversation.hook || conversation.job !== undefined) {
      conversation.turnListener = session.onTurnEnd((end) => {
        if (!current()) return;
        const before = conversation.state;
        this.step(conversation, { type: "omp-acp.TURN_ENDED", end });
        if (conversation.hook && before === "running") this.hooks.notices.turnEnded(conversation, end);
      });
    }
    // The signals of the away notices come from the session's own port, once per request: the view replays the requests that wait when the webview comes back, the port does not.
    if (conversation.hook) {
      conversation.noticeListeners = [
        session.onUpdate(() => this.hooks.notices.activity(conversation)),
        session.onSend(() => this.hooks.notices.activity(conversation)),
        session.onPermissionRequest((request) => this.hooks.notices.permissionAsked(conversation, request.requestId)),
        session.onPermissionAnswered((requestId) => this.hooks.notices.permissionSettled(conversation, requestId)),
        session.onPermissionCancelled((requestId) => this.hooks.notices.permissionSettled(conversation, requestId)),
      ];
    }
  }

  /** Applies an Event: moves the conversation and carries out the effects the Machine names. Returns the stops of processes it started. */
  private step(conversation: Conversation, event: ConversationEvent): Promise<void>[] {
    const before = conversation.state;
    const next = conversationStep(before, event, this.hooks.autoExit(), conversation.empty === true);
    conversation.state = next.state;
    // The conversation closes or its process exits: the rounds its agent asked end with it, as they do when the developer stops its turn.
    if ((before === "running" || before === "idle") && (event.type === "developer.CLOSE_CHAT_CONVERSATION" || event.type === "omp-acp.EXITED")) this.hooks.interruptQuestions(conversation);
    const stops: Promise<void>[] = [];
    for (const effect of next.effects) this.apply(conversation, effect, stops);
    return stops;
  }

  private apply(conversation: Conversation, effect: ConversationEffect, stops: Promise<void>[]): void {
    switch (effect.effect) {
      case "end-work":
        this.hooks.endWork(conversation, effect.abnormal);
        return;
      case "stop-process-for-window":
        // The window is closing: there is little time, so `session/close` is skipped.
        if (conversation.session !== undefined) stops.push(conversation.session.stop({ deactivating: true }).catch(() => undefined));
        return;
      case "stop-process":
        if (conversation.session !== undefined) stops.push(conversation.session.stop().catch(() => undefined));
        return;
      case "cancel-turn":
        conversation.session?.cancel();
        return;
      case "interrupt-questions":
        this.hooks.interruptQuestions(conversation);
        return;
      case "report-stopped":
        this.hooks.reportStopped(conversation.name, effect.reason, effect.details);
        return;
      case "report-agent-stopped":
        this.hooks.reportAgentStopped(conversation.name, effect.reason);
        return;
      case "save-state":
        this.persist(conversation, effect.state);
        this.view.setWorking(conversation.id, effect.state === "running");
        return;
      case "continue-work":
        // The fixed message that continues the work of a job is its prompt of work: omp's answer to it, a refusal included, ends the work (`onTurnEnd`), so nothing is swallowed.
        void conversation.session?.sendPrompt({ text: RESUME_PROMPT, work: true });
        return;
      case "close":
        conversation.exitListener?.dispose();
        conversation.turnListener?.dispose();
        for (const listener of conversation.noticeListeners ?? []) listener.dispose();
        this.conversations.delete(conversation.id);
        this.hooks.notices.closed(conversation);
        this.saved = withoutSavedConversation(this.saved, conversation.id);
        void this.store.update(CONVERSATIONS_KEY, this.saved);
        this.view.close(conversation.id);
        return;
    }
  }

  /** Writes the conversation's entry (it exists once the session has its identity) with `state`. */
  private persist(conversation: Conversation, state: "running" | "idle" = "running"): void {
    const sessionId = conversation.session?.sessionId;
    if (sessionId === undefined) return;
    const entry: SavedConversation = {
      id: conversation.id,
      name: conversation.name,
      sessionId,
      state,
      args: conversation.args,
      env: conversation.env,
      hook: conversation.hook,
      ...(conversation.job === undefined || state !== "running" ? {} : { job: conversation.job }),
      openedAt: conversation.openedAt,
    };
    this.saved = withSavedConversation(this.saved, entry);
    void this.store.update(CONVERSATIONS_KEY, this.saved);
  }
}
