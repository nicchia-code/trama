import { FIX_OPTIONS } from "./fix-options";
import { afterEach, beforeEach, expect, test } from "bun:test";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { boardCounts } from "../extension/src/host/board-counts";
import { newProposal, submitProposal } from "../src/core/proposals";
import { type Project, projectAt } from "../src/core/store";
import { moveTask, newDrift, newTask, resolveDrift } from "../src/core/work";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

test("the Board summary counts open Proposals and open Drifts to decide, never Drafts or resolved Drifts, and Tasks by column", () => {
  const before = boardCounts(p);
  newProposal(p, "Still being written");
  const open = newProposal(p, "Ready to decide");
  submitProposal(p, open.id);
  newDrift(p, { options: FIX_OPTIONS, title: "A difference", refs: ["order"], happens: "The code does it one way.", should: "The Model says another." });
  const dismissed = newDrift(p, { options: FIX_OPTIONS, title: "Another", refs: ["order"], happens: "The code does it one way.", should: "The Model says another." });
  resolveDrift(p, dismissed.id, "dismiss");
  const started = newTask(p, { title: "Started", refs: ["order/Paid"], technical: false });
  moveTask(p, started.id, "doing", "developer");
  const finished = newTask(p, { title: "Finished", refs: ["order/Paid"], technical: false });
  moveTask(p, finished.id, "done", "developer");
  newTask(p, { title: "Waiting", refs: ["order/Paid"], technical: false });

  const after = boardCounts(p);
  expect(after.toDecide - before.toDecide).toBe(2);
  expect(after.todo - before.todo).toBe(1);
  expect(after.inProgress - before.inProgress).toBe(1);
});
