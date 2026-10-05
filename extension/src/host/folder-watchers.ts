/** Keeps one watcher per folder in `wanted`: starts the missing ones and disposes those no longer wanted. */
export function syncFolderWatchers(watchers: Map<string, { dispose(): void }>, wanted: readonly string[], watch: (folder: string) => { dispose(): void }): void {
  const keep = new Set(wanted);
  for (const [folder, watcher] of watchers) {
    if (keep.has(folder)) continue;
    watcher.dispose();
    watchers.delete(folder);
  }
  for (const folder of keep) if (!watchers.has(folder)) watchers.set(folder, watch(folder));
}
