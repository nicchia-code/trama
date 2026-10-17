import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  announce,
  announcementNote,
  announcementsDir,
  bindDraft,
  changeCheckPhase,
  deliverCard,
  getAnnouncement,
  listAnnouncements,
  resolutionTitle,
  newTerminalId,
  terminalFromEnv,
  originFromEnv,
  checkOutcome,
  forgetCheck,
  withdrawAll,
} from "../src/core/announcements";
import { createQuestionServer, settleCoordinatorMessages } from "../src/core/question-channel";
import { discardProposal, editInProposal, getProposal, newProposal, submitProposal } from "../src/core/proposals";
import { buildSnapshot } from "../src/core/snapshot";
import { newDrift, resolveDrift } from "../src/core/work";
import { run } from "../src/cli/main";
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
    expect(a.id).toMatch(/^[a-z0-9]{6}$/);
    expect(getAnnouncement(p, b.id)?.kind).toBe("task");
  });

  test("terminal origin wins; otherwise announcements distinguish Cursor and editor chat", () => {
    expect(originFromEnv({ TRAMA_TERMINAL: "abc123", CURSOR_AGENT: "1" })).toEqual({ terminal: "abc123" });
    expect(originFromEnv({ CURSOR_AGENT: "1" })).toEqual({ chat: "cursor" });
    expect(originFromEnv({})).toEqual({ chat: "editor" });
    expect(announce(p, { kind: "check", title: "Editor check", phase: "verifying" }).chat).toBe("editor");
    expect(announce(p, { kind: "task", title: "Cursor task", chat: "cursor" }).chat).toBe("cursor");
    expect(announce(p, { kind: "task", title: "Terminal task", terminal: "abc123" })).toMatchObject({ terminal: "abc123", chat: null });
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


  test("an announcement cannot have an empty title", () => {
    expect(() => announce(p, { kind: "task", title: "  " })).toThrow(/title/);
  });

  test("a Resolve Drifts ghost is a Proposal that names its Drifts and keeps its title when a Draft takes it", () => {
    expect(resolutionTitle(p, [])).toBeUndefined();
    expect(resolutionTitle(p, ["a1b2c3d4", "e5f6g7h8"])).toBe("Resolving 2 Drifts");
    const resolve = announce(p, { kind: "proposal", title: "Resolve Drifts", drifts: ["a1b2c3d4", "e5f6g7h8"], source: "request", terminal: "ab12cd" }, t(1));
    const prop = newProposal(p, "Draft", "", { origin: { terminal: "ab12cd" } });
    expect(getAnnouncement(p, resolve.id)).toMatchObject({ kind: "proposal", drifts: ["a1b2c3d4", "e5f6g7h8"], proposal: prop.id, title: "Resolve Drifts" });
    expect(() => announce(p, { kind: "task", title: "Not a Proposal", drifts: ["a1b2c3d4"] })).toThrow(/Only a Proposal names Drifts/);
  });

  test("a request is announced in the chat that made it, and a request with no origin in no chat", () => {
    expect(announce(p, { kind: "proposal", title: "Chat design", source: "request", chat: "cursor" }).chat).toBe("cursor");
    expect(announce(p, { kind: "check", title: "Scanning System", phase: "scanning", source: "request" }).chat).toBeNull();
    expect(announce(p, { kind: "work", title: "Importing from code", source: "request", chat: "cursor" }).chat).toBe("cursor");
  });

  test("an agent's scan takes over the scan Trama announced for its terminal and keeps its title", () => {
    const launched = announce(p, { kind: "check", title: "Scanning Feature order", phase: "scanning", source: "request", terminal: "ab12cd" }, t(1));
    const adopted = announce(p, { kind: "check", title: "Scan of Feature order", phase: "scanning", terminal: "ab12cd" }, t(2));
    expect(adopted).toMatchObject({ id: launched.id, title: "Scanning Feature order", phase: "scanning" });
    expect(listAnnouncements(p)).toHaveLength(1);
  });
});

describe("a Draft and its announcement", () => {
  test("an explicitly named announcement is bound only when it belongs to the same origin", () => {
    const a = announce(p, { kind: "proposal", title: "Planned", terminal: "ab12cd" });
    const prop = newProposal(p, "Real title", "", { announcement: a.id, origin: { terminal: "ab12cd" } });
    expect(listAnnouncements(p)).toHaveLength(1);
    expect(buildSnapshot(p).announcements).toEqual([{ id: a.id, kind: "proposal", title: "Real title", phase: "writing" }]);
    expect(getAnnouncement(p, a.id)?.proposal).toBe(prop.id);
  });

  test("without an ID, a terminal Draft takes the oldest request for its own terminal", () => {
    const foreign = announce(p, { kind: "proposal", title: "Other terminal", source: "request", terminal: "zz99yy" }, t(0));
    const early = announce(p, { kind: "proposal", title: "Request one", source: "request", terminal: "ab12cd" }, t(1));
    const late = announce(p, { kind: "proposal", title: "Request two", source: "request", terminal: "ab12cd" }, t(2));
    const prop = newProposal(p, "Draft", "", { origin: { terminal: "ab12cd" } });
    expect(getAnnouncement(p, early.id)).toMatchObject({ proposal: prop.id, title: "Draft" });
    expect(getAnnouncement(p, late.id)?.proposal).toBeNull();
    expect(getAnnouncement(p, foreign.id)).toMatchObject({ proposal: null, title: "Other terminal" });
  });
  test("the other terminal's request can be older without changing which request is selected", () => {
    const requestA = announce(p, { kind: "proposal", title: "A request", source: "request", terminal: "ab12cd" }, t(2));
    const requestB = announce(p, { kind: "proposal", title: "B request", source: "request", terminal: "zz99yy" }, t(1));
    const draftB = newProposal(p, "B draft", "", { origin: { terminal: "zz99yy" } });
    expect(getAnnouncement(p, requestB.id)).toMatchObject({ proposal: draftB.id, title: "B draft" });
    expect(getAnnouncement(p, requestA.id)?.proposal).toBeNull();
  });

  test("chat and unknown origins cannot claim a terminal request", () => {
    const request = announce(p, { kind: "proposal", title: "Terminal request", source: "request", terminal: "ab12cd" });
    const chatDraft = newProposal(p, "Chat design", "", { origin: { chat: "editor" } });
    const unknownDraft = newProposal(p, "Unknown design");
    expect(getAnnouncement(p, request.id)?.proposal).toBeNull();
    expect(listAnnouncements(p).filter((a) => a.proposal === chatDraft.id)).toMatchObject([{ kind: "proposal", title: "Chat design", chat: "editor" }]);
    expect(listAnnouncements(p).filter((a) => a.proposal === unknownDraft.id)).toMatchObject([{ kind: "proposal", title: "Unknown design" }]);
  });

  test("an explicit ID from another origin stays unbound without creating a replacement ghost", () => {
    const foreign = announce(p, { kind: "proposal", title: "Other terminal", terminal: "zz99yy" });
    const prop = newProposal(p, "Draft", "", { announcement: foreign.id, origin: { terminal: "ab12cd" } });
    expect(getAnnouncement(p, foreign.id)?.proposal).toBeNull();
    expect(listAnnouncements(p)).toHaveLength(1);
    expect(listAnnouncements(p).some((a) => a.proposal === prop.id)).toBe(false);
  });

  test("with no matching request, the Draft makes its own Writing announcement", () => {
    const prop = newProposal(p, "Terminal design", "", { origin: { terminal: "ab12cd" } });
    expect(listAnnouncements(p)).toMatchObject([{ kind: "proposal", title: "Terminal design", terminal: "ab12cd", proposal: prop.id }]);
    expect(buildSnapshot(p).announcements[0]?.phase).toBe("writing");
  });
  test("with nothing waiting, the Draft makes its own announcement, already Writing", () => {
    const prop = newProposal(p, "Chat design");
    const [only] = buildSnapshot(p).announcements;
    expect(only).toMatchObject({ kind: "proposal", title: "Chat design", phase: "writing" });
    expect(getAnnouncement(p, only?.id as string)?.proposal).toBe(prop.id);
  });

  for (const waiting of [false, true]) {
    test.each(["unknown", "delivered", "withdrawn", "wrong kind", "already bound"])(
      `a %s announcement creates no ghost${waiting ? " and leaves the waiting request Preparing" : ""}`,
      (invalid) => {
        let id = "zzzzzz";
        if (invalid !== "unknown") {
          const a = announce(p, { kind: invalid === "wrong kind" ? "task" : "proposal", title: "Named announcement", chat: "editor" });
          id = a.id;
          if (invalid === "delivered") submitProposal(p, newProposal(p, "Delivered", "", { announcement: id, origin: { chat: "editor" } }).id);
          if (invalid === "withdrawn") withdrawAll(p, [id]);
          if (invalid === "already bound") newProposal(p, "Existing Draft", "", { announcement: id, origin: { chat: "editor" } });
        }
        if (waiting) announce(p, { kind: "proposal", title: "Waiting request", source: "request", terminal: "ab12cd" });
        const before = buildSnapshot(p).announcements;
        const result = run(["--json", "proposal", "new", "Without ghost", "--announcement", id], dir, { CURSOR_AGENT: "0" });
        expect(result.exit).toBe(0);
        const created = JSON.parse(result.out);
        expect(created.id).toBeString();
        expect(getProposal(p, created.id).data.status).toBe("draft");
        expect(listAnnouncements(p).some((a) => a.proposal === created.id)).toBe(false);
        expect(buildSnapshot(p).announcements).toEqual(before);
      },
    );
  }

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

  test("editing a Draft does not change announcement metadata", () => {
    const prop = newProposal(p, "Edited");
    const before = listAnnouncements(p)[0]?.touched;
    editInProposal(p, prop.id, "checkout/order.md");
    expect(listAnnouncements(p)[0]?.touched).toBe(before);
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

  test("the ghost of a Draft stays Preparing until a Draft from the same terminal is bound", () => {
    const request = announce(p, { kind: "proposal", title: "Request", source: "request", terminal: "ab12cd" });
    expect(buildSnapshot(p).announcements[0]?.phase).toBe("preparing");
    bindDraft(p, { id: "0099", title: "Whatever" }, undefined, { terminal: "ab12cd" });
    expect(buildSnapshot(p).announcements.find((a) => a.id === request.id)?.phase).toBe("writing");
  });

  test("a Draft named with a Drift announcement binds to it: it stays a Drift, keeps its title, and only the Drift delivers it", () => {
    const a = announce(p, { kind: "drift", title: "Drift title", chat: "editor" });
    expect(announcementNote(p, a.id, "proposal")).toBeNull();
    const prop = newProposal(p, "Draft title", "", { announcement: a.id, origin: { chat: "editor" } });
    const all = listAnnouncements(p);
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ id: a.id, kind: "drift", title: "Drift title", proposal: prop.id });
    expect(buildSnapshot(p).announcements[0]).toMatchObject({ kind: "drift", title: "Drift title", phase: "writing-proposal" });
    expect(announcementNote(p, a.id, "drift")).toBeNull();
    submitProposal(p, prop.id);
    expect(listAnnouncements(p)).toHaveLength(1);
    deliverCard(p, a.id, "drift");
    expect(listAnnouncements(p)).toHaveLength(0);
  });

  test("discarding a Draft bound to a Drift announcement withdraws it", () => {
    const a = announce(p, { kind: "drift", title: "Drift title", chat: "editor" });
    const prop = newProposal(p, "Draft title", "", { announcement: a.id, origin: { chat: "editor" } });
    discardProposal(p, prop.id);
    expect(listAnnouncements(p)).toHaveLength(0);
  });
});

describe("announcements do not expire with time or activity", () => {
  test("announcements retain their timestamps when other cards are announced or delivered", () => {
    const first = announce(p, { kind: "task", title: "First" }, t(0));
    const other = announce(p, { kind: "task", title: "Other" }, t(10));
    expect(getAnnouncement(p, first.id)?.touched).toBe(t(0).toISOString());
    deliverCard(p, other.id, "task");
    expect(getAnnouncement(p, first.id)?.touched).toBe(t(0).toISOString());
    expect(listAnnouncements(p)).toHaveLength(1);
  });

  test("announcements remain listed regardless of age", () => {
    const announcement = announce(p, { kind: "task", title: "Waiting" }, t(0));
    expect(listAnnouncements(p).map((a) => a.id)).toEqual([announcement.id]);
  });
});

test("binding a Draft updates only its announcement timestamp and keeps association", () => {
  const other = announce(p, { kind: "task", title: "Other" }, t(0));
  const announcement = announce(p, { kind: "proposal", title: "Planned", source: "request", terminal: "ab12cd" }, t(1));
  bindDraft(p, { id: "draft001", title: "Current" }, announcement.id, { terminal: "ab12cd" }, t(10));
  expect(getAnnouncement(p, announcement.id)).toMatchObject({ proposal: "draft001", title: "Current", touched: t(10).toISOString() });
  expect(getAnnouncement(p, other.id)?.touched).toBe(t(0).toISOString());
});

describe("the terminal an announcement belongs to", () => {
  test("is kept in the file, and is none for an announcement written without it", () => {
    const mine = announce(p, { kind: "task", title: "Mine", terminal: "ab12cd" });
    announce(p, { kind: "task", title: "Nobody's" });
    expect(listAnnouncements(p).map((a) => [a.title, a.terminal])).toEqual([["Mine", "ab12cd"], ["Nobody's", null]]);

    // Written before the field existed: no `terminal` line at all.
    writeFileSync(join(announcementsDir(p), "old001.md"), "---\nkind: task\nsource: agent\nproposal: null\ntouched: 2026-01-01T10:00:00.000Z\n---\n# Old\n");
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
    const unknown = run(["--root", dir, "drift", "new", "Late refund", "--where", "src/refund.ts", "--ref", "order/Shipped", "--happens", "The code refunds late.", "--should", "The Model forbids it.", "--announcement", "zzzzzz", ...driftOptions], dir, {});
    expect(unknown.out).toContain('No announcement "zzzzzz" was found');
    expect(() => run(["announce", "card", "x"], dir, {})).toThrow(/The kind must be one of/);
  });

  test("a Draft in another terminal leaves the request untouched and creates its own announcement", () => {
    const request = announce(p, { kind: "proposal", title: "Request", source: "request", terminal: "ab12cd" });
    run(["proposal", "new", "Draft"], dir, { TRAMA_TERMINAL: "zz99yy" });
    expect(listAnnouncements(p).map((a) => [a.title, a.proposal !== null, a.terminal])).toEqual([
      ["Request", false, "ab12cd"],
      ["Draft", true, "zz99yy"],
    ]);
    expect(getAnnouncement(p, request.id)?.proposal).toBeNull();
  });
});

describe("an announcement made by Cursor's chat agent", () => {
  test("carries chat: cursor only without TRAMA_TERMINAL, writes the field only when set, and reads old files", () => {
    const chat = run(["announce", "task", "From the chat"], dir, { CURSOR_AGENT: "1" }).out;
    const both = run(["announce", "task", "Terminal wins"], dir, { CURSOR_AGENT: "1", TRAMA_TERMINAL: "ab12cd" }).out;
    const neither = run(["announce", "task", "Developer"], dir, { CURSOR_AGENT: "0" }).out;
    expect([chat, both, neither].map((id) => [getAnnouncement(p, id)?.chat, getAnnouncement(p, id)?.terminal])).toEqual([["cursor", null], [null, "ab12cd"], ["editor", null]]);
    expect(readFileSync(join(announcementsDir(p), `${chat}.md`), "utf8")).toContain("chat: cursor");
    expect(readFileSync(join(announcementsDir(p), `${both}.md`), "utf8")).not.toContain("chat");

    withdrawAll(p);
    run(["proposal", "new", "Own ghost"], dir, { CURSOR_AGENT: "1" });
    expect(listAnnouncements(p).map((a) => [a.title, a.chat])).toEqual([["Own ghost", "cursor"]]);

    // Written before the field existed: no `chat` line at all.
    writeFileSync(join(announcementsDir(p), "old001.md"), "---\nkind: task\nsource: agent\nproposal: null\ntouched: 2026-01-01T10:00:00.000Z\n---\n# Old\n");
    expect(getAnnouncement(p, "old001")?.chat).toBeNull();
  });
});

describe("a check", () => {
  test("is announced with its phase, moves forward only, and is delivered by done with its file gone", async () => {
    const id = run(["announce", "check", "Final check after Task T3", "--phase", "verifying"], dir, { TRAMA_TERMINAL: "ab12cd" }).out;
    const check = getAnnouncement(p, id);
    expect([check?.kind, check?.phase, check?.source, check?.proposal, check?.terminal]).toEqual(["check", "verifying", "agent", null, "ab12cd"]);
    expect(buildSnapshot(p).announcements.map((a) => [a.kind, a.phase])).toEqual([["check", "verifying"]]);

    expect(JSON.parse(run(["--json", "announce", "phase", id, "scanning"], dir, {}).out).outcome).toBe("changed");
    expect(getAnnouncement(p, id)?.phase).toBe("scanning");
    expect(run(["announce", "phase", id, "scanning"], dir, {}).out).toContain("already scanning");
    expect(() => run(["announce", "phase", id, "verifying"], dir, {})).toThrow(/cannot move back to verifying/);
    expect(getAnnouncement(p, id)?.phase).toBe("scanning");
    expect(() => run(["announce", "phase", id, "bogus"], dir, {})).toThrow(/must be one of verifying, scanning, history/);

    expect(run(["announce", "done", id], dir, {}).out).toBe(`Check ${id} is done`);
    await settleCoordinatorMessages();
    expect(existsSync(join(announcementsDir(p), `${id}.md`))).toBe(false);
  });

  test("moves from verifying or scanning to history, and a History check cannot go back", () => {
    const fromVerifying = run(["announce", "check", "Final check after Task T3", "--phase", "verifying"], dir, { TRAMA_TERMINAL: "ab12cd" }).out;
    expect(JSON.parse(run(["--json", "announce", "phase", fromVerifying, "history"], dir, {}).out).outcome).toBe("changed");
    expect(getAnnouncement(p, fromVerifying)?.phase).toBe("history");
    expect(buildSnapshot(p).announcements.find((a) => a.id === fromVerifying)?.phase).toBe("history");
    expect(run(["announce", "phase", fromVerifying, "history"], dir, {}).out).toContain("already history; nothing changed");
    expect(() => run(["announce", "phase", fromVerifying, "scanning"], dir, {})).toThrow(/cannot move back to scanning/);
    expect(() => run(["announce", "phase", fromVerifying, "verifying"], dir, {})).toThrow(/cannot move back to verifying/);
    expect(getAnnouncement(p, fromVerifying)?.phase).toBe("history");

    const fromScanning = run(["announce", "check", "Final check after Task T4", "--phase", "scanning"], dir, {}).out;
    expect(run(["announce", "phase", fromScanning, "history"], dir, {}).out).toContain("is now history");
    expect(() => run(["announce", "phase", fromScanning, "verifying"], dir, {})).toThrow(/cannot move back to verifying/);
    expect(getAnnouncement(p, fromScanning)?.phase).toBe("history");
    expect(() => run(["announce", "check", "Late check", "--phase", "history"], dir, {})).toThrow(/--phase must be one of verifying, scanning/);
    withdrawAll(p);
  });
  test("a finished check hands its outcome to the caller with its job, and forgetting it leaves nothing to finish", () => {
    const id = run(["announce", "check", "Final check after completed Task", "--phase", "verifying", "--job", "run-7"], dir, { TRAMA_TERMINAL: "ab12cd" }).out;
    const touched = getAnnouncement(p, id)!.touched;
    expect(checkOutcome(p, id, true)).toEqual({ id, title: "Final check after completed Task", phase: "verifying", terminal: "ab12cd", chat: null, job: "run-7", touched, failed: true });
    forgetCheck(p, id);
    expect(checkOutcome(p, id)).toBeNull();
  });
  test("a check announced in a terminal takes the job from TRAMA_JOB unless --job names another", () => {
    const fromEnv = run(["announce", "check", "Final check after all Tasks", "--phase", "verifying"], dir, { TRAMA_TERMINAL: "ab12cd", TRAMA_JOB: "run-9" }).out;
    const explicit = run(["announce", "check", "Final check after all Tasks", "--phase", "verifying", "--job", "run-7"], dir, { TRAMA_TERMINAL: "ab12cd", TRAMA_JOB: "run-9" }).out;
    expect([getAnnouncement(p, fromEnv)?.job, getAnnouncement(p, explicit)?.job]).toEqual(["run-9", "run-7"]);
    withdrawAll(p);
  });
  test("a failed final check is finished with no success outcome", async () => {
    const id = run(["announce", "check", "Final check after completed Task", "--phase", "verifying"], dir, {}).out;
    expect(JSON.parse(run(["--json", "announce", "done", id, "--failed"], dir, {}).out).outcome).toBe("failed");
    await settleCoordinatorMessages();
    expect(listAnnouncements(p).map((a) => a.id)).not.toContain(id);
  });
  /** Runs `body` while a live editor answers the coordinator messages of the command with `onMessage`. */
  async function withEditor(onMessage: (message: Record<string, unknown>) => void | Promise<void>, body: () => Promise<void>) {
    const previousRuntime = process.env.XDG_RUNTIME_DIR;
    const runtimeRoot = mkdtempSync(process.platform === "win32" ? join(tmpdir(), "trama-check-phase-") : "/tmp/trama-cp-");
    process.env.XDG_RUNTIME_DIR = runtimeRoot;
    const runtimeName = process.platform === "win32" ? "trama-q" : `trama-q-${process.getuid!()}`;
    const server = await createQuestionServer({ project: p, runtimeDir: join(runtimeRoot, runtimeName), handler: async () => ({ status: "unavailable", reason: "No project coordinator is available." }), onCoordinatorMessage: onMessage });
    try {
      await body();
    } finally {
      await server.dispose();
      if (previousRuntime === undefined) delete process.env.XDG_RUNTIME_DIR;
      else process.env.XDG_RUNTIME_DIR = previousRuntime;
      rmSync(runtimeRoot, { recursive: true, force: true });
    }
  }
  test("moving a check to scanning tells the editor its job, and a move that changes nothing tells it nothing", async () => {
    const received: Record<string, unknown>[] = [];
    await withEditor((message) => { received.push(message); }, async () => {
      const id = run(["announce", "check", "Final check after completed Task", "--phase", "verifying", "--job", "run-7"], dir, {}).out;
      run(["announce", "phase", id, "scanning"], dir, {});
      await settleCoordinatorMessages();
      run(["announce", "phase", id, "scanning"], dir, {});
      await settleCoordinatorMessages();
      expect(received).toHaveLength(1);
      expect(received[0]).toEqual(expect.objectContaining({ type: "check-phase", id, phase: "scanning", job: "run-7" }));
    });
  });
  test("the ghost of a finished check goes only after the editor has heard of its outcome", async () => {
    const received: Record<string, unknown>[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    await withEditor(async (message) => { received.push(message); await gate; }, async () => {
      const id = run(["announce", "check", "Final check after all Tasks", "--phase", "verifying"], dir, {}).out;
      expect(run(["announce", "done", id], dir, {}).exit).toBe(0);
      expect(existsSync(join(announcementsDir(p), `${id}.md`))).toBe(true);
      release();
      await settleCoordinatorMessages();
      expect(received).toEqual([expect.objectContaining({ type: "check", id, failed: false })]);
      expect(existsSync(join(announcementsDir(p), `${id}.md`))).toBe(false);
    });
  });


  test("needs --phase, which no other kind takes", () => {
    expect(() => run(["announce", "check", "Scan of the System"], dir, {})).toThrow(/needs --phase/);
    expect(() => run(["announce", "task", "Refunds", "--phase", "scanning"], dir, {})).toThrow(/only for a check/);
    expect(() => run(["announce", "check", "Scan", "--phase", "testing"], dir, {})).toThrow(/--phase must be one of/);
    expect(readFileSync(join(announcementsDir(p), `${run(["announce", "task", "Plain"], dir, {}).out}.md`), "utf8")).not.toContain("phase");
  });

  test("an ID that is unknown, finished or not a check succeeds and says the check was not found", () => {
    const task = run(["announce", "task", "Refunds"], dir, {}).out;
    for (const id of ["zzzzzz", task]) {
      for (const args of [["phase", id, "scanning"], ["done", id]]) {
        const result = run(["announce", ...args], dir, {});
        expect([result.exit, result.out.includes(`No check "${id}" was found`)]).toEqual([0, true]);
      }
    }
    expect(getAnnouncement(p, task)?.kind).toBe("task");
  });

  test("changing a check phase updates its touched timestamp without refreshing other announcements", () => {
    const task = announce(p, { kind: "task", title: "Old" }, t(0));
    const check = announce(p, { kind: "check", title: "Final check after all Tasks", phase: "verifying" }, t(10));
    changeCheckPhase(p, check.id, "scanning", t(20));
    expect(getAnnouncement(p, task.id)?.touched).toBe(t(0).toISOString());
    expect(getAnnouncement(p, check.id)?.touched).toBe(t(20).toISOString());
  });
});

test("the developer's decision to fix the code does not change announcement timestamps", () => {
  const opts = [{ title: "Change the code", text: "Make the code do it." }, { title: "Other", text: "Another way." }];
  const drift = newDrift(p, { where: "src/refund.ts", title: "D", refs: ["order"], happens: "Code does it.", should: "Model says so.", options: opts });
  const a = announce(p, { kind: "task", title: "Waiting" }, new Date("2026-01-01T10:00:00Z"));
  resolveDrift(p, drift.id, "fix-code", [], { option: 1 });
  expect(getAnnouncement(p, a.id)?.touched).toBe("2026-01-01T10:00:00.000Z");
});

describe("a Draft attached to an open Drift", () => {
  const opts = [{ title: "Change the code", text: "Make the code do it." }, { title: "Other", text: "Another way." }];

  test("its Proposal ghost is drawn nowhere, but the ghost of a Drift bound to a Draft stays", () => {
    const a = announce(p, { kind: "proposal", title: "Design", chat: "editor" });
    const draft = newProposal(p, "Archived with a Drift", "", { origin: { chat: "editor" } });
    bindDraft(p, draft, a.id, { chat: "editor" });
    const ghosts = () => buildSnapshot(p).announcements.map((v) => v.id);
    expect(ghosts()).toContain(a.id);
    newDrift(p, { where: "src/refund.ts", title: "D", refs: ["order"], happens: "Code does it.", should: "Model says so.", options: opts, proposal: draft.id });
    expect(ghosts()).not.toContain(a.id);
    const own = announce(p, { kind: "drift", title: "D2", proposal: draft.id });
    expect(ghosts()).toContain(own.id);
  });

  test("keeping the code withdraws no announcement, and a leftover `drift` field is ignored and never rewritten", () => {
    const drift = newDrift(p, { where: "src/refund.ts", title: "D", refs: ["order"], happens: "Code does it.", should: "Model says so.", options: opts });
    const a = announce(p, { kind: "proposal", title: "Old rework", source: "request" });
    const file = join(announcementsDir(p), `${a.id}.md`);
    writeFileSync(file, readFileSync(file, "utf8").replace("source: request", `source: request\ndrift: ${drift.id}`));
    expect("drift" in (getAnnouncement(p, a.id) as object)).toBe(false);
    resolveDrift(p, drift.id, "fix-code", [], { option: 1 });
    expect(listAnnouncements(p).map((x) => x.id)).toEqual([a.id]);
    expect(readFileSync(file, "utf8")).toContain("drift:");
  });
});
