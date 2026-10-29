import { afterEach, beforeEach, expect, test } from "bun:test";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readAgentProcess, removeAgentProcess, removeAgentProcessAsync, writeAgentProcess } from "../src/core/agent-processes";
import { announce, announceAsync, announcementsDir, listAnnouncements, retitleBoundAnnouncement, retitleBoundAnnouncementAsync, withdrawAll, withdrawAllAsync } from "../src/core/announcements";
import { checkWrites, releaseTerminalClaims, releaseTerminalClaimsAsync, type ClaimWriter } from "../src/core/claims";
import { type Project, projectAt } from "../src/core/store";

// The variants the editor's host uses: the same work as the synchronous ones, with the waits (a lock another process holds, a file in use) giving the thread back.
let dir: string;
let p: Project;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-async-domain-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

/** Holds the announcements lock the way another process does, and lets it go after `ms`. */
function heldByAnother(ms: number): void {
  mkdirSync(announcementsDir(p), { recursive: true });
  const lock = join(announcementsDir(p), "announcements.lock");
  writeFileSync(lock, "");
  setTimeout(() => rmSync(lock, { force: true }), ms);
}

test("announceAsync announces the same card as announce", async () => {
  const sync = announce(p, { kind: "proposal", title: "Returns", source: "request", terminal: "aaa111" });
  const later = await announceAsync(p, { kind: "proposal", title: "Returns", source: "request", terminal: "aaa111" });
  expect({ ...later, id: "", announced: "", touched: "" }).toEqual({ ...sync, id: "", announced: "", touched: "" });
  expect(listAnnouncements(p).map((a) => a.id)).toEqual([sync.id, later.id]);
  await expect(announceAsync(p, { kind: "proposal", title: "   " })).rejects.toThrow("An announcement needs a title");
});

test("announceAsync waits for a lock another process holds with the event loop free, then announces", async () => {
  heldByAnother(60);
  let turns = 0;
  const timer = setInterval(() => turns++, 1);
  const card = await announceAsync(p, { kind: "work", title: "Import", source: "request", terminal: "aaa111" });
  clearInterval(timer);
  expect(turns).toBeGreaterThan(5);
  expect(listAnnouncements(p).map((a) => a.id)).toEqual([card.id]);
  expect(existsSync(join(announcementsDir(p), "announcements.lock"))).toBe(false);
});

test("withdrawAllAsync and retitleBoundAnnouncementAsync do what their synchronous forms do, and nothing without a folder", async () => {
  expect(await withdrawAllAsync(p)).toEqual([]);
  expect(existsSync(announcementsDir(p))).toBe(false);
  const bound = announce(p, { kind: "proposal", title: "Old title", proposal: "abcd1234", source: "request", terminal: "aaa111" });
  expect(await retitleBoundAnnouncementAsync(p, bound.id, "abcd1234", "New title")).toBe(true);
  expect(listAnnouncements(p)[0]?.title).toBe("New title");
  expect(await retitleBoundAnnouncementAsync(p, bound.id, "abcd1234", "New title")).toBe(false);
  expect(retitleBoundAnnouncement(p, bound.id, "abcd1234", "Newer title")).toBe(true);
  const other = announce(p, { kind: "work", title: "Work", source: "request", terminal: "bbb222" });
  expect((await withdrawAllAsync(p, [other.id])).map((a) => a.id)).toEqual([other.id]);
  expect((await withdrawAllAsync(p)).map((a) => a.id)).toEqual([bound.id]);
  expect(withdrawAll(p)).toEqual([]);
});

test("releaseTerminalClaimsAsync forgets the claims of one terminal, as the synchronous form does, and a project without claims is no error", async () => {
  const writer = (terminal: string): ClaimWriter => ({ role: "sub", terminal, agent: "a", ancestors: ["main"] });
  await releaseTerminalClaimsAsync(dir, "t1");
  expect(checkWrites(dir, ["src/a.ts"], writer("t1"))).toBeUndefined();
  expect(checkWrites(dir, ["src/b.ts"], writer("t2"))).toBeUndefined();
  await releaseTerminalClaimsAsync(dir, "t1");
  const claims = join(dir, ".trama", "claims");
  expect(readdirSync(claims).filter((name) => name.endsWith(".json"))).toHaveLength(1);
  // The other terminal's claim is still held, so a main agent's write to its file is refused; the released one is free.
  const main: ClaimWriter = { role: "main", terminal: "m", agent: "m", ancestors: [] };
  expect(checkWrites(dir, ["src/a.ts"], main)).toBeUndefined();
  expect(checkWrites(dir, ["src/b.ts"], main)?.holder?.terminal).toBe("t2");
  releaseTerminalClaims(dir, "t2");
  await releaseTerminalClaimsAsync(dir, "t2");
});

test("removeAgentProcessAsync drops one registration, leaves the others and waits for the registry's lock without holding the thread", async () => {
  const runtime = mkdtempSync(join(tmpdir(), "trama-async-runtime-"));
  try {
    await writeAgentProcess("p1", "t1", 111, "w1", runtime);
    await writeAgentProcess("p1", "t2", 222, "w1", runtime);
    await removeAgentProcessAsync("p1", "t1", runtime);
    expect(readAgentProcess("p1", "t1", runtime)).toBeUndefined();
    expect(readAgentProcess("p1", "t2", runtime)).toMatchObject({ pid: 222 });

    const lock = join(runtime, ".locks", "agents-p1.lock");
    writeFileSync(lock, "");
    setTimeout(() => rmSync(lock, { force: true }), 60);
    let turns = 0;
    const timer = setInterval(() => turns++, 1);
    await removeAgentProcessAsync("p1", "t2", runtime);
    clearInterval(timer);
    expect(turns).toBeGreaterThan(5);
    expect(readAgentProcess("p1", "t2", runtime)).toBeUndefined();
    removeAgentProcess("p1", "t2", runtime);
    expect(readdirSync(runtime).filter((name) => name.endsWith(".json"))).toEqual([]);
  } finally {
    rmSync(runtime, { recursive: true, force: true });
  }
});

test("a lock left by a dead process does not stop an asynchronous announcement", async () => {
  mkdirSync(announcementsDir(p), { recursive: true });
  const lock = join(announcementsDir(p), "announcements.lock");
  writeFileSync(lock, "");
  const old = new Date(Date.now() - 60_000);
  utimesSync(lock, old, old);
  const card = await announceAsync(p, { kind: "work", title: "Import", source: "request", terminal: "aaa111" });
  expect(listAnnouncements(p).map((a) => a.id)).toEqual([card.id]);
});
