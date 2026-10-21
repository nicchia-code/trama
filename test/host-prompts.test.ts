import { expect, test } from "bun:test";
import { ASK_DEVELOPER_SENTENCE, buildPrompt, buildScanPrompt, DRIFT_BLOCKER_SENTENCE, importPrompt, mayFileDrifts, terminalName, withDriftBlocker, withLanguage } from "../extension/src/host/prompts";

test("each action names its skill and its scope exactly", () => {
  expect(buildPrompt({ kind: "written-design", request: "2026-10-04T19-05-12" })).toBe(
    "Use the trama-design skill on the design request in `.trama/requests/2026-10-04T19-05-12.md`. Bind the first Proposal you open to it with the `request` field.",
  );
  expect(buildPrompt({ kind: "setup-request", request: "2026-10-04T19-05-12" })).toBe(
    "Use the trama-setup skill on the project request in `.trama/requests/2026-10-04T19-05-12.md`. Bind the setup Proposal you open to it with the `request` field.",
  );
  expect(buildPrompt({ kind: "scan" })).toBe("Use the trama-scan skill on the whole System.");
  expect(buildPrompt({ kind: "scan", feature: "checkout" })).toBe("Use the trama-scan skill on the Feature `checkout`.");
  expect(buildPrompt({ kind: "implement", task: "0012" })).toBe("Use the trama-implement skill on Task 0012.");
  expect(buildPrompt({ kind: "implement-all" })).toBe(
    'Use the trama-implement skill on every Task in the "todo" column. Take them from `trama task list --input \'{"runnable":true,"max":{maxParallelAgents}}\'`, one group at a time, until it says there is none.',
  );
  expect(buildPrompt({ kind: "resolve-drifts", drift: "ab12cd34" })).toBe(
    "Use the trama-resolve-drifts skill on the open Drift ab12cd34, and on no other open Drift: ask the developer what should happen for it, then write one resolution Proposal.",
  );
});

test("no instruction mentions the delegation: Resolve Drifts is manual and nothing is automatic", () => {
  const all = [buildPrompt({ kind: "resolve-drifts", drift: "ab12cd34" }), buildPrompt({ kind: "implement-all" }), buildPrompt({ kind: "implement", task: "t" })].join(" ");
  expect(all).not.toContain("automatic");
  expect(all).not.toContain("autopilot");
  expect(all).not.toContain("TRAMA_JOB");
});

test("several Features are listed in backticks, comma separated", () => {
  expect(buildScanPrompt(["checkout", "shipping"])).toBe("Use the trama-scan skill on the Features `checkout`, `shipping`.");
  expect(buildScanPrompt([])).toBe("Use the trama-scan skill on the whole System.");
});

test("the import instruction names the excluded paths, or says every folder is imported, only when the wizard decided", () => {
  const base = "Use the trama-import skill on this repository.";
  expect(buildPrompt({ kind: "import" })).toBe(base);
  expect(importPrompt()).toBe(base);
  expect(buildPrompt({ kind: "import", excluded: [] })).toBe(`${base} Import every folder and do not ask which folders to import.`);
  expect(buildPrompt({ kind: "import", excluded: ["a", "b/c"] })).toBe(`${base} Do not import these paths and do not ask which folders to import: \`a\`, \`b/c\`.`);
});

test("the agent terminal is named after the work: the card's short number, or a fixed word", () => {
  const short = (kind: "task" | "proposal", id: string) => (kind === "task" ? `T${id.length}` : `P${id.length}`);
  expect(terminalName({ kind: "implement", task: "abc" }, short)).toBe("T3");
  expect(terminalName({ kind: "written-design", request: "r" }, short)).toBe("Design");
  expect(terminalName({ kind: "setup-request", request: "r" }, short)).toBe("Setup");
  expect(terminalName({ kind: "resolve-drifts", drift: "ab12cd34" }, short)).toBe("Drifts");
  expect(terminalName({ kind: "scan", feature: "checkout" }, short)).toBe("Scan");
  expect(terminalName({ kind: "implement-all" }, short)).toBe("All tasks");
  expect(terminalName({ kind: "import" }, short)).toBe("Import");
});

test("a chosen language ends the instruction on the same line, trimmed; blank asks nothing", () => {
  const scan = buildScanPrompt(["checkout"]);
  expect(withLanguage("Use the trama-scan skill on the whole System.", "  Italian ")).toBe(
    "Use the trama-scan skill on the whole System. Write everything you generate in Italian, except code, which always stays in English.",
  );
  expect(withLanguage(scan, "Deutsch")).toBe(`${scan} Write everything you generate in Deutsch, except code, which always stays in English.`);
  expect(withLanguage(scan, "")).toBe(scan);
  expect(withLanguage(scan, " \t ")).toBe(scan);
});
test("implementation batch commands receive the configured limit at send time", () => {
  const all = buildPrompt({ kind: "implement-all" }).replaceAll("{maxParallelAgents}", "7");
  expect(all).toContain('trama task list --input \'{"runnable":true,"max":7}\'');
});
test("a Run all group cut by Proposal names its Proposals and the filter, and its terminal names its model", () => {
  const short = (kind: "task" | "proposal", id: string) => (kind === "task" ? `T${id.length}` : `P${id.length}`);
  expect(buildPrompt({ kind: "implement-all", group: { include: ["aaaa1111", "bbbb2222"] } })).toBe(
    'Use the trama-implement skill on every Task in the "todo" column that belongs to the Proposals `aaaa1111`, `bbbb2222`. Take them from `trama task list --input \'{"runnable":true,"proposals":["aaaa1111","bbbb2222"],"max":{maxParallelAgents}}\'`, one group at a time, until it says there is none.',
  );
  expect(buildPrompt({ kind: "implement-all", group: { exclude: ["aaaa1111"] } })).toBe(
    'Use the trama-implement skill on every Task in the "todo" column except those of the Proposal `aaaa1111`. Take them from `trama task list --input \'{"runnable":true,"notProposals":["aaaa1111"],"max":{maxParallelAgents}}\'`, one group at a time, until it says there is none.',
  );
  expect(buildPrompt({ kind: "implement-all", group: { include: [], exclude: [] } })).toBe(buildPrompt({ kind: "implement-all" }));
  expect(terminalName({ kind: "implement-all", group: { include: ["aaaa1111"], model: "  gpt-5  " } }, short)).toBe("All tasks · gpt-5");
  expect(terminalName({ kind: "implement-all", group: { exclude: ["aaaa1111"] } }, short)).toBe("All tasks");
  expect(terminalName({ kind: "implement-all", group: { model: "  " } }, short)).toBe("All tasks");
});
test("the Drift blocker's sentence is added on the same line only when on, and only the instructions that may file Drifts take it", () => {
  const sentence = "The experimental Drift blocker is on: follow its steps whenever you file a Drift, and tell your sub-agents.";
  expect(mayFileDrifts({ kind: "scan" })).toBe(true);
  expect(mayFileDrifts({ kind: "scan", feature: "checkout" })).toBe(true);
  expect(mayFileDrifts({ kind: "implement", task: "abc" })).toBe(true);
  expect(mayFileDrifts({ kind: "implement-all" })).toBe(true);
  expect(mayFileDrifts({ kind: "import" })).toBe(true);
  expect(mayFileDrifts({ kind: "written-design", request: "r" })).toBe(false);
  expect(mayFileDrifts({ kind: "setup-request", request: "r" })).toBe(false);
  expect(mayFileDrifts({ kind: "resolve-drifts", drift: "ab12cd34" })).toBe(false);
  expect(withDriftBlocker("Use the trama-scan skill on the whole System.", false)).toBe("Use the trama-scan skill on the whole System.");
  expect(withDriftBlocker("Use the trama-scan skill on the whole System.", true)).toBe(`Use the trama-scan skill on the whole System. ${sentence}`);
  expect(DRIFT_BLOCKER_SENTENCE).toBe(sentence);
});

test("every instruction carries the one ask sentence, whatever the job", () => {
  expect(ASK_DEVELOPER_SENTENCE).toBe("Ask the developer only with `trama question new`, as the skill says, never with your own question tool; run it with no time limit and wait until it ends.");
});
