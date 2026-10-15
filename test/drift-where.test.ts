import { FIX_OPTIONS } from "./fix-options";
import { afterEach, beforeEach, expect, test } from "bun:test";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { type Project, projectAt } from "../src/core/store";
import { closedUnchanged, getDrift, listDrifts, moveTask, newDrift, resolveDrift } from "../src/core/work";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const sides = { refs: ["order"], happens: "The code writes it off.", should: "Nothing writes it off.", options: FIX_OPTIONS };
const CLI_OPTIONS = FIX_OPTIONS.flatMap((o) => ["--option", o.title, "--option-text", o.text]);

test("a new Drift is refused without Where in the code, from core and command line", () => {
  expect(() => newDrift(p, { ...sides, title: "No where", where: "" })).toThrow(/"Where in the code"/);
  expect(() => newDrift(p, { ...sides, title: "No where", where: "   " })).toThrow(/"Where in the code"/);
  expect(() => run(["--root", dir, "drift", "new", "No where", "--ref", "order", "--happens", "a", "--should", "b", ...CLI_OPTIONS], process.cwd())).toThrow(/"Where in the code"/);
  expect(listDrifts(p)).toHaveLength(0);
});

test("a Drift dismissed by its fix Task shows the Task's note while it is Done, and nothing once it left Done", () => {
  const drift = newDrift(p, { ...sides, title: "Already right", where: "src/refund.ts" });
  const fix = resolveDrift(p, drift.id, "fix-code", [], { option: 1 }).data.task as string;
  expect(closedUnchanged(p, getDrift(p, drift.id))).toBeNull();

  moveTask(p, fix, "done", "developer", {}, "Checked src/refund.ts: it already skips written-off orders.");
  expect(getDrift(p, drift.id).data.resolution).toBe("dismissed");
  expect(closedUnchanged(p, getDrift(p, drift.id))).toEqual({ task: fix, note: "Checked src/refund.ts: it already skips written-off orders." });

  const out = run(["--root", dir, "drift", "show", drift.id], process.cwd()).out;
  expect(out).toContain("Dismissed by Task");
  expect(out).toContain("without changes");
  expect(out).toContain("## Check note");
  expect(out).toContain("Checked src/refund.ts");
  expect(run(["--root", dir, "drift", "list", "--all"], process.cwd()).out).toContain("(dismissed, no changes)");

  moveTask(p, fix, "todo", "developer");
  expect(closedUnchanged(p, getDrift(p, drift.id))).toEqual({ task: fix, note: null });
  expect(run(["--root", dir, "drift", "show", drift.id], process.cwd()).out).toContain("The Task left Done; its note is gone.");
});

test("a fix Task closed normally leaves its Drift fixed, not dismissed", () => {
  const drift = newDrift(p, { ...sides, title: "Real fix", where: "src/refund.ts" });
  const fix = resolveDrift(p, drift.id, "fix-code", [], { option: 1 }).data.task as string;
  moveTask(p, fix, "done", "developer");
  expect(getDrift(p, drift.id).data.resolution).toBe("fix-code");
  expect(closedUnchanged(p, getDrift(p, drift.id))).toBeNull();
});
