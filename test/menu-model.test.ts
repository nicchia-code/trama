import { describe, expect, test } from "bun:test";
import type { MenuSituation, ToMenuWebview } from "../extension/src/menu-protocol";
import type { ViewName } from "../extension/src/protocol";
import { badgeTooltip, MenuModel, type MenuSurface, menuBadge, parseMenuMessage } from "../extension/src/host/menu/model";

function setup(init: { situation?: MenuSituation; facts?: { decisions: number; tasksSinceScan: number } | undefined; advisor?: boolean; panel?: ViewName } = {}) {
  const posted: ToMenuWebview[] = [];
  const badges: ({ value: number; tooltip: string } | undefined)[] = [];
  const calls: string[] = [];
  const env = { situation: init.situation ?? "project", facts: "facts" in init ? init.facts : { decisions: 2, tasksSinceScan: 3 }, advisor: init.advisor ?? false, panel: init.panel };
  const surface: MenuSurface = {
    post: (message) => void posted.push(message),
    setBadge: (badge) => void badges.push(badge),
    theme: () => "dark",
    situation: () => env.situation,
    facts: () => env.facts,
    advisorScanner: () => env.advisor,
    panelView: () => env.panel,
    show: (view) => void calls.push(`show ${view}`),
    scan: () => void calls.push("scan"),
    openFolder: () => void calls.push("openFolder"),
  };
  return { model: new MenuModel(surface), posted, badges, calls, env };
}

describe("the state the menu is sent", () => {
  test("a project carries the cards awaiting a decision, the Tasks since the scan, the Advisor Scanner and the view of the panel", () => {
    const { model, posted } = setup({ advisor: true, panel: "diagram" });
    model.refresh();
    expect(posted).toEqual([{ type: "menuState", situation: "project", decisions: 2, tasksSinceScan: 3, advisorScanner: true, panelView: "diagram" }]);
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
      expect(posted).toEqual([{ type: "menuState", situation, decisions: 0, tasksSinceScan: 0, advisorScanner: false, panelView: null }]);
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
    env.facts = { decisions: 0, tasksSinceScan: 0 };
    env.panel = "specs";
    model.refresh();
    expect(posted[1]).toMatchObject({ decisions: 0, tasksSinceScan: 0, panelView: "specs" });
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
    env.facts = { decisions: 0, tasksSinceScan: 0 };
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

  test("anything else is ignored", () => {
    const { model, calls, posted } = setup();
    for (const raw of [null, "show", { type: "show", view: "nowhere" }, { type: "show" }, { type: "scan", extra: 1 }, { type: "launch", action: { kind: "scan" } }, { type: "openFile", path: "/etc/passwd" }]) model.receive(raw);
    expect(calls).toEqual([]);
    expect(posted).toEqual([]);
    expect(parseMenuMessage({ type: "show", view: "board" })).toEqual({ type: "show", view: "board" });
  });
});
