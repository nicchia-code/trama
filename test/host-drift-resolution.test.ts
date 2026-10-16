import { afterEach, expect, test } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  awaitAutopilotResume,
  activeProjectJobs,
  autopilotFailedCase,
  bindChatJob,
  bindCopilotChatJob,
  chatJobSendStarted,
  clearAutopilotFailure,
  driftAutopilotStatus,
  setJobsVerified,
  driftWork,
  clearSendReservations,
  forgetWindow,
  projectWindowIds,
  reserveSend,
  sendReserved,
  endChatJobs,
  endCopilotChatJobs,
  isKnownSuccessfulScan,
  endTerminalJobs,
  excludeAutopilotDrift,
  forgetSkippedDrifts,
  jobAbnormalEnd,
  lastFailedScan,
  receiveCoordinatorMessage,
  recordAutopilotFailure,
  recordSkippedDrift,
  shownAutopilotFailures,
  autopilotFailures,
  autopilotReady,
  resumeAutopilot,
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

test("a skipped question shows only with the autopilot on, and not for a critical Drift in enabled mode", () => {
  const project = root();
  recordSkippedDrift(project, "plain", "signature-1");
  recordSkippedDrift(project, "critical", "signature-1");
  recordAutopilotFailure(project, "job", "failed", undefined, "fix did not apply");
  const failures = autopilotFailures(project);
  const isCritical = (drift: string) => drift === "critical";
  const ids = (mode: "disabled" | "enabled" | "yolo") => shownAutopilotFailures(failures, mode, isCritical).map((f) => f.drift ?? f.job);
  expect(ids("disabled")).toEqual(["failed"]);
  expect(ids("enabled")).toEqual(["plain", "failed"]);
  expect(ids("yolo")).toEqual(["plain", "critical", "failed"]);
  expect(autopilotFailedCase(project, "critical")).toBe(true);
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
  expect(driftWork()).toEqual({ resolving: false, running: true });
  endCopilotChatJobs(project, "unrelated");
  endCopilotChatJobs(project, "first");
  expect(driftWork()).toEqual({ resolving: false, running: true });
  endCopilotChatJobs(project, "second");
  expect(driftWork()).toEqual({ resolving: false, running: false });
});

test("a resolving Copilot conversation leaves concurrent Runs active until each conversation ends", () => {
  const project = root();
  startJob("run", project, { chat: "copilot" }, false);
  startJob("resolve", project, { chat: "copilot" }, false);
  bindCopilotChatJob(project, "first");
  bindCopilotChatJob(project, "second");
  expect(driftWork().resolving).toBe(true);
  endCopilotChatJobs(project, "second");
  expect(driftWork()).toEqual({ resolving: false, running: true });
  endCopilotChatJobs(project, "first");
  expect(driftWork()).toEqual({ resolving: false, running: false });
});

test("Cursor chat matching stays separate from Copilot conversations", () => {
  const project = root();
  startJob("run", project, { chat: "cursor" }, false);
  bindCopilotChatJob(project, "same-id");
  expect(driftWork()).toEqual({ resolving: false, running: true });
  endCopilotChatJobs(project, "same-id");
  expect(driftWork()).toEqual({ resolving: false, running: true });
  bindChatJob(project, "cursor");
  endChatJobs(project, "cursor");
  expect(driftWork()).toEqual({ resolving: false, running: false });
});

test("prompts during preparation are ignored but prompts and ends during delivery are retained", () => {
  const project = root();
  bindCopilotChatJob(project, "preparation");
  endCopilotChatJobs(project, "preparation");
  const sentAfter = chatJobSendStarted(project, "copilot");
  startJob("run", project, { chat: "copilot" }, false, sentAfter);
  expect(driftWork()).toEqual({ resolving: false, running: true });
  endCopilotChatJobs(project, "preparation");
  expect(driftWork()).toEqual({ resolving: false, running: true });
  bindCopilotChatJob(project, "delivery");
  endCopilotChatJobs(project, "delivery");
  expect(driftWork()).toEqual({ resolving: false, running: false });

  const finishedDuringDelivery = root();
  const finishedAfter = chatJobSendStarted(finishedDuringDelivery, "copilot");
  bindCopilotChatJob(finishedDuringDelivery, "finished");
  endCopilotChatJobs(finishedDuringDelivery, "finished");
  startJob("resolve", finishedDuringDelivery, { chat: "copilot" }, false, finishedAfter);
  expect(driftWork()).toEqual({ resolving: false, running: false });

  const activeDuringDelivery = root();
  const activeAfter = chatJobSendStarted(activeDuringDelivery, "copilot");
  bindCopilotChatJob(activeDuringDelivery, "active");
  startJob("run", activeDuringDelivery, { chat: "copilot" }, false, activeAfter);
  expect(driftWork()).toEqual({ resolving: false, running: true });
  endCopilotChatJobs(activeDuringDelivery, "active");
  expect(driftWork()).toEqual({ resolving: false, running: false });
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

test("a live window that did not answer the jobs request withholds automatic steps with its reason until verified", () => {
  const project = root();
  setJobsVerified(project, false);
  expect(driftAutopilotStatus(project, "enabled")).toMatchObject({ phase: "suspended", reason: "Not every live editor window answered the jobs request" });
  expect(driftAutopilotStatus(project, "disabled")).toMatchObject({ phase: "manual", reason: null });
  setJobsVerified(project, true);
  expect(driftAutopilotStatus(project, "enabled")).toMatchObject({ phase: "idle" });
});

test("a manual Run is reported without authorized corrections, an automatic Run is reported as them", () => {
  const project = root();
  receiveCoordinatorMessage({ type: "job", id: "manual-run", root: project, kind: "run", active: true, origin: "manual", place: { terminal: "terminal" } });
  expect(driftAutopilotStatus(project, "enabled")).toMatchObject({ phase: "manual", reason: "A manual Run is in progress: it grants no authorized corrections" });
  receiveCoordinatorMessage({ type: "job", id: "manual-run", root: project, kind: "run", active: false, place: { terminal: "terminal" } });
  receiveCoordinatorMessage({ type: "job", id: "auto-run", root: project, kind: "run", active: true, origin: "automatic", place: { terminal: "terminal-2" } });
  expect(driftAutopilotStatus(project, "enabled")).toMatchObject({ phase: "executing", reason: "Running authorized corrections" });
  receiveCoordinatorMessage({ type: "job", id: "auto-run", root: project, kind: "run", active: false, place: { terminal: "terminal-2" } });
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

test("a failed final check of an automatic Run is recorded with its case and holds nothing", () => {
  const project = root();
  startJob("run", project, { terminal: "auto-run-terminal" }, false, undefined, "auto-run", "automatic");
  receiveCoordinatorMessage({ type: "check", root: project, job: "auto-run", title: "Final check after all Tasks", phase: "verifying", failed: true });
  expect(driftAutopilotStatus(project, "enabled").failures).toEqual([expect.objectContaining({ job: "auto-run" })]);
  expect(driftAutopilotStatus(project, "enabled").phase).not.toBe("suspended");
  endTerminalJobs("auto-run-terminal");
});

test("a check declared after its scan ended does not make the scan successful", () => {
  const project = root();
  receiveCoordinatorMessage({ type: "job", id: "late-scan", root: project, kind: "scan", active: true, place: { terminal: "terminal" } });
  receiveCoordinatorMessage({ type: "job", id: "late-scan", root: project, kind: "scan", active: false, place: { terminal: "terminal" } });
  receiveCoordinatorMessage({ type: "check", root: project, job: "late-scan", title: "Late scan", phase: "scanning", failed: false });
  expect(driftAutopilotStatus(project, "enabled").failures.map((failure) => failure.job)).toEqual(["late-scan"]);
  expect(isKnownSuccessfulScan(project, "late-scan")).toBe(false);
});

test("a successful scan lifts the initial wait when its work ends, not at its check", () => {
  const project = root();
  awaitAutopilotResume(project);
  receiveCoordinatorMessage({ type: "job", id: "ok-scan", root: project, kind: "scan", active: true, place: { terminal: "terminal" } });
  receiveCoordinatorMessage({ type: "check", root: project, job: "ok-scan", title: "System scan", phase: "scanning", failed: false });
  expect(autopilotReady(project)).toBe(false);
  receiveCoordinatorMessage({ type: "job", id: "ok-scan", root: project, kind: "scan", active: false, place: { terminal: "terminal" } });
  expect(autopilotReady(project)).toBe(true);
});

test("a check declared for a finished scan or a Run lifts no wait after the editor reopens", () => {
  const project = root();
  receiveCoordinatorMessage({ type: "job", id: "old-scan", root: project, kind: "scan", active: true, place: { terminal: "terminal" } });
  receiveCoordinatorMessage({ type: "job", id: "old-scan", root: project, kind: "scan", active: false, place: { terminal: "terminal" } });
  receiveCoordinatorMessage({ type: "job", id: "old-run", root: project, kind: "run", active: true, place: { terminal: "terminal-2" } });
  receiveCoordinatorMessage({ type: "job", id: "old-run", root: project, kind: "run", active: false, place: { terminal: "terminal-2" } });
  awaitAutopilotResume(project);
  receiveCoordinatorMessage({ type: "check", root: project, job: "old-scan", title: "System scan", phase: "scanning", failed: false });
  receiveCoordinatorMessage({ type: "check", root: project, job: "old-run", title: "Final check", phase: "scanning", failed: false });
  expect(autopilotReady(project)).toBe(false);
});

test("autopilot status identifies jobs active in a different editor window", () => {
  const project = root();
  receiveCoordinatorMessage({ type: "job", id: "remote-scan", root: project, kind: "scan", active: true, place: { terminal: "remote" }, windowId: "window-b" });
  expect(driftAutopilotStatus(project, "enabled", "window-a").remoteWindow).toBe(true);
  expect(driftAutopilotStatus(project, "enabled", "window-b").remoteWindow).toBeUndefined();
  receiveCoordinatorMessage({ type: "job", id: "remote-scan", root: project, kind: "scan", active: false, place: { terminal: "remote" }, windowId: "window-b" });
});

test("a lost editor window takes its reserved send and its jobs with it, and the other windows keep theirs", () => {
  const project = root();
  expect(reserveSend(project, "send-a", "window-a")).toBe(true);
  expect(reserveSend(project, "send-b", "window-b")).toBe(false);
  receiveCoordinatorMessage({ type: "job", id: "run-a", root: project, kind: "run", active: true, origin: "manual", windowId: "window-a", place: { terminal: "term-a" } });
  receiveCoordinatorMessage({ type: "job", id: "run-b", root: project, kind: "run", active: true, origin: "manual", windowId: "window-b", place: { terminal: "term-b" } });
  expect(projectWindowIds(project).sort()).toEqual(["window-a", "window-b"]);

  forgetWindow(project, "window-a");

  expect(projectWindowIds(project)).toEqual(["window-b"]);
  expect(activeProjectJobs(project).map((job) => job.id)).toEqual(["run-b"]);
  expect(jobAbnormalEnd(project, "run-a")).toBe("the editor window was lost");
  expect(jobAbnormalEnd(project, "run-b")).toBeUndefined();
  expect(sendReserved(project)).toBe(false);
  expect(reserveSend(project, "send-b", "window-b")).toBe(true);
  expect(driftWork(project)).toEqual({ resolving: false, running: true });
  forgetWindow(project, "window-b");
});

test("losing the coordinator role clears the sends this window reserved", () => {
  const project = root();
  expect(reserveSend(project, "send-a", "window-a")).toBe(true);
  expect(sendReserved(project)).toBe(true);

  clearSendReservations(project);

  expect(sendReserved(project)).toBe(false);
  expect(reserveSend(project, "send-b", "window-b")).toBe(true);
  clearSendReservations(project);
});

test("under disabled a window sees only its own jobs; another window's Run blocks it only while the autopilot is on", () => {
  const project = root();
  receiveCoordinatorMessage({ type: "job", id: "other-run", root: project, kind: "run", active: true, place: { terminal: "terminal" }, origin: "manual", windowId: "other-window" });
  expect(driftWork(project, false)).toEqual({ resolving: false, running: false });
  expect(activeProjectJobs(project, false)).toEqual([]);
  expect(driftWork(project)).toEqual({ resolving: false, running: true });
  receiveCoordinatorMessage({ type: "job", id: "other-run", root: project, kind: "run", active: false, place: { terminal: "terminal" } });
});

test("a Run's pre-flight that the Run ended without declaring is a failed scan with its title; a scan's check is not", () => {
  const project = root();
  startJob("run", project, { terminal: "pre-flight-run" }, false, undefined, "pre-run", "manual");
  startJob("scan", project, { terminal: "pre-flight-scan" }, false, undefined, "pre-scan", "manual");
  receiveCoordinatorMessage({ type: "interrupted-preflight", root: project, job: "pre-run", title: "Pre-flight of Checkout" });
  receiveCoordinatorMessage({ type: "interrupted-preflight", root: project, job: "pre-scan", title: "System scan" });
  expect(driftAutopilotStatus(project, "enabled").failures.map((failure) => failure.title)).toEqual(["Pre-flight of Checkout"]);
  expect(lastFailedScan(project)).toBe("Pre-flight of Checkout");
  endTerminalJobs("pre-flight-run");
  endTerminalJobs("pre-flight-scan");
});

test("an interrupted pre-flight of a Run started in another window is a failed scan for the coordinator too", () => {
  const project = root();
  receiveCoordinatorMessage({ type: "job", id: "remote-run", root: project, kind: "run", active: true, place: { terminal: "remote-terminal" }, origin: "manual", windowId: "other-window" });
  receiveCoordinatorMessage({ type: "interrupted-preflight", root: project, job: "remote-run", title: "Pre-flight of Shop" });
  expect(lastFailedScan(project)).toBe("Pre-flight of Shop");
  receiveCoordinatorMessage({ type: "job", id: "remote-run", root: project, kind: "run", active: false, place: { terminal: "remote-terminal" } });
});
