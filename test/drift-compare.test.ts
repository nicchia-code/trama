import { expect, test } from "bun:test";
import type { DriftView } from "../src/core/snapshot";
import { driftBlockedMessage } from "../extension/src/host/drift-blocked";
import { driftComparison, fixSelection, rememberNote, rememberOption } from "../extension/src/webview/drift-compare";

const drift = (over: Partial<DriftView> = {}): DriftView => ({
  id: "0003",
  title: "Code refunds late",
  body: "",
  sides: { happens: "Refunds go through after pickup.", should: "No refund after pickup.", where: null },
  options: [],
  option: null,
  note: null,
  requirementsOnly: false,
  refs: ["order/Shipped"],
  proposal: null,
  proposalBlock: null,
  proposalTitle: null,
  proposalChanges: null,
  rework: null,
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
  expect(c.keepHappens).toMatchObject({ how: "accept-proposal", blocked: false, consequence: "Accepts Proposal 0002: the Model changes to match" });
});

test("keeping what should happen says the attached Proposal is rejected, or discarded while still being written", () => {
  const line = (block: DriftView["proposalBlock"]) => driftComparison(drift({ proposal: "0002", proposalBlock: block })).keepShould.consequence;
  expect(line(null)).toBe("A Task is created for the agent to fix the code; Proposal 0002 is rejected");
  expect(line({ kind: "draft", reason: "x" })).toBe("A Task is created for the agent to fix the code; Proposal 0002 is discarded");
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

const options = [
  { title: "Change the step", text: "Rewrite the **step**." },
  { title: "Remove the step", text: "Drop it." },
  { title: "Guard the step", text: "Add a check." },
];

test("with options, the first is recommended and selected at first; the right Keep this names it and takes it; a Drift without options takes nothing", () => {
  const c = driftComparison(drift({ id: "0010", options }));
  expect(c.options.map((o) => [o.number, o.recommended, o.selected])).toEqual([[1, true, true], [2, false, false], [3, false, false]]);
  expect(c.keepShould).toMatchObject({
    consequence: "A Task is created for the agent to fix the code with the chosen option",
    aria: "Keep what should happen for Code refunds late with option Change the step",
    carries: { option: 1 },
  });
  expect(c.optionsName).toBe("Fix options for Code refunds late");
  expect(c.noteName).toBe("Note for Code refunds late");
  expect(c.attachedName).toBe("Proposal attached to Code refunds late");
  expect(c.keepHappens.carries).toEqual({});

  const bare = driftComparison(drift({ id: "0011" }));
  expect(bare.options).toEqual([]);
  expect(bare.keepShould).toMatchObject({ consequence: "A Task is created for the agent to fix the code", aria: "Keep what should happen for Code refunds late", carries: {} });
});

test("the right Keep this takes the selected option and the note when it is not empty; the left takes neither", () => {
  const d = drift({ id: "0012", options, proposal: "0002" });
  rememberOption("0012", 3);
  rememberNote("0012", "Keep the audit log.");
  const c = driftComparison(d);
  expect(c.options.filter((o) => o.selected).map((o) => o.number)).toEqual([3]);
  expect(c.note).toBe("Keep the audit log.");
  expect(c.keepShould).toMatchObject({ aria: "Keep what should happen for Code refunds late with option Guard the step", carries: { option: 3, note: "Keep the audit log." } });
  expect(c.keepHappens.carries).toEqual({});

  rememberNote("0012", "   ");
  expect(driftComparison(d).keepShould.carries).toEqual({ option: 3 });
});

test("what was selected survives a refresh of the same Drift; exactly one option stays selected if the options changed", () => {
  rememberOption("0013", 2);
  expect(fixSelection(drift({ id: "0013", options }))).toEqual({ option: 2, note: "" });
  expect(fixSelection(drift({ id: "0013", title: "Renamed", options }))).toEqual({ option: 2, note: "" });
  const fewer = driftComparison(drift({ id: "0013", options: options.slice(0, 1) }));
  expect(fewer.options.filter((o) => o.selected).map((o) => o.number)).toEqual([1]);
  expect(fixSelection(drift({ id: "0014", options }))).toEqual({ option: 1, note: "" });
});

test("while the agent reworks the Proposal, the left Keep this is blocked as for a Proposal still being written", () => {
  const c = driftComparison(drift({ proposal: "0002", proposalBlock: { kind: "stale", reason: "stale" }, rework: { title: null } }));
  expect(c.keepHappens).toMatchObject({ how: "accept-proposal", blocked: true });
  expect(c.keepHappens.consequence).toContain("being reworked");
});
