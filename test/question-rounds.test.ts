import { describe, expect, test } from "bun:test";
import { QuestionRoundQueue, type CompletedQuestionRound } from "../src/core/question-rounds";
import { QuestionInterruptedError, type QuestionRequest } from "../src/core/questions";

const round = (id: string): QuestionRequest => ({ questions: [{
  id, question: "Choose a direction", multi: false, recommended: 0,
  options: [{ label: "Left", description: "First route" }, { label: "Right", description: "Second route" }],
}] });
const answer: CompletedQuestionRound = { status: "answered", answers: { direction: { status: "answered", selected: ["Right"] } } };

function controlledWindow() {
  const sessions: { id: string; signal: AbortSignal; complete: (result: CompletedQuestionRound) => void }[] = [];
  const queue = new QuestionRoundQueue((request, context) => new Promise((resolve) => {
    sessions.push({ id: request.questions[0]!.id, signal: context.signal, complete: resolve });
  }));
  return { queue, sessions };
}

describe("window question rounds", () => {
  test("interrupting a terminal's rounds ends its presented and queued rounds only, and the oldest round left opens", async () => {
    const { queue, sessions } = controlledWindow();
    const outcome = (promise: Promise<unknown>) => promise.catch((error: unknown) => error);
    const a = outcome(queue.ask(round("A"), { terminal: "aaa111" }));
    const b = outcome(queue.ask(round("B"), { terminal: "bbb222" }));
    const c = outcome(queue.ask(round("C"), { terminal: "aaa111" }));
    const d = outcome(queue.ask(round("D"), { terminal: "bbb222" }));
    expect(sessions.map((session) => session.id)).toEqual(["A"]);
    queue.interrupt((context) => context.terminal === "aaa111");
    expect(await a).toBeInstanceOf(QuestionInterruptedError);
    expect(await c).toBeInstanceOf(QuestionInterruptedError);
    expect(sessions[0]!.signal.aborted).toBe(true);
    expect(sessions[0]!.signal.reason).toBeInstanceOf(QuestionInterruptedError);
    // The other terminal's rounds stay: the oldest of them is presented now, and the interrupted queued round never was.
    expect(sessions.map((session) => session.id)).toEqual(["A", "B"]);
    expect(sessions[1]!.signal.aborted).toBe(false);
    sessions[1]!.complete(answer);
    expect(await b).toEqual(answer);
    expect(sessions.map((session) => session.id)).toEqual(["A", "B", "D"]);
    sessions[2]!.complete(answer);
    expect(await d).toEqual(answer);
    // Nothing matches: nothing changes.
    queue.interrupt(() => true);
    expect(queue.busy).toBe(false);
  });

  test("busy and onIdle track the admitted round until its answer is delivered", async () => {
    let idle = 0;
    const sessions: { complete: (result: CompletedQuestionRound) => void }[] = [];
    const queue = new QuestionRoundQueue((_request, _context) => {
      const { promise, resolve } = Promise.withResolvers<CompletedQuestionRound>();
      sessions.push({ complete: resolve });
      return promise;
    }, () => { idle += 1; });
    expect(queue.busy).toBe(false);
    const asked = queue.ask(round("direction"), { });
    expect(queue.busy).toBe(true);
    sessions[0]!.complete(answer);
    expect(await asked).toEqual(answer);
    expect(queue.busy).toBe(false);
    expect(idle).toBe(1);
  });

  test("cancelling a queued caller preserves the active round; cancelling the active caller advances FIFO and ignores its late answer", async () => {
    const { queue, sessions } = controlledWindow();
    const first = new AbortController();
    const second = new AbortController();
    const a = queue.ask(round("A"), { signal: first.signal }).catch((error: unknown) => error);
    const b = queue.ask(round("B"), { signal: second.signal }).catch((error: unknown) => error);
    const c = queue.ask(round("C"), {});
    const active = sessions[0]!;
    expect(active.id).toBe("A");
    second.abort();
    expect((await b as Error).name).toBe("AbortError");
    expect(active.signal.aborted).toBe(false);
    expect(sessions.map((session) => session.id)).toEqual(["A"]);

    first.abort();
    expect((await a as Error).name).toBe("AbortError");
    expect(active.signal.aborted).toBe(true);
    expect(sessions.map((session) => session.id)).toEqual(["A", "C"]);
    active.complete(answer);
    sessions[1]!.complete(answer);
    expect(await c).toEqual(answer);
    expect(await a).toBeInstanceOf(Error);
    queue.dispose();
  });

  test("editor loss interrupts every admitted round in that window without touching another window or accepting late answers", async () => {
    const left = controlledWindow();
    const right = controlledWindow();
    const a = left.queue.ask(round("A"), {}).catch((error: unknown) => error);
    const b = left.queue.ask(round("B"), {}).catch((error: unknown) => error);
    const c = right.queue.ask(round("C"), {});
    left.queue.dispose();
    const interrupted = await Promise.all([a, b]);
    for (const error of interrupted) {
      expect(error).toBeInstanceOf(QuestionInterruptedError);
      expect((error as QuestionInterruptedError).code).toBe("editor-interrupted");
      expect(error).not.toHaveProperty("answers");
    }
    expect(left.sessions.map((session) => session.id)).toEqual(["A"]);
    expect(left.sessions[0]!.signal.reason).toBeInstanceOf(QuestionInterruptedError);
    expect(right.sessions[0]!.signal.aborted).toBe(false);
    left.sessions[0]!.complete(answer);
    right.sessions[0]!.complete(answer);
    expect(await c).toEqual(answer);
    expect(await left.queue.ask(round("D"), {})).toMatchObject({ status: "unavailable" });
    right.queue.dispose();
  });

  test("rounds of different presenters share one window queue: a round asked with another presenter waits for the one in progress", async () => {
    const queue = new QuestionRoundQueue(() => new Promise(() => {}));
    const shown: string[] = [];
    const firstGate = Promise.withResolvers<CompletedQuestionRound>();
    const first = queue.ask(round("A"), {}, () => { shown.push("old project"); return firstGate.promise; });
    const second = queue.ask(round("B"), {}, () => { shown.push("new project"); return Promise.resolve(answer); });
    expect(shown).toEqual(["old project"]);
    firstGate.resolve(answer);
    expect(await first).toEqual(answer);
    expect(await second).toEqual(answer);
    expect(shown).toEqual(["old project", "new project"]);
    queue.dispose();
  });
});
