import { listProposals } from "../../../src/core/proposals";
import type { Project } from "../../../src/core/store";
import { listDrifts, listTasks, roundWork } from "../../../src/core/work";
import { openProposalsAwaitingDecision } from "../../../src/core/worktree-round";
import { readMergeDrift } from "../../../src/core/worktree-merge";

/** What the Board holds that a developer away from the computer wants to know when the agent stops. */
export interface BoardCounts {
  /** Proposals awaiting a decision, never those still being written, plus open Drifts. */
  toDecide: number;
  todo: number;
  inProgress: number;
}

export function boardCounts(p: Project): BoardCounts {
  const away = roundWork(p);
  const tasks = [...listTasks(p), ...away.flatMap((folder) => folder.tasks)];
  const openDrifts = [...listDrifts(p), ...away.flatMap((folder) => folder.drifts)].filter((d) => d.data.status === "open").length;
  return {
    toDecide: openProposalsAwaitingDecision(p, listProposals(p)).length + openDrifts + (readMergeDrift(p.root) ? 1 : 0),
    todo: tasks.filter((t) => t.data.column === "todo").length,
    inProgress: tasks.filter((t) => t.data.column === "doing").length,
  };
}
