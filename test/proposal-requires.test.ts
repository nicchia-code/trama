import { afterEach, beforeEach, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { approveProposal, changes, editInProposal, getProposal, health, newProposal, rejectProposal, validateProposal } from "../src/core/proposals";
import { buildSnapshot } from "../src/core/snapshot";
import { cardName } from "../src/core/short-numbers";
import { loadModel, type Project, projectAt } from "../src/core/store";
import { handOver } from "./handover";

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

/** The first Proposal adds the bank Actor; the second adds a billing Feature reacting to it, on top of the first. */
function chain() {
  const actors = newProposal(p, "Bank");
  writeFileSync(editInProposal(p, actors.id, "actors/bank.md"), BANK);
  const billing = newProposal(p, "Billing", "", { requires: [actors.id] });
  writeFileSync(editInProposal(p, billing.id, "billing/feature.md"), "# Billing\n\nInvoices.\n");
  writeFileSync(editInProposal(p, billing.id, "billing/invoice.md"), INVOICE);
  handOver(p, actors.id, billing.id);
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
  expect(() => approveProposal(p, billing)).toThrow(new RegExp(`Proposal ${cardName(p, "proposal", actors)} "Bank" is not approved yet`));
  approveProposal(p, actors);
  expect(health(p, getProposal(p, billing))).toEqual({ stale: [], unbased: [], requires: [] });
  approveProposal(p, billing);
  expect(loadModel(p).machines.get("invoice")?.feature).toBe("billing");
});

test("editing a file the required Proposal adds starts from that Proposal's version", () => {
  const { actors } = chain();
  const more = newProposal(p, "Bank refunds", "", { requires: [actors] });
  expect(readFileSync(editInProposal(p, more.id, "actors/bank.md"), "utf8")).toBe(BANK);
  approveProposal(p, actors);
  expect(health(p, getProposal(p, more.id)).stale).toEqual([]);
});

test("a rejected requirement blocks the Proposal, and a new Proposal cannot require it", () => {
  const { actors, billing } = chain();
  rejectProposal(p, actors, "No bank");
  expect(health(p, getProposal(p, billing)).requires).toEqual([{ id: actors, title: "Bank", status: "rejected" }]);
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

test("a cycle further down the chain also blocks the Proposals that require it", () => {
  const a = newProposal(p, "A");
  const b = newProposal(p, "B", "", { requires: [a.id] });
  const c = newProposal(p, "C", "", { requires: [b.id] });
  const file = join(getProposal(p, b.id).dir, "proposal.md");
  writeFileSync(file, readFileSync(file, "utf8").replaceAll(a.id, c.id));
  const top = newProposal(p, "Top", "", { requires: [b.id] });
  handOver(p, top.id);
  expect(health(p, getProposal(p, top.id)).requires.map((r) => [r.id, r.status])).toContainEqual([b.id, "cycle"]);
  expect(() => approveProposal(p, top.id)).toThrow(/cycle/);
});

test("the Diagram draws a dependent Proposal over the Model with its requirements applied", () => {
  const { actors, billing } = chain();
  const view = buildSnapshot(p).proposals.find((x) => x.id === billing);
  expect(view?.base?.actors.map((a) => a.id)).toContain("bank");
  expect(view?.actors).toEqual([]);
  expect(view?.machines.map((m) => [m.id, m.change])).toEqual([["invoice", "added"]]);
  expect(buildSnapshot(p).proposals.find((x) => x.id === actors)?.base).toBeNull();
});

test("a Proposal file that is no valid Machine leaves the snapshot readable and reports its errors", () => {
  const prop = newProposal(p, "Clash");
  writeFileSync(editInProposal(p, prop.id, "billing/user.md"), "# User\n\nx.\n\n## States\n\n### A (initial)\n");
  writeFileSync(editInProposal(p, prop.id, "billing/Invoice_Item.md"), "# Item\n\nx.\n\n## States\n\n### A (initial)\n");
  handOver(p, prop.id);
  const view = buildSnapshot(p).proposals.find((x) => x.id === prop.id);
  expect(view?.machines).toEqual([]);
  expect(view?.errors.map((d) => d.file).sort()).toEqual(["billing/Invoice_Item.md", "billing/user.md"]);
});
