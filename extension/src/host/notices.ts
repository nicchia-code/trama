import { composeNotice, type NoticeFacts, type NoticeText } from "./notice-text";

/** The fixed waits of a notice: before it is sent, and between a failed first attempt and the second. */
export const NOTICE_DELAY_MS = 10_000;
export const RETRY_DELAY_MS = 10_000;
/** How long a request may take before it counts as a failure. */
export const REQUEST_TIMEOUT_MS = 10_000;

const TOPIC_NAME = /^[A-Za-z0-9_-]{1,64}$/;
const INVALID_SETTING = "the setting is not a topic name or an http(s) URL";

/**
 * Where a notice goes for the `trama.ntfy` value, or `undefined` when it is not valid: a topic name goes to the public
 * service, an absolute http(s) URL without credentials is used as it is. Whether the topic exists is not checked.
 */
export function ntfyEndpoint(setting: string): string | undefined {
  const value = setting.trim();
  if (TOPIC_NAME.test(value)) return `https://ntfy.sh/${value}`;
  try {
    const url = new URL(value);
    if ((url.protocol === "http:" || url.protocol === "https:") && url.username === "" && url.password === "") return value;
  } catch {
    // not an absolute URL
  }
  return undefined;
}

export interface Timer {
  cancel(): void;
}

/** What the service needs from the editor and the machine, so it can be checked without either. */
export interface NoticeEnvironment {
  /** The `trama.ntfy` setting as typed, trimmed; read each time it matters. */
  topic(): string;
  /** Node's global `fetch`, as far as one POST needs it. */
  fetch(url: string, init: RequestInit): Promise<Response>;
  after(ms: number, run: () => void): Timer;
  /** Shows the developer a warning in the editor. */
  warn(message: string): void;
}

/** A notice that was born and may still be cancelled while it waits. */
export interface Notice {
  /** Cancels the notice if it is still waiting for its ten seconds; later it does nothing. */
  cancel(): void;
}

type Result = { ok: true } | { ok: false; reason: string };

/**
 * The notices of one editor window, which live only in memory: a notice waits, is sent, is retried once and tells the
 * developer when it could not go. Nothing a notice does changes anything but itself.
 */
export class NoticeService {
  private readonly live = new Set<Timer>();
  private readonly flights = new Set<AbortController>();
  /** Whether the editor warning was already shown since the last notice that was delivered. */
  private warned = false;
  private closed = false;

  constructor(private readonly env: NoticeEnvironment) {}

  /**
   * Lets a notice be born, only when a topic is set right now. `facts` is asked when the notice leaves, not now, and says
   * what is true at that moment; it returns nothing when the notice no longer has a reason to go.
   */
  start(facts: () => NoticeFacts | undefined): Notice | undefined {
    if (this.closed || this.env.topic() === "") return undefined;
    const timer = this.env.after(NOTICE_DELAY_MS, () => {
      this.live.delete(timer);
      void this.send(facts);
    });
    this.live.add(timer);
    return {
      cancel: () => {
        if (this.live.delete(timer)) timer.cancel();
      },
    };
  }

  /** Stops every timer and request: a window that closes loses its notices. */
  dispose(): void {
    this.closed = true;
    for (const timer of this.live) timer.cancel();
    this.live.clear();
    for (const flight of this.flights) flight.abort();
    this.flights.clear();
  }

  private async send(facts: () => NoticeFacts | undefined): Promise<void> {
    const endpoint = this.endpoint();
    if (endpoint === undefined) return;
    let current: NoticeFacts | undefined;
    try {
      current = facts();
    } catch {
      // Whatever cannot be read now cannot be said; the notice is lost, and nothing else is disturbed.
      return;
    }
    if (current === undefined) return;
    const text = composeNotice(current);
    const first = await this.attempt(endpoint, text);
    if (first.ok) return this.delivered();
    if (this.closed) return;
    const timer = this.env.after(RETRY_DELAY_MS, () => {
      this.live.delete(timer);
      void this.retry(text);
    });
    this.live.add(timer);
  }

  private async retry(text: NoticeText): Promise<void> {
    const endpoint = this.endpoint();
    if (endpoint === undefined) return;
    const second = await this.attempt(endpoint, text);
    if (second.ok) this.delivered();
    else this.tell(second.reason);
  }

  /** The URL the setting points to right now. An empty setting is silent; an invalid one is told once, as a failed send is. */
  private endpoint(): string | undefined {
    const endpoint = ntfyEndpoint(this.env.topic());
    if (endpoint === undefined && this.env.topic() !== "") this.tell(INVALID_SETTING);
    return endpoint;
  }

  private delivered(): void {
    this.warned = false;
  }

  /** The editor warning, once until a notice is delivered again. It never names the topic or the URL. */
  private tell(reason: string): void {
    if (this.warned || this.closed) return;
    this.warned = true;
    this.env.warn(`Trama could not send the ntfy notification: ${reason}. Check the trama.ntfy setting and your connection.`);
  }

  /** One POST. Only a 2xx answer is a success; any other status, network error or silence for ten seconds is a failure. */
  private async attempt(endpoint: string, text: NoticeText): Promise<Result> {
    const flight = new AbortController();
    this.flights.add(flight);
    let timedOut = false;
    const timeout = this.env.after(REQUEST_TIMEOUT_MS, () => {
      timedOut = true;
      flight.abort();
    });
    try {
      const response = await this.env.fetch(endpoint, {
        method: "POST",
        body: text.message,
        headers: { Title: text.title, Priority: String(text.priority), Tags: text.tags.join(",") },
        signal: flight.signal,
      });
      // The body is not needed: let the connection go.
      void response.body?.cancel().catch(() => undefined);
      return response.status >= 200 && response.status < 300 ? { ok: true } : { ok: false, reason: `HTTP ${response.status}` };
    } catch (err) {
      if (timedOut) return { ok: false, reason: "no response within 10 seconds" };
      return { ok: false, reason: this.safeMessage(err, endpoint) };
    } finally {
      timeout.cancel();
      this.flights.delete(flight);
    }
  }

  /** The text of a network error without the topic, the URL or any part of its path, which are a secret. */
  private safeMessage(err: unknown, endpoint: string): string {
    const message = err instanceof Error && err.message !== "" ? err.message : "network error";
    const secrets = [endpoint, this.env.topic(), ...new URL(endpoint).pathname.split("/")].filter((part) => part !== "");
    secrets.sort((a, b) => b.length - a.length);
    return secrets.reduce((clean, secret) => clean.split(secret).join("the topic"), message);
  }
}
