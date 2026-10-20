import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TramaError } from "../src/core/errors";
import { getTask, listTasks, newTask } from "../src/core/work";
import { run } from "../src/cli/main";
import { projectAt, type Project } from "../src/core/store";

let dir: string;
let p: Project;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-task-scope-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

/** `trama task list` with `input`, as JSON when `json`. */
const list = (input: object, json = false) => run(["--root", dir, ...(json ? ["--json"] : []), "task", "list", "--input", JSON.stringify(input)], dir);
const scope = (tasks: string[]) => list({ tasks, scope: true });

describe("task list with tasks and scope", () => {
  test("unions and deduplicates refs, includes entering and reacting Transitions, and is read-only", () => {
    const a = newTask(p, { title: "Order", refs: ["order/Paid"], technical: false });
    const b = newTask(p, { title: "Event", refs: ["user.CANCEL", "order/Paid"], technical: false });
    const c = newTask(p, { title: "Transition", refs: ["order/Paid/user.CANCEL"], technical: false });
    const before = listTasks(p).map((task) => readFileSync(task.path, "utf8"));
    const output = scope(["T1", b.id]);
    const entries = JSON.parse(list({ tasks: [a.id, "T2", c.id], scope: true }, true).out) as { ref: string; reason: string }[];
    expect(output.out).toContain("## Scan scope");
    expect(entries.filter((entry) => entry.ref === "order/Paid")).toEqual([{ ref: "order/Paid", reason: "changed" }]);
    expect(entries).not.toContainEqual({ ref: "order/Paid/user.CANCEL", reason: "changed" });
    expect(entries.filter((entry) => entry.ref === "user.CANCEL")).toEqual([{ ref: "user.CANCEL", reason: "changed" }]);
    expect(listTasks(p).map((task) => readFileSync(task.path, "utf8"))).toEqual(before);
    expect(getTask(p, a.id).data.column).toBe("todo");
  });

  test("a named Machine brings its States, Transitions and Events with it", () => {
    const m = newTask(p, { title: "Machine", refs: ["order"], technical: false });
    expect(JSON.parse(list({ tasks: [m.id], scope: true }, true).out)).toEqual([{ ref: "order", reason: "changed" }]);
  });

  test("Requirement sections count, a named General section enters as changed, Area alone adds nothing; supports short and permanent IDs", () => {
    const req = newTask(p, { title: "Requirement", refs: ["requirements/ui#checkout"], technical: true });
    const general = newTask(p, { title: "General", refs: ["requirements/ui#General"], technical: true });
    const area = newTask(p, { title: "Area only", refs: ["requirements/ui"], technical: true });
    expect(scope(["T1", req.id]).out).toContain("`checkout` (changed)");
    expect(JSON.parse(list({ tasks: [general.id], scope: true }, true).out)).toEqual([{ ref: "requirements/ui#General", reason: "changed" }]);
    expect(list({ tasks: [area.id], scope: true }, true).out).toBe("[]");
    expect(scope([area.id]).out).toContain("_Nothing to scan._");
  });

  test("a missing Task is a usage error, scope without runnable needs tasks, and the text output lists the scope", () => {
    expect(() => scope(["not-a-task"])).toThrow(/Task .* was not found/);
    newTask(p, { title: "Task", refs: ["order/Paid"], technical: false });
    expect(scope(["T1"]).out).toContain("changed");
    expect(() => list({ scope: true })).toThrow(/tasks: is required with scope unless runnable is true/);
  });

  test("a malformed existing Task remains an operational error", () => {
    const task = newTask(p, { title: "Broken", refs: ["order/Paid"], technical: false });
    writeFileSync(task.path, "---\nrefs: broken\n---\n# Broken\n");
    expect(() => scope([task.id])).toThrow(TramaError);
  });

  test("runnable with scope names each runnable Task's exact references once, without added Transitions, General sections or Areas", () => {
    newTask(p, { title: "Order", refs: ["order/Paid", "requirements/ui#checkout", "requirements/ui#General"], technical: false });
    newTask(p, { title: "Other", refs: ["order/Paid", "order/Paid/user.CANCEL", "requirements/ui"], technical: false });
    const json = JSON.parse(list({ runnable: true, scope: true }, true).out) as { refs: { ref: string }[]; alreadyCompared: unknown[]; tasks: { number: string }[] };
    expect(json.refs.map((r) => r.ref).sort()).toEqual(["checkout", "order/Paid", "order/Paid/user.CANCEL"]);
    expect(json.alreadyCompared).toEqual([]);
    expect(json.tasks.map((t) => t.number)).toEqual(["T1", "T2"]);
    expect(list({ runnable: true, scope: true }).out).toContain("`order/Paid/user.CANCEL`");
    expect(() => list({ runnable: true, scope: true, max: 2 })).toThrow(/max: does not apply with scope/);
  });
});
