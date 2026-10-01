import { flattenStates } from "./model";
import { parseActor, parseDocument, parseMachine } from "./parse";
import type { Actor, Diagnostic, EventDecl, Machine } from "./types";

export interface FileChange {
  path: string;
  change: "added" | "removed" | "modified";
  /** Human-readable structural changes; `+` added, `-` removed, `~` changed. */
  details: string[];
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

function diffEvents(before: EventDecl[], after: EventDecl[], out: string[]) {
  const was = new Map(before.map((e) => [e.name, e]));
  const is = new Map(after.map((e) => [e.name, e]));
  for (const e of after) {
    const old = was.get(e.name);
    if (!old) out.push(`+ Event ${e.name}`);
    else if (old.description !== e.description) out.push(`~ Event ${e.name}: description changed`);
  }
  for (const e of before) if (!is.has(e.name)) out.push(`- Event ${e.name}`);
}

const signature = (state: string, event: string, target: string) => `${state} | ${event} → ${target}`;

function diffMachines(before: Machine | undefined, after: Machine | undefined, out: string[]) {
  if (before && after) {
    if (before.name !== after.name) out.push(`~ Machine name: "${before.name}" → "${after.name}"`);
    if (before.description !== after.description) out.push("~ Machine description changed");
  }
  const oldStates = new Map(flattenStates(before?.states ?? []).map((s) => [s.name.toLowerCase(), s]));
  const newStates = new Map(flattenStates(after?.states ?? []).map((s) => [s.name.toLowerCase(), s]));
  for (const [key, s] of newStates) {
    const old = oldStates.get(key);
    if (!old) {
      out.push(`+ State ${s.name}${s.initial ? " (initial)" : s.final ? " (final)" : ""}`);
      continue;
    }
    const changes: string[] = [];
    if (old.initial !== s.initial) changes.push(s.initial ? "became initial" : "no longer initial");
    if (old.final !== s.final) changes.push(s.final ? "became final" : "no longer final");
    if (old.parent !== s.parent) changes.push(`moved under ${s.parent ?? "the top level"}`);
    if (old.description !== s.description) changes.push("description changed");
    if (changes.length > 0) out.push(`~ State ${s.name}: ${changes.join(", ")}`);
  }
  for (const [key, s] of oldStates) if (!newStates.has(key)) out.push(`- State ${s.name}`);

  type Flat = { key: string; text: string; prose: string };
  const flatten = (m: Machine | undefined): Flat[] =>
    flattenStates(m?.states ?? []).flatMap((s) =>
      s.transitions.map((t) => ({
        key: signature(s.name, `${t.event.owner}.${t.event.name}`, t.target),
        text: `${signature(s.name, `${t.event.owner}.${t.event.name}`, t.target)}${t.prose ? `: ${t.prose}` : ""}`,
        prose: t.prose,
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
      out.push(`~ Transition ${t.key}: prose changed`);
    } else out.push(`+ Transition ${t.text}`);
  }
  for (const t of removed) out.push(`- Transition ${t.text}`);
  diffEvents(before?.events ?? [], after?.events ?? [], out);
}

export function diffFile(path: string, before: string | undefined, after: string | undefined): FileChange {
  const change = before === undefined ? "added" : after === undefined ? "removed" : "modified";
  const details: string[] = [];
  const a = before === undefined ? undefined : parseFile(path, before);
  const b = after === undefined ? undefined : parseFile(path, after);
  const sample = b ?? a;
  if (sample?.kind === "machine")
    diffMachines(a?.kind === "machine" ? a.value : undefined, b?.kind === "machine" ? b.value : undefined, details);
  else if (sample?.kind === "actor")
    diffEvents(a?.kind === "actor" ? a.value.events : [], b?.kind === "actor" ? b.value.events : [], details);
  else if (a?.kind === "doc" && b?.kind === "doc") {
    if (a.name !== b.name) details.push(`~ name: "${a.name}" → "${b.name}"`);
    if (a.description !== b.description) details.push("~ description changed");
  }
  return { path, change, details };
}
