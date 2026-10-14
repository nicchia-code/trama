import { FIX_OPTIONS } from "./fix-options";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { driftListView } from "../src/cli/work";
import { UsageError } from "../src/core/errors";
import { type Project, projectAt } from "../src/core/store";
import { newDrift, resolveDrift } from "../src/core/work";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const drift = (title: string, refs: string[]) =>
  newDrift(p, { options: FIX_OPTIONS, title, refs, happens: "The code does it one way.", should: "The Model says another." });

describe("drift list --ref", () => {
  test("keeps the Drifts that concern the same thing as a reference, the same element or one inside the other", () => {
    drift("Whole machine", ["order"]);
    drift("Only state", ["order/Paid"]);
    drift("Payment", ["payment"]);
    const listed = driftListView(p, false, ["order/Paid"]).md;
    expect(listed).toContain("Whole machine");
    expect(listed).toContain("Only state");
    expect(listed).not.toContain("Payment");
  });

  test("with --all, a resolved Drift on the same element is listed too; without it, it is not", () => {
    const old = drift("Resolved before", ["order"]);
    resolveDrift(p, old.id, "dismiss");
    expect(driftListView(p, false, ["order"]).md).not.toContain("Resolved before");
    expect(driftListView(p, true, ["order"]).md).toContain("Resolved before");
  });

  test("a reference that does not resolve is a usage error", () => {
    drift("Whole machine", ["order"]);
    expect(() => driftListView(p, false, ["no-such-element"])).toThrow(UsageError);
  });
});
