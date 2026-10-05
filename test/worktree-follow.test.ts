import { describe, expect, test } from "bun:test";
import { shouldRunProposalTasks } from "../extension/src/host/worktree-follow";

describe("whether a finished worktree scan runs the Proposal's Tasks", () => {
  test("a scan that created a Task runs them while any Task in the round is not Done", () => {
    expect(shouldRunProposalTasks({ kind: "scan", before: [], after: ["0001"], columns: ["todo"] })).toBe(true);
    expect(shouldRunProposalTasks({ kind: "scan", before: ["0001"], after: ["0001", "0002"], columns: ["done", "doing"] })).toBe(true);
  });

  test("no new Task, an implement command, or a round already Done does not run them", () => {
    expect(shouldRunProposalTasks({ kind: "scan", before: ["0001"], after: ["0001"], columns: ["todo"] })).toBe(false);
    expect(shouldRunProposalTasks({ kind: "implement", before: [], after: ["0002"], columns: ["todo"] })).toBe(false);
    expect(shouldRunProposalTasks({ kind: "scan", before: [], after: ["0001"], columns: ["done"] })).toBe(false);
    expect(shouldRunProposalTasks({ kind: "scan", before: [], after: [], columns: [] })).toBe(false);
  });
});
