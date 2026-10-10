import { FIX_OPTIONS } from "./fix-options";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type ApprovalOptions, applyApprovedProposal } from "../extension/src/host/approval";
import { approvalInbox, takeApprovedNotices } from "../src/core/approve-request";
import { run } from "../src/cli/main";
import { approveProposal, editInProposal, getProposal, newProposal } from "../src/core/proposals";
import { handOver } from "./handover";
import { type Project, projectAt } from "../src/core/store";
import { newDrift, resolveDrift } from "../src/core/work";
import { cardName } from "../src/core/short-numbers";

let dir: string;
let p: Project;
let scanned: string[];
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-approval-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
  scanned = [];
});
afterEach(() => {
  rmSync(approvalInbox(p), { recursive: true, force: true });
  rmSync(dir, { recursive: true, force: true });
});

const options = (over: Partial<ApprovalOptions> = {}): ApprovalOptions => ({
  project: p,
  autoScan: true,
  launchScan: async (proposal) => {
    scanned.push(proposal);
  },
  warn: () => {},
  ...over,
});

function proposalEditing(path: string, transform: (text: string) => string): string {
  const prop = newProposal(p, "Change");
  const file = editInProposal(p, prop.id, path);
  writeFileSync(file, transform(readFileSync(file, "utf8")));
  handOver(p, prop.id);
  return prop.id;
}

const orderChange = (t: string) => t.replace("### Cancelled (final)", "### Cancelled (final)\n\n### Lost (final)");

describe("one Scan after every approved Proposal", () => {
  test("the Approve button", async () => {
    const id = proposalEditing("checkout/order.md", orderChange);
    await applyApprovedProposal(options(), id, () => approveProposal(p, id));
    expect(scanned).toEqual([id]);
    expect(getProposal(p, id).data.status).toBe("approved");
  });

  test("an import Proposal describes the code as it is, so approving it starts no Scan", async () => {
    const prop = newProposal(p, "Import: checkout", "", { kind: "import" });
    const file = editInProposal(p, prop.id, "checkout/order.md");
    writeFileSync(file, orderChange(readFileSync(file, "utf8")));
    handOver(p, prop.id);
    await applyApprovedProposal(options(), prop.id, () => approveProposal(p, prop.id));
    expect(scanned).toEqual([]);
    expect(getProposal(p, prop.id).data.status).toBe("approved");
  });

  test("accepting a Drift's attached Proposal launches exactly one Scan", async () => {
    const id = proposalEditing("checkout/order.md", orderChange);
    const drift = newDrift(p, { options: FIX_OPTIONS, title: "Code has Lost", refs: ["order"], proposal: id, happens: "The code does it one way.", should: "The Model says another." });
    await applyApprovedProposal(options(), id, () => resolveDrift(p, drift.id, "accept-proposal"));
    expect(scanned).toEqual([id]);
    expect(getProposal(p, id).data.status).toBe("approved");
  });

  test("an Actor-only Proposal scans the Features that react to that Actor", async () => {
    const id = proposalEditing("actors/user.md", (t) => t.replace("The user asks to cancel an order.", "The user asks to cancel an order early."));
    await applyApprovedProposal(options(), id, () => approveProposal(p, id));
    expect(scanned).toEqual([id]);
  });

  test("a Proposal that affects no Feature launches nothing", async () => {
    const id = proposalEditing("system.md", (t) => `${t}\nMore.\n`);
    await applyApprovedProposal(options(), id, () => approveProposal(p, id));
    expect(scanned).toEqual([]);
    expect(getProposal(p, id).data.status).toBe("approved");
  });

  test("autoScan off skips launch; the selected default agent is available for eligible scans", async () => {
    const a = proposalEditing("checkout/order.md", orderChange);
    await applyApprovedProposal(options({ autoScan: false }), a, () => approveProposal(p, a));
    const b = proposalEditing("checkout/payment.md", (t) => t.replace("### Refunded (final)", "### Refunded (final)\n### Lost (final)"));
    await applyApprovedProposal(options(), b, () => approveProposal(p, b));
    expect(scanned).toEqual([b]);
    expect([getProposal(p, a).data.status, getProposal(p, b).data.status]).toEqual(["approved", "approved"]);
  });

  test("a failed approval launches nothing and propagates the error", async () => {
    const id = proposalEditing("checkout/order.md", orderChange);
    writeFileSync(join(dir, ".trama/model/checkout/order.md"), `${readFileSync(join(dir, ".trama/model/checkout/order.md"), "utf8")}\n`);
    await expect(applyApprovedProposal(options(), id, () => approveProposal(p, id))).rejects.toThrow(/stale/);
    expect(scanned).toEqual([]);
  });

  test("accepting a Drift without an attached Proposal is refused before anything happens", async () => {
    const id = proposalEditing("checkout/order.md", orderChange);
    const drift = newDrift(p, { options: FIX_OPTIONS, title: "Plain", refs: ["order"], happens: "The code does it one way.", should: "The Model says another." });
    await expect(applyApprovedProposal(options(), id, () => resolveDrift(p, drift.id, "accept-proposal"))).rejects.toThrow(/no attached Proposal/);
    expect(scanned).toEqual([]);
    expect(getProposal(p, id).data.status).toBe("open");
  });
});

test("an old Hold scan switch does not delay an eligible automatic scan or change the old state", async () => {
  const state = join(dir, ".trama/scan-hold/state");
  mkdirSync(join(dir, ".trama/scan-hold"), { recursive: true });
  writeFileSync(state, "on\n");
  const id = proposalEditing("checkout/order.md", orderChange);
  await applyApprovedProposal(options(), id, () => approveProposal(p, id));
  expect(scanned).toEqual([id]);
  expect(readFileSync(state, "utf8")).toBe("on\n");
});


describe("an approval from the command line reaches the open editor's automatic scan", () => {
  const cli = (...args: string[]) => run(["--root", dir, ...args], dir, {});

  test("trama proposal approve leaves one notice, taken by one window only", () => {
    const since = Date.now();
    const id = proposalEditing("checkout/order.md", orderChange);
    cli("proposal", "approve", id);
    expect(getProposal(p, id).data.status).toBe("approved");
    expect(takeApprovedNotices(p, since)).toEqual([id]);
    expect(takeApprovedNotices(p, since)).toEqual([]);
  });

  test("trama drift resolve --accept-proposal leaves a notice for the attached Proposal", () => {
    const since = Date.now();
    const id = proposalEditing("checkout/order.md", orderChange);
    const drift = newDrift(p, { options: FIX_OPTIONS, title: "Code has Lost", refs: ["order"], proposal: id, happens: "The code does it one way.", should: "The Model says another." });
    cli("drift", "resolve", drift.id, "--accept-proposal");
    expect(getProposal(p, id).data.status).toBe("approved");
    expect(takeApprovedNotices(p, since)).toEqual([id]);
  });

  test("an import, or a change that affects no Feature, leaves none", () => {
    const since = Date.now();
    const prop = newProposal(p, "Import: checkout", "", { kind: "import" });
    const file = editInProposal(p, prop.id, "checkout/order.md");
    writeFileSync(file, orderChange(readFileSync(file, "utf8")));
    handOver(p, prop.id);
    cli("proposal", "approve", prop.id);
    const system = proposalEditing("system.md", (t) => `${t}\nMore.\n`);
    cli("proposal", "approve", system);
    expect([getProposal(p, prop.id).data.status, getProposal(p, system).data.status]).toEqual(["approved", "approved"]);
    expect(takeApprovedNotices(p, since)).toEqual([]);
  });

  test("a notice left before the editor started starts nothing and is removed", () => {
    const id = proposalEditing("checkout/order.md", orderChange);
    cli("proposal", "approve", id);
    expect(takeApprovedNotices(p, Date.now() + 60_000)).toEqual([]);
    expect(takeApprovedNotices(p, 0)).toEqual([]);
  });

  test("a leftover multi-branch switch is ignored: the Proposal is applied here and the folder is left as it was", () => {
    const leftover = join(p.dir, "multi-branch");
    mkdirSync(leftover, { recursive: true });
    writeFileSync(join(leftover, "state"), "on\n");
    const id = proposalEditing("checkout/order.md", orderChange);
    expect(cli("proposal", "approve", id).out).toBe(`Approved Proposal ${cardName(p, "proposal", id)}`);
    expect(getProposal(p, id).data.status).toBe("approved");
    expect(getProposal(p, id).data.scanScope).not.toBeNull();
    expect(readFileSync(join(leftover, "state"), "utf8")).toBe("on\n");
    expect(() => cli("proposal", "withdraw", id)).toThrow();
  });
});
