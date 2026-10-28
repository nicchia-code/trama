import { FIX_OPTIONS } from "./fix-options";
import { afterEach, beforeEach, expect, test } from "bun:test";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { clearDoneTasks } from "../src/core/clear-done";
import { deleteTask, tasksHeldByDrifts } from "../src/core/delete-task";
import { approveProposal, getProposal, newProposal, save } from "../src/core/proposals";
import { buildSnapshot } from "../src/core/snapshot";
import { type Project, projectAt } from "../src/core/store";
import { blockedTasks, dismissDrift, type DifferenceInput, type Drift, getDrift, getTask, listDrifts, moveTask, newDrift, newTask, newUnifiedDrift } from "../src/core/work";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-task-differences-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const filing = { where: "src/refund.ts", options: FIX_OPTIONS, happens: "The code does it one way.", should: "The Model says another." };
const drift = (title: string, extra: { origin?: string; refs?: string[] } = {}) => newDrift(p, { ...filing, title, refs: extra.refs ?? ["order/Paid"], ...extra });
const diff = (d: Drift, extra: Partial<DifferenceInput> = {}): DifferenceInput => ({ drift: d.id, title: d.title, refs: d.data.refs, happens: `${d.title} happens.`, should: `${d.title} should happen.`, where: "src/refund.ts", options: FIX_OPTIONS, ...extra });
const task = (title: string, refs = ["order/Paid"]) => newTask(p, { title, refs, technical: false }).id;
const cli = (...args: string[]) => run(["--root", dir, ...args], process.cwd(), {});

/**
 * A unified Drift of three differences, A and B linked, each with its own origin Task; a resolution fixes A and B in the code
 * (one shared fix Task) and leaves C open, so the Drift stays Open.
 */
function setup() {
  const t1 = task("One");
  const t2 = task("Two");
  const t3 = task("Three", ["order/Shipped"]);
  const a = drift("A", { origin: t1 });
  const b = drift("B", { origin: t2 });
  const c = drift("C", { origin: t3, refs: ["order/Shipped"] });
  const { drift: merged } = newUnifiedDrift(p, { title: "All of them", unifies: [a.id, b.id, c.id], differences: [diff(a), diff(b, { linked: [a.id] }), diff(c)] });
  const r = newProposal(p, "Resolve the differences", "", { kind: "resolution" });
  const written = getProposal(p, r.id);
  written.data.drifts = [
    { drift: merged.id, difference: a.id, decision: "fix-code", option: 1 },
    { drift: merged.id, difference: b.id, decision: "fix-code", option: 2, note: "soon" },
  ];
  written.data.status = "open";
  save(written);
  approveProposal(p, r.id);
  const fix = getDrift(p, merged.id).data.differences[0]?.task as string;
  return { t1, t2, t3, a, b, c, merged, fix, resolutionId: r.id };
}

test("closing the fix Task of differences without changes dismisses its differences, keeps their choice, and leaves the Drift as it is", () => {
  const { t1, t3, merged, fix, resolutionId } = setup();
  moveTask(p, fix, "done", "developer", {}, "  Both already behave.  ");
  expect(getTask(p, fix).data).toMatchObject({ column: "done", unchanged: "Both already behave." });
  const read = getDrift(p, merged.id);
  expect(read.data).toMatchObject({ status: "open", resolution: null });
  const [da, db, dc] = read.data.differences;
  expect(da).toMatchObject({ decision: "dismissed", task: fix, option: 1, note: null, resolvedBy: resolutionId });
  expect(db).toMatchObject({ decision: "dismissed", task: fix, option: 2, note: "soon", resolvedBy: resolutionId });
  expect(dc).toMatchObject({ decision: null, task: null });
  // The origins of the closed differences are free; the one of the open difference stays blocked.
  const blocked = blockedTasks(p);
  expect(blocked.has(t1)).toBe(false);
  expect(blocked.get(t3)?.[0]).toMatchObject({ kind: "drift", drift: merged.id });
});

test("the command line says the differences are closed, and the Drift is not dismissed", () => {
  const { merged, fix } = setup();
  const out = cli("task", "move", fix, "done", "--input", JSON.stringify({ unchanged: "Checked." })).out;
  expect(out).toContain("closed without changes");
  expect(out).not.toContain("dismissed");
  expect(getDrift(p, merged.id).data.resolution).toBeNull();
});

test("the Task closes again after leaving Done, and the differences stay closed", () => {
  const { merged, fix } = setup();
  moveTask(p, fix, "done", "developer", {}, "Checked.");
  moveTask(p, fix, "todo", "developer");
  expect(getTask(p, fix).data.unchanged).toBeNull();
  expect(getDrift(p, merged.id).data.differences.map((d) => d.decision)).toEqual(["dismissed", "dismissed", null]);
  moveTask(p, fix, "done", "developer", {}, "Checked again.");
  expect(getTask(p, fix).data).toMatchObject({ column: "done", unchanged: "Checked again." });
});

test("a Task that fixes no difference of the Drift, an empty note and a Task already Done are refused and change nothing", () => {
  const { merged, fix } = setup();
  const stray = newTask(p, { title: "stray", refs: ["order/Paid"], technical: false, drift: merged.id }).id;
  expect(() => moveTask(p, stray, "done", "developer", {}, "Checked.")).toThrow("fixes no difference");
  expect(getTask(p, stray).data.column).toBe("todo");
  expect(() => moveTask(p, fix, "done", "developer", {}, "  ")).toThrow("needs a note");
  expect(getDrift(p, merged.id).data.differences.map((d) => d.decision)).toEqual(["fix-code", "fix-code", null]);
  moveTask(p, fix, "done", "developer", {}, "Checked.");
  expect(() => moveTask(p, fix, "done", "developer", {}, "Again.")).toThrow("already Done");
});

test("a Task is not deleted while it fixes a difference in the code, and its origins are held only while their difference is open", () => {
  const { t1, t3, merged, fix } = setup();
  expect(tasksHeldByDrifts(listDrifts(p)).get(fix)).toMatchObject({ drift: merged.id, why: "fix" });
  expect(() => deleteTask(p, fix)).toThrow("fixes the code of a difference");
  expect(buildSnapshot(p).tasks.find((t) => t.id === fix)?.heldByDrift).toBe(true);
  // The origin of the open difference is held; the one of a difference decided is not.
  expect(() => deleteTask(p, t3)).toThrow("origin of the open Drift");
  expect(tasksHeldByDrifts(listDrifts(p)).has(t1)).toBe(false);
  deleteTask(p, t1);
  expect(buildSnapshot(p).tasks.some((t) => t.id === t1)).toBe(false);
  // Once its differences are closed without changes the Task is no longer held.
  moveTask(p, fix, "done", "developer", {}, "Checked.");
  moveTask(p, fix, "todo", "developer");
  expect(tasksHeldByDrifts(listDrifts(p)).has(fix)).toBe(false);
  deleteTask(p, fix);
  expect(buildSnapshot(p).tasks.some((t) => t.id === fix)).toBe(false);
});

test("Clear leaves the Task of a difference of an open Drift and the origin of an open difference, and takes them once the Drift is closed", () => {
  const { t1, t3, merged, fix } = setup();
  moveTask(p, t3, "done", "developer");
  moveTask(p, t1, "done", "developer");
  moveTask(p, fix, "done", "developer", {}, "Checked.");
  expect(clearDoneTasks(p, [fix, t1, t3])).toEqual([t1]);
  dismissDrift(p, merged.id);
  expect(clearDoneTasks(p, [fix, t3])).toEqual([fix, t3]);
});
