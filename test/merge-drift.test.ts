import { FIX_OPTIONS } from "./fix-options";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { boardView, driftListView, driftShowView } from "../src/cli/work";
import { archiveComparison } from "../src/core/compare";
import { UsageError } from "../src/core/errors";
import { editDrift } from "../src/core/prepared";
import { newProposal } from "../src/core/proposals";
import { buildSnapshot } from "../src/core/snapshot";
import { type Project, projectAt } from "../src/core/store";
import { getDrift, newDrift, newUnifiedDrift } from "../src/core/work";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-merge-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const filing = { where: "src/refund.ts", options: FIX_OPTIONS, happens: "The code does it one way.", should: "The Model says another." };
const drift = (title: string, extra: { merge?: boolean; options?: typeof FIX_OPTIONS; proposal?: string } = {}) => newDrift(p, { ...filing, title, refs: ["order/Paid"], ...extra });
const cli = (...args: string[]) => run(["--root", dir, ...args], process.cwd(), {});

describe("a Drift from a merge", () => {
  test("is written with `merge: true` only when true, and reads back as a boolean", () => {
    const from = drift("From a merge", { merge: true });
    const plain = drift("Plain");
    const explicit = drift("Explicit", { merge: false });
    expect(readFileSync(from.path, "utf8")).toContain("merge: true\n");
    expect(readFileSync(plain.path, "utf8")).not.toContain("merge");
    expect(readFileSync(explicit.path, "utf8")).not.toContain("merge");
    expect([getDrift(p, from.id).data.merge, getDrift(p, plain.id).data.merge]).toEqual([true, false]);
  });

  test("a value other than true in the file counts as not from a merge", () => {
    const d = drift("Odd");
    writeFileSync(d.path, readFileSync(d.path, "utf8").replace(/^status: open$/m, 'status: open\nmerge: "true"'));
    expect(getDrift(p, d.id).data.merge).toBe(false);
    writeFileSync(d.path, readFileSync(d.path, "utf8").replace('merge: "true"', "merge: 1"));
    expect(getDrift(p, d.id).data.merge).toBe(false);
  });

  test("drift new accepts `merge`, and refuses a value that is not a boolean", () => {
    const made = JSON.parse(cli("--json", "drift", "new", "--input", JSON.stringify({ ...filing, title: "Merged", refs: ["order/Paid"], merge: true })).out) as { id: string };
    expect(getDrift(p, made.id).data.merge).toBe(true);
    const plain = JSON.parse(cli("--json", "drift", "new", "--input", JSON.stringify({ ...filing, title: "Plain one", refs: ["order/Paid"] })).out) as { id: string };
    expect(getDrift(p, plain.id).data.merge).toBe(false);
    expect(() => cli("drift", "new", "--input", JSON.stringify({ ...filing, title: "Bad", refs: ["order/Paid"], merge: "yes" }))).toThrow(/merge: .*boolean/);
  });

  test("a comparison file files `merge` on the Drifts that carry it", () => {
    const card = { refs: ["order/Paid"], happens: "A", should: "B", where: "src/a.ts", options: FIX_OPTIONS };
    const { drifts } = archiveComparison(p, "none", JSON.stringify({ tasks: [], drifts: [{ ...card, title: "One", merge: true }, { ...card, title: "Two" }, { ...card, title: "Three", merge: false }] }));
    expect(drifts.map((d) => d.data.merge)).toEqual([true, false, false]);
    expect(() => archiveComparison(p, "none", JSON.stringify({ tasks: [], drifts: [{ ...card, title: "Four", merge: "true" }] }))).toThrow(/merge must be true or false/);
  });

  test("a unified Drift is from a merge when at least one of the Drifts it merges is", () => {
    const a = drift("A", { merge: true });
    const b = drift("B");
    const c = drift("C");
    const d = drift("D");
    const some = newUnifiedDrift(p, { ...filing, title: "Some", refs: ["order/Paid"], unifies: [a.id, b.id] }).drift;
    const none = newUnifiedDrift(p, { ...filing, title: "None", refs: ["order/Paid"], unifies: [c.id, d.id] }).drift;
    expect(readFileSync(some.path, "utf8")).toContain("merge: true\n");
    expect([getDrift(p, some.id).data.merge, getDrift(p, none.id).data.merge]).toEqual([true, false]);
    expect(readFileSync(none.path, "utf8")).not.toContain("merge");
  });

  test("drift show says `From a merge` right after the title, and the list, the board and the JSON mark it", () => {
    const from = drift("From a merge", { merge: true });
    const plain = drift("Plain");
    const shown = driftShowView(p, getDrift(p, from.id));
    expect(shown.md.split("\n").slice(0, 2)).toEqual(["# From a merge", "From a merge"]);
    expect(shown.json).toMatchObject({ merge: true });
    expect(driftShowView(p, getDrift(p, plain.id)).md).not.toContain("From a merge\n");
    const listed = driftListView(p, false);
    expect(listed.md).toMatch(/From a merge \(merge\)/);
    expect(listed.md).not.toMatch(/Plain \(merge\)/);
    expect(listed.json).toMatchObject({ drifts: expect.arrayContaining([expect.objectContaining({ id: from.id, merge: true }), expect.objectContaining({ id: plain.id, merge: false })]) });
    expect(boardView(p).md).toMatch(/Drift .*From a merge \(merge\)/);
  });

  test("the snapshot carries `merge` on the Drift, and on its row in a resolution", () => {
    const from = drift("From a merge", { merge: true });
    const plain = drift("Plain");
    const snapshot = buildSnapshot(p);
    expect(snapshot.drifts.find((d) => d.id === from.id)?.merge).toBe(true);
    expect(snapshot.drifts.find((d) => d.id === plain.id)?.merge).toBe(false);
  });
});

describe("the prepared question of a Drift from a merge", () => {
  const question = (id: string, options: number, recommended: number) => ({
    id,
    question: "What should change?",
    options: Array.from({ length: options }, (_, i) => ({ label: `Option ${i + 1}`, description: `Does thing ${i + 1}.` })),
    recommended,
    multi: false,
  });
  const decisions = [{ decision: "fix-code", option: 1 }, { decision: "fix-code", option: 2 }, { decision: "proposal" }];
  const attached = (title: string) => newProposal(p, title).id;

  test("recommends the behaviour the code already has, never a fix of the code", () => {
    const d = drift("From a merge", { merge: true, proposal: attached("Adapt") });
    expect(() => editDrift(p, d.id, { prepared: { question: question(d.id, 3, 0), decisions } })).toThrow(UsageError);
    expect(() => editDrift(p, d.id, { prepared: { question: question(d.id, 3, 0), decisions } })).toThrow(/not a fix of the code/);
    editDrift(p, d.id, { prepared: { question: question(d.id, 3, 2), decisions } });
  });

  test("a Drift without Fix options recommends adopting the attached Proposal", () => {
    const d = drift("From a merge", { merge: true, options: [], proposal: attached("Adapt") });
    const both = [{ decision: "dismissed" }, { decision: "proposal" }];
    expect(() => editDrift(p, d.id, { prepared: { question: question(d.id, 2, 0), decisions: both } })).toThrow(/adopting the attached Proposal/);
    editDrift(p, d.id, { prepared: { question: question(d.id, 2, 1), decisions: both } });
  });

  test("any other Drift can recommend a fix of the code", () => {
    const d = drift("Plain", { proposal: attached("Adapt") });
    editDrift(p, d.id, { prepared: { question: question(d.id, 3, 0), decisions } });
  });
});
