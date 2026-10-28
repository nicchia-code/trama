import { rmSync } from "node:fs";
import { TramaError } from "./errors";
import { clearProgress } from "./progress";
import { cardName } from "./short-numbers";
import type { Project } from "./store";
import { taskImagesDir } from "./task-images";
import { openExtent } from "./blocking";
import { type Drift, getTaskOrNull, indexDrifts, listDrifts, type Task } from "./work";

/** Why a Drift holds a Task in To do: the Task is an origin of an open Drift (of one of its open differences, for a unified Drift with differences), or the Task that fixes the code of a Drift in Code to be fixed or of one of its differences. */
export interface TaskHold {
  drift: string;
  why: "origin" | "fix";
  /** Only for `fix` of a difference: the `drift` the difference comes from. */
  difference?: string;
}

/**
 * The Drift that holds a Task, by Task identity: an open Drift (not resolved, not dismissed, not unified into another)
 * holds every Task it has in `origin`, those of a unified Drift included (for one with differences, the origins of its
 * open differences, read from the Drifts they come from); a resolved Drift with resolution `fix-code` (Code to be fixed)
 * holds its `task`, and a unified Drift holds the `task` of each of its differences decided `fix-code`, so the fix the
 * developer decided is not lost. The one rule of what Delete refuses for a Drift; the Snapshot carries its answer in each
 * Task of To do.
 */
export function tasksHeldByDrifts(drifts: readonly Drift[]): Map<string, TaskHold> {
  const held = new Map<string, TaskHold>();
  const all = indexDrifts(drifts);
  for (const drift of drifts) {
    if (drift.data.status === "open") for (const id of openExtent(drift, all).origin) if (!held.has(id)) held.set(id, { drift: drift.id, why: "origin" });
    if (drift.data.status === "resolved" && drift.data.resolution === "fix-code" && drift.data.task !== null && !held.has(drift.data.task)) held.set(drift.data.task, { drift: drift.id, why: "fix" });
    for (const difference of drift.data.differences) if (difference.decision === "fix-code" && difference.task !== null && !held.has(difference.task)) held.set(difference.task, { drift: drift.id, why: "fix", difference: difference.drift });
  }
  return held;
}

/** Deletes the file of a Task, its percentage and its images folder; each is skipped when it does not exist. The one place where the files of a Task are deleted: Clear and Delete both use it. */
export function removeTaskFiles(p: Project, task: Task): void {
  rmSync(task.path, { force: true });
  clearProgress(p, task.id);
  rmSync(taskImagesDir(p, task.id), { recursive: true, force: true });
}

/**
 * Deletes for good the Task `id`, which must be in To do (blocked, waiting for its fix Task or returned to To do after
 * being taken: all the same). The conditions are checked at the instant of deleting; when one does not hold it throws an
 * error that says which, and nothing is deleted: the Task is not in To do or does not exist, an open Drift has it as
 * origin, or it is the Task that fixes the code of a Drift in Code to be fixed. It deletes the file of the Task, its
 * percentage and its images, and writes nothing else: History entries, the Scan count and `.trama/last-scan/` are not
 * touched. Returns the Task as it was.
 */
export function deleteTask(p: Project, id: string): Task {
  const task = getTaskOrNull(p, id);
  if (task === null) throw new TramaError(`Task ${id} does not exist: nothing was deleted`);
  const name = cardName(p, "task", task.id);
  if (task.data.column !== "todo") throw new TramaError(`Task ${name} is not in To do (it is ${task.data.column}): only a Task in To do is deleted, so nothing was deleted`);
  const hold = tasksHeldByDrifts(listDrifts(p)).get(task.id);
  if (hold?.why === "origin") throw new TramaError(`Task ${name} is the origin of the open Drift ${cardName(p, "drift", hold.drift)}: it is not deleted while that Drift is open`);
  if (hold?.why === "fix") throw new TramaError(`Task ${name} is the Task that fixes the code of ${hold.difference === undefined ? `Drift ${cardName(p, "drift", hold.drift)}, which is in Code to be fixed` : `a difference of Drift ${cardName(p, "drift", hold.drift)}, still fixed in the code`}: it is not deleted, so the fix is not lost`);
  removeTaskFiles(p, task);
  return task;
}
