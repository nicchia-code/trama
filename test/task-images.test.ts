import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { changeTaskImages, discardProposal, editInProposal, getProposal, newProposal, pruneImages, rejectProposal, submitProposal } from "../src/core/proposals";
import { taskImagesDir, taskImagesRoot } from "../src/core/task-images";
import { pruneTaskImages } from "../src/core/task-image-cleanup";
import { type Project, projectAt } from "../src/core/store";
import { moveTask } from "../src/core/work";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-task-images-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function proposalWithTask() {
  const prop = newProposal(p, "Design", "", { label: "Design" });
  const file = editInProposal(p, prop.id, "tasks/checkout.md");
  writeFileSync(file, "---\ntechnical: false\nrefs: [order]\n---\n\n# Checkout\n");
  return { prop, file, taskId: basename(file).slice(0, 8), name: basename(file) };
}

describe("images of a Task in a Proposal", () => {
  test("a copy keeps the name, a taken name gets a suffix, the folder is ignored, and the Proposal returns to Draft", () => {
    const { prop, taskId, name } = proposalWithTask();
    const png = join(dir, "shot.png");
    writeFileSync(png, "png");
    submitProposal(p, prop.id);
    const first = changeTaskImages(p, prop.id, [{ task: `tasks/${name}`, path: png }, { task: taskId, path: "shot.png" }], []);
    expect(first.map((f) => basename(f))).toEqual(["shot.png", "shot-2.png"]);
    expect(readFileSync(first[0] as string, "utf8")).toBe("png");
    expect(readFileSync(join(taskImagesRoot(p), ".gitignore"), "utf8")).toBe("*\n");
    expect(getProposal(p, prop.id).data.status).toBe("draft");
    expect(existsSync(png)).toBe(true);
  });

  test("a refusal changes nothing", () => {
    const { prop, taskId } = proposalWithTask();
    const png = join(dir, "a.png");
    writeFileSync(png, "x");
    writeFileSync(join(dir, "a.txt"), "x");
    const other = (task: string, path: string) => () => changeTaskImages(p, prop.id, [{ task: taskId, path: "a.png" }, { task, path }], []);
    expect(other("zzzzzzzz", "a.png")).toThrow("not a Task of Proposal");
    expect(other(taskId, "a.txt")).toThrow("not an image");
    expect(other(taskId, "missing.png")).toThrow("does not exist");
    expect(existsSync(taskImagesDir(p, taskId))).toBe(false);
  });

  test("removeImages takes a copy away", () => {
    const { prop, taskId } = proposalWithTask();
    writeFileSync(join(dir, "a.png"), "x");
    changeTaskImages(p, prop.id, [{ task: taskId, path: "a.png" }], []);
    expect(() => changeTaskImages(p, prop.id, [], [{ task: taskId, name: "b.png" }])).toThrow("no image named");
    changeTaskImages(p, prop.id, [], [{ task: taskId, name: "a.png" }]);
    expect(existsSync(taskImagesDir(p, taskId))).toBe(false);
  });
});

describe("deleting the images of Tasks that no longer keep them", () => {
  function tied() {
    const made = proposalWithTask();
    writeFileSync(join(dir, "a.png"), "x");
    changeTaskImages(p, made.prop.id, [{ task: made.taskId, path: "a.png" }], []);
    return made;
  }

  test("a discarded Proposal loses its Tasks' images; a Draft keeps them", () => {
    const { prop, taskId } = tied();
    pruneImages(p);
    expect(existsSync(taskImagesDir(p, taskId))).toBe(true);
    discardProposal(p, prop.id);
    expect(existsSync(taskImagesDir(p, taskId))).toBe(false);
  });

  test("a rejected Proposal loses them, and deleting a Task file takes its folder", () => {
    const { prop, taskId, name } = tied();
    submitProposal(p, prop.id);
    expect(existsSync(taskImagesDir(p, taskId))).toBe(true);
    rmSync(join(getProposal(p, prop.id).dir, "tasks", name));
    pruneImages(p);
    expect(existsSync(taskImagesDir(p, taskId))).toBe(false);
  });

  test("a Task keeps them in To do and In progress and loses them in Done, also unchanged", () => {
    const keep = [{ id: "aaaaaaaa", data: { column: "todo" } }, { id: "bbbbbbbb", data: { column: "doing" } }, { id: "cccccccc", data: { column: "done" } }];
    for (const t of keep) writeFileSync(join(dir, `${t.id}.png`), "x");
    for (const t of keep) changeTaskImagesDirect(t.id);
    pruneTaskImages(p, [], keep);
    expect(keep.map((t) => existsSync(taskImagesDir(p, t.id)))).toEqual([true, true, false]);
    // Folders of unknown cards go too; a folder already gone is no error.
    pruneTaskImages(p, [], []);
    pruneTaskImages(p, [], []);
    expect(existsSync(taskImagesDir(p, "aaaaaaaa"))).toBe(false);
  });

  test("a Proposal rejected for a rework keeps them until its replacement is handed over", () => {
    const rejected = { id: "r1r1r1r1", data: { status: "rejected", reworkRequested: true }, tasks: [{ id: "dddddddd" }] };
    const plain = { id: "p2p2p2p2", data: { status: "rejected" }, tasks: [{ id: "eeeeeeee" }] };
    changeTaskImagesDirect("dddddddd");
    changeTaskImagesDirect("eeeeeeee");
    pruneTaskImages(p, [rejected, plain], []);
    expect(existsSync(taskImagesDir(p, "dddddddd"))).toBe(true);
    expect(existsSync(taskImagesDir(p, "eeeeeeee"))).toBe(false);
    pruneTaskImages(p, [rejected, { id: "n3n3n3n3", data: { status: "draft", reworks: "r1r1r1r1" }, tasks: [] }], []);
    expect(existsSync(taskImagesDir(p, "dddddddd"))).toBe(true);
    pruneTaskImages(p, [rejected, { id: "n3n3n3n3", data: { status: "discarded", reworks: "r1r1r1r1" }, tasks: [] }], []);
    expect(existsSync(taskImagesDir(p, "dddddddd"))).toBe(true);
    pruneTaskImages(p, [rejected, { id: "n3n3n3n3", data: { status: "open", reworks: "r1r1r1r1" }, tasks: [] }], []);
    expect(existsSync(taskImagesDir(p, "dddddddd"))).toBe(false);
  });

  test("rejection with rework keeps them until the Proposal that redoes it is handed over", () => {
    const { prop, taskId } = tied();
    submitProposal(p, prop.id);
    rejectProposal(p, prop.id, "again", { reworkRequested: true });
    expect(existsSync(taskImagesDir(p, taskId))).toBe(true);
    const next = newProposal(p, "Redo", "", { label: "Redo", reworks: prop.id });
    expect(existsSync(taskImagesDir(p, taskId))).toBe(true);
    const file = editInProposal(p, next.id, "tasks/checkout.md");
    writeFileSync(file, "---\ntechnical: false\nrefs: [order]\n---\n\n# Checkout\n");
    submitProposal(p, next.id);
    expect(existsSync(taskImagesDir(p, taskId))).toBe(false);
  });

  test("moving a Task to Done deletes its images, To do and In progress keep them", () => {
    const id = "tttttttt";
    mkdirSync(join(dir, ".trama/tasks"), { recursive: true });
    writeFileSync(join(dir, ".trama/tasks", `${id}-t.md`), "---\ncolumn: todo\ntechnical: true\nrefs: []\ndrift: null\nproposal: null\nagent: false\ncreated: 2026-01-01T00:00:00.000Z\n---\n# T\n");
    changeTaskImagesDirect(id);
    moveTask(p, id, "doing", "agent", { terminal: "aaa111" });
    expect(existsSync(taskImagesDir(p, id))).toBe(true);
    moveTask(p, id, "done", "agent");
    expect(existsSync(taskImagesDir(p, id))).toBe(false);
  });

  test("rejecting an open Proposal deletes its Tasks' images", () => {
    const { prop, taskId } = tied();
    submitProposal(p, prop.id);
    rejectProposal(p, prop.id);
    expect(existsSync(taskImagesDir(p, taskId))).toBe(false);
  });
});

function changeTaskImagesDirect(id: string) {
  mkdirSync(taskImagesDir(p, id), { recursive: true });
  writeFileSync(join(taskImagesDir(p, id), "x.png"), "x");
}
