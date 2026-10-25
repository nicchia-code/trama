import * as vscode from "vscode";
import { listAnnouncements } from "../../../src/core/announcements";
import { publishingIssues } from "../../../src/core/issues";
import { projectAt } from "../../../src/core/store";
import { listTasks } from "../../../src/core/work";
import { hasTerminalWork, runExecutionCheck } from "./agent";
import { onDriftResolutionChange } from "./drift-resolution";
import { followsHolder } from "./followed-holders";

/** The delay between two execution checks (`time.CHECK_DUE`); not a setting. */
export const CHECK_INTERVAL_MS = 60_000;

/** Whether the project at `root` has a Task taken by the agent (`agent` other than `false`) or an issue being published. */
function hasTakenTask(root: string): boolean {
  try {
    return listTasks(projectAt(root)).some((task) => task.data.agent) || publishingIssues(projectAt(root)).length > 0;
  } catch {
    // An unreadable board says nothing: no work is assumed.
    return false;
  }
}

/** Whether the project at `root` has an announcement owned by no terminal or conversation of this window: one of no terminal at all, or of one this window does not follow. */
function hasForeignAnnouncement(root: string): boolean {
  try {
    return listAnnouncements(projectAt(root)).some((announcement) => announcement.terminal === null || !followsHolder(announcement.terminal));
  } catch {
    // Unreadable announcements say nothing: no work is assumed.
    return false;
  }
}

/**
 * The window's scheduler of `time.CHECK_DUE`, the only one: a check runs once when the project opens (after `after`, the withdrawal
 * of the orphan announcements left on disk, when the caller has one) and then every minute, but only while this window has a job
 * running in a terminal, the open project has a Task taken by the agent, or it has an announcement no terminal or conversation of this window owns. The omp Chat
 * conversations of the window neither arm the timer nor are checked: their end is certain. At rest nothing is armed. One `setTimeout`, re-armed
 * after each finished check, so two checks never overlap; it does not keep the host process alive and is cancelled on dispose.
 * Armed again at the first job in a terminal (the job registry tells), at the first Task taken and at the first announcement of another's (the `.trama/tasks` and
 * `.trama/announcements` watcher tells). `onCheck`, when given, is called after each check (the remembered merge of Solo mode is looked at then).
 */
export function startExecutionCheck(root: () => string | undefined, files: vscode.FileSystemWatcher, after?: Promise<unknown>, onCheck?: () => void): vscode.Disposable {
  let timer: NodeJS.Timeout | undefined;
  let running = false;
  let disposed = false;

  const pending = (): boolean => {
    const open = root();
    return hasTerminalWork() || (open !== undefined && (hasTakenTask(open) || hasForeignAnnouncement(open)));
  };

  const check = async (): Promise<void> => {
    if (running || disposed) return;
    running = true;
    try {
      await runExecutionCheck(root());
      onCheck?.();
    } catch {
      // A failed check changes nothing; the next turn tries again.
    } finally {
      running = false;
    }
  };

  const arm = (): void => {
    if (disposed) return;
    if (!pending()) {
      clearTimeout(timer);
      timer = undefined;
      return;
    }
    if (timer !== undefined) return;
    timer = setTimeout(() => {
      timer = undefined;
      void check().finally(arm);
    }, CHECK_INTERVAL_MS);
    timer.unref?.();
  };

  const onWorkFile = (uri: vscode.Uri): void => {
    if (/[\\/]\.trama[\\/](tasks|announcements|issues)[\\/]/.test(uri.fsPath)) arm();
  };

  const subscriptions = [onDriftResolutionChange(arm), files.onDidCreate(onWorkFile), files.onDidChange(onWorkFile)];
  void (after === undefined ? check() : after.then(check, check)).finally(arm);

  return {
    dispose: () => {
      disposed = true;
      clearTimeout(timer);
      timer = undefined;
      for (const subscription of subscriptions) subscription.dispose();
    },
  };
}
