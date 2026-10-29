import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { approveProposal, editInProposal, newProposal } from "../src/core/proposals";
import {
  buildReport,
  checkedBranch,
  checkedNumber,
  chooseVariant,
  collaborativeRows,
  copyOwnFiles,
  createWorktree,
  deleteReportsExcept,
  fetchPullRequest,
  fileRef,
  isLocalFolder,
  isOutdated,
  leftoverFolders,
  mergeBaseOf,
  placeOf,
  prCheckFolder,
  prCheckInstruction,
  prChecksDir,
  type PullRequestReport,
  prepareCheck,
  readReport,
  readReports,
  removeWorktree,
  type ReportRow,
  scanDelivered,
  scanRows,
  sortRows,
  trackedFilesAtCommit,
  writeReport,
} from "../src/core/pr-check";
import { normalizeLf } from "../src/core/line-endings";
import { setSoloMode } from "../src/core/solo-mode";
import { projectAt } from "../src/core/store";
import { recordTiming } from "../src/core/timings";
import { newDrift, newTask } from "../src/core/work";
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
  base = mkdtempSync(join(tmpdir(), "trama-pr-check-"));
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

/** The shop sample in a fork of `upstream`, committed on main and pushed; `open` is a second clone, where the developer works. */
function repositories(): void {
  git(base, "init", "-q", "--bare", "-b", "main", upstream);
  git(base, "clone", "-q", "--no-local", upstream, fork);
  cpSync(join(import.meta.dir, "../examples/shop"), fork, { recursive: true });
  commit(fork, "The shop");
  git(fork, "push", "-q", "origin", "HEAD:main");
  git(base, "clone", "-q", "--no-local", upstream, open);
}

/** What the open folder's repository looks like from outside: every ref, the status, the worktrees and HEAD. */
function snapshotOf(cwd: string): string {
  return [["for-each-ref"], ["status", "--porcelain"], ["worktree", "list", "--porcelain"], ["rev-parse", "HEAD"]].map((args) => git(cwd, ...args)).join("\n--\n");
}

const worktrees = (cwd: string): number => git(cwd, "worktree", "list", "--porcelain").match(/^worktree /gm)?.length ?? 0;

const ORDER = "checkout/order.md";

describe("the numbers and branches that reach git", () => {
  test("a pull request number is a positive integer", () => {
    expect(checkedNumber(7)).toBe(7);
    for (const bad of [0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1]) expect(() => checkedNumber(bad)).toThrow();
  });

  test("a branch name that starts with - is refused, and so are the characters a refspec would read", () => {
    expect(checkedBranch("release/1.0")).toBe("release/1.0");
    for (const bad of ["", "-x", "--upload-pack=evil", "a b", "a:b", "a*", "a\nb"]) expect(() => checkedBranch(bad)).toThrow();
  });

  test("the worktree of a pull request is pr-check/<number>/ in the storage", () => {
    expect(prCheckFolder(storage, 12)).toBe(join(storage, "pr-check", "12"));
  });
});

describe("fetching a pull request", () => {
  test(
    "brings the head of the pull request and the tip of its branch from FETCH_HEAD without creating or moving any ref",
    async () => {
      repositories();
      git(fork, "checkout", "-q", "-b", "feature");
      writeFileSync(join(fork, "feature.txt"), "x\n");
      const head = commit(fork, "Feature");
      git(fork, "push", "-q", "origin", "feature:refs/pull/7/head");
      const tip = git(fork, "rev-parse", "main").trim();
      const before = snapshotOf(open);

      const fetched = await fetchPullRequest(open, 7, "main");

      expect(fetched).toEqual({ head, base: tip });
      expect(snapshotOf(open)).toBe(before);
      expect(git(open, "tag")).toBe("");
    },
    GIT_TEST_MS,
  );

  test(
    "the first line of git's error says why a missing pull request cannot be fetched",
    async () => {
      repositories();
      const error = await fetchPullRequest(open, 99, "main").catch((e: Error) => e);
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(/refs\/pull\/99\/head/);
      expect((error as Error).message.includes("\n")).toBe(false);
    },
    GIT_TEST_MS,
  );

  test(
    "the merge-base is where the pull request left the branch it goes into",
    async () => {
      repositories();
      const root = git(fork, "rev-parse", "HEAD").trim();
      git(fork, "checkout", "-q", "-b", "feature");
      writeFileSync(join(fork, "feature.txt"), "x\n");
      const head = commit(fork, "Feature");
      git(fork, "push", "-q", "origin", "feature:refs/pull/7/head");
      git(fork, "checkout", "-q", "main");
      writeFileSync(join(fork, "main.txt"), "y\n");
      commit(fork, "Main moves");
      git(fork, "push", "-q", "origin", "main");
      const { head: fetchedHead, base: tip } = await fetchPullRequest(open, 7, "main");
      expect(fetchedHead).toBe(head);
      expect(await mergeBaseOf(open, tip, head)).toBe(root);
    },
    GIT_TEST_MS,
  );
});

describe("the way the PR Check works", () => {
  test(
    "Solo with Solo mode on, and when the head has no .trama/ at the project's prefix; Collaborative otherwise",
    async () => {
      repositories();
      const withTrama = git(open, "rev-parse", "HEAD").trim();
      const p = projectAt(open);
      const place = await placeOf(open);
      expect(await chooseVariant(p, place, withTrama)).toBe("collaborative");

      setSoloMode(p, "folders");
      expect(await chooseVariant(p, place, withTrama)).toBe("solo");
      setSoloMode(p, "off");
      expect(await chooseVariant(p, place, withTrama)).toBe("collaborative");

      git(fork, "rm", "-r", "-q", ".trama");
      const without = commit(fork, "No Trama here");
      git(fork, "push", "-q", "origin", "HEAD:refs/pull/8/head");
      await fetchPullRequest(open, 8, "main");
      expect(await chooseVariant(p, place, without)).toBe("solo");
    },
    GIT_TEST_MS,
  );

  test(
    "a project in a subfolder asks about .trama/ at its prefix",
    async () => {
      git(base, "init", "-q", "--bare", "-b", "main", upstream);
      git(base, "clone", "-q", "--no-local", upstream, fork);
      mkdirSync(join(fork, "app"));
      cpSync(join(import.meta.dir, "../examples/shop"), join(fork, "app"), { recursive: true });
      writeFileSync(join(fork, "README.md"), "x\n");
      const withTrama = commit(fork, "App");
      git(fork, "push", "-q", "origin", "HEAD:main");
      git(base, "clone", "-q", "--no-local", upstream, open);
      const place = await placeOf(join(open, "app"));
      expect(place.prefix).toBe("app/");
      expect(await chooseVariant(projectAt(join(open, "app")), place, withTrama)).toBe("collaborative");
      git(fork, "mv", "app", "web");
      const moved = commit(fork, "Moved");
      git(fork, "push", "-q", "origin", "HEAD:main");
      git(open, "fetch", "-q", "origin", "main");
      expect(await chooseVariant(projectAt(join(open, "app")), place, moved)).toBe("solo");
    },
    GIT_TEST_MS,
  );
});

describe("the worktree", () => {
  test(
    "is created detached on the head in the storage and removed with git, leaving git status, branch and worktree list as they were",
    async () => {
      repositories();
      const head = git(open, "rev-parse", "HEAD").trim();
      const before = snapshotOf(open);
      const folder = prCheckFolder(storage, 7);

      await createWorktree(open, folder, head);
      expect(existsSync(join(folder, ".trama", "model", "system.md"))).toBe(true);
      expect(git(folder, "rev-parse", "--abbrev-ref", "HEAD").trim()).toBe("HEAD");
      expect(worktrees(open)).toBe(2);

      expect(await removeWorktree(open, folder)).toBeNull();
      expect(existsSync(folder)).toBe(false);
      expect(snapshotOf(open)).toBe(before);
    },
    GIT_TEST_MS,
  );

  test(
    "a folder already there is removed first",
    async () => {
      repositories();
      const head = git(open, "rev-parse", "HEAD").trim();
      const folder = prCheckFolder(storage, 7);
      await createWorktree(open, folder, head);
      writeFileSync(join(folder, "leftover.txt"), "x\n");
      await createWorktree(open, folder, head);
      expect(existsSync(join(folder, "leftover.txt"))).toBe(false);
      expect(worktrees(open)).toBe(2);
      expect(await removeWorktree(open, folder)).toBeNull();
    },
    GIT_TEST_MS,
  );

  test(
    "when git cannot remove a folder it is deleted and the registration pruned",
    async () => {
      repositories();
      const head = git(open, "rev-parse", "HEAD").trim();
      const folder = prCheckFolder(storage, 7);
      await createWorktree(open, folder, head);
      // Git refuses to remove a worktree whose link file is gone: the folder is deleted instead.
      rmSync(join(folder, ".git"));
      expect(await removeWorktree(open, folder)).toBeNull();
      expect(existsSync(folder)).toBe(false);
      expect(worktrees(open)).toBe(1);
    },
    GIT_TEST_MS,
  );

  test("the folders of pr-check/ that no running PR Check uses are the leftovers", () => {
    mkdirSync(join(storage, "pr-check", "3"), { recursive: true });
    mkdirSync(join(storage, "pr-check", "9"), { recursive: true });
    expect(leftoverFolders(storage, [9])).toEqual([join(storage, "pr-check", "3")]);
    expect(leftoverFolders(storage, [])).toHaveLength(2);
    expect(leftoverFolders(join(base, "none"), [])).toEqual([]);
  });
});

describe("Trama's own files in Solo", () => {
  test("replace what the head has, leave the local folders of .trama/ behind and copy the skills and the files of omp", () => {
    const root = join(base, "open-solo");
    const worktree = join(base, "worktree");
    mkdirSync(join(root, ".trama", "model"), { recursive: true });
    writeFileSync(join(root, ".trama", "model", "system.md"), "# Mine\n");
    for (const local of ["solo", "announcements"]) {
      mkdirSync(join(root, ".trama", local), { recursive: true });
      writeFileSync(join(root, ".trama", local, ".gitignore"), "*\n");
      writeFileSync(join(root, ".trama", local, "a.json"), "{}\n");
    }
    mkdirSync(join(root, ".trama", "tasks"), { recursive: true });
    writeFileSync(join(root, ".trama", "tasks", "t.md"), "task\n");
    mkdirSync(join(root, ".agents", "skills", "trama-scan"), { recursive: true });
    writeFileSync(join(root, ".agents", "skills", "trama-scan", "SKILL.md"), "mine\n");
    mkdirSync(join(root, ".omp", "agents"), { recursive: true });
    writeFileSync(join(root, ".omp", "agents", "trama-analysis.md"), "analysis\n");
    writeFileSync(join(root, ".omp", "agents", "other.md"), "not Trama's\n");
    writeFileSync(join(root, ".omp", "WATCHDOG.yml"), "watch\n");
    writeFileSync(join(root, "code.ts"), "code\n");

    mkdirSync(join(worktree, ".trama", "model"), { recursive: true });
    writeFileSync(join(worktree, ".trama", "model", "stale.md"), "# Stale\n");
    writeFileSync(join(worktree, "code.ts"), "the pull request's code\n");

    copyOwnFiles(projectAt(root), worktree, ".agents/skills");

    expect(readFileSync(join(worktree, ".trama", "model", "system.md"), "utf8")).toBe("# Mine\n");
    expect(existsSync(join(worktree, ".trama", "model", "stale.md"))).toBe(false);
    expect(readFileSync(join(worktree, ".trama", "tasks", "t.md"), "utf8")).toBe("task\n");
    expect(existsSync(join(worktree, ".trama", "solo"))).toBe(false);
    expect(existsSync(join(worktree, ".trama", "announcements"))).toBe(false);
    expect(readFileSync(join(worktree, ".agents", "skills", "trama-scan", "SKILL.md"), "utf8")).toBe("mine\n");
    expect(readFileSync(join(worktree, ".omp", "agents", "trama-analysis.md"), "utf8")).toBe("analysis\n");
    expect(readFileSync(join(worktree, ".omp", "WATCHDOG.yml"), "utf8")).toBe("watch\n");
    expect(existsSync(join(worktree, ".omp", "agents", "other.md"))).toBe(false);
    // The code of the pull request is not Trama's.
    expect(readFileSync(join(worktree, "code.ts"), "utf8")).toBe("the pull request's code\n");
  });

  test("a local folder is one whose .gitignore contains *", () => {
    mkdirSync(join(base, "a"));
    expect(isLocalFolder(join(base, "a"))).toBe(false);
    writeFileSync(join(base, "a", ".gitignore"), "# local\r\n*\r\n");
    expect(isLocalFolder(join(base, "a"))).toBe(true);
    writeFileSync(join(base, "a", ".gitignore"), "*.log\n");
    expect(isLocalFolder(join(base, "a"))).toBe(false);
  });
});

/** A pull request that approves one Proposal, leaves another open, edits a file with no Proposal and files a Drift. Returns the merge-base and the head. */
function collaborativePullRequest(): { mergeBase: string; head: string } {
  const mergeBase = git(fork, "rev-parse", "HEAD").trim();
  git(fork, "checkout", "-q", "-b", "feature");
  const p = projectAt(fork);
  const approved = newProposal(p, "Refund on cancel", "", { label: "Refund on cancel" });
  const order = editInProposal(p, approved.id, ORDER);
  writeFileSync(order, readFileSync(order, "utf8").replace("refunds the customer.", "refunds the customer in full."));
  const ui = editInProposal(p, approved.id, "requirements/ui/main.md");
  writeFileSync(ui, readFileSync(ui, "utf8").replace('- A green "Paid" badge next to the order number.', '- A green "Paid" badge with a check mark next to the order number.'));
  coverWithTask(p, approved.id, "order/Paid", "requirements/ui");
  handOver(p, approved.id);
  approveProposal(p, approved.id);

  const waiting = newProposal(p, "Cart badge", "", { label: "Cart badge" });
  writeFileSync(editInProposal(p, waiting.id, "requirements/ui/main.md"), readFileSync(join(fork, ".trama/requirements/ui/main.md"), "utf8").replace("- Every checkout screen shows the cart total at the bottom.", "- Every checkout screen shows the cart total at the top."));
  coverWithTask(p, waiting.id, "requirements/ui");
  handOver(p, waiting.id);

  // A file edited by hand, with no Proposal: it gets an Event.
  const payment = join(fork, ".trama/model/checkout/payment.md");
  writeFileSync(payment, `${readFileSync(payment, "utf8").trimEnd()}\n\n### EXPIRED\nThe card expired.\n`);
  newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Refund differs", refs: ["order/Paid"], happens: "The code does one thing.", should: "The Model says another." });
  const head = commit(fork, "The pull request");
  git(fork, "push", "-q", "origin", "feature:refs/pull/7/head");
  git(fork, "checkout", "-q", "main");
  return { mergeBase, head };
}

describe("reading the Model from git objects", () => {
  test(
    "the Model, Requirements and Specs files of a commit are read keyed like readTracked, with no checkout",
    async () => {
      repositories();
      const head = git(open, "rev-parse", "HEAD").trim();
      const before = snapshotOf(open);
      const files = await trackedFilesAtCommit(await placeOf(open), head);
      expect(files.get(ORDER)).toBe(normalizeLf(readFileSync(join(open, ".trama/model", ORDER), "utf8")));
      expect(files.get("requirements/ui/main.md")).toBeDefined();
      expect([...files.keys()].some((path) => path.startsWith("tasks/") || path.startsWith(".trama"))).toBe(false);
      expect(snapshotOf(open)).toBe(before);
    },
    GIT_TEST_MS,
  );

  test(
    "line endings are normalised to LF",
    async () => {
      repositories();
      writeFileSync(join(fork, ".trama/model/system.md"), "# Shop\r\n\r\nSells books.\r\n");
      const head = commit(fork, "CRLF");
      git(fork, "push", "-q", "origin", "HEAD:refs/pull/3/head");
      await fetchPullRequest(open, 3, "main");
      expect((await trackedFilesAtCommit(await placeOf(open), head)).get("system.md")).toBe("# Shop\n\nSells books.\n");
    },
    GIT_TEST_MS,
  );
});

describe("Trama's own checks of a Collaborative PR Check", () => {
  test(
    "give a Model row for every change, the problems of the head, the files with no approved Proposal and the open work",
    async () => {
      repositories();
      const { mergeBase, head } = collaborativePullRequest();
      const { head: fetchedHead, base } = await fetchPullRequest(open, 7, "main");
      expect(fetchedHead).toBe(head);
      expect(await mergeBaseOf(open, base, head)).toBe(mergeBase);
      const before = snapshotOf(open);

      const rows = await collaborativeRows({ place: await placeOf(open), baseBranch: "main", base, head, mergeBase });

      expect(snapshotOf(open)).toBe(before);
      expect(rows.filter((row) => row.section !== "open-work").every((row) => row.source === "Trama" && row.where === null)).toBe(true);
      const of = (section: ReportRow["section"]) => rows.filter((row) => row.section === section).map((row) => `${row.ref ?? "-"} | ${row.finding}`);
      expect(of("model").some((line) => line.startsWith("order/Paid/user.CANCEL | "))).toBe(true);
      expect(of("model").some((line) => line.startsWith("requirements/ui#order/Paid | "))).toBe(true);
      expect(of("model").some((line) => line.startsWith("payment.EXPIRED | "))).toBe(true);
      // The approved Proposal covers order.md; the hand edit of payment.md and the file of the waiting Proposal are not covered.
      expect(of("model-problems")).toEqual(["payment | Changed without an approved Proposal"]);
      // Open work: the open Proposal, the Task the approval brought and the Drift, with its Where.
      expect(of("open-work")).toContain("- | Proposal open: Cart badge");
      expect(of("open-work").some((line) => line.startsWith("order/Paid | Task in To do: "))).toBe(true);
      expect(rows.find((row) => row.section === "open-work" && row.finding === "Open Drift: Refund differs")).toMatchObject({ ref: "order/Paid", where: "src/refund.ts", source: "Trama" });
    },
    GIT_TEST_MS,
  );

  test(
    "an element changed on the branch it goes into as well is a problem",
    async () => {
      repositories();
      const { mergeBase } = collaborativePullRequest();
      git(fork, "checkout", "-q", "main");
      const order = join(fork, ".trama/model", ORDER);
      writeFileSync(order, readFileSync(order, "utf8").replace("refunds the customer.", "refunds the customer, minus fees."));
      const mainTip = commit(fork, "Main changes the same transition");
      git(fork, "push", "-q", "origin", "main");
      const fetched = await fetchPullRequest(open, 7, "main");
      expect(fetched.base).toBe(mainTip);

      const rows = await collaborativeRows({ place: await placeOf(open), baseBranch: "main", base: fetched.base, head: fetched.head, mergeBase });
      expect(rows).toContainEqual({ section: "model-problems", ref: "order/Paid/user.CANCEL", finding: "Also changed on main", source: "Trama", where: null });
      expect(rows.filter((row) => row.finding === "Also changed on main").every((row) => row.ref?.startsWith("order") === true)).toBe(true);
    },
    GIT_TEST_MS,
  );

  test(
    "an error of trama model check on the head is a problem",
    async () => {
      repositories();
      const mergeBase = git(fork, "rev-parse", "HEAD").trim();
      git(fork, "checkout", "-q", "-b", "feature");
      writeFileSync(join(fork, ".trama/model/system.md"), "# Shop\n");
      writeFileSync(join(fork, ".trama/model/checkout/payment.md"), "# Payment\n\n## States\n\n### Open (initial)\n- `nobody.NOTHING` → Nowhere\n");
      commit(fork, "Broken");
      git(fork, "push", "-q", "origin", "feature:refs/pull/7/head");
      const fetched = await fetchPullRequest(open, 7, "main");
      const rows = await collaborativeRows({ place: await placeOf(open), baseBranch: "main", base: fetched.base, head: fetched.head, mergeBase });
      const errors = rows.filter((row) => row.section === "model-problems" && row.finding !== "Changed without an approved Proposal");
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((row) => row.finding.includes("payment.md"))).toBe(true);
      expect(errors.every((row) => row.ref === null && row.source === "Trama")).toBe(true);
    },
    GIT_TEST_MS,
  );

  test(
    "a pull request that changes nothing of Trama gives no row",
    async () => {
      repositories();
      const mergeBase = git(fork, "rev-parse", "HEAD").trim();
      git(fork, "checkout", "-q", "-b", "feature");
      writeFileSync(join(fork, "code.ts"), "x\n");
      commit(fork, "Code only");
      git(fork, "push", "-q", "origin", "feature:refs/pull/7/head");
      const fetched = await fetchPullRequest(open, 7, "main");
      expect(await collaborativeRows({ place: await placeOf(open), baseBranch: "main", base: fetched.base, head: fetched.head, mergeBase })).toEqual([]);
    },
    GIT_TEST_MS,
  );

  test("the reference of a file is the element it is about", () => {
    expect(fileRef("checkout/order.md")).toBe("order");
    expect(fileRef("checkout/feature.md")).toBe("checkout");
    expect(fileRef("actors/user.md")).toBe("user");
    expect(fileRef("system.md")).toBeNull();
    expect(fileRef("requirements/ui/main.md")).toBe("requirements/ui");
    expect(fileRef("specs.yaml")).toBe("specs");
  });
});

describe("the cards of the scan", () => {
  function scanned() {
    const worktree = projectAt(join(base, "wt"));
    cpSync(join(import.meta.dir, "../examples/shop/.trama/model"), join(worktree.dir, "model"), { recursive: true });
    return worktree;
  }

  test("a Task is `Missing in the code`, a Drift its title and its Where; only the cards filed after the launch count", () => {
    const worktree = scanned();
    newTask(worktree, { title: "Refund", refs: ["order/Paid", "order"], technical: false });
    newDrift(worktree, { where: "src/refund.ts:12", options: FIX_OPTIONS, title: "Refund differs", refs: ["order/Paid"], happens: "A.", should: "B." });
    expect(scanRows(worktree, "collaborative", 0)).toEqual([
      { section: "code", ref: "order/Paid", finding: "Missing in the code: Refund", source: "Scan", where: null },
      { section: "code", ref: "order/Paid", finding: "Refund differs", source: "Scan", where: "src/refund.ts:12" },
    ]);
    expect(scanRows(worktree, "collaborative", Date.now() + 60_000)).toEqual([]);
  });

  test("in Solo the source is This pull request for a Drift marked merge and Existing code for every other row", () => {
    const worktree = scanned();
    newTask(worktree, { title: "Refund", refs: [], technical: true });
    newDrift(worktree, { where: "src/a.ts", options: FIX_OPTIONS, title: "From the merge", refs: ["order"], happens: "A.", should: "B.", merge: true });
    newDrift(worktree, { where: "src/b.ts", options: FIX_OPTIONS, title: "Older", refs: ["order"], happens: "A.", should: "B." });
    expect(scanRows(worktree, "solo", 0).map((row) => [row.finding, row.source, row.ref])).toEqual([
      ["Missing in the code: Refund", "Existing code", null],
      ["From the merge", "This pull request", "order"],
      ["Older", "Existing code", "order"],
    ]);
  });

  test("the scan was delivered when the check it announced ended done after the launch; failed or none means it did not finish", () => {
    const worktree = scanned();
    const origin = { terminal: "term1" };
    expect(scanDelivered(worktree, 0)).toBe(false);
    recordTiming(worktree, origin, { event: "phase-start", check: "c1", phase: "scanning", title: "Scan" });
    expect(scanDelivered(worktree, 0)).toBe(false);
    recordTiming(worktree, origin, { event: "phase-end", check: "c1", phase: "scanning", outcome: "failed" });
    expect(scanDelivered(worktree, 0)).toBe(false);
    recordTiming(worktree, origin, { event: "phase-end", check: "c2", phase: "scanning", outcome: "done" });
    expect(scanDelivered(worktree, 0)).toBe(true);
    expect(scanDelivered(worktree, Date.now() + 60_000)).toBe(false);
  });
});

describe("the rows of a report", () => {
  const row = (section: ReportRow["section"], ref: string | null, finding = "f"): ReportRow => ({ section, ref, finding, source: "Trama", where: null });

  test("are ordered by section and, within a section, by reference; a row with no reference comes last", () => {
    const rows = sortRows([row("open-work", "a"), row("code", "b", "1"), row("model", null), row("code", "a"), row("model", "z"), row("model-problems", "m"), row("code", "b", "2"), row("model", "c")]);
    expect(rows.map((r) => `${r.section}:${r.ref ?? "-"}:${r.finding}`)).toEqual(["model:c:f", "model:z:f", "model:-:f", "model-problems:m:f", "code:a:f", "code:b:1", "code:b:2", "open-work:a:f"]);
  });
});

const REPORT: PullRequestReport = {
  number: 7,
  title: "Refund on cancel",
  url: "https://github.com/acme/web/pull/7",
  variant: "collaborative",
  base: { branch: "main", commit: "b".repeat(40) },
  head: { branch: "feature", commit: "a".repeat(40) },
  mergeBase: "c".repeat(40),
  checkedAt: "2026-10-28T10:00:00.000Z",
  rows: [{ section: "code", ref: "order", finding: "Missing in the code: X", source: "Scan", where: null }],
};

describe("the reports", () => {
  test("are written to .trama/pr-checks/<number>.json with LF and a final newline, and the folder ignores everything", () => {
    const p = projectAt(join(base, "open-folder"));
    writeReport(p, REPORT);
    const text = readFileSync(join(prChecksDir(p), "7.json"), "utf8");
    expect(text.endsWith("}\n")).toBe(true);
    expect(text.includes("\r")).toBe(false);
    expect(JSON.parse(text)).toEqual(REPORT);
    expect(readFileSync(join(prChecksDir(p), ".gitignore"), "utf8")).toBe("*\n");
    expect(readdirSync(prChecksDir(p)).sort()).toEqual([".gitignore", "7.json"]);
    expect(readReport(p, 7)).toEqual(REPORT);
  });

  test(
    "never enter a commit, with Solo mode off or on",
    () => {
      repositories();
      const p = projectAt(open);
      writeReport(p, REPORT);
      expect(git(open, "status", "--porcelain")).not.toContain("pr-checks");
      git(open, "add", "-A");
      expect(git(open, "ls-files", ".trama/pr-checks")).toBe("");
      setSoloMode(p, "files");
      git(open, "add", "-A");
      expect(git(open, "ls-files", ".trama/pr-checks")).toBe("");
    },
    GIT_TEST_MS,
  );

  test("the report of the same pull request replaces the previous one", () => {
    const p = projectAt(join(base, "open-folder"));
    writeReport(p, REPORT);
    writeReport(p, { ...REPORT, checkedAt: "2026-10-29T10:00:00.000Z", rows: [] });
    expect(readReport(p, 7)?.rows).toEqual([]);
    expect(readReports(p).size).toBe(1);
  });

  test("a report is read whatever its line endings, and a file that is not valid counts as no report and is deleted at the next write", () => {
    const p = projectAt(join(base, "open-folder"));
    writeReport(p, REPORT);
    writeFileSync(join(prChecksDir(p), "7.json"), JSON.stringify(REPORT, null, 2).replace(/\n/g, "\r\n"));
    expect(readReport(p, 7)).toEqual(REPORT);
    writeFileSync(join(prChecksDir(p), "8.json"), "{ not json");
    writeFileSync(join(prChecksDir(p), "9.json"), JSON.stringify({ ...REPORT, number: 9, variant: "other" }));
    writeFileSync(join(prChecksDir(p), "10.json"), JSON.stringify({ ...REPORT, number: 11 }));
    expect([...readReports(p).keys()]).toEqual([7]);
    expect(readReport(p, 8)).toBeNull();
    writeReport(p, { ...REPORT, number: 12 });
    expect(readdirSync(prChecksDir(p)).sort()).toEqual([".gitignore", "12.json", "7.json"]);
  });

  test("after a read of the pull requests that worked, the report of every pull request not in the list is deleted", () => {
    const p = projectAt(join(base, "open-folder"));
    for (const number of [4, 7, 9]) writeReport(p, { ...REPORT, number });
    expect(deleteReportsExcept(p, [7, 100])).toEqual([4, 9]);
    expect([...readReports(p).keys()]).toEqual([7]);
    expect(deleteReportsExcept(p, [])).toEqual([7]);
    expect(deleteReportsExcept(projectAt(join(base, "nothing")), [1])).toEqual([]);
  });

  test("a report is outdated when the head read from GitHub is another commit", () => {
    expect(isOutdated(REPORT, "a".repeat(40))).toBe(false);
    expect(isOutdated(REPORT, "d".repeat(40))).toBe(true);
  });

  test("a report is built from the checks and the scan, in order, with the commits it was made on", () => {
    const checks: ReportRow = { section: "open-work", ref: null, finding: "Proposal open: X", source: "Trama", where: null };
    const prepared = { number: 7, folder: "f", root: "r", variant: "collaborative" as const, base: REPORT.base, head: REPORT.head, mergeBase: REPORT.mergeBase, place: { top: "t", prefix: "" }, rows: [checks] };
    const report = buildReport(prepared, { title: REPORT.title, url: REPORT.url }, REPORT.rows, new Date("2026-10-28T10:00:00Z"));
    expect(report).toEqual({ ...REPORT, rows: [REPORT.rows[0] as ReportRow, checks] });
  });
});

describe("the instruction", () => {
  const prepared = { number: 7, mergeBase: "m".repeat(40), head: { branch: "feature", commit: "h".repeat(40) } };

  test("Collaborative is the one line", () => {
    expect(prCheckInstruction({ ...prepared, variant: "collaborative" })).toBe(
      "Use the trama-scan skill on the whole System. This is the PR Check of pull request #7, in a worktree of its own: file the cards here, and do not run, build or install anything of the pull request.",
    );
  });

  test("Solo adds the commits the pull request brought, to mark merge on the Drifts in its files", () => {
    const range = `${"m".repeat(40)}...${"h".repeat(40)}`;
    expect(prCheckInstruction({ ...prepared, variant: "solo" })).toEndWith(` A merge brought in \`${range}\`: mark \`merge\` on every Drift whose Where in the code lies in a file \`git diff --name-only ${range}\` lists.`);
  });
});

describe("the preparation", () => {
  const options = (writeSkills: (worktree: { root: string }) => void = () => {}) => ({ storage, skillsDir: ".agents/skills", writeSkills });

  test(
    "Collaborative: fetch, worktree, Trama's checks and the skills; the open folder is left as it was",
    async () => {
      repositories();
      const { mergeBase, head } = collaborativePullRequest();
      const p = projectAt(open);
      const before = snapshotOf(open);
      const skills: string[] = [];
      const prepared = await prepareCheck(p, { number: 7, baseRefName: "main", headRefName: "feature" }, options((worktree) => void skills.push(worktree.root)));

      expect(prepared).toMatchObject({ number: 7, variant: "collaborative", mergeBase, head: { branch: "feature", commit: head }, base: { branch: "main" }, folder: prCheckFolder(storage, 7), root: prCheckFolder(storage, 7) });
      expect(prepared.rows.length).toBeGreaterThan(0);
      expect(skills).toEqual([prepared.root]);
      expect(git(prepared.folder, "rev-parse", "HEAD").trim()).toBe(head);
      expect(git(open, "status", "--porcelain")).toBe("");

      expect(await removeWorktree(open, prepared.folder)).toBeNull();
      expect(snapshotOf(open)).toBe(before);
    },
    GIT_TEST_MS,
  );

  test(
    "Solo: the open folder's own files are in the worktree and the head's are not",
    async () => {
      repositories();
      collaborativePullRequest();
      const p = projectAt(open);
      writeFileSync(join(open, ".trama/model/system.md"), "# Shop\n\nMy edit, not committed.\n");
      setSoloMode(p, "folders");
      const prepared = await prepareCheck(p, { number: 7, baseRefName: "main", headRefName: "feature" }, options());
      expect(prepared.variant).toBe("solo");
      expect(prepared.rows).toEqual([]);
      expect(readFileSync(join(prepared.root, ".trama/model/system.md"), "utf8")).toContain("My edit, not committed.");
      expect(existsSync(join(prepared.root, ".trama/solo"))).toBe(false);
      expect(await removeWorktree(open, prepared.folder)).toBeNull();
    },
    GIT_TEST_MS,
  );

  test(
    "the first step that fails stops everything, with git's first line, and leaves no worktree behind",
    async () => {
      repositories();
      collaborativePullRequest();
      const p = projectAt(open);
      const before = snapshotOf(open);

      const missing = await prepareCheck(p, { number: 7, baseRefName: "nonexistent", headRefName: "feature" }, options()).catch((e: Error) => e);
      expect((missing as Error).message).toMatch(/nonexistent/);
      expect(existsSync(prCheckFolder(storage, 7))).toBe(false);

      const skillsFail = await prepareCheck(p, { number: 7, baseRefName: "main", headRefName: "feature" }, options(() => {
        throw new Error("skills broke");
      })).catch((e: Error) => e);
      expect((skillsFail as Error).message).toBe("skills broke");
      expect(existsSync(prCheckFolder(storage, 7))).toBe(false);
      expect(snapshotOf(open)).toBe(before);
    },
    GIT_TEST_MS,
  );
});
