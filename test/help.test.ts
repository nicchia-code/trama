import { expect, test } from "bun:test";
import { COMMANDS } from "../src/cli/commands";
import { helpFor, run } from "../src/cli/main";

test("every command answers --help and -h with its usage, even for an agent", () => {
  const names = [...COMMANDS.map((c) => c.name), "ask", "classify", "cursor-hook", "agent-event"];
  for (const name of names)
    for (const flag of ["--help", "-h"]) {
      const out = helpFor([...name.split(" "), "x", flag]);
      expect(out).toContain(`Usage: trama ${name}`);
      expect(run([...name.split(" "), flag], "/nonexistent", { TRAMA_AGENT: "1" })).toEqual({ out: out as string, exit: 0 });
    }
});

test("an existing command with wrong arguments gives its usage error, not Unknown command", () => {
  expect(() => run(["ask", "extra"], "/tmp")).toThrow("Usage: trama ask");
  expect(() => run(["cursor-hook", "extra"], "/tmp")).toThrow("Usage: trama cursor-hook");
});
