import { afterEach, beforeEach, expect, test } from "bun:test";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { addHistory, getHistory, listHistory, updateHistory } from "../src/core/history";
import { rewriteNumberedCards, rewrittenId } from "../src/core/rewrite-ids";
import { buildSnapshot } from "../src/core/snapshot";
import { type Project, projectAt } from "../src/core/store";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-history-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
  writeCard("tasks", "bbbbbbbb-done.md", "column: done\ntechnical: true\nrefs: []\nfinished: 2020-06-01T00:00:00.000Z", "# Done\n\nFinished.\n");
  writeCard("tasks", "cccccccc-todo.md", "column: todo\ntechnical: true\nrefs: []", "# Todo\n\nNot yet.\n");
});
afterEach(() => {
  rmSync(`${dir}.trama-worktrees`, { recursive: true, force: true });
  rmSync(dir, { recursive: true, force: true });
});

const cli = (...args: string[]) => run(["--root", dir, ...args], dir, {});

function writeCard(folder: string, name: string, front: string, body: string): void {
  const path = join(p.dir, folder, name);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, `---\n${front}\n---\n${body}`);
}

function historyFiles(): string[] {
  const dirPath = join(p.dir, "history");
  return existsSync(dirPath) ? readdirSync(dirPath) : [];
}

test("writes an entry with a permanent identity, the slug from the title, and both instants", () => {
  const entry = addHistory(p, { title: "Checkout flow", summary: "Customers pay and get a receipt.", body: "Long text.", tasks: ["bbbbbbbb"] });
  expect(entry.id).toMatch(/^[a-z0-9]{8}$/);
  expect(historyFiles()).toEqual([`${entry.id}-checkout-flow.md`]);
  const text = readFileSync(entry.path, "utf8");
  expect(text).toContain("# Checkout flow");
  expect(text).toContain("bbbbbbbb");
  expect(entry.created).toBe(entry.updated);
  expect(getHistory(p, entry.id).tasks).toEqual(["bbbbbbbb"]);
});

test("the CLI add prints the identity and list shows the entry", () => {
  const out = cli("history", "add", "First", "--summary", "One.", "--task", "bbbbbbbb");
  expect(out.exit).toBe(0);
  expect(out.out).toMatch(/Added history entry [a-z0-9]{8}: First/);
  const list = cli("history", "list");
  expect(list.exit).toBe(0);
  expect(list.out).toContain("First");
});

test("add refuses every problem at once and writes nothing", () => {
  expect(() => cli("history", "add", "  ", "--summary", "", "--task", "cccccccc")).toThrow("the title is empty");
  expect(() => cli("history", "add", "  ", "--summary", "", "--task", "cccccccc")).toThrow("the summary is empty");
  expect(() => cli("history", "add", "  ", "--summary", "", "--task", "cccccccc")).toThrow("is not Done");
  expect(historyFiles()).toEqual([]);
});

test("add refuses a summary over 280 characters and a missing Task", () => {
  expect(() => addHistory(p, { title: "Long", summary: "x".repeat(281), tasks: ["bbbbbbbb"] })).toThrow("longer than 280");
  expect(() => addHistory(p, { title: "None", summary: "ok", tasks: [] })).toThrow("no Task is cited");
  expect(historyFiles()).toEqual([]);
});

test("a Task that is not Done is refused", () => {
  expect(() => addHistory(p, { title: "Open", summary: "ok", tasks: ["cccccccc"] })).toThrow("is not Done");
  expect(historyFiles()).toEqual([]);
});

test("update adds Tasks without duplicates, never removes one, and refreshes updated", () => {
  const entry = addHistory(p, { title: "Refunds", summary: "Money back.", tasks: ["bbbbbbbb"] });
  writeCard("tasks", "dddddddd-more.md", "column: done\ntechnical: true\nrefs: []\nfinished: 2020-06-02T00:00:00.000Z", "# More\n\nMore.\n");
  const changed = updateHistory(p, entry.id, { summary: "Money back, faster.", tasks: ["bbbbbbbb", "dddddddd"] });
  expect(changed.tasks).toEqual(["bbbbbbbb", "dddddddd"]);
  expect(getHistory(p, entry.id).summary).toBe("Money back, faster.");
  expect(Date.parse(changed.updated)).toBeGreaterThanOrEqual(Date.parse(entry.updated));
});

test("a refused update leaves the file as it was", () => {
  const entry = addHistory(p, { title: "Stable", summary: "Same.", tasks: ["bbbbbbbb"] });
  const before = readFileSync(entry.path, "utf8");
  expect(() => updateHistory(p, entry.id, { title: "", tasks: ["cccccccc"] })).toThrow("the title is empty");
  expect(readFileSync(entry.path, "utf8")).toBe(before);
});

test("ids rewrite moves the identities of cited Tasks inside History entries", () => {
  writeCard("tasks", "0003-label.md", "column: done\ntechnical: true\nrefs: []\nfinished: 2020-06-01T00:00:00.000Z", "# Label\n\nPrint it.\n");
  writeCard("history", "eeeeeeee-numbered.md", "created: 2020-01-01T00:00:00.000Z\nupdated: 2020-01-02T00:00:00.000Z\nsummary: Kept.\ntasks: [\"0003\"]", "# Numbered\n");
  rewriteNumberedCards(p);
  const entry = listHistory(p).find((e) => e.id === "eeeeeeee");
  expect(entry?.tasks).toEqual([rewrittenId("task", "0003")]);
  expect(entry?.updated).toBe("2020-01-02T00:00:00.000Z");
});

test("the snapshot marks a missing Task and reports an unreadable file apart", () => {
  const entry = addHistory(p, { title: "Snap", summary: "Seen.", tasks: ["bbbbbbbb"] });
  rmSync(join(p.dir, "tasks", "bbbbbbbb-done.md"));
  writeFileSync(join(p.dir, "history", "ffffffff-broken.md"), "no front matter\n");
  const snap = buildSnapshot(p);
  const view = snap.history.find((h) => h.id === entry.id);
  expect(view?.tasks).toEqual([expect.objectContaining({ id: "bbbbbbbb", exists: false })]);
  expect(snap.historyFaults.map((f) => f.file)).toEqual(["history/ffffffff-broken.md"]);
});

test("an unreadable History file is an error of the Snapshot, listed with the Model's errors", () => {
  mkdirSync(join(p.dir, "history"), { recursive: true });
  writeFileSync(join(p.dir, "history", "ffffffff-broken.md"), "no front matter\n");
  const snap = buildSnapshot(p);
  expect(snap.diagnostics).toContainEqual(expect.objectContaining({ file: "history/ffffffff-broken.md", message: expect.any(String) }));
});
