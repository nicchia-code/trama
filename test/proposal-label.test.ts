import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

  test("proposal new with label and proposal edit with label set the label; proposal show prints it and carries it in JSON", () => {
    const out = (...a: string[]) => run(["--root", dir, ...a], process.cwd()).out;
    const created = JSON.parse(out("--json", "proposal", "new", "--input", JSON.stringify({ title: "Design", label: "Checkout", body: "Body" })));
    out("proposal", "edit", created.id, "--input", JSON.stringify({ label: "Checkout total" }));
    expect(getProposal(p, created.id).data.label).toBe("Checkout total");
    expect(out("proposal", "show", created.id)).toContain("Label: Checkout total");
    expect(JSON.parse(out("--json", "proposal", "show", created.id)).label).toBe("Checkout total");
  });

  test("an invalid label is a refusal before anything is written, by proposal new and by proposal edit", () => {
    const out = (...a: string[]) => run(["--root", dir, ...a], process.cwd()).out;
    const before = listProposals(p).length;
    expect(() => out("proposal", "new", "--input", JSON.stringify({ title: "Design", label: "x".repeat(31) }))).toThrow(/at most 30 are allowed/);
    expect(listProposals(p).length).toBe(before);
    const prop = newProposal(p, "Design", "", { label: "Kept" });
    expect(() => out("proposal", "edit", prop.id, "--input", JSON.stringify({ label: "   " }))).toThrow(/the label is empty/);
    expect(getProposal(p, prop.id).data.label).toBe("Kept");
  });

  test("proposal edit without input returns an open Proposal to Draft and touches no file", () => {
    const out = (...a: string[]) => run(["--root", dir, ...a], process.cwd()).out;
    const prop = newProposal(p, "Design");
    submitProposal(p, prop.id);
    const file = join(getProposal(p, prop.id).dir, "proposal.md");
    const before = readFileSync(file, "utf8").replace(/^status: open$/m, "status: draft");
    const printed = out("proposal", "edit", prop.id);
    expect(printed).toContain("returned to Draft");
    expect(getProposal(p, prop.id).data.status).toBe("draft");
    expect(readFileSync(file, "utf8")).toBe(before);
    expect(JSON.parse(out("--json", "proposal", "edit", prop.id)).returnedToDraft).toBe(false);
  });

  test("several paths in one proposal edit each print the path to write, and delete marks files", () => {
    const out = (...a: string[]) => run(["--root", dir, ...a], process.cwd()).out;
    const prop = newProposal(p, "Design");
    const printed = out("--json", "proposal", "edit", prop.id, "--input", JSON.stringify({ edit: ["checkout/order.md", "tasks/total.md"] }));
    const paths = JSON.parse(printed).paths as { path: string; edit: string }[];
    expect(paths.map((x) => x.path)).toEqual(["checkout/order.md", "tasks/total.md"]);
    expect(paths[0]?.edit).toContain(join("checkout", "order.md"));
    expect(paths[1]?.edit).toMatch(/tasks[\\/][a-z0-9]{8}-total\.md$/);
    expect(out("proposal", "edit", prop.id, "--input", JSON.stringify({ delete: ["checkout/cart.md"] }))).toContain("Marked checkout/cart.md for deletion");
    expect(getProposal(p, prop.id).data.delete).toEqual(["checkout/cart.md"]);
  });

  test("proposal edit refuses an option with a decision other than fix-code before writing", () => {
    const prop = newProposal(p, "Design");
    expect(() => run(["--root", dir, "proposal", "edit", prop.id, "--input", JSON.stringify({ drifts: [{ drift: "abcd1234", decision: "proposal", option: 1 }] })], process.cwd())).toThrow(/option: applies only with decision fix-code/);
  });
});
