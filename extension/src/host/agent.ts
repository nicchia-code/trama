import * as vscode from "vscode";
import { randomUUID } from "node:crypto";
import { basename, win32 } from "node:path";
import { announce, newTerminalId, TERMINAL_ENV, type AgentOrigin } from "../../../src/core/announcements";
import { TramaError } from "../../../src/core/errors";
import { projectAt } from "../../../src/core/store";
import { releaseTasks } from "../../../src/core/work";
import { QUESTION_ENDPOINT_ENV, requestCoordinatorMessage, sendCoordinatorMessage, type CoordinatorMessage } from "../../../src/core/question-channel";
import { bundledOmpHook, bundledTrama, type ChatDelivery, isCursor, onCursorChatEvent, openCursorChat, toClipboard, withTramaPath } from "./cursor";
import { onCopilotChatEvent } from "./copilot-chat";
import { withdrawWaiting } from "./announcements";
import { bindChatJob, bindCopilotChatJob, chatJobSendStarted, endChatJobs, endCopilotChatJobs, endTerminalJobs, isHooked, jobAbnormalEnd, type DriftAutopilotMode, type Job, type JobKind, type JobOrigin, onAgentIdle, releaseAutopilotHold, releaseFiledWork, setHooked, startJob } from "./drift-resolution";
import { agentCommandLine, isSupportedShell, programName, type ShellFamily, shellFamily } from "./quote";
import { questionEndpoint, questionWindowId } from "./questions";
import { withLanguage } from "./prompts";
import { agentTemplate, canScan, type Models, type Role, roleOf, type TerminalAgent } from "./terminal-agent";
import { delegationOf } from "./settings-schema";

export const settings = () => vscode.workspace.getConfiguration("trama");

/** The delegation the user's Drift autopilot setting gives: the only reader of it, and only the user value counts. */
export const userDelegation = (): DriftAutopilotMode => delegationOf(settings().inspect<unknown>("driftAutoPilot")?.globalValue);

export const configuredAgent = (): "chat" | TerminalAgent => {
  const agent = settings().inspect<string>("agent")?.globalValue;
  return agent === "omp" || agent === "claude" ? agent : "chat";
};


/** The folder the developer chose for Trama's skills (`trama.skillsDir`), relative to the project root unless absolute. */
export const configuredSkillsDir = (): string => settings().get<string>("skillsDir", ".agents/skills").trim() || ".agents/skills";

/** The language the agent writes in (`trama.language`), as typed; empty when none is chosen. Read at every launch. */
export const configuredLanguage = (): string => settings().get<string>("language", "").trim();
/** The configured concurrent sub-agent limit, from user settings only; invalid values use the default. */
export const configuredMaxParallelAgents = (): number => {
  const value: unknown = settings().inspect<number>("maxParallelAgents")?.globalValue ?? 20;
  return typeof value === "number" && Number.isInteger(value) && value >= 1 ? value : 20;
};
const withAgentLimit = (instruction: string, limit = configuredMaxParallelAgents()): string =>
  instruction.replaceAll("{maxParallelAgents}", String(limit)) + ` Run at most ${limit} sub-agents at once.`;

/**
 * The agent that asked a question round, when it can be told: Cursor's chat agent, or the program of the agent command
 * for one started in a terminal of Trama.
 */
export function agentName(context: { fromTramaTerminal?: boolean; fromCursorChat?: boolean }): string | null {
  if (context.fromCursorChat === true) return "Cursor";
  if (context.fromTramaTerminal !== true) return null;
  const agent = configuredAgent();
  return agent === "chat" ? null : basename(agent);
}

/**
 * The Copilot model that the role's name picks, as `workbench.action.chat.open` takes it: the first model named
 * `<name> (<vendor>)`, or `<name>` for Copilot's own models. Not found: the warning says so and the chat keeps its model.
 */
async function copilotModelSelector(role: Role): Promise<{ vendor: string; id: string } | undefined> {
  const name = configuredModels()[role];
  if (name === "") return undefined;
  const found = (await vscode.lm.selectChatModels()).find((model) => name === `${model.name} (${model.vendor})` || (model.vendor === "copilot" && name === model.name));
  if (found) return { vendor: found.vendor, id: found.id };
  void vscode.window.showWarningMessage(`Trama: no Copilot model is named "${name}" (trama.${role}). The instruction was sent with the model chosen in the chat.`);
  return undefined;
}

/**
 * Starts a new agent-mode conversation in the editor's chat with `prompt`. Cursor has its own chain of steps. Elsewhere
 * `workbench.action.chat.open` with `{ query, mode }` is how VS Code's own actions do it, but it is not a documented
 * API: if it fails, the prompt goes to the clipboard instead.
 */
async function openChat(root: string, prompt: () => string, canSend: () => boolean, onSendStart: () => void, role: Role): Promise<ChatDelivery> {
  if (!canSend()) return "not-sent";
  if (isCursor()) {
    onSendStart();
    return openCursorChat(root, withTramaPath(prompt()), canSend, configuredModels()[role]);
  }
  try {
    const modelSelector = await copilotModelSelector(role);
    await vscode.commands.executeCommand("workbench.action.chat.newChat");
    if (!canSend()) return "not-sent";
    const query = prompt();
    onSendStart();
    await vscode.commands.executeCommand("workbench.action.chat.open", { query, mode: "agent", ...(modelSelector === undefined ? {} : { modelSelector }) });
    return "sent";
  } catch {
    if (!canSend()) return "not-sent";
    // Chat missing or disabled in this editor: the developer must paste the prompt from the clipboard.
    return toClipboard(prompt());
  }
}

/** Whether this window has already been told its default shell is replaced; the flag lives as long as the window's extension host. */
let shellWarned = false;

/** Tells the developer once per window that the agent runs in Windows PowerShell because the default shell is not supported. */
function warnShellReplaced(shell: string): void {
  if (shellWarned) return;
  shellWarned = true;
  void vscode.window.showInformationMessage(`Trama: the default terminal shell (${programName(shell)}) is not supported for agents on Windows; the agent runs in Windows PowerShell.`);
}

/** Every active agent terminal and the command Trama typed into it. */
const agentTerminals = new Map<vscode.Terminal, { id: string; jobId?: string; root: string; line: string; since: number }>();

/** Agent terminals left open at rest with `trama.autoExit` off: no longer followed, remembered until they close. */
const idleTerminals = new Map<vscode.Terminal, { id: string; jobId?: string; root: string; line: string; since: number }>();

function releaseTakenTasks(root: string, origin: AgentOrigin): void {
  try {
    releaseTasks(projectAt(root), origin);
  } catch (err) {
    if (err instanceof TramaError) void vscode.window.showErrorMessage(`Trama: could not release the Tasks the agent had taken: ${err.message}`);
    else throw err;
  }
}

/** The turn of `holder` ended: the Drifts it filed and the Proposals it delivered are released here and in every other window that hears of it. */
function endFiledWork(root: string, holder: string): void {
  releaseFiledWork(root, holder);
  void sendCoordinatorMessage(projectAt(root), { type: "turn-ended", root, holder }).catch(() => undefined);
}

/**
 * Follows terminal command lifecycles and Trama conversations in Cursor and Copilot chat. A matching conversation stop
 * releases only the Tasks taken by that chat agent.
 */
export function watchAgentTerminal(): vscode.Disposable {
  return vscode.Disposable.from(
    vscode.window.onDidEndTerminalShellExecution((e) => {
      const info = agentTerminals.get(e.terminal);
      if (info === undefined || !isTypedCommand(e.terminal, e.execution.commandLine.value)) return;
      finishAgentTerminal(e.terminal, info, abnormalCommandEnd(e.exitCode));
    }),
    onCursorChatEvent((e) => {
      if (e.event === "PROMPT_SUBMITTED") {
        bindChatJob(e.root, e.conversation);
        return;
      }
      releaseTakenTasks(e.root, { chat: "cursor" });
      endFiledWork(e.root, "cursor");
      // Only a completed turn is a normal end: an interrupted or closed conversation never starts the Run that follows it.
      const abnormal = e.event === "AGENT_STOPPED" ? undefined : e.event === "AGENT_INTERRUPTED" ? "its conversation was interrupted" : "its conversation was closed";
      for (const job of endChatJobs(e.root, e.conversation, abnormal)) void broadcastJob(e.root, job, false);
    }),
    onCopilotChatEvent((e) => {
      if (e.event === "PROMPT_SUBMITTED") {
        bindCopilotChatJob(e.root, e.conversation);
        return;
      }
      releaseTakenTasks(e.root, { chat: "editor" });
      endFiledWork(e.root, "editor");
      for (const job of endCopilotChatJobs(e.root, e.conversation)) void broadcastJob(e.root, job, false);
    }),
    onAgentIdle((terminal) => {
      for (const [tracked, info] of agentTerminals) {
        if (info.id !== terminal) continue;
        finishAgentTerminal(tracked, info);
        break;
      }
    }),
    vscode.window.onDidCloseTerminal((terminal) => {
      const info = agentTerminals.get(terminal);
      if (info !== undefined) {
        endAgentWork(info, "its terminal was closed");
        agentTerminals.delete(terminal);
      }
      const idle = idleTerminals.get(terminal);
      if (idle !== undefined) {
        endAgentWork(idle, "its terminal was closed");
        idleTerminals.delete(terminal);
      }
    }),
  );
}

/**
 * Ends the agent's work in a terminal: releases what it took and withdraws its waiting announcements.
 */
function endAgentWork(info: { id: string; jobId?: string; root: string; line: string; since: number }, abnormal?: string): void {
  setHooked(info.id, false);
  releaseTakenTasks(info.root, { terminal: info.id });
  endFiledWork(info.root, info.id);
  for (const job of endTerminalJobs(info.id, abnormal)) void broadcastJob(info.root, job, false);
  withdrawWaiting(info.root, (announcement) => announcement.terminal === info.id);
}

/** Why a command's end is not a normal end: undefined for exit code 0; an unreported status counts as abnormal. */
function abnormalCommandEnd(exitCode: number | undefined): string | undefined {
  if (exitCode === 0) return undefined;
  return exitCode === undefined ? "its command ended without an exit status" : `its command exited with code ${exitCode}`;
}

function finishAgentTerminal(terminal: vscode.Terminal, info: { id: string; jobId?: string; root: string; line: string; since: number }, abnormal?: string): void {
  if (agentTerminals.get(terminal) !== info) return;
  // An idle or ended terminal is no longer followed: later signals and its close change nothing.
  agentTerminals.delete(terminal);
  endAgentWork(info, abnormal);
  if (settings().get<boolean>("autoExit", true)) {
    terminal.dispose();
  } else {
    idleTerminals.set(terminal, info);
  }
}

/** Whether `commandLine`, as the terminal reported it, is the line Trama last typed into `terminal`, compared after trimming. */
function isTypedCommand(terminal: vscode.Terminal, commandLine: string | undefined): boolean {
  const typed = agentTerminals.get(terminal)?.line;
  return typed !== undefined && commandLine !== undefined && commandLine.trim() === typed.trim();
}

/** What a design request announces: its title. */
export type DesignAnnouncement = string;
/** A card a launch announces: a Resolve Drifts, which names the Drifts it resolves (read once the instruction is sent, when they are known), a manual scan, or an import (`work`). */
export type LaunchAnnouncement =
  | { kind: "resolve"; drifts: () => readonly string[] }
  | { kind: "work" | "check"; title: string };

function announceLaunch(root: string, announcement: DesignAnnouncement | LaunchAnnouncement, origin: AgentOrigin): void {
  try {
    if (typeof announcement === "string") {
      announce(projectAt(root), { kind: "proposal", title: announcement, source: "request", ...origin });
      return;
    }
    if (announcement.kind === "resolve") {
      // Resolve Drifts is a Proposal named "Resolve Drifts" that names its Drifts; the panel titles it from them.
      const drifts = [...announcement.drifts()];
      if (drifts.length === 0) return;
      announce(projectAt(root), { kind: "proposal", title: "Resolve Drifts", drifts, source: "request", ...origin });
      return;
    }
    const phase = announcement.kind === "check" ? { kind: "check" as const, phase: "scanning" as const } : { kind: "work" as const };
    announce(projectAt(root), { ...phase, title: announcement.title, source: "request", ...origin });
  } catch (err) {
    if (err instanceof TramaError) void vscode.window.showErrorMessage(`Trama: could not announce the card: ${err.message}`);
    else throw err;
  }
}


/** How an instruction left Trama: chat delivery or an integrated agent terminal. */
export type Launch = ChatDelivery | "terminal";
/** Whether the chat received the prompt automatically or an integrated terminal received the command. */
export const launched = (launch: Launch | undefined): boolean => launch === "sent" || launch === "terminal";
/** The agent command template and prompt are built when sent. */
interface TerminalRun {
  template: (family: ShellFamily) => string;
  prompt: () => string;
  /** Whether the run's hook follows it: omp with its hook module in the package. Without it the command ends the run, as for any other agent. */
  hooked: boolean;
}

/** An instruction, or a function that builds it at the moment it is sent (the Drifts a resolution covers are those open then). */
export type Instruction = string | (() => string);
const textOf = (instruction: Instruction): string => (typeof instruction === "function" ? instruction() : instruction);

/**
 * Serializes chat and integrated-terminal sends so each sees the state left by the previous send.
 */
let sendTurn: Promise<unknown> = Promise.resolve();
function inSendTurn<T>(step: () => Promise<T>): Promise<T> {
  const run = sendTurn.then(step);
  sendTurn = run.catch(() => undefined);
  return run;
}

/** The identity a chat job's agent passes to the coordinator-aware commands: a chat has no environment, so the text gives it. */
const jobIdentity = (jobId: string): string => `This Trama job has ID ${jobId}. Pass \`--job ${jobId}\` to every Trama command that accepts \`--job\`.`;

/** The instruction with its limit, sub-agent, job and language sentences on one line, for the chat and the terminal alike; a terminal's job comes from its environment. */
function agentPrompt(instruction: string, role: Role, jobId?: string): string {
  const limit = configuredMaxParallelAgents();
  const withLimit = withAgentLimit(instruction, limit);
  const withSubAgent = canScan(role) ? `${withLimit} Compare each Machine with the trama-analysis sub-agent.` : withLimit;
  const withJob = jobId === undefined ? withSubAgent : `${withSubAgent} ${jobIdentity(jobId)}`;
  return withLanguage(withJob, configuredLanguage());
}

/** The model roles, trimmed (`trama.analysis`, `trama.scan`, `trama.execution`). Application scope: only the user's settings count. */
export const configuredModels = (): Models => ({
  analysis: settings().get<string>("analysis", "").trim(),
  scan: settings().get<string>("scan", "").trim(),
  execution: settings().get<string>("execution", "").trim(),
});

function terminalRun(agent: TerminalAgent, instruction: Instruction, name: string): TerminalRun {
  const role = roleOf(name);
  const models = configuredModels();
  const hook = agent === "omp" ? bundledOmpHook() : undefined;
  const tramaPath = agent === "claude" ? bundledTrama() : undefined;
  return {
    template: (family) => agentTemplate(agent, role, models, family, hook, tramaPath),
    prompt: () => agentPrompt(textOf(instruction), role),
    hooked: hook !== undefined || tramaPath !== undefined,
  };
}

/**
 * Reserves the project's next send with its coordinator, which answers for the whole project. Without a coordinator in
 * reach nothing is reserved, as before; a project with a send reserved refuses this one.
 */
async function reserveSendWithCoordinator(root: string, id: string, windowId: string): Promise<boolean> {
  const responses = await requestCoordinatorMessage(projectAt(root), { type: "reserve-send", root, id, windowId }).catch(() => []);
  const owner = responses.find((response) => response.coordinator === true);
  return owner === undefined || owner["reserved"] === true;
}

/** Gives the reservation `id` back to the coordinator, whether its send started or not. */
async function releaseSendWithCoordinator(root: string, id: string): Promise<void> {
  await requestCoordinatorMessage(projectAt(root), { type: "release-send", root, id }).catch(() => undefined);
}

async function broadcastJob(root: string, job: Job, active: boolean): Promise<void> {
  const abnormal = active ? undefined : jobAbnormalEnd(root, job.id);
  const message: CoordinatorMessage = {
    type: "job",
    id: job.id,
    root,
    kind: job.kind,
    active,
    origin: job.origin,
    windowId: job.windowId,
    place: "terminal" in job.place ? { terminal: job.place.terminal } : { chat: job.place.chat },
    ...(abnormal !== undefined ? { abnormal } : {}),
  };
  try { await sendCoordinatorMessage(projectAt(root), message); }
  catch { /* An unavailable coordinator suspends automation; it never changes the local job's outcome. */ }
}

export interface LaunchJobOptions {
  id?: string;
  origin?: JobOrigin;
}

export async function launchAgent(
  root: string,
  instruction: Instruction,
  name: string,
  announceProposal?: DesignAnnouncement | LaunchAnnouncement,
  canSend: () => boolean = () => true,
  job?: JobKind,
  onSent?: (startedAt: number) => void,
  jobOptions: LaunchJobOptions = {},
): Promise<Launch | undefined> {
  const jobId = job === undefined ? undefined : jobOptions.id ?? randomUUID();
  const jobOrigin = jobOptions.origin ?? "manual";
  const windowId = job === undefined ? "" : await questionWindowId(root) ?? "";
  const agent = configuredAgent();
  // Under `disabled` the window reserves no send and announces no job start to the other windows: it knows only its own work.
  const shared = userDelegation() !== "disabled";
  if ((agent === "chat" || job === undefined) && !canSend()) return undefined;
  const launch = async (): Promise<Launch | undefined> => {
    if (!canSend()) return agent === "chat" ? "not-sent" : undefined;
    if (agent === "chat") {
      let sentAfter = 0;
      const chat = isCursor() ? "cursor" : "copilot";
      const prompt = () => agentPrompt(textOf(instruction), roleOf(name), jobId);
      const delivery = await openChat(root, prompt, canSend, () => {
        sentAfter = chatJobSendStarted(root, chat);
      }, roleOf(name));
      if (delivery === "sent" && announceProposal !== undefined) announceLaunch(root, announceProposal, { chat: isCursor() ? "cursor" : "editor" });
      if (delivery === "sent" && job !== undefined && jobId !== undefined) {
        const started = startJob(job, root, { chat }, false, sentAfter, jobId, jobOrigin, windowId);
        if (started !== undefined && shared) await broadcastJob(root, {
          id: started, kind: job, root, place: { chat }, origin: jobOrigin, windowId,
        }, true);
      }
      if (delivery !== "not-sent") onSent?.(Date.now());
      return delivery;
    }
    const run = terminalRun(agent, instruction, name);
    const endpoint = await questionEndpoint(root);
    if (!canSend()) return undefined;
    if (!endpoint) throw new TramaError("The launching editor window's question channel is not available.");
    const asTab = settings().inspect<string>("terminalLocation")?.globalValue === "editor";
    const terminalId = newTerminalId();
    const defaultShell = vscode.env.shell;
    // On Windows a default shell other than Windows PowerShell 5.1, PowerShell 7 or Git Bash is replaced for this terminal only.
    const replaced = !isSupportedShell(defaultShell);
    const shellPath = replaced ? win32.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe") : undefined;
    const terminal = vscode.window.createTerminal({
      name,
      cwd: root,
      shellPath,
      env: { TRAMA_AGENT: "1", [QUESTION_ENDPOINT_ENV]: endpoint, [TERMINAL_ENV]: terminalId, ...(jobId === undefined ? {} : { TRAMA_JOB: jobId }) },
      ...(asTab ? { location: { viewColumn: vscode.ViewColumn.Active, preserveFocus: true } } : {}),
    });
    if (replaced) warnShellReplaced(defaultShell);
    const family = shellFamily(shellPath ?? defaultShell);
    const line = agentCommandLine(run.template(family), run.prompt(), family);
    agentTerminals.set(terminal, { id: terminalId, ...(jobId === undefined ? {} : { jobId }), root, line, since: Date.now() });
    setHooked(terminalId, run.hooked);
    if (asTab) terminal.show(true);
    const startedAt = Date.now();
    terminal.sendText(line);
    if (announceProposal !== undefined) announceLaunch(root, announceProposal, { terminal: terminalId });
    onSent?.(startedAt);
    if (job !== undefined && jobId !== undefined) {
      const started = startJob(job, root, { terminal: terminalId }, run.hooked, undefined, jobId, jobOrigin, windowId);
      if (started !== undefined && shared) await broadcastJob(root, {
        id: started, kind: job, root, place: { terminal: terminalId }, origin: jobOrigin, windowId,
      }, true);
    }
    return "terminal";
  };
  // Under an active autopilot a Run, scan or resolution is reserved with the project's coordinator before its check and send; the reservation goes
  // back once the send has started or not, so another window's send or an automatic step cannot start meanwhile.
  const reservation = shared && job !== undefined ? jobId : undefined;
  if (reservation !== undefined && !await reserveSendWithCoordinator(root, reservation, windowId)) {
    if (jobOrigin === "manual") void vscode.window.showWarningMessage("Trama: another instruction is being sent to this project; try again in a moment.");
    return undefined;
  }
  let result: Launch | undefined;
  try {
    result = await (agent === "chat" || job !== undefined ? inSendTurn(launch) : launch());
  } finally {
    if (reservation !== undefined) await releaseSendWithCoordinator(root, reservation);
  }
  // A Resolve Drifts or scan the developer starts lifts an automatic hold, but only once its instruction really started.
  if (jobOrigin === "manual" && (job === "resolve" || job === "scan") && launched(result)) releaseAutopilotHold(root);
  return result;
}
