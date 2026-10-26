import { afterAll, afterEach, beforeAll, beforeEach, expect, mock, spyOn, test } from "bun:test";
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import { basename, join } from "node:path";
import type { PictureOutcome } from "../extension/src/host/picture";
import type { Snapshot } from "../src/core/snapshot";

// A minimal editor: webview panels and one webview view that record what they are shown and sent, and a watcher the test fires.
interface FakePanel {
  reveals: unknown[][];
  messages: unknown[];
  receive?: (raw: unknown) => void;
  closed?: () => void;
}
const panels: FakePanel[] = [];
const informationMessages: string[] = [];
const executed: unknown[][] = [];
let workspaceFolders: { uri: { fsPath: string; scheme: string } }[] = [];
let providers: Record<string, { resolveWebviewView(view: unknown): void }> = {};
const configuration: Record<string, unknown> = {};
const watcherListeners: (() => void)[] = [];
const folderListeners: (() => void)[] = [];
const configListeners: ((event: { affectsConfiguration(section: string): boolean }) => void)[] = [];
const modals: { message: string; options: unknown }[] = [];
let modalAnswer: string | undefined;

mock.module("vscode", () => ({
  window: {
    createWebviewPanel: () => {
      const panel: FakePanel = { reveals: [], messages: [] };
      panels.push(panel);
      return {
        title: "",
        reveal: (...args: unknown[]) => void panel.reveals.push(args),
        onDidDispose: (listener: () => void) => {
          panel.closed = listener;
          return { dispose() {} };
        },
        dispose() {},
        webview: {
          html: "",
          cspSource: "",
          options: {},
          asWebviewUri: (uri: unknown) => uri,
          onDidReceiveMessage: (listener: (raw: unknown) => void) => {
            panel.receive = listener;
            return { dispose() {} };
          },
          postMessage: async (message: unknown) => {
            panel.messages.push(message);
            return true;
          },
        },
      };
    },
    registerWebviewViewProvider: (id: string, provider: { resolveWebviewView(view: unknown): void }) => {
      providers[id] = provider;
      return { dispose() {} };
    },
    showInformationMessage: async (message: string) => {
      informationMessages.push(message);
      return undefined;
    },
    showWarningMessage: (message: string, options?: unknown) => (modals.push({ message, options }), modalAnswer),
    showErrorMessage: () => undefined,
  },
  workspace: {
    get workspaceFolders() {
      return workspaceFolders;
    },
    getWorkspaceFolder: () => undefined,
    getConfiguration: () => ({ get: (_key: string, fallback?: unknown) => fallback, inspect: (key: string) => ({ globalValue: configuration[key] }), update: async () => undefined }),
    onDidChangeWorkspaceFolders: (listener: () => void) => (folderListeners.push(listener), { dispose() {} }),
    onDidChangeConfiguration: (listener: (event: { affectsConfiguration(section: string): boolean }) => void) => {
      configListeners.push(listener);
      return { dispose() {} };
    },
  },
  extensions: { getExtension: () => undefined },
  ConfigurationTarget: { Global: 1, Workspace: 2 },
  Uri: {
    joinPath: (base: { fsPath: string }, ...parts: string[]) => ({ fsPath: join(base.fsPath, ...parts), toString: () => join(base.fsPath, ...parts) }),
    file: (path: string) => ({ fsPath: path, toString: () => path }),
    parse: (value: string) => ({ toString: () => value }),
  },
  ViewColumn: { Active: 1, Beside: -2 },
  commands: { executeCommand: async (...args: unknown[]) => void executed.push(args) },
  env: { appName: "Visual Studio Code", openExternal: async () => true },
  Disposable: class {
    constructor(readonly dispose: () => void) {}
    static from(...items: { dispose(): void }[]) {
      return { dispose: () => items.forEach((item) => item.dispose()) };
    }
  },
}));

// The modules load after mock.module replaced "vscode", so they are imported here, as the other host tests do.
const { Controller } = await import("../extension/src/host/controller");
const { MenuView, projectName } = await import("../extension/src/host/menu/view");
const { WindowPicture } = await import("../extension/src/host/picture");
const { MenuModel } = await import("../extension/src/host/menu/model");
const { boardDecisionCount } = await import("../src/core/board-decisions");
const { buildSnapshot } = await import("../src/core/snapshot");
const { projectAt } = await import("../src/core/store");
const { setOmpLauncher } = await import("../extension/src/host/omp-launch");

let project: string;
let plain: string;
beforeAll(() => {
  project = mkdtempSync(join(tmpdir(), "trama-menu-project-"));
  cpSync(join(import.meta.dir, "../examples/shop"), project, { recursive: true });
  plain = mkdtempSync(join(tmpdir(), "trama-menu-plain-"));
});
afterAll(() => {
  rmSync(project, { recursive: true, force: true });
  rmSync(plain, { recursive: true, force: true });
});
beforeEach(() => {
  panels.length = 0;
  informationMessages.length = 0;
  executed.length = 0;
  modals.length = 0;
  modalAnswer = undefined;
  providers = {};
  watcherListeners.length = 0;
  folderListeners.length = 0;
  configListeners.length = 0;
  mergeCalls.length = 0;
  mergeListeners.length = 0;
  mergeState = undefined;
  mergeStateReads = 0;
  for (const key of Object.keys(configuration)) delete configuration[key];
  workspaceFolders = [{ uri: { fsPath: project, scheme: "file" } }];
});

const folder = (fsPath: string) => [{ uri: { fsPath, scheme: "file" } }];
const extensionUri = { fsPath: "/ext" } as never;

test("Show <view> opens the panel on that view in a project, and brings an open panel forward and moves it there", async () => {
  const controller = new Controller(extensionUri);
  await controller.show("board");
  expect(panels).toHaveLength(1);
  panels[0]?.receive?.({ type: "ready" });
  expect(panels[0]?.messages).toContainEqual({ type: "navigate", view: "board" });

  await controller.show("diagram");
  expect(panels[0]?.messages.at(-1)).toEqual({ type: "navigate", view: "diagram" });

  await controller.show("history");
  expect(panels).toHaveLength(1);
  expect(panels[0]?.messages.at(-1)).toEqual({ type: "navigate", view: "history" });
  controller.dispose();
});

/** A throwaway project with a stale file the check of the installed skills deletes: its disappearance shows the check ran. */
function projectWithStaleFile(): { root: string; stale: string } {
  const root = mkdtempSync(join(tmpdir(), "trama-menu-check-"));
  cpSync(join(import.meta.dir, "../examples/shop"), root, { recursive: true });
  mkdirSync(join(root, ".omp/agents"), { recursive: true });
  const stale = join(root, ".omp/agents/trama-triage.md");
  writeFileSync(stale, "old");
  return { root, stale };
}
// The check starts in a `setTimeout(…, 0)` the controller queues first and then works synchronously: a timer queued after it runs after the whole check.
const afterCheck = () => new Promise((resolve) => setTimeout(resolve, 0));

test("a side menu entry that opens the closed panel checks the installed skills", async () => {
  const { root, stale } = projectWithStaleFile();
  workspaceFolders = folder(root);
  const controller = new Controller(extensionUri);
  await controller.show("specs");
  expect(panels).toHaveLength(1);
  await afterCheck();
  expect(existsSync(stale)).toBe(false);
  controller.dispose();
  rmSync(root, { recursive: true, force: true });
});

test("a side menu entry that finds the panel open only moves the view and starts no check", async () => {
  const { root, stale } = projectWithStaleFile();
  workspaceFolders = folder(root);
  const controller = new Controller(extensionUri);
  await controller.open();
  await afterCheck();
  // The opening above checked; the file comes back, as one an older version wrote would.
  writeFileSync(stale, "old");
  await controller.show("history");
  await controller.show("board");
  await afterCheck();
  expect(panels).toHaveLength(1);
  expect(existsSync(stale)).toBe(true);
  controller.dispose();
  rmSync(root, { recursive: true, force: true });
});

test("Open Trama with the panel already open checks the installed skills", async () => {
  const { root, stale } = projectWithStaleFile();
  workspaceFolders = folder(root);
  const controller = new Controller(extensionUri);
  await controller.show("board");
  await afterCheck();
  writeFileSync(stale, "old");
  await controller.open();
  await afterCheck();
  expect(panels).toHaveLength(1);
  expect(existsSync(stale)).toBe(false);
  controller.dispose();
  rmSync(root, { recursive: true, force: true });
});

test("Show Settings opens the panel on the Settings, in a folder that is no project too", async () => {
  workspaceFolders = folder(plain);
  const controller = new Controller(extensionUri);
  await controller.show("settings");
  panels[0]?.receive?.({ type: "ready" });
  expect(panels[0]?.messages).toContainEqual({ type: "navigate", view: "settings" });
  controller.dispose();
});

test("in a folder that is no project the views of a project do the ordinary opening, and Get Started goes to Get Started", async () => {
  workspaceFolders = folder(plain);
  const controller = new Controller(extensionUri);
  await controller.show("diagram");
  expect(panels).toHaveLength(1);
  panels[0]?.receive?.({ type: "ready" });
  expect(panels[0]?.messages.filter((message) => (message as { type: string }).type === "navigate")).toEqual([]);

  await controller.show("getstarted");
  expect(panels).toHaveLength(1);
  expect(panels[0]?.messages.at(-1)).toEqual({ type: "navigate", view: "getstarted" });
  controller.dispose();
});

test("with no folder open a Show command only says to open one", async () => {
  workspaceFolders = [];
  const controller = new Controller(extensionUri);
  await controller.show("board");
  expect(panels).toHaveLength(0);
  expect(informationMessages).toEqual(["Trama: open a folder to use Trama."]);
  controller.dispose();
});

test("with no folder open Settings still opens the panel on the Settings, which is all the panel shows there", async () => {
  workspaceFolders = [];
  const controller = new Controller(extensionUri);
  await controller.show("settings");
  expect(panels).toHaveLength(1);
  panels[0]?.receive?.({ type: "ready" });
  expect(panels[0]?.messages).toContainEqual({ type: "navigate", view: "settings" });
  expect(informationMessages).toEqual([]);
  controller.dispose();
});

test("with no folder open the panel opens only for the Settings: Open Settings works, and every other opening says to open a folder", async () => {
  workspaceFolders = [];
  const controller = new Controller(extensionUri);
  await controller.open();
  controller.openGhostDetails("c00001");
  expect(panels).toHaveLength(0);
  expect(informationMessages).toEqual(["Trama: open a folder to use Trama.", "Trama: open a folder to use Trama."]);

  await controller.openSettings();
  expect(panels).toHaveLength(1);
  panels[0]?.receive?.({ type: "ready" });
  expect(panels[0]?.messages).toContainEqual({ type: "project", present: false });
  expect(panels[0]?.messages).toContainEqual({ type: "navigate", view: "settings" });
  expect(panels[0]?.messages.some((message) => (message as { type: string }).type === "snapshot")).toBe(false);
  expect(informationMessages).toHaveLength(2);
  controller.dispose();
});

test("the controller tells the menu the view the panel shows, and that it closed", async () => {
  const controller = new Controller(extensionUri);
  const seen: unknown[] = [];
  controller.onDidChangeShownView((view) => void seen.push(view));
  expect(controller.shownView).toBeUndefined();
  await controller.open();
  panels[0]?.receive?.({ type: "viewChanged", view: "diagram" });
  panels[0]?.receive?.({ type: "viewChanged", view: "diagram" });
  panels[0]?.receive?.({ type: "viewChanged", view: "specs" });
  panels[0]?.receive?.({ type: "viewChanged", view: "nowhere" });
  await Promise.resolve();
  expect(controller.shownView).toBe("specs");
  panels[0]?.closed?.();
  expect(controller.shownView).toBeUndefined();
  expect(seen).toEqual(["diagram", "specs", undefined]);
  controller.dispose();
});

interface FakeView {
  title?: string;
  visible: boolean;
  badge: { value: number; tooltip: string } | undefined;
  messages: any[];
  receive?: (raw: unknown) => void;
  shown?: () => void;
  webview: Record<string, unknown>;
  onDidChangeVisibility(listener: () => void): { dispose(): void };
  onDidDispose(listener: () => void): { dispose(): void };
}

function fakeView(): FakeView {
  const view: FakeView = {
    visible: true,
    badge: undefined,
    messages: [],
    webview: {
      html: "",
      cspSource: "",
      options: {},
      asWebviewUri: (uri: unknown) => uri,
      onDidReceiveMessage: (listener: (raw: unknown) => void) => {
        view.receive = listener;
        return { dispose() {} };
      },
      postMessage: async (message: unknown) => {
        view.messages.push(message);
        return true;
      },
    },
    onDidChangeVisibility: (listener) => {
      view.shown = listener;
      return { dispose() {} };
    },
    onDidDispose: () => ({ dispose() {} }),
  };
  return view;
}

const watcher = () =>
  ({
    onDidCreate: (listener: () => void) => (watcherListeners.push(listener), { dispose() {} }),
    onDidChange: () => ({ dispose() {} }),
    onDidDelete: () => ({ dispose() {} }),
  }) as never;

// Merge of Solo mode as the menu sees it: the state it answers, how often it was asked, what it was asked, and the listeners of its changes.
const mergeCalls: string[] = [];
const mergeListeners: (() => void)[] = [];
let mergeStateReads = 0;
let mergeState: { available: boolean; reason?: string; trackedTrama: boolean; open?: { branch: string; conflict: boolean } } | undefined;
const soloMerge = () =>
  ({
    state: () => (mergeStateReads++, mergeState),
    merge: async () => void mergeCalls.push("merge"),
    openMergeEditor: async () => void mergeCalls.push("openMergeEditor"),
    reconcile: async () => void mergeCalls.push("reconcile"),
    abort: async () => void mergeCalls.push("abort"),
    onDidChange: (listener: () => void) => (mergeListeners.push(listener), { dispose() {} }),
  }) as never;

const states = (view: FakeView) => view.messages.filter((message) => message.type === "menuState");

const pictures: { dispose(): void }[] = [];
afterEach(() => {
  for (const picture of pictures.splice(0)) picture.dispose();
});

/** The window as the extension makes it: one picture, built on the watcher and the folders, that the controller (the panel) and the menu both listen to. */
function windowWithMenu() {
  const picture = new WindowPicture(watcher());
  picture.register();
  pictures.push(picture);
  const controller = new Controller(extensionUri, undefined, picture);
  const menu = new MenuView(extensionUri, controller, picture, soloMerge());
  menu.register();
  return { picture, controller, menu };
}

test("the menu view is a webview view kept alive while hidden, with the menu's script, and the extension never reveals it", async () => {
  const { controller, menu } = windowWithMenu();
  expect(Object.keys(providers)).toEqual(["trama.home"]);
  const view = fakeView();
  providers["trama.home"]?.resolveWebviewView(view);
  expect(String(view.webview["html"])).toContain("menu.js");
  expect(String(view.webview["html"])).toContain("Content-Security-Policy");
  // Nothing in the whole session asked the editor to focus, open, close or move a view.
  await controller.show("board");
  expect(executed).toEqual([]);
  menu.dispose();
  controller.dispose();
});

test("the menu asks for its state when it is ready and gets the theme and the numbers of the Snapshot, with the badge on the icon", () => {
  const { controller, menu } = windowWithMenu();
  const view = fakeView();
  providers["trama.home"]?.resolveWebviewView(view);
  view.receive?.({ type: "ready" });
  const snapshot = buildSnapshot(projectAt(project));
  const decisions = boardDecisionCount(snapshot);
  expect(view.messages[0]).toEqual({ type: "theme", setting: "auto" });
  expect(states(view)).toEqual([{ type: "menuState", situation: "project", decisions, tasksSinceScan: snapshot.tasksSinceScan, panelView: null }]);
  expect(view.badge).toEqual(decisions > 0 ? { value: decisions, tooltip: decisions === 1 ? "1 card awaits a decision" : `${decisions} cards await a decision` } : undefined);
  menu.dispose();
  controller.dispose();
});

test("the state follows the panel's view and its closing, the settings, and the menu becoming visible", async () => {
  const { controller, menu } = windowWithMenu();
  const view = fakeView();
  providers["trama.home"]?.resolveWebviewView(view);
  view.receive?.({ type: "ready" });
  await controller.open();
  panels[0]?.receive?.({ type: "viewChanged", view: "requirements" });
  expect(states(view).at(-1)).toMatchObject({ panelView: "requirements" });
  panels[0]?.closed?.();
  expect(states(view).at(-1)).toMatchObject({ panelView: null });

  const before = states(view).length;
  view.shown?.();
  expect(states(view)).toHaveLength(before + 1);
  view.visible = false;
  view.shown?.();
  expect(states(view)).toHaveLength(before + 1);
  menu.dispose();
  controller.dispose();
});

test("a change of the panel's view and a new visibility send the last state with the new highlight, reading nothing again", async () => {
  const { controller, menu } = windowWithMenu();
  const view = fakeView();
  providers["trama.home"]?.resolveWebviewView(view);
  view.receive?.({ type: "ready" });
  const first = states(view).at(-1);
  const badge = view.badge;
  const title = view.title;
  mergeStateReads = 0;

  await controller.open();
  panels[0]?.receive?.({ type: "viewChanged", view: "specs" });
  expect(states(view).at(-1)).toEqual({ ...first, panelView: "specs" });
  view.shown?.();
  expect(states(view).at(-1)).toEqual({ ...first, panelView: "specs" });
  panels[0]?.closed?.();
  expect(states(view).at(-1)).toEqual({ ...first, panelView: null });
  expect(mergeStateReads).toBe(0);
  expect(view.badge).toEqual(badge);
  expect(view.title).toBe(title);
  menu.dispose();
  controller.dispose();
});

function countingSurface() {
  const calls = { facts: 0, mergeState: 0, manager: 0, situation: 0 };
  const posted: Record<string, unknown>[] = [];
  let panelView: "board" | "specs" | undefined;
  const surface = {
    post: (message: Record<string, unknown>) => void posted.push(message),
    setBadge: () => {},
    theme: () => "auto",
    situation: () => (calls.situation++, "project"),
    facts: () => (calls.facts++, { decisions: 3, tasksSinceScan: 2, handoffs: 1 }),
    panelView: () => panelView,
    show: () => {},
    scan: () => {},
    openFolder: () => {},
    mergeState: () => (calls.mergeState++, { available: true, trackedTrama: false }),
    manager: () => (calls.manager++, true),
    startMerge: () => {},
    openMergeEditor: () => {},
    reconcileMerge: () => {},
    abortMerge: () => {},
  };
  return { surface: surface as never, calls, posted, setView: (view: typeof panelView) => void (panelView = view) };
}

test("the model sends its last full state again with only the highlight changed, without asking the surface for facts, merge or manager", () => {
  const { surface, calls, posted, setView } = countingSurface();
  const model = new MenuModel(surface);
  model.refresh();
  expect(calls).toMatchObject({ facts: 1, mergeState: 1, manager: 1 });
  const full = posted.at(-1);
  expect(full).toMatchObject({ situation: "project", decisions: 3, tasksSinceScan: 2, handoffs: 1, manager: true, merge: { available: true, trackedTrama: false }, panelView: null });

  setView("board");
  model.highlight();
  setView("specs");
  model.highlight();
  setView(undefined);
  model.highlight();
  expect(posted.slice(1)).toEqual([
    { ...full, panelView: "board" },
    { ...full, panelView: "specs" },
    { ...full, panelView: null },
  ]);
  expect(calls).toEqual({ facts: 1, mergeState: 1, manager: 1, situation: 1 });

  model.refresh();
  expect(calls).toMatchObject({ facts: 2, mergeState: 2, manager: 2 });
});

test("Merge of Solo mode: the state carries merge only when the flow gives one, a change of it sends the state again, and the four messages reach the flow", async () => {
  const { controller, menu } = windowWithMenu();
  const view = fakeView();
  providers["trama.home"]?.resolveWebviewView(view);
  view.receive?.({ type: "ready" });
  expect("merge" in (states(view).at(-1) as object)).toBe(false);

  mergeState = { available: false, reason: "inProgress", trackedTrama: false, open: { branch: "origin/main", conflict: true } };
  const before = states(view).length;
  for (const listener of mergeListeners) listener();
  await new Promise((resolve) => setTimeout(resolve, 400));
  expect(states(view)).toHaveLength(before + 1);
  expect(states(view).at(-1)).toMatchObject({ merge: mergeState });

  for (const type of ["merge", "openMergeEditor", "reconcileMerge", "abortMerge"]) view.receive?.({ type });
  expect(mergeCalls).toEqual(["merge", "openMergeEditor", "reconcile", "abort"]);
  menu.dispose();
  controller.dispose();
});

test("a change of the files of `.trama/` sends the state again, with the panel closed", async () => {
  const { controller, menu } = windowWithMenu();
  const view = fakeView();
  providers["trama.home"]?.resolveWebviewView(view);
  view.receive?.({ type: "ready" });
  const before = states(view).length;
  mergeStateReads = 0;
  for (const listener of watcherListeners) listener();
  for (const listener of watcherListeners) listener();
  await new Promise((resolve) => setTimeout(resolve, 400));
  expect(states(view)).toHaveLength(before + 1);
  expect(mergeStateReads).toBe(1);
  menu.dispose();
  controller.dispose();
});

test("the situation is noFolder without folders, notProject in a folder with no `.trama/`, and project otherwise", () => {
  const { controller, menu } = windowWithMenu();
  const view = fakeView();
  providers["trama.home"]?.resolveWebviewView(view);
  workspaceFolders = [];
  view.receive?.({ type: "ready" });
  workspaceFolders = folder(plain);
  view.receive?.({ type: "ready" });
  workspaceFolders = folder(project);
  view.receive?.({ type: "ready" });
  expect(states(view).map((state) => state.situation)).toEqual(["noFolder", "notProject", "project"]);
  expect(states(view).slice(0, 2).map((state) => state.decisions)).toEqual([0, 0]);
  menu.dispose();
  controller.dispose();
});

test("an entry of the menu does what the command does; Open Folder runs the editor's picker and nothing else", async () => {
  const { controller, menu } = windowWithMenu();
  const view = fakeView();
  providers["trama.home"]?.resolveWebviewView(view);
  view.receive?.({ type: "show", view: "specs" });
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(panels).toHaveLength(1);
  panels[0]?.receive?.({ type: "ready" });
  expect(panels[0]?.messages).toContainEqual({ type: "navigate", view: "specs" });

  view.receive?.({ type: "openFolder" });
  expect(executed).toEqual([["workbench.action.files.openFolder"]]);
  menu.dispose();
  controller.dispose();
});

// The modal answer is a mock value the controller awaits; no event marks when that await has finished, so one macrotask flush is the signal here.
test("Scan System from the menu asks the modal question first: Cancel launches nothing and opens no panel", async () => {
  const { controller, menu } = windowWithMenu();
  const view = fakeView();
  providers["trama.home"]?.resolveWebviewView(view);
  modalAnswer = "Cancel";
  view.receive?.({ type: "scan" });
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(modals).toEqual([{ message: "Scan the whole System?", options: { modal: true, detail: "The agent compares every Machine with the code: this can take a long time." } }]);
  expect(panels).toHaveLength(0);
  menu.dispose();
  controller.dispose();
});

// The launch stops at the omp check, replaced here: the test runs no omp, the machine's omp (or its absence and its notice) changes nothing, and the check's call marks the launch.
test("Scan System from the menu asks once; Scan launches the scan without opening the panel", async () => {
  const launched = Promise.withResolvers<void>();
  setOmpLauncher(async () => void launched.resolve());
  const { controller, menu } = windowWithMenu();
  const view = fakeView();
  providers["trama.home"]?.resolveWebviewView(view);
  modalAnswer = "Scan";
  try {
    view.receive?.({ type: "scan" });
    await launched.promise;
    expect(modals).toHaveLength(1);
    expect(panels).toHaveLength(0);
  } finally {
    setOmpLauncher();
    menu.dispose();
    controller.dispose();
  }
});

/** A throwaway copy of the example project, so a test can rewrite its Model. */
function copyOfProject(): string {
  const root = mkdtempSync(join(tmpdir(), "trama-menu-title-"));
  cpSync(join(import.meta.dir, "../examples/shop"), root, { recursive: true });
  return root;
}

test("the title of the view is the name of the System in a project, as soon as the view is resolved and with no state asked for", () => {
  const { controller, menu } = windowWithMenu();
  const view = fakeView();
  providers["trama.home"]?.resolveWebviewView(view);
  expect(view.title).toBe("Shop");
  view.receive?.({ type: "ready" });
  expect(view.title).toBe("Shop");
  menu.dispose();
  controller.dispose();
});

test("the title follows a change of the name of the System, without the spaces around it", async () => {
  const root = copyOfProject();
  workspaceFolders = folder(root);
  const { controller, menu } = windowWithMenu();
  const view = fakeView();
  providers["trama.home"]?.resolveWebviewView(view);
  view.receive?.({ type: "ready" });
  expect(view.title).toBe("Shop");
  writeFileSync(join(root, ".trama/model/system.md"), "#  New System  \n");
  for (const listener of watcherListeners) listener();
  await new Promise((resolve) => setTimeout(resolve, 400));
  expect(view.title).toBe("New System");
  menu.dispose();
  controller.dispose();
  rmSync(root, { recursive: true, force: true });
});

test("the title is the name of the project's folder when the Model cannot be read or the System has no name, and comes back with the Model", async () => {
  const root = copyOfProject();
  workspaceFolders = folder(root);
  const { controller, menu } = windowWithMenu();
  const view = fakeView();
  providers["trama.home"]?.resolveWebviewView(view);
  view.receive?.({ type: "ready" });
  const retitle = async (system: string) => {
    writeFileSync(join(root, ".trama/model/system.md"), system);
    for (const listener of watcherListeners) listener();
    await new Promise((resolve) => setTimeout(resolve, 400));
    return view.title;
  };
  expect(await retitle("not a valid System")).toBe(basename(root));
  expect(await retitle("#   \n")).toBe(basename(root));
  expect(await retitle("# Back\n")).toBe("Back");
  menu.dispose();
  controller.dispose();
  rmSync(root, { recursive: true, force: true });
});

test("without a folder, and in a folder that is no Trama project, the title is Trama", () => {
  const { controller, menu } = windowWithMenu();
  const view = fakeView();
  workspaceFolders = [];
  providers["trama.home"]?.resolveWebviewView(view);
  expect(view.title).toBe("Trama");
  workspaceFolders = folder(project);
  view.receive?.({ type: "ready" });
  expect(view.title).toBe("Shop");
  workspaceFolders = folder(plain);
  view.receive?.({ type: "ready" });
  expect(view.title).toBe("Trama");
  workspaceFolders = [];
  view.receive?.({ type: "ready" });
  expect(view.title).toBe("Trama");
  menu.dispose();
  controller.dispose();
});

test("projectName gives the System's name trimmed, else the folder's name", () => {
  const root = projectAt(project);
  expect(projectName(root, "  Shop ")).toBe("Shop");
  expect(projectName(root, "   ")).toBe(basename(project));
  expect(projectName(root, "")).toBe(basename(project));
  expect(projectName(root, undefined)).toBe(basename(project));
});

interface PanelSnapshot {
  type: "snapshot";
  snapshot: Snapshot;
}

const isSnapshot = (message: unknown): message is PanelSnapshot => typeof message === "object" && message !== null && "type" in message && message.type === "snapshot";
const snapshotsOf = (panel: FakePanel | undefined): PanelSnapshot[] => (panel?.messages ?? []).filter(isSnapshot);

test("one change of the files gives one picture, and the panel and the side menu both get it", async () => {
  const { picture, controller, menu } = windowWithMenu();
  const view = fakeView();
  providers["trama.home"]?.resolveWebviewView(view);
  view.receive?.({ type: "ready" });
  await controller.open();
  panels[0]?.receive?.({ type: "ready" });
  const built: { outcome: PictureOutcome; cause: string }[] = [];
  picture.onDidBuild((outcome, cause) => void built.push({ outcome, cause }));
  const [builds, shown, shownByMenu] = [built.length, snapshotsOf(panels[0]).length, states(view).length];

  for (const listener of watcherListeners) listener();
  for (const listener of watcherListeners) listener();
  await new Promise((resolve) => setTimeout(resolve, 400));
  expect(built).toHaveLength(builds + 1);
  expect(built.at(-1)?.cause).toBe("files");
  expect(snapshotsOf(panels[0])).toHaveLength(shown + 1);
  expect(states(view)).toHaveLength(shownByMenu + 1);

  const outcome = built.at(-1)?.outcome;
  if (outcome?.kind !== "built") throw new Error("the picture was not built");
  expect(snapshotsOf(panels[0]).at(-1)?.snapshot).toEqual(outcome.snapshot);
  expect(states(view).at(-1)).toMatchObject({ decisions: boardDecisionCount(outcome.snapshot), tasksSinceScan: outcome.snapshot.tasksSinceScan });
  menu.dispose();
  controller.dispose();
});

test("a refresh the panel asks for builds a fresh picture at once, sees what was just written, and gives it to the menu too", async () => {
  const root = copyOfProject();
  workspaceFolders = folder(root);
  const { picture, controller, menu } = windowWithMenu();
  const view = fakeView();
  providers["trama.home"]?.resolveWebviewView(view);
  view.receive?.({ type: "ready" });
  await controller.open();
  panels[0]?.receive?.({ type: "ready" });
  const causes: string[] = [];
  picture.onDidBuild((_outcome, cause) => void causes.push(cause));
  const [shown, shownByMenu] = [snapshotsOf(panels[0]).length, states(view).length];
  const drifts = snapshotsOf(panels[0]).at(-1)?.snapshot.drifts.length ?? 0;
  const decisions: number = states(view).at(-1)?.decisions ?? 0;

  mkdirSync(join(root, ".trama/drifts"), { recursive: true });
  writeFileSync(join(root, ".trama/drifts/dddddddd-fresh.md"), "---\nstatus: open\nrefs:\n  - order\n---\n# Fresh\n\n## What happens\n\nA.\n\n## What should happen\n\nB.\n");
  panels[0]?.receive?.({ type: "ready" });
  expect(causes).toEqual(["requested"]);
  expect(snapshotsOf(panels[0])).toHaveLength(shown + 1);
  expect(snapshotsOf(panels[0]).at(-1)?.snapshot.drifts.map((d) => d.id)).toContain("dddddddd");
  expect(snapshotsOf(panels[0]).at(-1)?.snapshot.drifts).toHaveLength(drifts + 1);
  expect(states(view)).toHaveLength(shownByMenu + 1);
  expect(states(view).at(-1)?.decisions).toBe(decisions + 1);
  menu.dispose();
  controller.dispose();
  rmSync(root, { recursive: true, force: true });
});

test("changing the view of the panel builds no picture, reads no file of `.trama/` and starts no process", async () => {
  const { picture, controller, menu } = windowWithMenu();
  const view = fakeView();
  providers["trama.home"]?.resolveWebviewView(view);
  view.receive?.({ type: "ready" });
  await controller.open();
  panels[0]?.receive?.({ type: "ready" });
  // The opening above started the check of the skills in the background: it has to be over before the reads are counted.
  await new Promise((resolve) => setTimeout(resolve, 0));

  let builds = 0;
  picture.onDidBuild(() => void builds++);
  const reads = [spyOn(fs, "readFileSync"), spyOn(fs, "readdirSync")];
  const processes = [spyOn(childProcess, "spawn"), spyOn(childProcess, "spawnSync"), spyOn(childProcess, "execFile"), spyOn(childProcess, "execFileSync"), spyOn(childProcess, "exec"), spyOn(childProcess, "execSync")];
  try {
    for (const next of ["diagram", "requirements", "specs", "history", "board"] as const) {
      panels[0]?.receive?.({ type: "viewChanged", view: next });
      await controller.show(next);
      view.shown?.();
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(builds).toBe(0);
    expect(reads.flatMap((spy) => spy.mock.calls.map((call) => String(call[0])).filter((path) => path.includes(".trama")))).toEqual([]);
    expect(processes.flatMap((spy) => spy.mock.calls.map((call) => String(call[0])))).toEqual([]);
  } finally {
    for (const spy of [...reads, ...processes]) spy.mockRestore();
  }
  expect(controller.shownView).toBe("board");
  menu.dispose();
  controller.dispose();
});

test("a refresh of the panel works from the picture: with nothing changed it reads no card file, and lists each folder of cards once", async () => {
  const root = copyOfProject();
  workspaceFolders = folder(root);
  const dir = join(root, ".trama");
  mkdirSync(join(dir, "drifts"), { recursive: true });
  for (const n of [1, 2, 3]) writeFileSync(join(dir, "drifts", `dddd000${n}-drift.md`), `---\nstatus: open\nrefs:\n  - order\ncreated: 2026-10-01T10:00:0${n}.000Z\n---\n# Drift ${n}\n\n## What happens\n\nA.\n\n## What should happen\n\nB.\n`);
  mkdirSync(join(dir, "proposals", "pppp0001-change"), { recursive: true });
  writeFileSync(join(dir, "proposals", "pppp0001-change", "proposal.md"), "---\nstatus: open\nbase: {}\ndelete: []\ncreated: 2026-10-01T10:00:00.000Z\n---\n# A change\n");
  const { controller, menu } = windowWithMenu();
  const view = fakeView();
  providers["trama.home"]?.resolveWebviewView(view);
  await controller.open();
  panels[0]?.receive?.({ type: "ready" });
  await new Promise((resolve) => setTimeout(resolve, 0));

  const reads = [spyOn(fs, "readFileSync"), spyOn(fs, "readdirSync")];
  try {
    panels[0]?.receive?.({ type: "ready" });
    const cards = /\.trama[\\/](drifts|tasks|proposals|history)[\\/]/;
    expect(reads[0]?.mock.calls.map((call) => String(call[0])).filter((path) => cards.test(path))).toEqual([]);
    const listed = (reads[1]?.mock.calls ?? []).map((call) => String(call[0])).filter((path) => /\.trama[\\/](drifts|tasks|proposals|history)$/.test(path));
    expect(new Set(listed).size).toBe(listed.length);
    expect(snapshotsOf(panels[0]).at(-1)?.snapshot.drifts).toHaveLength(3);
  } finally {
    for (const spy of reads) spy.mockRestore();
  }
  menu.dispose();
  controller.dispose();
  rmSync(root, { recursive: true, force: true });
});
