import { afterAll, beforeAll, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DocumentCache } from "../src/core/document-cache";
import { buildSnapshot } from "../src/core/snapshot";
import { projectAt } from "../src/core/store";

const DRIFTS = 300;
const UNIFIED_TARGETS = 10;
const UNIFIED_EACH = 5;
const TASKS = 40;
const PROPOSALS = 30;
const HISTORY = 25;

const id = (letter: string, n: number) => `${letter}${String(n).padStart(7, "0")}`;
const instant = (n: number) => `2026-10-01T10:${String(Math.floor(n / 60) % 60).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}.000Z`;

/** The shop example with a few hundred Drifts (some unified), Tasks, Proposals (some open, with Task files) and History entries, written straight as files. */
function bigProject(): string {
  const root = mkdtempSync(join(tmpdir(), "trama-picture-"));
  cpSync(join(import.meta.dir, "../examples/shop"), root, { recursive: true });
  const dir = join(root, ".trama");
  for (const folder of ["drifts", "tasks", "proposals", "history"]) mkdirSync(join(dir, folder), { recursive: true });
  const drift = (n: number, extra: string, status = "open") =>
    writeFileSync(join(dir, "drifts", `${id("d", n)}-drift-${n}.md`), `---\nstatus: ${status}\nrefs:\n  - order\ncreated: ${instant(n)}\n${extra}---\n# Drift ${n}\n\n## What happens\n\nThe code does ${n}.\n\n## What should happen\n\nThe Model says ${n}.\n`);
  let next = 1;
  // Unified Drifts: each target merges a few Drifts that are resolved as unified into it.
  for (let t = 0; t < UNIFIED_TARGETS; t++) {
    const target = next++;
    const merged = Array.from({ length: UNIFIED_EACH }, () => next++);
    drift(target, `unifies:\n${merged.map((m) => `  - ${id("d", m)}\n`).join("")}`);
    for (const m of merged) drift(m, `resolution: unified\nunifiedInto: ${id("d", target)}\n`, "resolved");
  }
  while (next <= DRIFTS) drift(next++, next % 7 === 0 ? `previous:\n  - ${id("d", 1)}\n` : "");
  for (let n = 1; n <= TASKS; n++) {
    writeFileSync(join(dir, "tasks", `${id("t", n)}-task-${n}.md`), `---\ncolumn: ${n % 3 === 0 ? "done" : "todo"}\nrefs:\n  - order\ncreated: ${instant(n)}\n${n % 3 === 0 ? `finished: ${instant(n + 100)}\n` : ""}---\n# Task ${n}\n`);
  }
  for (let n = 1; n <= PROPOSALS; n++) {
    const folder = join(dir, "proposals", `${id("p", n)}-proposal-${n}`);
    mkdirSync(join(folder, "tasks"), { recursive: true });
    writeFileSync(join(folder, "proposal.md"), `---\nstatus: ${n <= 5 ? "open" : "approved"}\nbase: {}\ndelete: []\ncreated: ${instant(n)}\n---\n# Proposal ${n}\n`);
    for (let k = 1; k <= 2; k++) writeFileSync(join(folder, "tasks", `${id("a", n * 10 + k)}-part-${k}.md`), `---\nrefs:\n  - order\n---\n# Part ${k}\n`);
  }
  for (let n = 1; n <= HISTORY; n++) {
    writeFileSync(join(dir, "history", `${id("h", n)}-entry-${n}.md`), `---\nsummary: Entry ${n}.\ncreated: ${instant(n)}\nupdated: ${instant(n)}\ntasks:\n  - ${id("t", n)}\n---\n# Entry ${n}\n`);
  }
  return root;
}

let root: string;
beforeAll(() => {
  root = bigProject();
});
afterAll(() => rmSync(root, { recursive: true, force: true }));

const documents = (dir: string): string[] =>
  ["drifts", "tasks", "history"].flatMap((folder) => readdirSync(join(dir, folder)).map((name) => join(dir, folder, name)))
    .concat(readdirSync(join(dir, "proposals")).flatMap((name) => [join(dir, "proposals", name, "proposal.md"), ...readdirSync(join(dir, "proposals", name, "tasks")).map((file) => join(dir, "proposals", name, "tasks", file))]));

test("a picture of a project with hundreds of Drifts reads and parses each file once, and a second one with nothing changed reads none", () => {
  const p = projectAt(root);
  const parsed: string[] = [];
  const cache = new DocumentCache((path) => void parsed.push(path));
  const first = buildSnapshot(p, [], [], [], cache);
  expect(first.drifts).toHaveLength(DRIFTS - UNIFIED_TARGETS * UNIFIED_EACH);
  expect(first.unifiedDrifts).toHaveLength(UNIFIED_TARGETS * UNIFIED_EACH);
  expect(first.drifts.filter((d) => d.unifies.length === UNIFIED_EACH)).toHaveLength(UNIFIED_TARGETS);
  expect(first.unifiedDrifts.every((d) => d.unifiedInto !== null && d.unifiedInto.title.startsWith("Drift "))).toBe(true);
  expect(first.proposals).toHaveLength(5);

  // Every file once: no path was parsed twice, and every card file the project holds was read.
  expect(new Set(parsed).size).toBe(parsed.length);
  expect(parsed.length).toBe(cache.parsed);
  const files = documents(p.dir);
  for (const file of files) expect(parsed).toContain(file);
  expect(cache.size).toBe(parsed.length);

  const statted = cache.statted;
  const second = buildSnapshot(p, [], [], [], cache);
  expect(cache.parsed).toBe(parsed.length);
  expect(parsed).toHaveLength(cache.parsed);
  // The second picture only stats: each file it needs, once.
  expect(cache.statted - statted).toBe(cache.size);
  expect(second).toEqual(first);
});

test("the picture built with the cache equals the one built without it, field by field", () => {
  const p = projectAt(root);
  const cache = new DocumentCache();
  const without = buildSnapshot(p);
  expect(buildSnapshot(p, [], [], [], cache)).toEqual(without);
  expect(buildSnapshot(p, [], [], [], cache)).toEqual(without);
});

test("a file rewritten with the same size is read again, and a deleted card leaves the picture", () => {
  const p = projectAt(root);
  const parsed: string[] = [];
  const cache = new DocumentCache((path) => void parsed.push(path));
  buildSnapshot(p, [], [], [], cache);
  parsed.length = 0;

  const name = readdirSync(join(p.dir, "drifts")).find((file) => file.startsWith(id("d", 100)));
  const file = join(p.dir, "drifts", name as string);
  const text = readFileSync(file, "utf8");
  const rewritten = text.replace("# Drift 100\n", "# Drift 1X0\n");
  expect(rewritten.length).toBe(text.length);
  writeFileSync(file, rewritten);
  // The editor's file clock may be too coarse to tell two writes of one test apart: the rewrite is made later.
  const later = new Date(Date.now() + 5000);
  utimesSync(file, later, later);

  const changed = buildSnapshot(p, [], [], [], cache);
  expect(parsed).toEqual([file]);
  expect([...changed.drifts, ...changed.unifiedDrifts].find((d) => d.id === id("d", 100))?.title).toBe("Drift 1X0");

  const gone = readdirSync(join(p.dir, "drifts")).find((entry) => entry.startsWith(id("d", 200))) as string;
  const size = cache.size;
  rmSync(join(p.dir, "drifts", gone));
  parsed.length = 0;
  const after = buildSnapshot(p, [], [], [], cache);
  expect([...after.drifts, ...after.unifiedDrifts].some((d) => d.id === id("d", 200))).toBe(false);
  expect(parsed).toEqual([]);
  expect(cache.size).toBe(size - 1);
});

test("a card that cannot be read fails the picture, as without the cache, and is read again at the next one", () => {
  const p = projectAt(root);
  const cache = new DocumentCache();
  buildSnapshot(p, [], [], [], cache);
  const file = join(p.dir, "drifts", readdirSync(join(p.dir, "drifts")).find((entry) => entry.startsWith(id("d", 150))) as string);
  const text = readFileSync(file, "utf8");
  writeFileSync(file, "no front matter\n");
  expect(() => buildSnapshot(p, [], [], [], cache)).toThrow(/missing YAML front matter/);
  writeFileSync(file, text);
  const later = new Date(Date.now() + 10_000);
  utimesSync(file, later, later);
  expect(buildSnapshot(p, [], [], [], cache).drifts.some((d) => d.id === id("d", 150))).toBe(true);
});
