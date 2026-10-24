import { afterEach, beforeEach, expect, test } from "bun:test";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { endHeldJob, localProjectJobs, startJob, type RunAll } from "../extension/src/host/drift-resolution";
import { runAllEstimate } from "../extension/src/host/run-all-estimate";
import { type Project, projectAt } from "../src/core/store";
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

/** A Run all launched at `LAUNCH` with one group holding `tasks`. */
function launch(tasks: string[], parallel: boolean): RunAll {
  const runAll: RunAll = { launchedAt: LAUNCH, parallel, groups: [{ jobId: "g1", tasks, seats: 1, terminal: null, ended: false }], high: null, progress: 0 };
  startJob("run", dir, { held: true }, "run-all-job", [], runAll);
  return runAll;
}

test("no estimate without a Run all of this window", () => {
  newTask(p, { title: "a", refs: ["order"], technical: false });
  expect(runAllEstimate(p, after(0))).toBeNull();
});

test("with Parallel Execution the Board is told it is estimating until the Run records its plan", () => {
  const id = newTask(p, { title: "a", refs: ["order"], technical: false }).id;
  launch([id], true);
  expect(runAllEstimate(p, after(0))).toEqual({ estimating: true });
});

test("the first estimate's high limit is kept, and the Run all is over once the time since the launch passes it, for good", () => {
  const id = newTask(p, { title: "a", refs: ["order"], technical: false }).id;
  const runAll = launch([id], false);
  const first = runAllEstimate(p, after(0));
  if (first === null || "estimating" in first) throw new Error("expected an estimate");
  expect(first.over).toBe(false);
  expect(first.low).toBeLessThan(first.high);
  expect(runAll.high).toBe(first.high);
  // Just inside the limit: not over; just past it: over, and over stays while the estimate is made again.
  const inside = runAllEstimate(p, after(first.high - 0.01));
  expect(inside).toMatchObject({ over: false });
  const past = runAllEstimate(p, after(first.high + 0.01));
  expect(past).toMatchObject({ over: true });
  expect(runAll.high).toBe(first.high);
  expect(runAllEstimate(p, after(first.high + 100))).toMatchObject({ over: true });
});

test("the progress is made again with the estimate, the highest one reached is kept in the job, and it is 0.95 once over", () => {
  const id = newTask(p, { title: "a", refs: ["order"], technical: false }).id;
  const runAll = launch([id], false);
  const first = runAllEstimate(p, after(0));
  if (first === null || "estimating" in first) throw new Error("expected an estimate");
  expect(first.done).toBe(0);
  const later = runAllEstimate(p, after(5));
  if (later === null || "estimating" in later) throw new Error("expected an estimate");
  expect(later.done).toBeGreaterThan(0);
  expect(later.done).toBeLessThan(0.95);
  expect(runAll.progress).toBe(later.done);
  // Another Task joins: the estimate grows, the progress does not go back.
  const other = newTask(p, { title: "b", refs: ["order"], technical: false }).id;
  runAll.groups[0] = { ...(runAll.groups[0] as RunAll["groups"][number]), tasks: [id, other] };
  const grown = runAllEstimate(p, after(5));
  if (grown === null || "estimating" in grown) throw new Error("expected an estimate");
  expect(grown.high).toBeGreaterThan(later.high);
  expect(grown.done).toBe(later.done);
  expect(runAllEstimate(p, after(first.high + 1))).toMatchObject({ over: true, done: 0.95 });
});
