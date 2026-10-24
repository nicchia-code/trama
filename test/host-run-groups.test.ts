import { expect, test } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { driftWork, endHeldJob, endTerminalJobs, jobAbnormalEnd, localProjectJobs, startJob } from "../extension/src/host/drift-resolution";
import { type AppliedModel, planRuns, type PlanTask, type PlannedRun, runSequence, runSequenceTogether, type SeatedRun, shareSeats, startRuns } from "../extension/src/host/run-groups";

const pa: AppliedModel = { id: "pa000000", run: { model: "gpt-5" } };
const pb: AppliedModel = { id: "pb000000", run: { model: "gpt-6" } };

test("tasks on the role form one Run on the Settings model, with no filter when no Proposal applies", () => {
  const tasks: PlanTask[] = [{ id: "t1", proposal: null }, { id: "t2", proposal: null }];
  expect(planRuns(tasks, [], "  haiku  ")).toEqual([{ run: { model: "haiku" }, group: {}, tasks: ["t1", "t2"] }]);
});

test("the Settings group excludes the Proposals whose applying model differs from it, even with no runnable Task of theirs", () => {
  const tasks: PlanTask[] = [{ id: "t1", proposal: null }];
  expect(planRuns(tasks, [pa, pb], "haiku")).toEqual([
    { run: { model: "haiku" }, group: { exclude: ["pa000000", "pb000000"] }, tasks: ["t1"] },
  ]);
});

test("a Proposal's Tasks form their own Run, which includes the Proposals with that model, and groups come in the order of their oldest Task", () => {
  const tasks: PlanTask[] = [{ id: "t1", proposal: "pb000000" }, { id: "t2", proposal: null }, { id: "t3", proposal: "pa000000" }];
  expect(planRuns(tasks, [pa, pb], "haiku")).toEqual([
    { run: pb.run, group: { include: ["pb000000"], model: "gpt-6" }, tasks: ["t1"] },
    { run: { model: "haiku" }, group: { exclude: ["pa000000", "pb000000"] }, tasks: ["t2"] },
    { run: pa.run, group: { include: ["pa000000"], model: "gpt-5" }, tasks: ["t3"] },
  ]);
});

test("Proposals with the same model text share one Run, named by the first of their Tasks", () => {
  const other: AppliedModel = { id: "pc000000", run: { model: "gpt-5" } };
  const tasks: PlanTask[] = [{ id: "t1", proposal: "pc000000" }, { id: "t2", proposal: "pa000000" }];
  expect(planRuns(tasks, [pa, other], "haiku")).toEqual([
    { run: other.run, group: { include: ["pa000000", "pc000000"], model: "gpt-5" }, tasks: ["t1", "t2"] },
  ]);
});

test("a Proposal whose model equals the Settings model joins the Settings group when it shares it with a role Task, and is not excluded", () => {
  const same: AppliedModel = { id: "ps000000", run: { model: "haiku" } };
  const tasks: PlanTask[] = [{ id: "t1", proposal: null }, { id: "t2", proposal: "ps000000" }];
  expect(planRuns(tasks, [same, pb], "haiku")).toEqual([
    { run: { model: "haiku" }, group: { exclude: ["pb000000"] }, tasks: ["t1", "t2"] },
  ]);
});

test("an empty Settings model gives a Run with no model of its own", () => {
  expect(planRuns([{ id: "t1", proposal: null }], [], "   ")).toEqual([{ run: { model: "" }, group: {}, tasks: ["t1"] }]);
});

test("no Task gives no Run", () => {
  expect(planRuns([], [pa], "haiku")).toEqual([]);
});

/** A launch that records the Run it starts and keeps its end, so the test decides how each Run ends. */
function recorder() {
  const started: string[] = [];
  const ends = new Map<string, (abnormal?: string) => void>();
  const finished: (string | undefined)[] = [];
  const launch = async (run: PlannedRun, onEnd: (abnormal?: string) => void) => {
    const id = run.tasks[0] ?? "";
    started.push(id);
    ends.set(id, onEnd);
    return true;
  };
  return { started, ends, finished, launch, finish: (abnormal?: string) => void finished.push(abnormal) };
}

const run = (...tasks: string[]): PlannedRun => ({ run: { model: "m" }, group: {}, tasks });

test("a sequence starts each Run only from the normal end of the one before, and finishes after the last normal end", () => {
  const r = recorder();
  runSequence([run("a"), run("b"), run("c")], r.launch, r.finish);
  expect(r.started).toEqual(["a"]);
  r.ends.get("a")?.();
  expect(r.started).toEqual(["a", "b"]);
  r.ends.get("b")?.();
  expect(r.started).toEqual(["a", "b", "c"]);
  expect(r.finished).toEqual([]);
  r.ends.get("c")?.();
  expect(r.started).toEqual(["a", "b", "c"]);
  expect(r.finished).toEqual([undefined]);
});

test("an abnormal end stops the sequence at once, with its reason, and launches no further Run", () => {
  const r = recorder();
  runSequence([run("a"), run("b")], r.launch, r.finish);
  r.ends.get("a")?.("its command exited with code 1");
  expect(r.started).toEqual(["a"]);
  expect(r.finished).toEqual(["its command exited with code 1"]);
});
test("a Run that does not reach the agent stops the sequence, and launches no further Run", async () => {
  const started: string[] = [];
  const finished: (string | undefined)[] = [];
  const notStarted = Promise.resolve(false);
  runSequence([run("a"), run("b")], (planned) => {
    started.push(planned.tasks[0] ?? "");
    return notStarted;
  }, (abnormal) => void finished.push(abnormal));
  // The sequence reacts to the launch's answer first: awaiting the same promise here runs after that reaction.
  await notStarted;
  expect(started).toEqual(["a"]);
  expect(finished).toEqual(["its instruction did not reach the agent"]);
});

test("the places of the Runs that start together are shared in proportion to their Tasks, at least one each, and never above the limit", () => {
  expect(shareSeats([30, 10], 20)).toEqual([15, 5]);
  expect(shareSeats([1, 99], 20)).toEqual([1, 19]);
  expect(shareSeats([1, 1, 2], 4)).toEqual([1, 1, 2]);
  expect(shareSeats([1, 1, 98], 5)).toEqual([1, 1, 3]);
});

test("the places left over go to the largest remainders, and a tie goes to the earlier Run", () => {
  expect(shareSeats([2, 1], 5)).toEqual([3, 2]);
  expect(shareSeats([1, 1, 1], 10)).toEqual([4, 3, 3]);
});

test("with more Runs than places, the first ones start together with one place each and the rest wait", () => {
  const { now, waiting } = startRuns([run("a"), run("b"), run("c")], 2);
  expect(now.map((planned) => [planned.tasks[0], planned.seats])).toEqual([["a", 1], ["b", 1]]);
  expect(waiting.map((planned) => [planned.tasks[0], planned.seats])).toEqual([["c", 1]]);
});

/** A launch that records each Run it starts with its places, and keeps its end, so the test decides how each Run ends. */
function together() {
  const started: [string, number][] = [];
  const ends = new Map<string, (abnormal?: string) => void>();
  const finished: (string | undefined)[] = [];
  const launch = async (planned: SeatedRun, onEnd: (abnormal?: string) => void) => {
    const id = planned.tasks[0] ?? "";
    started.push([id, planned.seats]);
    ends.set(id, onEnd);
    return true;
  };
  return { started, ends, finished, launch, finish: (abnormal?: string) => void finished.push(abnormal) };
}

test("Runs that fit the limit start together with their shares, and the sequence finishes only after the last one ends", () => {
  const t = together();
  runSequenceTogether([run("a", "b"), run("c")], 3, t.launch, t.finish);
  expect(t.started).toEqual([["a", 2], ["c", 1]]);
  t.ends.get("a")?.();
  expect(t.finished).toEqual([]);
  t.ends.get("c")?.();
  expect(t.finished).toEqual([undefined]);
});

test("an abnormal end stops the Runs that have not started, and the Runs already working go on", () => {
  const t = together();
  runSequenceTogether([run("a"), run("b"), run("c")], 2, t.launch, t.finish);
  expect(t.started).toEqual([["a", 1], ["b", 1]]);
  t.ends.get("a")?.("its command exited with code 1");
  expect(t.started.length).toBe(2);
  expect(t.finished).toEqual([]);
  t.ends.get("b")?.();
  expect(t.finished).toEqual(["its command exited with code 1"]);
});

test("a normal end starts the next waiting Run with one place", () => {
  const t = together();
  runSequenceTogether([run("a"), run("b"), run("c")], 2, t.launch, t.finish);
  t.ends.get("a")?.();
  expect(t.started).toEqual([["a", 1], ["b", 1], ["c", 1]]);
  t.ends.get("b")?.();
  t.ends.get("c")?.();
  expect(t.finished).toEqual([undefined]);
});

test("a Run that does not reach the agent ends abnormally, and the Runs that did start go on", async () => {
  const ends = new Map<string, (abnormal?: string) => void>();
  const finished: (string | undefined)[] = [];
  const notStarted = Promise.resolve(false);
  runSequenceTogether([run("a"), run("b")], 4, (planned, onEnd) => {
    const id = planned.tasks[0] ?? "";
    ends.set(id, onEnd);
    return id === "a" ? notStarted : Promise.resolve(true);
  }, (abnormal) => void finished.push(abnormal));
  // The sequence reacts to the launch's answer first: awaiting the same promise here runs after that reaction.
  await notStarted;
  expect(finished).toEqual([]);
  ends.get("b")?.();
  expect(finished).toEqual(["its instruction did not reach the agent"]);
});

test("the held job of parallel Runs stays open until the last Run ends, and an abnormal end leaves the other Run working", () => {
  const project = join(tmpdir(), `trama-parallel-${crypto.randomUUID()}`);
  const ends = new Map<string, (abnormal?: string) => void>();
  startJob("run", project, { held: true }, "parallel-sequence");
  runSequenceTogether([run("a"), run("b")], 4, (planned, onEnd) => {
    const id = planned.tasks[0] ?? "";
    startJob("run", project, { terminal: id }, `${id}-run`);
    ends.set(id, (abnormal) => {
      endTerminalJobs(id, abnormal);
      onEnd(jobAbnormalEnd(project, `${id}-run`));
    });
    return Promise.resolve(true);
  }, (abnormal) => endHeldJob(project, "parallel-sequence", abnormal));
  expect(driftWork(project)).toEqual({ resolving: false, running: true });
  ends.get("a")?.("its terminal was closed");
  expect(localProjectJobs(project).map((job) => job.id)).toEqual(["parallel-sequence", "b-run"]);
  expect(driftWork(project).running).toBe(true);
  ends.get("b")?.();
  expect(driftWork(project)).toEqual({ resolving: false, running: false });
  expect(localProjectJobs(project)).toEqual([]);
  expect(jobAbnormalEnd(project, "parallel-sequence")).toBe("its terminal was closed");
});

test("when the minimum of one place per Run pushes the shares above the limit, the largest give up places until they fit", () => {
  expect(shareSeats([97, 1, 1], 4)).toEqual([2, 1, 1]);
});
