import { checkId, parseActor, parseDocument, parseMachine } from "./parse";
import type { Actor, Diagnostic, EventDecl, FileMap, Machine, Model, State } from "./types";
import { RESERVED_IDS, isWindowsDeviceName } from "./types";

export function flattenStates(states: State[]): State[] {
  return states.flatMap((s) => [s, ...flattenStates(s.children)]);
}

export function findState(machine: Machine, name: string): State | undefined {
  const key = name.toLowerCase();
  return flattenStates(machine.states).find((s) => s.name.toLowerCase() === key);
}

/** The Machine or Actor with this ID, if any. */
export function eventOwner(model: Model, id: string): Machine | Actor | undefined {
  return model.machines.get(id) ?? model.actors.get(id);
}

export function findEvent(model: Model, owner: string, name: string): EventDecl | undefined {
  return eventOwner(model, owner)?.events.find((e) => e.name === name);
}

/** Builds a Model from its files and validates it. Never throws: problems go to `model.diagnostics`. */
export function buildModel(files: FileMap): Model {
  const diags: Diagnostic[] = [];
  const model: Model = {
    system: { file: "system.md", name: "", description: "" },
    actors: new Map(),
    features: new Map(),
    machines: new Map(),
    diagnostics: diags,
  };

  const systemFile = files.get("system.md");
  if (systemFile === undefined) diags.push({ file: "system.md", line: 0, message: "Missing system.md" });
  else model.system = { file: "system.md", ...parseDocument("system.md", systemFile, diags) };

  const owners = new Map<string, string>(); // ID -> file that declared it
  const claim = (id: string, file: string): boolean => {
    if (!checkId(file, id, diags)) return false;
    if (Object.hasOwn(RESERVED_IDS, id)) {
      diags.push({ file, line: 0, message: `"${id}" is a reserved name` });
      return false;
    }
    if (isWindowsDeviceName(id)) {
      diags.push({ file, line: 0, message: `"${id}" is a name Windows reserves for devices` });
      return false;
    }
    const previous = owners.get(id);
    if (previous) {
      diags.push({ file, line: 0, message: `Duplicate ID "${id}" (also declared by ${previous})` });
      return false;
    }
    owners.set(id, file);
    return true;
  };

  const featureFolders = new Set<string>();
  const paths = [...files.keys()].sort();
  // Features first, so their IDs are claimed before Machines and Actors.
  for (const path of paths) {
    const parts = path.split("/");
    const folder = parts[0] as string;
    if (parts.length === 2 && parts[1] === "feature.md" && folder !== "actors") {
      featureFolders.add(folder);
      const feature = { id: folder, file: path, name: "", description: "", machines: [] as string[] };
      Object.assign(feature, parseDocument(path, files.get(path) as string, diags));
      if (claim(folder, path)) model.features.set(folder, feature);
    }
  }

  for (const path of paths) {
    const parts = path.split("/");
    const content = files.get(path) as string;
    if (path === "system.md") continue;
    if (!path.endsWith(".md")) {
      diags.push({ file: path, line: 0, message: "Unexpected file: the Model contains only .md files" });
      continue;
    }
    const base = (parts.at(-1) as string).slice(0, -3);
    if (parts[0] === "actors") {
      if (parts.length !== 2) {
        diags.push({ file: path, line: 0, message: "Actor files live directly in actors/" });
        continue;
      }
      if (claim(base, path)) model.actors.set(base, parseActor(base, path, content, diags));
      continue;
    }
    if (parts.length === 1) {
      diags.push({ file: path, line: 0, message: "Machine files must live inside a Feature folder" });
      continue;
    }
    if (parts.length > 2) {
      diags.push({ file: path, line: 0, message: "Features cannot be nested: a Machine file lives exactly one level below model/" });
      continue;
    }
    if (base === "feature") continue;
    const folder = parts[0] as string;
    if (!claim(base, path)) continue;
    const feature = model.features.get(folder);
    if (!feature && !featureFolders.has(folder)) {
      diags.push({ file: path, line: 0, message: `Feature folder "${folder}" has no feature.md` });
    }
    model.machines.set(base, parseMachine(base, folder, path, content, diags));
    feature?.machines.push(base);
  }
  for (const feature of model.features.values()) feature.machines.sort();

  for (const machine of model.machines.values()) checkReferences(model, machine);
  return model;
}

function checkReferences(model: Model, machine: Machine) {
  for (const state of flattenStates(machine.states)) {
    for (const t of state.transitions) {
      if (!findState(machine, t.target))
        model.diagnostics.push({ file: machine.file, line: t.line, message: `Transition to unknown State "${t.target}"` });
      const owner = eventOwner(model, t.event.owner);
      if (!owner)
        model.diagnostics.push({ file: machine.file, line: t.line, message: `Event reference to unknown owner "${t.event.owner}"` });
      else if (!owner.events.some((e) => e.name === t.event.name))
        model.diagnostics.push({
          file: machine.file,
          line: t.line,
          message: `"${t.event.owner}" does not declare Event ${t.event.name}`,
        });
    }
  }
}

export function formatDiagnostic(d: Diagnostic): string {
  return d.line > 0 ? `${d.file}:${d.line}: ${d.message}` : `${d.file}: ${d.message}`;
}
