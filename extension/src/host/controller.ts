import { basename } from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import * as vscode from "vscode";
import { TramaError, UsageError } from "../../../src/core/errors";
import { editorWindowLost, sendCoordinatorMessage, type CoordinatorJson } from "../../../src/core/question-channel";
import { approveProposal, getProposal, listProposals, rejectProposal, type Proposal } from "../../../src/core/proposals";
import { resolveDriftBlocker, resolveDriftsBlocker, runWindowBlocker } from "../../../src/core/resolution";
import { buildSnapshot } from "../../../src/core/snapshot";
import { loadModel, modelDir, projectAt, type Project, REQUIREMENTS_PREFIX, requirementsDir } from "../../../src/core/store";
import { namerOf } from "../../../src/core/card-names";
import { runBlocker } from "../../../src/core/design";
import { concernSameThing } from "../../../src/core/blocking";
import { loadProject } from "../../../src/core/requirements";
import { cardName, syncShortNumbers } from "../../../src/core/short-numbers";
import { blockedTasks, dismissDrift, driftOptions, fixCodeRefusal, getDrift, getTask, listDrifts, listTasks, requireNotAttached, type Drift, type DriftOutcome } from "../../../src/core/work";
import type { AgentAction, ToHost, ToWebview } from "../protocol";
import { onAnnouncementsWithdrawn, synchronizeAnnouncementTitles } from "./announcements";
import { configuredAgent, configuredModels, configuredSkillsDir, type DesignAnnouncement, type Instruction, type LaunchAnnouncement, type Launch, endHeldJob, launchAgent, launched, settings, startHeldJob, userDelegation } from "./agent";
import { isCursor } from "./cursor";
import { onQuestionRoundChange, questionRoundOpen } from "./question-activity";
import { activeProjectJobs, autopilotFailedCase, autopilotReady, clearAutopilotFailure, driftAutopilotStatus, driftWork, driftsFinishing, excludeAutopilotDrift, forgetDeveloperScanCases, forgetWindow, holdAutopilot, jobAbnormalEnd, lastFailedScan, observeAutopilotMode, onDriftResolutionChange, projectWindowIds, proposalsFinishing, recordAutopilotFailure, releaseSend, reserveSend, resumeAutopilot, runCauseTask, runContinuationHeld, runFinalCheckFailed, sendReserved, setCoordinatorAvailable, shownAutopilotFailures, tasksFinishing, type DriftAutopilotMode, type JobKind } from "./drift-resolution";
import { webviewHtml } from "./html";
import { parseToHost } from "./messages";
import { appliedProposalModels, boardModels, chooseProposalModel, forgetProposalModels, proposalRunModel, type BoardModels, type ModelMemory } from "./proposal-models";
import type { RunModel } from "./terminal-agent";
import { planRuns, runSequence, type AppliedModel, type PlannedRun } from "./run-groups";
import { copilotSuggestions, cursorModels, ompModels, type ModelList } from "./model-lists";
import { DRIFT_KEY, planDelegationChange, planSettingChange, settingsSchema, settingTitle, type SettingPlan, type SettingSchema, type SettingsValues } from "./settings-schema";
import { resolveMarkdownFile } from "./paths";
import { findProject, initializeProject, type InitChoice, NO_PROJECT_WARNING, updateSkills } from "./project";
import type { QuestionSession } from "./question-session";
import type { DesignRequests } from "./design-requests";
import type { EditorQuestions } from "./questions";
import { writeLastScan } from "../../../src/core/last-scan";
import { buildAutomaticRunPrompt, buildPrompt, mayFileDrifts, runTerminalName, terminalName, type ResolvedAction } from "./prompts";

const DEBOUNCE_MS = 150;

/** The key under the `trama` section for a manifest key: `trama.driftAutoPilot` is read and written as `driftAutoPilot`. */
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

const QUESTIONS_WAITING = "Trama has questions from the agent waiting.";
const REOPEN = "Reopen";

const notBlank = (message: string) => (value: string) => (value.trim() === "" ? message : undefined);

/** A Drift is fixed automatically only when its first Fix option exists and its Model elements still do, and it is not recurring: a recurring Drift stays for the developer in every mode. */
const automaticallyFixable = (project: Project, drift: Drift): boolean => driftOptions(drift).length > 0 && drift.data.previous === null && fixCodeRefusal(project, drift) === null;

interface AutopilotCollection {
  root: string;
  id: string;
  drifts: string[];
  resolutionJob: string;
  proposal?: string;
  proposals: string[];
  approvedDrifts: Set<string>;
  handovers: Set<string>;
  stage: "resolving" | "authorized" | "running";
  fixTasks: Map<string, string>;
  origins: Map<string, string>;
  runJob?: string;
  /** The index in `runs` of the Run that runs now, or that starts next. */
  run: number;
  /** The Runs the authorized Tasks are cut into by model: the first plan at the first start; later authorized Tasks append Runs, the planned ones never change. */
  runs?: PlannedRun[];
  /** The held job that keeps the project in its state from this collection's start until its Run is created or it ends. */
  hold?: string;
}

/** Owns the single Trama panel, feeds it snapshots and carries out what the developer asks of it. */
export class Controller implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;
  private timer: NodeJS.Timeout | undefined;
  private disposed = false;
  private autoTicking = false;
  private collection: AutopilotCollection | undefined;
  /** The open Drifts the resolution launched from this window was asked to resolve; cleared once no resolution runs. */
  private readonly namedByResolution = new Set<string>();
  /** The one Drift a Resolve Drifts on a single Drift asked the automatic collection to take: consumed by the next start attempt, launched or refused, so a refused start never keeps the other Drifts out. */
  private namedAutomatic: { root: string; drift: string } | undefined;
  private coordinatorSubscription: vscode.Disposable | undefined;
  private ownedCoordinatorRoot: string | undefined;
  /** Projects whose other windows' jobs were imported since the autopilot last left `disabled`. */
  private readonly importedRoots = new Set<string>();
  /** The newest request for model suggestions: an answer that arrives after a newer request is dropped. */
  private suggestionsRequest = 0;
  /** The agent of `trama.agent` the suggestions were prepared for: a change of it prepares them again. */
  private suggestedAgent: string | undefined;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly questions?: QuestionSession,
    private readonly tramaFiles?: vscode.FileSystemWatcher,
    private readonly globalStorageUri?: vscode.Uri,
    private readonly coordinator?: EditorQuestions,
    private readonly designRequests?: DesignRequests,
    /** The workspace state, where the models chosen for Proposals are kept. */
    private readonly modelMemory?: ModelMemory,
  ) {
    this.coordinatorSubscription = coordinator?.onCoordinatorRequest((message) => this.coordinatorMessage(message));
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

  /** Creates the panel, or reveals it. Without `.trama/` the panel shows Get Started, and an open question round shows as well. */
  async open(): Promise<void> {
    if (!vscode.workspace.workspaceFolders?.length) {
      void vscode.window.showInformationMessage("Trama: open a folder to use Trama.");
      return;
    }
    this.questions?.restore();
    if (this.revealPanel()) return;
    this.create();
  }

  /** Brings the panel forward if there is one: there is at most one. */
  private revealPanel(): boolean {
    if (!this.panel) return false;
    this.panel.reveal();
    return true;
  }

  /** Get Started: sets the workspace up with the developer's choice, then starts what that choice starts. Failures are shown on the screen. */
  private async setUp(choice: InitChoice): Promise<void> {
    // Start from Scratch on the Diagram of an open project: the project is there already, so the setup request opens at once, with no folder to choose and nothing initialized.
    if (choice === "scratch" && findProject()) {
      await this.designRequests?.writeSetup();
      return;
    }
    this.post({ type: "setup", busy: true, error: null });
    try {
      const done = await initializeProject(choice, this.globalStorageUri);
      if (done) {
        this.refresh();
        if (done.choice === "import") await this.launchAction(done.project, { kind: "import" });
        else await this.designRequests?.writeSetup();
      }
      this.post({ type: "setup", busy: false, error: null });
    } catch (err) {
      this.post({ type: "setup", busy: false, error: describeError(err) });
    }
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
    this.refresh();
    this.postSettings();
    if (configuredAgent() !== this.suggestedAgent || (ompPathChanged && this.suggestedAgent === "omp")) void this.postModelSuggestions();
    void this.autopilotTick();
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

  /**
   * Sends the Settings tab the model names of the agent of `trama.agent`, for the three model roles, and the reason when omp gives
   * none. Only the newest request is sent: an answer that arrives after a newer request is dropped.
   */
  async postModelSuggestions(): Promise<void> {
    const request = ++this.suggestionsRequest;
    this.suggestedAgent = configuredAgent();
    const list = await this.modelList(this.suggestedAgent);
    if (request === this.suggestionsRequest) this.post({ type: "modelSuggestions", ...list });
  }

  private async modelList(agent: string): Promise<ModelList> {
    // `trama.ompPath` is application-scoped: only the user value counts; empty means `omp` from the editor's PATH.
    if (agent === "omp") return ompModels((settings().inspect<string>("ompPath")?.globalValue ?? "").trim());
    if (agent === "claude") return { models: [] };
    if (isCursor()) return { models: this.globalStorageUri === undefined ? [] : await cursorModels(this.globalStorageUri.fsPath) };
    try {
      return { models: copilotSuggestions(await vscode.lm.selectChatModels()) };
    } catch {
      return { models: [] };
    }
  }

  /**
   * Carries out a Settings plan. A refused plan saves nothing; a raised delegation asks first (cancelling saves nothing).
   * The Settings tab is sent again either way, so its controls show the values that really hold.
   */
  private async applyPlan(plan: SettingPlan): Promise<void> {
    if (!plan.ok) {
      this.postSettings();
      return;
    }
    if (plan.ask !== undefined) {
      const choice = await vscode.window.showWarningMessage(plan.ask.question, { modal: true, detail: plan.ask.detail }, "Enable");
      if (choice !== "Enable") {
        this.postSettings();
        return;
      }
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

  async autopilotTick(): Promise<void> {
    const project = findProject();
    if (!project || !this.coordinator || this.disposed || this.autoTicking) return;
    this.autoTicking = true;
    try {
      await this.coordinate(project);
    } catch (error) {
      setCoordinatorAvailable(project.root, false);
      this.post({ type: "error", message: `Drift autopilot: ${describeError(error)}` });
    } finally {
      this.autoTicking = false;
    }
  }

  /** Resumes the delegation in the window that coordinates the project; any other window asks that one over the local channel. A named Drift is the only one the collection it starts may take. */
  private async resumeCoordinator(project: Project, drift?: string): Promise<void> {
    if (await this.coordinator?.isCoordinator(project.root) ?? false) {
      if (drift !== undefined) this.namedAutomatic = { root: project.root, drift };
      resumeAutopilot(project.root);
      await this.autopilotTick();
      return;
    }
    await sendCoordinatorMessage(project, { type: "resolve-drifts", root: project.root, ...(drift === undefined ? {} : { drift }) }).catch(() => undefined);
  }

  dispose(): void {
    this.disposed = true;
    this.coordinatorSubscription?.dispose();
    this.panel?.dispose();
    if (this.collection) {
      try { this.abandonCollection(projectAt(this.collection.root), "The coordinator window closed during the Run"); }
      catch { this.setCollection(undefined); }
    }
    clearTimeout(this.timer);
  }

  private create(): void {
    const dist = vscode.Uri.joinPath(this.extensionUri, "dist");
    const title = this.projectTitle();
    const panel = vscode.window.createWebviewPanel("trama", title, vscode.ViewColumn.Active, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [dist],
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
      onQuestionRoundChange(() => this.refresh()),
      onDriftResolutionChange(() => this.refresh()),
      ...(this.questions ? [this.questions.onChange((round) => this.post({ type: "questions", round }))] : []),
    ];

    panel.onDidDispose(() => {
      for (const subscription of subscriptions) subscription.dispose();
      clearTimeout(this.timer);
      this.panel = undefined;
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

  private scheduleRefresh(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.refresh(), DEBOUNCE_MS);
  }

  private watchChanges(watcher: vscode.FileSystemWatcher): vscode.Disposable[] {
    const onChange = () => this.scheduleRefresh();
    return [watcher.onDidCreate(onChange), watcher.onDidChange(onChange), watcher.onDidDelete(onChange)];
  }


  private projectTitle(project = findProject()): string {
    const fallback = basename(project?.root ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd());
    try {
      return project ? loadModel(project).system.name.trim() || fallback : fallback;
    } catch {
      return fallback;
    }
  }


  /** Posts a fresh snapshot; if the files cannot be read, posts the error and the view keeps its last snapshot. */
  private refresh(): void {
    const project = findProject();
    this.post({ type: "project", present: project !== undefined });
    if (!project) {
      if (this.panel) this.panel.title = this.projectTitle(undefined);
      return;
    }
    if (this.panel) this.panel.title = this.projectTitle(project);
    try {
      if (this.modelMemory) forgetProposalModels(this.modelMemory, project).catch((err: unknown) => this.post({ type: "error", message: describeError(err) }));
      const work = driftWork(project.root, this.mode() !== "disabled");
      synchronizeAnnouncementTitles(project);
      const snapshot = buildSnapshot(project, driftsFinishing(project.root), proposalsFinishing(project.root), tasksFinishing(project.root));
      const models: BoardModels = this.modelMemory ? boardModels(this.modelMemory, snapshot.proposals, configuredAgent()) : { agent: configuredAgent(), proposals: {} };
      if (this.panel) this.panel.title = snapshot.system.name.trim() || this.projectTitle(project);
      const status = driftAutopilotStatus(project.root, this.mode(), this.coordinator?.currentWindowId(project.root));
      const failures = shownAutopilotFailures(status.failures, status.mode, (id) => {
        try { return getDrift(project, id).data.critical; } catch { return true; }
      });
      const shown = { ...status, failures };
      // A window that does not coordinate the project says why automatic resolution waits: the coordinator must resume it first.
      const autopilot = shown.mode !== "disabled" && this.ownedCoordinatorRoot !== project.root && shown.phase === "idle"
        ? { ...shown, reason: "Automatic resolution waits for the project coordinator to resume" }
        : shown;
      // The Drifts an agent was asked to resolve are forgotten once no resolution runs, so a later Resolve is not held by them.
      if (!work.resolving) this.namedByResolution.clear();
      const drifts = Object.fromEntries(listDrifts(project).filter((d) => d.data.status === "open").map((d) => [d.id, resolveDriftBlocker(project, work, this.namedByResolution.has(d.id))]));
      // The open Drifts the running resolution is working on: those an agent was asked to resolve, and those the automatic collection named.
      const collected = this.collection?.stage === "resolving" ? this.collection.drifts : [];
      const resolving = work.resolving ? Object.keys(drifts).filter((id) => this.namedByResolution.has(id) || collected.includes(id)) : [];
      this.post({ type: "snapshot", snapshot, asking: questionRoundOpen(), resolve: { blocker: resolveDriftsBlocker(project, work), runReason: runWindowBlocker(work, settings().get<boolean>("submitWhileRunning", false) === true), autopilot, drifts, resolving }, models });
    } catch (err) {
      this.post({ type: "error", message: describeError(err) });
    }
    void this.autopilotTick();
  }
  private async coordinatorMessage(message: Record<string, unknown>): Promise<CoordinatorJson | void> {
    const root = message["root"];
    if (typeof root !== "string") return;
    if (message["type"] === "proposal-draft") {
      if (this.collection?.root === root && message["job"] === this.collection.resolutionJob && typeof message["proposal"] === "string") {
        this.collection.proposal = message["proposal"];
        if (!this.collection.proposals.includes(message["proposal"])) this.collection.proposals.push(message["proposal"]);
      }
      this.refresh();
      return;
    }
    if (message["type"] === "proposal-submitted") {
      const collection = this.collection?.root === root ? this.collection : undefined;
      const id = message["proposal"];
      if (collection?.stage === "resolving" && typeof id === "string" && collection.proposals.includes(id)) {
        collection.handovers.add(id);
        try { await this.approveHandedOver(projectAt(root), collection, id); }
        finally { collection.handovers.delete(id); }
      }
      this.refresh();
      return;
    }
    if (message["type"] === "autopilot-failed") {
      if (!await this.coordinator?.isCoordinator(root)) return;
      setCoordinatorAvailable(root, true);
      const collection = this.collection?.root === root ? this.collection : undefined;
      const job = message["job"];
      const drift = message["drift"];
      const task = message["task"];
      const reason = message["reason"];
      if (!collection || typeof job !== "string" || typeof reason !== "string" || !reason.trim()
        || (typeof drift === "string") === (typeof task === "string")) return;
      const mode = this.mode();
      const project = projectAt(root);
      const authorized = typeof drift === "string"
        ? collection.stage === "resolving" && job === collection.resolutionJob
          && this.authorizedCollectionDrifts(project, collection, mode).includes(drift)
        : collection.stage === "running" && job === collection.runJob
          && (this.authorizedCollectionTasks(project, collection, mode).includes(task as string) || this.attributableTasks(project, collection).includes(task as string));
      if (!authorized) return;
      const failedDrift = typeof drift === "string" ? getDrift(project, drift) : undefined;
      const signature = failedDrift === undefined ? undefined : JSON.stringify({ data: failedDrift.data, body: failedDrift.body });
      recordAutopilotFailure(root, job, typeof drift === "string" ? drift : undefined, typeof task === "string" ? task : undefined, reason);
      if (typeof drift === "string" && signature !== undefined) excludeAutopilotDrift(root, drift, signature);
      void sendCoordinatorMessage(project, {
        type: "autopilot-failure-recorded", root, job,
        ...(typeof drift === "string" ? { drift, ...(signature === undefined ? {} : { signature }) } : { task: task as string }), reason,
      }).catch(() => undefined);
      this.refresh();
      return { coordinator: true, received: true };
    }
    if (message["type"] === "resolve-drifts") {
      if (!await this.coordinator?.isCoordinator(root)) return { coordinator: false, reason: "Project coordinator unavailable" };
      setCoordinatorAvailable(root, true);
      // A window that named one Drift asks for the collection of that Drift alone; it starts only if the Drift is still eligible.
      const named = message["drift"];
      if (typeof named === "string") this.namedAutomatic = { root, drift: named };
      resumeAutopilot(root);
      void this.autopilotTick();
      return { coordinator: true, received: true };
    }
    if (message["type"] === "reserve-send" || message["type"] === "release-send") {
      if (!await this.coordinator?.isCoordinator(root)) return { coordinator: false, reason: "Project coordinator unavailable" };
      const id = typeof message["id"] === "string" ? message["id"] : "";
      if (message["type"] === "release-send") {
        releaseSend(root, id);
        return { coordinator: true };
      }
      await this.forgetLostWindows(projectAt(root));
      return { coordinator: true, reserved: reserveSend(root, id, typeof message["windowId"] === "string" ? message["windowId"] : "") };
    }
    if (message["type"] !== "autopilot-status-request") return;
    const owner = await this.coordinator?.isCoordinator(root) ?? false;
    if (!owner) return { coordinator: false, reason: "Project coordinator unavailable" };
    setCoordinatorAvailable(root, true);
    const mode = this.mode();
    const collection = this.collection?.root === root ? this.collection : undefined;
    const job = typeof message["job"] === "string" ? message["job"] : undefined;
    const resolutionJob = collection?.stage === "resolving" && job === collection.resolutionJob;
    const runJob = collection?.stage === "running" && job === collection.runJob;
    let project: Project | undefined;
    try { project = projectAt(root); } catch { /* status can still be returned without scoped IDs */ }
    const drifts = project && resolutionJob ? this.authorizedCollectionDrifts(project, collection!, mode) : [];
    const tasks = project && runJob ? this.authorizedCollectionTasks(project, collection!, mode) : [];
    const status = driftAutopilotStatus(root, mode, this.coordinator?.currentWindowId(root));
    this.refresh();
    return {
      coordinator: true,
      mode,
      phase: collection?.stage === "running" ? "executing" : collection ? "preparing" : status.phase,
      reason: status.reason,
      ...(status.remoteWindow ? { remoteWindow: true } : {}),
      lastFailedScan: lastFailedScan(root),
      failures: shownAutopilotFailures(status.failures, mode, (id) => { try { return project !== undefined && getDrift(project, id).data.critical; } catch { return true; } }).map((failure) => failure.title),
      collection: collection?.id ?? null,
      proposal: collection?.proposal ?? null,
      drifts,
      tasks,
      authorized: resolutionJob || runJob,
    };
  }

  private mode(): DriftAutopilotMode {
    return userDelegation();
  }

  private eligibleDrifts(project: Project, mode: DriftAutopilotMode): string[] {
    const drifts = listDrifts(project);
    for (const drift of drifts)
      clearAutopilotFailure(project.root, drift.id, JSON.stringify({ data: drift.data, body: drift.body }));
    if (mode === "disabled" || listProposals(project).some((proposal) =>
      proposal.data.kind === "resolution" && (proposal.data.status === "draft" || proposal.data.status === "open"))) return [];
    const eligible = drifts
      .filter((drift) => drift.data.status === "open"
        && (!drift.data.critical || mode === "yolo")
        && automaticallyFixable(project, drift)
        && !autopilotFailedCase(project.root, drift.id))
      .map((drift) => drift.id);
    const named = this.namedAutomatic?.root === project.root ? this.namedAutomatic.drift : undefined;
    if (named === undefined) return eligible;
    // A named Drift that is no longer eligible ends its request: nothing starts for it and it does not hold the other Drifts.
    if (!eligible.includes(named)) {
      this.namedAutomatic = undefined;
      return [];
    }
    return [named];
  }

  private authorizedCollectionDrifts(project: Project, collection: AutopilotCollection, mode: DriftAutopilotMode): string[] {
    if (mode === "disabled" || collection.stage !== "resolving") return [];
    return collection.drifts.filter((id) => {
      try {
        const drift = getDrift(project, id);
        return drift.data.status === "open" && (!drift.data.critical || mode === "yolo")
          && automaticallyFixable(project, drift) && !autopilotFailedCase(project.root, id);
      } catch { return false; }
    });
  }

  /** The Tasks a failed final check may be attributed to: while the check failed and no Task is named yet, the collection's own. */
  private attributableTasks(project: Project, collection: AutopilotCollection): string[] {
    if (collection.runJob === undefined || !runFinalCheckFailed(project.root, collection.runJob) || runCauseTask(project.root, collection.runJob) !== undefined) return [];
    return [...collection.fixTasks.keys(), ...collection.origins.keys()];
  }

  private authorizedCollectionTasks(project: Project, collection: AutopilotCollection, mode: DriftAutopilotMode): string[] {
    if (mode === "disabled" || collection.stage === "resolving") return [];
    // A failed final check of this Run holds its continuation until a Task is named as its cause: no further Task is authorized meanwhile.
    if (collection.runJob && runContinuationHeld(project.root, collection.runJob)) return [];
    const all = new Map(listTasks(project).map((task) => [task.id, task]));
    const eligibleDrifts = new Set(collection.drifts.filter((id) => {
      if (autopilotFailedCase(project.root, id)) return false;
      try {
        const drift = getDrift(project, id);
        const fix = drift.data.task;
        // A fix Task closed without changes dismisses its Drift and keeps the Drift's Task: that is a success too, not a failure.
        const fixed = drift.data.resolution === "fix-code" || (drift.data.resolution === "dismissed" && drift.data.task !== null);
        return drift.data.status === "resolved" && fixed
          && (!drift.data.critical || mode === "yolo")
          && fix !== null && collection.fixTasks.get(fix) === id;
      } catch { return false; }
    }));
    const tasks = new Set<string>();
    for (const [task, drift] of collection.fixTasks) {
      const record = all.get(task);
      if (eligibleDrifts.has(drift) && record && record.data.column !== "done" && !autopilotFailedCase(project.root, task))
        tasks.add(task);
    }
    for (const [task, drift] of collection.origins) {
      const record = all.get(task);
      if (!eligibleDrifts.has(drift) || !record || record.data.column === "done" || autopilotFailedCase(project.root, task)) continue;
      const fixesPending = [...collection.fixTasks].some(([fix, fixDrift]) => fixDrift === drift && all.get(fix)?.data.column !== "done");
      if (!fixesPending) tasks.add(task);
    }
    // The Tasks that concern the Task which broke the final check stop with it.
    const causeRefs = collection.runJob === undefined ? undefined : all.get(runCauseTask(project.root, collection.runJob) ?? "")?.data.refs;
    if (causeRefs === undefined) return [...tasks];
    const model = loadProject(project);
    return [...tasks].filter((task) => !concernSameThing(model, all.get(task)?.data.refs ?? [], causeRefs));
  }
  /** Forgets the sends and jobs of editor windows that no longer answer: they can no longer end that work, so they must not block the project. */
  private async forgetLostWindows(project: Project): Promise<void> {
    const own = this.coordinator?.currentWindowId(project.root);
    for (const windowId of projectWindowIds(project.root)) {
      if (windowId !== own && await editorWindowLost(project, windowId)) forgetWindow(project.root, windowId);
    }
  }
  private async coordinate(project: Project): Promise<void> {
    const root = project.root;
    const mode = this.mode();
    observeAutopilotMode(root, mode);
    if (mode === "disabled") {
      // Under `disabled` the windows share no jobs: the next active mode imports them again.
      this.importedRoots.delete(root);
      this.withdrawCollection(project);
      return;
    }
    // An active autopilot forgets the sends and jobs of lost editors: a dead window must not block Resolve Drifts or a Run. Under `disabled` a window knows only its own work.
    await this.forgetLostWindows(project);
    const owner = await this.coordinator?.isCoordinator(root) ?? false;
    if (!owner) {
      setCoordinatorAvailable(root, true);
      if (this.ownedCoordinatorRoot === root) {
        this.abandonCollection(project, "The project coordinator lost its role during the Run");
        this.ownedCoordinatorRoot = undefined;
      }
      return;
    }
    setCoordinatorAvailable(root, true);
    this.ownedCoordinatorRoot = root;
    // Jobs other windows started while the autopilot was disabled reach this coordinator only when it asks: import them before the barrier is judged.
    if (!this.importedRoots.has(root) && await this.coordinator?.importJobs(root)) this.importedRoots.add(root);
    if (this.collection && this.collection.root !== root) this.setCollection(undefined);
    if (this.collection) {
      await this.advanceCollection(project, this.collection);
      return;
    }
    if (activeProjectJobs(root).length > 0 || !autopilotReady(root) || sendReserved(root)) return;
    if (driftAutopilotStatus(root, mode).phase === "suspended") return;
    const drifts = this.eligibleDrifts(project, mode);
    // A new automatic step is granted only after every live window has answered the jobs request; otherwise the status shows why it waits.
    if (drifts.length > 0 && await this.coordinator?.importJobs(root)) await this.startAutomaticResolution(project, drifts);
  }

  private async startAutomaticResolution(project: Project, drifts: string[]): Promise<boolean> {
    const id = randomUUID();
    const collection: AutopilotCollection = {
      root: project.root,
      id,
      drifts,
      resolutionJob: id,
      proposals: [],
      approvedDrifts: new Set(),
      handovers: new Set(),
      stage: "resolving",
      run: 0,
      fixTasks: new Map(),
      origins: new Map(),
    };
    this.setCollection(collection);
    this.holdCollection(collection, "resolve");
    const currentDrifts = () => this.authorizedCollectionDrifts(project, collection, this.mode());
    const canSend = () => this.ownedCoordinatorRoot === project.root
      && this.mode() !== "disabled"
      && activeProjectJobs(project.root).every((job) => job.id === collection.hold)
      && currentDrifts().length > 0;
    // The instruction is built only when it is really sent: the collection then keeps exactly the Drifts it names, so a Drift no longer eligible then is left out without failing.
    const instruction = () => {
      const named = currentDrifts();
      collection.drifts = named;
      return buildPrompt({ kind: "resolve-drifts", drifts: named, automaticCollection: collection.id });
    };
    const launchedNow = await this.deliverAutomatic(project.root, canSend, (guarded) => launchAgent(project.root, instruction, "Drifts", { kind: "resolve", drifts: () => collection.drifts }, guarded, "resolve", undefined, { id, origin: "automatic" }));
    // Not delivered: nothing ran, so the reservation is released. A refused start is taken again by the next check; a held one waits for the developer.
    if (!launchedNow && this.collection === collection) this.setCollection(undefined);
    // The named Drift has had its one start attempt, launched or refused: the next checks judge the Drifts as usual.
    if (this.namedAutomatic?.root === project.root) this.namedAutomatic = undefined;
    return launchedNow;
  }

  /**
   * Launches one automatic step and tells whether it reached an agent. A start refused at the last moment is left to the
   * next check; a start that reached no agent (chat fallback, failed launch) shows its notice once and holds the automatic
   * flow until a developer's Resolve Drifts or scan, or a mode change, lifts the hold.
   */
  private async deliverAutomatic(root: string, canSend: () => boolean, launch: (canSend: () => boolean) => Promise<Launch | undefined>): Promise<boolean> {
    let refused = false;
    const guarded = (): boolean => {
      const allowed = canSend();
      if (!allowed) refused = true;
      return allowed;
    };
    let result: Launch | undefined;
    try {
      result = await launch(guarded);
    } catch (error) {
      holdAutopilot(root, this.mode());
      this.post({ type: "error", message: `Drift autopilot: ${describeError(error)}` });
      return false;
    }
    if (launched(result)) return true;
    if (refused || result === undefined) return false;
    holdAutopilot(root, this.mode());
    // The clipboard fallback has shown its own notice already.
    if (result !== "clipboard") void vscode.window.showWarningMessage("Trama: the automatic Drift step did not reach the agent, so it is paused. Resolve Drifts or start a scan to resume it.");
    return false;
  }

  private async advanceCollection(project: Project, collection: AutopilotCollection): Promise<void> {
    if (this.mode() === "disabled") { this.withdrawCollection(project); return; }
    if (collection.stage === "resolving") {
      if (activeProjectJobs(project.root).some((job) => job.id === collection.resolutionJob) || collection.handovers.size > 0) return;
      // A resolution the developer approved by hand while the agent worked counts as the host's approval: its fix Tasks join the collection.
      for (const id of collection.proposals) {
        let approvedProposal: Proposal;
        try { approvedProposal = getProposal(project, id); } catch { continue; }
        if (approvedProposal.data.status === "approved") this.absorbApproved(project, collection, approvedProposal);
      }
      const abnormal = jobAbnormalEnd(project.root, collection.resolutionJob);
      if (abnormal !== undefined) {
        this.failCollection(project, collection, `The resolution agent ended abnormally (${abnormal}), so no Run starts`);
        return;
      }
      if (collection.proposals.length === 0) {
        this.failCollection(project, collection, "Resolution agent ended without binding an automatic Draft to this collection");
        return;
      }
      // Drifts of a Proposal left open for the developer, or rejected or discarded by the developer, are released: they wait for his decision and are neither failed nor run here.
      const released = new Set(listProposals(project)
        .filter((proposal) => collection.proposals.includes(proposal.id) && ["open", "rejected", "discarded"].includes(proposal.data.status))
        .flatMap((proposal) => proposal.data.drifts.map((decision) => decision.drift)));
      for (const id of collection.drifts) {
        if (!collection.approvedDrifts.has(id) && !autopilotFailedCase(project.root, id) && !released.has(id))
          this.failCase(project, collection.resolutionJob, id, undefined, "No authorized automatic fix decision was submitted for this Drift");
      }
      collection.stage = "authorized";
      this.holdCollection(collection, "run");
    }
    if (collection.stage === "running" && collection.runJob && !activeProjectJobs(project.root).some((job) => job.id === collection.runJob)) {
      const abnormal = jobAbnormalEnd(project.root, collection.runJob);
      const held = runContinuationHeld(project.root, collection.runJob);
      if (abnormal !== undefined) this.failUnfinishedTasks(project, collection, `The Run ended abnormally (${abnormal})`);
      else if (held) this.failUnfinishedTasks(project, collection, "The final check of the Run failed, so automatic continuation stopped");
      // A Run that ended normally hands over to the next one: the planned Runs left, then the authorized Tasks not planned yet (an origin whose fix Task has just become Done).
      // Any other end stops the sequence.
      if (abnormal !== undefined || held) {
        this.setCollection(undefined);
        return;
      }
      collection.run++;
      collection.runJob = undefined;
      collection.stage = "authorized";
    }
    if (collection.stage === "authorized") await this.startAuthorizedRun(project, collection);
  }

  /**
   * The resolution Proposal `id` was handed over during an automatic collection: it is approved at once, or it stays open
   * and its Drifts fail so the developer intervenes.
   */
  private async approveHandedOver(project: Project, collection: AutopilotCollection, id: string): Promise<void> {
    let proposal: Proposal;
    try { proposal = getProposal(project, id); }
    catch (error) {
      this.failCollection(project, collection, describeError(error));
      return;
    }
    // Approved by hand before this handover was read: its fix Tasks join the collection as the host's approval would.
    if (proposal.data.status === "approved") {
      this.absorbApproved(project, collection, proposal);
      return;
    }
    const driftIds = proposal.data.drifts.map((decision) => decision.drift);
    const invalid = this.invalidAutomaticDecisions(project, proposal, collection, this.mode());
    if (invalid === null || invalid.length > 0) {
      // Only the Drifts whose decision no longer applies fail; the open Proposal waits for the developer, and its valid Drifts are not failed.
      for (const drift of invalid ?? driftIds) this.failCase(project, collection.resolutionJob, drift, undefined, "Proposal no longer matches this automatic collection or its current authorization; it stays open for intervention");
      return;
    }
    try {
      let approved: Proposal & { resolved: DriftOutcome[] } | undefined;
      this.approving(() => {
        if (this.mode() === "disabled" || !this.automaticProposalAllowed(project, getProposal(project, proposal.id), collection, this.mode()))
          throw new TramaError("Automatic authorization changed before approval");
        approved = approveProposal(project, proposal.id, [configuredSkillsDir()]);
      });
      if (!approved) throw new TramaError("Resolution Proposal approval produced no result");
      this.absorbApproved(project, collection, approved);
    } catch (error) {
      const stale = this.invalidAutomaticDecisions(project, proposal, collection, this.mode()) ?? [];
      const message = describeError(error);
      // Only the Drifts the refusal names, or whose decision no longer applies, fail; the valid ones stay open in the Proposal for the developer.
      const named = driftIds.filter((drift) => new RegExp(`(?<![A-Za-z0-9])${cardName(project, "drift", drift)}(?![A-Za-z0-9])`).test(message));
      const failing = [...new Set([...stale, ...named])];
      for (const drift of failing.length > 0 ? failing : driftIds) this.failCase(project, collection.resolutionJob, drift, undefined, `${message}; the Proposal stays open for intervention`);
    }
  }

  /**
   * Records the fix Tasks an approved resolution of this collection created, whoever approved it: the host or the developer.
   * A Drift recorded in `approvedDrifts` keeps its outcome, so the end-of-agent check and a failed collection leave it alone.
   */
  private absorbApproved(project: Project, collection: AutopilotCollection, proposal: Proposal): void {
    for (const { drift: id, decision } of proposal.data.drifts) {
      if (decision !== "fix-code") continue;
      let drift: Drift;
      try { drift = getDrift(project, id); } catch { continue; }
      // A Drift a Proposal skipped as already resolved, or that another Proposal resolved, does not belong to this approval.
      if (drift.data.resolvedBy !== proposal.id || drift.data.task === null) continue;
      collection.approvedDrifts.add(id);
      collection.fixTasks.set(drift.data.task, id);
      const origin = drift.data.origin;
      if (origin && listTasks(project).some((task) => task.id === origin && task.data.column !== "done"))
        collection.origins.set(origin, id);
    }
  }

  private automaticProposalAllowed(project: Project, proposal: Proposal, collection: AutopilotCollection, mode: DriftAutopilotMode): boolean {
    const invalid = this.invalidAutomaticDecisions(project, proposal, collection, mode);
    return invalid !== null && invalid.length === 0;
  }

  /**
   * The Drifts of an automatic resolution Proposal whose decision no longer applies; null when the Proposal itself no longer
   * matches the collection. Other Drafts or open resolutions of this collection do not count: a chain is approved one by one.
   */
  private invalidAutomaticDecisions(project: Project, proposal: Proposal, collection: AutopilotCollection, mode: DriftAutopilotMode): string[] | null {
    const ids = proposal.data.drifts.map((decision) => decision.drift);
    if (mode === "disabled" || proposal.data.kind !== "resolution" || proposal.data.automatic !== true
      || proposal.data.status !== "open" || Object.keys(proposal.data.base).length > 0 || proposal.data.delete.length > 0
      || ids.length === 0 || new Set(ids).size !== ids.length
      || listProposals(project).some((other) => other.id !== proposal.id && !collection.proposals.includes(other.id) && other.data.kind === "resolution"
        && (other.data.status === "draft" || other.data.status === "open"))) return null;
    return proposal.data.drifts
      .filter((decision) => {
        if (!collection.drifts.includes(decision.drift) || collection.approvedDrifts.has(decision.drift)
          || decision.decision !== "fix-code" || decision.option !== 1 || decision.note !== undefined) return true;
        try {
          const drift = getDrift(project, decision.drift);
          return drift.data.status !== "open" || (drift.data.critical && mode !== "yolo")
            || driftOptions(drift).length === 0 || autopilotFailedCase(project.root, drift.id);
        } catch { return true; }
      })
      .map((decision) => decision.drift);
  }

  private async startAuthorizedRun(project: Project, collection: AutopilotCollection): Promise<void> {
    const mode = this.mode();
    if (mode === "disabled") { this.withdrawCollection(project); return; }
    // Only Runs and resolutions block the automatic Run: a scan started after the collection goes to the next cycle.
    if (activeProjectJobs(project.root).some((job) => job.kind !== "scan" && job.id !== collection.hold) || driftAutopilotStatus(project.root, mode).phase === "suspended") return;
    const authorized = this.authorizedCollectionTasks(project, collection, mode);
    if (authorized.length === 0) { this.setCollection(undefined); return; }
    // The Runs are cut by model at the first start, from the authorized Tasks runnable then. Later authorized Tasks join new Runs at the end, and the planned Runs do not change.
    if (collection.runs === undefined) {
      collection.runs = this.plannedRuns(project, authorized);
      if (collection.runs.length === 0) {
        this.failNotRunnable(project, collection, authorized);
        this.setCollection(undefined);
        return;
      }
    } else {
      this.planLaterRuns(project, collection, authorized);
    }
    const next = this.nextAuthorizedRun(project, collection, authorized);
    if (next === undefined) { this.setCollection(undefined); return; }
    if (!await this.coordinator?.importJobs(project.root)) return;
    const job = randomUUID();
    const canSend = () => this.ownedCoordinatorRoot === project.root
      && this.mode() !== "disabled"
      && !activeProjectJobs(project.root).some((job) => job.kind !== "scan" && job.id !== collection.hold)
      && driftAutopilotStatus(project.root, this.mode()).phase !== "suspended"
      && next.tasks.every((task) => this.authorizedCollectionTasks(project, collection, this.mode()).includes(task));
    collection.runJob = job;
    collection.stage = "running";
    const delivered = await this.deliverAutomatic(project.root, canSend, (guarded) => launchAgent(
      project.root,
      buildAutomaticRunPrompt(collection.id, next.tasks),
      runTerminalName(next.planned.group.model),
      undefined,
      guarded,
      "run",
      undefined,
      { id: job, origin: "automatic", filesDrifts: true, model: next.planned.run },
    ));
    if (delivered) {
      // The hold keeps the project between the Runs of the sequence; the creation of its last Run releases it, as before.
      if (next.last) this.releaseHold(collection);
      return;
    }
    // Not delivered: nothing ran, so no Task records a failure. A refused start stays authorized for the next check; a held one waits for the developer.
    collection.runJob = undefined;
    collection.stage = "authorized";
  }

  /**
   * Appends the Runs of the authorized Tasks that no planned Run holds yet, cut by model as the first plan was. The planned
   * Runs do not change; an authorized Task that is not runnable now is left in its column, with its reason on the Board.
   */
  private planLaterRuns(project: Project, collection: AutopilotCollection, authorized: string[]): void {
    const planned = new Set((collection.runs ?? []).flatMap((run) => run.tasks));
    const fresh = authorized.filter((id) => !planned.has(id));
    if (fresh.length === 0) return;
    const runs = this.plannedRuns(project, fresh);
    if (runs.length === 0) return;
    collection.runs = [...(collection.runs ?? []), ...runs];
    if (collection.hold === undefined) this.holdCollection(collection, "run");
  }

  /** The Run the collection starts next: the first Run of its plan, from `collection.run`, with a runnable authorized Task. The Runs before it are passed over, their authorized Tasks failing as not runnable. */
  private nextAuthorizedRun(project: Project, collection: AutopilotCollection, authorized: string[]): { planned: PlannedRun; tasks: string[]; last: boolean } | undefined {
    const runs = collection.runs ?? [];
    const runnable = new Set(runTasks(project).filter((task) => task.column === "todo" && task.blockedBy.length === 0).map((task) => task.id));
    for (; collection.run < runs.length; collection.run++) {
      const planned = runs[collection.run];
      if (planned === undefined) break;
      const named = planned.tasks.filter((id) => authorized.includes(id));
      const tasks = named.filter((id) => runnable.has(id));
      if (tasks.length > 0) return { planned, tasks, last: collection.run + 1 >= runs.length };
      this.failNotRunnable(project, collection, named);
    }
    return undefined;
  }

  /** Records each of `ids` as failed because it is not runnable: blocked, or not in To do. */
  private failNotRunnable(project: Project, collection: AutopilotCollection, ids: string[]): void {
    const states = runTasks(project);
    for (const id of ids) {
      const state = states.find((task) => task.id === id);
      const reason = state?.blockedBy.length
        ? `Authorized Task is blocked by ${state.blockedBy.join(", ")}`
        : `Authorized Task is not runnable in the ${state?.column ?? "missing"} column`;
      this.failCase(project, collection.resolutionJob, undefined, id, reason);
    }
  }

  /** The Runs the Tasks cut into by their effective model, among `only` when given: the runnable ones, in creation order. */
  private plannedRuns(project: Project, only?: readonly string[]): PlannedRun[] {
    const runnable = runTasks(project).filter((task) => task.column === "todo" && task.blockedBy.length === 0 && !task.agent && (only === undefined || only.includes(task.id)));
    return planRuns(runnable.map((task) => ({ id: task.id, proposal: task.proposal })), this.appliedModels(project), configuredModels().execution);
  }

  /** The Proposals whose model applies to the agent of `trama.agent` now, read at the launch. */
  private appliedModels(project: Project): AppliedModel[] {
    return this.modelMemory ? appliedProposalModels(this.modelMemory, project, configuredAgent()) : [];
  }

  /**
   * Starts one Run of a manual sequence, `Run all` cut by model. Its `onEnd` hears how the Run ends. The Run is not refused
   * here for the held sequence it belongs to, so the window and the Run-all checks are not applied to it again.
   */
  private async launchSequenceRun(project: Project, planned: PlannedRun, onEnd: (abnormal?: string) => void): Promise<boolean> {
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
        { filesDrifts: true, model: planned.run, onEnd },
      );
      return launched(result);
    } catch (error) {
      this.post({ type: "error", message: describeError(error) });
      return false;
    }
  }

  /** Tasks of the collection that are not Done when its Run ends abnormally: each is excluded with the reason, the done ones stay done. */
  private failUnfinishedTasks(project: Project, collection: AutopilotCollection, reason: string): void {
    const done = new Set(listTasks(project).filter((task) => task.data.column === "done").map((task) => task.id));
    for (const task of [...collection.fixTasks.keys(), ...collection.origins.keys()]) {
      if (!done.has(task)) this.failCase(project, collection.resolutionJob, undefined, task, `${reason}; the Task was not done`);
    }
  }

  /** Ends the collection early: its unfinished Tasks keep the reason, so the Board shows why they wait. */
  private abandonCollection(project: Project, reason: string): void {
    const collection = this.collection;
    if (!collection || collection.root !== project.root) return;
    this.failUnfinishedTasks(project, collection, reason);
    this.setCollection(undefined);
  }

  /** Withdrawing the delegation stops only new automatic steps: unstarted Tasks stay in their column without a failure, and a started one ends normally. */
  private withdrawCollection(project: Project): void {
    if (this.collection?.root === project.root) this.setCollection(undefined);
  }

  /** Replaces the collection of this window; the hold of the one it replaces is released. */
  private setCollection(next: AutopilotCollection | undefined): void {
    const previous = this.collection;
    this.collection = next;
    if (previous !== undefined && previous !== next) this.releaseHold(previous);
  }

  /**
   * Holds the project for the collection from its start until its Run is created or it ends: a held job of `kind`, `resolve`
   * while the resolution is prepared and its agent works, `run` from its hand-over. The new hold starts before the old one
   * ends, so the project is never free in between. The other windows see the hold.
   */
  private holdCollection(collection: AutopilotCollection, kind: JobKind): void {
    const previous = collection.hold;
    const id = randomUUID();
    collection.hold = id;
    startHeldJob(collection.root, kind, "automatic", this.coordinator?.currentWindowId(collection.root) ?? "", id);
    if (previous !== undefined) endHeldJob(collection.root, previous);
  }

  /** Lets go of the hold of the collection, if it has one. */
  private releaseHold(collection: AutopilotCollection): void {
    if (collection.hold === undefined) return;
    endHeldJob(collection.root, collection.hold);
    collection.hold = undefined;
  }

  private failCollection(project: Project, collection: AutopilotCollection, reason: string): void {
    // A Drift that already carries its own reported failure, or was resolved by an approved Proposal of this collection, keeps that outcome.
    for (const drift of collection.drifts)
      if (!collection.approvedDrifts.has(drift) && !autopilotFailedCase(project.root, drift))
        this.failCase(project, collection.resolutionJob, drift, undefined, reason);
    if (this.collection === collection) this.setCollection(undefined);
  }

  private failCase(project: Project, job: string, drift: string | undefined, task: string | undefined, reason: string): void {
    recordAutopilotFailure(project.root, job, drift, task, reason);
    let signature: string | undefined;
    if (drift !== undefined) {
      try {
        const record = getDrift(project, drift);
        signature = JSON.stringify({ data: record.data, body: record.body });
        excludeAutopilotDrift(project.root, drift, signature);
      } catch { /* The failure remains reportable and can be cleared by a scan or explicit request. */ }
    }
    void sendCoordinatorMessage(project, {
      type: "autopilot-failure-recorded", root: project.root, job,
      ...(drift ? { drift, ...(signature === undefined ? {} : { signature }) } : {}),
      ...(task ? { task } : {}), reason,
    }).catch(() => undefined);
  }


  private async handle(raw: unknown): Promise<void> {
    const parsed = parseToHost(raw, this.manifestSettings());
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
      this.questions?.act(message.round, message.action);
      return;
    }
    if (message.type === "modelSuggestionsWanted") {
      await this.postModelSuggestions();
      return;
    }
    if (message.type === "ready") {
      this.refresh();
      this.postSettings();
      if (this.questions) this.post({ type: "questions", round: this.questions.current() });
      return;
    }
    if (message.type === "initialize") {
      await this.setUp(message.choice);
      return;
    }
    if (message.type === "setSetting") {
      await this.applyPlan(planSettingChange(this.manifestSettings(), message.key, message.value));
      return;
    }
    if (message.type === "setDelegation") {
      await this.applyPlan(planDelegationChange(settings().inspect<unknown>(sectionKey(DRIFT_KEY))?.globalValue, message.mode));
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
      case "approveProposal":
        requireNotAttached(project, message.id);
        if (this.refuseWhileFinishing(project, message.id, "Approve")) return;
        this.approving(() => approveProposal(project, message.id, [configuredSkillsDir()]));
        return;
      case "setProposalModel": {
        if (!this.modelMemory) throw new TramaError("Trama cannot keep the model of a Proposal: the workspace state is not available.");
        await chooseProposalModel(this.modelMemory, project, message.proposal, message.model, configuredAgent());
        this.refresh();
        return;
      }
      case "rejectProposal": {
        requireNotAttached(project, message.id);
        if (this.refuseWhileFinishing(project, message.id, "Reject")) return;
        const feedback = await vscode.window.showInputBox({
          title: `Reject Proposal ${cardName(project, "proposal", message.id)}`,
          prompt: "Feedback for the agent (optional): what should the next Proposal do differently? Press Enter to reject without feedback, Esc to cancel.",
          ignoreFocusOut: true,
        });
        if (feedback === undefined) return;
        requireNotAttached(project, message.id);
        if (this.refuseWhileFinishing(project, message.id, "Reject")) return;
        rejectProposal(project, message.id, feedback);
        this.refresh();
        return;
      }
      case "dismissDrift":
        await this.dismissDriftAfterConfirm(project, message.id);
        return;
    }
  }

  /** Approve and Reject wait for the end of the turn of the agent that delivered the Proposal: while that turn is held the action is refused, and a message says why. Returns true when refused. */
  private refuseWhileFinishing(project: Project, id: string, action: "Approve" | "Reject"): boolean {
    if (!proposalsFinishing(project.root).includes(id)) return false;
    void vscode.window.showErrorMessage(`Trama: ${action} Proposal is unavailable: the agent is still finishing.`);
    return true;
  }

  /** «Dismiss Drift»: the host asks for the developer's confirmation in a modal dialog; cancelling changes nothing. Closing the Drift is `dismissDrift` in `src/core`, which rechecks its conditions and refuses without changing anything. */
  private async dismissDriftAfterConfirm(project: Project, id: string): Promise<void> {
    if (driftWork(project.root, this.mode() !== "disabled").resolving) {
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

  /** The model a run takes from the Proposal of Task `task` (null: none) in place of its role, read at the launch: none unless that model was chosen for `trama.agent` now. */
  private runModelOfTask(project: Project, task: string | null): RunModel | undefined {
    if (!this.modelMemory || task === null) return undefined;
    return proposalRunModel(this.modelMemory, project, getTask(project, task).data.proposal, configuredAgent());
  }

  private async launchAction(project: Project, action: AgentAction): Promise<void> {
    // Resolve Drifts and Runs are checked from current state at the request and at each delivery checkpoint.
    const refusal = (): string | null => {
      if (action.kind === "resolve-drifts" && action.drift !== undefined && driftsFinishing(project.root).includes(action.drift)) return "Resolve this Drift is unavailable: the agent is still finishing.";
      if (action.kind === "implement" && tasksFinishing(project.root).includes(action.task)) return "Run this Task is unavailable: the agent is still finishing.";
      if (action.kind === "resolve-drifts" && action.drift !== undefined) {
        const drift = getDrift(project, action.drift);
        if (drift.data.status !== "open") return `Resolve this Drift is unavailable: Drift ${cardName(project, "drift", drift.id)} is ${drift.data.status}`;
        const blocker = resolveDriftBlocker(project, driftWork(project.root, this.mode() !== "disabled"), this.namedByResolution.has(action.drift));
        return blocker === null ? null : `Resolve this Drift is unavailable: ${blocker}.`;
      }
      if (action.kind === "resolve-drifts") {
        const blocker = resolveDriftsBlocker(project, driftWork(project.root, this.mode() !== "disabled"));
        return blocker === null ? null : `Resolve Drifts is unavailable: ${blocker}.`;
      }
      const isRun = action.kind === "implement" || action.kind === "implement-all";
      const submitWhileRunning = settings().get<boolean>("submitWhileRunning", false) === true;
      const runBlock = isRun ? runWindowBlocker(driftWork(project.root, this.mode() !== "disabled"), submitWhileRunning) : null;
      if (runBlock !== null) return `A run cannot start: ${runBlock}.`;
      if (action.kind === "implement-all") {
        const blocker = runBlocker(runTasks(project), namerOf(syncShortNumbers(project).all()));
        return blocker === null ? null : `Run all is unavailable: ${blocker}.`;
      }
      return null;
    };
    const send = async (resolved: ResolvedAction, announceProposal?: DesignAnnouncement | LaunchAnnouncement, instruction: Instruction = buildPrompt(resolved), checkSend: () => string | null = () => null, model?: RunModel) => {
      let refused: string | null = null;
      const canSend = () => (refused = refusal() ?? checkSend()) === null;
      const rememberScan = resolved.kind === "scan" && resolved.feature === undefined
        ? (startedAt: number) => rememberDeliveredScan(project, startedAt)
        : undefined;
      const result = await launchAgent(project.root, instruction, terminalName(resolved, (kind, id) => cardName(project, kind, id)), announceProposal, canSend, resolved.kind === "implement" || resolved.kind === "implement-all" ? "run" : resolved.kind === "resolve-drifts" ? "resolve" : resolved.kind === "scan" ? "scan" : undefined, rememberScan, { filesDrifts: mayFileDrifts(resolved), model });
      if (refused !== null) throw new TramaError(refused);
      return result;
    };
    const blocked = refusal();
    if (blocked !== null) throw new TramaError(blocked);
    switch (action.kind) {
      case "resolve-drifts": {
        const mode = this.mode();
        if (action.drift !== undefined) {
          // Under delegation an automatic-eligible Drift goes through the automatic collection, which names only this Drift.
          const drift = action.drift;
          const eligible = mode !== "disabled" && (mode === "yolo" || !getDrift(project, drift).data.critical) && automaticallyFixable(project, getDrift(project, drift)) && !autopilotFailedCase(project.root, drift);
          if (eligible) {
            // Only the coordinator starts an automatic collection: a window that does not coordinate forwards this one Drift, and the collection it starts names only that Drift.
            if (this.ownedCoordinatorRoot !== project.root) {
              await this.resumeCoordinator(project, drift);
              this.refresh();
              return;
            }
            this.namedByResolution.add(drift);
            // Like every automatic step, the named Drift starts only when the coordinator's checks pass: other windows' jobs, a lost coordinator and reserved sends hold it, and the status shows why.
            await this.resumeCoordinator(project, drift);
            this.refresh();
            return;
          }
          const result = await send({ kind: "resolve-drifts", drifts: [] }, { kind: "resolve", drifts: () => [drift] }, () => buildPrompt({ kind: "resolve-drifts", drifts: [drift], scoped: true }), undefined, this.runModelOfTask(project, getDrift(project, drift).data.origin));
          if (launched(result)) {
            this.namedByResolution.add(drift);
            await this.resumeCoordinator(project);
          }
          return;
        }
        this.namedAutomatic = undefined;
        if (mode === "disabled") {
          const open = () => listDrifts(project).filter((d) => d.data.status === "open").map((d) => d.id);
          const ids = open();
          const result = await send({ kind: "resolve-drifts", drifts: [] }, { kind: "resolve", drifts: () => ids }, () => buildPrompt({ kind: "resolve-drifts", drifts: ids }));
          if (launched(result)) for (const id of ids) this.namedByResolution.add(id);
          return;
        }
        const split = () => {
          const open = listDrifts(project).filter((d) => d.data.status === "open");
          const automatic = open.filter((drift) => (mode === "yolo" || !drift.data.critical) && automaticallyFixable(project, drift) && !autopilotFailedCase(project.root, drift.id));
          const ids = new Set(automatic.map((drift) => drift.id));
          return { automatic, manual: open.filter((drift) => !ids.has(drift.id)) };
        };
        const initial = split();
        if (initial.manual.length) {
          const manual = () => split().manual.map((drift) => drift.id);
          let named: string[] = [];
          const result = await send(
            { kind: "resolve-drifts", drifts: [] },
            { kind: "resolve", drifts: () => named },
            () => {
              named = manual();
              return buildPrompt({ kind: "resolve-drifts", drifts: named });
            },
            () => manual().length ? null : "No manual Drifts remain; automatic resolution is waiting for the project coordinator.",
          );
          // The automatic part waits until the manual instruction really started, so it cannot run ahead of the manual decisions.
          if (launched(result)) await this.resumeCoordinator(project);
          return;
        }
        if (initial.automatic.length) {
          await this.resumeCoordinator(project);
          this.refresh();
          return;
        }
        void vscode.window.showInformationMessage("Trama: No open Drifts are eligible for automatic resolution.");
        return;
      }
      case "scan": {
        if (action.feature !== undefined && !loadModel(project).features.has(action.feature))
          throw new TramaError(`No Feature "${action.feature}" in the Model`);
        // Failed and skipped cases become judgeable again only once the scan really started; a refused Feature or a fallback changes nothing.
        if (launched(await send(action, { kind: "check", title: action.feature === undefined ? "Scanning System" : `Scanning Feature ${action.feature}` }))) {
          forgetDeveloperScanCases(project.root);
          void sendCoordinatorMessage(project, { type: "developer-scan-started", root: project.root }).catch(() => undefined);
        }
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
        if (runs.length <= 1) {
          await send({ kind: "implement-all", group: only?.group }, undefined, undefined, undefined, only?.run);
          return;
        }
        const held = randomUUID();
        startHeldJob(project.root, "run", "manual", this.coordinator?.currentWindowId(project.root) ?? "", held);
        runSequence(runs, (planned, onEnd) => this.launchSequenceRun(project, planned, onEnd), (abnormal) => endHeldJob(project.root, held, abnormal));
        return;
      }
      case "import":
        await send(action, { kind: "work", title: "Importing from code" });
        return;
    }
  }
}
