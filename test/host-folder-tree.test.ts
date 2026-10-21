import { expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { folderChildren, folderInside, gitIgnored, isSafeRelativePath, listedEntries, type RawEntry } from "../extension/src/host/folder-tree";

const FILE = 1;
const DIR = 2;
const LINK = 64;

test("a path is safe when it stays inside the folder and cannot break a quoted instruction", () => {
  for (const path of ["a", "a/b", "src/core/x.ts", "with space/x"]) expect(isSafeRelativePath(path)).toBe(true);
  for (const path of ["", "/a", "../a", "a/../b", "a/./b", "a//b", "a/", "C:/a", "a\\b", "a`b", "a\nb"]) expect(isSafeRelativePath(path)).toBe(false);
});

test("a folder outside the root is refused", () => {
  const root = resolve("/work/app");
  expect(folderInside(root, "")).toBe(root);
  expect(folderInside(root, "src/core")).toBe(join(root, "src", "core"));
  expect(folderInside(root, "../other")).toBeUndefined();
  expect(folderInside(root, "/etc")).toBeUndefined();
});

test("the tree lists folders first, then files, without the names that start with a dot; a link counts as a file and is not followed", () => {
  const raw: RawEntry[] = [["zeta.md", FILE], [".git", DIR], ["src", DIR], ["alpha", DIR], [".env", FILE], ["link", DIR | LINK], ["a.txt", FILE]];
  expect(listedEntries(raw, (name) => name === "src")).toEqual([
    { name: "alpha", kind: "folder", hasChildren: false },
    { name: "src", kind: "folder", hasChildren: true },
    { name: "a.txt", kind: "file", hasChildren: false },
    { name: "link", kind: "file", hasChildren: false },
    { name: "zeta.md", kind: "file", hasChildren: false },
  ]);
});

test("folderChildren drops what is ignored, asks about folders with a trailing slash, and says which folders hold something visible", async () => {
  const folders: Record<string, RawEntry[]> = {
    "": [["build", DIR], ["src", DIR], ["empty", DIR], ["onlydot", DIR], ["notes.log", FILE], [".git", DIR]],
    src: [["a.ts", FILE]],
    empty: [],
    onlydot: [[".keep", FILE]],
    build: [["out.js", FILE]],
  };
  const asked: string[][] = [];
  const entries = await folderChildren(
    "",
    async (path) => folders[path] ?? [],
    async (paths) => {
      asked.push([...paths]);
      return new Set(["build/", "notes.log"]);
    },
  );
  expect(asked).toEqual([["build/", "src/", "empty/", "onlydot/", "notes.log"]]);
  expect(entries).toEqual([
    { name: "empty", kind: "folder", hasChildren: false },
    { name: "onlydot", kind: "folder", hasChildren: false },
    { name: "src", kind: "folder", hasChildren: true },
  ]);
  const nested = await folderChildren("src", async (path) => (path === "src" ? [["lib", DIR], ["x.ts", FILE]] : [["y.ts", FILE]]), async (paths) => new Set(paths.filter((p) => p === "src/x.ts")));
  expect(nested).toEqual([{ name: "lib", kind: "folder", hasChildren: true }]);
});

test("git check-ignore names the ignored entries of a repository, and a folder that is no repository ignores nothing", async () => {
  const repo = mkdtempSync(join(tmpdir(), "trama-ignore-"));
  const plain = mkdtempSync(join(tmpdir(), "trama-plain-"));
  try {
    execFileSync("git", ["init", "-q"], { cwd: repo });
    writeFileSync(join(repo, ".gitignore"), "build/\n*.log\n");
    mkdirSync(join(repo, "build"));
    mkdirSync(join(repo, "src"));
    const ignored = await gitIgnored(repo, ["build/", "src/", "a.log", "README.md"]);
    expect([...ignored].sort()).toEqual(["a.log", "build/"]);
    expect([...(await gitIgnored(plain, ["build/", "a.log"]))]).toEqual([]);
    expect([...(await gitIgnored(repo, []))]).toEqual([]);
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(plain, { recursive: true, force: true });
  }
});
