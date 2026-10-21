import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { writeFileAtomic } from "./atomic-write";
import { runtimeDirectory, runtimeDirectoryReady } from "./question-channel";

/** The agent process an omp terminal of Trama runs: `pid` is the process the hook reported, `started` when it was registered (UTC, ISO 8601). */
export interface AgentProcess {
  pid: number;
  started: string;
}

/** The registrations of one project, by terminal identity. */
export type AgentProcesses = Record<string, AgentProcess>;

const fileOf = (projectId: string, runtimeDir?: string): string => join(runtimeDirectory(runtimeDir), `agents-${projectId}.json`);

const isProcess = (value: unknown): value is AgentProcess => {
  if (typeof value !== "object" || value === null) return false;
  const { pid, started } = value as Record<string, unknown>;
  return typeof pid === "number" && Number.isSafeInteger(pid) && pid > 0 && typeof started === "string";
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

function save(projectId: string, processes: AgentProcesses, runtimeDir?: string): void {
  const directory = runtimeDirectory(runtimeDir);
  if (!runtimeDirectoryReady(directory, true)) return;
  const file = fileOf(projectId, runtimeDir);
  if (Object.keys(processes).length === 0) rmSync(file, { force: true });
  else writeFileAtomic(file, JSON.stringify(processes), { mode: 0o600 });
}

/** Registers `pid` as the agent of `terminal`, replacing an earlier one. An unreadable file is left alone. */
export function writeAgentProcess(projectId: string, terminal: string, pid: number, runtimeDir?: string): void {
  const processes = readAgentProcesses(projectId, runtimeDir);
  if (processes === undefined) return;
  save(projectId, { ...processes, [terminal]: { pid, started: new Date().toISOString() } }, runtimeDir);
}

/** Drops the registration of `terminal`; nothing is written when it has none. */
export function removeAgentProcess(projectId: string, terminal: string, runtimeDir?: string): void {
  const processes = readAgentProcesses(projectId, runtimeDir);
  if (processes === undefined || processes[terminal] === undefined) return;
  const { [terminal]: _gone, ...rest } = processes;
  save(projectId, rest, runtimeDir);
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
