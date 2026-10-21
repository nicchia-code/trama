import { expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { bunBinDir, cursorModels, ompModels, ompPathVariable, parseCursorModels, parseOmpModels } from "../extension/src/host/model-lists";

const CURSOR_KEY = "src.vs.platform.reactivestorage.browser.reactiveStorageServiceImpl.persistentStorage.applicationUser";

test("omp suggests each model's selector, labelled by its name only when they differ", () => {
  const output = JSON.stringify({
    models: [
      { selector: "anthropic/claude-a", name: "Claude A" },
      { selector: "openai/gpt-b", name: "openai/gpt-b" },
      { selector: "anthropic/claude-a", name: "Claude A again" },
      { name: "no selector" },
    ],
  });
  expect(parseOmpModels(output)).toEqual([{ value: "anthropic/claude-a", label: "Claude A" }, { value: "openai/gpt-b" }]);
});

test("omp output that is not the models list gives no list; an empty list is a list", () => {
  expect(parseOmpModels("not json")).toBeUndefined();
  expect(parseOmpModels(JSON.stringify({ models: "none" }))).toBeUndefined();
  expect(parseOmpModels(JSON.stringify({ models: [] }))).toEqual([]);
});

test("Cursor suggests each default model's name as the value and its clientDisplayName as the label, in order and once each", () => {
  const state = JSON.stringify({
    mcpServers: [],
    availableDefaultModels2: [
      { name: "claude-opus-5-5", clientDisplayName: "Claude Opus 5.5" },
      { name: "gpt-5" },
      { name: "claude-opus-5-5", clientDisplayName: "Claude Opus 5.5" },
      { clientDisplayName: "no name" },
    ],
  });
  expect(parseCursorModels(state)).toEqual([{ value: "claude-opus-5-5", label: "Claude Opus 5.5" }, { value: "gpt-5" }]);
});

test("Cursor state without a usable model list gives no suggestions", () => {
  expect(parseCursorModels(undefined)).toEqual([]);
  expect(parseCursorModels("{not json")).toEqual([]);
  expect(parseCursorModels(JSON.stringify({ availableDefaultModels2: { name: "gpt-5" } }))).toEqual([]);
});

test("cursorModels reads the list from Cursor's state database, and gives none when the file or the entry is missing", async () => {
  const root = mkdtempSync(join(tmpdir(), "trama-models-"));
  try {
    const globalStorage = join(root, "globalStorage");
    mkdirSync(join(globalStorage, "trama-dev.trama"), { recursive: true });
    const db = new DatabaseSync(join(globalStorage, "state.vscdb"));
    db.exec("CREATE TABLE ItemTable (key TEXT UNIQUE, value TEXT)");
    db.prepare("INSERT INTO ItemTable (key, value) VALUES (?, ?)").run(CURSOR_KEY, JSON.stringify({ availableDefaultModels2: [{ name: "auto-smart", clientDisplayName: "Auto" }, { name: "claude-sonnet" }] }));
    db.close();

    const extensionStorage = join(globalStorage, "trama-dev.trama");
    expect(await cursorModels(extensionStorage)).toEqual([{ value: "auto-smart", label: "Auto" }, { value: "claude-sonnet" }]);

    // node:sqlite keeps the file open until a statement is collected; Windows cannot delete it before that.
    Bun.gc(true);
    rmSync(join(globalStorage, "state.vscdb"));
    expect(await cursorModels(extensionStorage)).toEqual([]);
  } finally {
    rmSync(root, { recursive: true, force: true, maxRetries: 50, retryDelay: 200 });
  }
});

// Windows has no `#!/bin/sh` programs, so the tests that run a fake omp are skipped there.
const posix = process.platform === "win32" ? test.skip : test;

function fakeOmp(root: string, script: string): string {
  const program = join(root, "omp");
  writeFileSync(program, `#!/bin/sh\n${script}\n`);
  chmodSync(program, 0o755);
  return program;
}

test("omp models names a missing program, with the path it used", async () => {
  const root = mkdtempSync(join(tmpdir(), "trama-omp-"));
  try {
    const program = join(root, "no-such-omp");
    expect(await ompModels(program)).toEqual({ models: [], error: `omp not found at ${program}` });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

posix("omp models lists the selectors its standard output gives", async () => {
  const root = mkdtempSync(join(tmpdir(), "trama-omp-"));
  try {
    const json = JSON.stringify({ models: [{ selector: "anthropic/claude-a", name: "Claude A" }, { selector: "openai/gpt-b", name: "openai/gpt-b" }] });
    const program = fakeOmp(root, `cat <<'EOF'\n${json}\nEOF`);
    expect(await ompModels(program)).toEqual({ models: [{ value: "anthropic/claude-a", label: "Claude A" }, { value: "openai/gpt-b" }] });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

posix("omp models names a program that does not answer in time", async () => {
  const root = mkdtempSync(join(tmpdir(), "trama-omp-"));
  try {
    const program = fakeOmp(root, "exec sleep 5");
    expect(await ompModels(program, 200)).toEqual({ models: [], error: "omp models did not answer within 0.2 s" });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

posix("omp models names the exit code when omp fails, and never reads a list from its standard output", async () => {
  const root = mkdtempSync(join(tmpdir(), "trama-omp-"));
  try {
    const program = fakeOmp(root, "printf '%s' '{\"models\":[{\"selector\":\"a/b\"}]}'\necho failure >&2\nexit 3");
    expect(await ompModels(program)).toEqual({ models: [], error: "omp exited with code 3" });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("omp runs with the folder of trama.ompPath in front of the PATH, or else the folder of bun", () => {
  expect(ompPathVariable("/opt/omp/bin/omp", { PATH: "/usr/bin" })).toBe(["/opt/omp/bin", "/usr/bin"].join(delimiter));
  expect(ompPathVariable("", { PATH: "/usr/bin", BUN_INSTALL: "/srv/bun" })).toBe([join("/srv/bun", "bin"), "/usr/bin"].join(delimiter));
  expect(ompPathVariable("", { PATH: "/usr/bin", BUN_INSTALL: "" })).toBe([join(homedir(), ".bun", "bin"), "/usr/bin"].join(delimiter));
  expect(bunBinDir({ BUN_INSTALL: "/srv/bun" })).toBe(join("/srv/bun", "bin"));
});

posix("omp models says it did not return a list when its output is not JSON", async () => {
  const root = mkdtempSync(join(tmpdir(), "trama-omp-"));
  try {
    const program = fakeOmp(root, "echo not-json");
    expect(await ompModels(program)).toEqual({ models: [], error: "omp models did not return a valid list" });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
