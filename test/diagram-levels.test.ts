import { expect, test } from "bun:test";
import { createDiagramStore } from "../extension/src/webview/diagram/state";
import { shopWithProposals } from "./diagram-fixture";

const snapshot = shopWithProposals();
const proposal = snapshot.proposals.find((p) => p.title === "Returns after shipping");

function setup() {
  const store = createDiagramStore();
  store.update(snapshot, null, false);
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
