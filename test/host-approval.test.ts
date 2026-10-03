import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type ApprovalOptions, applyApprovedProposal } from "../extension/src/host/approval";
import { approveProposal, editInProposal, getProposal, newProposal } from "../src/core/proposals";
import { handOver } from "./handover";
import { type Project, projectAt } from "../src/core/store";
import { newDrift, resolveDrift } from "../src/core/work";

let dir: string;
let p: Project;
let scans: string[][];
let scanned: string[];
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-approval-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
  scans = [];
  scanned = [];
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const options = (over: Partial<ApprovalOptions> = {}): ApprovalOptions => ({
  project: p,
  autoScan: true,
  agentConfigured: true,
  launchScan: async (features, proposal) => {
    scans.push(features);
    scanned.push(proposal);
  },
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
    expect(scans).toEqual([["checkout"]]);
    expect(scanned).toEqual([id]);
    expect(getProposal(p, id).data.status).toBe("approved");
  });

  test("an import Proposal describes the code as it is, so approving it starts no Scan", async () => {
    const prop = newProposal(p, "Import: checkout", "", { kind: "import" });
    const file = editInProposal(p, prop.id, "checkout/order.md");
    writeFileSync(file, orderChange(readFileSync(file, "utf8")));
    handOver(p, prop.id);
    await applyApprovedProposal(options(), prop.id, () => approveProposal(p, prop.id));
    expect(scans).toEqual([]);
    expect(getProposal(p, prop.id).data.status).toBe("approved");
  });

  test("accepting a Drift's attached Proposal launches exactly one Scan", async () => {
    const id = proposalEditing("checkout/order.md", orderChange);
    const drift = newDrift(p, { title: "Code has Lost", refs: ["order"], proposal: id });
    await applyApprovedProposal(options(), id, () => resolveDrift(p, drift.id, "accept-proposal"));
    expect(scans).toEqual([["checkout"]]);
    expect(scanned).toEqual([id]);
    expect(getProposal(p, id).data.status).toBe("approved");
  });

  test("an Actor-only Proposal scans the Features that react to that Actor", async () => {
    const id = proposalEditing("actors/user.md", (t) => t.replace("The user asks to cancel an order.", "The user asks to cancel an order early."));
    await applyApprovedProposal(options(), id, () => approveProposal(p, id));
    expect(scans).toEqual([["checkout"]]);
  });

  test("a Proposal that affects no Feature launches nothing", async () => {
    const id = proposalEditing("system.md", (t) => `${t}\nMore.\n`);
    await applyApprovedProposal(options(), id, () => approveProposal(p, id));
    expect(scans).toEqual([]);
    expect(getProposal(p, id).data.status).toBe("approved");
  });

  test("autoScan off, or no agent command configured: approved, nothing launched", async () => {
    const a = proposalEditing("checkout/order.md", orderChange);
    await applyApprovedProposal(options({ autoScan: false }), a, () => approveProposal(p, a));
    const b = proposalEditing("checkout/payment.md", (t) => t.replace("### Refunded (final)", "### Refunded (final)\n### Lost (final)"));
    await applyApprovedProposal(options({ agentConfigured: false }), b, () => approveProposal(p, b));
    expect(scans).toEqual([]);
    expect([getProposal(p, a).data.status, getProposal(p, b).data.status]).toEqual(["approved", "approved"]);
  });

  test("a failed approval launches nothing and propagates the error", async () => {
    const id = proposalEditing("checkout/order.md", orderChange);
    writeFileSync(join(dir, ".trama/model/checkout/order.md"), `${readFileSync(join(dir, ".trama/model/checkout/order.md"), "utf8")}\n`);
    await expect(applyApprovedProposal(options(), id, () => approveProposal(p, id))).rejects.toThrow(/stale/);
    expect(scans).toEqual([]);
  });

  test("accepting a Drift without an attached Proposal is refused before anything happens", async () => {
    const id = proposalEditing("checkout/order.md", orderChange);
    const drift = newDrift(p, { title: "Plain", refs: ["order"] });
    await expect(applyApprovedProposal(options(), id, () => resolveDrift(p, drift.id, "accept-proposal"))).rejects.toThrow(/no attached Proposal/);
    expect(scans).toEqual([]);
    expect(getProposal(p, id).data.status).toBe("open");
  });
});
