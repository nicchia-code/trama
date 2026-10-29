import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TramaError } from "../src/core/errors";
import { setSoloMode, soloDir } from "../src/core/solo-mode";
import {
  abortMerge,
  conflictedFiles,
  currentBranch,
  fetchRemotes,
  hasTrackedChanges,
  isUpToDate,
  mergeAvailability,
  mergeBranches,
  mergeFile,
  type OpenMerge,
  operationInProgress,
  readOpenMerge,
  settleMerge,
  startMerge,
  upstreamBranch,
} from "../src/core/solo-merge";
import { type Project, projectAt } from "../src/core/store";

const GIT_TEST_MS = 60_000;

let base: string;

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), "trama-merge-"));
});
afterEach(() => rmSync(base, { recursive: true, force: true }));

function git(cwd: string, ...args: string[]): string {
  const r = spawnSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", "-c", "core.editor=true", ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
    killSignal: "SIGKILL",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
  if (r.error !== undefined || r.status !== 0) throw new Error(r.error?.message ?? r.stderr);
  return r.stdout.trim();
}

/** Trama's own git commands (the merge commit) need an identity: CI runners have none, and git cannot always guess one. */
function identify(repo: string): void {
  git(repo, "config", "user.name", "Test");
  git(repo, "config", "user.email", "test@example.com");
  git(repo, "config", "commit.gpgsign", "false");
}

const write = (path: string, text: string): void => {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, text);
};

/** Writes `files` in `repo`, stages and commits them. */
function commit(repo: string, message: string, files: Record<string, string>): string {
  for (const [name, text] of Object.entries(files)) write(join(repo, name), text);
  git(repo, "add", "-A");
  git(repo, "commit", "-q", "-m", message);
  return git(repo, "rev-parse", "HEAD");
}

/** A repository on `main` with one commit (`a.txt`), and Solo mode on in `folders` (its files untracked and kept out by the block). */
function repo(sub = ""): { root: string; p: Project } {
  git(base, "init", "-q", "-b", "main");
  identify(base);
  const root = sub === "" ? base : join(base, sub);
  mkdirSync(root, { recursive: true });
  commit(base, "first", { [sub === "" ? "a.txt" : `${sub}/a.txt`]: "one\n" });
  const p = projectAt(root);
  mkdirSync(p.dir, { recursive: true });
  setSoloMode(p, "folders");
  return { root, p };
}

/** A branch `name` from the current HEAD with one commit, then back on the branch it left. */
function branchWith(root: string, name: string, files: Record<string, string>): string {
  const from = git(root, "rev-parse", "--abbrev-ref", "HEAD");
  git(root, "checkout", "-q", "-b", name);
  const hash = commit(root, `on ${name}`, files);
  git(root, "checkout", "-q", from);
  return hash;
}

/** A conflict: `main` and `other` both change `a.txt` (and `b.txt`), so merging `other` stops. Leaves the repository on `main`. */
function conflicting(root: string): void {
  branchWith(root, "other", { "a.txt": "other\n", "b.txt": "other b\n" });
  commit(root, "main change", { "a.txt": "main\n", "b.txt": "main b\n" });
}

describe("availability", () => {
  test("a clean branch is available; untracked files do not count", async () => {
    const { root, p } = repo();
    write(join(root, "new.txt"), "untracked\n");
    expect(await mergeAvailability(p, false)).toEqual({ available: true });
    expect(await hasTrackedChanges(p)).toBe(false);
  }, GIT_TEST_MS);

  test("a change to a tracked file, staged or not, makes it unavailable", async () => {
    const { root, p } = repo();
    write(join(root, "a.txt"), "changed\n");
    expect(await mergeAvailability(p, false)).toEqual({ available: false, reason: "changes" });
    git(root, "add", "a.txt");
    expect(await mergeAvailability(p, false)).toEqual({ available: false, reason: "changes" });
    git(root, "reset", "-q", "--hard");
    expect((await mergeAvailability(p, false)).available).toBe(true);
  }, GIT_TEST_MS);

  test("changes to tracked Trama files inside the block do not count, those outside do", async () => {
    const { root, p } = repo();
    write(join(root, ".trama", "tracked.md"), "a\n");
    git(root, "add", "-f", ".trama/tracked.md");
    git(root, "commit", "-q", "-m", "tracked trama file");
    write(join(root, ".trama", "tracked.md"), "b\n");
    expect(await hasTrackedChanges(p)).toBe(false);
    write(join(root, "a.txt"), "changed\n");
    expect(await hasTrackedChanges(p)).toBe(true);
  }, GIT_TEST_MS);

  test("a project inside the repository: the block's paths are those of the project, other paths of the repository count", async () => {
    const { root, p } = repo("app");
    write(join(root, ".trama", "tracked.md"), "a\n");
    git(root, "add", "-f", ".trama/tracked.md");
    git(root, "commit", "-q", "-m", "tracked trama file");
    write(join(root, ".trama", "tracked.md"), "b\n");
    expect(await hasTrackedChanges(p)).toBe(false);
    write(join(base, "a.txt"), "changed outside the project\n");
    write(join(root, "a.txt"), "changed inside the project\n");
    expect(await hasTrackedChanges(p)).toBe(true);
    git(base, "reset", "-q", "--hard");
    write(join(base, "top.txt"), "x\n");
    git(base, "add", "top.txt");
    expect(await hasTrackedChanges(p)).toBe(true);
  }, GIT_TEST_MS);

  test("a detached HEAD, a merge in progress and a running job give their reasons, in that order", async () => {
    const { root, p } = repo();
    expect(await mergeAvailability(p, true)).toEqual({ available: false, reason: "agent" });
    write(join(root, "a.txt"), "changed\n");
    expect(await mergeAvailability(p, true)).toEqual({ available: false, reason: "changes" });
    git(root, "checkout", "-q", "--detach");
    expect(await mergeAvailability(p, true)).toEqual({ available: false, reason: "detached" });
    expect(await currentBranch(root)).toBeNull();
    git(root, "checkout", "-q", "--", "a.txt");
    git(root, "checkout", "-q", "main");
    conflicting(root);
    expect(() => git(root, "merge", "other")).toThrow();
    expect(await operationInProgress(root)).toBe(true);
    expect(await mergeAvailability(p, true)).toEqual({ available: false, reason: "inProgress" });
  }, GIT_TEST_MS);

  test("a cherry-pick or a revert in progress makes it unavailable", async () => {
    const { root, p } = repo();
    const other = branchWith(root, "other", { "a.txt": "other\n" });
    commit(root, "main change", { "a.txt": "main\n" });
    expect(() => git(root, "cherry-pick", other)).toThrow();
    expect(await mergeAvailability(p, false)).toEqual({ available: false, reason: "inProgress" });
    git(root, "cherry-pick", "--abort");
    expect((await mergeAvailability(p, false)).available).toBe(true);
  }, GIT_TEST_MS);
});

describe("branches", () => {
  /** A clone of a bare remote, on `main` tracking `origin/main`, with Solo mode on. */
  function cloned(): { root: string; remote: string; p: Project } {
    const remote = join(base, "remote.git");
    const seed = join(base, "seed");
    mkdirSync(seed);
    git(seed, "init", "-q", "-b", "main");
    commit(seed, "first", { "a.txt": "one\n" });
    git(base, "clone", "-q", "--bare", seed, remote);
    const root = join(base, "work");
    git(base, "clone", "-q", remote, root);
    identify(root);
    const p = projectAt(root);
    mkdirSync(p.dir, { recursive: true });
    setSoloMode(p, "folders");
    return { root, remote, p };
  }

  test("the upstream first, then the other remote branches, then the local ones, each in alphabetical order, without the current branch or <remote>/HEAD", async () => {
    const { root, remote } = cloned();
    const other = join(base, "other");
    git(base, "clone", "-q", remote, other);
    for (const name of ["zeta", "beta"]) {
      git(other, "checkout", "-q", "-b", name);
      commit(other, name, { [`${name}.txt`]: name });
      git(other, "push", "-q", "origin", name);
    }
    git(root, "fetch", "-q", "--all");
    git(root, "branch", "mine");
    git(root, "branch", "alpha");
    expect(await upstreamBranch(root)).toBe("origin/main");
    expect(await mergeBranches(root)).toEqual([
      { name: "origin/main", upstream: true, usual: true },
      { name: "origin/beta", upstream: false, usual: false },
      { name: "origin/zeta", upstream: false, usual: false },
      { name: "alpha", upstream: false, usual: false },
      { name: "mine", upstream: false, usual: false },
    ]);
  }, GIT_TEST_MS);

  test("a branch that is <remote>/<current branch> is usual even without an upstream; with no upstream none is marked", async () => {
    const { root } = cloned();
    git(root, "checkout", "-q", "-b", "feature");
    git(root, "push", "-q", "origin", "feature");
    git(root, "fetch", "-q", "--all");
    expect(await upstreamBranch(root)).toBeNull();
    const branches = await mergeBranches(root);
    expect(branches.map((b) => b.upstream)).toEqual(branches.map(() => false));
    expect(branches.filter((b) => b.usual).map((b) => b.name)).toEqual(["origin/feature"]);
    expect(branches.map((b) => b.name)).toEqual(["origin/feature", "origin/main", "main"]);
  }, GIT_TEST_MS);

  test("fetchRemotes brings in what the remote has, prunes what it dropped, and fails with git's reason", async () => {
    const { root, remote } = cloned();
    const other = join(base, "other");
    git(base, "clone", "-q", remote, other);
    git(other, "checkout", "-q", "-b", "news");
    commit(other, "news", { "n.txt": "n" });
    git(other, "push", "-q", "origin", "news");
    await fetchRemotes(root);
    expect((await mergeBranches(root)).map((b) => b.name)).toContain("origin/news");
    git(other, "push", "-q", "origin", "--delete", "news");
    await fetchRemotes(root);
    expect((await mergeBranches(root)).map((b) => b.name)).not.toContain("origin/news");
    git(root, "remote", "set-url", "origin", join(base, "missing.git"));
    const error = await fetchRemotes(root).then(() => null, (e: unknown) => e);
    expect(error).toBeInstanceOf(TramaError);
    expect((error as TramaError).message.split("\n")).toHaveLength(1);
    expect((error as TramaError).message).not.toBe("");
  }, GIT_TEST_MS);
});

describe("merging", () => {
  test("up to date: the branch is an ancestor of HEAD", async () => {
    const { root } = repo();
    git(root, "branch", "old");
    commit(root, "more", { "b.txt": "b\n" });
    expect(await isUpToDate(root, "old")).toBe(true);
    expect(await isUpToDate(root, "main")).toBe(true);
    branchWith(root, "ahead", { "c.txt": "c\n" });
    expect(await isUpToDate(root, "ahead")).toBe(false);
    await expect(isUpToDate(root, "nowhere")).rejects.toThrow(TramaError);
  }, GIT_TEST_MS);

  test("a branch name that starts with a dash is refused, and nothing runs", async () => {
    const { root, p } = repo();
    await expect(startMerge(p, "--abort")).rejects.toThrow(TramaError);
    await expect(isUpToDate(root, "-x")).rejects.toThrow(TramaError);
    expect(existsSync(mergeFile(p))).toBe(false);
  }, GIT_TEST_MS);

  test("a merge without conflicts makes the merge commit and remembers nothing", async () => {
    const { root, p } = repo();
    const incoming = branchWith(root, "feature", { "b.txt": "b\n" });
    commit(root, "main moves", { "c.txt": "c\n" });
    const base0 = git(root, "rev-parse", "HEAD");
    const outcome = await startMerge(p, "feature");
    expect(outcome).toEqual({ kind: "merged", base: base0, incoming });
    expect(git(root, "rev-list", "--parents", "-n", "1", "HEAD").split(" ")).toHaveLength(3);
    expect(existsSync(mergeFile(p))).toBe(false);
    expect(await settleMerge(p)).toEqual({ kind: "none" });
  }, GIT_TEST_MS);

  test("a fast-forward counts as a merge without conflicts", async () => {
    const { root, p } = repo();
    const base0 = git(root, "rev-parse", "HEAD");
    const incoming = branchWith(root, "feature", { "b.txt": "b\n" });
    expect(await startMerge(p, "feature")).toEqual({ kind: "merged", base: base0, incoming });
    expect(git(root, "rev-parse", "HEAD")).toBe(incoming);
    expect(existsSync(mergeFile(p))).toBe(false);
  }, GIT_TEST_MS);

  test("a merge with conflicts stays remembered with base, incoming and start, and lists the files with conflicts", async () => {
    const { root, p } = repo();
    conflicting(root);
    const base0 = git(root, "rev-parse", "HEAD");
    const incoming = git(root, "rev-parse", "other");
    const before = Date.now();
    const outcome = await startMerge(p, "other");
    // The files are under the folder git names: on Windows it has the long names a temporary folder's 8.3 path may lack.
    const top = git(root, "rev-parse", "--show-toplevel");
    expect(outcome).toEqual({ kind: "conflicts", base: base0, incoming, files: [join(top, "a.txt"), join(top, "b.txt")] });
    const remembered = readOpenMerge(p);
    expect(remembered).toMatchObject({ branch: "other", base: base0, incoming });
    expect(Date.parse(remembered?.started ?? "")).toBeGreaterThanOrEqual(before - 1000);
    expect(JSON.parse(readFileSync(mergeFile(p), "utf8"))).toEqual(remembered);
    expect(await conflictedFiles(root)).toEqual([join(top, "a.txt"), join(top, "b.txt")]);
    expect(git(root, "rev-parse", "MERGE_HEAD")).toBe(incoming);
    // Trama never commits the merge: HEAD did not move.
    expect(git(root, "rev-parse", "HEAD")).toBe(base0);
  }, GIT_TEST_MS);

  test("git refusing the merge for another reason gives its first line of error and remembers nothing", async () => {
    const { root, p } = repo();
    branchWith(root, "feature", { "b.txt": "from the branch\n" });
    write(join(root, "b.txt"), "untracked, would be overwritten\n");
    const head = git(root, "rev-parse", "HEAD");
    const outcome = await startMerge(p, "feature");
    expect(outcome.kind).toBe("failed");
    const reason = outcome.kind === "failed" ? outcome.reason : "";
    expect(reason).not.toBe("");
    expect(reason).not.toContain("\n");
    expect(existsSync(mergeFile(p))).toBe(false);
    expect(git(root, "rev-parse", "HEAD")).toBe(head);
    expect(readFileSync(join(root, "b.txt"), "utf8")).toBe("untracked, would be overwritten\n");
  }, GIT_TEST_MS);

  test("a branch that names no commit fails without remembering anything", async () => {
    const { p } = repo();
    expect(await startMerge(p, "nowhere")).toEqual({ kind: "failed", reason: '"nowhere" is not a branch.' });
    expect(existsSync(mergeFile(p))).toBe(false);
  }, GIT_TEST_MS);

  test("aborting brings the working copy back and forgets the merge; a failed abort says why and keeps it", async () => {
    const { root, p } = repo();
    conflicting(root);
    const head = git(root, "rev-parse", "HEAD");
    await startMerge(p, "other");
    await abortMerge(p);
    expect(existsSync(mergeFile(p))).toBe(false);
    expect(git(root, "rev-parse", "HEAD")).toBe(head);
    expect(git(root, "status", "--porcelain")).toBe("");
    expect(await operationInProgress(root)).toBe(false);
    // Nothing to abort now: git says so, and the file Trama wrote for the next merge stays.
    mkdirSync(soloDir(p), { recursive: true });
    writeFileSync(mergeFile(p), JSON.stringify({ branch: "other", base: head, incoming: head, started: new Date().toISOString() }));
    await expect(abortMerge(p)).rejects.toThrow(TramaError);
    expect(existsSync(mergeFile(p))).toBe(true);
  }, GIT_TEST_MS);
});

describe("the end of a remembered merge", () => {
  test("none remembered", async () => {
    const { p } = repo();
    expect(await settleMerge(p)).toEqual({ kind: "none" });
  }, GIT_TEST_MS);

  test("open while MERGE_HEAD points at the incoming commit", async () => {
    const { root, p } = repo();
    conflicting(root);
    await startMerge(p, "other");
    const merge = readOpenMerge(p);
    expect(await settleMerge(p)).toEqual({ kind: "open", merge: merge as NonNullable<typeof merge> });
    expect(existsSync(mergeFile(p))).toBe(true);
  }, GIT_TEST_MS);

  test("committed once the merge commit has arrived, and then forgotten", async () => {
    const { root, p } = repo();
    conflicting(root);
    await startMerge(p, "other");
    const merge = readOpenMerge(p);
    write(join(root, "a.txt"), "resolved\n");
    write(join(root, "b.txt"), "resolved b\n");
    git(root, "add", "a.txt", "b.txt");
    git(root, "commit", "-q", "--no-edit");
    expect(await settleMerge(p)).toEqual({ kind: "committed", merge: merge as NonNullable<typeof merge> });
    expect(existsSync(mergeFile(p))).toBe(false);
    expect(await settleMerge(p)).toEqual({ kind: "none" });
  }, GIT_TEST_MS);

  test("abandoned when the merge is aborted outside Trama", async () => {
    const { root, p } = repo();
    conflicting(root);
    await startMerge(p, "other");
    git(root, "merge", "--abort");
    expect(await settleMerge(p)).toEqual({ kind: "abandoned" });
    expect(existsSync(mergeFile(p))).toBe(false);
  }, GIT_TEST_MS);

  test("abandoned when MERGE_HEAD points at another commit, and the file is deleted", async () => {
    const { root, p } = repo();
    conflicting(root);
    await startMerge(p, "other");
    const merge = readOpenMerge(p) as OpenMerge;
    writeFileSync(mergeFile(p), JSON.stringify({ ...merge, incoming: merge.base }));
    expect(await settleMerge(p)).toEqual({ kind: "abandoned" });
    expect(existsSync(mergeFile(p))).toBe(false);
  }, GIT_TEST_MS);

  test("abandoned when the merge ended and HEAD does not contain the incoming commit (for example a reset)", async () => {
    const { root, p } = repo();
    conflicting(root);
    await startMerge(p, "other");
    git(root, "reset", "-q", "--hard", "HEAD");
    expect(await settleMerge(p)).toEqual({ kind: "abandoned" });
  }, GIT_TEST_MS);

  test("a file that is not valid JSON or misses a field counts as abandoned and is deleted", async () => {
    const { p } = repo();
    mkdirSync(soloDir(p), { recursive: true });
    for (const text of ["not json", "{}", JSON.stringify({ branch: "x", base: "a", incoming: "b" }), "null", JSON.stringify({ branch: "", base: "a", incoming: "b", started: "c" })]) {
      writeFileSync(mergeFile(p), text);
      expect(readOpenMerge(p)).toBeNull();
      expect(await settleMerge(p)).toEqual({ kind: "abandoned" });
      expect(existsSync(mergeFile(p))).toBe(false);
    }
  }, GIT_TEST_MS);
});
