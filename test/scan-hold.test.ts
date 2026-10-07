import { afterEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readScanHold, scanHoldDir, writeHeld, writeScanHoldState } from "../src/core/scan-hold";
import { buildSnapshot } from "../src/core/snapshot";
import { projectAt } from "../src/core/store";

const roots: string[] = [];

function project() {
  const root = mkdtempSync(join(tmpdir(), "trama-hold-"));
  roots.push(root);
  mkdirSync(join(root, ".trama", "model"), { recursive: true });
  for (const [id, status] of [["aaaa1111", "approved"], ["bbbb2222", "approved"], ["cccc3333", "open"]]) {
    mkdirSync(join(root, ".trama", "proposals", `${id}-p`), { recursive: true });
    writeFileSync(join(root, ".trama", "proposals", `${id}-p`, "proposal.md"), `---\nstatus: ${status}\nbase: {}\ndelete: []\n---\n# P\n`);
  }
  return projectAt(root);
}

afterEach(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
  roots.length = 0;
});

test("a missing folder, state or held file is off or empty, with nothing wrong", () => {
  const p = project();
  expect(readScanHold(p)).toEqual({ reading: { kind: "missing" }, held: [] });
  writeScanHoldState(p, "on");
  expect(readScanHold(p)).toEqual({ reading: { kind: "on" }, held: [] });
  expect(readFileSync(join(scanHoldDir(p), ".gitignore"), "utf8")).toBe("*\n");
});

test("only approved, distinct, non-blank lines count, oldest first, and only while the switch is on", () => {
  const p = project();
  writeScanHoldState(p, "on");
  writeFileSync(join(scanHoldDir(p), "held"), "bbbb2222\n\naaaa1111\nbbbb2222\ncccc3333\nzzzz9999\n");
  expect(readScanHold(p).held).toEqual(["bbbb2222", "aaaa1111"]);
  expect(buildSnapshot(p).scanHold).toEqual({ on: true, held: 2 });
  writeHeld(p, readScanHold(p).held);
  expect(readFileSync(join(scanHoldDir(p), "held"), "utf8")).toBe("bbbb2222\naaaa1111\n");
  writeScanHoldState(p, "off");
  expect(readScanHold(p).held).toEqual([]);
  expect(buildSnapshot(p).scanHold).toEqual({ on: false, held: 0 });
});

test("a state that is neither on nor off is unreadable: off, and held does not count", () => {
  const p = project();
  writeScanHoldState(p, "on");
  writeHeld(p, ["aaaa1111"]);
  writeFileSync(join(scanHoldDir(p), "state"), "yes\n");
  expect(readScanHold(p)).toEqual({ reading: { kind: "unreadable", content: "yes\n" }, held: [] });
  expect(buildSnapshot(p).scanHold).toEqual({ on: false, held: 0 });
});
