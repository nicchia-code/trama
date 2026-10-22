import { existsSync, watch, type FSWatcher } from "node:fs";
import { delimiter, dirname } from "node:path";
import * as vscode from "vscode";
import { syncRequirementSkills } from "../../../src/core/requirement-skills";
import { watchAnnouncements } from "./announcements";
import { agentName, watchAgentTerminal, configuredSkillsDir, setOverlayStorage } from "./agent";
import { Controller, describeError } from "./controller";
import { startExecutionCheck } from "./execution-check";
import { DesignRequests } from "./design-requests";
import { bundledTrama } from "./cursor";
import { findProject, installEditorHooks, removeCopilotPieces } from "./project";
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

/** A button in the status bar, only the Trama logo, that runs Open Trama. */
function statusBarItem(): vscode.StatusBarItem {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  item.text = "$(trama-logo)";
  item.tooltip = "Open Trama";
  item.accessibilityInformation = { label: "Open Trama" };
  item.command = "trama.open";
  item.show();
  return item;
}

/** The view of the Activity Bar icon: a tree that never has elements, so its welcome content (with the Open Trama button) always shows. */
function homeView(): vscode.Disposable {
  return vscode.window.registerTreeDataProvider<never>("trama.home", { getChildren: () => [], getTreeItem: (element) => element });
}

export function activate(context: vscode.ExtensionContext): void {
  const session = new QuestionSession(() => trama.revealForQuestions(), agentName);
  const questions = new EditorQuestions(() => findProject(), session);
  // One watcher of `.trama/` for the extension's whole life: the panel follows it while open, the design requests always.
  setOverlayStorage(context.globalStorageUri);
  const tramaFiles = vscode.workspace.createFileSystemWatcher("**/.trama/**");
  const requests = new DesignRequests(context.workspaceState, tramaFiles, undefined, undefined, () => trama.launch({ kind: "implement-all" }));
  const trama = new Controller(context.extensionUri, session, tramaFiles, context.globalStorageUri, requests, context.workspaceState);
  controller = trama;
  context.subscriptions.push(
    tramaFiles,
    statusBarItem(),
    homeView(),
    vscode.commands.registerCommand("trama.open", guarded(() => trama.open())),
    vscode.commands.registerCommand("trama.openSettings", guarded(() => trama.openSettings())),
    vscode.commands.registerCommand("trama.sendDesignRequest", guarded((uri?: vscode.Uri) => requests.send(uri))),
    vscode.commands.registerCommand("trama.scan", guarded(() => trama.pickAndScan())),
    vscode.commands.registerCommand("trama.import", guarded(() => trama.importFromCode())),
    vscode.commands.registerCommand("trama.updateSkills", guarded(async () => trama.updateSkills())),
    watchAgentTerminal(),
    watchAnnouncements(() => findProject()?.root),
    startExecutionCheck(() => findProject()?.root, tramaFiles),
    questions,
    requests,
    watchRequirements(),
    vscode.workspace.onDidChangeWorkspaceFolders(() => trama.workspaceFoldersChanged()),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("trama")) trama.settingsChanged(event.affectsConfiguration("trama.ompPath"));
    }),
    ...(vscode.lm === undefined ? [] : [vscode.lm.onDidChangeChatModels(() => void trama.postModelSuggestions())]),
  );
  exposeBundledCli(context);
  void guarded(() => installEditorHooks())();
  // Earlier versions installed Copilot's hooks outside Cursor: an error in removing them shows nothing.
  void removeCopilotPieces(context.globalStorageUri).catch(() => undefined);
}

/**
 * The developer edits Requirement files and Specs directly, so the generated `trama-req-*` and `trama-specs` skills are
 * regenerated on every change under `.trama/requirements/` or to `.trama/specs.yaml`, inside the Area folders too, also when the Trama panel is closed.
 */
export function watchRequirements(): vscode.Disposable {
  const watcher = vscode.workspace.createFileSystemWatcher("**/.trama/{requirements/**,specs.yaml}");
  const timers = new Map<string, NodeJS.Timeout>();
  const sync = (uri: vscode.Uri) => {
    const project = findProject(uri);
    if (!project) return;
    clearTimeout(timers.get(project.root));
    timers.set(project.root, setTimeout(() => {
      timers.delete(project.root);
      try {
        const result = syncRequirementSkills(project, [configuredSkillsDir()]);
        if (result.specsSkill.state === "kept") void vscode.window.showWarningMessage(`Trama: the trama-specs skill was not updated: ${result.specsSkill.problem}`);
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
