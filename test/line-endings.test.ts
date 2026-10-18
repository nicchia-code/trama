import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { syncShortNumbers } from "../src/core/short-numbers";
import { type Project, projectAt } from "../src/core/store";
import { newTask } from "../src/core/work";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-eol-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("reading the short-number file with Windows line endings", () => {
  test("keeps the numbers it saved and rewrites nothing", () => {
    const task = newTask(p, { title: "Tell the customer", refs: ["order"], technical: false });
    syncShortNumbers(p);
    const assigned = join(p.dir, "short-numbers", "assigned");
    const line = readFileSync(assigned, "utf8").split("\n").find((l) => l.includes(task.id));
    const number = Number(line?.split(" ").pop());
    expect(Number.isInteger(number)).toBe(true);

    const crlf = readFileSync(assigned, "utf8").replace(/\n/g, "\r\n");
    writeFileSync(assigned, crlf);

    expect(syncShortNumbers(p).find("task", number)).toBe(task.id);
    expect(readFileSync(assigned, "utf8")).toBe(crlf);
  });
});
