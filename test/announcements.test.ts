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
  declareNote,
  deliverCard,
  deliverComparison,
  getAnnouncement,
  listAnnouncements,
  resolutionTitle,
  newTerminalId,
  terminalFromEnv,
  bindConversation,
  originFromEnv,
  checkOutcome,
  forgetCheck,
  withdrawAll,
  removeBoundTo,
} from "../src/core/announcements";
import { cardName } from "../src/core/short-numbers";
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

/** `trama announcement new` with this input. */
const announcementNew = (input: Record<string, unknown>, env: Record<string, string | undefined> = {}) => run(["announcement", "new", "--input", JSON.stringify(input)], dir, env);
/** `trama announcement move` of a check. */
const announcementMove = (id: string, state: string, env: Record<string, string | undefined> = {}, ...common: string[]) => run([...common, "announcement", "move", id, state], dir, env);

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

  test("a comparison keeps its ghost and its title while its Drafts join its list, and it counts as no card", () => {
    const comparison = announce(p, { kind: "comparison", title: "Comparing Refunds", machine: "Refunds", chat: "editor" });
    expect(comparison).toMatchObject({ kind: "comparison", machine: "Refunds", proposals: [], phase: null, proposal: null });
    const draft = newProposal(p, "Lighter comparison", "", { announcement: comparison.id, origin: { chat: "editor" } });
    expect(getAnnouncement(p, comparison.id)).toMatchObject({ title: "Comparing Refunds", proposals: [draft.id], proposal: null });
    expect(listAnnouncements(p)).toHaveLength(1);
    expect(announcementNote(p, comparison.id, "proposal")).toBeNull();
    removeBoundTo(p, draft.id);
    expect(getAnnouncement(p, comparison.id)?.proposals).toEqual([]);
    deliverComparison(p, comparison.id);
    expect(getAnnouncement(p, comparison.id)).toBeNull();
  });


  test("an announcement cannot have an empty title", () => {
    expect(() => announce(p, { kind: "task", title: "  " })).toThrow(/title/);
  });

  test("a Resolve Drifts ghost is a Proposal that names its Drifts and keeps its title when a Draft takes it", () => {
    expect(resolutionTitle(p, [])).toBeUndefined();
    expect(resolutionTitle(p, ["a1b2c3d4"])).toBe(`Resolving Drift ${cardName(p, "drift", "a1b2c3d4")}`);
    const resolve = announce(p, { kind: "proposal", title: "Resolve Drifts", drifts: ["a1b2c3d4"], source: "request", terminal: "ab12cd" }, t(1));
    const prop = newProposal(p, "Draft", "", { origin: { terminal: "ab12cd" } });
    expect(getAnnouncement(p, resolve.id)).toMatchObject({ kind: "proposal", drifts: ["a1b2c3d4"], proposal: prop.id, title: "Resolve Drifts" });
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

  test("an agent's Drift announcement takes over the one Trama announced for Unify Drifts in its terminal and keeps its title; another terminal's is left alone", () => {
    const launched = announce(p, { kind: "drift", title: "Unifying 3 Drifts", source: "request", terminal: "ab12cd" }, t(1));
    const foreign = announce(p, { kind: "drift", title: "Unifying 2 Drifts", source: "request", terminal: "zz99yy" }, t(2));
    const adopted = announce(p, { kind: "drift", title: "Unifying 3 Drifts", terminal: "ab12cd" }, t(3));
    expect(adopted).toMatchObject({ id: launched.id, title: "Unifying 3 Drifts" });
    expect(listAnnouncements(p).map((a) => a.id).sort()).toEqual([launched.id, foreign.id].sort());
    // An agent's Drift announced in a terminal with no Trama one is its own.
    expect(announce(p, { kind: "drift", title: "Other", terminal: "qq11ww" }, t(4)).id).not.toBe(launched.id);
    // The ghost Trama announced at launch is the Unify one; the agent's own Drift is a plain Drift.
    expect(buildSnapshot(p).announcements.find((x) => x.id === launched.id)).toMatchObject({ kind: "unify", title: "Unifying 3 Drifts", phase: "preparing" });
    expect(buildSnapshot(p).announcements.find((x) => x.title === "Other")?.kind).toBe("drift");
  });
});

describe("a Draft and its announcement", () => {
  test("an explicitly named announcement is bound only when it belongs to the same origin", () => {
    const a = announce(p, { kind: "proposal", title: "Planned", terminal: "ab12cd" });
    const prop = newProposal(p, "Real title", "", { announcement: a.id, origin: { terminal: "ab12cd" } });
    expect(listAnnouncements(p)).toHaveLength(1);
    expect(buildSnapshot(p).announcements).toEqual([{ id: a.id, kind: "proposal", title: "Real title", phase: "writing", notes: [], announced: a.announced }]);
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
        const result = run(["--json", "proposal", "new", "--input", JSON.stringify({ title: "Without ghost", announcement: id })], dir, { CURSOR_AGENT: "0" });
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
    const id = announcementNew({ kind: "task", title: "From a terminal" }, { TRAMA_TERMINAL: "ab12cd" }).out;
    expect(getAnnouncement(p, id)?.terminal).toBe("ab12cd");
    expect(getAnnouncement(p, announcementNew({ kind: "task", title: "Outside" }).out)?.terminal).toBeNull();

    withdrawAll(p);
    run(["proposal", "new", "--input", JSON.stringify({ title: "Own ghost" })], dir, { TRAMA_TERMINAL: "ab12cd" });
    expect(listAnnouncements(p).map((a) => [a.title, a.terminal])).toEqual([["Own ghost", "ab12cd"]]);
  });

  test("an announced Task or Drift is delivered by creating it with --announcement, and an unknown ID only adds a note", () => {
    const announced = (kind: string, title: string) => announcementNew({ kind, title }).out;
    const taskAnnouncement = announced("task", "Refunds");
    expect(listAnnouncements(p).map((a) => a.kind)).toEqual(["task"]);
    run(["--root", dir, "task", "new", "--input", JSON.stringify({ title: "Refunds", refs: ["order/Refunding"], announcement: taskAnnouncement })], dir, {});
    expect(listAnnouncements(p)).toEqual([]);

    const driftInput = { title: "Late refund", where: "src/refund.ts", refs: ["order/Shipped"], happens: "The code refunds late.", should: "The Model forbids it.", announcement: "zzzzzz", options: [{ title: "Change the code", text: "Make it so." }, { title: "Remove the code", text: "Drop it." }] };
    const unknown = run(["--root", dir, "drift", "new", "--input", JSON.stringify(driftInput)], dir, {});
    expect(unknown.out).toContain('No announcement "zzzzzz" was found');
    expect(() => announcementNew({ kind: "card", title: "x" })).toThrow(/kind: Invalid option/);
  });

  test("a Draft in another terminal leaves the request untouched and creates its own announcement", () => {
    const request = announce(p, { kind: "proposal", title: "Request", source: "request", terminal: "ab12cd" });
    run(["proposal", "new", "--input", JSON.stringify({ title: "Draft" })], dir, { TRAMA_TERMINAL: "zz99yy" });
    expect(listAnnouncements(p).map((a) => [a.title, a.proposal !== null, a.terminal])).toEqual([
      ["Request", false, "ab12cd"],
      ["Draft", true, "zz99yy"],
    ]);
    expect(getAnnouncement(p, request.id)?.proposal).toBeNull();
  });
});

describe("an announcement made by Cursor's chat agent", () => {
  test("carries chat: cursor only without TRAMA_TERMINAL, writes the field only when set, and reads old files", () => {
    const chat = announcementNew({ kind: "task", title: "From the chat" }, { CURSOR_AGENT: "1" }).out;
    const both = announcementNew({ kind: "task", title: "Terminal wins" }, { CURSOR_AGENT: "1", TRAMA_TERMINAL: "ab12cd" }).out;
    const neither = announcementNew({ kind: "task", title: "Developer" }, { CURSOR_AGENT: "0" }).out;
    expect([chat, both, neither].map((id) => [getAnnouncement(p, id)?.chat, getAnnouncement(p, id)?.terminal])).toEqual([["cursor", null], [null, "ab12cd"], ["editor", null]]);
    expect(readFileSync(join(announcementsDir(p), `${chat}.md`), "utf8")).toContain("chat: cursor");
    expect(readFileSync(join(announcementsDir(p), `${both}.md`), "utf8")).not.toContain("chat");

    withdrawAll(p);
    run(["proposal", "new", "--input", JSON.stringify({ title: "Own ghost" })], dir, { CURSOR_AGENT: "1" });
    expect(listAnnouncements(p).map((a) => [a.title, a.chat])).toEqual([["Own ghost", "cursor"]]);

    // Written before the field existed: no `chat` line at all.
    writeFileSync(join(announcementsDir(p), "old001.md"), "---\nkind: task\nsource: agent\nproposal: null\ntouched: 2026-01-01T10:00:00.000Z\n---\n# Old\n");
    expect(getAnnouncement(p, "old001")?.chat).toBeNull();
  });
});

describe("a check", () => {
  test("is announced with its phase, moves forward only, and is delivered by done with its file gone", async () => {
    const id = announcementNew({ kind: "check", title: "Final check after Task T3", phase: "verifying" }, { TRAMA_TERMINAL: "ab12cd" }).out;
    const check = getAnnouncement(p, id);
    expect([check?.kind, check?.phase, check?.source, check?.proposal, check?.terminal]).toEqual(["check", "verifying", "agent", null, "ab12cd"]);
    expect(buildSnapshot(p).announcements.map((a) => [a.kind, a.phase])).toEqual([["check", "verifying"]]);

    expect(JSON.parse(announcementMove(id, "scanning", {}, "--json").out).outcome).toBe("changed");
    expect(getAnnouncement(p, id)?.phase).toBe("scanning");
    expect(announcementMove(id, "scanning").out).toContain("already scanning");
    expect(() => announcementMove(id, "verifying")).toThrow(/<state> must be one of scanning, history, delivered, failed/);
    expect(getAnnouncement(p, id)?.phase).toBe("scanning");
    expect(() => announcementMove(id, "bogus")).toThrow(/must be one of scanning, history, delivered, failed/);

    expect(announcementMove(id, "delivered").out).toBe(`Check ${id} is done`);
    expect(existsSync(join(announcementsDir(p), `${id}.md`))).toBe(false);
  });

  test("moves from verifying or scanning to history, and a History check cannot go back", () => {
    const fromVerifying = announcementNew({ kind: "check", title: "Final check after Task T3", phase: "verifying" }, { TRAMA_TERMINAL: "ab12cd" }).out;
    expect(JSON.parse(announcementMove(fromVerifying, "history", {}, "--json").out).outcome).toBe("changed");
    expect(getAnnouncement(p, fromVerifying)?.phase).toBe("history");
    expect(buildSnapshot(p).announcements.find((a) => a.id === fromVerifying)?.phase).toBe("history");
    expect(announcementMove(fromVerifying, "history").out).toContain("already history; nothing changed");
    expect(() => announcementMove(fromVerifying, "scanning")).toThrow(/cannot move back to scanning/);
    expect(() => announcementMove(fromVerifying, "verifying")).toThrow(/<state> must be one of/);
    expect(getAnnouncement(p, fromVerifying)?.phase).toBe("history");

    const fromScanning = announcementNew({ kind: "check", title: "Final check after Task T4", phase: "scanning" }).out;
    expect(announcementMove(fromScanning, "history").out).toContain("is now history");
    expect(() => announcementMove(fromScanning, "scanning")).toThrow(/cannot move back to scanning/);
    expect(getAnnouncement(p, fromScanning)?.phase).toBe("history");
    expect(() => announcementNew({ kind: "check", title: "Late check", phase: "history" })).toThrow(/phase: Invalid option/);
    withdrawAll(p);
  });
  test("a finished check hands its outcome to the caller, and forgetting it leaves nothing to finish", () => {
    const id = announcementNew({ kind: "check", title: "Final check after completed Task", phase: "verifying" }, { TRAMA_TERMINAL: "ab12cd" }).out;
    const touched = getAnnouncement(p, id)!.touched;
    expect(checkOutcome(p, id, true)).toEqual({ id, title: "Final check after completed Task", phase: "verifying", terminal: "ab12cd", chat: null, touched, failed: true });
    forgetCheck(p, id);
    expect(checkOutcome(p, id)).toBeNull();
  });
  test("an announcement takes no job: the input is refused, nothing is written and a leftover job line is ignored", () => {
    expect(() => announcementNew({ kind: "check", title: "Final check after all Tasks", phase: "verifying", job: "run-7" })).toThrow(/job/);
    const id = announcementNew({ kind: "check", title: "Final check after all Tasks", phase: "verifying" }, { TRAMA_TERMINAL: "ab12cd", TRAMA_JOB: "run-9" }).out;
    expect(readFileSync(join(announcementsDir(p), `${id}.md`), "utf8")).not.toContain("job");
    const file = join(announcementsDir(p), `${id}.md`);
    writeFileSync(file, readFileSync(file, "utf8").replace("phase: verifying", "phase: verifying\njob: old-run"));
    expect("job" in (getAnnouncement(p, id) as object)).toBe(false);
    withdrawAll(p);
  });
  test("a failed final check is finished like a delivered one, with only the outcome told apart", () => {
    const failed = announcementNew({ kind: "check", title: "Final check after completed Task", phase: "verifying" }).out;
    const done = announcementNew({ kind: "check", title: "Final check after Task T3", phase: "verifying" }).out;
    expect(JSON.parse(announcementMove(failed, "failed", {}, "--json").out)).toEqual({ id: failed, found: true, outcome: "failed" });
    expect(JSON.parse(announcementMove(done, "delivered", {}, "--json").out)).toEqual({ id: done, found: true, outcome: "done" });
    expect(JSON.parse(announcementMove("zzzzzz", "failed", {}, "--json").out)).toEqual({ id: "zzzzzz", found: false });
    expect(listAnnouncements(p)).toEqual([]);
  });


  test("needs --phase, which no other kind takes", () => {
    expect(() => announcementNew({ kind: "check", title: "Scan of the System" })).toThrow(/phase: is required for a check: verifying or scanning/);
    expect(() => announcementNew({ kind: "task", title: "Refunds", phase: "scanning" })).toThrow(/phase: is only for a check/);
    expect(() => announcementNew({ kind: "check", title: "Scan", phase: "testing" })).toThrow(/phase: Invalid option/);
    expect(readFileSync(join(announcementsDir(p), `${announcementNew({ kind: "task", title: "Plain" }).out}.md`), "utf8")).not.toContain("phase");
  });

  test("an ID that is unknown, finished or not a check succeeds and says the check was not found", () => {
    const task = announcementNew({ kind: "task", title: "Refunds" }).out;
    for (const id of ["zzzzzz", task]) {
      for (const state of ["scanning", "history", "delivered", "failed"]) {
        const result = announcementMove(id, state);
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

describe("announcements with the conversation", () => {
  const scanningRequest = (extra: Record<string, unknown>, minutes: number) =>
    announce(p, { kind: "check", title: "Scanning System", phase: "scanning", source: "request", ...extra }, t(minutes));

  test("TRAMA_CHAT gives a Cursor chat announcement its conversation, and the file keeps it", () => {
    expect(originFromEnv({ CURSOR_AGENT: "1", TRAMA_CHAT: "conv-1" })).toEqual({ chat: "cursor", conversation: "conv-1" });
    expect(originFromEnv({ TRAMA_CHAT: "conv-1" })).toEqual({ chat: "editor" });
    expect(originFromEnv({ TRAMA_TERMINAL: "abc123", CURSOR_AGENT: "1", TRAMA_CHAT: "conv-1" })).toEqual({ terminal: "abc123" });
    const id = announcementNew({ kind: "task", title: "From chat" }, { CURSOR_AGENT: "1", TRAMA_CHAT: "conv-1" }).out.trim();
    expect(getAnnouncement(p, id)).toMatchObject({ chat: "cursor", conversation: "conv-1", terminal: null });
    expect(readFileSync(join(dir, ".trama/announcements", `${id}.md`), "utf8")).toContain("conversation: conv-1");
    const plain = announcementNew({ kind: "task", title: "No conversation" }, { CURSOR_AGENT: "1" }).out.trim();
    expect(getAnnouncement(p, plain)?.conversation).toBeNull();
    expect(readFileSync(join(dir, ".trama/announcements", `${plain}.md`), "utf8")).not.toContain("\nconversation:");
  });

  test("a conversation takes its own scan check, or a Trama one with no conversation yet, never another conversation's", () => {
    const other = scanningRequest({ chat: "cursor", conversation: "conv-2" }, 1);
    const unbound = scanningRequest({ chat: "cursor" }, 2);
    const mine = scanningRequest({ chat: "cursor", conversation: "conv-1" }, 3);
    // The oldest of its own or of the chat with no conversation: the unbound one, which learns the conversation.
    const first = announce(p, { kind: "check", title: "Scan", phase: "scanning", chat: "cursor", conversation: "conv-1" }, t(4));
    expect(first.id).toBe(unbound.id);
    expect(getAnnouncement(p, unbound.id)).toMatchObject({ conversation: "conv-1", title: "Scanning System", touched: t(4).toISOString() });
    expect(getAnnouncement(p, other.id)?.touched).toBe(t(1).toISOString());
    expect(getAnnouncement(p, mine.id)?.touched).toBe(t(3).toISOString());
    expect(listAnnouncements(p)).toHaveLength(3);
  });

  test("a conversation never takes another conversation's check, and creates its own check instead", () => {
    const other = scanningRequest({ chat: "cursor", conversation: "conv-2" }, 1);
    const own = announce(p, { kind: "check", title: "Scan", phase: "scanning", chat: "cursor", conversation: "conv-1" }, t(2));
    expect(own.id).not.toBe(other.id);
    expect(own.conversation).toBe("conv-1");
    expect(getAnnouncement(p, other.id)?.touched).toBe(t(1).toISOString());
  });

  test("a chat command without conversation takes only a Trama check with no conversation", () => {
    const other = scanningRequest({ chat: "cursor", conversation: "conv-2" }, 1);
    const unbound = scanningRequest({ chat: "cursor" }, 2);
    const taken = announce(p, { kind: "check", title: "Scan", phase: "scanning", chat: "cursor" }, t(3));
    expect(taken.id).toBe(unbound.id);
    expect(getAnnouncement(p, unbound.id)?.conversation).toBeNull();
    expect(getAnnouncement(p, other.id)?.touched).toBe(t(1).toISOString());
  });

  test("bindConversation writes the conversation only into a waiting Cursor announcement that has none", () => {
    const a = announce(p, { kind: "proposal", title: "Design", source: "request", chat: "cursor" });
    expect(bindConversation(p, a.id, "conv-1")).toBe(true);
    expect(getAnnouncement(p, a.id)).toMatchObject({ conversation: "conv-1", title: "Design" });
    expect(bindConversation(p, a.id, "conv-2")).toBe(false);
    expect(bindConversation(p, "zzzzzz", "conv-1")).toBe(false);
    const terminal = announce(p, { kind: "work", title: "Import", source: "request", terminal: "ab12cd" });
    expect(bindConversation(p, terminal.id, "conv-1")).toBe(false);
  });
});

describe("notes on announcements", () => {
  const noteCommand = (input: Record<string, unknown>, env: Record<string, string | undefined> = {}, ...args: string[]) =>
    run(["announcement", "edit", ...args, "--input", JSON.stringify(input)], dir, env);
  const fileOf = (id: string) => readFileSync(join(dir, ".trama/announcements", `${id}.md`), "utf8");

  test("a note on one announcement keeps its phase, title, touched and Draft, in every kind and phase", () => {
    const proposal = announce(p, { kind: "proposal", title: "Design" }, t(1));
    const writing = announce(p, { kind: "proposal", title: "Writing design", proposal: "abcd1234" }, t(2));
    const check = announce(p, { kind: "check", title: "Final check", phase: "verifying" }, t(3));
    const scanning = announce(p, { kind: "check", title: "Scan", phase: "scanning" }, t(4));
    const history = announce(p, { kind: "check", title: "History", phase: "history" }, t(5));
    const work = announce(p, { kind: "work", title: "Import", source: "request" }, t(6));
    const comparison = announce(p, { kind: "comparison", title: "Comparing order", machine: "order" }, t(7));
    for (const a of [proposal, writing, check, scanning, history, work, comparison]) {
      const out = noteCommand({ note: "Reads the code" }, {}, a.id);
      expect(out.out).toContain(`Note saved on ${a.id}`);
      const after = getAnnouncement(p, a.id);
      expect(after).toMatchObject({ phase: a.phase, title: a.title, touched: a.touched, proposal: a.proposal, announced: a.announced, kind: a.kind });
      expect(after?.notes).toHaveLength(1);
      expect(after?.notes[0]?.text).toBe("Reads the code");
      expect(Number.isNaN(Date.parse(after?.notes[0]?.at ?? ""))).toBe(false);
    }
  });

  test("a note is one line: line breaks become spaces and the ends are trimmed; an empty note is a usage error", () => {
    const a = announce(p, { kind: "task", title: "Task" }, t(1));
    declareNote(p, { id: a.id, text: "  first line\nsecond line\r\n third  \n" }, t(2));
    expect(getAnnouncement(p, a.id)?.notes.map((n) => n.text)).toEqual(["first line second line third"]);
    expect(() => noteCommand({ note: " \n \t " }, {}, a.id)).toThrow(/cannot be empty/);
    expect(() => noteCommand({}, {}, a.id)).toThrow(/note/);
    expect(getAnnouncement(p, a.id)?.notes).toHaveLength(1);
  });

  test("a note over 120 characters is cut to 119 and an ellipsis, counted in Unicode characters, and the command says so", () => {
    const a = announce(p, { kind: "task", title: "Task" }, t(1));
    const long = "è".repeat(130);
    const out = noteCommand({ note: long }, {}, a.id, "--json");
    expect(JSON.parse(out.out)).toEqual({ announcements: [a.id], truncated: true });
    expect(getAnnouncement(p, a.id)?.notes[0]?.text).toBe(`${"è".repeat(119)}…`);
    const text = noteCommand({ note: "x".repeat(120) }, {}, a.id);
    expect(text.out).not.toContain("longer than");
    expect(getAnnouncement(p, a.id)?.notes[1]?.text).toBe("x".repeat(120));
    expect(noteCommand({ note: "😀".repeat(121) }, {}, a.id).out).toContain("longer than 120");
    expect(getAnnouncement(p, a.id)?.notes[2]?.text).toBe(`${"😀".repeat(119)}…`);
  });

  test("an announcement keeps 6 notes, the oldest leaves first, and a note equal to the last only renews its instant", () => {
    const a = announce(p, { kind: "task", title: "Task" }, t(0));
    for (let i = 1; i <= 8; i++) declareNote(p, { id: a.id, text: `step ${i}` }, t(i));
    expect(getAnnouncement(p, a.id)?.notes).toEqual([3, 4, 5, 6, 7, 8].map((i) => ({ at: t(i).toISOString(), text: `step ${i}` })));
    declareNote(p, { id: a.id, text: "step 8" }, t(20));
    declareNote(p, { id: a.id, text: "step\n8" }, t(21));
    const notes = getAnnouncement(p, a.id)?.notes ?? [];
    expect(notes).toHaveLength(6);
    expect(notes[5]).toEqual({ at: t(21).toISOString(), text: "step 8" });
    expect(notes[4]?.text).toBe("step 7");
    // Equal notes that are not in a row count each time.
    declareNote(p, { id: a.id, text: "step 7" }, t(22));
    expect(getAnnouncement(p, a.id)?.notes.map((n) => n.text)).toEqual(["step 4", "step 5", "step 6", "step 7", "step 8", "step 7"]);
  });

  test("with an identity the note goes only there; an unknown identity is an error that writes nothing", () => {
    const a = announce(p, { kind: "task", title: "A" }, t(1));
    const b = announce(p, { kind: "task", title: "B" }, t(2));
    noteCommand({ note: "only a" }, {}, a.id);
    expect(getAnnouncement(p, b.id)?.notes).toEqual([]);
    expect(() => noteCommand({ note: "nobody" }, {}, "zzzzzz")).toThrow(/zzzzzz/);
    expect(listAnnouncements(p).flatMap((x) => x.notes)).toHaveLength(1);
  });

  test("without an identity the note goes to every announcement of the terminal, a comparison excepted, and to no other", () => {
    const mine = announce(p, { kind: "task", title: "Mine", terminal: "ab12cd" }, t(1));
    const check = announce(p, { kind: "check", title: "Check", phase: "verifying", terminal: "ab12cd" }, t(2));
    const comparison = announce(p, { kind: "comparison", title: "Comparing order", machine: "order", terminal: "ab12cd" }, t(3));
    const other = announce(p, { kind: "task", title: "Other terminal", terminal: "zz99zz" }, t(4));
    const chat = announce(p, { kind: "task", title: "Chat", chat: "cursor" }, t(5));
    const out = noteCommand({ note: "Starts" }, { TRAMA_TERMINAL: "ab12cd" });
    expect(out.out.split("\n")).toEqual([`Note saved on ${mine.id}: Mine`, `Note saved on ${check.id}: Check`]);
    expect(JSON.parse(noteCommand({ note: "Next" }, { TRAMA_TERMINAL: "ab12cd" }, "--json").out)).toEqual({ announcements: [mine.id, check.id], truncated: false });
    for (const untouched of [comparison, other, chat]) expect(getAnnouncement(p, untouched.id)?.notes).toEqual([]);
    expect(getAnnouncement(p, mine.id)?.notes.map((n) => n.text)).toEqual(["Starts", "Next"]);
    // A comparison gets the note when it is named.
    noteCommand({ note: "Reads the code" }, { TRAMA_TERMINAL: "ab12cd" }, comparison.id);
    expect(getAnnouncement(p, comparison.id)?.notes.map((n) => n.text)).toEqual(["Reads the code"]);
  });

  test("a conversation reaches its own announcements and those of the project's chat; a chat without conversation only those that name none", () => {
    const own = announce(p, { kind: "task", title: "Own", chat: "cursor", conversation: "conv-1" }, t(1));
    const unbound = announce(p, { kind: "proposal", title: "Unbound", source: "request", chat: "cursor" }, t(2));
    const another = announce(p, { kind: "task", title: "Another", chat: "cursor", conversation: "conv-2" }, t(3));
    const editor = announce(p, { kind: "task", title: "Editor" }, t(4));
    const terminal = announce(p, { kind: "task", title: "Terminal", terminal: "ab12cd" }, t(5));
    expect(JSON.parse(noteCommand({ note: "Writes" }, { CURSOR_AGENT: "1", TRAMA_CHAT: "conv-1" }, "--json").out).announcements).toEqual([own.id, unbound.id]);
    expect(JSON.parse(noteCommand({ note: "Writes again" }, { CURSOR_AGENT: "1" }, "--json").out).announcements).toEqual([unbound.id, editor.id]);
    expect(JSON.parse(noteCommand({ note: "Plain" }, {}, "--json").out).announcements).toEqual([unbound.id, editor.id]);
    for (const untouched of [another, terminal]) expect(getAnnouncement(p, untouched.id)?.notes).toEqual([]);
  });

  test("with no announcement to go to the command says so, exits with 0 and writes nothing", () => {
    announce(p, { kind: "task", title: "Elsewhere", terminal: "zz99zz" }, t(1));
    const before = readdirSync(announcementsDir(p)).map((f) => (f === ".gitignore" ? "" : readFileSync(join(announcementsDir(p), f), "utf8")));
    const out = noteCommand({ note: "Nobody hears" }, { TRAMA_TERMINAL: "ab12cd" });
    expect(out.out).toBe("No announcement is waiting here; the note was not saved.");
    expect(JSON.parse(noteCommand({ note: "Nobody hears" }, { TRAMA_TERMINAL: "ab12cd" }, "--json").out)).toEqual({ announcements: [], truncated: false });
    expect(readdirSync(announcementsDir(p)).map((f) => (f === ".gitignore" ? "" : readFileSync(join(announcementsDir(p), f), "utf8")))).toEqual(before);
  });

  test("the file carries `notes` only once there are some, and a malformed value is ignored without losing the announcement", () => {
    const a = announce(p, { kind: "task", title: "Task" }, t(1));
    expect(fileOf(a.id)).not.toContain("notes");
    declareNote(p, { id: a.id, text: "Reads" }, t(2));
    expect(fileOf(a.id)).toContain(`notes:\n  - at: ${t(2).toISOString()}\n    text: Reads`);
    expect(getAnnouncement(p, a.id)?.touched).toBe(t(1).toISOString());
    const stamp = "touched: 2026-01-01T10:00:00.000Z";
    writeFileSync(join(announcementsDir(p), "bad001.md"), `---\nkind: task\nsource: agent\nproposal: null\n${stamp}\nnotes: yes\n---\n# Bad\n`);
    writeFileSync(join(announcementsDir(p), "bad002.md"), `---\nkind: task\nsource: agent\nproposal: null\n${stamp}\nnotes:\n  - at: now\n    text: no instant\n  - at: 2026-01-01T10:00:00.000Z\n  - text: no at\n  - at: 2026-01-01T10:01:00.000Z\n    text: fine\n---\n# Bad two\n`);
    expect(getAnnouncement(p, "bad001")?.notes).toEqual([]);
    expect(getAnnouncement(p, "bad002")?.notes).toEqual([{ at: "2026-01-01T10:01:00.000Z", text: "fine" }]);
  });

  test("other changes to an announcement keep its notes, and the Board snapshot carries `notes` and `announced`", () => {
    const check = announce(p, { kind: "check", title: "Final check", phase: "verifying" }, t(1));
    const bare = announce(p, { kind: "task", title: "Bare" }, t(2));
    declareNote(p, { id: check.id, text: "Verifies" }, t(3));
    changeCheckPhase(p, check.id, "scanning", t(4));
    expect(getAnnouncement(p, check.id)?.notes.map((n) => n.text)).toEqual(["Verifies"]);
    const views = buildSnapshot(p).announcements;
    expect(views.find((v) => v.id === check.id)).toMatchObject({ phase: "scanning", notes: [{ at: t(3).toISOString(), text: "Verifies" }], announced: check.announced });
    expect(views.find((v) => v.id === bare.id)).toMatchObject({ notes: [], announced: bare.announced });
  });

  test("a note does not count as the agent's activity", async () => {
    const { countsAsActivity } = await import("../src/cli/main");
    expect(countsAsActivity(["announcement", "edit", "--input", "{}"])).toBe(false);
    expect(countsAsActivity(["announcement", "new"])).toBe(true);
  });
});
