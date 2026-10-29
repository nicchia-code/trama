import { closeSync, existsSync, linkSync, mkdirSync, openSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { isBusyCode, pause, sleep } from "./atomic-write";
import { TramaError } from "./errors";

const RETRY_STEP_MS = 10;
const WAIT_MS = 10_000;
// ponytail: a lock older than this is taken as left by a process that died holding it; writes take milliseconds.
const STALE_MS = 30_000;

/** The locks this process holds. Calls are synchronous, so a holder that asks again for its lock simply runs. */
const held = new Set<string>();
/** The locks the asynchronous holders of this chain of calls hold: a holder that asks again for its lock simply runs. */
const heldAsync = new AsyncLocalStorage<ReadonlySet<string>>();

/** The lock file of `name` in `dir`, with the folder made and ignoring itself. */
function lockPath(dir: string, name: string): string {
  mkdirSync(dir, { recursive: true });
  const ignore = join(dir, ".gitignore");
  if (!existsSync(ignore)) writeFileSync(ignore, "*\n");
  return join(dir, `${name}.lock`);
}

const busyError = (name: string) => new TramaError(`${name} is being written by another process; try again in a moment`);

/**
 * Runs `fn` holding the lock `name` in `dir`, so the callers of one name run one after the other, also across
 * processes. The lock is a file created exclusively; `dir` ignores itself so the lock is never versioned. The wait
 * for a lock held by another process blocks the thread: the editor host uses `withFileLockAsync`.
 */
export function withFileLock<T>(dir: string, name: string, fn: () => T): T {
  const path = join(dir, `${name}.lock`);
  if (held.has(path) || heldAsync.getStore()?.has(path) === true) return fn();
  lockPath(dir, name);
  acquire(path, name);
  held.add(path);
  try {
    return fn();
  } finally {
    held.delete(path);
    rmSync(path, { force: true });
  }
}

/**
 * As `withFileLock`, but `fn` may be asynchronous and every wait for the lock gives the thread back, so the editor
 * host is never held. Callers of the same name in this process also take turns; a `fn` that asks again for the lock it
 * holds simply runs, and so does a synchronous call made inside `fn`. The lock is held only while `fn` runs: keep it to the read and the write it protects.
 * A `fn` that is synchronous runs to its end at once and the lock is released before this returns, so no other call of this process, a synchronous one included,
 * ever finds the lock held by it; only a `fn` that waits holds the lock across turns of the event loop.
 */
export async function withFileLockAsync<T>(dir: string, name: string, fn: () => Promise<T> | T): Promise<T> {
  const path = lockPath(dir, name);
  const mine = heldAsync.getStore();
  if (mine?.has(path)) return fn();
  const deadline = Date.now() + WAIT_MS;
  while (!attempt(path, name)) {
    if (Date.now() >= deadline) throw busyError(name);
    await sleep(RETRY_STEP_MS);
  }
  let outcome: Promise<T> | T;
  try {
    outcome = heldAsync.run(new Set([...(mine ?? []), path]), fn);
  } catch (error) {
    rmSync(path, { force: true });
    throw error;
  }
  if (!(outcome instanceof Promise)) {
    rmSync(path, { force: true });
    return outcome;
  }
  try {
    return await outcome;
  } finally {
    rmSync(path, { force: true });
  }
}

function acquire(path: string, name: string): void {
  const deadline = Date.now() + WAIT_MS;
  while (!attempt(path, name)) {
    if (Date.now() >= deadline) throw busyError(name);
    pause(RETRY_STEP_MS);
  }
}

/** One try at taking the lock: true when it is taken, false when it is held (or being released) and the caller has to wait. */
function attempt(path: string, name: string): boolean {
  for (;;) {
    try {
      closeSync(openSync(path, "wx"));
      return true;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EEXIST") {
        // Windows refuses to create a lock file whose previous holder is still deleting it (EPERM or EACCES): the lock is
        // being released, so it is waited for like a held one. Elsewhere those codes are real permission errors.
        if (process.platform !== "win32" || !isBusyCode(code)) throw error;
        return false;
      }
      const age = lockAgeMs(path);
      // Only a lock older than STALE_MS was left by a process that died holding it. One that vanished meanwhile was
      // released, maybe already taken by another process: it is never removed here, only created again.
      if (age !== null && age > STALE_MS) {
        removeStale(path, name);
        continue;
      }
      return false;
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
