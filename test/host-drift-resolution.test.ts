import { afterEach, expect, test } from "bun:test";
import {
  activeProjectJobs,
  autopilotFailedCase,
  bindChatJob,
  bindCopilotChatJob,
  chatJobSendStarted,
  clearAutopilotFailure,
  driftAutopilotMode,
  driftAutopilotStatus,
  driftResolution,
  endChatJobs,
  endCopilotChatJobs,
  isKnownSuccessfulScan,
  endTerminalJobs,
  excludeAutopilotDrift,
  forgetSkippedDrifts,
  jobAbnormalEnd,
  receiveCoordinatorMessage,
  recordAutopilotFailure,
  recordSkippedDrift,
  resumeAutopilot,
  startJob,
} from "../extension/src/host/drift-resolution";

const roots: string[] = [];
const root = () => {
  const value = `/tmp/trama-chat-job-${crypto.randomUUID()}`;
  roots.push(value);
  return value;
};
afterEach(() => {
  for (const value of roots.splice(0)) {
    endCopilotChatJobs(value, "first");
    endCopilotChatJobs(value, "second");
    endChatJobs(value, "cursor");
  }
});

test("an abnormal job end received from another window keeps its reason; a normal end keeps none", () => {
  const project = root();
  receiveCoordinatorMessage({ type: "job", id: "remote-run", root: project, kind: "run", active: true, place: { terminal: "terminal" } });
  receiveCoordinatorMessage({ type: "job", id: "remote-run", root: project, kind: "run", active: false, place: { terminal: "terminal" }, abnormal: "its terminal was closed" });
  expect(jobAbnormalEnd(project, "remote-run")).toBe("its terminal was closed");
  receiveCoordinatorMessage({ type: "job", id: "remote-clean", root: project, kind: "run", active: true, place: { terminal: "terminal-2" } });
  receiveCoordinatorMessage({ type: "job", id: "remote-clean", root: project, kind: "run", active: false, place: { terminal: "terminal-2" } });
  expect(jobAbnormalEnd(project, "remote-clean")).toBeUndefined();
});

test("an interrupted or closed Cursor conversation ends its job abnormally; a completed one ends normally", () => {
  const project = root();
  startJob("resolve", project, { chat: "cursor" }, false, undefined, "interrupted-job");
  bindChatJob(project, "interrupted");
  endChatJobs(project, "interrupted", "its conversation was interrupted");
  expect(jobAbnormalEnd(project, "interrupted-job")).toBe("its conversation was interrupted");
  startJob("resolve", project, { chat: "cursor" }, false, undefined, "completed-job");
  bindChatJob(project, "completed");
  endChatJobs(project, "completed");
  expect(jobAbnormalEnd(project, "completed-job")).toBeUndefined();
});

test("a skipped Drift stays out of automatic resolution until it changes or a developer scan forgets it; automatic failures stay", () => {
  const project = root();
  recordSkippedDrift(project, "skipped", "signature-1");
  recordAutopilotFailure(project, "job", "failed", undefined, "fix did not apply");
  expect(autopilotFailedCase(project, "skipped")).toBe(true);
  clearAutopilotFailure(project, "skipped", "signature-1");
  expect(autopilotFailedCase(project, "skipped")).toBe(true);
  clearAutopilotFailure(project, "skipped", "signature-2");
  expect(autopilotFailedCase(project, "skipped")).toBe(false);
  recordSkippedDrift(project, "skipped", "signature-2");
  forgetSkippedDrifts(project);
  expect(autopilotFailedCase(project, "skipped")).toBe(false);
  expect(autopilotFailedCase(project, "failed")).toBe(true);
});

test("a skip forwarded from another window keeps its Drift out until its question is answered or a developer scan starts", () => {
  const project = root();
  const signature = JSON.stringify({ data: { status: "open" }, body: "first" });
  receiveCoordinatorMessage({ type: "drift-question-skipped", root: project, drift: "forwarded", signature });
  expect(autopilotFailedCase(project, "forwarded")).toBe(true);
  receiveCoordinatorMessage({ type: "drift-question-answered", root: project, drift: "forwarded" });
  expect(autopilotFailedCase(project, "forwarded")).toBe(false);
  receiveCoordinatorMessage({ type: "drift-question-skipped", root: project, drift: "forwarded", signature });
  receiveCoordinatorMessage({ type: "developer-scan-started", root: project });
  expect(autopilotFailedCase(project, "forwarded")).toBe(false);
});

test("Copilot sends bind in order and only their own conversation ends each job", () => {
  const project = root();
  startJob("run", project, { chat: "copilot" }, false);
  startJob("run", project, { chat: "copilot" }, false);
  bindCopilotChatJob(project, "first");
  bindCopilotChatJob(project, "second");
  expect(driftResolution()).toBe("running-tasks");
  endCopilotChatJobs(project, "unrelated");
  endCopilotChatJobs(project, "first");
  expect(driftResolution()).toBe("running-tasks");
  endCopilotChatJobs(project, "second");
  expect(driftResolution()).toBe("free");
});

test("a resolving Copilot conversation leaves concurrent Runs active until each conversation ends", () => {
  const project = root();
  startJob("run", project, { chat: "copilot" }, false);
  startJob("resolve", project, { chat: "copilot" }, false);
  bindCopilotChatJob(project, "first");
  bindCopilotChatJob(project, "second");
  expect(driftResolution()).toBe("resolving");
  endCopilotChatJobs(project, "second");
  expect(driftResolution()).toBe("running-tasks");
  endCopilotChatJobs(project, "first");
  expect(driftResolution()).toBe("free");
});

test("Cursor chat matching stays separate from Copilot conversations", () => {
  const project = root();
  startJob("run", project, { chat: "cursor" }, false);
  bindCopilotChatJob(project, "same-id");
  expect(driftResolution()).toBe("running-tasks");
  endCopilotChatJobs(project, "same-id");
  expect(driftResolution()).toBe("running-tasks");
  bindChatJob(project, "cursor");
  endChatJobs(project, "cursor");
  expect(driftResolution()).toBe("free");
});

test("prompts during preparation are ignored but prompts and ends during delivery are retained", () => {
  const project = root();
  bindCopilotChatJob(project, "preparation");
  endCopilotChatJobs(project, "preparation");
  const sentAfter = chatJobSendStarted(project, "copilot");
  startJob("run", project, { chat: "copilot" }, false, sentAfter);
  expect(driftResolution()).toBe("running-tasks");
  endCopilotChatJobs(project, "preparation");
  expect(driftResolution()).toBe("running-tasks");
  bindCopilotChatJob(project, "delivery");
  endCopilotChatJobs(project, "delivery");
  expect(driftResolution()).toBe("free");

  const finishedDuringDelivery = root();
  const finishedAfter = chatJobSendStarted(finishedDuringDelivery, "copilot");
  bindCopilotChatJob(finishedDuringDelivery, "finished");
  endCopilotChatJobs(finishedDuringDelivery, "finished");
  startJob("resolve", finishedDuringDelivery, { chat: "copilot" }, false, finishedAfter);
  expect(driftResolution()).toBe("free");

  const activeDuringDelivery = root();
  const activeAfter = chatJobSendStarted(activeDuringDelivery, "copilot");
  bindCopilotChatJob(activeDuringDelivery, "active");
  startJob("run", activeDuringDelivery, { chat: "copilot" }, false, activeAfter);
  expect(driftResolution()).toBe("running-tasks");
  endCopilotChatJobs(activeDuringDelivery, "active");
  expect(driftResolution()).toBe("free");
});

test("failed or interrupted scans are status information that count as finished for the autopilot", () => {
  const project = root();
  receiveCoordinatorMessage({ type: "job", id: "scan-job", root: project, kind: "scan", active: true, place: { terminal: "terminal" } });
  receiveCoordinatorMessage({ type: "check", root: project, job: "scan-job", title: "System scan", phase: "scanning", failed: true });
  expect(driftAutopilotStatus(project, "enabled")).toMatchObject({ phase: "waiting", failures: [{ job: "scan-job" }] });
  receiveCoordinatorMessage({ type: "job", id: "scan-job", root: project, kind: "scan", active: false, place: { terminal: "terminal" } });
  expect(driftAutopilotStatus(project, "enabled")).toMatchObject({ phase: "idle", reason: "Waiting for eligible Drifts", failures: [{ job: "scan-job" }] });
  receiveCoordinatorMessage({ type: "job", id: "scan-interrupted", root: project, kind: "scan", active: true, place: { terminal: "terminal-2" } });
  receiveCoordinatorMessage({ type: "job", id: "scan-interrupted", root: project, kind: "scan", active: false, place: { terminal: "terminal-2" } });
  expect(activeProjectJobs(project)).toEqual([]);
  expect(driftAutopilotStatus(project, "enabled").phase).toBe("idle");
  resumeAutopilot(project);
  expect(driftAutopilotStatus(project, "enabled")).toMatchObject({ phase: "idle", failures: [] });
});

test("only a received failure for a known automatic job excludes its authorized Drift", () => {
  const project = root();
  startJob("resolve", project, { chat: "copilot" }, false, undefined, "auto-job", "automatic", "window");
  bindCopilotChatJob(project, "autopilot-conversation");
  receiveCoordinatorMessage({ type: "autopilot-failure-recorded", root: project, job: "unknown", drift: "drift-1", reason: "no" });
  expect(autopilotFailedCase(project, "drift-1")).toBe(false);
  receiveCoordinatorMessage({ type: "job", id: "auto-job", root: project, kind: "resolve", active: true, place: { chat: "copilot" }, origin: "automatic", windowId: "window" });
  receiveCoordinatorMessage({ type: "autopilot-failure-recorded", root: project, job: "auto-job", drift: "drift-1", reason: "not applicable", signature: "unchanged" });
  expect(autopilotFailedCase(project, "drift-1")).toBe(true);
  clearAutopilotFailure(project, "drift-1", "unchanged");
  expect(autopilotFailedCase(project, "drift-1")).toBe(true);
  clearAutopilotFailure(project, "drift-1", "edited");
  expect(autopilotFailedCase(project, "drift-1")).toBe(false);
  endCopilotChatJobs(project, "autopilot-conversation");
  receiveCoordinatorMessage({ type: "job", id: "auto-job", root: project, kind: "resolve", active: false, place: { chat: "copilot" }, origin: "automatic", windowId: "window" });
});

test("a developer scan makes failed cases eligible again but an automatic scan does not", () => {
  const project = root();
  recordAutopilotFailure(project, "run-job", "drift-1", undefined, "could not resolve");
  startJob("scan", project, { terminal: "automatic-scan" }, false, undefined, "automatic-scan", "automatic");
  receiveCoordinatorMessage({ type: "check", root: project, job: "automatic-scan", title: "Automatic scan", phase: "scanning", failed: false });
  expect(autopilotFailedCase(project, "drift-1")).toBe(true);
  startJob("scan", project, { terminal: "developer-scan" }, false, undefined, "developer-scan", "manual");
  receiveCoordinatorMessage({ type: "check", root: project, job: "developer-scan", title: "Developer scan", phase: "scanning", failed: false });
  expect(autopilotFailedCase(project, "drift-1")).toBe(false);
  endTerminalJobs("automatic-scan");
  endTerminalJobs("developer-scan");
});

test("a developer scan that fails or is interrupted makes failed cases eligible again too, an automatic one does not", () => {
  const project = root();
  recordAutopilotFailure(project, "run-job", "drift-1", undefined, "could not resolve");
  startJob("scan", project, { terminal: "automatic-scan" }, false, undefined, "automatic-scan", "automatic");
  receiveCoordinatorMessage({ type: "check", root: project, job: "automatic-scan", title: "Automatic scan", phase: "scanning", failed: true });
  endTerminalJobs("automatic-scan");
  expect(autopilotFailedCase(project, "drift-1")).toBe(true);

  startJob("scan", project, { terminal: "failed-scan" }, false, undefined, "failed-scan", "manual");
  receiveCoordinatorMessage({ type: "check", root: project, job: "failed-scan", title: "Developer scan", phase: "scanning", failed: true });
  expect(autopilotFailedCase(project, "drift-1")).toBe(false);

  recordAutopilotFailure(project, "run-job", "drift-1", undefined, "could not resolve");
  startJob("scan", project, { terminal: "interrupted-scan" }, false, undefined, "interrupted-scan", "manual");
  endTerminalJobs("interrupted-scan");
  expect(autopilotFailedCase(project, "drift-1")).toBe(false);
});

test("editing a failed Drift clears its signature-based exclusion", () => {
  const project = root();
  recordAutopilotFailure(project, "resolve-job", "drift-1", undefined, "could not resolve");
  excludeAutopilotDrift(project, "drift-1", "unchanged");
  clearAutopilotFailure(project, "drift-1", "unchanged");
  expect(autopilotFailedCase(project, "drift-1")).toBe(true);
  clearAutopilotFailure(project, "drift-1", "edited");
  expect(autopilotFailedCase(project, "drift-1")).toBe(false);
});

test("an unrecognized autopilot value is disabled, so Resolve Drifts keeps the manual flow", () => {
  expect(driftAutopilotMode("enbled")).toBe("disabled");
  expect(driftAutopilotMode(undefined)).toBe("disabled");
  expect(driftAutopilotMode("yolo")).toBe("yolo");
});

test("a Run's check, failed or not, does not make failed cases eligible again", () => {
  const project = root();
  recordAutopilotFailure(project, "run-job", "drift-1", undefined, "could not resolve");
  startJob("run", project, { terminal: "run-terminal" }, false, undefined, "run-job-2", "manual");
  receiveCoordinatorMessage({ type: "check", root: project, job: "run-job-2", title: "Final check", phase: "scanning", failed: true });
  expect(autopilotFailedCase(project, "drift-1")).toBe(true);
  receiveCoordinatorMessage({ type: "check", root: project, job: "run-job-2", title: "Final check", phase: "scanning", failed: false });
  expect(autopilotFailedCase(project, "drift-1")).toBe(true);
  endTerminalJobs("run-terminal");
});

test("a check declared after its scan ended does not make the scan successful", () => {
  const project = root();
  receiveCoordinatorMessage({ type: "job", id: "late-scan", root: project, kind: "scan", active: true, place: { terminal: "terminal" } });
  receiveCoordinatorMessage({ type: "job", id: "late-scan", root: project, kind: "scan", active: false, place: { terminal: "terminal" } });
  receiveCoordinatorMessage({ type: "check", root: project, job: "late-scan", title: "Late scan", phase: "scanning", failed: false });
  expect(driftAutopilotStatus(project, "enabled").failures.map((failure) => failure.job)).toEqual(["late-scan"]);
  expect(isKnownSuccessfulScan(project, "late-scan")).toBe(false);
});

test("autopilot status identifies jobs active in a different editor window", () => {
  const project = root();
  receiveCoordinatorMessage({ type: "job", id: "remote-scan", root: project, kind: "scan", active: true, place: { terminal: "remote" }, windowId: "window-b" });
  expect(driftAutopilotStatus(project, "enabled", "window-a").remoteWindow).toBe(true);
  expect(driftAutopilotStatus(project, "enabled", "window-b").remoteWindow).toBeUndefined();
  receiveCoordinatorMessage({ type: "job", id: "remote-scan", root: project, kind: "scan", active: false, place: { terminal: "remote" }, windowId: "window-b" });
});
