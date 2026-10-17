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

/** Adds a `nonBlocking: true` line to a Proposal's front matter, as a hand-written file would have it. */
function markNonBlocking(id: string) {
  const file = join(getProposal(p, id).dir, "proposal.md");
  writeFileSync(file, readFileSync(file, "utf8").replace("---\n", "---\nnonBlocking: true\n"));
}

describe("a resolution that blocks nothing", () => {
  test("proposal new --resolution --non-blocking writes nonBlocking and the flag is read back", () => {
    cli("proposal", "new", "Free Drifts", "--resolution", "--non-blocking", "--body", "Filed by the blocker");
    const id = listProposals(p).find((x) => x.title === "Free Drifts")?.id as string;
    expect(getProposal(p, id).data).toMatchObject({ kind: "resolution", nonBlocking: true, automatic: false });
    expect(readFileSync(join(getProposal(p, id).dir, "proposal.md"), "utf8")).toContain("nonBlocking: true");
  });

  test("an ordinary resolution writes no nonBlocking field", () => {
    cli("proposal", "new", "Plain resolution", "--resolution");
    const id = listProposals(p).find((x) => x.title === "Plain resolution")?.id as string;
    expect(getProposal(p, id).data.nonBlocking).toBe(false);
    expect(readFileSync(join(getProposal(p, id).dir, "proposal.md"), "utf8")).not.toContain("nonBlocking");
  });

  test("--non-blocking without --resolution, or with --automatic, is a usage error that creates nothing", () => {
    const before = listProposals(p).length;
    expect(() => cli("proposal", "new", "No resolution", "--non-blocking")).toThrow(/--non-blocking can only be used with --resolution, and not with --automatic/);
    expect(() => cli("proposal", "new", "Automatic", "--resolution", "--automatic", "--non-blocking")).toThrow(/--non-blocking can only be used with --resolution, and not with --automatic/);
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
    cli("proposal", "new", "Free Drifts", "--resolution", "--non-blocking");
    cli("proposal", "new", "Plain resolution", "--resolution");
    const list = cli("proposal", "list");
    expect(list).toMatch(/Free Drifts.*\(resolves 0 Drifts\) \(blocks nothing\)/);
    expect(list).toMatch(/Plain resolution.*\(resolves 0 Drifts\)/);
    expect(list).not.toMatch(/Plain resolution.*\(blocks nothing\)/);
  });
});
