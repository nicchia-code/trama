import type * as vscode from "vscode";
import { type AgentOrigin, QUIET_PERIOD_MS } from "../../../src/core/announcements";
import { questionRoundClosedAt, questionRoundOpen } from "./question-activity";

/**
 * What the jobs Trama launched from its buttons are doing, for this window only and only in memory (nothing is written
 * under `.trama/`: reopening the editor starts from Free): the Runs (Run all To do, a Task's Run, Run this design) and
 * the one Resolve Drifts, each with where it runs and when its agent was last seen working.
 */
export type JobKind = "run" | "resolve";

/** The terminal (its identity) or the chat a job runs in; a chat is Cursor's, whose turns end visibly, or another editor's. */
export type JobPlace = { terminal: string } | { chat: "cursor" | "other" };

/** The State of the `drift-resolution` Machine. */
export type DriftResolution = "free" | "running-tasks" | "resolving";

interface Job {
  kind: JobKind;
  root: string;
  place: JobPlace;
  /** Whether its end will be seen for certain; only a job whose end is not visible can end by quiet. */
  endVisible: boolean;
  lastActivity: number;
  /** The Trama conversation Cursor's chat started for this job, bound by its first prompt; until then the job waits for it. */
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

/**
 * The terminals whose current run is followed by the hook of its agent (omp's): they end when the hook says the agent is
 * idle, when the terminal closes, or when the quiet period ends (the hook may never load). The end of their command says
 * nothing about them.
 */
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
 * ready in the chat or copied to the clipboard. `endVisible` is false for an external window, a chat that is not
 * Cursor's and (until its commands are seen starting) a terminal without shell integration.
 */
export function startJob(kind: JobKind, root: string, place: JobPlace, endVisible: boolean, now = Date.now()): void {
  const job: Job = { kind, root, place, endVisible, lastActivity: now };
  if ("chat" in place && place.chat === "cursor") job.conversation = takePendingChat(root, now);
  jobs.add(job);
  changed();
}

function endWhere(matches: (job: Job) => boolean): void {
  let any = false;
  for (const job of [...jobs]) if (matches(job)) any = jobs.delete(job) || any;
  if (any) changed();
}

/** The command Trama wrote in terminal `terminal` ended, or that terminal closed. */
export const endTerminalJobs = (terminal: string): void => endWhere((j) => "terminal" in j.place && j.place.terminal === terminal);

/**
 * Cursor's chat conversations of Trama already seen in this window, by project and conversation: a job binds only to a
 * conversation that starts after its send, never to one already seen, so a later prompt of one never takes a job.
 */
const seenChats = new Set<string>();

/** A new conversation whose job is not registered yet (its send is still under way), oldest first. */
const pendingChats: { root: string; conversation: string; at: number }[] = [];

/** How long a new conversation waits for its job to be registered; ponytail: a job registered later never binds it, add a retry if that happens. */
const PENDING_CHAT_MS = 10_000;

/** Takes the oldest conversation of `root` that started within `PENDING_CHAT_MS`, dropping the expired ones. */
function takePendingChat(root: string, now: number): string | undefined {
  const live = pendingChats.filter((p) => now - p.at < PENDING_CHAT_MS);
  const taken = live.find((p) => p.root === root);
  pendingChats.splice(0, pendingChats.length, ...live.filter((p) => p !== taken));
  return taken?.conversation;
}

/**
 * Cursor's chat started a Trama conversation in the project at `root`: a conversation seen for the first time takes the
 * oldest chat job sent and not yet bound, or waits for the next one; any later prompt of it does nothing.
 */
export function bindChatJob(root: string, conversation: string, now = Date.now()): void {
  const key = `${root}\n${conversation}`;
  if (seenChats.has(key)) return;
  seenChats.add(key);
  for (const job of jobs) {
    if (job.root === root && "chat" in job.place && job.place.chat === "cursor" && job.conversation === undefined) {
      job.conversation = conversation;
      return;
    }
  }
  pendingChats.push({ root, conversation, at: now });
}

/**
 * A turn of the Trama conversation `conversation` in Cursor's chat ended, was interrupted or was closed: only the job bound
 * to it ends, and a conversation still waiting for its job is no longer a candidate for one.
 */
export function endChatJobs(root: string, conversation: string): void {
  const i = pendingChats.findIndex((p) => p.root === root && p.conversation === conversation);
  if (i >= 0) pendingChats.splice(i, 1);
  endWhere((j) => j.root === root && j.conversation === conversation && "chat" in j.place && j.place.chat === "cursor");
}

/** The command Trama wrote in terminal `terminal` was seen starting, so its end will be seen too. */
export function endIsVisible(terminal: string): void {
  for (const job of jobs) if ("terminal" in job.place && job.place.terminal === terminal) job.endVisible = true;
}

/** A command of the agent that changed something ran in `origin`: its job's quiet period starts again. */
export function noteActivity(origin: AgentOrigin, now = Date.now()): void {
  for (const job of jobs) {
    const same = origin.terminal !== undefined ? "terminal" in job.place && job.place.terminal === origin.terminal : "chat" in job.place && job.place.chat === (origin.chat ?? "other");
    if (same) job.lastActivity = now;
  }
}

/**
 * Ends the jobs whose end Trama cannot see, or whose agent has a hook, and that were left alone for the quiet period. It
 * does not run while a question round is open, and starts again when it closes.
 */
export function endQuietJobs(now = Date.now()): void {
  if (questionRoundOpen()) return;
  endWhere((j) => (!j.endVisible || ("terminal" in j.place && isHooked(j.place.terminal))) && now - Math.max(j.lastActivity, questionRoundClosedAt()) >= QUIET_PERIOD_MS);
}

const CHECK_EVERY_MS = 30_000;

/** Checks the quiet period every half minute. */
export function watchQuietJobs(): vscode.Disposable {
  const timer = setInterval(() => endQuietJobs(), CHECK_EVERY_MS);
  return { dispose: () => clearInterval(timer) };
}
