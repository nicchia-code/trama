import { closeSync, existsSync, mkdirSync, openSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pause } from "./atomic-write";
import { TramaError } from "./errors";

const RETRY_STEP_MS = 10;
const WAIT_MS = 10_000;
// ponytail: a lock older than this is taken as left by a process that died holding it; writes take milliseconds.
const STALE_MS = 30_000;

/** The locks this process holds. Calls are synchronous, so a holder that asks again for its lock simply runs. */
const held = new Set<string>();

/**
 * Runs `fn` holding the lock `name` in `dir`, so the callers of one name run one after the other, also across
 * processes. The lock is a file created exclusively; `dir` ignores itself so the lock is never versioned.
 */
export function withFileLock<T>(dir: string, name: string, fn: () => T): T {
  const path = join(dir, `${name}.lock`);
  if (held.has(path)) return fn();
  mkdirSync(dir, { recursive: true });
  const ignore = join(dir, ".gitignore");
  if (!existsSync(ignore)) writeFileSync(ignore, "*\n");
  acquire(path, name);
  held.add(path);
  try {
    return fn();
  } finally {
    held.delete(path);
    rmSync(path, { force: true });
  }
}

function acquire(path: string, name: string): void {
  const deadline = Date.now() + WAIT_MS;
  for (;;) {
    try {
      closeSync(openSync(path, "wx"));
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (isStale(path)) rmSync(path, { force: true });
      else if (Date.now() >= deadline) throw new TramaError(`${name} is being written by another process; try again in a moment`);
      else pause(RETRY_STEP_MS);
    }
  }
}

/** A lock that vanished meanwhile, or one older than STALE_MS, may be taken. */
function isStale(path: string): boolean {
  try {
    return Date.now() - statSync(path).mtimeMs > STALE_MS;
  } catch {
    return true;
  }
}
