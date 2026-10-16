import { describe, expect, test } from "bun:test";
import { EMPTY_SPECS, type Specs, specsChange } from "../src/core/specs";
import type { ProposalView, Snapshot } from "../src/core/snapshot";
import { specsView } from "../extension/src/webview/specs/logic";

const entry = (name: string, over: Partial<Specs["lists"]["languages"][number]> = {}) => ({ name, version: null, note: null, chosenByAgent: null, ...over });
const specs = (over: { lists?: Partial<Specs["lists"]>; notes?: string } = {}): Specs => ({ lists: { ...EMPTY_SPECS.lists, ...over.lists } as Specs["lists"], notes: over.notes ?? "" });
const snapshot = (s: Specs) => ({ specs: s }) as unknown as Snapshot;
const proposalOver = (before: Specs, after: Specs) => ({ specs: after, specsChange: specsChange(before, after) }) as unknown as ProposalView;

describe("specsChange", () => {
  test("marks entries added, removed and changed, compared without case", () => {
    const before = specs({ lists: { languages: [entry("TypeScript", { version: "5" }), entry("Go")] } });
    const after = specs({ lists: { languages: [entry("typescript", { version: "6" }), entry("Rust")] } });
    const change = specsChange(before, after);
    expect(change.entries.map((e) => [e.field, e.entry.name, e.change])).toEqual([
      ["languages", "typescript", "changed"],
      ["languages", "Rust", "added"],
      ["languages", "Go", "removed"],
    ]);
    expect(change.entries[0]?.before?.version).toBe("5");
    expect(change.notesBefore).toBeNull();
  });

  test("reports the notes text a Proposal replaces", () => {
    expect(specsChange(specs({ notes: "old" }), specs({ notes: "new" })).notesBefore).toBe("old");
  });
});

describe("specsView", () => {
  test("no Specs draws no field", () => {
    expect(specsView(snapshot(EMPTY_SPECS), undefined)).toEqual([]);
  });

  test("fields come in the fixed order and empty ones are left out", () => {
    const view = specsView(snapshot(specs({ notes: "Read this", lists: { ci: [entry("GitHub Actions")], languages: [entry("TypeScript")] } })), undefined);
    expect(view.map((f) => f.title)).toEqual(["Languages", "CI", "Notes"]);
  });

  test("a Proposal marks what it adds and changes, and keeps what it removes visible", () => {
    const current = specs({ lists: { languages: [entry("Go"), entry("TypeScript", { version: "5" })] } });
    const proposed = specs({ lists: { languages: [entry("Rust"), entry("TypeScript", { version: "6" })] } });
    const [languages] = specsView(snapshot(current), proposalOver(current, proposed));
    expect(languages?.rows.map((r) => [r.entry.name, r.change])).toEqual([
      ["Rust", "added"],
      ["TypeScript", "changed"],
      ["Go", "removed"],
    ]);
  });
});
