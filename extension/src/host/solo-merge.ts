import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import * as vscode from "vscode";
import { abortMerge, conflictedFiles, currentBranch, fetchRemotes, isUpToDate, mergeAvailability, mergeBranches, type MergeOutcome, readOpenMerge, settleMerge, startMerge } from "../../../src/core/solo-merge";
import { currentSolo, readSoloMode } from "../../../src/core/solo-mode";
import type { Project } from "../../../src/core/store";
import { MERGE_REASONS, type MergeMenuState } from "../menu-protocol";
import type { AgentAction } from "../protocol";
import { configuredSkillsDir } from "./agent";
import { describeError } from "./controller";
import { localProjectJobs } from "./drift-resolution";
import { findProject } from "./project";

/** How long a burst of changes in the working copy waits before the menu's state is worked out again. */
const FILES_DEBOUNCE_MS = 500;
/** How long a burst of changes in git's directory waits before the remembered merge is looked at. */
const GIT_DEBOUNCE_MS = 150;

/** The text of a git error as the messages of Merge carry it: without the full stop git may end it with, which the message adds itself. */
const reasonText = (reason: string): string => reason.replace(/\.+$/, "");

/** The git directory of the working copy at `root` and the one that holds the refs (the same, except in a linked worktree), as absolute paths; undefined when `root` is in no repository. */
function gitDirectories(root: string): { dir: string; common: string } | undefined {
  try {
    const out = execFileSync("git", ["--no-optional-locks", "rev-parse", "--git-dir", "--git-common-dir"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 20_000 });
    const [dir, common] = out.split(/\r?\n/).filter((line) => line !== "");
    return dir === undefined || common === undefined ? undefined : { dir: resolve(root, dir), common: resolve(root, common) };
  } catch {
    return undefined;
  }
}

/**
 * Merge of Solo mode for the window (`solo-merge`): the flow of the button of the side menu (fetch, list of branches, confirmations, merge, conflicts, abort), the
 * scan after a merge and the follow-up of a merge Trama started. The side menu reads `state()`, calls `merge`, `openMergeEditor`, `reconcile` and `abort`, and
 * listens to `onDidChange`. It watches the git directory and the files of the working copy, and looks at the remembered merge at activation (`start`) and at every
 * execution check (`check`).
 */
export class SoloMerge implements vscode.Disposable {
  private readonly changes = new vscode.EventEmitter<void>();
  /** Fired when what `state()` answers may have changed. */
  readonly onDidChange: vscode.Event<void> = this.changes.event;
  /** A press of Merge is going on, from the fetch to the end of the merge: another press does nothing. */
  private busy = false;
  private watching: { root: string; watchers: vscode.Disposable } | undefined;
  private gitTimer: NodeJS.Timeout | undefined;
  private filesTimer: NodeJS.Timeout | undefined;

  /** `launch` starts an agent action of the host (`Controller.launch`). */
  constructor(private readonly launch: (action: AgentAction) => Promise<void>) {}

  /** Starts following the window: looks at the remembered merge now and watches git and the files from here on. */
  start(): vscode.Disposable {
    this.follow();
    this.check();
    const files = vscode.workspace.createFileSystemWatcher("**/*");
    return vscode.Disposable.from(
      vscode.workspace.onDidChangeWorkspaceFolders(() => {
        this.follow();
        this.check();
      }),
      vscode.workspace.onDidSaveTextDocument(() => this.filesChanged()),
      files,
      files.onDidCreate((uri) => this.fileEvent(uri)),
      files.onDidChange((uri) => this.fileEvent(uri)),
      files.onDidDelete((uri) => this.fileEvent(uri)),
    );
  }

  /** What the side menu shows of Merge: undefined outside a project and with Solo mode off. */
  state(): MergeMenuState | undefined {
    const project = findProject();
    if (project === undefined || readSoloMode(project) === "off") return undefined;
    const skills = configuredSkillsDir();
    const { available, reason } = mergeAvailability(project, localProjectJobs(project.root).length > 0, skills);
    const merge = readOpenMerge(project);
    return {
      available,
      ...(reason === undefined ? {} : { reason }),
      trackedTrama: currentSolo(project, skills).tracked.length > 0,
      ...(merge === null ? {} : { open: { branch: merge.branch, conflict: conflictedFiles(project.root).length > 0 } }),
    };
  }

  /** The remembered merge, looked at now: committed, the scan after the merge starts; abandoned, it is forgotten; still open or none, nothing happens. Merge's own `git merge` runs without letting go of the host, so a check never finds a merge half started. */
  check(): void {
    const project = findProject();
    if (project === undefined) return;
    try {
      const end = settleMerge(project);
      if (end.kind === "committed") void this.scan(end.merge.base, end.merge.incoming);
      if (end.kind !== "none") this.changes.fire();
    } catch (err) {
      void vscode.window.showErrorMessage(`Trama: could not check the merge: ${describeError(err)}`);
    }
  }

  /** The press of Merge: fetch, the list of branches, the confirmation of an unusual one, then the merge. */
  async merge(): Promise<void> {
    const project = findProject();
    if (project === undefined || readSoloMode(project) === "off" || this.busy) return;
    this.busy = true;
    try {
      await this.choose(project);
    } finally {
      this.busy = false;
      this.changes.fire();
    }
  }

  /** Whether Merge is available now, the answer of the moment right before it starts; when not, says why. */
  private available(project: Project): boolean {
    const { available, reason } = mergeAvailability(project, localProjectJobs(project.root).length > 0, configuredSkillsDir());
    if (!available && reason !== undefined) void vscode.window.showWarningMessage(`Trama: ${MERGE_REASONS[reason]}`);
    return available;
  }

  private async choose(project: Project): Promise<void> {
    if (!this.available(project)) return;
    try {
      await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "Fetching…" }, () => fetchRemotes(project.root));
    } catch (err) {
      void vscode.window.showErrorMessage(`Trama: could not fetch: ${reasonText(describeError(err))}.`);
      return;
    }
    const current = currentBranch(project.root);
    if (current === null || !this.available(project)) return;
    const branches = mergeBranches(project.root);
    if (branches.length === 0) {
      void vscode.window.showInformationMessage(`Trama: there is no other branch to merge into ${current}.`);
      return;
    }
    const picked = await vscode.window.showQuickPick(
      branches.map((branch) => ({ label: branch.name, ...(branch.upstream ? { description: "upstream" } : {}), branch })),
      { title: `Merge into ${current}`, placeHolder: "Choose the branch to merge" },
    );
    if (picked === undefined) return;
    const { branch } = picked;
    // The picture may have changed while the list was open.
    if (currentBranch(project.root) !== current || !this.available(project)) return;
    if (!branch.usual) {
      const answer = await vscode.window.showWarningMessage(`Merge ${branch.name} into ${current}?`, { modal: true, detail: `${branch.name} is not the upstream of ${current}.` }, "Merge");
      if (answer !== "Merge") return;
      if (currentBranch(project.root) !== current || !this.available(project)) return;
    }
    await this.run(project, branch.name, current);
  }

  private async run(project: Project, branch: string, current: string): Promise<void> {
    let outcome: MergeOutcome;
    try {
      if (isUpToDate(project.root, branch)) {
        void vscode.window.showInformationMessage(`Trama: ${current} is already up to date with ${branch}.`);
        return;
      }
      outcome = startMerge(project, branch);
    } catch (err) {
      void vscode.window.showErrorMessage(`Trama: could not merge ${branch}: ${reasonText(describeError(err))}.`);
      return;
    }
    switch (outcome.kind) {
      case "failed":
        void vscode.window.showErrorMessage(`Trama: could not merge ${branch}: ${reasonText(outcome.reason)}.`);
        return;
      case "merged":
        void vscode.window.showInformationMessage(`Trama: merged ${branch}. Scanning the System.`);
        await this.scan(outcome.base, outcome.incoming);
        return;
      case "conflicts":
        this.changes.fire();
        void this.offerWays(branch, outcome.files.length);
        return;
    }
  }

  /** The warning of a merge with conflicts: the three ways to go on. Closing it chooses nothing. */
  private async offerWays(branch: string, count: number): Promise<void> {
    const choice = await vscode.window.showWarningMessage(`Trama: merging ${branch} left conflicts in ${count === 1 ? "1 file" : `${count} files`}.`, "Open Merge Editor", "Reconcile with Agent", "Abort");
    if (choice === "Open Merge Editor") await this.openMergeEditor();
    else if (choice === "Reconcile with Agent") await this.reconcile();
    else if (choice === "Abort") await this.abort();
  }

  /** The scan after a merge: the whole System, told which commits the merge brought in. A scan that cannot start is reported like any launch and not tried again. */
  private async scan(base: string, incoming: string): Promise<void> {
    try {
      await this.launch({ kind: "mergeScan", base, incoming });
    } catch (err) {
      void vscode.window.showErrorMessage(`Trama: ${describeError(err)}`);
    }
  }

  /** Opens the first file with conflicts of the merge in the editor's merge editor, or as a plain file when the editor has no such command. */
  async openMergeEditor(): Promise<void> {
    const project = findProject();
    if (project === undefined || readOpenMerge(project) === null) return;
    const first = conflictedFiles(project.root)[0];
    if (first === undefined) {
      void vscode.window.showInformationMessage("Trama: the merge has no file with conflicts left.");
      return;
    }
    const uri = vscode.Uri.file(first);
    try {
      if ((await vscode.commands.getCommands(true)).includes("git.openMergeEditor")) await vscode.commands.executeCommand("git.openMergeEditor", uri);
      else await vscode.window.showTextDocument(uri);
    } catch (err) {
      void vscode.window.showErrorMessage(`Trama: could not open ${first}: ${describeError(err)}`);
    }
  }

  /** Has the agent resolve the conflicts of the open merge, in a terminal or in omp Chat. */
  async reconcile(): Promise<void> {
    const project = findProject();
    const merge = project === undefined ? null : readOpenMerge(project);
    if (merge === null) return;
    try {
      await this.launch({ kind: "reconcileMerge", branch: merge.branch });
    } catch (err) {
      void vscode.window.showErrorMessage(`Trama: ${describeError(err)}`);
    }
  }

  /** Aborts the open merge with git after the developer confirms; a failure is told and the merge stays open. */
  async abort(): Promise<void> {
    const project = findProject();
    const merge = project === undefined ? null : readOpenMerge(project);
    if (project === undefined || merge === null) return;
    const answer = await vscode.window.showWarningMessage(`Abort the merge of ${merge.branch}?`, { modal: true, detail: "Every change of the merge is undone." }, "Abort Merge");
    if (answer !== "Abort Merge") return;
    try {
      abortMerge(project);
    } catch (err) {
      void vscode.window.showErrorMessage(`Trama: could not abort the merge: ${reasonText(describeError(err))}.`);
    }
    this.changes.fire();
  }

  /** Watches the git directory of the open project: `HEAD`, `MERGE_HEAD`, `index` and the refs. Does nothing while the project is the same. */
  private follow(): void {
    const root = findProject()?.root;
    if (this.watching?.root === root) return;
    this.watching?.watchers.dispose();
    this.watching = undefined;
    if (root === undefined) return;
    const dirs = gitDirectories(root);
    if (dirs === undefined) return;
    const onGit = () => {
      clearTimeout(this.gitTimer);
      this.gitTimer = setTimeout(() => {
        this.check();
        this.changes.fire();
      }, GIT_DEBOUNCE_MS);
    };
    const patterns = [new vscode.RelativePattern(vscode.Uri.file(dirs.dir), "{HEAD,MERGE_HEAD,index}"), new vscode.RelativePattern(vscode.Uri.file(dirs.common), "{refs/**,packed-refs}")];
    const watchers = patterns.map((pattern) => vscode.workspace.createFileSystemWatcher(pattern));
    const subscriptions = watchers.flatMap((watcher) => [watcher, watcher.onDidCreate(onGit), watcher.onDidChange(onGit), watcher.onDidDelete(onGit)]);
    this.watching = { root, watchers: vscode.Disposable.from(...subscriptions) };
  }

  private fileEvent(uri: vscode.Uri): void {
    if (/[\\/](\.git|node_modules)[\\/]/.test(uri.fsPath)) return;
    this.filesChanged();
  }

  /** A file of the working copy changed: Merge's availability may have changed. */
  private filesChanged(): void {
    clearTimeout(this.filesTimer);
    this.filesTimer = setTimeout(() => this.changes.fire(), FILES_DEBOUNCE_MS);
  }

  dispose(): void {
    clearTimeout(this.gitTimer);
    clearTimeout(this.filesTimer);
    this.watching?.watchers.dispose();
    this.watching = undefined;
    this.changes.dispose();
  }
}
