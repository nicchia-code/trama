import { spawn, spawnSync } from "node:child_process";
import { processStarted } from "./performance";

const GIT_TIMEOUT_MS = 20_000;

/** How a git call ended: `ok` when it exited with status 0; `status` is null when git did not run or was killed. */
export interface GitResult {
  ok: boolean;
  status: number | null;
  stdout: string;
  stderr: string;
}

const gitEnv = { ...process.env, GIT_TERMINAL_PROMPT: "0" };

/**
 * Runs git in `cwd` and returns how it ended, with its output: the synchronous form, only for the command line, a short process that serves no editor (the editor's host
 * uses `gitRunAsync`). The timeout ends git with SIGKILL, not SIGTERM: a git that ignores SIGTERM would otherwise block this synchronous wait, and the whole process, for good.
 * git reads no input and never prompts on the terminal.
 */
export function gitRun(cwd: string, args: string[], timeoutMs = GIT_TIMEOUT_MS): GitResult {
  const ended = processStarted("git");
  const r = spawnSync("git", ["--no-optional-locks", ...args], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: timeoutMs, killSignal: "SIGKILL", maxBuffer: 1 << 30, env: gitEnv });
  ended();
  return { ok: r.error === undefined && r.status === 0, status: r.status, stdout: r.stdout ?? "", stderr: r.error === undefined ? (r.stderr ?? "") : r.error.message };
}

/** Runs git in `cwd` and returns its output, or null when it fails or runs past `timeoutMs`. */
export function git(cwd: string, args: string[], timeoutMs = GIT_TIMEOUT_MS): string | null {
  const r = gitRun(cwd, args, timeoutMs);
  return r.ok ? r.stdout : null;
}

/**
 * The asynchronous form of `gitRun`, for the editor's host: it never holds the process while git runs, and starts git without a console window on Windows. The same fixed
 * arguments, `--no-optional-locks`, `GIT_TERMINAL_PROMPT=0` and time limit; the timeout ends git with SIGKILL, and then `stderr` says so.
 */
export function gitRunAsync(cwd: string, args: string[], timeoutMs = GIT_TIMEOUT_MS): Promise<GitResult> {
  const { promise, resolve } = Promise.withResolvers<GitResult>();
  const ended = processStarted("git");
  const child = spawn("git", ["--no-optional-locks", ...args], { cwd, stdio: ["ignore", "pipe", "pipe"], env: gitEnv, windowsHide: true });
  const out: Buffer[] = [];
  const err: Buffer[] = [];
  let timedOut = false;
  let failed: string | undefined;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill("SIGKILL");
  }, timeoutMs);
  child.stdout.on("data", (chunk: Buffer) => out.push(chunk));
  child.stderr.on("data", (chunk: Buffer) => err.push(chunk));
  child.on("error", (error) => {
    failed = error.message;
    clearTimeout(timer);
    ended();
    resolve({ ok: false, status: null, stdout: "", stderr: error.message });
  });
  child.on("close", (status) => {
    clearTimeout(timer);
    ended();
    const stderr = failed ?? (timedOut ? `git did not finish within ${Math.round(timeoutMs / 1000)} seconds` : Buffer.concat(err).toString("utf8"));
    resolve({ ok: failed === undefined && !timedOut && status === 0, status, stdout: Buffer.concat(out).toString("utf8"), stderr });
  });
  return promise;
}

/** The asynchronous form of `git`: the output of git run in `cwd`, or null when it fails or runs past `timeoutMs`. */
export async function gitAsync(cwd: string, args: string[], timeoutMs = GIT_TIMEOUT_MS): Promise<string | null> {
  const r = await gitRunAsync(cwd, args, timeoutMs);
  return r.ok ? r.stdout : null;
}
