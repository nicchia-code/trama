import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

/** One model the Settings tab suggests for a model role: the name the agent takes, and a label when it is another name. */
export interface ModelSuggestion {
  value: string;
  label?: string;
}

/** Cursor keeps its list of models inside this entry of its state database, as JSON. */
const CURSOR_STATE_KEY = "src.vs.platform.reactivestorage.browser.reactiveStorageServiceImpl.persistentStorage.applicationUser";

const record = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;

const text = (value: unknown): string | undefined => (typeof value === "string" && value.trim() !== "" ? value.trim() : undefined);

/** Keeps the first entry of each value, and a label only when it differs from the value. */
export function uniqueSuggestions(entries: readonly { value: string; label: string }[]): ModelSuggestion[] {
  const seen = new Set<string>();
  const out: ModelSuggestion[] = [];
  for (const { value, label } of entries) {
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(label === value ? { value } : { value, label });
  }
  return out;
}

/** `omp models --json`: `{ "models": [{ "selector", "name" }] }`. Anything else is no list. */
export function parseOmpModels(output: string): ModelSuggestion[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch {
    return [];
  }
  const models = record(parsed)?.["models"];
  if (!Array.isArray(models)) return [];
  return uniqueSuggestions(
    models.flatMap((entry) => {
      const selector = text(record(entry)?.["selector"]);
      return selector === undefined ? [] : [{ value: selector, label: text(record(entry)?.["name"]) ?? selector }];
    }),
  );
}

/** The JSON of Cursor's state entry: its `availableDefaultModels2` lists the models, each with a `name`. */
export function parseCursorModels(stateValue: unknown): ModelSuggestion[] {
  if (typeof stateValue !== "string") return [];
  let state: unknown;
  try {
    state = JSON.parse(stateValue);
  } catch {
    return [];
  }
  const list = record(state)?.["availableDefaultModels2"];
  if (!Array.isArray(list)) return [];
  return uniqueSuggestions(
    list.flatMap((entry) => {
      const name = text(record(entry)?.["name"]);
      return name === undefined ? [] : [{ value: name, label: name }];
    }),
  );
}

/** Reads Cursor's state entry, read-only, from `state.vscdb` next to the extension's `globalStorage` folder. A missing file, entry or database gives no list. */
export async function cursorModels(globalStorageDir: string): Promise<ModelSuggestion[]> {
  const stateFile = join(globalStorageDir, "..", "state.vscdb");
  if (!existsSync(stateFile)) return [];
  try {
    // Dynamic on purpose: node:sqlite exists only in newer Node, and an older host then gets no list.
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(stateFile, { readOnly: true });
    try {
      const row = db.prepare("SELECT value FROM ItemTable WHERE key = ?").get(CURSOR_STATE_KEY) as { value?: unknown } | undefined;
      return parseCursorModels(row?.value);
    } finally {
      db.close();
    }
  } catch {
    return [];
  }
}

/** `omp models --json`, at most 15 seconds. A missing program or a failure gives no list. */
export function ompModels(): Promise<ModelSuggestion[]> {
  const { promise, resolve } = Promise.withResolvers<ModelSuggestion[]>();
  execFile("omp", ["models", "--json"], { timeout: 15_000, maxBuffer: 16 * 1024 * 1024 }, (error, stdout) => {
    resolve(error ? [] : parseOmpModels(stdout));
  });
  return promise;
}

/** The names Copilot's chat takes for a model role: the plain name for the `copilot` vendor, else `name (vendor)`. */
export function copilotSuggestions(models: readonly { name: string; vendor: string }[]): ModelSuggestion[] {
  return uniqueSuggestions(models.map((model) => ({ value: model.vendor === "copilot" ? model.name : `${model.name} (${model.vendor})`, label: model.name })));
}
