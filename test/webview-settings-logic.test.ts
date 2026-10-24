import { expect, test } from "bun:test";
import type { ModelSuggestion } from "../extension/src/host/model-lists";
import { composeRoleValue, ompStatusLine, splitRoleValue, thinkingLevels, withModel } from "../extension/src/webview/settings/logic";

const HAIKU = "anthropic/claude-haiku-4-5";
const models: ModelSuggestion[] = [
  { value: HAIKU, thinking: ["minimal", "low", "medium", "high", "xhigh"] },
  { value: "openai/gpt-5", thinking: ["low", "high"] },
  { value: "local/plain" },
];

test("thinkingLevels gives the levels a model declares in omp's order, none for a model without levels or not listed", () => {
  expect(thinkingLevels(models, HAIKU)).toEqual(["minimal", "low", "medium", "high", "xhigh"]);
  expect(thinkingLevels(models, "local/plain")).toEqual([]);
  expect(thinkingLevels(models, "unknown/model")).toEqual([]);
});

test("splitRoleValue splits a declared level off the model, and keeps the whole value when the level is not declared", () => {
  expect(splitRoleValue(`${HAIKU}:high`, models)).toEqual({ model: HAIKU, level: "high" });
  expect(splitRoleValue(HAIKU, models)).toEqual({ model: HAIKU });
  expect(splitRoleValue(`${HAIKU}:bogus`, models)).toEqual({ model: `${HAIKU}:bogus` });
  expect(splitRoleValue(`${HAIKU}:`, models)).toEqual({ model: `${HAIKU}:` });
  expect(splitRoleValue("local/plain:high", models)).toEqual({ model: "local/plain:high" });
  expect(splitRoleValue(":high", models)).toEqual({ model: ":high" });
});

test("composeRoleValue writes the model, then the level when there is one", () => {
  expect(composeRoleValue(HAIKU, "high")).toBe(`${HAIKU}:high`);
  expect(composeRoleValue(HAIKU, undefined)).toBe(HAIKU);
});

test("withModel keeps the level only when the new model declares it, and never adds one", () => {
  expect(withModel(`${HAIKU}:high`, "openai/gpt-5", models)).toBe("openai/gpt-5:high");
  expect(withModel(`${HAIKU}:xhigh`, "openai/gpt-5", models)).toBe("openai/gpt-5");
  expect(withModel(HAIKU, "openai/gpt-5", models)).toBe("openai/gpt-5");
  expect(withModel(`${HAIKU}:high`, "local/plain", models)).toBe("local/plain");
});

test("the omp row says what omp answered, or, when omp is older than the minimum, that Trama needs a later one, with Install omp", () => {
  expect(ompStatusLine(null)).toEqual({ tone: "checking", text: "Checking omp…", missing: false });
  expect(ompStatusLine({ state: "done", missing: false, version: "18.12.6", models: 3 })).toEqual({ tone: "ok", text: "omp 18.12.6 answered with 3 models.", missing: false });
  expect(ompStatusLine({ state: "done", missing: false, version: "18.12.5", models: 3, tooOld: true })).toEqual({ tone: "warning", text: "Trama needs omp 18.12.6 or later; the installed omp is 18.12.5.", missing: true });
  expect(ompStatusLine({ state: "done", missing: true, error: "omp not found at x" })).toEqual({ tone: "warning", text: "omp not found at x. Trama cannot work without omp.", missing: true });
});
