import { expect, test } from "bun:test";
import { type AppliedModel, planRuns, type PlanTask, type PlannedRun, runSequence } from "../extension/src/host/run-groups";

const pa: AppliedModel = { id: "pa000000", run: { model: "gpt-5", from: "Proposal P1" } };
const pb: AppliedModel = { id: "pb000000", run: { model: "gpt-6", from: "Proposal P2" } };

test("tasks on the role form one Run on the Settings model, with no filter when no Proposal applies", () => {
  const tasks: PlanTask[] = [{ id: "t1", proposal: null }, { id: "t2", proposal: null }];
  expect(planRuns(tasks, [], "  haiku  ")).toEqual([{ run: { model: "haiku", from: "trama.execution" }, group: {}, tasks: ["t1", "t2"] }]);
});

test("the Settings group excludes the Proposals whose applying model differs from it, even with no runnable Task of theirs", () => {
  const tasks: PlanTask[] = [{ id: "t1", proposal: null }];
  expect(planRuns(tasks, [pa, pb], "haiku")).toEqual([
    { run: { model: "haiku", from: "trama.execution" }, group: { exclude: ["pa000000", "pb000000"] }, tasks: ["t1"] },
  ]);
});

test("a Proposal's Tasks form their own Run, which includes the Proposals with that model, and groups come in the order of their oldest Task", () => {
  const tasks: PlanTask[] = [{ id: "t1", proposal: "pb000000" }, { id: "t2", proposal: null }, { id: "t3", proposal: "pa000000" }];
  expect(planRuns(tasks, [pa, pb], "haiku")).toEqual([
    { run: pb.run, group: { include: ["pb000000"], model: "gpt-6" }, tasks: ["t1"] },
    { run: { model: "haiku", from: "trama.execution" }, group: { exclude: ["pa000000", "pb000000"] }, tasks: ["t2"] },
    { run: pa.run, group: { include: ["pa000000"], model: "gpt-5" }, tasks: ["t3"] },
  ]);
});

test("Proposals with the same model text share one Run, named by the first of their Tasks", () => {
  const other: AppliedModel = { id: "pc000000", run: { model: "gpt-5", from: "Proposal P3" } };
  const tasks: PlanTask[] = [{ id: "t1", proposal: "pc000000" }, { id: "t2", proposal: "pa000000" }];
  expect(planRuns(tasks, [pa, other], "haiku")).toEqual([
    { run: other.run, group: { include: ["pa000000", "pc000000"], model: "gpt-5" }, tasks: ["t1", "t2"] },
  ]);
});

test("a Proposal whose model equals the Settings model joins the Settings group when it shares it with a role Task, and is not excluded", () => {
  const same: AppliedModel = { id: "ps000000", run: { model: "haiku", from: "Proposal P4" } };
  const tasks: PlanTask[] = [{ id: "t1", proposal: null }, { id: "t2", proposal: "ps000000" }];
  expect(planRuns(tasks, [same, pb], "haiku")).toEqual([
    { run: { model: "haiku", from: "trama.execution" }, group: { exclude: ["pb000000"] }, tasks: ["t1", "t2"] },
  ]);
});

test("an empty Settings model gives a Run with no model of its own", () => {
  expect(planRuns([{ id: "t1", proposal: null }], [], "   ")).toEqual([{ run: { model: "", from: "trama.execution" }, group: {}, tasks: ["t1"] }]);
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

const run = (...tasks: string[]): PlannedRun => ({ run: { model: "m", from: "trama.execution" }, group: {}, tasks });

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
