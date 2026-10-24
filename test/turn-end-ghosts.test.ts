import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from "bun:test";
import { cpSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import * as os from "node:os";
import { join } from "node:path";
const { tmpdir } = os;
// The registry of agent processes and the editor records live in the developer's home: a temporary one keeps the real home untouched.
const home = mkdtempSync(join(tmpdir(), "trama-ghosts-home-"));
mock.module("node:os", () => ({ ...os, homedir: () => home }));
afterAll(() => rmSync(home, { recursive: true, force: true }));
import { writeAgentProcess } from "../src/core/agent-processes";
import { announce, listAnnouncements } from "../src/core/announcements";
import { questionProjectId } from "../src/core/question-channel";
import { projectAt, type Project } from "../src/core/store";

const none = () => ({ dispose() {} });
const errors: string[] = [];
mock.module("vscode", () => ({
  window: { showErrorMessage: (message: string) => void errors.push(message) },
  workspace: { getConfiguration: () => ({ get: (_key: string, fallback: unknown) => fallback, inspect: () => undefined }), createFileSystemWatcher: () => ({ onDidCreate: none, onDidChange: none, dispose() {} }) },
  Disposable: class {
    constructor(readonly dispose: () => void) {}
    static from(...items: unknown[]) { return { dispose() { void items; } }; }
  },
}));
mock.module("../extension/src/host/questions", () => ({ ownWindowId: () => undefined }));

let dir: string;
let p: Project;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-ghosts-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const titles = () => listAnnouncements(p).map((a) => a.title).sort();
const clear = () => rmSync(join(dir, ".trama", "announcements"), { recursive: true, force: true });
afterEach(clear);

describe("opening the window withdraws only orphan announcements", () => {
  test("withdraws the announcements of no terminal and of a terminal nobody follows, with no notice for a work", async () => {
    const { onAnnouncementsWithdrawn, withdrawOrphans } = await import("../extension/src/host/announcements");
    announce(p, { kind: "check", title: "No terminal", phase: "verifying" });
    announce(p, { kind: "task", title: "Lost terminal", terminal: "lost01" });
    announce(p, { kind: "work", title: "Lost work", source: "request", terminal: "lost02" });
    const told: string[] = [];
    const subscription = onAnnouncementsWithdrawn((views) => told.push(...views.map((view) => view.title)));
    try {
      await withdrawOrphans(dir);
    } finally {
      subscription.dispose();
    }
    expect(listAnnouncements(p)).toEqual([]);
    expect(told.sort()).toEqual(["Lost terminal", "No terminal"]);
  });

  test("keeps what this window follows (a conversation it resumes, its General) and what a live recorded process keeps alive", async () => {
    const { addHolderFollower } = await import("../extension/src/host/followed-holders");
    const { withdrawOrphans } = await import("../extension/src/host/announcements");
    const follower = addHolderFollower((holder) => holder === "resum1" || holder === "gener1");
    try {
      await writeAgentProcess(questionProjectId(p), "alive1", process.pid);
      await writeAgentProcess(questionProjectId(p), "dead01", 2_000_000_000);
      announce(p, { kind: "task", title: "Resumed", terminal: "resum1" });
      announce(p, { kind: "work", title: "General", source: "request", terminal: "gener1" });
      announce(p, { kind: "task", title: "Alive process", terminal: "alive1" });
      announce(p, { kind: "task", title: "Dead process", terminal: "dead01" });
      announce(p, { kind: "task", title: "Never registered", terminal: "never1" });
      await withdrawOrphans(dir);
      expect(titles()).toEqual(["Alive process", "General", "Resumed"]);
    } finally {
      follower.dispose();
    }
  });

  test("waits until the window has read its conversations, then withdraws what none of them owns", async () => {
    const { addHolderFollower } = await import("../extension/src/host/followed-holders");
    const { watchAnnouncements } = await import("../extension/src/host/announcements");
    announce(p, { kind: "task", title: "Of a conversation", terminal: "conv01" });
    announce(p, { kind: "task", title: "Of nobody", terminal: "nobody" });
    const gate = Promise.withResolvers<void>();
    const watching = watchAnnouncements(() => dir, gate.promise);
    try {
      await Promise.resolve();
      expect(titles()).toEqual(["Of a conversation", "Of nobody"]);
      // The window registers its conversations, then says it has read them.
      const follower = addHolderFollower((holder) => holder === "conv01");
      try {
        gate.resolve();
        await watching.done;
        expect(titles()).toEqual(["Of a conversation"]);
      } finally {
        follower.dispose();
      }
    } finally {
      watching.dispose();
    }
  });

  test("a window closed before the conversations are read withdraws nothing", async () => {
    const { watchAnnouncements } = await import("../extension/src/host/announcements");
    announce(p, { kind: "task", title: "Stays", terminal: "nobody" });
    const gate = Promise.withResolvers<void>();
    const watching = watchAnnouncements(() => dir, gate.promise);
    watching.dispose();
    gate.resolve();
    await watching.done;
    expect(titles()).toEqual(["Stays"]);
  });

  test("a project without announcements is left as it is", async () => {
    const { withdrawOrphans } = await import("../extension/src/host/announcements");
    await withdrawOrphans(dir);
    expect(existsSync(join(dir, ".trama", "announcements"))).toBe(false);
  });
});
