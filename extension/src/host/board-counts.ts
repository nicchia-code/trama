import { listProposals } from "../../../src/core/proposals";
import type { Project } from "../../../src/core/store";
import { listDrifts, listTasks } from "../../../src/core/work";
import { openProposalsAwaitingDecision, roundWorktrees } from "../../../src/core/worktree-round";
import { readMergeDrift } from "../../../src/core/worktree-merge";

/** What the Board holds that a developer away from the computer wants to know when the agent stops. */
export interface BoardCounts {
  /** Proposals awaiting a decision, never those still being written, plus open Drifts. */
  toDecide: number;
  todo: number;
  inProgress: number;
}

export function boardCounts(p: Project): BoardCounts {
  const homes = [p, ...roundWorktrees(p).map((folder) => folder.project)];
  const tasks = homes.flatMap((home) => listTasks(home));
  const openDrifts = homes.reduce((n, home) => n + listDrifts(home).filter((d) => d.data.status === "open").length, 0);
  return {
    toDecide: openProposalsAwaitingDecision(p, listProposals(p)).length + openDrifts + (readMergeDrift(p.root) ? 1 : 0),
    todo: tasks.filter((t) => t.data.column === "todo").length,
    inProgress: tasks.filter((t) => t.data.column === "doing").length,
  };
}
