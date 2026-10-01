import { existsSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { TramaError } from "./errors";
import { buildModel, findState, flattenStates } from "./model";
import { type Element, resolveRef } from "./refs";
import { type Project, readTrackedFiles, REQUIREMENTS_PREFIX, requirementsDir, writeFileEnsuringDir } from "./store";
import type { Diagnostic, FileMap, Machine, Model, State } from "./types";
import { ID_PATTERN } from "./types";

/** A section of an Area: the general part, or the part about one element of the Model. */
export interface RequirementSection {
  /** `null` for `## General`; otherwise the Model reference in the heading, as written. */
  ref: string | null;
  text: string;
  line: number;
}

/** One `.trama/requirements/<id>.md` file. */
export interface Area {
  id: string;
  /** Tracked path, `requirements/<id>.md`. */
  file: string;
  title: string;
  /** When an agent needs this Area; becomes the description of the generated skill. */
  description: string;
  /** Prose between the H1 and the first section. */
  intro: string;
  sections: RequirementSection[];
}

/** The Model with its Requirements, validated together. */
export interface ProjectModel {
  model: Model;
  areas: Area[];
  /** Model diagnostics followed by Requirement diagnostics. */
  diagnostics: Diagnostic[];
}

/** The five Areas a new project starts with. */
export const DEFAULT_AREAS: { id: string; title: string; description: string }[] = [
  { id: "ui", title: "Interface", description: "Use when building or changing screens, layout, styling, components, navigation look or texts shown to users." },
  { id: "tech", title: "Technology and constraints", description: "Use when choosing or using languages, frameworks, libraries, platforms, project structure or build and deploy setup." },
  { id: "quality", title: "Quality", description: "Use when the work touches performance, security, privacy, accessibility, offline behaviour, localisation or reliability." },
  { id: "data", title: "Data", description: "Use when defining, storing, validating or showing the information the System keeps and what each piece contains." },
  { id: "rules", title: "Business rules", description: "Use when implementing calculations, limits, policies or other business rules behind the Model's conditions and consequences." },
];

export const defaultAreaFile = (a: { title: string; description: string }) =>
  `---\ndescription: ${JSON.stringify(a.description)}\n---\n# ${a.title}\n\n## General\n`;

const GENERAL = "general";

/** Parses one Area file and checks its section references against `model`. */
export function parseArea(id: string, file: string, content: string, model: Model, diags: Diagnostic[]): Area {
  const area: Area = { id, file, title: "", description: "", intro: "", sections: [] };
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  let start = 0;
  if (lines[0] === "---") {
    const end = lines.indexOf("---", 1);
    if (end < 0) diags.push({ file, line: 1, message: "Front matter is not closed with ---" });
    else {
      let data: unknown;
      try {
        data = parse(lines.slice(1, end).join("\n"));
      } catch (err) {
        diags.push({ file, line: 1, message: `Invalid YAML front matter: ${(err as Error).message.split("\n")[0]}` });
      }
      const description = typeof data === "object" && data !== null && !Array.isArray(data) ? (data as Record<string, unknown>)["description"] : undefined;
      if (typeof description === "string" && description.trim() !== "") area.description = description.trim();
      start = end + 1;
    }
  }
  if (area.description === "") diags.push({ file, line: 1, message: 'Missing "description" in the front matter: say when an agent needs these Requirements' });

  const seen = new Set<string>();
  let current: RequirementSection | null = null;
  const intro: string[] = [];
  let body: string[] = [];
  const close = () => {
    if (current) {
      current.text = body.join("\n").trim();
      area.sections.push(current);
    }
    body = [];
  };
  let fenced = false;
  for (let i = start; i < lines.length; i++) {
    const line = lines[i] as string;
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    const h = fenced ? null : /^(#{1,6})\s+(.*\S)\s*$/.exec(line);
    if (h && h[1] === "#") {
      if (area.title) diags.push({ file, line: i + 1, message: "More than one H1" });
      else area.title = h[2] as string;
      continue;
    }
    if (h && h[1] === "##") {
      close();
      const heading = (h[2] as string).trim();
      const isGeneral = heading.toLowerCase() === GENERAL;
      const key = isGeneral ? GENERAL : heading;
      if (seen.has(key)) diags.push({ file, line: i + 1, message: `Duplicate section "## ${heading}"` });
      seen.add(key);
      if (!isGeneral) {
        try {
          resolveRef(model, heading);
        } catch (err) {
          const why = (err as Error).message.replace(/^Cannot resolve "[^"]*": /, "");
          diags.push({ file, line: i + 1, message: `Section "## ${heading}" does not match the Model: ${why}. Use "## General" or a Model reference such as order/Paid` });
        }
      }
      current = { ref: isGeneral ? null : heading, text: "", line: i + 1 };
      continue;
    }
    if (current) body.push(line);
    else intro.push(line);
  }
  close();
  area.intro = intro.join("\n").trim();
  if (!area.title) diags.push({ file, line: 0, message: "Missing H1 with the Area's title" });
  return area;
}

/** Splits a tracked file map into Model files (relative to `model/`) and Area files (by tracked path). */
export function splitTracked(files: FileMap): { model: FileMap; requirements: FileMap } {
  const model: FileMap = new Map();
  const requirements: FileMap = new Map();
  for (const [path, content] of files) (path.startsWith(REQUIREMENTS_PREFIX) ? requirements : model).set(path, content);
  return { model, requirements };
}

/** Builds and validates the Model and its Requirements from a tracked file map. */
export function buildProject(files: FileMap): ProjectModel {
  const { model: modelFiles, requirements } = splitTracked(files);
  const model = buildModel(modelFiles);
  const diagnostics: Diagnostic[] = [];
  const areas: Area[] = [];
  for (const [path, content] of [...requirements].sort(([a], [b]) => a.localeCompare(b))) {
    const rel = path.slice(REQUIREMENTS_PREFIX.length);
    const id = rel.replace(/\.md$/, "");
    if (rel.includes("/") || !rel.endsWith(".md") || !ID_PATTERN.test(id)) {
      diagnostics.push({ file: path, line: 0, message: "Requirement files are requirements/<area>.md with a kebab-case Area name" });
      continue;
    }
    areas.push(parseArea(id, path, content, model, diagnostics));
  }
  return { model, areas, diagnostics: [...model.diagnostics, ...diagnostics] };
}

/** A reference to Requirements: `requirements/<area>` or `requirements/<area>#<model reference>`. */
export function parseRequirementRef(ref: string): { area: string; section: string | null } | null {
  if (!ref.startsWith(REQUIREMENTS_PREFIX)) return null;
  const rest = ref.slice(REQUIREMENTS_PREFIX.length);
  const hash = rest.indexOf("#");
  return hash < 0 ? { area: rest, section: null } : { area: rest.slice(0, hash), section: rest.slice(hash + 1) };
}

export type ProjectElement = Element | { kind: "requirement"; ref: string; area: Area; section: RequirementSection | null };

/** Resolves a Model reference, or a Requirement reference (`requirements/ui`, `requirements/ui#order/Paid`). */
export function resolveProjectRef(project: ProjectModel, ref: string): ProjectElement {
  const req = parseRequirementRef(ref);
  if (!req) return resolveRef(project.model, ref);
  const area = project.areas.find((a) => a.id === req.area);
  if (!area) throw new TramaError(`Cannot resolve "${ref}": no Area "${req.area}" in .trama/requirements/`);
  if (req.section === null) return { kind: "requirement", ref, area, section: null };
  const wanted = req.section.toLowerCase() === GENERAL ? null : req.section;
  const section = area.sections.find((s) => (s.ref === null ? wanted === null : wanted !== null && s.ref.toLowerCase() === wanted.toLowerCase()));
  if (!section) throw new TramaError(`Cannot resolve "${ref}": Area "${area.id}" has no section "## ${req.section}"`);
  return { kind: "requirement", ref, area, section };
}

/** The Model elements that contain `element` (itself first): a State's parent States, its Machine and Feature. */
function lineageRefs(model: Model, element: Element): string[] {
  const machineChain = (machine: Machine, state: State | null): string[] => {
    const refs: string[] = [];
    for (let s: State | undefined = state ?? undefined; s; s = s.parent ? findState(machine, s.parent) : undefined) refs.push(`${machine.id}/${s.name}`);
    refs.push(machine.id, machine.feature);
    return refs;
  };
  switch (element.kind) {
    case "feature":
      return [element.feature.id];
    case "machine":
      return machineChain(element.machine, null);
    case "state":
      return machineChain(element.machine, element.state);
    case "transition":
      return [element.ref, ...machineChain(element.machine, element.state)];
    case "actor":
      return [element.actor.id];
    case "event":
      return [element.ref, element.owner.id];
  }
}

export interface AttachedRequirement {
  area: Area;
  section: RequirementSection;
  /** The element the section is attached to: the asked element or one that contains it. */
  ref: string;
}

/** Requirement sections attached to `ref` or to an element containing it, most specific first. */
export function requirementsFor(project: ProjectModel, ref: string): AttachedRequirement[] {
  let element: Element;
  try {
    element = resolveRef(project.model, ref);
  } catch {
    return [];
  }
  const out: AttachedRequirement[] = [];
  for (const target of lineageRefs(project.model, element)) {
    let targetElement: Element;
    try {
      targetElement = resolveRef(project.model, target);
    } catch {
      continue;
    }
    for (const area of project.areas)
      for (const section of area.sections) {
        if (section.ref === null || section.text === "") continue;
        let sectionElement: Element;
        try {
          sectionElement = resolveRef(project.model, section.ref);
        } catch {
          continue;
        }
        if (sameElement(sectionElement, targetElement)) out.push({ area, section, ref: target });
      }
  }
  return out;
}

function sameElement(a: Element, b: Element): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case "state":
      return b.kind === "state" && a.machine.id === b.machine.id && a.state.name === b.state.name;
    case "transition":
      return b.kind === "transition" && a.machine.id === b.machine.id && a.state.name === b.state.name && a.event === b.event;
    default:
      return a.ref === b.ref;
  }
}

/** The Features whose code a Requirement attached to `ref` concerns; none if `ref` does not resolve in `model`. */
export function featuresOfRef(model: Model, ref: string): string[] {
  let el: Element;
  try {
    el = resolveRef(model, ref);
  } catch {
    return [];
  }
  switch (el.kind) {
    case "feature":
      return [el.feature.id];
    case "machine":
    case "state":
    case "transition":
      return [el.machine.feature];
    default: {
      const owner = el.kind === "actor" ? el.actor.id : el.owner.id;
      const ownerMachine = model.machines.get(owner);
      if (ownerMachine) return [ownerMachine.feature];
      const features = new Set<string>();
      for (const m of model.machines.values())
        if (flattenStates(m.states).some((s) => s.transitions.some((t) => t.event.owner === owner))) features.add(m.feature);
      return [...features].sort();
    }
  }
}

/** Whether an Area has anything for an agent to read. */
export const hasContent = (area: Area): boolean => area.intro !== "" || area.sections.some((s) => s.text !== "");

/** The project's Model and Requirements as they are on disk. */
export const loadProject = (p: Project): ProjectModel => buildProject(readTrackedFiles(p));

/** Writes the starting Areas into `.trama/requirements/`, skipping existing files; returns the Area IDs written. */
export function createDefaultAreas(p: Project): string[] {
  const written: string[] = [];
  for (const area of DEFAULT_AREAS) {
    const file = join(requirementsDir(p), `${area.id}.md`);
    if (existsSync(file)) continue;
    writeFileEnsuringDir(file, defaultAreaFile(area));
    written.push(area.id);
  }
  return written;
}
