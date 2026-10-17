import type { AnnouncementView, Snapshot } from "../../src/core/snapshot";
import type { DriftAutopilotStatus } from "./host/drift-resolution";
import type { ModelSuggestion } from "./host/model-lists";
import type { InitChoice } from "./host/project";
import type { QuestionRoundView } from "./host/question-session";
import type { QuestionAction } from "./host/question-state";
import type { DelegationMode, SettingSchema, SettingsValues, SettingValue } from "./host/settings-schema";

export type Column = "todo" | "doing" | "done";

/** What the buttons can ask an external agent to do. The host turns each into a prompt for one skill. */
export type AgentAction =
  /** `prompt` absent: the host asks the developer with an input box. */
  | { kind: "design"; prompt?: string }
  /** `feature` absent: the whole System. */
  | { kind: "scan"; feature?: string }
  | { kind: "implement"; task: string }
  /** Every Task in "todo", in order; the agent stops at the first Drift it files. */
  | { kind: "implement-all" }
  /** Every Task of one design in "todo", in order; the agent stops at the first Drift it files. */
  | { kind: "implement-design"; proposal: string }
  /** Describe the existing code as Proposals for the Model; the agent asks its own questions. */
  | { kind: "import" }
  /** One agent resolves every Drift open when the instruction is sent. The host refuses it while a Run or a resolution is going on, or one resolution Proposal is still to be decided. */
  | { kind: "resolve-drifts" };

/** Webview -> host. The host validates everything: the webview is untrusted input. */
export type ToHost =
  | { type: "ready" }
  | { type: "launch"; action: AgentAction }
  /** Design…: the host opens the Markdown document of a written design request. */
  | { type: "writeDesignRequest" }
  /** What the developer did on the overlay of question round `round`; the host answers with the new state. */
  | { type: "questionAction"; round: number; action: QuestionAction }
  /** Tracked path: relative to `.trama/model/`, or `requirements/<area>.md`. */
  | { type: "openModelFile"; path: string }
  /** Path relative to `.trama/` (for example `tasks/0003-x.md`). */
  | { type: "openFile"; path: string }
  /** Open an existing Task or Drift by its permanent identity. */
  | { type: "openCard"; kind: "task" | "drift"; id: string }
  | { type: "approveProposal"; id: string }
  | { type: "rejectProposal"; id: string }
  /** The developer pressed «Dismiss Drift»: the host asks for confirmation in a modal dialog, then closes the Drift without changes, discarding its attached Proposal. */
  | { type: "dismissDrift"; id: string }
  /** The Settings tab was opened: the host answers with the model names of the agent (`modelSuggestions`). */
  | { type: "modelSuggestionsWanted" }
  /** The developer changed a Trama setting in the Settings tab: the host checks it against the manifest and saves it in the user settings. */
  | { type: "setSetting"; key: string; value: SettingValue }
  /** The developer chose a level in the Drift autopilot menu: the host saves the Drift autopilot setting, asking first when it raises it. */
  | { type: "setDelegation"; mode: DelegationMode }
  /** The developer followed an http or https link in a rendered text: the host opens it in the system browser. */
  | { type: "openLink"; url: string }
  /** Get Started: the developer chose how to set up the folder; the host initializes it and starts what that choice starts. */
  | { type: "initialize"; choice: InitChoice };

export type ViewName = "getstarted" | "diagram" | "board" | "requirements" | "specs" | "settings";

export interface NavigateOptions {
  /** Element reference (`checkout`, `order`, `order/Paid`, `user.CANCEL`…): the Diagram shows it. */
  ref?: string;
  /** Open Proposal to draw over the Model. */
  proposal?: string;
  /** Open Drift: the Diagram goes to where it is drawn and selects it. */
  drift?: string;
}

/** Host -> webview. */
export type ToWebview =
  /** `asking`: a question round is open; `resolve` reports the blocker, why every Run is disabled, and the accessible autopilot status. */
  | { type: "snapshot"; snapshot: Snapshot; asking: boolean; resolve: { blocker: string | null; runReason: string | null; autopilot: DriftAutopilotStatus } }
  /** Announcements withdrawn because the agent finished without delivering their cards: the Board tells the developer. */
  | { type: "withdrawn"; announcements: AnnouncementView[] }
  /** An operation failed, or the files on disk cannot be read. Shown until dismissed or replaced by a snapshot. */
  | { type: "error"; message: string }
  /** Whether the folder has a Trama project: without one only Get Started and Settings are shown. */
  | { type: "project"; present: boolean }
  /** Get Started: an initialization is running (buttons disabled), or it failed with `error`, shown under the buttons. */
  | { type: "setup"; busy: boolean; error: string | null }
  | ({ type: "navigate"; view: ViewName } & NavigateOptions)
  /** The question round being answered, drawn over the tabs; null when none is. */
  | { type: "questions"; round: QuestionRoundView | null }
  /** The Trama settings: the schema from the manifest and, per key, the user value and (for keys not application-scoped) the workspace value. */
  | { type: "settings"; schema: SettingSchema[]; values: Record<string, SettingsValues> }
  /** Model names the Settings tab suggests for the three model roles, from the agent of `trama.agent`; an empty list means plain text, and `error` says why omp gives none. */
  | { type: "modelSuggestions"; models: ModelSuggestion[]; error?: string };
