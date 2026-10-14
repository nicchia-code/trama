import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { getProposal } from "../src/core/proposals";
import { rewrittenId, rewrittenInstant } from "../src/core/rewrite-ids";
import { type Project, projectAt } from "../src/core/store";
import { getDrift, getTask } from "../src/core/work";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-rewrite-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => {
  rmSync(`${dir}.trama-worktrees`, { recursive: true, force: true });
  rmSync(dir, { recursive: true, force: true });
});

const cli = (...args: string[]) => run(["--root", dir, ...args], dir, {});

function writeCard(folder: string, name: string, front: string, body: string): void {
  const path = folder === "proposals" ? join(p.dir, folder, name, "proposal.md") : join(p.dir, folder, name);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, `---\n${front}\n---\n${body}`);
}

test("rewrites numbered cards to a stable identity, keeps the slug, the body and the state, and follows references", () => {
  writeCard("proposals", "0001-returns", "status: draft\nbase: {}\ndelete: []\nrequires:\n  - \"12\"", "# Returns\n\nCustomers send it back.\n");
  writeCard("proposals", "0012-billing", "status: approved\nbase: {}\ndelete: []\nscanScope:\n  - { ref: order, reason: changed }", "# Billing\n\nInvoices.\n");
  writeCard("proposals", "zzzz9999-kept", "status: draft\nbase: {}\ndelete: []\ncreated: 2020-01-01T00:00:00.000Z\nrequires:\n  - \"0001\"\n  - \"9999\"\nscanScope:\n  - { ref: order/Paid, reason: \"leads into a change\" }", "# Kept\n\nAlready its own.\n");
  writeCard("tasks", "0003-label.md", "column: todo\ntechnical: false\nrefs: [order]\nproposal: \"1\"\ndrift: \"0004\"", "# Label\n\nPrint it.\n");
  writeCard("tasks", "12345678-digits.md", "column: todo\ntechnical: true\nrefs: []\ncreated: 2020-06-01T00:00:00.000Z", "# Digits\n\nLeave this identity.\n");
  writeCard("drifts", "0004-late.md", "status: open\nrefs: [order]\nproposal: \"0012\"\ntask: \"0003\"\norigin: \"3\"", "# Late\n\n## What happens\n\nCode.\n\n## What should happen\n\nModel.\n");
  const announcement = join(p.dir, "announcements", "note.md");
  const request = join(p.dir, "requests", "2020-01-01T00-00-00.md");
  mkdirSync(join(announcement, ".."), { recursive: true });
  mkdirSync(join(request, ".."), { recursive: true });
  writeFileSync(announcement, "leave the announcement\n");
  writeFileSync(request, "leave the request\n");

  const out = cli("ids", "rewrite");
  expect(out.exit).toBe(0);
  const proposalId = rewrittenId("proposal", "0001");
  const billingId = rewrittenId("proposal", "0012");
  const taskId = rewrittenId("task", "0003");
  const driftId = rewrittenId("drift", "0004");
  expect(out.out).toContain(`proposal 0001 → ${proposalId}`);
  expect(out.out).toContain(`proposal 0012 → ${billingId}`);
  expect(out.out).toContain(`task 0003 → ${taskId}`);
  expect(out.out).toContain(`drift 0004 → ${driftId}`);

  const returns = getProposal(p, proposalId);
  expect(returns.name).toBe(`${proposalId}-returns`);
  expect(returns.data).toMatchObject({ status: "draft", created: rewrittenInstant("0001"), requires: [billingId] });
  expect(returns.body).toBe("# Returns\n\nCustomers send it back.\n");
  const billing = getProposal(p, billingId);
  expect(billing.data.status).toBe("approved");
  expect(billing.data.scanScope).toEqual([{ ref: "order", reason: "changed" }]);
  expect(billing.data.created).toBe(rewrittenInstant("0012"));
  expect(billing.body).toBe("# Billing\n\nInvoices.\n");
  const kept = getProposal(p, "zzzz9999");
  expect(kept.data.requires).toEqual([proposalId, "9999"]);
  expect(kept.data.created).toBe("2020-01-01T00:00:00.000Z");
  expect(kept.data.scanScope).toEqual([{ ref: "order/Paid", reason: "leads into a change" }]);
  expect(kept.body).toBe("# Kept\n\nAlready its own.\n");

  const task = getTask(p, taskId);
  expect(task.name).toBe(`${taskId}-label.md`);
  expect(task.data).toMatchObject({ column: "todo", proposal: proposalId, drift: driftId, created: rewrittenInstant("0003") });
  expect(task.body).toBe("# Label\n\nPrint it.\n");
  expect(getTask(p, "12345678").title).toBe("Digits");

  const drift = getDrift(p, driftId);
  expect(drift.name).toBe(`${driftId}-late.md`);
  expect(drift.data).toMatchObject({ status: "open", proposal: billingId, task: taskId, origin: taskId, created: rewrittenInstant("0004") });
  expect(drift.body).toContain("## What happens\n\nCode.");
  expect(readFileSync(announcement, "utf8")).toBe("leave the announcement\n");
  expect(readFileSync(request, "utf8")).toBe("leave the request\n");

  const again = mkdtempSync(join(tmpdir(), "trama-rewrite-again-"));
  try {
    cpSync(join(import.meta.dir, "../examples/shop"), again, { recursive: true });
    const other = projectAt(again);
    mkdirSync(join(other.dir, "tasks"), { recursive: true });
    writeFileSync(join(other.dir, "tasks", "0003-label.md"), "---\ncolumn: todo\ntechnical: false\nrefs: [order]\n---\n# Label\n\nPrint it.\n");
    expect(run(["--root", again, "ids", "rewrite"], again, {}).out).toContain(`task 0003 → ${taskId}`);
    expect(getTask(other, taskId).data.created).toBe(rewrittenInstant("0003"));
  } finally {
    rmSync(again, { recursive: true, force: true });
  }
  expect(rewrittenInstant("0012") > rewrittenInstant("0001")).toBe(true);
});

test("a resolution keeps listing its numbered Drifts under their new identities, with the same decisions", () => {
  writeCard("drifts", "0004-late.md", "status: open\nrefs: [order]\norigin: null", "# Late\n\n## What happens\n\nCode.\n\n## What should happen\n\nModel.\n");
  writeCard("drifts", "0006-old.md", "status: resolved\nrefs: [order]\norigin: null\nresolution: dismissed\nresolvedBy: \"0005\"", "# Old\n\n## What happens\n\nCode.\n\n## What should happen\n\nModel.\n");
  writeCard("proposals", "0005-fix", "kind: resolution\nstatus: open\nbase: {}\ndelete: []\ndrifts:\n  - { drift: \"0004\", decision: proposal }\n  - { drift: \"0006\", decision: dismissed }", "# Fix\n\nDecide.\n");

  expect(cli("ids", "rewrite").exit).toBe(0);
  const fixId = rewrittenId("proposal", "0005");
  const lateId = rewrittenId("drift", "0004");
  const oldId = rewrittenId("drift", "0006");
  const fix = getProposal(p, fixId);
  expect(fix.data.drifts).toEqual([
    { drift: lateId, decision: "proposal" },
    { drift: oldId, decision: "dismissed" },
  ]);
  expect(getDrift(p, oldId).data).toMatchObject({ status: "resolved", resolvedBy: fixId });
});

test("a recurring Drift keeps naming the Drift it follows under that Drift's new identity", () => {
  writeCard("drifts", "0004-first.md", "status: open\nrefs: [order]\norigin: null", "# First\n\n## What happens\n\nCode.\n\n## What should happen\n\nModel.\n");
  writeCard("drifts", "0006-again.md", "status: open\nrefs: [order]\norigin: null\nprevious: \"0004\"", "# Again\n\n## What happens\n\nCode.\n\n## What should happen\n\nModel.\n");

  expect(cli("ids", "rewrite").exit).toBe(0);
  expect(getDrift(p, rewrittenId("drift", "0006")).data.previous).toBe(rewrittenId("drift", "0004"));
});

test("does nothing when no card is numbered, and refuses before writing when numbers or identities collide", () => {
  writeCard("tasks", "abcd1111-free.md", "column: todo\ntechnical: true\nrefs: []\ncreated: 2020-01-01T00:00:00.000Z", "# Free\n");
  expect(cli("ids", "rewrite").out).toBe("No numbered Proposal, Task or Drift to rewrite.");
  expect(readFileSync(join(p.dir, "tasks", "abcd1111-free.md"), "utf8")).toContain("created: 2020-01-01T00:00:00.000Z");
  expect(existsSync(join(p.dir, "short-numbers"))).toBe(false);
  const assigned = join(p.dir, "short-numbers", "assigned");
  const registry = "task abcd1111 17\n";
  mkdirSync(join(assigned, ".."));
  writeFileSync(assigned, registry);
  expect(cli("ids", "rewrite").out).toBe("No numbered Proposal, Task or Drift to rewrite.");
  expect(readFileSync(assigned, "utf8")).toBe(registry);

  writeCard("tasks", "0012-one.md", "column: todo\ntechnical: true\nrefs: []", "# One\n");
  writeCard("tasks", "00012-two.md", "column: todo\ntechnical: true\nrefs: []", "# Two\n");
  expect(() => cli("ids", "rewrite")).toThrow(/2 Tasks share the number 0012/);
  expect(existsSync(join(p.dir, "tasks", "0012-one.md"))).toBe(true);
  expect(existsSync(join(p.dir, "tasks", "00012-two.md"))).toBe(true);
  expect(readFileSync(join(p.dir, "tasks", "0012-one.md"), "utf8")).not.toContain("created:");
  expect(readFileSync(assigned, "utf8")).toBe(registry);
  expect(existsSync(join(p.dir, "short-numbers", ".gitignore"))).toBe(false);

  rmSync(join(p.dir, "tasks", "00012-two.md"));
  const taken = rewrittenId("task", "0012");
  writeCard("tasks", `${taken}-taken.md`, "column: todo\ntechnical: true\nrefs: []\ncreated: 2020-01-01T00:00:00.000Z", "# Taken\n");
  expect(() => cli("ids", "rewrite")).toThrow(new RegExp(`Task 0012 would be ${taken}`));
  expect(existsSync(join(p.dir, "tasks", "0012-one.md"))).toBe(true);
  expect(readFileSync(join(p.dir, "tasks", `${taken}-taken.md`), "utf8")).toBe("---\ncolumn: todo\ntechnical: true\nrefs: []\ncreated: 2020-01-01T00:00:00.000Z\n---\n# Taken\n");
  expect(readFileSync(assigned, "utf8")).toBe(registry);
  expect(existsSync(join(p.dir, "short-numbers", ".gitignore"))).toBe(false);
});

test("an agent can run ids rewrite, and worktrees and trama/* branches left over do not stop it", () => {
  writeCard("tasks", "0007-wait.md", "column: todo\ntechnical: true\nrefs: []", "# Wait\n");

  const git = (args: string[], cwd = dir) => {
    const result = spawnSync("git", ["-c", "core.autocrlf=false", ...args], {
      cwd,
      encoding: "utf8",
      env: { ...process.env, GIT_AUTHOR_NAME: "Test", GIT_AUTHOR_EMAIL: "t@example.com", GIT_COMMITTER_NAME: "Test", GIT_COMMITTER_EMAIL: "t@example.com" },
    });
    if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  };
  git(["init", "-b", "main"]);
  git(["add", "-A"]);
  git(["commit", "-m", "init"]);
  const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: dir, encoding: "utf8" }).stdout.trim();
  writeFileSync(join(dir, "dirty.txt"), "uncommitted\n");
  const left = join(`${dir}.trama-worktrees`, "abcd1234");
  git(["worktree", "add", "-b", "trama/abcd1234", left, "HEAD"]);
  git(["branch", "trama/merge"]);
  expect(run(["--root", dir, "ids", "rewrite"], dir, { TRAMA_AGENT: "1" }).exit).toBe(0);
  expect(existsSync(join(p.dir, "tasks", "0007-wait.md"))).toBe(false);
  expect(existsSync(join(p.dir, "tasks", `${rewrittenId("task", "0007")}-wait.md`))).toBe(true);
  expect(existsSync(join(left, ".trama", "tasks", "0007-wait.md"))).toBe(true);
  expect(spawnSync("git", ["branch", "--list", "trama/*"], { cwd: dir, encoding: "utf8" }).stdout).toContain("trama/abcd1234");
  expect(spawnSync("git", ["rev-parse", "HEAD"], { cwd: dir, encoding: "utf8" }).stdout.trim()).toBe(head);
  expect(existsSync(join(dir, "dirty.txt"))).toBe(true);
});
