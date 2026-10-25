import { estimateRunAll, runAllPlan, runAllProgress, type RunEstimateInput } from "../../../src/core/run-estimate";
import type { Project } from "../../../src/core/store";
import { readTimingRecords } from "../../../src/core/timings";
import { blockedTasks, listTasks } from "../../../src/core/work";
import type { RunEstimateView } from "../protocol";
import { runAllJob } from "./drift-resolution";

const MS_PER_MINUTE = 60_000;

/**
 * The time left of the Run all this window launched in `project`, for the Board: `null` without one, `{ estimating: true }` while
 * Trama works it out. The job keeps the reference (milliseconds from the launch) and the plan it was made with: there is no
 * reference until a Run has taken its first Task, and it is made again as `elapsed + high` when the plan has a choice or a Task the
 * kept plan lacks. The Run all is `over` (longer than expected) while the time since the launch exceeds the reference, worked out
 * at every call. The progress is made again with the estimate; the highest one reached outside `over` is kept in the job. Reads the
 * timing records and the Tasks; writes nothing under `.trama/`.
 */
export function runAllEstimate(project: Project, now: Date = new Date()): RunEstimateView {
  const job = runAllJob(project.root);
  if (job === undefined) return null;
  const runAll = job.runAll;
  const blocked = blockedTasks(project);
  const input: RunEstimateInput = {
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
  };
  const estimate = estimateRunAll(input);
  if (estimate === null) return { estimating: true };
  const elapsed = now.getTime() - runAll.launchedAt;
  const plan = runAllPlan(input);
  if (plan.taken) {
    const known = runAll.plan;
    const changed = known === null || plan.choices.some((choice) => !known.choices.includes(choice)) || plan.tasks.some((id) => !known.tasks.includes(id));
    if (runAll.reference === null || changed) {
      runAll.reference = elapsed + estimate.high * MS_PER_MINUTE;
      runAll.plan = { taken: true, choices: [...new Set([...(known?.choices ?? []), ...plan.choices])], tasks: [...new Set([...(known?.tasks ?? []), ...plan.tasks])] };
    }
  }
  const over = runAll.reference !== null && elapsed > runAll.reference;
  const done = runAllProgress({ elapsedMinutes: elapsed / MS_PER_MINUTE, estimate: estimate.estimate, reached: runAll.progress, over });
  if (!over) runAll.progress = done;
  return { low: estimate.low, high: estimate.high, over, done };
}
