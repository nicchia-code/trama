import type { AnnouncementView, Snapshot } from "../../src/core/snapshot";
import type { BoardModels } from "./host/proposal-models";
import type { ModelSuggestion } from "./host/model-lists";
import type { QuestionRoundView } from "./host/question-session";
import type { QuestionAction } from "./host/question-state";
import type { SettingSchema, SettingsValues, SettingValue } from "./host/settings-schema";

export type Column = "todo" | "doing" | "done";

/** A Proposal waiting in the refining queue and why: `approval` it waits for the Proposal `on` it requires to be approved, `chain` for `on`, in its chain, to be refined, `slot` for a free sub-agent place. */
export interface QueuedRefinement {
  proposal: string;
  waiting: "approval" | "chain" | "slot";
  on?: string;
}

/** The state of Refine All. `mode` is `cancel` while it is in progress, with `since` the instant of its click (ms since the epoch). `count` is how many Proposals a click takes now; `blockers` are all the reasons it is unavailable, in order (empty when it works). */
export interface RefineAllView {
  mode: "refine" | "cancel";
  count: number;
  blockers: string[];
  since?: number;
}

/** The Proposal refinement, as the host carries it with each picture. `enabled`: the setting `trama.autoUpdateStaleProposals` is on. `running`: the Proposals the agents refine now, in the order they started. `queued`: the Proposals waiting, in order, each with why. `refineAll`: the Refine All menu entry. `note`: the latest note of an agent, or null. `runInProgress`: a Run launched from this window is in progress, so Approve is disabled. `waiting`: the Proposals the refinement delivered and that are approved only when that Run ends. */
export interface RefinementView {
  enabled: boolean;
  running: string[];
  queued: QueuedRefinement[];
  refineAll: RefineAllView;
  note: string | null;
  runInProgress: boolean;
  waiting: string[];
}

/** The time left of a Run all launched from this window, as the host carries it with each picture: `null` without a Run all, `{ estimating: true }` while Trama works it out, otherwise the range in minutes (not rounded) and whether the Run all lasts longer than the high limit of its first estimate. */
export type RunEstimateView = null | { estimating: true } | { low: number; high: number; over: boolean };

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
  | { kind: "resolve-drifts"; drift: string }
  /** One agent unites every open Drift that sits in no resolution into one Drift. The host rechecks the conditions at the click, gathers the Drifts only when the instruction is really sent, and refuses with the reasons of `unify.blockers` of the Snapshot message. */
  | { kind: "unify-drifts" };

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

/** An agent instruction file the wizard's omp step warns about: the label is shown, the absolute path is what opening it asks for. */
export interface InstructionFileView {
  label: string;
  path: string;
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
  /** Ask more on a card of the Board's details windows: the host reads the card from its files at the click and opens a new chat about it. Never refused for other work. */
  | { type: "askMore"; kind: "task" | "proposal" | "drift"; id: string }
  /** What the developer did on the overlay of question round `round`; the host answers with the new state. */
  | { type: "questionAction"; round: number; action: QuestionAction }
  /** Tracked path: relative to `.trama/model/`, or `requirements/<area>.md`. */
  | { type: "openModelFile"; path: string }
  /** Path relative to `.trama/` (for example `tasks/0003-x.md`). */
  | { type: "openFile"; path: string }
  /** Open an existing Task or Drift by its permanent identity. */
  | { type: "openCard"; kind: "task" | "drift"; id: string }
  | { type: "approveProposal"; id: string }
  | { type: "cancelRefinement"; proposal: string }
  /** «Refine All» of the menu of `+ Add Work Item`: the host rechecks and queues every Proposal a click takes. No other field. */
  | { type: "refineAll" }
  /** «Cancel Refine All»: the host empties the whole queue when Refine All is in progress and 2 seconds have passed. No other field. */
  | { type: "cancelRefineAll" }
  | { type: "rejectProposal"; id: string }
  /** «Rework with feedback…» of Reject's arrow: the host asks the developer what to change, rejects the Proposal and has the agent redo it. */
  | { type: "reworkProposal"; proposal: string }
  /** «Rework with feedback…» of Dismiss Drift's arrow: the host asks the developer for feedback and has the agent resolve the Drift following it. */
  | { type: "reworkDrift"; drift: string }
  /** The developer confirmed the model field of a Proposal's model window: the host saves `model` for that Proposal (an empty text forgets it). */
  | { type: "setProposalModel"; proposal: string; model: string }
  /** The developer pressed «Dismiss Drift»: the host asks for confirmation in a modal dialog, then closes the Drift without changes, discarding its attached Proposal. */
  | { type: "dismissDrift"; id: string }
  /** Clear, at the bottom of the Done column: the host deletes those Tasks (by permanent identity) that are still Done. Refused while a Run launched by Trama is going, and the host never asks for confirmation. */
  | { type: "clearDone"; tasks: string[] }
  /** Delete, in the details window of a Task in To do: the host refuses while a Run launched by Trama is going or the agent that filed the Task is still finishing, asks for confirmation in a modal dialog, and only then deletes that Task (by permanent identity), rechecking the same conditions. Cancelling changes nothing. With `clearDone`, the only messages that delete Tasks. */
  | { type: "deleteTask"; task: string }
  /** The developer chose «Rework with feedback…» on an open Drift: the host asks for the feedback in an input box, then launches the resolution agent on that one Drift with it. */
  | { type: "reworkDrift"; drift: string }
  /** The Settings tab was opened: the host answers with the model names of omp (`modelSuggestions`). With `ompPath` they are for the omp at that path instead of the saved one, and the answer says so: this is how the wizard suggests the models of a path it has not saved yet. */
  | { type: "modelSuggestionsWanted"; ompPath?: string }
  /** The developer changed a Trama setting in the Settings tab: the host checks it against the manifest and saves it in the user settings. */
  | { type: "setSetting"; key: string; value: SettingValue }
  /** The developer followed an http or https link in a rendered text: the host opens it in the system browser. */
  | { type: "openLink"; url: string }
  /** The developer chose a preview of an image of a Task: the host opens that file whole in an editor tab, only if it is an image the Task has. */
  | { type: "openTaskImage"; task: string; name: string }
  /** Import from Code or Start from Scratch on the Diagram with the empty Model: the host shows the Settings tab with the wizard in the Empty Model mode and that choice. */
  | { type: "openGuidedSetup"; choice: SetupChoice }
  /** The wizard's omp step wants omp checked at `ompPath`; the host answers with `agentCheck`. */
  | { type: "agentCheckWanted"; ompPath: string }
  /** Install omp: the host opens a visible terminal with omp's official installer; the message has no data. */
  | { type: "installOmp" }
  /** The Settings tab became visible: the host sends `ompStatus`, and `modelSuggestions` from the same `omp models` call. */
  | { type: "ompStatusWanted" }
  /** The wizard's omp step is shown: the host searches the agent instruction files of `root` (a workspace folder; absent means the project's folder) and answers with `instructionFiles`. */
  | { type: "instructionFilesWanted"; root?: string }
  /** The developer followed a file of the warning on the omp step: the host opens it only if it is in the last `instructionFiles` answer. */
  | { type: "openInstructionFile"; path: string }
  /** The wizard's tree opens `path` (relative to `root`, empty for the first level); the host answers with `folderChildren`. */
  | { type: "folderChildrenWanted"; root: string; path: string }
  /**
   * The developer confirmed the summary of the wizard. `values` holds only the keys that changed, in the order of the steps; `excluded` the
   * paths left out of the import. The host saves the keys, then (first setup) initializes `root`, then carries on with `choice`.
   */
  | { type: "confirmSetup"; mode: SetupMode; choice?: SetupChoice; root?: string; values: { key: string; value: SettingValue }[]; excluded: string[] }
  /** The panel now shows `view`: the host tells the side menu, which highlights that entry. */
  | { type: "viewChanged"; view: ViewName };

/** The views of the panel, which has no tab bar: the side menu, the commands `Trama: Show <view>` and the internal links choose among them. Without a project only `getstarted` and `settings` exist. */
export type ViewName = "getstarted" | "diagram" | "board" | "requirements" | "specs" | "history" | "settings";

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
  /** Identity of an announcement: the Board opens the details of its ghost, replacing any other details window, and closing it puts the focus on the Backlog column. */
  ghost?: string;
}

/** Host -> webview. */
export type ToWebview =
  /** `asking`: a question round is open; `resolve` reports the blocker, why every Run is disabled, per open Drift the reason its Resolve is disabled (null when it works), and the open Drifts the running resolution is working on (`resolving`). `unify.blockers` are all the reasons Unify Drifts is unavailable, in order (empty when it works), and `unify.unifying` the open Drifts the running Unify Drifts agent works on. `models` carries the models chosen for the Proposals that carry Tasks. `scans.advisorScanner`: the Advisor Scanner is on, so the Scan buttons are disabled. `refinement` is the state of the Proposal refinement (absent: off); see `RefinementView`. `runEstimate` is the time left of the Run all of this window; see `RunEstimateView`. */
  | { type: "snapshot"; snapshot: Snapshot; asking: boolean; resolve: { blocker: string | null; runReason: string | null; running?: boolean; drifts: Record<string, string | null>; resolving: string[] }; unify: { blockers: string[]; unifying: string[] }; models: BoardModels; scans: { advisorScanner: boolean }; refinement?: RefinementView; runEstimate: RunEstimateView }
  /** Announcements withdrawn because the agent finished without delivering their cards: the Board tells the developer. */
  | { type: "withdrawn"; announcements: AnnouncementView[] }
  /** The run control stopped following a job or released a Task: the Board shows `Trama stopped following <subject>: <reason>.` (`ui#agents`). `details` are the last lines of omp's error output, shown behind `Show details`. */
  | { type: "stoppedFollowing"; subject: string; reason: string; details?: string }
  /** A notice at the top of the Board, closable like the others: a Clear that was refused or failed says why. */
  | { type: "notice"; text: string }
  /** The host is done with the last `clearDone`, sent after the fresh picture whether Clear succeeded, was refused (`cleared` empty) or failed: `cleared` are the identities really deleted. The Board then stops hiding the cards it hid at the click. */
  | { type: "clearDoneEnded"; cleared: string[] }
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
  /** The check of omp for the wizard: omp is being updated to `version`, or it is done (omp answered with `models` models and `version`, or `error` says why not; `updateError` is why a check or update failed; `tooOld` says omp is older than the minimum or its version cannot be read). */
  | { type: "agentCheck"; ompPath: string; state: "updating"; version: string }
  | { type: "agentCheck"; ompPath: string; state: "done"; ok: boolean; missing: boolean; version?: string; models?: number; error?: string; updateError?: string; tooOld?: true }
  /** The state of omp for the Settings tab: being checked, or done with the `version` that answers and the number of `models` omp lists, or `error` saying why not (`missing` when the program was not found); `tooOld` says the version is older than the minimum. */
  | { type: "ompStatus"; state: "checking" | "done"; missing?: boolean; version?: string; models?: number; error?: string; tooOld?: true }
  /** The agent instruction files found for `root`, with `path` absolute and `label` as it is shown. No content is sent. */
  | { type: "instructionFiles"; root: string; files: InstructionFileView[] }
  /** The entries of one folder of the wizard's tree, without the ones named with a dot or ignored by git. */
  | { type: "folderChildren"; root: string; path: string; entries: FolderEntry[] }
  | ({ type: "navigate"; view: ViewName } & NavigateOptions)
  /** The question round being answered, drawn over the tabs; null when none is. */
  | { type: "questions"; round: QuestionRoundView | null }
  /** The Trama settings: the schema from the manifest, per key the user value and (for keys not application-scoped) the workspace value. */
  | { type: "settings"; schema: SettingSchema[]; values: Record<string, SettingsValues> }
  /** Model names the Settings tab suggests for the three model roles, from omp; an empty list means plain text, and `error` says why omp gives none. With `ompPath` the list answers the wizard's request for the omp at that path and only the wizard takes it. */
  | { type: "modelSuggestions"; models: ModelSuggestion[]; error?: string; ompPath?: string };
