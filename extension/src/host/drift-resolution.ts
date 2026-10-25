import { randomUUID } from "node:crypto";
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import type { RunAllPlan } from "../../../src/core/run-estimate";

/** Trama-launched jobs, retained only in memory for their live editor windows. */
export type JobKind = "run" | "resolve" | "scan" | "prepared" | "unify" | "refine";

/**
 * Where a job runs: a terminal (an omp Chat conversation counts as the terminal it replaces). A held job has none: it keeps the project in its state between the Runs of a
 * sequence cut by model, until `endHeldJob`.
 */
export type JobPlace = { terminal: string } | { held: true };

/** A Run of a `Run all` as the host remembers it, in memory only. */
export interface RunAllGroup {
  /** The identity of the job the Run works as: the one its terminal or conversation starts. */
  jobId: string;
  /** The Tasks `planRuns` gave the Run at the launch. */
  tasks: readonly string[];
  /** The sub-agent places of the Run: `trama.maxParallelAgents` or its part. */
  seats: number;
  /** The terminal or conversation of the Run once it started; null until then. */
  terminal: string | null;
  /** Whether the Run's job ended. */
  ended: boolean;
}

/** What a job of a `Run all` launched from this window keeps for the time-left estimate, forgotten with the job. */
export interface RunAll {
  /** The instant of the launch, in milliseconds. */
  launchedAt: number;
  /** `trama.parallelExecution` as read at the launch. */
  parallel: boolean;
  groups: RunAllGroup[];
  /** The reference, in milliseconds from the launch, beyond which the Run all is longer than expected; null until a Run has taken its first Task. */
  reference: number | null;
  /** The plan the reference was made with, and every choice and Task seen since; null while there is no reference. */
  plan: RunAllPlan | null;
  /** The highest progress, between 0 and 0.95, already reached outside the state longer than expected; it never goes back there (`runAllProgress`). */
  progress: number;
}

export interface Job {
  id: string;
  kind: JobKind;
  root: string;
  place: JobPlace;
  /** The Drifts a `unify` job gathered when its instruction was sent, in creation order: the Board marks their cards as being unified. */
  drifts?: readonly string[];
  /** Set only on the job that stands for a `Run all`: the held job of a sequence cut by model, or the job of the only Run. */
  runAll?: RunAll;
}


const jobs = new Set<Job>();
const listeners = new Set<() => void>();
/** The open Drifts an agent filed and the Proposals it delivered in a turn it has not finished, by project and then by `drift:<id>`, `proposal:<id>` or `task:<id>`, with the holder of that turn: its terminal (or omp Chat conversation). Only in memory: a window that opens later forgets them. */
const filedWork = new Map<string, Map<string, { holder: string }>>();

const changed = () => {
  for (const listener of [...listeners]) listener();
};

function projectRootKey(root: string): string {
  let canonical = resolve(root);
  try { canonical = realpathSync(canonical); } catch { /* The path remains a stable fallback when absent. */ }
  return process.platform === "win32" ? canonical.toLowerCase() : canonical;
}

export function localProjectJobs(root: string): Job[] {
  const key = projectRootKey(root);
  return [...jobs].filter((job) => projectRootKey(job.root) === key);
}

/** Which of Drift resolution and a run are going in this window; both may hold at once. Resolve Drifts and Runs are exclusive; scans do not block manual actions. Only this window's own jobs count: it does not see the jobs of other editor windows or of agents started outside Trama. */
export function driftWork(root?: string): { resolving: boolean; running: boolean } {
  const all = root === undefined ? [...jobs] : localProjectJobs(root);
  return { resolving: all.some((j) => j.kind === "resolve" || j.kind === "prepared" || j.kind === "unify"), running: all.some((j) => j.kind === "run") };
}

/** The Drifts the Unify Drifts jobs of this window, in the project at `root`, are working on. */
export function unifyingDrifts(root: string): string[] {
  return localProjectJobs(root).filter((j) => j.kind === "unify").flatMap((j) => [...(j.drifts ?? [])]);
}

/** The panel and the launches hear of every change of `driftWork()`. */
export function onDriftResolutionChange(listener: () => void): { dispose(): void } {
  listeners.add(listener);
  return { dispose: () => void listeners.delete(listener) };
}

/** The open Drifts an agent filed in a turn it has not finished, in the project at `root`. */
export function driftsFinishing(root: string): string[] {
  return finishingOf(root, "drift");
}

/** The Proposals an agent delivered in a turn it has not finished, in the project at `root`. */
export function proposalsFinishing(root: string): string[] {
  return finishingOf(root, "proposal");
}

/** The Tasks an agent filed in a turn it has not finished, in the project at `root`. */
export function tasksFinishing(root: string): string[] {
  return finishingOf(root, "task");
}

function finishingOf(root: string, kind: "drift" | "proposal" | "task"): string[] {
  const prefix = `${kind}:`;
  return [...(filedWork.get(projectRootKey(root))?.keys() ?? [])].filter((key) => key.startsWith(prefix)).map((key) => key.slice(prefix.length));
}

/** Holds the Drift, Proposal or Task `id` of `kind` until the end of the turn of `holder`, the agent terminal (or omp Chat conversation) that filed or delivered it. */
function holdFiledWork(root: string, kind: "drift" | "proposal" | "task", id: string, holder: string): void {
  const key = projectRootKey(root);
  const held = filedWork.get(key) ?? new Map<string, { holder: string }>();
  held.set(`${kind}:${id}`, { holder });
  filedWork.set(key, held);
  changed();
}

/**
 * The turn of `holder` ended in the project at `root`: the Drifts, Proposals and Tasks it filed or delivered are no longer
 * held. Every window that hears of it applies it.
 */
export function releaseFiledWork(root: string, holder: string): void {
  const held = filedWork.get(projectRootKey(root));
  if (held === undefined) return;
  let released = false;
  for (const [item, owner] of held) {
    if (owner.holder !== holder) continue;
    held.delete(item);
    released = true;
  }
  if (released) changed();
}

const jobFollowers = new Set<(holder: string) => boolean>();

/** Adds what follows the job conversations of omp Chat of this window: they are followed by their own turn end, not by the hook. Returns what removes it. */
export function addJobFollower(follower: (holder: string) => boolean): { dispose(): void } {
  jobFollowers.add(follower);
  return { dispose: () => void jobFollowers.delete(follower) };
}

/** Whether a filing message's holder is an agent this window follows for a job: a Trama terminal with its hook, or an omp Chat conversation of a job that has not ended. Only such a window holds the Drift, Proposal or Task. */
export function followsAgent(_root: string, holder: string): boolean {
  return isHooked(holder) || [...jobFollowers].some((follows) => follows(holder));
}

/** Applies a notice that a command or another editor window of the project sent: an agent filed a Drift or Task or delivered a Proposal, or its turn ended. */
export function receiveNotice(message: Record<string, unknown>): void {
  const root = message["root"];
  const holder = message["holder"];
  if (typeof root !== "string" || typeof holder !== "string") return;
  if (message["type"] === "drift-filed" || message["type"] === "proposal-delivered" || message["type"] === "task-filed") {
    const kind = message["type"] === "drift-filed" ? "drift" : message["type"] === "task-filed" ? "task" : "proposal";
    const id = message[kind];
    if (typeof id === "string") holdFiledWork(root, kind, id, holder);
    if (kind === "proposal" && typeof id === "string") for (const listener of deliveryListeners) listener(root, id);
    return;
  }
  if (message["type"] === "turn-ended") releaseFiledWork(root, holder);
}

/** Listeners of a Proposal delivered to a project: the Proposal refinement hears of it. */
const deliveryListeners = new Set<(root: string, proposal: string) => void>();
/** Calls `listener` each time a Proposal of the project at `root` is delivered; disposing it stops that. */
export function onProposalDelivered(listener: (root: string, proposal: string) => void): { dispose(): void } {
  deliveryListeners.add(listener);
  return { dispose: () => void deliveryListeners.delete(listener) };
}

/** Hooked terminal jobs end only when the hook reports idle or the terminal closes. A conversation is never hooked: its job ends at its turn end. */
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

const startedListeners = new Set<(terminal: string, pid: number, root: string) => void>();

/** The hook of the agent in `terminal`, in the project at `root`, said which process the agent is (`agent-hook.STARTED`). */
export function receiveAgentStarted(terminal: string, pid: number, root: string): void {
  for (const listener of [...startedListeners]) listener(terminal, pid, root);
}

export function onAgentStarted(listener: (terminal: string, pid: number, root: string) => void): { dispose(): void } {
  startedListeners.add(listener);
  return { dispose: () => void startedListeners.delete(listener) };
}

/**
 * A job begins when its instruction is really written in the terminal or sent to the omp Chat conversation by itself; never for one left
 * copied to the clipboard.
 */
export function startJob(kind: JobKind, root: string, place: JobPlace, id: string = randomUUID(), drifts: readonly string[] = [], runAll?: RunAll): string | undefined {
  const job: Job = { id, kind, root, place, ...(drifts.length > 0 ? { drifts } : {}), ...(runAll === undefined ? {} : { runAll }) };
  jobs.add(job);
  // The Run of a `Run all` that starts now: its group learns the terminal or conversation it works in.
  if ("terminal" in place) {
    for (const other of localProjectJobs(root)) {
      const group = other.runAll?.groups.find((g) => g.jobId === id);
      if (group !== undefined) group.terminal = place.terminal;
    }
  }
  changed();
  return id;
}

/** The job of the `Run all` this window launched in the project at `root`, if one is going. */
export function runAllJob(root: string): (Job & { runAll: RunAll }) | undefined {
  return localProjectJobs(root).find((job): job is Job & { runAll: RunAll } => job.runAll !== undefined);
}

function endWhere(matches: (job: Job) => boolean, abnormal?: string): Job[] {
  const ended: Job[] = [];
  for (const job of [...jobs]) {
    if (!matches(job) || !jobs.delete(job)) continue;
    if (abnormal !== undefined) abnormalEnds.set(`${projectRootKey(job.root)}\n${job.id}`, abnormal);
    for (const other of localProjectJobs(job.root)) {
      const group = other.runAll?.groups.find((g) => g.jobId === job.id);
      if (group !== undefined) group.ended = true;
    }
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

/**
 * The held job `id` in the project at `root` ends: the sequence of Runs it held has ended with its last Run, or stopped
 * (`abnormal` says why). The ends of its own Runs (`endTerminalJobs`) do not end it.
 */
export const endHeldJob = (root: string, id: string, abnormal?: string): Job[] =>
  endWhere((j) => j.id === id && j.root === root && "held" in j.place, abnormal);

/** The job `id` in the project at `root` ends without an abnormal outcome: its instruction never reached the agent. */
export const endUnsentJob = (root: string, id: string): Job[] =>
  endWhere((j) => j.id === id && j.root === root);

/** Whether this window has a job in its registry, optionally one that `matches`: the execution check has something to look at. */
export const hasJobs = (matches: (job: Job) => boolean = () => true): boolean => [...jobs].some(matches);

const followingListeners = new Set<(subject: string, reason: string, details?: string) => void>();

/** The Board hears when the run control stops following a job (its terminal name or the one a chat job would have) or releases a Task (`T3 Title`), with the reason (`ui#agents`) and, for a conversation whose omp ended, the last lines of omp's error output. Only the window that made the check reports it. */
export function onStoppedFollowing(listener: (subject: string, reason: string, details?: string) => void): { dispose(): void } {
  followingListeners.add(listener);
  return { dispose: () => void followingListeners.delete(listener) };
}

export function reportStoppedFollowing(subject: string, reason: string, details?: string): void {
  for (const listener of [...followingListeners]) listener(subject, reason, details);
}

const agentStoppedListeners = new Set<(job: string, reason: string) => void>();

/** The Board hears when the agent of a conversation's job stopped abnormally: the model refused, a limit was reached or omp refused the prompt. */
export function onAgentStopped(listener: (job: string, reason: string) => void): { dispose(): void } {
  agentStoppedListeners.add(listener);
  return { dispose: () => void agentStoppedListeners.delete(listener) };
}

export function reportAgentStopped(job: string, reason: string): void {
  for (const listener of [...agentStoppedListeners]) listener(job, reason);
}
