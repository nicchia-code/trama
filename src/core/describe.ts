import { textFingerprint } from "./compared";
import { lineage } from "./graph";
import { receivers } from "./refs";
import { requirementSkillNames } from "./requirement-skills";
import { type Area, parseRequirementRef, type ProjectModel, requirementsFor, resolveProjectRef } from "./requirements";
import { SPEC_FIELDS, type SpecEntry, type SpecField } from "./specs";
import type { Actor, Machine, Model, State, Transition } from "./types";

/*
 * The text Trama gives for a Model element or Requirement: the briefing of a comparison, `task show`, `drift show`, and
 * the fingerprint of a reference that the comparison registry and a Drift's prepared question both use.
 */

export const firstLine = (text: string): string =>
  text
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0) ?? "";

export const dash = (text: string): string => (text ? ` — ${text}` : "");

export const prose = (t: Transition): string => (t.prose ? `: ${t.prose}` : "");

export const eventKey = (t: Transition): string => `${t.event.owner}.${t.event.name}`;

export function marker(s: State): string {
  return s.initial ? " (initial)" : s.final ? " (final)" : "";
}

export const bullets = (lines: string[], none = "_none_"): string => (lines.length > 0 ? lines.join("\n") : none);

function renderStates(states: State[], depth: number): string[] {
  const pad = "  ".repeat(depth);
  return states.flatMap((s) => [
    `${pad}- **${s.name}**${marker(s)}${dash(firstLine(s.description))}`,
    ...s.transitions.map((t) => `${pad}  - \`${eventKey(t)}\` → ${t.target}${prose(t)}`),
    ...renderStates(s.children, depth + 1),
  ]);
}

/** The State tree of a Machine, the same lines `trama model show <machine>` prints under States. */
export function stateTreeLines(states: State[]): string[] {
  return renderStates(states, 0);
}

/** One line per Event of a Machine or an Actor, with the States that receive it. */
export function machineReceiverLines(model: Model, machine: Machine | Actor): string[] {
  return machine.events.map((e) => {
    const received = receivers(model, machine.id, e.name);
    const who = received.map((r) => `${r.machine.id}/${r.state.name} → ${r.transition.target}`).join("; ") || "_nobody_";
    return `- \`${machine.id}.${e.name}\`${dash(firstLine(e.description))}\n  - Received by: ${who}`;
  });
}

/** Outgoing Transitions of a State, including those inherited from the States that contain it. */
export function outgoingLines(machine: Machine, state: State): string[] {
  const own = lineage(machine, state).flatMap((source) => source.transitions.map((t) => ({ from: source.name, t })));
  return own.map((o) => `- \`${eventKey(o.t)}\` → ${o.t.target}${prose(o.t)}${o.from === state.name ? "" : ` _(inherited from ${o.from})_`}`);
}

/** The Transitions that react to an Event, the same lines `trama model show <owner.EVENT>` prints. */
export function reactionLines(model: Model, ownerId: string, eventName: string): string[] {
  return receivers(model, ownerId, eventName).map((r) => `- ${r.machine.id}/${r.state.name} → ${r.transition.target}${prose(r.transition)}`);
}

/** The current text of a Model element or Requirement, for inlining into a Task or Drift. */
export function describeRef(project: ProjectModel, ref: string, full = false): string {
  let el;
  try {
    el = resolveProjectRef(project, ref);
  } catch {
    return `_\`${ref}\` no longer resolves in the Model or its Requirements._`;
  }
  switch (el.kind) {
    case "feature":
      return `${el.feature.name}${dash(el.feature.description)}\nMachines: ${el.feature.machines.join(", ") || "_none_"}`;
    case "actor":
      return `${el.actor.name}${dash(el.actor.description)}\nEvents: ${el.actor.events.map((e) => e.name).join(", ") || "_none_"}`;
    case "machine":
      if (!full) return `${el.machine.name}${dash(el.machine.description)}\nUse \`trama model show ${el.machine.id}\` for the full State tree.`;
      return [
        `${el.machine.name} (machine \`${el.machine.id}\`, feature \`${el.machine.feature}\`)`,
        el.machine.description,
        "States:",
        bullets(stateTreeLines(el.machine.states)),
        "Events:",
        bullets(machineReceiverLines(project.model, el.machine)),
      ]
        .filter((part) => part !== "")
        .join("\n");
    case "state":
      return [
        `${el.state.name}${marker(el.state)}${dash(el.state.description)}`,
        ...(full ? outgoingLines(el.machine, el.state) : el.state.transitions.map((t) => `- \`${eventKey(t)}\` → ${t.target}${prose(t)}`)),
      ].join("\n");
    case "transition":
      return el.transitions.map((t) => `- ${el.state.name}: \`${eventKey(t)}\` → ${t.target}${prose(t)}`).join("\n");
    case "event":
      if (!full) return `${ref}${dash(el.event.description)}`;
      return [
        `\`${ref}\` (emitted by ${project.model.machines.has(el.owner.id) ? "Machine" : "Actor"} \`${el.owner.id}\`)${dash(el.event.description)}`,
        "Transitions that react to it:",
        bullets(reactionLines(project.model, el.owner.id, el.event.name)),
      ].join("\n");
    case "requirement": {
      if (el.section) return `${el.area.title}, ${el.section.ref ?? "General"}:\n${el.section.text || "_empty_"}`;
      if (full) return areaText(el.area);
      const skills = requirementSkillNames(project, el.area);
      const pointer = skills.length === 0 ? "" : ` Load ${skills.map((s) => `the ${s}`).join(", ")} skill${skills.length > 1 ? "s" : ""} for the full text.`;
      return `${el.area.title}: ${el.area.sections.filter((s) => s.text !== "").map((s) => s.ref ?? "General").join(", ") || "_empty_"}.${pointer}`;
    }
    case "specs": {
      const entry = (e: SpecEntry) => `${e.name}${e.version ? ` ${e.version}` : ""}${e.chosenByAgent ? " (chosen by agent)" : ""}`;
      const fields: readonly SpecField[] = el.field === null ? SPEC_FIELDS : [el.field];
      return fields.map((f) => (f === "notes" ? `Notes: ${project.specs.notes || "_empty_"}` : `${f}: ${project.specs.lists[f].map(entry).join("; ") || "_empty_"}`)).join("\n");
    }
  }
}

/** Title, introduction and every section of an Area, so a Task can be carried out without opening the Area's skill. */
function areaText(area: Area): string {
  const sections = area.sections.map((s) => `## ${s.ref ?? "General"}\n${s.text || "_empty_"}`);
  return [area.title, area.description, area.intro, ...sections].filter((part) => part !== "").join("\n\n");
}

const quoteBlock = (key: string, text: string) => `- \`${key}\`\n${text.split("\n").map((l) => `  > ${l}`).join("\n")}`;

/**
 * Requirements attached to the referenced Model elements or to what contains them, except those referenced
 * directly, plus a pointer to the Areas' General Requirements, which apply to everything.
 */
export function requirementsBlock(project: ProjectModel, refs: string[], general: "pointer" | "text" | "none" = "pointer"): string {
  const explicit = new Set(refs.filter((r) => parseRequirementRef(r) !== null));
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const ref of refs) {
    if (parseRequirementRef(ref) !== null) continue;
    for (const r of requirementsFor(project, ref)) {
      const key = `requirements/${r.area.id}#${r.section.ref}`;
      if (seen.has(key) || explicit.has(key) || explicit.has(`requirements/${r.area.id}`)) continue;
      seen.add(key);
      lines.push(quoteBlock(key, r.section.text));
    }
  }
  if (general === "text") {
    for (const area of project.areas) {
      const section = area.sections.find((s) => s.ref === null && s.text !== "");
      const key = `requirements/${area.id}#General`;
      if (!section || explicit.has(key)) continue;
      lines.push(quoteBlock(key, section.text));
    }
  } else if (general === "pointer") {
    const areas = project.areas.filter((a) => a.sections.some((s) => s.ref === null && s.text !== "") || a.intro !== "");
    const named = (a: Area) => {
      const general = a.sections.find((s) => s.ref === null && s.text !== "") ?? null;
      const skills = requirementSkillNames(project, a, general).concat(general ? [] : requirementSkillNames(project, a));
      return skills.length === 0 ? a.title : `${a.title} (skill${skills.length > 1 ? "s" : ""} ${skills.map((s) => `\`${s}\``).join(", ")})`;
    };
    if (areas.length > 0) lines.push(`- General Requirements apply too: ${areas.map(named).join(", ")}.`);
  }
  return bullets(lines, "_No Requirements apply._");
}

/** The text the briefing of a comparison gives for one reference: its element and the Requirements that apply to it. */
export const referenceText = (project: ProjectModel, ref: string): string => `${describeRef(project, ref, true)}\n${requirementsBlock(project, [ref], "none")}`;

/** The fingerprint of the text the briefing gives for one reference: what a comparison records and the pre-flight checks. */
export const referenceFingerprint = (project: ProjectModel, ref: string): string => textFingerprint(referenceText(project, ref));

/** The fingerprint of the briefing text of several references in order: what a Drift's prepared question records. */
export const referencesFingerprint = (project: ProjectModel, refs: string[]): string => textFingerprint(refs.map((ref) => referenceText(project, ref)).join("\n"));
