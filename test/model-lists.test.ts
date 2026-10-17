import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { copilotSuggestions, cursorModels, parseCursorModels, parseOmpModels } from "../extension/src/host/model-lists";

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

test("omp output that is not the models list gives no suggestions", () => {
  expect(parseOmpModels("not json")).toEqual([]);
  expect(parseOmpModels(JSON.stringify({ models: "none" }))).toEqual([]);
});

test("Cursor suggests the names of its default models, in order and once each", () => {
  const state = JSON.stringify({ mcpServers: [], availableDefaultModels2: [{ name: "auto-smart" }, { name: "gpt-5" }, { name: "auto-smart" }, {}] });
  expect(parseCursorModels(state)).toEqual([{ value: "auto-smart" }, { value: "gpt-5" }]);
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
    db.prepare("INSERT INTO ItemTable (key, value) VALUES (?, ?)").run(CURSOR_KEY, JSON.stringify({ availableDefaultModels2: [{ name: "auto-smart" }, { name: "claude-sonnet" }] }));
    db.close();

    const extensionStorage = join(globalStorage, "trama-dev.trama");
    expect(await cursorModels(extensionStorage)).toEqual([{ value: "auto-smart" }, { value: "claude-sonnet" }]);

    rmSync(join(globalStorage, "state.vscdb"));
    expect(await cursorModels(extensionStorage)).toEqual([]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Copilot names a model as the chat takes it: plain for the copilot vendor, otherwise with the vendor", () => {
  expect(
    copilotSuggestions([
      { name: "GPT-4.1", vendor: "copilot" },
      { name: "Claude Sonnet 4.5", vendor: "anthropic" },
    ]),
  ).toEqual([{ value: "GPT-4.1" }, { value: "Claude Sonnet 4.5 (anthropic)", label: "Claude Sonnet 4.5" }]);
});
