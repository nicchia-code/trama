import * as vscode from "vscode";
import { projectAt } from "../../../src/core/store";
import { listTasks } from "../../../src/core/work";
import { hasFollowedTerminals, runExecutionCheck } from "./agent";
import { hasJobs, onDriftResolutionChange } from "./drift-resolution";

/** The delay between two execution checks (`time.CHECK_DUE`); not a setting. */
export const CHECK_INTERVAL_MS = 60_000;

/** Whether the project at `root` has a Task taken by the agent (`agent` other than `false`). */
function hasTakenTask(root: string): boolean {
  try {
    return listTasks(projectAt(root)).some((task) => task.data.agent);
  } catch {
    // An unreadable board says nothing: no work is assumed.
    return false;
  }
}

/**
 * The window's scheduler of `time.CHECK_DUE`, the only one: a check runs once when the project opens (after the withdrawal
 * of the announcements left on disk, which the caller has done) and then every minute, but only while this window has a job
 * in its registry or the open project has a Task taken by the agent; at rest nothing is armed. One `setTimeout`, re-armed
 * after each finished check, so two checks never overlap; it does not keep the host process alive and is cancelled on dispose.
 * Armed again at the first registered job (the job registry tells) and at the first Task taken (the `.trama/tasks` watcher tells).
 */
export function startExecutionCheck(root: () => string | undefined, files: vscode.FileSystemWatcher): vscode.Disposable {
  let timer: NodeJS.Timeout | undefined;
  let running = false;
  let disposed = false;

  const pending = (): boolean => {
    const open = root();
    return hasJobs() || hasFollowedTerminals() || (open !== undefined && hasTakenTask(open));
  };

  const check = async (): Promise<void> => {
    if (running || disposed) return;
    running = true;
    try {
      await runExecutionCheck(root());
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

  const onTaskFile = (uri: vscode.Uri): void => {
    if (/[\\/]\.trama[\\/]tasks[\\/]/.test(uri.fsPath)) arm();
  };

  const subscriptions = [onDriftResolutionChange(arm), files.onDidCreate(onTaskFile), files.onDidChange(onTaskFile)];
  void check().finally(arm);

  return {
    dispose: () => {
      disposed = true;
      clearTimeout(timer);
      timer = undefined;
      for (const subscription of subscriptions) subscription.dispose();
    },
  };
}
