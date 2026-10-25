import * as vscode from "vscode";
import { execFile, type ExecFileException } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join, win32 } from "node:path";
import { announce, newTerminalId, type AgentOrigin } from "../../../src/core/announcements";
import { ADVISOR_SENTENCE } from "../../../src/core/advisors";
import { GH_ACCESS_ARGS, GH_LOGIN_ARGS } from "../../../src/core/github";
import { writeFileAtomic } from "../../../src/core/atomic-write";
import { releaseTerminalClaims } from "../../../src/core/claims";
import { developerExclusions, findInstructionFiles, instructionExclusions, mergeExclusions } from "../../../src/core/instruction-files";
import { TramaError } from "../../../src/core/errors";
import { publishingIssues } from "../../../src/core/issues";
import { projectAt } from "../../../src/core/store";
import { type NtfyTarget, ntfyTarget } from "../../../src/core/ntfy";
import { releaseTasks } from "../../../src/core/work";
import { QUESTION_ENDPOINT_ENV, questionProjectId, sendCoordinatorMessage } from "../../../src/core/question-channel";
import { processAlive, readAgentProcess, removeAgentProcess, writeAgentProcess } from "../../../src/core/agent-processes";
import { terminalVerdict } from "../../../src/core/terminal-check";
import { startFailureNotice, type SavedJob, useOmpChat } from "../../../src/core/omp-chat-conversation";
import { bundledAskMoreInstructions, bundledGeneralInstructions, bundledOmpHook } from "./bundled";
import { withdrawWaiting } from "./announcements";
import { addJobFollower, endHeldJob as endHeldJobs, endTerminalJobs, hasJobs, jobAbnormalEnd, type Job, type JobKind, onAgentIdle, onAgentStarted, onDriftResolutionChange, releaseFiledWork, reportAgentStopped, reportStoppedFollowing, type RunAll, setHooked, startJob } from "./drift-resolution";
import { addHolderFollower } from "./followed-holders";
import { agentCommandLine, isSupportedShell, programName, quote, quoteProgram, type ShellFamily, shellFamily } from "./quote";
import type { OmpLoginProvider } from "../omp-login";
import { interruptTerminalRounds, ownWindowId, questionEndpoint } from "./questions";
import { pruneAgentProcesses, releaseUnfollowed, stopUnfollowedPublications } from "./task-release";
import { ASK_DEVELOPER_SENTENCE, AUTO_EXIT_SENTENCE, instructedMessage, languageSentence, PARALLEL_EXECUTION_SENTENCE, withAsyncDriftResolver, withContextSharing, withLanguage } from "./prompts";
import { agentTemplate, askMoreCommandLine, askMoreOptions, canScan, launchOverlay, type Models, ompArguments, ompOptions, type Role, roleOf, type RunModel, terminalEnv } from "./terminal-agent";
import { cursorKeyEnv } from "./cursor-api-key";
import { certificateReason } from "../certificate-errors";
import { systemCertificatesEnv } from "./system-certificates";
import { showYoloNoticeOnce } from "./yolo-notice";
import { ompPathVariable } from "./model-lists";
import { ompBeforeLaunch } from "./omp-launch";
import { type ConversationInfo, type ConversationStore, type OpenConversation, OmpConversations } from "./omp-chat/conversations";
import { AwayNotifier } from "./away-notices";
import { ntfyToken } from "./ntfy-token";
import type { ChatViewPort, OmpClientPort, OmpLaunch } from "./omp-chat/ports";
import { GeneralConversation, type GeneralDeps } from "./omp-chat/general";
import { findConfiguredOmp, ompVersionOnly } from "./omp-update";
import { findProject } from "./project";

export const settings = () => vscode.workspace.getConfiguration("trama");

/** The folder the developer chose for Trama's skills (`trama.skillsDir`), relative to the project root unless absolute. */
export const configuredSkillsDir = (): string => settings().get<string>("skillsDir", ".agents/skills").trim() || ".agents/skills";

/** The language the agent writes in (`trama.language`), trimmed, as typed; empty when none is chosen. Read at every launch. */
export const configuredLanguage = (): string => settings().get<string>("language", "").trim();
/** Whether the Advisor Scanner is on (`trama.advisorScanner`), from user settings only: on unless the user value is `false`, so a workspace value (or none, or a value equal to the default that the settings store drops) never changes the result. Read at every launch of a Run: no other job uses it. */
export const configuredAdvisorScanner = (): boolean => settings().inspect<unknown>("advisorScanner")?.globalValue !== false;
/** Whether `trama.parallelExecution` is on, from user settings only: on unless the user value is `false`, so a workspace value (or none) never changes the result. Read when a run over several Tasks is about to start. */
export const configuredParallelExecution = (): boolean => settings().inspect<unknown>("parallelExecution")?.globalValue !== false;
/** Whether `trama.asyncDriftResolver` is on, from user settings only: on unless the user value is `false`, so a workspace value (or none) never changes the result. Read when a job is about to start. */
export const configuredAsyncDriftResolver = (): boolean => settings().inspect<unknown>("asyncDriftResolver")?.globalValue !== false;
/** Whether `trama.subagentsContextSharing` is on, from user settings only: on unless the user value is `false`, so a workspace value (or none) never changes the result. */
export const configuredSubagentsContextSharing = (): boolean => settings().inspect<unknown>("subagentsContextSharing")?.globalValue !== false;
/** Whether System Certificates (`trama.systemCertificates`) is on, from user settings only: on only with the user value `true`, so a workspace value or a non-boolean never turns it on. Read when a process is about to start. */
export const configuredSystemCertificates = (): boolean => settings().inspect<unknown>("systemCertificates")?.globalValue === true;
/** Whether `trama.autoExit` is on, from user settings only: on unless the user value is `false`, so a workspace value (or none) never turns it off. Read at each end of work. */
export const configuredAutoExit = (): boolean => settings().inspect<unknown>("autoExit")?.globalValue !== false;
/** Whether `trama.autoUpdateStaleProposals` is on, from user settings only: on unless the user value is `false`, so a workspace value (or none) never changes the result. Read at each refresh and each approval. */
export const configuredAutoUpdateStaleProposals = (): boolean => settings().inspect<unknown>("autoUpdateStaleProposals")?.globalValue !== false;
/** Whether `trama.ignoreInstructionFiles` is on, from user settings only: a workspace value or a non-boolean does not turn it on. */
export const configuredIgnoreInstructionFiles = (): boolean => settings().inspect<unknown>("ignoreInstructionFiles")?.globalValue === true;
/** The configured concurrent sub-agent limit, from user settings only; invalid values use the default. */
export const configuredMaxParallelAgents = (): number => {
  const value: unknown = settings().inspect<number>("maxParallelAgents")?.globalValue ?? 20;
  return typeof value === "number" && Number.isInteger(value) && value >= 1 ? value : 20;
};
const withAgentLimit = (instruction: string, limit = configuredMaxParallelAgents()): string =>
  instruction.replaceAll("{maxParallelAgents}", String(limit)) + ` Run at most ${limit} sub-agents at once.`;

/** `trama.ompPath` from the user's settings, trimmed (a repository's own value never counts); empty when none is set. Read at every launch. */
export const configuredOmpPath = (): string => {
  const value = settings().inspect<unknown>("ompPath")?.globalValue;
  return typeof value === "string" ? value.trim() : "";
};

/**
 * The environment of an omp terminal: the PATH with the folder of the omp program and the folder of bun in front of the editor's, the Cursor API key Trama saved, if any, and,
 * with System Certificates on and a bundle on disk, the variables of the bundle: both win over the editor's own. `systemCertificates` is the saved setting unless the wizard's step says otherwise.
 */
const ompTerminalEnv = (omp: string, systemCertificates = configuredSystemCertificates()): Record<string, string> => ({
  [process.platform === "win32" ? "Path" : "PATH"]: ompPathVariable(omp),
  ...cursorKeyEnv(),
  ...systemCertificatesEnv(systemCertificates),
});

/** Whether this window has already been told its default shell is replaced; the flag lives as long as the window's extension host. */
let shellWarned = false;

/** Tells the developer once per window that the agent runs in Windows PowerShell because the default shell is not supported. */
function warnShellReplaced(shell: string): void {
  if (shellWarned) return;
  shellWarned = true;
  void vscode.window.showInformationMessage(`Trama: the default terminal shell (${programName(shell)}) is not supported for agents on Windows; the agent runs in Windows PowerShell.`);
}

/** An agent terminal Trama opened: its identity, its job and its command. `askMore` marks an Ask more, which never counts as the window's work (`notice` Machine). */
interface AgentTerminal {
  id: string;
  jobId?: string;
  root: string;
  line: string;
  since: number;
  askMore?: true;
}

/** Every active agent terminal and the command Trama typed into it. */
const agentTerminals = new Map<vscode.Terminal, AgentTerminal>();

/** Agent terminals left open at rest with `trama.autoExit` off: no longer followed, remembered until they close. */
const idleTerminals = new Map<vscode.Terminal, AgentTerminal>();

/** The conversations of omp Chat of this window; absent until the ACP client and the view are registered (`setOmpChat`), so nothing opens before they can. */
let chatConversations: OmpConversations | undefined;

/** The away notices of this window (`notice` Machine); absent until omp Chat is registered, and after the window closes. */
let awayNotices: AwayNotifier | undefined;
let awayJobs: { dispose(): void } | undefined;

/** Where notifications go now, from the user settings only: a workspace value never counts, so a cloned repository can neither turn them on nor send them to its own server. */
export const configuredNtfyTarget = (): NtfyTarget => ntfyTarget(settings().inspect<unknown>("ntfyServer")?.globalValue, settings().inspect<unknown>("ntfyTopic")?.globalValue);

/**
 * Whether the window works, for its away notices: a job in progress in a conversation of omp Chat (Agent running, with Trama's hook), in a terminal in Agent running, or the held
 * job of a Run of a sequence still to start. Ask more, General and the prepared question of the Async Drift Resolver never count.
 */
const windowWorking = (): boolean =>
  chatConversations?.workingJobs() === true || [...agentTerminals.values()].some((info) => info.askMore !== true) || hasJobs((job) => job.kind !== "prepared");

/** The conversation General of omp Chat of this window, set with `chatConversations`. */
let general: GeneralConversation | undefined;

/** The folder of the `trama` program the extension ships, put first on the PATH of a conversation's process like on its terminals'. */
let bundledCliDir: string | undefined;
export function setBundledCliDir(dir: string | undefined): void {
  bundledCliDir = dir;
}

/** Whether `trama.ompChat` is on: not turned off (`false`) in the user's settings, read at every instruction. */
const configuredOmpChat = (): boolean => settings().inspect<unknown>("ompChat")?.globalValue !== false;

/** Whether an instruction opens a conversation of omp Chat instead of a terminal: omp Chat on and registered. */
const ompChatInUse = (): boolean => useOmpChat({ ompChat: configuredOmpChat(), available: chatConversations !== undefined });

/** The PATH of a conversation's process: the shipped `trama` first, as on the terminals'; nothing to add without it. */
const conversationPath = (): Record<string, string> => (bundledCliDir === undefined ? {} : { PATH: `${bundledCliDir}${delimiter}${process.env["PATH"] ?? ""}` });

/**
 * The process of a conversation: the terminal's environment with the PATH `trama` is found on, and the arguments of its options and its approval. The approval is
 * `trama.ompChatApproval` from the user settings only, read when the conversation opens: `ask` is ask, any other value or none is `yolo`. With no user value at all
 * the developer never chose, and the one-time notice is shown (not waited for): a resumed conversation never comes here.
 */
function conversationLaunch(root: string, options: string[][], endpoint: string, terminalId: string, jobId?: string, advisor = false, run = false, task?: string, parallel = false): OmpLaunch {
  const chosen = settings().inspect<unknown>("ompChatApproval")?.globalValue;
  const approval = chosen === "ask" ? "ask" : "yolo";
  if (chosen === undefined) showYoloNoticeOnce();
  // Intent Tracing is off only when `trama.ompChatIntentTracing` is `false` in the user settings, read when the conversation opens.
  const intentTracing = settings().inspect<unknown>("ompChatIntentTracing")?.globalValue === false ? "0" : "1";
  return { args: ompArguments(options, approval), env: { ...terminalEnv(endpoint, terminalId, jobId, advisor, run, task, parallel), ...conversationPath(), TRAMA_ACP: "1", PI_INTENT_TRACING: intentTracing }, cwd: root };
}

/** Opens the conversation; false, after the warning, when omp does not start: the caller's instruction then goes to a terminal. */
async function openConversation(spec: OpenConversation): Promise<boolean> {
  const opened = await chatConversations?.open(spec);
  if (opened?.opened === true) return true;
  void vscode.window.showWarningMessage(
    opened === undefined
      ? startFailureNotice("omp Chat is not available")
      : startFailureNotice(certificateReason(opened.reason, [opened.reason, opened.details], configuredSystemCertificates()), opened.details),
  );
  return false;
}

const endInfo = (conversation: ConversationInfo) => ({ id: conversation.id, ...(conversation.jobId === undefined ? {} : { jobId: conversation.jobId }), root: conversation.root, line: "", since: conversation.since });

/**
 * Registers the ACP client and the view of omp Chat for this window and resumes the conversations it saved before (`store` is `workspaceState`, `projectRoot`
 * the project the window has open). Called once when the extension activates, by the code that creates the two.
 */
export function setOmpChat(ports: { client: OmpClientPort; view: ChatViewPort }, store: ConversationStore, projectRoot: () => string | undefined): Promise<void> {
  awayNotices?.dispose();
  awayJobs?.dispose();
  const notices = new AwayNotifier({ topicSet: () => configuredNtfyTarget().state !== "off", working: windowWorking, target: configuredNtfyTarget, token: ntfyToken });
  awayNotices = notices;
  // A job that starts or ends in the registry may change whether the window works.
  awayJobs = onDriftResolutionChange(() => notices.refresh());
  chatConversations = new OmpConversations(ports.client, ports.view, store, {
    autoExit: configuredAutoExit,
    endWork: (conversation, abnormal) => endAgentWork(endInfo(conversation), abnormal),
    // A certificate error in the reason or in omp's lines is told in plain words; omp's lines stay behind `Show details`.
    reportStopped: (name, reason, details) => reportStoppedFollowing(name, certificateReason(reason, [reason, details], configuredSystemCertificates()), details),
    reportAgentStopped: (job, reason) => reportAgentStopped(job, certificateReason(reason, [reason], configuredSystemCertificates())),
    registerProcess: (conversation, pid) => void writeAgentProcess(questionProjectId(projectAt(conversation.root)), conversation.id, pid, ownWindowId(conversation.root)),
    unregisterProcess: (conversation) => removeAgentProcess(questionProjectId(projectAt(conversation.root)), conversation.id),
    interruptQuestions: (conversation) => interruptTerminalRounds(conversation.id),
    restoreJob: (conversation, job) => {
      launchedRoots.add(conversation.root);
      startJob(job.kind, conversation.root, { terminal: conversation.id }, job.id, job.drifts ?? []);
    },
    projectRoot,
    resumeLaunch: async (root, args, env) => {
      const endpoint = await questionEndpoint(root);
      if (!endpoint) throw new TramaError("The launching editor window's question channel is not available.");
      return { args, env: { ...env, [QUESTION_ENDPOINT_ENV]: endpoint, ...conversationPath() }, cwd: root };
    },
    confirm: async (message, detail, button) => (await vscode.window.showWarningMessage(message, { modal: true, detail }, button)) === button,
    notices,
  });
  general = new GeneralConversation(generalDeps(ports, store));
  general.start();
  return chatConversations.resume();
}

/** `editor.WINDOW_CLOSED`: the extension stops, and every conversation's process with it; their jobs and saved entries wait for the resume. Resolves when the processes are gone. */
export async function windowClosed(): Promise<void> {
  // Nothing is sent when the window closes or reloads: every notice that waits is cancelled before the processes stop.
  awayNotices?.dispose();
  awayNotices = undefined;
  awayJobs?.dispose();
  awayJobs = undefined;
  await Promise.all([chatConversations?.windowClosed(), general?.windowClosed()]);
}

/** `question-round.ROUND_OPENED`: the window presents the round `round`, asked by the terminal or conversation `terminal`. */
export function roundOpened(round: number, terminal: string | undefined): void {
  awayNotices?.roundOpened(round, terminal);
}

/** `question-round.ROUND_CLOSED`: the round `round` ended, answered or not. */
export function roundClosed(round: number): void {
  awayNotices?.roundClosed(round);
}

/** `trama.ompChat` changed in this window: General starts, or leaves as it is switched off. */
export function ompChatGeneralSettingsChanged(): void {
  general?.settingsChanged();
}

/**
 * The file of General's instructions for this start or resume: the extension's `media/general.md` as it is, or, when a language is chosen (`trama.language`,
 * read now), a copy in the extension's storage that ends with the language sentence, since omp takes one `--append-system-prompt`. Undefined when the package has no
 * instructions; it throws when the copy with the sentence cannot be written, so General never starts in a language other than the chosen one.
 */
export function generalInstructions(storage: vscode.Uri | undefined = overlayStorage): string | undefined {
  const file = bundledGeneralInstructions();
  const language = configuredLanguage();
  if (file === undefined || language === "") return file;
  if (storage === undefined) throw new Error("the extension's storage is not available to write the language sentence");
  const text = `${readFileSync(file, "utf8").trimEnd()}\n\n${languageSentence(language)}\n`;
  const copy = join(storage.fsPath, `general-${createHash("sha256").update(text).digest("hex").slice(0, 16)}.md`);
  mkdirSync(storage.fsPath, { recursive: true });
  writeFileAtomic(copy, text);
  return copy;
}

/** The folder General works in: the one the panel uses, the Trama project folder when one is open, otherwise the first folder of the window. */
export function generalFolder(): string | undefined {
  return findProject()?.root ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

/** The deps of General: the folder the window has open, the settings read at each start, and the launches as the conversations make them. */
function generalDeps(ports: { client: OmpClientPort; view: ChatViewPort }, store: ConversationStore): GeneralDeps {
  return {
    client: ports.client,
    view: ports.view,
    store,
    folder: generalFolder,
    usable: configuredOmpChat,
    ompPath: configuredOmpPath,
    findOmp: findConfiguredOmp,
    checkOmp: (program) => ompVersionOnly(program),
    instructions: generalInstructions,
    launch: async (root, terminalId) => {
      const endpoint = await questionEndpoint(root);
      if (!endpoint) throw new TramaError("The launching editor window's question channel is not available.");
      const analysis = configuredModels().analysis;
      return conversationLaunch(root, analysis === "" ? [] : [["--model", analysis]], endpoint, terminalId);
    },
    resumeLaunch: async (root, args, env) => {
      const endpoint = await questionEndpoint(root);
      if (!endpoint) throw new TramaError("The launching editor window's question channel is not available.");
      return { args, env: { ...env, [QUESTION_ENDPOINT_ENV]: endpoint, ...conversationPath() }, cwd: root };
    },
    endWork: (terminalId, root) => endAgentWork({ id: terminalId, root, line: "", since: Date.now() }),
    interruptRounds: interruptTerminalRounds,
    confirm: async (message, detail, button) => (await vscode.window.showWarningMessage(message, { modal: true, detail }, button)) === button,
    install: () => void vscode.commands.executeCommand("trama.installOmp"),
  };
}

function releaseTakenTasks(root: string, origin: AgentOrigin): void {
  try {
    releaseTasks(projectAt(root), origin);
  } catch (err) {
    if (err instanceof TramaError) void vscode.window.showErrorMessage(`Trama: could not release the Tasks the agent had taken: ${err.message}`);
    else throw err;
  }
}

function releaseClaims(root: string, terminal: string): void {
  try {
    releaseTerminalClaims(root, terminal);
  } catch (err) {
    if (err instanceof TramaError) void vscode.window.showErrorMessage(`Trama: could not release the claims of the files the agent wrote: ${err.message}`);
    else throw err;
  }
}

/** The turn of `holder` ended: the Drifts it filed and the Proposals it delivered are released here and in every other window that hears of it. */
function endFiledWork(root: string, holder: string): void {
  releaseFiledWork(root, holder);
  void sendCoordinatorMessage(projectAt(root), { type: "turn-ended", root, holder }).catch(() => undefined);
}

/**
 * Follows terminal command lifecycles and the idle and start signals of the agents' hooks. A command's end, an idle hook or a closed
 * terminal ends the agent's work: its job, its ghost and the Tasks it took.
 */
export function watchAgentTerminal(): vscode.Disposable {
  return vscode.Disposable.from(
    vscode.window.onDidEndTerminalShellExecution((e) => {
      const info = agentTerminals.get(e.terminal);
      if (info === undefined || !isTypedCommand(e.terminal, e.execution.commandLine.value)) return;
      // The command of the agent ended: the rounds it asked end with it, whichever way the terminal goes on.
      interruptTerminalRounds(info.id);
      finishAgentTerminal(e.terminal, info, abnormalCommandEnd(e.exitCode));
    }),
    onAgentIdle((terminal) => {
      for (const [tracked, info] of agentTerminals) {
        if (info.id !== terminal) continue;
        finishAgentTerminal(tracked, info);
        break;
      }
    }),
    onAgentStarted((terminal, pid, root) => {
      // Only a terminal followed in Agent running registers its agent's process; nothing else changes.
      for (const info of agentTerminals.values()) {
        if (info.id === terminal && info.root === root) void writeAgentProcess(questionProjectId(projectAt(root)), terminal, pid, ownWindowId(root));
      }
    }),
    vscode.window.onDidCloseTerminal((terminal) => {
      const info = agentTerminals.get(terminal);
      if (info !== undefined) {
        interruptTerminalRounds(info.id);
        endAgentWork(info, "its terminal was closed");
        unfollowTerminal(terminal);
      }
      const idle = idleTerminals.get(terminal);
      if (idle !== undefined) {
        interruptTerminalRounds(idle.id);
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
  releaseClaims(info.root, info.id);
  // No Task holds this terminal any more and this window stops following it: its registered process is forgotten.
  removeAgentProcess(questionProjectId(projectAt(info.root)), info.id);
  endFiledWork(info.root, info.id);
  for (const job of endTerminalJobs(info.id, abnormal)) finishJob(info.root, job);
  withdrawWaiting(info.root, (announcement) => announcement.terminal === info.id);
  awayNotices?.refresh();
}

/** Why a command's end is not a normal end: undefined for exit code 0; an unreported status counts as abnormal. */
function abnormalCommandEnd(exitCode: number | undefined): string | undefined {
  if (exitCode === 0) return undefined;
  return exitCode === undefined ? "its command ended without an exit status" : `its command exited with code ${exitCode}`;
}

function finishAgentTerminal(terminal: vscode.Terminal, info: { id: string; jobId?: string; root: string; line: string; since: number }, abnormal?: string): void {
  if (agentTerminals.get(terminal) !== info) return;
  // An idle or ended terminal is no longer followed: later signals and its close change nothing.
  unfollowTerminal(terminal);
  endAgentWork(info, abnormal);
  if (configuredAutoExit()) {
    terminal.dispose();
  } else {
    idleTerminals.set(terminal, info);
  }
}

/** The shell process of each followed terminal, read once and kept with it, when the hook named no process. */
const shellPids = new WeakMap<vscode.Terminal, number | undefined>();

/**
 * `time.CHECK_DUE` for the agent terminals this window follows in Agent running: a terminal the editor no longer lists
 * (or that already has an exit status) without Trama having seen it close ends as a closure; one whose agent process is
 * gone (the one the hook reported or, without it, the terminal's shell) ends as an abnormal end of its command. Both
 * release the Tasks, withdraw the announcements and report `Trama stopped following <name>: <reason>.` once; with
 * `trama.autoExit` on an agent that is gone has its terminal disposed. A live process, however still, changes nothing.
 * The conversations of omp Chat are not looked at here: their end comes from their process and their connection.
 */
export async function checkAgentTerminals(only?: string): Promise<{ id: string; name: string; reason?: string }[]> {
  const listed = new Set(vscode.window.terminals);
  const checked: { id: string; name: string; reason?: string }[] = [];
  for (const [terminal, info] of [...agentTerminals]) {
    if (agentTerminals.get(terminal) !== info || (only !== undefined && info.id !== only)) continue;
    const projectId = questionProjectId(projectAt(info.root));
    const registered = readAgentProcess(projectId, info.id);
    const terminalGone = !listed.has(terminal) || terminal.exitStatus !== undefined;
    if (!terminalGone && registered === undefined && !shellPids.has(terminal)) shellPids.set(terminal, await terminal.processId);
    const verdict = terminalVerdict({ terminalGone, ...(registered === undefined ? {} : { hookPid: registered.pid }), ...(shellPids.get(terminal) === undefined ? {} : { shellPid: shellPids.get(terminal) }) }, processAlive);
    // The await may have let a signal end this terminal first: then nothing is ended or reported twice.
    if (agentTerminals.get(terminal) !== info) continue;
    if (verdict === undefined) { checked.push({ id: info.id, name: terminal.name }); continue; }
    reportStoppedFollowing(terminal.name, verdict);
    checked.push({ id: info.id, name: terminal.name, reason: verdict });
    // The execution check stops following it: the rounds it asked end.
    interruptTerminalRounds(info.id);
    if (verdict === "the terminal is gone") {
      unfollowTerminal(terminal);
      endAgentWork(info, "its terminal was closed");
    } else {
      finishAgentTerminal(terminal, info, "the agent's process is gone");
    }
  }
  return checked;
}

/** The projects this window launched work in, whose agent registry the check prunes. */
const launchedRoots = new Set<string>();

/**
 * Whether this window has work in a terminal: a terminal it follows in Agent running, or a job in its registry that is not
 * an omp Chat conversation's. The conversations neither arm the execution check nor are looked at by it: their end comes
 * from the exit of their process or the closing of their connection.
 */
export const hasTerminalWork = (): boolean => agentTerminals.size > 0 || hasJobs((job) => "held" in job.place || chatConversations?.has(job.place.terminal) !== true);

// The holders this window follows, as it answers `followed-holders` and as its own check leaves alone: its terminals in Agent running, its omp Chat conversations (also those it is about to resume) and its General.
addHolderFollower((holder) => [...agentTerminals.values()].some((info) => info.id === holder) || chatConversations?.has(holder) === true || general?.follows(holder) === true);
// The job conversations of this window hold what their agent files until its turn ends, with no hook.
addJobFollower((holder) => chatConversations?.followsJob(holder) === true);

/**
 * Whether `terminal` is a terminal or an omp Chat conversation of this window, working or idle, or its General, in the project `root`: the only agents whose question
 * rounds the window accepts. An agent started by hand, or in a terminal this window does not have (any more), is none of them.
 */
export function ownsAgentTerminal(terminal: string, root: string): boolean {
  for (const info of [...agentTerminals.values(), ...idleTerminals.values()]) {
    if (info.id === terminal) return info.root === root;
  }
  const conversation = chatConversations?.named(terminal);
  if (conversation !== undefined) return conversation.root === root;
  return general?.owns(terminal) === true && generalFolder() === root;
}

/** The name on the tab of the terminal or conversation `terminal` (`Design`, a Task's tab name, `General`), or undefined when this window has none by that identity. */
export function agentTabName(terminal: string): string | undefined {
  for (const [tab, info] of [...agentTerminals, ...idleTerminals]) {
    if (info.id === terminal) return tab.name;
  }
  const conversation = chatConversations?.named(terminal);
  if (conversation !== undefined) return conversation.name;
  return general?.owns(terminal) === true ? "General" : undefined;
}

/** This window stops following `terminal`. */
function unfollowTerminal(terminal: vscode.Terminal): void {
  agentTerminals.delete(terminal);
  awayNotices?.refresh();
}

/**
 * One execution check (`time.CHECK_DUE`): the agent terminals of this window, then, for the project open in the window and
 * every project this window launched work in, the Tasks and announcements no window follows and the agent registry. The
 * scheduler (`execution-check.ts`) decides when it runs.
 */
export async function runExecutionCheck(openRoot?: string): Promise<void> {
  await checkAgentTerminals();
  const roots = new Set(launchedRoots);
  if (openRoot !== undefined) roots.add(openRoot);
  for (const root of roots) {
    await releaseUnfollowed(root);
    // Only when an issue is being published: the check takes no extra turn of the event loop at rest.
    if (publishingIssues(projectAt(root)).length > 0) await stopUnfollowedPublications(root);
    await pruneAgentProcesses(root);
  }
}

/** How long after its creation a terminal waits for its shell integration before the command is typed anyway. */
export const SHELL_READY_WAIT_MS = 10_000;

/**
 * Writes the agent's command once the terminal's shell is ready to receive it, exactly once and never into a closed terminal.
 * Before the shell is ready the terminal is in canonical mode, which keeps at most 1024 bytes a line on macOS (4096 on Linux):
 * a longer line loses its tail and its Enter and stays typed at the prompt. Ready means the shell integration is active
 * (already present, or reported by `onDidChangeTerminalShellIntegration` for this terminal): the line then goes with
 * `shellIntegration.executeCommand`. A shell that does not report it within `SHELL_READY_WAIT_MS` gets `sendText`.
 * Neither call shows the terminal or moves the focus.
 */
function writeWhenShellReady(terminal: vscode.Terminal, line: string, isOpen: () => boolean = () => agentTerminals.has(terminal)): void {
  if (terminal.shellIntegration !== undefined) {
    terminal.shellIntegration.executeCommand(line);
    return;
  }
  let done = false;
  const subscriptions: vscode.Disposable[] = [];
  const settle = (): boolean => {
    if (done) return false;
    done = true;
    clearTimeout(timer);
    for (const subscription of subscriptions) subscription.dispose();
    return true;
  };
  const write = (integration: vscode.TerminalShellIntegration | undefined): void => {
    if (!settle() || !isOpen()) return;
    if (integration === undefined) terminal.sendText(line);
    else integration.executeCommand(line);
  };
  const timer = setTimeout(() => write(undefined), SHELL_READY_WAIT_MS);
  subscriptions.push(
    vscode.window.onDidChangeTerminalShellIntegration((e) => {
      if (e.terminal === terminal) write(e.shellIntegration);
    }),
    vscode.window.onDidCloseTerminal((closed) => {
      if (closed === terminal) settle();
    }),
  );
}

/** Whether `commandLine`, as the terminal reported it, is the line Trama last typed into `terminal`, compared after trimming. */
function isTypedCommand(terminal: vscode.Terminal, commandLine: string | undefined): boolean {
  const typed = agentTerminals.get(terminal)?.line;
  return typed !== undefined && commandLine !== undefined && commandLine.trim() === typed.trim();
}

/** What a design request announces: its title. */
export type DesignAnnouncement = string;
/** A card a launch announces: a Resolve Drifts, which names the Drifts it resolves (read once the instruction is sent, when they are known), the refinement of a Proposal (bound to it), a manual scan, an import (`work`), or Unify Drifts, a Drift titled by the number of Drifts it unites. */
export type LaunchAnnouncement =
  | { kind: "resolve"; drifts: () => readonly string[] }
  | { kind: "unify"; drifts: () => readonly string[] }
  | { kind: "refine"; proposal: string; title: string }
  | { kind: "work" | "check"; title: string };

/** Announces the card of a launch and returns its ID, or undefined when no card is announced. */
function announceLaunch(root: string, announcement: DesignAnnouncement | LaunchAnnouncement, origin: AgentOrigin): string | undefined {
  try {
    if (typeof announcement === "string") return announce(projectAt(root), { kind: "proposal", title: announcement, source: "request", ...origin }).id;
    if (announcement.kind === "unify") {
      const drifts = [...announcement.drifts()];
      if (drifts.length === 0) return undefined;
      return announce(projectAt(root), { kind: "drift", title: `Unifying ${drifts.length} Drifts`, source: "request", ...origin }).id;
    }
    if (announcement.kind === "resolve") {
      // Resolve Drifts is a Proposal named "Resolve Drifts" that names its Drifts; the panel titles it from them.
      const drifts = [...announcement.drifts()];
      if (drifts.length === 0) return undefined;
      return announce(projectAt(root), { kind: "proposal", title: "Resolve Drifts", drifts, source: "request", ...origin }).id;
    }
    // A refinement announces the Proposal it refines: bound to it from the start, with its title, so it is no card of its own.
    if (announcement.kind === "refine") return announce(projectAt(root), { kind: "proposal", title: announcement.title, proposal: announcement.proposal, source: "request", ...origin }).id;
    const phase = announcement.kind === "check" ? { kind: "check" as const, phase: "scanning" as const } : { kind: "work" as const };
    return announce(projectAt(root), { ...phase, title: announcement.title, source: "request", ...origin }).id;
  } catch (err) {
    if (err instanceof TramaError) void vscode.window.showErrorMessage(`Trama: could not announce the card: ${err.message}`);
    else throw err;
    return undefined;
  }
}

/** How an instruction left Trama: an integrated agent terminal, or a conversation of omp Chat. */
export type Launch = "terminal" | "conversation";
/** Whether the instruction was written into an integrated terminal or sent to an omp Chat conversation. */
export const launched = (launch: Launch | undefined): boolean => launch !== undefined;
/** The agent command template and prompt are built when sent. */
interface TerminalRun {
  template: (family: ShellFamily) => string;
  prompt: () => string;
  /** Whether the run's hook follows it: omp with its hook module in the package. Without it the command ends the run, as for any other agent. */
  hooked: boolean;
  /** The options of the omp process, unquoted: the terminal quotes them in `template`, a conversation passes them as arguments. */
  options: string[][];
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
 * The instruction with its limit, sub-agent, parallel execution, advisor, Async Drift Resolver, context sharing, ask, auto-exit and language sentences.
 * With `subAgents` false (the reconciliation of a merge) neither the limit sentence nor the sub-agent one goes to it.
 * The parallel execution sentence goes right after the sub-agent sentence (or the limit one, when there is none), only to a run over several Tasks and only when
 * `trama.parallelExecution` is on, read now. The ask sentence always stays on the instruction's line, after the limit, sub-agent and optional-feature sentences and before the language one;
 * the auto-exit sentence, when `trama.autoExit` is on, sits between the ask sentence and the language one.
 */
function agentPrompt(instruction: string, role: Role, filesDrifts: boolean, severalTasks: boolean, advisor?: string, limit?: number, subAgents = true): string {
  const withLimit = subAgents ? withAgentLimit(instruction, limit) : instruction;
  const withSubAgent = subAgents && canScan(role) && advisor === undefined ? `${withLimit} Compare each Machine with the trama-analysis sub-agent.` : withLimit;
  const withParallel = severalTasks && configuredParallelExecution() ? `${withSubAgent} ${PARALLEL_EXECUTION_SENTENCE}` : withSubAgent;
  const withAdvisor = advisor !== undefined ? `${withParallel} ${advisor}` : withParallel;
  const withResolver = withAsyncDriftResolver(withAdvisor, filesDrifts && configuredAsyncDriftResolver());
  const withSharing = withContextSharing(withResolver, configuredSubagentsContextSharing());
  const withAsk = `${withSharing} ${ASK_DEVELOPER_SENTENCE}`;
  const withExit = configuredAutoExit() ? `${withAsk} ${AUTO_EXIT_SENTENCE}` : withAsk;
  return withLanguage(withExit, configuredLanguage());
}

/** The model roles, trimmed (`trama.analysis`, `trama.scan`, `trama.execution`). Application scope: only the user's settings count. */
export const configuredModels = (): Models => ({
  analysis: settings().get<string>("analysis", "").trim(),
  scan: settings().get<string>("scan", "").trim(),
  execution: settings().get<string>("execution", "").trim(),
});

function terminalRun(omp: string, instruction: Instruction, role: Role, filesDrifts: boolean, severalTasks: boolean, model: string, overlay: string | undefined, advisor: boolean, attachment: string | undefined, limit: number | undefined, subAgents: boolean): TerminalRun {
  const hook = bundledOmpHook();
  const models = { model, scan: configuredModels().scan };
  const scanning = subAgents && canScan(role) && !advisor;
  return {
    options: ompOptions(scanning, models, hook, overlay, advisor),
    template: (family) => agentTemplate(omp, scanning, models, family, hook, overlay, advisor, attachment),
    prompt: () => agentPrompt(textOf(instruction), role, filesDrifts, severalTasks, advisor ? ADVISOR_SENTENCE : undefined, limit, subAgents),
    hooked: hook !== undefined,
  };
}

/** The extension's global storage, where the overlay of an omp launch is written; set once when the extension activates. */
let overlayStorage: vscode.Uri | undefined;
export function setOverlayStorage(storage: vscode.Uri): void {
  overlayStorage = storage;
}

/**
 * The omp exclusions of this launch: when `trama.ignoreInstructionFiles` is on (read now), the developer's `disabledExtensions` followed by the
 * identities of the instruction files found now in the project's folder. Whatever fails in the search or the reading leaves them out: the launch never stops here.
 */
async function instructionExclusionsFor(root: string): Promise<string[]> {
  if (!configuredIgnoreInstructionFiles()) return [];
  try {
    const home = homedir();
    const ours = instructionExclusions(await findInstructionFiles(root, home), root, home);
    return ours.length === 0 ? [] : mergeExclusions(await developerExclusions(root, home), ours);
  } catch {
    return [];
  }
}

/**
 * Writes the overlay of an omp launch into the extension's storage and returns its path, or `undefined` when it cannot be written: the overlay
 * never goes into the repository and an error here never stops the launch (`quality#agent-terminal/Agent running`).
 */
async function writeLaunchOverlay(root: string, advisor: boolean): Promise<string | undefined> {
  const text = launchOverlay({ ...(advisor ? { advisor: { scan: configuredModels().scan } } : {}), disabledExtensions: await instructionExclusionsFor(root) });
  if (overlayStorage === undefined) return undefined;
  try {
    mkdirSync(overlayStorage.fsPath, { recursive: true });
    const file = join(overlayStorage.fsPath, "launch.yml");
    writeFileAtomic(file, text);
    return file;
  } catch {
    return undefined;
  }
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
export function startHeldJob(root: string, kind: JobKind, id: string, runAll?: RunAll): void {
  startJob(kind, root, { held: true }, id, [], runAll);
}

/** Ends the held job `id`: its steps are over, or it was released with `abnormal`. */
export function endHeldJob(root: string, id: string, abnormal?: string): void {
  for (const job of endHeldJobs(root, id, abnormal)) finishJob(root, job);
}

export interface LaunchJobOptions {
  id?: string;
  /** Whether the instruction lets the agent file Drifts: the Async Drift Resolver's sentence then goes to it. */
  filesDrifts?: boolean;
  /** Whether the instruction is for a run over several Tasks (Run all, a Run of its sequence by model): the parallel execution's sentence then goes to it. */
  severalTasks?: boolean;
  /** The model the instruction runs on when a Proposal's model applies (`proposalRunModel`); absent, the model of the role in Settings. */
  model?: RunModel;
  /** The Task a single-Task Run implements: its terminal carries it, so a sub-agent stopped by a claim names it in the timings. */
  task?: string;
  /** The sub-agent places the instruction gives, for a Run that starts with its share of `trama.maxParallelAgents`; absent, the whole limit. */
  limit?: number;
  /** Called once the Run's job ends: with why it ended abnormally, or with nothing for a normal end. A Run that did not start ends with a reason too. */
  onEnd?: (abnormal?: string) => void;
  /** Overrides the role the terminal's name gives (Unify Drifts is always analysis, whatever its terminal is called). */
  role?: Role;
  /** Unify Drifts: the text of the instructions Trama carries (`file` is where it lives, `text` its content). omp gets `@file` before the one-line prompt; the chat gets the text, a blank line, then the prompt. */
  attachment?: { file: string; text: string };
  /** Unify Drifts: the Drifts the job gathered, read when the job starts. */
  drifts?: () => readonly string[];
  /** Set on the Run of a `Run all` that stands alone (not cut by model): its job keeps what the time-left estimate needs. */
  runAll?: RunAll;
  /** False for the reconciliation of a merge: the instruction has no sub-agent limit and no sub-agent sentence, and the command has no `--slow`. Absent, true. */
  subAgents?: boolean;
  /** Called once, with the identity of the terminal (or omp Chat conversation) the instruction goes to, when the launch is sure to go on: the publication of issues records there who publishes them. */
  onStarted?: (terminal: string) => void;
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
  const role = jobOptions.role ?? roleOf(name);
  const runModel = jobOptions.model?.model ?? configuredModels()[role];
  // A window knows only its own work: nothing is reserved or announced to other windows.
  if (job === undefined && !canSend()) return undefined;
  const launch = async (): Promise<Launch | undefined> => {
    // First of all, before any terminal, conversation, announcement or job: omp must exist and be up to date.
    const omp = await ompBeforeLaunch(configuredOmpPath());
    if (omp === undefined) return undefined;
    if (!canSend()) return undefined;
    const advisor = job === "run" && configuredAdvisorScanner();
    const isRun = job === "run";
    const runTask = isRun ? jobOptions.task : undefined;
    const parallel = isRun && configuredParallelExecution();
    const overlay = await writeLaunchOverlay(root, advisor);
    const run = terminalRun(omp, instruction, role, filesDrifts, severalTasks, runModel, overlay, advisor, jobOptions.attachment?.file, jobOptions.limit, jobOptions.subAgents !== false);
    const endpoint = await questionEndpoint(root);
    if (!canSend()) return undefined;
    if (!endpoint) throw new TramaError("The launching editor window's question channel is not available.");
    const terminalId = newTerminalId();
    jobOptions.onStarted?.(terminalId);
    // With omp Chat in use the instruction opens a conversation; its card and job are written first, under the identity a terminal would have, so a failed start hands them to that terminal.
    let writtenFor: "conversation" | undefined;
    if (ompChatInUse()) {
      const prompt = run.prompt();
      launchedRoots.add(root);
      // The conversation's work ends at omp's answer to the prompt of its work (`omp-acp.TURN_ENDED`), hooked or not.
      const cardId = announceProposal === undefined ? undefined : announceLaunch(root, announceProposal, { terminal: terminalId });
      onSent?.(Date.now());
      let savedJob: SavedJob | undefined;
      if (job !== undefined && jobId !== undefined) {
        const drifts = jobOptions.drifts?.() ?? [];
        const started = startJob(job, root, { terminal: terminalId }, jobId, drifts, jobOptions.runAll);
        if (started !== undefined && jobOptions.onEnd !== undefined) runEnds.set(started, jobOptions.onEnd);
        savedJob = { id: jobId, kind: job, name, ...(cardId === undefined ? {} : { announcement: cardId }), ...(drifts.length === 0 ? {} : { drifts: [...drifts] }) };
      }
      const opened = await openConversation({ id: terminalId, root, name, launch: conversationLaunch(root, run.options, endpoint, terminalId, jobId, advisor, isRun, runTask, parallel), first: { text: prompt, ...(jobOptions.attachment === undefined ? {} : { attachment: jobOptions.attachment.file }) }, focus: false, hook: run.hooked, ...(savedJob === undefined ? {} : { job: savedJob }) });
      if (opened) return "conversation";
      writtenFor = "conversation";
    }
    const asTab = settings().inspect<string>("terminalLocation")?.globalValue === "editor";
    const defaultShell = vscode.env.shell;
    // On Windows a default shell other than Windows PowerShell 5.1, PowerShell 7 or Git Bash is replaced for this terminal only.
    const replaced = !isSupportedShell(defaultShell);
    const shellPath = replaced ? win32.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe") : undefined;
    const terminal = vscode.window.createTerminal({
      name,
      cwd: root,
      shellPath,
      env: { ...terminalEnv(endpoint, terminalId, jobId, advisor, isRun, runTask, parallel), ...ompTerminalEnv(omp) },
      ...(asTab ? { location: { viewColumn: vscode.ViewColumn.Active, preserveFocus: true } } : {}),
    });
    if (replaced) warnShellReplaced(defaultShell);
    const family = shellFamily(shellPath ?? defaultShell);
    const line = agentCommandLine(run.template(family), run.prompt(), family);
    agentTerminals.set(terminal, { id: terminalId, ...(jobId === undefined ? {} : { jobId }), root, line, since: Date.now() });
    awayNotices?.refresh();
    launchedRoots.add(root);
    setHooked(terminalId, run.hooked);
    if (asTab) terminal.show(true);
    // After a failed conversation start the card, the job and the sent instant already stand: they are the terminal's now.
    if (writtenFor === undefined) {
      const startedAt = Date.now();
      if (announceProposal !== undefined) announceLaunch(root, announceProposal, { terminal: terminalId });
      onSent?.(startedAt);
      if (job !== undefined && jobId !== undefined) {
        const started = startJob(job, root, { terminal: terminalId }, jobId, jobOptions.drifts?.() ?? [], jobOptions.runAll);
        if (started !== undefined && jobOptions.onEnd !== undefined) runEnds.set(started, jobOptions.onEnd);
      }
    }
    // Last step: the job, the announcement and the sent instant already stand when the command is written.
    writeWhenShellReady(terminal, line);
    return "terminal";
  };
  return job !== undefined ? inSendTurn(launch) : launch();
}

/**
 * A new agent named `name` with no job and no hook: with omp Chat in use a conversation (`conversation` has its options and the instruction it starts with),
 * which takes the focus in its message field; otherwise, or when omp does not start, a terminal, where `lineOf` builds the command for the
 * shell it runs in, written when the shell is ready. The terminal takes the focus. The card is announced as work either way; Ask more's conversation announces it when its first message starts.
 */
async function openFocusedTerminal(root: string, name: string, omp: string, lineOf: (family: ShellFamily) => string, conversation: { options: string[][]; instruction: { part: string; attachment: string; placeholder: string } }): Promise<void> {
  const endpoint = await questionEndpoint(root);
  if (!endpoint) throw new TramaError("The launching editor window's question channel is not available.");
  const terminalId = newTerminalId();
  if (ompChatInUse()) {
    // Ask more's conversation opens empty: its card is announced when its first message starts, so a conversation left empty leaves no trace.
    const { part, attachment, placeholder } = conversation.instruction;
    const opened = await openConversation({
      id: terminalId,
      root,
      name,
      launch: conversationLaunch(root, conversation.options, endpoint, terminalId),
      focus: true,
      hook: false,
      instruction: {
        placeholder,
        compose: (message) => ({ text: instructedMessage(part, message), attachment }),
        announce: () => {
          announceLaunch(root, { kind: "work", title: name }, { terminal: terminalId });
          launchedRoots.add(root);
          setHooked(terminalId, false);
        },
      },
    });
    if (opened) return;
  }
  const asTab = settings().inspect<string>("terminalLocation")?.globalValue === "editor";
  const defaultShell = vscode.env.shell;
  const replaced = !isSupportedShell(defaultShell);
  const shellPath = replaced ? win32.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe") : undefined;
  const terminal = vscode.window.createTerminal({
    name,
    cwd: root,
    shellPath,
    env: { ...terminalEnv(endpoint, terminalId), ...ompTerminalEnv(omp) },
    ...(asTab ? { location: { viewColumn: vscode.ViewColumn.Active, preserveFocus: false } } : {}),
  });
  announceLaunch(root, { kind: "work", title: name }, { terminal: terminalId });
  if (replaced) warnShellReplaced(defaultShell);
  const line = lineOf(shellFamily(shellPath ?? defaultShell));
  agentTerminals.set(terminal, { id: terminalId, root, line, since: Date.now(), askMore: true });
  launchedRoots.add(root);
  setHooked(terminalId, false);
  terminal.show(false);
  writeWhenShellReady(terminal, line);
}

/**
 * Ask more: a new, bare chat with omp about one thing, `part` (the card or question chosen, read when pressed), named `name`
 * and on the analysis role's model (`trama.analysis`, read now). Trama's fixed instructions (`media/ask-more.md`) come first, as a
 * file attached with `@`. No job and no announcement but the terminal's work card; the only sentence added is the language one.
 * The prompt goes to the terminal, or to the omp Chat conversation, which opens empty with `placeholder` in its field: the instruction goes with the developer's first message.
 */
export async function openAskMore(root: string, name: string, part: string, placeholder: string): Promise<void> {
  const file = bundledAskMoreInstructions();
  if (file === undefined) throw new TramaError("Ask more is unavailable: its instructions are missing from the extension's package.");
  const omp = await ompBeforeLaunch(configuredOmpPath());
  if (omp === undefined) return;
  const model = configuredModels().analysis;
  const instruction = withLanguage(part, configuredLanguage());
  // The command is one line: the part's own line breaks become spaces.
  const oneLine = instruction.replace(/\s*\n\s*/g, " ");
  await openFocusedTerminal(root, name, omp, (family) => `${askMoreCommandLine(omp, model, family)} ${quote(family, `@${file}`)} ${quote(family, oneLine)}`, { options: askMoreOptions(model), instruction: { part: instruction, attachment: file, placeholder } });
}

/** The official installer of omp, by system: the script chooses bun or the binary. */
export const INSTALL_OMP_COMMAND = { posix: "curl -fsSL https://omp.sh/install | sh", windows: "irm https://omp.sh/install.ps1 | iex" } as const;

/**
 * The shell of a bare terminal (`installOmp`, `loginOmp`) and the family its commands are quoted for. On Windows the commands are PowerShell's or Git Bash's: any
 * other shell is replaced by Windows PowerShell 5.1 for that terminal only (`shellPath`); elsewhere the default shell is kept.
 */
function bareTerminalShell(windows: boolean): { family: ShellFamily; shellPath: string | undefined } {
  const defaultShell = vscode.env.shell;
  const windowsPowerShell = win32.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  const family = shellFamily(defaultShell, windows);
  if (!windows || (isSupportedShell(defaultShell, true) && (family === "powershell" || family === "powershell5"))) return { family, shellPath: undefined };
  return { family: "powershell5", shellPath: windowsPowerShell };
}

/**
 * Opens a bare visible terminal named `name` in the user's home folder, in the terminals area whatever `trama.terminalLocation` says. It is no agent terminal: no
 * `TRAMA_*` variable, no hook, no ghost, no job. `line` is written when the shell is ready. `onFinished` runs once, when that command ends or the terminal closes.
 */
function openBareTerminal(name: string, shellPath: string | undefined, env: Record<string, string> | undefined, line: string, onFinished: () => void): vscode.Terminal {
  const terminal = vscode.window.createTerminal({ name, cwd: homedir(), shellPath, ...(env === undefined ? {} : { env }) });
  let open = true;
  let finished = false;
  const subscriptions: vscode.Disposable[] = [];
  const finish = (): void => {
    if (finished) return;
    finished = true;
    for (const subscription of subscriptions) subscription.dispose();
    onFinished();
  };
  subscriptions.push(
    vscode.window.onDidEndTerminalShellExecution((e) => {
      if (e.terminal === terminal && e.execution.commandLine.value.trim() === line) finish();
    }),
    vscode.window.onDidCloseTerminal((closed) => {
      if (closed !== terminal) return;
      open = false;
      finish();
    }),
  );
  terminal.show(false);
  writeWhenShellReady(terminal, line, () => open);
  return terminal;
}

/**
 * Install omp: a new visible terminal named `Install omp` in the user's home folder, in the terminals area whatever `trama.terminalLocation` says, with
 * the agent terminals' shell (Windows PowerShell on Windows, where the command needs it). It is no agent terminal: no `TRAMA_*` variable, no hook, no
 * ghost, no job. The official installer's command is written when the shell is ready. `onFinished` runs once, when the command ends or the terminal closes.
 * `systemCertificates` is the mode for this terminal (the saved setting unless the wizard's step says otherwise).
 */
export function installOmp(onFinished: () => void, windows = process.platform === "win32", systemCertificates = configuredSystemCertificates()): vscode.Terminal {
  const { shellPath } = bareTerminalShell(windows);
  // With System Certificates on and a bundle on disk the installer's downloads trust the system's authorities too; otherwise the terminal gets no environment of Trama's.
  const certificates = systemCertificatesEnv(systemCertificates);
  return openBareTerminal("Install omp", shellPath, Object.keys(certificates).length === 0 ? undefined : certificates, windows ? INSTALL_OMP_COMMAND.windows : INSTALL_OMP_COMMAND.posix, onFinished);
}

/**
 * Log in to a model provider: a new visible terminal named `Log in to <name>`, shaped like `installOmp`'s, that runs `<omp> login <id>`. `program` is the omp
 * program (`findOmp`), quoted for the terminal's shell; `provider` comes from `OMP_LOGIN_PROVIDERS`, so its `id` is never text the webview sent. The terminal's PATH starts
 * with the folders of omp and bun, so omp's script finds bun even when the editor started from a desktop launcher. Nothing of the terminal is read: not its output,
 * not its input, not the exit code. `onFinished` runs once, when the command ends or the terminal closes; every click opens another terminal and none is closed or reused.
 */
export function loginOmp(program: string, provider: OmpLoginProvider, onFinished: () => void, windows = process.platform === "win32", systemCertificates = configuredSystemCertificates()): vscode.Terminal {
  const { family, shellPath } = bareTerminalShell(windows);
  return openBareTerminal(`Log in to ${provider.name}`, shellPath, ompTerminalEnv(program, systemCertificates), `${quoteProgram(family, program)} login ${provider.id}`, onFinished);
}

/**
 * Log in `gh`, or give it access to Projects (`rules#github-project`): a new visible terminal in the terminals area, shaped like `loginOmp`'s, that runs
 * `gh auth login --hostname github.com --web --scopes project` (`Log in to GitHub`) or `gh auth refresh --hostname github.com --scopes project` (`Give access to Projects`).
 * `program` is the `gh` that `findGh` found; `args` is one of the two fixed lists of `src/core/github.ts`, never text the webview sent. It is no agent terminal: no `TRAMA_*`
 * variable, no hook, no ghost, no job. `onFinished` runs once, when the command ends or the terminal closes, whatever the outcome.
 */
export function loginGitHub(program: string, access: boolean, onFinished: () => void, windows = process.platform === "win32"): vscode.Terminal {
  const { family, shellPath } = bareTerminalShell(windows);
  const args = access ? GH_ACCESS_ARGS : GH_LOGIN_ARGS;
  return openBareTerminal(access ? "Give access to Projects" : "Log in to GitHub", shellPath, undefined, `${quoteProgram(family, program)} ${args.join(" ")}`, onFinished);
}

/** How long `omp auth-broker logout` may take before Trama stops it. */
export const LOGOUT_TIMEOUT_MS = 30_000;

/** The outcome of a logout command: it succeeded (exit code 0), or why it did not, in English as the editor's error shows it. */
export type LogoutOutcome = { ok: true } | { ok: false; reason: string };

/**
 * Log out of a model provider: `execFile(program, ["auth-broker", "logout", <id>])`, without a terminal and without a shell, with the environment of every omp process (`ompTerminalEnv`
 * over the inherited `env`, so a saved Cursor API key reaches omp as `CURSOR_ACCESS_TOKEN` and wins) and 30 seconds. `provider` comes from `OMP_LOGIN_PROVIDERS`, so its `id` is never
 * text the webview sent. Only the exit code and the error output are read: the reason of a failure is the last non-empty line of the error output, or else `exit code <n>`,
 * `could not start omp` or `timed out`; a certificate error in the error output is the certificate error text of the mode instead. Never rejects.
 */
export function logoutOmp(program: string, provider: OmpLoginProvider, timeoutMs = LOGOUT_TIMEOUT_MS, env: NodeJS.ProcessEnv = process.env): Promise<LogoutOutcome> {
  const { promise, resolve } = Promise.withResolvers<LogoutOutcome>();
  const systemCertificates = configuredSystemCertificates();
  execFile(program, ["auth-broker", "logout", provider.id], { timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024, env: { ...env, ...ompTerminalEnv(program, systemCertificates) } }, (error, _stdout, stderr) => {
    if (error === null) return resolve({ ok: true });
    const lines = String(stderr).split(/\r?\n/).map((line) => line.trim()).filter((line) => line !== "");
    const last = lines.at(-1);
    if (last !== undefined) return resolve({ ok: false, reason: certificateReason(last, [String(stderr)], systemCertificates) });
    const code = (error as ExecFileException).code;
    if (error.killed === true && code !== "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") return resolve({ ok: false, reason: "timed out" });
    resolve({ ok: false, reason: typeof code === "number" ? `exit code ${code}` : "could not start omp" });
  });
  return promise;
}
