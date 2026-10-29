import { afterAll, beforeAll, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DocumentCache } from "../src/core/document-cache";
import { buildSnapshot } from "../src/core/snapshot";
import { projectAt, writeDocument } from "../src/core/store";
import { noteRemoved, onFileWritten } from "../src/core/written";
import { copyShop } from "./shop-project";

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
  copyShop(root);
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
const copies: string[] = [];
beforeAll(() => {
  root = bigProject();
});
afterAll(() => {
  rmSync(root, { recursive: true, force: true });
  for (const copy of copies) rmSync(copy, { recursive: true, force: true });
});

/** A project of its own for a test that changes files. */
function copyOfBig(): string {
  const copy = mkdtempSync(join(tmpdir(), "trama-picture-copy-"));
  cpSync(root, copy, { recursive: true });
  copies.push(copy);
  return copy;
}

const documents = (dir: string): string[] =>
  ["drifts", "tasks", "history"].flatMap((folder) => readdirSync(join(dir, folder)).map((name) => join(dir, folder, name)))
    .concat(readdirSync(join(dir, "proposals")).flatMap((name) => [join(dir, "proposals", name, "proposal.md"), ...readdirSync(join(dir, "proposals", name, "tasks")).map((file) => join(dir, "proposals", name, "tasks", file))]));

const driftFile = (dir: string, n: number): string => join(dir, ".trama", "drifts", readdirSync(join(dir, ".trama", "drifts")).find((name) => name.startsWith(id("d", n))) as string);

/** The editor's file clock may be too coarse to tell two writes of one test apart: the rewrite is made later. */
let later = Date.now() + 60_000;
function touchLater(file: string): void {
  later += 1000;
  utimesSync(file, new Date(later), new Date(later));
}

const allDrifts = (snapshot: ReturnType<typeof buildSnapshot>) => [...snapshot.drifts, ...snapshot.unifiedDrifts];

test("a picture of a project with hundreds of Drifts reads and parses each file once, and a second one with nothing changed reads, parses, stats and lists nothing", () => {
  const p = projectAt(root);
  const parsed: string[] = [];
  const cache = new DocumentCache((path) => void parsed.push(path));
  const first = buildSnapshot(p, [], [], [], cache);
  expect(first.drifts).toHaveLength(DRIFTS - UNIFIED_TARGETS * UNIFIED_EACH);
  expect(first.unifiedDrifts).toHaveLength(UNIFIED_TARGETS * UNIFIED_EACH);
  expect(first.drifts.filter((d) => d.unifies.length === UNIFIED_EACH)).toHaveLength(UNIFIED_TARGETS);
  expect(first.unifiedDrifts.every((d) => d.unifiedInto !== null && d.unifiedInto.title.startsWith("Drift "))).toBe(true);
  expect(first.proposals).toHaveLength(5);

  // Every file once: no path was parsed twice, every card file the project holds was read, and so were the Model and Requirement files.
  expect(new Set(parsed).size).toBe(parsed.length);
  expect(parsed.length).toBe(cache.parsed);
  for (const file of documents(p.dir)) expect(parsed).toContain(file);
  expect(parsed).toContain(join(p.dir, "model", "system.md"));
  expect(parsed.some((path) => path.includes(`${join(p.dir, "requirements")}`))).toBe(true);
  expect(cache.size).toBe(parsed.length);

  const before = { parsed: cache.parsed, statted: cache.statted, listed: cache.listed, checked: cache.checked };
  const second = buildSnapshot(p, [], [], [], cache);
  expect({ parsed: cache.parsed, statted: cache.statted, listed: cache.listed, checked: cache.checked }).toEqual(before);
  expect(parsed).toHaveLength(before.parsed);
  expect(second).toEqual(first);
});

test("the picture built with the cache equals the one built without it, field by field", () => {
  const p = projectAt(root);
  const cache = new DocumentCache();
  const without = buildSnapshot(p);
  expect(buildSnapshot(p, [], [], [], cache)).toEqual(without);
  expect(buildSnapshot(p, [], [], [], cache)).toEqual(without);
});

test("a picture after the watcher reported one file stats and reads only that file", () => {
  const dir = copyOfBig();
  const p = projectAt(dir);
  const parsed: string[] = [];
  const cache = new DocumentCache((path) => void parsed.push(path));
  buildSnapshot(p, [], [], [], cache);
  parsed.length = 0;
  const before = { statted: cache.statted, listed: cache.listed };

  const file = driftFile(dir, 100);
  writeFileSync(file, readFileSync(file, "utf8").replace("# Drift 100\n", "# Drift 1X0\n"));
  touchLater(file);
  expect(cache.observe("changed", file)).toBe(true);
  const changed = buildSnapshot(p, [], [], [], cache);
  expect(parsed).toEqual([file]);
  expect(cache.statted - before.statted).toBe(1);
  expect(cache.listed).toBe(before.listed);
  expect(allDrifts(changed).find((d) => d.id === id("d", 100))?.title).toBe("Drift 1X0");

  // A Model file is read again the same way.
  const system = join(p.dir, "model", "system.md");
  parsed.length = 0;
  writeFileSync(system, "# Renamed Shop\n\nAn online shop.\n");
  touchLater(system);
  expect(cache.observe("changed", system)).toBe(true);
  expect(buildSnapshot(p, [], [], [], cache).system.name).toBe("Renamed Shop");
  expect(parsed).toEqual([system]);
});

test("a file rewritten with the same size is read again, and a deleted card leaves the picture", () => {
  const dir = copyOfBig();
  const p = projectAt(dir);
  const parsed: string[] = [];
  const cache = new DocumentCache((path) => void parsed.push(path));
  buildSnapshot(p, [], [], [], cache);
  parsed.length = 0;

  const file = driftFile(dir, 100);
  const text = readFileSync(file, "utf8");
  const rewritten = text.replace("# Drift 100\n", "# Drift 1X0\n");
  expect(rewritten.length).toBe(text.length);
  writeFileSync(file, rewritten);
  touchLater(file);
  expect(cache.observe("changed", file)).toBe(true);
  expect(allDrifts(buildSnapshot(p, [], [], [], cache)).find((d) => d.id === id("d", 100))?.title).toBe("Drift 1X0");
  expect(parsed).toEqual([file]);

  const gone = driftFile(dir, 200);
  const size = cache.size;
  const listed = cache.listed;
  rmSync(gone);
  parsed.length = 0;
  expect(cache.observe("deleted", gone)).toBe(true);
  const after = buildSnapshot(p, [], [], [], cache);
  expect(allDrifts(after).some((d) => d.id === id("d", 200))).toBe(false);
  expect(parsed).toEqual([]);
  expect(cache.size).toBe(size - 1);
  // The folder is listed again, once.
  expect(cache.listed).toBe(listed + 1);
  expect(allDrifts(after)).toHaveLength(DRIFTS - 1);
});

test("a card created while the window runs is listed and read when the watcher reports it", () => {
  const dir = copyOfBig();
  const p = projectAt(dir);
  const cache = new DocumentCache();
  buildSnapshot(p, [], [], [], cache);
  const file = join(dir, ".trama", "drifts", "ffffffff-new.md");
  writeFileSync(file, "---\nstatus: open\nrefs:\n  - order\ncreated: 2026-10-02T10:00:00.000Z\n---\n# New\n\n## What happens\n\nA.\n\n## What should happen\n\nB.\n");
  // Nobody reported it yet: the picture does not look for it.
  expect(allDrifts(buildSnapshot(p, [], [], [], cache)).some((d) => d.id === "ffffffff")).toBe(false);
  expect(cache.observe("created", file)).toBe(true);
  expect(allDrifts(buildSnapshot(p, [], [], [], cache)).some((d) => d.id === "ffffffff")).toBe(true);
});

test("events for files no picture reads, and for files already read as they are, ask for no picture", () => {
  const dir = copyOfBig();
  const p = projectAt(dir);
  const cache = new DocumentCache();
  buildSnapshot(p, [], [], [], cache);
  const file = driftFile(dir, 5);
  expect(cache.observe("changed", file)).toBe(false);
  expect(cache.observe("created", file)).toBe(false);
  expect(cache.observe("changed", join(dir, ".trama", "short-numbers", "assigned"))).toBe(false);
  expect(cache.observe("created", join(dir, ".trama", "drifts", `${file.split("/").at(-1)}.123.abc.tmp`))).toBe(false);
  expect(cache.observe("created", join(dir, ".trama", "drifts", ".gitignore"))).toBe(false);
  // A path the cache never held and the listings never named.
  expect(cache.observe("deleted", join(dir, ".trama", "drifts", "zzzzzzzz-gone.md"))).toBe(false);
  expect(cache.pending).toBe(false);
});

test("an action that writes files gives one picture: the cache is told of the writes, and the watcher events that follow ask for nothing", () => {
  const dir = copyOfBig();
  const p = projectAt(dir);
  const cache = new DocumentCache();
  const subscription = onFileWritten((kind, path) => (kind === "written" ? cache.written(path) : cache.removed(path)));
  try {
    buildSnapshot(p, [], [], [], cache);
    const before = { parsed: cache.parsed, listed: cache.listed };
    // What a core function does: it writes cards through the store, and a picture asked for at once sees them.
    const task = join(dir, ".trama", "tasks", readdirSync(join(dir, ".trama", "tasks"))[0] as string);
    const raw = readFileSync(task, "utf8");
    writeDocument(task, { column: "doing", refs: ["order"], created: instant(1) }, "# Task 1 changed\n");
    const created = join(dir, ".trama", "drifts", "eeeeeeee-fresh.md");
    writeDocument(created, { status: "open", refs: ["order"], created: instant(500) }, "# Fresh\n\n## What happens\n\nA.\n\n## What should happen\n\nB.\n");
    const removed = driftFile(dir, 150);
    rmSync(removed);
    noteRemoved(removed);
    expect(raw).not.toBe(readFileSync(task, "utf8"));

    const picture = buildSnapshot(p, [], [], [], cache);
    expect(picture.tasks.find((t) => t.file.endsWith(task.split("/").at(-1) as string))?.title).toBe("Task 1 changed");
    expect(allDrifts(picture).some((d) => d.id === "eeeeeeee")).toBe(true);
    expect(allDrifts(picture).some((d) => d.id === id("d", 150))).toBe(false);
    // The task and the new drift are read again; the folder of the Drifts, which changed, is listed again.
    expect(cache.parsed - before.parsed).toBe(2);
    expect(cache.listed - before.listed).toBe(1);

    // The watcher reports the same writes afterwards: every file was read as it is now, so no second picture is asked for.
    expect(cache.observe("changed", task)).toBe(false);
    expect(cache.observe("created", created)).toBe(false);
    expect(cache.observe("deleted", removed)).toBe(false);
    expect(cache.pending).toBe(false);
  } finally {
    subscription.dispose();
  }
});

test("a file changed without a watcher event shows after the full check, which reads only what changed and says whether anything did", async () => {
  const dir = copyOfBig();
  const p = projectAt(dir);
  const parsed: string[] = [];
  const cache = new DocumentCache((path) => void parsed.push(path));
  buildSnapshot(p, [], [], [], cache);
  parsed.length = 0;
  expect(await cache.verify(p.dir)).toBe(false);
  expect(parsed).toEqual([]);

  const file = driftFile(dir, 120);
  writeFileSync(file, readFileSync(file, "utf8").replace("# Drift 120\n", "# Drift 1Y0\n"));
  touchLater(file);
  const gone = driftFile(dir, 130);
  rmSync(gone);
  const system = join(p.dir, "model", "system.md");
  writeFileSync(system, "# Checked Shop\n\nAn online shop.\n");
  touchLater(system);
  // Nothing reported: the picture still shows the old files.
  const stale = buildSnapshot(p, [], [], [], cache);
  expect(allDrifts(stale).find((d) => d.id === id("d", 120))?.title).toBe("Drift 120");
  expect(stale.system.name).toBe("Shop");

  const statted = cache.statted;
  expect(await cache.verify(p.dir)).toBe(true);
  expect(new Set(parsed)).toEqual(new Set([file, system]));
  const shown = buildSnapshot(p, [], [], [], cache);
  expect(allDrifts(shown).find((d) => d.id === id("d", 120))?.title).toBe("Drift 1Y0");
  expect(allDrifts(shown).some((d) => d.id === id("d", 130))).toBe(false);
  expect(shown.system.name).toBe("Checked Shop");
  // The picture after the check stats and reads nothing more: the check did it, asynchronously.
  expect(cache.statted).toBe(statted);
  expect(parsed).toHaveLength(2);
  expect(await cache.verify(p.dir)).toBe(false);
});

test("the first full check of a window fills the cache without a synchronous read, and the picture built from it equals the one built without", async () => {
  const dir = copyOfBig();
  const p = projectAt(dir);
  const cache = new DocumentCache();
  expect(await cache.verify(p.dir)).toBe(true);
  const { statted, listed } = cache;
  const warmed = buildSnapshot(p, [], [], [], cache);
  expect(cache.statted).toBe(statted);
  expect(cache.listed).toBe(listed);
  expect(warmed).toEqual(buildSnapshot(p));
});

test("a card that cannot be read fails the picture, as without the cache, and is read again when the watcher reports it", () => {
  const dir = copyOfBig();
  const p = projectAt(dir);
  const cache = new DocumentCache();
  buildSnapshot(p, [], [], [], cache);
  const file = driftFile(dir, 150);
  const text = readFileSync(file, "utf8");
  writeFileSync(file, "no front matter\n");
  touchLater(file);
  expect(cache.observe("changed", file)).toBe(true);
  expect(() => buildSnapshot(p, [], [], [], cache)).toThrow(/missing YAML front matter/);
  writeFileSync(file, text);
  touchLater(file);
  expect(cache.observe("changed", file)).toBe(true);
  expect(buildSnapshot(p, [], [], [], cache).drifts.some((d) => d.id === id("d", 150))).toBe(true);
});
