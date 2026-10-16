import { parse } from "yaml";
import type { Diagnostic } from "./types";

/** The file that holds the project's Specs, beside `model/` and `requirements/` under `.trama/`. A Proposal writes it beside its `proposal.md`. */
export const SPECS_FILE = "specs.yaml";

/** The keys of the Specs map, in the order the file must write them. Every one is optional. */
export const SPEC_FIELDS = ["languages", "frameworks", "data", "testing", "ci", "repository", "deployment", "cloud", "infrastructure", "notes"] as const;
export type SpecField = (typeof SPEC_FIELDS)[number];

/** The fields that are lists of entries: every field but `notes`. */
export const SPEC_LIST_FIELDS = SPEC_FIELDS.filter((f): f is Exclude<SpecField, "notes"> => f !== "notes");
export type SpecListField = (typeof SPEC_LIST_FIELDS)[number];

/** The title each field has in the Specs tab and in the generated skill. */
export const SPEC_FIELD_TITLES: Record<SpecField, string> = {
  languages: "Languages",
  frameworks: "Frameworks and libraries",
  data: "Data and persistence",
  testing: "Testing",
  ci: "CI",
  repository: "Repository",
  deployment: "Deployment",
  cloud: "Cloud and resources",
  infrastructure: "Infrastructure as code",
  notes: "Notes",
};

const ENTRY_KEYS = ["name", "version", "note", "chosenByAgent"] as const;

/** One technology in a field. `chosenByAgent` is the reason the agent picked it itself; null means the developer named or confirmed it. */
export interface SpecEntry {
  name: string;
  version: string | null;
  note: string | null;
  chosenByAgent: string | null;
}

/** The Specs as read: entries by field, and the free Markdown notes. A missing file reads as every field empty. */
export interface Specs {
  lists: Record<SpecListField, SpecEntry[]>;
  notes: string;
}

export const EMPTY_SPECS: Specs = {
  lists: Object.fromEntries(SPEC_LIST_FIELDS.map((f): [SpecListField, SpecEntry[]] => [f, []])) as Record<SpecListField, SpecEntry[]>,
  notes: "",
};

export const isSpecField = (name: string): name is SpecField => (SPEC_FIELDS as readonly string[]).includes(name);

/** Whether a reference names the Specs: `specs` (the whole Specs) or `specs#<field>` (one field, fixed name, possibly empty). */
export const isSpecsRef = (ref: string): boolean => ref === "specs" || ref.startsWith("specs#");

/** Whether a Specs field's content is the same in both: entries compared in order, notes as text. */
export function sameSpecField(a: Specs, b: Specs, field: SpecField): boolean {
  if (field === "notes") return a.notes === b.notes;
  return JSON.stringify(a.lists[field]) === JSON.stringify(b.lists[field]);
}

/**
 * Reads `specs.yaml` as written. Every problem is a Diagnostic naming the field and the entry; an entry or a field with
 * a problem is left out of the result, so the Specs stays readable for the rest of the checks.
 */
export function parseSpecs(file: string, content: string): { specs: Specs; diagnostics: Diagnostic[] } {
  const specs: Specs = { lists: structuredClone(EMPTY_SPECS.lists), notes: "" };
  const diagnostics: Diagnostic[] = [];
  const problem = (message: string) => diagnostics.push({ file, line: 0, message });

  let data: unknown;
  try {
    data = parse(content);
  } catch (err) {
    problem(`YAML is not readable: ${(err as Error).message.split("\n")[0]}`);
    return { specs, diagnostics };
  }
  if (data === null || data === undefined) return { specs, diagnostics };
  if (typeof data !== "object" || Array.isArray(data)) {
    problem("Specs must be a mapping of fields");
    return { specs, diagnostics };
  }

  const map = data as Record<string, unknown>;
  const keys = Object.keys(map);
  for (const key of keys) if (!isSpecField(key)) problem(`"${key}" is not a Specs field; the fields are ${SPEC_FIELDS.join(", ")}`);
  const known = keys.filter(isSpecField);
  const expected = SPEC_FIELDS.filter((f) => known.includes(f));
  if (known.some((key, i) => key !== expected[i])) problem(`fields must be in this order: ${SPEC_FIELDS.join(", ")}`);

  for (const field of known) {
    const value = map[field];
    if (field === "notes") {
      if (value === null || value === undefined) continue;
      if (typeof value === "string") specs.notes = value;
      else problem("notes must be Markdown text");
      continue;
    }
    if (value === null || value === undefined) continue;
    if (!Array.isArray(value)) {
      problem(`${field} must be a list of entries`);
      continue;
    }
    const seen = new Set<string>();
    for (const [index, raw] of value.entries()) {
      const entry = readEntry(field, index, raw, problem);
      if (entry === null) continue;
      const key = entry.name.toLowerCase();
      if (seen.has(key)) {
        problem(`${field}: two entries are named "${entry.name}" (names are compared without case)`);
        continue;
      }
      seen.add(key);
      specs.lists[field].push(entry);
    }
  }
  return { specs, diagnostics };
}

function readEntry(field: SpecListField, index: number, raw: unknown, problem: (message: string) => void): SpecEntry | null {
  const where = `${field} entry ${index + 1}`;
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    problem(`${where} must be a mapping with name, version, note and chosenByAgent`);
    return null;
  }
  const map = raw as Record<string, unknown>;
  for (const key of Object.keys(map)) if (!(ENTRY_KEYS as readonly string[]).includes(key)) problem(`${where}: "${key}" is not an entry field; the fields are ${ENTRY_KEYS.join(", ")}`);

  const name = map["name"];
  if (typeof name !== "string" || name.trim() === "") {
    problem(`${where}: name is required and must be non-empty text`);
    return null;
  }
  const named = `${field} "${name}"`;
  const text = (key: "version" | "note" | "chosenByAgent"): string | null | undefined => {
    const v = map[key];
    if (v === undefined || v === null) return null;
    if (typeof v !== "string") {
      problem(`${named}: ${key} must be text`);
      return undefined;
    }
    if (key === "chosenByAgent" && v.trim() === "") {
      problem(`${named}: chosenByAgent must be non-empty text when present`);
      return undefined;
    }
    return v;
  };
  const version = text("version");
  const note = text("note");
  const chosenByAgent = text("chosenByAgent");
  if (version === undefined || note === undefined || chosenByAgent === undefined) return null;
  return { name, version, note, chosenByAgent };
}

/** How a Proposal changes one entry of a field: `before` is the entry as it stood, when it changed or was removed. */
export interface SpecEntryChange {
  field: SpecListField;
  /** The entry as it reads after the Proposal (before it, when removed). */
  entry: SpecEntry;
  change: "added" | "removed" | "changed";
  before: SpecEntry | null;
}

/** What a Proposal changes in the Specs: entries added, removed or changed, and the notes text it replaces, if any. */
export interface SpecsChange {
  entries: SpecEntryChange[];
  /** The notes as they read before the Proposal, when the Proposal changes them; null otherwise. */
  notesBefore: string | null;
}

/** The entries and notes that differ between two readings of the Specs, in the fixed field order. Names are compared without case. */
export function specsChange(before: Specs, after: Specs): SpecsChange {
  const entries: SpecEntryChange[] = [];
  for (const field of SPEC_LIST_FIELDS) {
    const was = new Map(before.lists[field].map((e) => [e.name.toLowerCase(), e]));
    const is = new Map(after.lists[field].map((e) => [e.name.toLowerCase(), e]));
    for (const entry of after.lists[field]) {
      const old = was.get(entry.name.toLowerCase());
      if (!old) entries.push({ field, entry, change: "added", before: null });
      else if (JSON.stringify(old) !== JSON.stringify(entry)) entries.push({ field, entry, change: "changed", before: old });
    }
    for (const entry of before.lists[field]) if (!is.has(entry.name.toLowerCase())) entries.push({ field, entry, change: "removed", before: entry });
  }
  return { entries, notesBefore: before.notes === after.notes ? null : before.notes };
}
