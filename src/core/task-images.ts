import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import type { Project } from "./store";

/**
 * The images a Task carries for the model that implements it: copies of the local images of a written request,
 * kept in `.trama/task-images/<Task identity>/`, local to the working copy and never versioned. The folder is the
 * same before and after the Proposal is approved, because approval creates the Task with the identity it had.
 */

/** One image of a Task: its file name and absolute path. */
export interface TaskImage {
  name: string;
  path: string;
}

export const taskImagesRoot = (p: Project) => join(p.dir, "task-images");

/** The folder of the images of Task `id`. */
export const taskImagesDir = (p: Project, id: string) => join(taskImagesRoot(p), id);

function ensureIgnored(dir: string): void {
  const ignore = join(dir, ".gitignore");
  if (existsSync(ignore)) return;
  try {
    writeFileSync(ignore, "*\n", { flag: "wx" });
  } catch (error) {
    if (!existsSync(ignore)) throw error;
  }
}

/** `name` unchanged when free in `taken`, otherwise with `-2`, `-3`, … before the extension. */
function freeName(name: string, taken: (candidate: string) => boolean): string {
  if (!taken(name)) return name;
  const ext = extname(name);
  const stem = name.slice(0, name.length - ext.length);
  for (let n = 2; ; n++) {
    const candidate = `${stem}-${n}${ext}`;
    if (!taken(candidate)) return candidate;
  }
}

/**
 * Copies the files `sources` (absolute paths) into the folder of Task `id`, each with the name of the original,
 * or with a `-2`, `-3`, … suffix before the extension when that name is taken. Writes `.trama/task-images/.gitignore`
 * (the text `*`) together with the first image. Returns the copies in the order given.
 */
export function copyTaskImages(p: Project, id: string, sources: string[]): TaskImage[] {
  if (sources.length === 0) return [];
  const root = taskImagesRoot(p);
  const dir = taskImagesDir(p, id);
  mkdirSync(dir, { recursive: true });
  ensureIgnored(root);
  const copies: TaskImage[] = [];
  for (const source of sources) {
    const name = freeName(basename(source), (candidate) => existsSync(join(dir, candidate)));
    const path = join(dir, name);
    copyFileSync(source, path);
    copies.push({ name, path });
  }
  return copies;
}

/**
 * The images of Task `id` that exist, ordered by modification date and then by name. No folder, or an empty one,
 * means no images; an image that is gone does not appear.
 */
export function readTaskImages(p: Project, id: string): TaskImage[] {
  const dir = taskImagesDir(p, id);
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  const found: { name: string; path: string; mtime: number }[] = [];
  for (const name of names) {
    if (name.startsWith(".")) continue;
    const path = join(dir, name);
    try {
      const stat = statSync(path);
      if (stat.isFile()) found.push({ name, path, mtime: stat.mtimeMs });
    } catch { /* Gone between the listing and the stat: it does not appear. */ }
  }
  found.sort((a, b) => a.mtime - b.mtime || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return found.map(({ name, path }) => ({ name, path }));
}
