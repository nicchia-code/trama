import { describe, expect, test } from "bun:test";
import type { Question } from "../src/core/questions";
import { applyQuestionAction, type QuestionAction, type QuestionRoundState, type QuestionStep, startRound } from "../extension/src/host/question-state";

const question = (id: string, multi = false, recommended = 1): Question => ({
  id,
  question: `Question ${id}?`,
  options: [
    { label: `${id}-a`, description: "first" },
    { label: `${id}-b`, description: "second" },
    { label: `${id}-c`, description: "third" },
  ],
  recommended,
  multi,
});

const round = () => startRound([question("one"), question("two", true, 0), question("three")]);

function state(step: QuestionStep): QuestionRoundState {
  if (step.kind !== "state") throw new Error(`expected a state, got ${step.kind}${step.kind === "refused" ? `: ${step.reason}` : ""}`);
  return step.state;
}

function run(start: QuestionRoundState, ...actions: QuestionAction[]): QuestionRoundState {
  return actions.reduce((s, a) => state(applyQuestionAction(s, a)), start);
}

describe("answering a round", () => {
  test("the first visit selects the recommended option; Next confirms and opens the next question", () => {
    const s = round();
    expect(s.current).toBe(0);
    expect(s.drafts[0]).toEqual({ selected: [1], text: "" });
    const after = run(s, { type: "next" });
    expect(after.confirmed[0]).toEqual({ status: "answered", selected: [1], text: "" });
    expect(after.current).toBe(1);
    expect(after.drafts[1]).toEqual({ selected: [0], text: "" });
  });

  test("in a single choice clicking the selected option clears it, so the text alone answers", () => {
    let s = run(round(), { type: "toggleOption", option: 1 });
    expect(s.drafts[0]?.selected).toEqual([]);
    expect(applyQuestionAction(s, { type: "next" }).kind).toBe("refused");
    s = run(s, { type: "setText", text: "   " });
    expect(applyQuestionAction(s, { type: "next" }).kind).toBe("refused");
    s = run(s, { type: "setText", text: "my own way" }, { type: "next" });
    expect(s.confirmed[0]).toEqual({ status: "answered", selected: [], text: "my own way" });
  });

  test("a digit key selects in a single choice and never clears the selected option", () => {
    let s = run(round(), { type: "pressKey", option: 0 });
    expect(s.drafts[0]?.selected).toEqual([0]);
    s = run(s, { type: "pressKey", option: 0 });
    expect(s.drafts[0]?.selected).toEqual([0]);
    s = run(s, { type: "pressKey", option: 1 });
    expect(s.drafts[0]?.selected).toEqual([1]);
    s = run(s, { type: "next" }, { type: "next" }, { type: "pressKey", option: 2 }, { type: "pressKey", option: 2 });
    expect(s.drafts[2]?.selected).toEqual([2]);
  });

  test("a digit key toggles in a multiple choice, as a click does", () => {
    // The second question is a multiple choice recommended on option 1 (index 0).
    let s = run(round(), { type: "next" }, { type: "pressKey", option: 2 }, { type: "pressKey", option: 1 });
    expect(s.drafts[1]?.selected).toEqual([0, 1, 2]);
    s = run(s, { type: "pressKey", option: 0 });
    expect(s.drafts[1]?.selected).toEqual([1, 2]);
  });

  test("a single choice keeps one option; a multiple choice toggles each", () => {
    let s = run(round(), { type: "toggleOption", option: 2 });
    expect(s.drafts[0]?.selected).toEqual([2]);
    s = run(s, { type: "next" }, { type: "toggleOption", option: 2 }, { type: "toggleOption", option: 1 });
    expect(s.drafts[1]?.selected).toEqual([0, 1, 2]);
    s = run(s, { type: "toggleOption", option: 0 });
    expect(s.drafts[1]?.selected).toEqual([1, 2]);
  });

  test("Back and the index keep what is on the current question without confirming it", () => {
    let s = run(round(), { type: "next" }, { type: "toggleOption", option: 2 }, { type: "setText", text: "draft" }, { type: "back" });
    expect(s.current).toBe(0);
    expect(s.confirmed[1]).toBeUndefined();
    s = run(s, { type: "openQuestion", index: 1 });
    expect(s.drafts[1]).toEqual({ selected: [0, 2], text: "draft" });
    s = run(s, { type: "openQuestion", index: 2 }, { type: "openQuestion", index: 1 });
    expect(s.confirmed[1]).toBeUndefined();
    expect(applyQuestionAction(run(round()), { type: "back" }).kind).toBe("refused");
  });

  test("Skip skips only the current question and moves on like Next", () => {
    const s = run(round(), { type: "setText", text: "not delivered" }, { type: "skip" });
    expect(s.confirmed).toEqual([{ status: "skipped" }, undefined, undefined]);
    expect(s.current).toBe(1);
    expect(s.drafts[0]?.text).toBe("not delivered");
  });

  test("the last question, and a question opened from the summary, go to the summary", () => {
    let s = run(round(), { type: "next" }, { type: "next" }, { type: "next" });
    expect(s.view).toBe("summary");
    s = run(s, { type: "openQuestion", index: 0 });
    expect(s.fromSummary).toBe(true);
    s = run(s, { type: "toggleOption", option: 0 }, { type: "next" });
    expect(s.view).toBe("summary");
    expect(s.confirmed[0]).toEqual({ status: "answered", selected: [0], text: "" });
    s = run(s, { type: "openQuestion", index: 1 }, { type: "skip" });
    expect(s.view).toBe("summary");
    expect(s.confirmed[1]).toEqual({ status: "skipped" });
  });

  test("a question opened from the index of a question is not a question opened from the summary", () => {
    const s = run(round(), { type: "openQuestion", index: 1 }, { type: "next" });
    expect(s.view).toBe("question");
    expect(s.current).toBe(2);
  });
});

describe("sending", () => {
  test("is refused while a question is missing, even if the panel sends it", () => {
    const s = run(round(), { type: "openSummary" });
    const step = applyQuestionAction(s, { type: "send" });
    expect(step).toEqual({ kind: "refused", reason: "3 question(s) are neither answered nor skipped" });
  });

  test("delivers only confirmed answers and skips, with labels; blank text is not delivered", () => {
    let s = run(round(), { type: "setText", text: "  " }, { type: "next" }, { type: "skip" });
    s = run(s, { type: "setText", text: "because" }, { type: "next" });
    s = run(s, { type: "openQuestion", index: 1 }, { type: "setText", text: "unconfirmed draft" }, { type: "openSummary" });
    const step = applyQuestionAction(s, { type: "send" });
    expect(step).toEqual({
      kind: "delivered",
      result: {
        status: "answered",
        answers: {
          one: { status: "answered", selected: ["one-b"] },
          two: { status: "skipped" },
          three: { status: "answered", selected: ["three-b"], text: "because" },
        },
      },
    });
  });

  test("confirming again replaces the answer", () => {
    let s = run(round(), { type: "next" }, { type: "back" }, { type: "toggleOption", option: 0 }, { type: "next" });
    expect(s.confirmed[0]).toEqual({ status: "answered", selected: [0], text: "" });
    s = run(s, { type: "skip" }, { type: "next" });
    const step = applyQuestionAction(s, { type: "send" });
    if (step.kind !== "delivered") throw new Error(step.kind);
    expect(Object.keys(step.result.answers)).toEqual(["one", "two", "three"]);
    expect(step.result.answers["one"]).toEqual({ status: "answered", selected: ["one-a"] });
  });
});

describe("Skip all", () => {
  test("closing or Skip all asks first; Go back returns where it was without changing anything", () => {
    const s = run(round(), { type: "setText", text: "keep" });
    const asking = run(s, { type: "closeQuestions" });
    expect(asking.confirming).toBe("question");
    expect(applyQuestionAction(asking, { type: "next" }).kind).toBe("refused");
    const back = run(asking, { type: "cancelSkipAll" });
    expect(back).toEqual(s);
    const fromSummary = run(s, { type: "openSummary" }, { type: "closeQuestions" });
    expect(fromSummary.confirming).toBe("summary");
    expect(run(fromSummary, { type: "cancelSkipAll" }).view).toBe("summary");
  });

  test("confirmed, it skips every question without a confirmed answer and delivers at once", () => {
    const s = run(round(), { type: "next" }, { type: "setText", text: "draft only" }, { type: "closeQuestions" });
    const step = applyQuestionAction(s, { type: "confirmSkipAll" });
    expect(step).toEqual({
      kind: "delivered",
      result: { status: "answered", answers: { one: { status: "answered", selected: ["one-b"] }, two: { status: "skipped" }, three: { status: "skipped" } } },
    });
  });
});

describe("minimizing", () => {
  test("keeps answers and position, and refuses answering actions until restored", () => {
    const s = run(round(), { type: "next" }, { type: "setText", text: "typed" }, { type: "minimize" });
    expect(s.minimized).toBe(true);
    expect(applyQuestionAction(s, { type: "next" }).kind).toBe("refused");
    const restored = run(s, { type: "restore" });
    expect(restored.current).toBe(1);
    expect(restored.drafts[1]?.text).toBe("typed");
    expect(restored.confirmed[0]).toEqual({ status: "answered", selected: [1], text: "" });
  });

  test("while Skip all is being confirmed, it closes the confirmation without skipping and comes back where it was asked", () => {
    const s = run(round(), { type: "next" }, { type: "setText", text: "typed" });
    const fromQuestion = run(s, { type: "closeQuestions" }, { type: "minimize" });
    expect(fromQuestion.minimized).toBe(true);
    expect(fromQuestion.confirming).toBeNull();
    expect(run(fromQuestion, { type: "restore" })).toEqual(s);
    const summary = run(s, { type: "openSummary" });
    expect(run(summary, { type: "closeQuestions" }, { type: "minimize" }, { type: "restore" })).toEqual(summary);
  });
});
