import { type Stats, statSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, dirname, join, sep } from "node:path";
import { normalizeLf } from "./line-endings";
import { type DirEntry, type Document, parseDocument, type PictureReads, readDirEntries, readDocumentFile, readTextLf, TRAMA_DIR, withPictureReads } from "./store";

/** What a file's `stat` says that tells a rewrite from the file that was read: the three values the cache keeps with each entry. */
interface Stamp {
  mtimeMs: number;
  size: number;
  ino: number;
}

type Entry = Stamp & ({ kind: "document"; document: Document } | { kind: "text"; text: string });

/** A folder as it was listed, with its names for a lookup. */
interface Listing {
  entries: readonly DirEntry[];
  names: ReadonlySet<string>;
}

/** What the watcher of the editor reports of a file. */
export type FileEvent = "created" | "changed" | "deleted";

const sameStamp = (a: Stamp, b: Stamp): boolean => a.mtimeMs === b.mtimeMs && a.size === b.size && a.ino === b.ino;

const stampOf = (stats: Stamp): Stamp => ({ mtimeMs: stats.mtimeMs, size: stats.size, ino: stats.ino });

/** A file Trama writes through a temporary name and renames: neither listed nor read. */
const isTemporary = (name: string): boolean => name.endsWith(".tmp");

/**
 * The part of `path` under the folder `.trama/`, split by `/` and `\`; undefined for a path that is not under one. The last `.trama` counts, so a project that sits
 * under another folder of that name is still read from its own.
 */
function insideTrama(path: string): string[] | undefined {
  const parts = path.split(/[\\/]/);
  const at = parts.lastIndexOf(TRAMA_DIR);
  return at < 0 ? undefined : parts.slice(at + 1);
}

/** What a picture reads of a file under `.trama/`: a parsed document, the text of a tracked file, or nothing (the picture never reads it). */
function kindUnderTrama(inside: readonly string[]): "document" | "text" | undefined {
  const [first, second, third, fourth] = inside;
  if (inside.some((part) => part.startsWith(".") || isTemporary(part))) return undefined;
  if (first === "specs.yaml" && inside.length === 1) return "text";
  if ((first === "model" || first === "requirements") && inside.length > 1) return "text";
  const card = (name: string | undefined): boolean => name !== undefined && name.endsWith(".md");
  if ((first === "tasks" || first === "drifts" || first === "history" || first === "announcements" || first === "issues") && inside.length === 2) return card(second) ? "document" : undefined;
  if (first === "proposals" && second !== undefined) {
    if (inside.length === 3 && third === "proposal.md") return "document";
    if (inside.length === 4 && (third === "tasks" || third === "issues")) return card(fourth) ? "document" : undefined;
    if (third === "specs.yaml" && inside.length === 3) return "text";
    if ((third === "model" || third === "requirements") && inside.length > 3) return "text";
  }
  return undefined;
}

/** Files under `.trama/` that no picture depends on: hidden ones, temporary names and the short numbers, which a picture writes itself and reads each time. */
function neverReported(path: string): boolean {
  const inside = insideTrama(path);
  if (inside === undefined) return false;
  return inside[0] === "short-numbers" || inside.some((part) => part.startsWith(".") || isTemporary(part));
}

/**
 * The parsed files of a window (`tech#picture`), by absolute path: an entry holds what `readDocument` returned (front matter and body), or the text of a Model, Requirement
 * or Specs file, with the `mtimeMs`, `size` and `ino` of the `statSync` made before the read; and the folder listings.
 *
 * A picture does not look at a file it holds. A file leaves the cache when the editor's watcher reports it (`observe`), when this process writes or removes it (`written`,
 * `removed`, called from `src/core/written.ts`) and when a full check (`verify`) finds its three values changed; the picture after that stats, reads and parses it again
 * and takes every other file from the cache. The listings are kept the same way: a created or deleted file or folder drops the listing of its folder. What it returns is
 * shared and never changed by the callers; the functions that change a card read it without the cache.
 */
export class DocumentCache {
  private readonly files = new Map<string, Entry>();
  private readonly folders = new Map<string, Listing>();
  /** The modification time of the files that are only listed (the images of a Task), by path. */
  private readonly times = new Map<string, number>();
  /** What the watcher reported since the last picture and still has to be applied: the files to read again, and the paths that are gone. */
  private readonly touched = new Set<string>();
  private readonly gone = new Set<string>();
  /** While a full check runs: what changed under it, so the check never writes an old read over a newer one. */
  private dirty: { paths: Set<string>; prefixes: string[] } | undefined;
  private checking: Promise<boolean> | undefined;
  /** The files `stat`ed to be read, the files read and parsed, the folders listed and the files `stat`ed to look at a watcher event, since the cache was made. */
  statted = 0;
  parsed = 0;
  listed = 0;
  checked = 0;

  /** `onParse` hears the path of every file that is read and parsed. */
  constructor(private readonly onParse?: (path: string) => void) {}

  /** The paths that have an entry. */
  get size(): number {
    return this.files.size;
  }

  /** Whether the watcher reported something the next picture has not applied yet. */
  get pending(): boolean {
    return this.touched.size > 0 || this.gone.size > 0;
  }

  /** The document at `path`: the kept one, else read and parsed (and kept). */
  document(path: string): Document {
    const kept = this.files.get(path);
    if (kept?.kind === "document") return kept.document;
    this.files.delete(path);
    const stamp = this.stamp(path);
    // Gone, or unreadable: nothing to keep; the read says why.
    if (stamp === undefined) return readDocumentFile(path);
    const document = readDocumentFile(path);
    this.note(path);
    this.files.set(path, { kind: "document", document, ...stamp });
    return document;
  }

  /** The text of the file at `path` with LF line endings: the kept one, else read (and kept). */
  text(path: string): string {
    const kept = this.files.get(path);
    if (kept?.kind === "text") return kept.text;
    this.files.delete(path);
    const stamp = this.stamp(path);
    const text = readTextLf(path);
    if (stamp === undefined) return text;
    this.note(path);
    this.files.set(path, { kind: "text", text, ...stamp });
    return text;
  }

  /** The entries of the folder `dir` (none when it is not there), listed once and kept. */
  listing(dir: string): readonly DirEntry[] {
    return this.folder(dir).entries;
  }

  /** Whether `path` is there, from the listing of its folder. */
  exists(path: string): boolean {
    return this.folder(dirname(path)).names.has(basename(path));
  }

  /** The modification time of the file at `path`, or undefined when it is not there; kept until the file is reported or written. */
  modified(path: string): number | undefined {
    const kept = this.times.get(path);
    if (kept !== undefined) return kept;
    const stamp = this.stamp(path);
    if (stamp !== undefined) this.times.set(path, stamp.mtimeMs);
    return stamp?.mtimeMs;
  }

  /**
   * Hears one event of the editor's watcher. Returns whether it means a new picture: false for a file no picture reads (hidden, temporary, the short numbers), for a file
   * whose `mtimeMs`, `size` and `ino` are the ones it was read with (a picture an action asked for read it after the action wrote it), and for a path the cache already
   * knows is gone. Otherwise the path is kept for the next picture, which reads it again.
   */
  observe(event: FileEvent, path: string): boolean {
    if (neverReported(path)) return false;
    const stats = event === "deleted" ? undefined : this.look(path);
    if (stats === undefined) {
      // Deleted, or gone since the event: it matters only when the cache still holds it or a listing that names it.
      if (!this.knows(path)) return false;
      this.gone.add(path);
      return true;
    }
    if (stats.isDirectory()) {
      // What a folder holds is reported file by file; only a new folder the listings do not know yet matters.
      if (event === "changed" || !this.stale(path)) return false;
      this.touched.add(path);
      return true;
    }
    const kept = this.files.get(path);
    if (kept !== undefined && sameStamp(kept, stampOf(stats))) return false;
    this.touched.add(path);
    return true;
  }

  /** This process wrote (or created) `path`: it is read again, and the listings that lack it are dropped. */
  written(path: string): void {
    this.drop(path);
  }

  /** This process removed `path`, a file or a folder with everything under it. */
  removed(path: string): void {
    this.dropUnder(path);
  }

  /** Applies what the watcher reported since the last picture: the files it names are read again by the next picture, the ones that are gone leave the cache. */
  applyPending(): void {
    for (const path of this.touched) this.drop(path);
    for (const path of this.gone) this.dropUnder(path);
    this.touched.clear();
    this.gone.clear();
  }

  /** Forgets everything: the window opened another project. */
  clear(): void {
    this.files.clear();
    this.folders.clear();
    this.times.clear();
    this.touched.clear();
    this.gone.clear();
    if (this.dirty !== undefined) this.dirty.prefixes.push("");
  }

  /**
   * The full check of the folder `dir` (a `.trama/`): lists every folder and stats every file the cache holds, asynchronously, and reads again the files whose `mtimeMs`,
   * `size` or `ino` changed (and the files of the project it does not hold yet, so the first check of a window fills the cache). A file or folder that is gone or new, or
   * that a picture or an event touched while the check ran, is left to the next picture. Resolves true when anything changed, which asks for a new picture.
   */
  verify(dir: string): Promise<boolean> {
    this.checking ??= this.fullCheck(dir).finally(() => void (this.checking = undefined));
    return this.checking;
  }

  private async fullCheck(dir: string): Promise<boolean> {
    const before = { files: new Map(this.files), folders: new Map(this.folders) };
    const dirty = { paths: new Set<string>(), prefixes: [] as string[] };
    this.dirty = dirty;
    try {
      const walked = await walk(dir);
      // What to read again: the files that have an entry whose values changed, and the files of the project no picture has read yet.
      const reads: { path: string; kind: "document" | "text" }[] = [];
      const vanished: string[] = [];
      for (const [path, entry] of before.files) {
        const found = walked.files.get(path);
        if (found === undefined) {
          if (insideDir(path, dir) && !neverReported(path)) vanished.push(path);
        } else if (!sameStamp(entry, found)) reads.push({ path, kind: entry.kind });
      }
      for (const [path] of walked.files) {
        if (before.files.has(path)) continue;
        const kind = kindUnderTrama(insideTrama(path) ?? []);
        if (kind !== undefined) reads.push({ path, kind });
      }
      const loaded = await readAll(reads);
      let changed = false;
      const settled = (path: string): boolean => !dirty.paths.has(path) && !dirty.prefixes.some((prefix) => path === prefix || path.startsWith(prefix + sep));
      for (const path of vanished) {
        if (this.files.get(path) !== before.files.get(path) || !settled(path)) continue;
        this.files.delete(path);
        this.times.delete(path);
        changed = true;
      }
      for (const { path, kind } of reads) {
        const entry = loaded.get(path);
        if (this.files.get(path) !== before.files.get(path) || !settled(path)) continue;
        const had = before.files.has(path);
        if (entry === undefined) {
          // The file no longer reads: the picture says why.
          if (had) {
            this.files.delete(path);
            changed = true;
          }
          continue;
        }
        const stamp = walked.files.get(path) as Stamp;
        this.files.set(path, kind === "document" ? { kind, document: entry.document as Document, ...stamp } : { kind, text: entry.text as string, ...stamp });
        this.times.delete(path);
        this.parsed++;
        this.onParse?.(path);
        changed = true;
      }
      for (const [folder, found] of walked.folders) {
        const kept = before.folders.get(folder);
        if (this.folders.get(folder) !== kept || !settled(folder)) continue;
        if (kept === undefined) {
          this.folders.set(folder, listingOf(found));
        } else if (!sameNames(kept.entries, found)) {
          this.folders.set(folder, listingOf(found));
          changed = true;
        }
      }
      for (const [folder, kept] of before.folders) {
        if (walked.folders.has(folder) || !insideDir(folder, dir) || neverReported(folder) || this.folders.get(folder) !== kept || !settled(folder)) continue;
        this.folders.delete(folder);
        if (kept.entries.length > 0) changed = true;
      }
      return changed;
    } finally {
      this.dirty = undefined;
    }
  }

  private stamp(path: string): Stamp | undefined {
    try {
      const stats = statSync(path);
      this.statted++;
      return stampOf(stats);
    } catch {
      return undefined;
    }
  }

  /** The `stat` of a path a watcher event named, or undefined when it is gone. */
  private look(path: string): Stats | undefined {
    try {
      const stats = statSync(path);
      this.checked++;
      return stats;
    } catch {
      return undefined;
    }
  }

  private note(path: string): void {
    this.parsed++;
    this.onParse?.(path);
  }

  private folder(dir: string): Listing {
    const kept = this.folders.get(dir);
    if (kept !== undefined) return kept;
    // A folder that the nearest listed folder above it does not name is not there: no read says so.
    const absent = this.stale(dir);
    const listing = absent ? listingOf([]) : listingOf(readDirEntries(dir));
    if (!absent) this.listed++;
    this.folders.set(dir, listing);
    return listing;
  }

  /** The nearest folder above `path` that is listed says whether it names the way down to `path`; true when it does not (the listing is old). */
  private stale(path: string): boolean {
    for (let child = path, dir = dirname(child); dir !== child; child = dir, dir = dirname(dir)) {
      const listing = this.folders.get(dir);
      if (listing !== undefined) return !listing.names.has(basename(child));
    }
    return false;
  }

  /** Whether the cache holds anything that a deleted `path` makes old: the file, the folder, a listing that names it, or a file under it. */
  private knows(path: string): boolean {
    if (this.files.has(path) || this.folders.has(path) || this.times.has(path)) return true;
    for (let child = path, dir = dirname(child); dir !== child; child = dir, dir = dirname(dir)) {
      const listing = this.folders.get(dir);
      if (listing !== undefined) return listing.names.has(basename(child));
    }
    for (const kept of this.files.keys()) if (kept.startsWith(path + sep)) return true;
    return false;
  }

  private dropFile(path: string): void {
    this.files.delete(path);
    this.times.delete(path);
    this.dirty?.paths.add(path);
  }

  private dropFolder(dir: string): void {
    this.folders.delete(dir);
    this.dirty?.paths.add(dir);
  }

  /** `path` was written, created or reported as changed: its entry goes, and so does every listing above it that does not name the way to it. */
  private drop(path: string): void {
    this.dropFile(path);
    this.dropFolder(path);
    for (let child = path, dir = dirname(child); dir !== child; child = dir, dir = dirname(dir)) {
      const listing = this.folders.get(dir);
      if (listing !== undefined && !listing.names.has(basename(child))) this.dropFolder(dir);
    }
  }

  /** `path` is gone, with everything under it: the entries and listings below it go, and the listing of its folder. */
  private dropUnder(path: string): void {
    const parent = dirname(path);
    const listing = this.folders.get(parent);
    const isFolder = this.folders.has(path) || listing?.entries.some((entry) => entry.name === basename(path) && entry.directory) === true || listing === undefined;
    this.dropFile(path);
    this.dropFolder(path);
    if (isFolder) {
      const below = path + sep;
      for (const kept of [...this.files.keys()]) if (kept.startsWith(below)) this.dropFile(kept);
      for (const kept of [...this.folders.keys()]) if (kept.startsWith(below)) this.dropFolder(kept);
      for (const kept of [...this.times.keys()]) if (kept.startsWith(below)) this.times.delete(kept);
      this.dirty?.prefixes.push(path);
    }
    if (listing?.names.has(basename(path)) === true) this.dropFolder(parent);
  }
}

const listingOf = (entries: readonly DirEntry[]): Listing => {
  const shown = entries.filter((entry) => !isTemporary(entry.name));
  return { entries: shown, names: new Set(shown.map((entry) => entry.name)) };
};

const sameNames = (a: readonly DirEntry[], b: readonly DirEntry[]): boolean => {
  const shown = b.filter((entry) => !isTemporary(entry.name));
  if (a.length !== shown.length) return false;
  const names = new Map(a.map((entry) => [entry.name, entry.directory]));
  return shown.every((entry) => names.get(entry.name) === entry.directory);
};

const insideDir = (path: string, dir: string): boolean => path === dir || path.startsWith(dir + sep);

/** Every folder under `dir` listed and every file stat'ed, asynchronously, a few at a time; hidden folders and the short numbers are not entered. */
async function walk(dir: string): Promise<{ folders: Map<string, DirEntry[]>; files: Map<string, Stamp> }> {
  const folders = new Map<string, DirEntry[]>();
  const files = new Map<string, Stamp>();
  const visit = async (folder: string): Promise<void> => {
    let entries: DirEntry[];
    try {
      entries = (await readdir(folder, { withFileTypes: true })).map((entry) => ({ name: entry.name, directory: entry.isDirectory() }));
    } catch {
      return;
    }
    folders.set(folder, entries);
    const subfolders: string[] = [];
    const found: string[] = [];
    for (const entry of entries) {
      if (isTemporary(entry.name)) continue;
      const path = join(folder, entry.name);
      if (entry.directory) {
        if (!entry.name.startsWith(".") && !(folder === dir && entry.name === "short-numbers")) subfolders.push(path);
      } else if (!entry.name.startsWith(".")) found.push(path);
    }
    for (let at = 0; at < found.length; at += STAT_AT_ONCE) {
      await Promise.all(
        found.slice(at, at + STAT_AT_ONCE).map(async (path) => {
          try {
            files.set(path, stampOf(await stat(path)));
          } catch {
            /* Gone since the listing: it is not there. */
          }
        }),
      );
    }
    for (let at = 0; at < subfolders.length; at += FOLDERS_AT_ONCE) await Promise.all(subfolders.slice(at, at + FOLDERS_AT_ONCE).map(visit));
  };
  await visit(dir);
  return { folders, files };
}

const STAT_AT_ONCE = 64;
const FOLDERS_AT_ONCE = 8;

/** Reads (and parses, for a document) each of `reads` asynchronously; a file that does not read is absent from the result. */
async function readAll(reads: readonly { path: string; kind: "document" | "text" }[]): Promise<Map<string, { document?: Document; text?: string }>> {
  const out = new Map<string, { document?: Document; text?: string }>();
  for (let at = 0; at < reads.length; at += STAT_AT_ONCE) {
    await Promise.all(
      reads.slice(at, at + STAT_AT_ONCE).map(async ({ path, kind }) => {
        try {
          const text = normalizeLf(await readFile(path, "utf8"));
          out.set(path, kind === "document" ? { document: parseDocument(path, text) } : { text });
        } catch {
          /* It does not read: the picture reports it. */
        }
      }),
    );
  }
  return out;
}

/**
 * What one picture reads through: each document and text file is read (from `cache` when there is one) at most once, each folder listing once, and a failed read fails the
 * same way each time it is asked. Without a cache every file of the picture is read from the disk, once. Building the picture first applies what the watcher reported.
 */
export class PictureReader implements PictureReads {
  private readonly documents = new Map<string, Document | Error>();
  private readonly texts = new Map<string, string | Error>();
  private readonly listings = new Map<string, readonly DirEntry[]>();
  private readonly values = new Map<string, unknown>();
  private open = true;

  constructor(private readonly cache?: DocumentCache) {
    cache?.applyPending();
  }

  document(path: string): Document {
    const known = this.documents.get(path);
    if (known instanceof Error) throw known;
    if (known !== undefined) return known;
    try {
      const document = this.cache === undefined ? readDocumentFile(path) : this.cache.document(path);
      this.documents.set(path, document);
      return document;
    } catch (error) {
      this.documents.set(path, error as Error);
      throw error;
    }
  }

  text(path: string): string {
    const known = this.texts.get(path);
    if (known instanceof Error) throw known;
    if (known !== undefined) return known;
    try {
      const text = this.cache === undefined ? readTextLf(path) : this.cache.text(path);
      this.texts.set(path, text);
      return text;
    } catch (error) {
      this.texts.set(path, error as Error);
      throw error;
    }
  }

  entries(dir: string): readonly DirEntry[] {
    const known = this.listings.get(dir);
    if (known !== undefined) return known;
    const entries = this.cache === undefined ? readDirEntries(dir).filter((entry) => !isTemporary(entry.name)) : this.cache.listing(dir);
    this.listings.set(dir, entries);
    return entries;
  }

  exists(path: string): boolean {
    return this.entries(dirname(path)).some((entry) => entry.name === basename(path));
  }

  fileTime(path: string): number | undefined {
    return this.once(`time:${path}`, () => {
      if (this.cache !== undefined) return this.cache.modified(path);
      try {
        return statSync(path).mtimeMs;
      } catch {
        return undefined;
      }
    });
  }

  once<T>(key: string, compute: () => T): T {
    if (this.values.has(key)) return this.values.get(key) as T;
    const value = compute();
    this.values.set(key, value);
    return value;
  }

  remember(key: string, value: unknown): void {
    this.values.set(key, value);
  }

  /** Runs `fn` reading through this picture, while it is open; afterwards (what it kept is old) `fn` reads from the disk. */
  run<T>(fn: () => T): T {
    return this.open ? withPictureReads(this, fn) : fn();
  }

  /** What this picture kept is old from now on: nothing reads through it any more, and it lets go of what it holds. */
  close(): void {
    this.open = false;
    this.documents.clear();
    this.texts.clear();
    this.listings.clear();
    this.values.clear();
  }
}
