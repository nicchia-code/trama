import { expect, test } from "bun:test";
import { anchorIn, homeLevel, resolveElement, selectionFor, showsElement } from "../extension/src/webview/diagram/elements";
import { type GraphSpec, sameLevel } from "../extension/src/webview/diagram/graph";
import { breadcrumb, buildGraph, drillTarget, validLevel } from "../extension/src/webview/diagram/levels";
import { buildScene } from "../extension/src/webview/diagram/scene";
import { detailOfDrift } from "../extension/src/webview/diagram/details";
import type { FileMap } from "../src/core/types";
import { shopSnapshot, shopWithProposals, snapshotOf } from "./diagram-fixture";

const scene = buildScene(shopSnapshot(), null);
const none = new Map<string, ReadonlySet<string>>();
const opened = new Map<string, ReadonlySet<string>>([["order", new Set(["Paid"])]]);

test("references resolve to Features, Machines, Actors and States", () => {
  expect(resolveElement(scene, "checkout")?.kind).toBe("feature");
  expect(resolveElement(scene, "order")?.kind).toBe("machine");
  expect(resolveElement(scene, "user")?.kind).toBe("actor");
  const state = resolveElement(scene, "order/awaiting payment");
  expect(state?.kind).toBe("state");
  expect(state?.ref).toBe("order/Awaiting payment");
  expect(resolveElement(scene, "order/Ready to ship")?.kind).toBe("state");
});

test("Transition references cover every Transition from the State on that Event", () => {
  const t = resolveElement(scene, "order/Paid/user.CANCEL");
  expect(t?.kind === "transition" && t.transitions.map((x) => x.target)).toEqual(["Cancelled", "Refunding"]);
  const one = resolveElement(scene, "order/Draft/cart.CONFIRM");
  expect(one?.kind === "transition" && one.transitions).toHaveLength(1);
  // A bare Event belongs to the Machine itself, and order has no such Transition.
  expect(resolveElement(scene, "order/Paid/CANCEL")).toBeNull();
  expect(resolveElement(scene, "order/Paid/user.CHECKOUT")).toBeNull();
});

test("Event references resolve to their owner, Actor or Machine", () => {
  const actor = resolveElement(scene, "user.CANCEL");
  expect(actor?.kind === "event" && actor.owner.kind === "actor" && actor.owner.actor.id).toBe("user");
  const machine = resolveElement(scene, "order.CONFIRMED");
  expect(machine?.kind === "event" && machine.owner.kind === "machine" && machine.owner.machine.id).toBe("order");
});

test("references that point at nothing resolve to null", () => {
  for (const ref of ["", "nope", "order/Nope", "nope/Paid", "user.NOPE", "nope.CANCEL", "order/Paid/user.NOPE", "a/b/c/d", "order/Paid/not an event"]) {
    expect(resolveElement(scene, ref)).toBeNull();
  }
});

test("each kind of element is reached at the level that shows it", () => {
  const home = (ref: string) => homeLevel(scene, resolveElement(scene, ref) as never);
  expect(home("checkout")).toEqual({ kind: "feature", feature: "checkout" });
  expect(home("user")).toEqual({ kind: "actor", actor: "user" });
  expect(home("user.CANCEL")).toEqual({ kind: "actor", actor: "user" });
  expect(home("order")).toEqual({ kind: "feature", feature: "checkout" });
  expect(home("order.CONFIRMED")).toEqual({ kind: "feature", feature: "checkout" });
  expect(home("order/Paid")).toEqual({ kind: "machine", machine: "order" });
  expect(home("order/Paid/user.CANCEL")).toEqual({ kind: "machine", machine: "order" });
});

const graphAt = (level: Parameters<typeof buildGraph>[1], expanded = none): GraphSpec => buildGraph(scene, level, expanded);

test("a State hidden in a collapsed State is found at its nearest visible ancestor", () => {
  const collapsed = graphAt({ kind: "machine", machine: "order" });
  const preparing = resolveElement(scene, "order/Preparing") as never;
  expect(anchorIn(collapsed, preparing)).toEqual({ node: "s:Paid" });
  expect(showsElement(collapsed, preparing)).toBe(false);
  expect(selectionFor(collapsed, preparing)).toBe("s:Paid");

  const open = graphAt({ kind: "machine", machine: "order" }, opened);
  expect(anchorIn(open, preparing)).toEqual({ node: "s:Preparing" });
  expect(showsElement(open, preparing)).toBe(true);
  expect(showsElement(collapsed, resolveElement(scene, "order/Paid") as never)).toBe(true);
});

test("a Transition is selected through its edge, from the State that declares it", () => {
  const collapsed = graphAt({ kind: "machine", machine: "order" });
  const hidden = resolveElement(scene, "order/Ready to ship/courier.PICKED_UP") as never;
  expect(anchorIn(collapsed, hidden)).toEqual({ node: "s:Paid" });
  expect(selectionFor(collapsed, hidden)).toBe("t:s:Paid>s:Shipped#courier.PICKED_UP");
  const open = graphAt({ kind: "machine", machine: "order" }, opened);
  expect(selectionFor(open, hidden)).toBe("t:s:Ready to ship>s:Shipped#courier.PICKED_UP");
  expect(selectionFor(collapsed, resolveElement(scene, "order/Paid/user.CANCEL") as never)).toBe("t:s:Paid>s:Cancelled#user.CANCEL");
});

test("elements are anchored at every level that shows them, or the level itself", () => {
  const system = graphAt({ kind: "whole" });
  const actor = graphAt({ kind: "actor", actor: "user" });
  const feature = graphAt({ kind: "feature", feature: "checkout" });
  const machine = graphAt({ kind: "machine", machine: "payment" });
  const state = graphAt({ kind: "state", machine: "order", state: "Paid" });
  const el = (ref: string) => resolveElement(scene, ref) as never;

  expect(anchorIn(system, el("order/Paid/user.CANCEL"))).toEqual({ node: "f:checkout" });
  expect(anchorIn(system, el("user.CANCEL"))).toEqual({ node: "a:user" });
  expect(anchorIn(actor, el("user"))).toEqual({ node: "a:user" });
  expect(anchorIn(actor, el("checkout"))).toEqual({ node: "f:checkout" });
  expect(anchorIn(actor, el("order/Paid"))).toEqual({ node: "f:checkout" });
  expect(anchorIn(actor, el("stripe"))).toBeNull();
  expect(anchorIn(feature, el("order/Paid"))).toEqual({ node: "m:order" });
  expect(anchorIn(feature, el("checkout"))).toBe("self");
  expect(anchorIn(feature, el("user"))).toEqual({ node: "a:user" });
  expect(anchorIn(machine, el("payment"))).toBe("self");
  expect(anchorIn(machine, el("payment.SUCCEEDED"))).toBe("self");
  expect(anchorIn(machine, el("order/Paid"))).toBeNull();
  expect(anchorIn(state, el("order/Paid"))).toBe("self");
  expect(anchorIn(state, el("order/Ready to ship"))).toEqual({ node: "s:Ready to ship" });
  expect(anchorIn(state, el("order/Draft"))).toBeNull();
});

test("the breadcrumb leads from System down to the State, each part to its own level", () => {
  const trail = breadcrumb(scene, { kind: "state", machine: "order", state: "Paid" });
  expect(trail.map((c) => c.label)).toEqual(["System", "checkout", "order", "Paid"]);
  expect(trail.map((c) => c.level.kind)).toEqual(["system", "feature", "machine", "state"]);
  expect(breadcrumb(scene, { kind: "system" }).map((c) => c.label)).toEqual(["System"]);
});

test("the breadcrumb of a Feature remembers the Actor or Whole System it was opened from, down to the State", () => {
  const fromActor = breadcrumb(scene, { kind: "state", machine: "order", state: "Paid", from: { kind: "actor", actor: "user" } });
  expect(fromActor.map((c) => c.label)).toEqual(["System", "user", "checkout", "order", "Paid"]);
  expect(fromActor.map((c) => c.level.kind)).toEqual(["system", "actor", "feature", "machine", "state"]);
  expect(fromActor[2]?.level).toEqual({ kind: "feature", feature: "checkout", from: { kind: "actor", actor: "user" } });
  const fromWhole = breadcrumb(scene, { kind: "feature", feature: "checkout", from: { kind: "whole" } });
  expect(fromWhole.map((c) => c.label)).toEqual(["System", "Whole System", "checkout"]);
  expect(fromWhole[1]?.level).toEqual({ kind: "whole" });
  expect(breadcrumb(scene, { kind: "actor", actor: "user" }).map((c) => c.label)).toEqual(["System", "user"]);
  expect(breadcrumb(scene, { kind: "whole" }).map((c) => c.label)).toEqual(["System", "Whole System"]);
});

test("an Actor level falls back to the root when the Actor is gone or reaches no Machine; a Feature opened from it stays without the Actor", () => {
  expect(validLevel(scene, { kind: "actor", actor: "user" })).toEqual({ kind: "actor", actor: "user" });
  expect(validLevel(scene, { kind: "actor", actor: "gone" })).toEqual({ kind: "system" });
  expect(validLevel(scene, { kind: "feature", feature: "checkout", from: { kind: "actor", actor: "gone" } })).toEqual({ kind: "feature", feature: "checkout" });
  expect(validLevel(scene, { kind: "machine", machine: "order", from: { kind: "actor", actor: "gone" } })).toEqual({ kind: "machine", machine: "order" });
  expect(validLevel(scene, { kind: "feature", feature: "checkout", from: { kind: "whole" } })).toEqual({ kind: "feature", feature: "checkout", from: { kind: "whole" } });
  expect(validLevel(scene, { kind: "whole" })).toEqual({ kind: "whole" });
});

test("levels the Scene no longer has fall back to the closest one that exists", () => {
  expect(validLevel(scene, { kind: "feature", feature: "gone" })).toEqual({ kind: "system" });
  expect(validLevel(scene, { kind: "machine", machine: "gone" })).toEqual({ kind: "system" });
  expect(validLevel(scene, { kind: "state", machine: "order", state: "Draft" })).toEqual({ kind: "machine", machine: "order" });
  expect(validLevel(scene, { kind: "state", machine: "order", state: "paid" })).toEqual({ kind: "state", machine: "order", state: "Paid" });
  const proposed = shopWithProposals();
  const withProposal = buildScene(proposed, proposed.proposals[0]?.id ?? "");
  expect(validLevel(withProposal, { kind: "machine", machine: "return" })).toEqual({ kind: "machine", machine: "return" });
  expect(validLevel(scene, { kind: "machine", machine: "return" })).toEqual({ kind: "system" });
});

test("only Features, Machines and States with sub-States lead further down", () => {
  expect(drillTarget(scene, graphAt({ kind: "whole" }), "f:checkout")).toEqual({ kind: "feature", feature: "checkout", from: { kind: "whole" } });
  expect(drillTarget(scene, graphAt({ kind: "actor", actor: "user" }), "f:checkout")).toEqual({ kind: "feature", feature: "checkout", from: { kind: "actor", actor: "user" } });
  expect(drillTarget(scene, graphAt({ kind: "whole" }), "a:user")).toBeNull();
  expect(drillTarget(scene, graphAt({ kind: "feature", feature: "checkout" }), "m:order")).toEqual({ kind: "machine", machine: "order" });
  const order = graphAt({ kind: "machine", machine: "order" });
  expect(drillTarget(scene, order, "s:Paid")).toEqual({ kind: "state", machine: "order", state: "Paid" });
  expect(drillTarget(scene, order, "s:Draft")).toBeNull();
  expect(sameLevel({ kind: "state", machine: "order", state: "Paid" }, { kind: "state", machine: "order", state: "Paid" })).toBe(true);
  expect(sameLevel({ kind: "machine", machine: "order" }, { kind: "machine", machine: "cart" })).toBe(false);
});

test("from a Feature level a Machine of another Feature opens that Feature, and a link to it goes there and selects it", () => {
  const files: FileMap = new Map([
    ["system.md", "# S\n"],
    ["a/feature.md", "# A\n"],
    ["a/m1.md", "# M1\n\n## States\n\n### X (initial)\n- `m2.PING` → X\n\n## Events\n\n### HELLO\nx\n"],
    ["b/feature.md", "# B\n"],
    ["b/m2.md", "# M2\n\n## States\n\n### P (initial)\n- `m1.HELLO` → P\n\n## Events\n\n### PING\nx\n"],
  ]);
  const two = buildScene(snapshotOf(files), null);
  const atB = buildGraph(two, { kind: "feature", feature: "b" }, none);
  expect(atB.nodes.find((n) => n.id === "m:m1")).toMatchObject({ external: true });
  expect(drillTarget(two, atB, "m:m1")).toEqual({ kind: "feature", feature: "a" });
  expect(drillTarget(two, atB, "m:m2")).toEqual({ kind: "machine", machine: "m2" });
  const m1 = resolveElement(two, "m1") as never;
  expect(showsElement(atB, m1)).toBe(false);
  expect(homeLevel(two, m1)).toEqual({ kind: "feature", feature: "a" });
  expect(selectionFor(buildGraph(two, { kind: "feature", feature: "a" }, none), m1)).toBe("m:m1");
});

test("a Drift's Requirement references resolve to an existing Area or section; only a missing one is marked", () => {
  const refs = ["requirements/ui", "requirements/ui#order/Paid", "requirements/ui#General", "requirements/ui#nope", "requirements/nope", "order/Nope"];
  const drift = { id: "0001", title: "t", body: "", refs, proposal: null, sides: null, options: [], option: null, note: null, requirementsOnly: false, proposalBlock: null, proposalTitle: null, proposalChanges: null, rework: null };
  const items = detailOfDrift(scene, drift as never).sections[0]?.items ?? [];
  expect(items.map((i) => [i.text, i.ref !== null, i.note])).toEqual([
    ["requirements/ui", true, ""],
    ["requirements/ui#order/Paid", true, ""],
    ["requirements/ui#General", true, ""],
    ["requirements/ui#nope", false, "no longer resolves"],
    ["requirements/nope", false, "no longer resolves"],
    ["order/Nope", false, "no longer resolves"],
  ]);
});

test("a Drift's details hold only its references: no freed Tasks, whatever an old file named", () => {
  const drift = { id: "0001", title: "t", body: "", refs: ["order/Paid"], proposal: null, sides: null, options: [], option: null, note: null, requirementsOnly: false, proposalBlock: null, proposalTitle: null, proposalChanges: null, rework: null };
  expect(detailOfDrift(scene, drift as never).sections.map((s) => s.heading)).toEqual(["Points at"]);
});

test("a State of another Machine, reached from a Machine's level, opens that Machine's level with the State selected", () => {
  const order = buildGraph(scene, { kind: "machine", machine: "order" }, none);
  const idle = resolveElement(scene, "payment/Idle");
  expect(idle).not.toBeNull();
  if (!idle) return;
  expect(showsElement(order, idle)).toBe(false);
  const level = homeLevel(scene, idle);
  expect(level).toEqual({ kind: "machine", machine: "payment" });
  const payment = buildGraph(scene, level, none);
  expect(showsElement(payment, idle)).toBe(true);
  expect(selectionFor(payment, idle)).toBe("s:Idle");
});
