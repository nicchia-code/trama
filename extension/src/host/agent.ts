import * as vscode from "vscode";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { basename, join, win32 } from "node:path";
import { announce, newTerminalId, TERMINAL_ENV, type AgentOrigin, withdrawAll } from "../../../src/core/announcements";
import { ADVISOR_SENTENCE } from "../../../src/core/advisors";
import { writeFileAtomic } from "../../../src/core/atomic-write";
import { TramaError } from "../../../src/core/errors";
import { projectAt } from "../../../src/core/store";
import { releaseTasks } from "../../../src/core/work";
import { QUESTION_ENDPOINT_ENV, requestCoordinatorMessage, sendCoordinatorMessage, type CoordinatorMessage } from "../../../src/core/question-channel";
import { bundledOmpHook, bundledTrama, type ChatDelivery, isCursor, onCursorChatEvent, openCursorChat, toClipboard, withAskLine, withTramaPath } from "./cursor";
import { onCopilotChatEvent } from "./copilot-chat";
import { withdrawWaiting } from "./announcements";
import { bindChatJob, bindCopilotChatJob, chatJobSendStarted, endChatJobs, endCopilotChatJobs, endHeldJob as endHeldJobs, endTerminalJobs, endUnsentJob, isHooked, jobAbnormalEnd, type DriftAutopilotMode, type Job, type JobKind, type JobOrigin, onAgentIdle, releaseAutopilotHold, releaseFiledWork, setHooked, startJob } from "./drift-resolution";
import { agentCommandLine, isSupportedShell, programName, type ShellFamily, shellFamily } from "./quote";
import { questionEndpoint, questionWindowId } from "./questions";
import { ASK_DEVELOPER_SENTENCE, PARALLEL_EXECUTION_SENTENCE, withDriftBlocker, withLanguage } from "./prompts";
import { advisorOverlay, agentTemplate, canScan, type Models, type Role, roleOf, type RunModel, type TerminalAgent } from "./terminal-agent";
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
/** Whether `trama.experimentalDriftBlocker` is on, from user settings only: a workspace value does not turn it on. Read at every launch. */
export const configuredDriftBlocker = (): boolean => settings().inspect<unknown>("experimentalDriftBlocker")?.globalValue === true;
/** Whether the Advisor Scanner is on (`trama.experimentalAdvisorScanner`), from user settings only, with omp as the agent. Read at every launch. */
export const configuredAdvisorScanner = (): boolean => settings().inspect<unknown>("experimentalAdvisorScanner")?.globalValue === true && configuredAgent() === "omp";
/** Whether `trama.experimentalParallelExecution` is on, from user settings only: a workspace value or a non-boolean does not turn it on. Read when a run over several Tasks is about to start. */
export const configuredParallelExecution = (): boolean => settings().inspect<unknown>("experimentalParallelExecution")?.globalValue === true;
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
 * The Copilot model that the run's model names, as `workbench.action.chat.open` takes it: the first model named
 * `<name> (<vendor>)`, or `<name>` for Copilot's own models. Not found: the warning names where the model comes from
 * (`trama.<role>` or the Proposal), and the chat keeps its model.
 */
async function copilotModelSelector(run: RunModel): Promise<{ vendor: string; id: string } | undefined> {
  const name = run.model;
  if (name === "") return undefined;
  const found = (await vscode.lm.selectChatModels()).find((model) => name === `${model.name} (${model.vendor})` || (model.vendor === "copilot" && name === model.name));
  if (found) return { vendor: found.vendor, id: found.id };
  void vscode.window.showWarningMessage(`Trama: no Copilot model is named "${name}" (${run.from}). The instruction was sent with the model chosen in the chat.`);
  return undefined;
}

/**
 * Starts a new agent-mode conversation in the editor's chat with `prompt`. Cursor has its own chain of steps. Elsewhere
 * `workbench.action.chat.open` with `{ query, mode }` is how VS Code's own actions do it, but it is not a documented
 * API: if it fails, the prompt goes to the clipboard instead. `announce` runs right before the step that sends the
 * prompt by itself and returns how to take its announcement back when the prompt is not sent.
 */
async function openChat(root: string, prompt: () => string, canSend: () => boolean, run: RunModel, announce: () => () => void): Promise<ChatDelivery> {
  if (!canSend()) return "not-sent";
  if (isCursor()) return openCursorChat(root, withAskLine(withTramaPath(prompt())), canSend, run.model, announce);
  let takeBack: (() => void) | undefined;
  try {
    const modelSelector = await copilotModelSelector(run);
    await vscode.commands.executeCommand("workbench.action.chat.newChat");
    if (!canSend()) return "not-sent";
    const query = prompt();
    takeBack = announce();
    await vscode.commands.executeCommand("workbench.action.chat.open", { query, mode: "agent", ...(modelSelector === undefined ? {} : { modelSelector }) });
    return "sent";
  } catch {
    // Chat missing or disabled in this editor, or the send failed: the developer must paste the prompt from the clipboard.
    takeBack?.();
    if (!canSend()) return "not-sent";
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

/** Announces the card of a launch and returns its ID, or undefined when no card is announced. */
function announceLaunch(root: string, announcement: DesignAnnouncement | LaunchAnnouncement, origin: AgentOrigin): string | undefined {
  try {
    if (typeof announcement === "string") return announce(projectAt(root), { kind: "proposal", title: announcement, source: "request", ...origin }).id;
    if (announcement.kind === "resolve") {
      // Resolve Drifts is a Proposal named "Resolve Drifts" that names its Drifts; the panel titles it from them.
      const drifts = [...announcement.drifts()];
      if (drifts.length === 0) return undefined;
      return announce(projectAt(root), { kind: "proposal", title: "Resolve Drifts", drifts, source: "request", ...origin }).id;
    }
    const phase = announcement.kind === "check" ? { kind: "check" as const, phase: "scanning" as const } : { kind: "work" as const };
    return announce(projectAt(root), { ...phase, title: announcement.title, source: "request", ...origin }).id;
  } catch (err) {
    if (err instanceof TramaError) void vscode.window.showErrorMessage(`Trama: could not announce the card: ${err.message}`);
    else throw err;
    return undefined;
  }
}

/**
 * Announces a chat launch's card right before its instruction is sent by itself. The returned function takes the card
 * back, silently, when the instruction ends up on the deeplink or the clipboard instead of being sent.
 */
function announceSend(root: string, announcement: DesignAnnouncement | LaunchAnnouncement | undefined, origin: AgentOrigin): () => void {
  if (announcement === undefined) return () => undefined;
  const id = announceLaunch(root, announcement, origin);
  return () => {
    if (id !== undefined) withdrawAll(projectAt(root), [id]);
  };
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

/**
 * The instruction with its limit, sub-agent, parallel execution, advisor, job, Drift blocker, ask and language sentences. The
 * parallel execution sentence goes right after the sub-agent sentence (or the limit one, when there is none), only to a
 * run over several Tasks and only when `trama.experimentalParallelExecution` is on, read now. The ask sentence stays on the
 * instruction's line unless `askOwnLine` is set, which Cursor's chat needs: it gets the ask sentence on a line of its own,
 * after the PATH line. A terminal's job comes from its environment.
 */
function agentPrompt(instruction: string, role: Role, filesDrifts: boolean, severalTasks: boolean, jobId: string | undefined, askOwnLine: boolean, advisor = false): string {
  const limit = configuredMaxParallelAgents();
  const withLimit = withAgentLimit(instruction, limit);
  const withSubAgent = canScan(role) && !advisor ? `${withLimit} Compare each Machine with the trama-analysis sub-agent.` : withLimit;
  const withParallel = severalTasks && configuredParallelExecution() ? `${withSubAgent} ${PARALLEL_EXECUTION_SENTENCE}` : withSubAgent;
  const withAdvisor = advisor ? `${withParallel} ${ADVISOR_SENTENCE}` : withParallel;
  const withJob = jobId === undefined ? withAdvisor : `${withAdvisor} ${jobIdentity(jobId)}`;
  const withBlocker = withDriftBlocker(withJob, filesDrifts && configuredDriftBlocker());
  return withLanguage(askOwnLine ? withBlocker : `${withBlocker} ${ASK_DEVELOPER_SENTENCE}`, configuredLanguage());
}

/** The model roles, trimmed (`trama.analysis`, `trama.scan`, `trama.execution`). Application scope: only the user's settings count. */
export const configuredModels = (): Models => ({
  analysis: settings().get<string>("analysis", "").trim(),
  scan: settings().get<string>("scan", "").trim(),
  execution: settings().get<string>("execution", "").trim(),
});

function terminalRun(agent: TerminalAgent, instruction: Instruction, name: string, filesDrifts: boolean, severalTasks: boolean, run: RunModel, advisorConfig?: string): TerminalRun {
  const role = roleOf(name);
  const hook = agent === "omp" ? bundledOmpHook() : undefined;
  const tramaPath = agent === "claude" ? bundledTrama() : undefined;
  const models = { model: run.model, scan: configuredModels().scan };
  const advisor = advisorConfig !== undefined;
  return {
    template: (family) => agentTemplate(agent, canScan(role) && !advisor, models, family, hook, tramaPath, advisorConfig),
    prompt: () => agentPrompt(textOf(instruction), role, filesDrifts, severalTasks, undefined, false, advisor),
    hooked: hook !== undefined || tramaPath !== undefined,
  };
}

/** Writes the advisor overlay of an omp Run into the extension's storage and returns its path: the overlay never goes into the repository. */
function writeAdvisorOverlay(storage: vscode.Uri | undefined): string {
  if (storage === undefined) throw new TramaError("The Advisor Scanner needs the extension's storage.");
  mkdirSync(storage.fsPath, { recursive: true });
  const file = join(storage.fsPath, "advisor.yml");
  writeFileAtomic(file, advisorOverlay(configuredModels().scan));
  return file;
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

/** What a Run of a sequence does once its job ends locally: the next Run starts, or the held job ends (see `runSequence`). */
const runEnds = new Map<string, (abnormal?: string) => void>();

async function broadcastJob(root: string, job: Job, active: boolean): Promise<void> {
  const abnormal = active ? undefined : jobAbnormalEnd(root, job.id);
  // The end is handed to the step that follows it at once, not after the coordinator has heard of it: a sequence never waits on another window.
  if (!active) {
    const next = runEnds.get(job.id);
    runEnds.delete(job.id);
    next?.(abnormal);
  }
  const message: CoordinatorMessage = {
    type: "job",
    id: job.id,
    root,
    kind: job.kind,
    active,
    origin: job.origin,
    windowId: job.windowId,
    place: job.place,
    ...(abnormal !== undefined ? { abnormal } : {}),
    ...(job.advisor === true ? { advisor: true } : {}),
  };
  try { await sendCoordinatorMessage(projectAt(root), message); }
  catch { /* An unavailable coordinator suspends automation; it never changes the local job's outcome. */ }
}

/**
 * Holds the project from now until `endHeldJob` with a job of `kind` that has no terminal or chat: `resolve` while an
 * automatic collection is prepared and its agent works, `run` from its hand-over to its Run. The other windows hear of it.
 */
export function startHeldJob(root: string, kind: JobKind, origin: JobOrigin, windowId: string, id: string): void {
  const started = startJob(kind, root, { held: true }, false, undefined, id, origin, windowId);
  if (started !== undefined && userDelegation() !== "disabled") void broadcastJob(root, { id, kind, root, place: { held: true }, origin, windowId }, true);
}

/** Ends the held job `id`: its steps are over, or it was released with `abnormal`. The other windows hear of it. */
export function endHeldJob(root: string, id: string, abnormal?: string): void {
  for (const job of endHeldJobs(root, id, abnormal)) void broadcastJob(root, job, false);
}

export interface LaunchJobOptions {
  id?: string;
  origin?: JobOrigin;
  /** Whether the instruction lets the agent file Drifts: the experimental Drift blocker's sentence then goes to it. */
  filesDrifts?: boolean;
  /** Whether the instruction is for a run over several Tasks (Run all, a Run of its sequence by model, the automatic Run): the experimental parallel execution's sentence then goes to it. */
  severalTasks?: boolean;
  /** The model the instruction runs on when a Proposal's model applies (`proposalRunModel`); absent, the model of the role in Settings. */
  model?: RunModel;
  /** Called once the Run's job ends: with why it ended abnormally, or with nothing for a normal end. A Run that did not start ends with a reason too. */
  onEnd?: (abnormal?: string) => void;
  /** The extension's global storage: an omp Run with the Advisor Scanner on writes its advisor overlay there. */
  advisorStorage?: vscode.Uri;
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
  const filesDrifts = jobOptions.filesDrifts === true;
  const severalTasks = jobOptions.severalTasks === true;
  const role = roleOf(name);
  const runModel = jobOptions.model ?? { model: configuredModels()[role], from: `trama.${role}` };
  const windowId = job === undefined ? "" : await questionWindowId(root) ?? "";
  const agent = configuredAgent();
  // Under `disabled` the window reserves no send and announces no job start to the other windows: it knows only its own work.
  const shared = userDelegation() !== "disabled";
  if ((agent === "chat" || job === undefined) && !canSend()) return undefined;
  const launch = async (): Promise<Launch | undefined> => {
    if (!canSend()) return agent === "chat" ? "not-sent" : undefined;
    if (agent === "chat") {
      const chat = isCursor() ? "cursor" : "copilot";
      const prompt = () => agentPrompt(textOf(instruction), role, filesDrifts, severalTasks, jobId, isCursor());
      const sent: { job?: string } = {};
      // Runs right before the step that sends the prompt by itself: the card and the job begin now. The take-back, run when
      // that step fails, ends both: the prompt is not sent, so the job never began.
      const sendStarted = (): (() => void) => {
        const takeBackCard = announceSend(root, announceProposal, { chat: isCursor() ? "cursor" : "editor" });
        const sentAfter = chatJobSendStarted(root, chat);
        if (job === undefined || jobId === undefined) return takeBackCard;
        const started = startJob(job, root, { chat }, false, sentAfter, jobId, jobOrigin, windowId);
        sent.job = started;
        if (started === undefined) return takeBackCard;
        if (jobOptions.onEnd !== undefined) runEnds.set(started, jobOptions.onEnd);
        if (shared) void broadcastJob(root, { id: started, kind: job, root, place: { chat }, origin: jobOrigin, windowId }, true);
        return () => {
          takeBackCard();
          for (const ended of endUnsentJob(root, started)) {
            runEnds.get(ended.id)?.("its instruction was not sent to the chat");
            runEnds.delete(ended.id);
            if (shared) void broadcastJob(root, ended, false);
          }
        };
      };
      const delivery = await openChat(root, prompt, canSend, runModel, sendStarted);
      // The conversation ended before its instruction began: the sequence of Runs stops with it.
      if (delivery === "sent" && job !== undefined && jobId !== undefined && sent.job === undefined) jobOptions.onEnd?.("its conversation ended before its instruction began");
      if (delivery !== "not-sent") onSent?.(Date.now());
      return delivery;
    }
    const advisorConfig = job === "run" && configuredAdvisorScanner() ? writeAdvisorOverlay(jobOptions.advisorStorage) : undefined;
    const run = terminalRun(agent, instruction, name, filesDrifts, severalTasks, runModel, advisorConfig);
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
      const started = startJob(job, root, { terminal: terminalId }, run.hooked, undefined, jobId, jobOrigin, windowId, advisorConfig !== undefined);
      if (started !== undefined && jobOptions.onEnd !== undefined) runEnds.set(started, jobOptions.onEnd);
      if (started !== undefined && shared) await broadcastJob(root, {
        id: started, kind: job, root, place: { terminal: terminalId }, origin: jobOrigin, windowId, advisor: advisorConfig !== undefined,
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
