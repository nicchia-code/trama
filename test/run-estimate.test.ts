import { describe, expect, test } from "bun:test";
import {
  DEFAULT_TASK_MINUTES,
  estimateRunAll,
  MAX_PROGRESS,
  runAllProgress,
  FIX_TASK_MINUTES,
  HIGH_FACTOR,
  LOW_FACTOR,
  MIN_TAIL_MINUTES,
  START_MINUTES,
  TAIL_MINUTES,
  type EstimateRun,
  type EstimateTask,
  type RunEstimateInput,
} from "../src/core/run-estimate";
import type { TimingRecord } from "../src/core/timings";

const LAUNCH = Date.UTC(2030, 0, 1, 12, 0, 0);
/** The instant `minute` minutes after the launch. */
const at = (minute: number) => new Date(LAUNCH + minute * 60_000);

const task = (id: string, over: Partial<EstimateTask> = {}): EstimateTask => ({ id, column: "todo", blocked: false, fix: false, holder: null, ...over });
const run = (tasks: string[], over: Partial<EstimateRun> = {}): EstimateRun => ({ terminal: "run1", tasks, seats: 1, ended: false, ...over });

const start = (terminal: string, id: string, minute: number): TimingRecord => ({ event: "task-start", task: id, title: id, at: at(minute).toISOString(), terminal });
const end = (terminal: string, id: string, minute: number, outcome: "done" | "unchanged" | "drift" = "done"): TimingRecord => ({ event: "task-end", task: id, title: id, outcome, at: at(minute).toISOString(), terminal });
const choice = (terminal: string, kind: "order" | "conflict" | "release", ids: string[], minute = 0): TimingRecord => ({ event: "choice", kind, tasks: ids.map((id) => ({ id, title: id })), reason: "because", at: at(minute).toISOString(), terminal });
const queue = (terminal: string, minute = 0): TimingRecord => ({ event: "queue", requested: 2, given: 1, remaining: 3, at: at(minute).toISOString(), terminal });

/** `count` finished `done` Tasks of `minutes` each in a terminal other than the Run all's, one after the other. */
function history(count: number, minutes: number, terminal = "old"): TimingRecord[] {
  return Array.from({ length: count }, (_, i) => [start(terminal, `h${i}`, -1000 + i * 100), end(terminal, `h${i}`, -1000 + i * 100 + minutes)]).flat();
}

/** An estimate in minutes: the middle of the range is the estimate times the mean of the two factors. */
function minutes(input: Partial<RunEstimateInput> & Pick<RunEstimateInput, "runs" | "tasks">): number | null {
  const result = estimateRunAll({ records: [], parallel: false, launchedAt: at(0), now: at(0), ...input });
  if (result === null) return null;
  expect(result.low).toBeCloseTo(result.high * (LOW_FACTOR / HIGH_FACTOR), 9);
  return result.high / HIGH_FACTOR;
}

describe("task weights", () => {
  test("a correction Task weighs one minute, another Task nine without history", () => {
    expect(minutes({ runs: [run(["a"])], tasks: [task("a", { fix: true })] })).toBeCloseTo(START_MINUTES + FIX_TASK_MINUTES + TAIL_MINUTES, 9);
    expect(minutes({ runs: [run(["a"])], tasks: [task("a")] })).toBeCloseTo(START_MINUTES + DEFAULT_TASK_MINUTES + TAIL_MINUTES, 9);
  });

  test("the average of ten durations replaces the default; fewer than ten do not", () => {
    const base = { runs: [run(["a"])], tasks: [task("a")] };
    expect(minutes({ ...base, records: history(9, 4) })).toBeCloseTo(START_MINUTES + DEFAULT_TASK_MINUTES + TAIL_MINUTES, 9);
    expect(minutes({ ...base, records: history(10, 4) })).toBeCloseTo(START_MINUTES + 4 + TAIL_MINUTES, 9);
  });

  test("durations of 30 seconds or less, and Tasks not finished done, are left out", () => {
    const short = Array.from({ length: 10 }, (_, i) => [start("old", `s${i}`, -500 + i), end("old", `s${i}`, -500 + i + 0.5)]).flat();
    const unfinished = Array.from({ length: 10 }, (_, i) => [start("old2", `u${i}`, -300 + i * 20), end("old2", `u${i}`, -300 + i * 20 + 5, "unchanged")]).flat();
    const base = { runs: [run(["a"])], tasks: [task("a")] };
    expect(minutes({ ...base, records: [...short, ...unfinished, ...history(9, 4)] })).toBeCloseTo(START_MINUTES + DEFAULT_TASK_MINUTES + TAIL_MINUTES, 9);
    // The tenth usable duration makes the average: the short ones never count.
    expect(minutes({ ...base, records: [...short, ...unfinished, ...history(10, 4)] })).toBeCloseTo(START_MINUTES + 4 + TAIL_MINUTES, 9);
  });

  test("the Run all in progress does not weigh: its own terminals' durations are excluded", () => {
    const own = Array.from({ length: 10 }, (_, i) => [start("run1", `o${i}`, i * 10), end("run1", `o${i}`, i * 10 + 2)]).flat();
    const result = minutes({ runs: [run(["a"])], tasks: [task("a")], records: [...own, ...history(10, 4)], now: at(100) });
    expect(result).toBeCloseTo(4 + TAIL_MINUTES, 9);
    const onlyOwn = minutes({ runs: [run(["a"])], tasks: [task("a")], records: own, now: at(100) });
    expect(onlyOwn).toBeCloseTo(DEFAULT_TASK_MINUTES + TAIL_MINUTES, 9);
  });

  test("a Task in progress weighs its weight less the time since the Run took it, never under one minute", () => {
    const tasks = [task("a", { column: "doing", holder: "run1" })];
    const records = [start("run1", "a", 0)];
    expect(minutes({ runs: [run([])], tasks, records, now: at(4) })).toBeCloseTo(DEFAULT_TASK_MINUTES - 4 + TAIL_MINUTES, 9);
    expect(minutes({ runs: [run([])], tasks, records, now: at(60) })).toBeCloseTo(1 + TAIL_MINUTES, 9);
  });

  test("blocked Tasks, Tasks of other holders and Tasks the Run finished do not count", () => {
    const tasks = [task("a"), task("b", { blocked: true }), task("c", { column: "doing", holder: "other" }), task("d"), task("e", { column: "done" })];
    const records = [start("run1", "d", 0), end("run1", "d", 1)];
    expect(minutes({ runs: [run(["a", "b", "c", "d", "e"])], tasks, records, now: at(1) })).toBeCloseTo(DEFAULT_TASK_MINUTES + TAIL_MINUTES, 9);
  });
});

describe("start and tail", () => {
  test("a Run that took nothing yet adds the start; one that took a Task does not", () => {
    const tasks = [task("a"), task("b")];
    expect(minutes({ runs: [run(["a", "b"])], tasks })).toBeCloseTo(START_MINUTES + 2 * DEFAULT_TASK_MINUTES + TAIL_MINUTES, 9);
    expect(minutes({ runs: [run(["a", "b"])], tasks: [task("a", { column: "doing", holder: "run1" }), task("b")], records: [start("run1", "a", 0)] })).toBeCloseTo(2 * DEFAULT_TASK_MINUTES + TAIL_MINUTES, 9);
  });

  test("with no Task left only the tail remains, shrinking from the last end of a Task down to its floor", () => {
    const tasks = [task("a", { column: "done" })];
    const records = [start("run1", "a", 0), end("run1", "a", 10)];
    expect(minutes({ runs: [run(["a"])], tasks, records, now: at(10) })).toBeCloseTo(TAIL_MINUTES, 9);
    expect(minutes({ runs: [run(["a"])], tasks, records, now: at(11) })).toBeCloseTo(TAIL_MINUTES - 1, 9);
    expect(minutes({ runs: [run(["a"])], tasks, records, now: at(30) })).toBeCloseTo(MIN_TAIL_MINUTES, 9);
  });

  test("a Run not started is worth the start, the sum of its weights and the tail", () => {
    const tasks = [task("a"), task("b", { fix: true })];
    expect(minutes({ runs: [run(["a", "b"], { terminal: null })], tasks })).toBeCloseTo(START_MINUTES + DEFAULT_TASK_MINUTES + FIX_TASK_MINUTES + TAIL_MINUTES, 9);
  });
});

describe("parallel execution", () => {
  const plan = (...more: TimingRecord[]): TimingRecord[] => [queue("run1"), ...more];
  const tasks = [task("a"), task("b"), task("c"), task("d")];
  const parallel = (records: TimingRecord[], seats: number, only = ["a", "b", "c", "d"]) => minutes({ runs: [run(only, { seats })], tasks, records: [...history(10, 6), ...records], parallel: true });

  test("an order chain waits one Task after the other; the longest chain limits when the places allow", () => {
    const records = plan(choice("run1", "order", ["b", "a"]), choice("run1", "order", ["c", "b"]));
    // Chain c → b → a is three Tasks of six minutes; four places would give 6 minutes for four Tasks.
    expect(parallel(records, 4)).toBeCloseTo(START_MINUTES + 18 + TAIL_MINUTES, 9);
  });

  test("a conflict makes the first Task wait for the others of the choice", () => {
    const records = plan(choice("run1", "conflict", ["a", "b", "c"]));
    expect(parallel(records, 4)).toBeCloseTo(START_MINUTES + 12 + TAIL_MINUTES, 9);
  });

  test("a wait that would close a cycle is discarded", () => {
    const records = plan(choice("run1", "order", ["b", "a"]), choice("run1", "order", ["a", "b"]));
    expect(parallel(records, 4)).toBeCloseTo(START_MINUTES + 12 + TAIL_MINUTES, 9);
  });

  test("the places limit when the sum over them is the larger", () => {
    const records = plan(choice("run1", "order", ["b", "a"]));
    // Four Tasks of six minutes over one place: 24; the chain is only 12.
    expect(parallel(records, 1)).toBeCloseTo(START_MINUTES + 24 + TAIL_MINUTES, 9);
    expect(parallel(records, 2)).toBeCloseTo(START_MINUTES + 12 + TAIL_MINUTES, 9);
  });

  test("a choice naming a Task that is not the Run's ignores that Task, and one that starts together waits for nothing", () => {
    const records = plan(choice("run1", "order", ["a", "zzz"]), choice("run1", "order", ["zzz", "b"]), choice("run1", "release", ["c", "d"]));
    expect(parallel(records, 4)).toBeCloseTo(START_MINUTES + 6 + TAIL_MINUTES, 9);
  });
});

describe("the sequence", () => {
  const tasks = [task("a"), task("b"), task("c")];
  const first = run(["a"], { terminal: "run1" });
  const second = run(["b", "c"], { terminal: "run2" });
  const waiting = run(["c"], { terminal: null });

  test("Runs one after the other add up", () => {
    const single = minutes({ runs: [first], tasks });
    const both = minutes({ runs: [first, second], tasks });
    const secondAlone = minutes({ runs: [second], tasks });
    expect(both).toBeCloseTo((single as number) + (secondAlone as number), 9);
  });

  test("an ended Run adds nothing", () => {
    expect(minutes({ runs: [run(["a"], { ended: true }), second], tasks })).toBeCloseTo(minutes({ runs: [second], tasks }) as number, 9);
  });

  test("Runs together take the longest, and a Run waiting for a place adds its own to the shortest started Run", () => {
    const records = [queue("run1"), queue("run2")];
    const together = minutes({ runs: [first, second], tasks, records, parallel: true });
    expect(together).toBeCloseTo(Math.max(minutes({ runs: [first], tasks, records, parallel: true }) as number, minutes({ runs: [second], tasks, records, parallel: true }) as number), 9);
    const shortest = minutes({ runs: [first], tasks, records, parallel: true }) as number;
    const own = START_MINUTES + DEFAULT_TASK_MINUTES + TAIL_MINUTES;
    expect(minutes({ runs: [first, waiting], tasks, records, parallel: true })).toBeCloseTo(Math.max(shortest, shortest + own), 9);
  });
});

describe("while the estimate is being worked out", () => {
  const tasks = [task("a")];

  test("with Parallel Execution it is null until a Run records a choice, a Task taken or a queue", () => {
    expect(estimateRunAll({ records: [], tasks, runs: [run(["a"])], parallel: true, launchedAt: at(0), now: at(1) })).toBeNull();
    expect(estimateRunAll({ records: [end("other", "z", 0)], tasks, runs: [run(["a"])], parallel: true, launchedAt: at(0), now: at(1) })).toBeNull();
    expect(estimateRunAll({ records: [queue("other")], tasks, runs: [run(["a"])], parallel: true, launchedAt: at(0), now: at(1) })).toBeNull();
    for (const record of [queue("run1"), choice("run1", "order", ["a"]), start("run1", "a", 0)]) {
      expect(estimateRunAll({ records: [record], tasks, runs: [run(["a"])], parallel: true, launchedAt: at(0), now: at(1) })).not.toBeNull();
    }
  });

  test("without Parallel Execution it exists from the launch, even before any Run started", () => {
    expect(estimateRunAll({ records: [], tasks, runs: [run(["a"], { terminal: null })], parallel: false, launchedAt: at(0), now: at(0) })).not.toBeNull();
  });
});

describe("the central estimate", () => {
  test("is returned with the range, which is the estimate times the factors", () => {
    const result = estimateRunAll({ records: [], tasks: [task("a")], runs: [run(["a"], { terminal: null })], parallel: false, launchedAt: at(0), now: at(0) });
    if (result === null) throw new Error("expected an estimate");
    expect(result.estimate).toBeCloseTo(START_MINUTES + DEFAULT_TASK_MINUTES + TAIL_MINUTES, 9);
    expect(result.low).toBeCloseTo(result.estimate * LOW_FACTOR, 9);
    expect(result.high).toBeCloseTo(result.estimate * HIGH_FACTOR, 9);
  });
});

describe("progress of a Run all", () => {
  test("is the elapsed time over the elapsed time plus the central estimate", () => {
    expect(runAllProgress({ elapsedMinutes: 10, estimate: 30, reached: 0, over: false })).toBeCloseTo(0.25, 9);
    expect(runAllProgress({ elapsedMinutes: 0, estimate: 30, reached: 0, over: false })).toBe(0);
    expect(runAllProgress({ elapsedMinutes: 0, estimate: 0, reached: 0, over: false })).toBe(0);
  });

  test("does not go back when the estimate grows: the highest reached stays until the new calculation passes it", () => {
    const first = runAllProgress({ elapsedMinutes: 20, estimate: 20, reached: 0, over: false });
    expect(first).toBeCloseTo(0.5, 9);
    // The estimate grows to 60 minutes: the calculation gives 0.25, the progress stays at 0.5.
    expect(runAllProgress({ elapsedMinutes: 20, estimate: 60, reached: first, over: false })).toBe(first);
    // Later the calculation passes it.
    expect(runAllProgress({ elapsedMinutes: 60, estimate: 20, reached: first, over: false })).toBeCloseTo(0.75, 9);
  });

  test("never exceeds 0.95 before the Run all ends", () => {
    expect(MAX_PROGRESS).toBe(0.95);
    expect(runAllProgress({ elapsedMinutes: 1000, estimate: 0.5, reached: 0, over: false })).toBe(MAX_PROGRESS);
    expect(runAllProgress({ elapsedMinutes: 1, estimate: 1, reached: 0.99, over: false })).toBe(MAX_PROGRESS);
  });

  test("is 0.95 beyond the estimate, whatever the recomputed estimate says", () => {
    expect(runAllProgress({ elapsedMinutes: 5, estimate: 500, reached: 0.1, over: true })).toBe(MAX_PROGRESS);
    expect(runAllProgress({ elapsedMinutes: 5, estimate: 0, reached: 0, over: true })).toBe(MAX_PROGRESS);
  });
});
