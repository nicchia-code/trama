import { cardName } from "../../../src/core/short-numbers";
import { existsSync, watch, type FSWatcher } from "node:fs";
import { delimiter, dirname } from "node:path";
import * as vscode from "vscode";
import { takeApprovedNotices } from "../../../src/core/approve-request";
import { syncRequirementSkills } from "../../../src/core/requirement-skills";
import { watchAnnouncements } from "./announcements";
import { agentName, useGlobalState, watchAgentTerminal, configuredSkillsDir } from "./agent";
import { Controller, describeError } from "./controller";
import { DesignRequests } from "./design-requests";
import { bundledTrama } from "./cursor";
import { findProject, installCopilotHooks } from "./project";
import { QuestionSession } from "./question-session";
import { EditorQuestions } from "./questions";
import { watchGlobalScans } from "./global-scan";

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
  useGlobalState(context.globalState);
  const session = new QuestionSession(() => trama.revealForQuestions(), agentName);
  const questions = new EditorQuestions(() => findProject(), session.present);
  // One watcher of `.trama/` for the extension's whole life: the panel follows it while open, the design requests always.
  const tramaFiles = vscode.workspace.createFileSystemWatcher("**/.trama/**");
  const trama = new Controller(context.extensionUri, session, tramaFiles, context.globalStorageUri);
  controller = trama;
  const requests = new DesignRequests(context.workspaceState, tramaFiles);
  context.subscriptions.push(
    tramaFiles,
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
    watchGlobalScans(() => { try { return findProject()?.root; } catch { return undefined; } }),
    questions,
    requests,
    watchRequirements(),
    watchApprovedNotices(),
  );
  void guarded(() => installCopilotHooks(context.globalStorageUri))();
  exposeBundledCli(context);
}

/** An approval the command line made in the open folder leaves a notice: the editor starts the automatic scan. */
function watchApprovedNotices(): vscode.Disposable {
  // Notices older than this editor were left while no editor was open: they start nothing.
  const since = Date.now();
  const timer = setInterval(() => {
    if (!controller) return;
    const project = findProject();
    if (!project) return;
    const answer = controller;
    for (const id of takeApprovedNotices(project, since))
      void answer.scanApproved(project, id).catch((err: unknown) => void vscode.window.showErrorMessage(`Trama: ${describeError(err)}`));
  }, 200);
  return { dispose: () => clearInterval(timer) };
}

/**
 * The developer edits Requirement files directly, so the generated `trama-req-*` skills are regenerated on every
 * change under `.trama/requirements/`, inside the Area folders too, also when the Trama panel is closed.
 */
export function watchRequirements(): vscode.Disposable {
  const watcher = vscode.workspace.createFileSystemWatcher("**/.trama/requirements/**");
  const timers = new Map<string, NodeJS.Timeout>();
  const sync = (uri: vscode.Uri) => {
    const project = findProject(uri);
    if (!project) return;
    clearTimeout(timers.get(project.root));
    timers.set(project.root, setTimeout(() => {
      timers.delete(project.root);
      try {
        syncRequirementSkills(project, [configuredSkillsDir()]);
      } catch (err) {
        void vscode.window.showErrorMessage(`Trama: could not regenerate the Requirement skills: ${describeError(err)}`);
      }
    }, SKILL_SYNC_DEBOUNCE_MS));
  };
  watcher.onDidCreate(sync);
  watcher.onDidChange(sync);
  watcher.onDidDelete(sync);
  return { dispose: () => {
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
    watcher.dispose();
  } };
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
