import { existsSync, realpathSync } from "node:fs";
import { resolve, sep } from "node:path";
import { TramaError } from "../../../src/core/errors";
import { safeJoin } from "../../../src/core/store";

/**
 * Resolves a Markdown file the webview asked to open, relative to `base`.
 * Refuses absolute paths, anything that escapes `base` (also through symlinks) and non-`.md` files.
 */
export function resolveMarkdownFile(base: string, rel: string): string {
  if (rel === "" || rel.includes("\0")) throw new TramaError(`Invalid file path "${rel}"`);
  if (/^([a-zA-Z]:|[\\/])/.test(rel)) throw new TramaError(`Path "${rel}" must be relative`);
  const path = safeJoin(base, rel.replace(/\\/g, "/"));
  if (!path.endsWith(".md")) throw new TramaError(`"${rel}" is not a Markdown file`);
  if (existsSync(path) && !(realpathSync(path) + sep).startsWith(realpathSync(resolve(base)) + sep))
    throw new TramaError(`Path "${rel}" escapes ${base}`);
  return path;
}
