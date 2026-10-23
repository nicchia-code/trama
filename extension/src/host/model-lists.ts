import { execFile, type ExecFileException } from "node:child_process";
import { homedir } from "node:os";
import { delimiter, dirname, join } from "node:path";

/** One model the Settings tab suggests for a model role: the name the agent takes, and a label when it is another name. */
export interface ModelSuggestion {
  value: string;
  label?: string;
}

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

/** What the Settings tab shows for omp's model names: the names, or the reason there are none. */
export interface ModelList {
  models: ModelSuggestion[];
  /** The reason there is no list, in English, as the Settings tab shows it. */
  error?: string;
  /** True when the program itself was not found (ENOENT): the only failure `Install omp` answers. */
  missing?: true;
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

/** The PATH omp runs with: the editor's PATH with, in front, the folder of `ompPath` when it has one and then the folder of bun, each once. */
export function ompPathVariable(ompPath: string, env: NodeJS.ProcessEnv = process.env): string {
  const own = ompPath === "" || dirname(ompPath) === "." ? undefined : dirname(ompPath);
  const folders = [own, bunBinDir(env)].filter((folder): folder is string => folder !== undefined);
  return [...new Set(folders), env["PATH"] ?? env["Path"] ?? ""].filter((part) => part !== "").join(delimiter);
}

/** `omp models --json`, run without a shell and with fixed arguments: `ompPath` when it is not empty, else `omp` from the editor's PATH. */
export function ompModels(ompPath: string, timeoutMs = 15_000, env: NodeJS.ProcessEnv = process.env): Promise<ModelList> {
  const { promise, resolve } = Promise.withResolvers<ModelList>();
  const options = { timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024, env: { ...env, PATH: ompPathVariable(ompPath, env) } };
  execFile(ompPath === "" ? "omp" : ompPath, ["models", "--json"], options, (error, stdout) => {
    const models = error === null ? parseOmpModels(stdout) : undefined;
    resolve(models === undefined ? { models: [], error: ompError(error, ompPath, timeoutMs), ...(error?.code === "ENOENT" ? { missing: true as const } : {}) } : { models });
  });
  return promise;
}
