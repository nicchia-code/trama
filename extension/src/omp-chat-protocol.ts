import type { ElicitationSchema, PermissionOption, SessionNotification, ToolCallUpdate } from "@agentclientprotocol/sdk";
import type { ThemeSetting } from "./webview/theme";

// The messages between the host and the webview of the omp Chat view (`tech#omp-chat`). The webview is untrusted input: the host validates every message it
// receives with zod (`host/omp-chat/messages.ts`) and ignores the ones that do not fit.

/** `running` while the agent is in a turn, `waiting-form` while a form of the agent waits for the developer, `waiting-permission` while a permission request waits, `idle` otherwise. */
export type ConversationRunState = "running" | "idle" | "waiting-form" | "waiting-permission";

export interface ConversationItem {
  id: string;
  name: string;
  state: ConversationRunState;
  /** The model the conversation uses now, when omp says. */
  model?: string;
  /** Whether this is General's tab: always the first one, with the Clear button instead of the close button. */
  general?: true;
}

/** The phase of General's process as the view shows it (`omp-chat-general`): `kept` is the one after switch-off, where General's tab closes instead of clearing. */
export type GeneralPhase = "starting" | "ready" | "stopped" | "resuming" | "waiting" | "kept";

/** Why General's omp stopped or did not start, or is missing; `reason` is the text after the colon. */
export interface GeneralError {
  kind: "start" | "exited" | "missing";
  reason?: string;
}

/** The first message of a job: Trama's instruction, with the file it carries, if any, as a name and its text. */
export interface FirstMessage {
  text: string;
  attachment?: { name: string; text: string };
}

export interface ModelChoice {
  id: string;
  name: string;
}

/** What a form asks: the title, and the fields as ACP's schema gives them. */
export interface FormView {
  requestId: string;
  message: string;
  schema: ElicitationSchema;
}

/** What a permission request shows: the tool call it concerns and the options as omp gives them, in omp's order. */
export interface PermissionView {
  requestId: string;
  toolCall: ToolCallUpdate;
  options: PermissionOption[];
}

/** What the developer answers a form. */
export type FormAnswerMessage = { action: "accept"; content: Record<string, string | number | boolean | string[]> } | { action: "decline" };

/** Host -> webview. */
export type ToChatWebview =
  /** The webview starts again from what follows: it forgets every conversation. */
  | { type: "reset" }
  | { type: "theme"; setting: ThemeSetting }
  /** The tabs, in order of opening, and the one in view. */
  | { type: "conversations"; items: ConversationItem[]; selected?: string }
  /** A conversation's start: `first` is Trama's instruction, `notice` a line before it (a resumed conversation), `focus` asks the message field to take the focus. */
  | { type: "conversationStart"; id: string; first?: FirstMessage; notice?: string; focus: boolean }
  /** A `session/update` notification of ACP, as it arrived. */
  | { type: "conversationUpdate"; id: string; update: SessionNotification }
  | { type: "formRequest"; id: string; requestId: string; message: string; schema: ElicitationSchema }
  | { type: "permissionRequest"; id: string; requestId: string; toolCall: ToolCallUpdate; options: PermissionOption[] }
  /** A waiting permission request was answered `cancelled` (Stop, or the process ended). */
  | { type: "permissionCancelled"; id: string; requestId: string }
  | { type: "models"; id: string; available: ModelChoice[]; current?: string }
  /** General's transcript was cleared: the tab is empty again. */
  | { type: "conversationCleared"; id: string }
  /** General's process state, drawn under its messages; `newSession` says the agent does not remember what is above. */
  | { type: "generalStatus"; phase: GeneralPhase; error?: GeneralError; newSession?: boolean }
  /** An error of omp (a message that was not sent, a model that was not changed) shown in the conversation. */
  | { type: "conversationError"; id: string; message: string }
  /** A message the developer sent did not start: its text goes back into the field of the tab `id` (General's too), not cleared. */
  | { type: "returnToField"; id: string; text: string };

/** Webview -> host. */
export type ToChatHost =
  | { type: "ready" }
  | { type: "selectConversation"; id: string }
  | { type: "sendMessage"; id: string; text: string }
  | { type: "stopAgent"; id: string }
  | { type: "closeConversation"; id: string }
  | { type: "setModel"; id: string; model: string }
  | { type: "formAnswer"; id: string; requestId: string; answer: FormAnswerMessage }
  | { type: "permissionAnswer"; id: string; requestId: string; optionId: string }
  /** The Clear button of General (or its Delete key). */
  | { type: "clearGeneral" }
  /** The Install omp button of General. */
  | { type: "installOmp" }
  /** A file an edit touched, to open in the editor. */
  | { type: "openFile"; path: string }
  | { type: "openLink"; url: string };
