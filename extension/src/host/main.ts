import { cardName } from "../../../src/core/short-numbers";
import { existsSync, watch, type FSWatcher } from "node:fs";
import { delimiter, dirname, join } from "node:path";
import * as vscode from "vscode";
import { takeApproveRequest, writeApproveResult } from "../../../src/core/approve-request";
import { lostWorktreeMessage, reconcileLostWorktrees, worktreesHome } from "../../../src/core/worktree-round";
import { syncRequirementSkills } from "../../../src/core/requirement-skills";
import { watchAnnouncements } from "./announcements";
import { notices, watchCursorChatNotices } from "./notice-host";
import { agentName, watchAgentTerminal, watchExternalRuns, configuredSkillsDir, ensureWorktreeAgentSetting, settleWaitingRound } from "./agent";
import { Controller, describeError } from "./controller";
import { DesignRequests } from "./design-requests";
import { bundledTrama } from "./cursor";
import { MARKER_FOLDER } from "./external-terminal";
import { findProject } from "./project";
import { QuestionSession } from "./question-session";
import { EditorQuestions } from "./questions";

const SKILL_SYNC_DEBOUNCE_MS = 300;

let controller: Controller | undefined;

/** Runs a command and shows whatever fails to the developer instead of leaving a rejected promise. */
function guarded<A extends unknown[]>(action: (...args: A) => Promise<void>): (...args: A) => Promise<void> {
  return async (...args: A) => {
    try {
      await action(...args);
    } catch (err) {
      void vscode.window.showErrorMessage(`Trama: ${describeError(err)}`);
    }
  };
}

export function activate(context: vscode.ExtensionContext): void {
  const session = new QuestionSession(() => trama.revealForQuestions(), agentName);
  const trama = new Controller(context.extensionUri, session);
  controller = trama;
  const questions = new EditorQuestions(findProject, session.present);
  const requests = new DesignRequests(context.workspaceState);
  context.subscriptions.push(
    vscode.commands.registerCommand("trama.open", guarded(() => trama.open())),
    vscode.commands.registerCommand(
      "trama.init",
      guarded(() => trama.init()),
    ),
    vscode.commands.registerCommand("trama.quickDesign", guarded(() => trama.launch({ kind: "design" }))),
    vscode.commands.registerCommand("trama.design", guarded(() => requests.write())),
    vscode.commands.registerCommand("trama.sendDesignRequest", guarded((uri?: vscode.Uri) => requests.send(uri))),
    vscode.commands.registerCommand("trama.scan", guarded(() => trama.pickAndScan())),
    vscode.commands.registerCommand("trama.import", guarded(() => trama.launch({ kind: "import" }))),
    vscode.commands.registerCommand("trama.updateSkills", guarded(async () => trama.updateSkills())),
    watchAgentTerminal(),
    watchAnnouncements(() => findProject()?.root),
    questions,
    requests,
    notices,
    watchCursorChatNotices(),
    watchRequirements(),
    watchLostWorktrees(() => trama.noteWorktreesLost()),
    watchReadyRound(() => trama.noteRoundMerged()),
    watchApproveRequests(),
  );
  exposeBundledCli(context);
  try {
    context.subscriptions.push(watchExternalRuns(join(context.globalStorageUri.fsPath, MARKER_FOLDER)));
  } catch (err) {
    void vscode.window.showErrorMessage(`Trama: could not watch the external terminal's end markers: ${describeError(err)}`);
  }
  void ensureWorktreeAgentSetting().catch((err: unknown) => {
    void vscode.window.showErrorMessage(`Trama: ${describeError(err)}`);
  });
}

/** `trama proposal approve` writes a request here when the switch is on. The editor runs the panel's acceptance. */
function watchApproveRequests(): vscode.Disposable {
  let busy = false;
  const timer = setInterval(() => {
    if (busy || !controller) return;
    const project = findProject();
    if (!project) return;
    const request = takeApproveRequest(project);
    if (!request) return;
    busy = true;
    const answer = controller;
    void answer.approveFromCommand(project, request.id, request.skillsDirs).then(
      (result) => writeApproveResult(project, { nonce: request.nonce, ok: result.ok, message: result.message }),
      (err: unknown) => writeApproveResult(project, { nonce: request.nonce, ok: false, message: describeError(err) }),
    ).finally(() => {
      busy = false;
    });
  }, 200);
  return { dispose: () => clearInterval(timer) };
}

/**
 * The developer edits Requirement files directly, so the generated `trama-req-*` skills are regenerated on every
 * change under `.trama/requirements/`, inside the Area folders too, also when the Trama panel is closed.
 */
function watchRequirements(): vscode.Disposable {
  const watcher = vscode.workspace.createFileSystemWatcher("**/.trama/requirements/**");
  let timer: NodeJS.Timeout | undefined;
  const sync = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const project = findProject();
      if (!project) return;
      try {
        syncRequirementSkills(project, [configuredSkillsDir()]);
      } catch (err) {
        void vscode.window.showErrorMessage(`Trama: could not regenerate the Requirement skills: ${describeError(err)}`);
      }
    }, SKILL_SYNC_DEBOUNCE_MS);
  };
  watcher.onDidCreate(sync);
  watcher.onDidChange(sync);
  watcher.onDidDelete(sync);
  return { dispose: () => (clearTimeout(timer), watcher.dispose()) };
}

/**
 * A Proposal worktree can disappear without Trama removing it, including when Cursor deletes worktrees on its own.
 * The Proposal goes back to decide and the developer is told, whether or not the panel is open.
 */
function watchLostWorktrees(onLost: () => void): vscode.Disposable {
  let timer: NodeJS.Timeout | undefined;
  let home = "";
  let folder: FSWatcher | undefined;
  const run = () => {
    const project = findProject();
    if (!project) return;
    try {
      const lost = reconcileLostWorktrees(project);
      for (const item of lost) void vscode.window.showWarningMessage(lostWorktreeMessage(item, cardName(project, "proposal", item.id)));
      if (lost.length > 0) onLost();
    } catch (err) {
      void vscode.window.showErrorMessage(`Trama: ${describeError(err)}`);
    }
    const next = worktreesHome(project.root);
    if (next === home) return;
    folder?.close();
    home = next;
    folder = undefined;
    if (!existsSync(next)) return;
    try {
      folder = watch(next, () => {
        clearTimeout(timer);
        timer = setTimeout(run, 200);
      });
    } catch {
      folder = undefined;
    }
  };
  run();
  const poll = setInterval(run, 5000);
  return {
    dispose() {
      clearInterval(poll);
      clearTimeout(timer);
      folder?.close();
    },
  };
}

/**
 * A merge can be ready before this folder is back on the branch it started from, with a clean tree. When that
 * happens, the waiting merge is applied even if the panel is closed.
 */
function watchReadyRound(onMerged: () => void): vscode.Disposable {
  let timer: NodeJS.Timeout | undefined;
  let gitDir = "";
  let folder: FSWatcher | undefined;
  const run = () => {
    const project = findProject();
    if (!project) return;
    if (settleWaitingRound(project.root)) onMerged();
    const next = join(project.root, ".git");
    if (next === gitDir) return;
    folder?.close();
    gitDir = next;
    folder = undefined;
    if (!existsSync(next)) return;
    try {
      folder = watch(next, () => {
        clearTimeout(timer);
        timer = setTimeout(run, 200);
      });
    } catch {
      folder = undefined;
    }
  };
  run();
  const poll = setInterval(run, 5000);
  return {
    dispose() {
      clearInterval(poll);
      clearTimeout(timer);
      folder?.close();
    },
  };
}

/**
 * Agents run `trama` in the editor's terminals (the agent terminals Trama opens, Copilot's terminal tool). When the
 * package ships a binary for this platform, its folder is put first on those terminals' PATH.
 */
function exposeBundledCli(context: vscode.ExtensionContext): void {
  const executable = bundledTrama(context.extensionPath);
  const env = context.environmentVariableCollection;
  env.clear();
  if (!executable) return;
  env.description = "Puts the trama CLI shipped with the Trama extension on the PATH, for agents.";
  env.prepend("PATH", `${dirname(executable)}${delimiter}`);
}

export function deactivate(): void {
  controller?.dispose();
  controller = undefined;
}
