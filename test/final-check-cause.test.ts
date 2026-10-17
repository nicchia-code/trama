import { expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { recordAutopilotFailure, recordRunFailure, runCauseTask, runContinuationHeld, runFinalCheckFailed } from "../extension/src/host/drift-resolution";

const newRoot = () => mkdtempSync(join(tmpdir(), "trama-final-check-"));

test("a failed final check holds its Run until a failed Task report names the Task that broke it", () => {
  const root = newRoot();
  recordRunFailure(root, "run-a", "Fix");
  expect(runContinuationHeld(root, "run-a")).toBe(true);
  recordAutopilotFailure(root, "run-a", undefined, "task-a", "the check broke");
  expect(runContinuationHeld(root, "run-a")).toBe(false);
  expect(runCauseTask(root, "run-a")).toBe("task-a");
});

test("a Task that failed before the final check does not name its cause", () => {
  const root = newRoot();
  recordAutopilotFailure(root, "run-b", undefined, "task-b", "its own check failed");
  recordRunFailure(root, "run-b", "Fix");
  expect(runContinuationHeld(root, "run-b")).toBe(true);
  expect(runCauseTask(root, "run-b")).toBeUndefined();
});

test("the failed final check of one Run does not reach another Run", () => {
  const root = newRoot();
  recordRunFailure(root, "run-c", "Fix");
  expect(runFinalCheckFailed(root, "run-d")).toBe(false);
  expect(runContinuationHeld(root, "run-d")).toBe(false);
});
