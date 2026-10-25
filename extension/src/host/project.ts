import { existsSync } from "node:fs";
import { join } from "node:path";
import * as vscode from "vscode";
import { run } from "../../../src/cli/main";
import { refreshProjectSkills } from "../../../src/cli/skill-refresh";
import { TramaError, UsageError } from "../../../src/core/errors";
import type { SoloKind } from "../../../src/core/solo-mode";
import { TRAMA_DIR, type Project, projectAt } from "../../../src/core/store";
import { configuredSkillsDir } from "./agent";

/** The workspace folders on disk. */
export const fileFolders = () => (vscode.workspace.workspaceFolders ?? []).filter((f) => f.uri.scheme === "file");

/** What every action other than setting a project up says in a workspace without `.trama/`. */
export const NO_PROJECT_WARNING = "Trama: this workspace has no .trama/ project. Open Trama to set it up.";

/** What the check when Trama opens says when it brought the skills in line with this version. */
const SKILLS_UPDATED = "Trama: updated the agent skills to this version.";

/** The project containing a file, or the first Trama workspace folder when no file is given. */
export function findProject(uri?: vscode.Uri): Project | undefined {
  const folders = uri ? [vscode.workspace.getWorkspaceFolder(uri)].filter((f): f is vscode.WorkspaceFolder => f !== undefined && f.uri.scheme === "file") : fileFolders();
  const folder = folders.find((f) => existsSync(join(f.uri.fsPath, TRAMA_DIR)));
  return folder && projectAt(folder.uri.fsPath);
}

/**
 * Runs `trama project new` in the workspace folder `root`, the one the developer chose in the setup wizard, with the same code and skills folder as
 * the command line (`trama.skillsDir`, as the wizard has just saved it) and, when the wizard chose it, `solo`: Solo mode is then written before any other file, and a failure
 * (no git repository, a failed write) fails the initialization with nothing created. When it refuses to overwrite customised skill files, shows why and retries
 * with `force: true` only after an explicit modal confirmation. Returns the new Project, or undefined
 * when nothing was created because the developer declined the overwrite. A folder that is already a project keeps its Model, Requirements and skills.
 */
export async function initializeProject(root: string, solo?: SoloKind): Promise<Project | undefined> {
  if (existsSync(join(root, TRAMA_DIR))) return projectAt(root);
  const skillsDir = configuredSkillsDir();
  for (let force = false; ; force = true) {
    try {
      run(["--root", root, "project", "new", "--input", JSON.stringify({ skillsDir, ...(solo === undefined ? {} : { solo }), ...(force ? { force: true } : {}) })], root);
      return projectAt(root);
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
  const { out } = run(["--root", project.root, "project", "edit", "--input", JSON.stringify({ skillsDir })], project.root);
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
    if (refreshProjectSkills(project, configuredSkillsDir(), false).updated) void vscode.window.showInformationMessage(SKILLS_UPDATED);
  } catch (err) {
    void vscode.window.showErrorMessage(`Trama: could not update the agent skills: ${err instanceof Error ? err.message : String(err)}.`);
  }
}
