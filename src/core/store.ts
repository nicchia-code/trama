import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { parse, stringify } from "yaml";
import { TramaError } from "./errors";
import { asObject, type Raw } from "./schema";
import { buildModel } from "./model";
import type { FileMap, Model } from "./types";

export const TRAMA_DIR = ".trama";

export interface Project {
  root: string;
  /** Absolute path of `.trama/`. */
  dir: string;
}

export function projectAt(root: string): Project {
  return { root, dir: join(root, TRAMA_DIR) };
}

/** Walks up from `start` to the first folder that contains `.trama/`. */
export function findProject(start: string): Project {
  for (let dir = resolve(start); ; dir = dirname(dir)) {
    if (existsSync(join(dir, TRAMA_DIR)) && statSync(join(dir, TRAMA_DIR)).isDirectory()) return projectAt(dir);
    if (dirname(dir) === dir) throw new TramaError(`No ${TRAMA_DIR}/ found in ${resolve(start)} or any parent. Run "trama init".`);
  }
}

export const modelDir = (p: Project) => join(p.dir, "model");

/** Every non-hidden file under `dir`, keyed by `/`-separated relative path. */
export function readTree(dir: string): FileMap {
  const files: FileMap = new Map();
  const visit = (abs: string, rel: string) => {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) visit(join(abs, entry.name), childRel);
      else files.set(childRel, readFileSync(join(abs, entry.name), "utf8"));
    }
  };
  if (existsSync(dir)) visit(dir, "");
  return files;
}

export const readModelFiles = (p: Project): FileMap => readTree(modelDir(p));

export const loadModel = (p: Project): Model => buildModel(readModelFiles(p));

/**
 * Requirement files are tracked together with Model files: the same Proposal can change both. In a tracked file map
 * Model paths are relative to `model/` (`checkout/order.md`) and Requirement paths start with `requirements/`
 * (`requirements/ui.md`); `requirements` is a reserved ID, so the two never collide.
 */
export const REQUIREMENTS_PREFIX = "requirements/";

export const requirementsDir = (p: Project) => join(p.dir, "requirements");

/** Where a tracked path lives under a `.trama/` folder or a Proposal folder (both have `model/` and `requirements/`). */
export const trackedLocation = (root: string, path: string): string =>
  safeJoin(root, path.startsWith(REQUIREMENTS_PREFIX) ? path : `model/${path}`);

/** Model and Requirement files under `root` (a `.trama/` or a Proposal folder), keyed as tracked paths. */
export function readTracked(root: string): FileMap {
  const files = readTree(join(root, "model"));
  for (const [path, content] of readTree(join(root, "requirements"))) files.set(`${REQUIREMENTS_PREFIX}${path}`, content);
  return files;
}

export const readTrackedFiles = (p: Project): FileMap => readTracked(p.dir);

export const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");

export function writeFileEnsuringDir(path: string, content: string) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

/** Joins `rel` under `base`, refusing anything that escapes it. */
export function safeJoin(base: string, rel: string): string {
  const full = resolve(base, rel);
  if (!full.startsWith(resolve(base) + sep)) throw new TramaError(`Path "${rel}" escapes ${base}`);
  return full;
}

export interface Document {
  /** The front matter mapping, not yet validated field by field. */
  data: Raw;
  body: string;
}

export function readDocument(path: string): Document {
  if (!existsSync(path)) throw new TramaError(`${path}: file not found`);
  const text = readFileSync(path, "utf8").replace(/\r\n?/g, "\n");
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
  if (!m) throw new TramaError(`${path}: missing YAML front matter`);
  let data: unknown;
  try {
    data = parse(m[1] as string);
  } catch (err) {
    throw new TramaError(`${path}: invalid YAML front matter: ${(err as Error).message.split("\n")[0]}`);
  }
  return { data: asObject(data, path), body: m[2] as string };
}

export function writeDocument(path: string, data: object, body: string) {
  const yaml = stringify(data, { lineWidth: 0 }).trimEnd();
  writeFileEnsuringDir(path, `---\n${yaml}\n---\n${body.replace(/^\n+/, "")}`);
}

export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
  return slug || "untitled";
}

/** Entries of `dir` named `NNNN-…`, as `[number, name]`. */
function numbered(dir: string): [number, string][] {
  if (!existsSync(dir)) return [];
  const out: [number, string][] = [];
  for (const name of readdirSync(dir)) {
    const m = /^(\d{4,})-/.exec(name);
    if (m) out.push([Number(m[1]), name]);
  }
  return out.sort((a, b) => a[0] - b[0]);
}

export function nextId(dir: string): string {
  const last = numbered(dir).at(-1);
  return String((last ? last[0] : 0) + 1).padStart(4, "0");
}

export function listNumbered(dir: string): { id: string; name: string }[] {
  return numbered(dir).map(([n, name]) => ({ id: String(n).padStart(4, "0"), name }));
}

/** Finds the entry for an ID given as `12`, `0012` or the full `0012-slug`. */
export function findNumbered(dir: string, id: string, kind: string): { id: string; name: string } {
  const m = /^(\d+)/.exec(id);
  const wanted = m ? String(Number(m[1])).padStart(4, "0") : null;
  const hit = wanted ? listNumbered(dir).find((e) => e.id === wanted) : undefined;
  if (!hit) throw new TramaError(`No ${kind} with ID "${id}"`);
  return hit;
}
