import { afterEach, beforeEach, expect, test } from "bun:test";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { REGISTRY } from "../src/cli/commands";
import { countsAsActivity, execute, run } from "../src/cli/main";
import { OBJECTS, VERBS } from "../src/cli/registry";
import { UsageError } from "../src/core/errors";
import { REFERENCE_END, REFERENCE_START, referenceBlock } from "../scripts/cli-reference";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-registry-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const shop = () => {
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  return dir;
};

test("every command is declared with its object and verb, and an input that refuses unknown fields", () => {
  for (const command of REGISTRY.commands) {
    expect(OBJECTS).toContain(command.object);
    if (command.object !== "hook") expect(VERBS as readonly string[]).toContain(command.verb);
    if (command.verb === "review") expect(command.object).toBe("advisor");
    expect(command.summary.length).toBeGreaterThan(0);
    const probe = command.input.safeParse({ __unknown__: true });
    expect(probe.success).toBe(false);
    if (!probe.success) expect(probe.error.issues.some((i) => i.code === "unrecognized_keys")).toBe(true);
    // The input of a command can always be written as JSON, and so can its output.
    expect(() => JSON.stringify(z.toJSONSchema(command.input, { io: "input", unrepresentable: "any" }))).not.toThrow();
    expect(() => JSON.stringify(z.toJSONSchema(command.output, { io: "output", unrepresentable: "any" }))).not.toThrow();
    // `move` names its state of arrival.
    if (command.verb === "move") expect(command.positionals.at(-1)?.choices?.length ?? 0).toBeGreaterThan(0);
  }
});

test("docs/cli.md carries the command reference generated from the registry", () => {
  const doc = readFileSync(join(import.meta.dir, "../docs/cli.md"), "utf8");
  const start = doc.indexOf(REFERENCE_START);
  const end = doc.indexOf(REFERENCE_END);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(doc.slice(start, end + REFERENCE_END.length)).toBe(referenceBlock());
});

test("an input outside the schema is refused with every path of its fields, and nothing is written", () => {
  const argv = (input: unknown) => ["--root", dir, "project", "new", "--input", JSON.stringify(input)];
  let error: unknown;
  try {
    run(argv({ skillsDir: 5, force: "yes", bogus: true }), dir);
  } catch (e) {
    error = e;
  }
  expect(error).toBeInstanceOf(UsageError);
  const message = (error as Error).message;
  expect(message).toContain("- skillsDir: ");
  expect(message).toContain("- force: ");
  expect(message).toContain("- bogus: unknown field");
  expect(message).toContain("Nothing changed");
  expect(readdirSync(dir)).toEqual([]);
});

test("the path of a problem in a list names its index and field; every structural problem is listed at once", async () => {
  const option = (label: string, description?: string) => ({ label, ...(description === undefined ? {} : { description }) });
  const ask = (round: unknown) => execute(["--root", dir, "question", "new", "--input", "-"], dir, { env: {}, stdin: async () => JSON.stringify(round) });
  const structural = await ask({ questions: [{ id: "a", question: "Which?", options: [option("x"), option("y", "why")], recommended: 0, multi: false }, { id: "b", question: " ", options: [option("x", "d"), option("y", "d")], recommended: 0, multi: "no" }] });
  expect(structural.exit).toBe(2);
  const { error } = JSON.parse(structural.out);
  expect(error.code).toBe("invalid-input");
  for (const path of ["questions[0].options[0].description", "questions[1].question", "questions[1].multi"]) expect(error.message).toContain(`- ${path}`);
  // The rules between fields are checked once the fields themselves are right.
  const range = await ask({ questions: [{ id: "a", question: "Which?", options: [option("x", "d"), option("y", "d")], recommended: 5, multi: false }, { id: "a", question: "Again?", options: [option("x", "d"), option("y", "d")], recommended: 0, multi: false }] });
  expect(range.exit).toBe(2);
  expect(JSON.parse(range.out).error.message).toContain("- questions[0].recommended");
  const duplicate = await ask({ questions: [{ id: "a", question: "Which?", options: [option("x", "d"), option("y", "d")], recommended: 0, multi: false }, { id: "a", question: "Again?", options: [option("x", "d"), option("y", "d")], recommended: 0, multi: false }] });
  expect(JSON.parse(duplicate.out).error.message).toContain("- questions[1].id: duplicates");
});

test("the input is a JSON object: text that is not JSON, or JSON that is not an object, is a usage error", () => {
  shop();
  expect(() => run(["--root", dir, "model", "list", "--input", "{nope"], dir)).toThrow(/not valid JSON[^]*--input -/);
  expect(() => run(["--root", dir, "model", "list", "--input", "[1]"], dir)).toThrow("must be a JSON object");
  // Required fields without --input are the usage error; a command without fields accepts only {}.
  expect(() => run(["--root", dir, "model", "list"], dir)).toThrow(/- text: required/);
  expect(() => run(["--root", dir, "model", "check", "--input", '{"x":1}'], dir)).toThrow(/- x: unknown field/);
  expect(run(["--root", dir, "model", "check", "--input", "{}"], dir).exit).toBe(0);
});

test("--input - reads standard input and ignores a leading byte order mark; --input= and --root= are also accepted", () => {
  shop();
  const viaStdin = run(["--root", dir, "model", "list", "--input", "-"], dir, {}, { stdin: () => `\uFEFF${JSON.stringify({ text: "refund" })}` });
  expect(viaStdin.exit).toBe(0);
  expect(viaStdin.out).toContain("# Search: refund");
  expect(run([`--root=${dir}`, "model", "list", `--input=${JSON.stringify({ text: "refund" })}`], dir).out).toBe(viaStdin.out);
  // The common options work in any position.
  expect(run(["model", "list", "--json", "--input", '{"text":"refund"}', "--root", dir], dir).out).toContain('"query": "refund"');
});

test("an old option is not an option: the fields of a command go in --input", () => {
  shop();
  expect(() => run(["--root", dir, "model", "show", "order", "--max", "3"], dir)).toThrow(/has no option --max/);
});

test("the commands that count as the agent's activity are the ones declared with that effect, plus the old ones that stay", () => {
  for (const old of [["announcement", "new"], ["announcement", "move", "x", "history"], ["announcement", "move", "x", "delivered"], ["proposal", "new"], ["proposal", "edit", "x"], ["proposal", "move", "x", "open"], ["task", "new"], ["task", "move", "x", "doing"], ["drift", "new"], ["comparison", "new", "x"], ["comparison", "move", "x", "delivered"]])
    expect(countsAsActivity(old)).toBe(true);
  for (const reading of [["model", "show"], ["model", "list"], ["model", "check"], ["project", "show"], ["project", "new"], ["project", "edit"], ["question", "new"], ["hook", "idle"], ["task", "list"], ["proposal", "show", "x"], ["proposal", "list"], ["proposal", "move", "x", "approved"], ["proposal", "move", "x", "rejected"], ["proposal", "move", "x", "discarded"], ["drift", "list"], ["drift", "show", "x"], ["drift", "move", "x", "dismissed"], ["timing", "list"], ["history", "list"], ["history", "show", "x"], ["history", "new"], ["history", "edit", "x"], ["init"], ["nothing"]])
    expect(countsAsActivity(reading)).toBe(false);
});

test("a hook answers whatever happens and exits with 0, and a hook that fails prints what its agent expects", async () => {
  const nothing = { env: {}, stdin: async () => "" };
  expect(await execute(["hook", "cursor", "--root", join(dir, "none")], dir, { ...nothing, stdin: async () => "not json" })).toEqual({ out: "{}", exit: 0 });
  expect(await execute(["hook", "idle"], dir, nothing)).toEqual({ out: "", exit: 0 });
  // Copilot's and Claude Code's hooks no longer exist: unknown commands are a usage error.
  for (const gone of ["copilot", "claude-question-tool"]) await expect(execute(["hook", gone], dir, nothing)).rejects.toThrow(/Unknown command/);
});

test("a command that waits for the editor does not run through the synchronous entry point", () => {
  expect(() => run(["question", "new"], dir)).toThrow(/waits for the editor/);
});

test("project new creates the project, refuses a second one and refuses to overwrite customised skills unless force is true", () => {
  const first = run(["--root", dir, "project", "new"], dir);
  expect(first.exit).toBe(0);
  expect(existsSync(join(dir, ".trama", "model", "system.md"))).toBe(true);
  expect(() => run(["--root", dir, "project", "new"], dir)).toThrow(/already exists/);
  const other = mkdtempSync(join(tmpdir(), "trama-registry-other-"));
  try {
    run(["--root", other, "project", "new"], other);
    writeFileSync(join(other, ".agents", "skills", "trama-scan", "SKILL.md"), "mine\n");
    rmSync(join(other, ".trama"), { recursive: true });
    expect(() => run(["--root", other, "project", "new"], other)).toThrow(/pick another skillsDir, or pass "force": true/);
    expect(run(["--root", other, "project", "new", "--input", '{"force":true}'], other).exit).toBe(0);
    expect(run(["--root", other, "project", "edit"], other).out).toContain("already up to date");
    expect(run(["--root", other, "project", "show"], other).out).toContain("# Board");
  } finally {
    rmSync(other, { recursive: true, force: true });
  }
});

test("there is no autopilot object, and the removed delegation fields are refused", () => {
  shop();
  expect(OBJECTS as readonly string[]).not.toContain("autopilot");
  expect(() => run(["--root", dir, "autopilot", "show"], dir)).toThrow(/Unknown command "autopilot".*trama --help/);
  expect(() => run(["--root", dir, "autopilot", "move", "job-1", "failed"], dir)).toThrow(/Unknown command "autopilot".*trama --help/);
  const refused = (argv: string[], input: object) => () => run(["--root", dir, ...argv, "--input", JSON.stringify(input)], dir);
  expect(refused(["proposal", "new"], { title: "Resolve", kind: "resolution", automatic: true })).toThrow(/automatic: unknown field/);
  expect(refused(["proposal", "new"], { title: "Resolve", job: "job-1" })).toThrow(/job: unknown field/);
  expect(refused(["announcement", "new"], { kind: "check", title: "Check", phase: "verifying", job: "job-1" })).toThrow(/job: unknown field/);
  const drift = { title: "Late refund", refs: ["order/Paid"], happens: "a", should: "b", where: "src/order.ts", options: [{ title: "x", text: "y" }, { title: "z", text: "w" }], critical: true };
  expect(refused(["drift", "new"], drift)).toThrow(/critical: unknown field/);
});
