import * as vscode from "vscode";
import { basename, dirname, join } from "node:path";
import { type AgentOrigin, announce, newTerminalId, TERMINAL_ENV } from "../../../src/core/announcements";
import { TramaError } from "../../../src/core/errors";
import { projectAt } from "../../../src/core/store";
import { releaseTasks } from "../../../src/core/work";
import { QUESTION_ENDPOINT_ENV } from "../../../src/core/question-channel";
import { bundledTrama, type ChatDelivery, isCursor, onCursorChatEvent, openCursorChat, toClipboard, withTramaPath } from "./cursor";
import { withdrawWaiting } from "./announcements";
import { ExternalRuns, externalScript, typedCommand } from "./external-terminal";
import { type ExternalWindow, type ReusableTerminal, runScripting, scriptingCommand } from "./external-reuse";
import { detectTerminal, openWindow, reusableKind, type WindowOrigin } from "./external-open";
import { agentCommandLine, type ShellFamily, shellFamily } from "./quote";
import { questionEndpoint } from "./questions";
import { buildScanPrompt, withLanguage } from "./prompts";
import { agentTemplate, canScan, effectiveAgent, KNOWN_AGENTS, knownCommand, type Models, type Role, roleOf, subAgentSentence, type TerminalAgent } from "./terminal-agent";

export const settings = () => vscode.workspace.getConfiguration("trama");

/** The custom agent command (`trama.agentCommand`). Application scope: only the user's settings count. */
export const configuredAgentCommand = (): string => settings().get<string>("agentCommand", "").trim();

/** The agent Trama starts in a terminal (`trama.terminalAgent`, or `custom` with `trama.agentCommand`); undefined when none is chosen yet. Application scope: only the user's settings count. */
export const configuredTerminalAgent = (): TerminalAgent | undefined => effectiveAgent(settings().get<string>("terminalAgent", ""), configuredAgentCommand());

/** The command that opens the external terminal instead of the detected one (`trama.externalTerminalCommand`). Application scope: only the user's settings count. */
export const configuredExternalTerminalCommand = (): string => settings().get<string>("externalTerminalCommand", "").trim();

/** The folder the developer chose for Trama's skills (`trama.skillsDir`), relative to the project root unless absolute. */
export const configuredSkillsDir = (): string => settings().get<string>("skillsDir", ".agents/skills").trim() || ".agents/skills";

/** The language the agent writes in (`trama.language`), as typed; empty when none is chosen. Read at every launch. */
export const configuredLanguage = (): string => settings().get<string>("language", "").trim();

/**
 * The agent that asked a question round, when it can be told: Cursor's chat agent, or the program of the agent command
 * for one started in a terminal of Trama.
 */
export function agentName(context: { fromTramaTerminal?: boolean; fromCursorChat?: boolean }): string | null {
  if (context.fromCursorChat === true) return "Cursor";
  if (context.fromTramaTerminal !== true) return null;
  const agent = configuredTerminalAgent();
  const command = agent === undefined ? "" : (knownCommand(agent) ?? configuredAgentCommand());
  const program = command.split(/\s+/)[0] ?? "";
  return program === "" ? null : basename(program);
}

/**
 * Where the buttons send their prompt: `auto` (the default) is the chat in Cursor and the integrated terminal (in the
 * terminal area) elsewhere, never the editor tab nor the external one; `terminal`, `terminal-tab`, `external-terminal`
 * or `chat` chosen by hand always win. Application scope: only the user's settings count, never a project's.
 */
export type AgentLauncher = "terminal" | "terminal-tab" | "external-terminal" | "chat";

export function agentLauncher(): AgentLauncher {
  const chosen = settings().get<string>("agentLauncher", "auto");
  if (chosen === "terminal" || chosen === "terminal-tab" || chosen === "external-terminal" || chosen === "chat") return chosen;
  return isCursor() ? "chat" : "terminal";
}

/** Whether a launch can happen without asking the developer anything first (used to decide on automatic scans). */
export const agentReady = (): boolean => {
  if (agentLauncher() === "chat") return true;
  const agent = configuredTerminalAgent();
  return agent !== undefined && (agent !== "custom" || configuredAgentCommand() !== "");
};

/**
 * Starts a new agent-mode conversation in the editor's chat with `prompt`. Cursor has its own chain of steps. Elsewhere
 * `workbench.action.chat.open` with `{ query, mode }` is how VS Code's own actions do it, but it is not a documented
 * API: if it fails, the prompt goes to the clipboard instead.
 */
async function openChat(root: string, prompt: string, selfSendingOnly: boolean, canSend: () => boolean): Promise<ChatDelivery> {
  if (!canSend()) return "not-sent";
  if (isCursor()) return openCursorChat(root, withTramaPath(prompt), selfSendingOnly, canSend);
  try {
    await vscode.commands.executeCommand("workbench.action.chat.newChat");
    if (!canSend()) return "not-sent";
    await vscode.commands.executeCommand("workbench.action.chat.open", { query: prompt, mode: "agent" });
    return "sent";
  } catch {
    if (!canSend()) return "not-sent";
    // Chat missing or disabled in this editor: the developer must paste the prompt from the clipboard.
    return toClipboard(prompt);
  }
}

/**
 * The terminal of the last launch and whether a command is still running in it (an agent session usually is).
 * Typing a new command into a running agent would send it the command line as a message, so a busy terminal is
 * never reused. Without shell integration there is no way to know, so such a terminal is not reused either.
 */
let lastTerminal: vscode.Terminal | undefined;
/** The project folder the last terminal was started for, whose Tasks the agent may have taken, and its name: a free terminal is reused only for the same name. */
let lastRoot: string | undefined;
let lastName: string | undefined;
let commandRunning = false;
let lastQuestionEndpoint: string | undefined;
/**
 * The last agent terminal Trama opened as an editor tab, its name and the column of the group it opened in. The tab does
 * not take the focus, so the active group does not say where it went: the column comes from the first tab change after
 * the creation that opens a terminal tab labelled with that name. The API does not tie a `TabInputTerminal` tab to its
 * `Terminal`, so a tab the developer moves is not followed.
 */
let lastTab: { terminal: vscode.Terminal; name: string; column: vscode.ViewColumn | undefined } | undefined;

/** The group a new agent tab opens in: the previous tab's, while that terminal and a group with its column exist; otherwise beside the active one. */
function tabColumn(): vscode.ViewColumn {
  const column = lastTab !== undefined && agentTerminals.has(lastTab.terminal) && lastTab.terminal.exitStatus === undefined ? lastTab.column : undefined;
  return column !== undefined && vscode.window.tabGroups.all.some((group) => group.viewColumn === column) ? column : vscode.ViewColumn.Beside;
}
/**
 * Every terminal Trama started and is still open: its identity (`TRAMA_TERMINAL`, kept when the terminal is reused),
 * the project folder it was started for (any terminal may end a command that had taken Tasks) and the command line
 * Trama last typed into it. Only the end of that command line is the agent's command ending.
 */
const agentTerminals = new Map<vscode.Terminal, { id: string; root: string; line: string }>();

function releaseTakenTasks(root: string, origin: AgentOrigin): void {
  try {
    releaseTasks(projectAt(root), origin);
  } catch (err) {
    if (err instanceof TramaError) void vscode.window.showErrorMessage(`Trama: could not release the Tasks the agent had taken: ${err.message}`);
    else throw err;
  }
}

/**
 * Follows the commands that start and end in the terminals Trama launches agents in, and the turns of Trama's
 * conversations in Cursor's chat. The end of a terminal's command releases the Tasks taken there.
 */
export function watchAgentTerminal(): vscode.Disposable {
  return vscode.Disposable.from(
    vscode.window.onDidStartTerminalShellExecution((e) => {
      if (e.terminal === lastTerminal && isTypedCommand(e.terminal, e.execution.commandLine.value)) commandRunning = true;
    }),
    vscode.window.onDidEndTerminalShellExecution((e) => {
      const info = agentTerminals.get(e.terminal);
      if (info === undefined) return;
      // Without shell integration this event never comes, and the Tasks stay taken until the developer takes them back.
      // Only the end of the command Trama typed counts as the agent finishing; any other command, or an end that comes
      // without a command line, changes nothing here, not even the Tasks this terminal had taken.
      if (!isTypedCommand(e.terminal, e.execution.commandLine.value)) return;
      releaseTakenTasks(info.root, { terminal: info.id });
      withdrawWaiting(info.root, (a) => a.terminal === info.id);
      if (e.terminal === lastTerminal) commandRunning = false;
    }),
    onCursorChatEvent((e) => {
      if (e.event !== "PROMPT_SUBMITTED") releaseTakenTasks(e.root, { chat: "cursor" });
    }),
    vscode.window.onDidCloseTerminal((t) => {
      const info = agentTerminals.get(t);
      agentTerminals.delete(t);
      if (info !== undefined) withdrawWaiting(info.root, (a) => a.terminal === info.id);
      if (t === lastTerminal) {
        lastTerminal = undefined;
        commandRunning = false;
      }
    }),
    vscode.window.tabGroups.onDidChangeTabs((e) => {
      if (lastTab === undefined || lastTab.column !== undefined) return;
      const name = lastTab.name;
      const tab = e.opened.find((t) => t.input instanceof vscode.TabInputTerminal && t.label === name);
      if (tab !== undefined) lastTab.column = tab.group.viewColumn;
    }),
  );
}

/** Whether `commandLine`, as the terminal reported it, is the line Trama last typed into `terminal`, compared after trimming. */
function isTypedCommand(terminal: vscode.Terminal, commandLine: string | undefined): boolean {
  const typed = agentTerminals.get(terminal)?.line;
  return typed !== undefined && commandLine !== undefined && commandLine.trim() === typed.trim();
}

/** What a design request announces: its title, or, to rework the stale Proposal of a Drift, the title and that Drift. */
export type DesignAnnouncement = string | { title: string; drift: string };

function announceDesignRequest(root: string, request: DesignAnnouncement, terminal: string): void {
  try {
    const { title, drift } = typeof request === "string" ? { title: request, drift: undefined } : request;
    announce(projectAt(root), { kind: "proposal", title, source: "request", terminal, ...(drift ? { drift } : {}) });
  } catch (err) {
    if (err instanceof TramaError) void vscode.window.showErrorMessage(`Trama: could not announce the Proposal: ${err.message}`);
    else throw err;
  }
}

/** Where the external windows' runs are followed, once `watchExternalRuns` has started watching their markers. */
let externalRuns: ExternalRuns<{ root: string }> | undefined;
/** The folder of the end markers, where the sockets of Trama's kitty windows live too. */
let externalDir = "";
/** Why no external window can be followed while `externalRuns` is undefined: the error that stopped the watching, once it failed. */
let externalUnwatched = "the external terminal's end markers are not being watched";

/**
 * Follows the markers the scripts of the external windows leave in `markerDir` (`external-terminals/` of the global
 * storage). Markers left by an earlier session are deleted without effect. The marker of the run in progress of a
 * followed window is the agent command ending, as for the integrated terminal's typed command, even after another
 * terminal starts work. Any other marker is deleted and counts for nothing. A window outside the editor never reports
 * being closed, so none of this is tied to it.
 */
export function watchExternalRuns(markerDir: string): vscode.Disposable {
  let runs: ExternalRuns<{ root: string }>;
  const release = ({ terminal, context }: { terminal: string; context: { root: string } }) => {
    releaseTakenTasks(context.root, { terminal });
    withdrawWaiting(context.root, (a) => a.terminal === terminal);
  };
  try {
    runs = new ExternalRuns<{ root: string }>(markerDir, release);
  } catch (err) {
    externalUnwatched = err instanceof Error ? err.message : String(err);
    throw err;
  }
  externalRuns = runs;
  externalDir = markerDir;
  return new vscode.Disposable(() => {
    runs.dispose();
    if (externalRuns === runs) externalRuns = undefined;
  });
}

/** A run of the agent that has begun in an external window: the line to write and the two ways it can turn out. */
export interface ExternalRunStart {
  /** The POSIX script to write into the window, whatever the editor's shell is. */
  line: string;
  /**
   * The line has really been written into the window: the model's agent-terminal.INSTRUCTION_SENT for an external window.
   * A design request (`announceProposal` is its title) announces a Proposal that belongs to this window, and only then
   * is delivered the end of the command, if it already came.
   */
  sent: (announceProposal?: DesignAnnouncement) => void;
  /** The window could not be opened: nothing was sent; drop the attempt without changing the followed run. */
  abandon: () => void;
}

/**
 * Prepare the agent run in the external window of `terminal` for `template` and `prompt`. Its marker is collected
 * before the window opens because a command may end immediately, but its end is held back until `sent`.
 * The previous instruction remains followed until then. `endpoint` is the question channel of this editor window.
 */
export function startExternalRun(root: string, terminal: string, template: string, prompt: string, endpoint?: string): ExternalRunStart {
  if (externalRuns === undefined) throw new TramaError("The external terminal's end markers are not being watched.");
  const run = externalRuns.nextRun(terminal);
  const program = bundledTrama();
  const line = externalScript({
    agentLine: agentCommandLine(template, prompt, "posix"),
    terminal,
    marker: externalRuns.markerPath(terminal, run),
    binDir: program === undefined ? undefined : dirname(program),
    endpoint,
  });
  const { commit, abandon } = externalRuns.start(terminal, run, { root });
  return {
    line,
    abandon,
    sent: (announceProposal) => {
      // Only this window can be reused next; older terminals still report their own command endings.
      lastTerminal = undefined;
      commandRunning = false;
      if (announceProposal !== undefined) announceDesignRequest(root, announceProposal, terminal);
      commit();
    },
  };
}

/** The external window Trama opened last and could write into again: its identity, the project it was opened for, its name and how to reach it. */
let lastExternal: { terminal: string; root: string; name: string; window: ExternalWindow } | undefined;

/**
 * The newest external window is the only one that can be reused later: `window` is how to reach it again, or undefined
 * when its terminal gives no way to, which leaves none to reuse. `name` is its title, never changed after it opens.
 */
export function rememberExternalWindow(terminal: string, root: string, name: string, window: ExternalWindow | undefined): void {
  lastExternal = window === undefined ? undefined : { terminal, root, name, window };
}

/** How reusing the last external window went: it took the instruction, or a new window must be opened (with the reason when the scripting failed). */
export type ExternalReuse = { kind: "reused" } | { kind: "cancelled" } | { kind: "new-window"; failure?: string };

/**
 * Writes the instruction into the last external window instead of opening another, only if the previous run of that
 * window has finished (its marker arrived), the system terminal detected by Trama (`detected`, undefined when it is not
 * one of Terminal.app, kitty and WezTerm) is the one that window belongs to, it is for the same project and has the
 * same `name`, `trama.externalTerminalCommand` is empty and the terminal's scripting succeeds. When one of the first
 * conditions is missing a new window is the answer without a word; when the scripting fails the window is forgotten and the
 * answer carries the reason, for the caller to show with `warnExternalReuseFailed` once the new window is open.
 * The line is the one a new window gets: same `TRAMA_TERMINAL`, a new run number.
 */
export async function reuseExternalWindow(
  root: string,
  name: string,
  template: string,
  prompt: string,
  detected: ReusableTerminal | undefined,
  announceProposal?: DesignAnnouncement,
  canSend: () => boolean = () => true,
): Promise<ExternalReuse> {
  const previous = lastExternal;
  if (previous === undefined || previous.root !== root || previous.name !== name || detected !== previous.window.terminal) return { kind: "new-window" };
  if (configuredExternalTerminalCommand() !== "" || externalRuns?.idle(previous.terminal) !== true) return { kind: "new-window" };
  const endpoint = await questionEndpoint(root);
  if (!canSend()) return { kind: "cancelled" };
  const { line, abandon, sent } = startExternalRun(root, previous.terminal, template, prompt, endpoint);
  try {
    // The window's shell may not be POSIX: `sh -c` makes the line run the same in any of them.
    await runScripting(scriptingCommand(previous.window, typedCommand(line)));
  } catch (err) {
    abandon();
    lastExternal = undefined;
    return { kind: "new-window", failure: err instanceof Error ? err.message : String(err) };
  }
  sent(announceProposal);
  return { kind: "reused" };
}

/** Tells the developer the window could not be reused and a new one was opened. Not tied to `trama.language`. */
export function warnExternalReuseFailed(reason: string): void {
  void vscode.window.showWarningMessage(`Trama could not reuse the external terminal window: ${reason}. A new window was opened.`);
}

/** How an instruction left Trama: one of the chat's deliveries, or typed into the agent terminal. */
export type Launch = ChatDelivery | "terminal";

/** The instruction was submitted automatically to the chat or typed into a terminal; manual hand-offs are not sends. */
export const launched = (launch: Launch | undefined): boolean => launch === "sent" || launch === "terminal";

/** Where an external window can be opened from, or why it cannot: the developer's own command, or the detected terminal. */
function externalOrigin(): WindowOrigin | string {
  if (process.platform !== "linux" && process.platform !== "darwin") return "external terminals are not supported on this platform";
  if (vscode.env.remoteName) return "external terminals are not available in a remote workspace";
  // Without its end markers watched a window's run could never end: it is a window that cannot be opened.
  if (externalRuns === undefined) return externalUnwatched;
  const custom = configuredExternalTerminalCommand();
  if (custom !== "") return { custom, terminal: undefined };
  const terminal = detectTerminal(process.platform, process.env);
  return terminal === undefined ? "no terminal was found; set trama.externalTerminalCommand" : { custom: "", terminal };
}

/** The window could not be opened: nothing starts, the instruction goes to the clipboard and the developer is told why. No fallback to the integrated terminal. */
async function externalWindowFailed(prompt: string, reason: string): Promise<undefined> {
  await vscode.env.clipboard.writeText(prompt);
  void vscode.window.showErrorMessage(`Trama could not open an external terminal: ${reason}. The instruction was copied to the clipboard.`);
  return undefined;
}

/** What a terminal agent receives: the template of its command line, with `{prompt}`, and the prompt. */
interface TerminalRun {
  template: (family: ShellFamily) => string;
  prompt: string;
}

/**
 * The instruction as a terminal agent receives it: for an instruction that can scan, followed by the sentence about
 * sub-agents for `agent` (none while no agent is chosen), then by the language sentence.
 */
function terminalPrompt(agent: TerminalAgent | undefined, instruction: string, role: Role, models: Models): string {
  const sentence = agent === undefined || !canScan(role) ? undefined : subAgentSentence(agent, models);
  return withLanguage(sentence === undefined ? instruction : `${instruction} ${sentence}`, configuredLanguage());
}

/** The model roles, trimmed (`trama.analysis`, `trama.scan`, `trama.execution`). Application scope: only the user's settings count. */
const configuredModels = (): Models => ({
  analysis: settings().get<string>("analysis", "").trim(),
  scan: settings().get<string>("scan", "").trim(),
  execution: settings().get<string>("execution", "").trim(),
});

/** The prompt of the run called `name` and its command line template for a shell family, after choosing the agent when none is; undefined when the developer cancels. */
async function terminalRun(instruction: string, name: string): Promise<TerminalRun | undefined> {
  const chosen = await terminalAgent();
  if (chosen === undefined) return undefined;
  const role = roleOf(name);
  const models = configuredModels();
  return { template: (family) => agentTemplate(chosen.agent, chosen.command, role, models, family), prompt: terminalPrompt(chosen.agent, instruction, role, models) };
}

/**
 * Sends `instruction` to the agent in a window of the system terminal outside the editor, titled `name`: the free
 * window of the last run when it can be reused, a new one otherwise. Nothing is sent, announced or followed when no window opens.
 */
async function launchExternal(root: string, instruction: string, name: string, announceProposal: DesignAnnouncement | undefined, canSend: () => boolean): Promise<Launch | undefined> {
  const origin = externalOrigin();
  if (typeof origin === "string") return externalWindowFailed(terminalPrompt(configuredTerminalAgent(), instruction, roleOf(name), configuredModels()), origin);
  const run = await terminalRun(instruction, name);
  if (run === undefined || !canSend()) return undefined;
  const template = run.template("posix");
  const { prompt } = run;
  const reuse = await reuseExternalWindow(root, name, template, prompt, reusableKind(origin.terminal), announceProposal, canSend);
  if (reuse.kind === "cancelled" || !canSend()) return undefined;
  if (reuse.kind === "reused") return "terminal";
  const terminalId = newTerminalId();
  const endpoint = await questionEndpoint(root);
  if (!canSend()) return undefined;
  const { line, abandon, sent } = startExternalRun(root, terminalId, template, prompt, endpoint);
  let window: ExternalWindow | undefined;
  try {
    window = await openWindow(origin, { script: line, cwd: root, title: name, kittySocket: join(externalDir, `${terminalId}.sock`) }, canSend);
  } catch (err) {
    abandon();
    return canSend() ? externalWindowFailed(prompt, err instanceof Error ? err.message : String(err)) : undefined;
  }
  rememberExternalWindow(terminalId, root, name, window);
  sent(announceProposal);
  if (reuse.failure !== undefined) warnExternalReuseFailed(reuse.failure);
  return "terminal";
}

/**
 * The agent to start and its command: the effective agent, after asking once which agent to use when none is chosen
 * (remembered for all projects); for `custom`, `trama.agentCommand`, asked for when empty. Undefined when the developer cancels.
 */
async function terminalAgent(): Promise<{ agent: TerminalAgent; command: string } | undefined> {
  const agent = configuredTerminalAgent();
  if (agent === undefined) return chooseTerminalAgent();
  const command = knownCommand(agent) ?? (await customAgentCommand());
  return command === undefined ? undefined : { agent, command };
}

/** Asks which agent Trama starts in the terminal and saves it in the user's settings; undefined when the developer cancels. */
async function chooseTerminalAgent(): Promise<{ agent: TerminalAgent; command: string } | undefined> {
  const items: (vscode.QuickPickItem & { agent: TerminalAgent })[] = [
    ...KNOWN_AGENTS.map((known) => ({ label: known.label, description: known.command, agent: known.id })),
    { label: "Other command…", agent: "custom" },
  ];
  const picked = await vscode.window.showQuickPick(items, { title: "Choose the agent Trama starts in the terminal", ignoreFocusOut: true });
  if (picked === undefined) return undefined;
  const command = knownCommand(picked.agent) ?? (await customAgentCommand());
  if (command === undefined) return undefined;
  await settings().update("terminalAgent", picked.agent, vscode.ConfigurationTarget.Global);
  return { agent: picked.agent, command };
}

/** `trama.agentCommand`, asked for once when empty and remembered for all projects; undefined when the developer cancels. */
async function customAgentCommand(): Promise<string | undefined> {
  const configured = configuredAgentCommand();
  if (configured !== "") return configured;
  const entered = await vscode.window.showInputBox({
    title: "Trama: agent command",
    prompt: "Command that starts your coding agent. {prompt} is replaced by the quoted prompt (appended if missing).",
    placeHolder: "claude {prompt}    or    codex {prompt}",
    ignoreFocusOut: true,
    validateInput: (value) => (value.trim() === "" ? "Enter the command that starts your agent" : undefined),
  });
  if (entered === undefined) return undefined;
  const template = entered.trim();
  await settings().update("agentCommand", template, vscode.ConfigurationTarget.Global);
  return template;
}

/**
 * Sends `prompt` to the developer's agent: the editor's chat when the launcher is the chat, a window of the system terminal
 * when it is the external terminal, otherwise the agent command in an integrated terminal called `name` (see
 * `terminalName`): the last one is reused only while it is free and has the same name, otherwise a new one is opened and
 * the old one is left alone; an editor tab with `terminal-tab`. The agent is chosen first if none is (see `terminalAgent`).
 * A terminal agent runs on the model of the instruction's role (see `roleOf`) and, for an instruction that can scan, is told
 * how to use its sub-agents; the chat receives only the instruction with its language sentence.
 * `announceProposal` is the title of the Proposal a design request will make: with a terminal launcher it is announced
 * once the instruction is sent, so the Board shows its ghost at once. The chat has no end to follow, so it announces nothing.
 * `selfSendingOnly` (the automatic scan) lets Cursor's chat use only a new chat that sends by itself.
 * Returns how the chat received the instruction, "terminal" once it is typed into a terminal or an external window, or
 * undefined when nothing was sent: the developer cancelled the choice of the agent or its command, or the external window
 * could not be opened (the developer was told and the instruction is on the clipboard).
 */
export async function launchAgent(root: string, instruction: string, name: string, announceProposal?: DesignAnnouncement, selfSendingOnly = false, canSend: () => boolean = () => true): Promise<Launch | undefined> {
  if (!canSend()) return undefined;
  if (agentLauncher() === "chat") {
    const delivery = await openChat(root, withLanguage(instruction, configuredLanguage()), selfSendingOnly, canSend);
    if (delivery !== "not-sent") noticeChatModelRoles();
    return delivery;
  }
  // Never the integrated terminal in place of the external one: the Model forbids that fallback.
  if (agentLauncher() === "external-terminal") return launchExternal(root, instruction, name, announceProposal, canSend);
  const run = await terminalRun(instruction, name);
  if (run === undefined || !canSend()) return undefined;

  const previous = lastTerminal;
  const endpoint = await questionEndpoint(root);
  if (!canSend()) return undefined;
  if (!endpoint) throw new TramaError("The launching editor window's question channel is not available.");
  const asTab = agentLauncher() === "terminal-tab";
  const reusable =
    previous !== undefined &&
    lastRoot === root &&
    lastName === name &&
    (lastTab?.terminal === previous) === asTab &&
    lastQuestionEndpoint === endpoint &&
    previous.exitStatus === undefined &&
    previous.shellIntegration !== undefined &&
    !commandRunning;
  // TRAMA_AGENT makes the CLI refuse the developer's commands (approve, reject, resolve) to the agent.
  const terminalId = (reusable ? agentTerminals.get(previous)?.id : undefined) ?? newTerminalId();
  const terminal = reusable
    ? previous
    : vscode.window.createTerminal({
        name,
        cwd: root,
        env: { TRAMA_AGENT: "1", [QUESTION_ENDPOINT_ENV]: endpoint, [TERMINAL_ENV]: terminalId },
        ...(asTab ? { location: { viewColumn: tabColumn(), preserveFocus: true } } : {}),
      });
  const family = shellFamily(vscode.env.shell);
  const line = agentCommandLine(run.template(family), run.prompt, family);
  agentTerminals.set(terminal, { id: terminalId, root, line });
  if (asTab && !reusable) lastTab = { terminal, name, column: undefined };
  // The agent's tab comes to the front of its group without the focus, which stays where the developer was typing.
  // The terminal in the terminal area is never shown: the developer opens it from the list of terminals.
  if (lastTab?.terminal === terminal) terminal.show(true);
  terminal.sendText(line);
  // The last external window is no longer reusable; its current run still reports its own ending.
  lastExternal = undefined;
  lastTerminal = terminal;
  lastRoot = root;
  lastName = name;
  lastQuestionEndpoint = endpoint;
  commandRunning = true;
  if (announceProposal !== undefined) announceDesignRequest(root, announceProposal, terminalId);
  return "terminal";
}

/** The editor's state for all projects (`ExtensionContext.globalState`), given at activation. */
let globalState: vscode.Memento | undefined;
export const useGlobalState = (state: vscode.Memento): void => void (globalState = state);

const CHAT_ROLES_NOTICE_SHOWN = "trama.chatModelRolesNoticeShown";

/** The first instruction sent to the chat while a model role is set tells the developer, once for all projects, that the chat ignores the roles. */
function noticeChatModelRoles(): void {
  if (globalState === undefined || globalState.get<boolean>(CHAT_ROLES_NOTICE_SHOWN) === true) return;
  if (Object.values(configuredModels()).every((model) => model === "")) return;
  void globalState.update(CHAT_ROLES_NOTICE_SHOWN, true);
  void vscode.window.showInformationMessage("Trama: model roles (trama.analysis, trama.scan, trama.execution) apply only to terminal agents. The chat uses the model chosen in the chat.");
}
