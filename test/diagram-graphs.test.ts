import { expect, test } from "bun:test";
import { withDrifts } from "../extension/src/webview/diagram/drifts";
import { detailOfSelection, requirementItems } from "../extension/src/webview/diagram/details";
import type { GraphSpec } from "../extension/src/webview/diagram/graph";
import { buildGraph } from "../extension/src/webview/diagram/levels";
import { machineGraph, visibleState } from "../extension/src/webview/diagram/machine";
import { featureGraph, flows, shortNames, systemGraph } from "../extension/src/webview/diagram/overview";
import { buildScene } from "../extension/src/webview/diagram/scene";
import type { AreaView, FragmentView, SectionView } from "../src/core/snapshot";
import type { FileMap } from "../src/core/types";
import { shopSnapshot, shopWithProposals, shopWithRemovals, snapshotOf } from "./diagram-fixture";

const scene = buildScene(shopSnapshot(), null);
const edgeOf = (g: GraphSpec, id: string) => g.edges.find((e) => e.id === id);
const nodeOf = (g: GraphSpec, id: string) => g.nodes.find((n) => n.id === id);

test("System level: Features and Actors as nodes, Actor edges count their Events", () => {
  const g = systemGraph(scene);
  expect(g.nodes.map((n) => [n.id, n.kind])).toEqual([["a:courier", "actor"], ["a:stripe", "actor"], ["a:user", "actor"], ["a:warehouse", "actor"], ["f:checkout", "feature"]]);
  expect(nodeOf(g, "f:checkout")?.sub).toBe("3 machines");
  expect(g.edges.map((e) => [e.source, e.target, e.label])).toEqual([
    ["a:user", "f:checkout", "3"],
    ["a:warehouse", "f:checkout", "1"],
    ["a:courier", "f:checkout", "1"],
    ["a:stripe", "f:checkout", "3"],
  ]);
  const user = edgeOf(g, "e:a:user>f:checkout");
  expect(user?.items.map((i) => i.label).sort()).toEqual(["user.ADD_ITEM", "user.CANCEL", "user.CHECKOUT"]);
  expect(user?.items.find((i) => i.label === "user.CANCEL")?.text).toBe("received by order/Paid");
});

test("System level: Events between Machines of different Features join the Features, inside one Feature they are dropped", () => {
  const files: FileMap = new Map([
    ["system.md", "# S\n"],
    ["actors/u.md", "# U\n\n## Events\n\n### GO\nx\n"],
    ["a/feature.md", "# A\n"],
    ["a/m1.md", "# M1\n\n## States\n\n### X (initial)\n- `u.GO` → Y\n- `m2.PING` → Y\n\n### Y\n\n## Events\n\n### HELLO\nx\n"],
    ["a/m2.md", "# M2\n\n## States\n\n### P (initial)\n- `m1.HELLO` → Q\n\n### Q\n\n## Events\n\n### PING\nx\n"],
    ["b/feature.md", "# B\n"],
    ["b/m3.md", "# M3\n\n## States\n\n### R (initial)\n- `m1.HELLO` → S\n- `u.GO` → S\n\n### S\n"],
  ]);
  const two = buildScene(snapshotOf(files), null);
  const g = systemGraph(two);
  expect(g.edges.map((e) => [e.source, e.target, e.label])).toEqual([
    ["a:u", "f:a", "1"],
    ["f:a", "f:b", "1"],
    ["a:u", "f:b", "1"],
  ]);
  const feature = featureGraph(two, "b");
  expect(nodeOf(feature, "m:m1")).toMatchObject({ external: true, sub: "a", layer: "first" });
  expect(nodeOf(feature, "a:u")?.external).toBe(true);
  expect(feature.edges.map((e) => [e.source, e.target, e.label])).toEqual([
    ["m:m1", "m:m3", "HELLO"],
    ["a:u", "m:m3", "GO"],
  ]);
});

test("Feature level: Machines, plus the senders that feed them; edges are aggregated per pair", () => {
  const g = featureGraph(scene, "checkout");
  expect(g.nodes.filter((n) => !n.external).map((n) => [n.id, n.sub])).toEqual([["m:cart", "3 states"], ["m:order", "8 states"], ["m:payment", "6 states"]]);
  expect(g.nodes.filter((n) => n.external).map((n) => n.id).sort()).toEqual(["a:courier", "a:stripe", "a:user", "a:warehouse"]);
  expect(g.edges.map((e) => [e.source, e.target, e.label])).toEqual([
    ["a:user", "m:cart", "ADD_ITEM, CHECKOUT"],
    ["m:cart", "m:order", "CONFIRM"],
    ["m:payment", "m:order", "SUCCEEDED, DECLINED +1"],
    ["a:user", "m:order", "CANCEL"],
    ["a:warehouse", "m:order", "PACKAGE_READY"],
    ["a:courier", "m:order", "PICKED_UP"],
    ["m:order", "m:payment", "CONFIRMED, REFUND_REQUESTED"],
    ["a:stripe", "m:payment", "CHARGE_OK, CHARGE_FAILED +1"],
  ]);
  expect(shortNames(["A", "B"])).toBe("A, B");
  expect(shortNames(["A", "B", "C", "D", "E"])).toBe("A, B +3");
  expect(flows(scene)).toHaveLength(16);
});

test("Machine level: initial markers, final States and one edge per Transition group", () => {
  const g = machineGraph(scene, "order", null, new Set());
  expect(g.nodes.filter((n) => n.kind === "state").map((n) => [n.label, n.initial, n.final, n.children])).toEqual([
    ["Draft", true, false, 0],
    ["Awaiting payment", false, false, 0],
    ["Paid", false, false, 2],
    ["Refunding", false, false, 0],
    ["Shipped", false, true, 0],
    ["Cancelled", false, true, 0],
  ]);
  expect(g.nodes.filter((n) => n.kind === "marker")).toHaveLength(1);
  expect(g.edges.filter((e) => e.kind === "initial").map((e) => [e.source, e.target])).toEqual([["i:root", "s:Draft"]]);
  expect(nodeOf(g, "s:Paid")?.sub).toBe("2 sub-states");
  const cancel = g.edges.filter((e) => e.label === "user.CANCEL").map((e) => [e.source, e.target]);
  expect(cancel).toEqual([["s:Paid", "s:Cancelled"], ["s:Paid", "s:Refunding"]]);
  expect(edgeOf(g, "t:s:Awaiting payment>s:Cancelled#payment.DECLINED")?.items[0]).toMatchObject({ from: "Awaiting payment", to: "Cancelled", text: "tells the customer by email." });
});

test("Machine level: Transitions between States hidden in a collapsed State disappear, the ones leaving it attach to it", () => {
  const order = scene.machine.get("order") as never;
  expect(visibleState(order, "Preparing", null, new Set())).toBe("Paid");
  expect(visibleState(order, "Preparing", null, new Set(["Paid"]))).toBe("Preparing");
  expect(visibleState(order, "Draft", null, new Set(["Paid"]))).toBe("Draft");
  expect(visibleState(order, "Shipped", "Paid", new Set())).toBeNull();
  expect(visibleState(order, "Paid", "Paid", new Set())).toBeNull();

  const collapsed = machineGraph(scene, "order", null, new Set());
  expect(collapsed.nodes.some((n) => n.id === "s:Preparing")).toBe(false);
  expect(collapsed.edges.some((e) => e.label === "warehouse.PACKAGE_READY")).toBe(false);
  expect(edgeOf(collapsed, "t:s:Paid>s:Shipped#courier.PICKED_UP")?.items[0]).toMatchObject({ from: "Ready to ship", to: "Shipped" });
  expect(collapsed.nodes.filter((n) => n.kind === "marker")).toHaveLength(1);

  const open = machineGraph(scene, "order", null, new Set(["Paid"]));
  expect(nodeOf(open, "s:Paid")).toMatchObject({ expanded: true, children: 2 });
  expect(nodeOf(open, "s:Preparing")?.parent).toBe("s:Paid");
  expect(nodeOf(open, "i:Paid")).toMatchObject({ kind: "marker", parent: "s:Paid" });
  expect(edgeOf(open, "t:s:Preparing>s:Ready to ship#warehouse.PACKAGE_READY")).toBeDefined();
  expect(edgeOf(open, "t:s:Ready to ship>s:Shipped#courier.PICKED_UP")).toBeDefined();
  expect(edgeOf(open, "t:s:Paid>s:Shipped#courier.PICKED_UP")).toBeUndefined();
  // Declared once on the parent, drawn once from the parent, however it is expanded.
  expect(open.edges.filter((e) => e.label === "user.CANCEL").map((e) => e.source)).toEqual(["s:Paid", "s:Paid"]);
});

test("State level: the sub-Machine of one State, with the far ends of leaving Transitions dimmed outside it", () => {
  const g = machineGraph(scene, "order", "Paid", new Set());
  expect(g.level).toEqual({ kind: "state", machine: "order", state: "Paid" });
  expect(g.nodes.map((n) => [n.id, n.external])).toEqual([["i:root", false], ["s:Preparing", false], ["s:Ready to ship", false], ["x:Shipped", true]]);
  expect(g.edges.map((e) => [e.source, e.target, e.label])).toEqual([
    ["i:root", "s:Preparing", ""],
    ["s:Preparing", "s:Ready to ship", "warehouse.PACKAGE_READY"],
    ["s:Ready to ship", "x:Shipped", "courier.PICKED_UP"],
  ]);
  // The parent's own Transitions are not drawn: they are in the side panel.
  expect(g.edges.some((e) => e.label === "user.CANCEL")).toBe(false);
  const detail = detailOfSelection(scene, g, null);
  expect(detail.sections.map((s) => [s.heading, s.items.map((i) => i.text)])[0]).toEqual(["Transitions (apply to every sub-State)", ["user.CANCEL → Cancelled", "user.CANCEL → Refunding"]]);
  const child = detailOfSelection(scene, g, "s:Preparing");
  expect(child.sections.find((s) => s.heading === "Inherited from Paid")?.items).toHaveLength(2);
});

test("a Proposal tags Machines, States, Transitions and aggregated edges", () => {
  const snap = shopWithProposals();
  const p = buildScene(snap, snap.proposals[0]?.id ?? "");
  const feature = featureGraph(p, "checkout");
  expect(nodeOf(feature, "m:return")?.change).toBe("added");
  expect(nodeOf(feature, "m:order")?.change).toBe("changed");
  expect(nodeOf(feature, "m:cart")?.change).toBe("same");
  expect(edgeOf(feature, "e:a:user>m:return")?.change).toBe("added");
  expect(edgeOf(feature, "e:a:courier>m:return")?.change).toBe("added");
  // user -> order had CANCEL already and gains RETURN: the edge exists, what it carries changed.
  expect(edgeOf(feature, "e:a:user>m:order")).toMatchObject({ change: "changed", label: "CANCEL, RETURN" });
  expect(edgeOf(feature, "e:a:user>m:cart")?.change).toBe("same");
  expect(nodeOf(feature, "a:user")?.change).toBe("changed");

  const system = systemGraph(p);
  expect(nodeOf(system, "f:checkout")?.change).toBe("changed");
  expect(edgeOf(system, "e:a:user>f:checkout")?.change).toBe("changed");

  const order = machineGraph(p, "order", null, new Set());
  expect(nodeOf(order, "s:Returned")?.change).toBe("added");
  expect(nodeOf(order, "s:Shipped")).toMatchObject({ change: "changed", final: false });
  expect(edgeOf(order, "t:s:Shipped>s:Returned#user.RETURN")?.change).toBe("added");
  expect(edgeOf(order, "t:s:Paid>s:Refunding#user.CANCEL")?.change).toBe("changed");
  expect(edgeOf(order, "t:s:Paid>s:Cancelled#user.CANCEL")?.change).toBe("same");
  expect(nodeOf(order, "s:Paid")?.change).toBe("same");
});

test("removed Machines, States and Transitions stay in the graph, tagged removed", () => {
  const snap = shopWithRemovals();
  const p = buildScene(snap, snap.proposals[0]?.id ?? "");
  const system = systemGraph(p);
  expect(nodeOf(system, "f:billing")).toMatchObject({ change: "added", sub: "1 machine" });
  expect(edgeOf(system, "e:f:checkout>f:billing")?.change).toBe("added");
  const feature = featureGraph(p, "checkout");
  expect(nodeOf(feature, "m:cart")?.change).toBe("removed");
  expect(edgeOf(feature, "e:a:user>m:cart")?.change).toBe("removed");
  const order = machineGraph(p, "order", null, new Set());
  expect(nodeOf(order, "s:Refunding")?.change).toBe("removed");
  expect(edgeOf(order, "t:s:Paid>s:Refunding#user.CANCEL")?.change).toBe("removed");
  expect(edgeOf(order, "t:s:Refunding>s:Cancelled#payment.REFUNDED")?.change).toBe("removed");
});

test("Drifts draw a red ghost joined to the element their first resolvable reference shows at each level", () => {
  const snap = shopWithProposals();
  const shipped = snap.drifts[0]?.id ?? "";
  const writtenOff = snap.drifts[1]?.id ?? "";
  const sceneWithDrifts = buildScene(snap, null);

  const system = buildGraph(sceneWithDrifts, { kind: "system" }, new Map());
  expect(system.nodes.filter((n) => n.kind === "drift").map((n) => n.id)).toEqual([`d:${shipped}`, `d:${writtenOff}`]);
  expect(system.edges.filter((e) => e.kind === "drift").map((e) => [e.source, e.target])).toEqual([[`d:${shipped}`, "f:checkout"], [`d:${writtenOff}`, "f:checkout"]]);
  expect(nodeOf(system, "f:checkout")).toMatchObject({ drifts: [shipped, writtenOff], sub: "3 machines · ⚠ 2 drifts inside" });

  const feature = buildGraph(sceneWithDrifts, { kind: "feature", feature: "checkout" }, new Map());
  expect(feature.edges.filter((e) => e.kind === "drift").map((e) => [e.source, e.target])).toEqual([[`d:${shipped}`, "m:order"], [`d:${writtenOff}`, "m:payment"]]);
  expect(nodeOf(feature, "m:order")).toMatchObject({ drifts: [shipped], sub: "8 states · ⚠ 1 drift inside" });
  // The Drift points at the Machine itself: outlined, but nothing is inside it.
  expect(nodeOf(feature, "m:payment")).toMatchObject({ drifts: [writtenOff], sub: "6 states" });

  const order = buildGraph(sceneWithDrifts, { kind: "machine", machine: "order" }, new Map());
  expect(order.edges.filter((e) => e.kind === "drift").map((e) => [e.source, e.target])).toEqual([[`d:${shipped}`, "s:Shipped"]]);
  expect(nodeOf(order, "s:Shipped")?.drifts).toEqual([shipped]);
  expect(nodeOf(order, `d:${writtenOff}`)).toBeUndefined();

  // The Drift on the Machine being shown has no element to join: its ghost floats.
  const payment = buildGraph(sceneWithDrifts, { kind: "machine", machine: "payment" }, new Map());
  expect(payment.nodes.some((n) => n.id === `d:${writtenOff}`)).toBe(true);
  expect(payment.edges.some((e) => e.kind === "drift")).toBe(false);
});

test("a Drift on a State hidden in a collapsed State outlines the State that hides it", () => {
  const snap = { ...shopSnapshot(), drifts: [{ id: "0007", title: "Preparing", body: "", refs: ["order/Preparing"], proposal: null, sides: null, options: [], option: null, note: null, requirementsOnly: false, proposalBlock: null, worktree: null }] };
  const s = buildScene(snap, null);
  const collapsed = buildGraph(s, { kind: "machine", machine: "order" }, new Map());
  expect(nodeOf(collapsed, "s:Paid")).toMatchObject({ drifts: ["0007"], sub: "2 sub-states · ⚠ 1 drift inside" });
  expect(collapsed.edges.find((e) => e.kind === "drift")?.target).toBe("s:Paid");
  const open = buildGraph(s, { kind: "machine", machine: "order" }, new Map([["order", new Set(["Paid"])]]));
  expect(nodeOf(open, "s:Preparing")?.drifts).toEqual(["0007"]);
  expect(nodeOf(open, "s:Paid")?.drifts).toEqual([]);
});

test("unresolved Drift references are skipped for the ghost and listed in the panel", () => {
  const snap = { ...shopSnapshot(), drifts: [{ id: "0008", title: "Gone", body: "", refs: ["order/Gone", "order/Paid"], proposal: null, sides: null, options: [], option: null, note: null, requirementsOnly: false, proposalBlock: null, worktree: null }, { id: "0009", title: "All gone", body: "", refs: ["nope"], proposal: null, sides: null, options: [], option: null, note: null, requirementsOnly: false, proposalBlock: null, worktree: null }] };
  const s = buildScene(snap, null);
  const order = withDrifts(machineGraph(s, "order", null, new Set()), s);
  expect(order.edges.find((e) => e.kind === "drift")).toMatchObject({ source: "d:0008", target: "s:Paid" });
  expect(order.nodes.some((n) => n.id === "d:0009")).toBe(false);
  const panel = detailOfSelection(s, order, null);
  expect(panel.sections.find((x) => x.heading === "Unresolved Drift references")?.items.map((i) => [i.text, i.note])).toEqual([["order/Gone", "Drift 0008"], ["nope", "Drift 0009"]]);
  const drift = detailOfSelection(s, order, "d:0008");
  expect(drift.sections[0]?.items.map((i) => [i.text, i.note])).toEqual([["order/Gone", "no longer resolves"], ["order/Paid", ""]]);
  expect(drift.drift?.id).toBe("0008");
});

test("the panel carries the Proposal for ghosts and the Drift for Drift ghosts", () => {
  const snap = shopWithProposals();
  const returnsId = snap.proposals[0]?.id ?? "";
  const shipped = snap.drifts[0]?.id ?? "";
  const s = buildScene(snap, returnsId);
  const order = buildGraph(s, { kind: "machine", machine: "order" }, new Map());
  expect(detailOfSelection(s, order, "s:Returned").proposal?.id).toBe(returnsId);
  expect(detailOfSelection(s, order, "s:Draft").proposal).toBeNull();
  expect(detailOfSelection(s, order, "t:s:Paid>s:Refunding#user.CANCEL").proposal?.id).toBe(returnsId);
  expect(detailOfSelection(s, order, "s:Shipped").changes).toEqual(["changed: final, description"]);
  expect(detailOfSelection(s, order, null).proposal?.id).toBe(returnsId);
  const driftPanel = detailOfSelection(s, order, `d:${shipped}`);
  expect(driftPanel.drift?.id).toBe(shipped);
  expect(driftPanel.proposal).toBeNull();
});

test("the Requirement sections of the Transitions an edge draws are listed in order of the Transitions, as Markdown blocks", () => {
  const section = (ref: string | null, text: string): SectionView => ({ ref, text, change: "same", before: null, movedFrom: null });
  const fragment = (id: string, sections: SectionView[]): FragmentView => ({ id, file: `requirements/x/${id}.md`, title: id, description: "", change: "same", sections });
  const area = (id: string, title: string, sections: SectionView[]): AreaView => ({
    id,
    file: `requirements/${id}/area.md`,
    title,
    description: "",
    intro: "",
    change: "same",
    fragments: [fragment("a", sections.slice(0, 1)), fragment("b", sections.slice(1))],
  });
  const areas = [
    area("ui", "Interface", [section(null, "General."), section("order/Paid/user.CANCEL", "- Ask first.\n  - Twice."), section("order/Paid", "A badge.")]),
    area("rules", "Business rules", [section("order/Paid/stripe.REFUNDED", "Refund in full."), section("ORDER/PAID/USER.CANCEL", "Only before pickup."), section("order/Paid/user.PAY", "")]),
  ];
  const items = requirementItems(areas, ["order/Paid/stripe.REFUNDED", "order/Paid/user.CANCEL", "order/Paid/user.PAY"]);
  expect(items.map((i) => [i.text, i.ref, i.block])).toEqual([
    ["Business rules", "requirements/rules#order/Paid/stripe.REFUNDED", true],
    ["Interface", "requirements/ui#order/Paid/user.CANCEL", true],
    ["Business rules", "requirements/rules#ORDER/PAID/USER.CANCEL", true],
  ]);
  expect(items[1]?.note).toBe("- Ask first.\n  - Twice.");
  expect(requirementItems(areas, [])).toEqual([]);
});
