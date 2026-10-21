import type { RunGroup } from "../protocol";
import type { RunModel } from "./terminal-agent";

/** A Run of a sequence: the model it runs on, the filter that cuts `Run all` to its Tasks, and the Tasks it names (automatic Runs). */
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

/** A Proposal whose model applies to the agent of `trama.agent` now, with the model and the name a run takes it by. */
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
