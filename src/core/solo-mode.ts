import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, posix, relative, resolve } from "node:path";
import { writeFileAtomic } from "./atomic-write";
import { TramaError } from "./errors";
import { git } from "./git";
import { type Project, readTextLf, writeFileEnsuringDir } from "./store";

/*
 * Solo mode: using Trama alone in a repository where the others do not. Trama's files stay in the working copy, kept out
 * of git by a block of its own in `.git/info/exclude`, which is never committed. Solo mode itself is recorded in
 * `.trama/solo/mode.json`, a folder with its own `.gitignore`, so it stays local even when `.trama/` is tracked.
 */

/** What the block keeps out of git: the whole folders where Trama writes, or only the files it writes there. */
export type SoloExclusions = "folders" | "files";
/** Solo mode of a working copy: `off`, or on with what it keeps out of git. */
export type SoloKind = "off" | SoloExclusions;

export const SOLO_KINDS: readonly SoloKind[] = ["off", "folders", "files"];

/** The folder of the agent skills when the project has not chosen another. */
export const DEFAULT_SKILLS_DIR = ".agents/skills";

export const SOLO_NEEDS_GIT = "Solo mode needs a git repository.";

export const SOLO_BEGIN = "# trama solo mode";
export const SOLO_END = "# end trama solo mode";

/** Where Solo mode is recorded, and the folder that holds it. */
export const soloDir = (p: Project): string => join(p.dir, "solo");
export const soloFile = (p: Project): string => join(soloDir(p), "mode.json");

/**
 * Solo mode of the project: `off` when its file is absent. A file that is not valid JSON, or whose `exclusions` is
 * neither `folders` nor `files`, counts as on with `folders`.
 */
export function readSoloMode(p: Project): SoloKind {
  const file = soloFile(p);
  if (!existsSync(file)) return "off";
  try {
    const data: unknown = JSON.parse(readTextLf(file));
    if (typeof data === "object" && data !== null && "exclusions" in data && (data.exclusions === "folders" || data.exclusions === "files")) return data.exclusions;
  } catch {
    // Unreadable or not JSON: on, with the default.
  }
  return "folders";
}

/** The skills folder as a path relative to the project root with `/` separators, or null when it is not inside the project (an absolute path is made relative to the root). */
export function projectSkillsFolder(root: string, skillsDir: string | undefined): string | null {
  const configured = skillsDir?.trim() || DEFAULT_SKILLS_DIR;
  const rel = posix.normalize((isAbsolute(configured) ? relative(root, configured) : configured).replace(/\\/g, "/")).replace(/\/+$/, "");
  return rel === "" || rel === "." || rel === ".." || rel.startsWith("../") || rel.startsWith("/") || /^[A-Za-z]:/.test(rel) ? null : rel;
}

/** The paths, relative to the project root, the block of a kind covers; the skills folder only when it is inside the project. */
function coveredPaths(kind: SoloExclusions, skills: string | null): string[] {
  return kind === "folders"
    ? [".trama", ...(skills === null ? [] : [skills]), ".omp"]
    : [".trama", ...(skills === null ? [] : [`${skills}/trama-*`]), ".omp/agents/trama-analysis.md", ".omp/agents/trama-implementer.md", ".omp/WATCHDOG.yml"];
}

/** A path as a literal part of an ignore pattern. */
const literal = (path: string): string => path.replace(/[\\*?[]/g, "\\$&");

/**
 * The block for a kind: its lines, markers included. `prefix` is the project's place inside the repository (`git rev-parse
 * --show-prefix`, empty or ending with `/`) and `skills` the folder of the agent skills relative to the project root
 * (`projectSkillsFolder`; null when it is outside the project, which leaves it out). Every pattern is anchored to the
 * repository root.
 */
export function soloBlock(kind: SoloExclusions, prefix: string, skills: string | null = DEFAULT_SKILLS_DIR): string[] {
  const at = (path: string): string => `/${literal(prefix)}${path}`;
  const skillsPattern = (rest: string): string[] => (skills === null ? [] : [at(`${literal(skills)}${rest}`)]);
  const patterns =
    kind === "folders"
      ? [at(".trama/"), ...skillsPattern("/"), at(".omp/")]
      : [at(".trama/"), ...skillsPattern("/trama-*/"), at(".omp/agents/trama-analysis.md"), at(".omp/agents/trama-implementer.md"), at(".omp/WATCHDOG.yml")];
  return [SOLO_BEGIN, ...patterns, SOLO_END];
}

interface Line {
  content: string;
  /** The line ending it had: `\n`, `\r\n`, or empty for a last line without one. */
  end: string;
}

function splitLines(text: string): Line[] {
  const lines: Line[] = [];
  for (let i = 0; i < text.length; ) {
    const nl = text.indexOf("\n", i);
    if (nl === -1) {
      lines.push({ content: text.slice(i), end: "" });
      break;
    }
    const cr = nl > i && text[nl - 1] === "\r";
    lines.push({ content: text.slice(i, cr ? nl - 1 : nl), end: cr ? "\r\n" : "\n" });
    i = nl + 1;
  }
  return lines;
}

const joinLines = (lines: Line[]): string => lines.map((l) => l.content + l.end).join("");

/** The first block: the first end marker with a begin marker before it, from the last begin marker before that end. */
function locate(lines: Line[]): { start: number; end: number } | null {
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const content = (lines[i] as Line).content.trimEnd();
    if (content === SOLO_BEGIN) start = i;
    else if (content === SOLO_END && start !== -1) return { start, end: i };
  }
  return null;
}

/** The lines of the first Solo mode block in the text of the exclusion file, markers included, or null when there is none. */
export function findSoloBlock(text: string): string[] | null {
  const lines = splitLines(text);
  const at = locate(lines);
  return at === null ? null : lines.slice(at.start, at.end + 1).map((l) => l.content);
}

/**
 * The text with the first block replaced by `block`, or with `block` appended (after a line end, when the text lacks
 * one at the end). Everything outside the block and the line endings of the text stay as they are; the same block
 * again returns the text unchanged.
 */
export function replaceSoloBlock(text: string, block: string[]): string {
  const lines = splitLines(text);
  const eol = lines.find((l) => l.end !== "")?.end ?? "\n";
  const at = locate(lines);
  if (at !== null) {
    const current = lines.slice(at.start, at.end + 1).map((l) => l.content);
    if (current.length === block.length && current.every((c, i) => c === block[i])) return text;
    const last = (lines[at.end] as Line).end;
    const written = block.map((content, i): Line => ({ content, end: i < block.length - 1 ? eol : last }));
    return joinLines([...lines.slice(0, at.start), ...written, ...lines.slice(at.end + 1)]);
  }
  const unfinished = lines.length > 0 && (lines[lines.length - 1] as Line).end === "";
  return `${text}${unfinished ? eol : ""}${block.map((c) => c + eol).join("")}`;
}

/** The text without its first block, markers included, and nothing else changed. */
export function removeSoloBlock(text: string): string {
  const lines = splitLines(text);
  const at = locate(lines);
  return at === null ? text : joinLines([...lines.slice(0, at.start), ...lines.slice(at.end + 1)]);
}

const stripEol = (out: string): string => out.replace(/\r?\n$/, "");

/** Where the working copy sits in git: the project's prefix in the repository and the exclusion file git uses for it. */
export interface GitPlace {
  prefix: string;
  exclude: string;
}

/** The place of the project root in git, or null when it is not inside a git working tree. */
export function gitPlace(root: string): GitPlace | null {
  if (git(root, ["rev-parse", "--is-inside-work-tree"])?.trim() !== "true") return null;
  const prefix = git(root, ["rev-parse", "--show-prefix"]);
  const exclude = git(root, ["rev-parse", "--git-path", "info/exclude"]);
  return prefix === null || exclude === null ? null : { prefix: stripEol(prefix), exclude: resolve(root, stripEol(exclude)) };
}

/** The block Solo mode needs for the project, or null when it is not in a git repository. */
export function expectedSoloBlock(p: Project, kind: SoloExclusions, skillsDir?: string): string[] | null {
  const place = gitPlace(p.root);
  return place === null ? null : soloBlock(kind, place.prefix, projectSkillsFolder(p.root, skillsDir));
}

/**
 * The files of Trama that git tracks under the paths of the block (`git ls-files -z`), relative to the project root and
 * in git's order. An exclusion cannot hide them, so their changes still enter commits. Empty outside git.
 */
export function trackedSoloFiles(p: Project, kind: SoloExclusions, skillsDir?: string): string[] {
  const out = git(p.root, ["ls-files", "-z", "--", ...coveredPaths(kind, projectSkillsFolder(p.root, skillsDir))]);
  return out === null ? [] : out.split("\0").filter((path) => path !== "");
}

/** What Solo mode is now: the kind and the tracked files of Trama (none when off); also what a change of Solo mode returns. */
export interface SoloResult {
  solo: SoloKind;
  tracked: string[];
}

/** Solo mode of the project now, with the tracked files of Trama. */
export function currentSolo(p: Project, skillsDir?: string): SoloResult {
  const solo = readSoloMode(p);
  return { solo, tracked: solo === "off" ? [] : trackedSoloFiles(p, solo, skillsDir) };
}

/** What the Settings tab and the wizard need: whether the folder is in a git repository, the kind, and the tracked files of Trama. */
export interface SoloStatus extends SoloResult {
  available: boolean;
}

export function soloStatus(p: Project, skillsDir?: string): SoloStatus {
  return { available: gitPlace(p.root) !== null, ...currentSolo(p, skillsDir) };
}

const reasonOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

function readIfExists(path: string): string | null {
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function writeExclude(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

/** Puts a file back as it was: its old text, or gone when it did not exist. Best effort, after a failed write. */
function restore(path: string, previous: string | null): void {
  try {
    if (previous === null) rmSync(path, { force: true });
    else writeFileSync(path, previous);
  } catch {
    // The write that failed already told the reason.
  }
}

/**
 * Sets Solo mode of the project: `folders` or `files` write `.trama/solo/mode.json` and the block in `.git/info/exclude`
 * (only in a git repository, otherwise `Solo mode needs a git repository.` and nothing is written); `off` removes the
 * block, leaving every other line, and the file, which it does also outside git. `skillsDir` is the folder of the agent
 * skills the block covers (default `.agents/skills`). A failed write leaves both files as they were and says why.
 */
export function setSoloMode(p: Project, solo: SoloKind, skillsDir?: string): SoloResult {
  const mode = soloFile(p);
  const place = gitPlace(p.root);
  if (solo !== "off" && place === null) throw new TramaError(SOLO_NEEDS_GIT);
  const exclude = place?.exclude;
  // What both files hold now, read before anything is written, so a failed write can put them back.
  let previousMode: string | null;
  let previousExclude: string | null = null;
  try {
    previousMode = readIfExists(mode);
  } catch (error) {
    throw new TramaError(`Could not read ${mode}: ${reasonOf(error)}`);
  }
  if (exclude !== undefined) {
    try {
      previousExclude = readIfExists(exclude);
    } catch (error) {
      throw new TramaError(`Could not read ${exclude}: ${reasonOf(error)}`);
    }
  }
  let failing = exclude ?? mode;
  try {
    if (solo === "off") {
      if (exclude !== undefined && previousExclude !== null) {
        const next = removeSoloBlock(previousExclude);
        if (next !== previousExclude) writeExclude(exclude, next);
      }
      failing = mode;
      rmSync(mode, { force: true });
      return { solo, tracked: [] };
    }
    const block = soloBlock(solo, (place as GitPlace).prefix, projectSkillsFolder(p.root, skillsDir));
    const next = replaceSoloBlock(previousExclude ?? "", block);
    if (previousExclude === null || next !== previousExclude) writeExclude(exclude as string, next);
    failing = mode;
    const ignore = join(soloDir(p), ".gitignore");
    if (!existsSync(ignore)) writeFileEnsuringDir(ignore, "*\n");
    writeFileAtomic(mode, `${JSON.stringify({ exclusions: solo }, null, 2)}\n`);
    return { solo, tracked: trackedSoloFiles(p, solo, skillsDir) };
  } catch (error) {
    if (exclude !== undefined) restore(exclude, previousExclude);
    restore(mode, previousMode);
    throw new TramaError(`Could not write ${failing}: ${reasonOf(error)}`);
  }
}

/**
 * The repair at every ordinary opening of Trama: with Solo mode on in a git repository, writes the block again when the
 * exclusion file has none or a different one from what the kind and the skills folder need. Returns whether it wrote.
 * Throws when the write fails.
 */
export function repairSoloBlock(p: Project, skillsDir?: string): boolean {
  const solo = readSoloMode(p);
  if (solo === "off") return false;
  const place = gitPlace(p.root);
  if (place === null) return false;
  try {
    const text = readIfExists(place.exclude);
    const next = replaceSoloBlock(text ?? "", soloBlock(solo, place.prefix, projectSkillsFolder(p.root, skillsDir)));
    if (text !== null && next === text) return false;
    writeExclude(place.exclude, next);
    return true;
  } catch (error) {
    throw new TramaError(`Could not write ${place.exclude}: ${reasonOf(error)}`);
  }
}
