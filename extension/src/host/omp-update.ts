import { execFile, type ExecFileException } from "node:child_process";
import { processStarted } from "../../../src/core/performance";
import { certificateErrorText, isCertificateError } from "../certificate-errors";
import { cursorKeyEnv } from "./cursor-api-key";
import { savedSystemCertificates, systemCertificatesEnv } from "./system-certificates";
import { access, constants } from "node:fs/promises";
import { homedir } from "node:os";
import { checkHolds, newerToInstall, ompFileName, ompSearchFolders, readUpdateCheck, type StoredCheck } from "../../../src/core/omp-update";
import { ompMeetsMinimum } from "../../../src/core/omp-version";
import { extname, join } from "node:path";
import { ompModels, ompPathVariable, type ModelList } from "./model-lists";
import { readOmpVersion, type OmpStatus } from "./omp-status";

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

/**
 * What this window keeps of omp, shared by every caller (launches, General, the wizard, Settings, login and logout, `omp models --json`, `omp usage --json`):
 * the program found for each `trama.ompPath` value (`programs`; `configured` is General's stricter reading of a set path) and the answer of `omp --version` for each
 * program. Only an answer that is there is kept: a program that was not found, or a version that did not answer, is asked again at the next need, so omp installed
 * from a terminal of the developer's is seen without a restart.
 */
const programs = new Map<string, Promise<string | undefined>>();
const configured = new Map<string, Promise<string | undefined>>();
const versions = new Map<string, Promise<OmpStatus>>();
const checks = new Map<string, Promise<CheckResult>>();
const updates = new Map<string, UpdateEntry>();

/** The program held in `held` under `key`, or the one `search` finds, which is held when it is there; a program that is not found is not held. */
function keep(held: Map<string, Promise<string | undefined>>, key: string, search: () => Promise<string | undefined>): Promise<string | undefined> {
  const kept = held.get(key);
  if (kept !== undefined) return kept;
  const found = search();
  held.set(key, found);
  void found.then((program) => {
    if (program === undefined && held.get(key) === found) held.delete(key);
  });
  return found;
}

/**
 * The omp program Trama runs for `ompPath` (trimmed), found once per window (`findOmp`) and kept; undefined when there is none. Forgotten by `forgetOmp`: a changed
 * `trama.ompPath`, the end of the installer's terminal.
 */
export function ompProgram(ompPath: string): Promise<string | undefined> {
  return keep(programs, ompPath, () => findOmp(ompPath));
}

/** The omp General and `omp usage --json` run for `ompPath`, kept as `ompProgram` keeps its program: a set path counts only when it resolves (`findConfiguredOmp`). */
export function configuredOmpProgram(ompPath: string): Promise<string | undefined> {
  return ompPath === "" ? ompProgram(ompPath) : keep(configured, ompPath, () => findConfiguredOmp(ompPath));
}

/**
 * What `omp --version` of `program` said, asked once per window and kept. A failed answer (not found, no answer in time, no version) is not kept. `env` and `systemCertificates`
 * only matter for the process that is started.
 */
export function ompVersion(program: string, env: NodeJS.ProcessEnv = process.env, systemCertificates: boolean = savedSystemCertificates()): Promise<OmpStatus> {
  const held = versions.get(program);
  if (held !== undefined) return held;
  const read = readOmpVersion(program, program, VERSION_TIMEOUT_MS, env, systemCertificates);
  versions.set(program, read);
  void read.then((status) => {
    if (status.error !== undefined && versions.get(program) === read) versions.delete(program);
  });
  return read;
}

/** `omp --version` of the omp of `ompPath`, from the module: the status the Settings tab shows. */
export async function ompStatus(ompPath: string, env: NodeJS.ProcessEnv = process.env, systemCertificates: boolean = savedSystemCertificates()): Promise<OmpStatus> {
  const program = await ompProgram(ompPath);
  if (program === undefined) return { missing: true, error: `omp not found at ${ompPath === "" ? "the editor PATH" : ompPath}` };
  return ompVersion(program, env, systemCertificates);
}

/** `omp models --json` with the omp of `ompPath` from the module; a program that is not there answers as a missing omp does. */
export async function ompModelsFor(ompPath: string, timeoutMs?: number, env?: NodeJS.ProcessEnv, systemCertificates?: boolean): Promise<ModelList> {
  const program = await ompProgram(ompPath);
  if (program === undefined) return { models: [], error: `omp not found at ${ompPath === "" ? "the editor PATH" : ompPath}`, missing: true };
  return ompModels(program, timeoutMs, env, systemCertificates);
}

/** Forgets the outcome of the last check, the check under way and the versions kept: the certificates changed, so the next check and version reading run with the bundle as it is now. */
export function forgetUpdateCheck(): void {
  save(undefined);
  checks.clear();
  versions.clear();
}

/** Forgets everything the module keeps, the programs found too, so the next need searches and asks again: `trama.ompPath` changed, or the installer's terminal ended. */
export function forgetOmp(): void {
  forgetUpdateCheck();
  programs.clear();
  configured.clear();
  updates.clear();
}

/**
 * The omp program Trama runs for `ompPath` (trimmed): that path alone when it is set; otherwise the first `omp` found in the editor's PATH,
 * then in `~/.bun/bin` and `~/.local/bin` (`omp.exe` on Windows). Undefined when there is none. The search itself; the window asks it through `ompProgram`.
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
  const ended = processStarted(program);
  execFile(program, args, { timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024, env: { ...env, ...cursorKeyEnv(), ...systemCertificatesEnv(systemCertificates), PATH: ompPathVariable(program, env) } }, (error: ExecFileException | null, stdout, stderr) => {
    ended();
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

/** The outcome of the version reading, the check and the update that may follow it. */
export interface OmpUpdateOutcome {
  /** The program was not found. */
  missing?: true;
  /** The version that answers (`omp --version`, or the version omp was updated to), when it is known. */
  version?: string;
  /** Why the check or the update failed; omp stayed as it was. */
  updateError?: string;
  /** The version omp was updated to. */
  updated?: string;
  /** omp is older than the minimum, or its version cannot be read, after the update that could be done. */
  tooOld?: true;
}

/** `outcome` with `tooOld` when its version is below the minimum or unknown. */
const judged = (outcome: OmpUpdateOutcome): OmpUpdateOutcome => (ompMeetsMinimum(outcome.version) ? outcome : { ...outcome, tooOld: true });

/** The outcome that says only what `omp --version` answered, judged against the minimum. */
const ofVersion = (status: OmpStatus): OmpUpdateOutcome => (status.missing ? { missing: true } : judged(status.version === undefined ? {} : { version: status.version }));

/** The version omp has, judged against the minimum, from the module: what General's start needs of omp. No check of updates and no update. */
export async function ompVersionOutcome(program: string, env: NodeJS.ProcessEnv = process.env, systemCertificates: boolean = savedSystemCertificates()): Promise<OmpUpdateOutcome> {
  return ofVersion(await ompVersion(program, env, systemCertificates));
}

/** What `omp update --check` found: nothing wrong and no newer version (`{}`), a `newer` version, why it failed, or that the program is not there. */
interface CheckResult {
  missing?: true;
  updateError?: string;
  newer?: string;
}

/**
 * `omp update --check` of `program`: the one check at a time (a check under way is joined, never repeated). It writes its outcome, failed or not, to the kept state with the
 * version omp has and, with a newer version found, `newer`; it does not update. The check may ask the network: only the wizard waits for it.
 */
function checkUpdates(program: string, env: NodeJS.ProcessEnv, now: () => number, systemCertificates: boolean): Promise<CheckResult> {
  const running = checks.get(program);
  if (running !== undefined) return running;
  const checking: Promise<CheckResult> = (async (): Promise<CheckResult> => {
    const installed = await ompVersion(program, env, systemCertificates);
    if (installed.missing) return { missing: true };
    const record = (newer?: string): void => save({ checkedAt: new Date(now()).toISOString(), omp: program, ...(installed.version === undefined ? {} : { version: installed.version }), ...(newer === undefined ? {} : { newer }) });
    const checked = await run(program, ["update", "--check"], CHECK_TIMEOUT_MS, env, systemCertificates);
    if (!checked.ok && checked.missing) return { missing: true };
    if (!checked.ok) {
      record();
      return { updateError: checked.reason("omp update --check did not answer", "within 30 s") };
    }
    const reading = readUpdateCheck(checked.stdout);
    if (reading.kind === "unexpected") {
      record();
      return { updateError: "omp update --check gave an unexpected answer" };
    }
    if (reading.kind === "latest") {
      record();
      return {};
    }
    record(reading.version);
    return { newer: reading.version };
  })().finally(() => {
    if (checks.get(program) === checking) checks.delete(program);
  });
  checks.set(program, checking);
  return checking;
}

/** Hears that an update starts: the version it goes to, when it is known (a launch that finds omp older than the minimum has no check that named one). */
type Updating = (version: string | undefined) => void;
interface UpdateEntry {
  promise: Promise<OmpUpdateOutcome>;
  listeners: Set<Updating>;
  started: boolean;
  newer: string | undefined;
}

/**
 * `omp update`, awaited, and then the version read again: one update at a time (one under way is joined, never repeated, and its outcome object is shared). `newer` is the version
 * a check found, when one did. The result is written to the kept state without `newer` and counts for an hour, so a failing update is not tried at every launch. A failed update
 * keeps the omp of before in the outcome, with `updateError`; an omp that is still older than the minimum comes back with `tooOld`.
 */
function updateOmp(program: string, newer: string | undefined, onUpdating: Updating | undefined, env: NodeJS.ProcessEnv, now: () => number, systemCertificates: boolean): Promise<OmpUpdateOutcome> {
  const running = updates.get(program);
  if (running !== undefined) {
    if (onUpdating !== undefined) {
      running.listeners.add(onUpdating);
      if (running.started) onUpdating(running.newer);
    }
    return running.promise;
  }
  const entry: UpdateEntry = { promise: Promise.resolve({}), listeners: new Set(onUpdating === undefined ? [] : [onUpdating]), started: false, newer };
  const updating: Promise<OmpUpdateOutcome> = (async (): Promise<OmpUpdateOutcome> => {
    const before = await ompVersion(program, env, systemCertificates);
    entry.started = true;
    for (const listener of entry.listeners) listener(newer);
    const record = (version: string | undefined): void => save({ checkedAt: new Date(now()).toISOString(), omp: program, ...(version === undefined ? {} : { version }) });
    const updated = await run(program, ["update"], UPDATE_TIMEOUT_MS, env, systemCertificates);
    if (!updated.ok) {
      record(before.version);
      return judged({ updateError: updated.reason("omp update did not finish", "within 5 minutes"), ...(before.version === undefined ? {} : { version: before.version }) });
    }
    versions.delete(program);
    const after = await ompVersion(program, env, systemCertificates);
    const version = after.version ?? newer;
    record(version);
    return judged(version === undefined ? {} : { version, updated: version });
  })().finally(() => {
    if (updates.get(program) === entry) updates.delete(program);
  });
  entry.promise = updating;
  updates.set(program, entry);
  return updating;
}

/** What `prepareOmpLaunch` tells its caller while it works. */
export interface LaunchHooks {
  /** An update starts: the launch waits for it. `version` is the one the last check found, absent when omp is older than the minimum without one. */
  updating?: Updating;
  /** The check that this launch started in the background failed, with its reason and the version omp has when it is known. Called once per check. */
  checkFailed?: (reason: string, version?: string) => void;
}

/**
 * What a launch of omp needs, after the program is found: the version from the module (asked at the first need only) and, in this order, (1) the update of omp when the last
 * check, while it holds, found a newer version, or when omp is older than the minimum (or its version cannot be read), awaited and then the version read again; a running update
 * is joined; (2) otherwise nothing is awaited, and when the last check no longer holds one starts in the background, which writes its outcome, `newer` included, and
 * reports its failure to `hooks.checkFailed`. The launch never waits for a check. The outcome says whether omp is missing, or older than the minimum after the update that could be done.
 */
export async function prepareOmpLaunch(program: string, hooks: LaunchHooks = {}, env: NodeJS.ProcessEnv = process.env, now: () => number = Date.now, systemCertificates: boolean = savedSystemCertificates()): Promise<OmpUpdateOutcome> {
  const installed = await ompVersion(program, env, systemCertificates);
  if (installed.missing) return { missing: true };
  const last = stored();
  const newer = newerToInstall(last, program, now(), installed.version);
  if (newer !== undefined || !ompMeetsMinimum(installed.version)) return updateOmp(program, newer, hooks.updating, env, now, systemCertificates);
  if (!checkHolds(last, program, now()) && !checks.has(program)) {
    void checkUpdates(program, env, now, systemCertificates).then((result) => {
      if (result.updateError !== undefined) hooks.checkFailed?.(result.updateError, installed.version);
    });
  }
  return ofVersion(installed);
}

/**
 * The wizard's check of omp, the one that is awaited: the check of updates when the last one no longer holds (a check under way is joined) and, with a newer version found
 * then or before, the update. `onUpdating` hears the new version when the update starts. An outcome younger than an hour for the same program holds and nothing is checked. An
 * omp older than the minimum, or whose version cannot be read, that the update does not bring to the minimum comes back with `tooOld`.
 */
export async function ensureOmpUpdated(program: string, onUpdating?: (version: string) => void, env: NodeJS.ProcessEnv = process.env, now: () => number = Date.now, systemCertificates: boolean = savedSystemCertificates()): Promise<OmpUpdateOutcome> {
  const installed = await ompVersion(program, env, systemCertificates);
  if (installed.missing) return { missing: true };
  if (!checkHolds(stored(), program, now())) {
    const checked = await checkUpdates(program, env, now, systemCertificates);
    if (checked.missing) return { missing: true };
    if (checked.updateError !== undefined) return judged({ updateError: checked.updateError, ...(installed.version === undefined ? {} : { version: installed.version }) });
  }
  const newer = newerToInstall(stored(), program, now(), installed.version);
  if (newer === undefined) return ofVersion(installed);
  return updateOmp(program, newer, (version) => (version === undefined ? undefined : onUpdating?.(version)), env, now, systemCertificates);
}
