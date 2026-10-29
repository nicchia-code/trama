import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import * as fs from "node:fs";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as fsp from "node:fs/promises";

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
// The same for the asynchronous rename.
const realRenameAsync = fsp.rename;
let asyncFailures = 0;
let asyncFailCode = "EBUSY";
let asyncRenames = 0;
mock.module("node:fs/promises", () => ({
  ...fsp,
  rename: async (from: string, to: string) => {
    asyncRenames++;
    if (asyncFailures > 0) {
      asyncFailures--;
      throw Object.assign(new Error(`${asyncFailCode}: rename refused`), { code: asyncFailCode });
    }
    return realRenameAsync(from, to);
  },
}));
// Loaded after mock.module replaced node:fs, so the helper uses the failing rename; a static import would load it too early.
const { writeFileAtomic, writeFileAtomicAsync } = await import("../src/core/atomic-write");

let dir: string;
let file: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-atomic-"));
  file = join(dir, "record.json");
  failures = 0;
  failCode = "EBUSY";
  renames = 0;
  asyncFailures = 0;
  asyncFailCode = "EBUSY";
  asyncRenames = 0;
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

// The asynchronous writer waits between attempts with the event loop free: the same cases, with the thread given back.
test("async: writes the text and leaves no temporary file behind", async () => {
  await writeFileAtomicAsync(file, "one\n");
  expect(readFileSync(file, "utf8")).toBe("one\n");
  expect(readdirSync(dir)).toEqual(["record.json"]);
});

test("async: retries a rename refused as busy until it succeeds, and the event loop runs meanwhile", async () => {
  writeFileSync(file, "old\n");
  asyncFailures = 3;
  let ticks = 0;
  const timer = setInterval(() => ticks++, 1);
  await writeFileAtomicAsync(file, "new\n");
  clearInterval(timer);
  expect(readFileSync(file, "utf8")).toBe("new\n");
  expect(asyncRenames).toBe(4);
  // Three waits of 10 ms each: a blocked thread would have let no tick run.
  expect(ticks).toBeGreaterThan(3);
  expect(readdirSync(dir)).toEqual(["record.json"]);
});

test("async: gives up after about one second, keeps the old file and removes the temporary file", async () => {
  writeFileSync(file, "old\n");
  asyncFailures = Number.POSITIVE_INFINITY;
  asyncFailCode = "EPERM";
  const started = Date.now();
  let thrown: unknown;
  try {
    await writeFileAtomicAsync(file, "new\n");
  } catch (error) {
    thrown = error;
  }
  expect((thrown as NodeJS.ErrnoException).code).toBe("EPERM");
  expect(Date.now() - started).toBeGreaterThanOrEqual(990);
  expect(readFileSync(file, "utf8")).toBe("old\n");
  expect(readdirSync(dir)).toEqual(["record.json"]);
  asyncFailures = 0;
});

test("async: does not retry errors other than the busy codes", async () => {
  asyncFailures = Number.POSITIVE_INFINITY;
  asyncFailCode = "ENOENT";
  let thrown: unknown;
  try {
    await writeFileAtomicAsync(file, "new\n");
  } catch (error) {
    thrown = error;
  }
  expect((thrown as NodeJS.ErrnoException).code).toBe("ENOENT");
  expect(asyncRenames).toBe(1);
  expect(readdirSync(dir)).toEqual([]);
  asyncFailures = 0;
});
