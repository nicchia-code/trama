import { cardName } from "../src/core/short-numbers";
import { FIX_OPTIONS } from "./fix-options";
import { afterEach, beforeEach, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type MergedState, mergeMachine } from "../src/core/merge";
import { buildModel } from "../src/core/model";
import { editInProposal, newProposal } from "../src/core/proposals";
import { handOver } from "./handover";
import { buildSnapshot } from "../src/core/snapshot";
import { type Project, projectAt } from "../src/core/store";
import { moveTask, newDrift, newTask } from "../src/core/work";
import type { FileMap, Machine } from "../src/core/types";
import { announce, bindDraft, listAnnouncements } from "../src/core/announcements";
import { resolveDriftInProposal } from "../src/core/resolution";


const ACTOR = "# U\n\n## Events\n\n### GO\nx\n\n### STOP\nx\n";
function machine(states: string, events = ""): Machine {
  const f: FileMap = new Map([
    ["system.md", "# S\n"],
    ["actors/u.md", ACTOR],
    ["f/feature.md", "# F\n"],
    ["f/m.md", `# M\n\n## States\n\n${states}\n${events}`],
  ]);
  const model = buildModel(f);
  expect(model.diagnostics).toEqual([]);
  return model.machines.get("m") as Machine;
}

const flat = (states: MergedState[]): MergedState[] => states.flatMap((s) => [s, ...flat(s.children)]);
const byName = (m: { states: MergedState[] }) => Object.fromEntries(flat(m.states).map((s) => [s.name, s]));

const BEFORE = "### A (initial)\n- `u.GO` → B\n\n### B\n- `u.STOP` → C\n\n#### B1 (initial)\n#### B2\n\n### C (final)\n";

test("merge marks added, removed and changed States and Transitions", () => {
  const after = machine("### A (initial)\nNow described.\n- `u.GO` → B: slow\n- `u.STOP` → C\n\n### B\n#### B1 (initial)\n\n### C (final)\n\n### D (final)\n");
  const merged = mergeMachine(machine(BEFORE), after);
  const s = byName(merged);
  expect(merged.change).toBe("same");
  expect(s["A"]?.change).toBe("changed");
  expect(s["A"]?.changes).toEqual(["description"]);
  expect(s["D"]?.change).toBe("added");
  expect(s["B2"]?.change).toBe("removed");
  expect(s["B"]?.change).toBe("same");
  expect(s["B"]?.transitions.map((t) => [t.target, t.change])).toEqual([["C", "removed"]]);
  expect(s["A"]?.transitions.map((t) => [t.event.name, t.change])).toEqual([["GO", "changed"], ["STOP", "added"]]);
});

test("a removed State is drawn under the surviving parent it lived in, and once", () => {
  const merged = mergeMachine(machine(BEFORE), machine("### A (initial)\n\n### B\n#### B1 (initial)\n\n### C (final)\n"));
  const b = merged.states.find((x) => x.name === "B") as MergedState;
  expect(b.children.map((c) => [c.name, c.change])).toEqual([["B1", "same"], ["B2", "removed"]]);
  expect(flat(merged.states).filter((x) => x.name === "B2")).toHaveLength(1);
});

test("a State moved to another parent appears only in its new place", () => {
  const moved = machine("### A (initial)\n\n### B\n#### B1 (initial)\n\n### C\n#### B2 (initial)\n");
  const merged = mergeMachine(machine(BEFORE), moved);
  const where = flat(merged.states).filter((x) => x.name === "B2");
  expect(where).toHaveLength(1);
  expect(where[0]?.parent).toBe("C");
  expect(where[0]?.changes).toContain("parent");
});

test("a Machine that exists on one side only is wholly added or removed", () => {
  const m = machine(BEFORE);
  expect(mergeMachine(undefined, m).change).toBe("added");
  expect(flat(mergeMachine(undefined, m).states).every((s) => s.change === "added" && s.transitions.every((t) => t.change === "added"))).toBe(true);
  expect(mergeMachine(m, undefined).change).toBe("removed");
  expect(flat(mergeMachine(m, undefined).states).every((s) => s.change === "removed")).toBe(true);
});

let dir: string;
let p: Project;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-snap-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

test("the snapshot carries the Model, open Proposals as ghost overlays, Drifts and Tasks", () => {
  const prop = newProposal(p, "Returns");
  const order = editInProposal(p, prop.id, "checkout/order.md");
  writeFileSync(order, readFileSync(order, "utf8").replace("### Shipped (final)", "### Shipped\n- `user.CANCEL` → Returned\n\n### Returned (final)"));
  writeFileSync(editInProposal(p, prop.id, "actors/user.md"), readFileSync(join(dir, ".trama/model/actors/user.md"), "utf8") + "\n### RETURN\nAsks to return.\n");
  const drift = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Code refunds late", refs: ["order/Shipped"], happens: "see refund.ts", should: "The Model says another." });
  const task = newTask(p, { title: "Build cart", refs: ["cart"], technical: false });
  handOver(p, prop.id);
  const done = newProposal(p, "Closed");
  rmSync(join(done.dir, "model"), { recursive: true, force: true });

  const snap = buildSnapshot(p);
  expect(snap.machines.map((m) => m.id).sort()).toEqual(["cart", "order", "payment"]);
  expect(snap.diagnostics).toEqual([]);
  const view = snap.proposals.find((x) => x.id === prop.id);
  expect(view?.errors).toEqual([]);
  expect(view?.machines.map((m) => m.id)).toEqual(["order"]);
  const returned = flat(view?.machines[0]?.states ?? []).find((s) => s.name === "Returned");
  expect(returned?.change).toBe("added");
  expect(view?.actors).toEqual([{ id: "user", change: "modified", events: expect.arrayContaining([{ name: "RETURN", change: "added" }]) }]);
  expect(snap.drifts).toMatchObject([{ id: drift.id, title: "Code refunds late", refs: ["order/Shipped"], proposal: null }]);
  expect(snap.drifts[0]?.body).toContain("see refund.ts");
  expect(snap.tasks[0]).toMatchObject({ title: "Build cart", column: "todo", refs: ["cart"], file: `tasks/${task.name}` });
  expect(JSON.parse(JSON.stringify(snap))).toEqual(snap);
});

test("a Drift announcement keeps the Drift's title in each snapshot, whatever its Draft is called; only its phase changes to Writing the Proposal", () => {
  const draft = newProposal(p, "Draft title", "", { origin: { terminal: "ab12cd" } });
  const drift = announce(p, { kind: "drift", title: "Announced Drift title", terminal: "ab12cd" });
  bindDraft(p, draft, drift.id, { terminal: "ab12cd" });
  expect(buildSnapshot(p).announcements.find((a) => a.id === drift.id)).toMatchObject({ kind: "drift", title: "Announced Drift title", phase: "writing-proposal" });

  writeFileSync(join(draft.dir, "proposal.md"), readFileSync(join(draft.dir, "proposal.md"), "utf8").replace("# Draft title", "# Updated Draft title"));
  expect(buildSnapshot(p).announcements.find((a) => a.id === drift.id)).toMatchObject({ kind: "drift", title: "Announced Drift title", phase: "writing-proposal" });
  expect(listAnnouncements(p).find((a) => a.id === drift.id)?.title).toBe("Announced Drift title");
});

test("the announcement of a refinement is bound to its Proposal: no ghost of its own, and the hand-over delivers it", () => {
  const prop = newProposal(p, "Returns");
  const order = editInProposal(p, prop.id, "checkout/order.md");
  writeFileSync(order, readFileSync(order, "utf8").replace("### Shipped (final)", "### Shipped\n- `user.CANCEL` → Returned\n\n### Returned (final)"));
  writeFileSync(editInProposal(p, prop.id, "actors/user.md"), readFileSync(join(dir, ".trama/model/actors/user.md"), "utf8") + "\n### RETURN\nAsks to return.\n");
  handOver(p, prop.id);
  // The Proposal is Open: its card carries the refinement, so the announcement bound to it is no ghost.
  const refining = announce(p, { kind: "proposal", title: "Returns", proposal: prop.id, source: "request", terminal: "ab12cd" });
  expect(listAnnouncements(p).find((a) => a.id === refining.id)).toMatchObject({ proposal: prop.id, title: "Returns" });
  expect(buildSnapshot(p).announcements.map((a) => a.id)).not.toContain(refining.id);
  expect(buildSnapshot(p).proposals.map((x) => x.id)).toContain(prop.id);
  // A Draft that nobody refines keeps its ghost.
  const draft = newProposal(p, "Draft title", "", { origin: { terminal: "ef34gh" } });
  const ghost = announce(p, { kind: "proposal", title: "Draft title", proposal: draft.id, source: "request", terminal: "ef34gh" });
  expect(buildSnapshot(p).announcements.map((a) => a.id)).toContain(ghost.id);
});

test("a Proposal that would leave the Model invalid reports the errors instead of failing the snapshot", () => {
  const prop = newProposal(p, "Broken");
  const order = editInProposal(p, prop.id, "checkout/order.md");
  writeFileSync(order, readFileSync(order, "utf8").replace("→ Paid", "→ Nowhere"));
  handOver(p, prop.id);
  const view = buildSnapshot(p).proposals[0];
  expect(view?.errors.map((e) => e.message)).toEqual([expect.stringContaining('unknown State "Nowhere"')]);
});

test("the snapshot leaves out a Proposal attached to an open Drift and lists the others", () => {
  const held = newProposal(p, "Held");
  const free = newProposal(p, "Free");
  handOver(p, held.id);
  handOver(p, free.id);
  expect(buildSnapshot(p).proposals.map((x) => x.id).sort()).toEqual([held.id, free.id].sort());
  newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Holds", refs: ["payment"], proposal: held.id, happens: "Code differs.", should: "Model says so." });
  expect(buildSnapshot(p).proposals.map((x) => x.id)).toEqual([free.id]);
});

test("an open Drift carries its two sides and why its attached Proposal cannot be approved, stale included", () => {
  const prop = newProposal(p, "Lost orders");
  const payment = editInProposal(p, prop.id, "checkout/payment.md");
  writeFileSync(payment, readFileSync(payment, "utf8").replace("### Declined (final)", "### Declined (final)\n### Written off (final)"));
  const urgent = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Lost", refs: ["payment"], proposal: prop.id, happens: "Code writes it off.", should: "Nothing writes it off." });
  const legacy = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Theme", refs: ["requirements/ui#General"], happens: "Material 2.", should: "Material 3." });
  writeFileSync(legacy.path, readFileSync(legacy.path, "utf8").replace(/^(status:.*\n)/m, "$1critical: \"urgent\"\n"));
  const drifts = () => buildSnapshot(p).drifts;

  expect(drifts()[0]).toMatchObject({ id: urgent.id, sides: { happens: "Code writes it off.", should: "Nothing writes it off." }, requirementsOnly: false, proposalBlock: { kind: "draft" } });
  expect(drifts()[1]).toMatchObject({ requirementsOnly: true, proposal: null, proposalBlock: null });
  expect(drifts()[0]).toMatchObject({ proposalTitle: "Lost orders", proposalChanges: null });
  handOver(p, prop.id);
  expect(drifts()[0]?.proposalBlock).toBeNull();
  expect(drifts()[0]?.proposalChanges?.map((c) => c.path)).toEqual(["checkout/payment.md"]);
  expect(drifts()[1]).toMatchObject({ proposalTitle: null, proposalChanges: null });
  writeFileSync(join(dir, ".trama/model/checkout/payment.md"), `${readFileSync(join(dir, ".trama/model/checkout/payment.md"), "utf8")}\n`);
  expect(drifts()[0]?.proposalBlock).toMatchObject({ kind: "stale", reason: `Proposal ${cardName(p, "proposal", prop.id)} is stale: the Model changed since it was written.` });
});

test("a Drift's fix options, chosen option and note reach the snapshot in written order; a Drift without them has none", () => {
  const old = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Old", refs: ["payment"], happens: "Code does it.", should: "Model says so." });
  writeFileSync(old.path, readFileSync(old.path, "utf8").replace(/^(option|note):.*\n/gm, "").replace(/\n## Fix options[\s\S]*/, "\n"));
  const resolved = newDrift(p, { options: [{ title: "Change the step", text: "Rewrite the **step**.\n\n- keeps data" }, { title: "Remove the step", text: "Drop it." }], title: "New", refs: ["payment"], happens: "Code does it.", should: "Model says so.", where: "`src/x.ts`" });
  writeFileSync(resolved.path, readFileSync(resolved.path, "utf8").replace("option: null", "option: 2").replace("note: null", "note: Mind the refunds."));
  const drifts = buildSnapshot(p).drifts;
  expect(drifts[0]).toMatchObject({ id: old.id, options: [], option: null, note: null });
  expect(drifts[1]).toMatchObject({
    options: [
      { title: "Change the step", text: "Rewrite the **step**.\n\n- keeps data" },
      { title: "Remove the step", text: "Drop it." },
    ],
    option: 2,
    note: "Mind the refunds.",
    sides: { happens: "Code does it.", should: "Model says so.", where: "`src/x.ts`" },
  });
});

test("a Task's blockers travel in the snapshot: the open Drifts that concern it, and none once it is Done", () => {
  const task = newTask(p, { title: "Cart flow", refs: ["cart"], technical: false });
  const other = newTask(p, { title: "Payment flow", refs: ["payment"], technical: false });
  const drift = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Cart differs", refs: ["cart"], happens: "The code does it one way.", should: "The Model says another." });
  const blockers = () => Object.fromEntries(buildSnapshot(p).tasks.map((t) => [t.id, t.blockedBy]));
  expect(blockers()).toEqual({ [task.id]: [{ kind: "drift", drift: drift.id, title: "Cart differs" }], [other.id]: [] });
  moveTask(p, task.id, "done", "developer");
  expect(blockers()[task.id]).toEqual([]);
});

test("the snapshot carries the Specs and the Specs each open Proposal would write", () => {
  writeFileSync(join(dir, ".trama/specs.yaml"), "languages:\n  - name: TypeScript\n    version: \"5\"\n");
  const prop = newProposal(p, "Stack");
  writeFileSync(join(prop.dir, "specs.yaml"), "languages:\n  - name: TypeScript\n    version: \"5\"\nframeworks:\n  - name: Hono\n");
  handOver(p, prop.id);

  const snap = buildSnapshot(p);
  expect(snap.specs.lists.languages.map((e) => [e.name, e.version])).toEqual([["TypeScript", "5"]]);
  expect(snap.specs.lists.frameworks).toEqual([]);
  const view = snap.proposals.find((x) => x.id === prop.id);
  expect(view?.specs.lists.frameworks.map((e) => e.name)).toEqual(["Hono"]);
  expect(view?.specs.lists.languages.map((e) => e.name)).toEqual(["TypeScript"]);
});

test("a Specs file that is not valid reports its errors and the rest of the snapshot still reads", () => {
  writeFileSync(join(dir, ".trama/specs.yaml"), "languages: nope\n");
  const snap = buildSnapshot(p);
  expect(snap.diagnostics).toEqual([{ file: "specs.yaml", line: 0, message: "languages must be a list of entries" }]);
  expect(snap.machines.map((m) => m.id).sort()).toEqual(["cart", "order", "payment"]);
  expect(snap.specs.lists.languages).toEqual([]);
});

test("the snapshot lists the open Drifts that a resolution being written or open holds, so Dismiss Drift can be disabled", () => {
  const drift = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Held in writing", refs: ["payment"], happens: "Code differs.", should: "Model says so." });
  expect(buildSnapshot(p).resolutionDrifts).toEqual([]);
  const res = newProposal(p, "Resolve", "", { kind: "resolution" });
  resolveDriftInProposal(p, res.id, drift.id, { decision: "dismissed" });
  expect(buildSnapshot(p).resolutionDrifts).toEqual([drift.id]);
});
