import * as vscode from "vscode";
import { watchAgentTerminal } from "./agent";
import { Controller, describeError } from "./controller";

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

export function activate(context: vscode.ExtensionContext): void {
  const trama = new Controller(context.extensionUri);
  controller = trama;
  context.subscriptions.push(
    vscode.commands.registerCommand("trama.open", guarded(() => trama.open())),
    vscode.commands.registerCommand("trama.init", guarded(() => trama.init())),
    vscode.commands.registerCommand("trama.design", guarded(() => trama.launch({ kind: "design" }))),
    vscode.commands.registerCommand("trama.scan", guarded(() => trama.pickAndScan())),
    vscode.commands.registerCommand("trama.updateSkills", guarded(async () => trama.updateSkills())),
    watchAgentTerminal(),
  );
}

export function deactivate(): void {
  controller?.dispose();
  controller = undefined;
}
