import * as vscode from "vscode";
import { randomUUID } from "node:crypto";
import { basename } from "node:path";
import { announce, newTerminalId, TERMINAL_ENV, type AgentOrigin } from "../../../src/core/announcements";
import { TramaError } from "../../../src/core/errors";
import { projectAt } from "../../../src/core/store";
import { releaseTasks } from "../../../src/core/work";
import { QUESTION_ENDPOINT_ENV, sendCoordinatorMessage, type CoordinatorMessage } from "../../../src/core/question-channel";
import { bundledOmpHook, bundledTrama, type ChatDelivery, isCursor, onCursorChatEvent, openCursorChat, toClipboard, withTramaPath } from "./cursor";
import { onCopilotChatEvent } from "./copilot-chat";
import { withdrawWaiting } from "./announcements";
import { bindChatJob, bindCopilotChatJob, chatJobSendStarted, endChatJobs, endCopilotChatJobs, endTerminalJobs, isHooked, jobAbnormalEnd, type Job, type JobKind, type JobOrigin, onAgentIdle, releaseAutopilotHold, setHooked, startJob } from "./drift-resolution";
import { agentCommandLine, type ShellFamily, shellFamily } from "./quote";
import { questionEndpoint, questionWindowId } from "./questions";
import { withLanguage } from "./prompts";
import { agentTemplate, canScan, type Models, type Role, roleOf, type TerminalAgent } from "./terminal-agent";

export const settings = () => vscode.workspace.getConfiguration("trama");

const configuredAgent = (): "chat" | TerminalAgent => {
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
 * Starts a new agent-mode conversation in the editor's chat with `prompt`. Cursor has its own chain of steps. Elsewhere
 * `workbench.action.chat.open` with `{ query, mode }` is how VS Code's own actions do it, but it is not a documented
 * API: if it fails, the prompt goes to the clipboard instead.
 */
async function openChat(root: string, prompt: () => string, selfSendingOnly: boolean, canSend: () => boolean, onSendStart: () => void): Promise<ChatDelivery> {
  if (!canSend()) return "not-sent";
  if (isCursor()) {
    onSendStart();
    return openCursorChat(root, withTramaPath(prompt()), selfSendingOnly, canSend);
  }
  try {
    await vscode.commands.executeCommand("workbench.action.chat.newChat");
    if (!canSend()) return "not-sent";
    const query = prompt();
    onSendStart();
    await vscode.commands.executeCommand("workbench.action.chat.open", { query, mode: "agent" });
    return "sent";
  } catch {
    if (!canSend()) return "not-sent";
    // Chat missing or disabled in this editor: the developer must paste the prompt from the clipboard.
    return toClipboard(prompt());
  }
}

/** The last agent terminal Trama opened as an editor tab and its group's column. */
let lastTab: { terminal: vscode.Terminal; name: string; column: vscode.ViewColumn | undefined } | undefined;

/** Reuse the prior agent tab's column while it exists; otherwise open beside the active group. */
function tabColumn(): vscode.ViewColumn {
  const column = lastTab !== undefined && lastTab.terminal.exitStatus === undefined ? lastTab.column : undefined;
  return column !== undefined && vscode.window.tabGroups.all.some((group) => group.viewColumn === column) ? column : vscode.ViewColumn.Beside;
}

/** Every active agent terminal and the command Trama typed into it. */
const agentTerminals = new Map<vscode.Terminal, { id: string; jobId?: string; root: string; line: string; since: number }>();

function releaseTakenTasks(root: string, origin: AgentOrigin): void {
  try {
    releaseTasks(projectAt(root), origin);
  } catch (err) {
    if (err instanceof TramaError) void vscode.window.showErrorMessage(`Trama: could not release the Tasks the agent had taken: ${err.message}`);
    else throw err;
  }
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
      if (terminal === lastTab?.terminal) lastTab = undefined;
    }),
    vscode.window.tabGroups.onDidChangeTabs((e) => {
      if (lastTab === undefined || lastTab.column !== undefined) return;
      const name = lastTab.name;
      const tab = e.opened.find((t) => t.input instanceof vscode.TabInputTerminal && t.label === name);
      if (tab !== undefined) lastTab.column = tab.group.viewColumn;
    }),
  );
}

/**
 * Ends the agent's work in a terminal: releases what it took and withdraws its waiting announcements.
 */
function endAgentWork(info: { id: string; jobId?: string; root: string; line: string; since: number }, abnormal?: string): void {
  setHooked(info.id, false);
  releaseTakenTasks(info.root, { terminal: info.id });
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
    if (terminal === lastTab?.terminal) lastTab = undefined;
    terminal.dispose();
  }
}

/** Whether `commandLine`, as the terminal reported it, is the line Trama last typed into `terminal`, compared after trimming. */
function isTypedCommand(terminal: vscode.Terminal, commandLine: string | undefined): boolean {
  const typed = agentTerminals.get(terminal)?.line;
  return typed !== undefined && commandLine !== undefined && commandLine.trim() === typed.trim();
}

/** What a design request announces: its title. */
export type DesignAnnouncement = string;

function announceDesignRequest(root: string, title: DesignAnnouncement, terminal: string): void {
  try {
    announce(projectAt(root), { kind: "proposal", title, source: "request", terminal });
  } catch (err) {
    if (err instanceof TramaError) void vscode.window.showErrorMessage(`Trama: could not announce the Proposal: ${err.message}`);
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

/** The instruction with its limit, sub-agent and language sentences on one line; a terminal's job comes from its environment. */
function terminalPrompt(instruction: string, role: Role): string {
  const limit = configuredMaxParallelAgents();
  const withLimit = withAgentLimit(instruction, limit);
  const withSubAgent = canScan(role) ? `${withLimit} Compare each Machine with the trama-analysis sub-agent.` : withLimit;
  return withLanguage(withSubAgent, configuredLanguage());
}

/** The model roles, trimmed (`trama.analysis`, `trama.scan`, `trama.execution`). Application scope: only the user's settings count. */
const configuredModels = (): Models => ({
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
    prompt: () => terminalPrompt(textOf(instruction), role),
    hooked: hook !== undefined || tramaPath !== undefined,
  };
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
  announceProposal?: DesignAnnouncement,
  selfSendingOnly = false,
  canSend: () => boolean = () => true,
  job?: JobKind,
  onSent?: (startedAt: number) => void,
  jobOptions: LaunchJobOptions = {},
): Promise<Launch | undefined> {
  const jobId = job === undefined ? undefined : jobOptions.id ?? randomUUID();
  const jobOrigin = jobOptions.origin ?? "manual";
  const windowId = job === undefined ? "" : await questionWindowId(root) ?? "";
  const agent = configuredAgent();
  if ((agent === "chat" || job === undefined) && !canSend()) return undefined;
  const launch = async (): Promise<Launch | undefined> => {
    if (!canSend()) return agent === "chat" ? "not-sent" : undefined;
    if (agent === "chat") {
      let sentAfter = 0;
      const chat = isCursor() ? "cursor" : "copilot";
      const prompt = () => {
        const line = withLanguage(withAgentLimit(textOf(instruction)), configuredLanguage());
        return jobId === undefined ? line : `${line}\n\n${jobIdentity(jobId)}`;
      };
      const delivery = await openChat(root, prompt, selfSendingOnly, canSend, () => {
        sentAfter = chatJobSendStarted(root, chat);
      });
      if (delivery !== "not-sent") noticeChatModelRoles();
      if (delivery === "sent" && job !== undefined && jobId !== undefined) {
        const started = startJob(job, root, { chat }, false, sentAfter, jobId, jobOrigin, windowId);
        if (started !== undefined) void broadcastJob(root, {
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
    const terminal = vscode.window.createTerminal({
      name,
      cwd: root,
      env: { TRAMA_AGENT: "1", [QUESTION_ENDPOINT_ENV]: endpoint, [TERMINAL_ENV]: terminalId, ...(jobId === undefined ? {} : { TRAMA_JOB: jobId }) },
      ...(asTab ? { location: { viewColumn: tabColumn(), preserveFocus: true } } : {}),
    });
    const family = shellFamily(vscode.env.shell);
    const line = agentCommandLine(run.template(family), run.prompt(), family);
    agentTerminals.set(terminal, { id: terminalId, ...(jobId === undefined ? {} : { jobId }), root, line, since: Date.now() });
    setHooked(terminalId, run.hooked);
    if (asTab) lastTab = { terminal, name, column: undefined };
    if (asTab) terminal.show(true);
    const startedAt = Date.now();
    terminal.sendText(line);
    onSent?.(startedAt);
    if (job !== undefined && jobId !== undefined) {
      const started = startJob(job, root, { terminal: terminalId }, run.hooked, undefined, jobId, jobOrigin, windowId);
      if (started !== undefined) void broadcastJob(root, {
        id: started, kind: job, root, place: { terminal: terminalId }, origin: jobOrigin, windowId,
      }, true);
    }
    if (announceProposal !== undefined) announceDesignRequest(root, announceProposal, terminalId);
    return "terminal";
  };
  const result = await (agent === "chat" || job !== undefined ? inSendTurn(launch) : launch());
  // A Resolve Drifts or scan the developer starts lifts an automatic hold, but only once its instruction really started.
  if (jobOrigin === "manual" && (job === "resolve" || job === "scan") && launched(result)) releaseAutopilotHold(root);
  return result;
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
