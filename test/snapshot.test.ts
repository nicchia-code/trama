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
import { newDrift, newTask } from "../src/core/work";
import type { FileMap, Machine } from "../src/core/types";

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
  newDrift(p, { title: "Code refunds late", refs: ["order/Shipped"], body: "see refund.ts" });
  newTask(p, { title: "Build cart", refs: ["cart"], technical: false });
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
  expect(snap.drifts).toMatchObject([{ id: "0001", title: "Code refunds late", body: "see refund.ts", refs: ["order/Shipped"], proposal: null }]);
  expect(snap.tasks[0]).toMatchObject({ title: "Build cart", column: "todo", refs: ["cart"], file: "tasks/0001-build-cart.md" });
  expect(JSON.parse(JSON.stringify(snap))).toEqual(snap);
});

test("a Proposal that would leave the Model invalid reports the errors instead of failing the snapshot", () => {
  const prop = newProposal(p, "Broken");
  const order = editInProposal(p, prop.id, "checkout/order.md");
  writeFileSync(order, readFileSync(order, "utf8").replace("→ Paid", "→ Nowhere"));
  handOver(p, prop.id);
  const view = buildSnapshot(p).proposals[0];
  expect(view?.errors.map((e) => e.message)).toEqual([expect.stringContaining('unknown State "Nowhere"')]);
});
