import { execFile, type ExecFileException } from "node:child_process";
import { processStarted } from "../../../../src/core/performance";
import { certificateErrorText, isCertificateError } from "../../certificate-errors";
import { cursorKeyEnv } from "../cursor-api-key";
import { savedSystemCertificates, systemCertificatesEnv } from "../system-certificates";
import { parseUsageReport, type UsageReport } from "../../../../src/core/omp-usage";
import type { ToChatWebview } from "../../omp-chat-protocol";
import { ompPathVariable } from "../model-lists";
import type { Disposable } from "./ports";

/** The message `usage` the webview draws the bar and the dialog from. */
export type UsageMessage = Extract<ToChatWebview, { type: "usage" }>;

/** What the view of omp Chat needs of the usage: to ask for it, to read what is known and to hear of a change. */
export interface UsageSource {
  /** Asks omp for the usage now, whatever came before (the usage dialog opened), or, with a request running, once more when it ends. */
  request(): void;
  /** A tab appeared or was resumed: asks only when the window has no successful report and no request is running. */
  ensure(): void;
  /** A turn ended: asks only when no request is running and the last one ended more than `USAGE_MIN_INTERVAL_MS` ago, or none ran yet. Never leaves a request waiting. */
  turnEnded(): void;
  /** The usage as the webview gets it. */
  message(): UsageMessage;
  onChange(listener: () => void): Disposable;
}

/** A turn that ends asks for the usage only when the last request ended more than this long ago (60 seconds). */
export const USAGE_MIN_INTERVAL_MS = 60_000;
const USAGE_TIMEOUT_MS = 30_000;
const USAGE_MAX_BUFFER = 16 * 1024 * 1024;
const UNREADABLE = "omp usage did not return a valid report";

/** The reason a run of `omp usage --json` failed, in English as the dialog shows it; the certificate error text, for the mode `systemCertificates`, when its error output (`stderr`, read only for this test) says omp could not verify a certificate. */
function failureReason(error: ExecFileException, program: string, timeoutMs: number, stderr: string, systemCertificates: boolean): string {
  if (error.code === "ENOENT") return `omp not found at ${program}`;
  if (isCertificateError(stderr)) return certificateErrorText(systemCertificates);
  if (error.code !== "ERR_CHILD_PROCESS_STDIO_MAXBUFFER" && error.killed === true) return `omp did not answer within ${timeoutMs / 1000} s`;
  if (typeof error.code === "number") return `omp exited with code ${error.code}`;
  return error.message;
}

/** What the runner needs of the window: the setting, the way the program is found and the folder General works in. */
export interface UsageRunnerDeps {
  /** `trama.ompPath`, trimmed. */
  ompPath(): string;
  /** The program omp runs as, undefined when omp is not installed: the one the window's omp module keeps (`tech#omp-acp`). */
  findOmp(ompPath: string): Promise<string | undefined>;
  /** The folder of the panel, the one General works in. */
  folder(): string | undefined;
}

/**
 * `omp usage --json`, run without a shell and with fixed arguments: the program `findOmp` gives, the PATH of `ompPathVariable` as for `omp models --json`, the folder of the
 * panel (General's, also when General is not there) as the working directory, 30 seconds and 16 MiB. Resolves with the output; rejects with the reason (`omp not found at <path>`,
 * `omp did not answer within 30 s`, `omp exited with code <N>`) when the program is missing, does not answer or fails.
 */
export function ompUsageRunner(deps: UsageRunnerDeps, timeoutMs = USAGE_TIMEOUT_MS, env: NodeJS.ProcessEnv = process.env): () => Promise<string> {
  return async () => {
    const wanted = deps.ompPath();
    const program = await deps.findOmp(wanted);
    if (program === undefined) throw new Error(`omp not found at ${wanted === "" ? "the editor PATH" : wanted}`);
    const cwd = deps.folder();
    const { promise, resolve, reject } = Promise.withResolvers<string>();
    const systemCertificates = savedSystemCertificates();
    const options = { timeout: timeoutMs, maxBuffer: USAGE_MAX_BUFFER, env: { ...env, ...cursorKeyEnv(), ...systemCertificatesEnv(systemCertificates), PATH: ompPathVariable(program, env) }, ...(cwd === undefined ? {} : { cwd }) };
    const ended = processStarted(program);
    execFile(program, ["usage", "--json"], options, (error, stdout, stderr) => {
      ended();
      return error === null ? resolve(stdout) : reject(new Error(failureReason(error, program, timeoutMs, String(stderr), systemCertificates)));
    });
    return promise;
  };
}

/**
 * The usage of the subscription for one window (`omp-chat`): the last successful report and the instant omp made it, the instant the last request ended, the request running and
 * at most one waiting. Nothing is saved: a reload forgets it. A failure keeps the last report and keeps the reason until the next report succeeds.
 */
export class OmpUsage implements UsageSource {
  private report: UsageReport | undefined;
  private error: string | undefined;
  private running = false;
  private waiting = false;
  /** The instant the last request ended, successful or not; none before the first. */
  private endedAt: number | undefined;
  private readonly listeners = new Set<() => void>();

  /** `run` gives the output of `omp usage --json` or rejects with the reason it failed; `now` is the clock (tests). */
  constructor(
    private readonly run: () => Promise<string>,
    private readonly now: () => number = Date.now,
  ) {}

  request(): void {
    if (this.running) {
      this.waiting = true;
      return;
    }
    void this.fetch();
  }

  ensure(): void {
    if (this.running || this.report !== undefined) return;
    void this.fetch();
  }

  turnEnded(): void {
    if (this.running) return;
    if (this.endedAt !== undefined && this.now() - this.endedAt <= USAGE_MIN_INTERVAL_MS) return;
    void this.fetch();
  }

  message(): UsageMessage {
    return { type: "usage", fetching: this.running, ...(this.report === undefined ? {} : { report: this.report }), ...(this.error === undefined ? {} : { error: this.error }) };
  }

  onChange(listener: () => void): Disposable {
    this.listeners.add(listener);
    return { dispose: () => void this.listeners.delete(listener) };
  }

  private async fetch(): Promise<void> {
    this.running = true;
    this.changed();
    try {
      const report = parseUsageReport(await this.run(), this.now());
      if (report === undefined) throw new Error(UNREADABLE);
      this.report = report;
      this.error = undefined;
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    }
    this.running = false;
    this.endedAt = this.now();
    if (this.waiting) {
      this.waiting = false;
      void this.fetch();
      return;
    }
    this.changed();
  }

  private changed(): void {
    for (const listener of [...this.listeners]) listener();
  }
}
