import { execFile, type ExecFileException } from "node:child_process";
import { certificateErrorText, isCertificateError } from "../certificate-errors";
import { cursorKeyEnv } from "./cursor-api-key";
import { savedSystemCertificates, systemCertificatesEnv } from "./system-certificates";
import { homedir } from "node:os";
import { delimiter, dirname, join } from "node:path";

/** One model the Settings tab suggests for a model role: the name the agent takes, a label when it is another name, and the thinking levels omp declares for it. */
export interface ModelSuggestion {
  value: string;
  label?: string;
  /** The thinking levels omp declares for the model, in omp's order; absent when it declares none. */
  thinking?: string[];
}

const record = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;

const text = (value: unknown): string | undefined => (typeof value === "string" && value.trim() !== "" ? value.trim() : undefined);

/** Keeps the first entry of each value, and a label only when it differs from the value. */
export function uniqueSuggestions(entries: readonly { value: string; label: string; thinking?: string[] }[]): ModelSuggestion[] {
  const seen = new Set<string>();
  const out: ModelSuggestion[] = [];
  for (const { value, label, thinking } of entries) {
    if (seen.has(value)) continue;
    seen.add(value);
    out.push({ value, ...(label === value ? {} : { label }), ...(thinking === undefined ? {} : { thinking }) });
  }
  return out;
}

/** The thinking levels of an entry: a non-empty list whose every item is a text; anything else (null, absent, not a list) declares none. */
function thinkingOf(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const levels = value.map(text);
  return levels.every((level): level is string => level !== undefined) ? levels : undefined;
}

/** What `omp models --json` lists: the model names, and the unique `provider` of its models, in the order they first appear. */
export interface OmpModelList {
  models: ModelSuggestion[];
  providers: string[];
}

/** `omp models --json`: `{ "models": [{ "selector", "name", "provider" }] }`. Undefined when the output is not that list; an empty list is still a list. A `provider` counts only as a non-empty text. */
export function parseOmpList(output: string): OmpModelList | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch {
    return undefined;
  }
  const models = record(parsed)?.["models"];
  if (!Array.isArray(models)) return undefined;
  const providers = new Set<string>();
  for (const entry of models) {
    const provider = text(record(entry)?.["provider"]);
    if (provider !== undefined) providers.add(provider);
  }
  return {
    providers: [...providers],
    models: uniqueSuggestions(
      models.flatMap((entry) => {
        const selector = text(record(entry)?.["selector"]);
        return selector === undefined ? [] : [{ value: selector, label: text(record(entry)?.["name"]) ?? selector, thinking: thinkingOf(record(entry)?.["thinking"]) }];
      }),
    ),
  };
}

/** The model names of `omp models --json`; see `parseOmpList`. */
export const parseOmpModels = (output: string): ModelSuggestion[] | undefined => parseOmpList(output)?.models;

/** What the Settings tab shows for omp's model names: the names, or the reason there are none. */
export interface ModelList {
  models: ModelSuggestion[];
  /** The `provider` of the usable models, each once; absent when there is no list (`error`), which leaves the state of every provider unknown. */
  providers?: string[];
  /** The reason there is no list, in English, as the Settings tab shows it. */
  error?: string;
  /** True when the program itself was not found (ENOENT): the only failure `Install omp` answers. */
  missing?: true;
}

/**
 * The reason omp gives no list: the program is missing, it did not answer in time, it exited with a failure code, or it printed no list. When the error output of a
 * failed run (`stderr`, read only for this test) says omp could not verify a certificate, the reason is the certificate error text for the mode `systemCertificates`.
 */
function ompError(error: ExecFileException | null, ompPath: string, timeoutMs: number, stderr: string, systemCertificates: boolean): string {
  if (error !== null && error.code !== "ENOENT" && isCertificateError(stderr)) return certificateErrorText(systemCertificates);
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

/**
 * `omp models --json`, run without a shell and with fixed arguments: `ompPath` when it is not empty, else `omp` from the editor's PATH. `systemCertificates` is the
 * mode System Certificates for this process (the saved setting unless the wizard's step says otherwise): with it and a bundle on disk the process receives the bundle.
 */
export function ompModels(ompPath: string, timeoutMs = 15_000, env: NodeJS.ProcessEnv = process.env, systemCertificates: boolean = savedSystemCertificates()): Promise<ModelList> {
  const { promise, resolve } = Promise.withResolvers<ModelList>();
  const options = { timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024, env: { ...env, ...cursorKeyEnv(), ...systemCertificatesEnv(systemCertificates), PATH: ompPathVariable(ompPath, env) } };
  execFile(ompPath === "" ? "omp" : ompPath, ["models", "--json"], options, (error, stdout, stderr) => {
    const list = error === null ? parseOmpList(stdout) : undefined;
    resolve(list === undefined ? { models: [], error: ompError(error, ompPath, timeoutMs, String(stderr), systemCertificates), ...(error?.code === "ENOENT" ? { missing: true as const } : {}) } : list);
  });
  return promise;
}
