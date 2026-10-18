import { closeSync, existsSync, linkSync, mkdirSync, openSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
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
      const age = lockAgeMs(path);
      // Only a lock older than STALE_MS was left by a process that died holding it. One that vanished meanwhile was
      // released, maybe already taken by another process: it is never removed here, only created again.
      if (age !== null && age > STALE_MS) {
        removeStale(path, name);
        continue;
      }
      if (Date.now() >= deadline) throw new TramaError(`${name} is being written by another process; try again in a moment`);
      pause(RETRY_STEP_MS);
    }
  }
}

/**
 * Removes a lock that was found older than STALE_MS. The lock is first moved aside under a unique name, so the file
 * that is checked is the file that is removed: a fresh lock taken by another process meanwhile is put back, never deleted.
 */
function removeStale(path: string, name: string): void {
  const aside = `${path}.${randomBytes(6).toString("hex")}.stale`;
  try {
    renameSync(path, aside);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  try {
    const age = lockAgeMs(aside);
    if (age === null) return;
    if (age > STALE_MS) return;
    // A fresh lock: put it back, but never over a lock another process has taken meanwhile.
    try {
      linkSync(aside, path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      throw new TramaError(`${name} is being written by another process; try again in a moment`);
    }
  } finally {
    rmSync(aside, { force: true });
  }
}

/** How long the lock has existed, or null when it is gone by now. */
function lockAgeMs(path: string): number | null {
  try {
    return Date.now() - statSync(path).mtimeMs;
  } catch {
    return null;
  }
}
