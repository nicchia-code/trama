import { afterEach, beforeEach, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { approveProposal, changes, editInProposal, getProposal, health, newProposal, rejectProposal, validateProposal } from "../src/core/proposals";
import { buildSnapshot } from "../src/core/snapshot";
import { loadModel, type Project, projectAt } from "../src/core/store";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-requires-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const BANK = "# Bank\n\nThe bank.\n\n## Events\n\n### TRANSFER_RECEIVED\nMoney arrived.\n";
const INVOICE = "# Invoice\n\nA bill.\n\n## States\n\n### Open (initial)\n- `bank.TRANSFER_RECEIVED` → Paid\n\n### Paid (final)\n";

/** 0001 adds the bank Actor; 0002 adds a billing Feature reacting to it, on top of 0001. */
function chain() {
  const actors = newProposal(p, "Bank");
  writeFileSync(editInProposal(p, actors.id, "actors/bank.md"), BANK);
  const billing = newProposal(p, "Billing", "", { requires: ["1"] });
  writeFileSync(editInProposal(p, billing.id, "billing/feature.md"), "# Billing\n\nInvoices.\n");
  writeFileSync(editInProposal(p, billing.id, "billing/invoice.md"), INVOICE);
  return { actors: actors.id, billing: billing.id };
}

test("a Proposal is validated on top of the one it requires and shows only its own changes", () => {
  const { billing } = chain();
  expect(validateProposal(p, getProposal(p, billing))).toEqual([]);
  expect(changes(p, getProposal(p, billing)).map((c) => c.path)).toEqual(["billing/feature.md", "billing/invoice.md"]);

  const alone = newProposal(p, "Billing alone");
  writeFileSync(editInProposal(p, alone.id, "billing/feature.md"), "# Billing\n\nInvoices.\n");
  writeFileSync(editInProposal(p, alone.id, "billing/invoice.md"), INVOICE);
  expect(validateProposal(p, getProposal(p, alone.id)).map((d) => d.message).join()).toContain("bank");
});

test("it can be approved only after what it requires, and approving that does not make it stale", () => {
  const { actors, billing } = chain();
  expect(() => approveProposal(p, billing)).toThrow(/Proposal 0001 "Bank" is not approved yet/);
  approveProposal(p, actors);
  expect(health(p, getProposal(p, billing))).toEqual({ stale: [], unbased: [], requires: [] });
  approveProposal(p, billing);
  expect(loadModel(p).machines.get("invoice")?.feature).toBe("billing");
});

test("editing a file the required Proposal adds starts from that Proposal's version", () => {
  chain();
  const more = newProposal(p, "Bank refunds", "", { requires: ["1"] });
  expect(readFileSync(editInProposal(p, more.id, "actors/bank.md"), "utf8")).toBe(BANK);
  approveProposal(p, "1");
  expect(health(p, getProposal(p, more.id)).stale).toEqual([]);
});

test("a rejected requirement blocks the Proposal, and a new Proposal cannot require it", () => {
  const { actors, billing } = chain();
  rejectProposal(p, actors, "No bank");
  expect(health(p, getProposal(p, billing)).requires).toEqual([{ id: "0001", title: "Bank", status: "rejected" }]);
  expect(() => approveProposal(p, billing)).toThrow(/was rejected/);
  expect(() => newProposal(p, "Later", "", { requires: [actors] })).toThrow(/was rejected/);
});

test("Proposals that require each other are reported as a cycle, not followed forever", () => {
  const { actors, billing } = chain();
  const file = join(getProposal(p, actors).dir, "proposal.md");
  writeFileSync(file, readFileSync(file, "utf8").replace("status: open\n", `status: open\nrequires:\n  - "${billing}"\n`));
  expect(health(p, getProposal(p, billing)).requires.map((r) => r.status)).toEqual(["cycle", "open"]);
  expect(() => approveProposal(p, billing)).toThrow(/cycle/);
});

test("the Diagram draws a dependent Proposal over the Model with its requirements applied", () => {
  const { billing } = chain();
  const view = buildSnapshot(p).proposals.find((x) => x.id === billing);
  expect(view?.base?.actors.map((a) => a.id)).toContain("bank");
  expect(view?.actors).toEqual([]);
  expect(view?.machines.map((m) => [m.id, m.change])).toEqual([["invoice", "added"]]);
  expect(buildSnapshot(p).proposals.find((x) => x.id === "0001")?.base).toBeNull();
});
