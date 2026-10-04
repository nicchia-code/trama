import { listProposals } from "../../../src/core/proposals";
import type { Project } from "../../../src/core/store";
import { listDrifts, listTasks } from "../../../src/core/work";

/** What the Board holds that a developer away from the computer wants to know when the agent stops. */
export interface BoardCounts {
  /** Proposals awaiting a decision, never those still being written, plus open Drifts. */
  toDecide: number;
  todo: number;
  inProgress: number;
}

export function boardCounts(p: Project): BoardCounts {
  const tasks = listTasks(p);
  return {
    toDecide: listProposals(p).filter((x) => x.data.status === "open").length + listDrifts(p).filter((d) => d.data.status === "open").length,
    todo: tasks.filter((t) => t.data.column === "todo").length,
    inProgress: tasks.filter((t) => t.data.column === "doing").length,
  };
}
