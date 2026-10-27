import { afterEach, beforeEach, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { clearDoneTasks } from "../src/core/clear-done";
import { addHistory, getHistory, updateHistory } from "../src/core/history";
import { clearedSince, readLastScan, writeLastScan } from "../src/core/last-scan";
import { writeProgress } from "../src/core/progress";
import { buildSnapshot } from "../src/core/snapshot";
import { type Project, projectAt } from "../src/core/store";
import { blockedTasks, dismissDrift, getDrift, getTaskOrNull, listTasks, newDrift, originDesign } from "../src/core/work";
import { copyShop } from "./shop-project";

let dir: string;
let p: Project;

const SCAN = "2026-10-01T10:00:00.000Z";
const AFTER = "2026-10-02T10:00:00.000Z";
const BEFORE = "2026-09-01T10:00:00.000Z";
const options = [{ title: "Fix", text: "Fix the code." }, { title: "Other", text: "Another way." }];

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-clear-done-"));
  copyShop(dir);
  p = projectAt(dir);
  writeLastScan(p, SCAN);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const cli = (...args: string[]) => run(["--root", dir, ...args], dir, {});

function card(folder: string, name: string, front: string, body: string): void {
  mkdirSync(join(p.dir, folder), { recursive: true });
  writeFileSync(join(p.dir, folder, name), `---\n${front}\n---\n${body}`);
}
const done = (id: string, title: string, finished: string, extra = "") => card("tasks", `${id}-${title.toLowerCase().replace(/\W+/g, "-")}.md`, `column: done\ntechnical: false\nrefs: [order/Paid]\nfinished: ${finished}\n${extra}`.trimEnd(), `# ${title}\n\nBody.\n`);
const exists = (id: string) => getTaskOrNull(p, id) !== null;

test("deletes the file, the percentage and the images of a Done Task, and nothing else", () => {
  done("aaaaaaaa", "First", BEFORE);
  done("bbbbbbbb", "Second", BEFORE);
  writeProgress(p, "aaaaaaaa", 50);
  mkdirSync(join(p.dir, "task-images/aaaaaaaa"), { recursive: true });
  writeFileSync(join(p.dir, "task-images/aaaaaaaa/a.png"), "x");
  expect(clearDoneTasks(p, ["aaaaaaaa"])).toEqual(["aaaaaaaa"]);
  expect(exists("aaaaaaaa")).toBe(false);
  expect(exists("bbbbbbbb")).toBe(true);
  expect(existsSync(join(p.dir, "progress/aaaaaaaa"))).toBe(false);
  expect(existsSync(join(p.dir, "task-images/aaaaaaaa"))).toBe(false);
});

test("ignores a Task that left Done, one that never existed, and keeps the Tasks an open Drift names as origin or fix", () => {
  card("tasks", "cccccccc-todo.md", "column: todo\ntechnical: true\nrefs: []", "# Todo\n");
  done("dddddddd", "Origin one", BEFORE);
  done("eeeeeeee", "Plain", BEFORE);
  const drift = newDrift(p, { title: "D", refs: ["order"], origin: "dddddddd", happens: "H.", should: "S.", options, where: "src" });
  card("drifts", "ffffffff-fix.md", "status: open\nrefs: [order]\ntask: eeeeeeee", "# Fix side\n");
  expect(clearDoneTasks(p, ["cccccccc", "dddddddd", "eeeeeeee", "zzzzzzzz"])).toEqual([]);
  expect(listTasks(p).map((t) => t.id).sort()).toEqual(["cccccccc", "dddddddd", "eeeeeeee"]);
  // Once the Drifts are closed the next Clear deletes them.
  dismissDrift(p, drift.id);
  rmSync(join(p.dir, "drifts/ffffffff-fix.md"));
  expect(clearDoneTasks(p, ["dddddddd", "eeeeeeee"])).toEqual(["dddddddd", "eeeeeeee"]);
});

test("a Task closed without changes is deleted too", () => {
  done("aaaaaaaa", "Unchanged", AFTER, 'unchanged: "already right"');
  expect(clearDoneTasks(p, ["aaaaaaaa"])).toEqual(["aaaaaaaa"]);
  expect(exists("aaaaaaaa")).toBe(false);
  expect(clearedSince(p, Date.parse(SCAN))).toBe(0);
});

test("writes the copy in every entry that cites the Task before deleting it, and never rewrites it", () => {
  card("proposals/pppppppp-refunds", "proposal.md", "status: approved\nlabel: Refunds", "# Refunds Proposal\n");
  done("aaaaaaaa", "First", BEFORE, "proposal: pppppppp");
  done("bbbbbbbb", "Second", BEFORE);
  const one = addHistory(p, { title: "One", summary: "S.", tasks: ["aaaaaaaa", "bbbbbbbb"] });
  const two = addHistory(p, { title: "Two", summary: "S.", tasks: ["aaaaaaaa"] });
  const untouched = addHistory(p, { title: "Three", summary: "S.", tasks: ["bbbbbbbb"] });
  const updated = getHistory(p, one.id).updated;
  clearDoneTasks(p, ["aaaaaaaa"]);
  for (const id of [one.id, two.id]) {
    const entry = getHistory(p, id);
    expect(entry.tasks).toContain("aaaaaaaa");
    expect(Object.keys(entry.cleared)).toEqual(["aaaaaaaa"]);
    expect(entry.cleared["aaaaaaaa"]).toEqual({ title: "First", proposal: "pppppppp", tag: expect.any(String), finished: expect.any(String), refs: ["order/Paid"] });
  }
  expect(getHistory(p, one.id).updated).toBe(updated);
  expect(readFileSync(untouched.path, "utf8")).not.toContain("cleared");
  // The copy is kept as it is by every later update, and clearing the other Task adds its own copy only.
  updateHistory(p, one.id, { title: "One again", tasks: [] });
  const before = getHistory(p, one.id).cleared["aaaaaaaa"];
  clearDoneTasks(p, ["bbbbbbbb"]);
  expect(getHistory(p, one.id).cleared["aaaaaaaa"]).toEqual(before);
  expect(Object.keys(getHistory(p, one.id).cleared).sort()).toEqual(["aaaaaaaa", "bbbbbbbb"]);
  expect(getHistory(p, one.id).title).toBe("One again");
});

test("one call that clears several Tasks cited by the same entry keeps every copy, the entries and Proposals being read once", () => {
  card("proposals/pppppppp-refunds", "proposal.md", "status: approved\nlabel: Refunds", "# Refunds Proposal\n");
  done("aaaaaaaa", "First", BEFORE, "proposal: pppppppp");
  done("bbbbbbbb", "Second", BEFORE);
  done("cccccccc", "Third", BEFORE);
  const one = addHistory(p, { title: "One", summary: "S.", tasks: ["aaaaaaaa", "bbbbbbbb", "cccccccc"] });
  const two = addHistory(p, { title: "Two", summary: "S.", tasks: ["bbbbbbbb"] });
  const updated = getHistory(p, one.id).updated;
  expect(clearDoneTasks(p, ["aaaaaaaa", "bbbbbbbb", "cccccccc"])).toEqual(["aaaaaaaa", "bbbbbbbb", "cccccccc"]);
  expect(Object.keys(getHistory(p, one.id).cleared).sort()).toEqual(["aaaaaaaa", "bbbbbbbb", "cccccccc"]);
  expect(getHistory(p, one.id).cleared["aaaaaaaa"]?.tag).toEqual(expect.any(String));
  expect(Object.keys(getHistory(p, two.id).cleared)).toEqual(["bbbbbbbb"]);
  expect(getHistory(p, one.id).updated).toBe(updated);
  expect(getHistory(p, one.id).title).toBe("One");
});

test("a Task cleared is not added to an entry any more, and the snapshot gives the copy marked as cleared", () => {
  done("aaaaaaaa", "First", BEFORE);
  const entry = addHistory(p, { title: "One", summary: "S.", tasks: ["aaaaaaaa"] });
  clearDoneTasks(p, ["aaaaaaaa"]);
  expect(() => addHistory(p, { title: "Late", summary: "S.", tasks: ["aaaaaaaa"] })).toThrow(/aaaaaaaa/);
  expect(() => updateHistory(p, entry.id, { tasks: ["aaaaaaaa"] })).not.toThrow();
  const view = buildSnapshot(p).history.find((h) => h.id === entry.id);
  expect(view?.tasks).toEqual([expect.objectContaining({ id: "aaaaaaaa", exists: false, cleared: true, title: "First", finished: expect.any(String), refs: ["order/Paid"] })]);
});

test("history show prints a cleared Task from its copy, and one with no copy stays no longer exists", () => {
  done("aaaaaaaa", "First", BEFORE);
  done("bbbbbbbb", "Second", BEFORE);
  const entry = addHistory(p, { title: "One", summary: "S.", tasks: ["aaaaaaaa", "bbbbbbbb"] });
  clearDoneTasks(p, ["aaaaaaaa"]);
  rmSync(join(p.dir, "tasks/bbbbbbbb-second.md"));
  const md = cli("history", "show", entry.id).out;
  expect(md).toContain("- aaaaaaaa: First (cleared)");
  expect(md).toContain("- bbbbbbbb: Task no longer exists");
  const json = JSON.parse(cli("--json", "history", "show", entry.id).out);
  expect(json.tasks[0]).toMatchObject({ id: "aaaaaaaa", exists: false, cleared: true, title: "First", copy: { title: "First", refs: ["order/Paid"] } });
  expect(json.tasks[1]).toMatchObject({ id: "bbbbbbbb", exists: false, cleared: false, copy: null });
});

test("the Scan count keeps Tasks finished after the scan that were cleared, until the next scan launch", () => {
  done("aaaaaaaa", "After", AFTER);
  done("bbbbbbbb", "Before", BEFORE);
  done("cccccccc", "Kept", AFTER);
  expect(buildSnapshot(p).tasksSinceScan).toBe(2);
  clearDoneTasks(p, ["aaaaaaaa", "bbbbbbbb"]);
  expect(readFileSync(join(p.dir, "last-scan/cleared"), "utf8")).toBe(`aaaaaaaa ${AFTER}\n`);
  expect(buildSnapshot(p).tasksSinceScan).toBe(2);
  // A line that does not read is ignored; every other line counts, whatever the identity of its Task.
  writeFileSync(join(p.dir, "last-scan/cleared"), `aaaaaaaa ${AFTER}\nnonsense\n0007 2026-10-03T10:00:00.000Z\nbbbbbbbb not-a-date\ncccccccc ${BEFORE}\n`);
  expect(clearedSince(p, Date.parse(SCAN))).toBe(2);
  writeLastScan(p, "2026-10-05T10:00:00.000Z");
  expect(existsSync(join(p.dir, "last-scan/cleared"))).toBe(false);
  expect(readFileSync(join(p.dir, "last-scan/.gitignore"), "utf8")).toBe("*\n");
  expect(buildSnapshot(p).tasksSinceScan).toBe(0);
  expect(readLastScan(p)).toBe("2026-10-05T10:00:00.000Z");
});

test("a failed write stops before deleting that Task, says which Task and why, and keeps the Tasks already deleted", () => {
  done("aaaaaaaa", "Old", BEFORE);
  done("bbbbbbbb", "New", AFTER);
  done("cccccccc", "Later", AFTER);
  const entry = addHistory(p, { title: "One", summary: "S.", tasks: ["bbbbbbbb"] });
  mkdirSync(join(p.dir, "last-scan/cleared"));
  expect(() => clearDoneTasks(p, ["aaaaaaaa", "bbbbbbbb", "cccccccc"])).toThrow(/Task bbbbbbbb was not deleted: could not remember it for the Scan count/);
  expect(exists("aaaaaaaa")).toBe(false);
  expect(exists("bbbbbbbb")).toBe(true);
  expect(exists("cccccccc")).toBe(true);
  // Its copy was written before the failing step, and stays.
  expect(getHistory(p, entry.id).cleared["bbbbbbbb"]?.title).toBe("New");
});

test("readers show a deleted Task by its identity: the Drift it dismissed, the origin's design, the fix Task it waited for", () => {
  done("aaaaaaaa", "Origin", BEFORE, "proposal: pppppppp");
  card("proposals/pppppppp-design", "proposal.md", "status: approved", "# Design\n");
  const drift = newDrift(p, { title: "D", refs: ["order"], origin: "aaaaaaaa", happens: "H.", should: "S.", options, where: "src" });
  expect(originDesign(p, [drift.id])).toBeNull();
  card("tasks", "fixfix00-fix.md", `column: done\ntechnical: true\nrefs: []\nfinished: ${AFTER}\nunchanged: checked\ndrift: ${drift.id}`, "# Fix\n");
  const file = join(p.dir, "drifts", getDrift(p, drift.id).name);
  const text = readFileSync(file, "utf8").replace(/^status: .*$/m, "status: resolved").replace(/^resolution: .*$/m, "resolution: dismissed").replace(/^task: .*$/m, "task: fixfix00");
  writeFileSync(file, text);
  expect(cli("drift", "show", drift.id).out).toContain("Dismissed by Task fixfix00 without changes");
  clearDoneTasks(p, ["fixfix00", "aaaaaaaa"]);
  expect(originDesign(p, ["aaaaaaaa"])).toBeNull();
  const shown = cli("drift", "show", drift.id).out;
  expect(shown).toContain("Dismissed by Task fixfix00 (no longer exists) without changes");
  expect(shown).toContain("Task fixfix00 no longer exists.");
  expect(shown).toContain("Task: fixfix00 (no longer exists)");
  expect(blockedTasks(p).size).toBe(0);
  expect(cli("project", "show").exit).toBe(0);
});

test("a Task cleared while a scan runs keeps counting after that scan is delivered, and older ones stop", () => {
  done("aaaaaaaa", "Before launch", AFTER);
  done("bbbbbbbb", "During scan", "2026-10-04T10:00:00.000Z");
  clearDoneTasks(p, ["aaaaaaaa", "bbbbbbbb"]);
  writeLastScan(p, "2026-10-03T10:00:00.000Z");
  expect(readFileSync(join(p.dir, "last-scan/cleared"), "utf8")).toBe("bbbbbbbb 2026-10-04T10:00:00.000Z\n");
  expect(buildSnapshot(p).tasksSinceScan).toBe(1);
});
