import { execFile, type ExecFileException } from "node:child_process";
import { cursorKeyEnv } from "./cursor-api-key";
import { ompMeetsMinimum, parseOmpVersion } from "../../../src/core/omp-version";
import { ompPathVariable } from "./model-lists";
import { findOmp } from "./omp-update";
import { savedSystemCertificates, systemCertificatesEnv } from "./system-certificates";

/** What the Settings tab shows of omp: the version that answers, or why nothing does. `missing` is true only when the program was not found; `tooOld` when the version is older than the minimum. */
export interface OmpStatus {
  missing: boolean;
  version?: string;
  error?: string;
  tooOld?: true;
}

/** The reason `omp --version` failed, in English, as the Settings tab and the model fields give it. */
export function ompVersionError(error: ExecFileException | null, where: string, timeoutMs: number): string {
  if (error?.code === "ENOENT") return `omp not found at ${where}`;
  if (error?.code !== "ERR_CHILD_PROCESS_STDIO_MAXBUFFER" && error?.killed === true) return `omp --version did not answer within ${timeoutMs / 1000} s`;
  if (typeof error?.code === "number") return `omp exited with code ${error.code}`;
  return "omp --version did not return a version";
}

/**
 * The status of the omp Trama uses for `ompPath` (trimmed, empty for the editor's PATH): the program is looked for as the launches look for it
 * and asked `omp --version`, without a shell and with a time limit. It never checks for updates.
 */
export async function ompStatus(ompPath: string, timeoutMs = 15_000, env: NodeJS.ProcessEnv = process.env, systemCertificates: boolean = savedSystemCertificates()): Promise<OmpStatus> {
  const where = ompPath === "" ? "the editor PATH" : ompPath;
  const program = await findOmp(ompPath, env);
  if (program === undefined) return { missing: true, error: `omp not found at ${where}` };
  const { promise, resolve } = Promise.withResolvers<OmpStatus>();
  execFile(program, ["--version"], { timeout: timeoutMs, maxBuffer: 1024 * 1024, env: { ...env, ...cursorKeyEnv(), ...systemCertificatesEnv(systemCertificates), PATH: ompPathVariable(program, env) } }, (error, stdout) => {
    if (error !== null) return resolve({ missing: error.code === "ENOENT", error: ompVersionError(error, where, timeoutMs) });
    const version = parseOmpVersion(stdout);
    resolve(version === undefined ? { missing: false, error: ompVersionError(null, where, timeoutMs) } : { missing: false, version, ...(ompMeetsMinimum(version) ? {} : { tooOld: true as const }) });
  });
  return promise;
}
