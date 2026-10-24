import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { z } from "zod";
import { writeFileAtomic } from "./atomic-write";
import { withFileLock } from "./file-lock";
import { findProject, TRAMA_DIR } from "./store";

/** The variable a terminal of a Run carries: its write tools claim the files they write. */
export const RUN_ENV = "TRAMA_RUN";
export const RUN_ON = "1";

/** The variable a Run's terminal carries with the Task it implements, when it implements one: the claims its sub-agents make name that Task. */
export const TASK_ENV = "TRAMA_TASK";

/** The variable a Run's terminal carries when the parallel execution is on: a sub-agent stopped by a claim then records the clash. */
export const PARALLEL_ENV = "TRAMA_PARALLEL";
export const PARALLEL_ON = "1";

/** The identity of the advisors of a Run: they neither claim nor are stopped by a claim. */
export const ADVISOR_AGENT = "advisor";

/** A claim lasts this long without being renewed by a write of its holder or of a sub-agent the holder started. */
export const CLAIM_TTL_MS = 2 * 60 * 60 * 1000;

const CLAIMS_LOCK = "claims";

/** Who writes: its role, its identity, its terminal and the identities of the agents that started it, nearest first. */
export type ClaimRole = "main" | "sub" | "advisor";
export interface ClaimWriter {
  role: ClaimRole;
  agent: string;
  terminal: string;
  ancestors: readonly string[];
  /** The Task the terminal implements, when it is a single Task's Run. */
  task?: string;
}

/** The file `path` (project-relative, `/`-separated) is held by `agent` of `terminal`, with the ancestors of that agent; `renewedAt` decides its expiry. `task` is the Task the holder implements, when known. */
export interface Claim {
  path: string;
  terminal: string;
  agent: string;
  ancestors: string[];
  task?: string;
  claimedAt: string;
  renewedAt: string;
}

/** A write refused by a claim: the message that stops it, and the claim that holds the file (absent when the claims cannot be checked). */
export interface ClaimRefusal {
  reason: string;
  holder?: Claim;
}

const ClaimSchema = z
  .object({
    path: z.string().min(1),
    terminal: z.string().min(1),
    agent: z.string().min(1),
    ancestors: z.array(z.string()),
    task: z.string().min(1).optional(),
    claimedAt: z.iso.datetime(),
    renewedAt: z.iso.datetime(),
  })
  .strict();

const claimFile = (dir: string, path: string): string => join(dir, `${createHash("sha256").update(path).digest("hex")}.json`);
const isLive = (claim: Claim, now: Date): boolean => now.getTime() - Date.parse(claim.renewedAt) < CLAIM_TTL_MS;

function parseClaim(text: string): Claim | undefined {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return undefined;
  }
  const parsed = ClaimSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

/** The claim a file holds, or undefined when it holds none. Throws when the file cannot be read or names another path. */
function readClaim(dir: string, path: string): Claim | undefined {
  const file = claimFile(dir, path);
  if (!existsSync(file)) return undefined;
  const claim = parseClaim(readFileSync(file, "utf8"));
  if (claim === undefined || claim.path !== path) throw new Error("the claim file is malformed");
  return claim;
}

function blockedBy(path: string, holder: Claim, writer: ClaimWriter): string {
  const where = holder.terminal === writer.terminal ? "this run" : "another run";
  return `Trama: ${path} is claimed by sub-agent ${holder.agent} of ${where} until it finishes. Stop now: do not undo your changes, leave your Task In progress and report to the main agent which file and which sub-agent stopped you.`;
}

type Action = { kind: "keep" } | { kind: "remove" } | { kind: "write"; claim: Claim } | { kind: "block"; holder: Claim };

/** What a write of `writer` does to the file `path`, whose claim is `claim`. */
function decide(path: string, claim: Claim | undefined, writer: ClaimWriter, now: Date): Action {
  const held = claim !== undefined && isLive(claim, now);
  if (writer.role === "advisor") return claim !== undefined && !held ? { kind: "remove" } : { kind: "keep" };
  if (writer.role === "main") {
    if (claim !== undefined && held) return { kind: "block", holder: claim };
    return claim !== undefined ? { kind: "remove" } : { kind: "keep" };
  }
  const stamp = now.toISOString();
  if (claim === undefined || !held) {
    return { kind: "write", claim: { path, terminal: writer.terminal, agent: writer.agent, ancestors: [...writer.ancestors], ...(writer.task === undefined ? {} : { task: writer.task }), claimedAt: stamp, renewedAt: stamp } };
  }
  const ownOrDescendant = claim.terminal === writer.terminal && (claim.agent === writer.agent || writer.ancestors.includes(claim.agent));
  if (ownOrDescendant) return { kind: "write", claim: { ...claim, renewedAt: stamp } };
  return { kind: "block", holder: claim };
}

/**
 * Checks and applies one write of `writer` to the project-relative `paths`. Every path is decided before any claim changes:
 * one blocked path stops the whole call and leaves all claims as they were. Returns the refusal that stops the write, or
 * undefined when it may go on. A refusal by a claim names the claim that holds the file; a claim that cannot be checked
 * stops it too, with the reason.
 */
export function checkWrites(root: string, paths: readonly string[], writer: ClaimWriter, now: Date = new Date()): ClaimRefusal | undefined {
  const dir = join(root, TRAMA_DIR, "claims");
  let current = paths[0] ?? "";
  try {
    return withFileLock(dir, CLAIMS_LOCK, (): ClaimRefusal | undefined => {
      const actions: Array<{ path: string; action: Action }> = [];
      for (const path of new Set(paths)) {
        current = path;
        const action = decide(path, readClaim(dir, path), writer, now);
        if (action.kind === "block") return { reason: blockedBy(path, action.holder, writer), holder: action.holder };
        actions.push({ path, action });
      }
      for (const { path, action } of actions) {
        current = path;
        if (action.kind === "write") writeFileAtomic(claimFile(dir, path), `${JSON.stringify(action.claim)}\n`);
        else if (action.kind === "remove") rmSync(claimFile(dir, path), { force: true });
      }
      return undefined;
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { reason: `Trama could not check the claim of ${current}: ${reason}. Stop now and report it to the main agent.` };
  }
}

/** The message that stops a write of `writer` to `paths`, or undefined when it may go on: see `checkWrites`. */
export function claimWrites(root: string, paths: readonly string[], writer: ClaimWriter, now: Date = new Date()): string | undefined {
  return checkWrites(root, paths, writer, now)?.reason;
}

function releaseWhere(root: string, matches: (claim: Claim) => boolean): void {
  const dir = join(root, TRAMA_DIR, "claims");
  if (!existsSync(dir)) return;
  withFileLock(dir, CLAIMS_LOCK, () => {
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".json")) continue;
      const file = join(dir, name);
      const claim = parseClaim(readFileSync(file, "utf8"));
      if (claim !== undefined && matches(claim)) rmSync(file, { force: true });
    }
  });
}

/** Forgets every claim of `terminal`; a project without claims is not an error. */
export const releaseTerminalClaims = (root: string, terminal: string): void => releaseWhere(root, (claim) => claim.terminal === terminal);

/** Forgets the claims `agent` holds in `terminal`; a project without claims is not an error. */
export const releaseAgentClaims = (root: string, terminal: string, agent: string): void =>
  releaseWhere(root, (claim) => claim.terminal === terminal && claim.agent === agent);

/** The root of the Trama project `cwd` belongs to, or undefined outside every project. */
export function projectRootOf(cwd: string): string | undefined {
  try {
    return findProject(cwd).root;
  } catch {
    return undefined;
  }
}

/** The real path of `abs`: the deepest existing ancestor is resolved, the rest is kept as written. */
function realPathOf(abs: string): string {
  let existing = abs;
  const rest: string[] = [];
  while (!existsSync(existing)) {
    const parent = dirname(existing);
    if (parent === existing) break;
    rest.unshift(basename(existing));
    existing = parent;
  }
  return join(realpathSync(existing), ...rest);
}

/** The `/`-separated path of `input` (resolved against `cwd`) inside the project `root`; undefined when it lies outside it or is the root itself. */
export function projectPathOf(root: string, cwd: string, input: string): string | undefined {
  const rel = relative(realpathSync(root), realPathOf(resolve(cwd, input)));
  if (rel === "" || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) return undefined;
  return rel.split(sep).join("/");
}

const PATCH_FILE = /^\*\*\* (?:Add File|Update File|Delete File|Move to): (.+?)\s*$/gm;

/** The paths a write tool's input names: `path` and `paths`, and the file headers of an `apply_patch` text. */
export function namedPaths(toolName: string, input: unknown): string[] {
  if (typeof input !== "object" || input === null) return [];
  const { path, paths, input: text } = input as Record<string, unknown>;
  const found: string[] = [];
  if (typeof path === "string") found.push(path);
  if (Array.isArray(paths)) for (const item of paths) if (typeof item === "string") found.push(item);
  if (toolName === "apply_patch" && typeof text === "string") for (const match of text.matchAll(PATCH_FILE)) found.push(match[1] ?? "");
  return found.filter((item) => item !== "");
}
