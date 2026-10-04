import { existsSync } from "node:fs";
import { join } from "node:path";
import * as vscode from "vscode";
import { run } from "../../../src/cli/main";
import { TramaError, UsageError } from "../../../src/core/errors";
import { TRAMA_DIR, type Project, projectAt } from "../../../src/core/store";
import { configuredSkillsDir } from "./agent";

const fileFolders = () => (vscode.workspace.workspaceFolders ?? []).filter((f) => f.uri.scheme === "file");

/** The first workspace folder that contains `.trama/`. */
export function findProject(): Project | undefined {
  const folder = fileFolders().find((f) => existsSync(join(f.uri.fsPath, TRAMA_DIR)));
  return folder && projectAt(folder.uri.fsPath);
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
 * and retries with `--force` only after an explicit modal confirmation. Returns the new Project, if any.
 */
export async function initializeProject(): Promise<Project | undefined> {
  const root = await pickFolder();
  if (root === undefined) return undefined;
  const skillsDir = configuredSkillsDir();
  for (let force = false; ; force = true) {
    try {
      run(["--root", root, "init", "--skills-dir", skillsDir, ...(force ? ["--force"] : [])], root);
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
        "Overwrite Skills and Initialize",
      );
      if (choice === undefined) return undefined;
    }
  }
}

/** Replaces the project's agent skills with the ones shipped in this version of Trama, and says what changed. */
export function updateSkills(project: Project): void {
  const skillsDir = configuredSkillsDir();
  const { out } = run(["--root", project.root, "skills", "update", "--skills-dir", skillsDir], project.root);
  const report = out.split("\n").filter((line, i) => i === 0 || line.startsWith("Deleted "));
  void vscode.window.showInformationMessage(`Trama: ${report.join(" ")}`);
}
