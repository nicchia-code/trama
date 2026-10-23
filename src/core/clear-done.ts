import { rmSync } from "node:fs";
import { TramaError } from "./errors";
import { type ClearedTask, readHistory, saveHistory } from "./history";
import { readLastScan, rememberCleared } from "./last-scan";
import { clearProgress } from "./progress";
import { listProposals } from "./proposals";
import { cardName } from "./short-numbers";
import { proposalTagOf } from "./snapshot";
import type { Project } from "./store";
import { taskImagesDir } from "./task-images";
import { getTaskOrNull, listDrifts, type Task } from "./work";

/** The Tasks an open Drift names, as origin or as the Task that fixes its code: Clear leaves them in Done. */
function heldByOpenDrifts(p: Project): Set<string> {
  const held = new Set<string>();
  for (const drift of listDrifts(p)) {
    if (drift.data.status !== "open") continue;
    for (const id of drift.data.origin) held.add(id);
    if (drift.data.task !== null) held.add(drift.data.task);
  }
  return held;
}

/** What the History entries keep of a Task once it is gone: the title, its Proposal, the tag the Board showed, when it finished and its references. */
function copyOf(p: Project, task: Task): ClearedTask {
  const proposals = new Map(listProposals(p).map((proposal) => [proposal.id, proposal]));
  return { title: task.title, proposal: task.data.proposal, tag: proposalTagOf(task.data.proposal, proposals)?.text ?? null, finished: task.data.finished, refs: task.data.refs };
}

/** Runs one step of clearing a Task; a failure names the Task and the step, so nothing after it runs for that Task. */
function step<T>(p: Project, task: Task, what: string, run: () => T): T {
  try {
    return run();
  } catch (error) {
    throw new TramaError(`Task ${cardName(p, "task", task.id)} was not deleted: could not ${what}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Deletes the Done Tasks `ids` (the ones the Done column showed), and returns the identities it deleted. A Task is left
 * alone when it no longer exists, is not in Done any more, or is named by an open Drift as its origin or as its fix Task.
 * For each Task, in this order: its copy goes into every History entry that cites it (`cleared`, written once and never
 * changed), a line with its `finished` goes into `.trama/last-scan/cleared` when the Scan count has to keep it, then its
 * file, its percentage and its images are deleted. When a write fails the function stops before deleting that Task and
 * throws, naming the Task and the step; the Tasks already deleted stay deleted. This is the only place where a Task is deleted.
 */
export function clearDoneTasks(p: Project, ids: readonly string[]): string[] {
  const held = heldByOpenDrifts(p);
  const cleared: string[] = [];
  for (const id of new Set(ids)) {
    const task = getTaskOrNull(p, id);
    if (task === null || task.data.column !== "done" || held.has(task.id)) continue;
    const copy = copyOf(p, task);
    step(p, task, "write its copy in History", () => {
      for (const entry of readHistory(p).entries) {
        if (!entry.tasks.includes(task.id) || entry.cleared[task.id] !== undefined) continue;
        saveHistory({ ...entry, cleared: { ...entry.cleared, [task.id]: copy } });
      }
    });
    const finished = task.data.finished;
    if (finished !== null && task.data.unchanged === null && Date.parse(finished) > Date.parse(readLastScan(p)))
      step(p, task, "remember it for the Scan count", () => rememberCleared(p, task.id, finished));
    step(p, task, "delete its files", () => {
      rmSync(task.path, { force: true });
      clearProgress(p, task.id);
      rmSync(taskImagesDir(p, task.id), { recursive: true, force: true });
    });
    cleared.push(task.id);
  }
  return cleared;
}
