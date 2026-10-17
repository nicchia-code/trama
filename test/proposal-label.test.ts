import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { editInProposal, getProposal, labelProblem, listProposals, newProposal, setProposalLabel, submitProposal, validateProposal } from "../src/core/proposals";
import { type Project, projectAt } from "../src/core/store";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-proposal-label-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("the short label of a Proposal", () => {
  test("a label of 1 to 30 characters on one line is accepted and stored trimmed", () => {
    expect(labelProblem("  Checkout  ")).toBeNull();
    expect(labelProblem("x".repeat(30))).toBeNull();
    const prop = newProposal(p, "Design", "", { label: "  Checkout  " });
    expect(getProposal(p, prop.id).data.label).toBe("Checkout");
  });

  test("an empty, multi-line or too long label is refused before any Proposal is created", () => {
    const before = listProposals(p).length;
    expect(() => newProposal(p, "Design", "", { label: "   " })).toThrow(/the label is empty/);
    expect(() => newProposal(p, "Design", "", { label: "one\ntwo" })).toThrow(/must be on one line/);
    expect(() => newProposal(p, "Design", "", { label: "x".repeat(31) })).toThrow(/at most 30 are allowed/);
    expect(listProposals(p).length).toBe(before);
    const prop = newProposal(p, "Design");
    expect(() => setProposalLabel(p, prop.id, "x".repeat(31))).toThrow(/at most 30 are allowed/);
    expect(getProposal(p, prop.id).data.label).toBeNull();
  });

  test("writing the label of an open Proposal returns it to Draft", () => {
    const prop = newProposal(p, "Design");
    submitProposal(p, prop.id);
    const result = setProposalLabel(p, prop.id, "Checkout");
    expect(result.returnedToDraft).toBe(true);
    expect(getProposal(p, prop.id).data).toMatchObject({ status: "draft", label: "Checkout" });
  });

  test("a Draft with Tasks needs a label to validate; an open Proposal without label is not blocked", () => {
    const prop = newProposal(p, "Design");
    writeFileSync(editInProposal(p, prop.id, "tasks/checkout-total.md"), "---\ntechnical: false\nrefs: [order]\n---\n\n# Checkout total\n");
    const messages = validateProposal(p, getProposal(p, prop.id)).map((d) => d.message);
    expect(messages).toEqual([expect.stringMatching(/needs a label of at most 30 characters for its Tasks$/)]);
    setProposalLabel(p, prop.id, "Checkout");
    expect(validateProposal(p, getProposal(p, prop.id))).toEqual([]);
  });

  test("proposal new --label and proposal label set the label; proposal show prints it and carries it in JSON", () => {
    const out = (...a: string[]) => run(["--root", dir, ...a], process.cwd()).out;
    const created = JSON.parse(out("--json", "proposal", "new", "Design", "--label", "Checkout", "--body", "Body"));
    out("proposal", "label", created.id, "Checkout total");
    expect(getProposal(p, created.id).data.label).toBe("Checkout total");
    expect(out("proposal", "show", created.id)).toContain("Label: Checkout total");
    expect(JSON.parse(out("--json", "proposal", "show", created.id)).label).toBe("Checkout total");
  });
});
