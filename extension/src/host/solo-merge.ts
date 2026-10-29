import { timerWork } from "./performance";
import * as vscode from "vscode";
import { abortMerge, conflictedFiles, currentBranch, fetchRemotes, isUpToDate, type MergeAvailability, mergeAvailability, mergeBranches, type MergeOutcome, readOpenMerge, settleMerge, startMerge } from "../../../src/core/solo-merge";
import { currentSoloAsync, readSoloMode } from "../../../src/core/solo-mode";
import type { Project } from "../../../src/core/store";
import { MERGE_REASONS, type MergeMenuState } from "../menu-protocol";
import type { AgentAction } from "../protocol";
import { configuredSkillsDir } from "./agent";
import { describeError } from "./controller";
import { localProjectJobs } from "./drift-resolution";
import type { GitDirectories } from "./git-directories";
import { findProject } from "./project";

/** How long a burst of changes in git's directory waits before the remembered merge is looked at and the state of Merge is worked out again. */
const GIT_DEBOUNCE_MS = 150;

/** The text of a git error as the messages of Merge carry it: without the full stop git may end it with, which the message adds itself. */
const reasonText = (reason: string): string => reason.replace(/\.+$/, "");

/** What git told about Merge the last time the state was worked out, for the project at `root`; the agent's jobs are not in it, because the window knows them without git. */
interface MergeFacts {
  root: string;
  availability: MergeAvailability;
  trackedTrama: boolean;
  open?: { branch: string; conflict: boolean };
}

/**
 * Merge of Solo mode for the window (`solo-merge`): the flow of the button of the side menu (fetch, list of branches, confirmations, merge, conflicts, abort), the
 * scan after a merge and the follow-up of a merge Trama started. Every git call here is asynchronous and the editor's thread never waits for one. The side menu reads
 * `state()`, which is a read of what is already known, calls `merge`, `openMergeEditor`, `reconcile` and `abort`, and listens to `onDidChange`. The state is worked out in
 * the background only while the menu is visible (`setMenuVisible`): when it becomes visible and, while it is, after the pause of the watcher of the git directory (`HEAD`,
 * `MERGE_HEAD`, `index`, the refs and `packed-refs`). Nothing watches the files of the working copy: saving or changing a file never works the state out again. The remembered
 * merge is looked at at activation (`start`), at every execution check (`check`) and after the pause of the git watcher.
 */
export class SoloMerge implements vscode.Disposable {
  private readonly changes = new vscode.EventEmitter<void>();
  /** Fired when what `state()` answers may have changed. */
  readonly onDidChange: vscode.Event<void> = this.changes.event;
  /** A press of Merge or of Abort is going on: another press does nothing, and the remembered merge is not looked at meanwhile (git has not finished writing it). */
  private busy = false;
  private watching: vscode.Disposable | undefined;
  private watchGeneration = 0;
  private gitTimer: NodeJS.Timeout | undefined;
  private menuVisible = false;
  /** The last state worked out and whether a calculation is going on: two never overlap, and one asked meanwhile starts once at the end. */
  private facts: MergeFacts | undefined;
  private working = false;
  private again = false;

  /** `launch` starts an agent action of the host (`Controller.launch`); `git` gives the window's git directories. */
  constructor(
    private readonly launch: (action: AgentAction) => Promise<void>,
    private readonly git: GitDirectories,
  ) {}

  /** Starts following the window: looks at the remembered merge now and watches the git directory from here on, again whenever the window's git directories are resolved again. */
  start(): vscode.Disposable {
    void this.follow();
    void this.check();
    return vscode.Disposable.from(
      this.git.onDidChange(() => {
        void this.follow();
        void this.check();
      }),
    );
  }

  /** The side menu became visible or hidden: the state of Merge is worked out in the background when it becomes visible, and not asked for while it is hidden. */
  setMenuVisible(visible: boolean): void {
    this.menuVisible = visible;
    if (visible) this.workOut();
  }

  /** What the side menu shows of Merge: undefined outside a project, with Solo mode off and before the first state is worked out. Reads nothing from git. */
  state(): MergeMenuState | undefined {
    const project = findProject();
    if (project === undefined || readSoloMode(project) === "off") return undefined;
    const facts = this.facts;
    if (facts === undefined || facts.root !== project.root) {
      // Solo mode was just turned on, or the project is another one: the first state is asked for now and shown when it is worked out (only while the menu is visible).
      this.workOut();
      return undefined;
    }
    // The jobs of the agent are the window's own: they come last in the order of the reasons, and need no git.
    const reason = facts.availability.reason ?? (localProjectJobs(project.root).length > 0 ? "agent" : undefined);
    return { available: reason === undefined, ...(reason === undefined ? {} : { reason }), trackedTrama: facts.trackedTrama, ...(facts.open === undefined ? {} : { open: facts.open }) };
  }

  /** Asks for the state to be worked out: now when no calculation is going on, otherwise once more when the one going on ends. Only while the menu is visible. */
  private workOut(): void {
    if (!this.menuVisible) return;
    if (this.working) {
      this.again = true;
      return;
    }
    this.working = true;
    void this.keepWorking();
  }

  private async keepWorking(): Promise<void> {
    try {
      do {
        this.again = false;
        if (await this.gather()) this.changes.fire();
      } while (this.again && this.menuVisible);
    } finally {
      this.working = false;
      this.again = false;
    }
  }

  /** Works the state out with git, in the background; a project without Solo mode has none. False when the state could not be worked out: nothing changed, and nothing is told. */
  private async gather(): Promise<boolean> {
    const project = findProject();
    if (project === undefined || readSoloMode(project) === "off") {
      this.facts = undefined;
      return true;
    }
    try {
      const skills = configuredSkillsDir();
      const [availability, solo, open] = await Promise.all([mergeAvailability(project, false, skills), currentSoloAsync(project, skills), this.openMerge(project)]);
      this.facts = { root: project.root, availability, trackedTrama: solo.tracked.length > 0, ...(open === undefined ? {} : { open }) };
      return true;
    } catch (err) {
      void vscode.window.showErrorMessage(`Trama: could not work out the state of Merge: ${describeError(err)}`);
      return false;
    }
  }

  /** The merge Trama remembers and whether its files still have conflicts. */
  private async openMerge(project: Project): Promise<{ branch: string; conflict: boolean } | undefined> {
    const merge = readOpenMerge(project);
    return merge === null ? undefined : { branch: merge.branch, conflict: (await conflictedFiles(project.root)).length > 0 };
  }

  /** The remembered merge, looked at now: committed, the scan after the merge starts; abandoned, it is forgotten; still open or none, nothing happens. Not while a press of Merge or Abort goes on: git may not have finished the merge yet. */
  async check(): Promise<void> {
    const project = findProject();
    if (project === undefined || this.busy) return;
    try {
      const end = await settleMerge(project);
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
  private async available(project: Project): Promise<boolean> {
    const { available, reason } = await mergeAvailability(project, localProjectJobs(project.root).length > 0, configuredSkillsDir());
    if (!available && reason !== undefined) void vscode.window.showWarningMessage(`Trama: ${MERGE_REASONS[reason]}`);
    return available;
  }

  private async choose(project: Project): Promise<void> {
    if (!(await this.available(project))) return;
    try {
      await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "Fetching…" }, () => fetchRemotes(project.root));
    } catch (err) {
      void vscode.window.showErrorMessage(`Trama: could not fetch: ${reasonText(describeError(err))}.`);
      return;
    }
    const current = await currentBranch(project.root);
    if (current === null || !(await this.available(project))) return;
    const branches = await mergeBranches(project.root);
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
    if ((await currentBranch(project.root)) !== current || !(await this.available(project))) return;
    if (!branch.usual) {
      const answer = await vscode.window.showWarningMessage(`Merge ${branch.name} into ${current}?`, { modal: true, detail: `${branch.name} is not the upstream of ${current}.` }, "Merge");
      if (answer !== "Merge") return;
      if ((await currentBranch(project.root)) !== current || !(await this.available(project))) return;
    }
    await this.run(project, branch.name, current);
  }

  private async run(project: Project, branch: string, current: string): Promise<void> {
    let outcome: MergeOutcome;
    try {
      if (await isUpToDate(project.root, branch)) {
        void vscode.window.showInformationMessage(`Trama: ${current} is already up to date with ${branch}.`);
        return;
      }
      outcome = await startMerge(project, branch);
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
    const first = (await conflictedFiles(project.root))[0];
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
    this.busy = true;
    try {
      await abortMerge(project);
    } catch (err) {
      void vscode.window.showErrorMessage(`Trama: could not abort the merge: ${reasonText(describeError(err))}.`);
    } finally {
      this.busy = false;
    }
    this.changes.fire();
  }

  /**
   * Watches the git directory of the window's project: `HEAD`, `MERGE_HEAD` and `index` of the git directory, and the refs and `packed-refs` of the common one, with the pause of
   * `GIT_DEBOUNCE_MS`. The directories come from the window's `GitDirectories`, read once and again when git's configuration changes; nothing here starts a process to find them.
   */
  private async follow(): Promise<void> {
    const generation = ++this.watchGeneration;
    this.watching?.dispose();
    this.watching = undefined;
    const dirs = await this.git.get();
    if (dirs === undefined || generation !== this.watchGeneration) return;
    const onGit = () => {
      clearTimeout(this.gitTimer);
      this.gitTimer = setTimeout(() => {
        timerWork("check Merge", () => {
          void this.check();
          this.workOut();
        });
      }, GIT_DEBOUNCE_MS);
    };
    const patterns = [new vscode.RelativePattern(vscode.Uri.file(dirs.dir), "{HEAD,MERGE_HEAD,index}"), new vscode.RelativePattern(vscode.Uri.file(dirs.common), "{refs/**,packed-refs}")];
    const watchers = patterns.map((pattern) => vscode.workspace.createFileSystemWatcher(pattern));
    this.watching = vscode.Disposable.from(...watchers.flatMap((watcher) => [watcher, watcher.onDidCreate(onGit), watcher.onDidChange(onGit), watcher.onDidDelete(onGit)]));
  }

  dispose(): void {
    clearTimeout(this.gitTimer);
    this.watchGeneration++;
    this.watching?.dispose();
    this.watching = undefined;
    this.changes.dispose();
  }
}
