import { expect, test } from "bun:test";
import type { DriftView } from "../src/core/snapshot";
import { driftComparison } from "../extension/src/webview/drift-compare";

const drift = (over: Partial<DriftView> = {}): DriftView => ({
  id: "0003",
  created: null,
  title: "Code refunds late",
  body: "",
  previous: null,
  sides: { happens: "Refunds go through after pickup.", should: "No refund after pickup.", where: "`src/refund.ts`" },
  options: [{ title: "Refuse the refund", text: "x" }],
  option: null,
  note: null,
  closedUnchanged: null,
  notBlocking: [],
  requirementsOnly: false,
  refs: ["order/Shipped"],
  proposal: "0002",
  proposalBlock: null,
  proposalTitle: null,
  proposalChanges: null,
  ...over,
});

test("a Drift shows only its two sides, with nothing to decide, no options, no attached Proposal and no code locations", () => {
  const c = driftComparison(drift());
  expect(c).toEqual({ happens: "Refunds go through after pickup.", should: "No refund after pickup.", shouldSource: "Model" });
});

test("the should side is named after the Requirements when the Drift points only to them", () => {
  expect(driftComparison(drift({ requirementsOnly: true, refs: ["requirements/ui#General"] })).shouldSource).toBe("Requirements");
});

test("a Drift written before the two sides existed shows its text on the left and says the right side is not stated", () => {
  const c = driftComparison(drift({ sides: null, body: "Old free text." }));
  expect(c.happens).toBe("Old free text.");
  expect(c.should).toMatch(/Not stated/);
});
