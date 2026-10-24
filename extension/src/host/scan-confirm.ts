import * as vscode from "vscode";

/**
 * The confirmation before the whole System is scanned: a modal dialog. Only «Scan» answers yes; Cancel, Esc and closing the dialog answer no.
 * The only whole-System scan entry, Scan System of the side menu, asks it first.
 */
export async function confirmScanSystem(): Promise<boolean> {
  const choice = await vscode.window.showWarningMessage(
    "Scan the whole System?",
    { modal: true, detail: "The agent compares every Machine with the code: this can take a long time." },
    "Scan",
  );
  return choice === "Scan";
}
