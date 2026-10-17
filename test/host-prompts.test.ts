import { expect, test } from "bun:test";
import { buildAutomaticRunPrompt, buildPrompt, buildScanPrompt, terminalName, withLanguage } from "../extension/src/host/prompts";

test("each action names its skill and its scope exactly", () => {
  expect(buildPrompt({ kind: "design", prompt: "  Add refunds to checkout \n" })).toBe("Use the trama-design skill. Add refunds to checkout");
  expect(buildPrompt({ kind: "written-design", request: "2026-10-04T19-05-12" })).toBe(
    "Use the trama-design skill on the design request in `.trama/requests/2026-10-04T19-05-12.md`. Bind the first Proposal you open to it with `--request 2026-10-04T19-05-12`.",
  );
  expect(buildPrompt({ kind: "setup-request", request: "2026-10-04T19-05-12" })).toBe(
    "Use the trama-setup skill on the project request in `.trama/requests/2026-10-04T19-05-12.md`. Bind the setup Proposal you open to it with `--request 2026-10-04T19-05-12`.",
  );
  expect(buildPrompt({ kind: "scan" })).toBe("Use the trama-scan skill on the whole System.");
  expect(buildPrompt({ kind: "scan", feature: "checkout" })).toBe("Use the trama-scan skill on the Feature `checkout`.");
  expect(buildPrompt({ kind: "implement", task: "0012" })).toBe("Use the trama-implement skill on Task 0012.");
  expect(buildPrompt({ kind: "implement-all" })).toBe(
    'Use the trama-implement skill on every Task in the "todo" column. Take them from `trama task next --batch --max {maxParallelAgents}`, one group at a time, until it says there is none.',
  );
  expect(buildPrompt({ kind: "resolve-drifts", drifts: ["ab12cd34", "ef56gh78"] })).toBe(
    "Use the trama-resolve-drifts skill on the open Drifts ab12cd34, ef56gh78: ask the developer what should happen for each one, then write one resolution Proposal.",
  );
});

test("automatic resolution and Runs stay scoped to coordinator authorization", () => {
  const resolve = buildPrompt({ kind: "resolve-drifts", drifts: ["ab12cd34"], automaticCollection: "collection" });
  expect(resolve).toContain("first Fix option");
  expect(resolve).toContain("Do not approve the Proposal or start a Run.");
  const run = buildAutomaticRunPrompt("collection");
  expect(run).toContain("Before each group, run `trama drift autopilot --json` and take the authorized Task IDs from its `tasks` field");
  expect(run).not.toContain("--task task-");
  expect(run).toContain("trama announce done <check-id> --failed");
  expect(run).toContain("Do not use the general Task queue");
});

test("several Features are listed in backticks, comma separated", () => {
  expect(buildScanPrompt(["checkout", "shipping"])).toBe("Use the trama-scan skill on the Features `checkout`, `shipping`.");
  expect(buildScanPrompt([])).toBe("Use the trama-scan skill on the whole System.");
});

test("the agent terminal is named after the work: the card's short number, or a fixed word", () => {
  const short = (kind: "task" | "proposal", id: string) => (kind === "task" ? `T${id.length}` : `P${id.length}`);
  expect(terminalName({ kind: "implement", task: "abc" }, short)).toBe("T3");
  expect(terminalName({ kind: "design", prompt: "x" }, short)).toBe("Design");
  expect(terminalName({ kind: "written-design", request: "r" }, short)).toBe("Design");
  expect(terminalName({ kind: "setup-request", request: "r" }, short)).toBe("Setup");
  expect(terminalName({ kind: "resolve-drifts", drifts: [] }, short)).toBe("Drifts");
  expect(terminalName({ kind: "scan", feature: "checkout" }, short)).toBe("Scan");
  expect(terminalName({ kind: "implement-all" }, short)).toBe("All tasks");
  expect(terminalName({ kind: "implement-design", proposal: "8ga7dqpb" }, short)).toBe("P8");
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
test("a design run takes the Tasks of that design from the batch queue, with the limit at send time", () => {
  expect(buildPrompt({ kind: "implement-design", proposal: "8ga7dqpb" })).toContain("trama task next --batch --proposal 8ga7dqpb --max {maxParallelAgents}");
});
test("implementation batch commands receive the configured limit at send time", () => {
  const all = buildPrompt({ kind: "implement-all" }).replaceAll("{maxParallelAgents}", "7");
  expect(all).toContain("trama task next --batch --max 7");
});
