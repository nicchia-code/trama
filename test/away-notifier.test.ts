import { beforeEach, describe, expect, test } from "bun:test";
import { NOTICE_WAIT_MS, RETRY_WAIT_MS, testText } from "../src/core/away-notices";
import type { NtfyTarget } from "../src/core/ntfy";
import { AwayNotifier, type NtfyOutcome, type NtfyRequest, sendNtfy } from "../extension/src/host/away-notices";
import type { ConversationInfo } from "../extension/src/host/omp-chat/conversations";

const text = testText("shop");

/** A `fetch` that records what it was asked and answers with `respond`. */
function fakeFetch(respond: (url: string, init: RequestInit) => Response | Promise<Response>): { fetch: typeof fetch; calls: { url: string; init: RequestInit }[] } {
  const calls: { url: string; init: RequestInit }[] = [];
  const impl = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    calls.push({ url: String(input), init: init ?? {} });
    return respond(String(input), init ?? {});
  };
  return { fetch: impl as typeof fetch, calls };
}

describe("sendNtfy", () => {
  test("posts ntfy's JSON publishing to the server, with no redirect followed and a time limit, and a 2xx answer is the success", async () => {
    const { fetch, calls } = fakeFetch(() => new Response("{}", { status: 200 }));
    expect(await sendNtfy({ url: "https://ntfy.example.org/", topic: "mine", text, fetch })).toEqual({ ok: true });
    expect(calls).toHaveLength(1);
    const { url, init } = calls[0]!;
    expect(url).toBe("https://ntfy.example.org/");
    expect(init.method).toBe("POST");
    expect(init.redirect).toBe("manual");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body as string)).toEqual({ topic: "mine", title: "shop - Test notification", message: "Trama's notifications reach this device.", tags: ["bell"], priority: 3 });
  });

  test("the access token goes as a bearer token only when one is saved", async () => {
    const { fetch, calls } = fakeFetch(() => new Response(null, { status: 204 }));
    await sendNtfy({ url: "https://ntfy.sh/", topic: "mine", text, token: "tk_secret", fetch });
    expect(calls[0]?.init.headers).toEqual({ "Content-Type": "application/json", Authorization: "Bearer tk_secret" });
    await sendNtfy({ url: "https://ntfy.sh/", topic: "mine", text, token: undefined, fetch });
    expect(calls[1]?.init.headers).toEqual({ "Content-Type": "application/json" });
  });

  test("every other status, a redirect, the time limit and a network error are failures with their reason", async () => {
    const answers = [new Response(null, { status: 401 }), new Response(null, { status: 500 }), new Response(null, { status: 302, headers: { Location: "https://elsewhere.example" } })];
    const { fetch } = fakeFetch(() => answers.shift() as Response);
    expect(await sendNtfy({ url: "https://ntfy.sh/", topic: "mine", text, fetch })).toEqual({ ok: false, reason: "HTTP 401" });
    expect(await sendNtfy({ url: "https://ntfy.sh/", topic: "mine", text, fetch })).toEqual({ ok: false, reason: "HTTP 500" });
    expect(await sendNtfy({ url: "https://ntfy.sh/", topic: "mine", text, fetch })).toEqual({ ok: false, reason: "the server redirected the request" });
    const timeout = fakeFetch(() => Promise.reject(Object.assign(new Error("The operation timed out."), { name: "TimeoutError" })));
    expect(await sendNtfy({ url: "https://ntfy.sh/", topic: "mine", text, fetch: timeout.fetch })).toEqual({ ok: false, reason: "no response within 10 seconds" });
    const refused = fakeFetch(() => Promise.reject(new TypeError("fetch failed")));
    expect(await sendNtfy({ url: "https://ntfy.sh/", topic: "mine", text, fetch: refused.fetch })).toEqual({ ok: false, reason: "fetch failed" });
  });

  test("the server, the topic and the token never appear in a reason", async () => {
    const leaking = fakeFetch(() => Promise.reject(new Error("connect ECONNREFUSED ntfy.example.org:443 while publishing to https://ntfy.example.org/ on mytopic with tk_secret")));
    const outcome = await sendNtfy({ url: "https://ntfy.example.org/", topic: "mytopic", text, token: "tk_secret", fetch: leaking.fetch });
    expect(outcome.ok).toBe(false);
    const reason = outcome.ok ? "" : outcome.reason;
    for (const secret of ["ntfy.example.org", "mytopic", "tk_secret"]) expect(reason).not.toContain(secret);
    expect(reason).toContain("ECONNREFUSED");
  });
});

const info = (id: string, name = id): ConversationInfo => ({ id, name, root: "/work/shop", since: 0 });
const scan = info("a1", "Scan");
const endTurn = { stopReason: "end_turn" };

let clock: number;
let target: NtfyTarget;
let working: boolean;
let token: string | undefined;
let timers: { at: number; action: () => void; live: boolean }[];
let sent: NtfyRequest[];
let outcomes: NtfyOutcome[];
let notifier: AwayNotifier;

/** The clock moves and every timer due on the way runs, in order. */
async function advance(ms: number): Promise<void> {
  const until = clock + ms;
  for (;;) {
    const next = timers.filter((timer) => timer.live && timer.at <= until).sort((a, b) => a.at - b.at)[0];
    if (next === undefined) break;
    next.live = false;
    clock = Math.max(clock, next.at);
    next.action();
    // The request that went out answers on the next turns of the event loop.
    for (let i = 0; i < 10; i++) await Promise.resolve();
  }
  clock = until;
}

const armed = (): number => timers.filter((timer) => timer.live).length;

beforeEach(() => {
  clock = 1_000_000;
  target = { state: "ready", url: "https://ntfy.sh/", topic: "mine" };
  working = false;
  token = undefined;
  timers = [];
  sent = [];
  outcomes = [];
  notifier = new AwayNotifier({
    now: () => clock,
    topicSet: () => target.state !== "off",
    working: () => working,
    target: () => target,
    token: () => token,
    send: async (request) => {
      sent.push(request);
      return outcomes.shift() ?? { ok: true };
    },
    arm: (action, ms) => {
      const timer = { at: clock + ms, action, live: true };
      timers.push(timer);
      return () => void (timer.live = false);
    },
  });
});

describe("the notifier", () => {
  test("has no timer while no notice waits", () => {
    notifier.opened(scan, true);
    notifier.refresh();
    expect(armed()).toBe(0);
  });

  test("a finished notice goes after thirty seconds of quiet, composed from the project's folder and the conversation's name", async () => {
    notifier.opened(scan, true);
    notifier.turnEnded(scan, endTurn);
    expect(armed()).toBe(1);
    await advance(NOTICE_WAIT_MS - 1);
    expect(sent).toEqual([]);
    await advance(1);
    expect(sent).toEqual([{ url: "https://ntfy.sh/", topic: "mine", token: undefined, text: { title: "shop - Scan finished", message: "Trama is waiting for you.", tags: ["white_check_mark"], priority: 3 } }]);
    // Delivered: nothing else waits, so no timer is left.
    expect(armed()).toBe(0);
  });

  test("an update of a conversation still open restarts the quiet", async () => {
    notifier.opened(scan, true);
    notifier.opened(info("b2", "T3"), true);
    notifier.turnEnded(scan, endTurn);
    await advance(20_000);
    notifier.activity(info("b2", "T3"));
    await advance(20_000);
    expect(sent).toEqual([]);
    await advance(10_000);
    expect(sent).toHaveLength(1);
  });

  test("the token goes with the request when one is saved, read when the request is made", async () => {
    notifier.opened(scan, true);
    notifier.exited(scan, true);
    token = "tk_secret";
    await advance(0);
    expect(sent[0]?.token).toBe("tk_secret");
  });

  test("a stopped notice goes at once", async () => {
    notifier.opened(scan, true);
    notifier.turnEnded(scan, { stopReason: "max_tokens" });
    await advance(0);
    expect(sent.map((request) => request.text.title)).toEqual(["shop - Scan stopped"]);
  });

  test("a failure is tried once more after ten seconds with the same text; a second failure ends it in silence and leaves no timer", async () => {
    outcomes = [{ ok: false, reason: "HTTP 500" }, { ok: false, reason: "HTTP 500" }];
    notifier.opened(scan, true);
    notifier.exited(scan, true);
    await advance(0);
    expect(sent).toHaveLength(1);
    await advance(RETRY_WAIT_MS - 1);
    expect(sent).toHaveLength(1);
    await advance(1);
    expect(sent).toHaveLength(2);
    expect(sent[1]?.text).toEqual(sent[0]?.text as NtfyRequest["text"]);
    await advance(60_000);
    expect(sent).toHaveLength(2);
    expect(armed()).toBe(0);
  });

  test("a retry whose settings are no longer valid makes no request", async () => {
    outcomes = [{ ok: false, reason: "HTTP 500" }];
    notifier.opened(scan, true);
    notifier.exited(scan, true);
    await advance(0);
    target = { state: "invalid" };
    await advance(RETRY_WAIT_MS);
    expect(sent).toHaveLength(1);
  });

  test("a send that throws is a failure like another and never reaches the host", async () => {
    const failing = new AwayNotifier({
      now: () => clock,
      topicSet: () => true,
      working: () => false,
      target: () => target,
      token: () => undefined,
      send: async () => {
        throw new Error("boom");
      },
      arm: (action, ms) => {
        const timer = { at: clock + ms, action, live: true };
        timers.push(timer);
        return () => void (timer.live = false);
      },
    });
    failing.opened(scan, true);
    failing.exited(scan, true);
    await advance(0);
    await advance(RETRY_WAIT_MS);
    expect(armed()).toBe(0);
  });

  test("a round of a job conversation gives a question notice thirty seconds after it is presented, and its close cancels it", async () => {
    notifier.opened(scan, true);
    notifier.roundOpened(4, scan.id);
    notifier.roundOpened(5, scan.id);
    notifier.roundClosed(5);
    await advance(NOTICE_WAIT_MS);
    expect(sent.map((request) => request.text.title)).toEqual(["shop - Scan asks a question"]);
    notifier.roundOpened(6, "terminal-9");
    notifier.roundOpened(7, undefined);
    await advance(NOTICE_WAIT_MS);
    expect(sent).toHaveLength(1);
  });

  test("a permission request gives a notice thirty seconds after it and its answer cancels it", async () => {
    notifier.opened(scan, true);
    notifier.permissionAsked(scan, "permission-1");
    notifier.permissionAsked(scan, "permission-2");
    notifier.permissionSettled(scan, "permission-1");
    await advance(NOTICE_WAIT_MS);
    expect(sent.map((request) => request.text.title)).toEqual(["shop - Scan asks permission"]);
  });

  test("disposing the notifier cancels what waits, stops the timer and makes later signals do nothing", async () => {
    notifier.opened(scan, true);
    notifier.roundOpened(1, scan.id);
    expect(armed()).toBe(1);
    notifier.dispose();
    expect(armed()).toBe(0);
    notifier.exited(scan, true);
    await advance(NOTICE_WAIT_MS * 2);
    expect(sent).toEqual([]);
    expect(armed()).toBe(0);
  });

  test("the window working again when a finished notice's wait ends sends nothing", async () => {
    notifier.opened(scan, true);
    notifier.turnEnded(scan, endTurn);
    working = true;
    await advance(NOTICE_WAIT_MS);
    expect(sent).toEqual([]);
    expect(armed()).toBe(0);
  });
});
