import { afterEach, expect, test } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  driftWork,
  endHeldJob,
  endTerminalJobs,
  endUnsentJob,
  jobAbnormalEnd,
  localProjectJobs,
  receiveNotice,
  startJob,
} from "../extension/src/host/drift-resolution";

const roots: string[] = [];
const root = () => {
  const value = join(tmpdir(), `trama-job-${crypto.randomUUID()}`);
  roots.push(value);
  return value;
};
afterEach(() => {
  for (const value of roots.splice(0)) {
    // Jobs live in module state shared with the other test files: none may outlive its test.
    for (const job of localProjectJobs(value)) endUnsentJob(value, job.id);
  }
});

test("an abnormal terminal end keeps its reason; a normal end keeps none", () => {
  const project = root();
  startJob("run", project, { terminal: "terminal" }, "abnormal-run");
  endTerminalJobs("terminal", "its terminal was closed");
  expect(jobAbnormalEnd(project, "abnormal-run")).toBe("its terminal was closed");
  startJob("run", project, { terminal: "terminal-2" }, "clean-run");
  endTerminalJobs("terminal-2");
  expect(jobAbnormalEnd(project, "clean-run")).toBeUndefined();
});

test("a job whose send was not made ends at once, without an abnormal outcome", () => {
  const project = root();
  startJob("run", project, { terminal: "unsent-terminal" }, "unsent-job");
  expect(localProjectJobs(project).some((job) => job.id === "unsent-job")).toBe(true);
  endUnsentJob(project, "unsent-job");
  expect(localProjectJobs(project).some((job) => job.id === "unsent-job")).toBe(false);
  expect(jobAbnormalEnd(project, "unsent-job")).toBeUndefined();
});

test("a window sees only the jobs it started: job notices of other windows change nothing", () => {
  const project = root();
  receiveNotice({ type: "job", id: "other-run", root: project, kind: "run", active: true, place: { terminal: "terminal" }, holder: "other" });
  expect(localProjectJobs(project)).toEqual([]);
  expect(driftWork(project)).toEqual({ resolving: false, running: false });
  startJob("run", project, { terminal: "own-terminal" }, "own-run");
  expect(localProjectJobs(project).some((job) => job.kind === "run")).toBe(true);
  endTerminalJobs("own-terminal");
  expect(localProjectJobs(project).some((job) => job.kind === "run")).toBe(false);
});

test("a sequence of Runs stays one active Run between two of its Runs and ends with its last one", () => {
  const project = root();
  startJob("run", project, { held: true }, "sequence-job");
  startJob("run", project, { terminal: "group-1" }, "group-1-run");
  endTerminalJobs("group-1");
  expect(localProjectJobs(project).map((job) => job.id)).toEqual(["sequence-job"]);
  expect(driftWork(project)).toEqual({ resolving: false, running: true });
  startJob("run", project, { terminal: "group-2" }, "group-2-run");
  endTerminalJobs("group-2");
  expect(driftWork(project)).toEqual({ resolving: false, running: true });
  endHeldJob(project, "sequence-job");
  expect(driftWork(project)).toEqual({ resolving: false, running: false });
});

test("a stopped sequence ends with its reason", () => {
  const project = root();
  startJob("run", project, { held: true }, "stopped-sequence");
  endHeldJob(project, "stopped-sequence", "its command exited with code 1");
  expect(jobAbnormalEnd(project, "stopped-sequence")).toBe("its command exited with code 1");
  expect(driftWork(project).running).toBe(false);
});
