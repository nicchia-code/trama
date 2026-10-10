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

const cli = (...args: string[]) => run(["--root", dir, ...args], dir);

describe("task scope", () => {
  test("unions and deduplicates refs, includes entering and reacting Transitions, and is read-only", () => {
    const a = newTask(p, { title: "Order", refs: ["order/Paid"], technical: false });
    const b = newTask(p, { title: "Event", refs: ["user.CANCEL", "order/Paid"], technical: false });
    const c = newTask(p, { title: "Transition", refs: ["order/Paid/user.CANCEL"], technical: false });
    const before = listTasks(p).map((task) => readFileSync(task.path, "utf8"));
    const output = cli("task", "scope", "T1", b.id);
    const scope = JSON.parse(cli("--json", "task", "scope", a.id, "T2", c.id).out) as { ref: string; reason: string }[];
    expect(output.out).toContain("## Scan scope");
    expect(scope.filter((entry) => entry.ref === "order/Paid")).toEqual([{ ref: "order/Paid", reason: "changed" }]);
    expect(scope).toContainEqual({ ref: "order/Paid/user.CANCEL", reason: "changed" });
    expect(scope.filter((entry) => entry.ref === "user.CANCEL")).toEqual([{ ref: "user.CANCEL", reason: "changed" }]);
    expect(listTasks(p).map((task) => readFileSync(task.path, "utf8"))).toEqual(before);
    expect(getTask(p, a.id).data.column).toBe("todo");
  });

  test("Requirement sections count; Area and General add nothing; supports short and permanent IDs", () => {
    const req = newTask(p, { title: "Requirement", refs: ["requirements/ui#checkout"] , technical: true });
    const empty = newTask(p, { title: "Area only", refs: ["requirements/ui", "requirements/ui#General"] , technical: true });
    const reqOutput = cli("task", "scope", "T1", req.id).out;
    expect(reqOutput).toContain("`checkout` (changed)");
    expect(cli("--json", "task", "scope", empty.id).out).toBe("[]");
  });

  test("missing Task is a usage error and text output lists the scope", () => {
    expect(() => cli("task", "scope", "not-a-task")).toThrow(/Task .* was not found/);
    newTask(p, { title: "Task", refs: ["order/Paid"], technical: false });
    expect(cli("task", "scope", "T1").out).toContain("changed");
  });
 
  test("a malformed existing Task remains an operational error", () => {
    const task = newTask(p, { title: "Broken", refs: ["order/Paid"], technical: false });
    writeFileSync(task.path, "---\nrefs: broken\n---\n# Broken\n");
    expect(() => cli("task", "scope", task.id)).toThrow(TramaError);
  });
});
