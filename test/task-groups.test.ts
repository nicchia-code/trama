import { FIX_OPTIONS } from "./fix-options";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { type Project, projectAt } from "../src/core/store";
import { parallelGroups } from "../src/core/groups";
import { getTask, moveTask, newDrift, newTask } from "../src/core/work";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
  mkdirSync(join(dir, "docs"), { recursive: true });
  writeFileSync(join(dir, "docs/tax.md"), "Tax rules.\n");
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const list = (input: object, ...flags: string[]) => run(["--root", dir, ...flags, "task", "list", "--input", JSON.stringify({ runnable: true, groups: true, ...input })], process.cwd(), {});

/** A Task whose body is `body`, concerning `refs`. */
const task = (refs: string[], title: string, body = "") => newTask(p, { title, refs, technical: false, body }).id;

/** The Task IDs of each group, in the order the groups come. */
const idGroups = (groups: { tasks: { id: string }[] }[]) => groups.map((g) => g.tasks.map((t) => t.id));

describe("task list with groups", () => {
  test("Tasks that concern the same thing share a group, oldest first, and the other Task stands alone", () => {
    const a = task(["order"], "Refund flow");
    const b = task(["order"], "Return flow");
    const c = task(["payment"], "Card flow");
    const json = JSON.parse(list({}, "--json").out);
    expect(idGroups(json.groups)).toEqual([[a, b], [c]]);
    expect(json.groups[0].refs).toEqual(["order"]);
    expect(json.groups[0].files).toEqual([]);
    expect(json.heldBack).toEqual([]);
  });

  test("a Task naming an existing project file links to another naming the same file, transitively", () => {
    const x = task(["order"], "Order step");
    const y = task(["order"], "Tax step", "Update `docs/tax.md`.");
    const z = task(["cart"], "Cart step", "Also `docs/tax.md`.");
    const { groups } = parallelGroups(p);
    expect(idGroups(groups)).toEqual([[x, y, z]]);
    expect(groups[0]?.files).toEqual(["docs/tax.md"]);
  });

  test("a missing path, a path outside backticks, or a path outside the project does not link Tasks", () => {
    const missing1 = task(["cart"], "Missing one", "Update `docs/none.md`.");
    const missing2 = task(["payment"], "Missing two", "Update `docs/none.md`.");
    const plain = task(["order"], "Plain mention", "Update docs/tax.md.");
    const outside = task(["user"], "Outside", "Update `../secret.md`.");
    expect(idGroups(parallelGroups(p).groups)).toEqual([[missing1], [missing2], [plain], [outside]]);
  });

  test("groups list the largest first, then the oldest, and max counts groups", () => {
    const lone = task(["cart"], "Lone flow");
    const pair1 = task(["order"], "Pair one");
    const pair2 = task(["order"], "Pair two");
    expect(idGroups(parallelGroups(p).groups)).toEqual([[pair1, pair2], [lone]]);

    const one = parallelGroups(p, {}, 1);
    expect(idGroups(one.groups)).toEqual([[pair1, pair2]]);
    expect(one.remaining).toBe(1);

    const cli = list({ max: 1 }).out;
    expect(cli).toContain("## Group 1");
    expect(cli).not.toContain("Lone flow");
  });

  test("a runnable Task that concerns a Task the agent has taken is held back, apart from the groups", () => {
    const taken = task(["order"], "Taken flow");
    moveTask(p, taken, "doing", "agent", { terminal: "term-taken" });
    const held = task(["order"], "Held flow");
    const free = task(["cart"], "Free flow");
    const json = JSON.parse(list({}, "--json").out);
    expect(idGroups(json.groups)).toEqual([[free]]);
    expect(json.heldBack.map((h: { id: string }) => h.id)).toEqual([held]);
    expect(json.heldBack[0].overlaps.map((o: { id: string }) => o.id)).toEqual([taken]);
    const md = list({}).out;
    expect(md).toContain("## Held back");
    expect(md).toContain("(overlaps ");
  });

  test("a runnable Task that shares only a named file with a taken Task is held back", () => {
    const taken = task(["order"], "Taken tax flow", "Edit `docs/tax.md`.");
    moveTask(p, taken, "doing", "agent", { terminal: "term-taken" });
    const held = task(["cart"], "Held tax flow", "Also `docs/tax.md`.");
    const free = task(["payment"], "Free flow");
    const json = JSON.parse(list({}, "--json").out);
    expect(idGroups(json.groups)).toEqual([[free]]);
    expect(json.heldBack.map((h: { id: string }) => h.id)).toEqual([held]);
    expect(json.heldBack[0].overlaps.map((o: { id: string }) => o.id)).toEqual([taken]);
  });
  test("a blocked Task takes no part in any group", () => {
    const blocked = task(["cart"], "Blocked flow");
    const other = task(["payment"], "Other flow");
    newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Cart differs", refs: ["cart"], origin: blocked, happens: "The code does it one way.", should: "The Model says another." });
    const json = JSON.parse(list({}, "--json").out);
    expect(idGroups(json.groups)).toEqual([[other]]);
  });

  test("with nothing runnable it says so and prints empty lists", () => {
    const out = list({});
    expect(out.exit).toBe(0);
    expect(out.out).toBe("No Task is runnable.");
    expect(JSON.parse(list({}, "--json").out)).toEqual({ groups: [], heldBack: [] });
  });

  test("usage errors name the flags groups does not combine with", () => {
    expect(() => run(["--root", dir, "task", "list", "--input", JSON.stringify({ groups: true })], process.cwd(), {})).toThrow(/applies only with runnable/);
    expect(() => list({ scope: true, tasks: [] })).toThrow(/does not apply with groups/);
    expect(() => list({ heldBack: true })).toThrow(/does not apply with groups/);
  });

  test("a run with groups moves nothing", () => {
    const t = task(["order"], "Stay flow");
    list({});
    expect(getTask(p, t).data.column).toBe("todo");
    expect(getTask(p, t).data.agent).toBeFalsy();
  });
});
