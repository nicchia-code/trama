import { readdir, readFile, open, stat } from "node:fs/promises";
import { basename, isAbsolute, join, relative, resolve, dirname, sep } from "node:path";
import { parse } from "yaml";

/** An agent instruction file found by the search: `path` is absolute, `label` is how it is shown (relative to the project, `~/…`, or absolute). */
export interface InstructionFile {
  label: string;
  path: string;
}

/** Files named in the project folder, in the order of the search (`rules#setup-wizard`). */
const PROJECT_FILES = ["AGENTS.md", "CLAUDE.md", ".cursorrules"] as const;
const PROJECT_FILES_AFTER_RULES = [".agents/AGENTS.md", ".omp/AGENTS.md", ".omp/RULES.md"] as const;
/** Files named in every folder above the project. */
const ABOVE_FILES = ["AGENTS.md", "CLAUDE.md"] as const;
/** Files named in the user's home folder, with `.cursor/rules/` last. */
const HOME_FILES = [".omp/agent/AGENTS.md", ".omp/agent/RULES.md", ".agents/AGENTS.md", ".claude/CLAUDE.md"] as const;
const CURSOR_RULES = ".cursor/rules";
const CURSOR_RULE_EXTENSIONS = [".mdc", ".md"];

const CHUNK = 4096;

/** Whether a byte is blank (space, tab, line feed, carriage return, vertical tab, form feed). */
const isBlank = (byte: number): boolean => byte === 0x20 || (byte >= 0x09 && byte <= 0x0d);

/** Whether `path` is a regular file with something other than blanks in it; reads only until the first non-blank byte. Any failure counts as no. */
async function hasContent(path: string): Promise<boolean> {
  try {
    if (!(await stat(path)).isFile()) return false;
    const handle = await open(path, "r");
    try {
      const buffer = Buffer.alloc(CHUNK);
      for (;;) {
        const { bytesRead } = await handle.read(buffer, 0, CHUNK, null);
        if (bytesRead === 0) return false;
        for (let i = 0; i < bytesRead; i++) if (!isBlank(buffer[i] as number)) return true;
      }
    } finally {
      await handle.close();
    }
  } catch {
    return false;
  }
}

/** The `.mdc` and `.md` names directly in `folder`, alphabetically; nothing when the folder cannot be listed. */
async function cursorRules(folder: string): Promise<string[]> {
  try {
    const names = await readdir(folder);
    return names.filter((name) => CURSOR_RULE_EXTENSIONS.some((extension) => name.endsWith(extension))).sort().map((name) => join(folder, name));
  } catch {
    return [];
  }
}

const inside = (folder: string, path: string): boolean => {
  const rel = relative(folder, path);
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
};

const slashed = (path: string): string => (sep === "/" ? path : path.split(sep).join("/"));

/**
 * The agent instruction files that apply to a project (`rules#setup-wizard`): in the project folder, in every folder above it up to the home
 * folder (excluded; none when the project is outside the home), and in the home folder. Only a regular file with something in it counts; each
 * file appears once, in the order of the search. The search reads only the listed paths, and from a file only enough to know it is not empty:
 * the content never leaves this function.
 */
export async function findInstructionFiles(projectFolder: string, homeFolder: string): Promise<InstructionFile[]> {
  const project = resolve(projectFolder);
  const home = resolve(homeFolder);
  const candidates: string[] = [];
  for (const name of PROJECT_FILES) candidates.push(join(project, name));
  candidates.push(...(await cursorRules(join(project, CURSOR_RULES))));
  for (const name of PROJECT_FILES_AFTER_RULES) candidates.push(join(project, name));
  if (inside(home, project)) {
    for (let folder = dirname(project); folder !== home && inside(home, folder); folder = dirname(folder)) {
      for (const name of ABOVE_FILES) candidates.push(join(folder, name));
    }
  }
  for (const name of HOME_FILES) candidates.push(join(home, name));
  candidates.push(...(await cursorRules(join(home, CURSOR_RULES))));

  const label = (path: string): string => {
    if (inside(project, path)) return slashed(relative(project, path));
    if (inside(home, path)) return `~/${slashed(relative(home, path))}`;
    return path;
  };
  const seen = new Set<string>();
  const found: InstructionFile[] = [];
  for (const path of candidates) {
    if (seen.has(path)) continue;
    seen.add(path);
    if (await hasContent(path)) found.push({ label: label(path), path });
  }
  return found;
}

/** The name of a Cursor rule as omp knows it: the file name without `.mdc` or `.md`. */
const ruleName = (path: string): string => basename(path).replace(/\.(mdc|md)$/, "");

/**
 * The omp identities (`disabledExtensions` entries) that switch off `files`, as `tech#agent-terminal/Agent running` says: the context files
 * (`context-file:<level>:AGENTS.md|CLAUDE.md`, where a project identity covers every depth), the fixed rules (`rule:RULES@project`,
 * `rule:RULES`) and each Cursor rule (`rule:<name>`). `.cursorrules` has none: omp does not read it. Each identity appears once, in the order of `files`.
 */
export function instructionExclusions(files: readonly InstructionFile[], projectFolder: string, homeFolder: string): string[] {
  const project = resolve(projectFolder);
  const home = resolve(homeFolder);
  const user = new Map<string, string>([
    [join(home, ".omp", "agent", "AGENTS.md"), "context-file:user:AGENTS.md"],
    [join(home, ".agents", "AGENTS.md"), "context-file:user:AGENTS.md"],
    [join(home, ".claude", "CLAUDE.md"), "context-file:user:CLAUDE.md"],
    [join(home, ".omp", "agent", "RULES.md"), "rule:RULES"],
  ]);
  const identityOf = (path: string): string | undefined => {
    const own = join(project, ".omp", "RULES.md");
    if (path === own) return "rule:RULES@project";
    if (dirname(path) === join(project, CURSOR_RULES)) return `rule:${ruleName(path)}`;
    if (dirname(path) === join(home, CURSOR_RULES)) return `rule:${ruleName(path)}`;
    const name = basename(path);
    const folder = dirname(path);
    if ((name === "AGENTS.md" || name === "CLAUDE.md") && !user.has(path)) {
      const projectLevel = folder === project || inside(folder, project) || folder === join(project, ".agents") || folder === join(project, ".omp");
      if (projectLevel) return `context-file:project:${name}`;
    }
    return user.get(path);
  };
  return [...new Set(files.map((file) => identityOf(resolve(file.path))).filter((id): id is string => id !== undefined))];
}

/**
 * The `disabledExtensions` the developer already has in omp's configuration: those of `<project>/.omp/config.yml` when that file declares the key,
 * otherwise those of `<home>/.omp/agent/config.yml` (`rules#agent-terminal/Agent running`). A missing or unreadable file, or a key that is not a
 * list of strings, counts as no exclusions; this never fails.
 */
export async function developerExclusions(projectFolder: string, homeFolder: string): Promise<string[]> {
  for (const path of [join(resolve(projectFolder), ".omp", "config.yml"), join(resolve(homeFolder), ".omp", "agent", "config.yml")]) {
    let value: unknown;
    try {
      const parsed: unknown = parse(await readFile(path, "utf8"));
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed) || !("disabledExtensions" in parsed)) continue;
      value = (parsed as Record<string, unknown>).disabledExtensions;
    } catch {
      continue;
    }
    return Array.isArray(value) && value.every((entry) => typeof entry === "string") ? (value as string[]) : [];
  }
  return [];
}

/** The developer's exclusions followed by Trama's, without duplicates. */
export const mergeExclusions = (developer: readonly string[], trama: readonly string[]): string[] => [...new Set([...developer, ...trama])];
