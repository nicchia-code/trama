// The pure parts of the omp check before a launch: where omp is looked for, how the answer of `omp update --check` is read, and how long an outcome holds.
import { delimiter, join } from "node:path";

/** How long the outcome of a check holds. */
export const OMP_UPDATE_TTL_MS = 60 * 60 * 1000;

/**
 * The outcome of the last check as it is kept: when, for which omp program, the version that answered and, when the check found a version that is not installed
 * yet, that version (`newer`), which the next launch installs.
 */
export interface StoredCheck {
  checkedAt: string;
  omp: string;
  version?: string;
  newer?: string;
}

/**
 * The folders omp is looked for in when `trama.ompPath` is empty, in order: the editor's PATH, then `.bun/bin` and `.local/bin` of the home folder.
 * `pathVariable` is the editor's PATH, `separator` its separator.
 */
export function ompSearchFolders(pathVariable: string | undefined, home: string, separator: string = delimiter): string[] {
  return [...(pathVariable ?? "").split(separator).filter((folder) => folder !== ""), join(home, ".bun", "bin"), join(home, ".local", "bin")];
}

/** The file name of the omp program on the system. */
export const ompFileName = (windows: boolean): string => (windows ? "omp.exe" : "omp");

/** Whether `stored` still holds at `now` (ms) for `program`: younger than an hour, not in the future, and for the same program. */
export function checkHolds(stored: StoredCheck | undefined, program: string, now: number): boolean {
  if (stored === undefined || stored.omp !== program) return false;
  const at = Date.parse(stored.checkedAt);
  return Number.isFinite(at) && at <= now && now - at < OMP_UPDATE_TTL_MS;
}

/**
 * The version a launch has to install first: the `newer` of `stored` while it holds at `now` (ms) for `program`, unless omp already is that version (`installed`,
 * as when the developer updated it by hand). Undefined when there is nothing to install.
 */
export function newerToInstall(stored: StoredCheck | undefined, program: string, now: number, installed?: string): string | undefined {
  if (stored === undefined || !checkHolds(stored, program, now)) return undefined;
  return stored.newer === undefined || stored.newer === installed ? undefined : stored.newer;
}

/** What `omp update --check` said. */
export type CheckReading = { kind: "latest"; version?: string } | { kind: "newer"; version: string; current?: string } | { kind: "unexpected" };

const ANSI = /\u001b\[[0-9;]*[A-Za-z]/g;

/** Reads the standard output of `omp update --check` without colour codes. */
export function readUpdateCheck(output: string): CheckReading {
  const text = output.replace(ANSI, "");
  const current = /Current version:\s*(\S+)/i.exec(text)?.[1];
  const newer = /New version available:\s*(\S+)/i.exec(text)?.[1];
  if (newer !== undefined) return { kind: "newer", version: newer, ...(current === undefined ? {} : { current }) };
  if (current !== undefined || /Already up to date/i.test(text) || /(managed|updated|kept up to date|installed) (by|through|via) /i.test(text)) {
    return { kind: "latest", ...(current === undefined ? {} : { version: current }) };
  }
  return { kind: "unexpected" };
}
