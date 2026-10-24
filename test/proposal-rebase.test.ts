import { FIX_OPTIONS } from "./fix-options";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { discardProposal, editInProposal, getProposal, health, newProposal, rebaseInProposal, submitProposal } from "../src/core/proposals";
import { type Project, projectAt } from "../src/core/store";
import { newDrift } from "../src/core/work";
import { buildSnapshot } from "../src/core/snapshot";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-proposal-rebase-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

/** Edits a Model file outside the Proposal, so the Proposal's record of it goes stale. */
const changeModel = (file: string) => {
  const path = join(p.dir, "model", file);
  writeFileSync(path, `${readFileSync(path, "utf8")}\n`);
};

describe("rebasing a Proposal", () => {
  test("re-records the base of its files so a stale Draft is no longer stale, and marks it refining", () => {
    const prop = newProposal(p, "Edit the cart");
    writeFileSync(editInProposal(p, prop.id, "checkout/cart.md"), readFileSync(join(p.dir, "model/checkout/cart.md"), "utf8"));
    changeModel("checkout/cart.md");
    expect(health(p, getProposal(p, prop.id)).stale).toEqual(["checkout/cart.md"]);
    rebaseInProposal(p, prop.id);
    expect(health(p, getProposal(p, prop.id)).stale).toEqual([]);
    const after = getProposal(p, prop.id);
    expect(after.data.status).toBe("draft");
    expect(after.data.refining).toBe(true);
  });

  test("returns an open Proposal to Draft, and a refused hand-over keeps the refining mark", () => {
    const prop = newProposal(p, "Design");
    submitProposal(p, prop.id);
    expect(getProposal(p, prop.id).data.status).toBe("open");
    rebaseInProposal(p, prop.id);
    expect(getProposal(p, prop.id).data.status).toBe("draft");
    expect(getProposal(p, prop.id).data.refining).toBe(true);
    mkdirSync(join(prop.dir, "model", "checkout"), { recursive: true });
    writeFileSync(join(prop.dir, "model", "checkout", "ghost.md"), "# G\n");
    expect(() => submitProposal(p, prop.id)).toThrow(/never registered/);
    expect(getProposal(p, prop.id).data.refining).toBe(true);
  });

  test("a successful hand-over clears the refining mark", () => {
    const prop = newProposal(p, "Design");
    rebaseInProposal(p, prop.id);
    expect(submitProposal(p, prop.id).data.status).toBe("open");
    expect(getProposal(p, prop.id).data.refining).toBe(false);
  });

  test("is refused for a kind other than change, changing nothing", () => {
    const prop = newProposal(p, "Import", "", { kind: "import" });
    expect(() => rebaseInProposal(p, prop.id)).toThrow(/of kind import; only a change Proposal can be rebased/);
    expect(getProposal(p, prop.id).data.refining).toBe(false);
  });

  test("is refused for a Proposal attached to an open Drift, changing nothing", () => {
    const draft = newProposal(p, "Adapt the Model");
    newDrift(p, { where: "src/refund.ts", title: "Late refund", refs: ["order/Paid"], happens: "The code does it one way.", should: "The Model says another.", options: FIX_OPTIONS, proposal: draft.id });
    expect(() => rebaseInProposal(p, draft.id)).toThrow(/is attached to Drift .*: decide it on the Drift/);
    expect(getProposal(p, draft.id).data.refining).toBe(false);
  });

  test("is refused for a discarded Proposal, changing nothing", () => {
    const prop = newProposal(p, "Design");
    discardProposal(p, prop.id);
    expect(() => rebaseInProposal(p, prop.id)).toThrow(/is discarded; only a Draft or an open Proposal can be rebased/);
    expect(getProposal(p, prop.id).data.refining).toBe(false);
  });

  test("the CLI rebases with `proposal edit` and shows the mark", () => {
    const out = (...a: string[]) => run(["--root", dir, ...a], process.cwd()).out;
    const created = JSON.parse(out("--json", "proposal", "new", "--input", JSON.stringify({ title: "Design" })));
    expect(out("proposal", "edit", created.id, "--input", JSON.stringify({ rebase: true }))).toContain("Rebased Proposal");
    expect(out("proposal", "show", created.id)).toContain("Refining: rebased, not handed over yet");
    expect(JSON.parse(out("--json", "proposal", "show", created.id)).refining).toBe(true);
    expect(out("proposal", "list")).toContain("(refining)");
  });

  test("a rebased Draft is drawn in the snapshot as a refining ghost, and a plain Draft is not", () => {
    const plain = newProposal(p, "Plain");
    const rebased = newProposal(p, "Refined");
    rebaseInProposal(p, rebased.id);
    const shown = buildSnapshot(p).proposals.map((x) => [x.id, x.refining]);
    expect(shown).toEqual([[rebased.id, true]]);
    expect(shown.some(([id]) => id === plain.id)).toBe(false);
  });
});
