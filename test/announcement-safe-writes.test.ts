import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import * as fs from "node:fs";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Project } from "../src/core/store";

// Captured before mock.module, so the mock never calls itself.
const realRename = fs.renameSync;
// Every rename is recorded, so the tests see which files were written through a temporary file.
const renamed: string[] = [];
mock.module("node:fs", () => ({
  ...fs,
  renameSync: (from: string, to: string) => {
    renamed.push(to);
    return realRename(from, to);
  },
}));
// Loaded after mock.module replaced node:fs, so the helpers use the recording rename; a static import would load them too early.
const core = await import("../src/core/announcements");
const { announce, announcementsDir, changeCheckPhase, declareNote, deliverCard, deliverCheck, getAnnouncement, listAnnouncements, retitleBoundAnnouncement, withdrawAll } = core;
const { run } = await import("../src/cli/main");
const { projectAt } = await import("../src/core/store");

let dir: string;
let p: Project;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-announce-safe-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
  renamed.length = 0;
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const at = (minutes: number) => new Date(Date.UTC(2026, 0, 1, 12, minutes));
const fileOf = (id: string) => join(announcementsDir(p), `${id}.md`);
/** What is in the folder besides the announcements' own files: temporary files and locks must never stay. */
const strays = () => readdirSync(announcementsDir(p)).filter((name) => name !== ".gitignore" && !/^[a-z0-9]{6}\.(md|json)$/.test(name));

test("every write of an announcement goes through a temporary file renamed over it, which never stays", () => {
  const check = announce(p, { kind: "check", title: "Final check", phase: "verifying", terminal: "ab12cd" }, at(1));
  declareNote(p, { id: check.id, text: "Verifies" }, at(2));
  changeCheckPhase(p, check.id, "scanning", at(3));
  expect(renamed.filter((to) => to === fileOf(check.id))).toHaveLength(3);
  expect(getAnnouncement(p, check.id)).toMatchObject({ phase: "scanning", notes: [{ text: "Verifies" }] });
  expect(strays()).toEqual([]);
});

test("notes declared at once by several processes are all kept, and the lock leaves nothing behind", async () => {
  const a = announce(p, { kind: "task", title: "Shared" }, at(1));
  const worker = join(dir, "worker.ts");
  writeFileSync(
    worker,
    `import { declareNote } from ${JSON.stringify(join(import.meta.dir, "../src/core/announcements.ts"))};
import { projectAt } from ${JSON.stringify(join(import.meta.dir, "../src/core/store.ts"))};
const p = projectAt(${JSON.stringify(dir)});
declareNote(p, { id: ${JSON.stringify(a.id)}, text: \`worker \${process.env.WORKER}\` });
`,
  );
  const workers = 6;
  const runs = Array.from({ length: workers }, (_, w) => Bun.spawn([process.execPath, worker], { env: { ...process.env, WORKER: String(w) }, stdout: "pipe", stderr: "pipe" }));
  const exits = await Promise.all(runs.map(async (r) => ({ code: await r.exited, stderr: await new Response(r.stderr).text() })));
  expect(exits.filter((e) => e.code !== 0).map((e) => e.stderr)).toEqual([]);
  expect(getAnnouncement(p, a.id)?.notes.map((n) => n.text).sort()).toEqual(Array.from({ length: workers }, (_, w) => `worker ${w}`));
  expect(strays()).toEqual([]);
}, 60_000);

test("a ghost delivered or withdrawn stays gone: a note, a phase, a delivery or a title never bring its file back", () => {
  const check = announce(p, { kind: "check", title: "Final check", phase: "verifying", terminal: "ab12cd" }, at(1));
  const draft = announce(p, { kind: "proposal", title: "Old title", proposal: "abcd1234", terminal: "ab12cd" }, at(2));
  const task = announce(p, { kind: "task", title: "Task", terminal: "ab12cd" }, at(3));
  withdrawAll(p, [check.id, draft.id]);
  deliverCard(p, task.id, "task");

  expect(() => declareNote(p, { id: check.id, text: "Late" })).toThrow(/no longer exists/);
  expect(declareNote(p, { text: "Late", terminal: "ab12cd" }).announcements).toEqual([]);
  expect(changeCheckPhase(p, check.id, "scanning")).toBe("missing");
  expect(deliverCheck(p, check.id)).toBeNull();
  expect(retitleBoundAnnouncement(p, draft.id, "abcd1234", "New title")).toBe(false);
  for (const id of [check.id, draft.id, task.id]) expect(existsSync(fileOf(id))).toBe(false);
  expect(listAnnouncements(p)).toEqual([]);
});

test("without an announcements folder nothing is created by a note, a phase, a delivery or a withdrawal", () => {
  expect(() => declareNote(p, { id: "zzzzzz", text: "Nobody" })).toThrow(/no longer exists/);
  expect(declareNote(p, { text: "Nobody", terminal: "ab12cd" }).announcements).toEqual([]);
  expect(changeCheckPhase(p, "zzzzzz", "history")).toBe("missing");
  expect(deliverCheck(p, "zzzzzz")).toBeNull();
  deliverCard(p, "zzzzzz", "drift");
  expect(withdrawAll(p)).toEqual([]);
  expect(existsSync(announcementsDir(p))).toBe(false);
});

test("a title is synchronised keeping identity, kind, source, Draft, terminal and touched, and is not written when it already matches", () => {
  const bound = announce(p, { kind: "proposal", title: "Old title", proposal: "abcd1234", terminal: "ab12cd" }, at(1));
  declareNote(p, { id: bound.id, text: "Writes" }, at(2));
  const before = getAnnouncement(p, bound.id)!;
  renamed.length = 0;

  expect(retitleBoundAnnouncement(p, bound.id, "abcd1234", "Old title")).toBe(false);
  expect(renamed).toEqual([]);
  expect(retitleBoundAnnouncement(p, bound.id, "abcd1234", "New title è")).toBe(true);
  expect(getAnnouncement(p, bound.id)).toEqual({ ...before, title: "New title è" });
  expect(readFileSync(fileOf(bound.id), "utf8")).toContain("# New title è");
  expect(strays()).toEqual([]);

  // The other Draft, a Drift's ghost, a comparison and a Resolve Drifts announcement keep their titles.
  expect(retitleBoundAnnouncement(p, bound.id, "other999", "Other")).toBe(false);
  const drift = announce(p, { kind: "drift", title: "Drift title", proposal: "abcd1234", terminal: "ab12cd" }, at(3));
  const resolution = announce(p, { kind: "proposal", title: "Resolve Drifts", proposal: "abcd1234", drifts: ["aaaaaaaa"], terminal: "ab12cd" }, at(4));
  expect(retitleBoundAnnouncement(p, drift.id, "abcd1234", "Other")).toBe(false);
  expect(retitleBoundAnnouncement(p, resolution.id, "abcd1234", "Other")).toBe(false);
});

test("comparison new without TRAMA_TERMINAL gives the briefing and no announcement; comparison move deletes its data file", () => {
  const out = run(["--root", dir, "--json", "comparison", "new", "order"], dir, {});
  expect(out.exit).toBe(0);
  const id = JSON.parse(out.out).announcement as string;
  expect(id).toMatch(/^[a-z0-9]{6}$/);
  // No ghost, with or without a terminal: the Snapshot and the orphan withdrawal never see the file.
  expect(listAnnouncements(p)).toEqual([]);
  expect(withdrawAll(p)).toEqual([]);
  expect(readdirSync(announcementsDir(p)).filter((name) => name.endsWith(".md"))).toEqual([]);
  expect(existsSync(join(announcementsDir(p), `${id}.json`))).toBe(true);
  expect(core.readUnownedComparison(p, id)).toEqual({ code: null, texts: {} });

  const moved = run(["--root", dir, "--json", "comparison", "move", id, "delivered", "--input", JSON.stringify({ tasks: [], drifts: [] })], dir, {});
  expect(moved.exit).toBe(0);
  expect(JSON.parse(moved.out)).toMatchObject({ comparison: id, delivered: true });
  expect(existsSync(join(announcementsDir(p), `${id}.json`))).toBe(false);
  expect(core.readUnownedComparison(p, id)).toBeNull();
});

test("comparison new in a terminal still announces the comparison", () => {
  const out = run(["--root", dir, "--json", "comparison", "new", "order"], dir, { TRAMA_TERMINAL: "ab12cd" });
  const id = JSON.parse(out.out).announcement as string;
  expect(listAnnouncements(p).map((a) => [a.id, a.kind, a.terminal])).toEqual([[id, "comparison", "ab12cd"]]);
  expect(existsSync(join(announcementsDir(p), `${id}.json`))).toBe(false);
  run(["--root", dir, "comparison", "move", id, "delivered", "--input", JSON.stringify({ tasks: [], drifts: [] })], dir, { TRAMA_TERMINAL: "ab12cd" });
  expect(listAnnouncements(p)).toEqual([]);
});
