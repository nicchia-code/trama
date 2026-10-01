import { expect, test } from "bun:test";
import { anchorIn, homeLevel, resolveElement, selectionFor, showsElement } from "../extension/src/webview/diagram/elements";
import { type GraphSpec, sameLevel } from "../extension/src/webview/diagram/graph";
import { breadcrumb, buildGraph, drillTarget, scanFeature, validLevel } from "../extension/src/webview/diagram/levels";
import { buildScene } from "../extension/src/webview/diagram/scene";
import { shopSnapshot, shopWithProposals } from "./diagram-fixture";

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
  const home = (ref: string) => homeLevel(resolveElement(scene, ref) as never);
  expect(home("checkout")).toEqual({ kind: "system" });
  expect(home("user")).toEqual({ kind: "system" });
  expect(home("user.CANCEL")).toEqual({ kind: "system" });
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
  const system = graphAt({ kind: "system" });
  const feature = graphAt({ kind: "feature", feature: "checkout" });
  const machine = graphAt({ kind: "machine", machine: "payment" });
  const state = graphAt({ kind: "state", machine: "order", state: "Paid" });
  const el = (ref: string) => resolveElement(scene, ref) as never;

  expect(anchorIn(system, el("order/Paid/user.CANCEL"))).toEqual({ node: "f:checkout" });
  expect(anchorIn(system, el("user.CANCEL"))).toEqual({ node: "a:user" });
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

test("levels the Scene no longer has fall back to the closest one that exists", () => {
  expect(validLevel(scene, { kind: "feature", feature: "gone" })).toEqual({ kind: "system" });
  expect(validLevel(scene, { kind: "machine", machine: "gone" })).toEqual({ kind: "system" });
  expect(validLevel(scene, { kind: "state", machine: "order", state: "Draft" })).toEqual({ kind: "machine", machine: "order" });
  expect(validLevel(scene, { kind: "state", machine: "order", state: "paid" })).toEqual({ kind: "state", machine: "order", state: "Paid" });
  const withProposal = buildScene(shopWithProposals(), "0001");
  expect(validLevel(withProposal, { kind: "machine", machine: "return" })).toEqual({ kind: "machine", machine: "return" });
  expect(validLevel(scene, { kind: "machine", machine: "return" })).toEqual({ kind: "system" });
});

test("a Scan started at Feature or Machine level is limited to that Feature", () => {
  expect(scanFeature(scene, { kind: "system" })).toBeUndefined();
  expect(scanFeature(scene, { kind: "feature", feature: "checkout" })).toBe("checkout");
  expect(scanFeature(scene, { kind: "machine", machine: "order" })).toBe("checkout");
  expect(scanFeature(scene, { kind: "state", machine: "order", state: "Paid" })).toBe("checkout");
});

test("only Features, Machines and States with sub-States lead further down", () => {
  expect(drillTarget(graphAt({ kind: "system" }), "f:checkout")).toEqual({ kind: "feature", feature: "checkout" });
  expect(drillTarget(graphAt({ kind: "system" }), "a:user")).toBeNull();
  expect(drillTarget(graphAt({ kind: "feature", feature: "checkout" }), "m:order")).toEqual({ kind: "machine", machine: "order" });
  const order = graphAt({ kind: "machine", machine: "order" });
  expect(drillTarget(order, "s:Paid")).toEqual({ kind: "state", machine: "order", state: "Paid" });
  expect(drillTarget(order, "s:Draft")).toBeNull();
  expect(sameLevel({ kind: "state", machine: "order", state: "Paid" }, { kind: "state", machine: "order", state: "Paid" })).toBe(true);
  expect(sameLevel({ kind: "machine", machine: "order" }, { kind: "machine", machine: "cart" })).toBe(false);
});
