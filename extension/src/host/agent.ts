import * as vscode from "vscode";
import { basename } from "node:path";
import { announce, newTerminalId, TERMINAL_ENV } from "../../../src/core/announcements";
import { TramaError } from "../../../src/core/errors";
import { projectAt } from "../../../src/core/store";
import { releaseTasks } from "../../../src/core/work";
import { QUESTION_ENDPOINT_ENV } from "../../../src/core/question-channel";
import { isCursor } from "./cursor";
import { withdrawWaiting } from "./announcements";
import { agentCommandLine, shellFamily } from "./quote";
import { questionEndpoint } from "./questions";
import { withLanguage } from "./prompts";
import { boardCounts } from "./board-counts";
import { commandOutcome } from "./end-notices";
import { endNotices } from "./notice-host";

const TERMINAL_NAME = "Trama agent";

export const settings = () => vscode.workspace.getConfiguration("trama");

export const configuredAgentCommand = (): string => settings().get<string>("agentCommand", "").trim();

/** The folder the developer chose for Trama's skills (`trama.skillsDir`), relative to the project root unless absolute. */
export const configuredSkillsDir = (): string => settings().get<string>("skillsDir", ".agents/skills").trim() || ".agents/skills";

/** The language the agent writes in (`trama.language`), as typed; empty when none is chosen. Read at every launch. */
export const configuredLanguage = (): string => settings().get<string>("language", "").trim();

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
  if (!isCursor()) {
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
/** The project folder the last terminal was started for, whose Tasks the agent may have taken. */
let lastRoot: string | undefined;
let commandRunning = false;
let lastQuestionEndpoint: string | undefined;
/**
 * Every terminal Trama started and is still open: its identity (`TRAMA_TERMINAL`, kept when the terminal is reused),
 * the project folder it was started for (any terminal may end a command that had taken Tasks) and the command line
 * Trama last typed into it. Only the end of that command line is the agent's command ending.
 */
const agentTerminals = new Map<vscode.Terminal, { id: string; root: string; line: string }>();

function releaseTakenTasks(root: string): void {
  try {
    releaseTasks(projectAt(root));
  } catch (err) {
    if (err instanceof TramaError) void vscode.window.showErrorMessage(`Trama: could not release the Tasks the agent had taken: ${err.message}`);
    else throw err;
  }
}

/** Follows the commands that start and end in the terminal Trama launches agents in. */
export function watchAgentTerminal(): vscode.Disposable {
  return vscode.Disposable.from(
    vscode.window.onDidStartTerminalShellExecution((e) => {
      if (e.terminal === lastTerminal && isTypedCommand(e.terminal, e.execution.commandLine.value)) commandRunning = true;
    }),
    vscode.window.onDidEndTerminalShellExecution((e) => {
      const info = agentTerminals.get(e.terminal);
      if (info === undefined) return;
      // A command ended in a terminal Trama started, so a Task marked as taken is released, whichever launch took it
      // (an earlier terminal may end while a later one runs: the Model releases every taken Task at once).
      // Without shell integration this event never comes, and the Tasks stay taken until the developer takes them back.
      releaseTakenTasks(info.root);
      // Only the end of the command Trama typed counts as the agent finishing; any other command, or an end that comes
      // without a command line, changes nothing here.
      if (!isTypedCommand(e.terminal, e.execution.commandLine.value)) return;
      if (e.terminal === lastTerminal) commandRunning = false;
      withdrawWaiting(info.root, info.id);
      endNotices.born(basename(info.root), commandOutcome(e.exitCode), () => boardCounts(projectAt(info.root)));
    }),
    vscode.window.onDidCloseTerminal((t) => {
      const info = agentTerminals.get(t);
      agentTerminals.delete(t);
      if (info !== undefined) withdrawWaiting(info.root, info.id);
      if (t === lastTerminal) {
        lastTerminal = undefined;
        commandRunning = false;
      }
    }),
  );
}

/** Whether `commandLine`, as the terminal reported it, is the line Trama last typed into `terminal`, compared after trimming. */
function isTypedCommand(terminal: vscode.Terminal, commandLine: string | undefined): boolean {
  const typed = agentTerminals.get(terminal)?.line;
  return typed !== undefined && commandLine !== undefined && commandLine.trim() === typed.trim();
}

function announceDesignRequest(root: string, title: string, terminal: string): void {
  try {
    announce(projectAt(root), { kind: "proposal", title, source: "request", terminal });
  } catch (err) {
    if (err instanceof TramaError) void vscode.window.showErrorMessage(`Trama: could not announce the Proposal: ${err.message}`);
    else throw err;
  }
}

/**
 * Sends `prompt` to the developer's agent: the editor's chat when `trama.agentLauncher` is "chat", otherwise the
 * agent command in the "Trama agent" terminal (a new one while the last is busy), asking for the command first if none is set.
 * `announceProposal` is the title of the Proposal a design request will make: with the terminal launcher it is announced
 * once the instruction is sent, so the Board shows its ghost at once. The chat has no end to follow, so it announces nothing.
 */
export async function launchAgent(root: string, instruction: string, announceProposal?: string): Promise<void> {
  const prompt = withLanguage(instruction, configuredLanguage());
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
  const endpoint = await questionEndpoint(root);
  if (!endpoint) throw new TramaError("The launching editor window's question channel is not available.");
  const reusable = previous !== undefined && lastRoot === root && lastQuestionEndpoint === endpoint && previous.exitStatus === undefined && previous.shellIntegration !== undefined && !commandRunning;
  // TRAMA_AGENT makes the CLI refuse the developer's commands (approve, reject, resolve) to the agent.
  const terminalId = (reusable ? agentTerminals.get(previous)?.id : undefined) ?? newTerminalId();
  const terminal = reusable ? previous : vscode.window.createTerminal({ name: TERMINAL_NAME, cwd: root, env: { TRAMA_AGENT: "1", [QUESTION_ENDPOINT_ENV]: endpoint, [TERMINAL_ENV]: terminalId } });
  const line = agentCommandLine(template, prompt, shellFamily(vscode.env.shell));
  agentTerminals.set(terminal, { id: terminalId, root, line });
  terminal.show();
  terminal.sendText(line);
  // The instruction is really written: the developer has put the agent back to work, so no notice about an earlier end
  // that still waits is needed (this is the model's agent-terminal.INSTRUCTION_SENT; the chat launcher never gets here).
  endNotices.cancelAll();
  lastTerminal = terminal;
  lastRoot = root;
  lastQuestionEndpoint = endpoint;
  commandRunning = true;
  if (announceProposal !== undefined) announceDesignRequest(root, announceProposal, terminalId);
}
