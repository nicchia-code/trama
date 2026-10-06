import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { questionProjectId } from "./question-channel";
import type { Project } from "./store";

/** Said when the switch is on and no editor answers, so no worktree is created. */
export const EDITOR_UNAVAILABLE = "The editor is not available, so a worktree cannot be started.";

export interface ApproveRequest {
  nonce: string;
  id: string;
  skillsDirs: string[];
}

export interface ApproveResult {
  nonce: string;
  ok: boolean;
  message: string;
}

/** Outside the project: the command asks, the open editor answers. */
export function approvalInbox(project: Project): string {
  return join(tmpdir(), "trama-approve", questionProjectId(project));
}

const requestPath = (project: Project): string => join(approvalInbox(project), "request.json");
const busyPath = (project: Project): string => join(approvalInbox(project), "request.busy");
const resultPath = (project: Project): string => join(approvalInbox(project), "result.json");

function writeJson(file: string, value: unknown): void {
  mkdirSync(join(file, ".."), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(value));
  renameSync(tmp, file);
}

export function writeApproveRequest(project: Project, id: string, skillsDirs: string[]): ApproveRequest {
  const request: ApproveRequest = { nonce: randomBytes(8).toString("hex"), id, skillsDirs };
  writeJson(requestPath(project), request);
  return request;
}

/** Claims the request so two polls cannot accept the same Proposal. */
export function takeApproveRequest(project: Project): ApproveRequest | null {
  const file = requestPath(project);
  if (!existsSync(file)) return null;
  try {
    renameSync(file, busyPath(project));
  } catch {
    return null;
  }
  try {
    const raw: unknown = JSON.parse(readFileSync(busyPath(project), "utf8"));
    if (typeof raw !== "object" || raw === null) return null;
    const nonce = Reflect.get(raw, "nonce");
    const id = Reflect.get(raw, "id");
    const skillsDirs = Reflect.get(raw, "skillsDirs");
    if (typeof nonce !== "string" || typeof id !== "string" || !Array.isArray(skillsDirs)) return null;
    const dirs = skillsDirs.filter((dir): dir is string => typeof dir === "string");
    if (dirs.length !== skillsDirs.length) return null;
    return { nonce, id, skillsDirs: dirs };
  } catch {
    return null;
  } finally {
    try {
      unlinkSync(busyPath(project));
    } catch {
      // Already removed. The request is no longer waiting.
    }
  }
}

export function writeApproveResult(project: Project, result: ApproveResult): void {
  writeJson(resultPath(project), result);
}

export function readApproveResult(project: Project, nonce: string): ApproveResult | null {
  const file = resultPath(project);
  if (!existsSync(file)) return null;
  try {
    const raw: unknown = JSON.parse(readFileSync(file, "utf8"));
    if (typeof raw !== "object" || raw === null) return null;
    if (Reflect.get(raw, "nonce") !== nonce) return null;
    const ok = Reflect.get(raw, "ok");
    const message = Reflect.get(raw, "message");
    if (typeof ok !== "boolean" || typeof message !== "string") return null;
    return { nonce, ok, message };
  } catch {
    return null;
  }
}

/**
 * Blocks until the editor writes a result for this nonce, or the wait runs out.
 * The editor is another process, so waiting here does not stop it.
 */
export function waitApproveResult(project: Project, nonce: string, timeoutMs: number): ApproveResult | null {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const result = readApproveResult(project, nonce);
    if (result) {
      try {
        unlinkSync(resultPath(project));
      } catch {
        // The next result overwrites the file.
      }
      return result;
    }
    const left = deadline - Date.now();
    if (left <= 0) return null;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.min(50, left));
  }
}

/** How long the command waits for the editor. Tests set this so a missing editor fails quickly. */
export function approveWaitMs(): number {
  const raw = Number(process.env.TRAMA_APPROVE_WAIT_MS);
  return Number.isFinite(raw) && raw >= 0 ? raw : 15_000;
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
