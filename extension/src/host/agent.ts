import * as vscode from "vscode";
import { agentCommandLine, shellFamily } from "./quote";

const TERMINAL_NAME = "Trama agent";

export const settings = () => vscode.workspace.getConfiguration("trama");

export const configuredAgentCommand = (): string => settings().get<string>("agentCommand", "").trim();

/** Where the buttons send their prompt: a terminal command, or the agent chat built into the editor. */
export const agentLauncher = (): "terminal" | "chat" => (settings().get<string>("agentLauncher", "terminal") === "chat" ? "chat" : "terminal");

/** Whether a launch can happen without asking the developer anything first (used to decide on automatic scans). */
export const agentReady = (): boolean => agentLauncher() === "chat" || configuredAgentCommand() !== "";

/**
 * Starts a new agent-mode conversation in the editor's chat with `prompt` and sends it. `workbench.action.chat.open`
 * with `{ query, mode }` is how VS Code's own actions do it, but it is not a documented API, and Cursor's agent is a
 * different panel: in those cases, or if the command fails, the prompt goes to the clipboard instead.
 */
async function openChat(prompt: string): Promise<void> {
  if (!vscode.env.appName.toLowerCase().includes("cursor")) {
    try {
      await vscode.commands.executeCommand("workbench.action.chat.newChat");
      await vscode.commands.executeCommand("workbench.action.chat.open", { query: prompt, mode: "agent" });
      return;
    } catch {
      // Chat missing or disabled in this editor: the clipboard below still gets the prompt to the agent.
    }
  }
  await vscode.env.clipboard.writeText(prompt);
  void vscode.window.showInformationMessage("Trama: the prompt is on the clipboard. Paste it into your agent chat.");
}

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

/**
 * Sends `prompt` to the developer's agent: the editor's chat when `trama.agentLauncher` is "chat", otherwise the
 * agent command in the "Trama agent" terminal (a new one while the last is busy), asking for the command first if none is set.
 */
export async function launchAgent(root: string, prompt: string): Promise<void> {
  if (agentLauncher() === "chat") return openChat(prompt);
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
