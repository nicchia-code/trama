import { afterAll, beforeAll, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveMarkdownFile } from "../extension/src/host/paths";

let base: string;
let outside: string;

beforeAll(() => {
  const root = mkdtempSync(join(tmpdir(), "trama-paths-"));
  base = join(root, "model");
  outside = join(root, "secret");
  mkdirSync(join(base, "checkout"), { recursive: true });
  mkdirSync(outside);
  writeFileSync(join(base, "checkout", "order.md"), "# Order\n");
  writeFileSync(join(outside, "notes.md"), "secret\n");
  // Creating a symlink needs developer mode or administrator rights on Windows: the symlink test is skipped there.
  if (process.platform !== "win32") symlinkSync(outside, join(base, "link"));
});
afterAll(() => rmSync(join(base, ".."), { recursive: true, force: true }));

test("resolves Markdown files inside the folder, with either slash", () => {
  expect(resolveMarkdownFile(base, "checkout/order.md")).toBe(join(base, "checkout", "order.md"));
  expect(resolveMarkdownFile(base, "checkout\\order.md")).toBe(join(base, "checkout", "order.md"));
  expect(resolveMarkdownFile(base, "checkout/new-file.md")).toBe(join(base, "checkout", "new-file.md"));
});

test("refuses traversal, absolute paths and empty paths", () => {
  for (const rel of ["../secret/notes.md", "checkout/../../secret/notes.md", "..\\secret\\notes.md", "/etc/passwd.md", "\\windows\\x.md", "C:\\x\\y.md", "", "a\0b.md"])
    expect(() => resolveMarkdownFile(base, rel)).toThrow();
});

test("refuses files that are not Markdown", () => {
  for (const rel of ["checkout/order.txt", "checkout/order.md.exe", "checkout", "checkout/"])
    expect(() => resolveMarkdownFile(base, rel)).toThrow();
});

// Skipped on Windows: creating the symlink in the fixture needs developer mode or administrator rights there.
(process.platform === "win32" ? test.skip : test)("refuses a symlink that leads outside the folder", () => {
  expect(() => resolveMarkdownFile(base, "link/notes.md")).toThrow();
});
