import { spawn, spawnSync } from "node:child_process";

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
 * Runs git in `cwd` and returns how it ended, with its output. The timeout ends git with SIGKILL, not SIGTERM: a git that ignores SIGTERM would
 * otherwise block this synchronous wait, and the whole process, for good. git reads no input and never prompts on the terminal.
 */
export function gitRun(cwd: string, args: string[], timeoutMs = GIT_TIMEOUT_MS): GitResult {
  const r = spawnSync("git", ["--no-optional-locks", ...args], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: timeoutMs, killSignal: "SIGKILL", maxBuffer: 1 << 30, env: gitEnv });
  return { ok: r.error === undefined && r.status === 0, status: r.status, stdout: r.stdout ?? "", stderr: r.error === undefined ? (r.stderr ?? "") : r.error.message };
}

/** Runs git in `cwd` and returns its output, or null when it fails or runs past `timeoutMs`. */
export function git(cwd: string, args: string[], timeoutMs = GIT_TIMEOUT_MS): string | null {
  const r = gitRun(cwd, args, timeoutMs);
  return r.ok ? r.stdout : null;
}

/**
 * Like `gitRun`, without holding the process: for a call that may take long and must not freeze the editor's host while it waits. The timeout ends git
 * with SIGKILL, and then `stderr` says so.
 */
export function gitRunAsync(cwd: string, args: string[], timeoutMs = GIT_TIMEOUT_MS): Promise<GitResult> {
  const { promise, resolve } = Promise.withResolvers<GitResult>();
  const child = spawn("git", ["--no-optional-locks", ...args], { cwd, stdio: ["ignore", "pipe", "pipe"], env: gitEnv });
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
    resolve({ ok: false, status: null, stdout: "", stderr: error.message });
  });
  child.on("close", (status) => {
    clearTimeout(timer);
    const stderr = failed ?? (timedOut ? `git did not finish within ${Math.round(timeoutMs / 1000)} seconds` : Buffer.concat(err).toString("utf8"));
    resolve({ ok: failed === undefined && !timedOut && status === 0, status, stdout: Buffer.concat(out).toString("utf8"), stderr });
  });
  return promise;
}
