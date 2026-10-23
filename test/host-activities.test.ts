import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { announce, withdrawAll } from "../src/core/announcements";
import type { AnnouncementView } from "../src/core/snapshot";
import { projectAt } from "../src/core/store";
import { activitiesOf, activityOptions, summarize } from "../extension/src/host/activities";

const view = (over: Partial<AnnouncementView>): AnnouncementView => ({ id: "c00001", kind: "check", title: "Scanning System", phase: "scanning", notes: [], announced: "2026-10-01T10:00:00.000Z", ...over });
const at = (minutes: number): Date => new Date(Date.parse("2026-10-01T10:00:00.000Z") + minutes * 60_000);

describe("the ghosts with no column", () => {
  test("only the kinds `ghostColumn` leaves without a column, the most recent first", () => {
    const all = [
      view({ id: "p00001", kind: "proposal", title: "A design", phase: "preparing" }),
      view({ id: "c00001", kind: "check", title: "Final check" }),
      view({ id: "t00001", kind: "task", title: "A Task", phase: "preparing" }),
      view({ id: "m00001", kind: "comparison", title: "Comparing Refunds", phase: null }),
      view({ id: "w00001", kind: "work", title: "Importing from code", phase: null }),
      view({ id: "d00001", kind: "drift", title: "A Drift", phase: "preparing" }),
      view({ id: "s00001", kind: "scan", title: "Scanning System" }),
    ];
    expect(activitiesOf(all).map((a) => a.id)).toEqual(["s00001", "w00001", "m00001", "c00001"]);
    expect(activitiesOf([view({ kind: "resolve", title: "Resolving Drift D1", phase: "preparing" }), view({ id: "u1", kind: "unify", phase: "preparing" })])).toEqual([]);
  });
});

describe("the text of the item", () => {
  test("one ghost: spinning icon and title, kind and title, phase, running time, latest note", () => {
    const summary = summarize(activitiesOf([view({ notes: [{ at: "2026-10-01T10:01:00.000Z", text: "Reads the Model" }, { at: "2026-10-01T10:02:00.000Z", text: "Compares Refunds" }] })]), at(135));
    expect(summary.text).toBe("$(loading~spin) Scanning System");
    expect(summary.tooltip).toBe(["Check · Scanning System", "Scanning", "Running for 2 h 15 min", "Compares Refunds"].join("\n"));
    expect(summary.label).toBe("Agent checking the code: Scanning System, Scanning. Show details");
  });

  test("several ghosts: the newest one is shown with the number of the others, in the title and in the tooltip and name", () => {
    const activities = activitiesOf([
      view({ id: "c00001", kind: "scan", title: "Scanning System", announced: "2026-10-01T10:00:00.000Z" }),
      view({ id: "m00001", kind: "comparison", title: "Comparing Refunds", phase: null, announced: "2026-10-01T10:05:00.000Z" }),
      view({ id: "m00002", kind: "comparison", title: "Comparing Orders", phase: null, announced: "2026-10-01T10:06:00.000Z" }),
    ]);
    const summary = summarize(activities, at(10));
    expect(summary.text).toBe("$(loading~spin) Comparing Orders +2");
    expect(summary.tooltip).toBe(["Compare · Comparing Orders", "Running for 4 min", "+2 more running"].join("\n"));
    expect(summary.label).toBe("Agent comparing the code: Comparing Orders, and 2 more. Show details");
  });

  test("the list has one option per ghost: title, kind and phase, latest note", () => {
    const activities = activitiesOf([
      view({ id: "c00001", kind: "scan", title: "Scanning System", notes: [{ at: "2026-10-01T10:01:00.000Z", text: "Reads the Model" }] }),
      view({ id: "w00001", kind: "work", title: "Importing from code", phase: null, announced: "2026-10-01T10:05:00.000Z" }),
    ]);
    expect(activityOptions(activities)).toEqual([
      { id: "w00001", label: "Importing from code", description: "Import", detail: undefined },
      { id: "c00001", label: "Scanning System", description: "Scan · Scanning", detail: "Reads the Model" },
    ]);
  });
});

// A minimal editor: the status bar item, the QuickPick, the watcher and the interval the item uses.
interface FakeItem {
  id: string;
  alignment: number;
  priority: number;
  name: string;
  command: string;
  text: string;
  tooltip: string;
  accessibilityInformation: { label: string } | undefined;
  backgroundColor: unknown;
  visible: boolean;
  disposed: boolean;
  show(): void;
  hide(): void;
  dispose(): void;
}
interface FakePick {
  placeholder: string;
  items: { id: string; label: string; description: string; detail: string | undefined }[];
  activeItems: unknown[];
  selectedItems: { id: string }[];
  shown: boolean;
  disposed: boolean;
  accept: (() => void)[];
  hidden: (() => void)[];
  onDidAccept(fn: () => void): void;
  onDidHide(fn: () => void): void;
  show(): void;
  hide(): void;
  dispose(): void;
}
const items: FakeItem[] = [];
const picks: FakePick[] = [];
const fileEvents = { create: [] as (() => void)[], change: [] as (() => void)[], delete: [] as (() => void)[] };
const subscribe = (list: (() => void)[]) => (fn: () => void) => {
  list.push(fn);
  return { dispose: () => void list.splice(list.indexOf(fn), 1) };
};

mock.module("vscode", () => ({
  window: {
    createStatusBarItem: (id: string, alignment: number, priority: number) => {
      const item: FakeItem = {
        id, alignment, priority, name: "", command: "", text: "", tooltip: "", accessibilityInformation: undefined, backgroundColor: undefined, visible: false, disposed: false,
        show() { this.visible = true; },
        hide() { this.visible = false; },
        dispose() { this.disposed = true; },
      };
      items.push(item);
      return item;
    },
    createQuickPick: () => {
      const pick: FakePick = {
        placeholder: "", items: [], activeItems: [], selectedItems: [], shown: false, disposed: false, accept: [], hidden: [],
        onDidAccept(fn) { this.accept.push(fn); },
        onDidHide(fn) { this.hidden.push(fn); },
        show() { this.shown = true; },
        hide() { if (!this.shown) return; this.shown = false; this.hidden.forEach((fn) => fn()); },
        dispose() { this.disposed = true; },
      };
      picks.push(pick);
      return pick;
    },
  },
  workspace: { onDidChangeWorkspaceFolders: subscribe([]) },
  StatusBarAlignment: { Left: 1, Right: 2 },
}));

let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-activities-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("the status bar item", () => {
  test("is a left item `trama.activities` named `Trama Activities`, lower than every other, shown only while a ghost with no column exists, and opens details or the list", async () => {
    // Dynamic: the module must load after mock.module replaced "vscode".
    const { ActivitiesItem } = await import("../extension/src/host/activities-item");
    const p = projectAt(dir);
    const files = { onDidCreate: subscribe(fileEvents.create), onDidChange: subscribe(fileEvents.change), onDidDelete: subscribe(fileEvents.delete) };
    const opened: string[] = [];
    const activities = new ActivitiesItem(() => dir, files as never, (id) => void opened.push(id));
    const item = items.at(-1) as FakeItem;
    const changed = () => fileEvents.change.forEach((fn) => fn());

    expect(item).toMatchObject({ id: "trama.activities", alignment: 1, name: "Trama Activities", command: "trama.showActivities", visible: false, backgroundColor: undefined });
    expect(item.priority).toBeLessThan(100);

    // A ghost with a column never shows in the item.
    announce(p, { kind: "task", title: "A Task" });
    changed();
    expect(item.visible).toBe(false);

    const scan = announce(p, { kind: "check", title: "Scanning System", phase: "scanning" });
    changed();
    expect(item.visible).toBe(true);
    expect(item.text).toBe("$(loading~spin) Scanning System");
    activities.show();
    expect(opened).toEqual([scan.id]);
    expect(picks).toHaveLength(0);

    const imported = announce(p, { kind: "work", title: "Importing from code" });
    changed();
    expect(item.text).toBe("$(loading~spin) Importing from code +1");
    expect(item.accessibilityInformation?.label).toBe("Agent importing the code, and 1 more. Show details");
    activities.show();
    const pick = picks.at(-1) as FakePick;
    expect(pick).toMatchObject({ placeholder: "Choose an activity to see its details", shown: true });
    expect(pick.items.map((o) => o.id)).toEqual([imported.id, scan.id]);

    // The list follows the announcements: a new ghost enters on top.
    const compared = announce(p, { kind: "comparison", title: "Comparing Refunds", machine: "order" });
    changed();
    expect(pick.items.map((o) => o.id)).toEqual([compared.id, imported.id, scan.id]);

    // Choosing an option opens its details and closes the list.
    pick.selectedItems = [{ id: scan.id }];
    pick.accept.forEach((fn) => fn());
    expect(opened).toEqual([scan.id, scan.id]);
    expect(pick.shown).toBe(false);
    expect(pick.disposed).toBe(true);

    // Without a choice (Esc) nothing opens; the list closes when the last ghost goes and so does the item.
    activities.show();
    const second = picks.at(-1) as FakePick;
    expect(second).not.toBe(pick);
    second.hide();
    expect(opened).toHaveLength(2);
    activities.show();
    const third = picks.at(-1) as FakePick;
    withdrawAll(p, [scan.id, imported.id]);
    changed();
    expect(third.items.map((o) => o.id)).toEqual([compared.id]);
    withdrawAll(p);
    changed();
    expect(third.shown).toBe(false);
    expect(item.visible).toBe(false);

    activities.dispose();
    expect(item.disposed).toBe(true);
  });
});
