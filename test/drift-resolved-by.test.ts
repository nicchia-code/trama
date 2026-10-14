import { FIX_OPTIONS } from "./fix-options";
import { afterEach, beforeEach, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type Project, projectAt } from "../src/core/store";
import { getDrift, newDrift, resolveDrift } from "../src/core/work";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

test("a Drift resolved outside a resolution Proposal is written without a resolvedBy field", () => {
  const drift = newDrift(p, { options: FIX_OPTIONS, title: "Dismissed alone", refs: ["order"], happens: "The code does it one way.", should: "The Model says another." });
  resolveDrift(p, drift.id, "dismiss");
  expect(readFileSync(getDrift(p, drift.id).path, "utf8")).not.toContain("resolvedBy");
});
