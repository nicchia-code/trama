import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildModel } from "../src/core/model";
import { approveProposal, editInProposal, getProposal, newProposal } from "../src/core/proposals";
import { run } from "../src/cli/main";
import { handOver } from "./handover";
import type { ScanScopeEntry } from "../src/core/scan-scope";
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
  test("unchanged registered Model files do not affect any Feature", () => {
    const prop = newProposal(p, "Unchanged");
    for (const path of ["checkout/order.md", "checkout/feature.md", "actors/user.md"]) editInProposal(p, prop.id, path);
    expect(proposalScope(p, prop.id)).toEqual([]);
  });

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
    const area = "requirements/ui/area.md";
    expect(proposalScope(p, proposalEditing(area, (t) => t.replace("shown to customers", "shown to customers and couriers")))).toEqual(["billing", "checkout"]);
    expect(proposalScope(p, proposalEditing(area, (t) => t.replace("# Interface\n", "# Interface\n\nApplies everywhere.\n")))).toEqual(["billing", "checkout"]);
    expect(proposalScope(p, proposalEditing("requirements/ui/main.md", (t) => t.replace("- Mobile first;", "- Mobile first, always;")))).toEqual(["billing", "checkout"]);
  });

  test("a change to another section affects only the Features of the element it names", () => {
    expect(proposalScope(p, proposalEditing("requirements/ui/main.md", (t) => `${t.trimEnd()}\n- One more rule.\n`))).toEqual(["checkout"]);
  });

  test("sections are compared by Area and reference whichever fragment holds them; fragment titles, descriptions and new fragments affect nothing", () => {
    const split = newProposal(p, "Split");
    const main = readFileSync(join(dir, ".trama/requirements/ui/main.md"), "utf8");
    const [head, rest] = main.split("## General\n") as [string, string];
    const [general, others] = rest.split("## checkout\n") as [string, string];
    writeFileSync(editInProposal(p, split.id, "requirements/ui/main.md"), `${head.replace("# Interface", "# Screens").replace("shown to customers", "shown anywhere")}## checkout\n${others}`);
    writeFileSync(editInProposal(p, split.id, "requirements/ui/general.md"), `---\ndescription: "Everywhere."\n---\n# Everywhere\n\n## General\n${general}`);
    writeFileSync(editInProposal(p, split.id, "requirements/ui/empty.md"), `---\ndescription: "Nothing yet."\n---\n# Empty\n`);
    expect(proposalScope(p, split.id)).toEqual([]);

    const moved = newProposal(p, "Move and change General");
    writeFileSync(editInProposal(p, moved.id, "requirements/ui/main.md"), `${head}## checkout\n${others}`);
    writeFileSync(editInProposal(p, moved.id, "requirements/ui/general.md"), `---\ndescription: "Everywhere."\n---\n# Everywhere\n\n## General\n${general.replace("Mobile first", "Desktop first")}`);
    expect(proposalScope(p, moved.id)).toEqual(["billing", "checkout"]);
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

describe("scan scope written at approval", () => {
  test("lists changed States, Transitions, Events and sections, removed elements as their container, and the Transitions leading into them", () => {
    const prop = newProposal(p, "Change");
    const order = editInProposal(p, prop.id, "checkout/order.md");
    writeFileSync(
      order,
      readFileSync(order, "utf8")
        .replace("only if the cart is not empty.", "only if the cart is not empty and the address is set.")
        .replace("### Paid\n", "### Paid\nMoney received.\n")
        .replace("- `user.CANCEL` → Refunding: once preparation has started.\n", "")
        .replace("### Refunding\n- `payment.REFUNDED` → Cancelled\n\n", "")
        .replace("Emitted when a paid order is cancelled", "Emitted when a paid order is cancelled by the customer"),
    );
    const ui = editInProposal(p, prop.id, "requirements/ui/main.md");
    writeFileSync(ui, readFileSync(ui, "utf8").replace('A green "Paid" badge', 'A blue "Paid" badge'));
    handOver(p, prop.id);
    expect(getProposal(p, prop.id).data.scanScope).toBeNull();
    approveProposal(p, prop.id);
    const expected: ScanScopeEntry[] = [
      { ref: "order/Draft/cart.CONFIRM", reason: "changed" },
      { ref: "order/Paid", reason: "changed" },
      { ref: "order", reason: "removed, its container" },
      { ref: "order.REFUND_REQUESTED", reason: "changed" },
      { ref: "order/Awaiting payment/payment.SUCCEEDED", reason: "leads into a change" },
      { ref: "payment/Paid/order.REFUND_REQUESTED", reason: "leads into a change" },
      { ref: "requirements/ui#order/Paid", reason: "changed" },
    ];
    expect(getProposal(p, prop.id).data.scanScope).toEqual(expected);

    const shown = run(["--root", dir, "proposal", "show", prop.id], dir, {});
    expect(shown.out).toContain("## Scan scope\n- `order/Draft/cart.CONFIRM` (changed)\n- `order/Paid` (changed)\n- `order` (removed, its container)");
    expect(JSON.parse(run(["--root", dir, "proposal", "show", prop.id, "--json"], dir, {}).out).scanScope).toEqual(expected);
  });

  test("a new Machine enters whole, and a changed State brings its Transitions and those entering it", () => {
    const prop = newProposal(p, "Gift");
    writeFileSync(editInProposal(p, prop.id, "checkout/gift.md"), "# Gift\n\n## States\n\n### Wrapped (initial)\n- `user.CANCEL` → Unwrapped\n\n### Unwrapped (final)\n\n## Events\n\n### OPENED\nThe gift is opened.\n");
    const order = editInProposal(p, prop.id, "checkout/order.md");
    writeFileSync(order, readFileSync(order, "utf8").replace("### Shipped (final)", "### Shipped\n- `gift.OPENED` → Cancelled"));
    handOver(p, prop.id);
    approveProposal(p, prop.id);
    expect(getProposal(p, prop.id).data.scanScope).toEqual([
      { ref: "gift", reason: "changed" },
      { ref: "order/Shipped", reason: "changed" },
      { ref: "order/Ready to ship/courier.PICKED_UP", reason: "leads into a change" },
    ]);
  });

  test("an import, a Proposal not approved yet, and one approved before the field have no scan scope and no section", () => {
    const imported = newProposal(p, "Imported", "", { kind: "import" });
    const file = editInProposal(p, imported.id, "checkout/order.md");
    writeFileSync(file, readFileSync(file, "utf8").replace("### Paid\n", "### Paid\nMoney received.\n"));
    handOver(p, imported.id);
    approveProposal(p, imported.id);
    expect(getProposal(p, imported.id).data.scanScope).toBeNull();
    expect(run(["--root", dir, "proposal", "show", imported.id], dir, {}).out).not.toContain("## Scan scope");
    expect(JSON.parse(run(["--root", dir, "proposal", "show", imported.id, "--json"], dir, {}).out)).not.toHaveProperty("scanScope");
  });
});
