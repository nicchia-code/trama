// System Certificates (`rules#developer.REFRESH_SYSTEM_CERTIFICATES`): the export of the certificate authorities the system trusts into one bundle per user, the state of
// that bundle and the variables every process Trama starts receives. The names of the variables and the paths live only here. No runtime import of the editor: the
// launchers of omp (`model-lists`, `omp-update`, the ACP client) read the variables through here and run outside the editor in tests.
import { execFile } from "node:child_process";
import { X509Certificate } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, posix, win32 } from "node:path";
import { rootCertificates } from "node:tls";

/** The variables that carry the bundle's path to every process Trama starts: omp and the tools its commands run. Java's truststore is not covered. */
export const CERTIFICATE_VARIABLES = [
  "NODE_EXTRA_CA_CERTS",
  "SSL_CERT_FILE",
  "REQUESTS_CA_BUNDLE",
  "CURL_CA_BUNDLE",
  "GIT_SSL_CAINFO",
  "PIP_CERT",
  "CARGO_HTTP_CAINFO",
  "AWS_CA_BUNDLE",
  "DENO_CERT",
] as const;

/** The file name of the bundle in the user's cache folder. */
const BUNDLE_FILE = "system-certificates.pem";

/** How long the export may take, and how old the bundle may be before the extension exports it again at its start. */
export const EXPORT_TIMEOUT_MS = 30_000;
export const BUNDLE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** The system keychains of macOS: never the user's `login` keychain. */
const MACOS_KEYCHAINS = ["/Library/Keychains/System.keychain", "/System/Library/Keychains/SystemRootCertificates.keychain"];

/** The Linux system bundles, the first readable one wins. */
export const LINUX_BUNDLES = [
  "/etc/ssl/certs/ca-certificates.crt",
  "/etc/pki/tls/certs/ca-bundle.crt",
  "/etc/ssl/ca-bundle.pem",
  "/etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem",
  "/etc/ssl/cert.pem",
];

/** The script that writes every certificate of the machine's root store (`Cert:\LocalMachine\Root`, never the user's) as PEM. */
export const WINDOWS_SCRIPT =
  "$ErrorActionPreference = 'Stop'; Get-ChildItem -Path 'Cert:\\LocalMachine\\Root' | ForEach-Object { '-----BEGIN CERTIFICATE-----'; [Convert]::ToBase64String($_.RawData, 'InsertLineBreaks'); '-----END CERTIFICATE-----' }";

/** The user's home folder as `os.homedir()` finds it, read from `env` at the time of the call: `HOME`, or `USERPROFILE` on Windows. */
const userHome = (platform: NodeJS.Platform, env: NodeJS.ProcessEnv): string => {
  const home = platform === "win32" ? env["USERPROFILE"] : env["HOME"];
  return home !== undefined && home !== "" ? home : homedir();
};

/** The bundle's path for a platform: macOS `~/Library/Caches/Trama`, Windows `%LOCALAPPDATA%\Trama`, elsewhere `$XDG_CACHE_HOME/trama` (`~/.cache` without the variable). */
export function bundlePath(platform: NodeJS.Platform = process.platform, env: NodeJS.ProcessEnv = process.env, home: string = userHome(platform, env)): string {
  if (platform === "darwin") return posix.join(home, "Library", "Caches", "Trama", BUNDLE_FILE);
  if (platform === "win32") {
    const local = env["LOCALAPPDATA"];
    return win32.join(local !== undefined && local !== "" ? local : win32.join(home, "AppData", "Local"), "Trama", BUNDLE_FILE);
  }
  const cache = env["XDG_CACHE_HOME"];
  return posix.join(cache !== undefined && cache !== "" ? cache : posix.join(home, ".cache"), "trama", BUNDLE_FILE);
}

/**
 * The variables of the bundle for a process that is about to start: the nine of `CERTIFICATE_VARIABLES` set to the bundle's path while the mode is on (`on`) and
 * the bundle exists, otherwise none. Merge them after the inherited environment and after `cursorKeyEnv`, so they win.
 */
export function systemCertificatesEnv(on: boolean, path: string = bundlePath()): Record<string, string> {
  if (!on || !existsSync(path)) return {};
  return Object.fromEntries(CERTIFICATE_VARIABLES.map((name) => [name, path]));
}

let savedSetting: () => boolean = () => false;

/** Tells this module how to read `trama.systemCertificates` (the user value), once, when the extension activates. The launchers that have no editor to ask read it through here. */
export function setSystemCertificatesSetting(read: () => boolean): void {
  savedSetting = read;
}

/** Whether the saved setting `trama.systemCertificates` is on, for the processes that start with the saved value. */
export const savedSystemCertificates = (): boolean => savedSetting();

// ---- Building the bundle ----

/** A reason an export failed, in English as the Settings tab and the editor messages show it. */
export class ExportFailure extends Error {}

/** The PEM blocks of a text, line breaks normalized to `\n`. */
export function splitPem(text: string): string[] {
  return (text.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g) ?? []).map((block) => block.replace(/\r\n?/g, "\n"));
}

/** `block` as a certificate, or undefined when it cannot be read. */
function parseCertificate(block: string): X509Certificate | undefined {
  try {
    return new X509Certificate(block);
  } catch {
    return undefined;
  }
}

export type Built = { ok: true; pem: string; count: number } | { ok: false; reason: string };

/**
 * The bundle: every certificate of `source` that can be read and is a certificate authority, then the public roots (`roots`, `tls.rootCertificates`), each once by
 * `fingerprint256`. A certificate that cannot be read or is not an authority is left out without failing; no authority at all in `source` is the failure.
 */
export function buildBundle(source: string, roots: readonly string[]): Built {
  const seen = new Set<string>();
  const blocks: string[] = [];
  const add = (block: string, certificate: X509Certificate): boolean => {
    if (seen.has(certificate.fingerprint256)) return false;
    seen.add(certificate.fingerprint256);
    blocks.push(block);
    return true;
  };
  let fromSource = 0;
  for (const block of splitPem(source)) {
    const certificate = parseCertificate(block);
    if (certificate === undefined || certificate.ca !== true) continue;
    fromSource++;
    add(block, certificate);
  }
  if (fromSource === 0) return { ok: false, reason: "no certificate authority found" };
  for (const root of roots) {
    const certificate = parseCertificate(root);
    if (certificate !== undefined) add(root.replace(/\r\n?/g, "\n").trim(), certificate);
  }
  return { ok: true, pem: `${blocks.map((block) => block.trim()).join("\n")}\n`, count: blocks.length };
}

/** The number of certificates in a bundle file's text. */
export const countCertificates = (text: string): number => splitPem(text).length;

// ---- Reading the system store ----

/** What `execFile` failed with, as the reason of the export: the program could not start, it did not finish in time or it exited with a code. */
function programFailure(error: NodeJS.ErrnoException & { killed?: boolean }, name: string, timeoutMs: number): ExportFailure {
  if (error.killed === true && error.code !== "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") return new ExportFailure(`the export did not finish within ${timeoutMs / 1000} s`);
  if (typeof error.code === "number") return new ExportFailure(`${name} exited with code ${error.code}`);
  return new ExportFailure(`could not start ${name}`);
}

/** Runs a fixed program without a shell and gives its output. */
function runProgram(program: string, args: string[], name: string, timeoutMs: number): Promise<string> {
  const { promise, resolve, reject } = Promise.withResolvers<string>();
  execFile(program, args, { timeout: timeoutMs, maxBuffer: 256 * 1024 * 1024, windowsHide: true }, (error, stdout) => {
    if (error !== null) return reject(programFailure(error as NodeJS.ErrnoException, name, timeoutMs));
    resolve(stdout);
  });
  return promise;
}

/** The certificates of the system store as PEM text, read without a shell and with fixed arguments (the sources of `rules#developer.REFRESH_SYSTEM_CERTIFICATES`). Rejects with an `ExportFailure`. */
export async function readSystemStore(platform: NodeJS.Platform = process.platform, env: NodeJS.ProcessEnv = process.env, timeoutMs = EXPORT_TIMEOUT_MS): Promise<string> {
  if (platform === "darwin") return runProgram("/usr/bin/security", ["find-certificate", "-a", "-p", ...MACOS_KEYCHAINS], "security", timeoutMs);
  if (platform === "win32") {
    const program = win32.join(env["SystemRoot"] ?? "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
    return runProgram(program, ["-NoProfile", "-NonInteractive", "-Command", WINDOWS_SCRIPT], "powershell.exe", timeoutMs);
  }
  for (const file of LINUX_BUNDLES) {
    try {
      return await readFile(file, "utf8");
    } catch {
      // Missing or unreadable: the next one.
    }
  }
  throw new ExportFailure("no certificate bundle found");
}

// ---- Writing the bundle ----

/**
 * Writes `pem` to `<path>.<pid>.tmp` and renames it over `path`, so the rename is the only change other processes see. A failure removes the temporary file, leaves the
 * earlier bundle as it was and throws.
 */
export function writeBundle(path: string, pem: string, rename: (from: string, to: string) => void = renameSync): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  try {
    writeFileSync(temporary, pem);
    rename(temporary, path);
  } finally {
    rmSync(temporary, { force: true });
  }
}

// ---- The export and its state ----

/** What an export reads and writes; the defaults are the real ones. */
export interface ExportDeps {
  read(): Promise<string>;
  path: string;
  roots: readonly string[];
  rename?: (from: string, to: string) => void;
}

export type ExportOutcome = { ok: true; count: number; exportedAt: string } | { ok: false; reason: string };

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** One export: reads the source, builds the bundle and writes it atomically. A failure never touches the earlier bundle. */
export async function exportBundle(deps: ExportDeps): Promise<ExportOutcome> {
  let source: string;
  try {
    source = await deps.read();
  } catch (error) {
    return { ok: false, reason: error instanceof ExportFailure ? error.message : `could not read the system certificates: ${messageOf(error)}` };
  }
  const built = buildBundle(source, deps.roots);
  if (!built.ok) return built;
  try {
    writeBundle(deps.path, built.pem, deps.rename);
    return { ok: true, count: built.count, exportedAt: statSync(deps.path).mtime.toISOString() };
  } catch (error) {
    return { ok: false, reason: `could not write the bundle: ${messageOf(error)}` };
  }
}

/** The state of the bundle of this window, as the webview is told: an export running, the count and time of the bundle on disk, and the reason the last export failed. */
export interface SystemCertificatesState {
  exporting: boolean;
  count?: number;
  /** ISO time the bundle in use was written. */
  exportedAt?: string;
  error?: string;
}

let state: SystemCertificatesState = { exporting: false };
const listeners = new Set<(state: SystemCertificatesState) => void>();

const change = (next: SystemCertificatesState): void => {
  state = next;
  for (const listener of [...listeners]) listener({ ...state });
};

/** The state now. */
export const systemCertificatesState = (): SystemCertificatesState => ({ ...state });

/** Tells `listener` at every change of the state. */
export function onSystemCertificatesChanged(listener: (state: SystemCertificatesState) => void): { dispose(): void } {
  listeners.add(listener);
  return { dispose: () => void listeners.delete(listener) };
}

/** Reads the bundle on disk into the state (`exportedAt` is the file's `mtime`, `count` its certificates); no bundle leaves both out. Silent: it never fails. */
export function loadBundleState(path: string = bundlePath()): void {
  let next: SystemCertificatesState;
  try {
    const modified = statSync(path).mtime.toISOString();
    next = { exporting: state.exporting, count: countCertificates(readFileSync(path, "utf8")), exportedAt: modified };
  } catch {
    next = { exporting: state.exporting };
  }
  if (state.error !== undefined) next.error = state.error;
  change(next);
}

/** Whether the bundle is missing or was written more than 24 hours before `now`: the extension exports it again when it starts. */
export function bundleStale(now: number = Date.now(), path: string = bundlePath()): boolean {
  try {
    return now - statSync(path).mtimeMs > BUNDLE_MAX_AGE_MS;
  } catch {
    return true;
  }
}

/** The deps of a real export. */
const realDeps = (): ExportDeps => ({ read: () => readSystemStore(), path: bundlePath(), roots: rootCertificates });

let depsOverride: (() => ExportDeps) | undefined;

/** Tests only: the deps `runExport` uses when none are given, so a test of the controller never reads the machine's store. `undefined` restores the real ones. */
export function useExportDeps(deps: (() => ExportDeps) | undefined): void {
  depsOverride = deps;
}

/**
 * Exports the bundle. A request while an export of this window runs does nothing and gives `undefined`. The state says `exporting` meanwhile; a success replaces the count
 * and the time and clears the error, a failure keeps the earlier count and time and sets the reason. Never rejects.
 */
export async function runExport(deps: ExportDeps = (depsOverride ?? realDeps)()): Promise<ExportOutcome | undefined> {
  if (state.exporting) return undefined;
  const { error: _cleared, ...earlier } = state;
  change({ ...earlier, exporting: true });
  const outcome = await exportBundle(deps);
  change(outcome.ok ? { exporting: false, count: outcome.count, exportedAt: outcome.exportedAt } : { ...earlier, exporting: false, error: outcome.reason });
  return outcome;
}

/** `exportedAt` in the editor's locale, short form: «10/25/26, 3:04 PM». */
export const exportedAtLabel = (exportedAt: string): string => new Date(exportedAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });

/** The editor message of an export that failed: the reason, and the time of the bundle that stays in use when there is one. */
export const exportFailureMessage = (reason: string, exportedAt: string | undefined): string =>
  `Trama: could not export the system certificates: ${reason}.${exportedAt === undefined ? "" : ` Using the ones exported ${exportedAtLabel(exportedAt)}.`}`;

/** Forgets the state: tests only. */
export function resetSystemCertificatesState(): void {
  state = { exporting: false };
}
