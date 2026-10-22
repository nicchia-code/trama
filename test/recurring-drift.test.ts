import { FIX_OPTIONS } from "./fix-options";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { boardView, driftListView, driftShowView } from "../src/cli/work";
import { type Project, projectAt } from "../src/core/store";
import { getDrift, newDrift, newTask, resolveDrift } from "../src/core/work";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const drift = (title: string, extra: { previous?: string; origin?: string } = {}) =>
  newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title, refs: ["order"], happens: "The code does it one way.", should: "The Model says another.", ...extra });

describe("a recurring Drift follows a Drift already resolved", () => {
  test("the named previous Drift, resolved by fixing the code, is kept in the file", () => {
    const first = drift("First");
    resolveDrift(p, first.id, "fix-code", [], { option: 1 });
    const second = drift("Second", { previous: first.id });
    expect(getDrift(p, second.id).data.previous).toEqual([first.id]);
  });

  test("a Drift without a previous one is not recurring", () => {
    expect(drift("Plain").data.previous).toEqual([]);
  });

  test("an open previous Drift is refused, saying it is still open", () => {
    const open = drift("Open");
    expect(() => drift("Next", { previous: open.id })).toThrow(/still open/);
  });

  test("a dismissed previous Drift is refused, saying it was dismissed", () => {
    const dismissed = drift("Dismissed");
    resolveDrift(p, dismissed.id, "dismiss");
    expect(() => drift("Next", { previous: dismissed.id })).toThrow(/was dismissed/);
  });

  test("the Drift fixed by the origin Task is the previous one, without naming it", () => {
    const origin = newTask(p, { title: "Work", refs: ["order"], technical: false }).id;
    const first = drift("First", { origin });
    resolveDrift(p, first.id, "fix-code", [], { option: 1 });
    const fixTask = getDrift(p, first.id).data.task ?? "";
    expect(drift("Second", { origin: fixTask }).data.previous).toEqual([first.id]);
  });

  test("a named previous Drift that differs from the one the origin Task fixes is refused", () => {
    const origin = newTask(p, { title: "Work", refs: ["order"], technical: false }).id;
    const first = drift("First", { origin });
    resolveDrift(p, first.id, "fix-code", [], { option: 1 });
    const other = drift("Other");
    resolveDrift(p, other.id, "fix-code", [], { option: 1 });
    const fixTask = getDrift(p, first.id).data.task ?? "";
    expect(() => drift("Second", { origin: fixTask, previous: other.id })).toThrow(/so that is the previous Drift/);
  });
});

describe("the command line shows the Drift a recurring one follows", () => {
  const recurring = () => {
    const first = drift("First");
    resolveDrift(p, first.id, "fix-code", [], { option: 1 });
    return { first, second: drift("Second", { previous: first.id }) };
  };

  test("drift show names the followed Drift and its decision right after the title, and carries previous in its JSON", () => {
    const { first, second } = recurring();
    const shown = driftShowView(p, getDrift(p, second.id));
    expect(shown.md).toContain(`Follows Drift ${first.id} First (fix-code)`);
    expect(shown.json).toMatchObject({ previous: [first.id] });
  });

  test("drift list and the board mark a recurring Drift, and a plain one is not marked", () => {
    const { first, second } = recurring();
    const plain = drift("Plain");
    const listed = driftListView(p, false);
    expect(listed.md).toMatch(/Second \(recurring\)/);
    expect(listed.md).not.toMatch(/Plain \(recurring\)/);
    expect(listed.json).toMatchObject({
      drifts: expect.arrayContaining([
        expect.objectContaining({ id: second.id, previous: [first.id] }),
        expect.objectContaining({ id: plain.id, previous: [] }),
      ]),
    });
    expect(boardView(p).md).toMatch(/Drift .*Second \(recurring\)/);
  });
});
