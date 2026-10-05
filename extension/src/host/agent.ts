import * as vscode from "vscode";
import { basename, dirname, join } from "node:path";
import { announce, newTerminalId, TERMINAL_ENV } from "../../../src/core/announcements";
import { TramaError } from "../../../src/core/errors";
import { projectAt } from "../../../src/core/store";
import { listTasks, releaseTasks } from "../../../src/core/work";
import { worktreePath, worktreeProposalIds } from "../../../src/core/worktree-round";
import { applyWaitingMerge, finishReconciliation, mergeRound, type MergeRoundResult } from "../../../src/core/worktree-merge";
import { QUESTION_ENDPOINT_ENV } from "../../../src/core/question-channel";
import { bundledTrama, type ChatDelivery, isCursor, onCursorChatEvent, openCursorChat, toClipboard, withTramaPath } from "./cursor";
import { withdrawWaiting } from "./announcements";
import { worktreeAgentMissing } from "./multi-branch";
import { ExternalRuns, externalScript, typedCommand } from "./external-terminal";
import { type ExternalWindow, type ReusableTerminal, runScripting, scriptingCommand } from "./external-reuse";
import { detectTerminal, openWindow, reusableKind, type WindowOrigin } from "./external-open";
import { agentCommandLine, shellFamily } from "./quote";
import { questionEndpoint } from "./questions";
import { buildPrompt, buildScanPrompt, withLanguage } from "./prompts";
import { shouldRunProposalTasks } from "./worktree-follow";
import { boardCounts } from "./board-counts";
import { commandOutcome } from "./end-notices";
import { endNotices } from "./notice-host";

/** Worktree terminals keep one name; the open folder's agent terminals are named after their work (`terminalName`). */
const WORKTREE_TERMINAL_NAME = "Trama agent";

export const settings = () => vscode.workspace.getConfiguration("trama");

export const configuredAgentCommand = (): string => settings().get<string>("agentCommand", "").trim();

/** The command that opens the external terminal instead of the detected one (`trama.externalTerminalCommand`). Application scope: only the user's settings count. */
export const configuredExternalTerminalCommand = (): string => settings().get<string>("externalTerminalCommand", "").trim();

/** The command of a worktree terminal (`trama.worktreeAgent`). Empty blocks acceptance while multi-branch is on. */
export const configuredWorktreeAgent = (): string => settings().get<string>("worktreeAgent", "").trim();

/**
 * Writes `trama.worktreeAgent` as empty when the user settings have no such key.
 * A command that is already there, including an explicit empty one, is left untouched.
 */
export async function ensureWorktreeAgentSetting(): Promise<void> {
  const configuration = settings();
  const inspected = configuration.inspect<string>("worktreeAgent");
  if (!worktreeAgentMissing(inspected?.globalValue)) return;
  await configuration.update("worktreeAgent", "", vscode.ConfigurationTarget.Global);
}

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
  const program = configuredAgentCommand().split(/\s+/)[0] ?? "";
  return program === "" ? null : basename(program);
}

/**
 * Where the buttons send their prompt: `auto` (the default) is the chat in Cursor and the integrated terminal (in the
 * terminal area) elsewhere, never the editor tab nor the external one; `terminal`, `terminal-tab`, `external-terminal`
 * or `chat` chosen by hand always win.
 */
export type AgentLauncher = "terminal" | "terminal-tab" | "external-terminal" | "chat";

export function agentLauncher(): AgentLauncher {
  const chosen = settings().get<string>("agentLauncher", "auto");
  if (chosen === "terminal" || chosen === "terminal-tab" || chosen === "external-terminal" || chosen === "chat") return chosen;
  return isCursor() ? "chat" : "terminal";
}

/** Whether a launch can happen without asking the developer anything first (used to decide on automatic scans). */
export const agentReady = (): boolean => agentLauncher() === "chat" || configuredAgentCommand() !== "";

/**
 * Starts a new agent-mode conversation in the editor's chat with `prompt`. Cursor has its own chain of steps. Elsewhere
 * `workbench.action.chat.open` with `{ query, mode }` is how VS Code's own actions do it, but it is not a documented
 * API: if it fails, the prompt goes to the clipboard instead.
 */
async function openChat(root: string, prompt: string, selfSendingOnly: boolean): Promise<ChatDelivery> {
  if (isCursor()) return openCursorChat(root, withTramaPath(prompt), selfSendingOnly);
  try {
    await vscode.commands.executeCommand("workbench.action.chat.newChat");
    await vscode.commands.executeCommand("workbench.action.chat.open", { query: prompt, mode: "agent" });
    return "sent";
  } catch {
    // Chat missing or disabled in this editor: the clipboard still gets the prompt to the agent.
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
/** A terminal opened for one Proposal's worktree. It is not the open folder's agent terminal. */
interface WorktreeRun {
  /** The open project, whose name the end-of-command notice uses. */
  projectRoot: string;
  proposal: string;
  kind: "scan" | "implement" | "reconcile";
  /** Task ids of this Proposal in the worktree before the command that is running. */
  tasksBefore: Set<string>;
  /** True while the command Trama typed has not ended. A busy terminal is not sent another command. */
  busy: boolean;
}

const agentTerminals = new Map<vscode.Terminal, { id: string; root: string; line: string; worktree?: WorktreeRun }>();

function releaseTakenTasks(root: string): void {
  try {
    releaseTasks(projectAt(root));
  } catch (err) {
    if (err instanceof TramaError) void vscode.window.showErrorMessage(`Trama: could not release the Tasks the agent had taken: ${err.message}`);
    else throw err;
  }
}

/** Task ids of `proposal` in the worktree at `root`. */
function proposalTaskIds(root: string, proposal: string): { id: string; column: string }[] {
  return listTasks(projectAt(root))
    .filter((task) => task.data.proposal === proposal)
    .map((task) => ({ id: task.id, column: task.data.column }));
}

/** Columns of the Tasks that belong to Proposals still in the round, read from each Proposal's worktree. */
function roundColumns(run: WorktreeRun, worktree: string): string[] {
  const folders = new Map<string, string>([[run.proposal, worktree]]);
  for (const id of worktreeProposalIds(projectAt(run.projectRoot))) folders.set(id, worktreePath(run.projectRoot, id));
  const columns: string[] = [];
  for (const [proposal, folder] of folders) for (const task of proposalTaskIds(folder, proposal)) columns.push(task.column);
  return columns;
}

/**
 * The scan created Tasks and the round is not finished: type the implement instruction into the same terminal.
 * Returns whether it did. Sending it puts the agent back to work, so no end-of-command notice is left waiting.
 */
function continueAfterScan(terminal: vscode.Terminal, info: { root: string; line: string; worktree?: WorktreeRun }): boolean {
  const run = info.worktree;
  if (!run || run.kind === "reconcile") return false;
  const now = proposalTaskIds(info.root, run.proposal);
  if (!shouldRunProposalTasks({ kind: run.kind, before: [...run.tasksBefore], after: now.map((task) => task.id), columns: roundColumns(run, info.root) })) return false;
  const template = configuredWorktreeAgent();
  if (template === "") return false;
  const prompt = withLanguage(buildPrompt({ kind: "implement-design", proposal: run.proposal }), configuredLanguage());
  info.line = agentCommandLine(template, prompt, shellFamily(vscode.env.shell));
  run.kind = "implement";
  run.tasksBefore = new Set(now.map((task) => task.id));
  terminal.sendText(info.line);
  endNotices.cancelAll();
  return true;
}

function reportRoundMerge(root: string, outcome: MergeRoundResult): void {
  if (outcome.kind === "refused") void vscode.window.showWarningMessage(outcome.message);
  else if (outcome.kind === "waiting" && !outcome.again) void vscode.window.showWarningMessage(`Trama has a merge ready. It will update this folder when you are back on ${outcome.branch} with a clean tree.`);
  else if (outcome.kind === "conflict" && !outcome.again) void vscode.window.showWarningMessage("The worktree round has conflicts. Nothing was merged.");
  else if (outcome.kind === "merged") {
    void vscode.window.showInformationMessage("The worktree round is merged.");
    // launchAgent adds the language sentence, as for every instruction.
    if (outcome.features.length > 0) void launchAgent(root, buildScanPrompt(outcome.features), "Scan");
  }
}

/** Applies a merge that has been waiting, once this folder is the start branch with a clean tree. */
export function settleWaitingRound(root: string): boolean {
  try {
    const outcome = applyWaitingMerge(projectAt(root), [configuredSkillsDir()]);
    if (outcome.kind !== "merged") return false;
    reportRoundMerge(root, outcome);
    return true;
  } catch (err) {
    void vscode.window.showWarningMessage(`Trama: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

/**
 * Follows the commands that start and end in the terminals Trama launches agents in, and the turns of Trama's
 * conversations in Cursor's chat. The end of the open folder's terminal releases the Tasks taken there. The end of a
 * worktree terminal releases only the Tasks taken in that worktree, and does not free or reuse the open folder's terminal.
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
      if (info.worktree) {
        // Only the command Trama typed into this worktree releases its Tasks. The open folder's terminal is left alone.
        if (!isTypedCommand(e.terminal, e.execution.commandLine.value)) return;
        releaseTakenTasks(info.root);
        withdrawWaiting(info.root, (a) => a.terminal === info.id);
        if (info.worktree.kind !== "reconcile" && continueAfterScan(e.terminal, info)) return;
        const round = info.worktree;
        try {
          if (round.kind === "reconcile") {
            const outcome = finishReconciliation(projectAt(round.projectRoot), [configuredSkillsDir()]);
            if (outcome.kind === "stayed") void vscode.window.showWarningMessage("The reconciliation Task is not Done. The round stays as it is, and the merge was not tried again.");
            else reportRoundMerge(round.projectRoot, outcome);
          } else reportRoundMerge(round.projectRoot, mergeRound(projectAt(round.projectRoot), [configuredSkillsDir()]));
        } catch (err) {
          void vscode.window.showWarningMessage(`Trama: ${err instanceof Error ? err.message : String(err)}`);
        }
        round.busy = false;
        endNotices.born(basename(round.projectRoot), commandOutcome(e.exitCode), () => boardCounts(projectAt(round.projectRoot)));
        return;
      }
      // A command ended in the open folder's terminal, so a Task marked as taken there is released.
      releaseTakenTasks(info.root);
      // Only the end of the command Trama typed counts as the agent finishing; any other command, or an end that comes
      // without a command line, changes nothing here.
      if (!isTypedCommand(e.terminal, e.execution.commandLine.value)) return;
      if (e.terminal === lastTerminal) commandRunning = false;
      withdrawWaiting(info.root, (a) => a.terminal === info.id);
      endNotices.born(basename(info.root), commandOutcome(e.exitCode), () => boardCounts(projectAt(info.root)));
    }),
    onCursorChatEvent((e) => {
      if (e.event !== "PROMPT_SUBMITTED") releaseTakenTasks(e.root);
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

function announceDesignRequest(root: string, title: string, terminal: string): void {
  try {
    announce(projectAt(root), { kind: "proposal", title, source: "request", terminal });
  } catch (err) {
    if (err instanceof TramaError) void vscode.window.showErrorMessage(`Trama: could not announce the Proposal: ${err.message}`);
    else throw err;
  }
}

/** Where the external windows' runs are followed, once `watchExternalRuns` has started watching their markers. */
let externalRuns: ExternalRuns<{ root: string }> | undefined;
/** The folder of the end markers, where the sockets of Trama's kitty windows live too. */
let externalDir = "";

/**
 * Follows the markers the scripts of the external windows leave in `markerDir` (`external-terminals/` of the global
 * storage). Markers left by an earlier session are deleted without effect. The marker of the run in progress of a
 * followed window is the agent command ending, as for the integrated terminal's typed command; any other marker is
 * deleted and counts for nothing. A window outside the editor never reports being closed, so none of this is tied to it.
 */
export function watchExternalRuns(markerDir: string): vscode.Disposable {
  const runs = new ExternalRuns<{ root: string }>(markerDir, ({ terminal, exitCode, context }) => {
    releaseTakenTasks(context.root);
    withdrawWaiting(context.root, (a) => a.terminal === terminal);
    endNotices.born(basename(context.root), commandOutcome(exitCode), () => boardCounts(projectAt(context.root)));
  });
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
   * The notices about an earlier end that still wait are taken back, a design request (`announceProposal` is its title)
   * announces a Proposal that belongs to this window, and only then is delivered the end of the command, if it already came.
   */
  sent: (announceProposal?: string) => void;
  /** The window could not be opened: nothing was sent, so the run is dropped and the one it displaced goes on. */
  abandon: () => void;
}

/**
 * A run of the agent in the external window of `terminal` for the agent `template` and `prompt`: its marker is followed
 * from now on, before the window opens, because a command that fails at once leaves its marker before the window is
 * known to be open; its end is held back until `sent`. `endpoint` is the question channel of this editor window.
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
      endNotices.cancelAll();
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
export type ExternalReuse = { kind: "reused" } | { kind: "new-window"; failure?: string };

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
  announceProposal?: string,
): Promise<ExternalReuse> {
  const previous = lastExternal;
  if (previous === undefined || previous.root !== root || previous.name !== name || detected !== previous.window.terminal) return { kind: "new-window" };
  if (configuredExternalTerminalCommand() !== "" || externalRuns?.idle(previous.terminal) !== true) return { kind: "new-window" };
  const { line, abandon, sent } = startExternalRun(root, previous.terminal, template, prompt, await questionEndpoint(root));
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

/** The instruction really left Trama: neither cancelled nor refused to a chat that had to send by itself. */
export const launched = (launch: Launch | undefined): boolean => launch !== undefined && launch !== "not-sent";

/** Where an external window can be opened from, or why it cannot: the developer's own command, or the detected terminal. */
function externalOrigin(): WindowOrigin | string {
  if (process.platform !== "linux" && process.platform !== "darwin") return "external terminals are not supported on this platform";
  if (vscode.env.remoteName) return "external terminals are not available in a remote workspace";
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

/**
 * Sends `prompt` to the agent command in a window of the system terminal outside the editor, titled `name`: the free
 * window of the last run when it can be reused, a new one otherwise. Nothing is sent, announced or followed when no window opens.
 */
async function launchExternal(root: string, prompt: string, name: string, announceProposal: string | undefined): Promise<Launch | undefined> {
  const origin = externalOrigin();
  if (typeof origin === "string") return externalWindowFailed(prompt, origin);
  const template = await agentCommandTemplate();
  if (template === undefined) return undefined;
  const reuse = await reuseExternalWindow(root, name, template, prompt, reusableKind(origin.terminal), announceProposal);
  if (reuse.kind === "reused") return "terminal";
  const terminalId = newTerminalId();
  const { line, abandon, sent } = startExternalRun(root, terminalId, template, prompt, await questionEndpoint(root));
  let window: ExternalWindow | undefined;
  try {
    window = await openWindow(origin, { script: line, cwd: root, title: name, kittySocket: join(externalDir, `${terminalId}.sock`) });
  } catch (err) {
    abandon();
    return externalWindowFailed(prompt, err instanceof Error ? err.message : String(err));
  }
  rememberExternalWindow(terminalId, root, name, window);
  sent(announceProposal);
  if (reuse.failure !== undefined) warnExternalReuseFailed(reuse.failure);
  return "terminal";
}

/** The agent command, asked for once when none is configured and remembered for all projects; undefined when the developer cancels. */
async function agentCommandTemplate(): Promise<string | undefined> {
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
 * the old one is left alone; an editor tab with `terminal-tab`. The command is asked for first if none is set.
 * `announceProposal` is the title of the Proposal a design request will make: with a terminal launcher it is announced
 * once the instruction is sent, so the Board shows its ghost at once. The chat has no end to follow, so it announces nothing.
 * `selfSendingOnly` (the automatic scan) lets Cursor's chat use only a new chat that sends by itself.
 * Returns how the chat received the instruction, "terminal" once it is typed into a terminal or an external window, or
 * undefined when nothing was sent: the developer cancelled the prompt for the agent command, or the external window
 * could not be opened (the developer was told and the instruction is on the clipboard).
 */
export async function launchAgent(root: string, instruction: string, name: string, announceProposal?: string, selfSendingOnly = false): Promise<Launch | undefined> {
  const prompt = withLanguage(instruction, configuredLanguage());
  if (agentLauncher() === "chat") return openChat(root, prompt, selfSendingOnly);
  // Never the integrated terminal in place of the external one: the Model forbids that fallback.
  if (agentLauncher() === "external-terminal") return launchExternal(root, prompt, name, announceProposal);
  const template = await agentCommandTemplate();
  if (template === undefined) return undefined;

  const previous = lastTerminal;
  const endpoint = await questionEndpoint(root);
  if (!endpoint) throw new TramaError("The launching editor window's question channel is not available.");
  const reusable =
    previous !== undefined &&
    lastRoot === root &&
    lastName === name &&
    lastQuestionEndpoint === endpoint &&
    previous.exitStatus === undefined &&
    previous.shellIntegration !== undefined &&
    !commandRunning;
  // TRAMA_AGENT makes the CLI refuse the developer's commands (approve, reject, resolve) to the agent.
  const terminalId = (reusable ? agentTerminals.get(previous)?.id : undefined) ?? newTerminalId();
  const asTab = !reusable && agentLauncher() === "terminal-tab";
  const terminal = reusable
    ? previous
    : vscode.window.createTerminal({
        name,
        cwd: root,
        env: { TRAMA_AGENT: "1", [QUESTION_ENDPOINT_ENV]: endpoint, [TERMINAL_ENV]: terminalId },
        ...(asTab ? { location: { viewColumn: tabColumn(), preserveFocus: true } } : {}),
      });
  const line = agentCommandLine(template, prompt, shellFamily(vscode.env.shell));
  agentTerminals.set(terminal, { id: terminalId, root, line });
  if (asTab) lastTab = { terminal, name, column: undefined };
  // The agent's tab comes to the front of its group without the focus, which stays where the developer was typing.
  terminal.show(lastTab?.terminal === terminal);
  terminal.sendText(line);
  // The instruction is really written: the developer has put the agent back to work, so no notice about an earlier end
  // that still waits is needed (this is the model's agent-terminal.INSTRUCTION_SENT; the chat launcher never gets here).
  endNotices.cancelAll();
  lastTerminal = terminal;
  lastRoot = root;
  lastName = name;
  lastQuestionEndpoint = endpoint;
  commandRunning = true;
  if (announceProposal !== undefined) announceDesignRequest(root, announceProposal, terminalId);
  return "terminal";
}

/**
 * Starts the worktree agent in `worktree`. It is not the open folder's terminal and it never uses the chat:
 * the command is `trama.worktreeAgent`, the name is "Trama agent", and `TRAMA_AGENT` is set.
 * The question endpoint is the open project's, so the agent can reach the editor that launched it.
 */
/** Starts the worktree agent in the merge worktree on the reconciliation Task. Its end retries the merge only when that Task is Done. */
export async function launchReconcileAgent(projectRoot: string, worktree: string, prompt: string): Promise<void> {
  await openWorktreeTerminal(projectRoot, worktree, prompt, { projectRoot, proposal: "merge", kind: "reconcile", busy: true, tasksBefore: new Set() });
}

export async function launchWorktreeAgent(projectRoot: string, worktree: string, prompt: string, proposal: string): Promise<void> {
  await openWorktreeTerminal(projectRoot, worktree, prompt, {
    projectRoot,
    proposal,
    kind: "scan",
    busy: true,
    tasksBefore: new Set(proposalTaskIds(worktree, proposal).map((task) => task.id)),
  });
}

async function openWorktreeTerminal(projectRoot: string, worktree: string, prompt: string, run: WorktreeRun): Promise<void> {
  const template = configuredWorktreeAgent();
  if (template === "") throw new TramaError("Set trama.worktreeAgent in your user settings before accepting a Proposal with multi-branch on.");
  const endpoint = await questionEndpoint(projectRoot);
  if (!endpoint) throw new TramaError("The launching editor window's question channel is not available.");
  const terminalId = newTerminalId();
  const line = agentCommandLine(template, prompt, shellFamily(vscode.env.shell));
  const terminal = vscode.window.createTerminal({
    name: WORKTREE_TERMINAL_NAME,
    cwd: worktree,
    env: { TRAMA_AGENT: "1", [QUESTION_ENDPOINT_ENV]: endpoint, [TERMINAL_ENV]: terminalId },
  });
  agentTerminals.set(terminal, { id: terminalId, root: worktree, line, worktree: run });
  terminal.show();
  terminal.sendText(line);
  endNotices.cancelAll();
}

/**
 * After a Drift in a worktree is decided, types the instruction that runs the Tasks of that worktree's Proposal still in To do,
 * into that worktree's terminal. It is not the open folder's agent. A terminal that is still running
 * is left alone and a new one is opened in the same worktree, so the line is not sent into the agent.
 */
export async function resumeWorktreeTasks(projectRoot: string, worktree: string, proposal: string): Promise<void> {
  const template = configuredWorktreeAgent();
  if (template === "") throw new TramaError("Set trama.worktreeAgent in your user settings before accepting a Proposal with multi-branch on.");
  const endpoint = await questionEndpoint(projectRoot);
  if (!endpoint) throw new TramaError("The launching editor window's question channel is not available.");
  const prompt = withLanguage(buildPrompt({ kind: "implement-design", proposal }), configuredLanguage());
  const line = agentCommandLine(template, prompt, shellFamily(vscode.env.shell));
  const idle = [...agentTerminals.entries()].find(([terminal, info]) => info.worktree?.proposal === proposal && info.root === worktree && info.worktree.busy === false && terminal.exitStatus === undefined);
  const run: WorktreeRun = { projectRoot, proposal, kind: "implement", busy: true, tasksBefore: new Set(proposalTaskIds(worktree, proposal).map((task) => task.id)) };
  if (idle) {
    const [terminal, info] = idle;
    info.line = line;
    info.worktree = run;
    terminal.show();
    terminal.sendText(line);
    endNotices.cancelAll();
    return;
  }
  const terminalId = newTerminalId();
  const terminal = vscode.window.createTerminal({
    name: WORKTREE_TERMINAL_NAME,
    cwd: worktree,
    env: { TRAMA_AGENT: "1", [QUESTION_ENDPOINT_ENV]: endpoint, [TERMINAL_ENV]: terminalId },
  });
  agentTerminals.set(terminal, { id: terminalId, root: worktree, line, worktree: run });
  terminal.show();
  terminal.sendText(line);
  endNotices.cancelAll();
}
