import { randomUUID } from "node:crypto";
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import type { DelegationMode } from "./settings-schema";

/** Trama-launched jobs, retained only in memory for their live editor windows. */
export type JobKind = "run" | "resolve" | "scan";

export type JobPlace = { terminal: string } | { chat: "cursor" | "copilot" | "other" };

export type JobOrigin = "manual" | "automatic";
export type DriftAutopilotMode = DelegationMode;
export type DriftAutopilotPhase = "manual" | "suspended" | "preparing" | "executing" | "waiting" | "idle";

export interface Job {
  id: string;
  kind: JobKind;
  root: string;
  place: JobPlace;
  origin: JobOrigin;
  windowId: string;
  /** The conversation that owns this chat job once its first Trama prompt binds it. */
  conversation?: string;
}


const jobs = new Set<Job>();
const remoteJobs = new Map<string, Job>();
const knownJobs = new Set<string>();
/** The kind of every job this window knows of, by key: an interrupted pre-flight counts only for a Run, whichever window started it. */
const jobKinds = new Map<string, JobKind>();
const knownJobOrigins = new Map<string, JobOrigin>();
const pendingChecks = new Map<string, Record<string, unknown>>();
const listeners = new Set<() => void>();

const changed = () => {
  for (const listener of [...listeners]) listener();
};

function projectRootKey(root: string): string {
  let canonical = resolve(root);
  try { canonical = realpathSync(canonical); } catch { /* The path remains a stable fallback when absent. */ }
  return process.platform === "win32" ? canonical.toLowerCase() : canonical;
}

/** Active Trama-launched jobs known to this window for a project, deduplicated by their transitory identity. Without `shared` (autopilot `disabled`) only this window's own jobs count. */
export function activeProjectJobs(root: string, shared = true): Job[] {
  const key = projectRootKey(root);
  const byId = new Map<string, Job>();
  for (const job of shared ? [...jobs, ...remoteJobs.values()] : jobs)
    if (projectRootKey(job.root) === key) byId.set(job.id, job);
  return [...byId.values()];
}

export function localProjectJobs(root: string): Job[] {
  const key = projectRootKey(root);
  return [...jobs].filter((job) => projectRootKey(job.root) === key);
}

/** Which of Drift resolution and a run are going in this window; both may hold at once. Resolve Drifts and Runs are exclusive; scans remain visible to the autopilot barrier but do not block manual actions. Under `disabled` (`shared` false) other windows' jobs are not seen. */
export function driftWork(root?: string, shared = true): { resolving: boolean; running: boolean } {
  const all = root === undefined ? [...jobs, ...(shared ? remoteJobs.values() : [])] : activeProjectJobs(root, shared);
  return { resolving: all.some((j) => j.kind === "resolve"), running: all.some((j) => j.kind === "run") };
}

/** The panel and the launches hear of every change of `driftWork()`. */
export function onDriftResolutionChange(listener: () => void): { dispose(): void } {
  listeners.add(listener);
  return { dispose: () => void listeners.delete(listener) };
}
/** Applies a job lifecycle signal received from another live editor window. */
export function receiveCoordinatorMessage(message: Record<string, unknown>): void {
  if (message["type"] === "drift-question-skipped") {
    const root = message["root"];
    const drift = message["drift"];
    const signature = message["signature"];
    if (typeof root === "string" && typeof drift === "string" && typeof signature === "string") recordSkippedDrift(root, drift, signature);
    return;
  }
  if (message["type"] === "drift-question-answered") {
    const root = message["root"];
    const drift = message["drift"];
    if (typeof root === "string" && typeof drift === "string") clearAutopilotFailure(root, drift);
    return;
  }
  if (message["type"] === "developer-scan-started") {
    const root = message["root"];
    if (typeof root === "string") {
      forgetSkippedDrifts(root);
      releaseAutopilotHold(root);
    }
    return;
  }
  if (message["type"] === "autopilot-failure-recorded") {
    receiveAutopilotFailure(message);
    return;
  }
  if (message["type"] === "interrupted-preflight") {
    receiveInterruptedPreflight(message);
    return;
  }
  if (message["type"] === "check") {
    const root = message["root"];
    if (typeof root === "string") setCoordinatorAvailable(root, true);
    receiveCheck(message);
    return;
  }
  if (message["type"] !== "job" || typeof message["id"] !== "string" || typeof message["root"] !== "string") return;
  const kind = message["kind"];
  const active = message["active"];
  const place = message["place"];
  if ((kind !== "run" && kind !== "resolve" && kind !== "scan") || typeof active !== "boolean") return;
  const key = `${projectRootKey(message["root"])}\n${message["id"]}`;
  jobKinds.set(key, kind);
  if (!active) {
    const abnormal = message["abnormal"];
    if (typeof abnormal === "string") abnormalEnds.set(key, abnormal);
    const ended = remoteJobs.get(key);
    if (ended?.kind === "scan") noteScanEnd(projectRootKey(message["root"]), ended.id);
    if (remoteJobs.delete(key)) changed();
    return;
  }
  if (!place || typeof place !== "object") return;
  const location = place as Record<string, unknown>;
  const jobPlace: JobPlace | undefined = typeof location["terminal"] === "string" && location["terminal"] !== ""
    ? { terminal: location["terminal"] }
    : location["chat"] === "cursor" || location["chat"] === "copilot" || location["chat"] === "other"
      ? { chat: location["chat"] }
      : undefined;
  if (!jobPlace) return;
  knownJobs.add(key);
  knownJobOrigins.set(key, message["origin"] === "automatic" ? "automatic" : "manual");
  remoteJobs.set(key, {
    id: message["id"], kind, root: message["root"], place: jobPlace,
    origin: message["origin"] === "automatic" ? "automatic" : "manual",
    windowId: typeof message["windowId"] === "string" ? message["windowId"] : "",
  });
  const pending = pendingChecks.get(key);
  if (pending !== undefined) {
    pendingChecks.delete(key);
    receiveCheck(pending);
  }
  changed();
}

export interface DriftAutopilotFailure {
  job: string;
  title: string;
  drift?: string;
  task?: string;
  /** Why the case failed or was excluded; set for Drift and Task cases, absent for scan failures. */
  reason?: string;
}

export interface DriftAutopilotStatus {
  mode: DriftAutopilotMode;
  phase: DriftAutopilotPhase;
  reason: string | null;
  failures: DriftAutopilotFailure[];
  remoteWindow?: boolean;
  collection?: string;
  drifts?: string[];
  tasks?: string[];
}

const scanFailures = new Map<string, Map<string, string>>();
const failedCases = new Map<string, Map<string, DriftAutopilotFailure & { signature?: string }>>();
const readyProjects = new Set<string>();
const checkSucceeded = new Set<string>();
/** Projects whose automatic flow is held after a start that reached no agent, with the mode the hold was taken under. */
const heldProjects = new Map<string, DriftAutopilotMode>();


/** Records a completed check associated with a known Trama job. */
function receiveCheck(message: Record<string, unknown>): void {
  const root = message["root"];
  const job = message["job"];
  const phase = message["phase"];
  const failed = message["failed"];
  const title = message["title"];
  if (typeof root !== "string" || typeof job !== "string" || typeof title !== "string" ||
      (phase !== "verifying" && phase !== "scanning") || typeof failed !== "boolean") return;
  const key = projectRootKey(root);
  const jobKey = `${key}\n${job}`;
  if (!knownJobs.has(jobKey)) {
    pendingChecks.set(jobKey, message);
    return;
  }
  const scanActive = [...jobs, ...remoteJobs.values()].some((candidate) => candidate.id === job && candidate.kind === "scan");
  const developerScan = knownJobOrigins.get(jobKey) === "manual" && scanActive;
  let failures = scanFailures.get(key);
  if (failures === undefined) scanFailures.set(key, failures = new Map());
  // A check declared after its scan ended proves neither success nor the end of a scan: it lifts no wait. A failed final check of an automatic Run is recorded as that case's failure; the completed cases stand and the next collections are not held.
  if (phase === "verifying" && failed && knownJobOrigins.get(jobKey) === "automatic") {
    recordRunFailure(key, job, title);
  } else if (phase === "scanning" && failed) {
    setScanFailure(failures, job, title);
    if (developerScan) failedCases.delete(key);
  } else if (phase === "scanning" && scanActive) {
    // The wait lifts when this scan ends (noteScanEnd), not at its check: a declared check alone is no end.
    failures.delete(job);
    checkSucceeded.add(jobKey);
    if (knownJobOrigins.get(jobKey) === "manual") {
      const activeScans = new Set([...jobs, ...remoteJobs.values()]
        .filter((candidate) => candidate.kind === "scan" && projectRootKey(candidate.root) === key)
        .map((candidate) => candidate.id));
      for (const failedJob of failures.keys()) if (!activeScans.has(failedJob)) failures.delete(failedJob);
      if (developerScan) failedCases.delete(key);
    }
  }
  changed();
}

/** A failed final check of an automatic Run is shown with its case and reason; it changes no other state. */
function recordRunFailure(key: string, job: string, title: string): void {
  let cases = failedCases.get(key);
  if (cases === undefined) failedCases.set(key, cases = new Map());
  cases.set(`run:${job}`, { job, title: `Automatic Run, ${title}: the final check failed; the Tasks already done are not undone`, reason: "the final check of this automatic Run failed; the Tasks already done are not undone" });
}

/** Whether the final check of this automatic Run failed: from then on the Run authorizes no further Task. */
export function runCheckFailed(root: string, job: string): boolean {
  return failedCases.get(projectRootKey(root))?.has(`run:${job}`) === true;
}

/** A scan that ends unsuccessfully is shown in the status but still counts as finished for the barrier. */
function noteScanFailure(key: string, job: string, title: string): void {
  let failures = scanFailures.get(key);
  if (failures === undefined) scanFailures.set(key, failures = new Map());
  setScanFailure(failures, job, title);
  if (knownJobOrigins.get(`${key}\n${job}`) === "manual") failedCases.delete(key);
  readyProjects.add(key);
}

/** A pre-flight that its Run ended without declaring is a failed scan, titled as its check, whichever window followed the Run; the Run and the delegation go on. */
function receiveInterruptedPreflight(message: Record<string, unknown>): void {
  const root = message["root"];
  const job = message["job"];
  const title = message["title"];
  if (typeof root !== "string" || typeof job !== "string" || typeof title !== "string") return;
  const key = projectRootKey(root);
  if (jobKinds.get(`${key}\n${job}`) !== "run") return;
  let failures = scanFailures.get(key);
  if (failures === undefined) scanFailures.set(key, failures = new Map());
  setScanFailure(failures, job, title);
  changed();
}

/** The end of a scan lifts the initial wait with any outcome; a scan that ended without a successful check is also shown as failed. */
function noteScanEnd(key: string, job: string): void {
  if (checkSucceeded.has(`${key}\n${job}`)) readyProjects.add(key);
  else noteScanFailure(key, job, "Scan ended without a successful check");
}

/** Keeps the latest failure last in order, so `lastFailedScan` reads the most recent one. */
function setScanFailure(failures: Map<string, string>, job: string, title: string): void {
  failures.delete(job);
  failures.set(job, title);
}

/** The title of the project's last scan that failed or was interrupted and no successful scan has cleared; information only, it changes no phase. */
export function lastFailedScan(root: string): string | null {
  let last: string | null = null;
  for (const title of scanFailures.get(projectRootKey(root))?.values() ?? []) last = title;
  return last;
}

function receiveAutopilotFailure(message: Record<string, unknown>): void {
  const root = message["root"];
  const job = message["job"];
  const reason = message["reason"];
  const drift = message["drift"];
  const task = message["task"];
  const signature = message["signature"];
  if (typeof root !== "string" || typeof job !== "string" || typeof reason !== "string" ||
      (typeof drift !== "string" && typeof task !== "string") || (typeof drift === "string" && typeof task === "string")) return;
  if (!knownJobs.has(`${projectRootKey(root)}\n${job}`)) return;
  recordAutopilotFailure(root, job, typeof drift === "string" ? drift : undefined, typeof task === "string" ? task : undefined, reason);
  if (typeof drift === "string" && typeof signature === "string") excludeAutopilotDrift(root, drift, signature);
}

export function recordAutopilotFailure(root: string, job: string, drift: string | undefined, task: string | undefined, reason: string): void {
  if ((drift === undefined) === (task === undefined)) return;
  const key = projectRootKey(root);
  const failure: DriftAutopilotFailure & { signature?: string } = {
    job,
    title: `${drift === undefined ? `Task ${task}` : `Drift ${drift}`}: ${reason}`,
    reason,
    ...(drift === undefined ? { task } : { drift }),
  };
  let cases = failedCases.get(key);
  if (cases === undefined) failedCases.set(key, cases = new Map());
  cases.set(drift === undefined ? `task:${task}` : `drift:${drift}`, failure);
  changed();
}

export function autopilotReady(root: string): boolean {
  return readyProjects.has(projectRootKey(root));
}

export function resumeAutopilot(root: string): void {
  const key = projectRootKey(root);
  heldProjects.delete(key);
  readyProjects.add(key);
  scanFailures.get(key)?.clear();
  changed();
}

/** The sends reserved per project, with their coordinator: one at a time, from their check to their start or refusal. */
const sendReservations = new Map<string, Map<string, string>>();

/** Reserves the next send of the project for `id`, from the editor window `windowId`; refused while another send holds a reservation there. */
export function reserveSend(root: string, id: string, windowId = ""): boolean {
  const key = projectRootKey(root);
  const held = sendReservations.get(key) ?? new Map<string, string>();
  if (held.size > 0) return false;
  held.set(id, windowId);
  sendReservations.set(key, held);
  return true;
}

/** Gives back the reservation `id`, whether its send started or not. A reservation is not a running job. */
export function releaseSend(root: string, id: string): void {
  sendReservations.get(projectRootKey(root))?.delete(id);
}

/** Whether a send is reserved in the project: an automatic step waits for it. */
export function sendReserved(root: string): boolean {
  return (sendReservations.get(projectRootKey(root))?.size ?? 0) > 0;
}

/** Losing the coordinator role clears the sends this window reserved: the new coordinator decides what is reserved from now on. */
export function clearSendReservations(root: string): void {
  sendReservations.delete(projectRootKey(root));
}

/** The editor windows that reserved a send or announced a job in the project; a window with no identity is not named. */
export function projectWindowIds(root: string): string[] {
  const key = projectRootKey(root);
  const windows = new Set<string>();
  for (const owner of sendReservations.get(key)?.values() ?? []) if (owner !== "") windows.add(owner);
  for (const job of remoteJobs.values()) if (projectRootKey(job.root) === key && job.windowId !== "") windows.add(job.windowId);
  return [...windows];
}

/**
 * Forgets what the editor window `windowId` reserved or announced in the project: it can no longer end that work, so
 * what it left must not block the project. A scan it left unfinished counts as finished, never as successful.
 */
export function forgetWindow(root: string, windowId: string): void {
  const key = projectRootKey(root);
  const reservations = sendReservations.get(key);
  if (reservations !== undefined) for (const [id, owner] of reservations) if (owner === windowId) reservations.delete(id);
  for (const [jobKey, job] of remoteJobs) {
    if (projectRootKey(job.root) !== key || job.windowId !== windowId) continue;
    remoteJobs.delete(jobKey);
    // A window that vanished cannot report how its job ended: the job ends abnormally, so an automatic Run fails its unfinished Tasks with this reason.
    abnormalEnds.set(`${key}\n${job.id}`, "the editor window was lost");
    if (job.kind === "scan") noteScanEnd(key, job.id);
  }
  changed();
}

/**
 * A window that just took over the coordination waits again: the scan ends it remembers were seen before it coordinated,
 * so only a new scan's end or a Resolve Drifts request resumes the delegation. Owning the role frees nothing by itself.
 */
export function awaitAutopilotResume(root: string): void {
  readyProjects.delete(projectRootKey(root));
  changed();
}

/** An automatic start that reached no agent holds the flow for this project until a developer's Resolve Drifts or scan, or a mode change, lifts it. */
export function holdAutopilot(root: string, mode: DriftAutopilotMode): void {
  heldProjects.set(projectRootKey(root), mode);
  changed();
}

/** A hold taken under another mode is lifted: a change of the setting starts a new authorization context. */
export function observeAutopilotMode(root: string, mode: DriftAutopilotMode): void {
  const key = projectRootKey(root);
  const held = heldProjects.get(key);
  if (held === undefined || held === mode) return;
  heldProjects.delete(key);
  changed();
}

/** A Resolve Drifts or scan that the developer starts lifts the hold. */
export function releaseAutopilotHold(root: string): void {
  if (heldProjects.delete(projectRootKey(root))) changed();
}

export function autopilotFailedCase(root: string, id: string): boolean {
  const cases = failedCases.get(projectRootKey(root));
  return cases?.has(`drift:${id}`) === true || cases?.has(`task:${id}`) === true;
}

export function autopilotFailures(root: string): DriftAutopilotFailure[] {
  const key = projectRootKey(root);
  return [
    ...[...(scanFailures.get(key) ?? [])].map(([job, title]) => ({ job, title })),
    ...[...(failedCases.get(key) ?? new Map())].map(([, failure]) => failure),
  ];
}

export function clearAutopilotFailure(root: string, id: string, signature?: string): void {
  const cases = failedCases.get(projectRootKey(root));
  if (!cases) return;
  const driftKey = `drift:${id}`;
  const driftFailure = cases.get(driftKey);
  let changedCase = false;
  if (driftFailure && (signature === undefined || driftFailure.signature !== signature)) changedCase = cases.delete(driftKey);
  if (signature === undefined) changedCase = cases.delete(`task:${id}`) || changedCase;
  if (changedCase) changed();
}

export function excludeAutopilotDrift(root: string, id: string, signature: string): void {
  const failure = failedCases.get(projectRootKey(root))?.get(`drift:${id}`);
  if (failure !== undefined) failure.signature = signature;
}

/** The job marking a failed case that is a skipped question rather than an automatic failure. */
const SKIPPED_QUESTION_JOB = "skipped-question";

/** A Drift whose question the developer skipped in a Resolve Drifts round stays out of automatic resolution until it changes, a developer scan starts, or its question is answered later. */
export function recordSkippedDrift(root: string, drift: string, signature: string): void {
  recordAutopilotFailure(root, SKIPPED_QUESTION_JOB, drift, undefined, "its question was skipped in a Resolve Drifts round");
  excludeAutopilotDrift(root, drift, signature);
}

/** A skipped question is no automation failure: its reason is shown only where the autopilot would collect that Drift. */
export function shownAutopilotFailures(failures: DriftAutopilotFailure[], mode: DriftAutopilotMode, isCritical: (drift: string) => boolean): DriftAutopilotFailure[] {
  return failures.filter((failure) => failure.job !== SKIPPED_QUESTION_JOB
    || (mode !== "disabled" && (mode === "yolo" || failure.drift === undefined || !isCritical(failure.drift))));
}

/** A developer-started scan makes the skipped Drifts judgeable again. */
export function forgetSkippedDrifts(root: string): void {
  const cases = failedCases.get(projectRootKey(root));
  if (!cases) return;
  let removed = false;
  for (const [key, failure] of cases) if (failure.job === SKIPPED_QUESTION_JOB) removed = cases.delete(key) || removed;
  if (removed) changed();
}

/** A finished Trama scan, not agent termination or announcement withdrawal, lifts the initial wait. */
export function setCoordinatorAvailable(root: string, available: boolean): void {
  const key = projectRootKey(root);
  const didChange = available ? coordinatorFailures.delete(key) : !coordinatorFailures.has(key);
  if (!available) {
    coordinatorFailures.add(key);
    readyProjects.delete(key);
  }
  if (didChange) changed();
}

export function isKnownSuccessfulScan(root: string, job: string): boolean {
  return checkSucceeded.has(`${projectRootKey(root)}\n${job}`);
}


/** Accessible status summary for the Board; it never grants an authorization. */
export function driftAutopilotStatus(root: string, mode: DriftAutopilotMode, windowId?: string): DriftAutopilotStatus {
  const jobs = activeProjectJobs(root, mode !== "disabled");
  const failures = autopilotFailures(root);
  const remoteWindow = windowId !== undefined && jobs.some((job) => job.windowId !== "" && job.windowId !== windowId);
  const status = { mode, failures, ...(remoteWindow ? { remoteWindow: true } : {}) };
  if (mode === "disabled") return { ...status, phase: "manual", reason: null };
  if (coordinatorFailures.has(projectRootKey(root))) return { ...status, phase: "suspended", reason: "The project coordinator is unavailable" };
  if (unverifiedJobs.has(projectRootKey(root))) return { ...status, phase: "suspended", reason: "Not every live editor window answered the jobs request" };
  if (heldProjects.get(projectRootKey(root)) === mode) return { ...status, phase: "suspended", reason: "An automatic start did not reach the agent; Resolve Drifts or a scan resumes it" };
  if (jobs.some((job) => job.kind === "resolve")) return { ...status, phase: "preparing", reason: "Preparing a Drift resolution" };
  if (jobs.some((job) => job.kind === "run" && job.origin === "automatic")) return { ...status, phase: "executing", reason: "Running authorized corrections" };
  // A manual Run follows its own rules and grants no authorization.
  if (jobs.some((job) => job.kind === "run")) return { ...status, phase: "manual", reason: "A manual Run is in progress: it grants no authorized corrections" };
  if (jobs.length > 0) return { ...status, phase: "waiting", reason: "Waiting for Trama scans" };
  return { ...status, phase: "idle", reason: autopilotReady(root) ? "Waiting for eligible Drifts" : "Waiting for an explicit scan or Resolve Drifts request" };
}

const coordinatorFailures = new Set<string>();
/** Projects where a live editor window did not answer the last jobs request: its jobs are unknown, so no automatic step is granted. */
const unverifiedJobs = new Set<string>();

/** Records whether every live editor window answered the last jobs request of the project; an unverified picture withholds automatic steps. */
export function setJobsVerified(root: string, verified: boolean): void {
  const key = projectRootKey(root);
  const didChange = verified ? unverifiedJobs.delete(key) : !unverifiedJobs.has(key);
  if (!verified) unverifiedJobs.add(key);
  if (didChange) changed();
}

/** Hooked terminal jobs end only when the hook reports idle or the terminal closes. */
const hooked = new Set<string>();

/** Records whether the run just started in `terminal` is followed by its agent's hook; a reused terminal's old answer no longer holds. */
export function setHooked(terminal: string, value: boolean): void {
  if (value) hooked.add(terminal);
  else hooked.delete(terminal);
}

export const isHooked = (terminal: string): boolean => hooked.has(terminal);

const idleListeners = new Set<(terminal: string, root: string) => void>();

/** The agent of `terminal`, in the project at `root`, said through its hook that it is idle. */
export function receiveAgentIdle(terminal: string, root: string): void {
  for (const listener of [...idleListeners]) listener(terminal, root);
}

export function onAgentIdle(listener: (terminal: string, root: string) => void): { dispose(): void } {
  idleListeners.add(listener);
  return { dispose: () => void idleListeners.delete(listener) };
}

/**
 * A job begins when its instruction is really written in the terminal or sent by the chat by itself; never for one left
 * ready in the chat or copied to the clipboard.
 */
export function startJob(
  kind: JobKind,
  root: string,
  place: JobPlace,
  _endVisible: boolean,
  sentAfter = chatEventSequence,
  id: string = randomUUID(),
  origin: JobOrigin = "manual",
  windowId = "",
): string | undefined {
  const job: Job = { id, kind, root, place, origin, windowId };
  if ("chat" in place && place.chat !== "other") {
    const pending = takePendingChat(root, place.chat, sentAfter);
    if (pending?.ended) return undefined;
    job.conversation = pending?.conversation;
  }
  jobs.add(job);
  const key = `${projectRootKey(root)}\n${id}`;
  knownJobs.add(key);
  jobKinds.set(key, kind);
  knownJobOrigins.set(key, origin);
  const pendingCheck = pendingChecks.get(key);
  if (pendingCheck !== undefined) {
    pendingChecks.delete(key);
    receiveCheck(pendingCheck);
  }
  changed();
  return id;
}

let chatEventSequence = 0;

export function chatJobSendStarted(root: string, chat: "cursor" | "copilot"): number {
  for (let i = pendingChats.length - 1; i >= 0; i--) {
    const pending = pendingChats[i];
    if (pending !== undefined && pending.root === root && pending.chat === chat && pending.sequence <= chatEventSequence)
      pendingChats.splice(i, 1);
  }
  return chatEventSequence;
}

function endWhere(matches: (job: Job) => boolean, abnormal?: string): Job[] {
  const ended: Job[] = [];
  for (const job of [...jobs]) {
    if (!matches(job) || !jobs.delete(job)) continue;
    if (job.kind === "scan") noteScanEnd(projectRootKey(job.root), job.id);
    if (abnormal !== undefined) abnormalEnds.set(`${projectRootKey(job.root)}\n${job.id}`, abnormal);
    ended.push(job);
  }
  if (ended.length > 0) changed();
  return ended;
}

/** Why each job ended abnormally (its command exited with a failure or status unknown, or its terminal closed), by project and job; a normal end leaves no entry. */
const abnormalEnds = new Map<string, string>();

/** The reason job `job` in the project at `root` ended abnormally, or undefined when it ended normally or is still active. */
export const jobAbnormalEnd = (root: string, job: string): string | undefined => abnormalEnds.get(`${projectRootKey(root)}\n${job}`);

/** The command Trama wrote in terminal `terminal` ended, or that terminal closed; `abnormal` says why that was not a normal end. */
export const endTerminalJobs = (terminal: string, abnormal?: string): Job[] => endWhere((j) => "terminal" in j.place && j.place.terminal === terminal, abnormal);

/** Trama chat conversations already seen in this window, by project, service and conversation. */
const seenChats = new Set<string>();

/** A conversation event that arrived while its send was still being registered, oldest first. */
const pendingChats: { root: string; chat: "cursor" | "copilot"; conversation: string; sequence: number; ended: boolean }[] = [];

/** Takes the oldest pending conversation for this chat and project that started after its send. */
function takePendingChat(root: string, chat: "cursor" | "copilot", sentAfter: number): { conversation: string; ended: boolean } | undefined {
  const taken = pendingChats.find((p) => p.root === root && p.chat === chat && p.sequence > sentAfter);
  if (taken !== undefined) pendingChats.splice(pendingChats.indexOf(taken), 1);
  return taken;
}

/** A chat conversation's first Trama prompt binds the oldest unbound job for that chat and project. */
function bindChatJobFor(chat: "cursor" | "copilot", root: string, conversation: string): void {
  const key = `${chat}\n${root}\n${conversation}`;
  if (seenChats.has(key)) return;
  seenChats.add(key);
  const sequence = ++chatEventSequence;
  for (const job of jobs) {
    if (job.root === root && "chat" in job.place && job.place.chat === chat && job.conversation === undefined) {
      job.conversation = conversation;
      changed();
      return;
    }
  }
  pendingChats.push({ root, chat, conversation, sequence, ended: false });
}

/** A new Cursor chat conversation belongs to the oldest Cursor chat job not yet bound. */
export const bindChatJob = (root: string, conversation: string): void => bindChatJobFor("cursor", root, conversation);

/** A new Copilot conversation belongs to the oldest Copilot chat job not yet bound. */
export const bindCopilotChatJob = (root: string, conversation: string): void => bindChatJobFor("copilot", root, conversation);

export const endChatJobs = (root: string, conversation: string, abnormal?: string): Job[] => endChatJobsFor("cursor", root, conversation, abnormal);
export const endCopilotChatJobs = (root: string, conversation: string): Job[] => endChatJobsFor("copilot", root, conversation);
/** The end of one Cursor or Copilot conversation ends only its own bound job; `abnormal` says why it was not a normal end. */
function endChatJobsFor(chat: "cursor" | "copilot", root: string, conversation: string, abnormal?: string): Job[] {
  const pending = pendingChats.find((p) => p.chat === chat && p.root === root && p.conversation === conversation);
  if (pending !== undefined) pending.ended = true;
  return endWhere((j) => j.root === root && j.conversation === conversation && "chat" in j.place && j.place.chat === chat, abnormal);
}


