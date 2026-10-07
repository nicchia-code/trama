import * as vscode from "vscode";
import type { Classification } from "../../../src/core/question-channel";
import { askJev } from "./jev";

/** Where the Jev API key lives: only the editor's secret storage, never settings, files, terminals or logs. */
export const JEV_KEY_SECRET = "trama.system1.jev";

/** Asks for the Jev API key with hidden text and saves it; Esc or an empty value changes nothing. */
export async function setSystem1ApiKey(secrets: vscode.SecretStorage): Promise<void> {
  const key = (await vscode.window.showInputBox({ title: "Jev API key", password: true, ignoreFocusOut: true }))?.trim();
  if (key === undefined || key === "") return;
  await secrets.store(JEV_KEY_SECRET, key);
  void vscode.window.showInformationMessage("Trama: the Jev API key is saved.");
}

export async function clearSystem1ApiKey(secrets: vscode.SecretStorage): Promise<void> {
  await secrets.delete(JEV_KEY_SECRET);
  void vscode.window.showInformationMessage("Trama: the Jev API key is cleared.");
}

/**
 * Answers `trama classify`: `unavailable` unless `trama.system1` is `jev` and the key is saved, otherwise Jev's answer.
 * Only the state the agent prepared leaves the machine; the key never leaves the editor.
 */
export async function classifyMachine(secrets: vscode.SecretStorage, state: string): Promise<Classification> {
  if (vscode.workspace.getConfiguration("trama").get<string>("system1", "") !== "jev") return { answer: "unavailable" };
  const key = await secrets.get(JEV_KEY_SECRET);
  if (key === undefined || key === "") return { answer: "unavailable" };
  return askJev(key, state);
}
