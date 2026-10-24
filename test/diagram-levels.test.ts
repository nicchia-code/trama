import { expect, test } from "bun:test";
import { createDiagramStore, currentDetail } from "../extension/src/webview/diagram/state";
import type { FileMap } from "../src/core/types";
import { shopWithProposals, snapshotOf } from "./diagram-fixture";

const snapshot = shopWithProposals();
const proposal = snapshot.proposals.find((p) => p.title === "Returns after shipping");

function setup() {
  const store = createDiagramStore();
  store.update(snapshot, null);
  return store;
}

test("choosing another Proposal in the selector falls back from a Machine that only the earlier one had", () => {
  const store = setup();
  store.chooseProposal(proposal?.id ?? null);
  store.setLevel({ kind: "machine", machine: "return" });
  expect(store.get().level.kind).toBe("machine");
  store.chooseProposal(null);
  expect(store.get().level).toEqual({ kind: "system" });
});

test("a Proposal's focus draws it, without a choice in the selector, and goes to its first step without selecting anything", () => {
  const store = setup();
  store.focusOn({ kind: "proposal", id: proposal?.id ?? "" });
  expect(store.get().proposalId).toBe(proposal?.id ?? null);
  expect(store.get().focus?.steps.length).toBeGreaterThan(1);
  expect(store.get().level).toEqual(store.get().focus?.steps[0]?.level ?? { kind: "system" });
  expect(store.get().selected).toBeNull();
});

test("following a link to one element fits the view to it, and the Fit button fits the whole level again", () => {
  const store = setup();
  store.navigateRef("order/Paid");
  const { selected, fitTo, fit } = store.get();
  expect(selected).not.toBeNull();
  expect(fitTo).toEqual([selected ?? ""]);
  store.refit();
  expect(store.get().fit).toBe(fit + 1);
  expect(store.get().fitTo).toBeNull();
});

test("a chip's focus opens its level like a link, selects its element and fits the view to it", () => {
  const store = setup();
  store.focusOn({ kind: "ref", ref: "order/Paid" });
  const { level, selected, fitTo, proposalId } = store.get();
  expect(level.kind).toBe("machine");
  expect(proposalId).toBeNull();
  expect(selected).not.toBeNull();
  expect(fitTo).toEqual([selected ?? ""]);
});

test("the Diagram starts at the root; a link to an Actor opens its level and selects it, a link to its Event too", () => {
  const store = setup();
  expect(store.get().level).toEqual({ kind: "system" });
  store.navigateRef("user");
  expect(store.get().level).toEqual({ kind: "actor", actor: "user" });
  expect(store.get().selected).toBe("a:user");
  store.setLevel({ kind: "system" });
  store.navigateRef("stripe.CHARGE_OK");
  expect(store.get().level).toEqual({ kind: "actor", actor: "stripe" });
  expect(store.get().selected).toBe("a:stripe");
});

test("a link to a Feature opens its level with no origin, even from Whole System", () => {
  const store = setup();
  store.setLevel({ kind: "whole" });
  store.navigateRef("checkout");
  expect(store.get().level).toEqual({ kind: "feature", feature: "checkout" });
});

const idleFiles = (events: string): FileMap =>
  new Map([
    ["system.md", "# S\n"],
    ["actors/u.md", "# U\n\n## Events\n\n### GO\nx\n"],
    ["actors/idle.md", `# Idle\n\n## Events\n\n${events}`],
    ["a/feature.md", "# A\n"],
    ["a/m1.md", "# M1\n\n## States\n\n### X (initial)\n- `u.GO` → Y\n\n### Y\n"],
  ]);

test("a link to an Actor whose Events reach no Machine opens the root with the Actor selected", () => {
  const store = createDiagramStore();
  store.update(snapshotOf(idleFiles("### NOPE\nx\n")), null);
  store.setLevel({ kind: "whole" });
  store.navigateRef("idle.NOPE");
  expect(store.get().level).toEqual({ kind: "system" });
  expect(store.get().selected).toBe("a:idle");
  expect(store.get().graph?.nodes.find((n) => n.id === "a:idle")).toMatchObject({ inert: true, opens: false });
  expect(store.drillOf("a:idle")).toBeNull();
  expect(store.drillOf("a:u")).toEqual({ kind: "actor", actor: "u" });
  expect(store.drillOf("w:system")).toEqual({ kind: "whole" });
});

test("a Feature opened from an Actor level remembers it down to the State; if the Actor stops reaching a Machine the level stays and the Actor leaves the breadcrumb", () => {
  const store = createDiagramStore();
  store.update(snapshotOf(idleFiles("")), null);
  store.setLevel({ kind: "actor", actor: "u" });
  const feature = store.drillOf("f:a");
  expect(feature).toEqual({ kind: "feature", feature: "a", from: { kind: "actor", actor: "u" } });
  if (feature) store.setLevel(feature);
  const machine = store.drillOf("m:m1");
  expect(machine).toEqual({ kind: "machine", machine: "m1", from: { kind: "actor", actor: "u" } });
  if (machine) store.setLevel(machine);
  expect(store.get().level).toEqual({ kind: "machine", machine: "m1", from: { kind: "actor", actor: "u" } });

  // The Actor's Events no longer arrive anywhere.
  store.update(snapshotOf(new Map([...idleFiles(""), ["a/m1.md", "# M1\n\n## States\n\n### X (initial)\n\n### Y\n"]])), null);
  expect(store.get().level).toEqual({ kind: "machine", machine: "m1" });

  // On an Actor level that stops reaching a Machine, the root.
  const second = createDiagramStore();
  second.update(snapshotOf(idleFiles("")), null);
  second.setLevel({ kind: "actor", actor: "u" });
  second.update(snapshotOf(new Map([...idleFiles(""), ["a/m1.md", "# M1\n\n## States\n\n### X (initial)\n\n### Y\n"]])), null);
  expect(second.get().level).toEqual({ kind: "system" });
});

test("the details of an Actor level show the Actor and its Events; the root shows the System", () => {
  const store = setup();
  expect(currentDetail(store.get())?.kind).toBe("System");
  store.setLevel({ kind: "actor", actor: "user" });
  const detail = currentDetail(store.get());
  expect(detail?.kind).toBe("Actor");
  expect(detail?.sections.find((s) => s.heading === "Events")?.items.length).toBeGreaterThan(0);
  store.setLevel({ kind: "whole" });
  expect(currentDetail(store.get())?.kind).toBe("Whole System");
});
