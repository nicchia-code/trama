import { delimiter, dirname } from "node:path";
import * as vscode from "vscode";
import { syncRequirementSkills } from "../../../src/core/requirement-skills";
import { watchAgentTerminal, configuredSkillsDir } from "./agent";
import { Controller, describeError } from "./controller";
import { isCursor } from "./cursor";
import { ensureCursorMcp, tramaExecutable } from "./mcp-config";
import { findProject } from "./project";
import { registerTramaTools } from "./tools";
import { EditorQuestions } from "./questions";

const SKILL_SYNC_DEBOUNCE_MS = 300;

let controller: Controller | undefined;

/** Runs a command and shows whatever fails to the developer instead of leaving a rejected promise. */
function guarded(action: () => Promise<void>): () => Promise<void> {
  return async () => {
    try {
      await action();
    } catch (err) {
      void vscode.window.showErrorMessage(`Trama: ${describeError(err)}`);
    }
  };
}

/** In Cursor the agent finds Trama's tools through `.cursor/mcp.json`; write it once a project exists. */
function setUpCursor(extensionPath: string): void {
  const project = findProject();
  if (!isCursor() || !project) return;
  const outcome = ensureCursorMcp(project, tramaExecutable(extensionPath));
  if (outcome === "written") void vscode.window.showInformationMessage("Trama: added the Trama MCP server to .cursor/mcp.json, so Cursor's agent can use Trama's tools. Enable it in Cursor Settings → MCP if Cursor asks.");
  if (outcome === "unreadable") void vscode.window.showWarningMessage("Trama: .cursor/mcp.json is not valid JSON, so the Trama MCP server was not added.");
}

export function activate(context: vscode.ExtensionContext): void {
  const trama = new Controller(context.extensionUri);
  controller = trama;
  const questions = new EditorQuestions(findProject);
  context.subscriptions.push(
    vscode.commands.registerCommand("trama.open", guarded(() => trama.open())),
    vscode.commands.registerCommand(
      "trama.init",
      guarded(async () => {
        await trama.init();
        setUpCursor(context.extensionPath);
      }),
    ),
    vscode.commands.registerCommand("trama.design", guarded(() => trama.launch({ kind: "design" }))),
    vscode.commands.registerCommand("trama.fix", guarded(() => trama.launch({ kind: "fix" }))),
    vscode.commands.registerCommand("trama.scan", guarded(() => trama.pickAndScan())),
    vscode.commands.registerCommand("trama.import", guarded(() => trama.launch({ kind: "import" }))),
    vscode.commands.registerCommand("trama.updateSkills", guarded(async () => trama.updateSkills())),
    watchAgentTerminal(),
    questions,
    registerTramaTools(findProject, questions.ask),
    watchRequirements(),
  );
  setUpCursor(context.extensionPath);
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
  const executable = tramaExecutable(context.extensionPath);
  const env = context.environmentVariableCollection;
  env.clear();
  if (executable === "trama") return;
  env.description = "Puts the trama CLI shipped with the Trama extension on the PATH, for agents.";
  env.prepend("PATH", `${dirname(executable)}${delimiter}`);
}

export function deactivate(): void {
  controller?.dispose();
  controller = undefined;
}
