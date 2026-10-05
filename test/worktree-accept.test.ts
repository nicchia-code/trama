import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawn, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acceptOrdinaryProposal } from "../extension/src/host/acceptance";
import { approvalRoute, worktreeAgentMissing } from "../extension/src/host/multi-branch";
import { EDITOR_UNAVAILABLE } from "../src/core/approve-request";
import { approvalBySwitch, multiBranchDir, multiBranchStatePath, readMultiBranch, turnMultiBranch, UNREADABLE_SWITCH, writeMultiBranch } from "../src/core/multi-branch";
import { run } from "../src/cli/main";
import { boardCounts } from "../extension/src/host/board-counts";
import { boardView } from "../src/cli/work";
import { applyWorktreeDecision } from "../extension/src/host/worktree-decision";
import { getTask, listTasks, newDrift, nextTask, newTask, resolveDrift } from "../src/core/work";
import { approvalBlock, approveProposal, editInProposal, getProposal, newProposal, rejectProposal } from "../src/core/proposals";
import { buildSnapshot } from "../src/core/snapshot";
import { type Project, projectAt } from "../src/core/store";
import { abandonRound, applyWaitingMerge, finishReconciliation, mergeRound, reconcileMerge } from "../src/core/worktree-merge";
import { driftComparison } from "../extension/src/webview/drift-compare";
import { acceptIntoWorktree, lostWorktreeMessage, reconcileLostWorktrees, roundOrigin, withdrawFromRound, worktreePath, worktreeProposalIds, worktreesHome } from "../src/core/worktree-round";
import { handOver } from "./handover";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-worktree-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});

afterEach(() => {
  rmSync(worktreesHome(dir), { recursive: true, force: true });
  rmSync(dir, { recursive: true, force: true });
});

function runGit(cwd: string, args: string[]): string {
  const result = spawnSync("git", ["-c", "core.autocrlf=false", ...args], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Test",
      GIT_AUTHOR_EMAIL: "t@example.com",
      GIT_COMMITTER_NAME: "Test",
      GIT_COMMITTER_EMAIL: "t@example.com",
    },
  });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  return (result.stdout ?? "").trim();
}

function initRepo(): void {
  runGit(dir, ["init", "-b", "main"]);
  runGit(dir, ["add", "-A"]);
  runGit(dir, ["commit", "-m", "init"]);
}

function commit(message: string): void {
  runGit(dir, ["add", "-A"]);
  runGit(dir, ["commit", "-m", message]);
}

function changeOrder(title = "Change"): string {
  const prop = newProposal(p, title);
  const file = editInProposal(p, prop.id, "checkout/order.md");
  const text = readFileSync(file, "utf8").replace("### Cancelled (final)", "### Cancelled (final)\n\n### Lost (final)");
  writeFileSync(file, text);
  handOver(p, prop.id);
  return prop.id;
}

function changePayment(title: string): string {
  const prop = newProposal(p, title);
  const file = editInProposal(p, prop.id, "checkout/payment.md");
  const text = readFileSync(file, "utf8").replace("### Refunded (final)", "### Refunded (final)\n\n### Kept (final)");
  writeFileSync(file, text);
  handOver(p, prop.id);
  return prop.id;
}

const ready = { autoScan: true, worktreeAgent: "echo {prompt}" };

describe("multi-branch settings", () => {
  test("turning the switch off leaves an open round and its worktree in place", () => {
    initRepo();
    const id = changeOrder();
    commit("proposal");
    expect(acceptIntoWorktree(p, id, ready).ok).toBe(true);
    const origin = roundOrigin(dir);
    expect(turnMultiBranch(p, false, ready.worktreeAgent)).toBeNull();
    expect(readMultiBranch(p).kind).toBe("off");
    expect(worktreeProposalIds(p)).toEqual([id]);
    expect(existsSync(worktreePath(dir, id))).toBe(true);
    expect(roundOrigin(dir)).toEqual(origin);
    expect(turnMultiBranch(p, true, ready.worktreeAgent)).toBeNull();
    expect(readMultiBranch(p).kind).toBe("on");
    expect(worktreeProposalIds(p)).toEqual([id]);
    expect(roundOrigin(dir)).toEqual(origin);
  });

  test("an empty worktree agent is a value already set, and a missing key is not", () => {
    expect(worktreeAgentMissing(undefined)).toBe(true);
    expect(worktreeAgentMissing("")).toBe(false);
    expect(worktreeAgentMissing("echo {prompt}")).toBe(false);
  });

  test("a Drift's Proposal is accepted in the open folder even when multi-branch is on", () => {
    expect(approvalRoute(false, false)).toBe("folder");
    expect(approvalRoute(true, true)).toBe("folder");
    expect(approvalRoute(true, false)).toBe("worktree");
  });

  test("an acceptance while the switch is off stays in the folder, and turning it on again joins the same start commit", () => {
    initRepo();
    const first = changeOrder("First");
    commit("first");
    writeMultiBranch(p, "on");
    expect(acceptIntoWorktree(p, first, ready).ok).toBe(true);
    const origin = roundOrigin(dir);
    expect(origin).not.toBeNull();
    if (!origin) return;
    writeMultiBranch(p, "off");
    const second = changePayment("Second");
    commit("second");
    approveProposal(p, second);
    expect(getProposal(p, second).data.status).toBe("approved");
    expect(worktreeProposalIds(p)).toEqual([first]);
    expect(roundOrigin(dir)).toEqual(origin);
    commit("approved second");
    const third = changeOrder("Third");
    commit("third");
    writeMultiBranch(p, "on");
    const again = acceptIntoWorktree(p, third, ready);
    if (!again.ok) throw new Error(again.message);
    expect(again.acceptance.commit).toBe(origin.commit);
    expect(roundOrigin(dir)).toEqual(origin);
    expect(worktreeProposalIds(p).sort()).toEqual([first, third].sort());
  }, 20_000);

  test("accepting a Drift's Proposal copies it into the open folder even when the switch is on", () => {
    const id = changeOrder();
    const before = readFileSync(join(dir, ".trama/model/checkout/order.md"), "utf8");
    writeMultiBranch(p, "on");
    const drift = newDrift(p, { title: "Keep Lost", refs: ["order"], proposal: id, happens: "The code has Lost.", should: "The Model does not.", options: FIX_OPTIONS });
    resolveDrift(p, drift.id, "accept-proposal");
    expect(getProposal(p, id).data.status).toBe("approved");
    expect(worktreeProposalIds(p)).toEqual([]);
    expect(readFileSync(join(dir, ".trama/model/checkout/order.md"), "utf8")).not.toBe(before);
    expect(readFileSync(join(dir, ".trama/model/checkout/order.md"), "utf8")).toContain("### Lost (final)");
  });
});

describe("trama proposal approve reads the switch", () => {
  function approve(id: string) {
    return run(["--root", dir, "proposal", "approve", id], dir, {});
  }

  test("off and missing apply the Proposal in this folder", () => {
    const missing = changeOrder("Missing");
    const applied = approve(missing);
    expect(applied.out).toBe(`Approved Proposal ${missing}`);
    expect(getProposal(p, missing).data.status).toBe("approved");
    expect(worktreeProposalIds(p)).toEqual([]);
    expect(approvalBySwitch(readMultiBranch(p)).route).toBe("folder");

    const off = changePayment("Off");
    writeMultiBranch(p, "off");
    expect(approve(off).out).toBe(`Approved Proposal ${off}`);
    expect(getProposal(p, off).data.status).toBe("approved");
    expect(worktreeProposalIds(p)).toEqual([]);
  });

  test("unreadable counts as off, applies the Proposal here, and prints the notice", () => {
    const id = changeOrder();
    mkdirSync(multiBranchDir(p), { recursive: true });
    writeFileSync(multiBranchStatePath(p), "maybe\n");
    const applied = approve(id);
    expect(applied.out).toContain(UNREADABLE_SWITCH);
    expect(applied.out).toContain(`Approved Proposal ${id}`);
    expect(getProposal(p, id).data.status).toBe("approved");
    expect(readFileSync(join(dir, ".trama/model/checkout/order.md"), "utf8")).toContain("### Lost (final)");
    expect(worktreeProposalIds(p)).toEqual([]);
  });

  test("on, with no editor, leaves the Proposal open and says why", () => {
    initRepo();
    const id = changeOrder();
    commit("proposal");
    writeMultiBranch(p, "on");
    const order = readFileSync(join(dir, ".trama/model/checkout/order.md"), "utf8");
    const previous = process.env.TRAMA_APPROVE_WAIT_MS;
    process.env.TRAMA_APPROVE_WAIT_MS = "80";
    try {
      expect(() => approve(id)).toThrow(EDITOR_UNAVAILABLE);
    } finally {
      if (previous === undefined) delete process.env.TRAMA_APPROVE_WAIT_MS;
      else process.env.TRAMA_APPROVE_WAIT_MS = previous;
    }
    expect(getProposal(p, id).data.status).toBe("open");
    expect(readFileSync(join(dir, ".trama/model/checkout/order.md"), "utf8")).toBe(order);
    expect(worktreeProposalIds(p)).toEqual([]);
  });

  test("on, the command prints what the editor answers and does not copy into this folder", () => {
    initRepo();
    const id = changeOrder();
    commit("proposal");
    writeMultiBranch(p, "on");
    const order = readFileSync(join(dir, ".trama/model/checkout/order.md"), "utf8");
    const child = spawn(process.execPath, ["-e", EDITOR_SCRIPT], {
      cwd: join(import.meta.dir, ".."),
      env: { ...process.env, ROOT: dir },
    });
    const previous = process.env.TRAMA_APPROVE_WAIT_MS;
    process.env.TRAMA_APPROVE_WAIT_MS = "3000";
    try {
      const applied = approve(id);
      expect(applied.out).toBe(`Proposal ${id} is in a worktree.`);
      expect(applied.exit).toBe(0);
    } finally {
      if (previous === undefined) delete process.env.TRAMA_APPROVE_WAIT_MS;
      else process.env.TRAMA_APPROVE_WAIT_MS = previous;
      child.kill();
    }
    expect(getProposal(p, id).data.status).toBe("open");
    expect(readFileSync(join(dir, ".trama/model/checkout/order.md"), "utf8")).toBe(order);
    expect(worktreeProposalIds(p)).toEqual([]);
  });
});

const EDITOR_SCRIPT = [
  'import { takeApproveRequest, writeApproveResult } from "./src/core/approve-request.ts";',
  'import { projectAt } from "./src/core/store.ts";',
  'const project = projectAt(process.env.ROOT ?? "");',
  "const deadline = Date.now() + 4000;",
  "while (Date.now() < deadline) {",
  "  const request = takeApproveRequest(project);",
  "  if (request) {",
  '    writeApproveResult(project, { nonce: request.nonce, ok: true, message: "Proposal " + request.id + " is in a worktree." });',
  "    process.exit(0);",
  "  }",
  "  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);",
  "}",
  "process.exit(1);",
].join("\n");

describe("accepting an ordinary Proposal into a worktree", () => {
  test("the worktree is born from the open branch's commit, outside the work tree, and the open folder stays as it is", () => {
    initRepo();
    const id = changeOrder();
    commit("proposal");
    const head = runGit(dir, ["rev-parse", "HEAD"]);
    const before = readFileSync(join(dir, ".trama/model/checkout/order.md"), "utf8");
    const result = acceptIntoWorktree(p, id, ready);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.acceptance.worktree).toBe(worktreePath(dir, id));
    expect(result.acceptance.features).toEqual(["checkout"]);
    expect(result.acceptance).toMatchObject({ branch: "main", commit: head });
    expect(roundOrigin(dir)).toEqual({ branch: "main", commit: head });
    expect(runGit(result.acceptance.worktree, ["rev-parse", "--abbrev-ref", "HEAD"])).toBe(`trama/${id}`);
    expect(runGit(result.acceptance.worktree, ["rev-parse", "HEAD"])).toBe(head);
    expect(readFileSync(join(result.acceptance.worktree, ".trama/model/checkout/order.md"), "utf8")).toContain("### Lost (final)");
    expect(readFileSync(join(dir, ".trama/model/checkout/order.md"), "utf8")).toBe(before);
    expect(getProposal(p, id).data.status).toBe("open");
    expect(runGit(dir, ["status", "--porcelain"])).toBe("");
    expect(buildSnapshot(p).proposals.map((item) => item.id)).not.toContain(id);
    expect(buildSnapshot(p).inWorktree).toEqual([{ id, title: "Change", removable: true }]);
    expect(boardCounts(p).toDecide).toBe(0);
    const board = boardView(p).md;
    const beforeDecide = board.split("## To decide")[0] ?? "";
    const decide = board.split("## To decide")[1]?.split("## To do")[0] ?? "";
    expect(beforeDecide).toContain("## In worktree");
    expect(beforeDecide).toContain(`Proposal ${id}: Change`);
    expect(decide).not.toContain("Change");
  }, 20_000);

  test("a later Proposal of the same round is born from the same commit, and one still in a worktree does not count as accepted", () => {
    initRepo();
    const first = changeOrder("First");
    commit("first");
    const started = acceptIntoWorktree(p, first, ready);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    writeFileSync(join(dir, "note.txt"), "later\n");
    commit("later on main");
    const second = newProposal(p, "Second");
    const file = editInProposal(p, second.id, "checkout/payment.md");
    writeFileSync(file, readFileSync(file, "utf8").replace("### Refunded (final)", "### Refunded (final)\n### Lost (final)"));
    handOver(p, second.id);
    const needsFirst = newProposal(p, "Needs the first", "", { requires: [first] });
    handOver(p, needsFirst.id);
    commit("second");
    const again = acceptIntoWorktree(p, second.id, ready);
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.acceptance.commit).toBe(started.acceptance.commit);
    expect(runGit(again.acceptance.worktree, ["rev-parse", "HEAD"])).toBe(started.acceptance.commit);
    expect(runGit(dir, ["rev-parse", "HEAD"])).not.toBe(started.acceptance.commit);
    expect(readFileSync(join(again.acceptance.worktree, ".trama/model/checkout/payment.md"), "utf8")).toContain("### Lost (final)");
    expect(readFileSync(join(dir, ".trama/model/checkout/payment.md"), "utf8")).not.toContain("### Lost (final)");
    expect(approvalBlock(p, needsFirst.id)?.kind).toBe("waiting");
    expect(getProposal(p, first).data.status).toBe("open");
    expect(buildSnapshot(p).proposals.map((item) => item.id)).toEqual([needsFirst.id]);
    const stamp = (id: string, created: string) => {
      const file = join(getProposal(p, id).dir, "proposal.md");
      writeFileSync(file, readFileSync(file, "utf8").replace(/^created:.*$/m, `created: ${created}`));
    };
    stamp(first, "2020-01-02T00:00:00.000Z");
    stamp(second.id, "2020-01-01T00:00:00.000Z");
    expect(buildSnapshot(p).inWorktree.map((item) => item.id)).toEqual([second.id, first]);
  }, 20_000);

  test("the agent is started on the scan of that Proposal, in the worktree, with the language on the same line", async () => {
    initRepo();
    const id = changeOrder();
    commit("proposal");
    const prompts: { worktree: string; prompt: string }[] = [];
    const started = await acceptOrdinaryProposal(
      {
        project: p,
        autoScan: true,
        worktreeAgent: "echo {prompt}",
        language: "Italian",
        warn: () => {},
        startAgent: async (worktree, prompt) => void prompts.push({ worktree, prompt }),
      },
      id,
    );
    expect(started).toBe(true);
    expect(prompts).toEqual([
      {
        worktree: worktreePath(dir, id),
        prompt: `Use the trama-scan skill on the Feature \`checkout\`. The scan follows the approval of Proposal ${id}: link every Task you file to it with --proposal ${id}. Write everything you generate in Italian, except code, which always stays in English.`,
      },
    ]);
  });

  test("an import, a scan that is off, no Feature, or no worktree command leaves the Proposal open", () => {
    initRepo();
    const imported = newProposal(p, "Imported", "", { kind: "import" });
    const file = editInProposal(p, imported.id, "checkout/order.md");
    writeFileSync(file, readFileSync(file, "utf8").replace("### Cancelled (final)", "### Cancelled (final)\n\n### Lost (final)"));
    handOver(p, imported.id);
    commit("import");
    expect(acceptIntoWorktree(p, imported.id, ready)).toEqual({ ok: false, message: "Import proposals cannot be accepted while multi-branch is on." });

    const quiet = changeOrder("Quiet");
    commit("quiet");
    expect(acceptIntoWorktree(p, quiet, { autoScan: false, worktreeAgent: "echo {prompt}" })).toEqual({
      ok: false,
      message: "Turn automatic scan on, or turn multi-branch off, before accepting this Proposal.",
    });

    const system = newProposal(p, "System only");
    const systemFile = editInProposal(p, system.id, "system.md");
    writeFileSync(systemFile, `${readFileSync(systemFile, "utf8")}\nMore.\n`);
    handOver(p, system.id);
    commit("system");
    expect(acceptIntoWorktree(p, system.id, ready)).toEqual({
      ok: false,
      message: "This Proposal affects no Feature, so multi-branch cannot start a worktree.",
    });

    const missing = changeOrder("No command");
    commit("command");
    expect(acceptIntoWorktree(p, missing, { autoScan: true, worktreeAgent: "  " })).toEqual({
      ok: false,
      message: "Set trama.worktreeAgent in your user settings before accepting a Proposal with multi-branch on.",
    });
    for (const id of [imported.id, quiet, system.id, missing]) {
      expect(getProposal(p, id).data.status).toBe("open");
      expect(existsSync(worktreePath(dir, id))).toBe(false);
    }
  });

  test("a folder that is not a Git repository, a detached HEAD, or a dirty tree is refused", () => {
    const id = changeOrder();
    expect(acceptIntoWorktree(p, id, ready)).toEqual({
      ok: false,
      message: "This folder is not a Git repository, so a worktree cannot be created.",
    });

    initRepo();
    runGit(dir, ["checkout", "--detach"]);
    expect(acceptIntoWorktree(p, id, ready)).toEqual({
      ok: false,
      message: "This folder is not on a branch, so a worktree cannot be created.",
    });

    runGit(dir, ["checkout", "main"]);
    writeFileSync(join(dir, "dirty.txt"), "x\n");
    expect(acceptIntoWorktree(p, id, ready)).toEqual({
      ok: false,
      message: "Commit or stash your changes before accepting a Proposal with multi-branch on.",
    });
    expect(existsSync(worktreePath(dir, id))).toBe(false);
    expect(getProposal(p, id).data.status).toBe("open");
  });

  test("a round that is already merging, a branch git refuses, or a blocked Proposal does not open a worktree", () => {
    initRepo();
    const id = changeOrder();
    commit("proposal");
    mkdirSync(worktreesHome(dir), { recursive: true });
    runGit(dir, ["worktree", "add", "-b", "trama/merge", join(worktreesHome(dir), "merge"), "HEAD"]);
    expect(acceptIntoWorktree(p, id, ready)).toEqual({
      ok: false,
      message: "A worktree round is already merging. Wait until it finishes.",
    });
    runGit(dir, ["worktree", "remove", "--force", join(worktreesHome(dir), "merge")]);
    runGit(dir, ["branch", "-D", "trama/merge"]);

    runGit(dir, ["branch", `trama/${id}`]);
    const refused = acceptIntoWorktree(p, id, ready);
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.message.toLowerCase()).toContain("already exists");
    expect(existsSync(worktreePath(dir, id))).toBe(false);
    runGit(dir, ["branch", "-D", `trama/${id}`]);

    writeFileSync(join(dir, ".trama/model/checkout/order.md"), `${readFileSync(join(dir, ".trama/model/checkout/order.md"), "utf8")}\n`);
    const stale = acceptIntoWorktree(p, id, ready);
    expect(stale).toEqual({ ok: false, message: `Proposal ${id} is stale: the Model changed since it was written.` });
    expect(getProposal(p, id).data.status).toBe("open");
  });

  test("a refusal tells the developer and does not start the agent", async () => {
    const warnings: string[] = [];
    const started = await acceptOrdinaryProposal(
      {
        project: p,
        autoScan: true,
        worktreeAgent: "echo {prompt}",
        language: "",
        warn: (message) => warnings.push(message),
        startAgent: async () => {
          throw new Error("should not start");
        },
      },
      changeOrder(),
    );
    expect(started).toBe(false);
    expect(warnings).toEqual(["This folder is not a Git repository, so a worktree cannot be created."]);
  });
});

describe("removing a Proposal from the round", () => {
  test("removing the only Proposal deletes its worktree and the round, and it awaits a decision again", () => {
    initRepo();
    const id = changeOrder();
    commit("proposal");
    expect(acceptIntoWorktree(p, id, ready).ok).toBe(true);
    expect(() => approveProposal(p, id)).toThrow(`Proposal ${id} is in a worktree.`);
    expect(() => rejectProposal(p, id, "no")).toThrow(`Proposal ${id} is in a worktree.`);
    expect(acceptIntoWorktree(p, id, ready)).toEqual({ ok: false, message: `Proposal ${id} is in a worktree.` });
    expect(getProposal(p, id).data.status).toBe("open");

    expect(withdrawFromRound(p, id)).toEqual({ remaining: 0 });
    expect(worktreeProposalIds(p)).toEqual([]);
    expect(roundOrigin(dir)).toBeNull();
    expect(existsSync(worktreePath(dir, id))).toBe(false);
    expect(getProposal(p, id).data.status).toBe("open");
    expect(buildSnapshot(p).proposals.map((item) => item.id)).toContain(id);
    expect(buildSnapshot(p).inWorktree).toEqual([]);
    expect(boardView(p).md).not.toContain("## In worktree");
    const decide = boardView(p).md.split("## To decide")[1]?.split("## To do")[0] ?? "";
    expect(decide).toContain("Change");
  }, 20_000);

  test("removing one Proposal leaves the others in the same round", () => {
    initRepo();
    const first = changeOrder("First");
    commit("first");
    expect(acceptIntoWorktree(p, first, ready).ok).toBe(true);
    const second = changeOrder("Second");
    commit("second");
    expect(acceptIntoWorktree(p, second, ready).ok).toBe(true);
    const origin = roundOrigin(dir);

    expect(withdrawFromRound(p, first)).toEqual({ remaining: 1 });
    expect(worktreeProposalIds(p)).toEqual([second]);
    expect(roundOrigin(dir)).toEqual(origin);
    expect(existsSync(worktreePath(dir, first))).toBe(false);
    expect(existsSync(worktreePath(dir, second))).toBe(true);
    expect(getProposal(p, first).data.status).toBe("open");
    expect(buildSnapshot(p).inWorktree.map((item) => item.id)).toEqual([second]);
    expect(buildSnapshot(p).proposals.map((item) => item.id)).toContain(first);
  }, 20_000);

  test("one Proposal cannot be removed once the round is merging", () => {
    initRepo();
    const id = changeOrder();
    commit("proposal");
    expect(acceptIntoWorktree(p, id, ready).ok).toBe(true);
    runGit(dir, ["worktree", "add", "-b", "trama/merge", join(worktreesHome(dir), "merge"), "HEAD"]);
    expect(buildSnapshot(p).inWorktree).toEqual([{ id, title: "Change", removable: false }]);
    expect(() => withdrawFromRound(p, id)).toThrow("One Proposal cannot be removed while the round is merging, in conflict, reconciling or waiting.");
    expect(existsSync(worktreePath(dir, id))).toBe(true);
    expect(getProposal(p, id).data.status).toBe("open");
    expect(() => withdrawFromRound(p, "9999")).toThrow('No Proposal with ID "9999"');
  });
});

const FIX_OPTIONS = [
  { title: "Follow the Model", text: "The code does what the Model says." },
  { title: "Keep the note", text: "The code keeps a note of what it did." },
];

describe("deciding a Drift that lives in a worktree", () => {
  test("the open Board shows the worktree's Tasks and Drifts, and the open folder's next Task does not", () => {
    initRepo();
    const id = changeOrder();
    commit("proposal");
    const accepted = acceptIntoWorktree(p, id, ready);
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    const work = projectAt(accepted.acceptance.worktree);
    const task = newTask(work, { title: "Born there", refs: ["order/Paid"], technical: false, proposal: id });
    const drift = newDrift(work, { title: "Seen there", refs: ["payment"], happens: "The code drops it.", should: "The Model keeps it.", options: FIX_OPTIONS });

    const later = newTask(p, { title: "Born here", refs: ["order/Paid"], technical: false });
    const openDrift = newDrift(p, { title: "Seen here", refs: ["payment"], happens: "The code drops it.", should: "The Model keeps it.", options: FIX_OPTIONS });
    expect(nextTask(p).next?.id).toBe(later.id);
    expect(listTasks(p).map((item) => item.id)).toEqual([later.id]);
    expect(nextTask(work).next?.id).toBe(task.id);
    const snap = buildSnapshot(p);
    expect(snap.tasks.filter((item) => item.worktree === id).map((item) => item.title)).toEqual(["Born there"]);
    expect(snap.drifts.filter((item) => item.worktree === id).map((item) => item.title)).toEqual(["Seen there"]);
    expect(snap.proposals.map((item) => item.id)).not.toContain(id);
    const board = boardView(p).md;
    expect(board.indexOf("Born there (worktree)")).toBeLessThan(board.indexOf("Born here"));
    expect(board.indexOf(`Drift ${drift.id} (worktree): Seen there`)).toBeLessThan(board.indexOf(`Drift ${openDrift.id}: Seen here`));
  }, 20_000);

  test("keeping a side writes the decision in the worktree and does not open another round", () => {
    initRepo();
    const id = changeOrder();
    commit("proposal");
    const accepted = acceptIntoWorktree(p, id, ready);
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    const work = projectAt(accepted.acceptance.worktree);
    const before = readFileSync(join(dir, ".trama/model/checkout/payment.md"), "utf8");
    const attached = newProposal(work, "Attached");
    const file = editInProposal(work, attached.id, "checkout/payment.md");
    writeFileSync(file, readFileSync(file, "utf8").replace("### Refunded (final)", "### Refunded (final)\n### Kept (final)"));
    handOver(work, attached.id);
    const drift = newDrift(work, { title: "Keep the payment", refs: ["payment"], proposal: attached.id, happens: "The code keeps it.", should: "The Model does not.", options: FIX_OPTIONS });

    expect(applyWorktreeDecision(p, id, drift.id, "accept-proposal")).toBe(accepted.acceptance.worktree);
    expect(readFileSync(join(accepted.acceptance.worktree, ".trama/model/checkout/payment.md"), "utf8")).toContain("### Kept (final)");
    expect(readFileSync(join(dir, ".trama/model/checkout/payment.md"), "utf8")).toBe(before);
    expect(getProposal(p, id).data.status).toBe("open");
    expect(getProposal(work, attached.id).data.status).toBe("approved");
    expect(worktreeProposalIds(p)).toEqual([id]);

    const fix = newDrift(work, { title: "Fix the payment", refs: ["payment"], happens: "The code drops it.", should: "The Model keeps it.", options: FIX_OPTIONS });
    applyWorktreeDecision(p, id, fix.id, "fix-code", [], { option: 1 });
    expect(listTasks(p).map((item) => item.title)).toEqual([]);
    expect(listTasks(work).some((item) => item.title.startsWith("Fix code to match the Model"))).toBe(true);
    expect(() => applyWorktreeDecision(p, "9999", fix.id, "dismiss")).toThrow("is not in a worktree");
  }, 20_000);
});

describe("a Proposal worktree that disappears", () => {
  test("the Proposal is back to decide and the developer is told; the others stay, and the last one ends the round", () => {
    initRepo();
    const first = changeOrder("First");
    commit("first");
    expect(acceptIntoWorktree(p, first, ready).ok).toBe(true);
    const second = changeOrder("Second");
    commit("second");
    expect(acceptIntoWorktree(p, second, ready).ok).toBe(true);
    const origin = roundOrigin(dir);

    rmSync(worktreePath(dir, first), { recursive: true, force: true });
    const lost = reconcileLostWorktrees(p);
    expect(lost).toEqual([{ id: first, title: "First", remaining: 1 }]);
    expect(lostWorktreeMessage(lost[0]!)).toBe(`Proposal ${first} "First" is back to decide: its worktree is gone. The other Proposals stay in the round.`);
    expect(reconcileLostWorktrees(p)).toEqual([]);
    expect(worktreeProposalIds(p)).toEqual([second]);
    expect(roundOrigin(dir)).toEqual(origin);
    expect(getProposal(p, first).data.status).toBe("open");
    expect(buildSnapshot(p).proposals.map((item) => item.id)).toContain(first);
    expect(buildSnapshot(p).inWorktree.map((item) => item.id)).toEqual([second]);
    expect(runGit(dir, ["branch", "--list", `trama/${first}`])).toBe("");

    rmSync(worktreePath(dir, second), { recursive: true, force: true });
    runGit(dir, ["worktree", "prune"]);
    const last = reconcileLostWorktrees(p);
    expect(last).toEqual([{ id: second, title: "Second", remaining: 0 }]);
    expect(lostWorktreeMessage(last[0]!)).toBe(`Proposal ${second} "Second" is back to decide: its worktree is gone. There is no round left.`);
    expect(roundOrigin(dir)).toBeNull();
    expect(worktreeProposalIds(p)).toEqual([]);
    expect(buildSnapshot(p).inWorktree).toEqual([]);
    expect(buildSnapshot(p).proposals.map((item) => item.id)).toEqual(expect.arrayContaining([first, second]));
  }, 20_000);
});

describe("merging a round when every Task is Done", () => {
  beforeEach(() => {
    process.env.GIT_AUTHOR_NAME = "Test";
    process.env.GIT_AUTHOR_EMAIL = "t@example.com";
    process.env.GIT_COMMITTER_NAME = "Test";
    process.env.GIT_COMMITTER_EMAIL = "t@example.com";
  });

  function secondChange(fileName: string, from: string, to: string, title: string): string {
    const prop = newProposal(p, title);
    const file = editInProposal(p, prop.id, fileName);
    writeFileSync(file, readFileSync(file, "utf8").replace(from, to));
    handOver(p, prop.id);
    return prop.id;
  }

  test("a clean folder on the start branch receives the merge, the Proposals are approved, and the worktrees are gone", () => {
    initRepo();
    const first = changeOrder("First");
    commit("first");
    expect(acceptIntoWorktree(p, first, ready).ok).toBe(true);
    const second = secondChange("checkout/payment.md", "### Refunded (final)", "### Refunded (final)\n### Kept (final)", "Second");
    commit("second");
    expect(acceptIntoWorktree(p, second, ready).ok).toBe(true);
    writeFileSync(join(worktreePath(dir, first), "leftover.txt"), "keep\n");

    const outcome = mergeRound(p);
    expect(outcome).toEqual({ kind: "merged", features: ["checkout"] });
    expect(readFileSync(join(dir, ".trama/model/checkout/order.md"), "utf8")).toContain("### Lost (final)");
    expect(readFileSync(join(dir, ".trama/model/checkout/payment.md"), "utf8")).toContain("### Kept (final)");
    expect(readFileSync(join(dir, "leftover.txt"), "utf8")).toBe("keep\n");
    expect(runGit(dir, ["log", "--format=%s"])).toContain("Keep unfinished worktree changes");
    expect(getProposal(p, first).data.status).toBe("approved");
    expect(getProposal(p, second).data.status).toBe("approved");
    expect(worktreeProposalIds(p)).toEqual([]);
    expect(existsSync(worktreePath(dir, "merge"))).toBe(false);
    expect(roundOrigin(dir)).toBeNull();
  }, 20_000);

  test("a dirty folder waits, the worktrees stay, and a new acceptance is refused while the round is merging", () => {
    initRepo();
    const id = changeOrder();
    commit("proposal");
    expect(acceptIntoWorktree(p, id, ready).ok).toBe(true);
    writeFileSync(join(dir, "dirty.txt"), "x\n");
    expect(mergeRound(p)).toEqual({ kind: "waiting", branch: "main" });
    expect(existsSync(worktreePath(dir, id))).toBe(true);
    expect(existsSync(worktreePath(dir, "merge"))).toBe(true);
    expect(readFileSync(join(dir, ".trama/model/checkout/order.md"), "utf8")).not.toContain("### Lost (final)");
    rmSync(join(dir, "dirty.txt"));
    const another = secondChange("checkout/payment.md", "### Refunded (final)", "### Refunded (final)\n### Kept (final)", "Another");
    commit("another");
    expect(acceptIntoWorktree(p, another, ready)).toEqual({ ok: false, message: "A worktree round is already merging. Wait until it finishes." });
  }, 20_000);

  test("a conflict leaves the branch untouched, keeps the worktrees, and writes the Merge Drift", () => {
    initRepo();
    const first = changeOrder("First");
    commit("first");
    expect(acceptIntoWorktree(p, first, ready).ok).toBe(true);
    const second = secondChange("checkout/order.md", "### Cancelled (final)", "### Cancelled (final)\n\n### Found (final)", "Second");
    commit("second");
    expect(acceptIntoWorktree(p, second, ready).ok).toBe(true);
    const origin = roundOrigin(dir);
    if (origin === null) throw new Error("the round forgot its start");
    expect(mergeRound(p)).toEqual({ kind: "conflict" });
    expect(readFileSync(join(worktreePath(dir, "merge"), ".trama/merge-drift.md"), "utf8")).toContain("### Reconcile keeping every behaviour");
    expect(readFileSync(join(worktreePath(dir, "merge"), ".trama/merge-drift.md"), "utf8")).toContain("### Reconcile from the conflict markers");
    expect(runGit(worktreePath(dir, "merge"), ["rev-parse", "HEAD"])).toBe(origin.commit);
    expect(readFileSync(join(dir, ".trama/model/checkout/order.md"), "utf8")).not.toContain("### Lost (final)");
    expect(existsSync(worktreePath(dir, first))).toBe(true);
    expect(existsSync(worktreePath(dir, second))).toBe(true);
    expect(getProposal(p, first).data.status).toBe("open");
  }, 20_000);

  test("a Task still to do does not start the merge", () => {
    initRepo();
    const id = changeOrder();
    commit("proposal");
    expect(acceptIntoWorktree(p, id, ready).ok).toBe(true);
    newTask(projectAt(worktreePath(dir, id)), { title: "Still open", refs: ["order/Paid"], technical: false, proposal: id });
    expect(mergeRound(p)).toEqual({ kind: "pending" });
    expect(existsSync(worktreePath(dir, "merge"))).toBe(false);
  }, 20_000);

  test("a waiting merge lands once the folder is that branch and clean again", () => {
    initRepo();
    const id = changeOrder();
    commit("proposal");
    expect(acceptIntoWorktree(p, id, ready).ok).toBe(true);
    writeFileSync(join(dir, "dirty.txt"), "x\n");
    expect(mergeRound(p)).toEqual({ kind: "waiting", branch: "main" });
    expect(applyWaitingMerge(p)).toEqual({ kind: "waiting", branch: "main", again: true });
    expect(readFileSync(join(dir, ".trama/model/checkout/order.md"), "utf8")).not.toContain("### Lost (final)");
    rmSync(join(dir, "dirty.txt"));
    expect(applyWaitingMerge(p)).toEqual({ kind: "merged", features: ["checkout"] });
    expect(readFileSync(join(dir, ".trama/model/checkout/order.md"), "utf8")).toContain("### Lost (final)");
    expect(getProposal(p, id).data.status).toBe("approved");
    expect(existsSync(worktreePath(dir, id))).toBe(false);
    expect(existsSync(worktreePath(dir, "merge"))).toBe(false);
    expect(roundOrigin(dir)).toBeNull();
  }, 20_000);

  test("a waiting merge stays while the folder is on another branch, then lands back on the start branch", () => {
    initRepo();
    const id = changeOrder();
    commit("proposal");
    expect(acceptIntoWorktree(p, id, ready).ok).toBe(true);
    writeFileSync(join(dir, "dirty.txt"), "x\n");
    expect(mergeRound(p)).toEqual({ kind: "waiting", branch: "main" });
    rmSync(join(dir, "dirty.txt"));
    runGit(dir, ["checkout", "-b", "side"]);
    expect(applyWaitingMerge(p)).toEqual({ kind: "waiting", branch: "main", again: true });
    expect(readFileSync(join(dir, ".trama/model/checkout/order.md"), "utf8")).not.toContain("### Lost (final)");
    runGit(dir, ["checkout", "main"]);
    expect(applyWaitingMerge(p)).toEqual({ kind: "merged", features: ["checkout"] });
    expect(readFileSync(join(dir, ".trama/model/checkout/order.md"), "utf8")).toContain("### Lost (final)");
  }, 20_000);

  test("a committed Merge Drift and its Task are left out when the waiting merge lands", () => {
    initRepo();
    const id = changeOrder();
    commit("proposal");
    expect(acceptIntoWorktree(p, id, ready).ok).toBe(true);
    writeFileSync(join(dir, "dirty.txt"), "x\n");
    expect(mergeRound(p)).toEqual({ kind: "waiting", branch: "main" });
    const merge = worktreePath(dir, "merge");
    mkdirSync(join(merge, ".trama", "tasks"), { recursive: true });
    writeFileSync(join(merge, ".trama", "merge-drift.md"), "# Merge\n");
    writeFileSync(join(merge, ".trama", "tasks", "0001-reconcile.md"), "---\ncolumn: done\ntechnical: true\nrefs: []\ndrift: null\nproposal: null\nagent: false\nmerge: true\n---\n# Reconcile\n");
    runGit(merge, ["add", "-A"]);
    runGit(merge, ["commit", "-m", "agent kept them"]);
    rmSync(join(dir, "dirty.txt"));
    expect(applyWaitingMerge(p)).toEqual({ kind: "merged", features: ["checkout"] });
    expect(existsSync(join(dir, ".trama", "merge-drift.md"))).toBe(false);
    expect(existsSync(join(dir, ".trama", "tasks", "0001-reconcile.md"))).toBe(false);
    expect(readFileSync(join(dir, ".trama/model/checkout/order.md"), "utf8")).toContain("### Lost (final)");
  }, 20_000);

  test("an open reconciliation Task keeps the waiting merge from landing", () => {
    initRepo();
    const id = changeOrder();
    commit("proposal");
    expect(acceptIntoWorktree(p, id, ready).ok).toBe(true);
    writeFileSync(join(dir, "dirty.txt"), "x\n");
    expect(mergeRound(p)).toEqual({ kind: "waiting", branch: "main" });
    const merge = worktreePath(dir, "merge");
    mkdirSync(join(merge, ".trama", "tasks"), { recursive: true });
    writeFileSync(join(merge, ".trama", "tasks", "0001-reconcile.md"), "---\ncolumn: todo\ntechnical: true\nrefs: []\ndrift: null\nproposal: null\nagent: false\nmerge: true\n---\n# Reconcile\n");
    runGit(merge, ["add", "-A"]);
    runGit(merge, ["commit", "-m", "still reconciling"]);
    rmSync(join(dir, "dirty.txt"));
    expect(applyWaitingMerge(p)).toEqual({ kind: "pending" });
    expect(readFileSync(join(dir, ".trama/model/checkout/order.md"), "utf8")).not.toContain("### Lost (final)");
    expect(existsSync(worktreePath(dir, id))).toBe(true);
  }, 20_000);

  function conflicted(): { first: string; second: string } {
    initRepo();
    const first = changeOrder("First");
    commit("first");
    expect(acceptIntoWorktree(p, first, ready).ok).toBe(true);
    const second = secondChange("checkout/order.md", "### Cancelled (final)", "### Cancelled (final)\n\n### Found (final)", "Second");
    commit("second");
    expect(acceptIntoWorktree(p, second, ready).ok).toBe(true);
    expect(mergeRound(p)).toEqual({ kind: "conflict" });
    return { first, second };
  }

  test("a conflict puts the Merge Drift in To decide, and reconciling lands without the Drift or its Task", () => {
    const { first } = conflicted();
    const drift = buildSnapshot(p).drifts.find((item) => item.merge === true);
    expect(drift?.options.map((option) => option.title)).toEqual(["Reconcile keeping every behaviour", "Reconcile from the conflict markers"]);
    expect(driftComparison(drift!).keepShould.consequence).toBe("A Task is created to reconcile the conflicts");
    expect(driftComparison(drift!).keepHappens.consequence).toBe("Every Proposal in the round returns to To decide and the worktrees are deleted");
    expect(boardView(p).md).toContain("- Merge Drift: Merge");

    const started = reconcileMerge(p, 1);
    const task = getTask(projectAt(started.worktree), started.task);
    expect(task.data.technical).toBe(true);
    expect(task.data.proposal).toBeNull();
    expect(readFileSync(task.path, "utf8")).toContain("merge: true");
    expect(task.body).toContain("Reconcile keeping every behaviour");
    expect(() => reconcileMerge(p, 2)).toThrow("The round is already being reconciled.");
    expect(finishReconciliation(p)).toEqual({ kind: "stayed" });
    expect(readFileSync(join(dir, ".trama/model/checkout/order.md"), "utf8")).not.toContain("### Lost (final)");

    const resolved = readFileSync(join(started.worktree, ".trama/model/checkout/order.md"), "utf8").replace("### Cancelled (final)", "### Cancelled (final)\n\n### Lost (final)\n\n### Found (final)");
    writeFileSync(join(started.worktree, ".trama/model/checkout/order.md"), resolved);
    writeFileSync(task.path, readFileSync(task.path, "utf8").replace("column: todo", "column: done"));
    expect(finishReconciliation(p)).toEqual({ kind: "merged", features: ["checkout"] });
    const landed = readFileSync(join(dir, ".trama/model/checkout/order.md"), "utf8");
    expect(landed).toContain("### Lost (final)");
    expect(landed).toContain("### Found (final)");
    expect(landed).not.toContain("<<<<<<<");
    expect(existsSync(join(dir, ".trama/merge-drift.md"))).toBe(false);
    expect(existsSync(join(dir, ".trama/tasks", task.name))).toBe(false);
    expect(getProposal(p, first).data.status).toBe("approved");
    expect(existsSync(worktreePath(dir, "merge"))).toBe(false);
  }, 20_000);

  test("conflict markers stay out of the open folder and the round remains in conflict", () => {
    conflicted();
    const started = reconcileMerge(p, 1);
    const task = getTask(projectAt(started.worktree), started.task);
    const marked = readFileSync(join(started.worktree, ".trama/model/checkout/order.md"), "utf8").replace("### Cancelled (final)", "### Cancelled (final)\n<<<<<<< HEAD\n### Lost (final)\n=======\n### Found (final)\n>>>>>>> other");
    writeFileSync(join(started.worktree, ".trama/model/checkout/order.md"), marked);
    writeFileSync(task.path, readFileSync(task.path, "utf8").replace("column: todo", "column: done"));
    expect(finishReconciliation(p)).toEqual({ kind: "conflict" });
    expect(readFileSync(join(dir, ".trama/model/checkout/order.md"), "utf8")).not.toContain("<<<<<<<");
    expect(existsSync(join(worktreePath(dir, "merge"), ".trama/merge-drift.md"))).toBe(true);
    expect(existsSync(task.path)).toBe(false);
  }, 20_000);

  test("abandoning from conflict or from waiting returns every Proposal to decide and leaves the branch", () => {
    const { first, second } = conflicted();
    const branch = runGit(dir, ["rev-parse", "--abbrev-ref", "HEAD"]);
    const commitBefore = runGit(dir, ["rev-parse", "HEAD"]);
    abandonRound(p);
    expect(runGit(dir, ["rev-parse", "--abbrev-ref", "HEAD"])).toBe(branch);
    expect(runGit(dir, ["rev-parse", "HEAD"])).toBe(commitBefore);
    expect(getProposal(p, first).data.status).toBe("open");
    expect(getProposal(p, second).data.status).toBe("open");
    expect(existsSync(worktreePath(dir, first))).toBe(false);
    expect(existsSync(worktreePath(dir, "merge"))).toBe(false);
    expect(readFileSync(join(dir, ".trama/model/checkout/order.md"), "utf8")).not.toContain("### Lost (final)");
    expect(buildSnapshot(p).drifts.some((item) => item.merge === true)).toBe(false);

    const id = changeOrder("Later");
    commit("later");
    expect(acceptIntoWorktree(p, id, ready).ok).toBe(true);
    writeFileSync(join(dir, "dirty.txt"), "x\n");
    expect(mergeRound(p)).toEqual({ kind: "waiting", branch: "main" });
    const waitingBranch = runGit(dir, ["rev-parse", "HEAD"]);
    abandonRound(p);
    expect(runGit(dir, ["rev-parse", "HEAD"])).toBe(waitingBranch);
    expect(getProposal(p, id).data.status).toBe("open");
    expect(existsSync(worktreePath(dir, id))).toBe(false);
    expect(existsSync(worktreePath(dir, "merge"))).toBe(false);
    expect(readFileSync(join(dir, ".trama/model/checkout/order.md"), "utf8")).not.toContain("### Lost (final)");
  }, 20_000);

  test("an existing merge branch refuses the union and says why", () => {
    initRepo();
    const id = changeOrder();
    commit("proposal");
    expect(acceptIntoWorktree(p, id, ready).ok).toBe(true);
    mkdirSync(worktreesHome(dir), { recursive: true });
    runGit(dir, ["branch", "trama/merge"]);
    const outcome = mergeRound(p);
    expect(outcome.kind).toBe("refused");
    if (outcome.kind === "refused") expect(outcome.message.toLowerCase()).toContain("trama/merge");
    expect(existsSync(worktreePath(dir, "merge"))).toBe(false);
    expect(existsSync(worktreePath(dir, id))).toBe(true);
  }, 20_000);
});
