import type { ElicitationSchema, PermissionOption, SessionNotification, ToolCallUpdate } from "@agentclientprotocol/sdk";
import type { GeneralError, GeneralPhase } from "../../omp-chat-protocol";

// The two things the conversations of omp Chat stand on, as the host sees them. The ACP client (Task «Client ACP di omp») implements `OmpClientPort`
// and the view in the secondary sidebar (Task «Vista omp Chat») implements `ChatViewPort`; the conversations (`conversations.ts`) are written against these
// interfaces only, so their logic is tested with fakes and neither Task changes it.

export interface Disposable {
  dispose(): void;
}

/** How a process of omp starts: what the client spawns and talks to. */
export interface OmpLaunch {
  /** The arguments after the `omp` program: the job's options, then `acp`, and `--yolo` only with the yolo approval. No shell is involved: they are array elements, never quoted. */
  args: string[];
  /** The variables added to the editor's own environment: the marks of Trama's agents, the question endpoint, the conversation's identity and the PATH with Trama's `trama` first. */
  env: Record<string, string>;
  /** The project's root. */
  cwd: string;
}

/** A prompt: the text and, when the instruction carries a file of its own, the file the client sends as a `resource_link`. */
export interface OmpPrompt {
  text: string;
  attachment?: string;
}

/** A start or a resume that failed; `message` is the reason (`omp not found at <path>`, `omp exited with code <N>`, `omp did not answer within 30 s` or omp's own message). */
export class OmpStartFailure extends Error {}

/** How a process of omp ended without Trama stopping it. */
export interface OmpExit {
  code: number | null;
  signal: string | null;
}

/** One process of omp with its ACP session. */
export interface OmpSessionPort {
  /** The identity of the omp session (what `session/load` or `session/resume` takes). */
  readonly sessionId: string;
  readonly pid: number | undefined;
  /** Whether a prompt was sent and its answer has not arrived yet. */
  readonly inTurn: boolean;
  /** Sends a message of the developer or Trama; resolves when the turn ends. */
  sendPrompt(prompt: OmpPrompt): Promise<void>;
  /** `session/cancel`. */
  cancel(): void;
  /** Stops the process: SIGTERM and, after 3 seconds, SIGKILL. It never produces `onExit`. Resolves when the process is gone. */
  stop(): Promise<void>;
  /** The process ended and Trama had not asked it to (`omp-acp.EXITED`). */
  onExit(listener: (exit: OmpExit) => void): Disposable;
  /** The `session/update` notifications as they arrive. Everything received since the session was created or loaded (the history a load replays included) is replayed to a new listener first. */
  onUpdate(listener: (notification: SessionNotification) => void): Disposable;
  /** The agent starts or ends a turn, for a prompt of the view or of anyone else. */
  onTurn(listener: (inTurn: boolean) => void): Disposable;
  /** A form of the agent (an elicitation request of ACP); the ones still waiting are replayed to a new listener. */
  onFormRequest(listener: (request: FormRequest) => void): Disposable;
  /** Answers the form `requestId` (`decline` is a Skip); an unknown request is ignored. */
  answerForm(requestId: string, answer: FormAnswer): void;
  /** A permission request of omp (`session/request_permission`); with `--yolo` none arrives. The ones still waiting are replayed to a new listener. */
  onPermissionRequest(listener: (request: PermissionRequest) => void): Disposable;
  /** Answers the permission request `requestId` with the offered option `optionId`; an unknown request or an option that was not offered is ignored. */
  answerPermission(requestId: string, optionId: string): void;
  /** A waiting permission request was answered `cancelled` (Stop, closing, the process ended). */
  onPermissionCancelled(listener: (requestId: string) => void): Disposable;
  /** The models the session can use and the one it uses now, from omp's session options or, without them, from the models omp lists. */
  models(): Promise<{ available: { id: string; name: string }[]; current?: string }>;
  /** Changes the session's model from the next turn; rejects with omp's message when it refuses. */
  setModel(id: string): Promise<void>;
}

/** A form the agent asks the developer to fill. */
export interface FormRequest {
  requestId: string;
  message: string;
  schema: ElicitationSchema;
}

export type FormAnswer = { action: "accept"; content: Record<string, unknown> } | { action: "decline" };

/** A permission request of omp: the tool call it concerns and the options as omp gives them. It waits without a time limit; Stop and the closing of the conversation answer `cancelled`. */
export interface PermissionRequest {
  requestId: string;
  toolCall: ToolCallUpdate;
  options: PermissionOption[];
}

export interface OmpClientPort {
  /**
   * Spawns omp, opens the session and, when `first` is given, delivers it as the first message without waiting for its turn to end. Rejects with
   * `OmpStartFailure` when the process does not start or the session does not open before the delivery.
   */
  start(launch: OmpLaunch, first?: OmpPrompt): Promise<OmpSessionPort>;
  /** Spawns omp with the same launch and reopens the saved session. Rejects with `OmpStartFailure` when it does not. */
  resume(launch: OmpLaunch, sessionId: string): Promise<OmpSessionPort>;
}

/** The tab of a conversation in the view. */
export interface ConversationTab {
  id: string;
  name: string;
}

export interface ChatViewPort {
  /**
   * Adds the conversation's tab, in front of the others, and shows the view on it: with the focus in the message field when `focus` is set, without taking it
   * otherwise. `notice` is a line the conversation starts with (a resumed one); `first` is the instruction the conversation started with, which the view shows as Trama's message. The view reads the session's notifications and sends the developer's messages,
   * the model changes and the form answers to the session itself.
   */
  open(tab: ConversationTab, session: OmpSessionPort, options: { focus: boolean; notice?: string; first?: OmpPrompt }): void;
  /** The conversation is, or is no longer, working for Trama (the tab's dot). */
  setWorking(id: string, working: boolean): void;
  /** Removes the tab; the view refuses the forms still waiting. */
  close(id: string): void;
  /** The developer pressed Stop in the conversation `id` (before the confirmation). */
  onStopRequested(listener: (id: string) => void): Disposable;
  /** The developer closed the tab of `id` (before the confirmation). */
  onCloseRequested(listener: (id: string) => void): Disposable;
  /** General comes to the view, as the first tab, without taking the view or the focus. */
  showGeneral(): void;
  /** General's session, or none while its process starts or after it stopped. Its history is replayed by a new listener, as for any session. */
  setGeneralSession(session: OmpSessionPort | undefined): void;
  /** General's process state, drawn in its tab (`generalStatus`). */
  generalStatus(status: { phase: GeneralPhase; error?: GeneralError; newSession?: boolean }): void;
  /** General's transcript was cleared: the tab is empty again. */
  generalCleared(): void;
  /** General leaves the view; the forms still waiting are refused. */
  removeGeneral(): void;
  /** The developer pressed the Clear button of General (or Delete on its tab) while it is not `kept`. */
  onClearGeneralRequested(listener: () => void): Disposable;
  /** The developer pressed Install omp in General. */
  onInstallOmpRequested(listener: () => void): Disposable;
  /** The developer sent a message from General's field: it is delivered by General's own process (`omp-chat-general`). */
  onGeneralMessage(listener: (text: string) => void): Disposable;
  /** A message the developer sent did not start: its text goes back into the field of the tab `id`, and the field keeps it. */
  returnToField(id: string, text: string): void;
}
