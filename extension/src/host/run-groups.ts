import type { RunGroup } from "../protocol";
import type { RunModel } from "./terminal-agent";

/** A Run of a sequence: the model it runs on, the filter that cuts `Run all` to its Tasks, and the Tasks it names. */
export interface PlannedRun {
  run: RunModel;
  group: RunGroup;
  tasks: string[];
}

/** A Task to plan, in creation order: its identity and its Proposal (null for a Task with none). */
export interface PlanTask {
  id: string;
  proposal: string | null;
}

/** A Proposal with a model, with the model and the name a run takes it by. */
export interface AppliedModel {
  id: string;
  run: RunModel;
}

/**
 * Cuts Tasks into the Runs of a sequence by their effective model: the model of their Proposal when it applies, otherwise
 * `trama.execution` without the spaces around it. Tasks with the same model text form one group, in the order of their
 * oldest Task. A group with a Task on the role is the Settings group: it takes every Task but those of the Proposals whose
 * applying model differs. Any other group takes the Tasks of the Proposals whose applying model is its text.
 */
export function planRuns(tasks: readonly PlanTask[], applied: readonly AppliedModel[], execution: string): PlannedRun[] {
  const role = execution.trim();
  const runOf = new Map(applied.map((entry) => [entry.id, entry.run]));
  const groups = new Map<string, { onRole: boolean; tasks: string[]; proposal?: RunModel }>();
  for (const task of tasks) {
    const run = task.proposal === null ? undefined : runOf.get(task.proposal);
    const model = run?.model ?? role;
    const group = groups.get(model) ?? { onRole: false, tasks: [] };
    group.tasks.push(task.id);
    if (run === undefined) group.onRole = true;
    else group.proposal ??= run;
    groups.set(model, group);
  }
  return [...groups].map(([model, group]) => {
    if (group.onRole || group.proposal === undefined) {
      const exclude = applied.filter((entry) => entry.run.model !== role).map((entry) => entry.id);
      return { run: { model: role }, group: exclude.length > 0 ? { exclude } : {}, tasks: group.tasks };
    }
    const include = applied.filter((entry) => entry.run.model === model).map((entry) => entry.id);
    return { run: group.proposal, group: { include, model }, tasks: group.tasks };
  });
}

/**
 * Starts the Runs of a sequence one after the other. `launch` starts one Run and resolves whether it really started; its
 * `onEnd` is called with the reason when the Run ends abnormally, or with nothing when it ends normally. The next Run
 * starts only from a normal end; `finish` is called once: after the last Run's normal end, or with the reason that stops
 * the sequence (an abnormal end, or a Run that did not start).
 */
export function runSequence(
  runs: readonly PlannedRun[],
  launch: (run: PlannedRun, onEnd: (abnormal?: string) => void) => Promise<boolean>,
  finish: (abnormal?: string) => void,
): void {
  const step = (index: number): void => {
    const run = runs[index];
    if (run === undefined) {
      finish();
      return;
    }
    const last = index + 1 === runs.length;
    const onEnd = (abnormal?: string): void => {
      if (abnormal !== undefined || last) finish(abnormal);
      else step(index + 1);
    };
    void launch(run, onEnd).then((started) => {
      if (!started) finish("its instruction did not reach the agent");
    });
  };
  step(0);
}

/** A Run that starts with the sub-agent places its instruction gives: its share of `trama.maxParallelAgents`. */
export interface SeatedRun extends PlannedRun {
  seats: number;
}

/**
 * The places of `limit` sub-agents each Run gets when they start together, given their Task counts in the order of the
 * Runs (oldest Task first). A Run gets the whole part of `limit` times its Tasks over all the Tasks, and at least one place;
 * when those parts add up to more than `limit`, the largest give up one place at a time, the later Run first on a tie. The
 * places left over go one each to the largest remainders, the earlier Run first on a tie. The sum is never above `limit`.
 * Needs at most `limit` Runs, each with at least one Task.
 */
export function shareSeats(counts: readonly number[], limit: number): number[] {
  const total = counts.reduce((sum, count) => sum + count, 0);
  const parts = counts.map((count) => Math.max(1, Math.floor((limit * count) / total)));
  let sum = parts.reduce((acc, part) => acc + part, 0);
  while (sum > limit) {
    let largest = 0;
    parts.forEach((part, index) => {
      if (part >= (parts[largest] ?? 0)) largest = index;
    });
    parts[largest] = (parts[largest] ?? 0) - 1;
    sum -= 1;
  }
  const remainder = (index: number): number => (limit * (counts[index] ?? 0)) % total;
  const byRemainder = counts.map((_, index) => index).sort((a, b) => remainder(b) - remainder(a) || a - b);
  for (const index of byRemainder.slice(0, limit - sum)) parts[index] = (parts[index] ?? 0) + 1;
  return parts;
}

/**
 * The Runs that start at once with their places, and those that wait. When there are more Runs than places, the first
 * `limit` start together with one place each and the others wait for one place each; otherwise every Run starts together
 * with its share of `limit` (`shareSeats`).
 */
export function startRuns(runs: readonly PlannedRun[], limit: number): { now: SeatedRun[]; waiting: SeatedRun[] } {
  if (runs.length > limit) {
    const seated = runs.map((run) => ({ ...run, seats: 1 }));
    return { now: seated.slice(0, limit), waiting: seated.slice(limit) };
  }
  const shares = shareSeats(runs.map((run) => run.tasks.length), limit);
  return { now: runs.map((run, index) => ({ ...run, seats: shares[index] ?? 1 })), waiting: [] };
}

/**
 * Starts the Runs of a sequence together, each with its places (`startRuns`). A Run that ends abnormally stops the Runs
 * that have not started, and the Runs already working go on; a normal end starts the next waiting Run, if any. `launch`
 * starts one Run and resolves whether it really started; `onEnd` is called once with the reason when the Run ends
 * abnormally, or with nothing when it ends normally. `finish` is called once, when no Run works and none waits, with the
 * first reason that stopped the sequence, if any.
 */
export function runSequenceTogether(
  runs: readonly PlannedRun[],
  limit: number,
  launch: (run: SeatedRun, onEnd: (abnormal?: string) => void) => Promise<boolean>,
  finish: (abnormal?: string) => void,
): void {
  const { now, waiting } = startRuns(runs, limit);
  let queue = [...waiting];
  let working = 0;
  let reason: string | undefined;
  let done = false;
  const settle = (): void => {
    if (done || working > 0 || queue.length > 0) return;
    done = true;
    finish(reason);
  };
  const start = (run: SeatedRun): void => {
    working += 1;
    let ended = false;
    const onEnd = (abnormal?: string): void => {
      if (ended) return;
      ended = true;
      working -= 1;
      if (abnormal !== undefined) {
        reason ??= abnormal;
        queue = [];
      } else {
        const next = queue.shift();
        if (next !== undefined) start(next);
      }
      settle();
    };
    void launch(run, onEnd).then((started) => {
      if (!started) onEnd("its instruction did not reach the agent");
    });
  };
  for (const run of now) start(run);
  settle();
}
