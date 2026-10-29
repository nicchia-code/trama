import { editorEvent, timerWork } from "./performance";
import * as vscode from "vscode";
import { DocumentCache, type FileEvent, PictureReader } from "../../../src/core/document-cache";
import { buildPicture, type Picture, type Snapshot } from "../../../src/core/snapshot";
import type { Project } from "../../../src/core/store";
import { onFileWritten } from "../../../src/core/written";
import { synchronizeAnnouncementTitles } from "./announcements";
import { driftsFinishing, proposalsFinishing, tasksFinishing } from "./drift-resolution";
import { findProject, onProjectsChanged } from "./project";

/** The pause of the global watcher of `.trama/**` before a picture is built (`tech#picture`). */
export const PICTURE_DEBOUNCE_MS = 150;

/**
 * What the window knows of its project (`tech#picture`): no project, the picture, or why it could not be read. A picture is the Snapshot with the cards it was built
 * from; the panel, the side menu, the ghost item of the status bar, the execution check and the Run all estimate get this one object.
 */
export type PictureOutcome =
  | { kind: "none" }
  | { kind: "failed"; project: Project; error: unknown }
  | { kind: "built"; project: Project; snapshot: Snapshot; picture: Picture };

/** Why a picture was built: the files of `.trama/` changed, the folders of the window changed (or the project came or went), or an action or event of the host asked for it. */
export type PictureCause = "files" | "folders" | "requested";

/**
 * The picture of the project, one per window and the only owner of it: it builds the Snapshot after the pause of the watcher of `.trama/**` and at every change of the
 * workspace folders, and gives the same object to everyone who listens (`onDidBuild`: the panel, the side menu, the ghost item of the status bar, the execution check).
 *
 * The window's cache of parsed documents (`DocumentCache`) hears every path the watcher reports; a picture reads again only those, and takes every other file from the
 * cache. An action or event of the host that needs the files as they are now builds a new picture at once (`build`): the files this process wrote are read again, and the
 * watcher events of those writes that come later, for files the picture already read with the same `mtimeMs`, `size` and `ino`, build nothing. A full check of every file runs
 * when the window opens the project and when it comes back to the foreground, asynchronously. Changing the view of the panel builds nothing.
 */
export class WindowPicture implements vscode.Disposable {
  private readonly listeners = new Set<(outcome: PictureOutcome, cause: PictureCause) => void>();
  private timer: NodeJS.Timeout | undefined;
  private last: PictureOutcome | undefined;
  /** The project root the cache holds files of. */
  private root: string | undefined;
  private foldersPending = false;
  /** The full check made when the window opened its project; settles when it is over and, if it found anything, its picture was built. */
  opening: Promise<void> = Promise.resolve();

  /** What this process writes or removes under `.trama/` is known to the cache at once, so a picture an action asks for reads it again without waiting for the watcher; it holds for a picture that was never `register`ed too. */
  private readonly writes = onFileWritten((kind, path) => (kind === "written" ? this.cache.written(path) : this.cache.removed(path)));

  /** `tramaFiles` is the extension's global watcher of `.trama/**`; without it only `build` and the folders of the window make a picture. `cache` is the window's cache of parsed documents. */
  constructor(
    private readonly tramaFiles?: vscode.FileSystemWatcher,
    readonly cache: DocumentCache = new DocumentCache(),
  ) {}

  /** Starts following the files of `.trama/`, the workspace folders and the window's focus, and starts the full check of the project the window opened. */
  register(): vscode.Disposable {
    const heard = (event: FileEvent) => (uri: vscode.Uri) => {
      if (this.cache.observe(event, uri.fsPath)) this.schedule();
    };
    this.root = findProject()?.root;
    this.opening = this.check();
    return vscode.Disposable.from(
      ...(this.tramaFiles ? [this.tramaFiles.onDidCreate(heard("created")), this.tramaFiles.onDidChange(heard("changed")), this.tramaFiles.onDidDelete(heard("deleted"))] : []),
      vscode.workspace.onDidChangeWorkspaceFolders(() => this.foldersChanged()),
      onProjectsChanged(() => this.foldersChanged()),
      // A change nobody reported (an editor that was suspended, a shared folder) shows when the window comes back to the foreground.
      vscode.window.onDidChangeWindowState(editorEvent("window focus", (state: vscode.WindowState) => (state.focused ? this.check() : undefined))),
    );
  }

  /** Calls `listener` with every picture built, in the same call for every listener. */
  onDidBuild(listener: (outcome: PictureOutcome, cause: PictureCause) => void): { dispose(): void } {
    this.listeners.add(listener);
    return { dispose: () => void this.listeners.delete(listener) };
  }

  /**
   * Builds a new picture now, reading every file that changed, and gives it to every listener and then to `also`. While they run the picture's reads are open: what
   * they need of the cards comes from the picture's own parsed files (`outcome.picture.reads.run`), not from new reads.
   */
  build(cause: PictureCause = "requested", also?: (outcome: PictureOutcome) => void): PictureOutcome {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.release();
    const outcome = this.make();
    this.last = outcome;
    try {
      for (const listener of [...this.listeners]) listener(outcome, cause);
      also?.(outcome);
    } finally {
      this.release();
    }
    return outcome;
  }

  /** The last picture, and none yet or one of another project: built now, without telling the listeners. */
  latest(): PictureOutcome {
    const project = findProject();
    const last = this.last;
    const current = last !== undefined && (project === undefined ? last.kind === "none" : last.kind !== "none" && last.project.root === project.root);
    if (current) return last;
    this.last = this.make();
    this.release();
    return this.last;
  }

  /** The last picture built, or undefined when none was: builds nothing and reads nothing. */
  peek(): PictureOutcome | undefined {
    return this.last;
  }

  dispose(): void {
    clearTimeout(this.timer);
    this.writes.dispose();
    this.listeners.clear();
    this.last = undefined;
  }

  private schedule(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = undefined;
      timerWork("build picture", () => this.build("files"));
    }, PICTURE_DEBOUNCE_MS);
  }

  /** The folders of the window changed, or a project came or went: one picture, however many events say so in the same turn. */
  private foldersChanged(): void {
    if (this.foldersPending) return;
    this.foldersPending = true;
    queueMicrotask(() => {
      this.foldersPending = false;
      const root = findProject()?.root;
      // Another project: what the cache holds belongs to the one before.
      if (root !== this.root) this.cache.clear();
      this.root = root;
      this.build("folders");
      void this.check();
    });
  }

  /**
   * The full check (`quality#panel`): every folder of `.trama/` listed and every file stat'ed, asynchronously, the files whose `mtimeMs`, `size` or `ino` changed read
   * again. Its result becomes the next picture only when something changed.
   */
  private async check(): Promise<void> {
    const project = findProject();
    if (project === undefined) return;
    try {
      if (await this.cache.verify(project.dir)) {
        if (findProject()?.root === project.root) this.build("files");
      }
    } catch {
      // A folder that cannot be listed leaves the cache as it is; the next change or return of the window checks again.
    }
  }

  /** The reads of the last picture are old once the listeners are done with it. */
  private release(): void {
    if (this.last?.kind === "built") this.last.picture.reads.close();
  }

  private make(): PictureOutcome {
    const project = findProject();
    if (project === undefined) return { kind: "none" };
    try {
      // The titles of the ghosts follow the Drafts they are bound to before the files are read, so the picture shows them. The cards that decide are the cache's.
      const titles = new PictureReader(this.cache);
      try {
        synchronizeAnnouncementTitles(project, (fn) => titles.run(fn));
      } finally {
        titles.close();
      }
      const picture = buildPicture(project, driftsFinishing(project.root), proposalsFinishing(project.root), tasksFinishing(project.root), this.cache);
      return { kind: "built", project, snapshot: picture.snapshot, picture };
    } catch (error) {
      return { kind: "failed", project, error };
    }
  }
}
