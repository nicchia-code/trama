import type { TaskColumn } from "./design";
import type { TimingRecord } from "./timings";

/*
 * The time left of a `Run all`, worked out by Trama alone from the timing records, the Tasks and the places of the Runs: no
 * agent and no model. A pure function: it reads nothing and writes nothing, and the host forgets its inputs when the Run all ends.
 */

/** Minutes a correction Task (a Task with a Drift) weighs. */
export const FIX_TASK_MINUTES = 1;
/** Minutes a Task weighs when fewer than `HISTORY_MIN_DURATIONS` usable durations exist. */
export const DEFAULT_TASK_MINUTES = 9;
/** Minutes a Task in progress never weighs less than. */
export const MIN_IN_PROGRESS_MINUTES = 1;
/** Minutes a Run takes to start, until it has taken a Task. */
export const START_MINUTES = 0.5;
/** Minutes after the last Task of a Run: the final check, the History, the hand-over. */
export const TAIL_MINUTES = 2.5;
/** Minutes the tail of a Run with no Task left never shrinks under. */
export const MIN_TAIL_MINUTES = 0.5;
/** Only durations above this many seconds count towards the average weight. */
export const HISTORY_MIN_SECONDS = 30;
/** Usable durations needed before their average replaces `DEFAULT_TASK_MINUTES`. */
export const HISTORY_MIN_DURATIONS = 10;
/** The low limit of the range is the estimate times this. */
export const LOW_FACTOR = 0.7;
/** The high limit of the range is the estimate times this. */
export const HIGH_FACTOR = 1.5;

/** A Task of the project as the estimate sees it. */
export interface EstimateTask {
  id: string;
  column: TaskColumn;
  /** Whether anything blocks it: a Drift, or a correction Task it waits for. */
  blocked: boolean;
  /** Whether it is a correction Task (it has a Drift). */
  fix: boolean;
  /** The terminal or conversation that took it; null when nobody holds it. */
  holder: string | null;
}

/** A Run of the Run all (the only one when `Run all` is not cut by model). */
export interface EstimateRun {
  /** The terminal or conversation of the Run once it started; null while it has not. */
  terminal: string | null;
  /** The Tasks the Run was given at the launch. */
  tasks: readonly string[];
  /** The sub-agent places of the Run: `trama.maxParallelAgents` or its part. */
  seats: number;
  /** Whether the Run ended (its Tasks and its tail no longer count). */
  ended: boolean;
}

export interface RunEstimateInput {
  /** Every timing record Trama keeps, in file order. */
  records: readonly TimingRecord[];
  tasks: readonly EstimateTask[];
  runs: readonly EstimateRun[];
  /** `trama.parallelExecution` as read at the launch. */
  parallel: boolean;
  /** When the Run all was launched. */
  launchedAt: Date;
  now: Date;
}

/** The estimate in minutes, before the range is rounded. */
export interface RunEstimate {
  low: number;
  high: number;
}

const MS_PER_MINUTE = 60_000;

/** The holder a record belongs to: its terminal, or the legacy chat marker. */
const holderOf = (record: TimingRecord): string => record.terminal ?? record.chat ?? "";

/**
 * The average minutes of the Tasks finished `done` in the records, pairing `task-start` and `task-end` of the same holder
 * and Task as `timingJobs` does; only durations above `HISTORY_MIN_SECONDS` and only the holders that are not in
 * `excluded` (the Run all in progress) count. `DEFAULT_TASK_MINUTES` with fewer than `HISTORY_MIN_DURATIONS` of them.
 */
function averageTaskMinutes(records: readonly TimingRecord[], excluded: ReadonlySet<string>): number {
  const started = new Map<string, number>();
  const durations: number[] = [];
  for (const record of records) {
    const holder = holderOf(record);
    if (excluded.has(holder)) continue;
    if (record.event === "task-start") {
      started.set(`${holder}\n${record.task}`, Date.parse(record.at));
    } else if (record.event === "task-end") {
      const key = `${holder}\n${record.task}`;
      const start = started.get(key);
      started.delete(key);
      if (record.outcome !== "done" || start === undefined) continue;
      const seconds = (Date.parse(record.at) - start) / 1000;
      if (seconds > HISTORY_MIN_SECONDS) durations.push(seconds / 60);
    }
  }
  if (durations.length < HISTORY_MIN_DURATIONS) return DEFAULT_TASK_MINUTES;
  return durations.reduce((sum, minutes) => sum + minutes, 0) / durations.length;
}

/** The longest sum of weights along the waits, ignoring a wait that would close a cycle (depth-first visit). */
function longestChain(weights: ReadonlyMap<string, number>, choices: readonly (readonly string[])[]): number {
  const waits = new Map<string, Set<string>>();
  const reaches = (from: string, target: string, seen = new Set<string>()): boolean => {
    if (from === target) return true;
    if (seen.has(from)) return false;
    seen.add(from);
    for (const next of waits.get(from) ?? []) if (reaches(next, target, seen)) return true;
    return false;
  };
  for (const choice of choices) {
    const [first, ...others] = choice;
    if (first === undefined || !weights.has(first)) continue;
    for (const other of others) {
      if (other === first || !weights.has(other)) continue;
      // `first` waits for `other`; it closes a cycle when `other` already waits for `first`.
      if (reaches(other, first)) continue;
      const set = waits.get(first) ?? new Set<string>();
      set.add(other);
      waits.set(first, set);
    }
  }
  const memo = new Map<string, number>();
  const chain = (id: string): number => {
    const known = memo.get(id);
    if (known !== undefined) return known;
    let longest = 0;
    for (const dep of waits.get(id) ?? []) longest = Math.max(longest, chain(dep));
    const total = (weights.get(id) as number) + longest;
    memo.set(id, total);
    return total;
  };
  return Math.max(0, ...[...weights.keys()].map(chain));
}

/**
 * The time left of a Run all, or null while it is being worked out: with Parallel Execution, until a Run of the sequence has
 * recorded the first piece of its plan (a choice, a Task taken or a `queue`); without it, from the launch.
 */
export function estimateRunAll(input: RunEstimateInput): RunEstimate | null {
  const { records, runs, parallel, now } = input;
  const runTerminals = new Set(runs.flatMap((run) => (run.terminal === null ? [] : [run.terminal])));
  if (parallel && !records.some((record) => runTerminals.has(holderOf(record)) && (record.event === "choice" || record.event === "task-start" || record.event === "queue"))) return null;

  const average = averageTaskMinutes(records, runTerminals);
  const byId = new Map(input.tasks.map((task) => [task.id, task]));
  const weightOf = (task: EstimateTask): number => (task.fix ? FIX_TASK_MINUTES : average);

  /** The estimate of a Run in minutes: its Tasks plus start and tail. */
  const ofRun = (run: EstimateRun): number => {
    if (run.terminal === null) {
      const todo = run.tasks.flatMap((id) => {
        const task = byId.get(id);
        return task !== undefined && task.column === "todo" && !task.blocked ? [task] : [];
      });
      return START_MINUTES + todo.reduce((sum, task) => sum + weightOf(task), 0) + TAIL_MINUTES;
    }
    const own = records.filter((record) => record.terminal === run.terminal);
    const finished = new Set<string>();
    const startedAt = new Map<string, number>();
    let lastEnd: number | null = null;
    for (const record of own) {
      if (record.event === "task-start") startedAt.set(record.task, Date.parse(record.at));
      else if (record.event === "task-end") {
        finished.add(record.task);
        lastEnd = Math.max(lastEnd ?? 0, Date.parse(record.at));
      }
    }
    const weights = new Map<string, number>();
    const ids = new Set([...run.tasks, ...input.tasks.filter((task) => task.holder === run.terminal).map((task) => task.id)]);
    for (const id of ids) {
      const task = byId.get(id);
      if (task === undefined || finished.has(id)) continue;
      if (task.column === "todo" && !task.blocked) weights.set(id, weightOf(task));
      else if (task.column === "doing" && task.holder === run.terminal) {
        const since = startedAt.get(id);
        const elapsed = since === undefined ? 0 : (now.getTime() - since) / MS_PER_MINUTE;
        weights.set(id, Math.max(MIN_IN_PROGRESS_MINUTES, weightOf(task) - elapsed));
      }
    }
    if (weights.size === 0) {
      const since = lastEnd ?? input.launchedAt.getTime();
      return Math.max(MIN_TAIL_MINUTES, TAIL_MINUTES - (now.getTime() - since) / MS_PER_MINUTE);
    }
    const sum = [...weights.values()].reduce((total, weight) => total + weight, 0);
    let tasksTime = sum;
    if (parallel) {
      const choices = own.flatMap((record) => (record.event === "choice" && record.kind !== "release" ? [record.tasks.map((t) => t.id)] : []));
      tasksTime = Math.max(longestChain(weights, choices), sum / Math.max(1, run.seats));
    }
    const taken = startedAt.size > 0;
    return (taken ? 0 : START_MINUTES) + tasksTime + TAIL_MINUTES;
  };

  const pending = runs.filter((run) => !run.ended);
  let minutes: number;
  if (!parallel) {
    minutes = pending.reduce((sum, run) => sum + ofRun(run), 0);
  } else {
    const started = pending.filter((run) => run.terminal !== null).map(ofRun);
    const shortest = started.length === 0 ? 0 : Math.min(...started);
    minutes = Math.max(0, ...pending.map((run) => (run.terminal === null ? shortest + ofRun(run) : ofRun(run))));
  }
  return { low: minutes * LOW_FACTOR, high: minutes * HIGH_FACTOR };
}
