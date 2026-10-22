import { FIX_OPTIONS } from "./fix-options";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { driftListView, driftShowView } from "../src/cli/work";
import { blockedTasks } from "../src/core/work";
import { newProposal, getProposal } from "../src/core/proposals";
import { resolveDriftInProposal } from "../src/core/resolution";
import { buildSnapshot } from "../src/core/snapshot";
import { syncShortNumbers } from "../src/core/short-numbers";
import { type Project, projectAt } from "../src/core/store";
import { getDrift, getTask, listDrifts, newDrift, newTask, newUnifiedDrift, resolveDrift } from "../src/core/work";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-unify-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const filing = { where: "src/refund.ts", options: FIX_OPTIONS, happens: "The code does it one way.", should: "The Model says another." };
const drift = (title: string, extra: { origin?: string; proposal?: string; refs?: string[] } = {}) => newDrift(p, { ...filing, title, refs: extra.refs ?? ["order/Paid"], ...extra });
const unifyInput = (unifies: string[], extra: object = {}) => ({ ...filing, title: "All of them", refs: ["order/Paid"], unifies, ...extra });
const cli = (...args: string[]) => run(["--root", dir, ...args], process.cwd(), {});
const task = (title: string, refs = ["order/Paid"]) => newTask(p, { title, refs, technical: false }).id;

describe("a unified Drift", () => {
  test("merges open Drifts: the new one is open with their origins, the merged ones are resolved as unified", () => {
    const t1 = task("One");
    const t2 = task("Two");
    const a = drift("A", { origin: t1 });
    const b = drift("B", { origin: t2 });
    const c = drift("C", { origin: t1 });
    const { drift: merged, unified } = newUnifiedDrift(p, { ...unifyInput([c.id, a.id, b.id]) });
    expect(unified.map((d) => d.id)).toEqual([a.id, b.id, c.id]);
    const read = getDrift(p, merged.id);
    expect(read.data.status).toBe("open");
    expect(read.data.unifies).toEqual([a.id, b.id, c.id]);
    expect(read.data.origin).toEqual([t1, t2]);
    for (const d of [a, b, c]) {
      const old = getDrift(p, d.id);
      expect(old.data).toMatchObject({ status: "resolved", resolution: "unified", unifiedInto: merged.id, proposal: null });
    }
  });

  test("the file holds one origin as a string and several as a list, and reads back both ways", () => {
    const t1 = task("One");
    const t2 = task("Two");
    const a = drift("A", { origin: t1 });
    const b = drift("B", { origin: t1 });
    const single = newUnifiedDrift(p, unifyInput([a.id, b.id])).drift;
    expect(readFileSync(single.path, "utf8")).toContain(`origin: ${t1}\n`);
    const c = drift("C", { origin: t1 });
    const d = drift("D", { origin: t2 });
    const several = newUnifiedDrift(p, unifyInput([c.id, d.id])).drift;
    expect(readFileSync(several.path, "utf8")).toMatch(new RegExp(`origin:\\n  - ${t1}\\n  - ${t2}\\n`));
    expect(getDrift(p, several.id).data.origin).toEqual([t1, t2]);
    const none = drift("N1");
    const none2 = drift("N2");
    expect(newUnifiedDrift(p, unifyInput([none.id, none2.id])).drift.data.origin).toEqual([]);
  });

  test("its precedents are those of the merged Drifts and the Drifts its origins fix, without repeats", () => {
    const first = drift("First", { origin: task("Work") });
    resolveDrift(p, first.id, "fix-code", [], { option: 1 });
    const fix = getDrift(p, first.id).data.task as string;
    const earlier = drift("Earlier");
    resolveDrift(p, earlier.id, "fix-code", [], { option: 1 });
    const a = newDrift(p, { ...filing, title: "A", refs: ["order/Paid"], previous: earlier.id });
    const b = drift("B", { origin: fix });
    const merged = newUnifiedDrift(p, unifyInput([a.id, b.id])).drift;
    expect(merged.data.previous).toEqual([earlier.id, first.id]);
    expect(merged.data.origin).toEqual([fix]);
  });

  test("a prepared question stops holding and an attached Proposal, in writing or open, is discarded", () => {
    const draft = newProposal(p, "Draft");
    const a = drift("A", { proposal: draft.id });
    const b = drift("B");
    newUnifiedDrift(p, unifyInput([a.id, b.id]));
    expect(getProposal(p, draft.id).data.status).toBe("discarded");
    expect(getDrift(p, a.id).data.proposal).toBeNull();
  });

  test("is refused, writing nothing and naming every problem", () => {
    const a = drift("A");
    const b = drift("B");
    const done = drift("Done");
    resolveDrift(p, done.id, "dismiss");
    const resolution = newProposal(p, "Resolution", "", { kind: "resolution" });
    const held = drift("Held");
    resolveDriftInProposal(p, resolution.id, held.id, { decision: "dismissed" });
    const attached = newProposal(p, "Attached");
    const withProposal = drift("With", { proposal: attached.id });
    const before = listDrifts(p).length;
    const refuse = (input: object) => {
      try {
        newUnifiedDrift(p, input as never);
      } catch (error) {
        return (error as Error).message;
      }
      throw new Error("not refused");
    };
    expect(refuse(unifyInput([a.id]))).toMatch(/at least two/);
    expect(refuse(unifyInput([a.id, a.id, b.id]))).toMatch(/more than once/);
    expect(refuse(unifyInput([a.id, "zzzzzzzz"]))).toMatch(/zzzzzzzz/);
    const several = refuse(unifyInput([a.id, done.id, held.id]));
    expect(several).toContain("already resolved");
    expect(several).toContain("is part of resolution");
    expect(refuse(unifyInput([a.id, withProposal.id], { proposal: attached.id }))).toMatch(/attached to Drift/);
    expect(refuse(unifyInput([a.id, b.id], { title: "" , happens: " " }))).toMatch(/What happens/);
    expect(listDrifts(p).length).toBe(before);
    expect(getDrift(p, a.id).data.status).toBe("open");
  });

  test("a resolution being written or open that is prepared also holds its Drift", () => {
    const resolution = newProposal(p, "Prepared", "", { kind: "resolution", prepared: true });
    const held = drift("Held");
    resolveDriftInProposal(p, resolution.id, held.id, { decision: "dismissed" });
    expect(() => newUnifiedDrift(p, unifyInput([held.id, drift("Other").id]))).toThrow(/part of resolution/);
  });
});

describe("what a unified Drift blocks and what fixing it does", () => {
  test("blocks each origin and every Task about the same thing, except those left free", () => {
    const t1 = task("One", ["cart"]);
    const t2 = task("Two", ["cart"]);
    const other = task("Other", ["order/Shipped"]);
    const third = task("Third", ["order/Shipped"]);
    const a = drift("A", { origin: t1, refs: ["cart"] });
    const b = drift("B", { origin: t2, refs: ["cart"] });
    const { drift: merged } = newUnifiedDrift(p, unifyInput([a.id, b.id], { refs: ["order/Shipped"], notBlocking: [{ task: other, reason: "Unrelated." }] }));
    const blocked = blockedTasks(p);
    expect([...blocked.keys()].sort()).toEqual([t1, t2, third].sort());
    expect(blocked.get(t1)?.[0]).toMatchObject({ kind: "drift", drift: merged.id });
    expect(blocked.has(other)).toBe(false);
    expect(() => newUnifiedDrift(p, unifyInput([drift("X").id, drift("Y").id], { notBlocking: [{ task: t1, reason: "No." }] }))).toThrow(/would not block/);
  });

  test("fixing its code sends every origin not Done back to To do, waiting for the fix Task; accepting leaves them", () => {
    const t1 = task("One");
    const t2 = task("Two");
    const done = task("Done");
    const a = drift("A", { origin: t1 });
    const b = drift("B", { origin: t2 });
    const c = drift("C", { origin: done });
    const { drift: merged } = newUnifiedDrift(p, unifyInput([a.id, b.id, c.id]));
    for (const id of [t1, t2, done]) getTask(p, id);
    const fixed = resolveDrift(p, merged.id, "fix-code", [], { option: 1 });
    const fix = fixed.data.task as string;
    const waiting = blockedTasks(p);
    expect(waiting.get(t1)?.[0]).toMatchObject({ kind: "fix", task: fix });
    expect(waiting.get(t2)?.[0]).toMatchObject({ kind: "fix", task: fix });
  });
});

describe("a unified Drift is not a decision", () => {
  test("it is no precedent, is refused by drift move, and a half-written file does not read", () => {
    const a = drift("A");
    const b = drift("B");
    newUnifiedDrift(p, unifyInput([a.id, b.id]));
    expect(() => newDrift(p, { ...filing, title: "Next", refs: ["order/Paid"], previous: a.id })).toThrow(/unified/);
    expect(() => resolveDrift(p, a.id, "dismiss")).toThrow(/was unified into/);
    expect(() => cli("drift", "move", a.id, "dismissed")).toThrow(/was unified into/);
    const text = readFileSync(getDrift(p, a.id).path, "utf8");
    writeFileSync(getDrift(p, a.id).path, text.replace(/unifiedInto: .*\n/, ""));
    expect(() => getDrift(p, a.id)).toThrow(/unifiedInto/);
    writeFileSync(getDrift(p, b.id).path, readFileSync(getDrift(p, b.id).path, "utf8").replace("resolution: unified", "resolution: dismissed"));
    expect(() => getDrift(p, b.id)).toThrow(/unifiedInto/);
  });
});

describe("the command line and the Snapshot", () => {
  test("drift new with unifies prints a line for each merged Drift; task and previous are usage errors", () => {
    const a = drift("A");
    const b = drift("B");
    const names = syncShortNumbers(p);
    const shortA = names.label("drift", a.id) as string;
    const input = { ...unifyInput([shortA, b.id]) };
    expect(() => cli("drift", "new", "--input", JSON.stringify({ ...input, task: task("T") }))).toThrow(/unifies/);
    expect(() => cli("drift", "new", "--input", JSON.stringify({ ...input, previous: a.id }))).toThrow(/unifies/);
    expect(listDrifts(p).length).toBe(2);
    const out = cli("--json", "drift", "new", "--input", JSON.stringify(input)).out;
    const created = JSON.parse(out) as { id: string; unified: string[]; previous: string[] };
    expect(created.unified).toEqual([a.id, b.id]);
    expect(created.previous).toEqual([]);
    const text = cli("drift", "new", "--input", JSON.stringify({ ...unifyInput([drift("C").id, drift("D").id]), title: "Again" })).out;
    expect(text).toMatch(/Unified \w{8} into \w{8}/);
  });

  test("dryRun lists what the unified Drift would block, merged origins included, and writes nothing", () => {
    const t1 = task("One", ["cart"]);
    const a = drift("A", { origin: t1, refs: ["cart"] });
    const b = drift("B");
    const out = JSON.parse(cli("--json", "drift", "new", "--input", JSON.stringify({ refs: ["order/Shipped"], unifies: [a.id, b.id], dryRun: true })).out) as { tasks: { id: string }[] };
    expect(out.tasks.map((t) => t.id)).toContain(t1);
    expect(listDrifts(p).length).toBe(2);
    expect(getDrift(p, a.id).data.status).toBe("open");
  });

  test("show, list and the Snapshot carry unifies, unifiedInto, origin and previous as lists", () => {
    const t1 = task("One");
    const a = drift("A", { origin: t1 });
    const b = drift("B");
    const { drift: merged } = newUnifiedDrift(p, unifyInput([a.id, b.id]));
    const shown = driftShowView(p, getDrift(p, merged.id));
    expect(shown.md).toContain("## Unifies");
    expect(shown.md).toContain(`- ${a.id} A`);
    expect(shown.json).toMatchObject({ unifies: [a.id, b.id], unifiedInto: null, origin: [t1], previous: [] });
    const into = driftShowView(p, getDrift(p, a.id));
    expect(into.md.split("\n")[1]).toMatch(new RegExp(`^Unified into D\\d+ All of them$`));
    expect(into.json).toMatchObject({ unifiedInto: merged.id, status: "resolved", resolution: "unified" });
    expect(driftListView(p, false).md).toMatch(/All of them \(unifies 2\)/);
    expect(driftListView(p, true).md).toMatch(/\(unified into /);
    const snapshot = buildSnapshot(p);
    expect(snapshot.drifts.map((d) => d.id)).toEqual([merged.id]);
    expect(snapshot.drifts[0]).toMatchObject({ origin: [t1], previous: [], unifies: [{ id: a.id, title: "A" }, { id: b.id, title: "B" }], unifiedInto: null });
    expect(snapshot.unifiedDrifts.map((d) => d.id)).toEqual([a.id, b.id]);
    expect(snapshot.unifiedDrifts[0]?.unifiedInto).toEqual({ id: merged.id, title: "All of them" });
  });
});
