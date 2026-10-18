import type { Actor, Diagnostic, EventDecl, Machine, State, Transition } from "./types";
import { EVENT_NAME_PATTERN, ID_PATTERN } from "./types";
import { normalizeLf } from "./store";

interface Line {
  n: number;
  text: string;
  /** Set for ATX headings outside code fences. */
  heading: { level: number; text: string } | null;
  fenced: boolean;
}

function scan(content: string): Line[] {
  const lines: Line[] = [];
  let fence: string | null = null;
  const raw = normalizeLf(content).split("\n");
  for (let i = 0; i < raw.length; i++) {
    const text = raw[i] ?? "";
    const fenceMatch = /^\s{0,3}(`{3,}|~{3,})/.exec(text);
    let fenced = fence !== null;
    if (fenceMatch) {
      const marker = fenceMatch[1] as string;
      if (fence === null) {
        fence = marker;
        fenced = true;
      } else if (marker[0] === fence[0] && marker.length >= fence.length) {
        fence = null;
      }
    }
    const h = fenced ? null : /^(#{1,6})\s+(.*\S)\s*$/.exec(text);
    lines.push({
      n: i + 1,
      text,
      fenced,
      heading: h ? { level: (h[1] as string).length, text: (h[2] as string).replace(/\s+#+$/, "") } : null,
    });
  }
  return lines;
}

function joinProse(parts: string[]): string {
  return parts.join("\n").trim();
}

const STATE_FORBIDDEN = /[\/:()→`]/;
const EVENT_REF = /^(?:([a-z][a-z0-9]*(?:-[a-z0-9]+)*)\.)?([A-Z][A-Z0-9_]*)$/;
const TRANSITION_START = /^[-*]\s+`/;
const TRANSITION = /^[-*]\s+`([^`]*)`\s*(?:→|->)\s*([^:]*?)\s*(?::\s*(.*))?$/;

/** Parses `system.md` / `feature.md`: an H1, then free prose. */
export function parseDocument(
  file: string,
  content: string,
  diags: Diagnostic[],
): { name: string; description: string } {
  const lines = scan(content);
  const h1s = lines.filter((l) => l.heading?.level === 1);
  if (h1s.length === 0) diags.push({ file, line: 0, message: "Missing H1 with the display name" });
  for (const extra of h1s.slice(1)) diags.push({ file, line: extra.n, message: "More than one H1" });
  const first = h1s[0];
  if (!first) return { name: "", description: "" };
  const rest = lines.filter((l) => l.n > first.n && l.heading?.level !== 1).map((l) => l.text);
  return { name: first.heading?.text ?? "", description: joinProse(rest) };
}

interface Sections {
  name: string;
  description: string;
  /** Lines of each H2 section, in file order. */
  h2: { name: string; line: number; lines: Line[] }[];
}

function splitSections(file: string, content: string, diags: Diagnostic[]): Sections {
  const lines = scan(content);
  const h1s = lines.filter((l) => l.heading?.level === 1);
  if (h1s.length === 0) diags.push({ file, line: 0, message: "Missing H1 with the display name" });
  for (const extra of h1s.slice(1)) diags.push({ file, line: extra.n, message: "More than one H1" });
  const first = h1s[0];
  const out: Sections = { name: first?.heading?.text ?? "", description: "", h2: [] };
  const intro: string[] = [];
  let current: Sections["h2"][number] | null = null;
  for (const l of lines) {
    if (first && l.n <= first.n) continue;
    if (l.heading?.level === 1) continue;
    if (l.heading?.level === 2) {
      current = { name: l.heading.text, line: l.n, lines: [] };
      out.h2.push(current);
    } else if (current) current.lines.push(l);
    else intro.push(l.text);
  }
  out.description = joinProse(intro);
  return out;
}

function parseEvents(file: string, section: Sections["h2"][number], diags: Diagnostic[]): EventDecl[] {
  const events: EventDecl[] = [];
  let current: { name: string; line: number; desc: string[] } | null = null;
  const flush = () => {
    if (current) events.push({ name: current.name, line: current.line, description: joinProse(current.desc) });
  };
  for (const l of section.lines) {
    if (l.heading) {
      if (l.heading.level !== 3) {
        diags.push({ file, line: l.n, message: "Only H3 headings (Event names) are allowed under ## Events" });
        continue;
      }
      flush();
      current = { name: l.heading.text, line: l.n, desc: [] };
    } else current?.desc.push(l.text);
  }
  flush();
  const seen = new Set<string>();
  for (const e of events) {
    if (!EVENT_NAME_PATTERN.test(e.name))
      diags.push({ file, line: e.line, message: `Event name "${e.name}" is not UPPER_SNAKE_CASE` });
    if (seen.has(e.name)) diags.push({ file, line: e.line, message: `Duplicate Event "${e.name}"` });
    seen.add(e.name);
  }
  return events;
}

function checkSections(
  file: string,
  sections: Sections,
  allowed: string[],
  diags: Diagnostic[],
): Record<string, Sections["h2"][number]> {
  const found: Record<string, Sections["h2"][number]> = {};
  let lastIndex = -1;
  for (const s of sections.h2) {
    const index = allowed.indexOf(s.name);
    if (index < 0) {
      diags.push({ file, line: s.line, message: `Unknown section "## ${s.name}" (allowed: ${allowed.map((a) => `## ${a}`).join(", ")})` });
      continue;
    }
    if (found[s.name]) {
      diags.push({ file, line: s.line, message: `Duplicate section "## ${s.name}"` });
      continue;
    }
    if (index < lastIndex) diags.push({ file, line: s.line, message: `Section "## ${s.name}" is out of order` });
    lastIndex = Math.max(lastIndex, index);
    found[s.name] = s;
  }
  return found;
}

export function parseActor(id: string, file: string, content: string, diags: Diagnostic[]): Actor {
  const sections = splitSections(file, content, diags);
  const found = checkSections(file, sections, ["Events"], diags);
  const events = found["Events"] ? parseEvents(file, found["Events"], diags) : [];
  return { id, file, name: sections.name, description: sections.description, events };
}

interface DraftState extends Omit<State, "children"> {
  level: number;
  desc: string[];
  children: DraftState[];
}

function parseTransition(
  file: string,
  machineId: string,
  l: Line,
  diags: Diagnostic[],
): Transition | null {
  const m = TRANSITION.exec(l.text.trim());
  if (!m) {
    diags.push({ file, line: l.n, message: "Malformed Transition; expected: - `event` → Target State[: prose]" });
    return null;
  }
  const ref = EVENT_REF.exec((m[1] as string).trim());
  if (!ref) {
    diags.push({ file, line: l.n, message: `Malformed Event reference \`${m[1]}\`; expected \`owner.EVENT\` or \`EVENT\`` });
    return null;
  }
  const target = (m[2] as string).trim();
  if (!target) {
    diags.push({ file, line: l.n, message: "Transition has no target State" });
    return null;
  }
  return {
    event: { owner: ref[1] ?? machineId, name: ref[2] as string },
    target,
    prose: (m[3] ?? "").trim(),
    line: l.n,
  };
}

function parseStates(
  file: string,
  machineId: string,
  section: Sections["h2"][number],
  diags: Diagnostic[],
): State[] {
  const roots: DraftState[] = [];
  const stack: DraftState[] = [];
  let current: DraftState | null = null;
  let lastTransition: Transition | null = null;

  for (const l of section.lines) {
    if (l.heading) {
      const { level, text } = l.heading;
      const top = stack[stack.length - 1];
      const maxLevel = top ? top.level + 1 : 3;
      let effective = level;
      if (level < 3) effective = 3;
      if (level > maxLevel) {
        diags.push({ file, line: l.n, message: `Heading level skipped: "${text}" is H${level} but the deepest allowed here is H${maxLevel}` });
        effective = maxLevel;
      }
      while (stack.length > 0 && (stack.at(-1)?.level ?? 0) >= effective) stack.pop();
      const parent = stack[stack.length - 1] ?? null;

      let name = text.trim();
      let initial = false;
      let final = false;
      const marker = /^(.*?)\s*\((initial|final)\)$/.exec(name);
      if (marker) {
        name = (marker[1] as string).trim();
        initial = marker[2] === "initial";
        final = marker[2] === "final";
      }
      if (!name) diags.push({ file, line: l.n, message: "State has no name" });
      else if (STATE_FORBIDDEN.test(name))
        diags.push({ file, line: l.n, message: `State name "${name}" contains a forbidden character (/ : ( ) → \`)` });

      const state: DraftState = {
        name,
        initial,
        final,
        description: "",
        transitions: [],
        children: [],
        parent: parent ? parent.name : null,
        line: l.n,
        level: effective,
        desc: [],
      };
      (parent ? parent.children : roots).push(state);
      stack.push(state);
      current = state;
      lastTransition = null;
      continue;
    }
    if (!current) continue;
    if (!l.fenced && TRANSITION_START.test(l.text)) {
      const t = parseTransition(file, machineId, l, diags);
      if (t) current.transitions.push(t);
      lastTransition = t;
    } else if (!l.fenced && lastTransition && /^\s+\S/.test(l.text)) {
      lastTransition.prose = `${lastTransition.prose} ${l.text.trim()}`.trim();
    } else {
      if (l.text.trim() === "") lastTransition = null;
      current.desc.push(l.text);
    }
  }

  const finish = (s: DraftState): State => {
    const { level: _level, desc, ...rest } = s;
    return { ...rest, description: joinProse(desc), children: s.children.map(finish) };
  };
  return roots.map(finish);
}

function walk(states: State[], visit: (s: State) => void) {
  for (const s of states) {
    visit(s);
    walk(s.children, visit);
  }
}

function checkStates(file: string, states: State[], diags: Diagnostic[]) {
  const seen = new Map<string, State>();
  walk(states, (s) => {
    const key = s.name.toLowerCase();
    if (seen.has(key)) diags.push({ file, line: s.line, message: `Duplicate State name "${s.name}"` });
    else seen.set(key, s);
    if (s.final && s.children.length > 0)
      diags.push({ file, line: s.line, message: `Final State "${s.name}" cannot have sub-States` });
    if (s.final && s.transitions.length > 0)
      diags.push({ file, line: s.line, message: `Final State "${s.name}" cannot have outgoing Transitions` });
  });
  const checkLevel = (level: State[], where: string, line: number) => {
    if (level.length === 0) return;
    const initials = level.filter((s) => s.initial);
    if (initials.length !== 1)
      diags.push({ file, line, message: `${where} must have exactly one (initial) State, found ${initials.length}` });
    for (const s of level) checkLevel(s.children, `Sub-States of "${s.name}"`, s.line);
  };
  checkLevel(states, "The Machine", states[0]?.line ?? 0);
}

export function parseMachine(
  id: string,
  feature: string,
  file: string,
  content: string,
  diags: Diagnostic[],
): Machine {
  const sections = splitSections(file, content, diags);
  const found = checkSections(file, sections, ["States", "Events"], diags);
  let states: State[] = [];
  if (!found["States"]) diags.push({ file, line: 0, message: "Missing required section \"## States\"" });
  else {
    states = parseStates(file, id, found["States"], diags);
    if (states.length === 0) diags.push({ file, line: found["States"].line, message: "Machine has no States" });
    checkStates(file, states, diags);
  }
  const events = found["Events"] ? parseEvents(file, found["Events"], diags) : [];
  return { id, feature, file, name: sections.name, description: sections.description, states, events };
}

export function checkId(file: string, id: string, diags: Diagnostic[]): boolean {
  if (!ID_PATTERN.test(id)) {
    diags.push({ file, line: 0, message: `Invalid ID "${id}": must be kebab-case (a-z, 0-9, -)` });
    return false;
  }
  return true;
}
