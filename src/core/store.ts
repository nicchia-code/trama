import { createHash, randomInt } from "node:crypto";
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

/** Every non-hidden file under `dir`, keyed by `/`-separated relative path, with LF line endings so a CRLF checkout hashes and compares like Linux. */
export function readTree(dir: string): FileMap {
  const files: FileMap = new Map();
  const visit = (abs: string, rel: string) => {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) visit(join(abs, entry.name), childRel);
      else files.set(childRel, readFileSync(join(abs, entry.name), "utf8").replace(/\r\n?/g, "\n"));
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
  if (!existsSync(dir)) return [];
  const out: CardEntry[] = [];
  for (const name of readdirSync(dir)) {
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
 * A fresh identity for one card in `dir`, not already used by a card of the same kind.
 * `draw` is the source of randomness; the default draws eight lowercase letters and digits.
 */
export function newCardId(dir: string, layout: CardLayout, kind: string, draw: () => string = randomCardId): string {
  const used = new Set(listCards(dir, layout).map((c) => c.id));
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

/**
 * Oldest first. A numbered card, which has no instant, comes before every card that remembers one; numbered cards
 * are ordered by that number. Cards that remember an instant are ordered by it, and by identity when the instant is the same.
 */
export function compareByCreation(a: { id: string; created: string | null }, b: { id: string; created: string | null }): number {
  const group = (c: { id: string; created: string | null }) => (c.created === null && /^\d+$/.test(c.id) ? 0 : c.created === null ? 1 : 2);
  const byGroup = group(a) - group(b);
  if (byGroup !== 0) return byGroup;
  if (a.created === null && b.created === null && /^\d+$/.test(a.id) && /^\d+$/.test(b.id)) return Number(a.id) - Number(b.id);
  if (a.created !== null && b.created !== null && a.created !== b.created) return a.created.localeCompare(b.created);
  return a.id.localeCompare(b.id);
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
