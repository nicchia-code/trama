import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PullRequest } from "../src/core/github";
import { type PreparedCheck, prCheckFolder, prepareCheck, readReport, readReports, writeReport } from "../src/core/pr-check";
import { approveProposal, editInProposal, newProposal } from "../src/core/proposals";
import { type Project, projectAt } from "../src/core/store";
import { recordTiming } from "../src/core/timings";
import { newDrift, newTask } from "../src/core/work";
import { PrChecks, type PrCheckPorts } from "../extension/src/host/team/pr-check";
import { coverWithTask } from "./cover";
import { FIX_OPTIONS } from "./fix-options";
import { handOver } from "./handover";

const GIT_TEST_MS = 60_000;

let base: string;
let upstream: string;
let fork: string;
let open: string;
let storage: string;

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), "trama-host-pr-"));
  upstream = join(base, "upstream.git");
  fork = join(base, "fork");
  open = join(base, "open");
  storage = join(base, "storage");
});
afterEach(() => rmSync(base, { recursive: true, force: true }));

function git(cwd: string, ...args: string[]): string {
  const r = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
    killSignal: "SIGKILL",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_CONFIG_COUNT: "3", GIT_CONFIG_KEY_0: "gc.auto", GIT_CONFIG_VALUE_0: "0", GIT_CONFIG_KEY_1: "maintenance.auto", GIT_CONFIG_VALUE_1: "false", GIT_CONFIG_KEY_2: "receive.autogc", GIT_CONFIG_VALUE_2: "false", GIT_AUTHOR_NAME: "Ada", GIT_AUTHOR_EMAIL: "ada@example.com", GIT_COMMITTER_NAME: "Ada", GIT_COMMITTER_EMAIL: "ada@example.com" },
  });
  if (r.error !== undefined || r.status !== 0) throw new Error(r.error?.message ?? `git ${args.join(" ")}: ${r.stderr}`);
  return r.stdout;
}

const commit = (cwd: string, message: string): string => {
  git(cwd, "add", "-A");
  git(cwd, "commit", "-q", "-m", message);
  return git(cwd, "rev-parse", "HEAD").trim();
};

/** The shop in a fork of `upstream`; its pull request #7 changes the Model with an approved and an open Proposal. `open` is the developer's clone of main. */
function repositories(): PullRequest {
  git(base, "init", "-q", "--bare", "-b", "main", upstream);
  git(base, "clone", "-q", "--no-local", upstream, fork);
  cpSync(join(import.meta.dir, "../examples/shop"), fork, { recursive: true });
  commit(fork, "The shop");
  git(fork, "push", "-q", "origin", "HEAD:main");
  git(base, "clone", "-q", "--no-local", upstream, open);

  git(fork, "checkout", "-q", "-b", "feature");
  const p = projectAt(fork);
  const approved = newProposal(p, "Refund on cancel", "", { label: "Refund on cancel" });
  const order = editInProposal(p, approved.id, "checkout/order.md");
  writeFileSync(order, readFileSync(order, "utf8").replace("refunds the customer.", "refunds the customer in full."));
  coverWithTask(p, approved.id, "order/Paid");
  handOver(p, approved.id);
  approveProposal(p, approved.id);
  const head = commit(fork, "The pull request");
  git(fork, "push", "-q", "origin", "feature:refs/pull/7/head");
  return { number: 7, title: "Refund on cancel", author: "ada", baseRefName: "main", headRefName: "feature", headRefOid: head, url: "https://github.com/acme/web/pull/7" };
}

const snapshotOf = (cwd: string): string => [["for-each-ref"], ["status", "--porcelain"], ["worktree", "list", "--porcelain"], ["rev-parse", "HEAD"]].map((args) => git(cwd, ...args)).join("\n--\n");

interface Harness {
  checks: PrChecks;
  project: Project;
  errors: string[];
  warnings: string[];
  changes: number;
  idleWaiters: (() => void)[];
  launched: { prepared: PreparedCheck; job: { onStarted(terminal: string): void; onEnd(abnormal?: string): void } }[];
  stopped: string[];
  skills: string[];
  runInProgress: boolean;
  failLaunch: string | null;
  /** What the agent does in the worktree, before its job ends. */
  agent: (worktree: Project) => void;
}

function harness(): Harness {
  const project = projectAt(open);
  const h: Harness = {
    checks: undefined as unknown as PrChecks,
    project,
    errors: [],
    warnings: [],
    changes: 0,
    idleWaiters: [],
    launched: [],
    stopped: [],
    skills: [],
    runInProgress: false,
    failLaunch: null,
    agent: () => {},
  };
  const ports: PrCheckPorts = {
    project: () => project,
    storage: () => storage,
    skillsDir: () => ".agents/skills",
    runInProgress: () => h.runInProgress,
    writeSkills: (worktree) => void h.skills.push(worktree.root),
    launch: async (prepared, job) => {
      if (h.failLaunch !== null) throw new Error(h.failLaunch);
      h.launched.push({ prepared, job });
      job.onStarted("term1");
    },
    stop: (terminal) => {
      h.stopped.push(terminal);
      queueMicrotask(() => h.launched.at(-1)?.job.onEnd("its terminal was closed"));
      return true;
    },
    error: (text) => void h.errors.push(text),
    warning: (text) => void h.warnings.push(text),
    changed: () => {
      h.changes++;
      if (h.checks.running === null) for (const resolve of h.idleWaiters.splice(0)) resolve();
    },
  };
  h.checks = new PrChecks(ports);
  return h;
}

/** Resolves when the PR Check is Idle again: at once when it is, otherwise at the change that says so. */
function idle(h: Harness): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  if (h.checks.running === null) resolve();
  else h.idleWaiters.push(resolve);
  return promise;
}

/** The agent files a Task and a Drift in the worktree and delivers its scan. */
const deliveringAgent = (worktree: Project): void => {
  newTask(worktree, { title: "Refund in full", refs: ["order/Paid"], technical: false });
  newDrift(worktree, { where: "src/refund.ts:3", options: FIX_OPTIONS, title: "Refund is partial", refs: ["order/Paid"], happens: "A.", should: "B." });
  recordTiming(worktree, { terminal: "term1" }, { event: "phase-start", check: "c1", phase: "scanning", title: "Scan" });
  recordTiming(worktree, { terminal: "term1" }, { event: "phase-end", check: "c1", phase: "scanning", outcome: "done" });
};

const REPORT_OF = (pr: PullRequest, head: string) => ({
  number: pr.number,
  title: pr.title,
  url: pr.url,
  variant: "collaborative" as const,
  base: { branch: "main", commit: "b".repeat(40) },
  head: { branch: "feature", commit: head },
  mergeBase: "c".repeat(40),
  checkedAt: "2026-10-01T10:00:00.000Z",
  rows: [],
});

describe("Check", () => {
  test("is refused, with the reason, off the list, during another PR Check, during a Run and after a failed read", async () => {
    const pr = repositories();
    const h = harness();
    await h.checks.start(9, [pr], true);
    h.runInProgress = true;
    await h.checks.start(7, [pr], true);
    h.runInProgress = false;
    await h.checks.start(7, [pr], false);
    expect(h.errors).toEqual([
      "Trama: could not check #9: the pull request is not on the list.",
      "Trama: could not check #7: a run is in progress.",
      "Trama: could not check #7: the last read of the pull requests failed.",
    ]);
    expect(h.launched).toEqual([]);
    expect(existsSync(storage)).toBe(false);
  });

  test("a second PR Check is refused while one runs, and Check is blocked for every pull request", async () => {
    const pr = repositories();
    const h = harness();
    await h.checks.start(7, [pr], true);
    expect(h.checks.running).toBe(7);
    expect(h.checks.blocked()).toBe("running");
    await h.checks.start(7, [pr], true);
    expect(h.errors).toEqual(["Trama: could not check #7: a PR Check is running."]);
    expect(h.launched).toHaveLength(1);
    h.runInProgress = true;
    expect(h.checks.blocked()).toBe("running");
    await h.checks.stop(7);
    await idle(h);
    expect(h.checks.blocked()).toBe("run");
  }, GIT_TEST_MS);
});

describe("a PR Check that delivers its scan", () => {
  test(
    "launches the agent in the worktree, writes the report when the job ends and removes the worktree, leaving the open folder as it was",
    async () => {
      const pr = repositories();
      const h = harness();
      const before = snapshotOf(open);

      const started = Date.now();
      await h.checks.start(7, [pr], true);
      expect(h.checks.running).toBe(7);
      const { prepared, job } = h.launched[0] as Harness["launched"][number];
      expect(prepared.folder).toBe(prCheckFolder(storage, 7));
      expect(existsSync(join(prepared.root, ".trama/model/system.md"))).toBe(true);
      expect(h.skills).toEqual([prepared.root]);
      // While it runs the open folder is untouched (the worktree is the only trace in the repository).
      expect(git(open, "status", "--porcelain")).toBe("");
      expect(readReport(h.project, 7)).toBeNull();

      h.agent = deliveringAgent;
      h.agent(projectAt(prepared.root));
      job.onEnd();
      await idle(h);

      expect(h.errors).toEqual([]);
      expect(h.warnings).toEqual([]);
      const report = readReport(h.project, 7);
      expect(report).toMatchObject({ number: 7, title: "Refund on cancel", variant: "collaborative", head: { branch: "feature", commit: pr.headRefOid }, base: { branch: "main" } });
      expect(Date.parse(report?.checkedAt ?? "")).toBeGreaterThanOrEqual(started);
      const lines = (report?.rows ?? []).map((row) => `${row.section} | ${row.ref ?? "-"} | ${row.finding} | ${row.source} | ${row.where ?? "-"}`);
      expect(lines).toContain("model | order/Paid/user.CANCEL | ~ Transition Paid | user.CANCEL → Cancelled: prose changed | Trama | -");
      expect(lines).toContain("code | order/Paid | Missing in the code: Refund in full | Scan | -");
      expect(lines).toContain("code | order/Paid | Refund is partial | Scan | src/refund.ts:3");
      expect(lines.findIndex((line) => line.startsWith("model |"))).toBeLessThan(lines.findIndex((line) => line.startsWith("code |")));
      expect(existsSync(prepared.folder)).toBe(false);
      expect(snapshotOf(open)).toBe(before);
      expect(h.changes).toBeGreaterThanOrEqual(2);
    },
    GIT_TEST_MS,
  );

  test(
    "a new report replaces the previous one of the same pull request",
    async () => {
      const pr = repositories();
      const h = harness();
      writeReport(h.project, REPORT_OF(pr, "d".repeat(40)));
      await h.checks.start(7, [pr], true);
      const { prepared, job } = h.launched[0] as Harness["launched"][number];
      deliveringAgent(projectAt(prepared.root));
      job.onEnd();
      await idle(h);
      expect(readReport(h.project, 7)?.head.commit).toBe(pr.headRefOid);
      expect(readReports(h.project).size).toBe(1);
    },
    GIT_TEST_MS,
  );
});

describe("a PR Check that does not deliver", () => {
  test(
    "writes nothing, keeps the previous report, says so and removes the worktree",
    async () => {
      const pr = repositories();
      const h = harness();
      const previous = REPORT_OF(pr, "d".repeat(40));
      writeReport(h.project, previous);
      await h.checks.start(7, [pr], true);
      const { prepared, job } = h.launched[0] as Harness["launched"][number];
      // A scan check that failed does not count as delivered.
      recordTiming(projectAt(prepared.root), { terminal: "term1" }, { event: "phase-start", check: "c1", phase: "scanning", title: "Scan" });
      recordTiming(projectAt(prepared.root), { terminal: "term1" }, { event: "phase-end", check: "c1", phase: "scanning", outcome: "failed" });
      job.onEnd("its terminal was closed");
      await idle(h);
      expect(h.warnings).toEqual(["Trama: the PR Check of #7 did not finish. The previous report, if any, is kept."]);
      expect(h.errors).toEqual([]);
      expect(readReport(h.project, 7)).toEqual(previous);
      expect(existsSync(prepared.folder)).toBe(false);
    },
    GIT_TEST_MS,
  );
});

describe("Stop", () => {
  test(
    "stops the agent, removes the worktree and writes nothing, with no message, also when the scan was already delivered",
    async () => {
      const pr = repositories();
      const h = harness();
      const before = snapshotOf(open);
      const previous = REPORT_OF(pr, "d".repeat(40));
      writeReport(h.project, previous);
      await h.checks.start(7, [pr], true);
      const { prepared } = h.launched[0] as Harness["launched"][number];
      deliveringAgent(projectAt(prepared.root));
      await h.checks.stop(8);
      expect(h.stopped).toEqual([]);
      await h.checks.stop(7);
      await idle(h);
      expect(h.stopped).toEqual(["term1"]);
      expect(h.warnings).toEqual([]);
      expect(h.errors).toEqual([]);
      expect(readReport(h.project, 7)).toEqual(previous);
      expect(existsSync(prepared.folder)).toBe(false);
      expect(snapshotOf(open)).toBe(before);
    },
    GIT_TEST_MS,
  );
});

describe("a preparation that fails", () => {
  test(
    "shows git's first line, leaves no worktree and keeps the report",
    async () => {
      const pr = repositories();
      const h = harness();
      const previous = REPORT_OF(pr, "d".repeat(40));
      writeReport(h.project, previous);
      const before = snapshotOf(open);
      await h.checks.start(7, [{ ...pr, baseRefName: "nonexistent" }], true);
      expect(h.errors).toHaveLength(1);
      expect(h.errors[0]).toMatch(/^Trama: could not check #7: .*nonexistent.*\.$/);
      expect(h.errors[0]?.includes("\n")).toBe(false);
      expect(h.checks.running).toBeNull();
      expect(h.launched).toEqual([]);
      expect(existsSync(prCheckFolder(storage, 7))).toBe(false);
      expect(readReport(h.project, 7)).toEqual(previous);
      expect(snapshotOf(open)).toBe(before);
    },
    GIT_TEST_MS,
  );

  test(
    "a launch that fails, for example without omp, removes the worktree and says why",
    async () => {
      const pr = repositories();
      const h = harness();
      h.failLaunch = "omp is not installed";
      const before = snapshotOf(open);
      await h.checks.start(7, [pr], true);
      expect(h.errors).toEqual(["Trama: could not check #7: omp is not installed."]);
      expect(h.checks.running).toBeNull();
      expect(existsSync(prCheckFolder(storage, 7))).toBe(false);
      expect(snapshotOf(open)).toBe(before);
    },
    GIT_TEST_MS,
  );

  test("the editor with no storage for the workspace cannot check", async () => {
    const pr = repositories();
    const h = harness();
    const ports: PrCheckPorts = { project: () => h.project, storage: () => undefined, skillsDir: () => ".agents/skills", runInProgress: () => false, writeSkills: () => {}, launch: async () => {}, stop: () => false, error: (text) => void h.errors.push(text), warning: () => {}, changed: () => {} };
    await new PrChecks(ports).start(7, [pr], true);
    expect(h.errors).toEqual(["Trama: could not check #7: the editor has no storage for this workspace."]);
  });
});

describe("the worktrees left behind", () => {
  test(
    "are removed when the window opens, with no report and no message",
    async () => {
      const pr = repositories();
      const h = harness();
      const before = snapshotOf(open);
      // A previous window prepared #7 and closed before the end.
      const left = await prepareCheck(h.project, pr, { storage, skillsDir: ".agents/skills", writeSkills: () => {} });
      expect(existsSync(left.folder)).toBe(true);
      mkdirSync(join(storage, "pr-check", "12"), { recursive: true });

      await h.checks.removeLeftovers();

      expect(existsSync(left.folder)).toBe(false);
      expect(existsSync(join(storage, "pr-check", "12"))).toBe(false);
      expect(h.errors).toEqual([]);
      expect(h.warnings).toEqual([]);
      expect(readReports(h.project).size).toBe(0);
      expect(snapshotOf(open)).toBe(before);
    },
    GIT_TEST_MS,
  );
});

describe("the pull requests as the tab gets them", () => {
  test("each one with its report, outdated when GitHub's head is another commit; the running PR Check and why Check is blocked", () => {
    const h = harness();
    const items: PullRequest[] = [
      { number: 7, title: "Seven", author: "ada", baseRefName: "main", headRefName: "f7", headRefOid: "a".repeat(40), url: "u7" },
      { number: 5, title: "Five", author: "bob", baseRefName: "main", headRefName: "f5", headRefOid: "e".repeat(40), url: "u5" },
      { number: 3, title: "Three", author: "cy", baseRefName: "main", headRefName: "f3", headRefOid: "f".repeat(40), url: "u3" },
    ];
    writeReport(h.project, { ...REPORT_OF(items[0] as PullRequest, "a".repeat(40)), number: 7 });
    writeReport(h.project, { ...REPORT_OF(items[1] as PullRequest, "d".repeat(40)), number: 5 });
    const message = h.checks.message(h.project, { readAt: "2026-10-28T10:00:00.000Z", error: null, items });
    expect(message).toMatchObject({ type: "pullRequests", readAt: "2026-10-28T10:00:00.000Z", error: null, running: null, blocked: null });
    expect(message.items.map((item) => [item.number, item.report?.outdated ?? null])).toEqual([
      [7, false],
      [5, true],
      [3, null],
    ]);
    expect(message.items[0]?.report).toEqual({ checkedAt: "2026-10-01T10:00:00.000Z", variant: "collaborative", head: "a".repeat(40), mergeBase: "c".repeat(40), outdated: false, rows: [] });
    h.runInProgress = true;
    expect(h.checks.message(h.project, { readAt: null, error: "gh exited with code 1: boom", items }).blocked).toBe("run");
  });
});
