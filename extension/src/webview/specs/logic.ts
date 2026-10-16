import { SPEC_FIELD_TITLES, type SpecEntry, type SpecField, type Specs } from "../../../../src/core/specs";
import type { ProposalView, Snapshot } from "../../../../src/core/snapshot";

/** The file the Specs are read from; its problems are the ones named `specs.yaml` in the Diagnostics. */
export const SPECS_FILE = "specs.yaml";

/** The fields in their fixed order, as `data#specs` writes them. */
export const FIELD_ORDER: readonly SpecField[] = ["languages", "frameworks", "data", "testing", "ci", "repository", "deployment", "cloud", "infrastructure", "notes"];

/** An entry as the tab draws it: `before` is what it read before the Proposal, when it changed or was removed. */
export interface SpecRow {
  entry: SpecEntry;
  change: "added" | "removed" | "changed" | "same";
  before: SpecEntry | null;
}

export interface SpecFieldView {
  field: SpecField;
  title: string;
  rows: SpecRow[];
  /** Notes only: the text, and the text it replaces when the Proposal changes it. */
  notes: string | null;
  notesBefore: string | null;
}

/**
 * The Specs as the tab draws them, field by field in the fixed order. With a Proposal, its entries are drawn with what it
 * adds, removes or changes; a field with nothing to show is left out.
 */
export function specsView(snapshot: Snapshot, proposal: ProposalView | undefined): SpecFieldView[] {
  const shown: Specs = proposal?.specs ?? snapshot.specs;
  const change = proposal?.specsChange ?? null;
  const views: SpecFieldView[] = [];
  for (const field of FIELD_ORDER) {
    const title = SPEC_FIELD_TITLES[field];
    if (field === "notes") {
      const notesBefore = change?.notesBefore ?? null;
      if (shown.notes !== "" || notesBefore !== null) views.push({ field, title, rows: [], notes: shown.notes, notesBefore });
      continue;
    }
    const marks = new Map<string, { change: "added" | "removed" | "changed"; before: SpecEntry | null }>();
    for (const e of change?.entries ?? []) if (e.field === field) marks.set(e.entry.name.toLowerCase(), { change: e.change, before: e.before });
    const rows: SpecRow[] = shown.lists[field].map((entry) => {
      const mark = marks.get(entry.name.toLowerCase());
      return mark && mark.change !== "removed" ? { entry, change: mark.change, before: mark.before } : { entry, change: "same", before: null };
    });
    for (const e of change?.entries ?? []) if (e.field === field && e.change === "removed") rows.push({ entry: e.entry, change: "removed", before: e.before });
    if (rows.length > 0) views.push({ field, title, rows, notes: null, notesBefore: null });
  }
  return views;
}
