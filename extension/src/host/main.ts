import * as vscode from "vscode";
import { watchAgentTerminal } from "./agent";
import { Controller, describeError } from "./controller";
import { isCursor } from "./cursor";
import { ensureCursorMcp, tramaExecutable } from "./mcp-config";
import { findProject } from "./project";
import { registerTramaTools } from "./tools";

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
    vscode.commands.registerCommand("trama.scan", guarded(() => trama.pickAndScan())),
    vscode.commands.registerCommand("trama.updateSkills", guarded(async () => trama.updateSkills())),
    watchAgentTerminal(),
    registerTramaTools(findProject),
  );
  setUpCursor(context.extensionPath);
}

export function deactivate(): void {
  controller?.dispose();
  controller = undefined;
}
