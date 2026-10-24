import { existsSync, watch, type FSWatcher } from "node:fs";
import { delimiter, dirname } from "node:path";
import * as vscode from "vscode";
import { syncRequirementSkills } from "../../../src/core/requirement-skills";
import { ActivitiesItem, SHOW_ACTIVITIES_COMMAND } from "./activities-item";
import { watchAnnouncements } from "./announcements";
import { watchAgentTerminal, configuredOmpPath, configuredSkillsDir, ompChatGeneralSettingsChanged, setBundledCliDir, setOmpChat, setOverlayStorage, settings, windowClosed } from "./agent";
import { Controller, describeError } from "./controller";
import { startExecutionCheck } from "./execution-check";
import { DesignRequests } from "./design-requests";
import { bundledTrama } from "./bundled";
import { findProject, removeCopilotPieces } from "./project";
import { QuestionSession } from "./question-session";
import { EditorQuestions } from "./questions";
import { CONVERSATIONS_KEY, readSavedConversations } from "../../../src/core/omp-chat-conversation";
import { OmpClient } from "./omp-chat/client";
import { OmpChatView } from "./omp-chat/view";
import { MenuView } from "./menu/view";
import { SHOW_COMMANDS } from "../menu-protocol";
import { findOmp, forgetUpdateCheck, setUpdateStore } from "./omp-update";

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
  const session = new QuestionSession(() => trama.revealForQuestions());
  const questions = new EditorQuestions(() => findProject(), session);
  // One watcher of `.trama/` for the extension's whole life: the panel follows it while open, the design requests always.
  setOverlayStorage(context.globalStorageUri);
  setUpdateStore(context.globalState);
  const tramaFiles = vscode.workspace.createFileSystemWatcher("**/.trama/**");
  const requests = new DesignRequests(context.workspaceState, tramaFiles, undefined, undefined, () => trama.launch({ kind: "implement-all" }));
  const trama = new Controller(context.extensionUri, session, tramaFiles, context.globalStorageUri, requests, context.workspaceState);
  controller = trama;
  // The item of the ghosts with no Board column lives with the extension, so it shows with the panel closed too.
  const activities = new ActivitiesItem(() => findProject()?.root, tramaFiles, (announcement) => trama.openGhostDetails(announcement));
  // The side menu of the Activity Bar icon: it follows the same watcher, so it stays up to date with the panel closed.
  const menu = new MenuView(context.extensionUri, trama, tramaFiles);
  context.subscriptions.push(
    tramaFiles,
    menu,
    menu.register(),
    vscode.commands.registerCommand("trama.open", guarded(() => trama.open())),
    ...Object.entries(SHOW_COMMANDS).map(([command, view]) => vscode.commands.registerCommand(command, guarded(() => trama.show(view)))),
    // Internal: the missing-omp notice's Open Settings runs it; it is not in the palette.
    vscode.commands.registerCommand("trama.openSettings", guarded(() => trama.openSettings())),
    // Internal: the missing-omp notice's Install omp runs it; it is not in the palette.
    vscode.commands.registerCommand("trama.installOmp", guarded(async () => trama.installOmp())),
    vscode.commands.registerCommand("trama.sendDesignRequest", guarded((uri?: vscode.Uri) => requests.send(uri))),
    vscode.commands.registerCommand("trama.scan", guarded(() => trama.pickAndScan())),
    vscode.commands.registerCommand("trama.import", guarded(() => trama.importFromCode())),
    vscode.commands.registerCommand("trama.updateSkills", guarded(async () => trama.updateSkills())),
    watchAgentTerminal(),
    watchAnnouncements(() => findProject()?.root),
    activities,
    vscode.commands.registerCommand(SHOW_ACTIVITIES_COMMAND, () => activities.show()),
    startExecutionCheck(() => findProject()?.root, tramaFiles),
    questions,
    requests,
    watchRequirements(),
    vscode.workspace.onDidChangeWorkspaceFolders(() => trama.workspaceFoldersChanged()),
    vscode.workspace.onDidChangeConfiguration((event) => {
      // A changed `trama.ompPath` means another omp: the outcome of the last update check no longer holds.
      if (event.affectsConfiguration("trama.ompPath")) forgetUpdateCheck();
      if (event.affectsConfiguration("trama")) trama.settingsChanged(event.affectsConfiguration("trama.ompPath"));
    }),
  );
  exposeBundledCli(context);
  startOmpChat(context);
  // Earlier versions installed Copilot's hooks: an error in removing them shows nothing.
  void removeCopilotPieces(context.globalStorageUri).catch(() => undefined);
}

/**
 * omp Chat: the view of the conversations and the ACP client they stand on. The conversations the window saved before resume once both exist, and the context key
 * that shows the view follows the settings (`trama.ompChat`) and the conversations from the start.
 */
function startOmpChat(context: vscode.ExtensionContext): void {
  const savedIds = () => readSavedConversations(context.workspaceState.get(CONVERSATIONS_KEY)).entries.map((entry) => entry.id);
  const view = new OmpChatView(context.extensionUri, () => findProject()?.root, savedIds, context.globalState);
  // `trama.ompPath` is application-scoped: only the user value counts, read by `configuredOmpPath`, as for every terminal and the model list.
  // The program is the one the launches run: found as `findOmp` finds it (a conversation that resumes after a reload has had no launch before it).
  const client = new OmpClient({
    ompPath: async () => {
      const wanted = configuredOmpPath();
      return (await findOmp(wanted)) ?? wanted;
    },
  });
  context.subscriptions.push(
    view,
    view.register(),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("trama.ompChat")) {
        view.model.refresh();
        ompChatGeneralSettingsChanged();
      }
      if (event.affectsConfiguration("trama.theme")) view.model.themeChanged();
    }),
  );
  void guarded(() => setOmpChat({ client, view: view.model }, context.workspaceState, () => findProject()?.root))().finally(() => view.model.refresh());
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
  setBundledCliDir(dirname(executable));
  env.description = "Puts the trama CLI shipped with the Trama extension on the PATH, for agents.";
  env.prepend("PATH", `${dirname(executable)}${delimiter}`);
}

export async function deactivate(): Promise<void> {
  controller?.dispose();
  controller = undefined;
  // The window closes or reloads: the processes of omp Chat's conversations stop with it, and their work waits for the resume.
  await windowClosed();
}
