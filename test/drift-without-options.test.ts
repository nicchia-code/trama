import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { newProposal } from "../src/core/proposals";
import { type Project, projectAt } from "../src/core/store";
import { driftOptions, newDrift } from "../src/core/work";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const sides = { refs: ["order"], happens: "The code writes it off.", should: "Nothing writes it off." };

describe("a Drift without fix options", () => {
  test("is filed with its attached Proposal and keeps no Fix options section", () => {
    const draft = newProposal(p, "Fix the Model");
    const drift = newDrift(p, { ...sides, title: "Contradiction", options: [], proposal: draft.id });
    expect(readFileSync(drift.path, "utf8")).not.toContain("## Fix options");
    expect(driftOptions(drift)).toEqual([]);
    expect(drift.data.proposal).toBe(draft.id);
  });

  test("is refused without an attached Proposal, saying so", () => {
    expect(() => newDrift(p, { ...sides, title: "Alone", options: [] })).toThrow(/needs an attached Proposal/);
  });

  test("one fix option is still refused, with or without a Proposal", () => {
    const draft = newProposal(p, "Fix the Model");
    expect(() => newDrift(p, { ...sides, title: "One", options: [{ title: "Only", text: "x" }], proposal: draft.id })).toThrow(/from 2 to 5 fix options/);
    expect(() => newDrift(p, { ...sides, title: "One", options: [{ title: "Only", text: "x" }] })).toThrow(/from 2 to 5 fix options/);
  });
});
