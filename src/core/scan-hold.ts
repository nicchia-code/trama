import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getProposal, listProposals } from "./proposals";
import { featuresOfRef, parseRequirementRef } from "./requirements";
import { loadModel, type Project, writeFileEnsuringDir } from "./store";

export type SwitchReading =
  | { kind: "missing" }
  | { kind: "on" }
  | { kind: "off" }
  /** `content` is the file text, so a later change can be told apart from the same text. */
  | { kind: "unreadable"; content: string };
/** One trailing line break is allowed; anything after that is part of the value. */
function withoutOneTrailingBreak(text: string): string {
  if (text.endsWith("\r\n")) return text.slice(0, -2);
  if (text.endsWith("\n")) return text.slice(0, -1);
  return text;
}

/** Missing file: nothing is wrong. Any other text, after at most one trailing line break, than `on` or `off` is unreadable. */
export function readSwitchFile(file: string): SwitchReading {
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
/**
 * Writes `name` in a folder of this working copy through a temporary file, so a reader never sees it half written.
 * With the first write, a `.gitignore` that ignores the whole folder; an existing one is left as it is.
 * A failed write leaves the previous file in place.
 */
export function writeLocalFile(dir: string, name: string, content: string): void {
  const ignore = join(dir, ".gitignore");
  if (!existsSync(ignore)) writeFileEnsuringDir(ignore, "*\n");
  const tmp = join(dir, `.${name}.${process.pid}.tmp`);
  try {
    writeFileSync(tmp, content);
    renameSync(tmp, join(dir, name));
  } catch (err) {
    try {
      unlinkSync(tmp);
    } catch {
      // The temporary file was never created, or it could not be removed; the file is untouched.
    }
    throw err;
  }
}

/** The Hold scan switch and the held Proposals of this working copy. Not a setting, never versioned. */
const DIR = "scan-hold";

export const UNREADABLE_SCAN_HOLD = "Trama could not read the Hold scan switch, so it is off.";
export const SCAN_HOLD_SAVE_FAILED = "Trama could not save the Hold scan switch.";
export const NOTHING_HELD_TO_SCAN = "Hold scan is off. The held Proposals no longer affect any Feature, so there was nothing to scan.";
export const HELD_SCAN_NOT_STARTED = "The held scan was not started, so Hold scan stays on.";

/**
 * The unreadable-file warning, once per distinct content while the panel stays open.
 * Pass `warned` null when the panel has just opened. A readable file forgets the warning.
 */
export function noticeForScanHold(reading: SwitchReading, warned: string | null): { warning: string | null; warned: string | null } {
  if (reading.kind !== "unreadable") return { warning: null, warned: null };
  if (warned === reading.content) return { warning: null, warned };
  return { warning: UNREADABLE_SCAN_HOLD, warned: reading.content };
}

export const scanHoldDir = (p: Project): string => join(p.dir, DIR);

export interface ScanHold {
  reading: SwitchReading;
  /** Permanent identities of the held Proposals, oldest first. Empty unless the switch reads `on`. */
  held: string[];
}

/**
 * Only an `on` switch holds anything. A line of `held` that is blank, repeated or names no approved
 * Proposal does not count; it disappears with the next write of `held`.
 */
export function readScanHold(p: Project): ScanHold {
  const reading = readSwitchFile(join(scanHoldDir(p), "state"));
  if (reading.kind !== "on") return { reading, held: [] };
  const file = join(scanHoldDir(p), "held");
  if (!existsSync(file)) return { reading, held: [] };
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return { reading, held: [] };
  }
  const approved = new Set(listProposals(p).filter((x) => x.data.status === "approved").map((x) => x.id));
  const held = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const id = line.trim();
    if (approved.has(id)) held.add(id);
  }
  return { reading, held: [...held] };
}

export const writeScanHoldState = (p: Project, value: "on" | "off"): void => writeLocalFile(scanHoldDir(p), "state", `${value}\n`);

export const writeHeld = (p: Project, ids: readonly string[]): void =>
  writeLocalFile(scanHoldDir(p), "held", ids.map((id) => `${id}\n`).join(""));

/** Turning on always succeeds and starts with nothing held; already on, nothing changes. Returns the warning to show, or null. */
export function turnScanHoldOn(p: Project): string | null {
  if (readScanHold(p).reading.kind === "on") return null;
  try {
    writeHeld(p, []);
    writeScanHoldState(p, "on");
    return null;
  } catch {
    return SCAN_HOLD_SAVE_FAILED;
  }
}

/**
 * With the switch on, an approved Proposal that would start the automatic scan joins the held ones,
 * once, after the others, and true is returned. The caller has already checked the other conditions.
 */
export function holdApproved(p: Project, id: string): boolean {
  const hold = readScanHold(p);
  if (hold.reading.kind !== "on") return false;
  if (!hold.held.includes(id)) writeHeld(p, [...hold.held, id]);
  return true;
}

/**
 * The held Proposals, oldest first, whose scan scope still has a reference inside a Feature that exists.
 * A Requirement section counts through the element it names; an Area, or its General section, through every Feature.
 */
function heldToScan(p: Project, held: readonly string[]): string[] {
  const model = loadModel(p);
  // featuresOfRef resolves against the current Model, so whatever it returns exists.
  const inFeature = (ref: string): boolean => {
    const req = parseRequirementRef(ref);
    if (!req) return featuresOfRef(model, ref).length > 0;
    if (req.section === null || req.section === "General") return model.features.size > 0;
    return featuresOfRef(model, req.section).length > 0;
  };
  return held.filter((id) => (getProposal(p, id).data.scanScope ?? []).some((e) => inFeature(e.ref)));
}

/** Writes `off` and empties `held`. Returns the warning to show when that fails, or `warning`. */
function release(p: Project, warning: string | null): string | null {
  try {
    writeHeld(p, []);
    writeScanHoldState(p, "off");
    return warning;
  } catch {
    return SCAN_HOLD_SAVE_FAILED;
  }
}

/**
 * Turns Hold scan off, without confirmation. Nothing held: only `off` is written. Nothing held still affects a
 * Feature: off, emptied, and the developer is told. Otherwise `send` hands the held scan of those Proposals,
 * oldest first, to the agent and says whether it was delivered: delivered empties the held list and turns the
 * switch off; not delivered leaves both as they were. Returns the warning to show, or null.
 */
export async function turnScanHoldOff(p: Project, send: (proposals: string[]) => Promise<boolean>): Promise<string | null> {
  const { held } = readScanHold(p);
  if (held.length === 0) return release(p, null);
  const proposals = heldToScan(p, held);
  if (proposals.length === 0) return release(p, NOTHING_HELD_TO_SCAN);
  if (!(await send(proposals))) return HELD_SCAN_NOT_STARTED;
  return release(p, null);
}
