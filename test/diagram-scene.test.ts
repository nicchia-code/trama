import { expect, test } from "bun:test";
import type { MergedMachine } from "../src/core/merge";
import { buildScene, featureChange, flattenMerged, machineChange, pathTo, toMerged } from "../extension/src/webview/diagram/scene";
import { shopSnapshot, shopWithProposals, shopWithRemovals } from "./diagram-fixture";

const shop = shopSnapshot();
const proposed = shopWithProposals();

test("without a Proposal the scene is today's Model with every part `same`", () => {
  const scene = buildScene(shop, null);
  expect(scene.proposal).toBeNull();
  expect(scene.features.map((f) => [f.id, f.change, f.machines])).toEqual([["checkout", "same", ["cart", "order", "payment"]]]);
  for (const m of scene.machines) {
    expect(machineChange(m)).toBe("same");
    for (const s of flattenMerged(m.states)) {
      expect(s.change).toBe("same");
      expect(s.transitions.every((t) => t.change === "same")).toBe(true);
    }
  }
  expect(scene.files.get("order")).toBe("checkout/order.md");
});

test("toMerged keeps the State tree, Transitions and Events of a Machine", () => {
  const order = shop.machines.find((m) => m.id === "order");
  const merged = toMerged(order as never);
  expect(merged.states.map((s) => s.name)).toEqual(["Draft", "Awaiting payment", "Paid", "Refunding", "Shipped", "Cancelled"]);
  const paid = merged.states.find((s) => s.name === "Paid");
  expect(paid?.children.map((c) => [c.name, c.initial])).toEqual([["Preparing", true], ["Ready to ship", false]]);
  expect(paid?.transitions.map((t) => [t.event.owner, t.event.name, t.target])).toEqual([["user", "CANCEL", "Cancelled"], ["user", "CANCEL", "Refunding"]]);
  expect(merged.events.map((e) => e.name)).toEqual(["CONFIRMED", "REFUND_REQUESTED"]);
});

test("a Proposal overlays its Machines, Actor Events and marks what it touches", () => {
  const returnsId = proposed.proposals[0]?.id ?? "";
  const scene = buildScene(proposed, returnsId);
  expect(scene.proposal?.id).toBe(returnsId);

  const ret = scene.machine.get("return") as MergedMachine;
  expect(ret.change).toBe("added");
  expect(machineChange(ret)).toBe("added");
  expect(scene.feature.get("checkout")?.machines).toEqual(["cart", "order", "payment", "return"]);

  const order = scene.machine.get("order") as MergedMachine;
  expect(order.change).toBe("same");
  expect(machineChange(order)).toBe("changed");
  const byName = Object.fromEntries(flattenMerged(order.states).map((s) => [s.name, s]));
  expect(byName["Returned"]?.change).toBe("added");
  expect(byName["Shipped"]?.change).toBe("changed");
  expect(byName["Paid"]?.transitions.map((t) => [t.target, t.change])).toEqual([["Cancelled", "same"], ["Refunding", "changed"]]);

  expect(featureChange(scene, scene.feature.get("checkout") as never)).toBe("changed");
  expect(scene.actor.get("user")?.events.find((e) => e.name === "RETURN")?.change).toBe("added");
  // The Proposal did not touch cart: it stays as it is.
  expect(machineChange(scene.machine.get("cart") as MergedMachine)).toBe("same");
});

test("an unknown Proposal id gives today's Model", () => {
  expect(buildScene(proposed, "9999").proposal).toBeNull();
  expect(buildScene(proposed, null).machine.has("return")).toBe(false);
});

test("a Feature only a Proposal knows is an added ghost; removed Machines and States stay drawn as removed", () => {
  const removals = shopWithRemovals();
  const scene = buildScene(removals, removals.proposals[0]?.id ?? "");
  const billing = scene.feature.get("billing");
  expect(billing?.change).toBe("added");
  expect(billing?.machines).toEqual(["invoice"]);
  expect(scene.machine.get("cart")?.change).toBe("removed");
  expect(scene.feature.get("checkout")?.change).toBe("same");
  expect(featureChange(scene, scene.feature.get("checkout") as never)).toBe("changed");
  const refunding = flattenMerged((scene.machine.get("order") as MergedMachine).states).find((s) => s.name === "Refunding");
  expect(refunding?.change).toBe("removed");
});

test("pathTo lists the States from the top level down", () => {
  const order = buildScene(shop, null).machine.get("order") as MergedMachine;
  expect(pathTo(order, "Ready to ship")).toEqual(["Paid", "Ready to ship"]);
  expect(pathTo(order, "draft")).toEqual(["Draft"]);
  expect(pathTo(order, "Nope")).toEqual([]);
});
