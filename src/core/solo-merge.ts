import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { writeFileAtomic } from "./atomic-write";
import { TramaError } from "./errors";
import { git, type GitResult, gitRun, gitRunAsync } from "./git";
import { expectedSoloBlock, readSoloMode, SOLO_BEGIN, SOLO_END, soloDir } from "./solo-mode";
import { type Project, readTextLf } from "./store";

/*
 * Merge of Solo mode: brings a branch chosen by the developer into the current one with git, and remembers a merge Trama started until
 * it ends. The side menu and the editor's flow (`extension/src/host/solo-merge.ts`) stand on this module; every git call goes through
 * `./git` with fixed arguments and no shell.
 */

/** How long `git fetch --all --prune` may take: the remotes can be slow. */
export const FETCH_TIMEOUT_MS = 120_000;

/** Why Merge is unavailable, in the order the menu tells it: a merge, rebase, cherry-pick or revert is in progress; HEAD is on no branch; tracked files have changes; the agent works. */
export type MergeBlock = "inProgress" | "detached" | "changes" | "agent";

export interface MergeAvailability {
  available: boolean;
  /** The first reason that holds; absent when Merge is available. */
  reason?: MergeBlock;
}

/** A merge Trama started and that is not over yet, as `.trama/solo/merge.json` remembers it: the full commit hashes and the start as an ISO date and time. */
export interface OpenMerge {
  branch: string;
  base: string;
  incoming: string;
  started: string;
}

/** A branch the developer can merge. `upstream`: it is the upstream of the current branch. `usual`: it is the upstream or `<remote>/<current branch>`, which merge without a confirmation. */
export interface MergeBranch {
  name: string;
  upstream: boolean;
  usual: boolean;
}

/** What `startMerge` did: the merge went through (a fast-forward too), stopped with conflicts (and is remembered), or git refused or failed (nothing changed, and nothing is remembered). */
export type MergeOutcome = { kind: "merged"; base: string; incoming: string } | { kind: "conflicts"; base: string; incoming: string; files: string[] } | { kind: "failed"; reason: string };

/** What a remembered merge turned out to be: none remembered; still open; committed (the commit has arrived); abandoned (it ended without one). */
export type MergeEnd = { kind: "none" } | { kind: "open"; merge: OpenMerge } | { kind: "committed"; merge: OpenMerge } | { kind: "abandoned" };

export const mergeFile = (p: Project): string => join(soloDir(p), "merge.json");

const firstLine = (text: string): string => text.split(/\r?\n/).map((line) => line.trim()).find((line) => line !== "") ?? "";

/** git's first line of error: its standard error, or its output when it said nothing there; never the whole text. */
export function gitReason(result: GitResult): string {
  return firstLine(result.stderr) || firstLine(result.stdout) || "git failed";
}

/** A branch name git can be given safely: not empty and not an option. */
function checkBranchName(name: string): void {
  if (name.trim() === "" || name.startsWith("-")) throw new TramaError(`"${name}" is not a branch name.`);
}

/** Where git keeps `name` in the git directory of the working copy, or null when git cannot say. */
function gitPaths(root: string, names: string[]): string[] | null {
  const out = git(root, ["rev-parse", ...names.flatMap((name) => ["--git-path", name])]);
  const lines = out === null ? [] : out.split(/\r?\n/).filter((line) => line !== "");
  return lines.length === names.length ? lines.map((line) => resolve(root, line)) : null;
}

const IN_PROGRESS = ["MERGE_HEAD", "REBASE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD", "rebase-merge", "rebase-apply"];

/** Whether a merge, rebase, cherry-pick or revert is in progress in the working copy at `root`. */
export function operationInProgress(root: string): boolean {
  return (gitPaths(root, IN_PROGRESS) ?? []).some((path) => existsSync(path));
}

/** The current branch, or null when HEAD is on no branch. */
export function currentBranch(root: string): string | null {
  const out = git(root, ["symbolic-ref", "--quiet", "--short", "HEAD"]);
  const name = out === null ? "" : firstLine(out);
  return name === "" ? null : name;
}

/** The pathspecs that leave out the paths of the Solo mode block: `:(top,exclude)` and the pattern of each line, anchored to the repository root. */
function blockExclusions(p: Project, skillsDir: string | undefined): string[] {
  const kind = readSoloMode(p);
  const block = kind === "off" ? null : expectedSoloBlock(p, kind, skillsDir);
  return (block ?? []).filter((line) => line !== SOLO_BEGIN && line !== SOLO_END).map((line) => `:(top,exclude)${line.replace(/^\//, "").replace(/\/$/, "")}`);
}

/** Whether a tracked file has changes, staged or not, outside the paths of the Solo mode block; untracked files do not count. A git that cannot say counts as changes. */
export function hasTrackedChanges(p: Project, skillsDir?: string): boolean {
  const result = gitRun(p.root, ["status", "--porcelain=v1", "-z", "--untracked-files=no", "--", ":(top)", ...blockExclusions(p, skillsDir)]);
  return !result.ok || result.stdout !== "";
}

/**
 * Whether Merge is available, and if not why (the first reason that holds): nothing in progress, HEAD on a branch, no change to tracked files outside the Solo mode block, and
 * no job of the agent launched from this window (`agentRunning`, which only the host knows).
 */
export function mergeAvailability(p: Project, agentRunning: boolean, skillsDir?: string): MergeAvailability {
  const reason: MergeBlock | undefined = operationInProgress(p.root) ? "inProgress" : currentBranch(p.root) === null ? "detached" : hasTrackedChanges(p, skillsDir) ? "changes" : agentRunning ? "agent" : undefined;
  return reason === undefined ? { available: true } : { available: false, reason };
}

/** The upstream of the current branch as git names it (`origin/main`), or null when it has none. */
export function upstreamBranch(root: string): string | null {
  const out = git(root, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"]);
  const name = out === null ? "" : firstLine(out);
  return name === "" ? null : name;
}

const alphabetical = (a: string, b: string): number => a.localeCompare(b);

/**
 * The branches to offer: the upstream of the current branch first, then the other remote-tracking branches, then the local ones, each group in alphabetical
 * order, without the current branch and without `<remote>/HEAD`. Empty when git cannot list them.
 */
export function mergeBranches(root: string): MergeBranch[] {
  const refs = git(root, ["for-each-ref", "--format=%(refname)", "refs/remotes", "refs/heads"]);
  if (refs === null) return [];
  const current = currentBranch(root);
  const upstream = upstreamBranch(root);
  const remotes = (git(root, ["remote"]) ?? "").split(/\r?\n/).filter((name) => name !== "");
  const names = refs.split(/\r?\n/).filter((name) => name !== "");
  const remote = names.filter((name) => name.startsWith("refs/remotes/")).map((name) => name.slice("refs/remotes/".length)).filter((name) => !name.endsWith("/HEAD")).sort(alphabetical);
  const local = names.filter((name) => name.startsWith("refs/heads/")).map((name) => name.slice("refs/heads/".length)).filter((name) => name !== current).sort(alphabetical);
  const all = [...remote, ...local];
  const ordered = upstream !== null && all.includes(upstream) ? [upstream, ...all.filter((name) => name !== upstream)] : all;
  return ordered.map((name) => ({ name, upstream: name === upstream, usual: name === upstream || (current !== null && remotes.some((r) => name === `${r}/${current}`)) }));
}

/** Fetches from every remote and prunes the branches they dropped (`git fetch --all --prune`); does not block the process. Throws with git's reason when it fails. */
export async function fetchRemotes(root: string): Promise<void> {
  const result = await gitRunAsync(root, ["fetch", "--all", "--prune"], FETCH_TIMEOUT_MS);
  if (!result.ok) throw new TramaError(gitReason(result));
}

/** The full hash of the commit `name` stands for, or null when it names none. */
function commitOf(root: string, name: string): string | null {
  const out = git(root, ["rev-parse", "--verify", "--quiet", `${name}^{commit}`]);
  const hash = out === null ? "" : firstLine(out);
  return hash === "" ? null : hash;
}

/** Whether `commit` is an ancestor of HEAD (or HEAD itself). Throws with git's reason when git cannot tell. */
function headContains(root: string, commit: string): boolean {
  const result = gitRun(root, ["merge-base", "--is-ancestor", commit, "HEAD"]);
  if (result.ok) return true;
  if (result.status === 1) return false;
  throw new TramaError(gitReason(result));
}

/** Whether the current branch already contains `branch`: nothing would be merged. Throws when `branch` names no commit. */
export function isUpToDate(root: string, branch: string): boolean {
  checkBranchName(branch);
  const incoming = commitOf(root, branch);
  if (incoming === null) throw new TramaError(`"${branch}" is not a branch.`);
  return headContains(root, incoming);
}

/** The files with conflicts of the merge in progress, as absolute paths in git's order. */
export function conflictedFiles(root: string): string[] {
  const top = git(root, ["rev-parse", "--show-toplevel"]);
  const out = git(root, ["diff", "--name-only", "--diff-filter=U", "-z"]);
  if (top === null || out === null) return [];
  const base = firstLine(top);
  return out.split("\0").filter((path) => path !== "").map((path) => resolve(base, path));
}

/** The merge Trama remembers, or null when none is remembered or the file is not valid (`settleMerge` deletes an invalid one). */
export function readOpenMerge(p: Project): OpenMerge | null {
  try {
    const data: unknown = JSON.parse(readTextLf(mergeFile(p)));
    if (typeof data !== "object" || data === null) return null;
    const { branch, base, incoming, started } = data as Record<string, unknown>;
    return typeof branch === "string" && branch !== "" && typeof base === "string" && base !== "" && typeof incoming === "string" && incoming !== "" && typeof started === "string" && started !== "" ? { branch, base, incoming, started } : null;
  } catch {
    return null;
  }
}

function forgetMerge(p: Project): void {
  rmSync(mergeFile(p), { force: true });
}

/**
 * Merges `branch` into the current branch: records `base` (HEAD) and `incoming` (the branch) in `.trama/solo/merge.json` right before `git merge --no-edit <branch>` runs.
 * Without conflicts, a fast-forward included, the merge is over and nothing is remembered. With conflicts it stays remembered, open in git. When git refuses or fails
 * for another reason nothing is remembered. Never makes the merge commit of a merge with conflicts.
 */
export function startMerge(p: Project, branch: string): MergeOutcome {
  checkBranchName(branch);
  const base = commitOf(p.root, "HEAD");
  const incoming = commitOf(p.root, branch);
  if (base === null) return { kind: "failed", reason: "HEAD has no commit." };
  if (incoming === null) return { kind: "failed", reason: `"${branch}" is not a branch.` };
  mkdirSync(soloDir(p), { recursive: true });
  const merge: OpenMerge = { branch, base, incoming, started: new Date().toISOString() };
  writeFileAtomic(mergeFile(p), `${JSON.stringify(merge, null, 2)}\n`);
  const result = gitRun(p.root, ["merge", "--no-edit", branch]);
  if (result.ok) {
    forgetMerge(p);
    return { kind: "merged", base, incoming };
  }
  if ((gitPaths(p.root, ["MERGE_HEAD"]) ?? []).some((path) => existsSync(path))) return { kind: "conflicts", base, incoming, files: conflictedFiles(p.root) };
  forgetMerge(p);
  return { kind: "failed", reason: gitReason(result) };
}

/** Aborts the merge in progress with `git merge --abort` and forgets it. Throws with git's reason when git cannot abort: the merge then stays remembered. */
export function abortMerge(p: Project): void {
  const result = gitRun(p.root, ["merge", "--abort"]);
  if (!result.ok) throw new TramaError(gitReason(result));
  forgetMerge(p);
}

/** The commit `MERGE_HEAD` points at, or null when no merge is in progress. */
function mergeHead(root: string): string | null {
  const path = gitPaths(root, ["MERGE_HEAD"])?.[0];
  if (path === undefined || !existsSync(path)) return null;
  try {
    return firstLine(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Looks at the remembered merge and settles it. Still open: `MERGE_HEAD` is there and points at `incoming`. Over: `MERGE_HEAD` is gone, and the merge is committed when
 * HEAD contains `incoming`, abandoned otherwise (a `MERGE_HEAD` that points at another commit counts as abandoned too). A committed or abandoned merge is forgotten,
 * and so is a file that is not valid. Call it only when no `startMerge` is running.
 */
export function settleMerge(p: Project): MergeEnd {
  if (!existsSync(mergeFile(p))) return { kind: "none" };
  const merge = readOpenMerge(p);
  if (merge === null) {
    forgetMerge(p);
    return { kind: "abandoned" };
  }
  const head = mergeHead(p.root);
  if (head !== null) {
    if (head === merge.incoming) return { kind: "open", merge };
    forgetMerge(p);
    return { kind: "abandoned" };
  }
  let committed = false;
  try {
    committed = headContains(p.root, merge.incoming);
  } catch {
    // git cannot say: the merge is not taken for committed, and no scan starts for it.
  }
  forgetMerge(p);
  return committed ? { kind: "committed", merge } : { kind: "abandoned" };
}
