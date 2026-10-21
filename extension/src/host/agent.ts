import * as vscode from "vscode";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { basename, join, win32 } from "node:path";
import { announce, newTerminalId, type AgentOrigin, withdrawAll } from "../../../src/core/announcements";
import { ADVISOR_SENTENCE } from "../../../src/core/advisors";
import { writeFileAtomic } from "../../../src/core/atomic-write";
import { TramaError } from "../../../src/core/errors";
import { projectAt } from "../../../src/core/store";
import { releaseTasks } from "../../../src/core/work";
import { sendCoordinatorMessage } from "../../../src/core/question-channel";
import { bundledOmpHook, type ChatDelivery, isCursor, onCursorChatEvent, openCursorChat, withAskLine, withTramaPath } from "./cursor";
import { withdrawWaiting } from "./announcements";
import { bindChatJob, chatJobSendStarted, endChatJobs, endHeldJob as endHeldJobs, endTerminalJobs, endUnsentJob, isHooked, jobAbnormalEnd, type Job, type JobKind, onAgentIdle, releaseFiledWork, setHooked, startJob } from "./drift-resolution";
import { agentCommandLine, isSupportedShell, programName, type ShellFamily, shellFamily } from "./quote";
import { questionEndpoint } from "./questions";
import { ASK_DEVELOPER_SENTENCE, PARALLEL_EXECUTION_SENTENCE, withDriftBlocker, withLanguage } from "./prompts";
import { advisorOverlay, agentTemplate, canScan, type Models, type Role, roleOf, type RunModel, type TerminalAgent, terminalEnv } from "./terminal-agent";

export const settings = () => vscode.workspace.getConfiguration("trama");

/** The agent `trama.agent` names in user settings: `omp`, or `cursor` for every other value (the old `chat` and `claude` too) and when unset. */
export const configuredAgent = (): "cursor" | TerminalAgent => (settings().inspect<string>("agent")?.globalValue === "omp" ? "omp" : "cursor");


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
  return agent === "cursor" ? null : basename(agent);
}

/**
 * Starts a new conversation in Cursor's chat with `prompt` (`openCursorChat`, which sends the model of the run with
 * `composer.createNew`). `announce` runs right before the step that sends the prompt by itself and returns how to take its
 * announcement back when the prompt is not sent.
 */
async function openChat(root: string, prompt: () => string, canSend: () => boolean, model: string, announce: () => () => void): Promise<ChatDelivery> {
  if (!canSend()) return "not-sent";
  return openCursorChat(root, withAskLine(withTramaPath(prompt())), canSend, model, announce);
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
 * Follows terminal command lifecycles and Trama conversations in Cursor chat. A matching conversation stop
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
      endFiledWork(e.root, "editor");
      // Only a completed turn is a normal end: an interrupted or closed conversation never starts the Run that follows it.
      const abnormal = e.event === "AGENT_STOPPED" ? undefined : e.event === "AGENT_INTERRUPTED" ? "its conversation was interrupted" : "its conversation was closed";
      for (const job of endChatJobs(e.root, e.conversation, abnormal)) finishJob(e.root, job);
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
  for (const job of endTerminalJobs(info.id, abnormal)) finishJob(info.root, job);
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

/**
 * The instruction with its limit, sub-agent, parallel execution, advisor, Drift blocker, ask and language sentences. The
 * parallel execution sentence goes right after the sub-agent sentence (or the limit one, when there is none), only to a
 * run over several Tasks and only when `trama.experimentalParallelExecution` is on, read now. The ask sentence stays on the
 * instruction's line unless `askOwnLine` is set, which Cursor's chat needs: it gets the ask sentence on a line of its own,
 * after the PATH line.
 */
function agentPrompt(instruction: string, role: Role, filesDrifts: boolean, severalTasks: boolean, askOwnLine: boolean, advisor = false): string {
  const limit = configuredMaxParallelAgents();
  const withLimit = withAgentLimit(instruction, limit);
  const withSubAgent = canScan(role) && !advisor ? `${withLimit} Compare each Machine with the trama-analysis sub-agent.` : withLimit;
  const withParallel = severalTasks && configuredParallelExecution() ? `${withSubAgent} ${PARALLEL_EXECUTION_SENTENCE}` : withSubAgent;
  const withAdvisor = advisor ? `${withParallel} ${ADVISOR_SENTENCE}` : withParallel;
  const withBlocker = withDriftBlocker(withAdvisor, filesDrifts && configuredDriftBlocker());
  return withLanguage(askOwnLine ? withBlocker : `${withBlocker} ${ASK_DEVELOPER_SENTENCE}`, configuredLanguage());
}

/** The model roles, trimmed (`trama.analysis`, `trama.scan`, `trama.execution`). Application scope: only the user's settings count. */
export const configuredModels = (): Models => ({
  analysis: settings().get<string>("analysis", "").trim(),
  scan: settings().get<string>("scan", "").trim(),
  execution: settings().get<string>("execution", "").trim(),
});

function terminalRun(instruction: Instruction, name: string, filesDrifts: boolean, severalTasks: boolean, model: string, advisorConfig?: string): TerminalRun {
  const role = roleOf(name);
  const hook = bundledOmpHook();
  const models = { model, scan: configuredModels().scan };
  const advisor = advisorConfig !== undefined;
  return {
    template: (family) => agentTemplate(canScan(role) && !advisor, models, family, hook, advisorConfig),
    prompt: () => agentPrompt(textOf(instruction), role, filesDrifts, severalTasks, false, advisor),
    hooked: hook !== undefined,
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

/** What a Run of a sequence does once its job ends locally: the next Run starts, or the held job ends (see `runSequence`). */
const runEnds = new Map<string, (abnormal?: string) => void>();

/** A job of this window ended: the step that follows it, if any, hears of it at once. */
function finishJob(root: string, job: Job): void {
  const next = runEnds.get(job.id);
  runEnds.delete(job.id);
  next?.(jobAbnormalEnd(root, job.id));
}

/**
 * Holds the project from now until `endHeldJob` with a job of `kind` that has no terminal or chat: `run` between the Runs
 * of a sequence cut by model.
 */
export function startHeldJob(root: string, kind: JobKind, id: string): void {
  startJob(kind, root, { held: true }, undefined, id);
}

/** Ends the held job `id`: its steps are over, or it was released with `abnormal`. */
export function endHeldJob(root: string, id: string, abnormal?: string): void {
  for (const job of endHeldJobs(root, id, abnormal)) finishJob(root, job);
}

export interface LaunchJobOptions {
  id?: string;
  /** Whether the instruction lets the agent file Drifts: the experimental Drift blocker's sentence then goes to it. */
  filesDrifts?: boolean;
  /** Whether the instruction is for a run over several Tasks (Run all, a Run of its sequence by model): the experimental parallel execution's sentence then goes to it. */
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
  const filesDrifts = jobOptions.filesDrifts === true;
  const severalTasks = jobOptions.severalTasks === true;
  const role = roleOf(name);
  const runModel = jobOptions.model?.model ?? configuredModels()[role];
  const agent = configuredAgent();
  // A window knows only its own work: nothing is reserved or announced to other windows.
  if ((agent === "cursor" || job === undefined) && !canSend()) return undefined;
  // Cursor's chat only exists in Cursor: elsewhere nothing is tried, announced, reserved or started, and the prompt the terminal would get goes to the clipboard.
  if (agent === "cursor" && !isCursor()) {
    await vscode.env.clipboard.writeText(agentPrompt(textOf(instruction), role, filesDrifts, severalTasks, false));
    void Promise.resolve(vscode.window.showInformationMessage(
      "Trama: Cursor's chat is only available in Cursor. The prompt is on the clipboard; choose omp in Trama's Settings to run the agent in a terminal.",
      "Open Settings",
    )).then((choice) => (choice === "Open Settings" ? vscode.commands.executeCommand("trama.openSettings") : undefined));
    return "clipboard";
  }
  const launch = async (): Promise<Launch | undefined> => {
    if (!canSend()) return agent === "cursor" ? "not-sent" : undefined;
    if (agent === "cursor") {
      const chat = "cursor";
      const prompt = () => agentPrompt(textOf(instruction), role, filesDrifts, severalTasks, true);
      const sent: { job?: string } = {};
      // Runs right before the step that sends the prompt by itself: the card and the job begin now. The take-back, run when
      // that step fails, ends both: the prompt is not sent, so the job never began.
      const sendStarted = (): (() => void) => {
        const takeBackCard = announceSend(root, announceProposal, { chat: "cursor" });
        const sentAfter = chatJobSendStarted(root, chat);
        if (job === undefined || jobId === undefined) return takeBackCard;
        const started = startJob(job, root, { chat }, sentAfter, jobId);
        sent.job = started;
        if (started === undefined) return takeBackCard;
        if (jobOptions.onEnd !== undefined) runEnds.set(started, jobOptions.onEnd);
        return () => {
          takeBackCard();
          for (const ended of endUnsentJob(root, started)) {
            runEnds.get(ended.id)?.("its instruction was not sent to the chat");
            runEnds.delete(ended.id);
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
    const run = terminalRun(instruction, name, filesDrifts, severalTasks, runModel, advisorConfig);
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
      env: terminalEnv(endpoint, terminalId, jobId, advisorConfig),
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
      const started = startJob(job, root, { terminal: terminalId }, undefined, jobId);
      if (started !== undefined && jobOptions.onEnd !== undefined) runEnds.set(started, jobOptions.onEnd);
    }
    return "terminal";
  };
  return agent === "cursor" || job !== undefined ? inSendTurn(launch) : launch();
}
