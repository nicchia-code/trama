import * as vscode from "vscode";

/** Whether the editor running the extension is Cursor, whose agent reads MCP servers from `.cursor/mcp.json`. */
export const isCursor = (): boolean => vscode.env.appName.toLowerCase().includes("cursor");
