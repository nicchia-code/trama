import { execFile } from "node:child_process";
import { processStarted } from "../../../src/core/performance";
import { isAbsolute, relative, resolve } from "node:path";
import type { FolderEntry } from "../protocol";

/** What `vscode.FileType` adds to a type for a link: a link is listed as a file and never followed. */
const SYMBOLIC_LINK = 64;
const DIRECTORY = 2;

/** One line of `vscode.workspace.fs.readDirectory`: the name and the `FileType` bits. */
export type RawEntry = readonly [name: string, type: number];

/** Whether `path` names something inside a folder: relative, with `/`, no empty or `.`/`..` part and nothing that could break a quoted instruction. The empty path is the folder itself and is allowed only where the caller says so. */
export function isSafeRelativePath(path: string): boolean {
  if (path === "" || path.length > 1000 || /[`\\\0\r\n]/.test(path) || path.startsWith("/") || /^[A-Za-z]:/.test(path)) return false;
  return path.split("/").every((part) => part !== "" && part !== "." && part !== "..");
}

/** The folder of `path` inside `root`, or undefined when `path` leaves it. The empty path is `root`. */
export function folderInside(root: string, path: string): string | undefined {
  if (path !== "" && !isSafeRelativePath(path)) return undefined;
  const target = resolve(root, ...path.split("/"));
  const outside = relative(root, target);
  return outside.startsWith("..") || isAbsolute(outside) ? undefined : target;
}

/** The entries the wizard shows for a folder: no name with a dot, folders first and then files, each alphabetical. A link counts as a file. */
export function listedEntries(raw: readonly RawEntry[], hasChildren: (name: string) => boolean): FolderEntry[] {
  const entries: FolderEntry[] = [];
  for (const [name, type] of raw) {
    if (name.startsWith(".")) continue;
    const folder = (type & DIRECTORY) !== 0 && (type & SYMBOLIC_LINK) === 0;
    entries.push({ name, kind: folder ? "folder" : "file", hasChildren: folder && hasChildren(name) });
  }
  return entries.sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === "folder" ? -1 : 1));
}

/**
 * The paths of `paths` (relative to `cwd`, a folder of a git repository, `/`-separated; a folder ends with `/`) that git ignores, by `git check-ignore --stdin -z`
 * run without a shell. When git is missing, `cwd` is no repository or the command fails, nothing is ignored.
 */
export function gitIgnored(cwd: string, paths: readonly string[], timeoutMs = 10_000): Promise<Set<string>> {
  const { promise, resolve: done } = Promise.withResolvers<Set<string>>();
  if (paths.length === 0) {
    done(new Set());
    return promise;
  }
  const ended = processStarted("git");
  const child = execFile("git", ["check-ignore", "--stdin", "-z"], { cwd, timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024, encoding: "utf8" }, (_error, stdout) => {
    ended();
    // Exit 1 means nothing is ignored, and any other failure means git cannot tell: both leave every entry in.
    done(new Set(typeof stdout === "string" ? stdout.split("\0").filter((p) => p !== "") : []));
  });
  child.stdin?.on("error", () => undefined);
  child.stdin?.end(paths.map((p) => `${p}\0`).join(""));
  return promise;
}

/**
 * The entries of the folder `path` of `root` for the tree: names with a dot and entries git ignores for `root` are left out. `read` lists a folder
 * by its path inside `root` (relative, `""` for `root`); `ignored` gives the ignored ones among the paths it is asked about.
 */
export async function folderChildren(
  path: string,
  read: (path: string) => Promise<readonly RawEntry[]>,
  ignored: (paths: readonly string[]) => Promise<Set<string>>,
): Promise<FolderEntry[]> {
  const raw = await read(path);
  const at = (name: string) => (path === "" ? name : `${path}/${name}`);
  const visible = raw.filter(([name]) => !name.startsWith("."));
  const folders = visible.filter(([, type]) => (type & DIRECTORY) !== 0 && (type & SYMBOLIC_LINK) === 0);
  const asked = visible.map(([name, type]) => (folders.some(([n]) => n === name) ? `${at(name)}/` : at(name)));
  const skipped = await ignored(asked);
  const kept = visible.filter(([name], index) => !skipped.has(asked[index] as string));
  const inside = new Set<string>();
  await Promise.all(
    folders
      .filter(([name]) => kept.some(([n]) => n === name))
      .map(async ([name]) => {
        try {
          if ((await read(at(name))).some(([child]) => !child.startsWith("."))) inside.add(name);
        } catch {
          // A folder that cannot be read shows as empty.
        }
      }),
  );
  return listedEntries(kept, (name) => inside.has(name));
}
