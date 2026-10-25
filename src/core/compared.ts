import { existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { writeFileAtomic } from "./atomic-write";
import { extent } from "./blocking";
import { git } from "./git";
import type { ProjectModel } from "./requirements";
import { normalizeLf } from "./line-endings";
import { type Project, readTextLf, sha256, writeFileEnsuringDir } from "./store";

/*
 * The comparison registry: what a successful `trama comparison move` archived, per code fingerprint. A reference counts as
 * compared when it, or an element it sits in, was archived on the same code and its text has not changed since.
 */

/** Paths of the working tree the code fingerprint leaves out: Trama's own, the skill folders, the agent definitions and `.omp/WATCHDOG.yml`. */
export const LEFT_OUT = [".trama", ".agents/skills", ".omp/agents", ".omp/WATCHDOG.yml"];

/** The hash of a file's current content, `deleted` when it is gone, `directory` for a folder; null when it cannot be read. */
function contentHash(path: string): string | null {
  try {
    if (statSync(path).isDirectory()) return "directory";
    return sha256(readTextLf(path));
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === "ENOENT" ? "deleted" : null;
  }
}

/**
 * The code fingerprint: the commit (`HEAD`) and, for every changed or untracked file, its path and the hash of its current
 * content, leaving out Trama's folder, the skill folders, the agent definitions and `extraDirs` (relative to the project
 * root). Null outside git, or when git is missing or fails.
 */
export function codeFingerprint(root: string, extraDirs: string[] = []): string | null {
  const head = git(root, ["rev-parse", "HEAD"]);
  const top = git(root, ["rev-parse", "--show-toplevel"]);
  const prefix = git(root, ["rev-parse", "--show-prefix"]);
  const status = git(root, ["status", "--porcelain", "-z", "--untracked-files=all"]);
  if (head === null || top === null || prefix === null || status === null) return null;
  const repo = top.trim();
  // The project root's place in the repository, as git prints it (it already ends with a slash), or empty when the root is the repository.
  const within = prefix.trim();
  const left = [...LEFT_OUT, ...extraDirs.map((d) => d.replace(/\/+$/, ""))];
  const leftOut = (path: string): boolean => {
    if (!path.startsWith(within)) return false;
    const rel = path.slice(within.length);
    return left.some((folder) => rel === folder || rel.startsWith(`${folder}/`));
  };
  const paths = new Set<string>();
  const tokens = status.split("\0");
  for (let i = 0; i < tokens.length; i++) {
    const entry = tokens[i] as string;
    if (entry.length < 4) continue;
    paths.add(entry.slice(3));
    // A rename or copy is followed by the path it came from.
    if (/[RC]/.test(entry.slice(0, 2))) {
      i++;
      const from = tokens[i];
      if (from !== undefined && from !== "") paths.add(from);
    }
  }
  const lines: string[] = [];
  for (const path of [...paths].sort()) {
    if (leftOut(path)) continue;
    const hash = contentHash(join(repo, path));
    if (hash === null) return null;
    lines.push(`${path}\0${hash}`);
  }
  return sha256(`${(head as string).trim()}\n${lines.join("\n")}`);
}

/** The fingerprint of a reference's text: the hash of the text, with line ends normalised to LF. */
export const textFingerprint = (text: string): string => sha256(normalizeLf(text));

export const comparedDir = (p: Project): string => join(p.dir, "compared");

/** The references a comparison archived on this code, with the text fingerprint each had then. A file that cannot be read records nothing. */
export function comparedRefs(p: Project, code: string): Record<string, string> {
  const file = join(comparedDir(p), `${code}.json`);
  if (!existsSync(file)) return {};
  try {
    const data: unknown = JSON.parse(readTextLf(file));
    if (typeof data !== "object" || data === null || Array.isArray(data)) return {};
    return Object.fromEntries(Object.entries(data).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  } catch {
    return {};
  }
}

/** Records what a successful `trama comparison move` archived under this code fingerprint, and forgets every other fingerprint. */
export function recordComparison(p: Project, code: string, texts: Record<string, string>): void {
  const dir = comparedDir(p);
  // The folder ignores itself and everything in it, so the registry is never versioned.
  const ignore = join(dir, ".gitignore");
  if (!existsSync(ignore)) writeFileEnsuringDir(ignore, "*\n");
  const name = `${code}.json`;
  for (const other of readdirSync(dir)) if (other.endsWith(".json") && other !== name) rmSync(join(dir, other), { force: true });
  writeFileAtomic(join(dir, name), `${JSON.stringify({ ...comparedRefs(p, code), ...texts }, null, 2)}\n`);
}

/**
 * Splits references into those a comparison on this code still has to check and those already compared: a reference is
 * already compared when it, or an element it sits in, was archived on this code with the text fingerprint it has now.
 * Without a code fingerprint nothing is already compared.
 */
export function splitCompared(
  p: Project,
  project: ProjectModel,
  refs: string[],
  code: string | null,
  fingerprintOf: (key: string) => string,
): { remaining: string[]; already: string[] } {
  const recorded = code === null ? {} : comparedRefs(p, code);
  const remaining: string[] = [];
  const already: string[] = [];
  for (const ref of refs) {
    const covered = [...extent(project, ref).containers].some((key) => recorded[key] !== undefined && recorded[key] === fingerprintOf(key));
    (covered ? already : remaining).push(ref);
  }
  return { remaining, already };
}
