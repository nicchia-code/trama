import { expect, test } from "bun:test";
import { syncFolderWatchers } from "../extension/src/host/folder-watchers";

test("watchers follow the worktrees of the round: new ones start, gone ones stop, kept ones are not restarted", () => {
  const started: string[] = [];
  const stopped: string[] = [];
  const watch = (folder: string) => (started.push(folder), { dispose: () => void stopped.push(folder) });
  const watchers = new Map<string, { dispose(): void }>();

  syncFolderWatchers(watchers, ["/w/a", "/w/b"], watch);
  syncFolderWatchers(watchers, ["/w/b", "/w/c"], watch);
  expect(started).toEqual(["/w/a", "/w/b", "/w/c"]);
  expect(stopped).toEqual(["/w/a"]);

  syncFolderWatchers(watchers, [], watch);
  expect(stopped).toEqual(["/w/a", "/w/b", "/w/c"]);
  expect(watchers.size).toBe(0);
});
