import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { developerExclusions, findInstructionFiles, instructionExclusions, mergeExclusions } from "../src/core/instruction-files";

let base: string;
let home: string;
let project: string;

const put = (path: string, text = "rules\n") => {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, text);
};

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), "trama-instructions-"));
  home = join(base, "home");
  project = join(home, "work", "app");
  mkdirSync(project, { recursive: true });
});
afterEach(() => rmSync(base, { recursive: true, force: true }));

test("nothing is found when no file exists", async () => {
  expect(await findInstructionFiles(project, home)).toEqual([]);
});

test("the project files come in the order of the search, with paths relative to the project", async () => {
  for (const name of [".omp/RULES.md", ".omp/AGENTS.md", ".agents/AGENTS.md", ".cursorrules", "CLAUDE.md", "AGENTS.md"]) put(join(project, name));
  const files = await findInstructionFiles(project, home);
  expect(files.map((f) => f.label)).toEqual(["AGENTS.md", "CLAUDE.md", ".cursorrules", ".agents/AGENTS.md", ".omp/AGENTS.md", ".omp/RULES.md"]);
  expect(files.map((f) => f.path)).toEqual(files.map((f) => join(project, f.label)));
});

test(".cursor/rules takes only .mdc and .md directly inside, alphabetically, between .cursorrules and .agents", async () => {
  put(join(project, ".cursorrules"));
  put(join(project, ".cursor", "rules", "b.mdc"));
  put(join(project, ".cursor", "rules", "a.md"));
  put(join(project, ".cursor", "rules", "c.txt"));
  put(join(project, ".cursor", "rules", "sub", "d.md"));
  put(join(project, ".agents", "AGENTS.md"));
  expect((await findInstructionFiles(project, home)).map((f) => f.label)).toEqual([".cursorrules", ".cursor/rules/a.md", ".cursor/rules/b.mdc", ".agents/AGENTS.md"]);
});

test("an empty file, a file of blanks, a folder and an unreadable name do not count", async () => {
  put(join(project, "AGENTS.md"), "");
  put(join(project, "CLAUDE.md"), " \n\t\r\n  ");
  mkdirSync(join(project, ".cursorrules"));
  put(join(project, ".omp", "AGENTS.md"), `${" ".repeat(10_000)}x`);
  symlinkSync(join(base, "missing"), join(project, ".omp", "RULES.md"));
  expect((await findInstructionFiles(project, home)).map((f) => f.label)).toEqual([".omp/AGENTS.md"]);
});

test("the folders above the project, nearest first, up to the home excluded, give only AGENTS.md and CLAUDE.md", async () => {
  put(join(home, "work", "AGENTS.md"));
  put(join(home, "work", "CLAUDE.md"));
  put(join(home, "work", ".cursorrules"));
  put(join(home, "AGENTS.md"));
  put(join(project, "AGENTS.md"));
  const files = await findInstructionFiles(project, home);
  expect(files.map((f) => f.label)).toEqual(["AGENTS.md", "~/work/AGENTS.md", "~/work/CLAUDE.md"]);
});

test("the home gives its own list, with ~/ labels, after the folders above", async () => {
  put(join(home, ".claude", "CLAUDE.md"));
  put(join(home, ".omp", "agent", "RULES.md"));
  put(join(home, ".omp", "agent", "AGENTS.md"));
  put(join(home, ".agents", "AGENTS.md"));
  put(join(home, ".cursor", "rules", "z.mdc"));
  put(join(home, ".cursor", "rules", "a.md"));
  put(join(home, "work", "CLAUDE.md"));
  expect((await findInstructionFiles(project, home)).map((f) => f.label)).toEqual([
    "~/work/CLAUDE.md",
    "~/.omp/agent/AGENTS.md",
    "~/.omp/agent/RULES.md",
    "~/.agents/AGENTS.md",
    "~/.claude/CLAUDE.md",
    "~/.cursor/rules/a.md",
    "~/.cursor/rules/z.mdc",
  ]);
});

test("a project outside the home has no folders above to search and absolute labels would only appear for files outside both", async () => {
  const outside = join(base, "elsewhere", "app");
  put(join(base, "elsewhere", "AGENTS.md"));
  put(join(outside, "AGENTS.md"));
  put(join(home, "AGENTS.md"));
  put(join(home, ".agents", "AGENTS.md"));
  const files = await findInstructionFiles(outside, home);
  expect(files.map((f) => f.label)).toEqual(["AGENTS.md", "~/.agents/AGENTS.md"]);
});

test("a project that is the home lists each file once, relative to the project", async () => {
  put(join(home, ".agents", "AGENTS.md"));
  put(join(home, "AGENTS.md"));
  const files = await findInstructionFiles(home, home);
  expect(files.map((f) => f.label)).toEqual(["AGENTS.md", ".agents/AGENTS.md"]);
});

test("the answer carries only labels and paths, never the content", async () => {
  put(join(project, "AGENTS.md"), "SECRET CONTENT");
  const files = await findInstructionFiles(project, home);
  expect(JSON.stringify(files)).not.toContain("SECRET");
  expect(Object.keys(files[0] ?? {}).sort()).toEqual(["label", "path"]);
});

test("each file found is translated to omp's exclusion identity, once, in the order of the search", async () => {
  for (const name of ["AGENTS.md", "CLAUDE.md", ".cursorrules", ".agents/AGENTS.md", ".omp/AGENTS.md", ".omp/RULES.md", ".cursor/rules/style.mdc", ".cursor/rules/api.md"]) put(join(project, name));
  put(join(home, "work", "AGENTS.md"));
  put(join(home, "work", "CLAUDE.md"));
  for (const name of [".omp/agent/AGENTS.md", ".omp/agent/RULES.md", ".agents/AGENTS.md", ".claude/CLAUDE.md", ".cursor/rules/mine.mdc"]) put(join(home, name));
  const files = await findInstructionFiles(project, home);
  expect(instructionExclusions(files, project, home)).toEqual([
    "context-file:project:AGENTS.md",
    "context-file:project:CLAUDE.md",
    "rule:api",
    "rule:style",
    "rule:RULES@project",
    "context-file:user:AGENTS.md",
    "rule:RULES",
    "context-file:user:CLAUDE.md",
    "rule:mine",
  ]);
});

test(".cursorrules alone gives no exclusion, and no file gives none", async () => {
  put(join(project, ".cursorrules"));
  expect(instructionExclusions(await findInstructionFiles(project, home), project, home)).toEqual([]);
  expect(instructionExclusions([], project, home)).toEqual([]);
});

test("the developer's exclusions come from the project config, else the user config, and a bad one counts as none", async () => {
  expect(await developerExclusions(project, home)).toEqual([]);
  put(join(home, ".omp", "agent", "config.yml"), "disabledExtensions:\n  - user:one\n");
  expect(await developerExclusions(project, home)).toEqual(["user:one"]);
  put(join(project, ".omp", "config.yml"), "other: 1\n");
  expect(await developerExclusions(project, home)).toEqual(["user:one"]);
  put(join(project, ".omp", "config.yml"), "disabledExtensions:\n  - project:one\n  - project:two\n");
  expect(await developerExclusions(project, home)).toEqual(["project:one", "project:two"]);
  put(join(project, ".omp", "config.yml"), "disabledExtensions: nope\n");
  expect(await developerExclusions(project, home)).toEqual([]);
  put(join(project, ".omp", "config.yml"), "disabledExtensions: [a, 1]\n");
  expect(await developerExclusions(project, home)).toEqual([]);
  put(join(project, ".omp", "config.yml"), ": : [unparsable");
  expect(await developerExclusions(project, home)).toEqual(["user:one"]);
});

test("Trama's exclusions follow the developer's without duplicates", () => {
  expect(mergeExclusions(["a", "rule:x"], ["rule:x", "b"])).toEqual(["a", "rule:x", "b"]);
});
