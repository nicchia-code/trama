import { FIX_OPTIONS } from "./fix-options";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  approveProposal,
  deleteInProposal,
  discardProposal,
  editInProposal,
  getProposal,
  health,
  newProposal,
  rejectProposal,
  submitProposal,
} from "../src/core/proposals";
import { cardName } from "../src/core/short-numbers";
import { loadModel, type Project, projectAt } from "../src/core/store";
import { newDrift, resolveDrift } from "../src/core/work";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-draft-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const addLost = (t: string) => t.replace("### Cancelled (final)", "### Cancelled (final)\n\n### Lost (final)");

function writeOrder(id: string, transform: (text: string) => string = addLost) {
  const file = editInProposal(p, id, "checkout/order.md");
  writeFileSync(file, transform(readFileSync(file, "utf8")));
}

describe("a Proposal the agent is still writing", () => {
  test("starts as a Draft and cannot be approved, rejected or accepted through a Drift", () => {
    const prop = newProposal(p, "Lost");
    writeOrder(prop.id);
    expect(getProposal(p, prop.id).data.status).toBe("draft");
    expect(() => approveProposal(p, prop.id)).toThrow(/still being written/);
    expect(() => rejectProposal(p, prop.id, "no")).toThrow(/still being written/);
    const drift = newDrift(p, { options: FIX_OPTIONS, title: "Lost", refs: ["order"], proposal: prop.id, happens: "The code does it one way.", should: "The Model says another." });
    expect(() => resolveDrift(p, drift.id, "accept-proposal")).toThrow(/still being written/);
    expect(getProposal(p, prop.id).data.status).toBe("draft");
  });

  test("a Proposal file without a status is already handed over", () => {
    const prop = newProposal(p, "Old");
    const file = join(prop.dir, "proposal.md");
    writeFileSync(file, readFileSync(file, "utf8").replace(/^status: draft\n/m, ""));
    expect(getProposal(p, prop.id).data.status).toBe("open");
  });
});

describe("handing over", () => {
  test("makes the Draft open, and it can then be approved", () => {
    const prop = newProposal(p, "Lost");
    writeOrder(prop.id);
    expect(submitProposal(p, prop.id).data.status).toBe("open");
    approveProposal(p, prop.id);
    expect(loadModel(p).machines.get("order")?.states.some((s) => s.name === "Lost")).toBe(true);
  });

  test("is refused, leaving a Draft, when the Model with it applied would be invalid", () => {
    const prop = newProposal(p, "Broken");
    writeOrder(prop.id, (t) => t.replace("→ Paid", "→ Nowhere"));
    expect(() => submitProposal(p, prop.id)).toThrow(/cannot be handed over yet[\s\S]*unknown State "Nowhere"/);
    expect(getProposal(p, prop.id).data.status).toBe("draft");
  });

  test("is refused, naming the file, when the Proposal holds one it never registered", () => {
    const prop = newProposal(p, "Sneaky");
    mkdirSync(join(prop.dir, "model", "checkout"), { recursive: true });
    writeFileSync(join(prop.dir, "model", "checkout", "ghost.md"), "# G\n\n## States\n\n### A (initial)\n");
    expect(() => submitProposal(p, prop.id)).toThrow(/never registered: checkout\/ghost\.md/);
    expect(getProposal(p, prop.id).data.status).toBe("draft");
  });

  test("succeeds once the agent registers the files it wrote before registering them, keeping their content", () => {
    const prop = newProposal(p, "Late");
    const order = join(prop.dir, "model", "checkout", "order.md");
    const ghost = join(prop.dir, "model", "checkout", "ghost.md");
    const original = readFileSync(join(dir, ".trama", "model", "checkout", "order.md"), "utf8");
    mkdirSync(join(prop.dir, "model", "checkout"), { recursive: true });
    writeFileSync(order, addLost(original));
    writeFileSync(ghost, "# G\n\n## States\n\n### A (initial)\n");
    expect(() => submitProposal(p, prop.id)).toThrow(/never registered/);
    editInProposal(p, prop.id, "checkout/order.md");
    editInProposal(p, prop.id, "checkout/ghost.md");
    expect(readFileSync(order, "utf8")).toBe(addLost(original));
    expect(health(p, getProposal(p, prop.id)).stale).toEqual([]);
    expect(getProposal(p, prop.id).data.base["checkout/ghost.md"]).toBe("new");
    expect(submitProposal(p, prop.id).data.status).toBe("open");
  });

  test("is not refused for a stale Proposal or one that requires Proposals not approved yet", () => {
    const base = newProposal(p, "Base");
    writeOrder(base.id);
    const top = newProposal(p, "Top", "", { requires: [base.id] });
    writeFileSync(editInProposal(p, top.id, "checkout/cart.md"), readFileSync(join(p.dir, "model/checkout/cart.md"), "utf8"));
    writeFileSync(join(p.dir, "model/checkout/cart.md"), `${readFileSync(join(p.dir, "model/checkout/cart.md"), "utf8")}\n`);
    expect(health(p, getProposal(p, top.id)).stale).toEqual(["checkout/cart.md"]);
    expect(submitProposal(p, top.id).data.status).toBe("open");
    expect(() => approveProposal(p, top.id)).toThrow(new RegExp(`Proposal ${cardName(p, "proposal", base.id)} "Base" is still being written`));
  });

  test("only a Draft can be handed over", () => {
    const prop = newProposal(p, "Lost");
    submitProposal(p, prop.id);
    expect(() => submitProposal(p, prop.id)).toThrow(/only a Draft can be handed over/);
  });
});

describe("changing a Proposal after the hand-over", () => {
  test("registering, rewriting or deleting a file sends an open Proposal back to Draft", () => {
    const prop = newProposal(p, "Lost");
    writeOrder(prop.id);
    submitProposal(p, prop.id);
    editInProposal(p, prop.id, "checkout/order.md");
    expect(getProposal(p, prop.id).data.status).toBe("draft");
    expect(() => approveProposal(p, prop.id)).toThrow(/still being written/);

    submitProposal(p, prop.id);
    deleteInProposal(p, prop.id, "checkout/cart.md");
    expect(getProposal(p, prop.id).data.status).toBe("draft");
  });

  test("a refused edit leaves an open Proposal open", () => {
    const prop = newProposal(p, "Lost");
    writeOrder(prop.id);
    submitProposal(p, prop.id);
    expect(() => editInProposal(p, prop.id, "../../../etc/passwd.md")).toThrow();
    expect(() => deleteInProposal(p, prop.id, "checkout/order.md")).toThrow(/already edited/);
    expect(getProposal(p, prop.id).data.status).toBe("open");
  });

  test("approved, rejected and discarded Proposals cannot be edited", () => {
    const rejected = newProposal(p, "Rejected");
    submitProposal(p, rejected.id);
    rejectProposal(p, rejected.id, "no");
    expect(() => editInProposal(p, rejected.id, "checkout/order.md")).toThrow(/only drafts and open Proposals can be edited/);
    const discarded = newProposal(p, "Discarded");
    discardProposal(p, discarded.id);
    expect(() => editInProposal(p, discarded.id, "checkout/order.md")).toThrow(/only drafts and open Proposals can be edited/);
  });
});

describe("discarding", () => {
  test("turns a Draft into a discarded Proposal and appends nothing", () => {
    const prop = newProposal(p, "Abandoned");
    const body = getProposal(p, prop.id).body;
    expect(discardProposal(p, prop.id).data.status).toBe("discarded");
    expect(getProposal(p, prop.id).body).toBe(body);
  });

  test("is refused for a Proposal already handed over", () => {
    const prop = newProposal(p, "Lost");
    submitProposal(p, prop.id);
    expect(() => discardProposal(p, prop.id)).toThrow(/only a Draft can be discarded/);
    expect(getProposal(p, prop.id).data.status).toBe("open");
  });

  test("blocks the Proposals that require it and the Drift it is attached to, and none can require it anew", () => {
    const base = newProposal(p, "Base");
    writeOrder(base.id);
    const top = newProposal(p, "Top", "", { requires: [base.id] });
    submitProposal(p, top.id);
    const drift = newDrift(p, { options: FIX_OPTIONS, title: "Lost", refs: ["order"], proposal: base.id, happens: "The code does it one way.", should: "The Model says another." });
    discardProposal(p, base.id);

    expect(health(p, getProposal(p, top.id)).requires).toEqual([{ id: base.id, title: "Base", status: "discarded" }]);
    expect(() => approveProposal(p, top.id)).toThrow(new RegExp(`Proposal ${cardName(p, "proposal", base.id)} "Base" was discarded`));
    expect(getProposal(p, top.id).data.status).toBe("open");
    expect(() => resolveDrift(p, drift.id, "accept-proposal")).toThrow(/discarded/);
    expect(() => newProposal(p, "Later", "", { requires: [base.id] })).toThrow(/was discarded/);
  });
});
