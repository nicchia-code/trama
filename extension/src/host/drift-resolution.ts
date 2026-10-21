import { randomUUID } from "node:crypto";
import { realpathSync } from "node:fs";
import { resolve } from "node:path";

/** Trama-launched jobs, retained only in memory for their live editor windows. */
export type JobKind = "run" | "resolve" | "scan" | "prepared";

/**
 * Where a job runs: a terminal or a chat. A held job has none: it keeps the project in its state between the Runs of a
 * sequence cut by model, until `endHeldJob`.
 */
export type JobPlace = { terminal: string } | { chat: "cursor" } | { held: true };

export interface Job {
  id: string;
  kind: JobKind;
  root: string;
  place: JobPlace;
  /** The conversation that owns this chat job once its first Trama prompt binds it. */
  conversation?: string;
}


const jobs = new Set<Job>();
const listeners = new Set<() => void>();
/** The open Drifts an agent filed and the Proposals it delivered in a turn it has not finished, by project and then by `drift:<id>` or `proposal:<id>`, with the holder of that turn: its terminal, or "cursor" for Cursor's chat. Only in memory: a window that opens later forgets them. */
const filedWork = new Map<string, Map<string, string>>();

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
  return { resolving: all.some((j) => j.kind === "resolve" || j.kind === "prepared"), running: all.some((j) => j.kind === "run") };
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

/** Holds the Drift, Proposal or Task `id` of `kind` until the end of the turn of `holder`, the agent that filed or delivered it. */
function holdFiledWork(root: string, kind: "drift" | "proposal" | "task", id: string, holder: string): void {
  const key = projectRootKey(root);
  const held = filedWork.get(key) ?? new Map<string, string>();
  held.set(`${kind}:${id}`, holder);
  filedWork.set(key, held);
  changed();
}

/** The turn of `holder` ended in the project at `root`: the Drifts and Proposals it filed or delivered are no longer held. Every window that hears of it applies it. */
export function releaseFiledWork(root: string, holder: string): void {
  const held = filedWork.get(projectRootKey(root));
  if (held === undefined) return;
  let released = false;
  for (const [item, owner] of held) {
    if (owner !== holder) continue;
    held.delete(item);
    released = true;
  }
  if (released) changed();
}

/** Whether a filing message's holder is an agent this window follows: a Trama terminal it started with hooks, or Cursor's chat with a Trama job in progress here. Only such a window holds the Drift, Proposal or Task. */
export function followsAgent(root: string, holder: string): boolean {
  if (holder === "cursor") return localProjectJobs(root).some((job) => "chat" in job.place && job.place.chat === "cursor");
  return isHooked(holder);
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
    return;
  }
  if (message["type"] === "turn-ended") releaseFiledWork(root, holder);
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
  sentAfter = chatEventSequence,
  id: string = randomUUID(),
): string | undefined {
  const job: Job = { id, kind, root, place };
  if ("chat" in place) {
    const pending = takePendingChat(root, place.chat, sentAfter);
    if (pending?.ended) return undefined;
    job.conversation = pending?.conversation;
  }
  jobs.add(job);
  changed();
  return id;
}

let chatEventSequence = 0;

export function chatJobSendStarted(root: string, chat: "cursor"): number {
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

/**
 * The held job `id` in the project at `root` ends: the sequence of Runs it held has ended with its last Run, or stopped
 * (`abnormal` says why). The ends of its own Runs (`endTerminalJobs`, the chat ends) do not end it.
 */
export const endHeldJob = (root: string, id: string, abnormal?: string): Job[] =>
  endWhere((j) => j.id === id && j.root === root && "held" in j.place, abnormal);

/** The job `id` in the project at `root` ends without an abnormal outcome: its instruction never reached the agent. */
export const endUnsentJob = (root: string, id: string): Job[] =>
  endWhere((j) => j.id === id && j.root === root);

/** Trama chat conversations already seen in this window, by project, service and conversation. */
const seenChats = new Set<string>();

/** A conversation event that arrived while its send was still being registered, oldest first. */
const pendingChats: { root: string; chat: "cursor"; conversation: string; sequence: number; ended: boolean }[] = [];

/** Takes the oldest pending conversation for this chat and project that started after its send. */
function takePendingChat(root: string, chat: "cursor", sentAfter: number): { conversation: string; ended: boolean } | undefined {
  const taken = pendingChats.find((p) => p.root === root && p.chat === chat && p.sequence > sentAfter);
  if (taken !== undefined) pendingChats.splice(pendingChats.indexOf(taken), 1);
  return taken;
}

/** A chat conversation's first Trama prompt binds the oldest unbound job for that chat and project. */
function bindChatJobFor(chat: "cursor", root: string, conversation: string): void {
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

export const endChatJobs = (root: string, conversation: string, abnormal?: string): Job[] => endChatJobsFor("cursor", root, conversation, abnormal);
/** The end of one Cursor conversation ends only its own bound job; `abnormal` says why it was not a normal end. */
function endChatJobsFor(chat: "cursor", root: string, conversation: string, abnormal?: string): Job[] {
  const pending = pendingChats.find((p) => p.chat === chat && p.root === root && p.conversation === conversation);
  if (pending !== undefined) pending.ended = true;
  return endWhere((j) => j.root === root && j.conversation === conversation && "chat" in j.place && j.place.chat === chat, abnormal);
}


