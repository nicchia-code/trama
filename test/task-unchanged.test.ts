import { FIX_OPTIONS } from "./fix-options";
import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { writeLastScan } from "../src/core/last-scan";
import { buildSnapshot } from "../src/core/snapshot";
import { type Project, projectAt } from "../src/core/store";
import { blockedTasks, getDrift, getTask, moveTask, newDrift, newTask, resolveDrift } from "../src/core/work";
import { copyShop } from "./shop-project";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-"));
  copyShop(dir);
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

/** A fix Task: a Drift on an origin Task, fixed in the code. Returns the origin, the Drift and the fix Task IDs. */
function fixTask() {
  const origin = newTask(p, { title: "origin", refs: ["cart"], technical: false }).id;
  const drift = newDrift(p, { options: FIX_OPTIONS, title: "d", refs: ["cart"], origin, happens: "The code does it one way.", should: "The Model says another.", where: "cart total" });
  resolveDrift(p, drift.id, "fix-code", [], { option: 1, note: "Check the cart total." });
  return { origin, drift: drift.id, fix: getDrift(p, drift.id).data.task as string };
}

test("closing a fix Task without changes makes it Done with its note and dismisses its Drift in the same step", () => {
  const { origin, drift, fix } = fixTask();
  moveTask(p, fix, "done", "developer", {}, "  The cart total already ignores nothing.  ");
  expect(getTask(p, fix).data).toMatchObject({ column: "done", unchanged: "The cart total already ignores nothing." });
  expect(getDrift(p, drift).data).toMatchObject({ status: "resolved", resolution: "dismissed", task: fix, option: 1, note: "Check the cart total." });
  expect(blockedTasks(p).has(origin)).toBe(false);
});

test("refusals change nothing: an empty note, another column, a Task fixing no Drift, a Drift not in Code to be fixed, a Task already Done", () => {
  const { drift, fix } = fixTask();
  expect(() => moveTask(p, fix, "done", "developer", {}, "   ")).toThrow("needs a note");
  expect(() => moveTask(p, fix, "doing", "developer", {}, "Checked.")).toThrow("Only a move to done");
  const plain = newTask(p, { title: "plain", refs: ["cart"], technical: false }).id;
  expect(() => moveTask(p, plain, "done", "developer", {}, "Checked.")).toThrow("does not fix a Drift");
  const open = newDrift(p, { options: FIX_OPTIONS, title: "open", refs: ["cart"], happens: "The code does it one way.", should: "The Model says another.", where: "cart total" }).id;
  const openFix = newTask(p, { title: "open fix", refs: ["cart"], technical: false, drift: open }).id;
  expect(() => moveTask(p, openFix, "done", "developer", {}, "Checked.")).toThrow("not in Code to be fixed");
  expect(getDrift(p, open).data.status).toBe("open");
  expect(getTask(p, fix).data).toMatchObject({ column: "todo", unchanged: null });
  expect(getDrift(p, drift).data.resolution).toBe("fix-code");

  moveTask(p, fix, "done", "developer", {}, "Checked.");
  expect(() => moveTask(p, fix, "done", "developer", {}, "Checked again.")).toThrow("already Done");
});

test("a Task that names the Drift but is not its registered fix Task cannot close it without changes", () => {
  const { drift, fix } = fixTask();
  const other = newTask(p, { title: "other fix", refs: ["cart"], technical: false, drift }).id;
  expect(() => moveTask(p, other, "done", "developer", {}, "Checked.")).toThrow(`only that Task can close it`);
  expect(getTask(p, other).data.column).toBe("todo");
  expect(getDrift(p, drift).data).toMatchObject({ status: "resolved", resolution: "fix-code", task: fix });
  moveTask(p, fix, "done", "developer", {}, "Checked.");
  expect(getDrift(p, drift).data.resolution).toBe("dismissed");
});

test("leaving Done forgets the note, and the Drift stays Dismissed", () => {
  const { drift, fix } = fixTask();
  moveTask(p, fix, "done", "developer", {}, "Checked.");
  moveTask(p, fix, "todo", "developer");
  expect(getTask(p, fix).data.unchanged).toBeNull();
  expect(getDrift(p, drift).data.resolution).toBe("dismissed");
});

test("a Task closed without changes is not counted in tasksSinceScan", () => {
  writeLastScan(p, "2000-01-01T00:00:00.000Z");
  const { fix } = fixTask();
  const plain = newTask(p, { title: "plain", refs: ["cart"], technical: false }).id;
  moveTask(p, plain, "done", "developer");
  moveTask(p, fix, "done", "developer", {}, "Checked.");
  expect(buildSnapshot(p).tasksSinceScan).toBe(1);
});

test("the command line marks a Task closed without changes in the list and shows its note in task show", () => {
  const { fix } = fixTask();
  moveTask(p, fix, "done", "developer", {}, "Checked the cart total.");
  expect(run(["--root", dir, "task", "list"], process.cwd()).out).toContain("(no changes)");
  const shown = run(["--root", dir, "task", "show", fix], process.cwd()).out;
  expect(shown).toContain("Closed without changes");
  expect(shown).toContain("## Check note");
  expect(shown).toContain("Checked the cart total.");
});
