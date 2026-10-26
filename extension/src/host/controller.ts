import { readdirSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { homedir } from "node:os";
import { randomBytes, randomUUID } from "node:crypto";
import * as vscode from "vscode";
import { TramaError, UsageError } from "../../../src/core/errors";
import { clearDoneTasks } from "../../../src/core/clear-done";
import { deleteTask } from "../../../src/core/delete-task";
import { findInstructionFiles } from "../../../src/core/instruction-files";
import { type ApprovalBlock, approvalBlock, approveProposal, getProposal, health, listProposals, type Proposal, rejectProposal, requiredProposals, resolutionHolding, setIssueField, stillBeingWritten, touchedFiles } from "../../../src/core/proposals";
import { type PreparedQuestion, preparedOutcome, preparedStatus } from "../../../src/core/prepared";
import { reworkProposalBlocker, reworkProposalDrifts, resolveDriftBlocker, resolveDriftsBlocker, resolutionFacts, runWindowBlocker, unifiableDrifts, unifyDriftsBlockers, type WindowWork, writePreparedResolution } from "../../../src/core/resolution";
import type { QuestionAnswer } from "../../../src/core/questions";
import type { Picture, Snapshot } from "../../../src/core/snapshot";
import { loadModel, modelDir, type Project, REQUIREMENTS_PREFIX, requirementsDir } from "../../../src/core/store";
import { namerOf } from "../../../src/core/card-names";
import { RUN_IN_PROGRESS, runBlocker } from "../../../src/core/design";
import { cardName, syncShortNumbers } from "../../../src/core/short-numbers";
import { attachedDrift, blockedTasks, dismissDrift, type Drift, getDrift, getTask, getTaskOrNull, listTasks, originDesign, requireNotAttached } from "../../../src/core/work";
import type { AgentAction, NavigateOptions, RefinementView, ReplanView, RunEstimateView, SetupChoice, ToHost, ToWebview, ViewName, WorkspaceFolderView } from "../protocol";
import type { MenuViewName } from "../menu-protocol";
import { VIEW_LABELS } from "../view-labels";
import { type Announcement, listAnnouncements } from "../../../src/core/announcements";
import { onAnnouncementsWithdrawn } from "./announcements";
import { type PictureOutcome, WindowPicture } from "./picture";
import { configuredAsyncDriftResolver, configuredAutoUpdateStaleProposals, configuredMaxParallelAgents, configuredModels, configuredNtfyTarget, configuredOmpPath, configuredParallelExecution, configuredSkillsDir, configuredSystemCertificates, type DesignAnnouncement, type Instruction, type LaunchAnnouncement, type LaunchJobOptions, endHeldJob, installOmp, launchAgent, type LogoutOutcome, launched, loginGitHub, loginOmp, logoutOmp, openAskMore, settings, startHeldJob } from "./agent";
import { bundledUnifyInstructions } from "./bundled";
import { onQuestionRoundChange, questionRoundOpen } from "./question-activity";
import { driftWork, driftsFinishing, localProjectJobs, onAgentStopped, onDriftResolutionChange, onProposalDelivered, onStoppedFollowing, proposalsFinishing, receiveNotice, releaseFiledWork, type RunAll, tasksFinishing, unifyingDrifts } from "./drift-resolution";
import { agentStoppedNotice } from "../../../src/core/omp-chat-conversation";
import { askPreparedRound } from "./questions";
import { askMorePlaceholder, askMoreSubject, askMoreTerminalName } from "./ask-more";
import { webviewHtml } from "./html";
import { parseToHost } from "./messages";
import { taskImagePath, withImageUris } from "./task-images";
import { taskImagesRoot } from "../../../src/core/task-images";
import { appliedProposalModels, boardModels, chooseProposalModel, forgetProposalModels, proposalRunModel, type BoardModels, type ModelMemory } from "./proposal-models";
import type { RunModel } from "./terminal-agent";
import {
  type ChainFact,
  NO_REFINEMENT,
  type PickFact,
  type QueuePlan,
  type RefinementEnd,
  type RefinementState,
  backlogOrder,
  beginRefinement,
  cancelRefineAllAllowed,
  dependencyOrder,
  dequeue,
  emptyQueue,
  endRefinementJob,
  enqueue,
  markDelivered,
  planQueue,
  refinable,
  refineAllClicked,
  refineAllPick,
  refinementEnd,
  refinementNotes,
  refinementView,
  switchedOff,
  withdraw,
  writtenNow,
} from "./refinement";
import { planRuns, runSequence, runSequenceTogether, startRuns, type AppliedModel, type PlannedRun } from "./run-groups";
import { runAllEstimate } from "./run-all-estimate";
import { ompModels } from "./model-lists";
import { ensureOmpUpdated, findOmp, forgetUpdateCheck } from "./omp-update";
import { cursorKeySaved, onCursorApiKeyChanged, removeCursorApiKey, saveCursorApiKey } from "./cursor-api-key";
import { ntfyToken, ntfyTokenSaved, onNtfyTokenChanged, removeNtfyToken, saveNtfyToken } from "./ntfy-token";
import { sendNtfy } from "./away-notices";
import { testText } from "../../../src/core/away-notices";
import { ompLoginProvider } from "../omp-login";
import { ompStatus } from "./omp-status";
import { exportFailureMessage, onSystemCertificatesChanged, runExport, systemCertificatesState } from "./system-certificates";
import { confirmScanSystem } from "./scan-confirm";
import { planSettingChange, settingsSchema, settingTitle, type SettingPlan, type SettingSchema, type SettingsValues } from "./settings-schema";
import { resolveMarkdownFile } from "./paths";
import type { SoloKind } from "../../../src/core/solo-mode";
import { checkSkills, fileFolders, findProject, initializeProject, NO_PROJECT_WARNING, updateSkills } from "./project";
import { inGitRepository, soloModeMessage, writeSoloMode } from "./solo-mode";
import { managerModeMessage, writeManagerMode } from "./manager-mode";
import { managerStatus, readOrigin, teamUnavailableReason } from "../../../src/core/manager-mode";
import { type GitHubTarget, githubTarget, linkChosenProject, TeamGitHub } from "./team/github";
import { findGh, linkedGithubProject, localToday, unlinkGithubProject } from "../../../src/core/github";
import { People, type SaveOutcome, type WriteOutcome } from "./team/people";
import { appliedFields, beginPublishing, findIssue, handoffBeingWritten, issuesOfHandoff, listIssues, publishAgainBlock, referenceTexts, REPLANNING_TITLE, replanHandoffsBlock, replanRunning, splitIssueBlock, stopPublishing } from "../../../src/core/issues";
import { fieldRulesOf, publishedIssues } from "../../../src/core/team-views";
import { type IssueActions, type IssueOnGitHub, issueActions, issueJobs, issueSignals, type IssueSignals, scanBlock, SCANNING_REASON, scanningTitle, UPDATING_REASON, updateBlock, updatingTitle } from "../../../src/core/timeline";
import { folderChildren, folderInside, gitIgnored, type RawEntry } from "./folder-tree";
import { askMoreTarget } from "./question-state";
import type { QuestionSession } from "./question-session";
import type { DesignRequests } from "./design-requests";

import { writeLastScan } from "../../../src/core/last-scan";
import { askMorePart, buildPrompt, mayFileDrifts, PREPARED_ANSWER_SENTENCE, reworkPrompt, terminalName, type ResolvedAction } from "./prompts";

/** How often the time left of a Run all is worked out again while it goes on. */
const RUN_ESTIMATE_INTERVAL_MS = 60_000;

/** The key under the `trama` section for a manifest key: `trama.maxParallelAgents` is read and written as `maxParallelAgents`. */
const sectionKey = (key: string): string => key.slice("trama.".length);

export const describeError = (err: unknown): string =>
  err instanceof TramaError || err instanceof UsageError ? err.message : `Unexpected error: ${err instanceof Error ? err.message : String(err)}`;

/** Remembers the instant a System scan's instruction left Trama, so the Scan count restarts; a failed write keeps the previous instant and is reported. */
function rememberDeliveredScan(project: Project, startedAt: number): void {
  try {
    writeLastScan(project, new Date(startedAt).toISOString());
  } catch (error) {
    void vscode.window.showErrorMessage(`Trama: could not remember the completed System scan: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/** The Tasks as a run sees them, in creation order: where they stand, whether the agent has them, and what blocks them. */
function runTasks(project: Project) {
  const blocked = blockedTasks(project);
  return listTasks(project).map((t) => ({ id: t.id, proposal: t.data.proposal, column: t.data.column, agent: t.data.agent, blockedBy: blocked.get(t.id) ?? [] }));
}

/** Whether a Run launched by Trama is going in this editor window: the Run controls never see the Runs of other windows. */
const ownWindowRuns = (root: string): boolean => localProjectJobs(root).some((job) => job.kind === "run");

const QUESTIONS_WAITING = "Trama has questions from the agent waiting.";
const REOPEN = "Reopen";

/** The masked input box of the Cursor API key: the text without spaces around it, or undefined for Esc. A blank text cannot be confirmed. */
async function askCursorApiKey(): Promise<string | undefined> {
  const typed = await vscode.window.showInputBox({
    title: "Cursor API key",
    prompt: "Paste a user API key from the Cursor dashboard. Trama keeps it in the editor's secret storage.",
    password: true,
    ignoreFocusOut: true,
    validateInput: (text) => (text.trim() === "" ? "Enter a Cursor API key." : undefined),
  });
  const key = typed?.trim();
  return key === undefined || key === "" ? undefined : key;
}

/** The masked input box of the ntfy access token: the text without spaces around it, or undefined for Esc. A blank text cannot be confirmed. */
async function askNtfyToken(): Promise<string | undefined> {
  const typed = await vscode.window.showInputBox({
    title: "ntfy Access Token",
    prompt: "Paste the access token of your ntfy server.",
    password: true,
    ignoreFocusOut: true,
    validateInput: (text) => (text.trim() === "" ? "Enter an access token." : undefined),
  });
  const token = typed?.trim();
  return token === undefined || token === "" ? undefined : token;
}

const notBlank = (message: string) => (value: string) => (value.trim() === "" ? message : undefined);

/** The GitHub repository whose team the Team view shows, or null while Team is not available (Manager mode off, or origin not on GitHub). */
function teamRepository(project: Project): string | null {
  const status = managerStatus(project);
  return status.available ? status.repository : null;
}

/** Whether the Model has no Feature and no Actor: the Drifts, open or not, do not count. */
function modelIsEmpty(project: Project): boolean {
  const model = loadModel(project);
  return model.features.size === 0 && model.actors.size === 0;
}

/** The approval block of Proposal `id` that refinement does not clear (every block but staleness and a Draft left refining); null when none. */
function refinementBlock(project: Project, id: string): ApprovalBlock | null {
  const block = approvalBlock(project, id);
  return block === null || block.kind === "stale" || block.kind === "draft" ? null : block;
}

/** Owns the single Trama panel, feeds it snapshots and carries out what the developer asks of it. */
export class Controller implements vscode.Disposable {
  /** The Proposal refinement of this window: the queue, the refinements at work and the Proposals waiting for a Run, in memory. */
  private refinement: RefinementState = NO_REFINEMENT;
  private panel: vscode.WebviewPanel | undefined;
  /** The picture of the project, one per window: the panel and the side menu show the same one (`tech#picture`). */
  private readonly picture: WindowPicture;
  /** Worked out again every `RUN_ESTIMATE_INTERVAL_MS`, only while a Run all of this window goes on. */
  private estimateTimer: NodeJS.Timeout | undefined;
  /** The estimate the Board was last sent, as text, so the timer sends only a change. */
  private lastRunEstimate = "null";
  private disposed = false;
  /** The open Drifts the resolution launched from this window was asked to resolve; cleared once no resolution runs. */
  private readonly namedByResolution = new Set<string>();
  /** How a prepared question is asked in this window; a test replaces it. */
  private askPrepared: typeof askPreparedRound = askPreparedRound;

  /** The newest omp request (the model suggestions and the status of the Settings tab share it): an answer that arrives after a newer request is dropped. */
  private ompRequest = 0;
  /** The omp request under way: a wish for the same omp path while it runs joins it, so `omp models --json` runs once for the suggestions and the status. */
  private ompRefresh: { path: string; done: Promise<void> } | undefined;
  /** Whether a check of the installed skills is under way: another opening does not start a second. */
  private checkingSkills = false;
  /** The tab a panel just created goes to once its webview is ready (`openSettings`, `openGhostDetails`), with the options of the `navigate`. */
  private pendingView: { view: ViewName; options: NavigateOptions } | undefined;
  /** The wizard a panel just created opens in its Settings tab once its webview is ready. */
  private pendingGuided: Extract<ToWebview, { type: "guidedSetup" }> | undefined;
  /** The view the panel shows now, as its webview last reported it; undefined while no panel is open. */
  private panelView: ViewName | undefined;
  private readonly shownViewListeners = new Set<(view: ViewName | undefined) => void>();
  /** The newest request of model suggestions made by the wizard: an answer that arrives after a newer one is dropped. */
  private wizardSuggestionsRequest = 0;
  /** The paths of the newest `instructionFiles` answer: the only ones the wizard may ask to open. */
  private instructionFilePaths = new Set<string>();
  /** The newest instruction-files search: an answer that arrives after a newer request is dropped. */
  private instructionFilesRequest = 0;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly questions?: QuestionSession,
    /** The picture of the window; without one the controller makes its own, which builds only when asked. */
    picture?: WindowPicture,
    private readonly designRequests?: DesignRequests,
    /** The workspace state, where the models chosen for Proposals are kept. */
    private readonly modelMemory?: ModelMemory,
    /** The Manager's people, kept in the editor's global state; without it the Team view has nothing to read or write. */
    private readonly people?: People,
  ) {
    this.picture = picture ?? new WindowPicture();
    this.github = modelMemory === undefined ? undefined : new TeamGitHub(modelMemory);
  }

  /** The Team view's reads of GitHub (`rules#github-project`); without the workspace state there is nowhere to keep them and the view has nothing to read. */
  private readonly github: TeamGitHub | undefined;
  /** The channel `Show details` opens: everything `gh` said about the last failed read. Created at the first use. */
  private githubOutput: vscode.OutputChannel | undefined;

  /**
   * Opens the panel in front on the Settings view, or brings it forward and puts it there, also in a window without folders (the panel then
   * shows only the settings). A panel just created is sent the `navigate` once its webview is ready, so the view shows and asks for the model
   * suggestions at once.
   */
  async openSettings(guided?: Extract<ToWebview, { type: "guidedSetup" }>): Promise<void> {
    this.questions?.restore();
    if (this.revealPanel()) {
      this.post({ type: "navigate", view: "settings" });
      if (guided) this.post(guided);
    } else {
      this.pendingView = { view: "settings", options: {} };
      this.pendingGuided = guided;
      this.create();
    }
    this.checkSkillsInBackground();
  }

  /**
   * The status bar item chose a ghost: the panel opens in front, or comes to the front, on the Board with the details of the
   * ghost of `announcement`. A panel just created is sent the `navigate` once its webview is ready. A ghost that is gone shows
   * the Board without a window.
   */
  openGhostDetails(announcement: string): void {
    if (!vscode.workspace.workspaceFolders?.length) {
      void vscode.window.showInformationMessage("Trama: open a folder to use Trama.");
      return;
    }
    this.questions?.restore();
    if (this.revealPanel()) {
      this.post({ type: "navigate", view: "board", ghost: announcement });
    } else {
      this.pendingView = { view: "board", options: { ghost: announcement } };
      this.create();
    }
  }

  /** The command Import from Code: with an empty Model the wizard opens on the Settings tab with Import from Code chosen; with a Model it launches the import as before, leaving no folder out. */
  async importFromCode(): Promise<void> {
    const project = this.requireProject();
    if (!project) return;
    if (modelIsEmpty(project)) await this.openSettings({ type: "guidedSetup", mode: "empty-model", choice: "import", root: project.root });
    else await this.launchAction(project, { kind: "import" });
  }

  /** The workspace folders a first setup can initialize. */
  private workspaceFolderViews(): WorkspaceFolderView[] {
    return fileFolders().map((folder) => {
      const root = folder.uri.fsPath;
      let hasFiles = false;
      try {
        hasFiles = readdirSync(root).some((name) => !name.startsWith("."));
      } catch {
        // A folder that cannot be read counts as empty.
      }
      return { name: folder.name, root, hasFiles, inGit: inGitRepository(root), origin: readOrigin(root) };
    });
  }


  /**
   * A question round entered Asking: the panel opens in front, on the Diagram, or comes to the front keeping its tab.
   * Without a project the panel still opens and shows the round; it has no snapshot to draw until a project exists.
   */
  revealForQuestions(): void {
    if (this.panel) {
      this.panel.reveal(undefined, false);
      return;
    }
    this.create();
  }

  /**
   * Creates the panel, or reveals it. Without `.trama/` the panel shows Get Started, and an open question round shows as
   * well. Every call is an ordinary opening of Trama, so the check of the installed skills starts after the panel is shown.
   */
  async open(): Promise<void> {
    if (!vscode.workspace.workspaceFolders?.length) {
      void vscode.window.showInformationMessage("Trama: open a folder to use Trama.");
      return;
    }
    this.questions?.restore();
    if (!this.revealPanel()) this.create();
    this.checkSkillsInBackground();
  }

  /**
   * An entry of the side menu or a command `Trama: Show <view>`: opens the panel on `view`, or brings it forward and moves it there. Only when it opens the panel that
   * was closed it checks the installed skills as an ordinary opening does (only a project has any): with the panel open it only moves the view and starts no check.
   * Settings opens without a folder and in a folder that is no project too; Get Started opens
   * the panel on Get Started; every other view does the ordinary opening when the folder is no Trama project.
   */
  async show(view: MenuViewName): Promise<void> {
    if (view !== "settings" && view !== "getstarted" && findProject() === undefined) return this.open();
    // Team exists only in a project with Manager mode on and origin on GitHub; otherwise the command is the ordinary opening.
    if (view === "team") {
      const project = findProject();
      if (project === undefined || teamRepository(project) === null) return this.open();
    }
    if (view !== "settings" && !vscode.workspace.workspaceFolders?.length) {
      void vscode.window.showInformationMessage("Trama: open a folder to use Trama.");
      return;
    }
    this.questions?.restore();
    if (this.revealPanel()) {
      this.post({ type: "navigate", view });
    } else {
      this.pendingView = { view, options: {} };
      this.create();
      this.checkSkillsInBackground();
    }
  }

  /** The view the open panel shows, or undefined with the panel closed. */
  get shownView(): ViewName | undefined {
    return this.panelView;
  }

  /** Calls `listener` when the panel changes view or closes (undefined). */
  onDidChangeShownView(listener: (view: ViewName | undefined) => void): { dispose(): void } {
    this.shownViewListeners.add(listener);
    return { dispose: () => void this.shownViewListeners.delete(listener) };
  }

  private setPanelView(view: ViewName | undefined): void {
    if (view === this.panelView) return;
    this.panelView = view;
    if (view !== undefined && this.panel) this.panel.title = VIEW_LABELS[view];
    for (const listener of [...this.shownViewListeners]) listener(view);
  }

  /** Checks the installed skills of the project the panel opens, once at a time and without holding the panel back. */
  private checkSkillsInBackground(): void {
    const project = findProject();
    if (!project || this.checkingSkills) return;
    this.checkingSkills = true;
    setTimeout(() => {
      void checkSkills(project).finally(() => {
        this.checkingSkills = false;
      });
    }, 0);
  }

  /** Brings the panel forward if there is one: there is at most one. */
  private revealPanel(): boolean {
    if (!this.panel) return false;
    this.panel.reveal();
    return true;
  }

  /**
   * The confirmation of the setup wizard. Saves the changed keys one at a time in the user settings and stops at the first failure, keeping what was
   * already saved; then, in the first setup, initializes the chosen folder (the developer may decline the overwrite of customised skills, which ends
   * quietly); then carries on with the path. The first setup answers with `setup`, the other modes with `guidedSetupResult`.
   */
  private async confirmSetup(message: Extract<ToHost, { type: "confirmSetup" }>): Promise<void> {
    const first = message.mode === "first";
    const finish = (error: string | null, ok = false) => this.post(first ? { type: "setup", busy: false, error } : { type: "guidedSetupResult", ok, error });
    if (first) this.post({ type: "setup", busy: true, error: null });
    let project: Project | undefined;
    try {
      const schema = this.manifestSettings();
      for (const { key, value } of message.values) {
        const plan = planSettingChange(schema, key, value);
        if (!plan.ok) {
          this.postSettings();
          finish(plan.reason);
          return;
        }
        for (const write of plan.writes) {
          try {
            await settings().update(sectionKey(write.key), write.value, vscode.ConfigurationTarget.Global);
          } catch (error) {
            this.postSettings();
            finish(`Could not save ${settingTitle(write.key)}: ${error instanceof Error ? error.message : String(error)}.`);
            return;
          }
        }
      }
      this.postSettings();
      if (first) {
        const root = fileFolders().find((folder) => folder.uri.fsPath === message.root)?.uri.fsPath;
        if (root === undefined) {
          void vscode.window.showErrorMessage("Trama: open a folder first, then initialize it.");
          finish("The folder to initialize is not in the workspace any more.");
          return;
        }
        const initialized = await initializeProject(root, { ...(message.solo === undefined ? {} : { solo: message.solo }), ...(message.manager === true ? { manager: true } : {}) });
        if (initialized === undefined) {
          finish(null);
          return;
        }
        project = initialized.project;
        // Manager mode is written after the project's files; when that fails the project stays, Manager mode stays off and the reason is shown.
        if (initialized.managerError !== null) void vscode.window.showErrorMessage(`Trama: could not save Manager Mode: ${initialized.managerError.replace(/\.$/, "")}.`);
        this.refresh();
        this.postSolo();
      } else {
        project = findProject();
        if (project === undefined && message.mode === "empty-model") {
          finish("This workspace has no Trama project.");
          return;
        }
        // Solo mode of an empty-Model wizard: written after the settings and before the path, only when the choice differs from the project's value; a failed write is a failed save.
        if (project !== undefined && message.solo !== undefined) {
          try {
            writeSoloMode(project, message.solo, true);
          } catch (error) {
            this.postSolo();
            finish(`Could not save Solo Mode: ${describeError(error).replace(/\.$/, "")}.`);
            return;
          }
          this.postSolo();
        }
        if (project !== undefined && message.manager !== undefined) {
          try {
            writeManagerMode(project, message.manager, true);
          } catch (error) {
            this.postManager();
            finish(`Could not save Manager Mode: ${describeError(error).replace(/\.$/, "")}.`);
            return;
          }
          this.postManager();
        }
      }
    } catch (err) {
      finish(describeError(err));
      return;
    }
    finish(null, true);
    try {
      if (project === undefined) return;
      if (message.choice === "import") await this.launchAction(project, { kind: "import", excluded: message.excluded });
      else if (message.choice === "scratch") await this.designRequests?.writeSetup();
    } catch (err) {
      this.post({ type: "error", message: describeError(err) });
    }
  }

  /**
   * The check of the omp step: the program found as the launches find it, the update check and, with a newer version, the update (announced
   * with `updating`), then `omp models --json`. `systemCertificates` is the wizard step's value of System Certificates for this check; without it the saved setting counts.
   */
  private async checkAgent(ompPath: string, systemCertificates?: boolean): Promise<readonly string[] | undefined> {
    const wanted = ompPath.trim();
    const program = await findOmp(wanted);
    if (program === undefined) {
      this.post({ type: "agentCheck", ompPath, state: "done", ok: false, missing: true, error: `omp not found at ${wanted === "" ? "the editor PATH" : wanted}` });
      return undefined;
    }
    const outcome = await ensureOmpUpdated(program, (version) => this.post({ type: "agentCheck", ompPath, state: "updating", version }), undefined, undefined, systemCertificates);
    if (outcome.missing === true) {
      this.post({ type: "agentCheck", ompPath, state: "done", ok: false, missing: true, error: `omp not found at ${wanted === "" ? "the editor PATH" : wanted}` });
      return undefined;
    }
    const list = await ompModels(wanted === "" ? program : wanted, undefined, undefined, systemCertificates);
    this.post({
      type: "agentCheck",
      ompPath,
      state: "done",
      ok: list.error === undefined,
      missing: list.missing === true,
      ...(outcome.version === undefined ? {} : { version: outcome.version }),
      ...(list.error === undefined ? { models: list.models.length } : { error: list.error }),
      ...(list.providers === undefined ? {} : { providers: list.providers }),
      ...(outcome.updateError === undefined ? {} : { updateError: outcome.updateError }),
      ...(outcome.tooOld === true ? { tooOld: true as const } : {}),
    });
    return list.providers;
  }

  /**
   * Install omp: a visible terminal with the official installer; when it ends the wizard and the Settings tab get a new omp check, for the path set by then. `systemCertificates` is
   * the wizard step's value of System Certificates, for that terminal and that check only; without it the saved setting counts.
   */
  installOmp(systemCertificates?: boolean): void {
    installOmp(
      () => {
        forgetUpdateCheck();
        void this.checkAgent(configuredOmpPath(), systemCertificates);
        void this.refreshOmp(true);
      },
      undefined,
      systemCertificates,
    );
  }

  /**
   * Log in to a model provider: a visible terminal that runs `omp login <provider>` with the omp of `ompPath` (the wizard's omp step, saved or not) or, without
   * it, of the saved `trama.ompPath`. `provider` is an id of the fixed list (`parseToHost` checked it). When the command ends or the terminal closes, whatever
   * the outcome, the Settings tab's omp state and the wizard's omp check run again, silently: the outcome stays in the terminal.
   */
  private async ompLogin(provider: string, ompPath: string | undefined, systemCertificates?: boolean): Promise<void> {
    const entry = ompLoginProvider(provider);
    if (entry === undefined) return;
    const wanted = ompPath ?? configuredOmpPath();
    const program = await findOmp(wanted.trim());
    if (program === undefined) {
      this.post({ type: "error", message: `omp not found at ${wanted.trim() === "" ? "the editor PATH" : wanted.trim()}` });
      return;
    }
    loginOmp(
      program,
      entry,
      () => {
        void this.checkAgent(wanted, systemCertificates);
        void this.refreshOmp(true);
      },
      undefined,
      systemCertificates,
    );
  }

  /** The providers whose logout is under way, so a second request for the same one does nothing until its checks have answered. */
  private readonly loggingOut = new Set<string>();

  /**
   * Log out of a model provider: a modal confirmation first (closing it does nothing at all), then `omp auth-broker logout <id>` (`logoutOmp`) with the omp of `ompPath` (the wizard's
   * omp step, saved or not) or of the saved `trama.ompPath`. `provider` is an id of the fixed list (`parseToHost` checked it). The row is told the logout runs until the checks that
   * follow have answered. A failure is an editor error with omp's reason. Whatever the outcome, the Settings tab's omp state and the wizard's omp check run again; after a success,
   * a provider the check of the same program still lists as Connected is told once to be reachable through another credential.
   */
  private async ompLogout(provider: string, ompPath: string | undefined): Promise<void> {
    const entry = ompLoginProvider(provider);
    if (entry === undefined || this.loggingOut.has(entry.id)) return;
    const choice = await vscode.window.showWarningMessage(
      `Log out of ${entry.name}?`,
      { modal: true, detail: `omp forgets every account of ${entry.name} it stored. Credentials in environment variables, \`.env\` files or \`models.yml\` stay.` },
      "Log out",
    );
    if (choice !== "Log out" || this.loggingOut.has(entry.id)) return;
    this.loggingOut.add(entry.id);
    this.post({ type: "ompLogoutState", provider: entry.id, running: true });
    try {
      const wanted = ompPath ?? configuredOmpPath();
      const program = await findOmp(wanted.trim());
      const outcome: LogoutOutcome = program === undefined ? { ok: false, reason: "could not start omp" } : await logoutOmp(program, entry);
      if (!outcome.ok) void vscode.window.showErrorMessage(`Trama: could not log out of ${entry.name}: ${outcome.reason}.`);
      const [providers] = await Promise.all([this.checkAgent(wanted), this.refreshOmp(true)]);
      if (outcome.ok && providers?.includes(entry.id) === true) {
        void vscode.window.showInformationMessage(
          entry.apiKey === true && cursorKeySaved()
            ? `Trama: ${entry.name} is still connected through the Cursor API key saved in Trama or another credential. Remove them to disconnect.`
            : `Trama: ${entry.name} is still connected through another credential (environment variable, \`.env\` file or \`models.yml\`). Remove it there to disconnect.`,
        );
      }
    } catch (err) {
      this.post({ type: "error", message: describeError(err) });
    } finally {
      this.loggingOut.delete(entry.id);
      this.post({ type: "ompLogoutState", provider: entry.id, running: false });
    }
  }

  /** Sends the panel the state of the System Certificates bundle of this window. */
  private postSystemCertificates(): void {
    this.post({ type: "systemCertificates", ...systemCertificatesState() });
  }

  /**
   * Exports the System Certificates bundle (`rules#developer.REFRESH_SYSTEM_CERTIFICATES`); a request while an export of this window runs does nothing. `origin` says who asked:
   * `automatic` (the extension's start) shows the editor warning once if it fails, with `Open Settings`; `command` says the outcome in an editor message; `panel` is the Settings
   * tab or the setting turned on; `wizard` is the omp step, whose own check follows the export, so only the Settings tab is checked here. Whatever the outcome, omp is checked again
   * in silence, with the providers' state and the model suggestions, as after a change of the Cursor API key.
   */
  async exportSystemCertificates(origin: "automatic" | "command" | "panel" | "wizard"): Promise<void> {
    const outcome = await runExport();
    if (outcome === undefined) return;
    // The outcome of the last update check no longer holds: the next check runs with the bundle as it is now.
    forgetUpdateCheck();
    const { exportedAt } = systemCertificatesState();
    if (outcome.ok) {
      if (origin === "command") void vscode.window.showInformationMessage(`Trama: exported ${outcome.count} system certificates.`);
    } else if (origin === "command") {
      void vscode.window.showErrorMessage(exportFailureMessage(outcome.reason, exportedAt));
    } else if (origin === "automatic") {
      void vscode.window.showWarningMessage(exportFailureMessage(outcome.reason, exportedAt), "Open Settings").then((choice) => (choice === "Open Settings" ? this.openSettings() : undefined));
    }
    await this.recheckOmp(origin !== "wizard");
  }

  /** The command `Trama: Refresh System Certificates`: exports again while the mode is on and says the outcome. */
  async refreshSystemCertificatesCommand(): Promise<void> {
    if (!configuredSystemCertificates()) {
      void vscode.window.showInformationMessage("Trama: System Certificates is off.");
      return;
    }
    await this.exportSystemCertificates("command");
  }

  /** The mode System Certificates changed in the user settings: turned on, the bundle is exported; turned off, nothing is exported. Either way omp is checked again in silence. */
  async systemCertificatesChanged(): Promise<void> {
    if (configuredSystemCertificates()) await this.exportSystemCertificates("panel");
    else {
      forgetUpdateCheck();
      await this.recheckOmp(true);
    }
  }

  /** The silent check of omp after an export or a change of the mode, panel open or not: the Settings tab's state and, when `wizard`, the check of the wizard's omp step for the saved path. */
  private async recheckOmp(wizard: boolean): Promise<void> {
    void this.refreshOmp(true);
    if (wizard) await this.checkAgent(configuredOmpPath());
  }

  /** Sends the panel whether a Cursor API key is saved: only that, never the key. */
  private postCursorApiKey(): void {
    this.post({ type: "cursorApiKey", saved: cursorKeySaved() });
  }

  /** Sends the panel whether an ntfy access token is saved: only that, never the token. */
  private postNtfyToken(): void {
    this.post({ type: "ntfyToken", saved: ntfyTokenSaved() });
  }

  /**
   * Set/Change access token: the masked input box of the editor, then the token in the secret storage (a new one replaces the old). Esc, or a secret storage that fails (the
   * editor tells the developer), changes nothing; the panel is told the state as it is either way, so the focus goes back to the button.
   */
  private async saveTypedNtfyToken(): Promise<void> {
    const token = await askNtfyToken();
    if (token !== undefined) await saveNtfyToken(token);
    this.postNtfyToken();
  }

  /** Remove access token: no confirmation; the panel is told the state as it is when the secret storage fails. */
  private async removeSavedNtfyToken(): Promise<void> {
    await removeNtfyToken();
    this.postNtfyToken();
  }

  /** True while a test notification of this window is on its way: a second one is refused. */
  private testingNotification = false;

  /**
   * Send test notification: one request, no retry, to the server and topic of now with the saved token, whatever omp Chat or a job is doing; the panel hears `sending`, then `sent` or
   * `failed` with the reason. Refused, with nothing said, while another test runs or when the server or the topic is not valid (the button is not available then).
   */
  private async sendTestNotification(): Promise<void> {
    const target = configuredNtfyTarget();
    if (this.testingNotification || target.state !== "ready") return;
    this.testingNotification = true;
    this.post({ type: "testNotification", state: "sending" });
    try {
      const root = findProject()?.root;
      const outcome = await sendNtfy({ url: target.url, topic: target.topic, text: testText(root === undefined ? undefined : basename(root)), token: ntfyToken() });
      this.post(outcome.ok ? { type: "testNotification", state: "sent" } : { type: "testNotification", state: "failed", reason: outcome.reason });
    } finally {
      this.testingNotification = false;
    }
  }

  /**
   * Set/Change API key: the masked input box of the editor, then, when the key is saved in the secret storage (a new key replaces the old one), the panel is told, and the omp
   * state, the providers and the model suggestions are read again, and omp is checked at `ompPath` (or the saved `trama.ompPath`), as at the end of a login terminal. Esc, or a
   * secret storage that fails (the editor tells the developer), changes nothing and checks nothing: the panel is only told the state as it is, so a wizard waiting for the
   * answer to its own request stops waiting and a later change from another window is not taken for it.
   */
  private async saveTypedCursorKey(ompPath: string | undefined): Promise<void> {
    const key = await askCursorApiKey();
    if (key === undefined || !(await saveCursorApiKey(key))) {
      this.postCursorApiKey();
      return;
    }
    await this.cursorKeyChanged(ompPath);
  }

  /** Remove API key: no confirmation; same follow-up as `saveTypedCursorKey`, and the same state-only answer when the secret storage fails. The editor's own `CURSOR_ACCESS_TOKEN` stays as it is. */
  private async removeSavedCursorKey(ompPath: string | undefined): Promise<void> {
    if (!(await removeCursorApiKey())) {
      this.postCursorApiKey();
      return;
    }
    await this.cursorKeyChanged(ompPath);
  }

  /** The key of this window changed: the panel is told, and the checks that depend on it run once. */
  private async cursorKeyChanged(ompPath: string | undefined): Promise<void> {
    this.postCursorApiKey();
    void this.refreshOmp(true);
    await this.checkAgent(ompPath ?? configuredOmpPath());
  }

  /**
   * Sends the Settings tab and the Board the omp of `trama.ompPath`: `ompStatus` `checking` at once, then, from one `omp models --json` and one
   * `omp --version`, the model suggestions and the status (the version and the number of models, or why nothing answers). Only the newest request
   * is answered; with `fresh` a request under way for the same path is not joined.
   */
  async refreshOmp(fresh = false): Promise<void> {
    // `trama.ompPath` is application-scoped: only the user value counts; empty means `omp` from the editor's PATH.
    const ompPath = configuredOmpPath();
    const running = this.ompRefresh;
    if (!fresh && running !== undefined && running.path === ompPath) return running.done;
    const request = ++this.ompRequest;
    this.post({ type: "ompStatus", state: "checking" });
    const entry: { path: string; done: Promise<void> } = { path: ompPath, done: Promise.resolve() };
    entry.done = (async () => {
      const [list, status] = await Promise.all([ompModels(ompPath), ompStatus(ompPath)]);
      if (request !== this.ompRequest) return;
      const { providers, ...suggestions } = list;
      this.post({ type: "modelSuggestions", ...suggestions });
      const error = status.error ?? list.error;
      this.post({
        type: "ompStatus",
        state: "done",
        missing: status.missing || list.missing === true,
        ...(status.version === undefined ? {} : { version: status.version }),
        ...(status.tooOld === true ? { tooOld: true as const } : {}),
        ...(error === undefined ? { models: list.models.length } : { error }),
        ...(providers === undefined ? {} : { providers }),
      });
    })().finally(() => {
      if (this.ompRefresh === entry) this.ompRefresh = undefined;
    });
    this.ompRefresh = entry;
    return entry.done;
  }

  /** The agent instruction files of `root` (a workspace folder) or, without `root`, of the project's folder, for the wizard's omp step. */
  private async postInstructionFiles(root: string | undefined): Promise<void> {
    const folder = root === undefined ? findProject()?.root : fileFolders().find((f) => f.uri.fsPath === root)?.uri.fsPath;
    if (folder === undefined) {
      this.post({ type: "error", message: "Ignored a request for a folder outside the workspace." });
      return;
    }
    const request = ++this.instructionFilesRequest;
    const files = await findInstructionFiles(folder, homedir());
    if (request !== this.instructionFilesRequest) return;
    this.instructionFilePaths = new Set(files.map((file) => file.path));
    this.post({ type: "instructionFiles", root: folder, files });
  }

  /** Opens a file of the last instruction-files answer in an editor tab that is not a preview, beside the panel. */
  private async openInstructionFile(path: string): Promise<void> {
    if (!this.instructionFilePaths.has(path)) {
      this.post({ type: "error", message: "Ignored a request to open a file that is not an agent instruction file." });
      return;
    }
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(path));
    await vscode.window.showTextDocument(document, { viewColumn: vscode.ViewColumn.Beside, preview: false });
  }

  /** The model names of the omp at `ompPath` for the wizard's Models step, which suggests them before the path is saved. */
  private async postWizardSuggestions(ompPath: string): Promise<void> {
    const request = ++this.wizardSuggestionsRequest;
    const { providers: _providers, ...suggestions } = await ompModels(ompPath.trim());
    if (request === this.wizardSuggestionsRequest) this.post({ type: "modelSuggestions", ...suggestions, ompPath });
  }

  /** One folder of the wizard's tree: `root` must be a workspace folder and `path` inside it. */
  private async postFolderChildren(root: string, path: string): Promise<void> {
    const known = fileFolders().find((folder) => folder.uri.fsPath === root);
    if (known === undefined || folderInside(root, path) === undefined) {
      this.post({ type: "error", message: "Ignored a request for a folder outside the workspace." });
      return;
    }
    const read = async (relative: string): Promise<RawEntry[]> => {
      const target = folderInside(root, relative);
      if (target === undefined) return [];
      return vscode.workspace.fs.readDirectory(vscode.Uri.file(target));
    };
    let entries: Awaited<ReturnType<typeof folderChildren>> = [];
    try {
      entries = await folderChildren(path, read, (paths) => gitIgnored(root, paths));
    } catch {
      // A folder that cannot be read shows as empty.
    }
    this.post({ type: "folderChildren", root, path, entries });
  }

  /** Import from Code or Start from Scratch on the Diagram: with an empty Model the wizard opens in the Settings tab with that path chosen; otherwise the choice carries out as before. */
  private async openGuidedSetup(project: Project, choice: SetupChoice): Promise<void> {
    if (!modelIsEmpty(project)) {
      if (choice === "import") await this.launchAction(project, { kind: "import" });
      else await this.designRequests?.writeSetup();
      return;
    }
    this.post({ type: "navigate", view: "settings" });
    this.post({ type: "guidedSetup", mode: "empty-model", choice, root: project.root });
  }

  /** Command entry point: launches an agent without needing the panel. */
  async launch(action: AgentAction): Promise<void> {
    const project = this.requireProject();
    if (project) await this.launchAction(project, action);
  }

  async updateSkills(): Promise<void> {
    const project = this.requireProject();
    if (project) await updateSkills(project);
  }

  private requireProject(): Project | undefined {
    const project = findProject();
    if (!project) void vscode.window.showWarningMessage(NO_PROJECT_WARNING);
    return project;
  }

  settingsChanged(ompPathChanged = false): void {
    // Turning the setting off also empties the queue and the waiting list: those Proposals are no longer refined or approved by this window.
    if (!configuredAutoUpdateStaleProposals()) this.refinement = switchedOff(this.refinement);
    this.refresh();
    this.postSettings();
    if (ompPathChanged) void this.refreshOmp(true);
  }

  /** The Trama settings as the manifest declares them, read at run time: the Settings tab and the check of its messages both use them. */
  private manifestSettings(): SettingSchema[] {
    return settingsSchema(vscode.extensions.getExtension("trama-dev.trama")?.packageJSON);
  }

  /** Sends the Settings tab the schema, each key's user value, and the workspace value of the keys that are not application-scoped. */
  private postSettings(): void {
    const config = settings();
    const schema = this.manifestSettings();
    const values: Record<string, SettingsValues> = {};
    for (const setting of schema) {
      const inspected = config.inspect<unknown>(sectionKey(setting.key));
      values[setting.key] = setting.scope === "application"
        ? { user: inspected?.globalValue }
        : { user: inspected?.globalValue, workspace: inspected?.workspaceValue };
    }
    this.post({ type: "settings", schema, values });
  }

  /** Sends the `Solo Mode` row the project's Solo mode as it is now; nothing without a project. */
  private postSolo(): void {
    const project = findProject();
    if (project === undefined) return;
    try {
      this.post(soloModeMessage(project));
    } catch (err) {
      this.post({ type: "error", message: describeError(err) });
    }
  }

  /** The `Solo Mode` row changed: writes it into the project; a failed write is an editor error with the reason. The row is told the real value either way. */
  private setSolo(project: Project, solo: SoloKind): void {
    try {
      writeSoloMode(project, solo);
    } catch (err) {
      void vscode.window.showErrorMessage(`Trama: could not save Solo Mode: ${describeError(err).replace(/\.$/, "")}.`);
    }
    this.postSolo();
  }

  /** Sends the `Manager Mode` row the project's Manager mode and origin as they are now; nothing without a project. */
  private postManager(): void {
    const project = findProject();
    if (project === undefined) return;
    try {
      const message = managerModeMessage(project);
      this.post(message);
      // Team went away (Manager mode off, or origin no longer on GitHub) while the panel showed it: the panel passes to the Board.
      if (!message.available && this.panelView === "team") this.post({ type: "navigate", view: "board" });
    } catch (err) {
      this.post({ type: "error", message: describeError(err) });
    }
  }

  /** Sends the Team view the people as the editor knows them now; nothing unless Team is available. */
  private postTeam(): void {
    const project = findProject();
    if (this.people === undefined || project === undefined) return;
    const repository = teamRepository(project);
    if (repository === null) return;
    this.post(this.people.view(repository));
  }

  /** Sends the Team view what Trama knows of GitHub now, with where each published issue of the project is; nothing unless Team is available. */
  private postGitHub(): void {
    const project = findProject();
    const target = this.teamTarget();
    if (project === undefined || target === null || this.github === undefined) return;
    this.post(this.github.message(target.repository, target.linked, publishedIssues(project), this.teamExtras(project, target)));
  }

  /**
   * The signals of the open published issues, from the last read of GitHub, the cards and the Model as they are now (`rules#issue/Published`), and why Comment update and Scan
   * are not available for each published issue: its own job runs (an announcement of the job is live) or a Run of this window is in progress. Nothing when the cards cannot be read.
   */
  private teamExtras(project: Project, target: GitHubTarget): { signals: IssueSignals; actions: Record<number, IssueActions> } {
    if (this.github === undefined) return { signals: {}, actions: {} };
    try {
      const cards = listIssues(project);
      const published = publishedIssues(project);
      const roster = this.people?.members(target.repository);
      const jobs = issueJobs(listAnnouncements(project));
      const running = ownWindowRuns(project.root);
      const signals = issueSignals({
        issues: cards.map((card) => ({ id: card.id, title: card.title, number: card.data.state === "published" ? card.data.number : null, refs: card.data.refs, texts: card.data.texts, dependsOn: card.data.dependsOn, sprint: card.data.sprint, assignee: card.data.assignee })),
        github: this.github.issues(published, target.linked),
        loads: this.github.loads(published, target.linked),
        members: roster !== undefined && "members" in roster ? roster.members : [],
        iterations: this.github.iterations(target.linked),
        current: referenceTexts(project, [...new Set(cards.flatMap((card) => card.data.refs))]),
        today: localToday(),
      });
      const actions: Record<number, IssueActions> = {};
      for (const issue of published) actions[issue.number] = issueActions(issue.number, jobs, running);
      return { signals, actions };
    } catch {
      return { signals: {}, actions: {} };
    }
  }

  /**
   * `developer.ASK_ISSUE_UPDATE` and `developer.SCAN_ISSUE`: the Manager pressed Comment update or Scan on the issue `id`. The host checks again what the view showed (Team, the
   * issue published, open and stale, or closed, and no job of its own or Run in progress) and asks the agent; when it cannot, or the instruction does not leave, nothing
   * changes and the Team view hears why, as a notice.
   */
  private async issueAction(project: Project, id: string, kind: "update" | "scan"): Promise<void> {
    const target = this.teamTarget();
    let name = id;
    const fail = (reason: string) => this.post({ type: "notice", text: `Trama could not ${kind === "update" ? "ask the agent to comment on" : "scan"} issue ${name}: ${reason.replace(/\.$/, "")}.` });
    try {
      const card = findIssue(project, id);
      if (card.kind !== "card") throw new TramaError("the issue is not published");
      const number = card.issue.data.state === "published" ? card.issue.data.number : null;
      if (number !== null) name = `#${number}`;
      const extras = target === null || this.github === undefined ? null : this.teamExtras(project, target);
      const status = number === null ? null : (this.github?.issues(publishedIssues(project), target?.linked ?? null).find((issue) => issue.number === number)?.status ?? "Open");
      const facts = { team: teamUnavailableReason(project), status, stale: number !== null && (extras?.signals[number] ?? []).some((signal) => signal.kind === "stale"), actions: (number === null ? undefined : extras?.actions[number]) ?? { update: null, scan: null } };
      const blocked = kind === "update" ? updateBlock(facts) : scanBlock(facts);
      if (blocked !== null) return fail(blocked);
      if (number === null) return;
      await this.launchAction(project, kind === "update" ? { kind: "update-issue", issue: card.issue.id, number } : { kind: "scan-issue", issue: card.issue.id, number, refs: card.issue.data.refs });
    } catch (err) {
      fail(describeError(err));
    }
    this.refresh();
  }

  /**
   * What the editor answers to the agent that asks where the published issues are (`tech#issue/Published`, the briefing of a comparison): the states of the last read of
   * GitHub, or none when nothing was read, no Project is linked or Team is not available; the agent then says the state of publication.
   */
  issueStates(project: Project): IssueOnGitHub[] {
    const target = teamRepository(project) === null ? null : githubTarget(project);
    return target === null || this.github === undefined ? [] : this.github.issues(publishedIssues(project), target.linked);
  }

  /** The repository and linked Project of the project, only while Team is available. */
  private teamTarget(): GitHubTarget | null {
    const project = findProject();
    if (project === undefined || teamRepository(project) === null) return null;
    return githubTarget(project);
  }

  /**
   * `developer.REFRESH_TEAM` and the opening of the Team view: reads GitHub once at a time (a request for the same thing joins the read that runs) and tells the view when the
   * read starts and when it ends. The view keeps what it shows meanwhile.
   */
  private async readGitHub(): Promise<void> {
    const target = this.teamTarget();
    if (target === null || this.github === undefined) return;
    const done = this.github.read(target.repository, target.linked);
    this.postGitHub();
    await done;
    this.postGitHub();
  }

  /** The Team view became visible: the people and what is known of GitHub now, then a read. */
  private openedTeam(): void {
    this.postTeam();
    this.postGitHub();
    void this.readGitHub();
  }

  /** `developer.LINK_GITHUB_PROJECT`: a failed write changes nothing and the Manager hears why as a notice. */
  private async linkGitHubProject(project: Project, owner: string, number: number): Promise<void> {
    if (this.github === undefined || teamRepository(project) === null) return;
    try {
      linkChosenProject(project, this.github, owner, number);
    } catch (err) {
      this.post({ type: "notice", text: `Trama could not link the GitHub Project: ${describeError(err).replace(/\.$/, "")}.` });
      return;
    }
    await this.github.forgetProject();
    this.refresh();
    await this.readGitHub();
  }

  /** `developer.UNLINK_GITHUB_PROJECT`: deletes only the local record; nothing changes on GitHub. */
  private async unlinkGitHubProject(project: Project): Promise<void> {
    if (this.github === undefined || teamRepository(project) === null) return;
    try {
      unlinkGithubProject(project);
    } catch (err) {
      this.post({ type: "notice", text: `Trama could not unlink the GitHub Project: ${describeError(err).replace(/\.$/, "")}.` });
      return;
    }
    await this.github.forgetProject();
    this.refresh();
    await this.readGitHub();
  }

  /** `developer.LOG_IN_GITHUB`: a visible terminal logs `gh` in, or gives it access to Projects when it is logged in without it; when its command ends the view reads again. */
  private logInGitHub(): void {
    if (this.github === undefined || this.teamTarget() === null) return;
    const program = findGh();
    if (program === null) {
      this.post({ type: "notice", text: "Trama could not find the GitHub CLI: install it from https://cli.github.com, then select Refresh." });
      return;
    }
    loginGitHub(program, this.github.problem() === "no-project-access", () => void this.readGitHub());
  }

  /** `Show details`: the output channel of Trama shows everything `gh` said about the last failure. */
  private showGitHubDetails(): void {
    this.githubOutput ??= vscode.window.createOutputChannel("Trama");
    this.githubOutput.clear();
    this.githubOutput.appendLine(this.github?.details() ?? "");
    this.githubOutput.show(true);
  }

  /**
   * A write of the People tab: only while Team is available. A person refused by `rules#person` goes back to the dialog as `personRejected`, nothing written; every other
   * outcome sends the Team view the people as they are now (with the sentence of a failed write) and the Manager Mode row the state it has now.
   */
  private async changeTeam(project: Project, change: (people: People, repository: string) => Promise<SaveOutcome | WriteOutcome>): Promise<void> {
    const repository = teamRepository(project);
    if (this.people === undefined || repository === null) {
      this.postManager();
      return;
    }
    const outcome = await change(this.people, repository);
    if (!outcome.ok && "errors" in outcome) {
      this.post({ type: "personRejected", errors: outcome.errors });
      return;
    }
    this.post(this.people.view(repository, "error" in outcome ? outcome.error : null));
    this.postManager();
  }

  /** `Delete person`: a modal dialog of the editor asks first; cancelling changes nothing and leaves the person's dialog open. */
  private async deletePersonAfterConfirm(project: Project, id: string): Promise<void> {
    const person = this.people?.find(id);
    if (person === undefined) {
      await this.changeTeam(project, async (people) => people.delete(id));
      return;
    }
    const choice = await vscode.window.showWarningMessage(
      `Delete ${person.name}?`,
      { modal: true, detail: "They leave every project's team. Issues already assigned to them on GitHub stay assigned." },
      "Delete",
    );
    if (choice !== "Delete") return;
    await this.changeTeam(project, async (people) => people.delete(id));
  }

  /** The `Manager Mode` row changed: writes it into the project; a failed write is an editor error with the reason. The row is told the real value either way. */
  private setManager(project: Project, on: boolean): void {
    try {
      writeManagerMode(project, on);
    } catch (err) {
      void vscode.window.showErrorMessage(`Trama: could not save Manager Mode: ${describeError(err).replace(/\.$/, "")}.`);
    }
    this.postManager();
  }

  /** Carries out a Settings plan. A refused plan saves nothing. The Settings tab is sent again either way, so its controls show the values that really hold. */
  private async applyPlan(plan: SettingPlan): Promise<void> {
    if (!plan.ok) {
      this.postSettings();
      return;
    }
    for (const write of plan.writes) {
      try {
        await settings().update(sectionKey(write.key), write.value, vscode.ConfigurationTarget.Global);
      } catch (error) {
        void vscode.window.showErrorMessage(`Trama: could not save ${settingTitle(write.key)}: ${error instanceof Error ? error.message : String(error)}.`);
        break;
      }
    }
    this.postSettings();
  }

  dispose(): void {
    this.disposed = true;
    this.panel?.dispose();
    this.shownViewListeners.clear();
    this.githubOutput?.dispose();
    this.stopEstimateTimer();
  }

  /** The view a panel being created opens on: the one asked for, else the Board in a Trama project, Get Started in a folder that is none, Settings without folders. */
  private openingView(): ViewName {
    if (this.pendingView) return this.pendingView.view;
    if (!vscode.workspace.workspaceFolders?.length) return "settings";
    return findProject() ? "board" : "getstarted";
  }

  private create(): void {
    const dist = vscode.Uri.joinPath(this.extensionUri, "dist");
    const panel = vscode.window.createWebviewPanel("trama", VIEW_LABELS[this.openingView()], vscode.ViewColumn.Active, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [dist, ...this.imageRoots()],
    });
    panel.iconPath = {
      light: vscode.Uri.joinPath(this.extensionUri, "media", "trama-icon-dark.svg"),
      dark: vscode.Uri.joinPath(this.extensionUri, "media", "trama-icon-light.svg"),
    };
    panel.webview.html = webviewHtml({
      cspSource: panel.webview.cspSource,
      nonce: randomBytes(16).toString("base64"),
      scriptUri: panel.webview.asWebviewUri(vscode.Uri.joinPath(dist, "webview.js")).toString(),
      mermaidUri: panel.webview.asWebviewUri(vscode.Uri.joinPath(dist, "mermaid.js")).toString(),
    });
    panel.webview.onDidReceiveMessage((raw: unknown) => void this.handle(raw));

    const subscriptions = [
      // The panel follows the picture the window builds when the files of `.trama/` or the folders change (`WindowPicture`); a refresh asked for here builds its own and renders it itself.
      this.picture.onDidBuild((outcome, cause) => {
        if (cause !== "requested") this.render(outcome);
      }),
      onAnnouncementsWithdrawn((announcements) => this.post({ type: "withdrawn", announcements })),
      onStoppedFollowing((subject, reason, details) => this.post({ type: "stoppedFollowing", subject, reason, ...(details === undefined ? {} : { details }) })),
      onAgentStopped((job, reason) => this.post({ type: "notice", text: agentStoppedNotice(job, reason) })),
      onQuestionRoundChange(() => this.refresh()),
      onDriftResolutionChange(() => this.refresh()),
      onProposalDelivered((root, id) => this.noteDelivered(root, id)),
      onSystemCertificatesChanged(() => this.postSystemCertificates()),
      // Another window changed the key: the panel is told, and omp is read again; the wizard's webview asks for its own check.
      onCursorApiKeyChanged(() => {
        this.postCursorApiKey();
        void this.refreshOmp(true);
      }),
      // Another window saved or removed the ntfy token: the Settings tab shows the token of now.
      onNtfyTokenChanged(() => this.postNtfyToken()),
      ...(this.questions ? [this.questions.onChange((round) => this.post({ type: "questions", round }))] : []),
    ];

    panel.onDidDispose(() => {
      for (const subscription of subscriptions) subscription.dispose();
      this.stopEstimateTimer();
      this.panel = undefined;
      this.setPanelView(undefined);
      this.pendingView = undefined;
      this.pendingGuided = undefined;
      // The round stays open and the agent keeps waiting; the developer is offered a way back to it.
      this.questions?.panelClosed();
      if (!this.disposed && this.questions?.current()) this.offerReopen();
    });
    this.panel = panel;
  }

  /** The message cannot be withdrawn, so Reopen checks whether the round still exists: without one it only opens the panel. */
  private offerReopen(): void {
    void vscode.window.showInformationMessage(QUESTIONS_WAITING, REOPEN).then(async (choice) => {
      if (choice !== REOPEN) return;
      try {
        await this.open();
      } catch (err) {
        void vscode.window.showErrorMessage(`Trama: ${describeError(err)}`);
      }
    });
  }

  private post(message: ToWebview): void {
    void this.panel?.webview.postMessage(message);
  }

  /** The folder of the Task images of the project, as a resource root; none without a project. */
  private imageRoots(project = findProject()): vscode.Uri[] {
    return project ? [vscode.Uri.file(taskImagesRoot(project))] : [];
  }

  /** Lets the open panel load the Task images of `project`: a panel made before the project existed has no such root. */
  private allowTaskImages(project: Project): void {
    if (!this.panel) return;
    const options = this.panel.webview.options;
    const roots = options.localResourceRoots ?? [];
    const missing = this.imageRoots(project).filter((root) => !roots.some((r) => r.fsPath === root.fsPath));
    if (missing.length > 0) this.panel.webview.options = { ...options, localResourceRoots: [...roots, ...missing] };
  }

  /**
   * Builds a picture now, so the panel always sees the files as an action or an event of the host left them, and shows it; the side menu gets the same picture. If the files
   * cannot be read the panel gets the error and keeps its last snapshot.
   */
  private refresh(): void {
    this.picture.build("requested", (outcome) => this.render(outcome));
  }

  /**
   * Shows a picture in the panel. What the panel needs of the cards (the open Drifts, the Proposals, the Tasks) comes from the picture and from its parsed files, so
   * nothing of `.trama/` is read again.
   */
  private render(outcome: PictureOutcome): void {
    // Turning the setting off empties the refinement queue: a Proposal already being refined goes on.
    if (!configuredAutoUpdateStaleProposals()) this.refinement = emptyQueue(this.refinement);
    this.post({ type: "project", present: outcome.kind !== "none" });
    if (outcome.kind === "none") {
      this.post({ type: "workspaceFolders", folders: this.workspaceFolderViews() });
      return;
    }
    const { project } = outcome;
    // Team's availability depends on origin, which can change under an open panel: it is read again with every picture, and told even when the files of the picture cannot be read.
    this.postManager();
    // The Proposals that waited for a Run of this window are settled once that Run has ended.
    if (this.refinement.waiting.length > 0 && !ownWindowRuns(project.root)) this.releaseWaiting(project);
    try {
      if (this.modelMemory) forgetProposalModels(this.modelMemory, project).catch((err: unknown) => this.post({ type: "error", message: describeError(err) }));
      const work = driftWork(project.root);
      this.allowTaskImages(project);
      if (outcome.kind === "failed") throw outcome.error;
      const { picture } = outcome;
      picture.reads.run(() => this.postPicture(project, work, outcome.snapshot, picture));
    } catch (err) {
      this.post({ type: "error", message: describeError(err) });
    }
  }

  private postPicture(project: Project, work: WindowWork, built: Snapshot, picture: Picture): void {
    const webview = this.panel?.webview;
    const snapshot = webview ? withImageUris(built, (path) => webview.asWebviewUri(vscode.Uri.file(path)).toString()) : built;
    const models: BoardModels = this.modelMemory ? boardModels(this.modelMemory, snapshot.proposals) : { proposals: {} };
    // The Drifts an agent was asked to resolve are forgotten once no resolution runs, so a later Resolve is not held by them.
    if (!work.resolving) this.namedByResolution.clear();
    const asyncResolver = configuredAsyncDriftResolver();
    const facts = resolutionFacts(picture.proposals, picture.drifts);
    const preparedValid = new Set(snapshot.drifts.filter((x) => x.prepared?.valid === true).map((x) => x.id));
    const drifts = Object.fromEntries(picture.drifts.filter((d) => d.data.status === "open").map((d) => [d.id, resolveDriftBlocker(project, work, this.namedByResolution.has(d.id), asyncResolver && preparedValid.has(d.id), facts)]));
    // The open Drifts the running resolution is working on: those this window asked an agent to resolve.
    const resolving = work.resolving ? Object.keys(drifts).filter((id) => this.namedByResolution.has(id)) : [];
    const runEstimate = runAllEstimate(project, new Date(), { tasks: picture.tasks, blocked: new Map(built.tasks.map((task) => [task.id, task.blockedBy])) });
    this.lastRunEstimate = JSON.stringify(runEstimate);
    if (runEstimate === null) this.stopEstimateTimer();
    else this.startEstimateTimer(project);
    const repo = readOrigin(project.root).repository;
    this.post({ type: "snapshot", snapshot, asking: questionRoundOpen(), resolve: { blocker: resolveDriftsBlocker(project, work, facts), runReason: runWindowBlocker({ resolving: work.resolving, running: ownWindowRuns(project.root) }), running: ownWindowRuns(project.root), drifts, resolving }, unify: { blockers: unifyDriftsBlockers(project, work, driftsFinishing(project.root), facts), unifying: unifyingDrifts(project.root) }, models, refinement: this.refinementPicture(project, picture), runEstimate, ...(repo === null ? {} : { githubRepo: repo }), ...(teamRepository(project) === null ? {} : { replan: this.replanView(project, picture.proposals) }) });
    // The states of the published issues come from the last read of GitHub and from the cards: a new picture of the cards moves them without a new read.
    if (this.panelView === "team") this.postGitHub();
  }

  /**
   * `developer.REPLAN_HANDOFFS`: the state of Replan for the Decisions tab, from the cards and the jobs of this window: the first reason it is unavailable (`replanHandoffsBlock`),
   * whether a Replan runs (its announcement is live), the open handoffs and the stale ones among them. Every other thing is read from the proposals already read.
   */
  private replanView(project: Project, proposals: readonly Proposal[]): ReplanView {
    const handoffs = proposals.filter((proposal) => proposal.data.kind === "handoff");
    const open = handoffs.filter((proposal) => proposal.data.status === "open");
    const announced = listAnnouncements(project);
    const finishing = proposalsFinishing(project.root);
    const running = replanRunning(announced);
    const block = replanHandoffsBlock({
      linked: linkedGithubProject(project) !== null,
      open: open.length,
      finishing: open.some((proposal) => finishing.includes(proposal.id)),
      writing: handoffBeingWritten(announced) || handoffs.some((proposal) => proposal.data.status === "draft" && writtenNow(proposal.id, this.refinement.running, announced)),
      running: ownWindowRuns(project.root),
      replanning: running,
    });
    return { block, running, open: open.length, stale: open.filter((proposal) => health(project, proposal).stale.length > 0).length };
  }

  /** The Runs the Tasks cut into by their effective model, among `only` when given: the runnable ones, in creation order. */
  private plannedRuns(project: Project, only?: readonly string[]): PlannedRun[] {
    const runnable = runTasks(project).filter((task) => task.column === "todo" && task.blockedBy.length === 0 && !task.agent && (only === undefined || only.includes(task.id)));
    return planRuns(runnable.map((task) => ({ id: task.id, proposal: task.proposal })), this.appliedModels(project), configuredModels().execution);
  }

  /** The Proposals that have a model chosen, read at the launch. */
  private appliedModels(project: Project): AppliedModel[] {
    return this.modelMemory ? appliedProposalModels(this.modelMemory, project) : [];
  }

  /** Starts the timer that works the time left of the Run all out again every minute and sends the Board only a change; it runs only while a Run all of this window goes on. */
  private startEstimateTimer(project: Project): void {
    if (this.estimateTimer !== undefined) return;
    this.estimateTimer = setInterval(() => {
      let estimate: RunEstimateView;
      try {
        estimate = runAllEstimate(project);
      } catch {
        return; // The files cannot be read now: the next change or tick tries again.
      }
      if (estimate === null) this.stopEstimateTimer();
      if (JSON.stringify(estimate) !== this.lastRunEstimate) this.refresh();
    }, RUN_ESTIMATE_INTERVAL_MS);
  }

  private stopEstimateTimer(): void {
    clearInterval(this.estimateTimer);
    this.estimateTimer = undefined;
  }

  /**
   * Starts one Run of a sequence, `Run all` cut by model. Its `onEnd` hears how the Run ends. The Run is not refused here
   * for the held sequence it belongs to, so the window and the Run-all checks are not applied to it again. `seats` is the
   * sub-agent places its instruction gives; absent, the whole `trama.maxParallelAgents`.
   */
  private async launchSequenceRun(project: Project, planned: PlannedRun & { seats?: number }, jobId: string | undefined, onEnd: (abnormal?: string) => void): Promise<boolean> {
    const action: Extract<AgentAction, { kind: "implement-all" }> = { kind: "implement-all", group: planned.group };
    try {
      const result = await launchAgent(
        project.root,
        buildPrompt(action),
        terminalName(action, (kind, id) => cardName(project, kind, id)),
        undefined,
        () => true,
        "run",
        undefined,
        { filesDrifts: true, severalTasks: true, model: planned.run, limit: planned.seats, onEnd, ...(jobId === undefined ? {} : { id: jobId }) },
      );
      return launched(result);
    } catch (error) {
      this.post({ type: "error", message: describeError(error) });
      return false;
    }
  }

  private async handle(raw: unknown): Promise<void> {
    const project = findProject();
    const parsed = parseToHost(raw, this.manifestSettings(), (task, name) => project !== undefined && taskImagePath(project, task, name) !== undefined);
    if (!parsed.ok) {
      this.post({ type: "error", message: `Ignored an invalid message from the view: ${parsed.reason}.` });
      return;
    }
    try {
      await this.dispatch(parsed.message);
    } catch (err) {
      this.post({ type: "error", message: describeError(err) });
    }
  }

  private async dispatch(message: ToHost): Promise<void> {
    // The question overlay works without a project: it is what the panel shows when a round opens it.
    if (message.type === "questionAction") {
      if (message.action.type === "askMore") await this.askMoreQuestion(message.round, message.action.id);
      else this.questions?.act(message.round, message.action);
      return;
    }
    if (message.type === "modelSuggestionsWanted") {
      if (message.ompPath === undefined) await this.refreshOmp();
      else await this.postWizardSuggestions(message.ompPath);
      return;
    }
    if (message.type === "ompStatusWanted") {
      this.postCursorApiKey();
      this.postNtfyToken();
      this.postSolo();
      this.postManager();
      this.postSystemCertificates();
      await this.refreshOmp();
      return;
    }
    // The Settings tab's Refresh counts only while the saved setting is on; the wizard's step has no saved value to ask, so its export is the webview's request.
    if (message.type === "refreshSystemCertificates") {
      if (configuredSystemCertificates()) await this.exportSystemCertificates("panel");
      else this.postSystemCertificates();
      return;
    }
    if (message.type === "systemCertificatesExport") {
      await this.exportSystemCertificates("wizard");
      return;
    }
    if (message.type === "agentCheckWanted") {
      await this.checkAgent(message.ompPath, message.systemCertificates);
      return;
    }
    if (message.type === "installOmp") {
      this.installOmp(message.systemCertificates);
      return;
    }
    if (message.type === "ompLogin") {
      await this.ompLogin(message.provider, message.ompPath, message.systemCertificates);
      return;
    }
    if (message.type === "ompLogout") {
      await this.ompLogout(message.provider, message.ompPath);
      return;
    }
    if (message.type === "setCursorApiKey") {
      await this.saveTypedCursorKey(message.ompPath);
      return;
    }
    if (message.type === "removeCursorApiKey") {
      await this.removeSavedCursorKey(message.ompPath);
      return;
    }
    if (message.type === "setNtfyToken") {
      await this.saveTypedNtfyToken();
      return;
    }
    if (message.type === "removeNtfyToken") {
      await this.removeSavedNtfyToken();
      return;
    }
    if (message.type === "sendTestNotification") {
      await this.sendTestNotification();
      return;
    }
    if (message.type === "instructionFilesWanted") {
      await this.postInstructionFiles(message.root);
      return;
    }
    if (message.type === "openInstructionFile") {
      await this.openInstructionFile(message.path);
      return;
    }
    if (message.type === "folderChildrenWanted") {
      await this.postFolderChildren(message.root, message.path);
      return;
    }
    if (message.type === "confirmSetup") {
      await this.confirmSetup(message);
      return;
    }
    if (message.type === "viewChanged") {
      this.setPanelView(message.view);
      if (message.view === "team") this.openedTeam();
      return;
    }
    if (message.type === "ready") {
      this.refresh();
      this.postSettings();
      this.postSolo();
      this.postTeam();
      this.postGitHub();
      this.postCursorApiKey();
      this.postNtfyToken();
      this.postSystemCertificates();
      if (this.questions) this.post({ type: "questions", round: this.questions.current() });
      if (this.pendingView !== undefined) {
        this.post({ type: "navigate", view: this.pendingView.view, ...this.pendingView.options });
        this.pendingView = undefined;
      }
      if (this.pendingGuided !== undefined) {
        this.post(this.pendingGuided);
        this.pendingGuided = undefined;
      }
      return;
    }
    if (message.type === "setSetting") {
      await this.applyPlan(planSettingChange(this.manifestSettings(), message.key, message.value));
      // The files git tracks under the skills folder depend on it.
      if (message.key === "trama.skillsDir") this.postSolo();
      return;
    }
    if (message.type === "setSoloMode") {
      const soloProject = findProject();
      if (soloProject !== undefined) this.setSolo(soloProject, message.solo);
      return;
    }
    if (message.type === "setManagerMode") {
      const managerProject = findProject();
      if (managerProject !== undefined) this.setManager(managerProject, message.on);
      return;
    }
    if (message.type === "writeDesignRequest") {
      await this.designRequests?.write();
      return;
    }
    if (message.type === "writeHandoffRequest") {
      await this.designRequests?.writeHandoff();
      return;
    }
    if (message.type === "refreshTeam") {
      await this.readGitHub();
      return;
    }
    if (message.type === "logInGitHub") {
      this.logInGitHub();
      return;
    }
    if (message.type === "showGitHubDetails") {
      this.showGitHubDetails();
      return;
    }
    const project = findProject();
    if (!project) return;
    switch (message.type) {
      case "launch":
        await this.launchAction(project, message.action);
        return;
      case "askMore":
        try {
          const subject = askMoreSubject(project, message.kind, message.id);
          await openAskMore(project.root, askMoreTerminalName(project, message.kind, message.id), askMorePart(subject), askMorePlaceholder(subject));
        } catch (err) {
          this.post({ type: "error", message: describeError(err) });
        }
        return;
      case "openGuidedSetup":
        await this.openGuidedSetup(project, message.choice);
        return;
      case "openModelFile": {
        const req = message.path.startsWith(REQUIREMENTS_PREFIX);
        await this.openFile(req ? resolveMarkdownFile(requirementsDir(project), message.path.slice(REQUIREMENTS_PREFIX.length)) : resolveMarkdownFile(modelDir(project), message.path));
        return;
      }
      case "openFile":
        await this.openFile(resolveMarkdownFile(project.dir, message.path));
        return;
      case "openCard": {
        const card = message.kind === "drift" ? getDrift(project, message.id) : getTask(project, message.id);
        await this.openFile(card.path);
        return;
      }
      case "openLink":
        await vscode.env.openExternal(vscode.Uri.parse(message.url, true));
        return;
      case "openTaskImage": {
        const path = taskImagePath(project, message.task, message.name);
        if (path === undefined) return;
        // Beside the panel and without taking the focus, so the panel stays where it was; not a preview tab.
        await vscode.commands.executeCommand("vscode.open", vscode.Uri.file(path), { viewColumn: vscode.ViewColumn.Beside, preview: false, preserveFocus: true });
        return;
      }
      case "approveProposal":
        requireNotAttached(project, message.id);
        if (this.refuseHandoffOutsideTeam(project, message.id, "Approve")) return;
        if (this.refuseWhileFinishing(project, message.id, "Approve") || this.refuseWhileRunning(project)) return;
        // With the setting on, a refinable Proposal is not approved: it joins the refinement queue, and the agent refines it.
        if (configuredAutoUpdateStaleProposals() && this.refinableNow(project, message.id)) {
          this.queueRefinement(project, message.id);
          return;
        }
        {
          const handoff = getProposal(project, message.id).data.kind === "handoff";
          this.approving(() => approveProposal(project, message.id, [configuredSkillsDir()]));
          // Approving a handoff creates its issues in the same step; then the agent is asked to publish them (`rules#issue`).
          if (handoff) await this.publishAfterApproval(project, message.id);
        }
        return;
      case "setProposalModel": {
        if (!this.modelMemory) throw new TramaError("Trama cannot keep the model of a Proposal: the workspace state is not available.");
        await chooseProposalModel(this.modelMemory, project, message.proposal, message.model);
        this.refresh();
        return;
      }
      case "rejectProposal": {
        requireNotAttached(project, message.id);
        if (this.refuseHandoffOutsideTeam(project, message.id, "Reject")) return;
        if (this.refuseWhileFinishing(project, message.id, "Reject")) return;
        rejectProposal(project, message.id);
        this.refinement = withdraw(this.refinement, message.id);
        this.pumpRefinement(project);
        this.refresh();
        return;
      }
      case "clearDone":
        this.clearDone(project, message.tasks);
        return;
      case "savePerson":
        await this.changeTeam(project, (people, repository) => people.save(repository, message.person));
        return;
      case "addToTeam":
      case "undoRemoveFromTeam":
        await this.changeTeam(project, (people, repository) => people.addToTeam(repository, message.id));
        return;
      case "removeFromTeam":
        await this.changeTeam(project, (people, repository) => people.removeFromTeam(repository, message.id));
        return;
      case "deletePerson":
        await this.deletePersonAfterConfirm(project, message.id);
        return;
      case "linkGitHubProject":
        await this.linkGitHubProject(project, message.owner, message.number);
        return;
      case "unlinkGitHubProject":
        await this.unlinkGitHubProject(project);
        return;
      case "deleteTask":
        await this.deleteTaskAfterConfirm(project, message.task);
        return;
      case "dismissDrift":
        await this.dismissDriftAfterConfirm(project, message.id);
        return;
      case "reworkDrift":
        await this.reworkDriftWithFeedback(project, message.drift);
        return;
      case "reworkProposal":
        if (this.refuseHandoffOutsideTeam(project, message.proposal, "Rework")) return;
        await this.reworkProposalWithFeedback(project, message.proposal);
        return;
      case "publishAgain":
        await this.publishAgain(project, message.handoff);
        return;
      case "setIssueField":
        this.changeIssueField(project, message);
        return;
      case "replanHandoffs":
        await this.replanHandoffs(project);
        return;
      case "splitIssue":
        await this.splitIssue(project, message.handoff, message.issue);
        return;
      case "askIssueUpdate":
        await this.issueAction(project, message.issue, "update");
        return;
      case "scanIssue":
        await this.issueAction(project, message.issue, "scan");
        return;
      case "cancelRefinement":
        // Only a Proposal waiting in the queue is taken out; one being refined is not cancellable. The Proposals that waited for it leave the queue too.
        if (!this.refinement.queued.includes(message.proposal)) return;
        this.refinement = dequeue(this.refinement, message.proposal);
        this.pumpRefinement(project);
        this.refresh();
        return;
      case "refineAll":
        this.refineAll(project);
        return;
      case "cancelRefineAll":
        this.cancelRefineAll();
        return;
    }
  }

  /**
   * Clear of the Done column: no confirmation and no message of success, the cards are hidden by the Board at the click. Refused while a Run
   * launched by Trama is going; otherwise one core function rechecks every Task of the message. A refusal or a failure reaches the Board as a notice.
   * In every case the fresh picture is sent first and then `clearDoneEnded`, which tells the Board to stop hiding the cards.
   */
  private clearDone(project: Project, tasks: string[]): void {
    let cleared: string[] = [];
    if (ownWindowRuns(project.root)) {
      this.post({ type: "notice", text: "Trama could not clear the Done column: A run is in progress." });
    } else {
      try {
        cleared = clearDoneTasks(project, tasks);
      } catch (err) {
        this.post({ type: "notice", text: `Trama could not clear the Done column: ${describeError(err)}` });
        // The Tasks deleted before the failure stay deleted: those are the ones gone from the project.
        try {
          const left = new Set(listTasks(project).map((t) => t.id));
          cleared = tasks.filter((id) => !left.has(id));
        } catch {
          cleared = [];
        }
      }
    }
    this.refresh();
    this.post({ type: "clearDoneEnded", cleared });
  }

  /**
   * Delete in the details window of a Task in To do: refused before the dialog while a Run launched by Trama is going or the agent that filed the Task
   * is still finishing; otherwise a modal dialog asks for confirmation (cancelling changes nothing, the window stays open as it was). Only with `Delete`
   * the same two conditions are rechecked and `deleteTask` in `src/core` rechecks those of the Task. A refusal or a failure deletes nothing and reaches
   * the Board as a notice; the fresh picture follows in every case, and there is no message of success.
   */
  private async deleteTaskAfterConfirm(project: Project, id: string): Promise<void> {
    const name = cardName(project, "task", id);
    const refusal = (): string | null => {
      if (tasksFinishing(project.root).includes(id)) return "The agent is still finishing";
      if (ownWindowRuns(project.root)) return "A run is in progress";
      return null;
    };
    const refuse = (reason: string): void => {
      this.post({ type: "notice", text: `Trama could not delete ${name}: ${reason}.` });
      this.refresh();
    };
    const before = refusal();
    if (before !== null) {
      refuse(before);
      return;
    }
    const task = getTaskOrNull(project, id);
    const choice = await vscode.window.showWarningMessage(`Delete ${name} "${task?.title ?? id}"?`, { modal: true, detail: "The Task is deleted for good and cannot be brought back." }, "Delete");
    if (choice !== "Delete") return;
    // The agent may have started a Run or finished a turn while the dialog was open: the conditions are the ones of the instant of deleting.
    const after = refusal();
    if (after !== null) {
      refuse(after);
      return;
    }
    try {
      deleteTask(project, id);
    } catch (err) {
      this.post({ type: "notice", text: `Trama could not delete ${name}: ${describeError(err)}.` });
    }
    this.refresh();
  }

  /** Approve and Reject wait for the end of the turn of the agent that delivered the Proposal: while that turn is held the action is refused, and a message says why. Returns true when refused. */
  private refuseWhileFinishing(project: Project, id: string, action: "Approve" | "Reject"): boolean {
    if (!proposalsFinishing(project.root).includes(id)) return false;
    void vscode.window.showErrorMessage(`Trama: ${action} Proposal is unavailable: the agent is still finishing.`);
    return true;
  }

  /** Approve waits for the end of a Run launched from this window: while it is in progress the action is refused, and a message says why. Returns true when refused. */
  private refuseWhileRunning(project: Project): boolean {
    if (!ownWindowRuns(project.root)) return false;
    void vscode.window.showErrorMessage("Trama: Approve Proposal is unavailable: A run is in progress.");
    return true;
  }

  /**
   * «Rework with feedback…»: the host rechecks what Resolve needs, asks for the developer's feedback in an input box (Esc does nothing) and,
   * when it is empty, for a confirmation; then launches the resolution agent on that one Drift, never with its prepared question.
   */
  private async reworkDriftWithFeedback(project: Project, id: string): Promise<void> {
    const drift = getDrift(project, id);
    const name = cardName(project, "drift", drift.id);
    const unavailable = (): string | null => {
      if (drift.data.status !== "open") return `Drift ${name} is ${drift.data.status}`;
      if (driftsFinishing(project.root).includes(id)) return "the agent is still finishing";
      const holding = resolutionHolding(project, id);
      if (holding) return `Drift ${name} is part of resolution ${cardName(project, "proposal", holding.id)}`;
      return resolveDriftBlocker(project, driftWork(project.root), this.namedByResolution.has(id));
    };
    const refuse = (): boolean => {
      const reason = unavailable();
      if (reason === null) return false;
      void vscode.window.showErrorMessage(`Trama: Rework is unavailable: ${reason}.`);
      return true;
    };
    if (refuse()) return;
    const feedback = await vscode.window.showInputBox({
      title: `Rework ${name} – ${drift.title}`,
      prompt: "How should the agent resolve this Drift? Leave empty to resolve it as Resolve does.",
      placeHolder: "Feedback for the agent",
      ignoreFocusOut: true,
    });
    if (feedback === undefined) return;
    const text = feedback.trim();
    if (text === "") {
      const choice = await vscode.window.showWarningMessage(`Resolve ${name} without feedback?`, { modal: true }, "Resolve");
      if (choice !== "Resolve") return;
    }
    if (refuse()) return;
    await this.launchAction(project, { kind: "resolve-drifts", drift: id }, undefined, text);
  }

  /** «Dismiss Drift»: the host asks for the developer's confirmation in a modal dialog; cancelling changes nothing. Closing the Drift is `dismissDrift` in `src/core`, which rechecks its conditions and refuses without changing anything. */
  private async dismissDriftAfterConfirm(project: Project, id: string): Promise<void> {
    if (driftWork(project.root).resolving) {
      void vscode.window.showErrorMessage("Trama: Dismiss Drift is unavailable: Drifts are being resolved.");
      return;
    }
    if (driftsFinishing(project.root).includes(id)) {
      void vscode.window.showErrorMessage("Trama: Dismiss Drift is unavailable: the agent is still finishing.");
      return;
    }
    const drift = getDrift(project, id);
    const detail = `It is closed without changes and the same difference will not be filed again until the Model or the Requirements change.${drift.data.proposal ? " Its attached Proposal is discarded too." : ""}`;
    const choice = await vscode.window.showWarningMessage(`Dismiss Drift "${drift.title}"?`, { modal: true, detail }, "Dismiss");
    if (choice !== "Dismiss") return;
    // The agent may have started or finished its turn while the dialog was open: the Drift is refused only while it is still held.
    if (driftsFinishing(project.root).includes(id)) {
      void vscode.window.showErrorMessage("Trama: Dismiss Drift is unavailable: the agent is still finishing.");
      return;
    }
    try {
      dismissDrift(project, id);
    } catch (err) {
      void vscode.window.showErrorMessage(`Trama: ${describeError(err)}`);
    }
    this.refresh();
  }

  private async openFile(path: string): Promise<void> {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(path));
    await vscode.window.showTextDocument(document, { viewColumn: vscode.ViewColumn.Beside, preview: false });
  }

  /** Every path that approves a Proposal goes through here, always in the open folder; the view is refreshed after it. */
  private approving(apply: () => void): void {
    apply();
    this.refresh();
  }

  /** Whether `proposal` is refinable now; `writing` says an agent writes the Draft (`writtenNow`), which is never refined. `drifts` are the Drifts already read, when the caller has them. */
  private refinableProposal(project: Project, proposal: Proposal, writing: boolean, drifts?: readonly Drift[]): boolean {
    return refinable({ kind: proposal.data.kind, attached: attachedDrift(project, proposal.id, drifts) !== null, open: proposal.data.status === "open", stale: health(project, proposal).stale.length > 0, draftRefining: proposal.data.refining === true, writing });
  }

  /** Whether the Proposal `id` is refinable now, a Draft that an agent writes not included (a refinement of this window at work on it, or any live announcement bound to it). Unknown Proposals are not. */
  private refinableNow(project: Project, id: string): boolean {
    try {
      const proposal = getProposal(project, id);
      return this.refinableProposal(project, proposal, proposal.data.status === "draft" && writtenNow(id, this.refinement.running, listAnnouncements(project)));
    } catch {
      return false;
    }
  }

  /**
   * Why the Proposal `id` cannot be refined now (its reason), or null when it can: not refinable, or an approval block refinement does not clear.
   * The refinement this window is starting for it, and the announcement its agent binds, are no reason: they are the refinement itself.
   */
  private refinementRefusal(project: Project, id: string): string | null {
    try {
      if (!this.refinableProposal(project, getProposal(project, id), false)) return "Refine this Proposal is unavailable: it is no longer stale or no longer refinable.";
    } catch {
      return "Refine this Proposal is unavailable: it is no longer stale or no longer refinable.";
    }
    return refinementBlock(project, id)?.reason ?? null;
  }

  /** The state with `ids` queued, the whole queue in Backlog order; a Proposal no longer found is dropped. */
  private enqueued(project: Project, ids: readonly string[]): RefinementState {
    const state = enqueue(this.refinement, ids);
    const found: { id: string; created: string | null }[] = [];
    for (const id of state.queued) {
      try {
        found.push({ id, created: getProposal(project, id).data.created });
      } catch {
        // The Proposal is gone: it is not queued.
      }
    }
    return { ...state, queued: backlogOrder(found) };
  }

  /** Approve of a refinable Proposal with the setting on: it joins the queue and nothing is written now. An approval block refinement does not clear is shown and nothing is queued. */
  private queueRefinement(project: Project, id: string): void {
    if (this.refinement.queued.includes(id) || this.refinement.running.has(id)) return;
    const block = refinementBlock(project, id);
    if (block !== null) {
      void vscode.window.showErrorMessage(`Trama: Approve is unavailable. ${block.reason}`);
      return;
    }
    this.refinement = this.enqueued(project, [id]);
    this.pumpRefinement(project);
    this.refresh();
  }

  /**
   * The click on Refine All: the Proposals it takes now are queued all at once, as so many Approve clicks, nothing is approved and no file changes; the window remembers
   * the click and the ready ones start. With the setting off or nothing to take, nothing happens. A Run in progress does not matter: the refined Proposals wait for it.
   */
  private refineAll(project: Project): void {
    if (!configuredAutoUpdateStaleProposals()) return;
    const taken = this.refineAllTake(project);
    if (taken.length === 0) return;
    this.refinement = refineAllClicked(this.enqueued(project, taken), Date.now());
    this.pumpRefinement(project);
    this.refresh();
  }

  /** Cancel Refine All: only while it is in progress and two seconds after its click, the whole queue is emptied; the refinements at work and the Proposals waiting for a Run stay. */
  private cancelRefineAll(): void {
    if (!cancelRefineAllAllowed(this.refinement, Date.now())) return;
    this.refinement = emptyQueue(this.refinement);
    this.refresh();
  }

  /** The Proposals a click on Refine All takes now, in Backlog order. `picture` holds the cards already read, when the caller has them. */
  private refineAllTake(project: Project, picture?: Picture): string[] {
    const held = new Set([...this.refinement.queued, ...this.refinement.running.keys(), ...this.refinement.waiting]);
    const finishing = proposalsFinishing(project.root);
    const announced = listAnnouncements(project);
    const order = new Map((picture?.proposals ?? listProposals(project)).map((proposal) => [proposal.id, proposal]));
    const candidates: PickFact[] = [];
    for (const id of backlogOrder([...order.values()].map((proposal) => ({ id: proposal.id, created: proposal.data.created })))) {
      const proposal = order.get(id);
      // Only an Open change, or a Draft left refining, can be refined: the others are skipped before anything costly is read.
      if (proposal === undefined || held.has(id) || proposal.data.kind !== "change" || (proposal.data.status !== "open" && proposal.data.refining !== true)) continue;
      try {
        if (!this.refinableProposal(project, proposal, proposal.data.status === "draft" && writtenNow(id, this.refinement.running, announced), picture?.drifts)) continue;
        const block = refinementBlock(project, id);
        if (finishing.includes(id) || (block !== null && block.kind !== "waiting")) candidates.push({ id, block: "other", requires: [] });
        else candidates.push({ id, block: block === null ? "none" : "requires", requires: requiredProposals(project, proposal).map((required) => required.id) });
      } catch {
        // A Proposal that cannot be read is not taken.
      }
    }
    return refineAllPick(candidates, held);
  }

  /** What the queue knows of the Proposal `id`, queued or at work; undefined when it cannot be read. */
  private chainFact(project: Project, id: string): ChainFact | undefined {
    try {
      const proposal = getProposal(project, id);
      const required = requiredProposals(project, proposal);
      return {
        id,
        created: proposal.data.created,
        touched: [...new Set([...touchedFiles(proposal), ...Object.keys(proposal.data.base)])],
        requires: required.map((other) => other.id),
        broken: required.some((other) => other.status === "missing" || other.status === "cycle"),
      };
    } catch {
      return undefined;
    }
  }

  /** The plan of the queue `queued` now, from the files the Proposals touch at this moment. */
  private queuePlan(project: Project, queued: readonly string[]): QueuePlan {
    const facts = new Map<string, ChainFact>();
    for (const id of [...queued, ...this.refinement.running.keys()]) {
      const fact = this.chainFact(project, id);
      if (fact !== undefined) facts.set(id, fact);
    }
    return planQueue({ queued, running: this.refinement.running, waiting: this.refinement.waiting, facts, limit: configuredMaxParallelAgents() });
  }

  /** The refinement as the Board shows it: the state of the window, why each queued Proposal waits, and what a click on Refine All takes. `picture` holds the cards already read. */
  private refinementPicture(project: Project, picture: Picture): RefinementView {
    const enabled = configuredAutoUpdateStaleProposals();
    const waits = this.refinement.queued.length === 0 ? new Map() : this.queuePlan(project, this.refinement.queued).waits;
    const notes = refinementNotes(this.refinement.running.size === 0 ? [] : listAnnouncements(project), [...this.refinement.running.keys()]);
    return refinementView({ state: this.refinement, enabled, runInProgress: ownWindowRuns(project.root), waits, count: enabled ? this.refineAllTake(project, picture).length : 0, notes });
  }

  /** Whether the queued Proposal `id` may keep waiting: still refinable, and blocked by nothing but Proposals it requires. */
  private canStayQueued(project: Project, id: string): boolean {
    if (!this.refinableNow(project, id)) return false;
    const block = refinementBlock(project, id);
    return block === null || block.kind === "waiting";
  }

  /**
   * Starts what the queue allows: the Proposals that are no longer refinable and those that wait for a Proposal that will not be approved leave the queue,
   * and every ready Proposal starts with its places (`planQueue`). With the setting off nothing starts and the queue is emptied.
   */
  private pumpRefinement(project: Project): void {
    if (!configuredAutoUpdateStaleProposals()) {
      this.refinement = emptyQueue(this.refinement);
      return;
    }
    const stay = this.refinement.queued.filter((id) => this.canStayQueued(project, id));
    const plan = this.queuePlan(project, stay);
    for (const id of this.refinement.queued) if (!stay.includes(id) || plan.drop.includes(id)) this.refinement = dequeue(this.refinement, id);
    for (const { proposal, seats } of plan.start) this.startRefinement(project, proposal, seats);
  }

  /** Starts the refinement of `id` as a job of its own holding `seats` places, from the moment its instruction is really sent. */
  private startRefinement(project: Project, id: string, seats: number): void {
    const job = randomUUID();
    this.refinement = beginRefinement(this.refinement, { proposal: id, seats, job, delivered: false });
    this.launchAction(project, { kind: "refine", proposal: id, seats, job }).catch((err: unknown) => {
      // The instruction did not really start: the queue empties and the Proposals that waited go back to refinable; the refinements already at work go on.
      const ended = endRefinementJob(this.refinement, id, job);
      if (ended === null) return;
      this.refinement = emptyQueue(ended.state);
      void vscode.window.showWarningMessage(`Trama: refining ${cardName(project, "proposal", id)} did not start: ${describeError(err)}.`);
      this.refresh();
    });
  }

  /** A Proposal was delivered to the project at `root`: the refinement of this window that works on it remembers it for its job. */
  private noteDelivered(root: string, id: string): void {
    if (findProject()?.root !== root) return;
    this.refinement = markDelivered(this.refinement, id);
  }

  /** The end of the job `job` that refines `id`, once: the Proposal is settled, its places are free and the Proposals that are ready start. A repeated signal changes nothing. */
  private endRefinement(project: Project, id: string, job: string): void {
    const finished = endRefinementJob(this.refinement, id, job);
    if (finished === null) return;
    this.refinement = finished.state;
    this.settleRefined(project, id, finished.ended.delivered);
    this.pumpRefinement(project);
    this.refresh();
  }

  /**
   * What becomes of the refined Proposal `id`: approved when delivered and unblocked, queued again when still stale, dropped when not delivered, kept when blocked.
   * An approval waits while a Run launched from this window is in progress: the Proposal joins the waiting list until that Run ends.
   */
  private settleRefined(project: Project, id: string, delivered: boolean): void {
    let outcome: RefinementEnd = "drop";
    let reason = "";
    try {
      const proposal = getProposal(project, id);
      reason = approvalBlock(project, id)?.reason ?? "";
      outcome = refinementEnd({ delivered, open: proposal.data.status === "open", stale: health(project, proposal).stale.length > 0, blocked: refinementBlock(project, id) !== null });
    } catch {
      outcome = "drop";
    }
    if (outcome === "approve" && ownWindowRuns(project.root)) {
      this.refinement = { ...this.refinement, waiting: this.refinement.waiting.includes(id) ? this.refinement.waiting : [...this.refinement.waiting, id] };
    } else if (outcome === "approve") {
      try {
        this.approving(() => approveProposal(project, id, [configuredSkillsDir()]));
      } catch (err) {
        void vscode.window.showWarningMessage(`Trama: ${cardName(project, "proposal", id)} was refined but not approved: ${describeError(err)}.`);
      }
    } else if (outcome === "requeue") {
      this.refinement = this.enqueued(project, [id]);
    } else if (outcome === "keep") {
      void vscode.window.showWarningMessage(`Trama: ${cardName(project, "proposal", id)} was refined but not approved: ${reason}.`);
    }
  }

  /**
   * The Proposals that waited for a Run of this window are settled once that Run has ended, each as a refined Proposal that was delivered, the required ones first.
   * The list is emptied first, so the refreshes that approving makes do not settle them twice.
   */
  private releaseWaiting(project: Project): void {
    const waiting = this.refinement.waiting;
    this.refinement = { ...this.refinement, waiting: [] };
    const facts = waiting.flatMap((id) => this.chainFact(project, id) ?? []);
    const rank = new Map(backlogOrder(facts).map((id, index) => [id, index]));
    const requires = new Map(facts.map((fact) => [fact.id, fact.requires]));
    for (const id of dependencyOrder(facts.map((fact) => fact.id), (other) => requires.get(other) ?? [], rank)) this.settleRefined(project, id, true);
    this.pumpRefinement(project);
  }


  /** The model a run takes from the Proposal of Task `task` (null: none) in place of its role, read at the launch: none when the Proposal has no model. */
  private runModelOfTask(project: Project, task: string | null): RunModel | undefined {
    if (!this.modelMemory || task === null) return undefined;
    return proposalRunModel(this.modelMemory, project, getTask(project, task).data.proposal);
  }

  /** The model a Resolve run takes from the Proposal of a Drift's origin Tasks: for a unified Drift only when all its origins belong to that one Proposal. */
  private runModelOfDrift(project: Project, drift: string): RunModel | undefined {
    if (!this.modelMemory) return undefined;
    return proposalRunModel(this.modelMemory, project, originDesign(project, getDrift(project, drift).data.origin));
  }

  /** The valid prepared question of an open Drift when the Async Drift Resolver is on (read now, from user settings), null otherwise. */
  private preparedQuestionOf(project: Project, drift: string): PreparedQuestion | null {
    if (!configuredAsyncDriftResolver()) return null;
    const status = preparedStatus(project, getDrift(project, drift));
    return status?.state === "valid" ? status.value : null;
  }

  /**
   * Ask more on question `question` of the open round `round`: a new chat about it and the other questions of the round, with the
   * Drift it prepares when Trama asked it. Only the question in view of an open question counts: any other is ignored. The round
   * stays as it was; a round that has closed is ignored.
   */
  private async askMoreQuestion(round: number, question: string): Promise<void> {
    const project = findProject();
    const current = this.questions?.current();
    if (!project || !current || current.id !== round) return;
    const asked = askMoreTarget(current.state, question);
    if (!asked) return;
    try {
      // A prepared question's ID is the identity of its Drift (Trama writes it so), and only a round Trama asks itself is one.
      const drift = current.prepared ? { id: asked.id, title: getDrift(project, asked.id).title } : null;
      const subject = { kind: "question" as const, question: asked, round: current.state.questions, drift };
      await openAskMore(project.root, "Ask question", askMorePart(subject), askMorePlaceholder(subject));
    } catch (err) {
      this.post({ type: "error", message: describeError(err) });
    }
  }

  /**
   * Resolve on a Drift with a valid prepared question: no agent starts, the question opens as a round of this window. A Fix
   * option, or the choice to close the Drift or adopt its attached Proposal, is written and handed over by Trama as a resolution
   * born from the prepared question. Free text with another option, or a refused hand-over, launches the resolution agent with the
   * answer. A skip or a lost editor writes nothing: the Drift stays open with its question prepared.
   */
  private async resolvePrepared(project: Project, drift: string, value: PreparedQuestion): Promise<void> {
    const job = randomUUID();
    startHeldJob(project.root, "prepared", job);
    let answer: QuestionAnswer | undefined;
    try {
      const result = await this.askPrepared(project.root, { questions: [value.question] });
      if (result?.status === "answered") answer = result.answers[value.question.id];
    } catch {
      return;
    } finally {
      endHeldJob(project.root, job);
    }
    const outcome = preparedOutcome(value, answer);
    if (outcome.kind === "none") return;
    let given = outcome.kind === "agent" ? outcome.answer : undefined;
    if (outcome.kind === "write") {
      const written = writePreparedResolution(project, drift, outcome.answer, [configuredSkillsDir()]);
      if (written.proposal !== null) {
        // In-process commands do not send the notice the command line sends after a hand-over. No agent turn follows, so nothing holds the Proposal.
        const holder = `prepared:${job}`;
        receiveNotice({ type: "proposal-delivered", root: project.root, proposal: written.proposal.id, holder });
        releaseFiledWork(project.root, holder);
        this.refresh();
        return;
      }
      if (answer?.status === "answered") given = { selected: answer.selected, ...(answer.text?.trim() ? { text: answer.text } : {}) };
    }
    if (given !== undefined) await this.launchAction(project, { kind: "resolve-drifts", drift }, given);
  }

  /**
   * «Rework with feedback…» on an open Proposal: asks for the developer's feedback in an input box (Esc does nothing) and, when it is empty, for a
   * confirmation; then rechecks the conditions of Reject (and, for a resolution, of Resolve) on the board just read, rejects the Proposal with the
   * feedback and the `reworkRequested` mark, and sends the instruction that redoes it. When the rejection is refused nothing starts.
   */
  private async reworkProposalWithFeedback(project: Project, id: string): Promise<void> {
    const proposal = getProposal(project, id);
    const name = cardName(project, "proposal", id);
    const refuse = (): boolean => {
      const current = getProposal(project, id);
      let reason: string | null = null;
      if (current.data.status !== "open") reason = current.data.status === "draft" ? stillBeingWritten(project, current, "rejected") : `Proposal ${name} is ${current.data.status}`;
      else if (attachedDrift(project, id) !== null) {
        try {
          requireNotAttached(project, id);
        } catch (err) {
          reason = describeError(err);
        }
      } else if (proposalsFinishing(project.root).includes(id)) reason = "Reject Proposal is unavailable: the agent is still finishing.";
      else if (current.data.kind === "resolution") reason = reworkProposalBlocker(project, driftWork(project.root), id);
      if (reason === null) return false;
      void vscode.window.showErrorMessage(`Trama: ${reason}`);
      return true;
    };
    if (refuse()) return;
    const feedback = await vscode.window.showInputBox({
      title: `Rework ${name} – ${proposal.title}`,
      prompt: "What should the agent change? Leave empty to redo it on the current Model.",
      placeHolder: "Feedback for the agent",
      ignoreFocusOut: true,
    });
    if (feedback === undefined) return;
    const text = feedback.trim();
    if (text === "") {
      const choice = await vscode.window.showWarningMessage(`Rework ${name} without feedback? The agent redoes it on the current Model.`, { modal: true }, "Rework");
      if (choice !== "Rework") return;
    }
    if (refuse()) return;
    try {
      rejectProposal(project, id, text, { reworkRequested: true });
    } catch (err) {
      void vscode.window.showErrorMessage(`Trama: ${describeError(err)}`);
      return;
    }
    this.refresh();
    if (proposal.data.kind === "resolution") {
      const drifts = reworkProposalDrifts(project, id);
      if (drifts.length === 0) {
        void vscode.window.showWarningMessage(`Trama: ${name} was rejected: none of its Drifts is still open.`);
        return;
      }
      await this.launchAction(project, { kind: "rework-resolution", proposal: id, drifts });
      return;
    }
    const skill = proposal.data.kind === "handoff" ? "handoff" : proposal.data.kind === "import" ? "import" : proposal.data.kind === "setup" && modelIsEmpty(project) ? "setup" : "design";
    await this.launchAction(project, { kind: "rework", proposal: id, skill });
  }

  /**
   * After the approval of a handoff: asks the agent to publish its issues. When the instruction does not leave, the approval stands, the issues are Not published and the
   * Issues tab offers Publish again; the Manager hears why as a notice.
   */
  private async publishAfterApproval(project: Project, handoff: string): Promise<void> {
    const failure = await this.publishIssues(project, getProposal(project, handoff).id);
    if (failure !== null) this.post({ type: "notice", text: `Trama approved the handoff but could not ask the agent to publish its issues: ${failure}. Publish them again from the Issues tab.` });
    this.refresh();
  }

  /**
   * `developer.SPLIT_ISSUE`: asks the agent to split the issue `issue` of the open handoff `handoff` into issues that each fit a sprint, on the same handoff. Refused with the first
   * reason of `splitIssueBlock`; when the instruction does not leave nothing changes and the Team view hears why, as a notice.
   */
  private async splitIssue(project: Project, handoff: string, issue: string): Promise<void> {
    const proposal = getProposal(project, handoff);
    const file = proposal.issues.find((i) => i.id === issue);
    if (proposal.data.kind !== "handoff" || file === undefined) throw new TramaError(`Proposal ${cardName(project, "proposal", proposal.id)} has no issue ${issue}`);
    const blocked = splitIssueBlock({
      status: proposal.data.status,
      estimate: appliedFields(file.data).estimate,
      finishing: proposalsFinishing(project.root).includes(proposal.id),
      writing: writtenNow(proposal.id, this.refinement.running, listAnnouncements(project)),
      running: ownWindowRuns(project.root),
    });
    if (blocked !== null) {
      this.post({ type: "notice", text: `Trama could not split the issue: ${blocked}.` });
      return;
    }
    try {
      await this.launchAction(project, { kind: "split-issue", handoff: proposal.id, issue: file.id });
    } catch (err) {
      this.post({ type: "notice", text: `Trama could not split the issue: ${describeError(err).replace(/\.$/, "")}.` });
    }
  }

  /**
   * `developer.REPLAN_HANDOFFS`, after the Manager confirmed: checks again the reasons Replan is unavailable, gathers the handoffs open now, stale ones included, and asks the agent
   * to plan together the issues of those that are not stale. When the instruction does not leave nothing changes and the Team view hears why, as a notice.
   */
  private async replanHandoffs(project: Project): Promise<void> {
    const team = teamUnavailableReason(project);
    const proposals = listProposals(project);
    const blocked = team ?? this.replanView(project, proposals).block;
    if (blocked !== null) {
      this.post({ type: "notice", text: `Trama could not replan the handoffs: ${blocked}.` });
      return;
    }
    const handoffs = proposals.filter((proposal) => proposal.data.kind === "handoff" && proposal.data.status === "open").map((proposal) => proposal.id);
    try {
      await this.launchAction(project, { kind: "replan-handoffs", handoffs });
    } catch (err) {
      this.post({ type: "notice", text: `Trama could not replan the handoffs: ${describeError(err).replace(/\.$/, "")}.` });
    }
  }

  /**
   * Approving, rejecting and reworking a handoff are the Team view's: from any other view the host refuses with a notice (`ui#proposal/Open`). The decision itself is the
   * one of every Proposal.
   */
  private refuseHandoffOutsideTeam(project: Project, id: string, action: string): boolean {
    if (getProposal(project, id).data.kind !== "handoff" || this.panelView === "team") return false;
    this.post({ type: "notice", text: `Trama could not ${action.toLowerCase()} the handoff: decide it in the Team view.` });
    return true;
  }

  /**
   * `developer.CHANGE_ISSUE_FIELD`: records the Manager's value for a field of an issue of an open handoff, checked against the team and the linked Project as the editor
   * read them. A refused value changes nothing and reaches the preview as `issueFieldRejected`; a fresh picture follows either way.
   */
  private changeIssueField(project: Project, message: Extract<ToHost, { type: "setIssueField" }>): void {
    const target = this.teamTarget();
    try {
      if (target === null || this.github === undefined) throw new TramaError("Team is not available.");
      const roster = this.people?.members(target.repository);
      const members = roster !== undefined && "members" in roster ? roster.members.map((member) => member.handle) : null;
      const rules = fieldRulesOf(members, this.github.message(target.repository, target.linked).project, localToday());
      setIssueField(project, message.handoff, message.issue, message.key, message.value, rules);
    } catch (err) {
      this.post({ type: "issueFieldRejected", handoff: message.handoff, issue: message.issue, key: message.key, message: describeError(err) });
    }
    this.refresh();
  }

  /**
   * `developer.PUBLISH_AGAIN`: asks the agent to publish the handoff's issues that are not published, only while Team is available and a GitHub Project is linked.
   * When the instruction does not leave nothing changes and the Issues tab hears why, as a notice.
   */
  private async publishAgain(project: Project, handoff: string): Promise<void> {
    const id = getProposal(project, handoff).id;
    const blocked = publishAgainBlock(project, id);
    if (blocked !== null) {
      this.post({ type: "notice", text: `Trama could not publish again: ${blocked}.` });
      return;
    }
    const failure = await this.publishIssues(project, id);
    if (failure !== null) this.post({ type: "notice", text: `Trama could not publish again: ${failure}.` });
    this.refresh();
  }

  /**
   * Asks the agent to publish the issues of the approved handoff `handoff` that are not published (`rules#issue`): after the approval and with Publish again.
   * Returns null when the instruction left, otherwise why it did not. An instruction that does not leave changes no issue; one that fails after its terminal was
   * known sends its issues, still publishing, to Not published.
   */
  async publishIssues(project: Project, handoff: string): Promise<string | null> {
    try {
      await this.launchAction(project, { kind: "publish-issues", handoff });
      return null;
    } catch (err) {
      const waiting = issuesOfHandoff(project, handoff).filter((issue) => issue.data.state === "publishing");
      stopPublishing(project, waiting.map((issue) => issue.id), "The agent did not start.");
      return describeError(err).replace(/\.$/, "");
    }
  }

  /** `feedback` is set only by Rework: the Drift's prepared question is never used and the instruction carries the feedback. */
  private async launchAction(project: Project, action: AgentAction | Extract<ResolvedAction, { kind: "rework" | "rework-resolution" | "refine" | "publish-issues" | "split-issue" | "replan-handoffs" | "update-issue" | "scan-issue" }>, answered?: { selected: string[]; text?: string }, feedback?: string): Promise<void> {
    // Resolve Drifts and Runs are checked from current state at the request and at each delivery checkpoint.
    const refusal = (): string | null => {
      if (action.kind === "resolve-drifts" && driftsFinishing(project.root).includes(action.drift)) return "Resolve this Drift is unavailable: the agent is still finishing.";
      if (action.kind === "implement" && tasksFinishing(project.root).includes(action.task)) return "Run this Task is unavailable: the agent is still finishing.";
      if (action.kind === "rework-resolution") {
        const blocker = resolveDriftsBlocker(project, driftWork(project.root));
        return blocker === null ? null : `Rework is unavailable: ${blocker}.`;
      }
      if (action.kind === "resolve-drifts") {
        const drift = getDrift(project, action.drift);
        if (drift.data.status !== "open") return `Resolve this Drift is unavailable: Drift ${cardName(project, "drift", drift.id)} is ${drift.data.status}`;
        const holding = resolutionHolding(project, action.drift);
        if (holding) return `Resolve this Drift is unavailable: Drift ${cardName(project, "drift", drift.id)} is part of resolution ${cardName(project, "proposal", holding.id)}.`;
        // The answer to a prepared question is the prepared question's own work: no resolution awaiting a decision stops the agent it starts, as none stops the question.
        const blocker = resolveDriftBlocker(project, driftWork(project.root), this.namedByResolution.has(action.drift), answered !== undefined || (feedback === undefined && this.preparedQuestionOf(project, action.drift) !== null));
        return blocker === null ? null : `Resolve this Drift is unavailable: ${blocker}.`;
      }
      if (action.kind === "unify-drifts") {
        const reasons = unifyDriftsBlockers(project, driftWork(project.root), driftsFinishing(project.root));
        return reasons.length === 0 ? null : `Unify Drifts is unavailable: ${reasons.join(". ")}.`;
      }
      if (action.kind === "refine") return this.refinementRefusal(project, action.proposal);
      if (action.kind === "replan-handoffs") return this.replanView(project, listProposals(project)).block;
      if (action.kind === "update-issue" || action.kind === "scan-issue") {
        const jobs = issueJobs(listAnnouncements(project));
        if ((action.kind === "update-issue" ? jobs.updating : jobs.scanning).includes(action.number)) return action.kind === "update-issue" ? UPDATING_REASON : SCANNING_REASON;
        return ownWindowRuns(project.root) ? RUN_IN_PROGRESS : null;
      }
      const isRun = action.kind === "implement" || action.kind === "implement-all";
      const runBlock = isRun ? runWindowBlocker({ resolving: driftWork(project.root).resolving, running: ownWindowRuns(project.root) }) : null;
      if (runBlock !== null) return `A run cannot start: ${runBlock}.`;
      if (action.kind === "implement-all") {
        const blocker = runBlocker(runTasks(project), namerOf(syncShortNumbers(project).all()));
        return blocker === null ? null : `Run all is unavailable: ${blocker}.`;
      }
      return null;
    };
    const send = async (resolved: ResolvedAction, announceProposal?: DesignAnnouncement | LaunchAnnouncement, instruction: Instruction = buildPrompt(resolved), checkSend: () => string | null = () => null, model?: RunModel, extra: LaunchJobOptions = {}) => {
      let refused: string | null = null;
      const canSend = () => (refused = refusal() ?? checkSend()) === null;
      const rememberScan = resolved.kind === "scan" || resolved.kind === "mergeScan" ? (startedAt: number) => rememberDeliveredScan(project, startedAt) : undefined;
      const result = await launchAgent(project.root, instruction, terminalName(resolved, (kind, id) => cardName(project, kind, id)), announceProposal, canSend, resolved.kind === "implement" || resolved.kind === "implement-all" ? "run" : resolved.kind === "resolve-drifts" || resolved.kind === "rework-resolution" ? "resolve" : resolved.kind === "unify-drifts" ? "unify" : resolved.kind === "scan" || resolved.kind === "mergeScan" || resolved.kind === "scan-issue" ? "scan" : resolved.kind === "refine" ? "refine" : undefined, rememberScan, { filesDrifts: mayFileDrifts(resolved), severalTasks: resolved.kind === "implement-all", model, ...(resolved.kind === "implement" ? { task: resolved.task } : {}), ...(resolved.kind === "reconcileMerge" ? { subAgents: false } : {}), ...extra });
      if (refused !== null) throw new TramaError(refused);
      return result;
    };
    const blocked = refusal();
    if (blocked !== null) throw new TramaError(blocked);
    switch (action.kind) {
      case "resolve-drifts": {
        // Resolve Drifts is always a request on the one Drift the developer chose.
        const drift = action.drift;
        const prepared = answered === undefined && feedback === undefined ? this.preparedQuestionOf(project, drift) : null;
        if (prepared !== null) {
          await this.resolvePrepared(project, drift, prepared);
          return;
        }
        const instruction = feedback !== undefined ? reworkPrompt(drift, feedback) : answered === undefined ? undefined : `${buildPrompt({ kind: "resolve-drifts", drift })} ${PREPARED_ANSWER_SENTENCE} ${JSON.stringify(answered)}.`;
        const result = await send({ kind: "resolve-drifts", drift }, { kind: "resolve", drifts: () => [drift] }, instruction, undefined, this.runModelOfDrift(project, drift));
        if (launched(result)) this.namedByResolution.add(drift);
        return;
      }
      case "rework-resolution": {
        const result = await send(action, { kind: "resolve", drifts: () => action.drifts }, undefined, undefined, this.runModelOfDrift(project, action.drifts[0] ?? ""));
        if (launched(result)) for (const drift of action.drifts) this.namedByResolution.add(drift);
        return;
      }
      case "unify-drifts": {
        const file = bundledUnifyInstructions();
        if (file === undefined) throw new TramaError("Unify Drifts is unavailable: its instructions are missing from the extension's package.");
        const text = readFileSync(file, "utf8");
        // The Drifts are gathered each time the instruction is built, which happens only when it is really about to be sent; the card and the job use the last gathering.
        let gathered: string[] = [];
        const gather = (): string[] => (gathered = unifiableDrifts(project, driftsFinishing(project.root)));
        await send({ kind: "unify-drifts", drifts: [] }, { kind: "unify", drifts: () => gathered }, () => buildPrompt({ kind: "unify-drifts", drifts: gather() }), undefined, undefined, { role: "analysis", attachment: { file, text }, drifts: () => gathered });
        return;
      }
      case "rework": {
        const { title } = getProposal(project, action.proposal);
        // The ghost of a handoff has no column on the Board: it is a work, shown in the status bar.
        await send(action, action.skill === "handoff" ? { kind: "work", title } : title);
        return;
      }
      case "refine": {
        const { proposal, job, seats } = action;
        const result = await send(action, { kind: "refine", proposal, title: getProposal(project, proposal).title }, undefined, undefined, undefined, { role: "analysis", id: job, limit: seats, onEnd: () => this.endRefinement(project, proposal, job) });
        if (!launched(result)) throw new TramaError("the agent did not start");
        return;
      }
      case "scan": {
        if (!(await confirmScanSystem())) return;
        await send(action, { kind: "check", title: "Scanning System" });
        return;
      }
      case "mergeScan":
        await send(action, { kind: "check", title: "Scanning System" });
        return;
      case "reconcileMerge":
        await send(action);
        return;
      case "implement": {
        const task = getTask(project, action.task).id;
        await send({ kind: "implement", task }, undefined, undefined, undefined, this.runModelOfTask(project, task));
        return;
      }
      case "implement-all": {
        const runs = this.plannedRuns(project);
        const only = runs[0];
        // One group is one Run. Several groups are a sequence of Runs, one per model: it holds the project from its first Run to its last.
        // With parallel execution the Runs start together, sharing the sub-agent places; otherwise they start one after the other.
        const parallel = configuredParallelExecution();
        const limit = configuredMaxParallelAgents();
        const launchedAt = Date.now();
        if (runs.length <= 1) {
          // The only Run's job is the Run all: it keeps what the time-left estimate needs, under the identity its job will have.
          const id = randomUUID();
          const runAll: RunAll = { launchedAt, parallel, groups: [{ jobId: id, tasks: only?.tasks ?? [], seats: limit, terminal: null, ended: false }], reference: null, plan: null, progress: 0 };
          await send({ kind: "implement-all", group: only?.group }, undefined, undefined, undefined, only?.run, { id, runAll });
          return;
        }
        const held = randomUUID();
        // The places each Run gets are decided at the launch, as the sequence decides them; the Runs are told apart by their Task lists.
        const seated = parallel ? (({ now, waiting }) => [...now, ...waiting])(startRuns(runs, limit)) : runs.map((run) => ({ ...run, seats: limit }));
        const jobIds = new Map<readonly string[], string>(runs.map((run) => [run.tasks, randomUUID()]));
        const runAll: RunAll = { launchedAt, parallel, groups: seated.map((run) => ({ jobId: jobIds.get(run.tasks) as string, tasks: run.tasks, seats: run.seats, terminal: null, ended: false })), reference: null, plan: null, progress: 0 };
        startHeldJob(project.root, "run", held, runAll);
        const launch = (planned: PlannedRun & { seats?: number }, onEnd: (abnormal?: string) => void) => this.launchSequenceRun(project, planned, jobIds.get(planned.tasks), onEnd);
        const finish = (abnormal?: string) => endHeldJob(project.root, held, abnormal);
        if (parallel) runSequenceTogether(runs, limit, launch, finish);
        else runSequence(runs, launch, finish);
        return;
      }
      case "import":
        await send(action, { kind: "work", title: "Importing from code" });
        return;
      case "publish-issues": {
        // The terminal is known once the launch is sure to go on: from then on the issues of the handoff that are not published are publishing, held by it (`rules#issue`).
        const { handoff } = action;
        const result = await send(action, { kind: "work", title: "Publishing issues" }, undefined, undefined, undefined, {
          subAgents: false,
          onStarted: (terminal) => {
            beginPublishing(project, handoff, terminal);
          },
        });
        if (!launched(result)) throw new TramaError("the agent did not start");
        return;
      }
      case "update-issue": {
        // The agent comments on GitHub in the job's own terminal; its ghost is how the issue's `Updating…` is known while it runs.
        const result = await send(action, { kind: "work", title: updatingTitle(action.number) });
        if (!launched(result)) throw new TramaError("the agent did not start");
        return;
      }
      case "scan-issue": {
        // Like the scan of the System, with the issue's references alone, and without the memory of the last scan of the System.
        const result = await send(action, { kind: "check", title: scanningTitle(action.number) });
        if (!launched(result)) throw new TramaError("the agent did not start");
        return;
      }
      case "split-issue": {
        // The handoff stays Open until the agent changes its first file; the instruction runs on the analysis role and files no Drift.
        const result = await send(action, { kind: "work", title: "Splitting an issue" });
        if (!launched(result)) throw new TramaError("the agent did not start");
        return;
      }
      case "replan-handoffs": {
        // Every handoff open at the confirmation is named; the instruction runs on the analysis role and files no Drift. Its ghost is how the running Replan is known.
        const result = await send(action, { kind: "work", title: REPLANNING_TITLE });
        if (!launched(result)) throw new TramaError("the agent did not start");
        return;
      }
    }
  }
}
