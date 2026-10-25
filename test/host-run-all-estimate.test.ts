import { afterEach, beforeEach, expect, test } from "bun:test";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { endHeldJob, localProjectJobs, startJob, type RunAll } from "../extension/src/host/drift-resolution";
import { runAllEstimate } from "../extension/src/host/run-all-estimate";
import type { RunEstimateView } from "../extension/src/protocol";
import { type Project, projectAt } from "../src/core/store";
import { recordTiming, type TimingEvent } from "../src/core/timings";
import { newTask } from "../src/core/work";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-run-all-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => {
  // Jobs live in module state shared with the other test files: none may outlive its test.
  for (const job of localProjectJobs(dir)) endHeldJob(dir, job.id);
  rmSync(dir, { recursive: true, force: true });
});

const LAUNCH = Date.UTC(2030, 0, 1, 12, 0, 0);
const after = (minutes: number) => new Date(LAUNCH + minutes * 60_000);

/** A Run all launched at `LAUNCH` with one group holding `tasks`, whose Run has the terminal `run1` when `terminal` is set. */
function launch(tasks: string[], parallel: boolean, terminal: string | null = null): RunAll {
  const runAll: RunAll = { launchedAt: LAUNCH, parallel, groups: [{ jobId: "g1", tasks, seats: 2, terminal, ended: false }], reference: null, plan: null, progress: 0 };
  startJob("run", dir, { held: true }, "run-all-job", [], runAll);
  return runAll;
}

/** Records `event` for the terminal `run1` `minutes` after the launch (before it with a negative number). */
const record = (event: TimingEvent, minutes: number, terminal = "run1") => recordTiming(p, { terminal }, event, {}, after(minutes));
const taskStart = (id: string, minutes: number) => record({ event: "task-start", task: id, title: id }, minutes);
const taskEnd = (id: string, minutes: number) => record({ event: "task-end", task: id, title: id, outcome: "done" }, minutes);
const order = (ids: string[], minutes: number) => record({ event: "choice", kind: "order", tasks: ids.map((id) => ({ id, title: id })), reason: "because" }, minutes);
const queue = (minutes: number) => record({ event: "queue", requested: 2, given: 2, remaining: 4 }, minutes);

const todo = (title: string) => newTask(p, { title, refs: ["order"], technical: false }).id;

function estimateAt(minutes: number): Extract<RunEstimateView, { low: number }> {
  const result = runAllEstimate(p, after(minutes));
  if (result === null || "estimating" in result) throw new Error("expected an estimate");
  return result;
}

test("no estimate without a Run all of this window", () => {
  todo("a");
  expect(runAllEstimate(p, after(0))).toBeNull();
});

test("with Parallel Execution the Board is told it is estimating until the Run records its plan", () => {
  const id = todo("a");
  launch([id], true, "run1");
  expect(runAllEstimate(p, after(0))).toEqual({ estimating: true });
});

test("records of a reused terminal made before the launch do not start the Run", () => {
  const id = todo("a");
  launch([id], true, "run1");
  queue(-30);
  taskStart(id, -20);
  expect(runAllEstimate(p, after(1))).toEqual({ estimating: true });
});

test("there is no reference and the Run all is never longer than expected before a Run takes its first Task, with `queue` and choices recorded", () => {
  const [a, b] = [todo("a"), todo("b")] as [string, string];
  const runAll = launch([a, b], true, "run1");
  queue(0.3);
  order([a, b], 0.6);
  const early = estimateAt(1);
  expect(early.over).toBe(false);
  expect(runAll.reference).toBeNull();
  expect(estimateAt(10_000)).toMatchObject({ over: false });
  expect(runAll.reference).toBeNull();
  expect(runAll.plan).toBeNull();
});

test("without Parallel Execution a Run all not yet started is never longer than expected either", () => {
  const id = todo("a");
  const runAll = launch([id], false);
  expect(estimateAt(0)).toMatchObject({ over: false });
  expect(estimateAt(10_000)).toMatchObject({ over: false });
  expect(runAll.reference).toBeNull();
});

test("the reference is made at the first Task taken, counted from the launch, and the Run all is over once the time passes it", () => {
  const [a, b] = [todo("a"), todo("b")] as [string, string];
  const runAll = launch([a, b], true, "run1");
  queue(0.3);
  order([a, b], 0.6);
  taskStart(a, 2);
  const first = estimateAt(2);
  expect(first.over).toBe(false);
  expect(first.low).toBeLessThan(first.high);
  expect(runAll.reference).toBeCloseTo((2 + first.high) * 60_000, 3);
  expect(runAll.plan?.taken).toBe(true);
  expect(estimateAt(2 + first.high - 0.01)).toMatchObject({ over: false });
  expect(estimateAt(2 + first.high + 0.01)).toMatchObject({ over: true });
  // It is worked out at each call: nothing keeps the state on.
  expect(runAll.reference).toBeCloseTo((2 + first.high) * 60_000, 3);
  expect(estimateAt(2 + first.high - 0.01)).toMatchObject({ over: false });
});

test("the reference is made again by a new order choice and by a Task new to the Run all, and the time, the end of a Task and a Task leaving leave it as it is", () => {
  const [a, b, c] = [todo("a"), todo("b"), todo("c")] as [string, string, string];
  const runAll = launch([a, b, c], true, "run1");
  taskStart(a, 1);
  estimateAt(1);
  const reference = runAll.reference as number;
  expect(reference).toBeGreaterThan(0);
  // The mere passing of time, and a recomputation of the estimate without a change of the plan.
  estimateAt(3);
  estimateAt(4);
  expect(runAll.reference).toBe(reference);
  // The end of a Task.
  taskEnd(a, 5);
  estimateAt(5);
  expect(runAll.reference).toBe(reference);
  // A Task that leaves the Run.
  (runAll.groups[0] as RunAll["groups"][number]).tasks = [a, b];
  estimateAt(6);
  expect(runAll.reference).toBe(reference);
  // A new choice remakes it.
  order([b, c], 7);
  const withChoice = estimateAt(7);
  expect(runAll.reference).toBeCloseTo((7 + withChoice.high) * 60_000, 3);
  const afterChoice = runAll.reference as number;
  expect(runAll.plan?.choices).toHaveLength(1);
  // The same choice seen again changes nothing.
  estimateAt(8);
  expect(runAll.reference).toBe(afterChoice);
  // A Task born during the run remakes it, and the plan keeps the union: `c` leaving and returning is not new.
  const fix = todo("fix");
  (runAll.groups[0] as RunAll["groups"][number]).tasks = [a, b, c, fix];
  const withTask = estimateAt(9);
  expect(runAll.reference).toBeCloseTo((9 + withTask.high) * 60_000, 3);
  expect(runAll.plan?.tasks).toEqual(expect.arrayContaining([a, b, c, fix]));
  const afterTask = runAll.reference as number;
  (runAll.groups[0] as RunAll["groups"][number]).tasks = [b];
  estimateAt(10);
  (runAll.groups[0] as RunAll["groups"][number]).tasks = [a, b, c, fix];
  estimateAt(11);
  expect(runAll.reference).toBe(afterTask);
});

test("a Run all stops being longer than expected after a change of the plan, and its progress goes back under 0.95 but not under the highest reached outside that state", () => {
  const [a, b] = [todo("a"), todo("b")] as [string, string];
  const runAll = launch([a], true, "run1");
  taskStart(a, 0);
  const first = estimateAt(0);
  const limit = first.high;
  const reached = estimateAt(limit / 2);
  expect(reached.over).toBe(false);
  expect(reached.done).toBeGreaterThan(0);
  expect(runAll.progress).toBe(reached.done);
  // Past the reference: over, 0.95, and the stored progress is not raised by it.
  const over = estimateAt(limit + 1);
  expect(over).toMatchObject({ over: true, done: 0.95 });
  expect(runAll.progress).toBe(reached.done);
  // A new choice moves the reference beyond the time passed: the Run all is not over any more.
  (runAll.groups[0] as RunAll["groups"][number]).tasks = [a, b];
  order([a, b], limit + 1);
  const back = estimateAt(limit + 1);
  expect(back.over).toBe(false);
  expect(back.done).toBeLessThan(0.95);
  expect(back.done).toBeGreaterThanOrEqual(reached.done);
  expect(runAll.progress).toBe(back.done);
});

test("the progress is made again with the estimate and the highest one reached is kept in the job", () => {
  const id = todo("a");
  const runAll = launch([id], false, "run1");
  expect(estimateAt(0).done).toBe(0);
  const later = estimateAt(5);
  expect(later.done).toBeGreaterThan(0);
  expect(later.done).toBeLessThan(0.95);
  expect(runAll.progress).toBe(later.done);
  // Another Task joins: the estimate grows, the progress does not go back.
  const other = todo("b");
  (runAll.groups[0] as RunAll["groups"][number]).tasks = [id, other];
  const grown = estimateAt(5);
  expect(grown.high).toBeGreaterThan(later.high);
  expect(grown.done).toBe(later.done);
});

test("a repeated Run all in parallel with an order chain recorded about 20 seconds after the first queue is not longer than expected while it ends within the limit of its first Task", () => {
  const ids = ["a", "b", "c", "d"].map(todo) as [string, string, string, string];
  const runAll = launch(ids, true, "run1");
  queue(0);
  // Seen at the queue alone, the estimate is one Task plus the tail: 12 minutes of work, a limit well under the real time.
  order([ids[0], ids[1]], 20 / 60);
  order([ids[1], ids[2]], 20 / 60);
  order([ids[2], ids[3]], 20 / 60);
  taskStart(ids[0], 40 / 60);
  const first = estimateAt(40 / 60);
  expect(first.over).toBe(false);
  // The chain is four Tasks long: the limit from the first Task covers it.
  const reference = runAll.reference as number;
  expect(reference).toBeGreaterThan((40 / 60 + 4 * 9) * 60_000);
  expect(estimateAt(40 / 60 + 4 * 9 + 2.5)).toMatchObject({ over: false });
});
