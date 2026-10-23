import { terminalVerdict } from "../../../../src/core/terminal-check";
import {
  CONVERSATIONS_KEY,
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
  within,
  withoutSavedConversation,
  withSavedConversation,
} from "../../../../src/core/omp-chat-conversation";
import type { ChatViewPort, Disposable, OmpClientPort, OmpLaunch, OmpPrompt, OmpSessionPort } from "./ports";

/** What the conversations need of the rest of the host (`agent.ts`): the end of a job's work, the registry of agent processes, the dialogs and the settings. */
export interface ConversationHooks {
  /** `trama.autoExit`, read when the agent's hook says idle. */
  autoExit(): boolean;
  /** Ends the work of the conversation as the end of a terminal's work does: releases what it took, withdraws its announcements, ends its job (with `abnormal` when the end is not normal) and forgets its registered process. */
  endWork(conversation: ConversationInfo, abnormal?: string): void;
  /** The Board notice that Trama stopped following `name`, with its reason. */
  reportStopped(name: string, reason: string): void;
  /** Registers the process of the conversation's agent for the execution check. */
  registerProcess(conversation: ConversationInfo, pid: number): void;
  /** The process registered for the conversation, if any. */
  registeredProcess(conversation: ConversationInfo): number | undefined;
  processAlive(pid: number): boolean;
  /** Whether the hook of the run follows the conversation (`rules#agent-terminal`): an unfollowed conversation is not asked about. */
  follow(id: string, followed: boolean): void;
  /** Puts the saved job of a conversation to resume back in the registry of jobs, with its announcement. */
  restoreJob(conversation: ConversationInfo, job: SavedJob): void;
  /** The project a window's saved conversations belong to, or undefined when there is none. */
  projectRoot(): string | undefined;
  /** The launch of a saved conversation: its arguments, its saved Trama variables and the ones made again (question endpoint, PATH). */
  resumeLaunch(root: string, args: string[], env: Record<string, string>): Promise<OmpLaunch>;
  /** A modal confirmation of the editor: true when the developer pressed `button`. */
  confirm(message: string, detail: string, button: string): Promise<boolean>;
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
  job?: SavedJob;
  openedAt: string;
  /** The hook said idle before the session was attached: applied as soon as it is. */
  idleEarly?: boolean;
  exitListener?: Disposable;
}

/** What opens a conversation: everything the terminal that it replaces would have been given. The job and announcement are already written by the caller under `id`. */
export interface OpenConversation {
  id: string;
  root: string;
  name: string;
  launch: OmpLaunch;
  /** The first message, when there is one (a Quick Task has none). */
  first?: OmpPrompt;
  /** Quick Task and Ask more take the focus; jobs do not. */
  focus: boolean;
  job?: SavedJob;
}

export type OpenResult = { opened: true } | { opened: false; reason: string };

const messageOf = (err: unknown): string => (err instanceof Error ? err.message : String(err));

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

  /** Whether this window has a conversation Trama follows or waits to resume: the execution check has it to look at. */
  get following(): boolean {
    return [...this.conversations.values()].some((conversation) => conversation.state === "running");
  }

  /** The conversation `id`, if this window has it open. */
  has(id: string): boolean {
    return this.conversations.has(id);
  }

  /** Opens a conversation. On a failed start nothing stays open or saved, and the reason is returned: the caller sends the same instruction to a terminal. */
  async open(spec: OpenConversation): Promise<OpenResult> {
    const conversation: Conversation = {
      id: spec.id,
      ...(spec.job === undefined ? {} : { jobId: spec.job.id, job: spec.job }),
      root: spec.root,
      name: spec.name,
      since: Date.now(),
      state: "running",
      args: spec.launch.args,
      env: savedEnv(spec.launch.env),
      openedAt: new Date().toISOString(),
    };
    this.conversations.set(spec.id, conversation);
    let session: OmpSessionPort;
    try {
      session = await this.client.start(spec.launch, spec.first);
    } catch (err) {
      this.conversations.delete(spec.id);
      return { opened: false, reason: messageOf(err) };
    }
    this.attach(conversation, session);
    this.persist(conversation);
    this.view.open({ id: conversation.id, name: conversation.name }, session, { focus: spec.focus, ...(spec.first === undefined ? {} : { first: spec.first }) });
    this.view.setWorking(conversation.id, true);
    if (conversation.idleEarly === true) this.step(conversation, { type: "agent-hook.IDLE" });
    return { opened: true };
  }

  /** `agent-hook.IDLE`: the agent of the conversation `id` says it is at rest. */
  agentIdle(id: string): void {
    const conversation = this.conversations.get(id);
    if (conversation === undefined || conversation.state !== "running") return;
    if (conversation.session === undefined) {
      conversation.idleEarly = true;
      return;
    }
    this.step(conversation, { type: "agent-hook.IDLE" });
  }

  /** `agent-hook.STARTED`: the hook named the process of the agent of `id`, which a followed conversation remembers. */
  agentStarted(id: string, pid: number, root: string): void {
    const conversation = this.conversations.get(id);
    if (conversation === undefined || conversation.state !== "running" || conversation.root !== root) return;
    this.step(conversation, { type: "agent-hook.STARTED" }, pid);
  }

  /** `developer.STOP_CHAT_AGENT`: after the confirmation, the turn of the agent is cancelled. */
  async stopRequested(id: string): Promise<void> {
    const conversation = this.conversations.get(id);
    if (conversation === undefined || conversation.session === undefined) return;
    if (!(await this.hooks.confirm(`Stop the agent in ${conversation.name}?`, "The agent stops its current turn.", "Stop"))) return;
    if (conversation.state === "running") this.step(conversation, { type: "developer.STOP_CHAT_AGENT" });
    // At rest for Trama the agent may be in a turn for a message of the developer: Stop ends it all the same, and Trama follows nothing.
    else if (conversation.state === "idle") conversation.session.cancel();
  }

  /** `developer.CLOSE_CHAT_CONVERSATION`: confirmed first only when the agent is in a turn. */
  async closeRequested(id: string): Promise<void> {
    const conversation = this.conversations.get(id);
    if (conversation === undefined || (conversation.state !== "running" && conversation.state !== "idle")) return;
    if (closeNeedsConfirmation(conversation.session?.inTurn === true)) {
      const confirmed = await this.hooks.confirm(`Close ${conversation.name} and stop its agent?`, "The conversation and its agent end; Trama stops following its job.", "Close");
      if (!confirmed) return;
    }
    if (this.conversations.get(id) !== conversation) return;
    this.step(conversation, { type: "developer.CLOSE_CHAT_CONVERSATION" });
  }

  /**
   * `time.CHECK_DUE` for the conversations in Agent running: one whose agent process is gone, the one the hook reported or the one the client started, without
   * Trama having seen its end, closes with the notice. Returns what it looked at, with the reason for the ones it closed.
   */
  check(only?: string): { id: string; name: string; reason?: string }[] {
    const checked: { id: string; name: string; reason?: string }[] = [];
    for (const conversation of [...this.conversations.values()]) {
      if (conversation.state !== "running" || conversation.session === undefined || (only !== undefined && conversation.id !== only)) continue;
      const pid = this.hooks.registeredProcess(conversation) ?? conversation.session.pid;
      const reason = terminalVerdict({ terminalGone: false, ...(pid === undefined ? {} : { hookPid: pid }) }, this.hooks.processAlive);
      checked.push({ id: conversation.id, name: conversation.name, ...(reason === undefined ? {} : { reason }) });
      if (reason !== undefined) this.step(conversation, { type: "time.CHECK_DUE", processGone: true });
    }
    return checked;
  }

  /**
   * `editor.WINDOW_CLOSED`: the window closes or reloads. Every conversation stops its process and keeps its saved entry, its job and its announcements, to be
   * resumed. A conversation with no hook (Quick Task, Ask more) saves whether its agent was in a turn as its state. Resolves when the processes are gone.
   */
  async windowClosed(): Promise<void> {
    const stopped: Promise<void>[] = [];
    for (const conversation of [...this.conversations.values()]) {
      if (conversation.state === "running" && conversation.job === undefined) this.persist(conversation, conversation.session?.inTurn === true ? "running" : "idle");
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
        if (lost.job === undefined || lost.id === undefined) continue;
        this.hooks.endWork({ id: lost.id, jobId: lost.job.id, root, name: lost.name ?? lost.job.name, since: Date.now() }, SESSION_NOT_RESUMED_REASON);
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
        openedAt: entry.openedAt,
      };
      this.conversations.set(entry.id, conversation);
      return conversation;
    });
    // The jobs stand again, and their conversations are followed, before the execution check can look at their Tasks.
    for (const [index, conversation] of waiting.entries()) {
      const entry = entries[index];
      if (entry === undefined || root === undefined) continue;
      this.hooks.follow(conversation.id, entry.state === "running" && entry.args.includes("--hook"));
      if (conversation.job !== undefined) this.hooks.restoreJob(conversation, conversation.job);
    }
    await Promise.all(waiting.map((conversation, index) => this.resumeOne(conversation, entries[index] as SavedConversation, root)));
  }

  private async resumeOne(conversation: Conversation, entry: SavedConversation, root: string | undefined): Promise<void> {
    const wasRunning = resumeDecision(entry).wasRunning;
    const lost = () => this.step(conversation, { type: "omp-acp.SESSION_NOT_RESUMED", wasRunning });
    if (root === undefined) {
      lost();
      return;
    }
    let attempt: Promise<OmpSessionPort> | undefined;
    let session: OmpSessionPort;
    try {
      const launch = await this.hooks.resumeLaunch(root, entry.args, entry.env);
      attempt = this.client.resume(launch, entry.sessionId);
      session = await within(attempt);
    } catch {
      // A late answer of a resume that was given up is stopped: no process stays orphan.
      void attempt?.then((late) => late.stop(), () => undefined);
      lost();
      return;
    }
    this.attach(conversation, session);
    const decision = resumeDecision(entry);
    this.view.open({ id: conversation.id, name: conversation.name }, session, { focus: false, ...(decision.notice === undefined ? {} : { notice: decision.notice }) });
    this.step(conversation, { type: "omp-acp.SESSION_RESUMED", wasRunning: decision.wasRunning });
    this.view.setWorking(conversation.id, conversation.state === "running");
  }

  /** Binds the session to the conversation: the process is registered for the execution check and its unasked end is `omp-acp.EXITED`. */
  private attach(conversation: Conversation, session: OmpSessionPort): void {
    conversation.session = session;
    if (session.pid !== undefined) this.hooks.registerProcess(conversation, session.pid);
    conversation.exitListener = session.onExit((exit) => {
      if (this.conversations.get(conversation.id) !== conversation) return;
      this.step(conversation, { type: "omp-acp.EXITED", code: exit.code, signal: exit.signal });
    });
  }

  /** Applies an Event: moves the conversation and carries out the effects the Machine names. Returns the stops of processes it started. */
  private step(conversation: Conversation, event: ConversationEvent, pid?: number): Promise<void>[] {
    const next = conversationStep(conversation.state, event, this.hooks.autoExit());
    conversation.state = next.state;
    const stops: Promise<void>[] = [];
    for (const effect of next.effects) this.apply(conversation, effect, stops, pid);
    return stops;
  }

  private apply(conversation: Conversation, effect: ConversationEffect, stops: Promise<void>[], pid: number | undefined): void {
    switch (effect.effect) {
      case "end-work":
        this.hooks.endWork(conversation, effect.abnormal);
        return;
      case "stop-process":
      case "stop-process-for-window":
        if (conversation.session !== undefined) stops.push(conversation.session.stop().catch(() => undefined));
        return;
      case "remember-process":
        if (pid !== undefined) this.hooks.registerProcess(conversation, pid);
        return;
      case "cancel-turn":
        conversation.session?.cancel();
        return;
      case "report-stopped":
        this.hooks.reportStopped(conversation.name, effect.reason);
        return;
      case "save-state":
        this.persist(conversation, effect.state);
        this.view.setWorking(conversation.id, effect.state === "running");
        return;
      case "continue-work":
        void conversation.session?.sendPrompt({ text: RESUME_PROMPT }).catch(() => undefined);
        return;
      case "close":
        conversation.exitListener?.dispose();
        this.conversations.delete(conversation.id);
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
      ...(conversation.job === undefined || state !== "running" ? {} : { job: conversation.job }),
      openedAt: conversation.openedAt,
    };
    this.saved = withSavedConversation(this.saved, entry);
    void this.store.update(CONVERSATIONS_KEY, this.saved);
  }
}
