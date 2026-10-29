import { afterEach, expect, mock, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// A minimal editor: the workspace folders and the watcher of `.trama`, whose events the test fires.
const folders: Array<{ uri: { scheme: string; fsPath: string } }> = [];
const events = { created: [] as Array<() => void>, deleted: [] as Array<() => void>, folders: [] as Array<() => void> };
const subscribe = (list: Array<() => void>) => (listener: () => void) => {
  list.push(listener);
  return { dispose: () => void list.splice(list.indexOf(listener), 1) };
};
let watchers = 0;
mock.module("vscode", () => ({
  workspace: {
    get workspaceFolders() {
      return folders;
    },
    getWorkspaceFolder: (uri: { fsPath: string }) => folders.find((folder) => uri.fsPath.startsWith(folder.uri.fsPath)),
    createFileSystemWatcher: (pattern: string) => {
      watchers++;
      expect(pattern).toBe("**/.trama");
      return { onDidCreate: subscribe(events.created), onDidDelete: subscribe(events.deleted), dispose() {} };
    },
    onDidChangeWorkspaceFolders: subscribe(events.folders),
  },
  window: {},
}));

// Dynamic imports: they must come after `mock.module`, which has to be in place before these modules load.
const { findProject, onProjectsChanged, trackProjects } = await import("../extension/src/host/project");

const roots: string[] = [];
function folder(withProject: boolean): string {
  const root = mkdtempSync(join(tmpdir(), "trama-cache-"));
  roots.push(root);
  if (withProject) mkdirSync(join(root, ".trama"));
  folders.push({ uri: { scheme: "file", fsPath: root } });
  return root;
}
afterEach(() => {
  folders.length = 0;
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

test("without tracking every call reads the disk, so a project made or removed is seen at once", () => {
  const root = folder(false);
  expect(findProject()).toBeUndefined();
  mkdirSync(join(root, ".trama"));
  expect(findProject()?.root).toBe(root);
  rmSync(join(root, ".trama"), { recursive: true });
  expect(findProject()).toBeUndefined();
});

test("with tracking the disk is read once per folder and then the project comes from memory", () => {
  const root = folder(true);
  const tracking = trackProjects();
  try {
    expect(findProject()?.root).toBe(root);
    // The folder goes behind the editor's back: no file is read to look again.
    rmSync(join(root, ".trama"), { recursive: true });
    expect(findProject()?.root).toBe(root);
    expect(findProject({ fsPath: join(root, "src", "a.ts") } as never)?.root).toBe(root);
  } finally {
    tracking.dispose();
  }
});

test("a `.trama` that appears or goes away, or a change of the workspace folders, is learned from the watcher, and the listeners hear of it after the memory is renewed", () => {
  const root = folder(false);
  const tracking = trackProjects();
  expect(watchers).toBeGreaterThan(0);
  const heard: Array<string | undefined> = [];
  const listening = onProjectsChanged(() => heard.push(findProject()?.root));
  try {
    expect(findProject()).toBeUndefined();
    mkdirSync(join(root, ".trama"));
    // Still not known: nothing told the window.
    expect(findProject()).toBeUndefined();
    for (const fn of events.created) fn();
    expect(heard).toEqual([root]);
    expect(findProject()?.root).toBe(root);

    rmSync(join(root, ".trama"), { recursive: true });
    for (const fn of events.deleted) fn();
    expect(heard).toEqual([root, undefined]);

    const other = folder(true);
    for (const fn of events.folders) fn();
    expect(heard).toEqual([root, undefined, other]);
  } finally {
    listening.dispose();
    tracking.dispose();
  }
  // Stopped tracking: the watcher is released.
  expect(events.created).toEqual([]);
});
