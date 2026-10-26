import { statSync } from "node:fs";
import { type Document, type PictureReads, readDocumentFile, withPictureReads } from "./store";

interface Entry {
  document: Document;
  mtimeMs: number;
  size: number;
  ino: number;
}

/**
 * The parsed documents of a window, by absolute path (`tech#picture`). An entry holds what `readDocument` returned with the `mtimeMs`, `size` and `ino` of the
 * `statSync` made before the read: a picture stats every file it needs and reads and parses again only the files that are new or whose three values changed. What
 * it returns is shared, never changed by the callers; the functions that change a card read it without the cache.
 */
export class DocumentCache {
  private readonly entries = new Map<string, Entry>();
  /** The files `stat`ed and the files read and parsed since the cache was made. */
  statted = 0;
  parsed = 0;

  /** `onParse` hears the path of every file that is read and parsed. */
  constructor(private readonly onParse?: (path: string) => void) {}

  /** The paths that have an entry. */
  get size(): number {
    return this.entries.size;
  }

  /** The document at `path`: the kept one while the file still has the `mtimeMs`, `size` and `ino` it was read with, else read again (and kept). */
  read(path: string): Document {
    let stat: { mtimeMs: number; size: number; ino: number };
    try {
      stat = statSync(path);
    } catch {
      // Gone, or unreadable: nothing to keep; the read says why.
      this.entries.delete(path);
      return readDocumentFile(path);
    }
    this.statted++;
    const kept = this.entries.get(path);
    if (kept !== undefined && kept.mtimeMs === stat.mtimeMs && kept.size === stat.size && kept.ino === stat.ino) return kept.document;
    this.entries.delete(path);
    const document = readDocumentFile(path);
    this.parsed++;
    this.onParse?.(path);
    this.entries.set(path, { document, mtimeMs: stat.mtimeMs, size: stat.size, ino: stat.ino });
    return document;
  }

  /** Drops the entries of the files a picture did not need: those that are gone. */
  retain(needed: ReadonlySet<string>): void {
    for (const path of [...this.entries.keys()]) if (!needed.has(path)) this.entries.delete(path);
  }
}

/**
 * What one picture reads through: each document is read (from `cache` when there is one) at most once, each folder listing and tracked tree once, and a failed read
 * fails the same way each time it is asked. Without a cache every file of the picture is read from the disk, once.
 */
export class PictureReader implements PictureReads {
  private readonly documents = new Map<string, Document | Error>();
  private readonly values = new Map<string, unknown>();
  private open = true;

  constructor(private readonly cache?: DocumentCache) {}

  document(path: string): Document {
    const known = this.documents.get(path);
    if (known instanceof Error) throw known;
    if (known !== undefined) return known;
    try {
      const document = this.cache === undefined ? readDocumentFile(path) : this.cache.read(path);
      this.documents.set(path, document);
      return document;
    } catch (error) {
      this.documents.set(path, error as Error);
      throw error;
    }
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

  /** The picture is complete: the cache keeps only the files it needed. */
  finish(): void {
    this.cache?.retain(new Set(this.documents.keys()));
  }

  /** What this picture kept is old from now on: nothing reads through it any more, and it lets go of what it holds. */
  close(): void {
    this.open = false;
    this.documents.clear();
    this.values.clear();
  }
}
