import { existsSync, watch, type FSWatcher } from "node:fs";
import { delimiter, dirname } from "node:path";
import * as vscode from "vscode";
import { syncRequirementSkills } from "../../../src/core/requirement-skills";
import { watchAnnouncements } from "./announcements";
import { agentName, watchAgentTerminal, configuredSkillsDir } from "./agent";
import { Controller, describeError } from "./controller";
import { DesignRequests } from "./design-requests";
import { bundledTrama } from "./cursor";
import { detectLanguageName } from "./language";
import { findProject, installCopilotHooks } from "./project";
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

/** A "Trama" button in the status bar that runs Open Trama. */
function statusBarItem(): vscode.StatusBarItem {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  item.text = "Trama";
  item.tooltip = "Open Trama";
  item.command = "trama.open";
  item.show();
  return item;
}

function watchAutopilotTicks(): vscode.Disposable {
  const timer = setInterval(() => void controller?.autopilotTick(), 400);
  return new vscode.Disposable(() => clearInterval(timer));
}

export function activate(context: vscode.ExtensionContext): void {
  const session = new QuestionSession(() => trama.revealForQuestions(), agentName);
  const questions = new EditorQuestions(() => findProject(), session);
  // One watcher of `.trama/` for the extension's whole life: the panel follows it while open, the design requests always.
  const tramaFiles = vscode.workspace.createFileSystemWatcher("**/.trama/**");
  const requests = new DesignRequests(context.workspaceState, tramaFiles, undefined, undefined, () => trama.launch({ kind: "implement-all" }));
  const trama = new Controller(context.extensionUri, session, tramaFiles, context.globalStorageUri, questions, requests);
  controller = trama;
  context.subscriptions.push(
    tramaFiles,
    statusBarItem(),
    vscode.commands.registerCommand("trama.open", guarded(() => trama.open())),
    vscode.commands.registerCommand("trama.sendDesignRequest", guarded((uri?: vscode.Uri) => requests.send(uri))),
    vscode.commands.registerCommand("trama.scan", guarded(() => trama.pickAndScan())),
    vscode.commands.registerCommand("trama.import", guarded(() => trama.launch({ kind: "import" }))),
    vscode.commands.registerCommand("trama.updateSkills", guarded(async () => trama.updateSkills())),
    watchAgentTerminal(),
    watchAnnouncements(() => findProject()?.root),
    questions,
    requests,
    watchRequirements(),
    watchAutopilotTicks(),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("trama")) trama.settingsChanged();
    }),
  );
  void guarded(() => installCopilotHooks(context.globalStorageUri))();
  void detectFirstStartLanguage(context);
}

/** `trama.languageDetected` in global state: the agent language was chosen on the first start, once per editor. */
const LANGUAGE_DETECTED_KEY = "trama.languageDetected";

/**
 * On the first start, saves the agent language in the user settings when they have none: the operating system's
 * language, else the editor's, else English. Silent: a failed write is retried at the next start. A value the user
 * already has is never touched, and the flag is set without writing.
 */
async function detectFirstStartLanguage(context: vscode.ExtensionContext): Promise<void> {
  if (context.globalState.get<boolean>(LANGUAGE_DETECTED_KEY)) return;
  const user = vscode.workspace.getConfiguration("trama").inspect<string>("language")?.globalValue;
  if (user !== undefined && user !== null && !(typeof user === "string" && user.trim() === "")) {
    await context.globalState.update(LANGUAGE_DETECTED_KEY, true);
    return;
  }
  let intlLocale: string | undefined;
  try {
    intlLocale = Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    intlLocale = undefined;
  }
  const name = detectLanguageName({ env: process.env, intlLocale, editorLanguage: vscode.env.language });
  try {
    await vscode.workspace.getConfiguration("trama").update("language", name, vscode.ConfigurationTarget.Global);
  } catch {
    return;
  }
  await context.globalState.update(LANGUAGE_DETECTED_KEY, true);
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
