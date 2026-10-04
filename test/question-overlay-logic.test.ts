import { expect, test } from "bun:test";
import type { Question } from "../src/core/questions";
import { applyQuestionAction, type QuestionAction, type QuestionRoundState, startRound } from "../extension/src/host/question-state";
import { barText, missingLine, optionKey, primaryLabel, questionStatus, stepTitle, summaryAnswer } from "../extension/src/webview/questions/logic";

const q = (id: string): Question => ({ id, question: `${id}?`, options: [{ label: `${id}-a`, description: "a" }, { label: `${id}-b`, description: "b" }], recommended: 0, multi: false });

function run(state: QuestionRoundState, ...actions: QuestionAction[]): QuestionRoundState {
  return actions.reduce((s, a) => {
    const step = applyQuestionAction(s, a);
    if (step.kind !== "state") throw new Error(step.kind);
    return step.state;
  }, state);
}

test("the header, the bar and the main button follow the position", () => {
  const s = startRound([q("one"), q("two"), q("three")]);
  expect(stepTitle(s)).toBe("Question 1 of 3");
  expect(primaryLabel(s)).toBe("Next");
  expect(barText(run(s, { type: "next" }))).toBe("The agent is waiting for your answers (question 2 of 3)");
  const last = run(s, { type: "openQuestion", index: 2 });
  expect(primaryLabel(last)).toBe("Review");
  const summary = run(s, { type: "openSummary" });
  expect(stepTitle(summary)).toBe("Summary");
  expect(primaryLabel(run(summary, { type: "openQuestion", index: 0 }))).toBe("Review");
});

test("statuses and the summary say answered, skipped or missing in words", () => {
  const s = run(startRound([q("one"), q("two"), q("three")]), { type: "setText", text: "line 1\nline 2" }, { type: "next" }, { type: "skip" });
  expect([0, 1, 2].map((i) => questionStatus(s, i))).toEqual(["Answered", "Skipped", "Missing"]);
  expect(summaryAnswer(s, 0)).toEqual({ kind: "answered", labels: ["one-a"], text: "line 1\nline 2" });
  expect(summaryAnswer(s, 1)).toEqual({ kind: "skipped" });
  expect(summaryAnswer(s, 2)).toEqual({ kind: "missing" });
  expect(missingLine(1)).toBe("Answer or skip 1 more question(s) to send.");
});

test("a state that went through JSON, as the editor sends it, still says missing", () => {
  const s = run(startRound([q("one"), q("two"), q("three")]), { type: "skip" });
  const sent = JSON.parse(JSON.stringify(s)) as QuestionRoundState;
  expect(sent.confirmed[1]).toBeNull();
  expect([0, 1, 2].map((i) => questionStatus(sent, i))).toEqual(["Skipped", "Missing", "Missing"]);
  expect(summaryAnswer(sent, 2)).toEqual({ kind: "missing" });
});

test("only digits 1 to 9 within the options are shortcuts", () => {
  expect(optionKey("1", 2)).toBe(0);
  expect(optionKey("2", 2)).toBe(1);
  expect(optionKey("3", 2)).toBeNull();
  expect(optionKey("0", 9)).toBeNull();
  expect(optionKey("a", 9)).toBeNull();
});
