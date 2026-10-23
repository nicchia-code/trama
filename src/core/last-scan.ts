import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { writeFileAtomic } from "./atomic-write";
import { readTextLf, type Project } from "./store";

const lastScanDir = (p: Project) => join(p.dir, "last-scan");
const systemFile = (p: Project) => join(lastScanDir(p), "system");
const clearedFile = (p: Project) => join(lastScanDir(p), "cleared");
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function ensureIgnored(dir: string): void {
  const ignore = join(dir, ".gitignore");
  if (existsSync(ignore)) return;
  try {
    writeFileSync(ignore, "*\n", { flag: "wx" });
  } catch (error) {
    if (!existsSync(ignore)) throw error;
  }
}
export function readLastScan(p: Project, now = new Date()): string {
  const path = systemFile(p);
  try {
    const value = readTextLf(path).replace(/\n$/, "");
    if (ISO_INSTANT.test(value) && !Number.isNaN(Date.parse(value))) return value;
  } catch { /* Missing and unreadable records initialize like invalid ones. */ }

  const dir = lastScanDir(p);
  mkdirSync(dir, { recursive: true });
  ensureIgnored(dir);
  const instant = now.toISOString();
  writeFileAtomic(path, `${instant}\n`);
  return instant;
}

/** Persists a delivered Scan's launch instant; a failed write leaves the previous value intact. */
export function writeLastScan(p: Project, instant: string): void {
  if (!ISO_INSTANT.test(instant) || Number.isNaN(Date.parse(instant))) throw new TypeError("The Scan launch instant must be a date and time");
  const dir = lastScanDir(p);
  mkdirSync(dir, { recursive: true });
  ensureIgnored(dir);
  writeFileAtomic(systemFile(p), `${instant}\n`);
  // The next count starts from what finished after this launch: older lines belong to the previous scan.
  try {
    const since = Date.parse(instant);
    const kept = readTextLf(clearedFile(p)).split("\n").filter((line) => Date.parse(line.split(" ")[1] ?? "") > since);
    if (kept.length === 0) rmSync(clearedFile(p), { force: true });
    else writeFileAtomic(clearedFile(p), `${kept.join("\n")}\n`);
  } catch { /* No file, nothing to keep. */ }
}

/** The Tasks Clear deleted that finished after the last System scan: identity and `finished`, one per line, written with the first line. */
export function rememberCleared(p: Project, id: string, finished: string): void {
  const dir = lastScanDir(p);
  mkdirSync(dir, { recursive: true });
  ensureIgnored(dir);
  let before = "";
  try {
    before = readTextLf(clearedFile(p));
  } catch { /* No file yet. */ }
  writeFileAtomic(clearedFile(p), `${before === "" || before.endsWith("\n") ? before : `${before}\n`}${id} ${finished}\n`);
}

/** How many Tasks Clear deleted whose `finished` is after `since`; a Task cleared more than once counts once, and a line that does not read is ignored. */
export function clearedSince(p: Project, since: number): number {
  let text: string;
  try {
    text = readTextLf(clearedFile(p));
  } catch {
    return 0;
  }
  const latest = new Map<string, number>();
  for (const line of text.split("\n")) {
    const match = /^([a-z0-9]{8}) (\S+)$/.exec(line);
    if (match === null || !ISO_INSTANT.test(match[2] as string)) continue;
    const instant = Date.parse(match[2] as string);
    if (Number.isNaN(instant)) continue;
    latest.set(match[1] as string, Math.max(latest.get(match[1] as string) ?? instant, instant));
  }
  return [...latest.values()].filter((instant) => instant > since).length;
}

