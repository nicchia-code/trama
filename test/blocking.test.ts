import { FIX_OPTIONS } from "./fix-options";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type Project, projectAt } from "../src/core/store";
import { blockedTasks, moveTask, newDrift, newTask, resolveDrift } from "../src/core/work";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

/** A Task naming only Requirements is technical. */
const task = (refs: string[]) => newTask(p, { title: refs.join(" "), refs, technical: refs.every((r) => r.startsWith("requirements/")) }).id;
/** The IDs of the Drifts that block each blocked Task. */
const blockedBy = () => Object.fromEntries([...blockedTasks(p)].map(([id, why]) => [id, why.map((b) => (b.kind === "drift" ? `drift ${b.drift}` : `task ${b.task}`))]));

describe("which Tasks an open Drift blocks", () => {
  test("a Task concerns a Drift when one reference is the other's or inside it, in either direction", () => {
    const transition = task(["order/Paid/user.CANCEL"]);
    const machine = task(["order"]);
    const sibling = task(["order/Shipped"]);
    const other = task(["payment"]);
    const cases: [string, string[]][] = [
      ["order", [transition, machine, sibling]], // a Machine contains its States and Transitions
      ["order/Paid", [transition, machine]], // a State contains its Transitions
      ["order/Paid/user.CANCEL", [transition, machine]], // the same Transition; a Machine contains it
      ["checkout", [transition, machine, sibling, other]], // a Feature contains its Machines
      ["payment", [other]],
    ];
    for (const [ref, blocked] of cases) {
      const drift = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: ref, refs: [ref], happens: "The code does it one way.", should: "The Model says another." });
      expect(Object.keys(blockedBy()).sort()).toEqual([...blocked].sort());
      resolveDrift(p, drift.id, "dismiss");
    }
    expect(blockedBy()).toEqual({});
  });

  test("a Requirement section counts as its element, and the element as the section; the General section only equals itself", () => {
    const section = task(["requirements/ui#order/Paid"]);
    const wholeMachine = task(["requirements/data#order"]);
    const general = task(["requirements/ui#General"]);
    const element = task(["order/Shipped"]);
    const blockedFor = (ref: string) => {
      const d = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: ref, refs: [ref], happens: "The code does it one way.", should: "The Model says another." });
      const ids = Object.keys(blockedBy()).sort();
      resolveDrift(p, d.id, "dismiss");
      return ids;
    };
    expect(blockedFor("order/Paid/user.CANCEL")).toEqual([section, wholeMachine].sort());
    expect(blockedFor("order/Shipped")).toEqual([wholeMachine, element].sort());
    expect(blockedFor("order")).toEqual([section, wholeMachine, element].sort());
    expect(blockedFor("requirements/ui#order/Paid")).toEqual([section, wholeMachine].sort()); // the Machine contains the State, not the sibling
    expect(blockedFor("requirements/ui#General")).toEqual([general]);
    expect(blockedFor("cart")).toEqual([]);
    expect(blockedFor("order/Paid")).not.toContain(general);
  });

  test("a Done Task is never blocked, a resolved Drift blocks nothing, and the origin is blocked whatever its references", () => {
    const concerned = task(["order"]);
    const finished = task(["order"]);
    const origin = task(["cart"]);
    moveTask(p, finished, "done", "developer");
    const drift = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "d", refs: ["order"], origin, happens: "The code does it one way.", should: "The Model says another." });
    expect(blockedBy()).toEqual({ [concerned]: [`drift ${drift.id}`], [origin]: [`drift ${drift.id}`] });
    moveTask(p, origin, "done", "developer");
    expect(blockedBy()).toEqual({ [concerned]: [`drift ${drift.id}`] });
    resolveDrift(p, drift.id, "dismiss");
    expect(blockedBy()).toEqual({});
  });

  test("a Task blocked by several Drifts lists each, and a Drift filed without an origin blocks only what it concerns", () => {
    const t = task(["order/Paid"]);
    const a = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "a", refs: ["order"], happens: "The code does it one way.", should: "The Model says another." });
    const b = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "b", refs: ["order/Paid/user.CANCEL"], happens: "The code does it one way.", should: "The Model says another." });
    task(["cart"]);
    expect(blockedBy()).toEqual({ [t]: [`drift ${a.id}`, `drift ${b.id}`] });
  });

  test("fixing the code leaves the origin waiting for the fix Task until it is Done; the Task and Drift that fixed it block nothing else", () => {
    const origin = task(["order"]);
    const bystander = task(["order/Paid"]);
    const drift = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "d", refs: ["order"], origin, happens: "The code does it one way.", should: "The Model says another." });
    resolveDrift(p, drift.id, "fix-code", [], { option: 1 });
    const fix = Object.entries(blockedBy()).find(([id]) => id === origin)?.[1][0]?.replace("task ", "") as string;
    expect(blockedBy()).toEqual({ [origin]: [`task ${fix}`] });
    expect(blockedBy()[bystander]).toBeUndefined();
    moveTask(p, fix, "done", "developer");
    expect(blockedBy()).toEqual({});
  });

  test("a Drift resolved another way, or fixed with the origin already Done, leaves the origin free", () => {
    const [a, b] = [task(["cart"]), task(["cart"])] as [string, string];
    resolveDrift(p, newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "a", refs: ["cart"], origin: a, happens: "The code does it one way.", should: "The Model says another." }).id, "dismiss");
    moveTask(p, b, "done", "developer");
    resolveDrift(p, newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "b", refs: ["cart"], origin: b, happens: "The code does it one way.", should: "The Model says another." }).id, "fix-code", [], { option: 1 });
    expect(blockedBy()).toEqual({});
  });
});
