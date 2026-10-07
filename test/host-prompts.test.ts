import { expect, test } from "bun:test";
import { buildApprovalScanPrompt, buildHeldScanPrompt, buildPrompt, buildScanPrompt, terminalName, withLanguage } from "../extension/src/host/prompts";

test("each action names its skill and its scope exactly", () => {
  expect(buildPrompt({ kind: "design", prompt: "  Add refunds to checkout \n" })).toBe("Use the trama-design skill. Add refunds to checkout");
  expect(buildPrompt({ kind: "written-design", request: "2026-10-04T19-05-12" })).toBe(
    "Use the trama-design skill on the design request in `.trama/requests/2026-10-04T19-05-12.md`. Bind the first Proposal you open to it with `--request 2026-10-04T19-05-12`.",
  );
  expect(buildPrompt({ kind: "scan" })).toBe("Use the trama-scan skill on the whole System.");
  expect(buildPrompt({ kind: "scan", feature: "checkout" })).toBe("Use the trama-scan skill on the Feature `checkout`.");
  expect(buildPrompt({ kind: "implement", task: "0012" })).toBe("Use the trama-implement skill on Task 0012.");
  expect(buildPrompt({ kind: "implement-all" })).toBe(
    'Use the trama-implement skill on every Task in the "todo" column. Take them from `trama task next --batch`, one group at a time, until it says there is none.',
  );
  expect(buildPrompt({ kind: "implement-design", proposal: "0007" })).toBe(
    'Use the trama-implement skill on every Task of Proposal 0007 that is in the "todo" column. Take them from `trama task next --batch --proposal 0007`, one group at a time, until it says there is none.',
  );
  expect(buildPrompt({ kind: "rework-drift", drift: "0003", proposal: "0002" })).toBe(
    "Use the trama-design skill, without asking questions. Proposal 0002, attached to Drift 0003, is stale: write a new Proposal that makes the same change on the current Model and Requirements, attach it to the Drift in place of the stale one as soon as you create it, then hand it over.",
  );
});

test("several Features are listed in backticks, comma separated", () => {
  expect(buildScanPrompt(["checkout", "shipping"])).toBe("Use the trama-scan skill on the Features `checkout`, `shipping`.");
  expect(buildScanPrompt([])).toBe("Use the trama-scan skill on the whole System.");
});

test("the automatic scan after an approval reads the Proposal's scan scope and stops after the scan", () => {
  expect(buildApprovalScanPrompt("ab12cd34")).toBe(
    "Use the trama-scan skill on what Proposal ab12cd34 changed: its scan scope is in `trama proposal show ab12cd34`. Link every Task you file to it with --proposal ab12cd34.",
  );
});

test("the held scan names the Proposals oldest first, and is the automatic scan's instruction for one Proposal", () => {
  expect(buildHeldScanPrompt(["ab12cd34"])).toBe(buildApprovalScanPrompt("ab12cd34"));
  expect(buildHeldScanPrompt(["aaaa1111", "bbbb2222"])).toBe(
    "Use the trama-scan skill on what Proposals aaaa1111, bbbb2222 changed: each scan scope is in `trama proposal show <id>`. Compare every reference once, against the current Model, and link every Task you file with --proposal to the most recent of those Proposals whose scan scope covers it.",
  );
});

test("the agent terminal is named after the work: the card's short number, or a fixed word", () => {
  const short = (kind: "task" | "proposal", id: string) => (kind === "task" ? `T${id.length}` : `P${id.length}`);
  expect(terminalName({ kind: "implement", task: "abc" }, short)).toBe("T3");
  expect(terminalName({ kind: "implement-design", proposal: "ab" }, short)).toBe("P2");
  expect(terminalName({ kind: "design", prompt: "x" }, short)).toBe("Design");
  expect(terminalName({ kind: "written-design", request: "r" }, short)).toBe("Design");
  expect(terminalName({ kind: "rework-drift", drift: "d", proposal: "p" }, short)).toBe("Design");
  expect(terminalName({ kind: "scan", feature: "checkout" }, short)).toBe("Scan");
  expect(terminalName({ kind: "implement-all" }, short)).toBe("All tasks");
  expect(terminalName({ kind: "import" }, short)).toBe("Import");
});

test("a chosen language ends the instruction on the same line, trimmed; blank asks nothing", () => {
  const scan = buildApprovalScanPrompt("ab12cd34");
  expect(withLanguage("Use the trama-scan skill on the whole System.", "  Italian ")).toBe(
    "Use the trama-scan skill on the whole System. Write everything you generate in Italian, except code, which always stays in English.",
  );
  expect(withLanguage(scan, "Deutsch")).toBe(`${scan} Write everything you generate in Deutsch, except code, which always stays in English.`);
  expect(withLanguage(scan, "")).toBe(scan);
  expect(withLanguage(scan, " \t ")).toBe(scan);
});
