import { existsSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import * as vscode from "vscode";
import { run } from "../../../src/cli/main";
import { refreshProjectSkills } from "../../../src/cli/skill-refresh";
import { TramaError, UsageError } from "../../../src/core/errors";
import { TRAMA_DIR, type Project, projectAt } from "../../../src/core/store";
import { configuredSkillsDir } from "./agent";

const COPILOT_HOOKS_FILE = "copilot-hooks.json";
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
 * Removes what earlier versions installed for Copilot's chat and returns what it took out: the user definition of
 * trama-analysis and the hooks file in the extension's global storage with only its entry in
 * `chat.hookFilesLocations` (other entries stay; an absent entry leaves the setting alone). Works in every editor.
 */
export async function removeCopilotPieces(storageUri?: vscode.Uri): Promise<string[]> {
  const removed: string[] = [];
  const agent = join(homedir(), ".copilot", "agents", "trama-analysis.agent.md");
  if (existsSync(agent)) {
    rmSync(agent);
    removed.push(`Copilot's sub-agent definition ${agent}`);
  }
  if (!storageUri) return removed;
  const file = join(storageUri.fsPath, COPILOT_HOOKS_FILE);
  if (existsSync(file)) {
    rmSync(file);
    removed.push(`Copilot's hooks file ${file}`);
  }
  const config = vscode.workspace.getConfiguration("chat");
  const existing = config.inspect<Record<string, boolean>>("hookFilesLocations")?.globalValue;
  if (existing && Object.hasOwn(existing, file)) {
    const { [file]: _entry, ...others } = existing;
    await config.update("hookFilesLocations", others, vscode.ConfigurationTarget.Global);
    removed.push(`the Copilot hooks entry ${file} from chat.hookFilesLocations`);
  }
  return removed;
}

/**
 * Runs `trama project new` in the workspace folder `root`, the one the developer chose in the setup wizard, with the same code and skills folder as
 * the command line (`trama.skillsDir`, as the wizard has just saved it). When it refuses to overwrite customised skill files, shows why and retries
 * with `force: true` only after an explicit modal confirmation. Returns the new Project, or undefined
 * when nothing was created because the developer declined the overwrite. A folder that is already a project keeps its Model, Requirements and skills.
 */
export async function initializeProject(root: string): Promise<Project | undefined> {
  if (existsSync(join(root, TRAMA_DIR))) return projectAt(root);
  const skillsDir = configuredSkillsDir();
  for (let force = false; ; force = true) {
    try {
      run(["--root", root, "project", "new", "--input", JSON.stringify({ skillsDir, ...(force ? { force: true } : {}) })], root);
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

/** Replaces the project's skills and removes what earlier versions installed for Copilot. */
export async function updateSkills(project: Project, storageUri?: vscode.Uri): Promise<void> {
  const skillsDir = configuredSkillsDir();
  const { out } = run(["--root", project.root, "project", "edit", "--input", JSON.stringify({ skillsDir })], project.root);
  const shown = ["Deleted ", "Created ", "Converted ", "Left ", "Requirement skills: ", "Switched ", "Installed omp", "Updated ", "The trama-specs skill was not updated"];
  const report = out.split("\n").filter((line, i) => i === 0 || shown.some((start) => line.startsWith(start)));
  for (const piece of await removeCopilotPieces(storageUri)) report.push(`Removed ${piece}.`);
  void vscode.window.showInformationMessage(`Trama: ${report.join(" ")}`);
}

/**
 * The check when Trama opens: the same steps as Update skills on the same files, without moving single-file Areas to
 * Area folders or creating the starting Areas. A file is written only when its content differs. Says so only when it
 * wrote or deleted something (a Copilot piece removed counts); a failure is shown, and the next opening checks again.
 */
export async function checkSkills(project: Project, storageUri?: vscode.Uri): Promise<void> {
  try {
    const refresh = refreshProjectSkills(project, configuredSkillsDir(), false);
    const removed = await removeCopilotPieces(storageUri);
    if (refresh.updated || removed.length > 0) void vscode.window.showInformationMessage(SKILLS_UPDATED);
  } catch (err) {
    void vscode.window.showErrorMessage(`Trama: could not update the agent skills: ${err instanceof Error ? err.message : String(err)}.`);
  }
}
