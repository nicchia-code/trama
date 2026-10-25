import { basename } from "node:path";
import type { TurnEnd } from "../../../src/core/omp-chat-conversation";
import { AwayNotices, type Dispatch, errorReason, type JobConversation, type NoticeFacts, type NoticeText, ntfyBody, REQUEST_TIMEOUT_MS, responseFailure } from "../../../src/core/away-notices";
import type { ConversationInfo, ConversationNotices } from "./omp-chat/conversations";

// No runtime import of the editor: the notifier is fed by the host (`agent.ts`, `main.ts`) and runs outside the editor in tests.

/** How a request went: the server accepted it (a 2xx answer), or `reason`, which never holds the server, the topic or the token. */
export type NtfyOutcome = { ok: true } | { ok: false; reason: string };

/** One request: `text` published to `topic` on the server at `url`, with the saved access token when there is one. */
export interface NtfyRequest {
  url: string;
  topic: string;
  text: NoticeText;
  token?: string | undefined;
  /** The `fetch` to use; the editor host's global one by default. */
  fetch?: typeof fetch;
}

/** Removes every secret from a reason, as whole words: the server, its host, the topic and the token never appear in what the developer reads. */
function withoutSecrets(reason: string, secrets: readonly (string | undefined)[]): string {
  let text = reason;
  for (const secret of secrets) {
    if (secret === undefined || secret === "") continue;
    text = text.replace(new RegExp(`(?<![A-Za-z0-9_-])${secret.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}(?![A-Za-z0-9_-])`, "g"), "…");
  }
  return text;
}

/**
 * Sends one notification: a `POST` of ntfy's JSON publishing to the server, with `Authorization: Bearer <token>` only when a token is saved, no redirect followed and
 * ten seconds at most. Only a 2xx answer is a success. It makes one attempt and never rejects: the notifier retries once, the Settings tab's test does not.
 */
export async function sendNtfy(request: NtfyRequest): Promise<NtfyOutcome> {
  const hosts = ((): string[] => {
    try {
      const url = new URL(request.url);
      return [request.url, url.origin, url.host, url.hostname];
    } catch {
      return [request.url];
    }
  })();
  try {
    const response = await (request.fetch ?? fetch)(request.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(request.token === undefined ? {} : { Authorization: `Bearer ${request.token}` }) },
      body: JSON.stringify(ntfyBody(request.topic, request.text)),
      redirect: "manual",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    // The answer's body is not read: the connection is released.
    void response.body?.cancel().catch(() => undefined);
    const failure = responseFailure(response.status, response.type);
    return failure === undefined ? { ok: true } : { ok: false, reason: failure };
  } catch (error) {
    return { ok: false, reason: withoutSecrets(errorReason(error), [...hosts, request.topic, request.token]) };
  }
}

/** What the notifier needs of the host. */
export interface NotifierDeps extends Omit<NoticeFacts, "now"> {
  /** The saved access token, read when a request is made. */
  token(): string | undefined;
  now?: () => number;
  /** Makes the request of a notice; `sendNtfy` by default. */
  send?: (request: NtfyRequest) => Promise<NtfyOutcome>;
  /** Arms a timer and returns what stops it; `setTimeout` by default. */
  arm?: (action: () => void, ms: number) => () => void;
}

const armTimer = (action: () => void, ms: number): (() => void) => {
  const timer = setTimeout(action, ms);
  return () => clearTimeout(timer);
};

/**
 * The away notices of one window (`notice` Machine): the engine of `src/core/away-notices.ts` fed by what the host knows, with one timer that exists only while a notice waits
 * or waits to retry, and the requests. Nothing here throws into the host: a request that fails is retried once and then given up in silence.
 */
export class AwayNotifier implements ConversationNotices {
  private readonly engine: AwayNotices;
  private stop: (() => void) | undefined;
  private disposed = false;

  constructor(private readonly deps: NotifierDeps) {
    this.engine = new AwayNotices({ now: deps.now ?? Date.now, topicSet: deps.topicSet, working: deps.working, target: deps.target });
  }

  private job(conversation: ConversationInfo): JobConversation {
    return { id: conversation.id, name: conversation.name, project: basename(conversation.root) };
  }

  /** The window's working state may have changed (a job started or ended in the registry or in a terminal). */
  refresh(): void {
    this.engine.refresh();
    this.arm();
  }

  opened(conversation: ConversationInfo, job: boolean): void {
    this.engine.opened(this.job(conversation), job);
    this.arm();
  }

  closed(conversation: ConversationInfo): void {
    this.engine.closedConversation(conversation.id);
    this.arm();
  }

  turnEnded(conversation: ConversationInfo, end: TurnEnd): void {
    this.engine.turnEnded(this.job(conversation), end);
    this.arm();
  }

  exited(conversation: ConversationInfo, wasRunning: boolean): void {
    this.engine.exited(this.job(conversation), wasRunning);
    this.arm();
  }

  activity(conversation: ConversationInfo): void {
    this.engine.activity(conversation.id);
    this.arm();
  }

  permissionAsked(conversation: ConversationInfo, request: string): void {
    this.engine.permissionAsked(conversation.id, request);
    this.arm();
  }

  permissionSettled(conversation: ConversationInfo, request: string): void {
    this.engine.permissionSettled(conversation.id, request);
    this.arm();
  }

  /** `question-round.ROUND_OPENED`: `round` is the round presented now, asked by `terminal`. */
  roundOpened(round: number, terminal: string | undefined): void {
    this.engine.roundOpened(round, terminal);
    this.arm();
  }

  /** `question-round.ROUND_CLOSED`. */
  roundClosed(round: number): void {
    this.engine.roundClosed(round);
    this.arm();
  }

  /** `editor.WINDOW_CLOSED` and the deactivation of the extension: every notice is cancelled and the timer stops. */
  dispose(): void {
    this.disposed = true;
    this.engine.windowClosed();
    this.stop?.();
    this.stop = undefined;
  }

  /** Arms the one timer for the earliest notice that waits, or none. */
  private arm(): void {
    this.stop?.();
    this.stop = undefined;
    if (this.disposed) return;
    const next = this.engine.nextDeadline();
    if (next === undefined) return;
    this.stop = (this.deps.arm ?? armTimer)(() => {
      this.stop = undefined;
      for (const request of this.engine.due()) void this.deliver(request);
      this.arm();
    }, Math.max(0, next - (this.deps.now ?? Date.now)()));
  }

  private async deliver(request: Dispatch): Promise<void> {
    let outcome: NtfyOutcome;
    try {
      outcome = await (this.deps.send ?? sendNtfy)({ url: request.url, topic: request.topic, text: request.text, token: this.deps.token() });
    } catch {
      outcome = { ok: false, reason: "the request failed" };
    }
    if (this.disposed) return;
    this.engine.settled(request.notice, outcome.ok);
    this.arm();
  }
}
