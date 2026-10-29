import { basename } from "node:path";
import type { PullRequest } from "../../../../src/core/github";
import { buildReport, isOutdated, leftoverFolders, placeOf, prepareCheck, type PreparedCheck, readReports, removeWorktree, scanDelivered, scanRows, writeReport } from "../../../../src/core/pr-check";
import { type Project, projectAt } from "../../../../src/core/store";
import type { PullRequestView, ToWebview } from "../../protocol";

/** The message the Pull Requests tab gets (`tech#pr-check`). */
export type PullRequestsMessage = Extract<ToWebview, { type: "pullRequests" }>;

/** What the PR Check of a window needs of the editor; tests replace it. */
export interface PrCheckPorts {
  /** The project open in the window. */
  project(): Project | undefined;
  /** `ExtensionContext.storageUri` of the window: where the worktrees live; undefined when the window has no storage for the workspace. */
  storage(): string | undefined;
  /** The folder of the agent skills (`trama.skillsDir`). */
  skillsDir(): string;
  /** Whether a Run launched from this window is in progress. */
  runInProgress(): boolean;
  /** Writes the agent skills, the agent definitions and the advisor instructions of this version into the worktree: the check at every opening, on the worktree. */
  writeSkills(worktree: Project): void | Promise<void>;
  /**
   * Launches the scan in the worktree (`prepared`): the agent works in `prepared.root`, the job, the announcement `Checking PR #<n>` and the question channel stay on the open folder.
   * `onStarted` hears of the terminal or conversation when the launch is sure to go on, `onEnd` of the end of the job (hook idle, end of turn, end of the command, terminal closed, execution check).
   * Rejects with the reason when the instruction does not leave.
   */
  launch(prepared: PreparedCheck, job: { onStarted(terminal: string): void; onEnd(abnormal?: string): void }): Promise<void>;
  /** Stops the agent of a terminal or conversation: closes the terminal, ends the conversation. Returns whether the window had it. */
  stop(terminal: string): boolean;
  /** An error of the editor. */
  error(text: string): void;
  /** A warning of the editor. */
  warning(text: string): void;
  /** The state of the PR Check changed: the Pull Requests tab hears of it. */
  changed(): void;
}

/** The PR Check running in the window (`data#pull-request-check`): kept only in memory. */
interface Running {
  number: number;
  pr: PullRequest;
  /** Ready once the preparation ended: the worktree, the way it works, the merge-base and the rows of Trama's checks. */
  prepared: PreparedCheck | null;
  /** The instant the instruction left, in ms since the epoch; null before. */
  launchedAt: number | null;
  /** The terminal or omp Chat conversation of the job; null before the launch. */
  terminal: string | null;
  /** Stop was pressed: the worktree is removed and nothing is written. */
  stopping: boolean;
  finished: boolean;
}

const reasonOf = (error: unknown): string => {
  const text = error instanceof Error ? error.message : String(error);
  return (text.split(/\r?\n/).find((line) => line.trim() !== "") ?? text).trim().replace(/\.$/, "");
};

/**
 * The PR Check of one window (`rules#pull-request-check`): at most one at a time. It prepares the worktree, launches the job, follows its end and its Stop, writes the report and removes the
 * worktree, and removes the worktrees a window that closed while checking left behind.
 */
export class PrChecks {
  private current: Running | null = null;

  constructor(private readonly ports: PrCheckPorts) {}

  /** The number of the pull request whose PR Check runs in this window, preparation and removal included; null when none does. */
  get running(): number | null {
    return this.current?.number ?? null;
  }

  /** Why `Check` is unavailable on every pull request: `running` while a PR Check of this window runs, `run` while a Run launched from it is in progress. */
  blocked(): "running" | "run" | null {
    return this.current !== null ? "running" : this.ports.runInProgress() ? "run" : null;
  }

  /**
   * `developer.CHECK_PULL_REQUEST`: checks again what the tab showed (the pull request is on the list, no other PR Check and no Run of this window is going, the last read worked),
   * prepares the worktree, launches the scan and goes on until the job ends. A step that fails stops everything, removes what was created and shows
   * `Trama: could not check #<n>: <reason>.`; the report that was there stays. Resolves when the PR Check has been started or refused, not when it ends.
   */
  async start(number: number, items: readonly PullRequest[], lastReadWorked: boolean): Promise<void> {
    const refuse = (reason: string): void => this.ports.error(`Trama: could not check #${number}: ${reason}.`);
    const pr = items.find((item) => item.number === number);
    if (pr === undefined) return refuse("the pull request is not on the list");
    if (this.current !== null) return refuse("a PR Check is running");
    if (this.ports.runInProgress()) return refuse("a run is in progress");
    if (!lastReadWorked) return refuse("the last read of the pull requests failed");
    const project = this.ports.project();
    const storage = this.ports.storage();
    if (project === undefined) return refuse("the folder has no Trama project");
    if (storage === undefined) return refuse("the editor has no storage for this workspace");

    const running: Running = { number, pr, prepared: null, launchedAt: null, terminal: null, stopping: false, finished: false };
    this.current = running;
    this.ports.changed();
    let prepared: PreparedCheck;
    try {
      prepared = await prepareCheck(project, pr, { storage, skillsDir: this.ports.skillsDir(), writeSkills: (worktree) => this.ports.writeSkills(worktree) });
    } catch (error) {
      this.current = null;
      this.ports.changed();
      return refuse(reasonOf(error));
    }
    running.prepared = prepared;
    if (running.stopping) return void (await this.finish(running));
    running.launchedAt = Date.now();
    try {
      await this.ports.launch(prepared, { onStarted: (terminal) => void (running.terminal = terminal), onEnd: () => void this.finish(running) });
    } catch (error) {
      // The instruction did not leave: nothing is written and the worktree goes; the reason is the one error shown.
      running.stopping = true;
      await this.finish(running);
      return refuse(reasonOf(error));
    }
    // Stop was pressed while the instruction was leaving: the agent is stopped now that it has a terminal.
    if (running.stopping && running.terminal !== null && !running.finished && !this.ports.stop(running.terminal)) await this.finish(running);
  }

  /**
   * `developer.STOP_PULL_REQUEST_CHECK`: only on the pull request whose PR Check runs here. The terminal is closed, or the conversation ended, and the worktree removed; no report is written, no
   * message is shown and the previous report stays. During the preparation the PR Check stops as soon as the worktree stands.
   */
  async stop(number: number): Promise<void> {
    const running = this.current;
    if (running === null || running.number !== number || running.stopping) return;
    running.stopping = true;
    // Without a terminal yet the preparation or the launch is still going on: it ends as soon as it sees the Stop.
    if (running.terminal !== null && !this.ports.stop(running.terminal)) await this.finish(running);
  }

  /**
   * The job ended (or never started): in this order, the report is written when the agent delivered its scan, then the worktree is removed. A scan that did not finish writes nothing, leaves the previous
   * report and says so; a Stop says nothing.
   */
  private async finish(running: Running): Promise<void> {
    if (running.finished) return;
    running.finished = true;
    const { number, prepared } = running;
    const project = this.ports.project();
    if (prepared !== null && !running.stopping) {
      const worktree = projectAt(prepared.root);
      try {
        if (running.launchedAt !== null && scanDelivered(worktree, running.launchedAt)) {
          if (project !== undefined) writeReport(project, buildReport(prepared, running.pr, scanRows(worktree, prepared.variant, running.launchedAt)));
        } else this.ports.warning(`Trama: the PR Check of #${number} did not finish. The previous report, if any, is kept.`);
      } catch (error) {
        this.ports.error(`Trama: could not check #${number}: ${reasonOf(error)}.`);
      }
    }
    if (prepared !== null) await this.remove(prepared.place.top, prepared.folder, `#${number}`);
    this.current = null;
    this.ports.changed();
  }

  private async remove(top: string, folder: string, name: string): Promise<void> {
    const reason = await removeWorktree(top, folder);
    if (reason !== null) this.ports.error(`Trama: could not remove the worktree of ${name}: ${reasonOf(reason)}.`);
  }

  /**
   * At the opening of a window on the project: every folder under `pr-check/` of the storage that no running PR Check of this window uses is removed, with no report and no message
   * (a worktree that cannot be removed is an error). Nothing without a project in git or without storage.
   */
  async removeLeftovers(): Promise<void> {
    const project = this.ports.project();
    const storage = this.ports.storage();
    if (project === undefined || storage === undefined) return;
    const folders = leftoverFolders(storage, this.current === null ? [] : [this.current.number]);
    if (folders.length === 0) return;
    let top: string;
    try {
      top = (await placeOf(project.root)).top;
    } catch {
      return;
    }
    for (const folder of folders) await this.remove(top, folder, `#${basename(folder)}`);
  }

  /** The pull requests as the tab shows them: each with the report of its last PR Check in this working copy and whether it is outdated. */
  views(project: Project | undefined, items: readonly PullRequest[]): PullRequestView[] {
    const reports = project === undefined ? new Map() : readReports(project);
    return items.map((item) => {
      const report = reports.get(item.number);
      return { ...item, report: report === undefined ? null : { checkedAt: report.checkedAt, variant: report.variant, head: report.head.commit, mergeBase: report.mergeBase, outdated: isOutdated(report, item.headRefOid), rows: report.rows } };
    });
  }

  /** The `pullRequests` message for the tab, from what the last read found. */
  message(project: Project | undefined, read: { readAt: string | null; error: string | null; items: readonly PullRequest[] }): PullRequestsMessage {
    return { type: "pullRequests", readAt: read.readAt, error: read.error, items: this.views(project, read.items), running: this.running, blocked: this.blocked() };
  }
}
