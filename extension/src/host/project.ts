import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import * as vscode from "vscode";
import { run } from "../../../src/cli/main";
import { skillsReportLines } from "../../../src/cli/commands/project";
import { refreshProjectSkillsAsync } from "../../../src/cli/skill-refresh";
import { TramaError, UsageError } from "../../../src/core/errors";
import { gitPlaceAsync, SOLO_NEEDS_GIT, type SoloKind, setSoloModeAsync } from "../../../src/core/solo-mode";
import { TRAMA_DIR, type Project, projectAt } from "../../../src/core/store";
import { configuredSkillsDir } from "./agent";

/** The workspace folders on disk. */
export const fileFolders = () => (vscode.workspace.workspaceFolders ?? []).filter((f) => f.uri.scheme === "file");

/** What every action other than setting a project up says in a workspace without `.trama/`. */
export const NO_PROJECT_WARNING = "Trama: this workspace has no .trama/ project. Open Trama to set it up.";

/** What the check when Trama opens says when it brought the skills in line with this version. */
const SKILLS_UPDATED = "Trama: updated the agent skills to this version.";

/**
 * Whether each workspace folder has a `.trama/`, as `trackProjects` keeps it: read from the disk once per folder, then forgotten only when the watcher of
 * `.trama` or the workspace folders report a change. Without `trackProjects` nothing is kept, and every call reads the disk.
 */
const known = new Map<string, boolean>();
let tracked = false;
const listeners = new Set<() => void>();

function hasProject(root: string): boolean {
  if (!tracked) return existsSync(join(root, TRAMA_DIR));
  let found = known.get(root);
  if (found === undefined) {
    found = existsSync(join(root, TRAMA_DIR));
    known.set(root, found);
  }
  return found;
}

/** Calls `listener` after the window's project may have changed (a `.trama` created or deleted, a workspace folder added or removed), when the cache is already up to date. */
export function onProjectsChanged(listener: () => void): vscode.Disposable {
  listeners.add(listener);
  return { dispose: () => void listeners.delete(listener) };
}

/**
 * Keeps which folders hold a project in memory for the window's whole life: one watcher of `.trama` (a deleted folder reports no event for its children) and the
 * workspace folders. `findProject` then reads no file of `.trama/`.
 */
export function trackProjects(): vscode.Disposable {
  tracked = true;
  const watcher = vscode.workspace.createFileSystemWatcher("**/.trama");
  const changed = () => {
    known.clear();
    for (const listener of [...listeners]) listener();
  };
  const subscriptions = [watcher, watcher.onDidCreate(changed), watcher.onDidDelete(changed), vscode.workspace.onDidChangeWorkspaceFolders(changed)];
  return {
    dispose: () => {
      for (const subscription of subscriptions) subscription.dispose();
      tracked = false;
      known.clear();
      listeners.clear();
    },
  };
}

/** The project containing a file, or the first Trama workspace folder when no file is given. */
export function findProject(uri?: vscode.Uri): Project | undefined {
  const folders = uri ? [vscode.workspace.getWorkspaceFolder(uri)].filter((f): f is vscode.WorkspaceFolder => f !== undefined && f.uri.scheme === "file") : fileFolders();
  const folder = folders.find((f) => hasProject(f.uri.fsPath));
  return folder && projectAt(folder.uri.fsPath);
}

/** What initializing a folder gives: the project and, when Manager mode was asked for and could not be written, why (the project is created either way). */
export interface Initialized {
  project: Project;
  managerError: string | null;
}

/**
 * Runs `trama project new` in the workspace folder `root`, the one the developer chose in the setup wizard, with the same code and skills folder as
 * the command line (`trama.skillsDir`, as the wizard has just saved it) and, when the wizard chose them, `solo` and `manager`. With Solo mode chosen, a folder in no git repository fails the initialization
 * before anything is created, and the block of exclusions is written right after the command, asynchronously (a failed write removes `.trama/` again); Manager mode is written after the project's files, and a failure leaves the project created and
 * comes back as `managerError`. When it refuses to overwrite customised skill files, shows why and retries
 * with `force: true` only after an explicit modal confirmation. Returns the new project, or undefined
 * when nothing was created because the developer declined the overwrite. A folder that is already a project keeps its Model, Requirements and skills.
 */
export async function initializeProject(root: string, options: { solo?: SoloKind; manager?: boolean } = {}): Promise<Initialized | undefined> {
  if (existsSync(join(root, TRAMA_DIR))) return { project: projectAt(root), managerError: null };
  const skillsDir = configuredSkillsDir();
  const { solo, manager } = options;
  // Solo mode needs git: refused before anything is created, as `trama project new` does. git is asked without holding the host, so Solo mode is written here, right after the command, and not by the command.
  const soloKind = solo === undefined || solo === "off" ? undefined : solo;
  if (soloKind !== undefined && (await gitPlaceAsync(root)) === null) throw new Error(SOLO_NEEDS_GIT);
  for (let force = false; ; force = true) {
    try {
      const { out } = run(["--root", root, "--json", "project", "new", "--input", JSON.stringify({ skillsDir, ...(manager === true ? { manager } : {}), ...(force ? { force: true } : {}) })], root);
      const result: unknown = JSON.parse(out);
      const managerError = typeof result === "object" && result !== null && "managerError" in result && typeof result.managerError === "string" ? result.managerError : null;
      known.delete(root); // The watcher reports the new `.trama` a moment later; the next lookup must not wait for it.
      const project = projectAt(root);
      if (soloKind !== undefined) {
        try {
          await setSoloModeAsync(project, soloKind, skillsDir);
        } catch (error) {
          rmSync(project.dir, { recursive: true, force: true });
          known.delete(root);
          throw new Error(error instanceof Error ? error.message : String(error));
        }
      }
      return { project, managerError };
    } catch (err) {
      if (!(err instanceof TramaError || err instanceof UsageError)) throw err;
      if (force || !err.message.includes('"force": true')) {
        throw new Error(err.message);
      }
      const answer = await vscode.window.showWarningMessage(
        "Trama did not initialize this project.",
        { modal: true, detail: err.message },
        "Overwrite and Initialize",
      );
      if (answer === undefined) return undefined;
    }
  }
}

/** Replaces the project's skills. */
export async function updateSkills(project: Project): Promise<void> {
  const skillsDir = configuredSkillsDir();
  const refreshed = await refreshProjectSkillsAsync(project, skillsDir, true);
  const out = skillsReportLines(project, refreshed).filter(Boolean).join("\n");
  const shown = ["Deleted ", "Created ", "Converted ", "Left ", "Requirement skills: ", "Switched ", "Installed omp", "Updated ", "The trama-specs skill was not updated"];
  const report = out.split("\n").filter((line, i) => i === 0 || shown.some((start) => line.startsWith(start)));
  void vscode.window.showInformationMessage(`Trama: ${report.join(" ")}`);
}

/**
 * The check when Trama opens: the same steps as Update skills on the same files, without moving single-file Areas to
 * Area folders or creating the starting Areas. A file is written only when its content differs. Says so only when it
 * wrote or deleted something; a failure is shown, and the next opening checks again.
 */
export async function checkSkills(project: Project): Promise<void> {
  try {
    if ((await refreshProjectSkillsAsync(project, configuredSkillsDir(), false)).updated) void vscode.window.showInformationMessage(SKILLS_UPDATED);
  } catch (err) {
    void vscode.window.showErrorMessage(`Trama: could not update the agent skills: ${err instanceof Error ? err.message : String(err)}.`);
  }
}
