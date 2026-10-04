import { delimiter, dirname } from "node:path";
import * as vscode from "vscode";
import { syncRequirementSkills } from "../../../src/core/requirement-skills";
import { watchAnnouncements } from "./announcements";
import { notices, watchCursorChatNotices } from "./notice-host";
import { agentName, watchAgentTerminal, configuredSkillsDir } from "./agent";
import { Controller, describeError } from "./controller";
import { DesignRequests } from "./design-requests";
import { bundledTrama } from "./cursor";
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
  );
  exposeBundledCli(context);
}

/**
 * The developer edits Requirement files directly, so the generated `trama-req-*` skills are regenerated on every
 * change under `.trama/requirements/`, also when the Trama panel is closed.
 */
function watchRequirements(): vscode.Disposable {
  const watcher = vscode.workspace.createFileSystemWatcher("**/.trama/requirements/*.md");
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
 * Agents run `trama` in the editor's terminals (the "Trama agent" terminal, Copilot's terminal tool). When the
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
