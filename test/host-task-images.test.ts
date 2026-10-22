import { afterEach, beforeEach, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type Project, projectAt } from "../src/core/store";
import { buildSnapshot } from "../src/core/snapshot";
import { copyTaskImages } from "../src/core/task-images";
import { taskImagePath, withImageUris } from "../extension/src/host/task-images";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-host-task-images-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

test("every Task image of the picture gets an address made from its path, and the rest of the picture is untouched", () => {
  const png = join(dir, "shot.png");
  writeFileSync(png, "x");
  mkdirSync(join(dir, ".trama/tasks"), { recursive: true });
  for (const id of ["tttttttt", "uuuuuuuu"]) {
    writeFileSync(join(dir, ".trama/tasks", `${id}-t.md`), "---\ncolumn: todo\ntechnical: true\nrefs: []\ndrift: null\nproposal: null\nagent: false\ncreated: 2026-01-01T00:00:00.000Z\n---\n# T\n");
  }
  copyTaskImages(p, "tttttttt", [png]);
  const withImages = withImageUris(buildSnapshot(p), (path) => `webview:${path}`);
  const shown = withImages.tasks.find((t) => t.id === "tttttttt");
  expect(shown?.images.map((i) => [i.name, i.uri])).toEqual([["shot.png", `webview:${join(dir, ".trama", "task-images", "tttttttt", "shot.png")}`]]);
  expect(withImages.tasks.find((t) => t.id === "uuuuuuuu")?.images).toEqual([]);
});

test("the path of a Task image is found only for an image that exists", () => {
  const png = join(dir, "shot.png");
  writeFileSync(png, "x");
  copyTaskImages(p, "abcd1234", [png]);
  expect(taskImagePath(p, "abcd1234", "shot.png")).toBe(join(dir, ".trama", "task-images", "abcd1234", "shot.png"));
  expect(taskImagePath(p, "abcd1234", "other.png")).toBeUndefined();
  expect(taskImagePath(p, "abcd1234", "../shot.png")).toBeUndefined();
  expect(taskImagePath(p, "wxyz5678", "shot.png")).toBeUndefined();
});
