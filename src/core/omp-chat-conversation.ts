import { z } from "zod";

/**
 * The pure logic of an omp Chat conversation (`omp-chat-conversation` Machine): the choice between a terminal and a conversation,
 * the states and what each Event does, the entries saved for the window's reload and the decisions of the resume. The host
 * (`extension/src/host/omp-chat/`) only carries out what these functions decide.
 */

/** The terminal's fixed prompt of a conversation resumed after a reload while its agent was working. */
export const RESUME_PROMPT = "The editor window reloaded and stopped your work. Continue it from where it stopped.";
/** The line a resumed working conversation shows before the prompt. */
export const RESUME_NOTICE = "The window reloaded; the agent continues its work.";
/** Why the work of a conversation that could not be resumed ends (the Board notice's reason). */
export const SESSION_NOT_RESUMED_REASON = "the agent's session could not be resumed";
/** How long a resume waits for omp before the conversation is lost. */
export const RESUME_TIMEOUT_MS = 30_000;
/** The key of `workspaceState` the open conversations are saved under. */
export const CONVERSATIONS_KEY = "trama.ompChat.conversations";

/** Whether an instruction opens a conversation: omp Chat is on (not turned off in the user settings) and can start. Read at every instruction. */
export const useOmpChat = (facts: { ompChat: boolean; available: boolean }): boolean => facts.ompChat && facts.available;

/** The warning shown when omp does not start and the instruction goes to a terminal: the reason, then the last lines omp wrote on its error output, when it wrote any. */
export const startFailureNotice = (reason: string, details?: string): string =>
  `Trama: omp Chat could not start omp (${reason}); the job runs in a terminal.${details === undefined || details === "" ? "" : `\n${details}`}`;

export type ConversationState = "running" | "idle" | "waiting" | "closed";

/** How the answer of omp to the prompt of the work ended: its `stopReason`, or the error omp answered the prompt with (it refused it). */
export type TurnEnd = { stopReason: string } | { error: string };

export type ConversationEvent =
  /** omp answered the prompt of the job's work (`omp-acp.TURN_ENDED`), with no developer message waiting to be delivered. */
  | { type: "omp-acp.TURN_ENDED"; end: TurnEnd }
  /** The process ended without Trama asking, or the connection closed without an `exit`; `details` are the last lines of omp's error output. */
  | { type: "omp-acp.EXITED"; code: number | null; signal: string | null; details?: string }
  | { type: "developer.STOP_CHAT_AGENT" }
  | { type: "developer.CLOSE_CHAT_CONVERSATION" }
  | { type: "editor.WINDOW_CLOSED" }
  | { type: "omp-acp.SESSION_RESUMED"; wasRunning: boolean }
  /** `cause` is why the session did not reopen (the start failure's reason) and `details` the last lines of omp's error output. */
  | { type: "omp-acp.SESSION_NOT_RESUMED"; wasRunning: boolean; cause?: string; details?: string };

/** What the host does as a consequence of an Event, in the order listed. */
export type ConversationEffect =
  /** Release the Tasks, the Drifts and Proposals held, withdraw the announcements and end the job, with `abnormal` when the end is not normal. */
  | { effect: "end-work"; abnormal?: string }
  /** Stop the process (SIGTERM, then SIGKILL); it produces no `EXITED`. */
  | { effect: "stop-process" }
  /** Stop the process because the window closes; the work and the saved entry stay. */
  | { effect: "stop-process-for-window" }
  /** `session/cancel`. */
  | { effect: "cancel-turn" }
  /** Interrupt the question round the conversation was waiting on, if any. */
  | { effect: "interrupt-questions" }
  /** The Board notice that Trama stopped following the conversation, with the last lines of omp's error output when there are any. */
  | { effect: "report-stopped"; reason: string; details?: string }
  /** The Board notice that the agent of the conversation stopped abnormally (the model refused, a limit was reached or omp refused the prompt). */
  | { effect: "report-agent-stopped"; reason: string }
  /** The conversation goes from the view and its saved entry is deleted. */
  | { effect: "close" }
  /** The saved entry changes to this state. */
  | { effect: "save-state"; state: "running" | "idle" }
  /** The resumed conversation continues: the fixed notice and prompt go to it. */
  | { effect: "continue-work" };

export interface ConversationStep {
  state: ConversationState;
  effects: ConversationEffect[];
}

/** Why a process end Trama did not ask for is not a normal end: nothing for exit code 0, as for the end of a terminal's command. */
export function exitReason(code: number | null, signal: string | null): string | undefined {
  if (code === 0) return undefined;
  if (code !== null) return `its command exited with code ${code}`;
  if (signal !== null) return `its process was ended by ${signal}`;
  return "its command ended without an exit status";
}

/** What the Board notice says about a process that ended without Trama asking, or whose connection closed with no exit: `omp exited (code 1)`, `omp exited (SIGKILL)`, `omp exited`. */
export function exitedNotice(code: number | null, signal: string | null): string {
  if (code !== null) return `omp exited (code ${code})`;
  return signal !== null ? `omp exited (${signal})` : "omp exited";
}

/** The Board notice for a job whose agent stopped abnormally (`turnEndReason`): `The agent of T3 stopped: the model reached its token limit.` */
export const agentStoppedNotice = (job: string, reason: string): string => `The agent of ${job} stopped: ${reason}.`;

/**
 * Why the end of a turn is not a normal end, or undefined for `end_turn` and `cancelled` (the agent ended it, or the developer stopped it with Stop). The model
 * refusing, a token or request limit and an error answer (omp refused the prompt, for example for authentication or for the model) are abnormal.
 */
export function turnEndReason(end: TurnEnd): string | undefined {
  if ("error" in end) return `omp refused the prompt (${end.error})`;
  switch (end.stopReason) {
    case "end_turn":
    case "cancelled":
      return undefined;
    case "refusal":
      return "the model refused to continue";
    case "max_tokens":
      return "the model reached its token limit";
    case "max_turn_requests":
      return "the model reached its request limit";
    default:
      return `omp ended the turn with ${end.stopReason}`;
  }
}

const stay = (state: ConversationState): ConversationStep => ({ state, effects: [] });

const closed = (what: string): ConversationStep => ({ state: "closed", effects: [{ effect: "stop-process" }, { effect: "end-work", abnormal: what }, { effect: "close" }] });

/**
 * The transition of a conversation in `state` on `event`; `autoExit` is `trama.autoExit`, read when omp answers the prompt of the work. An Event the
 * state does not receive changes nothing: Agent idle no longer follows what happens (a new end of turn changes nothing), and Closed receives nothing.
 */
export function conversationStep(state: ConversationState, event: ConversationEvent, autoExit: boolean): ConversationStep {
  switch (state) {
    case "running":
      switch (event.type) {
        case "omp-acp.TURN_ENDED": {
          const abnormal = turnEndReason(event.end);
          const work: ConversationEffect[] = [{ effect: "end-work", ...(abnormal === undefined ? {} : { abnormal }) }, ...(abnormal === undefined ? [] : [{ effect: "report-agent-stopped", reason: abnormal } as const])];
          return autoExit
            ? { state: "closed", effects: [...work, { effect: "stop-process" }, { effect: "close" }] }
            : { state: "idle", effects: [...work, { effect: "save-state", state: "idle" }] };
        }
        case "omp-acp.EXITED": {
          const abnormal = exitReason(event.code, event.signal);
          return {
            state: "closed",
            effects: [
              { effect: "end-work", ...(abnormal === undefined ? {} : { abnormal }) },
              { effect: "report-stopped", reason: exitedNotice(event.code, event.signal), ...(event.details === undefined ? {} : { details: event.details }) },
              { effect: "stop-process" },
              { effect: "close" },
            ],
          };
        }
        case "developer.STOP_CHAT_AGENT":
          return { state, effects: [{ effect: "cancel-turn" }, { effect: "interrupt-questions" }] };
        case "developer.CLOSE_CHAT_CONVERSATION":
          return closed("its conversation was closed");
        case "editor.WINDOW_CLOSED":
          return { state: "waiting", effects: [{ effect: "stop-process-for-window" }] };
        default:
          return stay(state);
      }
    case "idle":
      switch (event.type) {
        case "developer.CLOSE_CHAT_CONVERSATION":
          return closed("its conversation was closed");
        case "omp-acp.EXITED":
          return { state: "closed", effects: [{ effect: "end-work" }, { effect: "stop-process" }, { effect: "close" }] };
        case "editor.WINDOW_CLOSED":
          return { state: "waiting", effects: [{ effect: "stop-process-for-window" }] };
        default:
          return stay(state);
      }
    case "waiting":
      switch (event.type) {
        case "omp-acp.SESSION_RESUMED":
          return event.wasRunning
            ? { state: "running", effects: [{ effect: "save-state", state: "running" }, { effect: "continue-work" }] }
            : { state: "idle", effects: [{ effect: "save-state", state: "idle" }] };
        case "omp-acp.SESSION_NOT_RESUMED":
          return {
            state: "closed",
            effects: [
              ...(event.wasRunning
                ? [{ effect: "report-stopped", reason: event.cause === undefined ? SESSION_NOT_RESUMED_REASON : `${SESSION_NOT_RESUMED_REASON} (${event.cause})`, ...(event.details === undefined ? {} : { details: event.details }) } as const]
                : []),
              { effect: "end-work", abnormal: SESSION_NOT_RESUMED_REASON },
              { effect: "close" },
            ],
          };
        default:
          return stay(state);
      }
    case "closed":
      return stay(state);
  }
}

/** Whether closing the conversation asks first: only when its agent is in a turn (a prompt sent and its answer not yet arrived). */
export const closeNeedsConfirmation = (inTurn: boolean): boolean => inTurn;

/** The Trama variables a saved conversation keeps of its environment; the question endpoint and the PATH are made again at the resume. */
export const SAVED_ENV_KEYS = ["TRAMA_AGENT", "TRAMA_TERMINAL", "TRAMA_ACP", "TRAMA_JOB", "TRAMA_ADVISOR_SCANNER", "TRAMA_RUN", "TRAMA_TASK", "TRAMA_PARALLEL", "PI_INTENT_TRACING"] as const;

/** Only the Trama variables of `env`, the ones a saved entry keeps. */
export function savedEnv(env: Readonly<Record<string, string | undefined>>): Record<string, string> {
  const kept: Record<string, string> = {};
  for (const key of SAVED_ENV_KEYS) {
    const value = env[key];
    if (value !== undefined) kept[key] = value;
  }
  return kept;
}

const JobSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["run", "resolve", "scan", "prepared", "unify", "refine"]),
  name: z.string(),
  announcement: z.string().optional(),
  advisor: z.boolean().optional(),
  drifts: z.array(z.string()).optional(),
});

/** The job of the registry a conversation follows: its kind, name and announcement (the Run's identity, the Advisor Scanner and the Drifts it unites with them). */
export type SavedJob = z.infer<typeof JobSchema>;

const EntrySchema = z.object({
  id: z.string().regex(/^[a-z0-9]{6}$/),
  name: z.string().min(1),
  sessionId: z.string().min(1),
  state: z.enum(["running", "idle"]),
  args: z.array(z.string()),
  env: z.record(z.string(), z.string()),
  /** Whether the conversation runs with Trama's hook, so it is a job whose work ends on omp's answer to the prompt and whose forms are declined (not derived from the arguments). */
  hook: z.boolean(),
  job: JobSchema.optional(),
  openedAt: z.string().refine((value) => !Number.isNaN(Date.parse(value))),
});

/** A conversation saved for the resume (`data#omp-chat-conversation`): no message of it is ever kept. */
export type SavedConversation = z.infer<typeof EntrySchema>;

/** An entry that cannot be read: what is still readable of it, so its job, if any, ends as for a resume that failed. */
export interface UnreadableEntry {
  id?: string;
  name?: string;
  /** Whether the entry says it had Trama's hook, so it is a job's even with no job saved. */
  hook?: boolean;
  job?: SavedJob;
}

/**
 * Reads the saved list. Anything that is not a list is no entry; an entry that is unreadable or has no `sessionId` is returned in
 * `unreadable`, with whatever job it still names, to be deleted without a resume.
 */
export function readSavedConversations(raw: unknown): { entries: SavedConversation[]; unreadable: UnreadableEntry[] } {
  const entries: SavedConversation[] = [];
  const unreadable: UnreadableEntry[] = [];
  if (!Array.isArray(raw)) return { entries, unreadable };
  const seen = new Set<string>();
  for (const item of raw) {
    const parsed = EntrySchema.safeParse(item);
    if (parsed.success && !seen.has(parsed.data.id)) {
      seen.add(parsed.data.id);
      entries.push(parsed.data);
      continue;
    }
    const loose = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
    const job = JobSchema.safeParse(loose["job"]);
    unreadable.push({
      ...(typeof loose["id"] === "string" ? { id: loose["id"] } : {}),
      ...(typeof loose["name"] === "string" ? { name: loose["name"] } : {}),
      ...(loose["hook"] === true ? { hook: true } : {}),
      ...(job.success ? { job: job.data } : {}),
    });
  }
  return { entries, unreadable };
}

/** The list with `entry` added, or replacing the entry of the same conversation (the tabs keep their order). */
export function withSavedConversation(list: readonly SavedConversation[], entry: SavedConversation): SavedConversation[] {
  return list.some((item) => item.id === entry.id) ? list.map((item) => (item.id === entry.id ? entry : item)) : [...list, entry];
}

/** The list without the conversation `id`. */
export const withoutSavedConversation = (list: readonly SavedConversation[], id: string): SavedConversation[] => list.filter((item) => item.id !== id);

/** What the resume of a saved entry does once its session reopens: its state, and for a working one the notice and the fixed prompt. */
export function resumeDecision(entry: Pick<SavedConversation, "state" | "hook">): { wasRunning: boolean; notice?: string; prompt?: string } {
  // Only a conversation of a job's work (with Trama's hook) continues its work; Ask more reopens at rest, even when it was in a turn.
  return entry.state === "running" && entry.hook ? { wasRunning: true, notice: RESUME_NOTICE, prompt: RESUME_PROMPT } : { wasRunning: false };
}

/** The error of a resume that did not answer in time. */
export class ResumeTimeout extends Error {
  constructor() {
    super("omp did not answer within 30 s");
  }
}

/** `promise`, or a `ResumeTimeout` rejection when it does not settle within `ms`; the timer never outlives the promise. */
export function within<T>(promise: Promise<T>, ms: number = RESUME_TIMEOUT_MS): Promise<T> {
  const { promise: result, resolve, reject } = Promise.withResolvers<T>();
  const timer = setTimeout(() => reject(new ResumeTimeout()), ms);
  promise.then(resolve, reject).finally(() => clearTimeout(timer));
  return result;
}
