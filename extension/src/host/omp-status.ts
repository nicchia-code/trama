import { execFile, type ExecFileException } from "node:child_process";
import { processStarted } from "../../../src/core/performance";
import { cursorKeyEnv } from "./cursor-api-key";
import { ompMeetsMinimum, parseOmpVersion } from "../../../src/core/omp-version";
import { ompPathVariable } from "./model-lists";
import { systemCertificatesEnv } from "./system-certificates";

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
 * `omp --version` of `program`, without a shell and with a time limit: the status of that omp. `where` names the program in the reason when it is not found.
 * The one module that keeps omp (`omp-update.ts`) calls this at the first need of a program and holds the answer; nothing else starts this process.
 */
export function readOmpVersion(program: string, where: string, timeoutMs: number, env: NodeJS.ProcessEnv, systemCertificates: boolean): Promise<OmpStatus> {
  const { promise, resolve } = Promise.withResolvers<OmpStatus>();
  const ended = processStarted(program);
  execFile(program, ["--version"], { timeout: timeoutMs, maxBuffer: 1024 * 1024, env: { ...env, ...cursorKeyEnv(), ...systemCertificatesEnv(systemCertificates), PATH: ompPathVariable(program, env) } }, (error, stdout) => {
    ended();
    if (error !== null) return resolve({ missing: error.code === "ENOENT", error: ompVersionError(error, where, timeoutMs) });
    const version = parseOmpVersion(stdout);
    resolve(version === undefined ? { missing: false, error: ompVersionError(null, where, timeoutMs) } : { missing: false, version, ...(ompMeetsMinimum(version) ? {} : { tooOld: true as const }) });
  });
  return promise;
}
