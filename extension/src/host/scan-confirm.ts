import * as vscode from "vscode";

/**
 * The confirmation before the whole System is scanned: a modal dialog. Only «Scan» answers yes; Cancel, Esc and closing the dialog answer no.
 * Every whole-System scan entry asks it first (the side menu's Scan System, the Diagram's Scan, the command `Trama: Scan System`).
 */
export async function confirmScanSystem(): Promise<boolean> {
  const choice = await vscode.window.showWarningMessage(
    "Scan the whole System?",
    { modal: true, detail: "The agent compares every Machine with the code: this can take a long time." },
    "Scan",
  );
  return choice === "Scan";
}
