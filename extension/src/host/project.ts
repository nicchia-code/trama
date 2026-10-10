import { existsSync } from "node:fs";
import { join } from "node:path";
import * as vscode from "vscode";
import { run } from "../../../src/cli/main";
import { writeCursorHooks } from "../../../src/core/cursor-chat";
import { TramaError, UsageError } from "../../../src/core/errors";
import { TRAMA_DIR, type Project, projectAt } from "../../../src/core/store";
import { configuredSkillsDir } from "./agent";
import { bundledTrama, cursorHooksFile, isCursor } from "./cursor";

const COPILOT_HOOKS_FILE = "copilot-hooks.json";
const fileFolders = () => (vscode.workspace.workspaceFolders ?? []).filter((f) => f.uri.scheme === "file");

/** What every action other than initializing says in a workspace without `.trama/`. */
export const NO_PROJECT_WARNING = 'Trama: no .trama/ in this workspace. Run "Trama: Initialize Project" first.';

/** The project containing a file, or the first Trama workspace folder when no file is given. */
export function findProject(uri?: vscode.Uri): Project | undefined {
  const folders = uri ? [vscode.workspace.getWorkspaceFolder(uri)].filter((f): f is vscode.WorkspaceFolder => f !== undefined && f.uri.scheme === "file") : fileFolders();
  const folder = folders.find((f) => existsSync(join(f.uri.fsPath, TRAMA_DIR)));
  return folder && projectAt(folder.uri.fsPath);
}

/**
 * In Cursor, writes Trama's entries into the developer's own Cursor hooks file (never the project's), running the
 * trama program of this version. Without a program shipped for this platform there is no path to write.
 */
function installCursorHooks(): void {
  const program = bundledTrama();
  if (!isCursor() || !program) return;
  try {
    writeCursorHooks(cursorHooksFile(), program);
  } catch (err) {
    void vscode.window.showErrorMessage(`Trama: could not write Cursor's hooks: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/** Writes Copilot hooks to extension user storage and registers the file in user settings. */
export async function installCopilotHooks(storageUri: vscode.Uri): Promise<void> {
  if (isCursor()) return;
  const program = bundledTrama();
  if (!program) return;
  const file = vscode.Uri.joinPath(storageUri, COPILOT_HOOKS_FILE);
  const command = `"${program}" copilot-hook`;
  const contents = JSON.stringify({
    hooks: {
      UserPromptSubmit: [{ type: "command", command }],
      Stop: [{ type: "command", command }],
    },
  });
  const storagePath = storageUri.fsPath;
  try {
    await vscode.workspace.fs.createDirectory(storageUri);
    await vscode.workspace.fs.writeFile(file, Buffer.from(`${contents}\n`));
    const config = vscode.workspace.getConfiguration("chat");
    const existing = config.inspect<Record<string, boolean>>("hookFilesLocations")?.globalValue ?? {};
    await config.update("hookFilesLocations", { ...existing, [file.fsPath]: true }, vscode.ConfigurationTarget.Global);
  } catch (err) {
    void vscode.window.showErrorMessage(`Trama: could not install Copilot's hooks in ${storagePath}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/** Installs the hooks for the active editor. */
async function installEditorHooks(storageUri: vscode.Uri): Promise<void> {
  if (isCursor()) installCursorHooks();
  else await installCopilotHooks(storageUri);
}

/** Asks which workspace folder to initialize when there are several. */
async function pickFolder(): Promise<string | undefined> {
  const folders = fileFolders();
  if (folders.length === 0) {
    void vscode.window.showErrorMessage("Trama: open a folder first, then initialize it.");
    return undefined;
  }
  if (folders.length === 1) return (folders[0] as vscode.WorkspaceFolder).uri.fsPath;
  return (await vscode.window.showWorkspaceFolderPick({ placeHolder: "Folder to initialize as a Trama project" }))?.uri.fsPath;
}

/**
 * Runs `trama init` in a workspace folder. When it refuses to overwrite customised skill files, shows why
 * and retries with `--force` only after an explicit modal confirmation. Installs editor hooks after initialization.
 * Returns the new Project, if any.
 */
export async function initializeProject(storageUri?: vscode.Uri): Promise<Project | undefined> {
  const root = await pickFolder();
  if (root === undefined) return undefined;
  const skillsDir = configuredSkillsDir();
  for (let force = false; ; force = true) {
    try {
      run(["--root", root, "init", "--skills-dir", skillsDir, ...(force ? ["--force"] : [])], root);
      if (storageUri) await installEditorHooks(storageUri);
      return projectAt(root);
    } catch (err) {
      if (!(err instanceof TramaError || err instanceof UsageError)) throw err;
      if (force || !err.message.includes("--force")) {
        void vscode.window.showErrorMessage(`Trama: ${err.message}`);
        return undefined;
      }
      const choice = await vscode.window.showWarningMessage(
        "Trama did not initialize this project.",
        { modal: true, detail: err.message },
        "Overwrite and Initialize",
      );
      if (choice === undefined) return undefined;
    }
  }
}

/** Replaces the project's skills and rewrites the active editor's hooks for this version's program. */
export async function updateSkills(project: Project, storageUri?: vscode.Uri): Promise<void> {
  const skillsDir = configuredSkillsDir();
  const { out } = run(["--root", project.root, "skills", "update", "--skills-dir", skillsDir], project.root);
  const shown = ["Deleted ", "Created ", "Converted ", "Left ", "Requirement skills: ", "Switched ", "Installed omp", "Updated "];
  const report = out.split("\n").filter((line, i) => i === 0 || shown.some((start) => line.startsWith(start)));
  void vscode.window.showInformationMessage(`Trama: ${report.join(" ")}`);
  if (storageUri) await installEditorHooks(storageUri);
}
