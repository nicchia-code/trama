import * as vscode from "vscode";
import { ensureOmpUpdated, findOmp, type OmpUpdateOutcome } from "./omp-update";

export const OMP_MISSING_NOTICE = "Trama: omp is not installed. Trama runs every agent with omp.";
export const INSTALL_OMP_BUTTON = "Install omp";
export const OPEN_SETTINGS_BUTTON = "Open Settings";

/** The notice of a check or update that failed: omp runs as it was. `version` is the one that answered, when it is known. */
export const updateFailedNotice = (reason: string, version?: string): string =>
  `Trama: could not update omp (${reason}). The agent runs with omp ${version ?? "the installed version"}.`;

/** The omp program a launch runs, or undefined when there is none. The check and update that come first are part of it. */
export type OmpLauncher = (ompPath: string) => Promise<string | undefined>;

/** The outcomes whose failure was already told: one notice per check, however many launches joined it. */
const told = new WeakSet<OmpUpdateOutcome>();
/** Whether the progress notification of an update is showing in this window. */
let updating = false;

function showUpdating(version: string, until: Promise<unknown>): void {
  if (updating) return;
  updating = true;
  void Promise.resolve(vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: `Updating omp to ${version}…`, cancellable: false }, () => until.then(() => undefined, () => undefined))).finally(() => {
    updating = false;
  });
}

/** The missing-omp notice: not modal, with the installer's terminal and the Settings tab as buttons. The work does not restart by itself. */
function noticeMissing(): void {
  void Promise.resolve(vscode.window.showWarningMessage(OMP_MISSING_NOTICE, INSTALL_OMP_BUTTON, OPEN_SETTINGS_BUTTON)).then((choice) => {
    if (choice === INSTALL_OMP_BUTTON) void vscode.commands.executeCommand("trama.installOmp");
    else if (choice === OPEN_SETTINGS_BUTTON) void vscode.commands.executeCommand("trama.openSettings");
  });
}

/**
 * Before every launch of omp (a terminal, an omp Chat conversation, Quick Task, Ask more), before anything is created: finds the program for `ompPath`
 * (the user's `trama.ompPath`, trimmed), checks for a newer version and updates it. With no program the missing-omp notice shows and the result is undefined:
 * the launch does not start. A failed check or update does not stop it: the program of before is returned and the failure is told once per check.
 */
const realLauncher: OmpLauncher = async (ompPath) => {
  const program = await findOmp(ompPath);
  if (program === undefined) {
    noticeMissing();
    return undefined;
  }
  let outcome: OmpUpdateOutcome;
  const settled = Promise.withResolvers<void>();
  try {
    const running = ensureOmpUpdated(program, (version) => showUpdating(version, settled.promise));
    outcome = await running;
  } finally {
    settled.resolve();
  }
  if (outcome.missing === true) {
    noticeMissing();
    return undefined;
  }
  if (outcome.updateError !== undefined && !told.has(outcome)) {
    told.add(outcome);
    void vscode.window.showInformationMessage(updateFailedNotice(outcome.updateError, outcome.version));
  }
  return program;
};

let launcher: OmpLauncher = realLauncher;

/** The program the launch runs: `ompPath` as the launches read it (the user setting, trimmed), or undefined when omp is missing and the launch must not start. */
export const ompBeforeLaunch: OmpLauncher = (ompPath) => launcher(ompPath);

/** Replaces the check before a launch (tests of the launches that must not run omp); no argument restores it. */
export function setOmpLauncher(next?: OmpLauncher): void {
  launcher = next ?? realLauncher;
}
