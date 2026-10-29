import { afterAll, beforeAll, expect, test } from "bun:test";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { announce } from "../src/core/announcements";
import { buildPicture } from "../src/core/snapshot";
import { projectAt, type Project } from "../src/core/store";
import { workOfPicture, workOnDisk } from "../src/core/work-facts";
import { moveTask, newTask } from "../src/core/work";

let dir: string;
let p: Project;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-work-facts-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

test("the execution check's facts come from the picture: the Tasks taken, every announcement with its terminal, and none read from the disk", () => {
  const taken = moveTask(p, newTask(p, { title: "Taken", refs: ["order/Paid"], technical: false }).id, "doing", "agent", { terminal: "term01" }).id;
  announce(p, { kind: "task", title: "Mine", terminal: "term01" });
  announce(p, { kind: "task", title: "Nobody's" });

  const picture = buildPicture(p);
  try {
    const facts = workOfPicture(picture);
    expect(facts.taken).toEqual([{ id: taken, holder: "term01" }]);
    expect(facts.announcements.map((a) => a.terminal).sort()).toEqual([null, "term01"]);
    expect(facts.publishing).toEqual([]);
    // What the picture shows is what the disk says at the moment it is built.
    expect(workOnDisk(p)).toEqual(facts);
  } finally {
    picture.reads.close();
  }
});
