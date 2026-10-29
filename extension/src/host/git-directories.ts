import { resolve } from "node:path";
import * as vscode from "vscode";
import { gitAsync } from "../../../src/core/git";
import { findProject } from "./project";

/** The git directory of the working copy and the one that holds the refs, `config` and `info/exclude` (the same, except in a linked worktree), as absolute paths. */
export interface GitDirs {
  dir: string;
  common: string;
}

/** The git directories of the working copy at `root`, or undefined when `root` is in no repository or git cannot answer. Runs git without holding the host. */
export async function readGitDirectories(root: string): Promise<GitDirs | undefined> {
  const out = await gitAsync(root, ["rev-parse", "--git-dir", "--git-common-dir"]);
  if (out === null) return undefined;
  const [dir, common] = out.split(/\r?\n/).filter((line) => line !== "");
  return dir === undefined || common === undefined ? undefined : { dir: resolve(root, dir), common: resolve(root, common) };
}

/** Watches git's `config` file in the common git directory; calls `onChange` at each change. */
export type ConfigWatcher = (common: string, onChange: () => void) => { dispose(): void };

const watchConfig: ConfigWatcher = (common, onChange) => {
  const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(vscode.Uri.file(common), "config"));
  const subscriptions = [watcher, watcher.onDidCreate(onChange), watcher.onDidChange(onChange), watcher.onDidDelete(onChange)];
  return { dispose: () => subscriptions.forEach((subscription) => subscription.dispose()) };
};

/** What the window's git directories need besides git: which project the window has, how to read the directories, how to watch `config`. */
export interface GitDirectoriesDeps {
  projectRoot?: () => string | undefined;
  read?: (root: string) => Promise<GitDirs | undefined>;
  watch?: ConfigWatcher;
}

/**
 * The git directories of the window's project, one per window (`quality#General`): resolved once when the window opens the project, and again only when git's `config`
 * changes (a `FileSystemWatcher` on that file) or the window's project changes. The window's other git facts that rarely change (the origin remote, the watchers of Merge
 * and of Solo mode) hang from it: `onDidChange` fires after the directories are known again, so a listener asks `get()` and finds them ready.
 */
export class GitDirectories implements vscode.Disposable {
  private readonly projectRoot: () => string | undefined;
  private readonly read: (root: string) => Promise<GitDirs | undefined>;
  private readonly watch: ConfigWatcher;
  private readonly listeners = new Set<() => void>();
  private followed: { root: string | undefined } | undefined;
  private dirs: Promise<GitDirs | undefined> = Promise.resolve(undefined);
  private watching: { common: string; watcher: { dispose(): void } } | undefined;
  private generation = 0;

  constructor(deps: GitDirectoriesDeps = {}) {
    this.projectRoot = deps.projectRoot ?? (() => findProject()?.root);
    this.read = deps.read ?? readGitDirectories;
    this.watch = deps.watch ?? watchConfig;
  }

  /** The root of the project the window follows now; undefined before the first `follow` and without a project. */
  root(): string | undefined {
    return this.followed?.root;
  }

  /** The directories of the followed project, as of the last time they were resolved; undefined outside a repository. */
  get(): Promise<GitDirs | undefined> {
    return this.dirs;
  }

  /** Calls `listener` after the directories were resolved again: the window's project changed, or git's `config` did. */
  onDidChange(listener: () => void): { dispose(): void } {
    this.listeners.add(listener);
    return { dispose: () => void this.listeners.delete(listener) };
  }

  /** Looks at the window's project: while it is the same one nothing happens and no process starts; another one (or none) resolves the directories. */
  follow(): void {
    const root = this.projectRoot();
    if (this.followed !== undefined && this.followed.root === root) return;
    this.followed = { root };
    void this.resolve(root);
  }

  private async resolve(root: string | undefined): Promise<void> {
    const generation = ++this.generation;
    const resolved = root === undefined ? Promise.resolve(undefined) : this.read(root);
    this.dirs = resolved;
    const found = await resolved;
    if (generation !== this.generation) return;
    if (found?.common !== this.watching?.common) {
      this.watching?.watcher.dispose();
      this.watching = found === undefined ? undefined : { common: found.common, watcher: this.watch(found.common, () => void this.resolve(this.followed?.root)) };
    }
    for (const listener of [...this.listeners]) listener();
  }

  dispose(): void {
    this.generation++;
    this.watching?.watcher.dispose();
    this.watching = undefined;
    this.listeners.clear();
  }
}
