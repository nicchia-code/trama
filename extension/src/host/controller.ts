import { randomBytes } from "node:crypto";
import * as vscode from "vscode";
import { TramaError, UsageError } from "../../../src/core/errors";
import { approveProposal, getProposal, rejectProposal } from "../../../src/core/proposals";
import { resolveDriftsBlocker } from "../../../src/core/resolution";
import { approvedScope } from "../../../src/core/scope";
import { holdApproved, noticeForScanHold, readScanHold, SCAN_HOLD_SAVE_FAILED, turnScanHoldOff, turnScanHoldOn } from "../../../src/core/scan-hold";
import { buildSnapshot } from "../../../src/core/snapshot";
import { loadModel, modelDir, type Project, REQUIREMENTS_PREFIX, requirementsDir } from "../../../src/core/store";
import { namerOf } from "../../../src/core/card-names";
import { runBlocker } from "../../../src/core/design";
import { cardName, syncShortNumbers } from "../../../src/core/short-numbers";
import { blockedTasks, getTask, listDrifts, listTasks, requireNotAttached } from "../../../src/core/work";
import type { AgentAction, ToHost, ToWebview } from "../protocol";
import { onAnnouncementsWithdrawn } from "./announcements";
import { agentReady, configuredSkillsDir, type DesignAnnouncement, type Instruction, launchAgent, settings } from "./agent";
import { onQuestionRoundChange, questionRoundOpen } from "./question-activity";
import { driftResolution, onDriftResolutionChange } from "./drift-resolution";
import { webviewHtml } from "./html";
import { parseToHost } from "./messages";
import { resolveMarkdownFile } from "./paths";
import { findProject, initializeProject, NO_PROJECT_WARNING, updateSkills } from "./project";
import { buildApprovalScanPrompt, buildHeldScanPrompt, buildPrompt, type ResolvedAction, terminalName } from "./prompts";
import { type ApprovalOptions, applyApprovedProposal } from "./approval";
import type { QuestionSession } from "./question-session";

const DEBOUNCE_MS = 150;

export const describeError = (err: unknown): string =>
  err instanceof TramaError || err instanceof UsageError ? err.message : `Unexpected error: ${err instanceof Error ? err.message : String(err)}`;

/** The Tasks as a run sees them, in creation order: where they stand, whether the agent has them, and what blocks them. */
function runTasks(project: Project) {
  const blocked = blockedTasks(project);
  return listTasks(project).map((t) => ({ id: t.id, proposal: t.data.proposal, column: t.data.column, agent: t.data.agent, blockedBy: blocked.get(t.id) ?? [] }));
}

const QUESTIONS_WAITING = "Trama has questions from the agent waiting.";
const REOPEN = "Reopen";

const notBlank = (message: string) => (value: string) => (value.trim() === "" ? message : undefined);

/** Owns the single Trama panel, feeds it snapshots and carries out what the developer asks of it. */
export class Controller implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;
  private project: Project | undefined;
  private timer: NodeJS.Timeout | undefined;
  private disposed = false;
  /** Hold scan file text last warned about as unreadable. Forgotten when the panel closes, so reopening warns again. */
  private scanHoldWarned: string | null = null;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly questions?: QuestionSession,
    /** The extension's watcher of `.trama/`, which outlives the panel: the panel follows it only while open. */
    private readonly tramaFiles?: vscode.FileSystemWatcher,
  ) {}

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
      project = findProject() ?? (await initializeProject());
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

  /** Initializes the workspace and stops there: only opening the panel or a question round opens it. */
  async init(): Promise<void> {
    await initializeProject();
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

  updateSkills(): void {
    const project = this.requireProject();
    if (project) updateSkills(project);
  }

  private requireProject(): Project | undefined {
    const project = this.project ?? findProject();
    if (!project) void vscode.window.showWarningMessage(NO_PROJECT_WARNING);
    return project;
  }

  dispose(): void {
    this.disposed = true;
    this.panel?.dispose();
    clearTimeout(this.timer);
  }

  private create(project: Project | undefined): void {
    const dist = vscode.Uri.joinPath(this.extensionUri, "dist");
    const panel = vscode.window.createWebviewPanel("trama", "Trama", vscode.ViewColumn.Active, {
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
      this.scanHoldWarned = null;
      // The round stays open and the agent keeps waiting; the developer is offered a way back to it.
      this.questions?.panelClosed();
      if (!this.disposed && this.questions?.current()) this.offerReopen();
    });
    this.panel = panel;
    this.project = project;
    this.noteSwitch();
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

  /**
   * An unreadable Hold scan switch is off. The warning is shown once per content while the panel stays open,
   * again when the content changes and is still unreadable, and again after the panel is reopened.
   */
  private noteSwitch(): void {
    const project = this.projectNow();
    if (!project) return;
    const hold = noticeForScanHold(readScanHold(project).reading, this.scanHoldWarned);
    this.scanHoldWarned = hold.warned;
    if (hold.warning !== null) void vscode.window.showWarningMessage(hold.warning);
  }

  /** The project the panel shows, looked up again while the panel has none, so a project created after the panel opened appears. */
  private projectNow(): Project | undefined {
    return (this.project ??= findProject());
  }

  /** Posts a fresh snapshot; if the files cannot be read, posts the error and the view keeps its last snapshot. */
  private refresh(): void {
    const project = this.projectNow();
    if (!project) return;
    this.noteSwitch();
    try {
      const window = driftResolution();
      this.post({ type: "snapshot", snapshot: buildSnapshot(project), asking: questionRoundOpen(), resolve: { resolving: window === "resolving", blocker: resolveDriftsBlocker(project, window) } });
    } catch (err) {
      this.post({ type: "error", message: describeError(err) });
    }
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
        await this.launchAction(project, message.action);
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
      case "openLink":
        await vscode.env.openExternal(vscode.Uri.parse(message.url, true));
        return;
      case "setScanHold":
        await this.turnScanHold(project, message.on);
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

  /**
   * Turning Hold scan on always succeeds, with nothing held. Turning it off
   * sends the held scan with the buttons' delivery chain, in a terminal called `Scan`, as a gesture of the developer.
   */
  private async turnScanHold(project: Project, on: boolean): Promise<void> {
    try {
      const warning = on
        ? turnScanHoldOn(project)
        : await turnScanHoldOff(project, async (proposals) => {
            const instruction = buildHeldScanPrompt(proposals);
            try {
              const launch = await launchAgent(project.root, instruction, "Scan");
              return launch !== undefined && launch !== "not-sent";
            } catch (err) {
              void vscode.window.showErrorMessage(`Trama: ${describeError(err)}`);
              return false;
            }
          });
      if (warning !== null) void vscode.window.showWarningMessage(warning);
    } finally {
      // The view shows the switch at once; this picture puts back the real state if the turn was refused or failed.
      this.refresh();
    }
  }

  private approvalOptions(project: Project): ApprovalOptions {
    return {
      project,
      autoScan: settings().get<boolean>("autoScan", true),
      agentConfigured: agentReady(),
      launchScan: async (proposal) => {
        const instruction = buildApprovalScanPrompt(proposal);
        if ((await launchAgent(project.root, instruction, "Scan", undefined, true)) !== "not-sent") return;
        // Cursor could not send it by itself: no chat is left waiting; the developer starts the scan when they want.
        void vscode.window.showInformationMessage(`Trama: Proposal ${cardName(project, "proposal", proposal)} was approved. Scan the Features it affects?`, "Scan now").then(async (choice) => {
          if (choice !== "Scan now") return;
          try {
            await launchAgent(project.root, instruction, "Scan");
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
   * With Hold scan on nothing starts: the Proposal is held instead, as for the panel's approvals.
   */
  async scanApproved(project: Project, proposalId: string): Promise<void> {
    const options = this.approvalOptions(project);
    this.refresh();
    if (!options.autoScan) return;
    try {
      if (holdApproved(project, proposalId)) return;
    } catch {
      options.warn(SCAN_HOLD_SAVE_FAILED);
      return;
    }
    if (!options.agentConfigured) return;
    await options.launchScan(proposalId);
  }

  /** Every path that approves a Proposal goes through here, always in the open folder; the view is refreshed before any agent is launched. */
  private async approving(project: Project, proposalId: string, apply: () => void): Promise<void> {
    await applyApprovedProposal(this.approvalOptions(project), proposalId, () => {
      apply();
      this.refresh();
    });
  }

  private async launchAction(project: Project, action: AgentAction): Promise<void> {
    // The exclusion between Runs and Resolve Drifts is read from the window's state, never remembered: when the request
    // arrives, and again at each step before the instruction is really written or sent (see `canSend`).
    const refusal = (): string | null => {
      if (action.kind === "resolve-drifts") {
        const blocker = resolveDriftsBlocker(project, driftResolution());
        return blocker === null ? null : `Resolve Drifts is unavailable: ${blocker}.`;
      }
      const isRun = action.kind === "implement" || action.kind === "implement-design" || action.kind === "implement-all";
      return isRun && driftResolution() === "resolving" ? "A run cannot start: Drifts are being resolved." : null;
    };
    const send = async (resolved: ResolvedAction, announceProposal?: DesignAnnouncement, instruction: Instruction = buildPrompt(resolved)) => {
      let refused: string | null = null;
      const canSend = () => (refused = refusal()) === null;
      await launchAgent(project.root, instruction, terminalName(resolved, (kind, id) => cardName(project, kind, id)), announceProposal, false, canSend, resolved.kind === "implement" || resolved.kind === "implement-design" || resolved.kind === "implement-all" ? "run" : resolved.kind === "resolve-drifts" ? "resolve" : undefined);
      // Nothing was sent because the other side started while the request waited: the developer is told why.
      if (refused !== null) throw new TramaError(refused);
    };
    const blocked = refusal();
    if (blocked !== null) throw new TramaError(blocked);
    switch (action.kind) {
      case "resolve-drifts": {
        // The Drifts are those open when the instruction is sent, not when the button was clicked.
        const open = () => listDrifts(project).filter((d) => d.data.status === "open").map((d) => d.id);
        await send({ kind: "resolve-drifts", drifts: [] }, "Resolve Drifts", () => buildPrompt({ kind: "resolve-drifts", drifts: open() }));
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
      case "scan":
        if (action.feature !== undefined && !loadModel(project).features.has(action.feature))
          throw new TramaError(`No Feature "${action.feature}" in the Model`);
        await send(action);
        return;
      case "implement":
        await send({ kind: "implement", task: getTask(project, action.task).id });
        return;
      case "implement-design": {
        const proposal = getProposal(project, action.proposal).id;
        const blocker = runBlocker(runTasks(project).filter((t) => t.proposal === proposal), "design", namerOf(syncShortNumbers(project).all()));
        if (blocker !== null) throw new TramaError(`Run this design is unavailable: ${blocker}.`);
        await send({ kind: "implement-design", proposal });
        return;
      }
      case "implement-all": {
        const blocker = runBlocker(runTasks(project), "all", namerOf(syncShortNumbers(project).all()));
        if (blocker !== null) throw new TramaError(`Run all To do is unavailable: ${blocker}.`);
        await send(action);
        return;
      }
      case "import":
        await send(action);
        return;
    }
  }
}
