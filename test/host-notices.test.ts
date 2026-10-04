import { expect, test } from "bun:test";
import type { NoticeFacts } from "../extension/src/host/notice-text";
import { commandOutcome, EndNotices } from "../extension/src/host/end-notices";
import type { CompletedQuestionRound, QuestionPresenter } from "../src/core/question-rounds";
import type { QuestionRequest } from "../src/core/questions";
import { noticeOnQuestion } from "../extension/src/host/question-notice";
import { NoticeService, ntfyEndpoint, type Timer } from "../extension/src/host/notices";

const question: NoticeFacts = { kind: "question", project: "shop", step: 1, total: 2, question: "Which database?", options: ["SQLite", "Postgres"] };

interface Call {
  url: string;
  init: RequestInit;
}

/** A clock the test moves by hand, a fetch that answers from a script, and the warnings the developer would see. */
function harness(options: { topic?: string; answers?: Array<number | Error | "silence"> } = {}) {
  let now = 0;
  let topic = options.topic ?? "my-alerts";
  const timers: Array<{ at: number; run: () => void; live: boolean }> = [];
  const calls: Call[] = [];
  const warnings: string[] = [];
  const answers = [...(options.answers ?? [])];
  const service = new NoticeService({
    topic: () => topic,
    fetch: ((url: string, init: RequestInit) => {
      calls.push({ url, init });
      const answer = answers.shift() ?? 200;
      if (answer === "silence") {
        const { promise, reject } = Promise.withResolvers<Response>();
        init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        return promise;
      }
      if (answer instanceof Error) return Promise.reject(answer);
      return Promise.resolve(new Response("", { status: answer }));
    }) as unknown as typeof fetch,
    after: (ms, run): Timer => {
      const timer = { at: now + ms, run, live: true };
      timers.push(timer);
      return { cancel: () => void (timer.live = false) };
    },
    warn: (message) => void warnings.push(message),
  });
  /** Moves time forward, firing due timers in order and letting requests settle after each. */
  const advance = async (ms: number) => {
    const target = now + ms;
    for (;;) {
      const due = timers.filter((t) => t.live && t.at <= target).sort((a, b) => a.at - b.at)[0];
      if (!due) break;
      due.live = false;
      now = due.at;
      due.run();
      for (let i = 0; i < 5; i++) await Promise.resolve();
    }
    now = target;
  };
  return { service, calls, warnings, advance, setTopic: (value: string) => void (topic = value) };
}

test("a topic name goes to the public service and an http(s) URL is used as typed; anything else is invalid", () => {
  expect(ntfyEndpoint(" my-alerts ")).toBe("https://ntfy.sh/my-alerts");
  expect(ntfyEndpoint("a".repeat(64))).toBe(`https://ntfy.sh/${"a".repeat(64)}`);
  expect(ntfyEndpoint("a".repeat(65))).toBeUndefined();
  expect(ntfyEndpoint("my alerts")).toBeUndefined();
  expect(ntfyEndpoint("https://ntfy.example.org/mine")).toBe("https://ntfy.example.org/mine");
  expect(ntfyEndpoint("http://localhost:8080/mine")).toBe("http://localhost:8080/mine");
  expect(ntfyEndpoint("https://user:secret@ntfy.example.org/mine")).toBeUndefined();
  expect(ntfyEndpoint("ftp://ntfy.example.org/mine")).toBeUndefined();
});

test("with no topic nothing is born and no request is made", async () => {
  const t = harness({ topic: "" });
  expect(t.service.start(() => question)).toBeUndefined();
  await t.advance(60_000);
  expect(t.calls).toHaveLength(0);
});

test("a notice is sent once, ten seconds after it is born, with the composed text and headers", async () => {
  const t = harness();
  t.service.start(() => question);
  await t.advance(9_999);
  expect(t.calls).toHaveLength(0);
  await t.advance(1);
  expect(t.calls).toHaveLength(1);
  expect(t.calls[0]?.url).toBe("https://ntfy.sh/my-alerts");
  expect(t.calls[0]?.init.method).toBe("POST");
  expect(t.calls[0]?.init.body).toBe("shop\nQuestion 1 of 2: Which database?\n- SQLite\n- Postgres");
  expect(t.calls[0]?.init.headers).toEqual({ Title: "Trama: the agent asks", Priority: "4", Tags: "question" });
  await t.advance(60_000);
  expect(t.calls).toHaveLength(1);
  expect(t.warnings).toEqual([]);
});

test("the text is composed when the notice leaves, not when it is born", async () => {
  const t = harness();
  let step = 1;
  t.service.start(() => ({ ...question, step }));
  step = 2;
  await t.advance(10_000);
  expect(String(t.calls[0]?.init.body)).toContain("Question 2 of 2");
});

test("a cancelled notice never leaves, and cancelling twice or late changes nothing", async () => {
  const t = harness();
  const notice = t.service.start(() => question);
  await t.advance(5_000);
  notice?.cancel();
  notice?.cancel();
  await t.advance(60_000);
  expect(t.calls).toHaveLength(0);

  const late = t.service.start(() => question);
  await t.advance(10_000);
  late?.cancel();
  expect(t.calls).toHaveLength(1);
});

test("a notice whose reason is gone when it would leave is not sent", async () => {
  const t = harness();
  t.service.start(() => undefined);
  await t.advance(60_000);
  expect(t.calls).toHaveLength(0);
});

test("a topic removed during the wait stops the notice with no request and no warning", async () => {
  const t = harness();
  t.service.start(() => question);
  t.setTopic("");
  await t.advance(60_000);
  expect(t.calls).toHaveLength(0);
  expect(t.warnings).toEqual([]);
});

test("an invalid topic at the end of the wait makes no request and warns the developer once", async () => {
  const t = harness({ topic: "bad topic" });
  t.service.start(() => question);
  t.service.start(() => question);
  await t.advance(10_000);
  expect(t.calls).toHaveLength(0);
  expect(t.warnings).toEqual(["Trama could not send the ntfy notification: the setting is not a topic name or an http(s) URL. Check the trama.ntfy setting and your connection."]);
});

test("a first failure is retried once after ten seconds with the same text, and a success then ends it quietly", async () => {
  const t = harness({ answers: [503, 200] });
  t.service.start(() => question);
  await t.advance(10_000);
  expect(t.calls).toHaveLength(1);
  await t.advance(9_999);
  expect(t.calls).toHaveLength(1);
  await t.advance(1);
  expect(t.calls).toHaveLength(2);
  expect(t.calls[1]?.init.body).toBe(t.calls[0]?.init.body);
  await t.advance(60_000);
  expect(t.calls).toHaveLength(2);
  expect(t.warnings).toEqual([]);
});

test("the retry reads the setting again: a removed or invalid topic stops it", async () => {
  const removed = harness({ answers: [500] });
  removed.service.start(() => question);
  await removed.advance(10_000);
  removed.setTopic("");
  await removed.advance(60_000);
  expect(removed.calls).toHaveLength(1);

  const changed = harness({ answers: [500, 200] });
  changed.service.start(() => question);
  await changed.advance(10_000);
  changed.setTopic("https://ntfy.example.org/mine");
  await changed.advance(10_000);
  expect(changed.calls.map((c) => c.url)).toEqual(["https://ntfy.sh/my-alerts", "https://ntfy.example.org/mine"]);
});

test("two failures warn the developer with the reason, once, until a notice is delivered again", async () => {
  const t = harness({ answers: [500, 502, 500, 502, 200, 500, 502] });
  const run = async () => {
    t.service.start(() => question);
    await t.advance(20_000);
  };
  await run();
  expect(t.warnings).toEqual(["Trama could not send the ntfy notification: HTTP 502. Check the trama.ntfy setting and your connection."]);
  await run();
  expect(t.warnings).toHaveLength(1);
  await run();
  expect(t.warnings).toHaveLength(1);
  await run();
  expect(t.warnings).toHaveLength(2);
});

test("a request with no answer in ten seconds fails with its own reason", async () => {
  const t = harness({ answers: ["silence", "silence"] });
  t.service.start(() => question);
  await t.advance(40_000);
  expect(t.calls).toHaveLength(2);
  expect(t.warnings).toEqual(["Trama could not send the ntfy notification: no response within 10 seconds. Check the trama.ntfy setting and your connection."]);
});

test("a network error is reported without the topic or the URL", async () => {
  const t = harness({
    topic: "https://ntfy.example.org/very-secret-topic",
    answers: [new Error("connect ECONNREFUSED https://ntfy.example.org/very-secret-topic"), new Error("very-secret-topic is down")],
  });
  t.service.start(() => question);
  await t.advance(20_000);
  expect(t.warnings).toHaveLength(1);
  expect(t.warnings[0]).not.toContain("very-secret-topic");
  expect(t.warnings[0]).not.toContain("ntfy.example.org");
  expect(t.warnings[0]).toContain("Trama could not send the ntfy notification:");
});

test("closing the window stops waiting and retrying notices and warns about nothing", async () => {
  const t = harness({ answers: [500] });
  t.service.start(() => question);
  t.service.start(() => question);
  await t.advance(10_000);
  t.service.dispose();
  await t.advance(60_000);
  expect(t.calls).toHaveLength(2);
  expect(t.warnings).toEqual([]);
  expect(t.service.start(() => question)).toBeUndefined();
});

/** A presenter the test drives: it shows the questions it is told to and closes when told. */
function presenter() {
  const closing = Promise.withResolvers<CompletedQuestionRound>();
  let show: (index: number) => void = () => {};
  const present: QuestionPresenter = (_request, context) => {
    show = (index) => context.onQuestion?.(index);
    context.signal.addEventListener("abort", () => closing.reject(new Error("abandoned")));
    show(0);
    return closing.promise;
  };
  return { present, show: (index: number) => show(index), answer: () => closing.resolve({ status: "answered", answers: {} }) };
}

const round: QuestionRequest = {
  questions: [
    { id: "db", question: "Which database?", options: [{ label: "SQLite", description: "file" }, { label: "Postgres", description: "server" }], recommended: 0, multi: false },
    { id: "orm", question: "Which mapper?", options: [{ label: "None", description: "plain SQL" }, { label: "Drizzle", description: "typed" }], recommended: 1, multi: false },
  ],
};
const shown = (fromTramaTerminal?: boolean) => ({ signal: new AbortController().signal, ...(fromTramaTerminal === undefined ? {} : { fromTramaTerminal }) });

test("a round from a Trama terminal that stays unanswered sends one notice, naming the question in front of the developer", async () => {
  const t = harness();
  const p = presenter();
  const done = noticeOnQuestion(p.present, t.service, "shop")(round, shown(true));
  await t.advance(4_000);
  p.show(1);
  await t.advance(4_000);
  p.show(0);
  p.show(1);
  await t.advance(2_000);
  expect(t.calls).toHaveLength(1);
  expect(t.calls[0]?.init.body).toBe("shop\nQuestion 2 of 2: Which mapper?\n- None\n- Drizzle");
  p.answer();
  await done;
  await t.advance(60_000);
  expect(t.calls).toHaveLength(1);
});

test("a round answered, skipped or abandoned within ten seconds sends nothing", async () => {
  for (const close of ["answered", "abandoned"] as const) {
    const t = harness();
    const p = presenter();
    const abort = new AbortController();
    const done = noticeOnQuestion(p.present, t.service, "shop")(round, { signal: abort.signal, fromTramaTerminal: true });
    await t.advance(9_000);
    if (close === "answered") p.answer();
    else abort.abort();
    await done.catch(() => undefined);
    await t.advance(60_000);
    expect(t.calls).toHaveLength(0);
  }
});

test("a round from any other agent sends nothing, however long it waits", async () => {
  for (const origin of [false, undefined]) {
    const t = harness();
    const p = presenter();
    const done = noticeOnQuestion(p.present, t.service, "shop")(round, shown(origin));
    await t.advance(60_000);
    expect(t.calls).toHaveLength(0);
    p.answer();
    await done;
  }
});

test("a round from Cursor's chat agent gets the same notice", async () => {
  const t = harness();
  const p = presenter();
  const done = noticeOnQuestion(p.present, t.service, "shop")(round, { signal: new AbortController().signal, fromCursorChat: true });
  await t.advance(10_000);
  expect(t.calls).toHaveLength(1);
  expect(t.calls[0]?.init.body).toBe("shop\nQuestion 1 of 2: Which database?\n- SQLite\n- Postgres");
  p.answer();
  await done;
});

test("a round with no topic set when it is shown never gets a notice, even if one is set later", async () => {
  const t = harness({ topic: "" });
  const p = presenter();
  const done = noticeOnQuestion(p.present, t.service, "shop")(round, shown(true));
  t.setTopic("my-alerts");
  await t.advance(60_000);
  expect(t.calls).toHaveLength(0);
  p.answer();
  await done;
});

test("the notice does not change what the round returns or how it fails", async () => {
  const t = harness({ answers: [500, 500] });
  const p = presenter();
  const abort = new AbortController();
  const done = noticeOnQuestion(p.present, t.service, "shop")(round, { signal: abort.signal, fromTramaTerminal: true });
  await t.advance(60_000);
  expect(t.warnings).toHaveLength(1);
  abort.abort();
  await expect(done).rejects.toThrow("abandoned");
});

const counts = { toDecide: 2, todo: 5, inProgress: 1 };

test("the end of the agent's command sends one notice ten seconds later, saying how it ended and what the Board holds then", async () => {
  const t = harness();
  const ends = new EndNotices(t.service);
  let board = counts;
  ends.born("shop", commandOutcome(2), () => board);
  board = { toDecide: 0, todo: 4, inProgress: 0 };
  await t.advance(10_000);
  expect(t.calls).toHaveLength(1);
  expect(t.calls[0]?.init.body).toBe("shop\nThe agent failed (exit code 2).\nTo decide: 0\nTo do: 4\nIn progress: 0");
  expect(t.calls[0]?.init.headers).toEqual({ Title: "Trama: the agent stopped", Priority: "4", Tags: "warning" });
});

test("the terminal's report becomes the outcome: no status, success or a failing status", () => {
  expect(commandOutcome(undefined)).toEqual({ kind: "unreported" });
  expect(commandOutcome(0)).toEqual({ kind: "finished" });
  expect(commandOutcome(130)).toEqual({ kind: "failed", exitCode: 130 });
});

test("two commands ending in two terminals send two notices, and cancelling takes back every one that still waits", async () => {
  const t = harness();
  const ends = new EndNotices(t.service);
  ends.born("shop", commandOutcome(0), () => counts);
  ends.born("shop", commandOutcome(0), () => counts);
  await t.advance(10_000);
  expect(t.calls).toHaveLength(2);

  ends.born("shop", commandOutcome(0), () => counts);
  ends.born("shop", commandOutcome(0), () => counts);
  await t.advance(4_000);
  ends.cancelAll();
  await t.advance(60_000);
  expect(t.calls).toHaveLength(2);

  ends.born("shop", commandOutcome(0), () => counts);
  await t.advance(10_000);
  expect(t.calls).toHaveLength(3);
});

test("an end notice is born only while a topic is set, and a Board that cannot be read sends nothing", async () => {
  const none = harness({ topic: "" });
  new EndNotices(none.service).born("shop", commandOutcome(0), () => counts);
  await none.advance(60_000);
  expect(none.calls).toHaveLength(0);

  const broken = harness();
  new EndNotices(broken.service).born("shop", commandOutcome(0), () => {
    throw new Error("unreadable");
  });
  new EndNotices(broken.service).born("shop", commandOutcome(0), () => undefined);
  await broken.advance(60_000);
  expect(broken.calls).toHaveLength(0);
  expect(broken.warnings).toEqual([]);
});

test("a notice cancelled after it left changes nothing and cannot send again", async () => {
  const t = harness();
  const ends = new EndNotices(t.service);
  ends.born("shop", commandOutcome(0), () => counts);
  await t.advance(10_000);
  ends.cancelAll();
  await t.advance(60_000);
  expect(t.calls).toHaveLength(1);
});
