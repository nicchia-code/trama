import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { TramaError } from "./errors";
import { getProposal, recordMergedProposal } from "./proposals";
import { syncRequirementSkills } from "./requirement-skills";
import { proposalScope } from "./scope";
import { loadModel, type Project, projectAt, readDocument, writeDocument, writeFileEnsuringDir } from "./store";
import { type Drift, driftOptions, getTask, listTasks, newTask, type Task } from "./work";
import { mergedProposalIds, rememberedScopes, roundOrigin, roundWorktrees, worktreePath, worktreeProposalIds, worktreesHome } from "./worktree-round";

const KEEP = "Keep unfinished worktree changes";
const LEAVE_DRIFT = "Leave the Merge Drift out of the merged result";

export type MergeRoundResult =
  | { kind: "pending" }
  | { kind: "refused"; message: string }
  | { kind: "waiting"; branch: string; again?: boolean }
  | { kind: "conflict"; again?: boolean }
  | { kind: "merged"; features: string[] };

function git(cwd: string, args: string[]): { ok: boolean; stdout: string; stderr: string } {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", windowsHide: true, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } });
  return { ok: result.status === 0, stdout: (result.stdout ?? "").trim(), stderr: (result.stderr || result.error?.message || "").trim() };
}

function failure(result: { stderr: string; stdout: string }): string {
  return result.stderr || result.stdout || "Git could not merge the worktree round.";
}

/**
 * Commits whatever the agent left uncommitted, except the Proposal's own `proposal.md`: its copy there only adds
 * the scan scope, which the landing writes into the open folder, so the merge never meets two versions of it.
 */
function commitLeftovers(path: string, proposalFile: string): void {
  const status = git(path, ["status", "--porcelain"]);
  if (!status.ok) throw new TramaError(failure(status));
  if (status.stdout === "") return;
  const added = git(path, ["add", "-A"]);
  if (!added.ok) throw new TramaError(failure(added));
  const unstaged = git(path, ["reset", "-q", "HEAD", "--", proposalFile]);
  if (!unstaged.ok) throw new TramaError(failure(unstaged));
  const staged = git(path, ["diff", "--cached", "--name-only"]);
  if (!staged.ok) throw new TramaError(failure(staged));
  if (staged.stdout === "") return;
  const committed = git(path, ["commit", "-m", KEEP]);
  if (!committed.ok) throw new TramaError(failure(committed));
}

/** Tracked path, from the repository root, of the Proposal's `proposal.md`, the same in the open folder and its worktree. */
const proposalFileRel = (p: Project, id: string) => join(relative(p.root, p.dir), "proposals", getProposal(p, id).name, "proposal.md");

/** The Features each merged Proposal would have had scanned alone, among those the merged Model still has. */
function unionFeatures(p: Project, scoped: string[]): string[] {
  const existing = loadModel(p).features;
  return [...new Set(scoped)].filter((feature) => existing.has(feature)).sort();
}

const MERGE_DRIFT = `# Merge

## What happens

The Proposals in this round change the same part of the Model, and those changes do not combine.

## What should happen

The round keeps every behaviour the Proposals added, or the conflicts are reconciled from the markers git wrote.

## Fix options

### Reconcile keeping every behaviour

Keep every behaviour the Proposals in the round added, and combine them so none is dropped.

### Reconcile from the conflict markers

Read the conflict markers and keep the behaviours they show, dropping only what cannot be kept.
`;

/**
 * When every Task of the Proposals still in the round is Done, commits what they left behind and tries the merge
 * in the merge worktree. The open folder receives the result only when that merge is clean and the folder is on
 * the branch the round started from, with a clean tree. A conflict leaves the branch untouched and writes the Merge Drift.
 */
export function mergeRound(p: Project, skillsDirs: string[] = []): MergeRoundResult {
  const ids = worktreeProposalIds(p);
  if (ids.length === 0) return { kind: "pending" };
  // A worktree also holds the open folder's own Tasks, copied with the commit it started from: only the round's Tasks count.
  const round = new Set(ids);
  for (const folder of roundWorktrees(p))
    for (const task of listTasks(folder.project)) if (task.data.proposal !== null && round.has(task.data.proposal) && task.data.column !== "done") return { kind: "pending" };

  const origin = roundOrigin(p.root);
  if (!origin) throw new TramaError("The worktree round no longer remembers the branch it started from.");
  const prepared = preparedMerge(p.root, origin.commit);
  if (prepared === "conflict") return { kind: "conflict", again: true };
  if (prepared === "reconciling") return { kind: "pending" };
  if (prepared === "ready") return landReadyMerge(p, skillsDirs, origin.branch, true);
  for (const id of ids) commitLeftovers(worktreePath(p.root, id), proposalFileRel(p, id));

  const mergePath = worktreePath(p.root, "merge");
  mkdirSync(worktreesHome(p.root), { recursive: true });
  const added = git(p.root, ["worktree", "add", "-b", "trama/merge", mergePath, origin.commit]);
  if (!added.ok) return { kind: "refused", message: failure(added) };

  return mergeBranches(p, skillsDirs, ids, origin.branch);
}

/** A merge worktree already holds a result. `ready` can be applied; `conflict` holds an unfinished merge; `none` is not there yet. */
function preparedMerge(root: string, originCommit: string): "none" | "conflict" | "ready" | "reconciling" {
  const mergePath = worktreePath(root, "merge");
  if (!existsSync(mergePath)) return "none";
  if (mergeTaskRels(mergePath).length > 0) return "reconciling";
  if (conflictOpen(mergePath)) return "conflict";
  const head = git(mergePath, ["rev-parse", "HEAD"]);
  if (!head.ok) throw new TramaError(failure(head));
  if (head.stdout === originCommit) return "conflict";
  return "ready";
}

/**
 * Applies a merge that is already waiting in the merge worktree, once the open folder is the branch the round
 * started from and has no uncommitted changes. Only a round really waiting counts: no merge stopped on its markers,
 * no Merge Drift and no reconciliation Task, Done or not. A reconciliation goes on only when the agent's command ends.
 */
export function applyWaitingMerge(p: Project, skillsDirs: string[] = []): MergeRoundResult {
  const origin = roundOrigin(p.root);
  const mergePath = worktreePath(p.root, "merge");
  if (!origin || !existsSync(mergePath)) return { kind: "pending" };
  const head = git(mergePath, ["rev-parse", "HEAD"]);
  if (!head.ok || head.stdout === origin.commit) return { kind: "pending" };
  if (mergeInProgress(mergePath) || existsSync(join(mergePath, ".trama", "merge-drift.md")) || mergeTaskRels(mergePath).length > 0) return { kind: "pending" };
  if (mergedProposalIds(p).length === 0) return { kind: "pending" };
  return landReadyMerge(p, skillsDirs, origin.branch, true);
}

/**
 * Every Proposal whose branch is in the merged result becomes Approved and loses its branch, even when its
 * worktree folder is already gone: its work is landing in the branch with the rest of the round.
 */
function landReadyMerge(p: Project, skillsDirs: string[], branch: string, again: boolean): MergeRoundResult {
  dropMergeArtifacts(worktreePath(p.root, "merge"));
  const head = git(p.root, ["rev-parse", "--abbrev-ref", "HEAD"]);
  const status = git(p.root, ["status", "--porcelain"]);
  if (!head.ok || !status.ok) throw new TramaError(failure(head.ok ? status : head));
  if (head.stdout !== branch || status.stdout !== "") return again ? { kind: "waiting", branch, again } : { kind: "waiting", branch };

  const ids = mergedProposalIds(p);
  // Scoped against the folder before the merge lands, the rule of an acceptance: afterwards the Requirements no longer differ.
  const scoped = ids.flatMap((id) => proposalScope(p, id));
  // The scan scope each Proposal got when it entered its worktree, kept beside the worktrees; a round started before
  // that was kept has it only in the worktree's own copy.
  const remembered = rememberedScopes(p.root);
  const scopes = new Map(ids.map((id) => [id, remembered[id] ?? (existsSync(join(worktreePath(p.root, id), proposalFileRel(p, id))) ? getProposal(projectAt(worktreePath(p.root, id)), id).data.scanScope : null)]));
  // The branch may have moved on while the round waited: catch the merge worktree up there, so the open folder only fast-forwards.
  const mergePath = worktreePath(p.root, "merge");
  const caughtUp = git(mergePath, ["merge", "--no-edit", branch]);
  if (!caughtUp.ok) {
    // The branch moved on the same lines: the merge stops in the merge worktree with its markers and the Merge Drift is born.
    if (!mergeInProgress(mergePath)) throw new TramaError(failure(caughtUp));
    return conflictLeft(mergePath);
  }
  const landing = git(p.root, ["merge", "--ff-only", "trama/merge"]);
  if (!landing.ok) return again ? { kind: "waiting", branch, again } : { kind: "waiting", branch };

  const features = unionFeatures(p, scoped);
  for (const id of ids) recordMergedProposal(p, id, scopes.get(id) ?? null);
  syncRequirementSkills(p, skillsDirs);
  for (const id of [...ids, "merge"]) {
    // Also unregisters a worktree whose folder vanished, which would otherwise keep its branch checked out.
    git(p.root, ["worktree", "remove", "--force", worktreePath(p.root, id)]);
    git(p.root, ["branch", "-D", `trama/${id}`]);
  }
  rmSync(join(worktreesHome(p.root), "round.json"), { force: true });
  return { kind: "merged", features };
}

function reconciliationOpen(mergePath: string): boolean {
  return mergeTaskRels(mergePath).some((rel) => {
    try {
      return readDocument(join(mergePath, rel)).data.column !== "done";
    } catch {
      return false;
    }
  });
}

/** Tracked paths of the Merge Drift and of Tasks marked as the round's reconciliation. */
function mergeTaskRels(mergePath: string): string[] {
  const dir = join(mergePath, ".trama", "tasks");
  if (!existsSync(dir)) return [];
  const rels: string[] = [];
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".md")) continue;
    const rel = join(".trama", "tasks", name);
    try {
      if (readDocument(join(mergePath, rel)).data.merge === true) rels.push(rel);
    } catch {
      // A task file that cannot be read is not the reconciliation Task.
    }
  }
  return rels;
}

/** The round's reconciliation Tasks, read from the merge worktree; none outside Reconciling. */
export function reconciliationTasks(root: string): Task[] {
  const mergePath = worktreePath(root, "merge");
  const home = projectAt(mergePath);
  return mergeTaskRels(mergePath).flatMap((rel) => {
    try {
      return [getTask(home, basename(rel))];
    } catch {
      return [];
    }
  });
}

/** The Merge Drift of the round, to decide only in Conflict: while a reconciliation Task exists the round is Reconciling. */
export function readMergeDrift(root: string): { title: string; body: string } | null {
  const mergePath = worktreePath(root, "merge");
  const path = join(mergePath, ".trama", "merge-drift.md");
  if (!existsSync(path) || mergeTaskRels(mergePath).length > 0) return null;
  const body = readFileSync(path, "utf8");
  const title = /^#\s+(.+)$/m.exec(body)?.[1]?.trim() || "Merge";
  return { title, body };
}

/** A Drift-shaped value so the Merge Drift's sections parse like any other Drift. */
export function mergeDriftDocument(root: string): Drift | null {
  const read = readMergeDrift(root);
  if (!read) return null;
  const path = join(worktreePath(root, "merge"), ".trama", "merge-drift.md");
  return { id: "merge", name: "merge-drift.md", path, title: read.title, body: read.body, data: { status: "open", resolution: null, refs: [], proposal: null, task: null, origin: null, option: null, note: null, created: null } };
}

/**
 * The developer keeps the side that reconciles. A Technical Task is born in the merge worktree, linked to no Proposal,
 * where the merge waits with its conflicts. The Merge Drift stays until the round is merged or abandoned.
 */
export function reconcileMerge(p: Project, option: number): { task: string; worktree: string } {
  const mergePath = worktreePath(p.root, "merge");
  // Only from Conflict: while a reconciliation Task exists, in any column, the round is Reconciling.
  if (mergeTaskRels(mergePath).length > 0) throw new TramaError("The round is already being reconciled.");
  const drift = mergeDriftDocument(p.root);
  if (!drift) throw new TramaError("There is no Merge Drift to reconcile.");
  const options = driftOptions(drift);
  const chosen = options[option - 1];
  if (!chosen) throw new TramaError(`The Merge Drift has no fix option ${option}.`);
  const task = newTask(projectAt(mergePath), {
    title: "Reconcile the worktree round",
    refs: [],
    technical: true,
    body: `${chosen.title}\n\n${chosen.text}\n\nThis folder holds the round's merge, stopped on its conflicts: resolve every conflict here and leave no conflict markers. Trama commits the result and merges the round's remaining branches.`,
  });
  const doc = readDocument(task.path);
  writeDocument(task.path, { ...doc.data, merge: true }, doc.body);
  return { task: task.id, worktree: mergePath };
}

/**
 * Gives up the round from conflict, reconciliation or waiting. Every Proposal is open again, the worktrees
 * are deleted and the open branch is left as it is.
 */
export function abandonRound(p: Project): void {
  const ids = worktreeProposalIds(p);
  const mergePath = worktreePath(p.root, "merge");
  if (ids.length === 0 && !existsSync(mergePath)) throw new TramaError("There is no worktree round to abandon.");
  for (const id of [...ids, "merge"]) {
    const path = worktreePath(p.root, id);
    if (existsSync(path)) {
      const removed = git(p.root, ["worktree", "remove", "--force", path]);
      if (!removed.ok) throw new TramaError(failure(removed));
    }
    git(p.root, ["branch", "-D", `trama/${id}`]);
  }
  rmSync(join(worktreesHome(p.root), "round.json"), { force: true });
}

/**
 * The reconciliation command ended. When its Task is Done and no conflict marker is left, what remains is committed
 * without the Merge Drift or that Task, and the merge is tried again. Otherwise the round stays and the merge is not tried.
 */
export function finishReconciliation(p: Project, skillsDirs: string[] = []): MergeRoundResult | { kind: "stayed" } {
  const mergePath = worktreePath(p.root, "merge");
  if (!existsSync(mergePath) || mergeTaskRels(mergePath).length === 0) return { kind: "pending" };
  if (reconciliationOpen(mergePath)) return { kind: "stayed" };
  const origin = roundOrigin(p.root);
  if (!origin) throw new TramaError("The worktree round no longer remembers the branch it started from.");
  if (conflictMarkers(mergePath)) return conflictLeft(mergePath);
  commitReconciliation(mergePath);
  return mergeBranches(p, skillsDirs, worktreeProposalIds(p), origin.branch);
}

/** Merges every branch of the round not merged yet. A conflict stays in the merge worktree, with its markers. */
function mergeBranches(p: Project, skillsDirs: string[], ids: string[], branch: string): MergeRoundResult {
  const mergePath = worktreePath(p.root, "merge");
  for (const id of [...ids].sort()) {
    const merged = git(mergePath, ["merge", "--no-edit", `trama/${id}`]);
    if (merged.ok) continue;
    if (!mergeInProgress(mergePath)) throw new TramaError(failure(merged));
    return conflictLeft(mergePath);
  }
  return landReadyMerge(p, skillsDirs, branch, false);
}

function conflictLeft(mergePath: string): MergeRoundResult {
  clearReconciliationTasks(mergePath);
  writeFileEnsuringDir(join(mergePath, ".trama", "merge-drift.md"), MERGE_DRIFT);
  return { kind: "conflict" };
}

function mergeInProgress(mergePath: string): boolean {
  return git(mergePath, ["rev-parse", "-q", "--verify", "MERGE_HEAD"]).ok;
}

/**
 * The round is in conflict: a merge stopped on its markers, or the Merge Drift is there with no reconciliation Task,
 * as when the worktree whose branch the merge stopped on disappeared and that unfinished merge was dropped.
 */
function conflictOpen(mergePath: string): boolean {
  return mergeInProgress(mergePath) || (existsSync(join(mergePath, ".trama", "merge-drift.md")) && mergeTaskRels(mergePath).length === 0);
}

function commitReconciliation(mergePath: string): void {
  const excluded = [join(".trama", "merge-drift.md"), ...mergeTaskRels(mergePath)].filter((rel) => existsSync(join(mergePath, rel)));
  const added = git(mergePath, ["add", "-A"]);
  if (!added.ok) throw new TramaError(failure(added));
  if (excluded.length > 0) {
    const unstaged = git(mergePath, ["reset", "HEAD", "--", ...excluded]);
    if (!unstaged.ok) throw new TramaError(failure(unstaged));
  }
  const staged = git(mergePath, ["diff", "--cached", "--name-only"]);
  if (!staged.ok) throw new TramaError(failure(staged));
  // An unfinished merge is concluded even when its result equals one side.
  if (staged.stdout === "" && !mergeInProgress(mergePath)) return;
  const committed = git(mergePath, ["commit", "-m", KEEP]);
  if (!committed.ok) throw new TramaError(failure(committed));
}

/** Markers anywhere in the merge result, including files the agent already committed or has not staged yet. */
function conflictMarkers(mergePath: string): boolean {
  const found = git(mergePath, ["grep", "--untracked", "--exclude-standard", "-l", "-e", "^<<<<<<<"]);
  return found.ok && found.stdout !== "";
}

function clearReconciliationTasks(mergePath: string): void {
  for (const rel of mergeTaskRels(mergePath)) rmSync(join(mergePath, rel), { force: true });
}

/** Removes the Merge Drift and its Tasks before the merge lands or waits; committed ones leave the merged result too. */
function dropMergeArtifacts(mergePath: string): void {
  const rels = [...mergeTaskRels(mergePath), join(".trama", "merge-drift.md")];
  const tracked = rels.filter((rel) => git(mergePath, ["ls-files", "--error-unmatch", "--", rel]).ok);
  for (const rel of rels) rmSync(join(mergePath, rel), { force: true });
  if (tracked.length === 0) return;
  const removed = git(mergePath, ["rm", "-f", "--", ...tracked]);
  if (!removed.ok) throw new TramaError(failure(removed));
  const committed = git(mergePath, ["commit", "-m", LEAVE_DRIFT]);
  if (!committed.ok) throw new TramaError(failure(committed));
}
