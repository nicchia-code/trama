/**
 * The files this process writes or removes under `.trama/`, told to whoever listens. The editor host's window cache of parsed files (`src/core/document-cache.ts`) listens: an
 * action of the panel that writes cards in the host asks for a picture right after, and the picture reads again what the action wrote without waiting for the file watcher
 * (`tech#picture`). Files written by another process (the command line an agent runs) reach the cache through the watcher instead. Nothing listens in the command line.
 */

export type WriteKind = "written" | "removed";

export type WriteListener = (kind: WriteKind, path: string) => void;

const listeners = new Set<WriteListener>();

/** Calls `listener` with every file this process writes (`written`, also when it only overwrites) or removes (`removed`, a file or a whole folder) from now on. */
export function onFileWritten(listener: WriteListener): { dispose(): void } {
  listeners.add(listener);
  return { dispose: () => void listeners.delete(listener) };
}

/** `path` was written or created. Call it after the write. */
export function noteWritten(path: string): void {
  for (const listener of [...listeners]) listener("written", path);
}

/** `path` (a file, or a folder with everything under it) was removed. Call it after the removal. */
export function noteRemoved(path: string): void {
  for (const listener of [...listeners]) listener("removed", path);
}
