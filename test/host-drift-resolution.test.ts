import { afterEach, expect, test } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  bindChatJob,
  chatJobSendStarted,
  driftWork,
  endChatJobs,
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
  const value = join(tmpdir(), `trama-chat-job-${crypto.randomUUID()}`);
  roots.push(value);
  return value;
};
afterEach(() => {
  for (const value of roots.splice(0)) {
    endChatJobs(value, "cursor");
  }
});

test("an abnormal terminal end keeps its reason; a normal end keeps none", () => {
  const project = root();
  startJob("run", project, { terminal: "terminal" }, undefined, "abnormal-run");
  endTerminalJobs("terminal", "its terminal was closed");
  expect(jobAbnormalEnd(project, "abnormal-run")).toBe("its terminal was closed");
  startJob("run", project, { terminal: "terminal-2" }, undefined, "clean-run");
  endTerminalJobs("terminal-2");
  expect(jobAbnormalEnd(project, "clean-run")).toBeUndefined();
});

test("an interrupted or closed Cursor conversation ends its job abnormally; a completed one ends normally", () => {
  const project = root();
  startJob("resolve", project, { chat: "cursor" }, undefined, "interrupted-job");
  bindChatJob(project, "interrupted");
  endChatJobs(project, "interrupted", "its conversation was interrupted");
  expect(jobAbnormalEnd(project, "interrupted-job")).toBe("its conversation was interrupted");
  startJob("resolve", project, { chat: "cursor" }, undefined, "completed-job");
  bindChatJob(project, "completed");
  endChatJobs(project, "completed");
  expect(jobAbnormalEnd(project, "completed-job")).toBeUndefined();
});

test("a chat job whose send was not made by the chat ends at once, without an abnormal outcome", () => {
  const project = root();
  startJob("run", project, { chat: "cursor" }, undefined, "unsent-job");
  expect(localProjectJobs(project).some((job) => job.id === "unsent-job")).toBe(true);
  endUnsentJob(project, "unsent-job");
  expect(localProjectJobs(project).some((job) => job.id === "unsent-job")).toBe(false);
  expect(jobAbnormalEnd(project, "unsent-job")).toBeUndefined();
});

test("prompts during preparation are ignored but prompts and ends during delivery are retained", () => {
  const project = root();
  bindChatJob(project, "preparation");
  endChatJobs(project, "preparation");
  const sentAfter = chatJobSendStarted(project, "cursor");
  startJob("run", project, { chat: "cursor" }, sentAfter);
  expect(driftWork()).toEqual({ resolving: false, running: true });
  endChatJobs(project, "preparation");
  expect(driftWork()).toEqual({ resolving: false, running: true });
  bindChatJob(project, "delivery");
  endChatJobs(project, "delivery");
  expect(driftWork()).toEqual({ resolving: false, running: false });

  const finishedDuringDelivery = root();
  const finishedAfter = chatJobSendStarted(finishedDuringDelivery, "cursor");
  bindChatJob(finishedDuringDelivery, "finished");
  endChatJobs(finishedDuringDelivery, "finished");
  startJob("resolve", finishedDuringDelivery, { chat: "cursor" }, finishedAfter);
  expect(driftWork()).toEqual({ resolving: false, running: false });

  const activeDuringDelivery = root();
  const activeAfter = chatJobSendStarted(activeDuringDelivery, "cursor");
  bindChatJob(activeDuringDelivery, "active");
  startJob("run", activeDuringDelivery, { chat: "cursor" }, activeAfter);
  expect(driftWork()).toEqual({ resolving: false, running: true });
  endChatJobs(activeDuringDelivery, "active");
  expect(driftWork()).toEqual({ resolving: false, running: false });
});

test("a window sees only the jobs it started: job notices of other windows change nothing", () => {
  const project = root();
  receiveNotice({ type: "job", id: "other-run", root: project, kind: "run", active: true, place: { terminal: "terminal" }, holder: "other" });
  expect(localProjectJobs(project)).toEqual([]);
  expect(driftWork(project)).toEqual({ resolving: false, running: false });
  startJob("run", project, { terminal: "own-terminal" }, undefined, "own-run");
  expect(localProjectJobs(project).some((job) => job.kind === "run")).toBe(true);
  endTerminalJobs("own-terminal");
  expect(localProjectJobs(project).some((job) => job.kind === "run")).toBe(false);
});

test("a sequence of Runs stays one active Run between two of its Runs and ends with its last one", () => {
  const project = root();
  startJob("run", project, { held: true }, undefined, "sequence-job");
  startJob("run", project, { terminal: "group-1" }, undefined, "group-1-run");
  endTerminalJobs("group-1");
  expect(localProjectJobs(project).map((job) => job.id)).toEqual(["sequence-job"]);
  expect(driftWork(project)).toEqual({ resolving: false, running: true });
  startJob("run", project, { terminal: "group-2" }, undefined, "group-2-run");
  endTerminalJobs("group-2");
  expect(driftWork(project)).toEqual({ resolving: false, running: true });
  endHeldJob(project, "sequence-job");
  expect(driftWork(project)).toEqual({ resolving: false, running: false });
});

test("a stopped sequence ends with its reason", () => {
  const project = root();
  startJob("run", project, { held: true }, undefined, "stopped-sequence");
  endHeldJob(project, "stopped-sequence", "its command exited with code 1");
  expect(jobAbnormalEnd(project, "stopped-sequence")).toBe("its command exited with code 1");
  expect(driftWork(project).running).toBe(false);
});
