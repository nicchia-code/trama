import { randomUUID } from "node:crypto";
import { realpathSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { bindConversation } from "../../../src/core/announcements";
import { LEFT_OUT } from "../../../src/core/compared";
import { type ChangedFile, type ChatState, type CursorChatEvent, workingTreeSnapshot } from "../../../src/core/cursor-chat";
import { projectAt } from "../../../src/core/store";
import { getTask } from "../../../src/core/work";

/** Trama-launched jobs, retained only in memory for their live editor windows. */
export type JobKind = "run" | "resolve" | "scan" | "prepared" | "unify";

/**
 * Where a job runs: a terminal or a chat. A held job has none: it keeps the project in its state between the Runs of a
 * sequence cut by model, until `endHeldJob`.
 */
export type JobPlace = { terminal: string } | { chat: "cursor" } | { held: true };

export interface Job {
  id: string;
  kind: JobKind;
  /** The instant the job began (`Date.now()`), in memory only: the execution check of a chat job waits a minute from it for the job to bind a conversation. */
  started: number;
  root: string;
  place: JobPlace;
  /** The conversation that owns this chat job once its first Trama prompt binds it. */
  conversation?: string;
  /** The announcement written for this chat job's launch; it learns the conversation when the job does. */
  announcement?: string;
  /** A chat Run with the Advisor Scanner on: the Advisor of the chat watches its agents once the job knows the conversation. */
  advisor?: boolean;
  /** The Drifts a `unify` job gathered when its instruction was sent, in creation order: the Board marks their cards as being unified. */
  drifts?: readonly string[];
}

/** Writes the job's conversation into its launch announcement, if that one still waits. A failure leaves it as it is: the announcement is only a hint for the Board. */
function bindAnnouncement(job: Job): void {
  if (job.announcement === undefined || job.conversation === undefined) return;
  try {
    bindConversation(projectAt(job.root), job.announcement, job.conversation);
  } catch {
    // Unreadable or being rewritten: the announcement keeps no conversation.
  }
}


const jobs = new Set<Job>();
const listeners = new Set<() => void>();
/** The open Drifts an agent filed and the Proposals it delivered in a turn it has not finished, by project and then by `drift:<id>` or `proposal:<id>`, with the holder of that turn: its terminal, or "cursor" for Cursor's chat, and the conversation that filed it when the chat said which. Only in memory: a window that opens later forgets them. */
const filedWork = new Map<string, Map<string, { holder: string; conversation?: string }>>();
/** The Trama conversations of Cursor's chat with a turn in progress in this window, by project. */
const chatTurns = new Map<string, Set<string>>();

const changed = () => {
  for (const listener of [...listeners]) listener();
  publishChatStateNow();
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

/** Holds the Drift, Proposal or Task `id` of `kind` until the end of the turn of `holder` (of its `conversation`, for a chat), the agent that filed or delivered it. */
function holdFiledWork(root: string, kind: "drift" | "proposal" | "task", id: string, holder: string, conversation?: string): void {
  const key = projectRootKey(root);
  const held = filedWork.get(key) ?? new Map<string, { holder: string; conversation?: string }>();
  held.set(`${kind}:${id}`, conversation === undefined ? { holder } : { holder, conversation });
  filedWork.set(key, held);
  changed();
}

/**
 * The turn of `holder` ended in the project at `root`: the Drifts, Proposals and Tasks it filed or delivered are no longer
 * held. With a `conversation`, only the cards that conversation filed and those a chat filed without saying which
 * conversation are released. Every window that hears of it applies it.
 */
export function releaseFiledWork(root: string, holder: string, conversation?: string): void {
  const held = filedWork.get(projectRootKey(root));
  if (held === undefined) return;
  let released = false;
  for (const [item, owner] of held) {
    if (owner.holder !== holder) continue;
    if (conversation !== undefined && owner.conversation !== undefined && owner.conversation !== conversation) continue;
    held.delete(item);
    released = true;
  }
  if (released) changed();
}

/** A turn of `conversation` started in Cursor's chat for the project at `root`. */
export function chatTurnStarted(root: string, conversation: string): void {
  const key = projectRootKey(root);
  const turns = chatTurns.get(key) ?? new Set<string>();
  turns.add(conversation);
  chatTurns.set(key, turns);
}

/** The turn of `conversation` ended, was interrupted, or the conversation was closed. */
export function chatTurnEnded(root: string, conversation: string): void {
  chatTurns.get(projectRootKey(root))?.delete(conversation);
}

/**
 * Whether a filing message's holder is an agent this window follows: a Trama terminal it started with hooks; or Cursor's
 * chat, when its conversation has a turn in progress here (or, without a conversation, any Trama conversation of the
 * project has). Only such a window holds the Drift, Proposal or Task.
 */
export function followsAgent(root: string, holder: string, conversation?: string): boolean {
  if (holder === "cursor") {
    const turns = chatTurns.get(projectRootKey(root));
    return conversation === undefined ? turns !== undefined && turns.size > 0 : turns?.has(conversation) === true;
  }
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
    const conversation = message["conversation"];
    if (typeof id === "string") holdFiledWork(root, kind, id, holder, typeof conversation === "string" ? conversation : undefined);
    return;
  }
  if (message["type"] === "turn-ended") {
    const conversation = message["conversation"];
    releaseFiledWork(root, holder, typeof conversation === "string" ? conversation : undefined);
  }
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
 * A job begins when its instruction is really written in the terminal or sent by the chat by itself; never for one left
 * ready in the chat or copied to the clipboard.
 */
export function startJob(
  kind: JobKind,
  root: string,
  place: JobPlace,
  sentAfter = chatEventSequence,
  id: string = randomUUID(),
  announcement?: string,
  advisor = false,
  drifts: readonly string[] = [],
): string | undefined {
  const job: Job = { id, kind, root, place, started: Date.now(), ...(announcement !== undefined ? { announcement } : {}), ...(advisor ? { advisor } : {}), ...(drifts.length > 0 ? { drifts } : {}) };
  if ("chat" in place) {
    const pending = takePendingChat(root, place.chat, sentAfter);
    if (pending?.ended) return undefined;
    job.conversation = pending?.conversation;
  }
  bindAnnouncement(job);
  jobs.add(job);
  watchJob(job);
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
    unwatchJob(job);
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

/** How long after its start a chat job may wait for its conversation before the execution check closes it. */
export const CHAT_BIND_WAIT_MS = 60_000;

/** Whether this window has any job in its registry: the execution check has something to look at. */
export const hasJobs = (): boolean => jobs.size > 0;

/**
 * `time.CHECK_DUE` for the chat jobs of this window: every chat job started at least `CHAT_BIND_WAIT_MS` before `now` that
 * no conversation has bound is closed as an abnormal end, as if it had never started (a conversation arriving later
 * cannot bind it: the job is gone). A job already bound is never touched: its end follows its conversation.
 */
export const endUnboundChatJobs = (now: number = Date.now()): Job[] =>
  endWhere((j) => "chat" in j.place && j.conversation === undefined && now - j.started >= CHAT_BIND_WAIT_MS, "its chat never bound a conversation");

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
      bindAnnouncement(job);
      watchJob(job);
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



/*
 * The Advisor of the chat (machine `chat-advisor`, `rules#chat-advisor`): Trama's own advisor for a Run in Cursor's chat
 * with the Advisor Scanner on. It lives here, with the jobs: bound to the Run's job and its conversation, it follows
 * every agent it watches (the Run's main agent from the moment its job learns the conversation; a sub-agent from the
 * moment it takes a Task) and asks them, through Cursor's hooks, to start the `trama-advisor` sub-agent. Everything is in
 * memory: the notes, the requests and the photographs are lost when the editor restarts. Only the state file of the hooks
 * (`ChatState`, published to `setChatStatePublisher`) goes to disk, and it holds identities and flags only.
 */

/** Why a Run of the chat ended without the final review's result (`ui#chat-advisor`). */
export type FinalReviewMissing = "the run was interrupted" | "the turn ended before Trama could ask for it" | "the agent did not wait for the review";

/** The Advisor asks for a Task's or the final review at most this many times for the same agent. */
const MAX_REVIEW_REQUESTS = 3;

/** Paths that never count as changes: Trama's own, what it installs (`LEFT_OUT`) and Cursor's sub-agent definitions. */
const NOT_CHANGES = [...LEFT_OUT, ".cursor/agents"];
const countsAsChange = (path: string): boolean => !NOT_CHANGES.some((dir) => path === dir || path.startsWith(`${dir}/`));

type AdvisorPhase = "listening" | "reviewing" | "task-review" | "task-fix" | "final-review" | "final-fix" | "finished" | "finished-no-final";
type RequestKind = "continuous" | "task" | "final";

interface WatchedAgent {
  /** The conversation whose hooks are this agent's: the main conversation, or the sub-agent's own. */
  id: string;
  root: string;
  job: string;
  kind: "main" | "sub";
  /** The main agent's conversation (the agent's own for the main agent). */
  conversation: string;
  /** A sub-agent's Task, as its permanent identity when the Task could be read. */
  task?: string;
  /** The call that launched a sub-agent, when the hook said so. */
  call?: string;
  phase: AdvisorPhase;
  /** Every request made for this agent, by identity; a request that is not active has its result ignored. */
  requests: Map<string, { kind: RequestKind; active: boolean }>;
  notes: string[];
  /** Changed files not covered by any request yet. */
  unreviewed: Set<string>;
  /** The last photograph of the working tree, by path (undefined for a removed file). */
  snapshot: Map<string, string | undefined>;
  /** How many Task or final reviews were asked for. */
  asked: number;
  /** A text waiting for the agent's next tool (a request for a round of continuous review). */
  text?: string;
  /** The main agent's transcript path, as Cursor gave it (never read, only measured). */
  transcript?: string;
  /** The size in bytes of the transcript when the previous round was asked for: where the next round's conversation starts. */
  position: number;
  /** The turn was continued with a final review and the agent has not sent its next prompt yet. */
  continued: boolean;
}

const watched = new Map<string, WatchedAgent>();
/** The running sub-agent calls of watched main agents, by project: the call, the conversation that launched it, its kind, and whether a watched sub-agent has taken it. */
const subagentCalls = new Map<string, { call: string; conversation: string; type?: string; claimed: boolean }[]>();
/** Why each Run ended without its final review, by project and job. */
const finalReviewMissing = new Map<string, string>();

const agentKey = (root: string, id: string): string => `${projectRootKey(root)}\n${id}`;

/** The reason job `job` in the project at `root` ended without the Advisor's final review, or undefined when it had it or it does not apply. */
export const jobFinalReviewMissing = (root: string, job: string): FinalReviewMissing | undefined =>
  finalReviewMissing.get(`${projectRootKey(root)}\n${job}`) as FinalReviewMissing | undefined;
const missingListeners = new Set<(reason: FinalReviewMissing) => void>();

/** The Board hears once for every Run of the chat that ends without the Advisor's final review, with the reason (`ui#chat-advisor`). */
export function onFinalReviewMissing(listener: (reason: FinalReviewMissing) => void): { dispose(): void } {
  missingListeners.add(listener);
  return { dispose: () => void missingListeners.delete(listener) };
}

const followingListeners = new Set<(subject: string, reason: string) => void>();

/** The Board hears when the run control stops following a job (its terminal name or the one a chat job would have) or releases a Task (`T3 Title`), with the reason (`ui#agents`). Only the window that made the check reports it. */
export function onStoppedFollowing(listener: (subject: string, reason: string) => void): { dispose(): void } {
  followingListeners.add(listener);
  return { dispose: () => void followingListeners.delete(listener) };
}

export function reportStoppedFollowing(subject: string, reason: string): void {
  for (const listener of [...followingListeners]) listener(subject, reason);
}

/** The photograph of the working tree the Advisor starts every watched agent from (replaced in tests). */
let takeSnapshot: (root: string) => ChangedFile[] | null = workingTreeSnapshot;
export function setSnapshotSource(source: (root: string) => ChangedFile[] | null): void {
  takeSnapshot = source;
}

/** Where the window's chat state goes: the host sets it to `publishChatState`. */
let statePublisher: ((state: ChatState | undefined) => void) | undefined;
let publishedState = "";
let publishedRoot: string | undefined;

export function setChatStatePublisher(publisher: ((state: ChatState | undefined) => void) | undefined): void {
  statePublisher = publisher;
  publishedState = "";
  publishChatStateNow();
}

/** What this window knows for Cursor's hooks about the project at `root`: its Trama conversations with their jobs, the calls of sub-agents and every agent the Advisor watches. */
export function chatStateOf(root: string): ChatState {
  const key = projectRootKey(root);
  const conversations: ChatState["conversations"] = [];
  for (const job of jobs) {
    if (projectRootKey(job.root) !== key || !("chat" in job.place) || job.conversation === undefined) continue;
    if (conversations.some((c) => c.conversation === job.conversation)) continue;
    const main = watched.get(agentKey(root, job.conversation));
    conversations.push({ conversation: job.conversation, job: job.id, advisor: main !== undefined && !main.phase.startsWith("finished") });
  }
  const live = [...watched.values()].filter((a) => projectRootKey(a.root) === key && !a.phase.startsWith("finished"));
  return {
    root,
    conversations,
    subagents: (subagentCalls.get(key) ?? []).map((c) => ({ call: c.call, conversation: c.conversation })),
    agents: live.map((a) => ({ agent: a.id, text: a.text !== undefined })),
  };
}

/** Publishes the chat state when it changed: the window's roots are its own jobs, watched agents and sub-agent calls. */
function publishChatStateNow(): void {
  if (statePublisher === undefined) return;
  const roots = new Map<string, string>();
  for (const job of jobs) if ("chat" in job.place) roots.set(projectRootKey(job.root), job.root);
  for (const agent of watched.values()) roots.set(projectRootKey(agent.root), agent.root);
  const root = [...roots.values()][0] ?? publishedRoot;
  if (root === undefined) return;
  publishedRoot = root;
  const state = chatStateOf(root);
  const serialized = JSON.stringify(state);
  if (serialized === publishedState) return;
  publishedState = serialized;
  statePublisher(state);
}

const newReview = (): string => randomUUID().slice(0, 8);

function request(agent: WatchedAgent, kind: RequestKind): string {
  // A Task or final review covers all the agent's work: every continuous review still going no longer counts.
  if (kind !== "continuous") for (const r of agent.requests.values()) r.active = false;
  const id = newReview();
  agent.requests.set(id, { kind, active: true });
  return id;
}

/** The transcript Cursor gave for a main agent's conversation, kept for its rounds; a sub-agent's is derived from it (`transcriptOf`). */
function noteTranscript(agent: WatchedAgent, e: CursorChatEvent): void {
  if (agent.kind === "main" && e.transcript !== undefined) agent.transcript = e.transcript;
}

/** The path of an agent's transcript: Cursor's for the main agent; for a sub-agent, `subagents/<its conversation>.jsonl` in the folder of the main conversation's transcript. Undefined when the main one is not known. */
function transcriptOf(agent: WatchedAgent): string | undefined {
  if (agent.kind === "main") return agent.transcript;
  const main = watchedAgent(agent.root, agent.conversation)?.transcript;
  return main === undefined ? undefined : join(dirname(main), "subagents", `${agent.id}.jsonl`);
}

/**
 * The request of a round of continuous review: the files changed since the last round and, when the transcript exists,
 * where the agent's conversation since then starts. The size of the file (metadata only, never its content) is the
 * position of the next round. The files not yet reviewed are covered, so they are cleared.
 */
function roundText(agent: WatchedAgent): string {
  const files = [...agent.unreviewed].sort();
  agent.unreviewed.clear();
  const review = request(agent, "continuous");
  let conversation = "";
  const path = transcriptOf(agent);
  if (path !== undefined) {
    try {
      const stat = statSync(path);
      if (stat.isFile()) {
        conversation = ` Your conversation since the last review: ${path} from byte ${agent.position}.`;
        agent.position = stat.size;
      }
    } catch { /* A missing or unreadable transcript leaves the round to the files. */ }
  }
  return `Trama's Advisor: start the trama-advisor sub-agent with run_in_background for review ${review} of these changes and keep working; do not wait for it or check on it, Cursor delivers its result to you. Changed files: ${files.join(", ")}.${conversation}`;
}
const notesText = (note: string): string =>
  `Trama's Advisor found that your Task's code drifts from the Model or the Requirements; fix it before you move the Task to Done: ${note}`;

/** What follows a Task or final review request: the notes not yet delivered and the files not yet reviewed. Both are covered by the request, so they are cleared. */
function undelivered(agent: WatchedAgent): string {
  const parts = agent.notes.map(notesText);
  if (agent.unreviewed.size > 0) parts.push(`Files not yet reviewed: ${[...agent.unreviewed].sort().join(", ")}.`);
  agent.notes = [];
  agent.unreviewed.clear();
  agent.text = undefined;
  return parts.length === 0 ? "" : `\n${parts.join("\n")}`;
}

function taskReviewText(agent: WatchedAgent): string {
  agent.phase = "task-review";
  agent.asked++;
  const review = request(agent, "task");
  return `Trama's Advisor: before you return, have the trama-advisor sub-agent, in the foreground, do review ${review} of your whole Task ${agent.task ?? ""} and wait for its result; fix what it reports. Ignore the result of any earlier background review.${undelivered(agent)}`;
}

function finalReviewText(agent: WatchedAgent): string {
  agent.phase = "final-review";
  agent.asked++;
  agent.continued = true;
  const review = request(agent, "final");
  return `Trama's Advisor: before you finish, have the trama-advisor sub-agent, in the foreground, do review ${review} of the whole run and wait for its result; fix what it reports. Ignore the result of any earlier background review.${undelivered(agent)}`;
}

/** The Advisor stops watching a sub-agent, or the main agent is done: no more requests; a Run's missing final review is recorded with its reason. */
function finishAgent(agent: WatchedAgent, missing?: FinalReviewMissing): void {
  agent.text = undefined;
  agent.notes = [];
  agent.unreviewed.clear();
  if (agent.kind === "sub") {
    watched.delete(agentKey(agent.root, agent.id));
    releaseCall(agent.root, agent.call);
    return;
  }
  if (missing === undefined) { agent.phase = "finished"; return; }
  agent.phase = "finished-no-final";
  const key = `${projectRootKey(agent.root)}\n${agent.job}`;
  const first = !finalReviewMissing.has(key);
  finalReviewMissing.set(key, missing);
  changed();
  if (first) for (const listener of [...missingListeners]) listener(missing);
}

function releaseCall(root: string, call: string | undefined): void {
  if (call === undefined) return;
  const key = projectRootKey(root);
  const calls = subagentCalls.get(key);
  const left = calls?.filter((c) => c.call !== call);
  if (calls !== undefined && left !== undefined && left.length !== calls.length) subagentCalls.set(key, left);
}

function newAgent(root: string, job: string, id: string, kind: "main" | "sub", conversation: string): WatchedAgent {
  const agent: WatchedAgent = { id, root, job, kind, conversation, phase: "listening", requests: new Map(), notes: [], unreviewed: new Set(), snapshot: new Map(), asked: 0, position: 0, continued: false };
  for (const file of takeSnapshot(root) ?? []) agent.snapshot.set(file.path, file.hash);
  watched.set(agentKey(root, id), agent);
  return agent;
}

/** The main agent of a Run with the Advisor Scanner on is watched from the moment its job learns the conversation. */
function watchJob(job: Job): void {
  if (job.advisor !== true || job.conversation === undefined || !("chat" in job.place)) return;
  if (watched.has(agentKey(job.root, job.conversation))) return;
  newAgent(job.root, job.id, job.conversation, "main", job.conversation);
}

/** The Advisor stops watching the agents of an ended job; the end Events of the conversation already recorded a missing final review. */
function unwatchJob(job: Job): void {
  for (const agent of [...watched.values()]) {
    if (agent.job !== job.id || projectRootKey(agent.root) !== projectRootKey(job.root)) continue;
    watched.delete(agentKey(agent.root, agent.id));
    releaseCall(agent.root, agent.call);
  }
  subagentCalls.delete(projectRootKey(job.root));
}

/** The agent a hook of `conversation` belongs to, if the Advisor watches it. */
const watchedAgent = (root: string, conversation: string): WatchedAgent | undefined => watched.get(agentKey(root, conversation));

/** A sub-agent of a watched main agent started: the host binds its call to the conversation that launched it. */
export function chatAdvisorSubagentStarted(root: string, parent: string, call: string | undefined, type: string | undefined): void {
  if (call === undefined) return;
  const main = watchedAgent(root, parent);
  if (main === undefined || main.kind !== "main" || main.phase.startsWith("finished")) return;
  const key = projectRootKey(root);
  const calls = subagentCalls.get(key) ?? [];
  if (calls.some((c) => c.call === call)) return;
  calls.push({ call, conversation: parent, ...(type === undefined ? {} : { type }), claimed: false });
  subagentCalls.set(key, calls);
  publishChatStateNow();
}

/** `conversation` ran `task move <task> doing`: a sub-agent of a watched main agent that takes a Task is watched from now on. */
export function chatAdvisorTaskTaken(root: string, conversation: string, task: string): void {
  if (watchedAgent(root, conversation) !== undefined) {
    const agent = watchedAgent(root, conversation);
    if (agent?.kind === "sub") agent.task = resolveTask(root, task);
    return;
  }
  const key = projectRootKey(root);
  // A conversation the host knows as a job's conversation is a main agent, not a sub-agent.
  for (const job of jobs) if (projectRootKey(job.root) === key && job.conversation === conversation) return;
  const mains = [...watched.values()].filter((a) => a.kind === "main" && projectRootKey(a.root) === key && !a.phase.startsWith("finished"));
  let parent: WatchedAgent | undefined;
  let call: { call: string; claimed: boolean } | undefined;
  for (const main of mains) {
    call = (subagentCalls.get(key) ?? []).find((c) => c.conversation === main.id && !c.claimed && c.type !== "trama-advisor");
    if (call !== undefined) { parent = main; break; }
  }
  // Without a call to claim, the only main agent of the project is the one that launched it.
  if (parent === undefined && mains.length === 1) parent = mains[0];
  if (parent === undefined) return;
  const agent = newAgent(root, parent.job, conversation, "sub", parent.id);
  agent.task = resolveTask(root, task);
  if (call !== undefined) { call.claimed = true; agent.call = call.call; }
  publishChatStateNow();
}

function resolveTask(root: string, task: string): string {
  try { return getTask(projectAt(root), task, true).id; } catch { return task; }
}

/** The changed paths, relative to the project, that an Event brings and the agent's last photograph had not seen in that state; the photograph follows. */
function changedFiles(agent: WatchedAgent, e: CursorChatEvent): string[] {
  const out: string[] = [];
  for (const file of e.files ?? []) if (countsAsChange(file)) out.push(file);
  for (const file of e.snapshot ?? []) {
    if (!agent.snapshot.has(file.path) || agent.snapshot.get(file.path) !== file.hash) {
      agent.snapshot.set(file.path, file.hash);
      if (countsAsChange(file.path)) out.push(file.path);
    }
  }
  return out;
}

/**
 * The Advisor's answer to a `cursor-chat` Event: the text for the agent when there is one (a follow-up message for
 * `SUBAGENT_STOPPED` and `TURN_FINISHING`, the result's extra context for `TOOL_FINISHED`).
 */
export function chatAdvisorEvent(e: CursorChatEvent): string | undefined {
  switch (e.event) {
    case "FILES_CHANGED": {
      const agent = watchedAgent(e.root, e.conversation);
      if (agent === undefined) return undefined;
      noteTranscript(agent, e);
      const files = changedFiles(agent, e);
      if (files.length === 0) return undefined;
      // A round is asked for only while none is going; the files that come meanwhile wait for the next one. A Task's or final review in progress already covers them.
      if (agent.phase === "listening" || agent.phase === "reviewing" || agent.phase === "task-fix" || agent.phase === "final-fix") for (const f of files) agent.unreviewed.add(f);
      if (agent.phase === "listening") {
        agent.text = roundText(agent);
        agent.phase = "reviewing";
      }
      publishChatStateNow();
      return undefined;
    }
    case "TOOL_FINISHED": {
      const agent = watchedAgent(e.root, e.conversation);
      if (agent === undefined) return undefined;
      noteTranscript(agent, e);
      let text: string | undefined;
      if (agent.text !== undefined) {
        text = agent.text;
        agent.text = undefined;
      }
      publishChatStateNow();
      return text;
    }
    case "SUBAGENT_STOPPED":
    case "SUBAGENT_INTERRUPTED": {
      const agent = subagentOf(e);
      if (agent === undefined) {
        releaseCall(e.root, e.subagent?.call);
        publishChatStateNow();
        return undefined;
      }
      let text: string | undefined;
      if (e.event === "SUBAGENT_STOPPED") {
        if (agent.phase === "listening" || agent.phase === "reviewing") {
          text = taskReviewText(agent);
        } else if ((agent.phase === "task-review" || agent.phase === "task-fix") && agent.asked < MAX_REVIEW_REQUESTS) {
          text = taskReviewText(agent);
        }
      }
      if (text === undefined) finishAgent(agent);
      publishChatStateNow();
      return text;
    }
    case "TURN_FINISHING": {
      const agent = watchedAgent(e.root, e.conversation);
      if (agent === undefined || agent.kind !== "main") return undefined;
      let text: string | undefined;
      if (agent.phase === "listening" || agent.phase === "reviewing") text = finalReviewText(agent);
      else if (agent.phase === "final-review" || agent.phase === "final-fix") {
        if (agent.asked < MAX_REVIEW_REQUESTS) text = finalReviewText(agent);
        else if (agent.phase === "final-review") finishAgent(agent, "the agent did not wait for the review");
        else finishAgent(agent);
      }
      publishChatStateNow();
      return text;
    }
    case "AGENT_STOPPED":
    case "AGENT_INTERRUPTED":
    case "CONVERSATION_CLOSED": {
      for (const agent of [...watched.values()]) {
        if (agent.conversation !== e.conversation || projectRootKey(agent.root) !== projectRootKey(e.root)) continue;
        if (agent.kind === "sub") {
          finishAgent(agent);
          continue;
        }
        const missed = agent.phase === "listening" || agent.phase === "reviewing" || agent.phase === "final-review";
        if (e.event === "AGENT_STOPPED") finishAgent(agent, missed ? "the turn ended before Trama could ask for it" : undefined);
        else if (e.event === "AGENT_INTERRUPTED") finishAgent(agent, missed ? "the run was interrupted" : undefined);
        else finishAgent(agent);
      }
      publishChatStateNow();
      return undefined;
    }
    case "PROMPT_SUBMITTED": {
      const agent = watchedAgent(e.root, e.conversation);
      if (agent === undefined || agent.kind !== "main") return undefined;
      // The prompt that follows Trama's own continuation is that continuation; any other prompt after a final review request means the turn ended unseen.
      if (agent.phase === "final-review" && !agent.continued) finishAgent(agent, "the turn ended before Trama could ask for it");
      agent.continued = false;
      publishChatStateNow();
      return undefined;
    }
  }
}

/** The watched sub-agent a sub-agent Event is about: by its call, its own conversation or the Event's conversation. */
function subagentOf(e: CursorChatEvent): WatchedAgent | undefined {
  const key = projectRootKey(e.root);
  const subs = [...watched.values()].filter((a) => a.kind === "sub" && projectRootKey(a.root) === key);
  const { call, child } = e.subagent ?? {};
  return subs.find((a) => call !== undefined && a.call === call)
    ?? subs.find((a) => child !== undefined && a.id === child)
    ?? subs.find((a) => a.id === e.conversation);
}

/**
 * The result of a review: `trama-advisor` reported it with `trama advisor review`. Returns whether this window expected it;
 * the result of a request that is no longer active, or of one this window never made, is ignored.
 */
export function receiveAdvisorReview(message: Record<string, unknown>): boolean {
  const review = message["review"];
  if (typeof review !== "string") return false;
  const agent = [...watched.values()].find((a) => a.requests.get(review)?.active === true);
  const found = agent?.requests.get(review);
  if (agent === undefined || found === undefined) return false;
  found.active = false;
  const clean = message["clean"] === true;
  const notes = typeof message["notes"] === "string" ? message["notes"] : "";
  if (found.kind === "continuous") {
    if (agent.phase !== "reviewing") return false;
    // Cursor delivers the round's result, notes included, to the agent; Trama only keeps the notes for the Task or final review.
    if (!clean) agent.notes.push(notes);
    if (agent.unreviewed.size > 0) {
      agent.text = roundText(agent);
    } else agent.phase = "listening";
  } else if (found.kind === "task" && agent.phase === "task-review") {
    if (clean) finishAgent(agent);
    else agent.phase = "task-fix";
  } else if (found.kind === "final" && agent.phase === "final-review") {
    if (clean) finishAgent(agent);
    else agent.phase = "final-fix";
  } else return false;
  publishChatStateNow();
  return true;
}
