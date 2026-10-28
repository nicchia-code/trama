import { existsSync, watch, type FSWatcher } from "node:fs";
import { delimiter, dirname } from "node:path";
import * as vscode from "vscode";
import { syncRequirementSkills } from "../../../src/core/requirement-skills";
import { ActivitiesItem, SHOW_ACTIVITIES_COMMAND } from "./activities-item";
import { watchAnnouncements } from "./announcements";
import { agentTabName, watchAgentTerminal, configuredOmpPath, configuredSkillsDir, configuredSystemCertificates, ompChatGeneralSettingsChanged, ownsAgentTerminal, roundClosed, roundOpened, setBundledCliDir, setOmpChat, setOverlayStorage, settings, windowClosed } from "./agent";
import { Controller, describeError } from "./controller";
import { startExecutionCheck } from "./execution-check";
import { DesignRequests } from "./design-requests";
import { bundledTrama, setExtensionId } from "./bundled";
import { startCursorApiKey } from "./cursor-api-key";
import { startNtfyToken } from "./ntfy-token";
import { findProject } from "./project";
import { QuestionSession } from "./question-session";
import { EditorQuestions } from "./questions";
import { People } from "./team/people";
import { WindowPicture } from "./picture";
import { CONVERSATIONS_KEY, readSavedConversations } from "../../../src/core/omp-chat-conversation";
import { OmpClient } from "./omp-chat/client";
import { OmpChatView } from "./omp-chat/view";
import { OmpUsage, ompUsageRunner } from "./omp-chat/usage";
import { MenuView } from "./menu/view";
import { SoloMerge } from "./solo-merge";
import { SHOW_COMMANDS } from "../menu-protocol";
import { findConfiguredOmp, findOmp, forgetUpdateCheck, setUpdateStore } from "./omp-update";
import { bundleStale, loadBundleState, setSystemCertificatesSetting } from "./system-certificates";
import { setYoloNoticeStore } from "./yolo-notice";

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
  setExtensionId(context.extension.id);
  const session = new QuestionSession(() => trama.revealForQuestions(), agentTabName, { opened: roundOpened, closed: roundClosed });
  // The Manager's people live only in this window's global state, never synchronised: `setKeysForSync` is never called for `trama.team`.
  const people = new People(context.globalState);
  const questions = new EditorQuestions(() => findProject(), session, ownsAgentTerminal, people, (project) => trama.issueStates(project));
  // One watcher of `.trama/` for the extension's whole life: the panel follows it while open, the design requests always.
  setOverlayStorage(context.globalStorageUri);
  setUpdateStore(context.globalState);
  setYoloNoticeStore(context.globalState);
  const tramaFiles = vscode.workspace.createFileSystemWatcher("**/.trama/**");
  const requests = new DesignRequests(context.workspaceState, tramaFiles, undefined, undefined, () => trama.launch({ kind: "implement-all" }));
  // One picture of the project per window, built after the pause of the watcher and at a change of the folders, and shared by the panel and the side menu.
  const picture = new WindowPicture(tramaFiles);
  const trama = new Controller(context.extensionUri, session, picture, requests, context.workspaceState, people, context.storageUri?.fsPath);
  controller = trama;
  // A worktree of the PR Check left behind by a window that closed or crashed while checking is removed now, with no report and no message.
  void trama.removeLeftoverWorktrees();
  // The item of the ghosts with no Board column lives with the extension, so it shows with the panel closed too.
  const activities = new ActivitiesItem(() => findProject()?.root, tramaFiles, (announcement) => trama.openGhostDetails(announcement));
  // Merge of Solo mode: its flow and the follow-up of the merge Trama started, for the whole life of the window.
  const soloMerge = new SoloMerge((action) => trama.launch(action));
  // The side menu of the Activity Bar icon: it takes the same picture, so it stays up to date with the panel closed.
  const menu = new MenuView(context.extensionUri, trama, picture, soloMerge);
  context.subscriptions.push(
    tramaFiles,
    picture,
    picture.register(),
    soloMerge,
    soloMerge.start(),
    menu,
    menu.register(),
    vscode.commands.registerCommand("trama.open", guarded(() => trama.open())),
    ...Object.entries(SHOW_COMMANDS).map(([command, view]) => vscode.commands.registerCommand(command, guarded(() => trama.show(view)))),
    // Internal: the missing-omp notice's Open Settings runs it; it is not in the palette.
    vscode.commands.registerCommand("trama.openSettings", guarded(() => trama.openSettings())),
    // Internal: the missing-omp notice's Install omp runs it; it is not in the palette.
    vscode.commands.registerCommand("trama.installOmp", guarded(async () => trama.installOmp())),
    vscode.commands.registerCommand("trama.sendDesignRequest", guarded((uri?: vscode.Uri) => requests.send(uri))),
    vscode.commands.registerCommand("trama.import", guarded(() => trama.importFromCode())),
    vscode.commands.registerCommand("trama.updateSkills", guarded(async () => trama.updateSkills())),
    vscode.commands.registerCommand("trama.refreshSystemCertificates", guarded(() => trama.refreshSystemCertificatesCommand())),
    watchAgentTerminal(),
    activities,
    vscode.commands.registerCommand(SHOW_ACTIVITIES_COMMAND, () => activities.show()),
    questions,
    requests,
    watchRequirements(),
    vscode.workspace.onDidChangeConfiguration((event) => {
      // A changed `trama.ompPath` means another omp: the outcome of the last update check no longer holds.
      if (event.affectsConfiguration("trama.ompPath")) forgetUpdateCheck();
      if (event.affectsConfiguration("trama")) trama.settingsChanged(event.affectsConfiguration("trama.ompPath"));
      // System Certificates: turned on, the bundle is exported; turned off, only omp is checked again. The processes started afterwards follow the new value.
      if (event.affectsConfiguration("trama.systemCertificates")) void trama.systemCertificatesChanged();
    }),
  );
  exposeBundledCli(context);
  // System Certificates: the bundle on disk is read into the state, and with the mode on and the bundle missing or older than 24 hours it is exported in the background: it never holds the activation or a launch.
  setSystemCertificatesSetting(configuredSystemCertificates);
  loadBundleState();
  if (configuredSystemCertificates() && bundleStale()) void trama.exportSystemCertificates("automatic");
  // The Cursor API key is read now and kept in memory; a conversation that starts or resumes waits for that first read, so it gets the key too.
  const cursorKey = startCursorApiKey(context.secrets, (message) => void vscode.window.showErrorMessage(message));
  context.subscriptions.push({ dispose: () => void cursorKey.then((subscription) => subscription.dispose()) });
  // The access token of the ntfy server is read the same way; the notifier reads it when it makes a request.
  const ntfyTokenRead = startNtfyToken(context.secrets, (message) => void vscode.window.showErrorMessage(message));
  context.subscriptions.push({ dispose: () => void ntfyTokenRead.then((subscription) => subscription.dispose()) });
  // The window follows its conversations and General from here on: only now can the announcements of agents nobody follows be told from those it resumes.
  const orphans = watchAnnouncements(() => findProject()?.root, startOmpChat(context, cursorKey));
  // The first execution check follows the withdrawal of the orphan ghosts.
  context.subscriptions.push(orphans, startExecutionCheck(() => findProject()?.root, tramaFiles, orphans.done, () => soloMerge.check()));
}

/**
 * omp Chat: the view of the conversations and the ACP client they stand on. The conversations the window saved before resume once both exist, and the context key
 * that shows the view follows the settings (`trama.ompChat`) and the conversations from the start. The returned promise settles when the window has read the
 * conversations it will resume and its General (they are registered as followed before the sessions reopen), not when the sessions are back.
 */
function startOmpChat(context: vscode.ExtensionContext, cursorKeyRead: Promise<unknown>): Promise<void> {
  const savedIds = () => readSavedConversations(context.workspaceState.get(CONVERSATIONS_KEY)).entries.map((entry) => entry.id);
  // The usage of the subscription: `omp usage --json` in the folder of the panel (General's, also when General is not there), with the program General runs as (`tech#omp-chat`).
  const usage = new OmpUsage(ompUsageRunner({ ompPath: configuredOmpPath, findOmp: findConfiguredOmp, folder: () => findProject()?.root }));
  const view = new OmpChatView(context.extensionUri, () => findProject()?.root, savedIds, context.globalState, usage);
  // `trama.ompPath` is application-scoped: only the user value counts, read by `configuredOmpPath`, as for every terminal and the model list.
  // The program is the one the launches run: found as `findOmp` finds it (a conversation that resumes after a reload has had no launch before it).
  const client = new OmpClient({
    ompPath: async () => {
      await cursorKeyRead;
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
  // `setOmpChat` registers the saved conversations and reads General before its first wait: from here the window follows them, whatever the sessions do.
  const resumed = guarded(() => setOmpChat({ client, view: view.model }, context.workspaceState, () => findProject()?.root))();
  void resumed.finally(() => view.model.refresh());
  return Promise.resolve();
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
 * Agents run `trama` in the editor's terminals (the agent terminals Trama opens). When the
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
