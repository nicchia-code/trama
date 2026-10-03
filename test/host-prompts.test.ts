import { expect, test } from "bun:test";
import { buildPrompt, buildScanPrompt } from "../extension/src/host/prompts";

test("each action names its skill and its scope exactly", () => {
  expect(buildPrompt({ kind: "design", prompt: "  Add refunds to checkout \n" })).toBe("Use the trama-design skill. Add refunds to checkout");
  expect(buildPrompt({ kind: "fix", prompt: " The cart total ignores the coupon\n" })).toBe("Use the trama-fix skill. The cart total ignores the coupon");
  expect(buildPrompt({ kind: "scan" })).toBe("Use the trama-scan skill on the whole System.");
  expect(buildPrompt({ kind: "scan", feature: "checkout" })).toBe("Use the trama-scan skill on the Feature `checkout`.");
  expect(buildPrompt({ kind: "implement", task: "0012" })).toBe("Use the trama-implement skill on Task 0012.");
  expect(buildPrompt({ kind: "implement-all" })).toBe(
    'Use the trama-implement skill on every Task in the "todo" column, in order, one after the other. Skip the Tasks that are blocked and go on with the others, also after you file a Drift; at the end list the Tasks you skipped with the Drift that blocks each.',
  );
  expect(buildPrompt({ kind: "implement-design", proposal: "0007" })).toBe(
    'Use the trama-implement skill on every Task of Proposal 0007 that is in the "todo" column, in order, one after the other. Skip the Tasks that are blocked and go on with the others, also after you file a Drift; at the end list the Tasks you skipped with the Drift that blocks each.',
  );
  expect(buildPrompt({ kind: "rework-drift", drift: "0003", proposal: "0002" })).toBe(
    "Use the trama-design skill, without asking questions. Proposal 0002, attached to Drift 0003, is stale: write a new Proposal that makes the same change on the current Model and Requirements, hand it over, and attach it to the Drift in place of the stale one.",
  );
});

test("several Features are listed in backticks, comma separated", () => {
  expect(buildScanPrompt(["checkout", "shipping"])).toBe("Use the trama-scan skill on the Features `checkout`, `shipping`.");
  expect(buildScanPrompt([])).toBe("Use the trama-scan skill on the whole System.");
});

test("a scan after an approval names the approved Proposal, and a scan by hand names none", () => {
  expect(buildScanPrompt(["checkout"], "0007")).toBe(
    "Use the trama-scan skill on the Feature `checkout`. The scan follows the approval of Proposal 0007: link every Task you file to it with --proposal 0007.",
  );
  expect(buildPrompt({ kind: "scan", feature: "checkout" })).not.toContain("Proposal");
});
