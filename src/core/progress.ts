import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { writeFileAtomic } from "./atomic-write";
import { readTextLf, type Project } from "./store";

/** Declared percentages are multiples of 10 from 0 to 100. */
export const PROGRESS_VALUES: readonly number[] = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

const progressDir = (p: Project) => join(p.dir, "progress");
const progressFile = (p: Project, id: string) => join(progressDir(p), id);

function ensureIgnored(dir: string): void {
  const ignore = join(dir, ".gitignore");
  if (existsSync(ignore)) return;
  try {
    writeFileSync(ignore, "*\n", { flag: "wx" });
  } catch (error) {
    if (!existsSync(ignore)) throw error;
  }
}

/** The percentage declared for a Task, or null when there is no file or its content is not a multiple of 10 from 0 to 100. */
export function readProgress(p: Project, id: string): number | null {
  try {
    const value = readTextLf(progressFile(p, id)).replace(/\n$/, "");
    if (!/^\d{1,3}$/.test(value)) return null;
    const n = Number(value);
    return PROGRESS_VALUES.includes(n) ? n : null;
  } catch {
    return null;
  }
}

/** Replaces the whole file of the Task with the percentage; the folder's own `.gitignore` is written with the first file. */
export function writeProgress(p: Project, id: string, value: number): void {
  const dir = progressDir(p);
  mkdirSync(dir, { recursive: true });
  ensureIgnored(dir);
  writeFileAtomic(progressFile(p, id), `${value}\n`);
}

/** Forgets the percentage of a Task; a missing file is not an error. */
export function clearProgress(p: Project, id: string): void {
  rmSync(progressFile(p, id), { force: true });
}
