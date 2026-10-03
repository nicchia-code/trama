import { expect, test } from "bun:test";
import type { DriftView } from "../src/core/snapshot";
import { driftBlockedMessage } from "../extension/src/host/drift-blocked";
import { driftComparison } from "../extension/src/webview/drift-compare";

const drift = (over: Partial<DriftView> = {}): DriftView => ({
  id: "0003",
  title: "Code refunds late",
  body: "",
  sides: { happens: "Refunds go through after pickup.", should: "No refund after pickup.", where: null },
  requirementsOnly: false,
  refs: ["order/Shipped"],
  proposal: null,
  proposalBlock: null,
  ...over,
});

test("keeping what should happen fixes the code; keeping what happens without a Proposal closes the Drift with nothing changed", () => {
  const c = driftComparison(drift());
  expect(c.happens).toBe("Refunds go through after pickup.");
  expect(c.should).toBe("No refund after pickup.");
  expect(c.keepShould).toMatchObject({ how: "fix-code", blocked: false, consequence: "A Task is created for the agent to fix the code", aria: "Keep what should happen for Code refunds late" });
  expect(c.keepHappens).toMatchObject({ how: "dismiss", blocked: false, consequence: "Closes the Drift; nothing changes", aria: "Keep what happens for Code refunds late" });
});

test("keeping what happens with an approvable Proposal approves it", () => {
  const c = driftComparison(drift({ proposal: "0002" }));
  expect(c.keepHappens).toMatchObject({ how: "accept-proposal", blocked: false, consequence: "Approves Proposal 0002 and changes the Model to match" });
});

test("keeping what happens is blocked, saying why, whenever the attached Proposal cannot be approved; the other side stays free", () => {
  const reason = "Proposal 0002 was rejected.";
  const c = driftComparison(drift({ proposal: "0002", proposalBlock: { kind: "rejected", reason } }));
  expect(c.keepHappens).toMatchObject({ how: "accept-proposal", blocked: true, consequence: reason });
  expect(c.keepShould.blocked).toBe(false);
});

test("the should side is named after the Requirements when the Drift points only to them", () => {
  expect(driftComparison(drift({ requirementsOnly: true, refs: ["requirements/ui#General"] })).shouldSource).toBe("Requirements");
  expect(driftComparison(drift()).shouldSource).toBe("Model");
});

test("a Drift written before the two sides existed shows its text on the left and says the right side is not stated", () => {
  const c = driftComparison(drift({ sides: null, body: "Old free text." }));
  expect(c.happens).toBe("Old free text.");
  expect(c.should).toMatch(/Not stated/);
});

test("the Where in the code text is carried when the Drift has it and is null otherwise", () => {
  expect(driftComparison(drift()).where).toBeNull();
  expect(driftComparison(drift({ sides: { happens: "a", should: "b", where: "`src/refund.ts`" } })).where).toBe("`src/refund.ts`");
  expect(driftComparison(drift({ sides: null, body: "Old free text." })).where).toBeNull();
});

test("the editor warning tells the developer what to do for each kind of blocked Proposal", () => {
  const block = (kind: Parameters<typeof driftBlockedMessage>[0]["kind"], reason: string) => driftBlockedMessage({ kind, reason });
  expect(block("draft", "Proposal 0002 is still being written.")).toBe("Proposal 0002 is still being written. Wait until the agent hands it over.");
  expect(block("rejected", "Proposal 0002 was rejected.")).toBe("Proposal 0002 was rejected. It will not change the Model: keep what should happen to have the code fixed.");
  expect(block("discarded", "Proposal 0002 was discarded.")).toContain("keep what should happen");
  expect(block("stale", "Proposal 0002 is stale: the Model changed since it was written.")).toBe("Proposal 0002 is stale: the Model changed since it was written.");
  expect(block("waiting", "Proposal 0002 waits for other Proposals: 0001.")).toBe("Proposal 0002 waits for other Proposals: 0001.");
});
