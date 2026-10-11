import { mkdirSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFileAtomic } from "./atomic-write";
import { questionProjectId } from "./question-channel";
import type { Project } from "./store";

/** Outside the project: the command asks, the open editor answers. */
export function approvalInbox(project: Project): string {
  return join(tmpdir(), "trama-approve", questionProjectId(project));
}

function writeJson(file: string, value: unknown): void {
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileAtomic(file, JSON.stringify(value));
}

const APPROVED_PREFIX = "approved-";

/**
 * Left by the command line after it approved an ordinary Proposal in the open folder that affects a Feature that
 * still exists, so the open editor can start the automatic scan as the panel does. Nobody reads it when no editor is open.
 */
export function writeApprovedNotice(project: Project, id: string): void {
  writeJson(join(approvalInbox(project), `${APPROVED_PREFIX}${id}.json`), { id, at: Date.now() });
}

/**
 * Claims every approval notice, so only one editor window acts on each. Returns the Proposals approved at or after
 * `since` (when the editor started): a notice left while no editor was open is removed without effect.
 */
export function takeApprovedNotices(project: Project, since: number): string[] {
  const inbox = approvalInbox(project);
  let names: string[];
  try {
    names = readdirSync(inbox).filter((name) => name.startsWith(APPROVED_PREFIX) && name.endsWith(".json"));
  } catch {
    return [];
  }
  const ids: string[] = [];
  for (const name of names) {
    const file = join(inbox, name);
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(file, "utf8"));
      unlinkSync(file);
    } catch {
      // Taken by another window, or not readable: nothing to start.
      continue;
    }
    if (typeof raw !== "object" || raw === null) continue;
    const id = Reflect.get(raw, "id");
    const at = Reflect.get(raw, "at");
    if (typeof id === "string" && typeof at === "number" && at >= since) ids.push(id);
  }
  return ids;
}
