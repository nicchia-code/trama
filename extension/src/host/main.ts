import { existsSync, watch, type FSWatcher } from "node:fs";
import { delimiter, dirname } from "node:path";
import * as vscode from "vscode";
import { drainAsync } from "../../../src/core/steps";
import { syncRequirementSkillsSteps } from "../../../src/core/requirement-skills";
import { editorEvent, measuredWatcher, startPerformanceChannel, timerWork } from "./performance";
import { ActivitiesItem, SHOW_ACTIVITIES_COMMAND } from "./activities-item";
import { watchAnnouncements } from "./announcements";
import { agentTabName, watchAgentTerminal, configuredOmpPath, configuredSkillsDir, configuredSystemCertificates, ompChatSettingsChanged, ownsAgentTerminal, roundClosed, roundOpened, setBundledCliDir, setOmpChat, setOverlayStorage, settings, windowClosed } from "./agent";
import { Controller, describeError } from "./controller";
import { startExecutionCheck } from "./execution-check";
import { DesignRequests } from "./design-requests";
import { bundledTrama, setExtensionId } from "./bundled";
import { startCursorApiKey } from "./cursor-api-key";
import { startNtfyToken } from "./ntfy-token";
import { findProject, onProjectsChanged, trackProjects } from "./project";
import { GitDirectories } from "./git-directories";
import { ProjectOrigin } from "./origin";
import { SoloModeState } from "./solo-mode";
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
import { configuredOmpProgram, forgetOmp, ompProgram, setUpdateStore } from "./omp-update";
import { bundleStaleAsync, loadBundleStateAsync, setSystemCertificatesSetting } from "./system-certificates";
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

/** Registers a command of the extension: running it is an operation of the host started by an event of the editor, named by the command. */
function register(command: string, handler: (...args: never[]) => unknown): vscode.Disposable {
  return vscode.commands.registerCommand(command, editorEvent(command, handler as (...args: unknown[]) => unknown));
}

export function activate(context: vscode.ExtensionContext): void {
  setExtensionId(context.extension.id);
  // The channel of the diagnostics comes first, so the operations of the activation itself are measured.
  context.subscriptions.push(startPerformanceChannel());
  // Which folders hold a project is kept in memory from the start: `findProject` reads no file of `.trama/` after this.
  context.subscriptions.push(trackProjects());
  const session = new QuestionSession(() => trama.revealForQuestions(), agentTabName, { opened: roundOpened, closed: roundClosed });
  // The Manager's people live only in this window's global state, never synchronised: `setKeysForSync` is never called for `trama.team`.
  const people = new People(context.globalState);
  const questions = new EditorQuestions(() => findProject(), session, ownsAgentTerminal, people, (project) => trama.issueStates(project));
  // One watcher of `.trama/` for the extension's whole life: the panel follows it while open, the design requests always.
  setOverlayStorage(context.globalStorageUri);
  setUpdateStore(context.globalState);
  setYoloNoticeStore(context.globalState);
  // Its events are operations of the host started by a change of files: measured, and written to `Trama Performance` when they take longer than 200 ms.
  const tramaFiles = measuredWatcher(vscode.workspace.createFileSystemWatcher("**/.trama/**"));
  const requests = new DesignRequests(context.workspaceState, tramaFiles, undefined, undefined, () => trama.launch({ kind: "implement-all" }));
  // One picture of the project per window, built after the pause of the watcher and at a change of the folders, and shared by the panel and the side menu.
  const picture = new WindowPicture(tramaFiles);
  // What the window learns from git and rarely changes is read once per window and again only when git's configuration changes (`quality#General`): the git directories, the origin of the project and Solo mode.
  const gitDirectories = new GitDirectories();
  const origin = new ProjectOrigin(gitDirectories);
  const soloState = new SoloModeState(gitDirectories);
  const trama = new Controller(context.extensionUri, session, picture, requests, context.workspaceState, people, context.storageUri?.fsPath, gitDirectories, origin, soloState);
  controller = trama;
  // A worktree of the PR Check left behind by a window that closed or crashed while checking is removed now, with no report and no message.
  void trama.removeLeftoverWorktrees();
  // The item of the ghosts with no Board column lives with the extension, so it shows with the panel closed too.
  const activities = new ActivitiesItem(picture, (announcement) => trama.openGhostDetails(announcement));
  // Merge of Solo mode: its flow and the follow-up of the merge Trama started, for the whole life of the window.
  const soloMerge = new SoloMerge((action) => trama.launch(action), gitDirectories);
  // The side menu of the Activity Bar icon: it takes the same picture, so it stays up to date with the panel closed.
  const menu = new MenuView(context.extensionUri, trama, picture, soloMerge, origin, tramaFiles);
  context.subscriptions.push(
    tramaFiles,
    picture,
    picture.register(),
    gitDirectories,
    origin.start(),
    soloState.start(),
    // The window's project may change (a folder added, a `.trama` created): the git directories follow it; the same project resolves nothing again.
    onProjectsChanged(() => gitDirectories.follow()),
    soloMerge,
    soloMerge.start(),
    menu,
    menu.register(),
    register("trama.open", guarded(() => trama.open())),
    ...Object.entries(SHOW_COMMANDS).map(([command, view]) => register(command, guarded(() => trama.show(view)))),
    // Internal: the missing-omp notice's Open Settings runs it; it is not in the palette.
    register("trama.openSettings", guarded(() => trama.openSettings())),
    // Internal: the missing-omp notice's Install omp runs it; it is not in the palette.
    register("trama.installOmp", guarded(async () => trama.installOmp())),
    register("trama.sendDesignRequest", guarded((uri?: vscode.Uri) => requests.send(uri))),
    register("trama.import", guarded(() => trama.importFromCode())),
    register("trama.updateSkills", guarded(async () => trama.updateSkills())),
    register("trama.refreshSystemCertificates", guarded(() => trama.refreshSystemCertificatesCommand())),
    watchAgentTerminal(),
    activities,
    register(SHOW_ACTIVITIES_COMMAND, () => activities.show()),
    questions,
    requests,
    watchRequirements(),
    vscode.workspace.onDidChangeConfiguration(editorEvent("settings changed", (event) => {
      // A changed `trama.ompPath` means another omp: the module searches it again and the outcome of the last update check no longer holds.
      if (event.affectsConfiguration("trama.ompPath")) forgetOmp();
      if (event.affectsConfiguration("trama")) trama.settingsChanged(event.affectsConfiguration("trama.ompPath"));
      // System Certificates: turned on, the bundle is exported; turned off, only omp is checked again. The processes started afterwards follow the new value.
      if (event.affectsConfiguration("trama.systemCertificates")) void trama.systemCertificatesChanged();
    })),
  );
  // The window opens the project: its git directories, and through them its origin, are read now, asynchronously.
  gitDirectories.follow();
  exposeBundledCli(context);
  // System Certificates: the bundle on disk is read into the state, and with the mode on and the bundle missing or older than 24 hours it is exported in the background: it never holds the activation or a launch.
  setSystemCertificatesSetting(configuredSystemCertificates);
  void editorEvent("read system certificates", async () => {
    await loadBundleStateAsync();
    if (configuredSystemCertificates() && (await bundleStaleAsync())) await trama.exportSystemCertificates("automatic");
  })();
  // The Cursor API key is read now and kept in memory; a conversation that starts or resumes waits for that first read, so it gets the key too.
  const cursorKey = startCursorApiKey(context.secrets, (message) => void vscode.window.showErrorMessage(message));
  context.subscriptions.push({ dispose: () => void cursorKey.then((subscription) => subscription.dispose()) });
  // The access token of the ntfy server is read the same way; the notifier reads it when it makes a request.
  const ntfyTokenRead = startNtfyToken(context.secrets, (message) => void vscode.window.showErrorMessage(message));
  context.subscriptions.push({ dispose: () => void ntfyTokenRead.then((subscription) => subscription.dispose()) });
  // The window follows its conversations and General from here on: only now can the announcements of agents nobody follows be told from those it resumes.
  const orphans = watchAnnouncements(() => findProject()?.root, startOmpChat(context, cursorKey, origin));
  // The first execution check follows the withdrawal of the orphan ghosts.
  context.subscriptions.push(orphans, startExecutionCheck(() => findProject()?.root, picture, orphans.done, () => soloMerge.check()));
}

/**
 * omp Chat: the view of the conversations and the ACP client they stand on. The conversations the window saved before resume once both exist, and the context key
 * that shows the view follows the settings (`trama.ompChat`) and the conversations from the start. The returned promise settles when the window has read the
 * conversations it will resume and its General (they are registered as followed before the sessions reopen), not when the sessions are back.
 */
function startOmpChat(context: vscode.ExtensionContext, cursorKeyRead: Promise<unknown>, origin: ProjectOrigin): Promise<void> {
  const savedIds = () => readSavedConversations(context.workspaceState.get(CONVERSATIONS_KEY)).entries.map((entry) => entry.id);
  // The usage of the subscription: `omp usage --json` in the folder of the panel (General's, also when General is not there), with the program General runs as (`tech#omp-chat`).
  const usage = new OmpUsage(ompUsageRunner({ ompPath: configuredOmpPath, findOmp: configuredOmpProgram, folder: () => findProject()?.root }));
  const view = new OmpChatView(context.extensionUri, () => findProject()?.root, savedIds, context.globalState, origin, usage);
  // `trama.ompPath` is application-scoped: only the user value counts, read by `configuredOmpPath`, as for every terminal and the model list.
  // The program is the one the launches run, as the module keeps it (a conversation that resumes after a reload has had no launch before it).
  const client = new OmpClient({
    ompPath: async () => {
      await cursorKeyRead;
      const wanted = configuredOmpPath();
      return (await ompProgram(wanted)) ?? wanted;
    },
  });
  context.subscriptions.push(
    view,
    view.register(),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("trama.ompChat")) {
        view.model.refresh();
        ompChatSettingsChanged();
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
      void timerWork("regenerate Requirement skills", async () => {
        try {
          // The files are handled in steps that give the thread back, so a regeneration never holds the host.
          const result = await drainAsync(syncRequirementSkillsSteps(project, [configuredSkillsDir()]));
          if (result.specsSkill.state === "kept") void vscode.window.showWarningMessage(`Trama: the trama-specs skill was not updated: ${result.specsSkill.problem}`);
        } catch (err) {
          void vscode.window.showErrorMessage(`Trama: could not regenerate the Requirement skills: ${describeError(err)}`);
        }
      });
    }, SKILL_SYNC_DEBOUNCE_MS));
  };
  const watched = measuredWatcher(watcher);
  watched.onDidCreate(sync);
  watched.onDidChange(sync);
  watched.onDidDelete(sync);
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
