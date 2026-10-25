import { execFile, type ExecFileException } from "node:child_process";
import { certificateErrorText, isCertificateError } from "../certificate-errors";
import { cursorKeyEnv } from "./cursor-api-key";
import { savedSystemCertificates, systemCertificatesEnv } from "./system-certificates";
import { access, constants } from "node:fs/promises";
import { homedir } from "node:os";
import { checkHolds, ompFileName, ompSearchFolders, readUpdateCheck, type StoredCheck } from "../../../src/core/omp-update";
import { ompMeetsMinimum, parseOmpVersion } from "../../../src/core/omp-version";
import { extname, join } from "node:path";
import { ompPathVariable } from "./model-lists";

/** Where the outcome of the last update check is kept for every window of the editor (`ExtensionContext.globalState`). */
export interface UpdateStore {
  get<T>(key: string): T | undefined;
  update(key: string, value: unknown): PromiseLike<void>;
}

export const OMP_UPDATE_KEY = "trama.ompUpdateCheck";
const CHECK_TIMEOUT_MS = 30_000;
const VERSION_TIMEOUT_MS = 15_000;
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

/**
 * The omp General runs for a set `trama.ompPath`: the path as-is when it resolves (a path with a separator is that file; a bare name is
 * found in the editor's PATH, `~/.bun/bin` or `~/.local/bin`), else undefined, so General reports omp as missing. The empty setting is
 * found as `findOmp` finds it. The other callers keep `findOmp`.
 */
export async function findConfiguredOmp(ompPath: string, env: NodeJS.ProcessEnv = process.env, home = homedir(), windows = process.platform === "win32"): Promise<string | undefined> {
  if (ompPath === "") return findOmp(ompPath, env, home, windows);
  if (/[\\/]/.test(ompPath)) return (await runnable(ompPath, windows)) ? ompPath : undefined;
  const names = windows && extname(ompPath) === "" ? [ompPath, `${ompPath}.exe`] : [ompPath];
  const folders = ompSearchFolders(env["PATH"] ?? env["Path"], home, windows ? ";" : ":");
  for (const folder of folders) for (const name of names) if (await runnable(join(folder, name), windows)) return ompPath;
  return undefined;
}

/** Whether `file` exists and can run (on Windows only existence counts: the execute bit means nothing there). */
async function runnable(file: string, windows: boolean): Promise<boolean> {
  try {
    await access(file, windows ? constants.F_OK : constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

type Run = { ok: true; stdout: string } | { ok: false; missing: boolean; reason: (what: string, limit: string) => string };

/**
 * One run of omp, without a shell. The error output of a failed run (`stderr`, read only for this test) that says omp could not verify a certificate makes the reason the
 * certificate error text for the mode `systemCertificates`.
 */
function run(program: string, args: string[], timeoutMs: number, env: NodeJS.ProcessEnv, systemCertificates: boolean): Promise<Run> {
  const { promise, resolve } = Promise.withResolvers<Run>();
  execFile(program, args, { timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024, env: { ...env, ...cursorKeyEnv(), ...systemCertificatesEnv(systemCertificates), PATH: ompPathVariable(program, env) } }, (error: ExecFileException | null, stdout, stderr) => {
    if (error === null) return resolve({ ok: true, stdout });
    const timedOut = error.killed === true && error.code !== "ERR_CHILD_PROCESS_STDIO_MAXBUFFER";
    const certificate = error.code !== "ENOENT" && isCertificateError(String(stderr));
    resolve({
      ok: false,
      missing: error.code === "ENOENT",
      reason: (what, limit) =>
        certificate ? certificateErrorText(systemCertificates) : timedOut ? `${what} ${limit}` : typeof error.code === "number" ? `${what.split(" did not")[0]} exited with code ${error.code}` : `${what.split(" did not")[0]} gave an unexpected answer`,
    });
  });
  return promise;
}

/** The outcome of the check and of the update that may follow it. */
export interface OmpUpdateOutcome {
  /** The program was not found. */
  missing?: true;
  /** The version that answers (`omp --version`, or the version omp was updated to), when it is known. */
  version?: string;
  /** Why the check or the update failed; omp stayed as it was. */
  updateError?: string;
  /** The version omp was updated to. */
  updated?: string;
  /** omp is older than the minimum, or its version cannot be read, after the check and the update that could be done. */
  tooOld?: true;
}

const inFlight = new Map<string, { promise: Promise<OmpUpdateOutcome>; listeners: Set<(version: string) => void>; updating?: string }>();

/** `outcome` with `tooOld` when its version is below the minimum or unknown. */
const judged = (outcome: OmpUpdateOutcome): OmpUpdateOutcome => (ompMeetsMinimum(outcome.version) ? outcome : { ...outcome, tooOld: true });

/**
 * The check of updates and, with a newer version, the update of omp, before a launch or the wizard's check; `omp --version` is read with the check.
 * An outcome younger than an hour for the same program holds and nothing runs; a check or update already running is joined, not repeated.
 * `onUpdating` hears the new version when the update starts. An omp older than the minimum, or whose version cannot be read, that the update does
 * not bring to the minimum comes back with `tooOld`.
 */
export function ensureOmpUpdated(program: string, onUpdating?: (version: string) => void, env: NodeJS.ProcessEnv = process.env, now: () => number = Date.now, systemCertificates: boolean = savedSystemCertificates()): Promise<OmpUpdateOutcome> {
  const last = stored();
  if (last !== undefined && checkHolds(last, program, now())) {
    return Promise.resolve(judged(last.version === undefined ? {} : { version: last.version }));
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
    const [checked, asked] = await Promise.all([run(program, ["update", "--check"], CHECK_TIMEOUT_MS, env, systemCertificates), run(program, ["--version"], VERSION_TIMEOUT_MS, env, systemCertificates)]);
    if ((!checked.ok && checked.missing) || (!asked.ok && asked.missing)) return { missing: true };
    const installed = asked.ok ? parseOmpVersion(asked.stdout) : undefined;
    const known = installed === undefined ? {} : { version: installed };
    if (!checked.ok) {
      record(installed);
      return judged({ updateError: checked.reason("omp update --check did not answer", "within 30 s"), ...known });
    }
    const reading = readUpdateCheck(checked.stdout);
    if (reading.kind === "unexpected") {
      record(installed);
      return judged({ updateError: "omp update --check gave an unexpected answer", ...known });
    }
    if (reading.kind === "latest") {
      record(installed);
      return judged(known);
    }
    entry.updating = reading.version;
    for (const listener of entry.listeners) listener(reading.version);
    const updated = await run(program, ["update"], UPDATE_TIMEOUT_MS, env, systemCertificates);
    if (!updated.ok) {
      record(installed);
      return judged({ updateError: updated.reason("omp update did not finish", "within 5 minutes"), ...known });
    }
    record(reading.version);
    return judged({ version: reading.version, updated: reading.version });
  })().finally(() => inFlight.delete(program));
  inFlight.set(program, entry);
  return entry.promise;
}

/**
 * What General's start needs of omp: the version, judged against the minimum, and no check of updates and no update. The outcome of the last launch check of
 * this editor for the same program, while it holds, gives the version; otherwise only `omp --version` runs, and nothing is saved.
 */
export async function ompVersionOnly(program: string, env: NodeJS.ProcessEnv = process.env, now: () => number = Date.now, systemCertificates: boolean = savedSystemCertificates()): Promise<OmpUpdateOutcome> {
  const last = stored();
  if (last !== undefined && checkHolds(last, program, now())) return judged(last.version === undefined ? {} : { version: last.version });
  const asked = await run(program, ["--version"], VERSION_TIMEOUT_MS, env, systemCertificates);
  if (!asked.ok && asked.missing) return { missing: true };
  const installed = asked.ok ? parseOmpVersion(asked.stdout) : undefined;
  return judged(installed === undefined ? {} : { version: installed });
}
