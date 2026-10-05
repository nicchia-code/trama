import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type Project, writeFileEnsuringDir } from "./store";

/** The switch of this working copy. It is not a setting. */
const DIR = "multi-branch";

export const UNREADABLE_SWITCH = "Trama could not read the multi-branch switch, so it is off.";
export const SWITCH_NEEDS_AGENT = "Set trama.worktreeAgent in your user settings before turning multi-branch on.";
export const SWITCH_SAVE_FAILED = "Trama could not save the multi-branch switch.";

export type SwitchReading =
  | { kind: "missing" }
  | { kind: "on" }
  | { kind: "off" }
  /** `content` is the file text, so a later change can be told apart from the same text. */
  | { kind: "unreadable"; content: string };

export const multiBranchDir = (p: Project): string => join(p.dir, DIR);

export const multiBranchStatePath = (p: Project): string => join(multiBranchDir(p), "state");

/** One trailing line break is allowed; anything after that is part of the value. */
function withoutOneTrailingBreak(text: string): string {
  if (text.endsWith("\r\n")) return text.slice(0, -2);
  if (text.endsWith("\n")) return text.slice(0, -1);
  return text;
}

/**
 * Missing folder or file: the switch is off, and nothing is wrong with it.
 * Any other text, after at most one trailing line break, is unreadable and the switch is off.
 */
export function readMultiBranch(p: Project): SwitchReading {
  const file = multiBranchStatePath(p);
  if (!existsSync(file)) return { kind: "missing" };
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch (err) {
    return { kind: "unreadable", content: err instanceof Error ? err.message : String(err) };
  }
  const value = withoutOneTrailingBreak(text);
  if (value === "on") return { kind: "on" };
  if (value === "off") return { kind: "off" };
  return { kind: "unreadable", content: text };
}

/** The switch is on only when the file reads as `on`. Unreadable counts as off. */
export const multiBranchOn = (reading: SwitchReading): boolean => reading.kind === "on";

/**
 * Where an ordinary acceptance goes. On follows the worktree path.
 * Off, missing and unreadable stay in the open folder; only unreadable carries a notice.
 */
export function approvalBySwitch(reading: SwitchReading): { route: "worktree" } | { route: "folder"; notice: string | null } {
  if (reading.kind === "on") return { route: "worktree" };
  if (reading.kind === "unreadable") return { route: "folder", notice: UNREADABLE_SWITCH };
  return { route: "folder", notice: null };
}

/**
 * Writes `on` or `off` and, with the first write, a `.gitignore` that ignores the whole folder.
 * An existing `.gitignore` is left as it is. A failed write leaves the previous file in place.
 */
export function writeMultiBranch(p: Project, value: "on" | "off"): void {
  const dir = multiBranchDir(p);
  const ignore = join(dir, ".gitignore");
  if (!existsSync(ignore)) writeFileEnsuringDir(ignore, "*\n");
  const file = join(dir, "state");
  const tmp = join(dir, `.state.${process.pid}.tmp`);
  try {
    writeFileSync(tmp, `${value}\n`);
    renameSync(tmp, file);
  } catch (err) {
    try {
      unlinkSync(tmp);
    } catch {
      // The temporary file was never created, or it could not be removed; the state file is untouched.
    }
    throw err;
  }
}

/**
 * Turns the switch from the panel. Turning on does nothing, and writes nothing, when the worktree
 * command is blank. Turning off only writes `off`: a round that is already open is left alone.
 * Returns the warning to show, or null when the file now matches the request.
 */
export function turnMultiBranch(p: Project, on: boolean, worktreeAgent: string): string | null {
  if (on) {
    if (readMultiBranch(p).kind === "on") return null;
    if (worktreeAgent.trim() === "") return SWITCH_NEEDS_AGENT;
  }
  try {
    writeMultiBranch(p, on ? "on" : "off");
    return null;
  } catch {
    return SWITCH_SAVE_FAILED;
  }
}

/**
 * The unreadable-file warning, once per distinct content while the panel stays open.
 * Pass `warned` null when the panel has just opened. A readable file forgets the warning.
 */
export function noticeForSwitch(reading: SwitchReading, warned: string | null): { warning: string | null; warned: string | null } {
  if (reading.kind !== "unreadable") return { warning: null, warned: null };
  if (warned === reading.content) return { warning: null, warned };
  return { warning: UNREADABLE_SWITCH, warned: reading.content };
}
