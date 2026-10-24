import { readdirSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { homedir } from "node:os";
import { randomBytes, randomUUID } from "node:crypto";
import * as vscode from "vscode";
import { TramaError, UsageError } from "../../../src/core/errors";
import { clearDoneTasks } from "../../../src/core/clear-done";
import { deleteTask } from "../../../src/core/delete-task";
import { findInstructionFiles } from "../../../src/core/instruction-files";
import { approvalBlock, approveProposal, getProposal, health, rejectProposal, resolutionHolding } from "../../../src/core/proposals";
import { type PreparedQuestion, preparedOutcome, preparedStatus } from "../../../src/core/prepared";
import { reworkProposalBlocker, reworkProposalDrifts, resolveDriftBlocker, resolveDriftsBlocker, runWindowBlocker, unifiableDrifts, unifyDriftsBlockers, writePreparedResolution } from "../../../src/core/resolution";
import type { QuestionAnswer } from "../../../src/core/questions";
import { buildSnapshot } from "../../../src/core/snapshot";
import { loadModel, modelDir, type Project, REQUIREMENTS_PREFIX, requirementsDir } from "../../../src/core/store";
import { namerOf } from "../../../src/core/card-names";
import { runBlocker } from "../../../src/core/design";
import { cardName, syncShortNumbers } from "../../../src/core/short-numbers";
import { attachedDrift, blockedTasks, dismissDrift, getDrift, getTask, getTaskOrNull, listDrifts, listTasks, originDesign, requireNotAttached } from "../../../src/core/work";
import type { AgentAction, NavigateOptions, SetupChoice, ToHost, ToWebview, ViewName, WorkspaceFolderView } from "../protocol";
import type { MenuViewName } from "../menu-protocol";
import { onAnnouncementsWithdrawn, synchronizeAnnouncementTitles } from "./announcements";
import { configuredAdvisorScanner, configuredAsyncDriftResolver, configuredAutoUpdateStaleProposals, configuredMaxParallelAgents, configuredModels, configuredOmpPath, configuredParallelExecution, configuredSkillsDir, type DesignAnnouncement, type Instruction, type LaunchAnnouncement, type LaunchJobOptions, endHeldJob, installOmp, launchAgent, launched, openAskMore, settings, startHeldJob } from "./agent";
import { bundledUnifyInstructions } from "./bundled";
import { onQuestionRoundChange, questionRoundOpen } from "./question-activity";
import { driftWork, driftsFinishing, localProjectJobs, onDriftResolutionChange, onProposalDelivered, onStoppedFollowing, proposalsFinishing, receiveNotice, releaseFiledWork, tasksFinishing, unifyingDrifts } from "./drift-resolution";
import { askPreparedRound } from "./questions";
import { askMorePlaceholder, askMoreSubject, askMoreTerminalName } from "./ask-more";
import { webviewHtml } from "./html";
import { parseToHost } from "./messages";
import { taskImagePath, withImageUris } from "./task-images";
import { taskImagesRoot } from "../../../src/core/task-images";
import { appliedProposalModels, boardModels, chooseProposalModel, forgetProposalModels, proposalRunModel, type BoardModels, type ModelMemory } from "./proposal-models";
import type { RunModel } from "./terminal-agent";
import { NO_REFINEMENT, type RefinementEnd, type RefinementState, backlogOrder, enqueue, nextToRefine, refinable, refinementEnd, refinementView, withdraw } from "./refinement";
import { planRuns, runSequence, runSequenceTogether, type AppliedModel, type PlannedRun } from "./run-groups";
import { ompModels } from "./model-lists";
import { ensureOmpUpdated, findOmp, forgetUpdateCheck } from "./omp-update";
import { ompStatus } from "./omp-status";
import { confirmScanSystem } from "./scan-confirm";
import { planSettingChange, settingsSchema, settingTitle, type SettingPlan, type SettingSchema, type SettingsValues } from "./settings-schema";
import { resolveMarkdownFile } from "./paths";
import { checkSkills, fileFolders, findProject, initializeProject, NO_PROJECT_WARNING, updateSkills } from "./project";
import { folderChildren, folderInside, gitIgnored, type RawEntry } from "./folder-tree";
import { askMoreTarget } from "./question-state";
import { PREPARED_QUESTION_AGENT, type QuestionSession } from "./question-session";
import type { DesignRequests } from "./design-requests";

import { writeLastScan } from "../../../src/core/last-scan";
import { askMorePart, buildPrompt, mayFileDrifts, PREPARED_ANSWER_SENTENCE, reworkPrompt, terminalName, type ResolvedAction } from "./prompts";

const DEBOUNCE_MS = 150;

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

const notBlank = (message: string) => (value: string) => (value.trim() === "" ? message : undefined);

/** Whether the Model has no Feature and no Actor: the Drifts, open or not, do not count. */
function modelIsEmpty(project: Project): boolean {
  const model = loadModel(project);
  return model.features.size === 0 && model.actors.size === 0;
}

/** The approval block of Proposal `id` that refinement does not clear (every block but staleness and a Draft left refining), with its reason; null when none. */
function refinementBlock(project: Project, id: string): string | null {
  const block = approvalBlock(project, id);
  return block === null || block.kind === "stale" || block.kind === "draft" ? null : block.reason;
}

/** Owns the single Trama panel, feeds it snapshots and carries out what the developer asks of it. */
export class Controller implements vscode.Disposable {
  /** The Proposal refinement of this window: the queue and the Proposal running, in memory. */
  private refinement: RefinementState = NO_REFINEMENT;
  private panel: vscode.WebviewPanel | undefined;
  private timer: NodeJS.Timeout | undefined;
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
    private readonly tramaFiles?: vscode.FileSystemWatcher,
    private readonly globalStorageUri?: vscode.Uri,
    private readonly designRequests?: DesignRequests,
    /** The workspace state, where the models chosen for Proposals are kept. */
    private readonly modelMemory?: ModelMemory,
  ) {}

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
      return { name: folder.name, root, hasFiles };
    });
  }

  /** The workspace folders changed: the first setup lists them again, and the panel follows a folder that is now (or no longer) a project. */
  workspaceFoldersChanged(): void {
    this.refresh();
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
   * An entry of the side menu or a command `Trama: Show <view>`: opens the panel on `view`, or brings it forward and moves it there, and checks the installed
   * skills as an ordinary opening does (only a project has any). Settings opens without a folder and in a folder that is no project too; Get Started opens
   * the panel on Get Started; every other view does the ordinary opening when the folder is no Trama project.
   */
  async show(view: MenuViewName): Promise<void> {
    if (view !== "settings" && view !== "getstarted" && findProject() === undefined) return this.open();
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
    }
    this.checkSkillsInBackground();
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
    for (const listener of [...this.shownViewListeners]) listener(view);
  }

  /** Checks the installed skills of the project the panel opens, once at a time and without holding the panel back. */
  private checkSkillsInBackground(): void {
    const project = findProject();
    if (!project || this.checkingSkills) return;
    this.checkingSkills = true;
    setTimeout(() => {
      void checkSkills(project, this.globalStorageUri).finally(() => {
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
        project = await initializeProject(root);
        if (project === undefined) {
          finish(null);
          return;
        }
        this.refresh();
      } else {
        project = findProject();
        if (project === undefined && message.mode === "empty-model") {
          finish("This workspace has no Trama project.");
          return;
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
   * with `updating`), then `omp models --json`.
   */
  private async checkAgent(ompPath: string): Promise<void> {
    const wanted = ompPath.trim();
    const program = await findOmp(wanted);
    if (program === undefined) {
      this.post({ type: "agentCheck", ompPath, state: "done", ok: false, missing: true, error: `omp not found at ${wanted === "" ? "the editor PATH" : wanted}` });
      return;
    }
    const outcome = await ensureOmpUpdated(program, (version) => this.post({ type: "agentCheck", ompPath, state: "updating", version }));
    if (outcome.missing === true) {
      this.post({ type: "agentCheck", ompPath, state: "done", ok: false, missing: true, error: `omp not found at ${wanted === "" ? "the editor PATH" : wanted}` });
      return;
    }
    const list = await ompModels(wanted === "" ? program : wanted);
    this.post({
      type: "agentCheck",
      ompPath,
      state: "done",
      ok: list.error === undefined,
      missing: list.missing === true,
      ...(outcome.version === undefined ? {} : { version: outcome.version }),
      ...(list.error === undefined ? { models: list.models.length } : { error: list.error }),
      ...(outcome.updateError === undefined ? {} : { updateError: outcome.updateError }),
    });
  }

  /** Install omp: a visible terminal with the official installer; when it ends the wizard and the Settings tab get a new omp check, for the path set by then. */
  installOmp(): void {
    installOmp(() => {
      forgetUpdateCheck();
      void this.checkAgent(configuredOmpPath());
      void this.refreshOmp(true);
    });
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
      this.post({ type: "modelSuggestions", ...list });
      const error = status.error ?? list.error;
      this.post({
        type: "ompStatus",
        state: "done",
        missing: status.missing || list.missing === true,
        ...(status.version === undefined ? {} : { version: status.version }),
        ...(error === undefined ? { models: list.models.length } : { error }),
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
    const list = await ompModels(ompPath.trim());
    if (request === this.wizardSuggestionsRequest) this.post({ type: "modelSuggestions", ...list, ompPath });
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

  /** Quick pick for the scan command: the whole System or one Feature. */
  async pickAndScan(): Promise<void> {
    const project = this.requireProject();
    if (!project) return;
    const picked = await vscode.window.showQuickPick(
      [
        { label: "Whole System", feature: undefined as string | undefined },
        ...[...loadModel(project).features.values()].map((f) => ({ label: f.name, description: f.id, feature: f.id as string | undefined })),
      ],
      { placeHolder: "What should the agent scan?" },
    );
    if (picked) await this.launchAction(project, { kind: "scan", feature: picked.feature });
  }

  async updateSkills(): Promise<void> {
    const project = this.requireProject();
    if (project) await updateSkills(project, this.globalStorageUri);
  }

  private requireProject(): Project | undefined {
    const project = findProject();
    if (!project) void vscode.window.showWarningMessage(NO_PROJECT_WARNING);
    return project;
  }

  settingsChanged(ompPathChanged = false): void {
    // Turning the setting off also empties the waiting list: those Proposals are no longer approved by this window when their Run ends.
    if (!configuredAutoUpdateStaleProposals()) this.refinement = { ...this.refinement, waiting: [] };
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
    clearTimeout(this.timer);
  }

  private create(): void {
    const dist = vscode.Uri.joinPath(this.extensionUri, "dist");
    const title = this.projectTitle();
    const panel = vscode.window.createWebviewPanel("trama", title, vscode.ViewColumn.Active, {
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
    });
    panel.webview.onDidReceiveMessage((raw: unknown) => void this.handle(raw));

    const subscriptions = [
      ...(this.tramaFiles ? this.watchChanges(this.tramaFiles) : []),
      onAnnouncementsWithdrawn((announcements) => this.post({ type: "withdrawn", announcements })),
      onStoppedFollowing((subject, reason) => this.post({ type: "stoppedFollowing", subject, reason })),
      onQuestionRoundChange(() => this.refresh()),
      onDriftResolutionChange(() => this.refresh()),
      onProposalDelivered((root, id) => this.noteDelivered(root, id)),
      ...(this.questions ? [this.questions.onChange((round) => this.post({ type: "questions", round }))] : []),
    ];

    panel.onDidDispose(() => {
      for (const subscription of subscriptions) subscription.dispose();
      clearTimeout(this.timer);
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

  private scheduleRefresh(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.refresh(), DEBOUNCE_MS);
  }

  private watchChanges(watcher: vscode.FileSystemWatcher): vscode.Disposable[] {
    const onChange = () => this.scheduleRefresh();
    return [watcher.onDidCreate(onChange), watcher.onDidChange(onChange), watcher.onDidDelete(onChange)];
  }


  private projectTitle(project = findProject()): string {
    const folder = project?.root ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    // A window without folders has no System to name: the panel, which shows only the settings there, keeps the product's name.
    const fallback = folder === undefined ? "Trama" : basename(folder);
    try {
      return project ? loadModel(project).system.name.trim() || fallback : fallback;
    } catch {
      return fallback;
    }
  }


  /** Posts a fresh snapshot; if the files cannot be read, posts the error and the view keeps its last snapshot. */
  private refresh(): void {
    // Turning the setting off empties the refinement queue: a Proposal already being refined goes on.
    if (!configuredAutoUpdateStaleProposals() && this.refinement.queued.length > 0) this.refinement = { ...this.refinement, queued: [] };
    const project = findProject();
    this.post({ type: "project", present: project !== undefined });
    if (!project) {
      this.post({ type: "workspaceFolders", folders: this.workspaceFolderViews() });
      if (this.panel) this.panel.title = this.projectTitle(undefined);
      return;
    }
    if (this.panel) this.panel.title = this.projectTitle(project);
    // The Proposals that waited for a Run of this window are settled once that Run has ended.
    if (this.refinement.waiting.length > 0 && !ownWindowRuns(project.root)) this.releaseWaiting(project);
    try {
      if (this.modelMemory) forgetProposalModels(this.modelMemory, project).catch((err: unknown) => this.post({ type: "error", message: describeError(err) }));
      const work = driftWork(project.root);
      synchronizeAnnouncementTitles(project);
      this.allowTaskImages(project);
      const built = buildSnapshot(project, driftsFinishing(project.root), proposalsFinishing(project.root), tasksFinishing(project.root));
      const webview = this.panel?.webview;
      const snapshot = webview ? withImageUris(built, (path) => webview.asWebviewUri(vscode.Uri.file(path)).toString()) : built;
      const models: BoardModels = this.modelMemory ? boardModels(this.modelMemory, snapshot.proposals) : { proposals: {} };
      if (this.panel) this.panel.title = snapshot.system.name.trim() || this.projectTitle(project);
      // The Drifts an agent was asked to resolve are forgotten once no resolution runs, so a later Resolve is not held by them.
      if (!work.resolving) this.namedByResolution.clear();
      const asyncResolver = configuredAsyncDriftResolver();
      const drifts = Object.fromEntries(listDrifts(project).filter((d) => d.data.status === "open").map((d) => [d.id, resolveDriftBlocker(project, work, this.namedByResolution.has(d.id), asyncResolver && snapshot.drifts.find((x) => x.id === d.id)?.prepared?.valid === true)]));
      // The open Drifts the running resolution is working on: those this window asked an agent to resolve.
      const resolving = work.resolving ? Object.keys(drifts).filter((id) => this.namedByResolution.has(id)) : [];
      this.post({ type: "snapshot", snapshot, asking: questionRoundOpen(), resolve: { blocker: resolveDriftsBlocker(project, work), runReason: runWindowBlocker({ resolving: work.resolving, running: ownWindowRuns(project.root) }), running: ownWindowRuns(project.root), drifts, resolving }, unify: { blockers: unifyDriftsBlockers(project, work, driftsFinishing(project.root)), unifying: unifyingDrifts(project.root) }, models, scans: { advisorScanner: configuredAdvisorScanner() }, refinement: refinementView(this.refinement, configuredAutoUpdateStaleProposals(), ownWindowRuns(project.root)) });
    } catch (err) {
      this.post({ type: "error", message: describeError(err) });
    }
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

  /**
   * Starts one Run of a sequence, `Run all` cut by model. Its `onEnd` hears how the Run ends. The Run is not refused here
   * for the held sequence it belongs to, so the window and the Run-all checks are not applied to it again. `seats` is the
   * sub-agent places its instruction gives; absent, the whole `trama.maxParallelAgents`.
   */
  private async launchSequenceRun(project: Project, planned: PlannedRun & { seats?: number }, onEnd: (abnormal?: string) => void): Promise<boolean> {
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
        { filesDrifts: true, severalTasks: true, model: planned.run, limit: planned.seats, onEnd },
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
      await this.refreshOmp();
      return;
    }
    if (message.type === "agentCheckWanted") {
      await this.checkAgent(message.ompPath);
      return;
    }
    if (message.type === "installOmp") {
      this.installOmp();
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
      return;
    }
    if (message.type === "ready") {
      this.refresh();
      this.postSettings();
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
      return;
    }
    if (message.type === "writeDesignRequest") {
      await this.designRequests?.write();
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
        if (this.refuseWhileFinishing(project, message.id, "Approve") || this.refuseWhileRunning(project)) return;
        // With the setting on, a refinable Proposal is not approved: it joins the refinement queue, and the agent refines it.
        if (configuredAutoUpdateStaleProposals() && this.refinableNow(project, message.id)) {
          this.queueRefinement(project, message.id);
          return;
        }
        this.approving(() => approveProposal(project, message.id, [configuredSkillsDir()]));
        return;
      case "setProposalModel": {
        if (!this.modelMemory) throw new TramaError("Trama cannot keep the model of a Proposal: the workspace state is not available.");
        await chooseProposalModel(this.modelMemory, project, message.proposal, message.model);
        this.refresh();
        return;
      }
      case "rejectProposal": {
        requireNotAttached(project, message.id);
        if (this.refuseWhileFinishing(project, message.id, "Reject")) return;
        rejectProposal(project, message.id);
        this.refinement = withdraw(this.refinement, message.id);
        this.refresh();
        return;
      }
      case "clearDone":
        this.clearDone(project, message.tasks);
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
        await this.reworkProposalWithFeedback(project, message.proposal);
        return;
      case "cancelRefinement":
        // Only a Proposal waiting in the queue is taken out; the one being refined is not cancellable from its card.
        this.refinement = withdraw(this.refinement, message.proposal);
        this.refresh();
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

  /** Whether the Proposal `id` is refinable now; `writing` says a refinement of this window already writes it. Unknown Proposals are not. */
  private refinableNow(project: Project, id: string, writing = false): boolean {
    try {
      const proposal = getProposal(project, id);
      return refinable({ kind: proposal.data.kind, attached: attachedDrift(project, id) !== null, open: proposal.data.status === "open", stale: health(project, proposal).stale.length > 0, draftRefining: proposal.data.refining === true, writing });
    } catch {
      return false;
    }
  }

  /** Why the Proposal `id` cannot be refined now (its reason), or null when it can: not refinable, or an approval block refinement does not clear. */
  private refinementRefusal(project: Project, id: string): string | null {
    if (!this.refinableNow(project, id)) return "Refine this Proposal is unavailable: it is no longer stale or no longer refinable.";
    return refinementBlock(project, id);
  }

  /** Approve of a refinable Proposal with the setting on: it joins the queue and nothing is written now. An approval block refinement does not clear is shown and nothing is queued. */
  private queueRefinement(project: Project, id: string): void {
    const block = refinementBlock(project, id);
    if (block !== null) {
      void vscode.window.showErrorMessage(`Trama: Approve is unavailable. ${block}`);
      return;
    }
    const state = enqueue(this.refinement, id);
    this.refinement = { ...state, queued: this.orderQueue(project, state.queued) };
    this.pumpRefinement(project);
    this.refresh();
  }

  /** The queued Proposals in Backlog order; a Proposal no longer found is dropped. */
  private orderQueue(project: Project, ids: string[]): string[] {
    const found: { id: string; created: string | null }[] = [];
    for (const id of ids) {
      try {
        found.push({ id, created: getProposal(project, id).data.created });
      } catch {
        // The Proposal is gone: it is not queued.
      }
    }
    return backlogOrder(found);
  }

  /** Starts the first queued Proposal that is still refinable, when this window runs no refinement. */
  private pumpRefinement(project: Project): void {
    if (this.refinement.running !== null) return;
    const picked = nextToRefine(this.refinement.queued, (id) => this.refinableNow(project, id));
    this.refinement = { ...this.refinement, queued: picked.queued };
    if (picked.next === null) return;
    const id = picked.next;
    this.refinement = { ...this.refinement, running: id, delivered: false };
    this.launchAction(project, { kind: "refine", proposal: id }).catch((err: unknown) => {
      this.refinement = { ...this.refinement, running: null, delivered: false };
      void vscode.window.showWarningMessage(`Trama: refining ${cardName(project, "proposal", id)} did not start: ${describeError(err)}.`);
      this.pumpRefinement(project);
      this.refresh();
    });
  }

  /** A Proposal was delivered to the project at `root`: the running refinement of this window remembers it for its job. */
  private noteDelivered(root: string, id: string): void {
    if (this.refinement.running !== id || findProject()?.root !== root) return;
    this.refinement = { ...this.refinement, delivered: true };
  }

  /** The end of the job that refines `id`, once: then the Proposal is settled, and the next one starts. */
  private endRefinement(project: Project, id: string): void {
    if (this.refinement.running !== id) return;
    const delivered = this.refinement.delivered;
    this.refinement = { ...this.refinement, running: null, delivered: false };
    this.settleRefined(project, id, delivered);
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
      this.refinement = { ...this.refinement, waiting: [...this.refinement.waiting, id] };
    } else if (outcome === "approve") {
      try {
        this.approving(() => approveProposal(project, id, [configuredSkillsDir()]));
      } catch (err) {
        void vscode.window.showWarningMessage(`Trama: ${cardName(project, "proposal", id)} was refined but not approved: ${describeError(err)}.`);
      }
    } else if (outcome === "requeue") {
      this.refinement = { ...this.refinement, queued: this.orderQueue(project, [...this.refinement.queued, id]) };
    } else if (outcome === "keep") {
      void vscode.window.showWarningMessage(`Trama: ${cardName(project, "proposal", id)} was refined but not approved: ${reason}.`);
    }
  }

  /**
   * The Proposals that waited for a Run of this window are settled once that Run has ended, each as a refined Proposal that was delivered.
   * The list is emptied first, so the refreshes that approving makes do not settle them twice.
   */
  private releaseWaiting(project: Project): void {
    const waiting = this.refinement.waiting;
    this.refinement = { ...this.refinement, waiting: [] };
    for (const id of waiting) this.settleRefined(project, id, true);
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
      const drift = current.agent === PREPARED_QUESTION_AGENT ? { id: asked.id, title: getDrift(project, asked.id).title } : null;
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
      if (current.data.status !== "open") reason = `Proposal ${name} is ${current.data.status}`;
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
    const skill = proposal.data.kind === "import" ? "import" : proposal.data.kind === "setup" && modelIsEmpty(project) ? "setup" : "design";
    await this.launchAction(project, { kind: "rework", proposal: id, skill });
  }

  /** `feedback` is set only by Rework: the Drift's prepared question is never used and the instruction carries the feedback. */
  private async launchAction(project: Project, action: AgentAction | Extract<ResolvedAction, { kind: "rework" | "rework-resolution" | "refine" }>, answered?: { selected: string[]; text?: string }, feedback?: string): Promise<void> {
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
        const holding = feedback !== undefined ? resolutionHolding(project, action.drift) : null;
        if (holding) return `Resolve this Drift is unavailable: Drift ${cardName(project, "drift", drift.id)} is part of resolution ${cardName(project, "proposal", holding.id)}.`;
        const blocker = resolveDriftBlocker(project, driftWork(project.root), this.namedByResolution.has(action.drift), answered === undefined && feedback === undefined && this.preparedQuestionOf(project, action.drift) !== null);
        return blocker === null ? null : `Resolve this Drift is unavailable: ${blocker}.`;
      }
      if (action.kind === "unify-drifts") {
        const reasons = unifyDriftsBlockers(project, driftWork(project.root), driftsFinishing(project.root));
        return reasons.length === 0 ? null : `Unify Drifts is unavailable: ${reasons.join(". ")}.`;
      }
      if (action.kind === "refine") return this.refinementRefusal(project, action.proposal);
      if (action.kind === "scan" && configuredAdvisorScanner()) return "Scan is unavailable: the Advisor Scanner is on.";
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
      const rememberScan = resolved.kind === "scan" && resolved.feature === undefined
        ? (startedAt: number) => rememberDeliveredScan(project, startedAt)
        : undefined;
      const result = await launchAgent(project.root, instruction, terminalName(resolved, (kind, id) => cardName(project, kind, id)), announceProposal, canSend, resolved.kind === "implement" || resolved.kind === "implement-all" ? "run" : resolved.kind === "resolve-drifts" || resolved.kind === "rework-resolution" ? "resolve" : resolved.kind === "unify-drifts" ? "unify" : resolved.kind === "scan" ? "scan" : resolved.kind === "refine" ? "refine" : undefined, rememberScan, { filesDrifts: mayFileDrifts(resolved), severalTasks: resolved.kind === "implement-all", model, ...(resolved.kind === "implement" ? { task: resolved.task } : {}), ...extra });
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
      case "rework":
        await send(action, getProposal(project, action.proposal).title);
        return;
      case "refine": {
        const proposal = action.proposal;
        const result = await send(action, getProposal(project, proposal).title, undefined, undefined, undefined, { role: "analysis", onEnd: () => this.endRefinement(project, proposal) });
        if (!launched(result)) throw new TramaError("the agent did not start");
        return;
      }
      case "scan": {
        if (action.feature !== undefined && !loadModel(project).features.has(action.feature))
          throw new TramaError(`No Feature "${action.feature}" in the Model`);
        if (action.feature === undefined && !(await confirmScanSystem())) return;
        await send(action, { kind: "check", title: action.feature === undefined ? "Scanning System" : `Scanning Feature ${action.feature}` });
        return;
      }
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
        if (runs.length <= 1) {
          await send({ kind: "implement-all", group: only?.group }, undefined, undefined, undefined, only?.run);
          return;
        }
        const held = randomUUID();
        startHeldJob(project.root, "run", held);
        const launch = (planned: PlannedRun & { seats?: number }, onEnd: (abnormal?: string) => void) => this.launchSequenceRun(project, planned, onEnd);
        const finish = (abnormal?: string) => endHeldJob(project.root, held, abnormal);
        if (configuredParallelExecution()) runSequenceTogether(runs, configuredMaxParallelAgents(), launch, finish);
        else runSequence(runs, launch, finish);
        return;
      }
      case "import":
        await send(action, { kind: "work", title: "Importing from code" });
        return;
    }
  }
}
