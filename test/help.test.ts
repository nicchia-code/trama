import { expect, test } from "bun:test";
import { tmpdir } from "node:os";
import { REGISTRY } from "../src/cli/commands";
import { helpFor, run } from "../src/cli/main";
import { commandName } from "../src/cli/registry";

const refuseStdin = () => {
  throw new Error("--help must not read standard input");
};

test("every declared command answers --help and -h with its usage, even for an agent, without reading standard input", () => {
  expect(REGISTRY.commands.length).toBeGreaterThan(0);
  for (const command of REGISTRY.commands)
    for (const flag of ["--help", "-h"]) {
      const argv = [command.object, command.verb, "x", flag];
      const out = helpFor(argv);
      expect(out).toContain(`Usage: trama ${commandName(command)}`);
      expect(out).toContain(command.description ?? command.summary);
      expect(run(argv, "/nonexistent", { TRAMA_AGENT: "1" }, { stdin: refuseStdin })).toEqual({ out: out as string, exit: 0 });
    }
});

test("--help puts every field of the input with its type, whether it is required and its description, an example and the output", () => {
  const out = helpFor(["model", "show", "--help"]) as string;
  expect(out).toContain("Usage: trama model show [<ref>] [--root <dir>] [--json] [--input <json>]");
  expect(out).toMatch(/to: string not empty, optional\. Only on a State/);
  expect(out).toMatch(/max: integer ≥ 1, optional\. Only with `to`/);
  expect(out).toContain("trama model show order/Paid --input - <<'JSON'");
  expect(out).toContain('{"to":"Shipped","max":5}');
  expect(out).toContain("Output (--json):");
  const list = helpFor(["model", "list", "--help"]) as string;
  expect(list).toMatch(/text: string not empty, required\. The text to look for\./);
  expect(helpFor(["model", "check", "--help"])).toContain("Input: none");
});

test("--help --json prints the JSON Schemas of the input and of the output", () => {
  const schemas = JSON.parse(helpFor(["model", "list", "--help", "--json"]) as string);
  expect(schemas.command).toBe("model list");
  expect(schemas.input).toMatchObject({ type: "object", required: ["text"], additionalProperties: false, properties: { text: { type: "string" } } });
  expect(schemas.output.properties.hits.type).toBe("array");
  expect(run(["model", "list", "--help", "--json"], "/nonexistent")).toEqual({ out: helpFor(["model", "list", "--help", "--json"]) as string, exit: 0 });
});

test("trama --help lists the objects with their verbs and leaves the hooks out; every object has its own --help", () => {
  const root = run(["--help"], "/nonexistent").out;
  expect(root).toMatch(/model\s+show, list, check/);
  expect(root).toMatch(/project\s+new, edit, show/);
  expect(root).toMatch(/question\s+new/);
  expect(root).not.toMatch(/\bhook\b\s+(cursor|idle|start)/);
  expect(root).not.toContain("[developer only]");
  expect(run(["-h"], "/nonexistent")).toEqual({ out: root, exit: 0 });
  expect(run([], "/nonexistent").exit).toBe(2);
  const model = run(["model", "--help"], "/nonexistent").out;
  expect(model).toContain("model show [<ref>]");
  expect(model).toContain("model check [<machine>]");
  // A hook is left out of the lists but has its own help.
  expect(run(["hook", "idle", "--help"], "/nonexistent").out).toContain("Usage: trama hook idle");
});

test("decision commands are not labelled developer-only", () => {
  expect(run(["--help"], "/nonexistent").out).not.toContain("[developer only]");
  for (const name of ["proposal move", "task move", "drift move"])
    expect(helpFor([...name.split(" "), "--help"])).not.toContain("[developer only]");
});

test("an existing command with wrong arguments gives its usage error, not Unknown command", () => {
  expect(() => run(["question", "new", "extra"], tmpdir())).toThrow("Usage: trama question new");
  expect(() => run(["hook", "idle", "extra"], tmpdir())).toThrow("Usage: trama hook idle");
  expect(() => run(["model", "show", "a", "b"], tmpdir())).toThrow("Usage: trama model show [<ref>]");
  expect(() => run(["model", "show", "--bogus"], tmpdir())).toThrow("trama model show has no option --bogus");
});

test("an old command name has no alias: it gives the usage error that points to trama --help", () => {
  for (const old of [["init"], ["skills", "update"], ["ids", "rewrite"], ["system"], ["feature", "order"], ["machine", "order"], ["state", "order/Paid"], ["event", "user.CANCEL"], ["requirements"], ["paths", "order", "A", "B"], ["search", "cart"], ["validate"], ["analyze"], ["board"], ["ask"], ["cursor-hook"], ["copilot-hook"], ["agent-event", "idle"], ["agent-event", "question-tool"]])
    expect(() => run([...old, "--root", tmpdir()], tmpdir())).toThrow(/Unknown command "[^"]+"[^]*Run "trama --help"/);
  expect(() => run(["model", "shw"], tmpdir())).toThrow('Unknown command "model shw". Known "model" commands: show, list, check');
  expect(() => run(["model"], tmpdir())).toThrow('"model" needs a verb: show, list, check');
});
