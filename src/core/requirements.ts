import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { EMPTY_SPECS, isSpecField, isSpecsRef, parseSpecs, SPECS_FILE, type SpecField, type Specs } from "./specs";
import { parse } from "yaml";
import { TramaError } from "./errors";
import { buildModel, findState, flattenStates } from "./model";
import { type Element, resolveRef } from "./refs";
import { normalizeLf } from "./line-endings";
import { type Project, readTextLf, readTrackedFiles, REQUIREMENTS_PREFIX, requirementsDir, writeFileEnsuringDir } from "./store";
import type { Diagnostic, FileMap, Machine, Model, State } from "./types";
import { ID_PATTERN, isWindowsDeviceName } from "./types";

/** A section of an Area: the general part, or the part about one element of the Model. */
export interface RequirementSection {
  /** `null` for `## General`; otherwise the Model reference in the heading, as written. */
  ref: string | null;
  text: string;
  line: number;
  /** Tracked path of the fragment the section is written in, `requirements/<area>/<fragment>.md`. */
  file: string;
}

/** One fragment of an Area, `requirements/<area>/<fragment>.md`: its own description and title, then sections only. */
export interface Fragment {
  id: string;
  /** Tracked path, `requirements/<area>/<fragment>.md`. */
  file: string;
  title: string;
  /** When an agent needs this fragment. */
  description: string;
  sections: RequirementSection[];
}

/** One Area, the folder `.trama/requirements/<id>/`: its `area.md` and its fragments. */
export interface Area {
  id: string;
  /** Tracked path of the Area's own file, `requirements/<id>/area.md`. */
  file: string;
  title: string;
  /** When an agent needs this Area; becomes the description of the generated skill. */
  description: string;
  /** Prose of `area.md` after its H1, which applies to the whole Area. */
  intro: string;
  /** Fragments by name. */
  fragments: Fragment[];
  /** The sections of every fragment, fragment by fragment; each appears once in the Area. */
  sections: RequirementSection[];
}

/** The Area's own file inside its folder. */
export const AREA_FILE = "area.md";

/** Characters of Requirement skill descriptions the agents' skill list can take before Trama switches to index skills. */
export const REQUIREMENT_SKILLS_BUDGET = 4000;

/** Bytes of a fragment file, front matter included, past which `trama validate` and `trama analyze` warn. */
export const FRAGMENT_MAX_BYTES = 12288;

/** The Model with its Requirements, validated together. */
export interface ProjectModel {
  model: Model;
  areas: Area[];
  /** The Specs as read; every field empty when the file is absent. */
  specs: Specs;
  /** Whether a valid Specs makes the `trama-specs` skill exist, so that it takes budget. */
  specsSkill: boolean;
  /** Whether the `specs.yaml` file exists, valid or not: the Specs tab says there are no Specs only when it does not. */
  specsPresent: boolean;
  /** Model diagnostics, then Requirement diagnostics, then Specs diagnostics. */
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

/** `area.md` of a starting Area: description and title, no sections. */
export const defaultAreaFile = (a: { title: string; description: string }) => `---\ndescription: ${JSON.stringify(a.description)}\n---\n# ${a.title}\n`;

const GENERAL = "general";

/** A Requirement file read as written: front matter description, H1, prose before the first section, sections. */
export interface RequirementDoc {
  description: string;
  title: string;
  intro: string;
  /** Line of the first non-blank line of the prose before the first section; 0 when there is none. */
  introLine: number;
  sections: { heading: string; text: string; line: number }[];
}

/** Parses an `area.md` or a fragment without checking it against the Model; problems with its shape go to `diags`. */
export function parseRequirementDoc(file: string, content: string, diags: Diagnostic[]): RequirementDoc {
  const doc: RequirementDoc = { description: "", title: "", intro: "", introLine: 0, sections: [] };
  const lines = normalizeLf(content).split("\n");
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
      if (typeof description === "string" && description.trim() !== "") doc.description = description.trim();
      start = end + 1;
    }
  }
  let current: RequirementDoc["sections"][number] | null = null;
  const intro: string[] = [];
  let body: string[] = [];
  const close = () => {
    if (current) {
      current.text = body.join("\n").trim();
      doc.sections.push(current);
    }
    body = [];
  };
  let fenced = false;
  for (let i = start; i < lines.length; i++) {
    const line = lines[i] as string;
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    const h = fenced ? null : /^(#{1,6})\s+(.*\S)\s*$/.exec(line);
    if (h && h[1] === "#") {
      if (doc.title) diags.push({ file, line: i + 1, message: "More than one H1" });
      else doc.title = h[2] as string;
      continue;
    }
    if (h && h[1] === "##") {
      close();
      current = { heading: (h[2] as string).trim(), text: "", line: i + 1 };
      continue;
    }
    if (current) body.push(line);
    else {
      if (doc.introLine === 0 && line.trim() !== "") doc.introLine = i + 1;
      intro.push(line);
    }
  }
  close();
  doc.intro = intro.join("\n").trim();
  return doc;
}

/** Parses `requirements/<id>/area.md`: description, title and prose for the whole Area, and no sections. */
export function parseAreaFile(id: string, file: string, content: string, diags: Diagnostic[]): Area {
  const doc = parseRequirementDoc(file, content, diags);
  if (doc.description === "") diags.push({ file, line: 1, message: 'Missing "description" in the front matter: say when an agent needs this Area' });
  if (!doc.title) diags.push({ file, line: 0, message: "Missing H1 with the Area's title" });
  for (const s of doc.sections)
    diags.push({ file, line: s.line, message: `area.md has no sections: move "## ${s.heading}" into a fragment, requirements/${id}/<fragment>.md` });
  return { id, file, title: doc.title, description: doc.description, intro: doc.intro, fragments: [], sections: [] };
}

/** Parses one fragment and checks its section references against `model`. */
export function parseFragment(id: string, file: string, content: string, model: Model, diags: Diagnostic[]): Fragment {
  const doc = parseRequirementDoc(file, content, diags);
  if (doc.description === "") diags.push({ file, line: 1, message: 'Missing "description" in the front matter: say when an agent needs this fragment' });
  if (!doc.title) diags.push({ file, line: 0, message: "Missing H1 with the fragment's title" });
  if (doc.intro !== "")
    diags.push({ file, line: doc.introLine, message: "Text before the first section: a fragment holds only sections; prose for the whole Area goes in area.md" });
  const sections = doc.sections.map((s): RequirementSection => {
    const isGeneral = s.heading.toLowerCase() === GENERAL;
    if (!isGeneral) {
      try {
        resolveRef(model, s.heading);
      } catch (err) {
        const why = (err as Error).message.replace(/^Cannot resolve "[^"]*": /, "");
        diags.push({ file, line: s.line, message: `Section "## ${s.heading}" does not match the Model: ${why}. Use "## General" or a Model reference such as order/Paid` });
      }
    }
    return { ref: isGeneral ? null : s.heading, text: s.text, line: s.line, file };
  });
  return { id, file, title: doc.title, description: doc.description, sections };
}

/** The Area a tracked Requirement path belongs to: `requirements/ui/area.md` → `ui`; null outside `requirements/`. */
export function areaIdOf(path: string): string | null {
  if (!path.startsWith(REQUIREMENTS_PREFIX)) return null;
  return (path.slice(REQUIREMENTS_PREFIX.length).split("/")[0] as string).replace(/\.md$/, "");
}

/** Builds the Areas from the Requirement files of a tracked file map, checking their layout and sections. */
function buildAreas(requirements: FileMap, model: Model, diagnostics: Diagnostic[]): Area[] {
  const folders = new Map<string, Map<string, { path: string; content: string }>>();
  for (const [path, content] of [...requirements].sort(([a], [b]) => a.localeCompare(b))) {
    const parts = path.slice(REQUIREMENTS_PREFIX.length).split("/");
    const [folder, name] = parts as [string, string | undefined];
    if (name === undefined) {
      diagnostics.push({
        file: path,
        line: 0,
        message: folder.endsWith(".md")
          ? `Requirement Areas are folders, requirements/<area>/area.md with fragments beside it: run "trama skills update" to convert this file`
          : "Requirement files live in Area folders, requirements/<area>/",
      });
      continue;
    }
    if (!ID_PATTERN.test(folder)) {
      diagnostics.push({ file: path, line: 0, message: `Area folder "${folder}" is not a kebab-case name` });
      continue;
    }
    if (isWindowsDeviceName(folder)) {
      diagnostics.push({ file: path, line: 0, message: `Area folder "${folder}" is a name Windows reserves for devices` });
      continue;
    }
    if (parts.length > 2) {
      diagnostics.push({ file: path, line: 0, message: `No subfolders inside an Area: Requirement files are requirements/${folder}/area.md and requirements/${folder}/<fragment>.md` });
      continue;
    }
    if (!name.endsWith(".md")) {
      diagnostics.push({ file: path, line: 0, message: "Only .md files belong in an Area folder" });
      continue;
    }
    const fragment = name.slice(0, -".md".length);
    if (name !== AREA_FILE && !ID_PATTERN.test(fragment)) {
      diagnostics.push({ file: path, line: 0, message: `Fragment "${fragment}" is not a kebab-case name ("area" is reserved for area.md)` });
      continue;
    }
    if (name !== AREA_FILE && isWindowsDeviceName(fragment)) {
      diagnostics.push({ file: path, line: 0, message: `Fragment "${fragment}" is a name Windows reserves for devices` });
      continue;
    }
    let files = folders.get(folder);
    if (!files) folders.set(folder, (files = new Map()));
    files.set(name, { path, content });
  }
  const areas: Area[] = [];
  for (const [id, files] of folders) {
    const own = files.get(AREA_FILE);
    const areaPath = `${REQUIREMENTS_PREFIX}${id}/${AREA_FILE}`;
    if (!own) diagnostics.push({ file: areaPath, line: 0, message: `Missing area.md: Area "${id}" needs requirements/${id}/area.md with its description and title` });
    const area = own ? parseAreaFile(id, own.path, own.content, diagnostics) : { id, file: areaPath, title: "", description: "", intro: "", fragments: [], sections: [] };
    const seen = new Map<string, RequirementSection>();
    for (const [name, { path, content }] of files) {
      if (name === AREA_FILE) continue;
      const fragment = parseFragment(name.slice(0, -".md".length), path, content, model, diagnostics);
      for (const s of fragment.sections) {
        const key = s.ref === null ? GENERAL : s.ref.toLowerCase();
        const first = seen.get(key);
        const heading = s.ref ?? "General";
        if (first?.file === path) diagnostics.push({ file: path, line: s.line, message: `Duplicate section "## ${heading}"` });
        else if (first) diagnostics.push({ file: path, line: s.line, message: `Section "## ${heading}" is already in ${first.file}:${first.line}: a section appears once in its Area` });
        else seen.set(key, s);
      }
      area.fragments.push(fragment);
      area.sections.push(...fragment.sections);
    }
    areas.push(area);
  }
  return areas;
}

/** Splits a tracked file map into Model files (relative to `model/`) and Area files (by tracked path). */
export function splitTracked(files: FileMap): { model: FileMap; requirements: FileMap } {
  const model: FileMap = new Map();
  const requirements: FileMap = new Map();
  for (const [path, content] of files) {
    if (path === SPECS_FILE) continue;
    (path.startsWith(REQUIREMENTS_PREFIX) ? requirements : model).set(path, content);
  }
  return { model, requirements };
}

/** Builds and validates the Model and its Requirements from a tracked file map. */
export function buildProject(files: FileMap): ProjectModel {
  const { model: modelFiles, requirements } = splitTracked(files);
  const model = buildModel(modelFiles);
  const diagnostics: Diagnostic[] = [];
  const areas = buildAreas(requirements, model, diagnostics);
  const text = files.get(SPECS_FILE);
  const specs = text === undefined ? { specs: EMPTY_SPECS, diagnostics: [] } : parseSpecs(SPECS_FILE, text);
  return { model, areas, specs: specs.specs, specsSkill: text !== undefined && specs.diagnostics.length === 0, specsPresent: text !== undefined, diagnostics: [...model.diagnostics, ...diagnostics, ...specs.diagnostics] };
}

/** Fragments of a tracked file map larger than `FRAGMENT_MAX_BYTES` (the whole file, front matter included), by path. */
export function largeFragments(files: FileMap): { file: string; bytes: number }[] {
  const encoder = new TextEncoder();
  const out: { file: string; bytes: number }[] = [];
  for (const [path, content] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
    const parts = path.startsWith(REQUIREMENTS_PREFIX) ? path.slice(REQUIREMENTS_PREFIX.length).split("/") : [];
    if (parts.length !== 2 || parts[1] === AREA_FILE) continue;
    const bytes = encoder.encode(content).length;
    if (bytes > FRAGMENT_MAX_BYTES) out.push({ file: path, bytes });
  }
  return out;
}

/** The warning about a fragment larger than `FRAGMENT_MAX_BYTES`. */
export const largeFragmentMessage = (f: { bytes: number }) =>
  `fragment is ${f.bytes} bytes, more than ${FRAGMENT_MAX_BYTES} (12 KB): split it into smaller fragments`;

/** A reference to Requirements: `requirements/<area>` or `requirements/<area>#<model reference>`. */
export function parseRequirementRef(ref: string): { area: string; section: string | null } | null {
  if (!ref.startsWith(REQUIREMENTS_PREFIX)) return null;
  const rest = ref.slice(REQUIREMENTS_PREFIX.length);
  const hash = rest.indexOf("#");
  return hash < 0 ? { area: rest, section: null } : { area: rest.slice(0, hash), section: rest.slice(hash + 1) };
}

export type ProjectElement =
  | Element
  | { kind: "requirement"; ref: string; area: Area; section: RequirementSection | null }
  | { kind: "specs"; ref: string; field: SpecField | null };

/** Resolves a Model reference, a Requirement reference (`requirements/ui`, `requirements/ui#order/Paid`) or a Specs reference (`specs`, `specs#frameworks`). */
export function resolveProjectRef(project: ProjectModel, ref: string): ProjectElement {
  if (isSpecsRef(ref)) {
    if (ref === "specs") return { kind: "specs", ref, field: null };
    const field = ref.slice("specs#".length);
    if (!isSpecField(field)) throw new TramaError(`Cannot resolve "${ref}": Specs has no field "${field}"`);
    return { kind: "specs", ref, field };
  }
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
export function lineageRefs(model: Model, element: Element): string[] {
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

/** Writes the starting Areas as `requirements/<id>/area.md` with no fragments, skipping Areas whose folder exists; returns the Area IDs written. */
export function createDefaultAreas(p: Project): string[] {
  const written: string[] = [];
  for (const area of DEFAULT_AREAS) {
    const folder = join(requirementsDir(p), area.id);
    if (existsSync(folder)) continue;
    writeFileEnsuringDir(join(folder, AREA_FILE), defaultAreaFile(area));
    written.push(area.id);
  }
  return written;
}

export interface AreaConversion {
  /** Areas moved from `requirements/<id>.md` into `requirements/<id>/`. */
  converted: string[];
  /** Single-file Areas left as they were, with why. */
  skipped: { id: string; reason: string }[];
}

/**
 * Moves every Area still written as `requirements/<id>.md` into its folder: `area.md` gets the file's front matter,
 * title and introduction; `main.md` the same front matter and title with every section, in order and with the same
 * text, unless no section has text. The old file is deleted. An Area whose folder already exists is not touched.
 */
export function convertSingleFileAreas(p: Project): AreaConversion {
  const result: AreaConversion = { converted: [], skipped: [] };
  const dir = requirementsDir(p);
  if (!existsSync(dir)) return result;
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isFile() || entry.name.startsWith(".") || !entry.name.endsWith(".md")) continue;
    const id = entry.name.slice(0, -".md".length);
    if (!ID_PATTERN.test(id)) {
      result.skipped.push({ id, reason: `"${id}" is not a kebab-case Area name` });
      continue;
    }
    if (isWindowsDeviceName(id)) {
      result.skipped.push({ id, reason: `"${id}" is a name Windows reserves for devices` });
      continue;
    }
    const folder = join(dir, id);
    if (existsSync(folder)) {
      result.skipped.push({ id, reason: `requirements/${id}/ already exists` });
      continue;
    }
    const file = join(dir, entry.name);
    const content = readTextLf(file);
    const frontMatter = /^---\n[\s\S]*?\n---\n/.exec(content)?.[0] ?? "";
    const doc = parseRequirementDoc(`${REQUIREMENTS_PREFIX}${entry.name}`, content, []);
    const head = `${frontMatter}${doc.title === "" ? "" : `# ${doc.title}\n`}`;
    writeFileEnsuringDir(join(folder, AREA_FILE), doc.intro === "" ? head : `${head}\n${doc.intro}\n`);
    if (doc.sections.some((s) => s.text !== ""))
      writeFileEnsuringDir(join(folder, "main.md"), `${head}${doc.sections.map((s) => `\n## ${s.heading}\n${s.text === "" ? "" : `${s.text}\n`}`).join("")}`);
    rmSync(file);
    result.converted.push(id);
  }
  return result;
}
