import { afterEach, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readLastScan, writeLastScan } from "../src/core/last-scan";
import { buildSnapshot } from "../src/core/snapshot";
import { projectAt } from "../src/core/store";
import { moveTask, newTask } from "../src/core/work";

const dir = mkdtempSync(join(tmpdir(), "trama-last-scan-"));
const example = join(import.meta.dir, "../examples/shop");
afterEach(() => rmSync(dir, { recursive: true, force: true }));

test("initializes an ignored timestamp, repairs invalid data, and atomically replaces it", () => {
  cpSync(example, dir, { recursive: true });
  rmSync(join(dir, ".trama", "last-scan"), { recursive: true, force: true });
  const p = projectAt(dir);
  const path = join(p.dir, "last-scan/system");
  const initial = new Date("2026-10-01T10:00:00.000Z");
  expect(readLastScan(p, initial)).toBe(initial.toISOString());
  expect(readFileSync(join(p.dir, "last-scan/.gitignore"), "utf8")).toBe("*\n");
  expect(readFileSync(path, "utf8")).toBe(`${initial.toISOString()}\n`);
  writeFileSync(path, "not a date\n");
  const repaired = new Date("2026-10-02T10:00:00.000Z");
  expect(readLastScan(p, repaired)).toBe(repaired.toISOString());
  const next = "2026-10-03T10:00:00.000Z";
  writeLastScan(p, next);
  expect(readFileSync(path, "utf8")).toBe(`${next}\n`);
});

test("counts only currently Done Tasks finished strictly after the remembered scan", () => {
  cpSync(example, dir, { recursive: true });
  const p = projectAt(dir);
  const scan = "2026-10-01T10:00:00.000Z";
  writeLastScan(p, scan);
  const makeDone = (title: string, finished: string) => {
    const task = newTask(p, { title, refs: ["cart"], technical: false });
    moveTask(p, task.id, "done", "developer");
    const text = readFileSync(task.path, "utf8").replace(/^finished:.*$/m, `finished: "${finished}"`);
    writeFileSync(task.path, text);
    return task;
  };
  makeDone("Before", "2026-10-01T09:59:59.999Z");
  makeDone("At boundary", scan);
  makeDone("After", "2026-10-01T10:00:00.001Z");
  const untracked = newTask(p, { title: "No completion instant", refs: ["cart"], technical: false });
  moveTask(p, untracked.id, "done", "developer");
  writeFileSync(untracked.path, readFileSync(untracked.path, "utf8").replace(/^finished:.*\n?/m, ""));
  const todo = newTask(p, { title: "Still open", refs: ["cart"], technical: false });
  expect(buildSnapshot(p).tasksSinceScan).toBe(1);
  moveTask(p, todo.id, "done", "developer");
  expect(buildSnapshot(p).tasksSinceScan).toBe(2);
});
