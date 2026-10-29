import { timerWork } from "./performance";
import * as vscode from "vscode";
import { workOfPicture, type WorkFacts } from "../../../src/core/work-facts";
import { hasTerminalWork, runExecutionCheck } from "./agent";
import { onFileWritten } from "../../../src/core/written";
import { onDriftResolutionChange } from "./drift-resolution";
import { followsHolder } from "./followed-holders";
import type { PictureOutcome, WindowPicture } from "./picture";

/** The delay between two execution checks (`time.CHECK_DUE`); not a setting. */
export const CHECK_INTERVAL_MS = 60_000;

/** What the arming of the timer needs of a picture: whether the project has a Task taken by the agent or an issue being published, and the terminal of each announcement. */
interface ProjectWork {
  root: string;
  takenOrPublishing: boolean;
  announcedBy: readonly (string | null)[];
}

/** The work a picture shows; none for a project that is not there or a picture that could not be built (an unreadable board says nothing: no work is assumed). */
function projectWork(outcome: PictureOutcome | undefined): ProjectWork | undefined {
  if (outcome?.kind !== "built") return undefined;
  const work = workOfPicture(outcome.picture);
  return { root: outcome.project.root, takenOrPublishing: work.taken.length > 0 || work.publishing.length > 0, announcedBy: work.announcements.map((announcement) => announcement.terminal) };
}

/**
 * The window's scheduler of `time.CHECK_DUE`, the only one: a check runs once when the project opens (after `after`, the withdrawal
 * of the orphan announcements left on disk, when the caller has one) and then every minute, but only while this window has a job
 * running in a terminal, the open project has a Task taken by the agent, or it has an announcement no terminal or conversation of this window owns. The omp Chat
 * conversations of the window neither arm the timer nor are checked: their end is certain. At rest nothing is armed. One `setTimeout`, re-armed
 * after each finished check, so two checks never overlap; it does not keep the host process alive and is cancelled on dispose.
 * Armed again at the first job in a terminal (the job registry tells) and, for Tasks taken and announcements of another's, when a new picture of the project arrives
 * (`quality#panel`): the decision is made on the picture in memory, and a raw event of the watcher of `.trama/` reads no Task, issue or announcement. The check
 * itself takes the Tasks, announcements and issues from the same picture. `onCheck`, when given, is called after each check (the remembered merge of Solo mode is looked at then).
 */
export function startExecutionCheck(root: () => string | undefined, picture: WindowPicture, after?: Promise<unknown>, onCheck?: () => void): vscode.Disposable {
  let timer: NodeJS.Timeout | undefined;
  let running = false;
  /** Whether the running check wrote or removed a file under `.trama/`. */
  let wrote = false;
  let disposed = false;
  /** The work the last picture showed; the picture that has not been built yet shows none, and the first one builds the timer. */
  let shown: ProjectWork | undefined = projectWork(picture.peek());

  const pending = (): boolean => {
    if (hasTerminalWork()) return true;
    const open = root();
    if (open === undefined || shown === undefined || shown.root !== open) return false;
    return shown.takenOrPublishing || shown.announcedBy.some((terminal) => terminal === null || !followsHolder(terminal));
  };

  /** The facts of the check for `project`, from the picture in memory; none for a project the window has no picture of. A picture `latest` had to build tells nobody, so the arming learns of it here. */
  const workOf = (project: string): WorkFacts | undefined => {
    const outcome = picture.latest();
    shown = projectWork(outcome);
    return outcome.kind === "built" && outcome.project.root === project ? workOfPicture(outcome.picture) : undefined;
  };

  const check = async (): Promise<void> => {
    if (running || disposed) return;
    running = true;
    wrote = false;
    try {
      await runExecutionCheck(root(), workOf);
      // A check that released a Task or withdrew an announcement changed the files the picture in memory was built from: the picture is built again at once, so the timer is armed
      // on what is left and the panel shows the release without waiting for the watcher (whose events for these writes then ask for nothing).
      if (wrote) picture.build("requested");
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
      void timerWork("execution check", () => check()).finally(arm);
    }, CHECK_INTERVAL_MS);
    timer.unref?.();
  };

  const subscriptions = [
    onFileWritten((_kind, path) => {
      if (running && /[\\/]\.trama[\\/]/.test(path)) wrote = true;
    }),
    onDriftResolutionChange(arm),
    picture.onDidBuild((outcome) => {
      shown = projectWork(outcome);
      arm();
    }),
  ];
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
