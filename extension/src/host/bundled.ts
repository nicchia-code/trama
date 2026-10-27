import { existsSync } from "node:fs";
import { join } from "node:path";
import * as vscode from "vscode";

/** The identifier of this extension (`<publisher>.<name>` of its manifest), recorded at activation so that nothing writes the publisher by hand. */
let extensionId = "";

/** Records this extension's identifier; `activate` calls it first, with `context.extension.id`. */
export const setExtensionId = (id: string): void => {
  extensionId = id;
};

/** This extension as the editor knows it: its package folder and manifest. */
export const ownExtension = (): vscode.Extension<unknown> | undefined => vscode.extensions.getExtension(extensionId);

/** Where the extension's package lives. */
const packagePath = (): string | undefined => ownExtension()?.extensionPath;

/** A file the extension ships under `extensionPath`, or undefined when the package has none. */
function shipped(extensionPath: string | undefined, ...parts: string[]): string | undefined {
  if (extensionPath === undefined) return undefined;
  const file = join(extensionPath, ...parts);
  return existsSync(file) ? file : undefined;
}

/** The trama program shipped in this extension's package for this platform, or undefined when the package has none. */
export const bundledTrama = (extensionPath = packagePath()): string | undefined => shipped(extensionPath, "bin", process.platform === "win32" ? "trama.exe" : "trama");

/** The hook module omp loads with `--hook` in the terminals Trama starts, shipped in this extension's package; undefined when the package has none. */
export const bundledOmpHook = (extensionPath = packagePath()): string | undefined => shipped(extensionPath, "dist", "omp-hook.js");

/** The instructions of Unify Drifts, shipped in this extension's package (`media/unify-drifts.md`); undefined when the package has none. */
export const bundledUnifyInstructions = (extensionPath = packagePath()): string | undefined => shipped(extensionPath, "media", "unify-drifts.md");

/** The fixed instructions of Ask more, shipped in this extension's package (`media/ask-more.md`); undefined when the package has none. */
export const bundledAskMoreInstructions = (extensionPath = packagePath()): string | undefined => shipped(extensionPath, "media", "ask-more.md");

/** The fixed instructions of General, shipped in this extension's package (`media/general.md`); undefined when the package has none. */
export const bundledGeneralInstructions = (extensionPath = packagePath()): string | undefined => shipped(extensionPath, "media", "general.md");
