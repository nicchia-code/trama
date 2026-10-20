import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen, within } from "@testing-library/react";
import { EMPTY_SPECS, type Specs, specsChange } from "../src/core/specs";
import type { ProposalView, Snapshot } from "../src/core/snapshot";
import { SpecsTab } from "../extension/src/webview/specs";
import { specsView } from "../extension/src/webview/specs/logic";

afterEach(cleanup);

const entry = (name: string, over: Partial<Specs["lists"]["languages"][number]> = {}) => ({ name, version: null, note: null, chosenByAgent: null, ...over });
const specs = (over: { lists?: Partial<Specs["lists"]>; notes?: string } = {}): Specs => ({ lists: { ...EMPTY_SPECS.lists, ...over.lists } as Specs["lists"], notes: over.notes ?? "" });
const snapshot = (s: Specs, over: Record<string, unknown> = {}) => ({ specs: s, specsPresent: true, proposals: [], diagnostics: [], ...over }) as unknown as Snapshot;
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

function tab(snap: Snapshot, proposalId: string | null = null) {
  return render(<SpecsTab snapshot={snap} proposalId={proposalId} focus={null} onProposal={() => {}} onFocus={() => {}} openLink={() => {}} />);
}

describe("SpecsTab", () => {
  test("fields come in the fixed order, with name, version and note of each entry, and no empty field", () => {
    tab(snapshot(specs({ notes: "Read this", lists: { ci: [entry("GitHub Actions", { note: "on push" })], languages: [entry("TypeScript", { version: "5.6" })] } })));
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Languages", "CI", "Notes"]);
    expect(screen.getByText("5.6")).not.toBeNull();
    expect(screen.getByText("on push")).not.toBeNull();
    expect(screen.getByText("Read this")).not.toBeNull();
  });

  test("without Specs the tab says so; with an empty Specs file it shows nothing", () => {
    const { unmount } = tab(snapshot(EMPTY_SPECS, { specsPresent: false }));
    expect(screen.getByText("This project has no Specs yet.")).not.toBeNull();
    unmount();
    tab(snapshot(EMPTY_SPECS));
    expect(screen.queryByText("This project has no Specs yet.")).toBeNull();
  });

  test("an entry chosen by the agent carries a mark with its reason, and an entry with no logo gets the Package icon", () => {
    tab(snapshot(specs({ lists: { languages: [entry("Zzz Unknown", { chosenByAgent: "fits the team" })] } })));
    expect(screen.getByRole("note", { name: "chosen by agent: fits the team" })).not.toBeNull();
    expect(document.querySelector("svg.lucide-package")).not.toBeNull();
  });

  test("errors of the Specs file show at the top, and only those", () => {
    const diagnostics = [
      { file: "specs.yaml", line: 3, message: "bad field", severity: "error" },
      { file: "model/a.md", line: 1, message: "other", severity: "error" },
    ];
    tab(snapshot(EMPTY_SPECS, { diagnostics }));
    expect(screen.getAllByRole("alert").map((a) => a.textContent)).toEqual(["specs.yaml:3: bad field"]);
  });

  test("a Proposal draws its additions, changes and removals, with the earlier note of a changed entry", () => {
    const current = specs({ lists: { languages: [entry("Go"), entry("TypeScript", { version: "5", note: "old note" })] } });
    const proposed = specs({ lists: { languages: [entry("Rust"), entry("TypeScript", { version: "6", note: "new note" })] } });
    const proposal = { ...proposalOver(current, proposed), id: "p1", title: "Change" } as unknown as ProposalView;
    tab(snapshot(current, { proposals: [proposal] }), "p1");
    const marks = screen.getAllByRole("listitem").map((li) => [li.querySelector(".font-semibold")?.textContent, within(li).queryByText(/^(added|changed|removed)$/)?.textContent]);
    expect(marks).toEqual([["Rust", "added"], ["TypeScript", "changed"], ["Go", "removed"]]);
    expect(screen.getByText("old note")).not.toBeNull();
    expect(screen.getByText("new note")).not.toBeNull();
  });
});
