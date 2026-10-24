import { estimateRunAll, runAllProgress } from "../../../src/core/run-estimate";
import type { Project } from "../../../src/core/store";
import { readTimingRecords } from "../../../src/core/timings";
import { blockedTasks, listTasks } from "../../../src/core/work";
import type { RunEstimateView } from "../protocol";
import { runAllJob } from "./drift-resolution";

const MS_PER_MINUTE = 60_000;

/**
 * The time left of the Run all this window launched in `project`, for the Board: `null` without one, `{ estimating: true }` while
 * Trama works it out. The first estimate's high limit is kept in the job and the Run all is `over` once the time since the launch
 * passes it, for good. The progress is made again with the estimate; the highest one reached is kept in the job. Reads the timing
 * records and the Tasks; writes nothing under `.trama/`.
 */
export function runAllEstimate(project: Project, now: Date = new Date()): RunEstimateView {
  const job = runAllJob(project.root);
  if (job === undefined) return null;
  const runAll = job.runAll;
  const blocked = blockedTasks(project);
  const estimate = estimateRunAll({
    records: readTimingRecords(project),
    tasks: listTasks(project).map((task) => ({
      id: task.id,
      column: task.data.column,
      blocked: (blocked.get(task.id) ?? []).length > 0,
      fix: task.data.drift !== null,
      holder: task.data.holder,
    })),
    runs: runAll.groups.map((group) => ({ terminal: group.terminal, tasks: group.tasks, seats: group.seats, ended: group.ended })),
    parallel: runAll.parallel,
    launchedAt: new Date(runAll.launchedAt),
    now,
  });
  if (estimate === null) return { estimating: true };
  runAll.high ??= estimate.high;
  const elapsed = now.getTime() - runAll.launchedAt;
  const over = elapsed > runAll.high * MS_PER_MINUTE;
  runAll.progress = runAllProgress({ elapsedMinutes: elapsed / MS_PER_MINUTE, estimate: estimate.estimate, reached: runAll.progress, over });
  return { low: estimate.low, high: estimate.high, over, done: runAll.progress };
}
