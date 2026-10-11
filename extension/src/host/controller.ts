import { basename } from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import * as vscode from "vscode";
import { TramaError, UsageError } from "../../../src/core/errors";
import { sendCoordinatorMessage, type CoordinatorJson } from "../../../src/core/question-channel";
import { approveProposal, getProposal, listProposals, rejectProposal, type Proposal } from "../../../src/core/proposals";
import { resolveDriftsBlocker, runWindowBlocker } from "../../../src/core/resolution";
import { buildSnapshot } from "../../../src/core/snapshot";
import { loadModel, modelDir, projectAt, type Project, REQUIREMENTS_PREFIX, requirementsDir } from "../../../src/core/store";
import { namerOf } from "../../../src/core/card-names";
import { runBlocker } from "../../../src/core/design";
import { cardName, syncShortNumbers } from "../../../src/core/short-numbers";
import { blockedTasks, driftOptions, fixCodeRefusal, getDrift, getTask, listDrifts, listTasks, requireNotAttached, type Drift, type DriftOutcome } from "../../../src/core/work";
import type { AgentAction, ToHost, ToWebview } from "../protocol";
import { onAnnouncementsWithdrawn, synchronizeAnnouncementTitles } from "./announcements";
import { configuredSkillsDir, type DesignAnnouncement, type Instruction, type Launch, launchAgent, launched, settings } from "./agent";
import { onQuestionRoundChange, questionRoundOpen } from "./question-activity";
import { activeProjectJobs, autopilotFailedCase, autopilotReady, clearAutopilotFailure, driftAutopilotMode, driftAutopilotStatus, driftResolution, excludeAutopilotDrift, forgetSkippedDrifts, holdAutopilot, jobAbnormalEnd, lastFailedScan, observeAutopilotMode, onDriftResolutionChange, recordAutopilotFailure, resumeAutopilot, setCoordinatorAvailable, type DriftAutopilotMode } from "./drift-resolution";
import { webviewHtml } from "./html";
import { parseToHost } from "./messages";
import { resolveMarkdownFile } from "./paths";
import { findProject, initializeProject, NO_PROJECT_WARNING, updateSkills } from "./project";
import { type ApprovalOptions, applyApprovedProposal } from "./approval";
import type { QuestionSession } from "./question-session";
import type { EditorQuestions } from "./questions";
import { writeLastScan } from "../../../src/core/last-scan";
import { buildApprovalScanPrompt, buildAutomaticRunPrompt, buildPrompt, terminalName, type ResolvedAction } from "./prompts";

const DEBOUNCE_MS = 150;

export const describeError = (err: unknown): string =>
  err instanceof TramaError || err instanceof UsageError ? err.message : `Unexpected error: ${err instanceof Error ? err.message : String(err)}`;

/** Remembers the instant a System scan's instruction left Trama, so the Scan button's count restarts; a failed write keeps the previous instant and is reported. */
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

/** A Drift is fixed automatically only when its first Fix option exists and its Model elements still do; otherwise it stays for the developer. */
const automaticallyFixable = (project: Project, drift: Drift): boolean => driftOptions(drift).length > 0 && fixCodeRefusal(project, drift) === null;

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
}

/** Owns the single Trama panel, feeds it snapshots and carries out what the developer asks of it. */
export class Controller implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;
  private project: Project | undefined;
  private timer: NodeJS.Timeout | undefined;
  private disposed = false;
  private autoTicking = false;
  private collection: AutopilotCollection | undefined;
  private coordinatorSubscription: vscode.Disposable | undefined;
  private ownedCoordinatorRoot: string | undefined;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly questions?: QuestionSession,
    private readonly tramaFiles?: vscode.FileSystemWatcher,
    private readonly globalStorageUri?: vscode.Uri,
    private readonly coordinator?: EditorQuestions,
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
    this.create(findProject());
  }

  /** Creates the panel, or reveals it. Offers to initialize the workspace when there is no `.trama/`. */
  async open(): Promise<void> {
    this.questions?.restore();
    if (this.revealPanel()) return;
    let project = findProject();
    if (!project) {
      const choice = await vscode.window.showInformationMessage("This workspace has no Trama project yet.", "Initialize Project");
      if (choice === undefined) return;
      // Another open command may have initialized the project, or even opened the panel, while the offer waited.
      project = findProject() ?? (await initializeProject(this.globalStorageUri));
      if (!project) return;
    }
    // Another open command may have created the panel while the offer or the initialization waited for the developer.
    if (this.revealPanel()) return;
    this.create(project);
  }

  /** Brings the panel forward if there is one: there is at most one. */
  private revealPanel(): boolean {
    if (!this.panel) return false;
    this.panel.reveal();
    return true;
  }

  async init(): Promise<void> {
    if (this.globalStorageUri) await initializeProject(this.globalStorageUri);
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
    const project = this.project ?? findProject();
    if (!project) void vscode.window.showWarningMessage(NO_PROJECT_WARNING);
    return project;
  }

  settingsChanged(): void {
    this.refresh();
    void this.autopilotTick();
  }

  async autopilotTick(): Promise<void> {
    const project = this.projectNow();
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

  /** Resumes the delegation in the window that coordinates the project; any other window asks that one over the local channel. */
  private async resumeCoordinator(project: Project): Promise<void> {
    if (await this.coordinator?.isCoordinator(project.root) ?? false) {
      resumeAutopilot(project.root);
      await this.autopilotTick();
      return;
    }
    await sendCoordinatorMessage(project, { type: "resolve-drifts", root: project.root }).catch(() => undefined);
  }

  dispose(): void {
    this.disposed = true;
    this.coordinatorSubscription?.dispose();
    this.panel?.dispose();
    clearTimeout(this.timer);
  }

  private create(project: Project | undefined): void {
    const dist = vscode.Uri.joinPath(this.extensionUri, "dist");
    const title = this.projectTitle(project);
    const panel = vscode.window.createWebviewPanel("trama", title, vscode.ViewColumn.Active, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [dist],
    });
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
      this.panel = this.project = undefined;
      // The round stays open and the agent keeps waiting; the developer is offered a way back to it.
      this.questions?.panelClosed();
      if (!this.disposed && this.questions?.current()) this.offerReopen();
    });
    this.panel = panel;
    this.project = project;
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

  private projectNow(): Project | undefined {
    return (this.project ??= findProject());
  }

  private projectTitle(project = this.projectNow()): string {
    const fallback = basename(project?.root ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd());
    try {
      return project ? loadModel(project).system.name.trim() || fallback : fallback;
    } catch {
      return fallback;
    }
  }


  /** Posts a fresh snapshot; if the files cannot be read, posts the error and the view keeps its last snapshot. */
  private refresh(): void {
    const project = this.projectNow();
    if (!project) {
      if (this.panel) this.panel.title = this.projectTitle(undefined);
      return;
    }
    if (this.panel) this.panel.title = this.projectTitle(project);
    try {
      const window = driftResolution(project.root);
      synchronizeAnnouncementTitles(project);
      const snapshot = buildSnapshot(project);
      if (this.panel) this.panel.title = snapshot.system.name.trim() || this.projectTitle(project);
      const status = driftAutopilotStatus(project.root, driftAutopilotMode(settings().inspect<unknown>("driftAutoPilot")?.globalValue), this.coordinator?.currentWindowId(project.root));
      // A window that does not coordinate the project says why automatic resolution waits: the coordinator must resume it first.
      const autopilot = status.mode !== "disabled" && this.ownedCoordinatorRoot !== project.root && status.phase === "idle"
        ? { ...status, reason: "Automatic resolution waits for the project coordinator to resume" }
        : status;
      this.post({ type: "snapshot", snapshot, asking: questionRoundOpen(), resolve: { blocker: resolveDriftsBlocker(project, window), runReason: runWindowBlocker(window, settings().get<string>("submitWhileRunning", "disabled") === "enabled"), autopilot } });
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
          && this.authorizedCollectionTasks(project, collection, mode).includes(task as string);
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
      resumeAutopilot(root);
      void this.autopilotTick();
      return { coordinator: true, received: true };
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
      collection: collection?.id ?? null,
      proposal: collection?.proposal ?? null,
      drifts,
      tasks,
      authorized: resolutionJob || runJob,
    };
  }

  private mode(): DriftAutopilotMode {
    return driftAutopilotMode(settings().inspect<unknown>("driftAutoPilot")?.globalValue);
  }

  private eligibleDrifts(project: Project, mode: DriftAutopilotMode): string[] {
    const drifts = listDrifts(project);
    for (const drift of drifts)
      clearAutopilotFailure(project.root, drift.id, JSON.stringify({ data: drift.data, body: drift.body }));
    if (mode === "disabled" || listProposals(project).some((proposal) =>
      proposal.data.kind === "resolution" && (proposal.data.status === "draft" || proposal.data.status === "open"))) return [];
    return drifts
      .filter((drift) => drift.data.status === "open"
        && (!drift.data.critical || mode === "yolo")
        && automaticallyFixable(project, drift)
        && !autopilotFailedCase(project.root, drift.id))
      .map((drift) => drift.id);
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

  private authorizedCollectionTasks(project: Project, collection: AutopilotCollection, mode: DriftAutopilotMode): string[] {
    if (mode === "disabled" || collection.stage === "resolving") return [];
    const all = new Map(listTasks(project).map((task) => [task.id, task]));
    const eligibleDrifts = new Set(collection.drifts.filter((id) => {
      if (autopilotFailedCase(project.root, id)) return false;
      try {
        const drift = getDrift(project, id);
        const fix = drift.data.task;
        return drift.data.status === "resolved" && drift.data.resolution === "fix-code"
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
    return [...tasks];
  }
  private async coordinate(project: Project): Promise<void> {
    const root = project.root;
    const mode = this.mode();
    observeAutopilotMode(root, mode);
    if (mode === "disabled") {
      if (this.collection?.root === root) this.collection = undefined;
      return;
    }
    const owner = await this.coordinator?.isCoordinator(root) ?? false;
    if (!owner) {
      setCoordinatorAvailable(root, true);
      if (this.ownedCoordinatorRoot === root) {
        this.collection = undefined;
        this.ownedCoordinatorRoot = undefined;
      }
      return;
    }
    setCoordinatorAvailable(root, true);
    this.ownedCoordinatorRoot = root;
    if (this.collection && this.collection.root !== root) this.collection = undefined;
    if (this.collection) {
      await this.advanceCollection(project, this.collection);
      return;
    }
    if (activeProjectJobs(root).length > 0 || !autopilotReady(root)) return;
    if (driftAutopilotStatus(root, mode).phase === "suspended") return;
    const drifts = this.eligibleDrifts(project, mode);
    if (drifts.length > 0) await this.startAutomaticResolution(project, drifts);
  }

  private async startAutomaticResolution(project: Project, drifts: string[]): Promise<void> {
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
      fixTasks: new Map(),
      origins: new Map(),
    };
    this.collection = collection;
    const currentDrifts = () => this.authorizedCollectionDrifts(project, collection, this.mode());
    const canSend = () => this.ownedCoordinatorRoot === project.root
      && this.mode() !== "disabled"
      && activeProjectJobs(project.root).length === 0
      && currentDrifts().length > 0;
    const instruction = () => buildPrompt({ kind: "resolve-drifts", drifts: currentDrifts(), automaticCollection: collection.id });
    const launchedNow = await this.deliverAutomatic(project.root, canSend, (guarded) => launchAgent(project.root, instruction, "Drifts", "Resolve Drifts", true, guarded, "resolve", undefined, { id, origin: "automatic" }));
    // Not delivered: nothing ran, so the reservation is released. A refused start is taken again by the next check; a held one waits for the developer.
    if (!launchedNow && this.collection === collection) this.collection = undefined;
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
    if (refused) return false;
    holdAutopilot(root, this.mode());
    // The clipboard fallback has shown its own notice already.
    if (result !== "clipboard") void vscode.window.showWarningMessage("Trama: the automatic Drift step did not reach the agent, so it is paused. Resolve Drifts or start a scan to resume it.");
    return false;
  }

  private async advanceCollection(project: Project, collection: AutopilotCollection): Promise<void> {
    if (this.mode() === "disabled") { this.collection = undefined; return; }
    if (collection.stage === "resolving") {
      if (activeProjectJobs(project.root).some((job) => job.id === collection.resolutionJob) || collection.handovers.size > 0) return;
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
    }
    if (collection.stage === "authorized") await this.startAuthorizedRun(project, collection);
    else if (collection.stage === "running" && collection.runJob && !activeProjectJobs(project.root).some((job) => job.id === collection.runJob)) {
      const abnormal = jobAbnormalEnd(project.root, collection.runJob);
      if (abnormal !== undefined) this.failUnfinishedTasks(project, collection, `The Run ended abnormally (${abnormal})`);
      this.collection = undefined;
    }
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
    const driftIds = proposal.data.drifts.map((decision) => decision.drift);
    const invalid = this.invalidAutomaticDecisions(project, proposal, collection, this.mode());
    if (invalid === null || invalid.length > 0) {
      // Only the Drifts whose decision no longer applies fail; the open Proposal waits for the developer, and its valid Drifts are not failed.
      for (const drift of invalid ?? driftIds) this.failCase(project, collection.resolutionJob, drift, undefined, "Proposal no longer matches this automatic collection or its current authorization; it stays open for intervention");
      return;
    }
    try {
      let approved: Proposal & { resolved: DriftOutcome[] } | undefined;
      await this.approving(project, proposal.id, () => {
        if (this.mode() === "disabled" || !this.automaticProposalAllowed(project, getProposal(project, proposal.id), collection, this.mode()))
          throw new TramaError("Automatic authorization changed before approval");
        approved = approveProposal(project, proposal.id, [configuredSkillsDir()]);
      });
      if (!approved) throw new TramaError("Resolution Proposal approval produced no result");
      for (const outcome of approved.resolved) {
        if (outcome.decision !== "fix-code" || outcome.task === null) continue;
        collection.approvedDrifts.add(outcome.drift);
        collection.fixTasks.set(outcome.task, outcome.drift);
        const origin = getDrift(project, outcome.drift).data.origin;
        if (origin && listTasks(project).some((task) => task.id === origin && task.data.column !== "done"))
          collection.origins.set(origin, outcome.drift);
      }
    } catch (error) {
      const stale = this.invalidAutomaticDecisions(project, proposal, collection, this.mode()) ?? [];
      const message = describeError(error);
      // Only the Drifts the refusal names, or whose decision no longer applies, fail; the valid ones stay open in the Proposal for the developer.
      const named = driftIds.filter((drift) => new RegExp(`(?<![A-Za-z0-9])${cardName(project, "drift", drift)}(?![A-Za-z0-9])`).test(message));
      const failing = [...new Set([...stale, ...named])];
      for (const drift of failing.length > 0 ? failing : driftIds) this.failCase(project, collection.resolutionJob, drift, undefined, `${message}; the Proposal stays open for intervention`);
    }
  }

  private automaticProposalAllowed(project: Project, proposal: Proposal, collection: AutopilotCollection, mode: DriftAutopilotMode): boolean {
    const invalid = this.invalidAutomaticDecisions(project, proposal, collection, mode);
    return invalid !== null && invalid.length === 0;
  }

  /** The Drifts of an automatic resolution Proposal whose decision no longer applies; null when the Proposal itself no longer matches the collection. */
  private invalidAutomaticDecisions(project: Project, proposal: Proposal, collection: AutopilotCollection, mode: DriftAutopilotMode): string[] | null {
    const ids = proposal.data.drifts.map((decision) => decision.drift);
    if (mode === "disabled" || proposal.data.kind !== "resolution" || proposal.data.automatic !== true
      || proposal.data.status !== "open" || Object.keys(proposal.data.base).length > 0 || proposal.data.delete.length > 0
      || ids.length === 0 || new Set(ids).size !== ids.length
      || listProposals(project).some((other) => other.id !== proposal.id && other.data.kind === "resolution"
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
    if (mode === "disabled") { this.collection = undefined; return; }
    // Only Runs and resolutions block the automatic Run: a scan started after the collection goes to the next cycle.
    if (activeProjectJobs(project.root).some((job) => job.kind !== "scan") || driftAutopilotStatus(project.root, mode).phase === "suspended") return;
    const tasks = this.authorizedCollectionTasks(project, collection, mode);
    for (const drift of collection.approvedDrifts) {
      if (getDrift(project, drift).data.critical && mode !== "yolo")
        this.failCase(project, collection.resolutionJob, drift, undefined, "Critical Drift requires yolo authorization");
    }
    if (tasks.length === 0) { this.collection = undefined; return; }
    const states = runTasks(project);
    const runnable = new Set(states.filter((task) => tasks.includes(task.id) && task.column === "todo" && task.blockedBy.length === 0).map((task) => task.id));
    if (runnable.size === 0) {
      for (const id of tasks) {
        const state = states.find((task) => task.id === id);
        const reason = state?.blockedBy.length
          ? `Authorized Task is blocked by ${state.blockedBy.join(", ")}`
          : `Authorized Task is not runnable in the ${state?.column ?? "missing"} column`;
        this.failCase(project, collection.resolutionJob, undefined, id, reason);
      }
      this.collection = undefined;
      return;
    }
    const job = randomUUID();
    const canSend = () => this.ownedCoordinatorRoot === project.root
      && this.mode() !== "disabled"
      && !activeProjectJobs(project.root).some((job) => job.kind !== "scan")
      && driftAutopilotStatus(project.root, this.mode()).phase !== "suspended"
      && tasks.every((task) => this.authorizedCollectionTasks(project, collection, this.mode()).includes(task));
    collection.runJob = job;
    collection.stage = "running";
    const delivered = await this.deliverAutomatic(project.root, canSend, (guarded) => launchAgent(
      project.root,
      buildAutomaticRunPrompt(collection.id, tasks),
      "All tasks",
      undefined,
      true,
      guarded,
      "run",
      undefined,
      { id: job, origin: "automatic" },
    ));
    if (delivered) return;
    // Not delivered: nothing ran, so no Task records a failure. A refused start stays authorized for the next check; a held one waits for the developer.
    collection.runJob = undefined;
    collection.stage = "authorized";
  }

  /** Tasks of the collection that are not Done when its Run ends abnormally: each is excluded with the reason, the done ones stay done. */
  private failUnfinishedTasks(project: Project, collection: AutopilotCollection, reason: string): void {
    const done = new Set(listTasks(project).filter((task) => task.data.column === "done").map((task) => task.id));
    for (const task of [...collection.fixTasks.keys(), ...collection.origins.keys()]) {
      if (!done.has(task)) this.failCase(project, collection.resolutionJob, undefined, task, `${reason}; the Task was not done`);
    }
  }

  private failCollection(project: Project, collection: AutopilotCollection, reason: string): void {
    // A Drift that already carries its own reported failure, or was resolved by an approved Proposal of this collection, keeps that outcome.
    for (const drift of collection.drifts)
      if (!collection.approvedDrifts.has(drift) && !autopilotFailedCase(project.root, drift))
        this.failCase(project, collection.resolutionJob, drift, undefined, reason);
    if (this.collection === collection) this.collection = undefined;
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
    const parsed = parseToHost(raw);
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
    if (message.type === "ready") {
      this.refresh();
      if (this.questions) this.post({ type: "questions", round: this.questions.current() });
      return;
    }
    const project = this.projectNow();
    if (!project) return;
    switch (message.type) {
      case "launch":
        await this.launchAction(project, message.action, true);
        return;
      case "writeDesignRequest":
        await vscode.commands.executeCommand("trama.design");
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
        await this.approving(project, message.id, () => approveProposal(project, message.id, [configuredSkillsDir()]));
        return;
      case "rejectProposal": {
        requireNotAttached(project, message.id);
        const feedback = await vscode.window.showInputBox({
          title: `Reject Proposal ${cardName(project, "proposal", message.id)}`,
          prompt: "Feedback for the agent (optional): what should the next Proposal do differently? Press Enter to reject without feedback, Esc to cancel.",
          ignoreFocusOut: true,
        });
        if (feedback === undefined) return;
        requireNotAttached(project, message.id);
        rejectProposal(project, message.id, feedback);
        this.refresh();
        return;
      }
    }
  }

  private async openFile(path: string): Promise<void> {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(path));
    await vscode.window.showTextDocument(document, { viewColumn: vscode.ViewColumn.Beside, preview: false });
  }


  private approvalOptions(project: Project): ApprovalOptions {
    return {
      project,
      autoScan: settings().get<boolean>("autoScan", true),
      launchScan: async (proposal) => {
        const instruction = buildApprovalScanPrompt(proposal);
        const jobId = randomUUID();
        const origin = getProposal(project, proposal).data.automatic ? "automatic" : "manual";
        if (launched(await launchAgent(project.root, instruction, "Scan", undefined, true, () => true, "scan", undefined, { id: jobId, origin }))) return;
        void vscode.window.showInformationMessage(`Trama: Proposal ${cardName(project, "proposal", proposal)} was approved. Scan the Features it affects?`, "Scan now").then(async (choice) => {
          if (choice !== "Scan now") return;
          try {
            await launchAgent(project.root, instruction, "Scan", undefined, false, () => true, "scan", undefined, { id: jobId, origin: "manual" });
          } catch (err) {
            void vscode.window.showErrorMessage(`Trama: ${describeError(err)}`);
          }
        });
      },
      warn: (message) => void vscode.window.showWarningMessage(message),
    };
  }

  /**
   * An approval made outside the panel (`trama proposal approve`, `trama drift resolve --accept-proposal`) already
   * applied an ordinary Proposal that affects a Feature that still exists: start the same automatic scan as the panel.
   */
  async scanApproved(project: Project, proposalId: string): Promise<void> {
    const options = this.approvalOptions(project);
    this.refresh();
    if (!options.autoScan) return;
    await options.launchScan(proposalId);
  }

  /** Every path that approves a Proposal goes through here, always in the open folder; the view is refreshed before any agent is launched. */
  private async approving(project: Project, proposalId: string, apply: () => void): Promise<void> {
    await applyApprovedProposal(this.approvalOptions(project), proposalId, () => {
      apply();
      this.refresh();
    });
  }



  private async launchAction(project: Project, action: AgentAction, fromButton = false): Promise<void> {
    // Resolve Drifts and Runs are checked from current state at the request and at each delivery checkpoint.
    const refusal = (): string | null => {
      if (action.kind === "resolve-drifts") {
        const blocker = resolveDriftsBlocker(project, driftResolution(project.root));
        return blocker === null ? null : `Resolve Drifts is unavailable: ${blocker}.`;
      }
      const isRun = action.kind === "implement" || action.kind === "implement-design" || action.kind === "implement-all";
      const submitWhileRunning = settings().get<string>("submitWhileRunning", "disabled") === "enabled";
      const runBlock = isRun ? runWindowBlocker(driftResolution(project.root), submitWhileRunning) : null;
      if (runBlock !== null) return `A run cannot start: ${runBlock}.`;
      if (action.kind === "implement-all") {
        const blocker = runBlocker(runTasks(project), "all", namerOf(syncShortNumbers(project).all()));
        return blocker === null ? null : `Run all To do is unavailable: ${blocker}.`;
      }
      if (action.kind === "implement-design") {
        const proposal = getProposal(project, action.proposal).id;
        const blocker = runBlocker(runTasks(project).filter((t) => t.proposal === proposal), "design", namerOf(syncShortNumbers(project).all()));
        return blocker === null ? null : `Run this design is unavailable: ${blocker}.`;
      }
      return null;
    };
    const send = async (resolved: ResolvedAction, announceProposal?: DesignAnnouncement, instruction: Instruction = buildPrompt(resolved), checkSend: () => string | null = () => null) => {
      let refused: string | null = null;
      const canSend = () => (refused = refusal() ?? checkSend()) === null;
      const rememberScan = fromButton && resolved.kind === "scan" && resolved.feature === undefined
        ? (startedAt: number) => rememberDeliveredScan(project, startedAt)
        : undefined;
      const result = await launchAgent(project.root, instruction, terminalName(resolved, (kind, id) => cardName(project, kind, id)), announceProposal, false, canSend, resolved.kind === "implement" || resolved.kind === "implement-design" || resolved.kind === "implement-all" ? "run" : resolved.kind === "resolve-drifts" ? "resolve" : resolved.kind === "scan" ? "scan" : undefined, rememberScan);
      if (refused !== null) throw new TramaError(refused);
      return result;
    };
    const blocked = refusal();
    if (blocked !== null) throw new TramaError(blocked);
    switch (action.kind) {
      case "resolve-drifts": {
        const mode = this.mode();
        if (mode === "disabled") {
          const open = () => listDrifts(project).filter((d) => d.data.status === "open").map((d) => d.id);
          await send({ kind: "resolve-drifts", drifts: [] }, "Resolve Drifts", () => buildPrompt({ kind: "resolve-drifts", drifts: open() }));
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
          const result = await send(
            { kind: "resolve-drifts", drifts: [] },
            "Resolve Drifts",
            () => buildPrompt({ kind: "resolve-drifts", drifts: manual() }),
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
      case "design": {
        const request =
          action.prompt?.trim() ||
          (await vscode.window.showInputBox({
            title: "Quick Design Request",
            prompt: "What should the agent design or change in the Model?",
            placeHolder: "Add a cancelled state to orders…",
            ignoreFocusOut: true,
            validateInput: notBlank("Describe what to design"),
          }));
        if (request === undefined || request.trim() === "") return;
        await send({ kind: "design", prompt: request }, request.trim());
        return;
      }
      case "scan": {
        if (action.feature !== undefined && !loadModel(project).features.has(action.feature))
          throw new TramaError(`No Feature "${action.feature}" in the Model`);
        // Skipped Drifts become judgeable again only once the scan really started; a refused Feature or a fallback changes nothing.
        if (launched(await send(action))) {
          forgetSkippedDrifts(project.root);
          void sendCoordinatorMessage(project, { type: "developer-scan-started", root: project.root }).catch(() => undefined);
        }
        return;
      }
      case "implement":
        await send({ kind: "implement", task: getTask(project, action.task).id });
        return;
      case "implement-design": {
        const proposal = getProposal(project, action.proposal).id;
        await send({ kind: "implement-design", proposal });
        return;
      }
      case "implement-all": {
        await send(action);
        return;
      }
      case "import":
        await send(action);
        return;
    }
  }
}
