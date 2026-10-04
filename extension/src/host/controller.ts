import { randomBytes } from "node:crypto";
import * as vscode from "vscode";
import { TramaError, UsageError } from "../../../src/core/errors";
import { approvalBlock, approveProposal, getProposal, rejectProposal } from "../../../src/core/proposals";
import { buildSnapshot } from "../../../src/core/snapshot";
import { loadModel, modelDir, type Project, REQUIREMENTS_PREFIX, requirementsDir } from "../../../src/core/store";
import { runBlocker } from "../../../src/core/design";
import { blockedTasks, getDrift, getTask, listTasks, moveTask, resolveDrift, staleAttachedProposal, takeBackTask } from "../../../src/core/work";
import type { AgentAction, ToHost, ToWebview } from "../protocol";
import { onAnnouncementsWithdrawn } from "./announcements";
import { agentReady, configuredSkillsDir, launchAgent, settings } from "./agent";
import { driftBlockedMessage, REWORK_PROPOSAL } from "./drift-blocked";
import { onQuestionRoundChange, questionRoundOpen } from "./question-activity";
import { webviewHtml } from "./html";
import { parseToHost } from "./messages";
import { resolveMarkdownFile } from "./paths";
import { findProject, initializeProject, updateSkills } from "./project";
import { buildPrompt, buildScanPrompt } from "./prompts";
import { type ApprovalOptions, applyApprovedProposal } from "./approval";

const DEBOUNCE_MS = 150;

export const describeError = (err: unknown): string =>
  err instanceof TramaError || err instanceof UsageError ? err.message : `Unexpected error: ${err instanceof Error ? err.message : String(err)}`;

/** The Tasks as a run sees them, in creation order: where they stand, whether the agent has them, and what blocks them. */
function runTasks(project: Project) {
  const blocked = blockedTasks(project);
  return listTasks(project).map((t) => ({ id: t.id, proposal: t.data.proposal, column: t.data.column, agent: t.data.agent, blockedBy: blocked.get(t.id) ?? [] }));
}

const notBlank = (message: string) => (value: string) => (value.trim() === "" ? message : undefined);

/** Owns the single Trama panel, feeds it snapshots and carries out what the developer asks of it. */
export class Controller implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;
  private project: Project | undefined;
  private watcher: vscode.FileSystemWatcher | undefined;
  private timer: NodeJS.Timeout | undefined;

  constructor(private readonly extensionUri: vscode.Uri) {}

  /** Creates the panel, or reveals it. Offers to initialize the workspace when there is no `.trama/`. */
  async open(): Promise<void> {
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

  async init(): Promise<void> {
    const project = await initializeProject();
    if (project) await this.open();
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
    if (!project) void vscode.window.showWarningMessage('Trama: no .trama/ in this workspace. Run "Trama: Initialize Project" first.');
    return project;
  }

  dispose(): void {
    this.panel?.dispose();
    this.watcher?.dispose();
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

    const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(project.root, ".trama/**"));
    const onChange = () => this.scheduleRefresh();
    watcher.onDidCreate(onChange);
    watcher.onDidChange(onChange);
    watcher.onDidDelete(onChange);
    const subscriptions = [
      onAnnouncementsWithdrawn((announcements) => this.post({ type: "withdrawn", announcements })),
      onQuestionRoundChange(() => this.refresh()),
    ];

    panel.onDidDispose(() => {
      watcher.dispose();
      for (const subscription of subscriptions) subscription.dispose();
      clearTimeout(this.timer);
      this.panel = this.watcher = this.project = undefined;
    });
    this.panel = panel;
    this.watcher = watcher;
    this.project = project;
  }

  private post(message: ToWebview): void {
    void this.panel?.webview.postMessage(message);
  }

  private scheduleRefresh(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.refresh(), DEBOUNCE_MS);
  }

  /** Posts a fresh snapshot; if the files cannot be read, posts the error and the view keeps its last snapshot. */
  private refresh(): void {
    if (!this.project) return;
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
        return;
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
      case "openLink":
        await vscode.env.openExternal(vscode.Uri.parse(message.url, true));
        return;
      case "moveTask":
        moveTask(project, message.id, message.column, "developer");
        this.refresh();
        return;
      case "takeBackTask":
        takeBackTask(project, message.id);
        this.refresh();
        return;
      case "approveProposal":
        await this.approving(project, message.id, () => approveProposal(project, message.id, [configuredSkillsDir()]));
        return;
      case "rejectProposal": {
        const feedback = await vscode.window.showInputBox({
          title: `Reject Proposal ${message.id}`,
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
        const block = proposal === null ? null : approvalBlock(project, proposal);
        if (block === null) {
          // The Proposal can be approved now: the developer was looking at an old picture.
          this.refresh();
          return;
        }
        const stale = block.kind === "stale";
        const choice = await vscode.window.showWarningMessage(driftBlockedMessage(block), ...(stale ? [REWORK_PROPOSAL] : []));
        if (choice === REWORK_PROPOSAL) await this.launchAction(project, { kind: "rework-drift", drift: message.id });
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
      agentConfigured: agentReady(),
      launchScan: (features, proposal) => launchAgent(project.root, buildScanPrompt(features, proposal)),
    };
  }

  /** Every path that approves a Proposal goes through here; the view is refreshed before any agent is launched. */
  private async approving(project: Project, proposalId: string, apply: () => void): Promise<void> {
    await applyApprovedProposal(this.approvalOptions(project), proposalId, () => {
      apply();
      this.refresh();
    });
  }

  private async launchAction(project: Project, action: AgentAction): Promise<void> {
    switch (action.kind) {
      case "design": {
        const request =
          action.prompt?.trim() ||
          (await vscode.window.showInputBox({
            title: "Design with Agent",
            prompt: "What should the agent design or change in the Model?",
            placeHolder: "Add a cancelled state to orders…",
            ignoreFocusOut: true,
            validateInput: notBlank("Describe what to design"),
          }));
        if (request === undefined || request.trim() === "") return;
        await launchAgent(project.root, buildPrompt({ kind: "design", prompt: request }), request.trim());
        return;
      }
      case "scan":
        if (action.feature !== undefined && !loadModel(project).features.has(action.feature))
          throw new TramaError(`No Feature "${action.feature}" in the Model`);
        await launchAgent(project.root, buildPrompt(action));
        return;
      case "implement":
        await launchAgent(project.root, buildPrompt({ kind: "implement", task: getTask(project, action.task).id }));
        return;
      case "implement-design": {
        const proposal = getProposal(project, action.proposal).id;
        const blocker = runBlocker(runTasks(project).filter((t) => t.proposal === proposal), "design");
        if (blocker !== null) throw new TramaError(`Run this design is unavailable: ${blocker}.`);
        await launchAgent(project.root, buildPrompt({ kind: "implement-design", proposal }));
        return;
      }
      case "implement-all": {
        const blocker = runBlocker(runTasks(project), "all");
        if (blocker !== null) throw new TramaError(`Run all To do is unavailable: ${blocker}.`);
        await launchAgent(project.root, buildPrompt(action));
        return;
      }
      case "import":
        await launchAgent(project.root, buildPrompt(action));
        return;
      case "rework-drift": {
        const drift = getDrift(project, action.drift);
        const stale = staleAttachedProposal(project, drift);
        await launchAgent(project.root, buildPrompt({ kind: "rework-drift", drift: drift.id, proposal: stale.id }), `Rework of Proposal ${stale.id}`);
        return;
      }
    }
  }
}
