import { describe, expect, test } from "bun:test";
import type { MenuSituation, MergeMenuState, ToMenuWebview } from "../extension/src/menu-protocol";
import type { ViewName } from "../extension/src/protocol";
import { badgeTooltip, MenuModel, type MenuSurface, menuBadge, parseMenuMessage } from "../extension/src/host/menu/model";

function setup(init: { situation?: MenuSituation; facts?: { decisions: number; tasksSinceScan: number; handoffs: number } | undefined; panel?: ViewName; merge?: MergeMenuState; team?: boolean; manager?: boolean } = {}) {
  const posted: ToMenuWebview[] = [];
  const badges: ({ value: number; tooltip: string } | undefined)[] = [];
  const calls: string[] = [];
  const env = { situation: init.situation ?? "project", facts: "facts" in init ? init.facts : { decisions: 2, tasksSinceScan: 3, handoffs: 0 }, panel: init.panel, merge: init.merge, team: { team: init.team ?? false, manager: init.manager ?? false } };
  const surface: MenuSurface = {
    post: (message) => void posted.push(message),
    setBadge: (badge) => void badges.push(badge),
    theme: () => "dark",
    situation: () => env.situation,
    facts: () => env.facts,
    panelView: () => env.panel,
    show: (view) => void calls.push(`show ${view}`),
    scan: () => void calls.push("scan"),
    openFolder: () => void calls.push("openFolder"),
    mergeState: () => env.merge,
    manager: () => env.team,
    startMerge: () => void calls.push("merge"),
    openMergeEditor: () => void calls.push("openMergeEditor"),
    reconcileMerge: () => void calls.push("reconcileMerge"),
    abortMerge: () => void calls.push("abortMerge"),
  };
  return { model: new MenuModel(surface), posted, badges, calls, env };
}

describe("the state the menu is sent", () => {
  test("a project carries the cards awaiting a decision, the Tasks since the scan and the view of the panel", () => {
    const { model, posted } = setup({ panel: "diagram" });
    model.refresh();
    expect(posted).toEqual([{ type: "menuState", situation: "project", decisions: 2, tasksSinceScan: 3, panelView: "diagram" }]);
  });

  test("with the panel closed there is no view", () => {
    const { model, posted } = setup();
    model.refresh();
    expect(posted[0]).toMatchObject({ panelView: null });
  });

  test("without a folder, and in a folder that is no project, the numbers are zero and the files are not read", () => {
    for (const situation of ["noFolder", "notProject"] as const) {
      const { model, posted, env } = setup({ situation });
      env.facts = undefined;
      model.refresh();
      expect(posted).toEqual([{ type: "menuState", situation, decisions: 0, tasksSinceScan: 0, panelView: null }]);
    }
  });

  test("files that cannot be read for a moment keep the last numbers", () => {
    const { model, posted, env } = setup();
    model.refresh();
    env.facts = undefined;
    model.refresh();
    expect(posted[1]).toMatchObject({ decisions: 2, tasksSinceScan: 3 });
  });

  test("the folder that becomes a project, and one that stops being one, change the situation at once", () => {
    const { model, posted, env } = setup({ situation: "notProject" });
    model.refresh();
    env.situation = "project";
    model.refresh();
    env.situation = "notProject";
    model.refresh();
    expect(posted.map((message) => (message.type === "menuState" ? message.situation : undefined))).toEqual(["notProject", "project", "notProject"]);
  });

  test("a new change of the numbers or of the panel's view is sent again", () => {
    const { model, posted, env } = setup({ panel: "board" });
    model.refresh();
    env.facts = { decisions: 0, tasksSinceScan: 0, handoffs: 0 };
    env.panel = "specs";
    model.refresh();
    expect(posted[1]).toMatchObject({ decisions: 0, tasksSinceScan: 0, panelView: "specs" });
  });
});

describe("Merge of Solo mode in the state", () => {
  const merge: MergeMenuState = { available: false, reason: "changes", trackedTrama: true };

  test("a project with Solo mode on carries merge, and one with it off carries none", () => {
    expect(setup({ merge }).model.state().merge).toEqual(merge);
    expect("merge" in setup().model.state()).toBe(false);
  });

  test("an open merge is carried with its branch and whether it still has conflicts", () => {
    const open: MergeMenuState = { available: false, reason: "inProgress", trackedTrama: false, open: { branch: "origin/main", conflict: true } };
    const { model, posted } = setup({ merge: open });
    model.refresh();
    expect(posted).toEqual([{ type: "menuState", situation: "project", decisions: 2, tasksSinceScan: 3, panelView: null, merge: open }]);
  });

  test("outside a project there is no merge, whatever Solo mode says", () => {
    expect("merge" in setup({ situation: "notProject", merge }).model.state()).toBe(false);
    expect("merge" in setup({ situation: "noFolder", merge }).model.state()).toBe(false);
  });
});

describe("Team in the state", () => {
  test("origin on GitHub in a project carries team: true, with Manager mode on or off; Team available adds manager: true; neither carries none", () => {
    const off = setup({ team: true }).model.state();
    expect(off.team).toBe(true);
    expect("manager" in off).toBe(false);
    const on = setup({ team: true, manager: true }).model.state();
    expect(on).toMatchObject({ team: true, manager: true });
    const none = setup().model.state();
    expect("team" in none).toBe(false);
    expect("manager" in none).toBe(false);
  });

  test("outside a project there is no Team, whatever the working copy says", () => {
    for (const situation of ["notProject", "noFolder"] as const) {
      const state = setup({ situation, team: true, manager: true, facts: { decisions: 2, tasksSinceScan: 3, handoffs: 3 } }).model.state();
      expect("team" in state).toBe(false);
      expect("manager" in state).toBe(false);
      expect("handoffs" in state).toBe(false);
    }
  });

  test("the open handoffs show as handoffs, only with Team available and more than none, and never in the number of the Board or the badge of the icon", () => {
    const { model, badges } = setup({ team: true, manager: true, facts: { decisions: 2, tasksSinceScan: 3, handoffs: 3 } });
    expect(model.state()).toMatchObject({ decisions: 2, team: true, manager: true, handoffs: 3 });
    model.refresh();
    expect(badges.at(-1)).toEqual({ value: 2, tooltip: "2 cards await a decision" });
    expect("handoffs" in setup({ team: true, manager: true, facts: { decisions: 2, tasksSinceScan: 3, handoffs: 0 } }).model.state()).toBe(false);
    // With Manager mode off the entry has no number, whatever handoffs wait.
    expect("handoffs" in setup({ team: true, facts: { decisions: 2, tasksSinceScan: 3, handoffs: 3 } }).model.state()).toBe(false);
  });

  test("show team is carried out with Manager mode on or off", () => {
    for (const manager of [true, false]) {
      const { model, calls } = setup({ team: true, manager });
      model.receive({ type: "show", view: "team" });
      expect(calls).toEqual(["show team"]);
    }
  });
});

describe("the badge of the icon", () => {
  test("shows the number with N cards awaiting a decision in a project, and a singular for one", () => {
    expect(menuBadge({ situation: "project", decisions: 3 })).toEqual({ value: 3, tooltip: "3 cards await a decision" });
    expect(menuBadge({ situation: "project", decisions: 1 })).toEqual({ value: 1, tooltip: "1 card awaits a decision" });
    expect(badgeTooltip(1)).toBe("1 card awaits a decision");
  });

  test("is taken off with none awaiting, and outside a Trama project", () => {
    expect(menuBadge({ situation: "project", decisions: 0 })).toBeUndefined();
    expect(menuBadge({ situation: "notProject", decisions: 4 })).toBeUndefined();
    expect(menuBadge({ situation: "noFolder", decisions: 4 })).toBeUndefined();
  });

  test("is set at every refresh, also with the menu hidden", () => {
    const { model, badges, env } = setup();
    model.refresh();
    env.facts = { decisions: 0, tasksSinceScan: 0, handoffs: 0 };
    model.refresh();
    expect(badges).toEqual([{ value: 2, tooltip: "2 cards await a decision" }, undefined]);
  });
});

describe("the messages of the menu", () => {
  test("ready sends the theme and the state", () => {
    const { model, posted } = setup();
    model.receive({ type: "ready" });
    expect(posted.map((message) => message.type)).toEqual(["theme", "menuState"]);
    expect(posted[0]).toEqual({ type: "theme", setting: "dark" });
  });

  test("show, scan and openFolder are carried out", () => {
    const { model, calls } = setup();
    model.receive({ type: "show", view: "history" });
    model.receive({ type: "show", view: "getstarted" });
    model.receive({ type: "scan" });
    model.receive({ type: "openFolder" });
    expect(calls).toEqual(["show history", "show getstarted", "scan", "openFolder"]);
  });

  test("merge, openMergeEditor, reconcileMerge and abortMerge are carried out", () => {
    const { model, calls } = setup({ merge: { available: true, trackedTrama: false } });
    for (const type of ["merge", "openMergeEditor", "reconcileMerge", "abortMerge"]) model.receive({ type });
    expect(calls).toEqual(["merge", "openMergeEditor", "reconcileMerge", "abortMerge"]);
    expect(parseMenuMessage({ type: "merge", branch: "main" })).toBeUndefined();
  });

  test("anything else is ignored", () => {
    const { model, calls, posted } = setup();
    for (const raw of [null, "show", { type: "show", view: "nowhere" }, { type: "show" }, { type: "scan", extra: 1 }, { type: "launch", action: { kind: "scan" } }, { type: "openFile", path: "/etc/passwd" }]) model.receive(raw);
    expect(calls).toEqual([]);
    expect(posted).toEqual([]);
    expect(parseMenuMessage({ type: "show", view: "board" })).toEqual({ type: "show", view: "board" });
  });
});
