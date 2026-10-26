import type { GhProblemKind, LinkedProject, ProjectChoice, ProjectFields } from "../../src/core/github";
import type { IssueActions, IssueOnGitHub, IssueSignals } from "../../src/core/timeline";
import type { OpenLoad } from "../../src/core/sprints";
import type { PersonErrors, PersonInput, PersonView } from "../../src/core/people";
import type { Origin } from "../../src/core/manager-mode";
import type { SoloKind } from "../../src/core/solo-mode";
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

/** The Proposal refinement, as the host carries it with each picture. `enabled`: the setting `trama.autoUpdateStaleProposals` is on. `running`: the Proposals the agents refine now, in the order they started. `queued`: the Proposals waiting, in order, each with why. `refineAll`: the Refine All menu entry. `notes`: the latest note the agent declared for each Proposal in `running`, by its identity; one whose agent declared none has no entry. `runInProgress`: a Run launched from this window is in progress, so Approve is disabled. `waiting`: the Proposals the refinement delivered and that are approved only when that Run ends. */
export interface RefinementView {
  enabled: boolean;
  running: string[];
  queued: QueuedRefinement[];
  refineAll: RefineAllView;
  notes: Record<string, string>;
  runInProgress: boolean;
  waiting: string[];
}

/** The time left of a Run all launched from this window, as the host carries it with each picture: `null` without a Run all, `{ estimating: true }` while Trama works it out, otherwise the range in minutes (not rounded), whether the Run all lasts longer than its reference (the time since the launch passes it), and `done`, its progress between 0 and 0.95 (the highest reached outside `over`; 0.95 when `over`). */
export type RunEstimateView = null | { estimating: true } | { low: number; high: number; over: boolean; done: number };

/**
 * What `Replan` of the Decisions tab needs (`rules#developer.REPLAN_HANDOFFS`), as the host carries it with each picture while Team is available: `block` is the first reason
 * Replan is unavailable, null when it is available; `running` says a Replan launched from this window runs (its button shows the loader); `open` and `stale` are the numbers of open
 * handoffs and of stale ones among them, which the confirmation names.
 */
export interface ReplanView {
  block: string | null;
  running: boolean;
  open: number;
  stale: number;
}

/** One group of a Run all that a sequence cuts by model: the Tasks of the Proposals in `include`, or every Task but those of the Proposals in `exclude`. `model` is the group's model; absent for the Settings group. */
export interface RunGroup {
  include?: string[];
  exclude?: string[];
  model?: string;
}

/** What the buttons can ask an external agent to do. The host turns each into a prompt for one skill. */
export type AgentAction =
  /** The whole System: the scan of Scan System of the side menu. */
  | { kind: "scan" }
  /** The scan the host starts after a merge of Solo mode ended: the whole System, told which commits the merge brought in. Only the host sends it. */
  | { kind: "mergeScan"; base: string; incoming: string }
  /** The agent resolves the conflicts of the merge `branch` that Trama started and that is open. Only the host sends it. */
  | { kind: "reconcileMerge"; branch: string }
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

/** One workspace folder as the wizard lists it: `hasFiles` when its first level holds a file or a folder whose name does not start with a dot; `inGit` when it is inside a git working tree (Solo mode needs one); `origin` what its `origin` remote says (Manager mode needs a repository on GitHub). */
export interface WorkspaceFolderView {
  name: string;
  root: string;
  hasFiles: boolean;
  inGit: boolean;
  origin: Origin;
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
  /** Every launch the panel sends but the host-only ones: the scans (Scan System of the side menu, the scan after a merge) and the reconciling of a merge. */
  | { type: "launch"; action: Exclude<AgentAction, { kind: "scan" | "mergeScan" | "reconcileMerge" }> }
  /** + Add Work Item: the host opens the Markdown document of a written design request. */
  | { type: "writeDesignRequest" }
  /** `New handoff` of the Team view: the host opens the Markdown document of a handoff request, only while Team is available; otherwise a warning says why. */
  | { type: "writeHandoffRequest" }
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
  /** «Publish again» of the Issues tab: the host asks the agent to publish the issues of the approved handoff `handoff` that are not published, only while Team is available and a GitHub Project is linked; when the instruction does not leave, nothing changes and a `notice` says why. */
  | { type: "publishAgain"; handoff: string }
  /** «Split» on an issue estimated more than three days of an open handoff: the host rechecks the reasons Split is unavailable, in order, and asks the agent to split the issue into issues that each fit a sprint, on the same handoff; when the instruction does not leave, nothing changes and a `notice` says why. */
  | { type: "splitIssue"; handoff: string; issue: string }
  /** «Replan» of the Decisions tab, sent only by the confirmation of its dialog (`developer.REPLAN_HANDOFFS`): the host rechecks the reasons Replan is unavailable, in order, gathers the open handoffs at that moment, stale ones included, and asks the agent to plan again together the issues of those that are not stale; when the instruction does not leave, nothing changes and a `notice` says why. */
  | { type: "replanHandoffs" }
  /** «Comment update» of the Issues tab, on a published open issue the Model changed under (`developer.ASK_ISSUE_UPDATE`): `issue` is the issue's identity. The host rechecks that the issue is published, open and stale and that Team is available and no job of its own or Run of this window is in progress, and asks the agent to comment on it what changed; when the instruction does not leave, nothing changes and a `notice` says why. */
  | { type: "askIssueUpdate"; issue: string }
  /** «Scan» of the Issues tab, on a published issue that is `Closed` (`developer.SCAN_ISSUE`): `issue` is the issue's identity. The host rechecks Team and the Run and asks the agent to compare only the references of the issue with the code; when the instruction does not leave, nothing changes and a `notice` says why. */
  | { type: "scanIssue"; issue: string }
  /**
   * The Manager changed a field of an issue of an open handoff in the issue preview (`developer.CHANGE_ISSUE_FIELD`): `key` is `assignee`, `reviewer`, `estimate`, `sprint` or `fields.<name>`; `value` is the handle,
   * the sprint's title, the option or text chosen, a number of days for `estimate`, or null for nobody, no sprint or no value. The host checks the value against the team and the linked Project it read, writes
   * it in `manager` of the issue's file only, and answers with a fresh picture; a value it refuses changes nothing and is answered with `issueFieldRejected`. Undo sends the agent's own value.
   */
  | { type: "setIssueField"; handoff: string; issue: string; key: string; value: string | number | null }
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
  /** The developer changed the `Solo Mode` row of the Settings tab: the host writes it into the project (`.trama/solo/` and git's local `info/exclude`) and answers with `soloMode`, also when the write failed. Not a setting of the editor. */
  | { type: "setSoloMode"; solo: SoloKind }
  /** The developer changed the `Manager Mode` row of the Settings tab: the host writes it into the project (`.trama/manager/mode.json` only) and answers with `managerMode`, also when the write failed. Not a setting of the editor. */
  | { type: "setManagerMode"; on: boolean }
  /** `Save` of the person's dialog (`developer.EDIT_PERSON`; a new person has no `id`): the host checks every field again, refuses an invalid person with `personRejected` and writes nothing, otherwise saves it (a new person in the team of this project) and answers with `team`. Only while Team is available. */
  | { type: "savePerson"; person: PersonInput }
  /** `Add from other projects` (`developer.ADD_TO_TEAM`): the host puts the person in the team of this project. */
  | { type: "addToTeam"; id: string }
  /** `Remove from team` (`developer.REMOVE_FROM_TEAM`): the host takes the person out of the team of this project at once, with no confirmation. */
  | { type: "removeFromTeam"; id: string }
  /** `Undo` of the notice of `Remove from team`: the host puts the person back in the team of this project. */
  | { type: "undoRemoveFromTeam"; id: string }
  /** `Delete person` (`developer.DELETE_PERSON`): the host asks for confirmation in a modal dialog and only then deletes the person from the Manager's list and from every team. */
  | { type: "deletePerson"; id: string }
  /** `Link` of the GitHub Project picker (`developer.LINK_GITHUB_PROJECT`): the host links the Project `owner`/`number` only if it is one of the Projects it read and has an iteration field; the title and the iteration field are the host's, never the webview's. A failed write changes nothing and a `notice` says why. Only while Team is available. */
  | { type: "linkGitHubProject"; owner: string; number: number }
  /** `Unlink` of the Project's popover (`developer.UNLINK_GITHUB_PROJECT`): the host deletes the local record of the linked Project; nothing changes on GitHub. */
  | { type: "unlinkGitHubProject" }
  /** `Refresh` and `Retry` of the Team view (`developer.REFRESH_TEAM`): the host reads GitHub again, unless a read is running. */
  | { type: "refreshTeam" }
  /** `Log in to GitHub` and `Give access` (`developer.LOG_IN_GITHUB`): the host opens a visible terminal that logs `gh` in, or gives it access to Projects when it is logged in without it; at the end of the command it reads GitHub again. */
  | { type: "logInGitHub" }
  /** `Show details` of the box `Couldn't read the GitHub Project`: the host opens Trama's output channel on everything `gh` said. */
  | { type: "showGitHubDetails" }
  /** The developer followed an http or https link in a rendered text: the host opens it in the system browser. */
  | { type: "openLink"; url: string }
  /** The developer chose a preview of an image of a Task: the host opens that file whole in an editor tab, only if it is an image the Task has. */
  | { type: "openTaskImage"; task: string; name: string }
  /** Import from Code or Start from Scratch on the Diagram with the empty Model: the host shows the Settings tab with the wizard in the Empty Model mode and that choice. */
  | { type: "openGuidedSetup"; choice: SetupChoice }
  /** The wizard's omp step wants omp checked at `ompPath`; the host answers with `agentCheck`. `systemCertificates` is the step's value of System Certificates, which holds for this check (with its update) only; without it the saved setting counts. */
  | { type: "agentCheckWanted"; ompPath: string; systemCertificates?: boolean }
  /** Install omp: the host opens a visible terminal with omp's official installer. `systemCertificates` is the wizard step's value of System Certificates, for that terminal only; without it the saved setting counts. */
  | { type: "installOmp"; systemCertificates?: boolean }
  /** Log in to a model provider: the host opens a visible terminal that runs `omp login <provider>`, `provider` being an id of `OMP_LOGIN_PROVIDERS`. Without `ompPath` the omp is the saved `trama.ompPath` (the Settings tab); with it, the wizard's omp step's path, saved or not. `systemCertificates` as in `installOmp`. */
  | { type: "ompLogin"; provider: string; ompPath?: string; systemCertificates?: boolean }
  /** Log out of a model provider: after a modal confirmation the host has omp forget the accounts it stored for it (`omp auth-broker logout <provider>`, no terminal), `provider` being an id of `OMP_LOGIN_PROVIDERS`. `ompPath` as in `ompLogin`. */
  | { type: "ompLogout"; provider: string; ompPath?: string }
  /** The developer pressed Set/Change API key on the Cursor row: the host opens a masked input box, saves the key in the editor's secret storage and checks omp again. Without `ompPath` the omp is the saved `trama.ompPath`; with it, the wizard's omp step's path. The webview never has the key: no field carries it. */
  | { type: "setCursorApiKey"; ompPath?: string }
  /** The developer pressed Remove API key on the Cursor row: the host removes the saved key without asking and checks omp again. `ompPath` as in `setCursorApiKey`. */
  | { type: "removeCursorApiKey"; ompPath?: string }
  /** The developer pressed Set/Change access token in the Notifications subgroup: the host opens a masked input box and saves the token in the editor's secret storage. The webview never has the token: no field carries it. */
  | { type: "setNtfyToken" }
  /** The developer pressed Remove access token: the host removes the saved token without asking. */
  | { type: "removeNtfyToken" }
  /** The developer pressed Send test notification: the host sends one notification to the server and topic of now, once, and answers with `testNotification`. Refused while a test runs in the window. */
  | { type: "sendTestNotification" }
  /** The Settings tab became visible: the host sends `ompStatus`, and `modelSuggestions` from the same `omp models` call. */
  | { type: "ompStatusWanted" }
  /** Refresh next to the System Certificates state of the Settings tab: the host exports the bundle again, only while the saved setting is on and no export is running. No data. */
  | { type: "refreshSystemCertificates" }
  /** The wizard's omp step has System Certificates checked and wants the bundle exported (it was just checked and the bundle is missing or old, or Refresh was pressed): the host exports it unless an export is running. No data: the step's value is the webview's. */
  | { type: "systemCertificatesExport" }
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
  | { type: "confirmSetup"; mode: SetupMode; choice?: SetupChoice; root?: string; values: { key: string; value: SettingValue }[]; excluded: string[]; solo?: SoloKind; manager?: boolean }
  /** The panel now shows `view`: the host tells the side menu, which highlights that entry. */
  | { type: "viewChanged"; view: ViewName };

/** The views of the panel, which has no tab bar: the side menu, the commands `Trama: Show <view>` and the internal links choose among them. Without a project only `getstarted` and `settings` exist. */
export type ViewName = "getstarted" | "diagram" | "board" | "requirements" | "specs" | "history" | "team" | "settings";

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
  /** `asking`: a question round is open; `resolve` reports the blocker, why every Run is disabled, per open Drift the reason its Resolve is disabled (null when it works), and the open Drifts the running resolution is working on (`resolving`). `unify.blockers` are all the reasons Unify Drifts is unavailable, in order (empty when it works), and `unify.unifying` the open Drifts the running Unify Drifts agent works on. `models` carries the models chosen for the Proposals that carry Tasks. `refinement` is the state of the Proposal refinement (absent: off); see `RefinementView`. `runEstimate` is the time left of the Run all of this window; see `RunEstimateView`. */
  | { type: "snapshot"; snapshot: Snapshot; asking: boolean; resolve: { blocker: string | null; runReason: string | null; running?: boolean; drifts: Record<string, string | null>; resolving: string[] }; unify: { blockers: string[]; unifying: string[] }; models: BoardModels; refinement?: RefinementView; runEstimate: RunEstimateView; githubRepo?: string; replan?: ReplanView }
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
  | { type: "agentCheck"; ompPath: string; state: "done"; ok: boolean; missing: boolean; version?: string; models?: number; providers?: string[]; error?: string; updateError?: string; tooOld?: true }
  /** The state of omp for the Settings tab: being checked, or done with the `version` that answers and the number of `models` omp lists, or `error` saying why not (`missing` when the program was not found); `tooOld` says the version is older than the minimum. */
  | { type: "ompStatus"; state: "checking" | "done"; missing?: boolean; version?: string; models?: number; providers?: string[]; error?: string; tooOld?: true }
  /** The state of the System Certificates bundle of this window: an export is running (`exporting`), the number of certificates (`count`) and the ISO time (`exportedAt`) of the bundle on disk, and why the last export failed (`error`). Sent at `ready`, when the Settings view becomes visible and at every change of the state. */
  | { type: "systemCertificates"; exporting: boolean; count?: number; exportedAt?: string; error?: string }
  /** Whether a Cursor API key is saved in the editor's secret storage, sent at `ready`, when the Settings tab becomes visible and after every change; never the key. */
  | { type: "cursorApiKey"; saved: boolean }
  /** Whether an access token of the ntfy server is saved in the editor's secret storage, sent at `ready`, when the Settings tab becomes visible and after every change, also another window's; never the token. */
  | { type: "ntfyToken"; saved: boolean }
  /** How the test notification of the Settings tab is going: being sent, sent (the server answered 2xx), or failed with `reason` (`HTTP <status>`, `no response within 10 seconds`, `the server redirected the request` or the network error's message). */
  | { type: "testNotification"; state: "sending" | "sent" | "failed"; reason?: string }
  /** Whether the logout of the provider `provider` is running (the command and the omp check that follows it), sent with `true` after the confirmation and with `false` when that check has answered. */
  | { type: "ompLogoutState"; provider: string; running: boolean }
  /** The agent instruction files found for `root`, with `path` absolute and `label` as it is shown. No content is sent. */
  | { type: "instructionFiles"; root: string; files: InstructionFileView[] }
  /** The entries of one folder of the wizard's tree, without the ones named with a dot or ignored by git. */
  | { type: "folderChildren"; root: string; path: string; entries: FolderEntry[] }
  /** Solo mode of the project for the `Solo Mode` row: whether the folder is in a git repository, the kind now, and the files of Trama git still tracks (relative to the project root). Sent at `ready`, when the Settings view becomes visible and after every write; never without a project. */
  | { type: "soloMode"; available: boolean; solo: SoloKind; tracked: string[] }
  /** Manager mode of the project for the `Manager Mode` row and the Team view: `available` (recorded and origin on GitHub), `recorded`, the GitHub repository of origin (`<owner>/<repo>`) and, without one, `reason` (`No origin remote` or `Origin is not on GitHub`). Sent at `ready`, when the Settings or the Team view becomes visible and after every write; never without a project. */
  | { type: "managerMode"; available: boolean; recorded: boolean; repository: string | null; reason: string | null }
  /** The Team view's people (`tech#team`): the team of this project (`members`), the people outside it that `Add from other projects` offers (`others`), how many saved people cannot be read and are not listed (`unreadable`), and `error`, a sentence for the notice at the top of the People tab (a write that failed, or a stored value that cannot be read), null when there is none. Sent at `ready`, when the Team view becomes visible and after every write, only while Team is available. */
  | { type: "team"; members: PersonView[]; others: PersonView[]; unreadable: number; error: string | null }
  /** What the Team view shows of GitHub (`ui#github-project`): the state (`loading` before the first read ends; `ready`; or the state of `gh` that stopped the last read), whether a read runs, the repository (`<owner>/<repo>`), the linked Project, when the data on show was read (ISO time, null before the first read that worked), the linked Project's fields, iterations and address, where each issue Trama published is at the last read (`issues`: its state and the sprint, estimate and assignee GitHub has now, from `src/core/timeline.ts`), what every open item of the Project adds to its assignee's load in its sprint (`loads`, the Timeline's load; the items themselves never leave the host), the signals of the open issues by number (`signals`, from `src/core/timeline.ts`, recomputed at every picture) and why Comment update and Scan are not available for each published issue (`actions`), the Projects of the owner the picker offers, and the reason of the last failure. Sent at `ready`, when the Team view becomes visible and whenever a read starts or ends or the link changes, only while Team is available. */
  | { type: "teamGitHub"; state: "loading" | "ready" | GhProblemKind; reading: boolean; repository: string | null; linked: LinkedProject | null; readAt: string | null; project: ProjectFields | null; issues: IssueOnGitHub[]; loads: OpenLoad[]; signals: IssueSignals; actions: Record<number, IssueActions>; projects: ProjectChoice[]; error: string | null }
  /** A `savePerson` was refused without writing: the message of each invalid field, under the field of the person's dialog, which stays open. */
  | { type: "personRejected"; errors: PersonErrors }
  /** A `setIssueField` was refused without writing: the message of `rules#developer.CHANGE_ISSUE_FIELD` for the field of that issue, which the preview shows under the input. */
  | { type: "issueFieldRejected"; handoff: string; issue: string; key: string; message: string }
  | ({ type: "navigate"; view: ViewName } & NavigateOptions)
  /** The question round being answered, drawn over the tabs; null when none is. */
  | { type: "questions"; round: QuestionRoundView | null }
  /** The Trama settings: the schema from the manifest, per key the user value and (for keys not application-scoped) the workspace value. */
  | { type: "settings"; schema: SettingSchema[]; values: Record<string, SettingsValues> }
  /** Model names the Settings tab suggests for the three model roles, from omp; an empty list means plain text, and `error` says why omp gives none. With `ompPath` the list answers the wizard's request for the omp at that path and only the wizard takes it. */
  | { type: "modelSuggestions"; models: ModelSuggestion[]; error?: string; ompPath?: string };
