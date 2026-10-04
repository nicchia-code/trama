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
});
