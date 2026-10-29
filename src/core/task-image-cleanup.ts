import { existsSync, readdirSync, rmSync } from "node:fs";
import { basename, extname, join } from "node:path";
import type { Project } from "./store";
import { noteRemoved } from "./written";
import { taskImagesDir, taskImagesRoot } from "./task-images";

const TASK_ID = /^[a-z0-9]{8}$/;

/** The only image extensions a Task can carry. */
export const IMAGE_EXTENSIONS: readonly string[] = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"];

/** True when `path` has one of the image extensions (any case). */
export const isImagePath = (path: string): boolean => IMAGE_EXTENSIONS.includes(extname(path).toLowerCase());

/** The fields of a Proposal the keeping rule reads. `reworks` and `reworkRequested` are absent on most Proposals. */
export interface KeepProposal {
  id: string;
  data: { status: string; reworks?: string | null; reworkRequested?: boolean };
  tasks: { id: string }[];
}
export interface KeepTask {
  id: string;
  data: { column: string };
}

/**
 * Deletes the image folder of every Task that must not keep it, given every Proposal and every Task. A Task keeps
 * its images while it is in a `draft` or `open` Proposal, or In to do or In progress, or in a Proposal rejected with
 * Rework with feedback (`reworkRequested`) whose replacement (the Proposal with `reworks` equal to its id) is not
 * handed over yet. A folder that names no card is a leftover and goes too; a folder already gone is no error.
 * This is the only place where Task image folders are deleted.
 */
export function pruneTaskImages(p: Project, proposals: readonly KeepProposal[], tasks: readonly KeepTask[]): void {
  const root = taskImagesRoot(p);
  let entries: { name: string; isDirectory(): boolean }[];
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return;
  }
  const keep = new Set<string>();
  for (const task of tasks) if (task.data.column === "todo" || task.data.column === "doing") keep.add(task.id);
  const handedOver = new Set<string>();
  // A replacement is handed over once it is open (or decided after that); a Draft or a discarded one never was.
  for (const proposal of proposals) {
    const reworks = proposal.data.reworks;
    if (typeof reworks === "string" && ["open", "approved", "rejected"].includes(proposal.data.status)) handedOver.add(reworks);
  }
  for (const proposal of proposals) {
    const { status } = proposal.data;
    const waiting = status === "rejected" && proposal.data.reworkRequested === true && !handedOver.has(proposal.id);
    if (status === "draft" || status === "open" || waiting) for (const task of proposal.tasks) keep.add(task.id);
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || !TASK_ID.test(entry.name) || keep.has(entry.name)) continue;
    rmSync(join(root, entry.name), { recursive: true, force: true });
    noteRemoved(join(root, entry.name));
  }
}

/** Takes image `name` out of the folder of Task `id`, dropping the folder when it empties; false when it was not there. */
export function removeTaskImage(p: Project, id: string, name: string): boolean {
  const dir = taskImagesDir(p, id);
  const path = join(dir, name);
  if (basename(name) !== name || name.startsWith(".") || !existsSync(path)) return false;
  rmSync(path, { force: true });
  noteRemoved(path);
  try {
    if (readdirSync(dir).length === 0) {
      rmSync(dir, { recursive: true, force: true });
      noteRemoved(dir);
    }
  } catch { /* Already gone. */ }
  return true;
}
