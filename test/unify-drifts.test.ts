import { FIX_OPTIONS } from "./fix-options";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmodSync, cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { announce, announcementsDir } from "../src/core/announcements";
import { driftListView, driftShowView } from "../src/cli/work";
import { approveProposal, driftListProblems, getProposal, newProposal, save, submitProposal } from "../src/core/proposals";
import { briefing } from "../src/core/compare";
import { resolvedDrifts, resolveDriftInProposal } from "../src/core/resolution";
import { buildSnapshot } from "../src/core/snapshot";
import { syncShortNumbers } from "../src/core/short-numbers";
import { type Project, projectAt } from "../src/core/store";
import {
  blockedTasks,
  closedOutcome,
  dismissDrift,
  type Drift,
  type DifferenceInput,
  differenceTitle,
  differenceViews,
  driftOptions,
  driftSides,
  getDrift,
  getTask,
  indexDrifts,
  listDrifts,
  listTasks,
  newDrift,
  newTask,
  newUnifiedDrift,
  resolveDrift,
} from "../src/core/work";

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
/** The difference a Drift gives, as `drift new` takes it. */
const diff = (d: Drift, extra: Partial<DifferenceInput> = {}): DifferenceInput => ({
  drift: d.id,
  title: d.title,
  refs: d.data.refs,
  happens: `${d.title} happens.`,
  should: `${d.title} should happen.`,
  where: "src/refund.ts",
  options: FIX_OPTIONS,
  ...extra,
});
/** The input of a unified Drift of `drifts`, in the order given (their creation order). */
const unifyInput = (drifts: Drift[], extra: object = {}) => ({ title: "All of them", unifies: drifts.map((d) => d.id), differences: drifts.map((d) => diff(d)), ...extra });
const unify = (drifts: Drift[], extra: object = {}) => newUnifiedDrift(p, unifyInput(drifts, extra));
const cli = (...args: string[]) => run(["--root", dir, ...args], process.cwd(), {});
const task = (title: string, refs = ["order/Paid"]) => newTask(p, { title, refs, technical: false }).id;
const refuse = (input: object): string => {
  try {
    newUnifiedDrift(p, input as never);
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error("not refused");
};

/** An open resolution deciding the given differences of `unified`, as its entries. */
function resolution(unified: Drift, decisions: { difference: Drift; decision: "fix-code" | "proposal" | "dismissed"; option?: number; note?: string }[]) {
  const r = newProposal(p, "Resolve the differences", "", { kind: "resolution" });
  const written = getProposal(p, r.id);
  written.data.drifts = decisions.map(({ difference, decision, option, note }) => ({ drift: unified.id, difference: difference.id, decision, ...(option === undefined ? {} : { option }), ...(note === undefined ? {} : { note }) }));
  written.data.status = "open";
  save(written);
  return written;
}

describe("a unified Drift", () => {
  test("has one difference for each merged Drift, in creation order, and the merged ones are resolved as unified", () => {
    const t1 = task("One");
    const t2 = task("Two");
    const a = drift("A", { origin: t1 });
    const b = drift("B", { origin: t2, refs: ["order/Shipped"] });
    const c = drift("C", { origin: t1 });
    const { drift: merged, unified } = unify([a, b, c]);
    expect(unified.map((d) => d.id)).toEqual([a.id, b.id, c.id]);
    const read = getDrift(p, merged.id);
    expect(read.data).toMatchObject({ status: "open", resolution: null, unifies: [a.id, b.id, c.id], origin: [t1, t2], proposal: null, task: null, option: null, note: null });
    expect(read.data.refs).toEqual(["order/Paid", "order/Shipped"]);
    expect(read.data.differences.map((d) => d.drift)).toEqual([a.id, b.id, c.id]);
    expect(read.data.differences[1]).toMatchObject({ drift: b.id, refs: ["order/Shipped"], proposal: null, linked: [], decision: null, task: null, resolvedBy: null });
    for (const d of [a, b, c]) expect(getDrift(p, d.id).data).toMatchObject({ status: "resolved", resolution: "unified", unifiedInto: merged.id });
  });

  test("the body has a block for each difference, and the text of one never reaches another section or difference", () => {
    const a = drift("A");
    const b = drift("B");
    const tricky = "Line one.\n\n## Not a heading of Trama\n\n#### Neither\n\nLast line.";
    const { drift: merged } = unify([a, b], { differences: [diff(a, { happens: tricky, options: [{ title: "First", text: "Do the first." }, { title: "Second", text: "Do the second." }] }), diff(b, { where: "src/other.ts" })] });
    const read = getDrift(p, merged.id);
    expect(read.body).toContain(`## Difference ${a.id}: A\n\n### What happens\n\nLine one.`);
    expect(read.body).toContain(`## Difference ${b.id}: B`);
    expect(driftSides(read)).toBeNull();
    expect(driftOptions(read)).toEqual([]);
    expect(driftSides(read, a.id)).toEqual({ happens: tricky, should: "A should happen.", where: "src/refund.ts" });
    expect(driftSides(read, b.id)).toEqual({ happens: "B happens.", should: "B should happen.", where: "src/other.ts" });
    expect(driftOptions(read, a.id)).toEqual([{ title: "First", text: "Do the first." }, { title: "Second", text: "Do the second." }]);
    expect(driftOptions(read, b.id)).toEqual(FIX_OPTIONS);
    expect([differenceTitle(read, a.id), differenceTitle(read, b.id)]).toEqual(["A", "B"]);
  });

  test("linked differences are symmetric and the file reads back the same", () => {
    const a = drift("A");
    const b = drift("B");
    const c = drift("C");
    const { drift: merged } = unify([a, b, c], { differences: [diff(a), diff(b, { linked: [a.id] }), diff(c)] });
    const read = getDrift(p, merged.id);
    expect(read.data.differences.map((d) => d.linked)).toEqual([[b.id], [a.id], []]);
    expect(readFileSync(read.path, "utf8")).toContain("linked:");
  });

  test("the file holds one origin as a string and several as a list, and reads back both ways", () => {
    const t1 = task("One");
    const t2 = task("Two");
    const a = drift("A", { origin: t1 });
    const b = drift("B", { origin: t1 });
    const single = unify([a, b]).drift;
    expect(readFileSync(single.path, "utf8")).toContain(`origin: ${t1}\n`);
    const c = drift("C", { origin: t1 });
    const d = drift("D", { origin: t2 });
    const several = unify([c, d]).drift;
    expect(readFileSync(several.path, "utf8")).toMatch(new RegExp(`origin:\\n  - ${t1}\\n  - ${t2}\\n`));
    expect(getDrift(p, several.id).data.origin).toEqual([t1, t2]);
    expect(unify([drift("N1"), drift("N2")]).drift.data.origin).toEqual([]);
  });

  test("its precedents are those of the merged Drifts and the Drifts its origins fix, without repeats", () => {
    const first = drift("First", { origin: task("Work") });
    resolveDrift(p, first.id, "fix-code", [], { option: 1 });
    const fix = getDrift(p, first.id).data.task as string;
    const earlier = drift("Earlier");
    resolveDrift(p, earlier.id, "fix-code", [], { option: 1 });
    const a = newDrift(p, { ...filing, title: "A", refs: ["order/Paid"], previous: earlier.id });
    const b = drift("B", { origin: fix });
    const merged = unify([a, b]).drift;
    expect(merged.data.previous).toEqual([earlier.id, first.id]);
    expect(merged.data.origin).toEqual([fix]);
  });

  test("a merged Drift keeps its Proposal, held by its difference, unless a new one takes its place on that difference", () => {
    const kept = newProposal(p, "Kept");
    const replaced = newProposal(p, "Replaced");
    const fresh = newProposal(p, "Fresh");
    const a = drift("A", { proposal: kept.id });
    const b = drift("B", { proposal: replaced.id });
    const { drift: merged } = unify([a, b], { differences: [diff(a), diff(b, { proposal: fresh.id })] });
    expect(getProposal(p, kept.id).data.status).toBe("draft");
    expect(getProposal(p, replaced.id).data.status).toBe("discarded");
    expect(getProposal(p, fresh.id).data.status).toBe("draft");
    expect(getDrift(p, a.id).data.proposal).toBe(kept.id);
    expect(getDrift(p, merged.id).data.differences.map((d) => d.proposal)).toEqual([kept.id, fresh.id]);
    // The Proposals are now held by their differences: no other Drift can take them.
    expect(() => newDrift(p, { ...filing, title: "Other", refs: ["order/Paid"], proposal: kept.id })).toThrow(/already attached/);
    expect(() => newDrift(p, { ...filing, title: "Another", refs: ["order/Paid"], proposal: fresh.id })).toThrow(/already attached/);
  });

  test("an open Proposal attached to a merged Drift stays open when it is not replaced, and is discarded when it is", () => {
    const stays = newProposal(p, "Stays");
    const goes = newProposal(p, "Goes");
    for (const id of [stays.id, goes.id]) {
      const draft = getProposal(p, id);
      draft.data.status = "open";
      save(draft);
    }
    const fresh = newProposal(p, "Fresh");
    const a = drift("A", { proposal: stays.id });
    const b = drift("B", { proposal: goes.id });
    unify([a, b], { differences: [diff(a), diff(b, { proposal: fresh.id })] });
    expect(getProposal(p, stays.id).data.status).toBe("open");
    expect(getProposal(p, goes.id).data.status).toBe("discarded");
  });

  test("a difference with no fix options needs a Proposal, a new one that no open Drift holds, or the one of its Drift", () => {
    const own = newProposal(p, "Own");
    const taken = newProposal(p, "Taken");
    const fresh = newProposal(p, "Fresh");
    const a = drift("A", { proposal: own.id });
    const b = drift("B");
    drift("Holder", { proposal: taken.id });
    expect(refuse(unifyInput([a, b], { differences: [diff(a), diff(b, { options: [] })] }))).toMatch(/has no fix options and no attached Proposal/);
    expect(refuse(unifyInput([a, b], { differences: [diff(a), diff(b, { proposal: taken.id })] }))).toMatch(/already attached/);
    expect(refuse(unifyInput([a, b], { differences: [diff(a), diff(b, { proposal: own.id })] }))).toMatch(/already attached/);
    // The Proposal attached to its Drift is enough, with no `proposal` in the difference.
    const { drift: merged } = unify([a, b], { differences: [diff(a, { options: [] }), diff(b, { options: [], proposal: fresh.id })] });
    expect(getDrift(p, merged.id).data.differences.map((d) => d.proposal)).toEqual([own.id, fresh.id]);
    expect(driftOptions(getDrift(p, merged.id), a.id)).toEqual([]);
  });

  test("gathering a unified Drift gives each of its differences to the new one, and one with a decided difference is refused", () => {
    const a = drift("A");
    const b = drift("B");
    const c = drift("C");
    const first = unify([a, b], { differences: [diff(a), diff(b, { linked: [a.id] })] }).drift;
    // `c` was filed before the first unified Drift, so its difference comes first.
    const second = unify([c, first], { differences: [diff(c), diff(a), diff(b, { linked: [a.id] })] });
    expect(second.drift.data.unifies).toEqual([c.id, first.id]);
    expect(second.drift.data.differences.map((d) => d.drift)).toEqual([c.id, a.id, b.id]);
    expect(second.drift.data.differences[2]?.linked).toEqual([a.id]);
    expect(refuse({ title: "T", unifies: [first.id, drift("Next").id], differences: [] })).toMatch(/already resolved/);
    const x = drift("X");
    const y = drift("Y");
    const third = unify([x, y]).drift;
    const decided = getDrift(p, third.id);
    decided.data.differences[0]!.decision = "dismissed";
    writeFileSync(decided.path, readFileSync(decided.path, "utf8").replace(`drift: ${x.id}`, `drift: ${x.id}\n    decision: dismissed`));
    expect(refuse({ title: "T", unifies: [third.id, drift("Z").id], differences: [] })).toMatch(/decided difference/);
  });

  test("is refused, writing nothing and naming every problem", () => {
    const a = drift("A");
    const b = drift("B");
    const done = drift("Done");
    resolveDrift(p, done.id, "dismiss");
    const held = drift("Held");
    const r = newProposal(p, "Resolution", "", { kind: "resolution" });
    resolveDriftInProposal(p, r.id, held.id, { decision: "dismissed" });
    const before = listDrifts(p).length;
    expect(refuse(unifyInput([a]))).toMatch(/at least two/);
    expect(refuse({ ...unifyInput([a, b]), unifies: [a.id, a.id, b.id] })).toMatch(/more than once/);
    expect(refuse({ ...unifyInput([a, b]), unifies: [a.id, "zzzzzzzz"] })).toMatch(/zzzzzzzz/);
    const several = refuse({ title: "T", unifies: [a.id, done.id, held.id], differences: [] });
    expect(several).toContain("already resolved");
    expect(several).toContain("is part of resolution");
    // Wrong differences: missing, unknown, out of order, broken sections or options, bad links, nothing to fix with.
    const missing = refuse(unifyInput([a, b], { differences: [diff(a)] }));
    expect(missing).toContain(`no entry for ${syncShortNumbers(p).name("drift", b.id)}`);
    expect(refuse(unifyInput([a, b], { differences: [diff(b), diff(a)] }))).toMatch(/creation order/);
    expect(refuse(unifyInput([a, b], { differences: [diff(a), diff(a), diff(b)] }))).toMatch(/more than once/);
    expect(refuse(unifyInput([a, b], { differences: [diff(a), diff(held), diff(b)] }))).toMatch(/not one of the differences/);
    const broken = refuse(unifyInput([a, b], { differences: [diff(a, { happens: " ", refs: [], options: [{ title: "Only", text: "one" }] }), diff(b, { linked: [done.id], where: `ok\n### What happens\nx` })] }));
    expect(broken).toContain("What happens");
    expect(broken).toContain("refs");
    expect(broken).toContain("fix options");
    expect(broken).toContain("not another difference");
    expect(broken).toContain("Where in the code");
    expect(broken.split("\n").length).toBeGreaterThanOrEqual(5);
    expect(listDrifts(p).length).toBe(before);
    expect(getDrift(p, a.id).data.status).toBe("open");
  });

  test("a failure while discarding a Proposal restores every file, the announcements bound to it included", () => {
    const first = newProposal(p, "First");
    const second = newProposal(p, "Second");
    const note = announce(p, { kind: "proposal", title: "Writing", proposal: first.id });
    const a = drift("A", { proposal: first.id });
    const b = drift("B", { proposal: second.id });
    const files = [a.path, b.path, join(getProposal(p, first.id).dir, "proposal.md"), join(getProposal(p, second.id).dir, "proposal.md"), join(announcementsDir(p), `${note.id}.md`)];
    const before = files.map((f) => readFileSync(f, "utf8"));
    const count = listDrifts(p).length;
    // The second Proposal cannot be written, so its discard fails after the first one was discarded with its announcement.
    chmodSync(files[3] as string, 0o444);
    const newA = newProposal(p, "New A");
    const newB = newProposal(p, "New B");
    expect(() => unify([a, b], { differences: [diff(a, { proposal: newA.id }), diff(b, { proposal: newB.id })] })).toThrow();
    chmodSync(files[3] as string, 0o644);
    expect(listDrifts(p).length).toBe(count);
    expect(files.map((f) => readFileSync(f, "utf8"))).toEqual(before);
  });

  test("a resolution being written or open that is prepared also holds its Drift", () => {
    const resolutionProposal = newProposal(p, "Prepared", "", { kind: "resolution", prepared: true });
    const held = drift("Held");
    resolveDriftInProposal(p, resolutionProposal.id, held.id, { decision: "dismissed" });
    expect(() => unify([held, drift("Other")])).toThrow(/part of resolution/);
  });

  test("a unified Drift written before the differences existed reads as it did and is never rewritten", () => {
    const a = drift("A");
    const b = drift("B");
    const legacy = drift("Legacy");
    const text = readFileSync(legacy.path, "utf8").replace("status: open", `status: open\nunifies:\n  - ${a.id}\n  - ${b.id}`);
    writeFileSync(legacy.path, text);
    const read = getDrift(p, legacy.id);
    expect(read.data.differences).toEqual([]);
    expect(driftSides(read)).toMatchObject({ happens: "The code does it one way." });
    expect(driftOptions(read)).toEqual(FIX_OPTIONS);
    const resolved = resolveDrift(p, legacy.id, "fix-code", [], { option: 1 });
    expect(resolved.data.resolution).toBe("fix-code");
    expect(readFileSync(legacy.path, "utf8")).not.toContain("differences");
  });
});

describe("what a unified Drift blocks", () => {
  test("blocks each origin and every Task about the same thing, with the refs and origins of its open differences only", () => {
    const t1 = task("One", ["cart"]);
    const t2 = task("Two", ["cart"]);
    const other = task("Other", ["order/Shipped"]);
    const third = task("Third", ["order/Shipped"]);
    const a = drift("A", { origin: t1, refs: ["cart"] });
    const b = drift("B", { origin: t2, refs: ["order/Shipped"] });
    const { drift: merged } = unify([a, b]);
    const blocked = blockedTasks(p);
    expect([...blocked.keys()].sort()).toEqual([t1, t2, other, third].sort());
    expect(blocked.get(t1)?.[0]).toMatchObject({ kind: "drift", drift: merged.id });
    expect(blocked.get(other)?.[0]).toMatchObject({ kind: "drift", drift: merged.id });
    // Deciding the difference of B frees what only it blocked.
    const r = resolution(merged, [{ difference: b, decision: "dismissed" }]);
    approveProposal(p, r.id);
    const after = blockedTasks(p);
    expect([...after.keys()].sort()).toEqual([t1, t2].sort());
    expect(getDrift(p, merged.id).data.status).toBe("open");
  });

  test("dryRun lists the Tasks the unified Drift would block, merged origins included, and writes nothing", () => {
    const t1 = task("One", ["cart"]);
    const a = drift("A", { origin: t1, refs: ["cart"] });
    const b = drift("B");
    const out = JSON.parse(cli("--json", "drift", "new", "--input", JSON.stringify({ unifies: [a.id, b.id], dryRun: true })).out) as { tasks: { id: string }[] };
    expect(out.tasks.map((t) => t.id)).toContain(t1);
    expect(listDrifts(p).length).toBe(2);
    expect(getDrift(p, a.id).data.status).toBe("open");
  });
});

describe("approving a resolution gives each difference its decision", () => {
  function setup() {
    const t1 = task("One", ["order/Paid"]);
    const t2 = task("Two", ["order/Paid"]);
    const t3 = task("Three", ["order/Shipped"]);
    const a = drift("A", { origin: t1 });
    const b = drift("B", { origin: t2 });
    const c = drift("C", { origin: t3, refs: ["order/Shipped"] });
    const { drift: merged } = unify([a, b, c], { differences: [diff(a), diff(b, { linked: [a.id] }), diff(c)] });
    return { t1, t2, t3, a, b, c, merged };
  }

  test("linked differences fixed together share one Task, the others get their own, and the Drift becomes Differences decided", () => {
    const { t1, t2, t3, a, b, c, merged } = setup();
    const r = resolution(merged, [
      { difference: a, decision: "fix-code", option: 1 },
      { difference: b, decision: "fix-code", option: 2, note: "soon" },
      { difference: c, decision: "dismissed" },
    ]);
    const outcome = approveProposal(p, r.id).resolved;
    expect(outcome.map((o) => [o.drift, o.difference, o.decision, o.skipped])).toEqual([
      [merged.id, a.id, "fix-code", false],
      [merged.id, b.id, "fix-code", false],
      [merged.id, c.id, "dismissed", false],
    ]);
    const read = getDrift(p, merged.id);
    expect(read.data).toMatchObject({ status: "resolved", resolution: "differences", proposal: null, task: null, option: null, note: null });
    const [da, db, dc] = read.data.differences;
    expect(da).toMatchObject({ decision: "fix-code", option: 1, note: null, resolvedBy: r.id });
    expect(db).toMatchObject({ decision: "fix-code", option: 2, note: "soon", resolvedBy: r.id });
    expect(da?.task).not.toBeNull();
    expect(db?.task).toBe(da?.task as string);
    expect(dc).toMatchObject({ decision: "dismissed", task: null, resolvedBy: r.id });
    const fix = getTask(p, da?.task as string);
    expect(fix.data).toMatchObject({ technical: false, drift: merged.id, column: "todo" });
    expect(fix.title).toContain("A + B");
    expect(fix.body).toContain("## A");
    expect(fix.body).toContain("## B");
    expect(fix.body).toContain("**Change the code**");
    expect(fix.body).toContain("**Remove the code**");
    expect(fix.body).toContain("soon");
    expect(fix.body.match(/Where in the code/g)).toHaveLength(2);
    expect(listTasks(p).filter((t) => t.data.drift === merged.id)).toHaveLength(1);
    // The origins of the fixed differences wait for the shared Task; the one of the dismissed difference is free.
    const blocked = blockedTasks(p);
    expect(blocked.get(t1)?.[0]).toMatchObject({ kind: "fix", task: fix.id });
    expect(blocked.get(t2)?.[0]).toMatchObject({ kind: "fix", task: fix.id });
    expect(blocked.has(t3)).toBe(false);
    expect(buildSnapshot(p).drifts).toHaveLength(0);
  });

  test("differences that are not linked get a Task each, a Technical one when every ref is a Requirement", () => {
    const a = drift("A");
    const b = drift("B", { refs: ["requirements/ui#General"] });
    const { drift: merged } = unify([a, b]);
    const r = resolution(merged, [
      { difference: a, decision: "fix-code", option: 1 },
      { difference: b, decision: "fix-code", option: 1 },
    ]);
    approveProposal(p, r.id);
    const [da, db] = getDrift(p, merged.id).data.differences;
    expect(da?.task).not.toBe(db?.task);
    expect(getTask(p, da?.task as string).data.technical).toBe(false);
    expect(getTask(p, db?.task as string).data.technical).toBe(true);
  });

  test("the relation of linked is followed through other linked differences fixed in the same resolution only", () => {
    const a = drift("A");
    const b = drift("B");
    const c = drift("C");
    const { drift: merged } = unify([a, b, c], { differences: [diff(a, { linked: [b.id] }), diff(b, { linked: [c.id] }), diff(c)] });
    const r = resolution(merged, [
      { difference: a, decision: "fix-code", option: 1 },
      { difference: c, decision: "fix-code", option: 1 },
    ]);
    approveProposal(p, r.id);
    // B is not fixed here: A and C are linked only through it, so each has its own Task.
    const read = getDrift(p, merged.id);
    expect(read.data.status).toBe("open");
    const [da, db, dc] = read.data.differences;
    expect(da?.task).not.toBeNull();
    expect(dc?.task).not.toBeNull();
    expect(da?.task).not.toBe(dc?.task);
    expect(db).toMatchObject({ decision: null, task: null });
  });

  test("the differences left open keep the Drift Open, blocking with their own refs", () => {
    const { t1, t3, a, b, c, merged } = setup();
    const r = resolution(merged, [{ difference: c, decision: "dismissed" }]);
    approveProposal(p, r.id);
    const read = getDrift(p, merged.id);
    expect(read.data.status).toBe("open");
    expect(read.data.differences.map((d) => d.decision)).toEqual([null, null, "dismissed"]);
    const blocked = blockedTasks(p);
    expect(blocked.has(t1)).toBe(true);
    expect(blocked.get(t3)).toBeUndefined();
    const later = resolution(merged, [{ difference: a, decision: "dismissed" }, { difference: b, decision: "dismissed" }]);
    approveProposal(p, later.id);
    expect(getDrift(p, merged.id).data).toMatchObject({ status: "resolved", resolution: "differences" });
  });

  test("a difference the resolution lists that is already decided is skipped", () => {
    const { a, b, merged } = setup();
    const first = resolution(merged, [{ difference: a, decision: "dismissed" }]);
    approveProposal(p, first.id);
    const second = resolution(merged, [{ difference: a, decision: "dismissed" }, { difference: b, decision: "dismissed" }]);
    const outcome = approveProposal(p, second.id).resolved;
    expect(outcome.map((o) => o.skipped)).toEqual([true, false]);
  });

  test("a fix-code decision on a difference with fix options needs one of them, and nothing is written when it fails", () => {
    const { a, merged } = setup();
    const r = resolution(merged, [{ difference: a, decision: "fix-code" }]);
    const before = listTasks(p).length;
    expect(() => approveProposal(p, r.id)).toThrow(/option must be chosen/);
    expect(listTasks(p).length).toBe(before);
  });

  test("resolvedDrifts gives one line for each decided difference", () => {
    const { a, b, merged } = setup();
    const r = resolution(merged, [{ difference: a, decision: "fix-code", option: 2 }, { difference: b, decision: "dismissed" }]);
    expect(resolvedDrifts(p, r)).toMatchObject([
      { drift: merged.id, difference: a.id, title: "A", decision: "Code fixed with option Remove the code" },
      { drift: merged.id, difference: b.id, title: "B", decision: "Closed, nothing changes" },
    ]);
  });
});

describe("a unified Drift is not a decision of the merged Drift while its difference is open", () => {
  test("it is no precedent, is refused by drift move, and a half-written file does not read", () => {
    const a = drift("A");
    const b = drift("B");
    unify([a, b]);
    expect(() => newDrift(p, { ...filing, title: "Next", refs: ["order/Paid"], previous: a.id })).toThrow(/difference is not decided/);
    expect(() => resolveDrift(p, a.id, "dismiss")).toThrow(/was unified into/);
    expect(() => cli("drift", "move", a.id, "dismissed")).toThrow(/was unified into/);
    const text = readFileSync(getDrift(p, a.id).path, "utf8");
    writeFileSync(getDrift(p, a.id).path, text.replace(/unifiedInto: .*\n/, ""));
    expect(() => getDrift(p, a.id)).toThrow(/unifiedInto/);
    writeFileSync(getDrift(p, b.id).path, readFileSync(getDrift(p, b.id).path, "utf8").replace("resolution: unified", "resolution: dismissed"));
    expect(() => getDrift(p, b.id)).toThrow(/unifiedInto/);
  });

  test("once decided it counts as resolved with that decision on the refs of its difference", () => {
    const a = drift("A", { origin: task("Work") });
    const b = drift("B", { refs: ["order/Shipped"] });
    const c = drift("C");
    const { drift: merged } = unify([a, b, c]);
    const index = () => indexDrifts(listDrifts(p));
    expect(closedOutcome(getDrift(p, a.id), index())).toBeNull();
    expect(briefing(p, "order", ["order/Paid"]).closedDrifts).toEqual([]);
    const r = resolution(merged, [{ difference: a, decision: "fix-code", option: 1 }, { difference: b, decision: "dismissed" }]);
    approveProposal(p, r.id);
    expect(closedOutcome(getDrift(p, a.id), index())).toMatchObject({ decision: "fix-code", refs: ["order/Paid"] });
    expect(closedOutcome(getDrift(p, b.id), index())).toMatchObject({ decision: "dismissed", refs: ["order/Shipped"] });
    expect(closedOutcome(getDrift(p, c.id), index())).toBeNull();
    expect(getDrift(p, a.id).data.resolution).toBe("unified");
    const closed = briefing(p, "order", ["order/Paid", "order/Shipped"]).closedDrifts;
    expect(closed.map((x) => [x.drift.id, x.decision]).sort()).toEqual([[a.id, "fix-code"], [b.id, "dismissed"]].sort());
    // A difference fixed in the code can be named as previous, with the identity of its Drift; one closed without changes cannot.
    const next = newDrift(p, { ...filing, title: "Next", refs: ["order/Paid"], previous: a.id });
    expect(next.data.previous).toEqual([a.id]);
    expect(() => newDrift(p, { ...filing, title: "Again", refs: ["order/Shipped"], previous: b.id })).toThrow(/was dismissed/);
    expect(() => newDrift(p, { ...filing, title: "Still open", refs: ["order/Paid"], previous: c.id })).toThrow(/difference is not decided/);
  });

  test("a Drift born from the fix Task of linked differences follows the Drifts of those differences", () => {
    const t1 = task("One");
    const a = drift("A", { origin: t1 });
    const b = drift("B");
    const { drift: merged } = unify([a, b], { differences: [diff(a), diff(b, { linked: [a.id] })] });
    approveProposal(p, resolution(merged, [{ difference: a, decision: "fix-code", option: 1 }, { difference: b, decision: "fix-code", option: 1 }]).id);
    const fix = getDrift(p, merged.id).data.differences[0]?.task as string;
    const next = newDrift(p, { ...filing, title: "Next", refs: ["order/Paid"], origin: fix });
    expect(next.data.previous).toEqual([a.id, b.id]);
  });
});

describe("the command line on a unified Drift with differences", () => {
  test("drift move toward code-to-be-fixed or proposal-accepted is refused, and dismissed closes every open difference", () => {
    const a = drift("A", { origin: task("One") });
    const b = drift("B");
    const { drift: merged } = unify([a, b]);
    const name = syncShortNumbers(p).name("drift", merged.id);
    expect(() => cli("drift", "move", merged.id, "code-to-be-fixed", "--input", JSON.stringify({ option: 1 }))).toThrow(`Drift ${name} has differences: decide them with Resolve`);
    expect(() => cli("drift", "move", merged.id, "proposal-accepted")).toThrow(`Drift ${name} has differences: decide them with Resolve`);
    expect(getDrift(p, merged.id).data.status).toBe("open");
    const task1 = getDrift(p, a.id).data.origin[0] as string;
    cli("drift", "move", merged.id, "dismissed");
    const read = getDrift(p, merged.id);
    expect(read.data).toMatchObject({ status: "resolved", resolution: "differences" });
    expect(read.data.differences.map((d) => [d.decision, d.resolvedBy, d.task])).toEqual([["dismissed", null, null], ["dismissed", null, null]]);
    expect(blockedTasks(p).has(task1)).toBe(false);
    expect(getTask(p, task1).data.column).toBe("todo");
  });

  test("dismissed is refused when an open difference has an attached Proposal, and the panel's Dismiss Drift discards it", () => {
    const own = newProposal(p, "Own");
    const a = drift("A", { proposal: own.id });
    const b = drift("B");
    const { drift: merged } = unify([a, b], { differences: [diff(a, { proposal: own.id }), diff(b)] });
    expect(() => cli("drift", "move", merged.id, "dismissed")).toThrow(/attached Proposal/);
    expect(getDrift(p, merged.id).data.status).toBe("open");
    const dismissed = dismissDrift(p, merged.id);
    expect(dismissed.data).toMatchObject({ status: "resolved", resolution: "differences" });
    expect(dismissed.data.differences.map((d) => [d.decision, d.proposal])).toEqual([["dismissed", null], ["dismissed", null]]);
    expect(getProposal(p, own.id).data.status).toBe("discarded");
  });

  test("Dismiss Drift leaves the differences already decided as they are", () => {
    const a = drift("A");
    const b = drift("B");
    const { drift: merged } = unify([a, b]);
    approveProposal(p, resolution(merged, [{ difference: a, decision: "fix-code", option: 1 }]).id);
    const dismissed = dismissDrift(p, merged.id);
    expect(dismissed.data.differences.map((d) => d.decision)).toEqual(["fix-code", "dismissed"]);
    expect(dismissed.data.differences[0]?.task).not.toBeNull();
  });

  test("drift new with unifies prints a line for each merged Drift; the top-level fields are usage errors", () => {
    const a = drift("A");
    const b = drift("B");
    const shortA = syncShortNumbers(p).label("drift", a.id) as string;
    const input = { ...unifyInput([a, b]), unifies: [shortA, b.id], differences: [diff(a, { drift: shortA }), diff(b)] };
    for (const field of ["task", "previous", "refs", "happens", "should", "where", "options", "proposal"]) {
      const value = field === "refs" || field === "options" ? [] : "x";
      expect(() => cli("drift", "new", "--input", JSON.stringify({ ...input, [field]: value }))).toThrow(new RegExp(field));
    }
    expect(() => cli("drift", "new", "--input", JSON.stringify({ title: "T", refs: ["order/Paid"], happens: "h", should: "s", where: "w", options: FIX_OPTIONS, differences: [diff(a)] }))).toThrow(/differences/);
    expect(() => cli("drift", "new", "--input", JSON.stringify({ title: "T", unifies: [a.id, b.id] }))).toThrow(/differences/);
    expect(listDrifts(p).length).toBe(2);
    const created = JSON.parse(cli("--json", "drift", "new", "--input", JSON.stringify(input)).out) as { id: string; unified: string[]; previous: string[]; unifies: string[]; differences: { drift: string; title: string; open: boolean }[] };
    expect(created.unified).toEqual([a.id, b.id]);
    expect(created.unifies).toEqual([a.id, b.id]);
    expect(created.differences.map((d) => [d.drift, d.title, d.open])).toEqual([[a.id, "A", true], [b.id, "B", true]]);
    const c = drift("C");
    const d = drift("D");
    const text = cli("drift", "new", "--input", JSON.stringify({ ...unifyInput([c, d]), title: "Again" })).out;
    expect(text).toMatch(/Unified \w{8} into \w{8}/);
  });

  test("a refusal exits with the problems one per line and writes nothing", () => {
    const a = drift("A");
    const b = drift("B");
    expect(() => cli("drift", "new", "--input", JSON.stringify(unifyInput([a, b], { differences: [diff(a)] })))).toThrow(/no entry for/);
    expect(getDrift(p, a.id).data.status).toBe("open");
  });

  test("show, list and the Snapshot carry unifies, unifiedInto, origin, previous and the differences", () => {
    const t1 = task("One");
    const a = drift("A", { origin: t1 });
    const b = drift("B");
    const { drift: merged } = unify([a, b], { differences: [diff(a, { linked: [b.id] }), diff(b)] });
    const shown = driftShowView(p, getDrift(p, merged.id));
    expect(shown.md).toContain("## Unifies");
    expect(shown.md).toContain(`- ${a.id} A`);
    expect(shown.md).toMatch(new RegExp(`Difference ${a.id} A\\nopen\\nLinked to ${b.id} B`));
    expect(shown.md).toContain("### What happens\n\nA happens.");
    expect(shown.json).toMatchObject({ unifies: [a.id, b.id], unifiedInto: null, origin: [t1], previous: [] });
    expect((shown.json as { differences: { drift: string; open: boolean; linked: string[]; options: unknown[] }[] }).differences.map((d) => [d.drift, d.open, d.linked.length, d.options.length])).toEqual([[a.id, true, 1, 2], [b.id, true, 1, 2]]);
    const into = driftShowView(p, getDrift(p, a.id));
    expect(into.md.split("\n")[1]).toMatch(new RegExp(`^Unified into D\\d+ All of them$`));
    expect(into.json).toMatchObject({ unifiedInto: merged.id, status: "resolved", resolution: "unified", differences: [] });
    expect(driftListView(p, false).md).toMatch(/All of them \(unifies 2, 2 open\)/);
    expect(driftListView(p, true).md).toMatch(/\(unified into /);
    expect((driftListView(p, false).json as { drifts: { differences: unknown }[] }).drifts[0]?.differences).toEqual({ total: 2, open: 2 });
    const snapshot = buildSnapshot(p);
    expect(snapshot.drifts.map((d) => d.id)).toEqual([merged.id]);
    expect(snapshot.drifts[0]).toMatchObject({ origin: [t1], previous: [], unifies: [{ id: a.id, title: "A" }, { id: b.id, title: "B" }], unifiedInto: null });
    expect(snapshot.drifts[0]?.differences).toEqual(differenceViews(getDrift(p, merged.id)));
    expect(snapshot.drifts[0]?.differences[0]).toMatchObject({ drift: a.id, title: "A", refs: ["order/Paid"], where: "src/refund.ts", proposal: null, linked: [b.id], decision: null, task: null, open: true });
    expect(snapshot.unifiedDrifts.map((d) => d.id)).toEqual([a.id, b.id]);
    expect(snapshot.unifiedDrifts[0]?.unifiedInto).toEqual({ id: merged.id, title: "All of them" });
    expect(snapshot.unifiedDrifts[0]?.differences).toEqual([]);
  });

  test("the differences of a decided Drift keep their outcome in show", () => {
    const a = drift("A", { origin: task("One") });
    const b = drift("B");
    const { drift: merged } = unify([a, b]);
    approveProposal(p, resolution(merged, [{ difference: a, decision: "fix-code", option: 2 }, { difference: b, decision: "dismissed" }]).id);
    const read = getDrift(p, merged.id);
    const shown = driftShowView(p, read);
    expect(shown.md).toContain("fix code: Remove the code (Task ");
    expect(shown.md).toMatch(new RegExp(`Difference ${b.id} B\\ndismissed`));
    expect(shown.md).not.toContain("### What happens");
    expect(shown.md).toContain("(differences)");
  });
});

describe("drift edit on a unified Drift with differences", () => {
  const question = (id: string, options = 3, recommended = 0) => ({
    id,
    question: "What should change?",
    options: Array.from({ length: options }, (_, i) => ({ label: `Option ${i + 1}`, description: `Does ${i + 1}.` })),
    recommended,
    multi: false,
  });

  test("writes the questions of some differences, keeps the others and validates each on its own difference", () => {
    const a = drift("A");
    const b = drift("B");
    const { drift: merged } = unify([a, b]);
    const edit = (input: object) => JSON.parse(cli("--json", "drift", "edit", merged.id, "--input", JSON.stringify(input)).out) as { prepared: { valid: boolean } | null };
    const decisions = [{ decision: "fix-code", option: 1 }, { decision: "fix-code", option: 2 }, { decision: "dismissed" }];
    expect(edit({ prepared: { questions: [{ difference: a.id, question: question(a.id), decisions }] } }).prepared).toEqual({ valid: false });
    expect(edit({ prepared: { questions: [{ difference: b.id, question: question(b.id), decisions }] } }).prepared).toEqual({ valid: true });
    const body = getDrift(p, merged.id).body;
    expect(body).toContain("## Prepared question");
    expect(body.indexOf("## Difference")).toBeLessThan(body.indexOf("## Prepared question"));
    const section = JSON.parse(/```json\n([\s\S]*?)\n```/.exec(body)?.[1] as string) as { questions: { difference: string; fingerprint: string }[]; prepared: string };
    expect(section.questions.map((q) => q.difference)).toEqual([a.id, b.id]);
    expect(section.questions.every((q) => q.fingerprint.length > 0)).toBe(true);
    expect(driftSides(getDrift(p, merged.id), b.id)?.should).toBe("B should happen.");
    // Wrong shapes name the field and write nothing.
    expect(() => cli("drift", "edit", merged.id, "--input", JSON.stringify({ prepared: { question: question(merged.id), decisions } }))).toThrow(/prepared\.question/);
    expect(() => cli("drift", "edit", merged.id, "--input", JSON.stringify({ prepared: { questions: [{ difference: a.id, question: question(b.id), decisions }] } }))).toThrow(/questions\[0\]\.question\.id/);
    expect(() => cli("drift", "edit", merged.id, "--input", JSON.stringify({ prepared: { questions: [{ difference: a.id, question: question(a.id), decisions: decisions.slice(0, 2) }] } }))).toThrow(/questions\[0\]\.decisions/);
    expect(() => cli("drift", "edit", merged.id, "--input", JSON.stringify({ prepared: { questions: [{ difference: "zzzzzzzz", question: question(a.id), decisions }] } }))).toThrow(/difference/);
    expect(() => cli("drift", "edit", a.id.slice(0, 8), "--input", JSON.stringify({ prepared: { questions: [] } }))).toThrow();
  });

  test("attaches a Proposal to one difference, which then holds it; the round is valid only with a question for every open difference", () => {
    const a = drift("A");
    const b = drift("B");
    const { drift: merged } = unify([a, b]);
    const proposal = newProposal(p, "Adapt the Model");
    cli("drift", "edit", merged.id, "--input", JSON.stringify({ proposal: { difference: b.id, proposal: proposal.id } }));
    expect(getDrift(p, merged.id).data.differences.map((d) => d.proposal)).toEqual([null, proposal.id]);
    expect(() => cli("drift", "edit", merged.id, "--input", JSON.stringify({ proposal: { difference: a.id, proposal: proposal.id } }))).toThrow(/already attached/);
    expect(() => cli("drift", "edit", merged.id, "--input", JSON.stringify({ proposal: { difference: b.id, proposal: newProposal(p, "Other").id } }))).toThrow(/already has the attached/);
    expect(() => cli("drift", "edit", merged.id, "--input", JSON.stringify({ proposal: proposal.id }))).toThrow(/difference/);
    const plain = drift("Plain");
    expect(() => cli("drift", "edit", plain.id, "--input", JSON.stringify({ proposal: { difference: plain.id, proposal: proposal.id } }))).toThrow(/difference/);
    // A proposal decision on the question of B is now allowed, on that of A it is not.
    const withProposal = [{ decision: "fix-code", option: 1 }, { decision: "fix-code", option: 2 }, { decision: "proposal" }];
    expect(() => cli("drift", "edit", merged.id, "--input", JSON.stringify({ prepared: { questions: [{ difference: a.id, question: question(a.id), decisions: withProposal }] } }))).toThrow(/attached Proposal/);
    cli("drift", "edit", merged.id, "--input", JSON.stringify({ prepared: { questions: [{ difference: b.id, question: question(b.id), decisions: withProposal }] } }));
  });
});

describe("the entries of a resolution are indexed by Drift and difference", () => {
  const draft = () => newProposal(p, "Resolve the differences", "", { kind: "resolution" });
  const entries = (id: string) => getProposal(p, id).data.drifts;
  const edit = (id: string, input: object) => cli("proposal", "edit", id, "--input", JSON.stringify(input));

  test("proposal edit records one entry for each difference, by identity or short number, replaces and removes it", () => {
    const a = drift("A");
    const b = drift("B");
    const { drift: merged } = unify([a, b]);
    const r = draft();
    // The merged Drifts lose their short number: the unified Drift is cited by its own.
    const shortMerged = syncShortNumbers(p).label("drift", merged.id) as string;
    const printed = edit(r.id, { drifts: [{ drift: shortMerged, difference: a.id, decision: "fix-code", option: 1 }, { drift: merged.id, difference: b.id, decision: "dismissed" }] }).out;
    expect(printed).toContain("difference");
    expect(entries(r.id)).toEqual([
      { drift: merged.id, difference: a.id, decision: "fix-code", option: 1 },
      { drift: merged.id, difference: b.id, decision: "dismissed" },
    ]);
    edit(r.id, { drifts: [{ drift: merged.id, difference: a.id, decision: "fix-code", option: 2, note: "soon" }] });
    expect(entries(r.id)[0]).toEqual({ drift: merged.id, difference: a.id, decision: "fix-code", option: 2, note: "soon" });
    edit(r.id, { removeDrifts: [{ drift: merged.id, difference: a.id }] });
    expect(entries(r.id)).toEqual([{ drift: merged.id, difference: b.id, decision: "dismissed" }]);
    expect(() => edit(r.id, { removeDrifts: [{ drift: merged.id, difference: a.id }] })).toThrow(/is not in Proposal/);
    // A Drift named without a difference takes out every entry of it.
    edit(r.id, { drifts: [{ drift: merged.id, difference: a.id, decision: "dismissed" }] });
    edit(r.id, { removeDrifts: [merged.id] });
    expect(entries(r.id)).toEqual([]);
  });

  test("an entry without its difference, with a foreign one, or on another Drift is refused naming the entry, and nothing is written", () => {
    const a = drift("A");
    const b = drift("B");
    const { drift: merged } = unify([a, b]);
    const plain = drift("Plain");
    const other = drift("Other");
    const r = draft();
    expect(() => edit(r.id, { drifts: [{ drift: merged.id, decision: "dismissed" }] })).toThrow(/has no "difference"/);
    expect(() => edit(r.id, { drifts: [{ drift: merged.id, difference: other.id, decision: "dismissed" }] })).toThrow(/names a difference the Drift does not have/);
    expect(() => edit(r.id, { drifts: [{ drift: plain.id, difference: plain.id, decision: "dismissed" }] })).toThrow(/is not a unified Drift with differences/);
    expect(() => edit(r.id, { drifts: [{ drift: merged.id, difference: "zzzzzzzz", decision: "dismissed" }] })).toThrow();
    expect(entries(r.id)).toEqual([]);
    // A difference already decided cannot be listed again.
    approveProposal(p, resolution(merged, [{ difference: a, decision: "dismissed" }]).id);
    expect(() => edit(r.id, { drifts: [{ drift: merged.id, difference: a.id, decision: "dismissed" }] })).toThrow(/already decided/);
    edit(r.id, { drifts: [{ drift: merged.id, difference: b.id, decision: "dismissed" }] });
    expect(entries(r.id)).toHaveLength(1);
  });

  test("a difference is held by one resolution at a time, and a fix-code decision needs a fix option of that difference", () => {
    const own = newProposal(p, "Own");
    const a = drift("A", { proposal: own.id });
    const b = drift("B");
    const { drift: merged } = unify([a, b], { differences: [diff(a, { options: [] }), diff(b)] });
    const first = draft();
    edit(first.id, { drifts: [{ drift: merged.id, difference: a.id, decision: "proposal" }] });
    const second = draft();
    expect(() => edit(second.id, { drifts: [{ drift: merged.id, difference: b.id, decision: "dismissed" }] })).toThrow(/already in resolution/);
    edit(first.id, { removeDrifts: [{ drift: merged.id, difference: a.id }] });
    expect(() => edit(first.id, { drifts: [{ drift: merged.id, difference: a.id, decision: "fix-code", option: 1 }] })).toThrow(/fix option/);
    expect(() => edit(first.id, { drifts: [{ drift: merged.id, difference: b.id, decision: "fix-code", option: 3 }] })).toThrow(/option/);
    edit(first.id, { drifts: [{ drift: merged.id, difference: b.id, decision: "fix-code", option: 1 }] });
    expect(entries(first.id)).toEqual([{ drift: merged.id, difference: b.id, decision: "fix-code", option: 1 }]);
  });

  test("the hand-over checks each entry for its own difference", () => {
    const a = drift("A");
    const b = drift("B");
    const { drift: merged } = unify([a, b]);
    const plain = drift("Plain");
    const r = draft();
    const bad = getProposal(p, r.id);
    bad.data.drifts = [
      { drift: merged.id, decision: "dismissed" },
      { drift: plain.id, difference: plain.id, decision: "dismissed" },
    ];
    save(bad);
    const problems = driftListProblems(p, getProposal(p, r.id));
    expect(problems.filter((x) => x.includes("has no \"difference\""))).toHaveLength(1);
    expect(problems.filter((x) => x.includes("which the Drift does not have"))).toHaveLength(1);
    expect(() => submitProposal(p, r.id)).toThrow();
    const good = getProposal(p, r.id);
    good.data.drifts = [
      { drift: merged.id, difference: a.id, decision: "fix-code", option: 1 },
      { drift: merged.id, difference: b.id, decision: "dismissed" },
    ];
    save(good);
    expect(driftListProblems(p, getProposal(p, r.id))).toEqual([]);
    expect(submitProposal(p, r.id).data.status).toBe("open");
    // Once a difference is decided by another resolution, the entry for it is a problem of the list.
    approveProposal(p, resolution(merged, [{ difference: a, decision: "dismissed" }]).id);
    expect(driftListProblems(p, getProposal(p, r.id)).join("\n")).toContain(`The difference ${syncShortNumbers(p).name("drift", a.id)} of Drift ${syncShortNumbers(p).name("drift", merged.id)} is no longer open`);
  });

  test("proposal show lists the decisions by difference, in text and in JSON", () => {
    const a = drift("A");
    const b = drift("B");
    const { drift: merged } = unify([a, b]);
    const r = resolution(merged, [{ difference: a, decision: "fix-code", option: 1 }, { difference: b, decision: "dismissed" }]);
    const n = syncShortNumbers(p);
    const shown = cli("proposal", "show", r.id).out;
    expect(shown).toContain(`${n.name("drift", merged.id)}, difference ${n.name("drift", a.id)} A: Code fixed with option`);
    expect(shown).toContain(`difference ${n.name("drift", b.id)} B: Closed, nothing changes`);
    const json = JSON.parse(cli("--json", "proposal", "show", r.id).out) as { resolvedDrifts?: { drift: string; difference?: string }[]; drifts?: { drift: string; difference?: string }[] };
    const listed = json.resolvedDrifts ?? json.drifts ?? [];
    expect(listed.map((d) => d.difference)).toEqual([a.id, b.id]);
  });
});
