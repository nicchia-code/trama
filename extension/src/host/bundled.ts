import { existsSync } from "node:fs";
import { join } from "node:path";
import * as vscode from "vscode";

/** Where the extension's package lives, when it is installed under its own identifier. */
const packagePath = (): string | undefined => vscode.extensions.getExtension("trama-dev.trama")?.extensionPath;

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
