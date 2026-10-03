import { describe, expect, test } from "bun:test";
import { QuestionRoundQueue, type CompletedQuestionRound } from "../src/core/question-rounds";
import { QuestionInterruptedError, type QuestionRequest } from "../src/core/questions";

const request: QuestionRequest = { questions: [{
  id: "direction", question: "Choose a direction", multi: false, recommended: 0,
  options: [{ label: "Left", description: "First route" }, { label: "Right", description: "Second route" }],
}] };
const answer: CompletedQuestionRound = { status: "answered", answers: { direction: { status: "answered", selected: ["Right"] } } };

function controlledWindow() {
  const sessions: { agent: string; signal: AbortSignal; complete: (result: CompletedQuestionRound) => void }[] = [];
  const queue = new QuestionRoundQueue((_request, context) => new Promise((resolve) => {
    sessions.push({ agent: context.agent, signal: context.signal, complete: resolve });
  }));
  return { queue, sessions };
}

describe("window question rounds", () => {
  test("cancelling a queued caller preserves the active round; cancelling the active caller advances FIFO and ignores its late answer", async () => {
    const { queue, sessions } = controlledWindow();
    const first = new AbortController();
    const second = new AbortController();
    const a = queue.ask(request, { agent: "A", signal: first.signal }).catch((error: unknown) => error);
    const b = queue.ask(request, { agent: "B", signal: second.signal }).catch((error: unknown) => error);
    const c = queue.ask(request, { agent: "C" });
    const active = sessions[0]!;
    expect(active.agent).toBe("A");
    second.abort();
    expect((await b as Error).name).toBe("AbortError");
    expect(active.signal.aborted).toBe(false);
    expect(sessions.map((session) => session.agent)).toEqual(["A"]);

    first.abort();
    expect((await a as Error).name).toBe("AbortError");
    expect(active.signal.aborted).toBe(true);
    expect(sessions.map((session) => session.agent)).toEqual(["A", "C"]);
    active.complete(answer);
    sessions[1]!.complete(answer);
    expect(await c).toEqual(answer);
    expect(await a).toBeInstanceOf(Error);
    queue.dispose();
  });

  test("editor loss interrupts every admitted round in that window without touching another window or accepting late answers", async () => {
    const left = controlledWindow();
    const right = controlledWindow();
    const a = left.queue.ask(request, { agent: "A" }).catch((error: unknown) => error);
    const b = left.queue.ask(request, { agent: "B" }).catch((error: unknown) => error);
    const c = right.queue.ask(request, { agent: "C" });
    left.queue.dispose();
    const interrupted = await Promise.all([a, b]);
    for (const error of interrupted) {
      expect(error).toBeInstanceOf(QuestionInterruptedError);
      expect((error as QuestionInterruptedError).code).toBe("editor-interrupted");
      expect(error).not.toHaveProperty("answers");
    }
    expect(left.sessions.map((session) => session.agent)).toEqual(["A"]);
    expect(left.sessions[0]!.signal.reason).toBeInstanceOf(QuestionInterruptedError);
    expect(right.sessions[0]!.signal.aborted).toBe(false);
    left.sessions[0]!.complete(answer);
    right.sessions[0]!.complete(answer);
    expect(await c).toEqual(answer);
    expect(await left.queue.ask(request, { agent: "New caller" })).toMatchObject({ status: "unavailable" });
    right.queue.dispose();
  });
});
