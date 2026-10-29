import * as vscode from "vscode";
import { ompTooOldText } from "../../../src/core/omp-version";
import { ompProgram, prepareOmpLaunch, type OmpUpdateOutcome } from "./omp-update";

export const OMP_MISSING_NOTICE = "Trama: omp is not installed. Trama runs every agent with omp.";
export const INSTALL_OMP_BUTTON = "Install omp";
export const OPEN_SETTINGS_BUTTON = "Open Settings";

/** The notice of a check or update that failed: omp runs as it was. `version` is the one that answered, when it is known. */
export const updateFailedNotice = (reason: string, version?: string): string =>
  `Trama: could not update omp (${reason}). The agent runs with omp ${version ?? "the installed version"}.`;

/** The omp program a launch runs, or undefined when there is none. The check and update that come first are part of it. */
export type OmpLauncher = (ompPath: string) => Promise<string | undefined>;

/** The outcomes whose failure was already told: one notice per update, however many launches joined it. */
const told = new WeakSet<OmpUpdateOutcome>();
/** Whether the progress notification of an update is showing in this window. */
let updating = false;

function showUpdating(version: string | undefined, until: Promise<unknown>): void {
  if (updating) return;
  updating = true;
  void Promise.resolve(vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: version === undefined ? "Updating omp…" : `Updating omp to ${version}…`, cancellable: false }, () => until.then(() => undefined, () => undefined))).finally(() => {
    updating = false;
  });
}

/** A notice that stops a launch: not modal, with the installer's terminal and the Settings tab as buttons. The work does not restart by itself. */
function noticeStopped(message: string): void {
  void Promise.resolve(vscode.window.showWarningMessage(message, INSTALL_OMP_BUTTON, OPEN_SETTINGS_BUTTON)).then((choice) => {
    if (choice === INSTALL_OMP_BUTTON) void vscode.commands.executeCommand("trama.installOmp");
    else if (choice === OPEN_SETTINGS_BUTTON) void vscode.commands.executeCommand("trama.openSettings");
  });
}

/**
 * What a launch of `program` does with omp (`prepareOmpLaunch`), behind the progress notification of an update: it waits for an update that the last check found, or that an
 * omp older than the minimum needs, and never for a check, which runs in the background and tells its failure once. The outcome says whether omp is missing, or older than the
 * minimum (or of a version that cannot be read) after the update that could be done.
 */
async function preparedOmp(program: string): Promise<OmpUpdateOutcome> {
  const settled = Promise.withResolvers<void>();
  try {
    return await prepareOmpLaunch(program, {
      updating: (version) => showUpdating(version, settled.promise),
      checkFailed: (reason, version) => void vscode.window.showInformationMessage(updateFailedNotice(reason, version)),
    });
  } finally {
    settled.resolve();
  }
}

/**
 * Before every launch of omp (a terminal, an omp Chat conversation, Ask more), before anything is created: finds the program for `ompPath`
 * (the user's `trama.ompPath`, trimmed) as the module keeps it, one search per window. With no program the missing-omp notice shows and the result is undefined:
 * the launch does not start. A newer version that the last check found, or an omp older than the minimum, is installed first, behind the progress notification; an omp older than
 * the minimum, or whose version cannot be read, that the update did not fix stops the launch the same way, with its own notice. Otherwise the launch goes at once and, when
 * the last check no longer holds, one runs in the background. A failed update does not stop a launch of an omp that is recent enough: the program of before is returned and
 * the failure is told once per update; a failed background check is told once per check.
 */
const realLauncher: OmpLauncher = async (ompPath) => {
  const program = await ompProgram(ompPath);
  if (program === undefined) {
    noticeStopped(OMP_MISSING_NOTICE);
    return undefined;
  }
  const outcome = await preparedOmp(program);
  if (outcome.missing === true) {
    noticeStopped(OMP_MISSING_NOTICE);
    return undefined;
  }
  if (outcome.tooOld === true) {
    noticeStopped(ompTooOldText(outcome.version));
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
