import { execFile, type ExecFileException } from "node:child_process";
import { access, constants } from "node:fs/promises";
import { homedir } from "node:os";
import { checkHolds, ompFileName, ompSearchFolders, readUpdateCheck, type StoredCheck } from "../../../src/core/omp-update";
import { join } from "node:path";
import { ompPathVariable } from "./model-lists";

/** Where the outcome of the last update check is kept for every window of the editor (`ExtensionContext.globalState`). */
export interface UpdateStore {
  get<T>(key: string): T | undefined;
  update(key: string, value: unknown): PromiseLike<void>;
}

export const OMP_UPDATE_KEY = "trama.ompUpdateCheck";
const CHECK_TIMEOUT_MS = 30_000;
const UPDATE_TIMEOUT_MS = 5 * 60_000;

let store: UpdateStore | undefined;
let memory: StoredCheck | undefined;

/** The window's global state, set once at activation; without it the outcome lives in memory only. */
export function setUpdateStore(next: UpdateStore | undefined): void {
  store = next;
  memory = undefined;
}

const stored = (): StoredCheck | undefined => (store === undefined ? memory : store.get<StoredCheck>(OMP_UPDATE_KEY));
const save = (value: StoredCheck | undefined): void => {
  if (store === undefined) memory = value;
  else void store.update(OMP_UPDATE_KEY, value);
};

/** Forgets the outcome of the last check: the path of omp changed or the installer finished. */
export function forgetUpdateCheck(): void {
  save(undefined);
  inFlight.clear();
}

/**
 * The omp program Trama runs for `ompPath` (trimmed): that path alone when it is set; otherwise the first `omp` found in the editor's PATH,
 * then in `~/.bun/bin` and `~/.local/bin` (`omp.exe` on Windows). Undefined when there is none.
 */
export async function findOmp(ompPath: string, env: NodeJS.ProcessEnv = process.env, home = homedir(), windows = process.platform === "win32"): Promise<string | undefined> {
  if (ompPath !== "") return ompPath;
  const name = ompFileName(windows);
  const folders = ompSearchFolders(env["PATH"] ?? env["Path"], home, windows ? ";" : ":");
  for (const folder of folders) {
    const candidate = join(folder, name);
    try {
      await access(candidate, windows ? constants.F_OK : constants.X_OK);
      return candidate;
    } catch {
      // Not here: the next folder.
    }
  }
  return undefined;
}

type Run = { ok: true; stdout: string } | { ok: false; missing: boolean; reason: (what: string, limit: string) => string };

function run(program: string, args: string[], timeoutMs: number, env: NodeJS.ProcessEnv): Promise<Run> {
  const { promise, resolve } = Promise.withResolvers<Run>();
  execFile(program, args, { timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024, env: { ...env, PATH: ompPathVariable(program, env) } }, (error: ExecFileException | null, stdout) => {
    if (error === null) return resolve({ ok: true, stdout });
    const timedOut = error.killed === true && error.code !== "ERR_CHILD_PROCESS_STDIO_MAXBUFFER";
    resolve({
      ok: false,
      missing: error.code === "ENOENT",
      reason: (what, limit) => (timedOut ? `${what} ${limit}` : typeof error.code === "number" ? `${what.split(" did not")[0]} exited with code ${error.code}` : `${what.split(" did not")[0]} gave an unexpected answer`),
    });
  });
  return promise;
}

/** The outcome of the check and of the update that may follow it. */
export interface OmpUpdateOutcome {
  /** The program was not found. */
  missing?: true;
  /** The version that answers, when it is known. */
  version?: string;
  /** Why the check or the update failed; omp stayed as it was. */
  updateError?: string;
  /** The version omp was updated to. */
  updated?: string;
}

const inFlight = new Map<string, { promise: Promise<OmpUpdateOutcome>; listeners: Set<(version: string) => void>; updating?: string }>();

/**
 * The check of updates and, with a newer version, the update of omp, before a launch or the wizard's check. An outcome younger than an hour
 * for the same program holds and nothing runs; a check or update already running is joined, not repeated. `onUpdating` hears the new version
 * when the update starts.
 */
export function ensureOmpUpdated(program: string, onUpdating?: (version: string) => void, env: NodeJS.ProcessEnv = process.env, now: () => number = Date.now): Promise<OmpUpdateOutcome> {
  const last = stored();
  if (last !== undefined && checkHolds(last, program, now())) {
    return Promise.resolve(last?.version === undefined ? {} : { version: last.version });
  }
  const running = inFlight.get(program);
  if (running !== undefined) {
    if (onUpdating !== undefined) {
      running.listeners.add(onUpdating);
      if (running.updating !== undefined) onUpdating(running.updating);
    }
    return running.promise;
  }
  const entry: { promise: Promise<OmpUpdateOutcome>; listeners: Set<(version: string) => void>; updating?: string } = { promise: Promise.resolve({}), listeners: new Set(onUpdating === undefined ? [] : [onUpdating]) };
  entry.promise = (async (): Promise<OmpUpdateOutcome> => {
    const record = (version: string | undefined): void => save({ checkedAt: new Date(now()).toISOString(), omp: program, ...(version === undefined ? {} : { version }) });
    const checked = await run(program, ["update", "--check"], CHECK_TIMEOUT_MS, env);
    if (!checked.ok) {
      if (checked.missing) return { missing: true };
      record(undefined);
      return { updateError: checked.reason("omp update --check did not answer", "within 30 s") };
    }
    const reading = readUpdateCheck(checked.stdout);
    if (reading.kind === "unexpected") {
      record(undefined);
      return { updateError: "omp update --check gave an unexpected answer" };
    }
    if (reading.kind === "latest") {
      record(reading.version);
      return reading.version === undefined ? {} : { version: reading.version };
    }
    entry.updating = reading.version;
    for (const listener of entry.listeners) listener(reading.version);
    const updated = await run(program, ["update"], UPDATE_TIMEOUT_MS, env);
    if (!updated.ok) {
      record(reading.current);
      return { updateError: updated.reason("omp update did not finish", "within 5 minutes"), ...(reading.current === undefined ? {} : { version: reading.current }) };
    }
    record(reading.version);
    return { version: reading.version, updated: reading.version };
  })().finally(() => inFlight.delete(program));
  inFlight.set(program, entry);
  return entry.promise;
}
