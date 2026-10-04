import { expect, test } from "bun:test";
import type { CompletedQuestionRound, QuestionPresenter } from "../src/core/question-rounds";
import type { QuestionRequest } from "../src/core/questions";
import { onQuestionRoundChange, questionRoundClosedAt, questionRoundOpen, trackRound } from "../extension/src/host/question-activity";

const request: QuestionRequest = { questions: [] };
const context = { signal: new AbortController().signal };
const answered: CompletedQuestionRound = { status: "answered", answers: {} };

test("a round counts as open from the moment it is shown until it closes, also when it fails, and each change is announced", async () => {
  const shown = Promise.withResolvers<CompletedQuestionRound>();
  const changes: boolean[] = [];
  const subscription = onQuestionRoundChange(() => changes.push(questionRoundOpen()));

  const done = trackRound((() => shown.promise) satisfies QuestionPresenter)(request, context);
  expect(questionRoundOpen()).toBe(true);
  const before = questionRoundClosedAt();
  shown.resolve(answered);
  await done;
  expect(questionRoundOpen()).toBe(false);
  expect(questionRoundClosedAt()).toBeGreaterThanOrEqual(before);

  await expect(trackRound(() => Promise.reject(new Error("editor lost")))(request, context)).rejects.toThrow("editor lost");
  expect(questionRoundOpen()).toBe(false);
  subscription.dispose();
  expect(changes).toEqual([true, false, true, false]);
});
