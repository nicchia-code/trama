import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { getProposal, listProposals, newProposal, rejectProposal, submitProposal } from "../src/core/proposals";
import { type Project, projectAt } from "../src/core/store";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-proposal-reworks-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const cli = (...args: string[]) => run(["--root", dir, ...args], process.cwd()).out;
const rejected = (title = "Old") => {
  const prop = newProposal(p, title);
  submitProposal(p, prop.id);
  return rejectProposal(p, prop.id, "redo");
};

describe("reworks", () => {
  test("binds the new Proposal to the rejected one, takes its instant and replaces it in the requires of live Proposals", () => {
    const old = rejected();
    const draftDependent = newProposal(p, "Draft on top");
    const openDependent = newProposal(p, "Open on top");
    for (const dependent of [draftDependent, openDependent]) {
      const file = join(getProposal(p, dependent.id).dir, "proposal.md");
      const text = readFileSync(file, "utf8").replace(/^base:/m, `requires:\n  - ${old.id}\n  - ${old.id}\nbase:`);
      writeFileSync(file, text);
    }
    submitProposal(p, openDependent.id);
    const out = JSON.parse(cli("--json", "proposal", "new", "--input", JSON.stringify({ title: "New", reworks: old.id })));
    expect(out.reworks).toBe(old.id);
    expect(out.reworksNote).toBeUndefined();
    expect([...out.requiresChanged].sort()).toEqual([draftDependent.id, openDependent.id].sort());
    const fresh = getProposal(p, out.id);
    expect(fresh.data.reworks).toBe(old.id);
    expect(fresh.data.created).toBe(old.data.created);
    expect(getProposal(p, draftDependent.id).data.requires).toEqual([out.id]);
    expect(getProposal(p, openDependent.id).data.requires).toEqual([out.id]);
    expect(getProposal(p, openDependent.id).data.status).toBe("open");
    const shown = cli("proposal", "show", out.id);
    expect(shown).toContain(`Reworks: ${old.id} Old`);
    expect(JSON.parse(cli("--json", "proposal", "show", out.id)).reworks).toBe(old.id);
  });

  test("a Proposal that is not rejected, is missing or is already redone is created unbound, saying why", () => {
    const open = newProposal(p, "Still draft");
    const notRejected = JSON.parse(cli("--json", "proposal", "new", "--input", JSON.stringify({ title: "A", reworks: open.id })));
    expect(notRejected.reworks).toBeNull();
    expect(notRejected.reworksNote).toContain("not rejected");
    const missing = JSON.parse(cli("--json", "proposal", "new", "--input", JSON.stringify({ title: "B", reworks: "zzzzzzzz" })));
    expect(missing.reworks).toBeNull();
    expect(missing.reworksNote).toContain("not found");
    const old = rejected();
    const first = JSON.parse(cli("--json", "proposal", "new", "--input", JSON.stringify({ title: "C", reworks: old.id })));
    const second = JSON.parse(cli("--json", "proposal", "new", "--input", JSON.stringify({ title: "D", reworks: old.id })));
    expect(first.reworks).toBe(old.id);
    expect(second.reworks).toBeNull();
    expect(second.reworksNote).toContain("already redone");
    expect(listProposals(p).filter((x) => x.data.reworks === old.id)).toHaveLength(1);
  });

  test("reworks together with request is refused and creates nothing", () => {
    const old = rejected();
    const before = listProposals(p).length;
    expect(() => cli("proposal", "new", "--input", JSON.stringify({ title: "Both", reworks: old.id, request: "2026-01-01T00-00-00" }))).toThrow(/reworks/);
    expect(listProposals(p)).toHaveLength(before);
  });
});
