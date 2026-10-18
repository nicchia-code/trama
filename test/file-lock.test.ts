import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { withFileLock } from "../src/core/file-lock";

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
