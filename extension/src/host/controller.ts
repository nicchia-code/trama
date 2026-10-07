import { randomBytes } from "node:crypto";
import * as vscode from "vscode";
import { TramaError, UsageError } from "../../../src/core/errors";
import { type ApprovalBlock, approvalBlock, approveProposal, getProposal, rejectProposal } from "../../../src/core/proposals";
import { approvedScope } from "../../../src/core/scope";
import { noticeForScanHold, readScanHold, turnScanHoldOff, turnScanHoldOn } from "../../../src/core/scan-hold";
import { listAnnouncements } from "../../../src/core/announcements";
import { buildSnapshot } from "../../../src/core/snapshot";
import { loadModel, modelDir, type Project, REQUIREMENTS_PREFIX, requirementsDir } from "../../../src/core/store";
import { namerOf } from "../../../src/core/card-names";
import { runBlocker } from "../../../src/core/design";
import { cardName, syncShortNumbers } from "../../../src/core/short-numbers";
import { blockedTasks, getDrift, getTask, listTasks, requireNotAttached, resolveDrift, staleAttachedProposal } from "../../../src/core/work";
import type { AgentAction, ToHost, ToWebview } from "../protocol";
import { onAnnouncementsWithdrawn } from "./announcements";
import { agentReady, configuredSkillsDir, type DesignAnnouncement, launchAgent, settings } from "./agent";
import { driftBlockedMessage, REWORK_PROPOSAL } from "./drift-blocked";
import { onQuestionRoundChange, questionRoundOpen } from "./question-activity";
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
   * Without a project there is no panel to open.
   */
  revealForQuestions(): void {
    if (this.panel) {
      this.panel.reveal(undefined, false);
      return;
    }
    const project = findProject();
    if (project) this.create(project);
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

  private create(project: Project): void {
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
    if (!this.project) return;
    const hold = noticeForScanHold(readScanHold(this.project).reading, this.scanHoldWarned);
    this.scanHoldWarned = hold.warned;
    if (hold.warning !== null) void vscode.window.showWarningMessage(hold.warning);
  }

  /** Posts a fresh snapshot; if the files cannot be read, posts the error and the view keeps its last snapshot. */
  private refresh(): void {
    if (!this.project) return;
    this.noteSwitch();
    try {
      this.post({ type: "snapshot", snapshot: buildSnapshot(this.project), asking: questionRoundOpen() });
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
    const project = this.project;
    if (!project) return;
    switch (message.type) {
      case "ready":
        this.refresh();
        if (this.questions) this.post({ type: "questions", round: this.questions.current() });
        return;
      case "questionAction":
        this.questions?.act(message.round, message.action);
        return;
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
      case "resolveDrift": {
        const resolve = () => resolveDrift(project, message.id, message.how, [configuredSkillsDir()], { option: message.option, note: message.note });
        const attached = getDrift(project, message.id).data.proposal;
        if (message.how === "accept-proposal" && attached !== null) await this.approving(project, attached, resolve);
        else {
          resolve();
          this.refresh();
        }
        return;
      }
      case "driftBlocked": {
        const proposal = getDrift(project, message.id).data.proposal;
        const reworking = listAnnouncements(project).some((a) => a.drift === message.id);
        // While the agent reworks the stale Proposal the button waits like for a Proposal still being written, and the stale warning's Rework button would start a second rework.
        const block: ApprovalBlock | null = proposal === null ? null : reworking ? { kind: "draft", reason: `Proposal ${cardName(project, "proposal", proposal)} is being reworked by the agent.` } : approvalBlock(project, proposal);
        if (block === null) {
          // The Proposal can be approved now: the developer was looking at an old picture.
          this.refresh();
          return;
        }
        const stale = block.kind === "stale";
        const choice = await vscode.window.showWarningMessage(driftBlockedMessage(block), ...(stale ? [REWORK_PROPOSAL] : []));
        if (choice !== REWORK_PROPOSAL) return;
        await this.launchAction(project, { kind: "rework-drift", drift: message.id });
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
    this.refresh();
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
   * With Hold scan on nothing starts, and the Proposal is not held either: only the panel's approvals are.
   */
  async scanApproved(project: Project, proposalId: string): Promise<void> {
    const options = this.approvalOptions(project);
    this.refresh();
    if (!options.autoScan || !options.agentConfigured || readScanHold(project).reading.kind === "on") return;
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
    const send = (resolved: ResolvedAction, announceProposal?: DesignAnnouncement) =>
      launchAgent(project.root, buildPrompt(resolved), terminalName(resolved, (kind, id) => cardName(project, kind, id)), announceProposal);
    switch (action.kind) {
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
      case "rework-drift": {
        const drift = getDrift(project, action.drift);
        const stale = staleAttachedProposal(project, drift);
        // The title is written into the announcement's file, so it names the Proposal by its identity; the Board shows its number.
        await send({ kind: "rework-drift", drift: drift.id, proposal: stale.id }, { title: `Rework of Proposal ${stale.id}`, drift: drift.id });
        return;
      }
    }
  }
}
