import { randomBytes } from "node:crypto";
import * as vscode from "vscode";
import { TramaError, UsageError } from "../../../src/core/errors";
import { approvalBlock, approveProposal, getProposal, rejectProposal } from "../../../src/core/proposals";
import { lostWorktreeMessage, reconcileLostWorktrees, roundWorktrees, withdrawFromRound, worktreePath } from "../../../src/core/worktree-round";
import { abandonRound, reconcileMerge } from "../../../src/core/worktree-merge";
import { approvalBySwitch, noticeForSwitch, readMultiBranch, turnMultiBranch } from "../../../src/core/multi-branch";
import { buildSnapshot } from "../../../src/core/snapshot";
import { loadModel, modelDir, type Project, REQUIREMENTS_PREFIX, requirementsDir } from "../../../src/core/store";
import { namerOf } from "../../../src/core/card-names";
import { runBlocker } from "../../../src/core/design";
import { cardName, syncShortNumbers } from "../../../src/core/short-numbers";
import { blockedTasks, getDrift, getTask, listTasks, resolveDrift, staleAttachedProposal } from "../../../src/core/work";
import type { AgentAction, ToHost, ToWebview } from "../protocol";
import { onAnnouncementsWithdrawn } from "./announcements";
import { acceptOrdinaryProposal } from "./acceptance";
import { agentReady, configuredLanguage, configuredSkillsDir, configuredWorktreeAgent, launchAgent, launchReconcileAgent, launchWorktreeAgent, resumeWorktreeTasks, settings } from "./agent";
import { applyWorktreeDecision } from "./worktree-decision";
import { approvalRoute, projectMultiBranch } from "./multi-branch";
import { driftBlockedMessage, REWORK_PROPOSAL } from "./drift-blocked";
import { onQuestionRoundChange, questionRoundOpen } from "./question-activity";
import { webviewHtml } from "./html";
import { parseToHost } from "./messages";
import { resolveMarkdownFile } from "./paths";
import { findProject, initializeProject, updateSkills } from "./project";
import { buildPrompt, buildScanPrompt, type ResolvedAction, terminalName, withLanguage } from "./prompts";
import { type ApprovalOptions, applyApprovedProposal } from "./approval";
import type { QuestionSession } from "./question-session";
import { syncFolderWatchers } from "./folder-watchers";

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
  private watcher: vscode.FileSystemWatcher | undefined;
  /** One watcher per worktree of the round, keyed by folder: their Tasks, Drifts and Proposals are on the Board too. */
  private readonly worktreeWatchers = new Map<string, vscode.Disposable>();
  private timer: NodeJS.Timeout | undefined;
  private disposed = false;
  /** File text last warned about as unreadable. Forgotten when the panel closes, so reopening warns again. */
  private switchWarned: string | null = null;

  constructor(private readonly extensionUri: vscode.Uri, private readonly questions?: QuestionSession) {}

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
    this.disposed = true;
    this.panel?.dispose();
    this.watcher?.dispose();
    syncFolderWatchers(this.worktreeWatchers, [], () => ({ dispose() {} }));
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
    this.watchChanges(watcher);
    const subscriptions = [
      onAnnouncementsWithdrawn((announcements) => this.post({ type: "withdrawn", announcements })),
      onQuestionRoundChange(() => this.refresh()),
      ...(this.questions ? [this.questions.onChange((round) => this.post({ type: "questions", round }))] : []),
    ];

    panel.onDidDispose(() => {
      watcher.dispose();
      syncFolderWatchers(this.worktreeWatchers, [], () => ({ dispose() {} }));
      for (const subscription of subscriptions) subscription.dispose();
      clearTimeout(this.timer);
      this.panel = this.watcher = this.project = undefined;
      this.switchWarned = null;
      // The round stays open and the agent keeps waiting; the developer is offered a way back to it.
      this.questions?.panelClosed();
      if (!this.disposed && this.questions?.current()) this.offerReopen();
    });
    this.panel = panel;
    this.watcher = watcher;
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

  private watchChanges(watcher: vscode.FileSystemWatcher): void {
    const onChange = () => this.scheduleRefresh();
    watcher.onDidCreate(onChange);
    watcher.onDidChange(onChange);
    watcher.onDidDelete(onChange);
  }

  /** Follows the cards inside the worktrees now in the round; called on every refresh, since the round changes then. */
  private watchWorktrees(project: Project): void {
    const folders = roundWorktrees(project).map((folder) => worktreePath(project.root, folder.proposal));
    syncFolderWatchers(this.worktreeWatchers, folders, (folder) => {
      const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(vscode.Uri.file(folder), ".trama/{tasks,drifts,proposals}/**"));
      this.watchChanges(watcher);
      return watcher;
    });
  }

  /** A worktree disappeared while the panel may be closed. The Board, if it is open, shows the Proposal back to decide. */
  noteWorktreesLost(): void {
    if (this.panel && this.project) this.refresh();
  }

  /** A waiting round was applied. The Board, if it is open, shows the Proposals as part of the Model. */
  noteRoundMerged(): void {
    if (this.panel && this.project) this.refresh();
  }

  /**
   * An unreadable switch is off. The warning is shown once per content while the panel stays open,
   * again when the content changes and is still unreadable, and again after the panel is reopened.
   */
  private noteSwitch(): void {
    if (!this.project) return;
    const notice = noticeForSwitch(readMultiBranch(this.project), this.switchWarned);
    this.switchWarned = notice.warned;
    if (notice.warning !== null) void vscode.window.showWarningMessage(notice.warning);
  }

  /** Posts a fresh snapshot; if the files cannot be read, posts the error and the view keeps its last snapshot. */
  private refresh(): void {
    if (!this.project) return;
    this.noteSwitch();
    try {
      for (const lost of reconcileLostWorktrees(this.project)) void vscode.window.showWarningMessage(lostWorktreeMessage(lost, cardName(this.project, "proposal", lost.id)));
      this.watchWorktrees(this.project);
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
      case "openFile": {
        const home = message.worktree === undefined ? project : roundWorktrees(project).find((folder) => folder.proposal === message.worktree)?.project;
        if (!home) throw new TramaError(`Proposal ${cardName(project, "proposal", message.worktree as string)} is not in a worktree.`);
        await this.openFile(resolveMarkdownFile(home.dir, message.path));
        return;
      }
      case "openLink":
        await vscode.env.openExternal(vscode.Uri.parse(message.url, true));
        return;
      case "setMultiBranch": {
        const warning = turnMultiBranch(project, message.on, configuredWorktreeAgent());
        if (warning !== null) void vscode.window.showWarningMessage(warning);
        else this.refresh();
        return;
      }
      case "approveProposal":
        await this.approving(project, message.id, () => approveProposal(project, message.id, [configuredSkillsDir()]), false);
        return;
      case "withdrawFromRound":
        withdrawFromRound(project, message.id);
        this.refresh();
        return;
      case "rejectProposal": {
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
      case "abandonRound":
        abandonRound(project);
        this.refresh();
        return;
      case "resolveDrift": {
        if (message.id === "merge") {
          if (message.how === "fix-code") {
            const started = reconcileMerge(project, message.option ?? 1);
            this.refresh();
            await launchReconcileAgent(project.root, started.worktree, withLanguage(buildPrompt({ kind: "implement", task: started.task }), configuredLanguage()));
          } else {
            abandonRound(project);
            this.refresh();
          }
          return;
        }
        if (message.worktree !== undefined) {
          const worktree = applyWorktreeDecision(project, message.worktree, message.id, message.how, [configuredSkillsDir()], { option: message.option, note: message.note });
          this.refresh();
          await resumeWorktreeTasks(project.root, worktree, message.worktree);
          return;
        }
        const resolve = () => resolveDrift(project, message.id, message.how, [configuredSkillsDir()], { option: message.option, note: message.note });
        const attached = getDrift(project, message.id).data.proposal;
        if (message.how === "accept-proposal" && attached !== null) await this.approving(project, attached, resolve, true);
        else {
          resolve();
          this.refresh();
        }
        return;
      }
      case "driftBlocked": {
        const home = message.worktree === undefined ? project : roundWorktrees(project).find((folder) => folder.proposal === message.worktree)?.project;
        if (!home) throw new TramaError(`Proposal ${cardName(project, "proposal", message.worktree as string)} is not in a worktree.`);
        const proposal = getDrift(home, message.id).data.proposal;
        const block = proposal === null ? null : approvalBlock(home, proposal);
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
      launchScan: async (features, proposal) => {
        const instruction = buildScanPrompt(features, proposal);
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
    };
  }

  /**
   * `trama proposal approve` with the switch on. The command waits for this; the worktree agent starts the same way as the panel.
   */
  async approveFromCommand(project: Project, proposalId: string, skillsDirs: string[]): Promise<{ ok: boolean; message: string }> {
    const decision = approvalBySwitch(readMultiBranch(project));
    if (decision.route === "folder") {
      try {
        const approved = approveProposal(project, proposalId, skillsDirs);
        this.refresh();
        const line = `Approved Proposal ${cardName(project, "proposal", approved.id)}`;
        return { ok: true, message: decision.notice ? `${decision.notice}\n${line}` : line };
      } catch (err) {
        const message = describeError(err);
        void vscode.window.showWarningMessage(message);
        return { ok: false, message };
      }
    }
    const warnings: string[] = [];
    try {
      const started = await acceptOrdinaryProposal(
        {
          project,
          autoScan: settings().get<boolean>("autoScan", true),
          worktreeAgent: configuredWorktreeAgent(),
          language: configuredLanguage(),
          warn: (message) => {
            warnings.push(message);
            void vscode.window.showWarningMessage(message);
          },
          startAgent: async (worktree, prompt) => {
            this.refresh();
            await launchWorktreeAgent(project.root, worktree, prompt, proposalId);
          },
        },
        proposalId,
      );
      if (!started) return { ok: false, message: warnings.at(-1) ?? "The Proposal stayed open." };
      return { ok: true, message: `Proposal ${cardName(project, "proposal", proposalId)} is in a worktree.` };
    } catch (err) {
      const message = describeError(err);
      void vscode.window.showErrorMessage(`Trama: ${message}`);
      return { ok: false, message };
    }
  }

  /**
   * Every path that approves a Proposal goes through here; the view is refreshed before any agent is launched.
   * With multi-branch on, an ordinary Proposal goes to a worktree. A Drift's Proposal stays in the open folder.
   */
  private async approving(project: Project, proposalId: string, apply: () => void, viaDrift: boolean): Promise<void> {
    if (approvalRoute(projectMultiBranch(project), viaDrift) === "folder") {
      await applyApprovedProposal(this.approvalOptions(project), proposalId, () => {
        apply();
        this.refresh();
      });
      return;
    }
    await acceptOrdinaryProposal(
      {
        project,
        autoScan: settings().get<boolean>("autoScan", true),
        worktreeAgent: configuredWorktreeAgent(),
        language: configuredLanguage(),
        warn: (message) => void vscode.window.showWarningMessage(message),
        startAgent: async (worktree, prompt) => {
          this.refresh();
          await launchWorktreeAgent(project.root, worktree, prompt, proposalId);
        },
      },
      proposalId,
    );
  }

  private async launchAction(project: Project, action: AgentAction): Promise<void> {
    const send = (resolved: ResolvedAction, announceProposal?: string) =>
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
        await send({ kind: "rework-drift", drift: drift.id, proposal: stale.id }, `Rework of Proposal ${stale.id}`);
        return;
      }
    }
  }
}
