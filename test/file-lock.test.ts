import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sleep } from "../src/core/atomic-write";
import { withFileLock, withFileLockAsync } from "../src/core/file-lock";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-file-lock-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

test("a lock left by a dead process is taken over, and nothing is left behind", () => {
  const lock = join(dir, "proposal.lock");
  writeFileSync(lock, "");
  const old = new Date(Date.now() - 60_000);
  utimesSync(lock, old, old);

  expect(withFileLock(dir, "proposal", () => "ran")).toBe("ran");
  expect(readdirSync(dir).sort()).toEqual([".gitignore"]);
});

test("async: callers of one name take turns and the lock is gone afterwards", async () => {
  const order: string[] = [];
  const work = (name: string) =>
    withFileLockAsync(dir, "turns", async () => {
      order.push(`${name} in`);
      await sleep(30);
      order.push(`${name} out`);
      return name;
    });
  expect(await Promise.all([work("a"), work("b")])).toEqual(["a", "b"]);
  expect(order).toEqual(["a in", "a out", "b in", "b out"]);
  expect(readdirSync(dir).sort()).toEqual([".gitignore"]);
});

test("async: the wait for a lock another process holds leaves the event loop free, and ends when the lock goes", async () => {
  const lock = join(dir, "busy.lock");
  writeFileSync(lock, "");
  let ticks = 0;
  const timer = setInterval(() => ticks++, 1);
  setTimeout(() => rmSync(lock), 60);
  expect(await withFileLockAsync(dir, "busy", () => "ran")).toBe("ran");
  clearInterval(timer);
  // A blocked thread would have let no tick run during the wait.
  expect(ticks).toBeGreaterThan(5);
});

test("async: a lock left by a dead process is taken over", async () => {
  const lock = join(dir, "proposal.lock");
  writeFileSync(lock, "");
  const old = new Date(Date.now() - 60_000);
  utimesSync(lock, old, old);
  expect(await withFileLockAsync(dir, "proposal", () => "ran")).toBe("ran");
  expect(readdirSync(dir).sort()).toEqual([".gitignore"]);
});

test("async: a holder that asks again for its lock simply runs, and the lock is released when the body throws", async () => {
  const result = await withFileLockAsync(dir, "again", async () => withFileLockAsync(dir, "again", () => "inner"));
  expect(result).toBe("inner");
  await expect(withFileLockAsync(dir, "fails", () => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
  expect(readdirSync(dir).sort()).toEqual([".gitignore"]);
});
