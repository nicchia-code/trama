import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { writeFileAtomic } from "./atomic-write";
import { withFileLock, withFileLockAsync } from "./file-lock";
import { processStartTime, START_TOLERANCE_MS } from "./process-start";
import { runtimeDirectory, runtimeDirectoryReady } from "./question-channel";

/**
 * The agent process of an omp terminal or conversation of Trama: `pid` is the process, `started` when it was registered
 * (UTC, ISO 8601), `processStart` the instant the system says the process started (UTC, ISO 8601) and `window` the
 * window that follows it. The entry is written at once with the pid alone and `processStart` is added when the system has
 * told it (`writeAgentProcess`): an entry without it, because the reading is not over or the system did not tell, counts as
 * alive while `process.kill(pid, 0)` does not say `ESRCH`.
 */
export interface AgentProcess {
  pid: number;
  started: string;
  processStart?: string;
  window?: string;
}

/** The registrations of one project, by terminal identity. */
export type AgentProcesses = Record<string, AgentProcess>;

const fileOf = (projectId: string, runtimeDir?: string): string => join(runtimeDirectory(runtimeDir), `agents-${projectId}.json`);

const isProcess = (value: unknown): value is AgentProcess => {
  if (typeof value !== "object" || value === null) return false;
  const { pid, started, processStart, window } = value as Record<string, unknown>;
  return typeof pid === "number" && Number.isSafeInteger(pid) && pid > 0 && typeof started === "string" && (processStart === undefined || typeof processStart === "string") && (window === undefined || typeof window === "string");
};

/**
 * Every registered agent process of the project. `undefined` when the file exists but cannot be read: it then says nothing,
 * and nobody is released for want of a registration until it is readable again. A missing file is an empty registry.
 */
export function readAgentProcesses(projectId: string, runtimeDir?: string): AgentProcesses | undefined {
  const file = fileOf(projectId, runtimeDir);
  if (!existsSync(file)) return {};
  try {
    const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return undefined;
    const found: AgentProcesses = {};
    for (const [terminal, value] of Object.entries(parsed)) if (isProcess(value)) found[terminal] = value;
    return found;
  } catch {
    return undefined;
  }
}

/** The registered process of `terminal`, or `undefined` when none is registered or the file cannot be read. */
export const readAgentProcess = (projectId: string, terminal: string, runtimeDir?: string): AgentProcess | undefined =>
  readAgentProcesses(projectId, runtimeDir)?.[terminal];

/** Turns the registry into `processes`, or removes its file when none is left. */
function save(projectId: string, processes: AgentProcesses, runtimeDir?: string): void {
  const file = fileOf(projectId, runtimeDir);
  if (Object.keys(processes).length === 0) rmSync(file, { force: true });
  else writeFileAtomic(file, JSON.stringify(processes), { mode: 0o600 });
}

/** The folder of the registry's locks, private like the runtime folder so they are never mixed with the records of the editors; undefined without the private folder. */
function locksOf(runtimeDir?: string): string | undefined {
  const directory = runtimeDirectory(runtimeDir);
  if (!runtimeDirectoryReady(directory, true)) return undefined;
  const locks = join(directory, ".locks");
  mkdirSync(locks, { recursive: true, mode: 0o700 });
  return locks;
}

/** The change of the registry, read and written while the lock is held: in one go, so no other call of this process ever finds the lock held by it. */
function apply(projectId: string, change: (processes: AgentProcesses) => AgentProcesses | undefined, runtimeDir?: string): void {
  const processes = readAgentProcesses(projectId, runtimeDir);
  if (processes === undefined) return;
  const next = change(processes);
  if (next !== undefined) save(projectId, next, runtimeDir);
}

/**
 * Reads the registry, lets `change` return the one to keep (undefined: nothing changes), and writes it, all under the
 * lock of the project's registry, so the registrations of several windows at once are all kept. An unreadable file is left
 * alone, and nothing is written without the private folder.
 */
function update(projectId: string, change: (processes: AgentProcesses) => AgentProcesses | undefined, runtimeDir?: string): void {
  const locks = locksOf(runtimeDir);
  if (locks !== undefined) withFileLock(locks, `agents-${projectId}`, () => apply(projectId, change, runtimeDir));
}

/** `update` for the editor's host: the wait for the lock gives the thread back. */
async function updateAsync(projectId: string, change: (processes: AgentProcesses) => AgentProcesses | undefined, runtimeDir?: string): Promise<void> {
  const locks = locksOf(runtimeDir);
  if (locks !== undefined) await withFileLockAsync(locks, `agents-${projectId}`, () => apply(projectId, change, runtimeDir));
}

/**
 * Registers `pid` as the agent of `terminal`, followed by `window`, replacing an earlier one. The entry is written at once,
 * before the system is asked anything; the promise settles when the start of the process has been read from the system and
 * added to the entry, so a caller that must not wait (a launch, the opening of a conversation, the hook's message) does not
 * await it. The start is added only to the entry this call wrote: another registration for the terminal in the meantime keeps its own.
 * A start the system does not tell leaves the entry without one. An unreadable file is left alone.
 */
export async function writeAgentProcess(projectId: string, terminal: string, pid: number, window?: string, runtimeDir?: string): Promise<void> {
  const started = new Date().toISOString();
  const entry: AgentProcess = { pid, started, ...(window === undefined ? {} : { window }) };
  update(projectId, (processes) => ({ ...processes, [terminal]: entry }), runtimeDir);
  const start = await processStartTime(pid);
  if (start === undefined) return;
  const processStart = new Date(start).toISOString();
  await updateAsync(projectId, (processes) => {
    const current = processes[terminal];
    if (current === undefined || current.pid !== pid || current.started !== started) return undefined;
    return { ...processes, [terminal]: { ...current, processStart } };
  }, runtimeDir);
}

const without = (terminal: string) => (processes: AgentProcesses): AgentProcesses | undefined => {
  if (processes[terminal] === undefined) return undefined;
  const { [terminal]: _gone, ...rest } = processes;
  return rest;
};

/** Drops the registration of `terminal`; nothing is written when it has none. */
export function removeAgentProcess(projectId: string, terminal: string, runtimeDir?: string): void {
  update(projectId, without(terminal), runtimeDir);
}

/** `removeAgentProcess` for the editor's host: the wait for the lock gives the thread back. */
export function removeAgentProcessAsync(projectId: string, terminal: string, runtimeDir?: string): Promise<void> {
  return updateAsync(projectId, without(terminal), runtimeDir);
}

/**
 * Whether the registered process is still the one registered: `process.kill(pid, 0)` does not say `ESRCH` and, when the
 * entry has a start, the start read from the system again is the registered one within two seconds. An entry whose start
 * has not arrived yet counts as alive on `process.kill` alone. No entry, a start that cannot be read now and a different
 * start all say no: a number reused by another program holds nothing. Starts a program to read the start on macOS and
 * Windows, so the execution check asks it only for a holder no window follows.
 */
export async function sameProcess(entry: AgentProcess | undefined, platform?: NodeJS.Platform): Promise<boolean> {
  if (entry === undefined || !processAlive(entry.pid)) return false;
  if (entry.processStart === undefined) return true;
  const registered = Date.parse(entry.processStart);
  if (Number.isNaN(registered)) return false;
  const now = await processStartTime(entry.pid, platform);
  return now !== undefined && Math.abs(now - registered) <= START_TOLERANCE_MS;
}

/** Whether the process `pid` exists: `ESRCH` says it does not; any other outcome (success, `EPERM`) says it does. Sends no signal and starts nothing. */
export function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}
