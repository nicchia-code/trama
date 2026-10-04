import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  announce,
  announcementNote,
  announcementsDir,
  bindDraft,
  deliverCard,
  getAnnouncement,
  isQuiet,
  listAnnouncements,
  newTerminalId,
  terminalFromEnv,
  withdrawAll,
} from "../src/core/announcements";
import { run } from "../src/cli/main";
import { discardProposal, editInProposal, getProposal, newProposal, submitProposal } from "../src/core/proposals";
import { buildSnapshot } from "../src/core/snapshot";
import { type Project, projectAt } from "../src/core/store";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-announce-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const t = (minutes: number) => new Date(Date.UTC(2026, 0, 1, 12, minutes));

describe("announcing", () => {
  test("keeps the announcements in the order announced, with an ID of six letters and digits", () => {
    const first = announce(p, { kind: "drift", title: "First" }, t(1));
    const b = announce(p, { kind: "task", title: "Second" }, t(1));
    const a = announce(p, { kind: "task", title: "Third" }, t(0));
    expect(listAnnouncements(p).map((x) => x.title)).toEqual(["First", "Second", "Third"]);
    expect(first.created < b.created && b.created < a.created).toBe(true);
    expect(a.id).toMatch(/^[a-z0-9]{6}$/);
    expect(getAnnouncement(p, b.id)?.kind).toBe("task");
  });

  test("the folder ignores itself, so nothing in it is versioned", () => {
    announce(p, { kind: "task", title: "Anything" });
    expect(readFileSync(join(announcementsDir(p), ".gitignore"), "utf8").trim()).toBe("*");
  });

  test("a file that cannot be read is not an announcement, and does not hide the others", () => {
    announce(p, { kind: "task", title: "Good" });
    writeFileSync(join(announcementsDir(p), "bad123.md"), "no front matter");
    expect(listAnnouncements(p).map((x) => x.title)).toEqual(["Good"]);
  });

  test("any activity of the agent starts the quiet period again for every announcement", () => {
    const first = announce(p, { kind: "task", title: "A" }, t(0));
    announce(p, { kind: "task", title: "B" }, t(10));
    expect(getAnnouncement(p, first.id)?.touched).toBe(t(10).toISOString());
  });

  test("an announcement cannot have an empty title", () => {
    expect(() => announce(p, { kind: "task", title: "  " })).toThrow(/title/);
  });
});

describe("a Draft and its announcement", () => {
  test("a Draft that names an announcement is bound to it, and the ghost follows the Draft's title", () => {
    const a = announce(p, { kind: "proposal", title: "Planned" });
    const prop = newProposal(p, "Real title", "", { announcement: a.id });
    expect(listAnnouncements(p)).toHaveLength(1);
    const view = buildSnapshot(p).announcements;
    expect(view).toEqual([{ id: a.id, kind: "proposal", title: "Real title", phase: "writing" }]);
    expect(getAnnouncement(p, a.id)?.proposal).toBe(prop.id);
  });

  test("with no ID, the Draft takes over the oldest design request still Preparing, not an agent's announcement", () => {
    announce(p, { kind: "proposal", title: "By the agent" }, t(0));
    const early = announce(p, { kind: "proposal", title: "Request one", source: "request" }, t(1));
    const late = announce(p, { kind: "proposal", title: "Request two", source: "request" }, t(2));
    const prop = newProposal(p, "Draft");
    expect(getAnnouncement(p, early.id)?.proposal).toBe(prop.id);
    expect(getAnnouncement(p, late.id)?.proposal).toBeNull();
    expect(listAnnouncements(p)).toHaveLength(3);
  });

  test("with nothing waiting, the Draft makes its own announcement, already Writing", () => {
    const prop = newProposal(p, "Chat design");
    const [only] = buildSnapshot(p).announcements;
    expect(only).toMatchObject({ kind: "proposal", title: "Chat design", phase: "writing" });
    expect(getAnnouncement(p, only?.id as string)?.proposal).toBe(prop.id);
  });

  test("an ID of another kind or one already bound is not used, and the Draft still gets a ghost", () => {
    const task = announce(p, { kind: "task", title: "A task" });
    const prop = newProposal(p, "First", "", { announcement: task.id });
    expect(getAnnouncement(p, task.id)?.proposal).toBeNull();
    const second = newProposal(p, "Second", "", { announcement: listAnnouncements(p).find((a) => a.proposal === prop.id)?.id });
    expect(listAnnouncements(p).filter((a) => a.kind === "proposal").map((a) => a.proposal).sort()).toEqual([prop.id, second.id].sort());
  });

  test("handing the Draft over delivers its card, and the ghost is gone", () => {
    const prop = newProposal(p, "Empty change");
    expect(listAnnouncements(p)).toHaveLength(1);
    submitProposal(p, prop.id);
    expect(listAnnouncements(p)).toHaveLength(0);
  });

  test("a refused hand-over leaves the ghost", () => {
    const prop = newProposal(p, "Unregistered");
    mkdirSync(join(prop.dir, "model/checkout"), { recursive: true });
    writeFileSync(join(prop.dir, "model/checkout/stray.md"), "# stray");
    expect(() => submitProposal(p, prop.id)).toThrow();
    expect(listAnnouncements(p)).toHaveLength(1);
  });

  test("discarding the Draft withdraws its ghost, and sending an open Proposal back to Draft does not bring one back", () => {
    const gone = newProposal(p, "Given up");
    discardProposal(p, gone.id);
    expect(listAnnouncements(p)).toHaveLength(0);

    const kept = newProposal(p, "Handed over");
    submitProposal(p, kept.id);
    editInProposal(p, kept.id, "checkout/order.md");
    expect(getProposal(p, kept.id).data.status).toBe("draft");
    expect(listAnnouncements(p)).toHaveLength(0);
  });

  test("editing a Draft that has a ghost starts the quiet period again", () => {
    const prop = newProposal(p, "Edited");
    const before = listAnnouncements(p)[0]?.touched as string;
    const start = Date.now();
    while (Date.now() === start) {
      // The stamp has millisecond resolution.
    }
    editInProposal(p, prop.id, "checkout/order.md");
    expect((listAnnouncements(p)[0]?.touched as string) > before).toBe(true);
  });
});

describe("ending announcements", () => {
  test("filing the announced Task or Drift delivers it, only for the same kind", () => {
    const a = announce(p, { kind: "task", title: "Coming" });
    deliverCard(p, a.id, "drift");
    expect(listAnnouncements(p)).toHaveLength(1);
    deliverCard(p, a.id, "task");
    expect(listAnnouncements(p)).toHaveLength(0);
  });

  test("an unknown ID is reported in a note and never prevents anything", () => {
    expect(announcementNote(p, "zzzzzz", "task")).toMatch(/No announcement "zzzzzz"/);
    expect(announcementNote(p, undefined, "task")).toBeNull();
    const a = announce(p, { kind: "task", title: "Ok" });
    expect(announcementNote(p, a.id, "task")).toBeNull();
    expect(announcementNote(p, a.id, "drift")).toMatch(/is for a task/);
    expect(() => deliverCard(p, "zzzzzz", "task")).not.toThrow();
  });

  test("withdrawing returns what was withdrawn, and leaves no file but the ignore file", () => {
    announce(p, { kind: "task", title: "A" });
    announce(p, { kind: "drift", title: "B" });
    expect(withdrawAll(p).map((a) => a.title).sort()).toEqual(["A", "B"]);
    expect(readdirSync(announcementsDir(p)).filter((n) => n !== ".gitignore")).toEqual([]);
    expect(existsSync(join(announcementsDir(p), ".gitignore"))).toBe(true);
  });

  test("the ghost of a Draft stays Preparing until a Draft is bound", () => {
    announce(p, { kind: "proposal", title: "Request", source: "request" });
    expect(buildSnapshot(p).announcements[0]?.phase).toBe("preparing");
    bindDraft(p, { id: "0099", title: "Whatever" });
    expect(buildSnapshot(p).announcements[0]?.phase).toBe("writing");
  });
});

describe("the quiet period", () => {
  test("passes fifteen minutes after the agent's last activity, whichever announcement it was about", () => {
    announce(p, { kind: "task", title: "Old" }, t(0));
    announce(p, { kind: "task", title: "Newer" }, t(10));
    expect(isQuiet(listAnnouncements(p), t(24).getTime())).toBe(false);
    expect(isQuiet(listAnnouncements(p), t(25).getTime())).toBe(true);
  });

  test("a question round that closed later restarts the count, and nothing waiting is never quiet", () => {
    announce(p, { kind: "task", title: "Waiting" }, t(0));
    expect(isQuiet(listAnnouncements(p), t(20).getTime(), t(18).getTime())).toBe(false);
    expect(isQuiet(listAnnouncements(p), t(33).getTime(), t(18).getTime())).toBe(true);
    withdrawAll(p);
    expect(isQuiet(listAnnouncements(p), t(500).getTime())).toBe(false);
  });
});

describe("the terminal an announcement belongs to", () => {
  test("is kept in the file, and is none for an announcement written without it", () => {
    const mine = announce(p, { kind: "task", title: "Mine", terminal: "ab12cd" });
    announce(p, { kind: "task", title: "Nobody's" });
    expect(listAnnouncements(p).map((a) => [a.title, a.terminal])).toEqual([["Mine", "ab12cd"], ["Nobody's", null]]);

    // Written before the field existed: no `terminal` line at all.
    writeFileSync(join(announcementsDir(p), "old001.md"), "---\nkind: task\nsource: agent\nproposal: null\ncreated: 2026-01-01T10:00:00.000Z\ntouched: 2026-01-01T10:00:00.000Z\n---\n# Old\n");
    expect(getAnnouncement(p, "old001")?.terminal).toBeNull();
    expect(getAnnouncement(p, mine.id)?.terminal).toBe("ab12cd");
  });

  test("an agent's environment names its terminal only with a valid ID", () => {
    expect(terminalFromEnv({ TRAMA_TERMINAL: "ab12cd" })).toBe("ab12cd");
    expect(terminalFromEnv({})).toBeUndefined();
    expect(terminalFromEnv({ TRAMA_TERMINAL: "AB12CD" })).toBeUndefined();
    expect(terminalFromEnv({ TRAMA_TERMINAL: "toolong1" })).toBeUndefined();
    expect(newTerminalId()).toMatch(/^[a-z0-9]{6}$/);
  });

  test("the command line announces from the agent's terminal, and a Draft with no waiting announcement makes its own there", async () => {
    const id = run(["announce", "task", "From a terminal"], dir, { TRAMA_TERMINAL: "ab12cd" }).out;
    expect(getAnnouncement(p, id)?.terminal).toBe("ab12cd");
    expect(getAnnouncement(p, run(["announce", "task", "Outside"], dir, {}).out)?.terminal).toBeNull();

    withdrawAll(p);
    run(["proposal", "new", "Own ghost"], dir, { TRAMA_TERMINAL: "ab12cd" });
    expect(listAnnouncements(p).map((a) => [a.title, a.terminal])).toEqual([["Own ghost", "ab12cd"]]);
  });

  test("an announced Task or Drift is delivered by creating it with --announcement, and an unknown ID only adds a note", () => {
    const announced = (kind: string, title: string) => run(["announce", kind, title], dir, {}).out;
    const taskAnnouncement = announced("task", "Refunds");
    expect(listAnnouncements(p).map((a) => a.kind)).toEqual(["task"]);
    run(["--root", dir, "task", "new", "Refunds", "--ref", "order/Refunding", "--announcement", taskAnnouncement], dir, {});
    expect(listAnnouncements(p)).toEqual([]);

    const driftOptions = ["--option", "Change the code", "--option-text", "Make it so.", "--option", "Remove the code", "--option-text", "Drop it."];
    const unknown = run(["--root", dir, "drift", "new", "Late refund", "--ref", "order/Shipped", "--happens", "The code refunds late.", "--should", "The Model forbids it.", "--announcement", "zzzzzz", ...driftOptions], dir, {});
    expect(unknown.out).toContain('No announcement "zzzzzz" was found');
    expect(() => run(["announce", "card", "x"], dir, {})).toThrow(/The kind must be one of/);
  });

  test("a Draft that takes a design request's announcement leaves it in the terminal the request was typed into", () => {
    announce(p, { kind: "proposal", title: "Request", source: "request", terminal: "ab12cd" });
    run(["proposal", "new", "Draft"], dir, { TRAMA_TERMINAL: "zz99yy" });
    expect(listAnnouncements(p).map((a) => [a.title, a.proposal !== null, a.terminal])).toEqual([["Request", true, "ab12cd"]]);
  });
});
