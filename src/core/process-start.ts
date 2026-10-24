import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";

/** How long the operating system may take to tell the start of a process: the longest wait of the execution check. */
const READ_TIMEOUT_MS = 5000;

/** The clock ticks per second the kernel counts a Linux process's start in (`USER_HZ`, 100 on every platform Trama supports). */
const LINUX_TICKS_PER_SECOND = 100;

/** The most two readings of one process's start may differ by, in milliseconds: the resolution of the readings is a second. */
export const START_TOLERANCE_MS = 2000;

/**
 * The start of a Linux process, in milliseconds since the epoch, from the text of `/proc/<pid>/stat` (field 22, in clock ticks
 * since boot) and the `btime` line of `/proc/stat` (the boot instant, in seconds). `undefined` when either does not say.
 */
export function linuxStartTime(stat: string, procStat: string): number | undefined {
  // The command name (field 2) sits in parentheses and may hold spaces and parentheses: the fields count from the last `)`.
  const rest = stat.slice(stat.lastIndexOf(")") + 1).trim().split(/\s+/);
  const ticks = Number(rest[19]);
  const boot = /^btime\s+(\d+)$/m.exec(procStat)?.[1];
  if (!Number.isSafeInteger(ticks) || boot === undefined) return undefined;
  return Number(boot) * 1000 + Math.round((ticks * 1000) / LINUX_TICKS_PER_SECOND);
}

/** The start of a process from the output of `ps -o lstart=` (the local time `Sat Oct 24 14:42:09 2026`), in milliseconds since the epoch; `undefined` when it is not a date. */
export function psStartTime(output: string): number | undefined {
  const start = Date.parse(output.trim());
  return Number.isNaN(start) ? undefined : start;
}

/** The start of a process from the output of the Windows command (the Unix time, in milliseconds); `undefined` when it is not a number. */
export function windowsStartTime(output: string): number | undefined {
  const start = Number(output.trim());
  return Number.isSafeInteger(start) && start > 0 ? start : undefined;
}

function run(program: string, args: string[]): Promise<string | undefined> {
  const { promise, resolve } = Promise.withResolvers<string | undefined>();
  // No shell, fixed arguments (the process number is an integer), and the C locale so the day and month names of `ps` are English.
  execFile(program, args, { timeout: READ_TIMEOUT_MS, windowsHide: true, env: { ...process.env, LC_ALL: "C" } }, (error, stdout) => resolve(error === null ? stdout : undefined));
  return promise;
}

/**
 * The instant the process `pid` started, in milliseconds since the epoch, as the operating system tells it, or `undefined`
 * when it cannot be read (the process does not exist, or the system did not answer in time). Linux reads `/proc`; macOS runs
 * `ps -o lstart= -p <pid>`; Windows runs PowerShell on `(Get-Process -Id <pid>).StartTime`. Only the execution check calls
 * it, for the agent of a holder no window follows.
 */
export async function processStartTime(pid: number, platform: NodeJS.Platform = process.platform): Promise<number | undefined> {
  if (!Number.isSafeInteger(pid) || pid <= 0) return undefined;
  if (platform === "linux") {
    try {
      return linuxStartTime(readFileSync(`/proc/${pid}/stat`, "utf8"), readFileSync("/proc/stat", "utf8"));
    } catch {
      return undefined;
    }
  }
  if (platform === "win32") {
    const output = await run("powershell", ["-NoProfile", "-NonInteractive", "-Command", `([DateTimeOffset](Get-Process -Id ${pid}).StartTime).ToUnixTimeMilliseconds()`]);
    return output === undefined ? undefined : windowsStartTime(output);
  }
  const output = await run("ps", ["-o", "lstart=", "-p", String(pid)]);
  return output === undefined ? undefined : psStartTime(output);
}
