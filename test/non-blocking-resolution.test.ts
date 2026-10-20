import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { getProposal, listProposals, newProposal, validateProposal } from "../src/core/proposals";
import { type Project, projectAt } from "../src/core/store";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-non-blocking-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const cli = (...args: string[]) => run(args, dir, {}).out;
const created = (input: object) => cli("proposal", "new", "--input", JSON.stringify(input));

/** Adds a `nonBlocking: true` line to a Proposal's front matter, as a hand-written file would have it. */
function markNonBlocking(id: string) {
  const file = join(getProposal(p, id).dir, "proposal.md");
  writeFileSync(file, readFileSync(file, "utf8").replace("---\n", "---\nnonBlocking: true\n"));
}

describe("a resolution that blocks nothing", () => {
  test("proposal new with nonBlocking writes nonBlocking and the flag is read back", () => {
    created({ title: "Free Drifts", kind: "resolution", nonBlocking: true, body: "Filed by the blocker" });
    const id = listProposals(p).find((x) => x.title === "Free Drifts")?.id as string;
    expect(getProposal(p, id).data).toMatchObject({ kind: "resolution", nonBlocking: true, automatic: false });
    expect(readFileSync(join(getProposal(p, id).dir, "proposal.md"), "utf8")).toContain("nonBlocking: true");
  });

  test("an ordinary resolution writes no nonBlocking field", () => {
    created({ title: "Plain resolution", kind: "resolution" });
    const id = listProposals(p).find((x) => x.title === "Plain resolution")?.id as string;
    expect(getProposal(p, id).data.nonBlocking).toBe(false);
    expect(readFileSync(join(getProposal(p, id).dir, "proposal.md"), "utf8")).not.toContain("nonBlocking");
  });

  test("nonBlocking without a resolution, or with automatic, is a usage error that creates nothing", () => {
    const before = listProposals(p).length;
    expect(() => created({ title: "No resolution", nonBlocking: true })).toThrow(/nonBlocking: applies only with kind resolution/);
    expect(() => created({ title: "Automatic", kind: "resolution", automatic: true, nonBlocking: true })).toThrow(/nonBlocking: cannot go together with automatic/);
    expect(listProposals(p).length).toBe(before);
  });

  test("the core refuses the flag outside a manual resolution", () => {
    expect(() => newProposal(p, "Change", "", { nonBlocking: true })).toThrow(/--non-blocking needs --resolution/);
    expect(() => newProposal(p, "Automatic", "", { kind: "resolution", automatic: true, nonBlocking: true })).toThrow(/--non-blocking needs --resolution/);
    expect(listProposals(p)).toHaveLength(0);
  });

  test("validation reports nonBlocking on a Proposal that is not a resolution, and on an automatic one", () => {
    const change = newProposal(p, "Change");
    markNonBlocking(change.id);
    expect(validateProposal(p, getProposal(p, change.id)).map((d) => d.message)).toContain("nonBlocking is only valid for a resolution Proposal");

    const automatic = newProposal(p, "Automatic", "", { kind: "resolution", automatic: true });
    markNonBlocking(automatic.id);
    expect(validateProposal(p, getProposal(p, automatic.id)).map((d) => d.message)).toContain("a resolution cannot be both nonBlocking and automatic");
  });

  test("proposal list marks a nonBlocking resolution after its resolves count, and no other", () => {
    created({ title: "Free Drifts", kind: "resolution", nonBlocking: true });
    created({ title: "Plain resolution", kind: "resolution" });
    const list = cli("proposal", "list");
    expect(list).toMatch(/Free Drifts.*\(resolves 0 Drifts\) \(blocks nothing\)/);
    expect(list).toMatch(/Plain resolution.*\(resolves 0 Drifts\)/);
    expect(list).not.toMatch(/Plain resolution.*\(blocks nothing\)/);
  });
});
