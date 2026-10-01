import * as vscode from "vscode";
import { agentCommandLine, shellFamily } from "./quote";

const TERMINAL_NAME = "Trama agent";

export const settings = () => vscode.workspace.getConfiguration("trama");

export const configuredAgentCommand = (): string => settings().get<string>("agentCommand", "").trim();

/**
 * The terminal of the last launch and whether a command is still running in it (an agent session usually is).
 * Typing a new command into a running agent would send it the command line as a message, so a busy terminal is
 * never reused. Without shell integration there is no way to know, so such a terminal is not reused either.
 */
let lastTerminal: vscode.Terminal | undefined;
let commandRunning = false;

/** Follows the commands that start and end in the terminal Trama launches agents in. */
export function watchAgentTerminal(): vscode.Disposable {
  return vscode.Disposable.from(
    vscode.window.onDidStartTerminalShellExecution((e) => {
      if (e.terminal === lastTerminal) commandRunning = true;
    }),
    vscode.window.onDidEndTerminalShellExecution((e) => {
      if (e.terminal === lastTerminal) commandRunning = false;
    }),
    vscode.window.onDidCloseTerminal((t) => {
      if (t === lastTerminal) {
        lastTerminal = undefined;
        commandRunning = false;
      }
    }),
  );
}

/** Runs the developer's agent command with `prompt` in the "Trama agent" terminal (a new one while the last is busy), asking for the command first if none is set. */
export async function launchAgent(root: string, prompt: string): Promise<void> {
  let template = configuredAgentCommand();
  if (template === "") {
    const entered = await vscode.window.showInputBox({
      title: "Trama: agent command",
      prompt: "Command that starts your coding agent. {prompt} is replaced by the quoted prompt (appended if missing).",
      placeHolder: "claude {prompt}    or    codex {prompt}",
      ignoreFocusOut: true,
      validateInput: (value) => (value.trim() === "" ? "Enter the command that starts your agent" : undefined),
    });
    if (entered === undefined) return;
    template = entered.trim();
    await settings().update("agentCommand", template, vscode.ConfigurationTarget.Global);
  }

  const previous = lastTerminal;
  const reusable = previous !== undefined && previous.exitStatus === undefined && previous.shellIntegration !== undefined && !commandRunning;
  // TRAMA_AGENT makes the CLI refuse the developer's commands (approve, reject, resolve) to the agent.
  const terminal = reusable ? previous : vscode.window.createTerminal({ name: TERMINAL_NAME, cwd: root, env: { TRAMA_AGENT: "1" } });
  terminal.show();
  terminal.sendText(agentCommandLine(template, prompt, shellFamily(vscode.env.shell)));
  lastTerminal = terminal;
  commandRunning = true;
}
