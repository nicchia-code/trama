import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { TramaError } from "./errors";
import { approvalBlock, getProposal, writeProposalFiles } from "./proposals";
import { proposalScope } from "./scope";
import { compareByCreation, loadModel, type Project, projectAt, writeFileEnsuringDir } from "./store";

/**
 * A round is not a file in the repository. Trama reads it from git worktrees whose branch is
 * `trama/<proposal id>` or `trama/merge`, and from the sibling folder that holds those worktrees.
 * The sibling folder also remembers the branch and commit the round started from, so a later
 * Proposal is born from that same commit even after the open branch moves.
 */
export interface RoundOrigin {
  branch: string;
  commit: string;
}

export interface WorktreeAcceptance {
  worktree: string;
  features: string[];
  branch: string;
  commit: string;
}

export type AcceptResult = { ok: true; acceptance: WorktreeAcceptance } | { ok: false; message: string };

/** `trama/<id>`: a numbered Proposal or an eight-character identity. `trama/merge` is the merge worktree, not a Proposal. */
const PROPOSAL_BRANCH = /^refs\/heads\/trama\/([a-z0-9]{8}|\d+)$/;
const MERGE_BRANCH = "refs/heads/trama/merge";
/** Blocks that still leave the Proposal open: the multi-branch rules are checked first, then this reason. */
const OPEN_BLOCK = new Set(["waiting", "stale", "unregistered", "invalid"]);

interface GitWorktree {
  path: string;
  branch: string | null;
}

function git(cwd: string, args: string[]): { ok: boolean; stdout: string; stderr: string } {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
  const stdout = (result.stdout ?? "").trim();
  const stderr = (result.stderr || result.error?.message || "").trim();
  return { ok: result.status === 0, stdout, stderr };
}

function parseWorktrees(porcelain: string): GitWorktree[] {
  const out: GitWorktree[] = [];
  let current: GitWorktree | undefined;
  for (const line of porcelain.split("\n")) {
    if (line.startsWith("worktree ")) {
      current = { path: line.slice("worktree ".length), branch: null };
      out.push(current);
    } else if (current && line.startsWith("branch ")) current.branch = line.slice("branch ".length);
  }
  return out;
}

function samePath(a: string, b: string): boolean {
  const norm = (path: string) => {
    try {
      return realpathSync(path);
    } catch {
      return resolve(path);
    }
  };
  return norm(a) === norm(b);
}

/** True only when `root` itself is the Git work tree, not a folder sitting inside some other repository. */
function ownRepo(root: string): boolean {
  const top = git(root, ["rev-parse", "--show-toplevel"]);
  return top.ok && samePath(top.stdout, root);
}

function listed(root: string): GitWorktree[] {
  if (!ownRepo(root)) return [];
  const result = git(root, ["worktree", "list", "--porcelain"]);
  return result.ok ? parseWorktrees(result.stdout) : [];
}

/** Sibling of the repository: `<parent>/<repository name>.trama-worktrees`. */
export function worktreesHome(root: string): string {
  return join(dirname(root), `${basename(root)}.trama-worktrees`);
}

export function worktreePath(root: string, id: string): string {
  return join(worktreesHome(root), id);
}

const originFile = (root: string) => join(worktreesHome(root), "round.json");

/** The branch and commit the round started from, when the sibling folder still remembers them. */
export function roundOrigin(root: string): RoundOrigin | null {
  const file = originFile(root);
  if (!existsSync(file)) return null;
  try {
    const raw = JSON.parse(readFileSync(file, "utf8")) as { branch?: unknown; commit?: unknown };
    if (typeof raw.branch !== "string" || raw.branch === "" || typeof raw.commit !== "string" || !/^[0-9a-f]+$/i.test(raw.commit)) return null;
    return { branch: raw.branch, commit: raw.commit };
  } catch {
    return null;
  }
}

function rememberOrigin(root: string, origin: RoundOrigin): void {
  writeFileEnsuringDir(originFile(root), `${JSON.stringify(origin, null, 2)}\n`);
}

/** Proposal ids the sibling folder remembers, or null when the round file does not list them yet. */
function rememberedProposals(root: string): string[] | null {
  const file = originFile(root);
  if (!existsSync(file)) return null;
  try {
    const raw = JSON.parse(readFileSync(file, "utf8")) as { proposals?: unknown };
    if (!Array.isArray(raw.proposals) || raw.proposals.some((id) => typeof id !== "string")) return null;
    return raw.proposals;
  } catch {
    return null;
  }
}

function writeRound(root: string, origin: RoundOrigin, proposals: string[]): void {
  writeFileEnsuringDir(originFile(root), `${JSON.stringify({ ...origin, proposals: [...new Set(proposals)].sort() }, null, 2)}\n`);
}

/** The worktrees of the Proposals still in the round, in id order, each as its own project. */
export function roundWorktrees(p: Project): { proposal: string; project: Project }[] {
  const out: { proposal: string; project: Project }[] = [];
  for (const id of [...worktreeProposalIds(p)].sort()) {
    const path = worktreePath(p.root, id);
    if (!existsSync(join(path, ".trama"))) continue;
    out.push({ proposal: id, project: projectAt(path) });
  }
  return out;
}

function proposalEntries(root: string): { id: string; path: string }[] {
  const out: { id: string; path: string }[] = [];
  for (const entry of listed(root)) {
    const id = PROPOSAL_BRANCH.exec(entry.branch ?? "")?.[1];
    if (id) out.push({ id, path: entry.path });
  }
  return out;
}

/** A round is open while a Proposal worktree exists, or the merge worktree does (merging, in conflict, reconciling or waiting). */
export function worktreeRoundOpen(p: Project): boolean {
  return worktreeProposalIds(p).length > 0 || mergeWorktreeOpen(p.root);
}

/** Proposal ids whose worktree folder is still there. A folder that disappeared has left the round. */
export function worktreeProposalIds(p: Project): string[] {
  return proposalEntries(p.root).filter((entry) => existsSync(entry.path)).map((entry) => entry.id);
}

function mergeWorktreeOpen(root: string): boolean {
  return listed(root).some((entry) => entry.branch === MERGE_BRANCH);
}

/** Open Proposals that still await a decision. One in a worktree has left that column. */
export function openProposalsAwaitingDecision<T extends { id: string; data: { status: string } }>(p: Project, proposals: T[]): T[] {
  const away = new Set(worktreeProposalIds(p));
  return proposals.filter((proposal) => proposal.data.status === "open" && !away.has(proposal.id));
}

/** True when this Proposal currently has a worktree in the round. */
export function proposalIsInWorktree(p: Project, id: string): boolean {
  return worktreeProposalIds(p).includes(id);
}

/** A Proposal shown in the Board's In worktree group. `removable` is false once the round has started merging. */
export interface InWorktreeProposal {
  id: string;
  title: string;
  removable: boolean;
}

/** Proposals that have a worktree, oldest first. They are not among those awaiting a decision. */
export function inWorktreeProposals(p: Project): InWorktreeProposal[] {
  const removable = !mergeWorktreeOpen(p.root);
  const cards: { id: string; title: string; created: string | null }[] = [];
  for (const id of worktreeProposalIds(p)) {
    try {
      const proposal = getProposal(p, id);
      cards.push({ id, title: proposal.title, created: proposal.data.created });
    } catch {
      // A worktree whose Proposal file is gone is not a card; nothing here can name it.
    }
  }
  return cards.sort((a, b) => compareByCreation(a, b)).map(({ id, title }) => ({ id, title, removable }));
}

/**
 * Removes one Proposal from the round, before the round has started merging.
 * Its worktree is deleted and it is open again, so it awaits a decision.
 * When it was the last Proposal, the round is gone.
 */
export function withdrawFromRound(p: Project, id: string): { remaining: number } {
  getProposal(p, id);
  if (mergeWorktreeOpen(p.root)) throw new TramaError("One Proposal cannot be removed while the round is merging, in conflict, reconciling or waiting.");
  const entry = listed(p.root).find((item) => PROPOSAL_BRANCH.exec(item.branch ?? "")?.[1] === id);
  if (!entry) throw new TramaError(`Proposal ${id} is not in a worktree.`);
  const removed = git(p.root, ["worktree", "remove", "--force", entry.path]);
  if (!removed.ok) throw new TramaError(gitFailure(removed));
  const branch = git(p.root, ["branch", "-D", `trama/${id}`]);
  if (!branch.ok) throw new TramaError(gitFailure(branch));
  const remainingIds = worktreeProposalIds(p);
  const origin = roundOrigin(p.root);
  if (remainingIds.length === 0 || !origin) rmSync(originFile(p.root), { force: true });
  else writeRound(p.root, origin, remainingIds);
  return { remaining: remainingIds.length };
}

/** A Proposal whose worktree disappeared before the round merged. */
export interface LostWorktree {
  id: string;
  title: string;
  /** Proposal worktrees still in the round after this loss. */
  remaining: number;
}

/**
 * A Proposal worktree that is gone — the folder was deleted, including by Cursor's own cleanup —
 * leaves the round. The Proposal is open again, so it awaits a decision. The others stay.
 * When none remain, the round is gone. Calling it again reports nothing.
 */
export function reconcileLostWorktrees(p: Project): LostWorktree[] {
  if (!ownRepo(p.root) || mergeWorktreeOpen(p.root)) return [];
  const entries = proposalEntries(p.root);
  const present = new Set(entries.filter((entry) => existsSync(entry.path)).map((entry) => entry.id));
  const remembered = rememberedProposals(p.root);
  const lostIds = [
    ...new Set([
      ...entries.filter((entry) => !existsSync(entry.path)).map((entry) => entry.id),
      ...(remembered ?? []).filter((id) => !present.has(id)),
    ]),
  ].sort();
  const origin = roundOrigin(p.root);
  if (lostIds.length === 0) {
    if (origin && remembered === null && present.size > 0) writeRound(p.root, origin, [...present]);
    return [];
  }
  for (const id of lostIds) {
    const entry = entries.find((item) => item.id === id);
    if (entry) git(p.root, ["worktree", "remove", "--force", entry.path]);
    git(p.root, ["worktree", "prune"]);
    git(p.root, ["branch", "-D", `trama/${id}`]);
  }
  const remaining = worktreeProposalIds(p);
  const still = roundOrigin(p.root);
  if (remaining.length === 0 || !still) rmSync(originFile(p.root), { force: true });
  else writeRound(p.root, still, remaining);
  return lostIds.map((id) => {
    let title = "";
    try {
      title = getProposal(p, id).title;
    } catch {
      // The Proposal file itself may be gone; the notice still names the id.
    }
    return { id, title, remaining: remaining.length };
  });
}

/** What the editor tells the developer when a Proposal's worktree has disappeared. */
export function lostWorktreeMessage(lost: LostWorktree): string {
  const who = lost.title === "" ? `Proposal ${lost.id}` : `Proposal ${lost.id} "${lost.title}"`;
  const rest = lost.remaining === 0 ? " There is no round left." : " The other Proposals stay in the round.";
  return `${who} is back to decide: its worktree is gone.${rest}`;
}

function refuse(message: string): AcceptResult {
  return { ok: false, message };
}

function gitFailure(result: { stderr: string; stdout: string }): string {
  return result.stderr || result.stdout || "Git could not create the worktree.";
}

/**
 * Accepts an ordinary Proposal into a worktree. The open folder is not modified.
 * The caller has already decided that multi-branch is on and that this is not a Drift's Proposal.
 */
export function acceptIntoWorktree(p: Project, id: string, options: { autoScan: boolean; worktreeAgent: string }): AcceptResult {
  const block = approvalBlock(p, id);
  if (block && !OPEN_BLOCK.has(block.kind)) return refuse(block.reason);
  if (proposalIsInWorktree(p, id)) return refuse(`Proposal ${id} is in a worktree.`);
  const proposal = getProposal(p, id);
  if (proposal.data.kind === "import") return refuse("Import proposals cannot be accepted while multi-branch is on.");
  if (!options.autoScan) return refuse("Turn automatic scan on, or turn multi-branch off, before accepting this Proposal.");
  const existing = loadModel(p).features;
  const features = proposalScope(p, proposal.id).filter((feature) => existing.has(feature));
  if (features.length === 0) return refuse("This Proposal affects no Feature, so multi-branch cannot start a worktree.");
  if (options.worktreeAgent.trim() === "") return refuse("Set trama.worktreeAgent in your user settings before accepting a Proposal with multi-branch on.");
  if (block) return refuse(block.reason);

  if (!ownRepo(p.root)) return refuse("This folder is not a Git repository, so a worktree cannot be created.");
  const headBranch = git(p.root, ["rev-parse", "--abbrev-ref", "HEAD"]);
  if (!headBranch.ok || headBranch.stdout === "" || headBranch.stdout === "HEAD") return refuse("This folder is not on a branch, so a worktree cannot be created.");
  const head = git(p.root, ["rev-parse", "HEAD"]);
  if (!head.ok) return refuse(gitFailure(head));
  const status = git(p.root, ["status", "--porcelain"]);
  if (!status.ok) return refuse(gitFailure(status));
  if (status.stdout !== "") return refuse("Commit or stash your changes before accepting a Proposal with multi-branch on.");
  // A merge worktree means the round is merging, in conflict, reconciling or waiting.
  if (mergeWorktreeOpen(p.root)) return refuse("A worktree round is already merging. Wait until it finishes.");

  const inRound = worktreeProposalIds(p);
  const stored = inRound.length > 0 ? roundOrigin(p.root) : null;
  const commit = stored?.commit ?? head.stdout;
  const branch = stored?.branch ?? headBranch.stdout;
  const path = worktreePath(p.root, proposal.id);
  const branchName = `trama/${proposal.id}`;
  mkdirSync(worktreesHome(p.root), { recursive: true });
  const added = git(p.root, ["worktree", "add", "-b", branchName, path, commit]);
  if (!added.ok) {
    if (existsSync(path)) git(p.root, ["worktree", "remove", "--force", path]);
    return refuse(gitFailure(added));
  }
  const createdOrigin = stored === null;
  if (createdOrigin) rememberOrigin(p.root, { branch, commit });
  try {
    writeProposalFiles(p, proposal.id, join(path, ".trama"));
  } catch (err) {
    git(p.root, ["worktree", "remove", "--force", path]);
    git(p.root, ["branch", "-D", branchName]);
    if (createdOrigin) rmSync(originFile(p.root), { force: true });
    throw err;
  }
  const origin = roundOrigin(p.root);
  if (origin) writeRound(p.root, origin, worktreeProposalIds(p));
  return { ok: true, acceptance: { worktree: path, features, branch, commit } };
}
