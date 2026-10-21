import type { AnnouncementView, Snapshot } from "../../src/core/snapshot";
import type { BoardModels } from "./host/proposal-models";
import type { ModelSuggestion } from "./host/model-lists";
import type { QuestionRoundView } from "./host/question-session";
import type { QuestionAction } from "./host/question-state";
import type { SettingSchema, SettingsValues, SettingValue } from "./host/settings-schema";

export type Column = "todo" | "doing" | "done";

/** One group of a Run all that a sequence cuts by model: the Tasks of the Proposals in `include`, or every Task but those of the Proposals in `exclude`. `model` is the group's model; absent for the Settings group. */
export interface RunGroup {
  include?: string[];
  exclude?: string[];
  model?: string;
}

/** What the buttons can ask an external agent to do. The host turns each into a prompt for one skill. */
export type AgentAction =
  /** `feature` absent: the whole System. */
  | { kind: "scan"; feature?: string }
  | { kind: "implement"; task: string }
  /** Every Task in "todo", in order; the agent stops at the first Drift it files. `group` cuts it to one Run of a sequence. */
  | { kind: "implement-all"; group?: RunGroup }
  /** Describe the existing code as Proposals for the Model; the agent asks its questions only with `trama question new` and stops, asking the developer to open the editor, when the editor is unavailable. `excluded`: the paths the developer left out in the setup wizard (empty: import every folder); absent, the instruction says nothing about folders. */
  | { kind: "import"; excluded?: string[] }
  /** One agent resolves only `drift`, the one Drift of the card the developer pressed Resolve on. The host refuses it while a Run or a resolution is going on, when the Drift is not open or is already in a resolution, or while one resolution Proposal is still to be decided. */
  | { kind: "resolve-drifts"; drift: string };

/** How the setup wizard starts in a folder. */
export type SetupChoice = "import" | "scratch";

/** The three modes of the setup wizard: the first setup of a folder without a project, the settings of a project, a project with an empty Model. */
export type SetupMode = "first" | "settings" | "empty-model";

/** One workspace folder as the wizard lists it: `hasFiles` when its first level holds a file or a folder whose name does not start with a dot. */
export interface WorkspaceFolderView {
  name: string;
  root: string;
  hasFiles: boolean;
}

/** One entry of a folder the wizard's tree shows. */
export interface FolderEntry {
  name: string;
  kind: "folder" | "file";
  hasChildren: boolean;
}

/** Webview -> host. The host validates everything: the webview is untrusted input. */
export type ToHost =
  | { type: "ready" }
  | { type: "launch"; action: AgentAction }
  /** + Add Work Item: the host opens the Markdown document of a written design request. */
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
  /** The developer confirmed the model field of a Proposal's model window: the host saves `model` for that Proposal (an empty text forgets it). */
  | { type: "setProposalModel"; proposal: string; model: string }
  /** The developer pressed «Dismiss Drift»: the host asks for confirmation in a modal dialog, then closes the Drift without changes, discarding its attached Proposal. */
  | { type: "dismissDrift"; id: string }
  /** The Settings tab was opened: the host answers with the model names of the agent (`modelSuggestions`). With `agent` (and `ompPath`) they are for that agent instead of the saved one, and the answer says so: this is how the wizard suggests the models of an agent it has not saved yet. */
  | { type: "modelSuggestionsWanted"; agent?: "cursor" | "omp"; ompPath?: string }
  /** The developer changed a Trama setting in the Settings tab: the host checks it against the manifest and saves it in the user settings. */
  | { type: "setSetting"; key: string; value: SettingValue }
  /** The developer followed an http or https link in a rendered text: the host opens it in the system browser. */
  | { type: "openLink"; url: string }
  /** Import from Code or Start from Scratch on the Diagram with the empty Model: the host shows the Settings tab with the wizard in the Empty Model mode and that choice. */
  | { type: "openGuidedSetup"; choice: SetupChoice }
  /** The wizard's Agent step wants the chosen agent checked; the host answers with `agentCheck`. */
  | { type: "agentCheckWanted"; agent: "cursor" | "omp"; ompPath: string }
  /** The wizard's tree opens `path` (relative to `root`, empty for the first level); the host answers with `folderChildren`. */
  | { type: "folderChildrenWanted"; root: string; path: string }
  /**
   * The developer confirmed the summary of the wizard. `values` holds only the keys that changed, in the order of the steps; `excluded` the
   * paths left out of the import. The host saves the keys, then (first setup) initializes `root`, then carries on with `choice`.
   */
  | { type: "confirmSetup"; mode: SetupMode; choice?: SetupChoice; root?: string; values: { key: string; value: SettingValue }[]; excluded: string[] };

export type ViewName = "getstarted" | "diagram" | "board" | "requirements" | "specs" | "settings";

/** What a View button or a reference chip asks a tab to focus: a Proposal in Backlog, a Task in Active, or one reference (the focus of a Task that had only that reference). */
export type FocusRequest = { kind: "proposal"; id: string } | { kind: "task"; id: string } | { kind: "ref"; ref: string };

export interface NavigateOptions {
  /** Element reference (`checkout`, `order`, `order/Paid`, `user.CANCEL`…): the Diagram shows it. */
  ref?: string;
  /** Open Proposal to draw over the Model. */
  proposal?: string;
  /** Open Drift: the Diagram goes to where it is drawn and selects it. */
  drift?: string;
  /** Focus to open in the tab arrived at from a View button or a chip; it replaces the focus and the drawn Proposal that tab had. */
  focus?: FocusRequest;
}

/** Host -> webview. */
export type ToWebview =
  /** `asking`: a question round is open; `resolve` reports the blocker, why every Run is disabled, per open Drift the reason its Resolve is disabled (null when it works), and the open Drifts the running resolution is working on (`resolving`). `models` carries the models chosen for the Proposals that carry Tasks. `scans.advisorScanner`: the Advisor Scanner is on, so the Scan buttons are disabled. */
  | { type: "snapshot"; snapshot: Snapshot; asking: boolean; resolve: { blocker: string | null; runReason: string | null; drifts: Record<string, string | null>; resolving: string[] }; models: BoardModels; scans: { advisorScanner: boolean } }
  /** Announcements withdrawn because the agent finished without delivering their cards: the Board tells the developer. */
  | { type: "withdrawn"; announcements: AnnouncementView[] }
  /** A Run of the chat ended without the Advisor's final review: the Board shows a notice with the reason (`ui#chat-advisor`). */
  | { type: "finalReviewMissing"; reason: string }
  /** The run control stopped following a job or released a Task: the Board shows `Trama stopped following <subject>: <reason>.` (`ui#agents`). */
  | { type: "stoppedFollowing"; subject: string; reason: string }
  /** An operation failed, or the files on disk cannot be read. Shown until dismissed or replaced by a snapshot. */
  | { type: "error"; message: string }
  /** Whether the folder has a Trama project: without one only Get Started and Settings are shown. */
  | { type: "project"; present: boolean }
  /** Get Started: the confirmation of the first setup is running (buttons disabled), or it ended with `error`, shown in the summary; without an error the wizard stays as it is (the panel leaves Get Started when the project exists). */
  | { type: "setup"; busy: boolean; error: string | null }
  /** The Settings tab opens the wizard in `mode`: Settings, or Empty Model with `choice` and `root`, the project's folder. */
  | { type: "guidedSetup"; mode: "settings" | "empty-model"; choice?: SetupChoice; root?: string }
  /** The workspace folders the first setup can initialize; sent without a project, at `ready` and when the folders change. */
  | { type: "workspaceFolders"; folders: WorkspaceFolderView[] }
  /** How the confirmation of the wizard of the modes Settings and Empty Model ended: closed on `ok`, otherwise left on the summary with `error`. */
  | { type: "guidedSetupResult"; ok: boolean; error: string | null }
  /** The check of an agent for the wizard: omp answered (`models` is how many), or why it did not, or whether the editor is Cursor. */
  | { type: "agentCheck"; agent: string; ompPath: string; ok: boolean; models?: number; error?: string }
  /** The entries of one folder of the wizard's tree, without the ones named with a dot or ignored by git. */
  | { type: "folderChildren"; root: string; path: string; entries: FolderEntry[] }
  | ({ type: "navigate"; view: ViewName } & NavigateOptions)
  /** The question round being answered, drawn over the tabs; null when none is. */
  | { type: "questions"; round: QuestionRoundView | null }
  /** The Trama settings: the schema from the manifest and, per key, the user value and (for keys not application-scoped) the workspace value. */
  | { type: "settings"; schema: SettingSchema[]; values: Record<string, SettingsValues> }
  /** Model names the Settings tab suggests for the three model roles, from the agent of `trama.agent`; an empty list means plain text, and `error` says why omp gives none. With `agent` (and `ompPath`) the list answers the wizard's request for that agent and only the wizard takes it. */
  | { type: "modelSuggestions"; models: ModelSuggestion[]; error?: string; agent?: string; ompPath?: string };
