import { createHash, randomInt } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { parse, stringify } from "yaml";
import { TramaError } from "./errors";
import { normalizeLf } from "./line-endings";
import { asObject, compareByCreation, type Raw } from "./schema";
import { buildModel } from "./model";
import { SPECS_FILE } from "./specs";
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

/**
 * What one picture of the project reads through (`src/core/document-cache.ts`): each parsed document, each folder listing and each tracked tree is read once, and the
 * values a picture works out once (the short numbers) are kept for its whole build. Active only while `withPictureReads` runs; every other read goes to the disk.
 */
export interface PictureReads {
  /** The document at `path`, read and parsed at most once per picture; what it returns is never changed by its callers. */
  document(path: string): Document;
  /** What `compute` returns for `key`, computed at most once per picture. Callers must not change it. */
  once<T>(key: string, compute: () => T): T;
  /** Keeps `value` as what `once(key, …)` returns from now on. */
  remember(key: string, value: unknown): void;
}

let activeReads: PictureReads | undefined;

/** Runs `fn` with every document, folder listing and tracked tree read through `reads`. Synchronous: nothing else reads while it runs. */
export function withPictureReads<T>(reads: PictureReads, fn: () => T): T {
  const outer = activeReads;
  activeReads = reads;
  try {
    return fn();
  } finally {
    activeReads = outer;
  }
}

/** The picture being built, if any. */
export const currentPictureReads = (): PictureReads | undefined => activeReads;

/** The names in `dir` (empty when it is not there), as `readdirSync` lists them; listed once per picture. */
export function listNames(dir: string): string[] {
  const list = () => (existsSync(dir) ? readdirSync(dir) : []);
  return activeReads === undefined ? list() : [...activeReads.once(`names:${dir}`, list)];
}

/** Walks up from `start` to the first folder that contains `.trama/`. */
export function findProject(start: string): Project {
  for (let dir = resolve(start); ; dir = dirname(dir)) {
    if (existsSync(join(dir, TRAMA_DIR)) && statSync(join(dir, TRAMA_DIR)).isDirectory()) return projectAt(dir);
    if (dirname(dir) === dir) throw new TramaError(`No ${TRAMA_DIR}/ found in ${resolve(start)} or any parent. Run "trama project new".`);
  }
}

export const modelDir = (p: Project) => join(p.dir, "model");

/** A file's text with LF line endings, read through `normalizeLf`. */
export const readTextLf = (path: string): string => normalizeLf(readFileSync(path, "utf8"));

/** Every non-hidden file under `dir`, keyed by `/`-separated relative path, with LF line endings so a CRLF checkout hashes and compares like Linux. */
export function readTree(dir: string): FileMap {
  const files: FileMap = new Map();
  const visit = (abs: string, rel: string) => {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) visit(join(abs, entry.name), childRel);
      else files.set(childRel, readTextLf(join(abs, entry.name)));
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

/** Where a tracked path lives under a `.trama/` folder or a Proposal folder (both have `model/`, `requirements/` and maybe `specs.yaml`). */
export const trackedLocation = (root: string, path: string): string =>
  safeJoin(root, path === SPECS_FILE || path.startsWith(REQUIREMENTS_PREFIX) ? path : `model/${path}`);

/** Model, Requirement and Specs files under `root` (a `.trama/` or a Proposal folder), keyed as tracked paths. Read once per picture; the map is the caller's to change. */
export function readTracked(root: string): FileMap {
  const read = (): FileMap => {
    const files = readTree(join(root, "model"));
    for (const [path, content] of readTree(join(root, "requirements"))) files.set(`${REQUIREMENTS_PREFIX}${path}`, content);
    const specs = join(root, SPECS_FILE);
    if (existsSync(specs)) files.set(SPECS_FILE, readTextLf(specs));
    return files;
  };
  return activeReads === undefined ? read() : new Map(activeReads.once(`tracked:${root}`, read));
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

/** Reads and parses the document at `path` from the disk, whatever picture is being built. */
export function readDocumentFile(path: string): Document {
  if (!existsSync(path)) throw new TramaError(`${path}: file not found`);
  const text = readTextLf(path);
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

/** The document at `path`: through the picture being built when there is one (read once, and from the cache of the window when it has one), else from the disk. */
export function readDocument(path: string): Document {
  return activeReads === undefined ? readDocumentFile(path) : activeReads.document(path);
}

/** The text of a Markdown document: YAML front matter of `data`, then `body`. */
export function documentText(data: object, body: string): string {
  const yaml = stringify(data, { lineWidth: 0 }).trimEnd();
  return `---\n${yaml}\n---\n${body.replace(/^\n+/, "")}`;
}

export function writeDocument(path: string, data: object, body: string) {
  writeFileEnsuringDir(path, documentText(data, body));
}

export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
  return slug || "untitled";
}

/** A Proposal folder or a Task or Drift file, named `<id>-<slug>`. */
export interface CardEntry {
  id: string;
  name: string;
}

/** Proposals are folders; Tasks and Drifts are Markdown files. */
export type CardLayout = "file" | "folder";

const ID_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
const RANDOM_PREFIX = /^([a-z0-9]{8})-/;
const NUMBERED_PREFIX = /^(\d{4,})-/;

function stemOf(name: string): string {
  return name.endsWith(".md") ? name.slice(0, -3) : name;
}

function cardFile(dir: string, name: string, layout: CardLayout): string {
  return layout === "folder" ? join(dir, name, "proposal.md") : join(dir, name);
}

/** True when the card's front matter remembers when it was created. Numbered cards written before that field have none. */
function remembersCreated(path: string): boolean {
  if (!existsSync(path)) return false;
  try {
    const created = readDocument(path).data["created"];
    return created !== undefined && created !== null;
  } catch {
    return false;
  }
}

/**
 * Proposal folders or Task and Drift files in `dir`. An eight-character name that is all digits is a numbered card
 * when it has no `created`, and a random identity (kept as those eight characters) when it does.
 */
export function listCards(dir: string, layout: CardLayout): CardEntry[] {
  const out: CardEntry[] = [];
  for (const name of listNames(dir)) {
    if (name.startsWith(".")) continue;
    const stem = stemOf(name);
    const randomId = RANDOM_PREFIX.exec(stem)?.[1];
    const numberedId = NUMBERED_PREFIX.exec(stem)?.[1];
    if (randomId && !/^\d{8}$/.test(randomId)) out.push({ id: randomId, name });
    else if (randomId && remembersCreated(cardFile(dir, name, layout))) out.push({ id: randomId, name });
    else if (numberedId) {
      const n = Number(numberedId);
      if (Number.isSafeInteger(n)) out.push({ id: String(n).padStart(4, "0"), name });
    }
  }
  return out;
}

/** Eight random lowercase letters and digits. */
export function randomCardId(): string {
  let id = "";
  for (let i = 0; i < 8; i++) id += ID_CHARS[randomInt(ID_CHARS.length)];
  return id;
}

/**
 * A fresh identity for one card, not already used by a card of the same kind in any of `dirs`.
 * `draw` is the source of randomness; the default draws eight lowercase letters and digits.
 */
export function newCardId(dirs: string | readonly string[], layout: CardLayout, kind: string, draw: () => string = randomCardId): string {
  const folders = typeof dirs === "string" ? [dirs] : dirs;
  const used = new Set(folders.flatMap((dir) => listCards(dir, layout).map((c) => c.id)));
  for (let attempt = 0; attempt < 64; attempt++) {
    const id = draw();
    if (/^[a-z0-9]{8}$/.test(id) && !used.has(id)) return id;
  }
  throw new TramaError(`Could not draw a free identity for a new ${kind}`);
}

let lastCreatedMs = 0;

/** The creation instant in UTC, ISO 8601. A later call in the same millisecond is strictly later, so creation order is kept. */
export function createdNow(): string {
  let ms = Date.now();
  if (ms <= lastCreatedMs) ms = lastCreatedMs + 1;
  lastCreatedMs = ms;
  return new Date(ms).toISOString();
}

/** `items` in creation order. `card` reads the identity and the instant each item remembers. */
export function byCreation<T>(items: readonly T[], card: (item: T) => { id: string; created: string | null }): T[] {
  return [...items].sort((a, b) => compareByCreation(card(a), card(b)));
}

function matchingIds(kind: string, query: string, hits: CardEntry[]): never {
  const ids = hits.map((c) => c.id).sort((a, b) => a.localeCompare(b));
  throw new TramaError(`Several ${kind}s match "${query}": ${ids.join(", ")}`);
}

function isNumbered(dir: string, card: CardEntry, layout: CardLayout): boolean {
  return NUMBERED_PREFIX.test(stemOf(card.name)) && !remembersCreated(cardFile(dir, card.name, layout));
}

/**
 * The card a command or a stored reference names.
 * `asArgument`: an all-digit query cites only a numbered card (`12` or `0012`), never a random identity that happens
 * to be all digits. Otherwise the full identity matches even then, so a stored reference keeps its card.
 * A query also matches the whole file or folder name, or a prefix that only one card of this kind has.
 */
export function findCard(dir: string, query: string, kind: string, layout: CardLayout, asArgument = false): CardEntry {
  const cards = listCards(dir, layout);
  const stemQuery = stemOf(query);
  const byName = cards.filter((c) => c.name === query || stemOf(c.name) === stemQuery);
  if (byName.length === 1) return byName[0] as CardEntry;
  if (byName.length > 1) matchingIds(kind, query, byName);

  const digits = /^\d+$/.test(query);
  if (!(asArgument && digits)) {
    const byId = cards.filter((c) => c.id === query);
    if (byId.length === 1) return byId[0] as CardEntry;
    if (byId.length > 1) matchingIds(kind, query, byId);
  }

  if (digits) {
    const wanted = String(Number(query)).padStart(4, "0");
    const numbered = cards.filter((c) => c.id === wanted && isNumbered(dir, c, layout));
    if (numbered.length === 1) return numbered[0] as CardEntry;
    if (numbered.length > 1) matchingIds(kind, query, numbered);
    throw new TramaError(`No ${kind} with ID "${query}"`);
  }

  const prefixed = cards.filter((c) => c.id.startsWith(query));
  if (prefixed.length === 1) return prefixed[0] as CardEntry;
  if (prefixed.length > 1) matchingIds(kind, query, prefixed);
  throw new TramaError(`No ${kind} with ID "${query}"`);
}

/**
 * The name the lock of the card `query` names is taken under, read from the folder or file names alone: no file of a
 * card is opened, so a lock can be held before any of them is read. The name is the card's identity as its name gives
 * it, and an all-digit identity is named by the number it spells, so `12` and `0012` name one lock. A query that names
 * no card, or several, is refused as `findCard` refuses it.
 */
export function lockNameOf(dir: string, query: string, kind: string): string {
  const stems = existsSync(dir) ? readdirSync(dir).filter((name) => !name.startsWith(".")).map(stemOf) : [];
  const stemQuery = stemOf(query);
  const digits = /^\d+$/.test(query);
  const idOf = (stem: string) => stem.split("-")[0] ?? stem;
  let hits = stems.filter((stem) => stem === stemQuery || (digits && /^\d+$/.test(idOf(stem)) ? Number(idOf(stem)) === Number(query) : idOf(stem) === query));
  if (hits.length === 0 && !digits) hits = stems.filter((stem) => idOf(stem).startsWith(query));
  const keys = new Set(hits.map((stem) => (/^\d+$/.test(idOf(stem)) ? String(Number(idOf(stem))).padStart(4, "0") : idOf(stem))));
  if (keys.size === 0) throw new TramaError(`No ${kind} with ID "${query}"`);
  if (keys.size > 1) throw new TramaError(`Several ${kind}s match "${query}": ${hits.map(idOf).sort((a, b) => a.localeCompare(b)).join(", ")}`);
  return [...keys][0] as string;
}
