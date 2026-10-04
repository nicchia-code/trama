import { afterEach, beforeEach, expect, test } from "bun:test";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { completeFixChoice } from "../src/cli/fix-prompt";
import { run } from "../src/cli/main";
import { type Project, projectAt } from "../src/core/store";
import { getDrift, newDrift } from "../src/core/work";
import { FIX_OPTIONS } from "./fix-options";

let dir: string;
let p: Project;
let id: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-fixprompt-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
  id = newDrift(p, { options: FIX_OPTIONS, title: "Refund too late", refs: ["order"], happens: "Code does it.", should: "Model says so." }).id;
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

/** Runs the prompt with the lines the developer types; returns the completed arguments and what was shown. */
async function ask(argv: string[], typed: string[]): Promise<{ argv: string[]; shown: string }> {
  const input = new PassThrough();
  const output = new PassThrough();
  let shown = "";
  output.on("data", (c) => (shown += c));
  input.end(typed.map((l) => `${l}\n`).join(""));
  return { argv: await completeFixChoice(argv, dir, { input, output }), shown };
}
const base = () => ["--root", dir, "drift", "resolve", id, "--fix-code"];

test("a fix without --option shows the options with the recommended one as default, then asks for a note", async () => {
  const empty = await ask(base(), ["", ""]);
  expect(empty.argv).toEqual([...base(), "--option", "1"]);
  expect(empty.shown).toContain("1) Change the code (recommended)");
  expect(empty.shown).toContain("2) Remove the code");
  expect(empty.shown).not.toContain("2) Remove the code (recommended)");

  expect((await ask(base(), ["2", "Keep the log"])).argv).toEqual([...base(), "--option", "2", "--note", "Keep the log"]);

  const retried = await ask(base(), ["9", "two", "2", ""]);
  expect(retried.argv).toEqual([...base(), "--option", "2"]);
  expect(retried.shown).toContain("Choose a number from 1 to 2");

  const completed = run(retried.argv, dir, {});
  expect(completed.out).toContain("resolved (fix-code)");
  expect(getDrift(p, id).data.option).toBe(2);
});

test("the prompt asks nothing when the command line already decides, or the Drift has nothing to choose", async () => {
  for (const argv of [
    [...base(), "--option", "1"],
    ["--root", dir, "drift", "resolve", id, "--dismiss"],
    ["--root", dir, "drift", "resolve", id],
    ["--root", dir, "drift", "resolve", "9999", "--fix-code"],
    ["--root", dir, "drift", "show", id],
  ]) {
    const { argv: out, shown } = await ask(argv, ["2"]);
    expect(out).toEqual(argv);
    expect(shown).toBe("");
  }
  expect((await ask([...base(), "--note", "Keep the log"], ["2"])).argv).toEqual([...base(), "--note", "Keep the log", "--option", "2"]);
});

test("closing the input before an option is chosen refuses, saying that an option must be chosen", async () => {
  await expect(ask(base(), [])).rejects.toThrow(/An option must be chosen/);
  expect(getDrift(p, id).data.status).toBe("open");
});
