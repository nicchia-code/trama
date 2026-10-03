import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildModel } from "../src/core/model";
import { editInProposal, newProposal } from "../src/core/proposals";
import { affectedFeatures, proposalScope } from "../src/core/scope";
import { type Project, projectAt, readModelFiles } from "../src/core/store";

let dir: string;
let p: Project;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-scope-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function proposalEditing(path: string, transform: (text: string) => string): string {
  const prop = newProposal(p, "Change");
  const file = editInProposal(p, prop.id, path);
  writeFileSync(file, transform(readFileSync(file, "utf8")));
  return prop.id;
}

describe("proposalScope", () => {
  test("a Machine change affects its Feature", () => {
    expect(proposalScope(p, proposalEditing("checkout/order.md", (t) => `${t}\n`))).toEqual(["checkout"]);
  });

  test("an Actor-only change affects the Features whose Machines react to that Actor", () => {
    const id = proposalEditing("actors/user.md", (t) => t.replace("The user asks to cancel an order.", "The user asks to cancel an order before it ships."));
    expect(proposalScope(p, id)).toEqual(["checkout"]);
  });

  test("a new Actor nothing reacts to affects nothing", () => {
    const prop = newProposal(p, "New actor");
    writeFileSync(editInProposal(p, prop.id, "actors/carrier.md"), "# Carrier\n\nAnother courier.\n\n## Events\n\n### LOST\nThe parcel is lost.\n");
    expect(proposalScope(p, prop.id)).toEqual([]);
  });

  test("a Feature description change affects that Feature, a System description change none", () => {
    expect(proposalScope(p, proposalEditing("checkout/feature.md", (t) => `${t}\nMore words.\n`))).toEqual(["checkout"]);
    expect(proposalScope(p, proposalEditing("system.md", (t) => `${t}\nMore words.\n`))).toEqual([]);
  });

  test("a brand-new Feature is in scope", () => {
    const prop = newProposal(p, "Billing");
    writeFileSync(editInProposal(p, prop.id, "billing/feature.md"), "# Billing\n\nInvoices.\n");
    writeFileSync(editInProposal(p, prop.id, "billing/invoice.md"), "# Invoice\n\n## States\n\n### Open (initial)\n");
    expect(proposalScope(p, prop.id)).toEqual(["billing"]);
  });
});

describe("proposalScope for Requirements", () => {
  beforeEach(() => {
    mkdirSync(join(dir, ".trama/model/billing"), { recursive: true });
    writeFileSync(join(dir, ".trama/model/billing/feature.md"), "# Billing\n\nInvoices.\n");
    writeFileSync(join(dir, ".trama/model/billing/invoice.md"), "# Invoice\n\n## States\n\n### Open (initial)\n");
  });

  test("a change to an Area's description, introduction or General section affects every Feature", () => {
    const area = "requirements/ui.md";
    expect(proposalScope(p, proposalEditing(area, (t) => t.replace("shown to customers", "shown to customers and couriers")))).toEqual(["billing", "checkout"]);
    expect(proposalScope(p, proposalEditing(area, (t) => t.replace("# Interface\n", "# Interface\n\nApplies everywhere.\n")))).toEqual(["billing", "checkout"]);
    expect(proposalScope(p, proposalEditing(area, (t) => t.replace("- Mobile first;", "- Mobile first, always;")))).toEqual(["billing", "checkout"]);
  });

  test("a change to another section affects only the Features of the element it names", () => {
    expect(proposalScope(p, proposalEditing("requirements/ui.md", (t) => `${t.trimEnd()}\n- One more rule.\n`))).toEqual(["checkout"]);
  });
});

describe("affectedFeatures", () => {
  test("a Feature that no longer exists is dropped, and scope is sorted without repeats", () => {
    const files = readModelFiles(p);
    const before = buildModel(files);
    const gone = new Map(files);
    for (const path of files.keys()) if (path.startsWith("checkout/")) gone.delete(path);
    expect(affectedFeatures(before, buildModel(gone), ["checkout/order.md", "checkout/cart.md"])).toEqual([]);
    expect(affectedFeatures(before, before, ["checkout/payment.md", "checkout/order.md", "actors/user.md"])).toEqual(["checkout"]);
  });
});
