import { execFile, type ExecFileException } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, dirname, join } from "node:path";

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

/** `omp models --json`: `{ "models": [{ "selector", "name" }] }`. Undefined when the output is not that list; an empty list is still a list. */
export function parseOmpModels(output: string): ModelSuggestion[] | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch {
    return undefined;
  }
  const models = record(parsed)?.["models"];
  if (!Array.isArray(models)) return undefined;
  return uniqueSuggestions(
    models.flatMap((entry) => {
      const selector = text(record(entry)?.["selector"]);
      return selector === undefined ? [] : [{ value: selector, label: text(record(entry)?.["name"]) ?? selector }];
    }),
  );
}

/** The JSON of Cursor's state entry: its `availableDefaultModels2` lists the models, each with a `name` (the value) and a `clientDisplayName` (the label). */
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
      return name === undefined ? [] : [{ value: name, label: text(record(entry)?.["clientDisplayName"]) ?? name }];
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

/** What the Settings tab shows for omp's model names: the names, or the reason there are none. */
export interface ModelList {
  models: ModelSuggestion[];
  /** The reason there is no list, in English, as the Settings tab shows it. */
  error?: string;
}

/** The reason omp gives no list: the program is missing, it did not answer in time, it exited with a failure code, or it printed no list. */
function ompError(error: ExecFileException | null, ompPath: string, timeoutMs: number): string {
  if (error?.code === "ENOENT") return `omp not found at ${ompPath === "" ? "the editor PATH" : ompPath}`;
  if (error?.code !== "ERR_CHILD_PROCESS_STDIO_MAXBUFFER" && error?.killed === true) return `omp models did not answer within ${timeoutMs / 1000} s`;
  if (typeof error?.code === "number") return `omp exited with code ${error.code}`;
  return "omp models did not return a valid list";
}

/** The folder of bun, where omp's script finds bun: `BUN_INSTALL/bin` when that variable is set, else `~/.bun/bin`. */
export function bunBinDir(env: NodeJS.ProcessEnv = process.env): string {
  const install = env["BUN_INSTALL"];
  return install !== undefined && install.trim() !== "" ? join(install, "bin") : join(homedir(), ".bun", "bin");
}

/** The PATH omp runs with: the editor's PATH with, in front, the folder of `ompPath` when it has one, else the folder of bun. */
export function ompPathVariable(ompPath: string, env: NodeJS.ProcessEnv = process.env): string {
  const folder = ompPath === "" || dirname(ompPath) === "." ? bunBinDir(env) : dirname(ompPath);
  return [folder, env["PATH"] ?? ""].filter((part) => part !== "").join(delimiter);
}

/** `omp models --json`, run without a shell and with fixed arguments: `ompPath` when it is not empty, else `omp` from the editor's PATH. */
export function ompModels(ompPath: string, timeoutMs = 15_000, env: NodeJS.ProcessEnv = process.env): Promise<ModelList> {
  const { promise, resolve } = Promise.withResolvers<ModelList>();
  const options = { timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024, env: { ...env, PATH: ompPathVariable(ompPath, env) } };
  execFile(ompPath === "" ? "omp" : ompPath, ["models", "--json"], options, (error, stdout) => {
    const models = error === null ? parseOmpModels(stdout) : undefined;
    resolve(models === undefined ? { models: [], error: ompError(error, ompPath, timeoutMs) } : { models });
  });
  return promise;
}
