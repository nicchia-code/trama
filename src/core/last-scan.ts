import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { writeFileAtomic } from "./atomic-write";
import type { Project } from "./store";

const lastScanDir = (p: Project) => join(p.dir, "last-scan");
const systemFile = (p: Project) => join(lastScanDir(p), "system");
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
    const value = readFileSync(path, "utf8").replace(/\r?\n$/, "");
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
}

