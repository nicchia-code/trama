import * as vscode from "vscode";

/** Whether the editor running the extension is Cursor, whose agent panel the chat launcher cannot drive (the prompt goes to the clipboard instead). */
export const isCursor = (): boolean => vscode.env.appName.toLowerCase().includes("cursor");
