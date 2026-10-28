import { flattenStates } from "./model";
import { AREA_FILE, areaIdOf, parseRequirementDoc } from "./requirements";
import { REQUIREMENTS_PREFIX } from "./store";
import { EMPTY_SPECS, parseSpecs, SPEC_FIELDS, SPECS_FILE, type SpecEntry, type Specs, sameSpecField } from "./specs";
import { parseActor, parseDocument, parseMachine } from "./parse";
import type { Actor, Diagnostic, EventDecl, Machine } from "./types";

export interface FileChange {
  path: string;
  change: "added" | "removed" | "modified";
  /** Human-readable structural changes; `+` added, `-` removed, `~` changed. */
  details: string[];
  /** For a Requirement file: its Area, and its fragment, or null for the Area's own `area.md`. */
  requirement?: { area: string; fragment: string | null };
}

/** One line of what a file changes, with the reference of the element, section or field it is about; `ref` is null for what has none (the System). */
export interface DetailEntry {
  text: string;
  ref: string | null;
}

/** The lines of a file's changes, in order, each with its reference. */
class Details {
  readonly entries: DetailEntry[] = [];
  get length(): number {
    return this.entries.length;
  }
  push(text: string, ref: string | null): void {
    this.entries.push({ text, ref });
  }
}

type Parsed = { kind: "machine"; value: Machine } | { kind: "actor"; value: Actor } | { kind: "doc"; name: string; description: string };

function parseFile(path: string, content: string): Parsed {
  const sink: Diagnostic[] = [];
  const parts = path.split("/");
  const base = (parts.at(-1) as string).replace(/\.md$/, "");
  if (parts.length === 2 && parts[0] === "actors") return { kind: "actor", value: parseActor(base, path, content, sink) };
  if (parts.length === 2 && base !== "feature") return { kind: "machine", value: parseMachine(base, parts[0] as string, path, content, sink) };
  return { kind: "doc", ...parseDocument(path, content, sink) };
}

function diffEvents(before: EventDecl[], after: EventDecl[], out: Details, owner: string) {
  const was = new Map(before.map((e) => [e.name, e]));
  const is = new Map(after.map((e) => [e.name, e]));
  for (const e of after) {
    const old = was.get(e.name);
    if (!old) out.push(`+ Event ${e.name}`, `${owner}.${e.name}`);
    else if (old.description !== e.description) out.push(`~ Event ${e.name}: description changed`, `${owner}.${e.name}`);
  }
  for (const e of before) if (!is.has(e.name)) out.push(`- Event ${e.name}`, `${owner}.${e.name}`);
}

const signature = (state: string, event: string, target: string) => `${state} | ${event} → ${target}`;

function diffMachines(before: Machine | undefined, after: Machine | undefined, out: Details, id: string) {
  if (before && after) {
    if (before.name !== after.name) out.push(`~ Machine name: "${before.name}" → "${after.name}"`, id);
    if (before.description !== after.description) out.push("~ Machine description changed", id);
  }
  const oldStates = new Map(flattenStates(before?.states ?? []).map((s) => [s.name.toLowerCase(), s]));
  const newStates = new Map(flattenStates(after?.states ?? []).map((s) => [s.name.toLowerCase(), s]));
  for (const [key, s] of newStates) {
    const old = oldStates.get(key);
    if (!old) {
      out.push(`+ State ${s.name}${s.initial ? " (initial)" : s.final ? " (final)" : ""}`, `${id}/${s.name}`);
      continue;
    }
    const changes: string[] = [];
    if (old.initial !== s.initial) changes.push(s.initial ? "became initial" : "no longer initial");
    if (old.final !== s.final) changes.push(s.final ? "became final" : "no longer final");
    if (old.parent !== s.parent) changes.push(`moved under ${s.parent ?? "the top level"}`);
    if (old.description !== s.description) changes.push("description changed");
    if (changes.length > 0) out.push(`~ State ${s.name}: ${changes.join(", ")}`, `${id}/${s.name}`);
  }
  for (const [key, s] of oldStates) if (!newStates.has(key)) out.push(`- State ${s.name}`, `${id}/${s.name}`);

  type Flat = { key: string; text: string; prose: string; ref: string };
  const flatten = (m: Machine | undefined): Flat[] =>
    flattenStates(m?.states ?? []).flatMap((s) =>
      s.transitions.map((t) => ({
        key: signature(s.name, `${t.event.owner}.${t.event.name}`, t.target),
        text: `${signature(s.name, `${t.event.owner}.${t.event.name}`, t.target)}${t.prose ? `: ${t.prose}` : ""}`,
        prose: t.prose,
        ref: `${id}/${s.name}/${t.event.owner}.${t.event.name}`,
      })),
    );
  const removed = flatten(before);
  const added: Flat[] = [];
  for (const t of flatten(after)) {
    const i = removed.findIndex((r) => r.key === t.key && r.prose === t.prose);
    if (i >= 0) removed.splice(i, 1);
    else added.push(t);
  }
  for (const t of added) {
    const i = removed.findIndex((r) => r.key === t.key);
    if (i >= 0) {
      removed.splice(i, 1);
      out.push(`~ Transition ${t.key}: prose changed`, t.ref);
    } else out.push(`+ Transition ${t.text}`, t.ref);
  }
  for (const t of removed) out.push(`- Transition ${t.text}`, t.ref);
  diffEvents(before?.events ?? [], after?.events ?? [], out, id);
}

/** Sections added, removed or changed between two versions of an Area's `area.md` or of one of its fragments. */
function diffArea(path: string, before: string | undefined, after: string | undefined, out: Details) {
  const area = `${REQUIREMENTS_PREFIX}${areaIdOf(path) ?? ""}`;
  const parse = (content: string | undefined) => (content === undefined ? undefined : parseRequirementDoc(path, content, []));
  const a = parse(before);
  const b = parse(after);
  const was = new Map((a?.sections ?? []).map((s) => [s.heading.toLowerCase(), s]));
  const is = new Map((b?.sections ?? []).map((s) => [s.heading.toLowerCase(), s]));
  if (a && b && a.title !== b.title) out.push(`~ title: "${a.title}" → "${b.title}"`, area);
  if (a && b && a.description !== b.description) out.push("~ description changed", area);
  if (a && b && a.intro !== b.intro) out.push("~ introduction changed", area);
  for (const [key, s] of is) {
    const o = was.get(key);
    if (!o) out.push(`+ Requirements for ${s.heading}`, `${area}#${s.heading}`);
    else if (o.text !== s.text) out.push(`~ Requirements for ${s.heading}`, `${area}#${s.heading}`);
  }
  for (const [key, s] of was) if (!is.has(key)) out.push(`- Requirements for ${s.heading}`, `${area}#${s.heading}`);
}

/** What changed in one entry of a list field: version, note and chosenByAgent, each written with both values. */
function specEntryChanges(old: SpecEntry, is: SpecEntry): string[] {
  const shown = (v: string | null) => (v === null ? "none" : `"${v}"`);
  const out: string[] = [];
  if (old.version !== is.version) out.push(`version ${shown(old.version)} → ${shown(is.version)}`);
  if (old.note !== is.note) out.push("note changed");
  if (old.chosenByAgent !== is.chosenByAgent) out.push("chosenByAgent changed");
  return out;
}

/** Specs changed, field by field: entries added, removed or changed by name (names compared without case), and the notes. */
function diffSpecs(before: string | undefined, after: string | undefined, out: Details) {
  const read = (content: string | undefined): Specs => (content === undefined ? EMPTY_SPECS : parseSpecs(SPECS_FILE, content).specs);
  const a = read(before);
  const b = read(after);
  for (const field of SPEC_FIELDS) {
    if (sameSpecField(a, b, field)) continue;
    if (field === "notes") {
      out.push("~ notes changed", "specs#notes");
      continue;
    }
    const was = new Map(a.lists[field].map((e) => [e.name.toLowerCase(), e]));
    const is = new Map(b.lists[field].map((e) => [e.name.toLowerCase(), e]));
    const start = out.length;
    for (const [key, e] of is) {
      const old = was.get(key);
      if (!old) out.push(`+ ${field}: ${e.name}`, `specs#${field}`);
      else {
        const changes = specEntryChanges(old, e);
        if (changes.length > 0) out.push(`~ ${field}: ${e.name} ${changes.join(", ")}`, `specs#${field}`);
      }
    }
    for (const [key, e] of was) if (!is.has(key)) out.push(`- ${field}: ${e.name}`, `specs#${field}`);
    if (out.length === start) out.push(`~ ${field}: order changed`, `specs#${field}`);
  }
}

/**
 * What a file changes, line by line, each line with the reference of what it is about: the lines of `diffFile`, which is what `trama proposal show` lists, and the one
 * place that knows what a line is about. A line about the System, which has no reference, has none.
 */
export function diffEntries(path: string, before: string | undefined, after: string | undefined): { change: FileChange["change"]; entries: DetailEntry[] } {
  const change = before === undefined ? "added" : after === undefined ? "removed" : "modified";
  const details = new Details();
  if (path === SPECS_FILE) {
    diffSpecs(before, after, details);
    return { change, entries: details.entries };
  }
  if (path.startsWith(REQUIREMENTS_PREFIX)) {
    diffArea(path, before, after, details);
    return { change, entries: details.entries };
  }
  const a = before === undefined ? undefined : parseFile(path, before);
  const b = after === undefined ? undefined : parseFile(path, after);
  const sample = b ?? a;
  const id = (path.split("/").at(-1) as string).replace(/\.md$/, "");
  if (sample?.kind === "machine")
    diffMachines(a?.kind === "machine" ? a.value : undefined, b?.kind === "machine" ? b.value : undefined, details, id);
  else if (sample?.kind === "actor")
    diffEvents(a?.kind === "actor" ? a.value.events : [], b?.kind === "actor" ? b.value.events : [], details, id);
  else if (a?.kind === "doc" && b?.kind === "doc") {
    // `<feature>/feature.md` is about its Feature; `system.md` about the System, which has no reference.
    const ref = path.includes("/") ? (path.split("/")[0] as string) : null;
    if (a.name !== b.name) details.push(`~ name: "${a.name}" → "${b.name}"`, ref);
    if (a.description !== b.description) details.push("~ description changed", ref);
  }
  return { change, entries: details.entries };
}

export function diffFile(path: string, before: string | undefined, after: string | undefined): FileChange {
  const { change, entries } = diffEntries(path, before, after);
  const file: FileChange = { path, change, details: entries.map((entry) => entry.text) };
  if (path.startsWith(REQUIREMENTS_PREFIX)) {
    const [area, name] = path.slice(REQUIREMENTS_PREFIX.length).split("/") as [string, string | undefined];
    file.requirement = { area: area.replace(/\.md$/, ""), fragment: name === undefined || name === AREA_FILE ? null : name.replace(/\.md$/, "") };
  }
  return file;
}
