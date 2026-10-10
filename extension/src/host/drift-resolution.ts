/**
 * What the jobs Trama launched from its buttons are doing, for this window only and only in memory (nothing is written
 * under `.trama/`: reopening the editor starts from Free): the Runs (Run all To do, a Task's Run, Run this design) and
 * the one Resolve Drifts, each with where it runs.
 */
export type JobKind = "run" | "resolve";


export type JobPlace = { terminal: string } | { chat: "cursor" | "copilot" | "other" };

/** The State of the `drift-resolution` Machine. */
export type DriftResolution = "free" | "running-tasks" | "resolving";

interface Job {
  kind: JobKind;
  root: string;
  place: JobPlace;
  /** The conversation that owns this chat job once its first Trama prompt binds it. */
  conversation?: string;
}

const jobs = new Set<Job>();
const listeners = new Set<() => void>();

const changed = () => {
  for (const listener of [...listeners]) listener();
};

/** Where the window stands: Resolving while Resolve Drifts works, Running tasks while any Run has not finished, otherwise Free. */
export function driftResolution(): DriftResolution {
  const all = [...jobs];
  return all.some((j) => j.kind === "resolve") ? "resolving" : all.length > 0 ? "running-tasks" : "free";
}

/** The panel and the launches hear of every change of `driftResolution()`. */
export function onDriftResolutionChange(listener: () => void): { dispose(): void } {
  listeners.add(listener);
  return { dispose: () => void listeners.delete(listener) };
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
export function startJob(kind: JobKind, root: string, place: JobPlace, _endVisible: boolean, sentAfter = chatEventSequence): void {
  const job: Job = { kind, root, place };
  if ("chat" in place && place.chat !== "other") {
    const pending = takePendingChat(root, place.chat, sentAfter);
    if (pending?.ended) return;
    job.conversation = pending?.conversation;
  }
  jobs.add(job);
  changed();
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

function endWhere(matches: (job: Job) => boolean): void {
  let any = false;
  for (const job of [...jobs]) if (matches(job)) any = jobs.delete(job) || any;
  if (any) changed();
}

/** The command Trama wrote in terminal `terminal` ended, or that terminal closed. */
export const endTerminalJobs = (terminal: string): void => endWhere((j) => "terminal" in j.place && j.place.terminal === terminal);

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

/** The end of one Cursor or Copilot conversation ends only its own bound job. */
function endChatJobsFor(chat: "cursor" | "copilot", root: string, conversation: string): void {
  const pending = pendingChats.find((p) => p.chat === chat && p.root === root && p.conversation === conversation);
  if (pending !== undefined) pending.ended = true;
  endWhere((j) => j.root === root && j.conversation === conversation && "chat" in j.place && j.place.chat === chat);
}

export const endChatJobs = (root: string, conversation: string): void => endChatJobsFor("cursor", root, conversation);
export const endCopilotChatJobs = (root: string, conversation: string): void => endChatJobsFor("copilot", root, conversation);


