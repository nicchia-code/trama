import { timerWork } from "./performance";
import * as vscode from "vscode";
import { gitAsync } from "../../../src/core/git";
import { readSoloMode, type SoloKind, setSoloModeAsync, soloStatusAsync } from "../../../src/core/solo-mode";
import type { Project } from "../../../src/core/store";
import type { ToWebview } from "../protocol";
import { configuredSkillsDir } from "./agent";
import type { GitDirectories } from "./git-directories";
import { findProject } from "./project";

/** The `soloMode` message of the Settings tab. */
export type SoloModeMessage = Extract<ToWebview, { type: "soloMode" }>;

/** How long a burst of changes in git's `index` or `info/exclude` waits before Solo mode is worked out again. */
const GIT_DEBOUNCE_MS = 150;

/** Whether `root` is inside a git working tree: what the first setup's wizard needs to offer Solo mode there. Asked without holding the host. */
export async function inGitRepository(root: string): Promise<boolean> {
  return (await gitAsync(root, ["rev-parse", "--is-inside-work-tree"]))?.trim() === "true";
}

/** Writes Solo mode of the project (`.trama/solo/` and git's local `info/exclude` only); throws with the reason when it cannot. With `onlyIfChanged` nothing is written when the project already has that kind. */
export async function writeSoloMode(project: Project, solo: SoloKind, onlyIfChanged = false): Promise<void> {
  if (onlyIfChanged && readSoloMode(project) === solo) return;
  await setSoloModeAsync(project, solo, configuredSkillsDir());
}

/**
 * The last `soloMode` message of the window (`tech#solo-mode`): worked out asynchronously, through the same in-process code as `trama project edit` with the configured skills
 * folder, only when the window first needs it, after every write of Solo mode (`refresh`) and when the git directory reports a change of `index` or `info/exclude` (the files git
 * tracks under Trama's paths and the block of exclusions live there). `last` hands out what is known and starts no process, so the Settings tab, each time it becomes visible,
 * shows the last value at once.
 */
export class SoloModeState {
  private message: { root: string; value: SoloModeMessage } | undefined;
  private generation = 0;
  private readonly listeners = new Set<(message: SoloModeMessage) => void>();
  private watching: vscode.Disposable | undefined;
  private watchGeneration = 0;
  private timer: NodeJS.Timeout | undefined;

  constructor(private readonly git: GitDirectories) {}

  /** Starts watching `index` and `info/exclude` of the window's git directories, again whenever they are resolved again. */
  start(): { dispose(): void } {
    void this.follow();
    const subscription = this.git.onDidChange(() => {
      void this.follow();
      this.changed();
    });
    return {
      dispose: () => {
        subscription.dispose();
        clearTimeout(this.timer);
        this.watchGeneration++;
        this.watching?.dispose();
        this.watching = undefined;
      },
    };
  }

  /** The last message worked out for `project`; undefined before the first, which `refresh` works out. Starts no process. */
  last(project: Project): SoloModeMessage | undefined {
    return this.message?.root === project.root ? this.message.value : undefined;
  }

  /** Calls `listener` with the new message when git's directory reported a change and the state was worked out again. */
  onDidChange(listener: (message: SoloModeMessage) => void): { dispose(): void } {
    this.listeners.add(listener);
    return { dispose: () => void this.listeners.delete(listener) };
  }

  /** Works Solo mode of the project out now, asynchronously; it becomes the last message. Of two overlapping calls the later one wins. */
  async refresh(project: Project): Promise<SoloModeMessage> {
    const generation = ++this.generation;
    const value: SoloModeMessage = { type: "soloMode", ...(await soloStatusAsync(project, configuredSkillsDir())) };
    if (generation === this.generation) this.message = { root: project.root, value };
    return this.message?.root === project.root ? this.message.value : value;
  }

  /** The git directory reported a change, or the window's project changed: what was known is worked out again, when something was known. */
  private changed(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      timerWork("refresh Solo mode state", () => {
        const known = this.message;
        const project = findProject();
        if (known === undefined || project === undefined || project.root !== known.root) return;
        void this.refresh(project).then((message) => {
          for (const listener of [...this.listeners]) listener(message);
        });
      });
    }, GIT_DEBOUNCE_MS);
  }

  private async follow(): Promise<void> {
    const generation = ++this.watchGeneration;
    this.watching?.dispose();
    this.watching = undefined;
    const dirs = await this.git.get();
    if (dirs === undefined || generation !== this.watchGeneration) return;
    const patterns = [new vscode.RelativePattern(vscode.Uri.file(dirs.dir), "index"), new vscode.RelativePattern(vscode.Uri.file(dirs.common), "info/exclude")];
    const watchers = patterns.map((pattern) => vscode.workspace.createFileSystemWatcher(pattern));
    const onGit = () => this.changed();
    this.watching = vscode.Disposable.from(...watchers.flatMap((watcher) => [watcher, watcher.onDidCreate(onGit), watcher.onDidChange(onGit), watcher.onDidDelete(onGit)]));
  }
}
