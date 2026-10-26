import * as vscode from "vscode";
import { DocumentCache } from "../../../src/core/document-cache";
import { buildPicture, type Picture, type Snapshot } from "../../../src/core/snapshot";
import type { Project } from "../../../src/core/store";
import { synchronizeAnnouncementTitles } from "./announcements";
import { driftsFinishing, proposalsFinishing, tasksFinishing } from "./drift-resolution";
import { findProject } from "./project";

/** The pause of the global watcher of `.trama/**` before a picture is built (`tech#picture`). */
export const PICTURE_DEBOUNCE_MS = 150;

/**
 * What the window knows of its project (`tech#picture`): no project, the picture, or why it could not be read. A picture is the Snapshot with the cards it was built
 * from; the panel and the side menu get this one object.
 */
export type PictureOutcome =
  | { kind: "none" }
  | { kind: "failed"; project: Project; error: unknown }
  | { kind: "built"; project: Project; snapshot: Snapshot; picture: Picture };

/** Why a picture was built: the files of `.trama/` changed, the folders of the window changed, or an action or event of the host asked for it. */
export type PictureCause = "files" | "folders" | "requested";

/**
 * The picture of the project, one per window: it builds the Snapshot after the pause of the watcher of `.trama/**` and at every change of the workspace folders, with the
 * window's cache of parsed documents, and gives the same object to everyone who listens (the panel, the side menu). An action or event of the host that needs the files
 * as they are now builds a new picture at once (`build`). Changing the view of the panel builds nothing.
 */
export class WindowPicture implements vscode.Disposable {
  private readonly cache = new DocumentCache();
  private readonly listeners = new Set<(outcome: PictureOutcome, cause: PictureCause) => void>();
  private timer: NodeJS.Timeout | undefined;
  private last: PictureOutcome | undefined;

  /** `tramaFiles` is the extension's global watcher of `.trama/**`; without it only `build` and the folders of the window make a picture. */
  constructor(private readonly tramaFiles?: vscode.FileSystemWatcher) {}

  /** Starts following the files of `.trama/` and the workspace folders. */
  register(): vscode.Disposable {
    const onChange = () => this.schedule();
    return vscode.Disposable.from(
      ...(this.tramaFiles ? [this.tramaFiles.onDidCreate(onChange), this.tramaFiles.onDidChange(onChange), this.tramaFiles.onDidDelete(onChange)] : []),
      vscode.workspace.onDidChangeWorkspaceFolders(() => this.build("folders")),
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

  dispose(): void {
    clearTimeout(this.timer);
    this.listeners.clear();
    this.last = undefined;
  }

  private schedule(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.build("files");
    }, PICTURE_DEBOUNCE_MS);
  }

  /** The reads of the last picture are old once the listeners are done with it. */
  private release(): void {
    if (this.last?.kind === "built") this.last.picture.reads.close();
  }

  private make(): PictureOutcome {
    const project = findProject();
    if (project === undefined) return { kind: "none" };
    try {
      // The titles of the ghosts follow the Drafts they are bound to before the files are read, so the picture shows them.
      synchronizeAnnouncementTitles(project);
      const picture = buildPicture(project, driftsFinishing(project.root), proposalsFinishing(project.root), tasksFinishing(project.root), this.cache);
      return { kind: "built", project, snapshot: picture.snapshot, picture };
    } catch (error) {
      return { kind: "failed", project, error };
    }
  }
}
