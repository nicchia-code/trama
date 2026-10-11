import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import * as fs from "node:fs";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Captured before mock.module, so the mock never calls itself.
const realRename = fs.renameSync;
// The rename fails with `failCode` for the next `failures` calls, then works. Counted, so the tests see every retry.
let failures = 0;
let failCode = "EBUSY";
let renames = 0;
mock.module("node:fs", () => ({
  ...fs,
  renameSync: (from: string, to: string) => {
    renames++;
    if (failures > 0) {
      failures--;
      throw Object.assign(new Error(`${failCode}: rename refused`), { code: failCode });
    }
    return realRename(from, to);
  },
}));
// Loaded after mock.module replaced node:fs, so the helper uses the failing rename; a static import would load it too early.
const { writeFileAtomic } = await import("../src/core/atomic-write");

let dir: string;
let file: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-atomic-"));
  file = join(dir, "record.json");
  failures = 0;
  failCode = "EBUSY";
  renames = 0;
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

test("writes the text and leaves no temporary file behind", () => {
  writeFileAtomic(file, "one\n");
  expect(readFileSync(file, "utf8")).toBe("one\n");
  expect(readdirSync(dir)).toEqual(["record.json"]);
});

test("retries a rename refused as busy until it succeeds", () => {
  writeFileSync(file, "old\n");
  failures = 3;
  writeFileAtomic(file, "new\n");
  expect(readFileSync(file, "utf8")).toBe("new\n");
  expect(renames).toBe(4);
  expect(readdirSync(dir)).toEqual(["record.json"]);
});

test("gives up after about one second, keeps the old file and removes the temporary file", () => {
  writeFileSync(file, "old\n");
  for (const code of ["EPERM", "EACCES", "EBUSY"]) {
    failures = Number.POSITIVE_INFINITY;
    failCode = code;
    renames = 0;
    const started = Date.now();
    let thrown: unknown;
    try {
      writeFileAtomic(file, "new\n");
    } catch (error) {
      thrown = error;
    }
    const elapsed = Date.now() - started;
    expect((thrown as NodeJS.ErrnoException).code).toBe(code);
    expect(elapsed).toBeGreaterThanOrEqual(990);
    expect(elapsed).toBeLessThan(3000);
    expect(renames).toBeGreaterThan(1);
    expect(readFileSync(file, "utf8")).toBe("old\n");
    expect(readdirSync(dir)).toEqual(["record.json"]);
  }
});

test("does not retry errors other than the busy codes", () => {
  failures = Number.POSITIVE_INFINITY;
  failCode = "ENOENT";
  let thrown: unknown;
  try {
    writeFileAtomic(file, "new\n");
  } catch (error) {
    thrown = error;
  }
  expect((thrown as NodeJS.ErrnoException).code).toBe("ENOENT");
  expect(renames).toBe(1);
  expect(readdirSync(dir)).toEqual([]);
});
