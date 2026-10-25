import { type TurnEnd, turnEndReason } from "./omp-chat-conversation";
import type { NtfyTarget } from "./ntfy";

// Away notifications (`away-notifications` Feature, `notice` Machine): the pure logic of what is sent to the developer's ntfy server. The editor host feeds the facts
// of the window (`extension/src/host/away-notices.ts`) and carries out the requests; nothing here touches the editor, the clock or the network.

/** The thirty seconds a finished, question or permission notice waits before it goes. Not a setting. */
export const NOTICE_WAIT_MS = 30_000;
/** The pause before the only retry of a request that failed. Not a setting. */
export const RETRY_WAIT_MS = 10_000;
/** The time limit of one request. Not a setting. */
export const REQUEST_TIMEOUT_MS = 10_000;

/** The text of a notification: everything of it but the topic. No content of the work, no action, no Markdown. */
export interface NoticeText {
  title: string;
  message: string;
  tags: string[];
  priority: number;
}

/** A finished notice: the project and the names of the job conversations whose work ended since the window last started working. */
export function finishedText(project: string, names: readonly string[]): NoticeText {
  const [only] = names;
  return {
    title: names.length === 1 && only !== undefined ? `${project} - ${only} finished` : `${project} - ${names.length} jobs finished`,
    message: "Trama is waiting for you.",
    tags: ["white_check_mark"],
    priority: 3,
  };
}

export const questionText = (project: string, name: string): NoticeText => ({ title: `${project} - ${name} asks a question`, message: "The agent is waiting for your answers.", tags: ["question"], priority: 4 });

export const permissionText = (project: string, name: string): NoticeText => ({ title: `${project} - ${name} asks permission`, message: "The agent is waiting for your approval.", tags: ["closed_lock_with_key"], priority: 4 });

export const stoppedText = (project: string, name: string): NoticeText => ({ title: `${project} - ${name} stopped`, message: "The agent stopped before finishing its work.", tags: ["warning"], priority: 4 });

/** The test notification of the Settings tab; `project` is the name of the project's folder, absent when the window has none. */
export const testText = (project?: string): NoticeText => ({ title: `${project === undefined || project === "" ? "Trama" : project} - Test notification`, message: "Trama's notifications reach this device.", tags: ["bell"], priority: 3 });

/** The JSON body of ntfy's publishing: the topic first, then the text. */
export const ntfyBody = (topic: string, text: NoticeText): { topic: string; title: string; message: string; tags: string[]; priority: number } => ({ topic, title: text.title, message: text.message, tags: text.tags, priority: text.priority });

/** The reason shown for a request that failed (`ui#away-notifications`): the time limit, a redirect, a status, or the message of the network error. Undefined for a 2xx answer, the only success. */
export function responseFailure(status: number, type?: string): string | undefined {
  if (type === "opaqueredirect" || (status >= 300 && status < 400)) return "the server redirected the request";
  return status >= 200 && status < 300 ? undefined : `HTTP ${status}`;
}

export const TIMEOUT_REASON = `no response within ${REQUEST_TIMEOUT_MS / 1000} seconds`;

/** The reason of a request that ended with an error: the time limit, or the message of the error. */
export function errorReason(error: unknown): string {
  const name = typeof error === "object" && error !== null && "name" in error ? error.name : undefined;
  if (name === "TimeoutError" || name === "AbortError") return TIMEOUT_REASON;
  const message = error instanceof Error ? error.message : String(error);
  return message === "" ? "the request failed" : message;
}

/** One conversation of omp Chat of the window that runs a job, with Trama's hook: the only ones that give notices. `project` is the name of the project's folder. */
export interface JobConversation {
  id: string;
  name: string;
  project: string;
}

/** What the engine reads of the window, when it needs it. */
export interface NoticeFacts {
  now(): number;
  /** `trama.ntfyTopic` is not empty now, in the user settings. */
  topicSet(): boolean;
  /** The window has a job in progress (in a conversation or a terminal) or a Run of a sequence still to start. Ask more and General never count. */
  working(): boolean;
  /** The settings as they are now. */
  target(): NtfyTarget;
}

type Subject =
  | { kind: "finished"; project: string }
  | { kind: "question"; project: string; name: string; round: number }
  | { kind: "permission"; project: string; name: string; conversation: string; request: string }
  | { kind: "stopped"; project: string; name: string };

type Phase = "waiting" | "retrying" | "sending";

interface Notice {
  id: number;
  subject: Subject;
  phase: Phase;
  /** When a waiting notice goes or a retrying one tries again. */
  deadline: number;
  /** The attempt in flight, or the one that failed. */
  attempt: 1 | 2;
  /** Composed when the notice goes; the retry sends it again. */
  text?: NoticeText;
}

/** A request to make: the host sends `text` to `url` and tells the engine how it went (`settled`). */
export interface Dispatch {
  notice: number;
  attempt: 1 | 2;
  url: string;
  topic: string;
  text: NoticeText;
}

/**
 * The notices of one window, in memory (`data#notice`). The host tells it what happens; it decides which notices are born, when each one goes and which are cancelled.
 * `nextDeadline` says when the host must call `due`, so timers exist only while a notice waits. Every call after `windowClosed` does nothing.
 */
export class AwayNotices {
  private readonly notices: Notice[] = [];
  /** The job conversations open in the window, by identity. */
  private readonly jobs = new Map<string, JobConversation>();
  /** The job conversations whose work ended normally since the window last started working, in order. */
  private ended: { id: string; name: string }[] = [];
  private wasWorking = false;
  private nextId = 1;
  private closed = false;

  constructor(private readonly facts: NoticeFacts) {}

  /** The window's working state changed, perhaps: a window that starts working again forgets the jobs it finished. */
  refresh(): void {
    if (this.closed) return;
    const working = this.facts.working();
    if (working && !this.wasWorking) this.ended = [];
    this.wasWorking = working;
  }

  /** `omp-chat-conversation.OPENED`: any conversation of omp Chat cancels a finished notice that waits (a job makes the window work again, Ask more means the developer is there). `job` says it is a conversation with Trama's hook. */
  opened(conversation: JobConversation, job: boolean): void {
    if (this.closed) return;
    this.cancel((notice) => notice.subject.kind === "finished" && notice.phase === "waiting");
    if (job) this.jobs.set(conversation.id, conversation);
    this.refresh();
  }

  /** A conversation went from the window: the requests it was waiting on are over. */
  closedConversation(id: string): void {
    if (this.closed) return;
    this.jobs.delete(id);
    this.cancel((notice) => notice.subject.kind === "permission" && notice.subject.conversation === id && notice.phase === "waiting");
    this.refresh();
  }

  /**
   * `omp-acp.TURN_ENDED` of a job conversation, once the window has taken it up (the job ended, the conversation closed with `trama.autoExit`). An abnormal end gives a stopped notice
   * at once; `end_turn` a finished one when the window stopped working with it; `cancelled` (Stop) none.
   */
  turnEnded(conversation: JobConversation, end: TurnEnd): void {
    if (this.closed) return;
    this.cancel((notice) => notice.subject.kind === "permission" && notice.subject.conversation === conversation.id && notice.phase === "waiting");
    if (turnEndReason(end) !== undefined) {
      this.refresh();
      this.born({ kind: "stopped", project: conversation.project, name: conversation.name }, 0);
      return;
    }
    if ("stopReason" in end && end.stopReason === "end_turn") {
      if (!this.ended.some((job) => job.id === conversation.id)) this.ended.push({ id: conversation.id, name: conversation.name });
      const working = this.facts.working();
      this.wasWorking = working;
      if (!working) this.born({ kind: "finished", project: conversation.project }, this.jobs.size === 0 ? 0 : NOTICE_WAIT_MS);
      return;
    }
    this.refresh();
  }

  /** `omp-acp.EXITED` of a job conversation; `wasRunning` is whether its agent was in Agent running. Only from Agent running a stopped notice is born, at once. */
  exited(conversation: JobConversation, wasRunning: boolean): void {
    if (this.closed) return;
    this.cancel((notice) => notice.subject.kind === "permission" && notice.subject.conversation === conversation.id && notice.phase === "waiting");
    this.refresh();
    if (wasRunning) this.born({ kind: "stopped", project: conversation.project, name: conversation.name }, 0);
  }

  /** A `session/update` of a job conversation still open, or a message of the developer in one: the quiet of a finished notice that waits starts again. */
  activity(conversationId: string): void {
    if (this.closed || !this.jobs.has(conversationId)) return;
    const deadline = this.facts.now() + NOTICE_WAIT_MS;
    for (const notice of this.notices) if (notice.subject.kind === "finished" && notice.phase === "waiting") notice.deadline = deadline;
  }

  /** `question-round.ROUND_OPENED`: the round `round` asked by the terminal or conversation `terminal` is the one presented. Only a job conversation of the window gives a notice. */
  roundOpened(round: number, terminal: string | undefined): void {
    if (this.closed || terminal === undefined) return;
    const conversation = this.jobs.get(terminal);
    if (conversation !== undefined) this.born({ kind: "question", project: conversation.project, name: conversation.name, round }, NOTICE_WAIT_MS);
  }

  /** `question-round.ROUND_CLOSED`: answered, skipped, abandoned or interrupted. */
  roundClosed(round: number): void {
    if (this.closed) return;
    this.cancel((notice) => notice.subject.kind === "question" && notice.subject.round === round && notice.phase === "waiting");
  }

  /** `omp-acp.PERMISSION_REQUESTED` in a job conversation: the request waits for the developer. */
  permissionAsked(conversationId: string, request: string): void {
    if (this.closed) return;
    const conversation = this.jobs.get(conversationId);
    if (conversation !== undefined) this.born({ kind: "permission", project: conversation.project, name: conversation.name, conversation: conversationId, request }, NOTICE_WAIT_MS);
  }

  /** The request was answered by the developer (`developer.ANSWER_PERMISSION`) or cancelled (Stop, closing, end of the process, end of the turn). */
  permissionSettled(conversationId: string, request: string): void {
    if (this.closed) return;
    this.cancel((notice) => notice.subject.kind === "permission" && notice.subject.conversation === conversationId && notice.subject.request === request && notice.phase === "waiting");
  }

  /** `editor.WINDOW_CLOSED`: every notice that waits or waits to retry is cancelled, and nothing is born again. */
  windowClosed(): void {
    this.closed = true;
    this.notices.length = 0;
    this.jobs.clear();
    this.ended = [];
  }

  /** When `due` has something to do: the earliest moment a notice goes or tries again; undefined when none waits. */
  nextDeadline(): number | undefined {
    let next: number | undefined;
    for (const notice of this.notices) if (notice.phase !== "sending" && (next === undefined || notice.deadline < next)) next = notice.deadline;
    return next;
  }

  /**
   * The notices whose moment came: each is dropped, without a request, when the topic was removed, a setting is not valid or, for a finished one, the window works again
   * (`time.NOTICE_DELAY_ELAPSED`, `time.RETRY_DELAY_ELAPSED`); otherwise its request is returned, with the text composed now (the retry keeps the first one).
   */
  due(): Dispatch[] {
    if (this.closed) return [];
    const now = this.facts.now();
    const requests: Dispatch[] = [];
    for (const notice of [...this.notices]) {
      if (notice.phase === "sending" || notice.deadline > now) continue;
      const target = this.facts.target();
      const working = notice.phase === "waiting" && notice.subject.kind === "finished" && this.facts.working();
      if (target.state !== "ready" || working) {
        this.remove(notice);
        continue;
      }
      notice.phase = "sending";
      notice.attempt = notice.text === undefined ? 1 : 2;
      notice.text ??= this.compose(notice.subject);
      requests.push({ notice: notice.id, attempt: notice.attempt, url: target.url, topic: target.topic, text: notice.text });
    }
    return requests;
  }

  /** The request of `notice` ended: the server accepted it, or it failed. A first failure waits ten seconds for the only retry; a second one gives the notice up in silence. */
  settled(notice: number, ok: boolean): void {
    const found = this.notices.find((candidate) => candidate.id === notice);
    if (found === undefined || found.phase !== "sending") return;
    if (ok || found.attempt === 2) {
      this.remove(found);
      return;
    }
    found.phase = "retrying";
    found.deadline = this.facts.now() + RETRY_WAIT_MS;
  }

  /** How many notices exist: waiting, retrying or sending. */
  get count(): number {
    return this.notices.length;
  }

  private born(subject: Subject, wait: number): void {
    if (!this.facts.topicSet()) return;
    // A window holds at most one finished notice at a time.
    if (subject.kind === "finished" && this.notices.some((notice) => notice.subject.kind === "finished")) return;
    this.notices.push({ id: this.nextId++, subject, phase: "waiting", deadline: this.facts.now() + wait, attempt: 1 });
  }

  private compose(subject: Subject): NoticeText {
    switch (subject.kind) {
      case "finished":
        return finishedText(subject.project, this.ended.map((job) => job.name));
      case "question":
        return questionText(subject.project, subject.name);
      case "permission":
        return permissionText(subject.project, subject.name);
      case "stopped":
        return stoppedText(subject.project, subject.name);
    }
  }

  private cancel(matches: (notice: Notice) => boolean): void {
    for (const notice of [...this.notices]) if (matches(notice)) this.remove(notice);
  }

  private remove(notice: Notice): void {
    const index = this.notices.indexOf(notice);
    if (index >= 0) this.notices.splice(index, 1);
  }
}
