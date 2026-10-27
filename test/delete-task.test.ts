import { afterEach, beforeEach, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { deleteTask, tasksHeldByDrifts } from "../src/core/delete-task";
import { addHistory } from "../src/core/history";
import { readLastScan, writeLastScan } from "../src/core/last-scan";
import { writeProgress } from "../src/core/progress";
import { syncShortNumbers } from "../src/core/short-numbers";
import { buildSnapshot } from "../src/core/snapshot";
import { type Project, projectAt } from "../src/core/store";
import { blockedTasks, getDrift, getTaskOrNull, listDrifts, listTasks, moveTask, newDrift, newTask, resolveDrift } from "../src/core/work";
import { FIX_OPTIONS } from "./fix-options";
import { copyShop } from "./shop-project";

let dir: string;
let p: Project;

const SCAN = "2026-10-01T10:00:00.000Z";

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-delete-task-"));
  copyShop(dir);
  p = projectAt(dir);
  writeLastScan(p, SCAN);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const cli = (...args: string[]) => run(["--root", dir, ...args], dir, {});
const task = (title: string, refs = ["order/Paid"]) => newTask(p, { title, refs, technical: false }).id;
const exists = (id: string) => getTaskOrNull(p, id) !== null;
const drift = (origin: string | undefined, title = "D") => newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title, refs: ["order"], ...(origin === undefined ? {} : { origin }), happens: "The code does it one way.", should: "The Model says another." });
/** Every file under the project's `.trama/` folder with its text, to see that a deletion writes nothing else; the short numbers, which any read assigns, are left out. */
function tree(folder = p.dir, base = ""): Record<string, string> {
  return Object.fromEntries(readdirSync(folder, { withFileTypes: true }).filter((e) => base + e.name !== "short-numbers").flatMap((e) => (e.isDirectory() ? Object.entries(tree(join(folder, e.name), `${base}${e.name}/`)) : [[`${base}${e.name}`, readFileSync(join(folder, e.name), "utf8")] as const])));
}

test("deletes a Task in To do with its percentage and its images, and nothing else", () => {
  const id = task("Cancel order");
  const kept = task("Other");
  writeProgress(p, id, 50);
  mkdirSync(join(p.dir, "task-images", id), { recursive: true });
  writeFileSync(join(p.dir, "task-images", id, "a.png"), "x");
  const file = getTaskOrNull(p, id)?.path as string;
  const deleted = deleteTask(p, id);
  expect(deleted.id).toBe(id);
  expect(deleted.title).toBe("Cancel order");
  expect(existsSync(file)).toBe(false);
  expect(exists(id)).toBe(false);
  expect(existsSync(join(p.dir, "progress", id))).toBe(false);
  expect(existsSync(join(p.dir, "task-images", id))).toBe(false);
  expect(exists(kept)).toBe(true);
});

test("a Task that is blocked, or waits for its fix Task, is deleted like any other", () => {
  const blocked = task("Blocked", ["order"]);
  const waiting = task("Waiting", ["cart"]);
  drift(undefined, "Blocks the first");
  resolveDrift(p, drift(waiting, "Fix it").id, "fix-code", [], { option: 1 });
  expect([...blockedTasks(p).keys()]).toContain(blocked);
  expect([...blockedTasks(p).keys()]).toContain(waiting);
  deleteTask(p, blocked);
  deleteTask(p, waiting);
  expect(exists(blocked)).toBe(false);
  expect(exists(waiting)).toBe(false);
});

test("a Task that went back to To do after being taken is deleted", () => {
  const id = task("Taken once");
  moveTask(p, id, "doing", "developer");
  moveTask(p, id, "todo", "developer");
  deleteTask(p, id);
  expect(exists(id)).toBe(false);
});

test("refuses a Task In progress, a Done one and one that does not exist, deleting nothing", () => {
  const doing = task("Doing");
  const done = task("Done");
  moveTask(p, doing, "doing", "developer");
  moveTask(p, done, "done", "developer");
  const before = tree();
  expect(() => deleteTask(p, doing)).toThrow(/is not in To do \(it is doing\)/);
  expect(() => deleteTask(p, done)).toThrow(/is not in To do \(it is done\)/);
  expect(() => deleteTask(p, "zzzzzzzz")).toThrow(/does not exist/);
  expect(tree()).toEqual(before);
});

test("refuses the origin of an open Drift, also one of a unified Drift's origins, and deletes it once the Drift is closed", () => {
  const origin = task("Origin");
  const other = task("Other origin");
  const open = drift(origin);
  const before = tree();
  expect(() => deleteTask(p, origin)).toThrow(/origin of the open Drift/);
  expect(tree()).toEqual(before);
  expect(tasksHeldByDrifts(listDrifts(p)).get(origin)).toEqual({ drift: open.id, why: "origin" });
  expect(tasksHeldByDrifts(listDrifts(p)).has(other)).toBe(false);
  resolveDrift(p, open.id, "dismiss");
  expect(tasksHeldByDrifts(listDrifts(p)).size).toBe(0);
  deleteTask(p, origin);
  expect(exists(origin)).toBe(false);
});

test("refuses the Task that fixes the code of a Drift in Code to be fixed, so the correction is not lost", () => {
  const origin = task("Origin");
  const open = drift(origin);
  resolveDrift(p, open.id, "fix-code", [], { option: 1 });
  const fix = getDrift(p, open.id).data.task as string;
  expect(getTaskOrNull(p, fix)?.data.column).toBe("todo");
  const before = tree();
  expect(() => deleteTask(p, fix)).toThrow(/fixes the code of Drift .* Code to be fixed/);
  expect(tree()).toEqual(before);
  expect(tasksHeldByDrifts(listDrifts(p)).get(fix)).toEqual({ drift: open.id, why: "fix" });
  // The origin, which waits for that fix, is not held by it.
  deleteTask(p, origin);
  expect(exists(origin)).toBe(false);
  expect(exists(fix)).toBe(true);
});

test("writes nothing in History, in `.trama/last-scan/` or in any other file", () => {
  const id = task("Cited");
  moveTask(p, id, "done", "developer");
  const entry = addHistory(p, { title: "One", summary: "S.", tasks: [id] });
  moveTask(p, id, "todo", "developer");
  const entryText = readFileSync(entry.path, "utf8");
  const before = tree();
  deleteTask(p, id);
  expect(readFileSync(entry.path, "utf8")).toBe(entryText);
  expect(entryText).not.toContain("cleared");
  expect(existsSync(join(p.dir, "last-scan/cleared"))).toBe(false);
  expect(readLastScan(p)).toBe(SCAN);
  const after = tree();
  const gone = Object.keys(before).filter((file) => !(file in after));
  expect(gone).toHaveLength(1);
  expect(gone[0]).toStartWith("tasks/");
  expect(Object.keys(after).filter((file) => !(file in before))).toEqual([]);
  for (const file of Object.keys(after)) expect(after[file]).toBe(before[file]);
  expect(buildSnapshot(p).tasksSinceScan).toBe(0);
  // The entry still cites the Task, which the Snapshot shows as one that no longer exists.
  expect(buildSnapshot(p).history.find((h) => h.id === entry.id)?.tasks).toEqual([expect.objectContaining({ id, exists: false, cleared: false })]);
});

test("a Done Task that finished after the scan is not counted by deleting another Task, and the short number of the deleted one is free again", () => {
  const done = task("Finished");
  moveTask(p, done, "done", "developer");
  const gone = task("Gone");
  const number = syncShortNumbers(p).label("task", gone);
  expect(number).not.toBeNull();
  expect(buildSnapshot(p).tasksSinceScan).toBe(1);
  deleteTask(p, gone);
  expect(buildSnapshot(p).tasksSinceScan).toBe(1);
  expect(syncShortNumbers(p).label("task", gone)).toBeNull();
  const next = task("Next");
  expect(syncShortNumbers(p).label("task", next)).toBe(number);
});

test("the Snapshot says, for each Task in To do, whether a Drift holds it", () => {
  const origin = task("Origin");
  const plain = task("Plain");
  const doneOrigin = task("Done origin");
  const open = drift(origin);
  drift(doneOrigin, "Second");
  moveTask(p, doneOrigin, "done", "developer");
  const held = () => Object.fromEntries(buildSnapshot(p).tasks.map((t) => [t.id, t.heldByDrift]));
  expect(held()).toEqual({ [origin]: true, [plain]: false, [doneOrigin]: false });
  resolveDrift(p, open.id, "fix-code", [], { option: 1 });
  const fix = getDrift(p, open.id).data.task as string;
  expect(held()).toEqual({ [origin]: false, [plain]: false, [doneOrigin]: false, [fix]: true });
  moveTask(p, fix, "done", "developer");
  expect(held()[fix]).toBe(false);
});

test("trama task delete deletes the Task by its short number and prints its identity and title", () => {
  const id = task("Cancel order");
  writeProgress(p, id, 30);
  const number = syncShortNumbers(p).label("task", id) as string;
  const out = cli("task", "delete", number);
  expect(out.exit).toBe(0);
  expect(out.out).toBe(`Deleted Task ${id} "Cancel order".`);
  expect(exists(id)).toBe(false);
  expect(existsSync(join(p.dir, "progress", id))).toBe(false);
});

test("trama task delete --json prints the identity and the title, and an identity prefix names the Task", () => {
  const id = task("Cancel order");
  const out = cli("--json", "task", "delete", id.slice(0, 4));
  expect(JSON.parse(out.out)).toEqual({ id, title: "Cancel order" });
  expect(listTasks(p).map((t) => t.id)).not.toContain(id);
});

test("trama task delete runs as the agent too, with the same consequences, and reads no --input", () => {
  const id = task("Cancel order");
  const kept = task("Kept");
  expect(run(["--root", dir, "task", "delete", id], dir, { TRAMA_AGENT: "1" }).out).toBe(`Deleted Task ${id} "Cancel order".`);
  expect(exists(id)).toBe(false);
  expect(exists(kept)).toBe(true);
  expect(() => cli("task", "delete", kept, "--input", JSON.stringify({ x: 1 }))).toThrow();
  expect(exists(kept)).toBe(true);
});

test("trama task delete refuses with the reason and deletes nothing", () => {
  const origin = task("Origin");
  const doing = task("Doing");
  moveTask(p, doing, "doing", "developer");
  drift(origin);
  const before = tree();
  expect(() => cli("task", "delete", origin)).toThrow(/origin of the open Drift/);
  expect(() => cli("task", "delete", doing)).toThrow(/is not in To do \(it is doing\)/);
  expect(() => cli("task", "delete", "zzzzzzzz")).toThrow();
  expect(tree()).toEqual(before);
});

test("trama task --help lists delete, and no other object has it", () => {
  expect(cli("task", "--help").out).toMatch(/task delete <id>\s+Delete a Task in To do for good\./);
  expect(cli("--help").out).toMatch(/task\s+.*\bdelete\b/);
  for (const object of ["model", "proposal", "drift", "history", "announcement"]) expect(() => cli(object, "delete", "x")).toThrow();
});
