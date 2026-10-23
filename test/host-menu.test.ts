import { afterAll, beforeAll, beforeEach, expect, mock, test } from "bun:test";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
const configListeners: ((event: { affectsConfiguration(section: string): boolean }) => void)[] = [];

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
    showWarningMessage: () => undefined,
    showErrorMessage: () => undefined,
  },
  workspace: {
    get workspaceFolders() {
      return workspaceFolders;
    },
    getWorkspaceFolder: () => undefined,
    getConfiguration: () => ({ get: () => undefined, inspect: (key: string) => ({ globalValue: configuration[key] }), update: async () => undefined }),
    onDidChangeWorkspaceFolders: () => ({ dispose() {} }),
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
const { MenuView } = await import("../extension/src/host/menu/view");
const { boardDecisionCount } = await import("../src/core/board-decisions");
const { buildSnapshot } = await import("../src/core/snapshot");
const { projectAt } = await import("../src/core/store");

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
  providers = {};
  watcherListeners.length = 0;
  configListeners.length = 0;
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

const states = (view: FakeView) => view.messages.filter((message) => message.type === "menuState");

test("the menu view is a webview view kept alive while hidden, with the menu's script, and the extension never reveals it", async () => {
  const controller = new Controller(extensionUri);
  const menu = new MenuView(extensionUri, controller, watcher());
  menu.register();
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
  const controller = new Controller(extensionUri);
  const menu = new MenuView(extensionUri, controller, watcher());
  menu.register();
  const view = fakeView();
  providers["trama.home"]?.resolveWebviewView(view);
  view.receive?.({ type: "ready" });
  const snapshot = buildSnapshot(projectAt(project));
  const decisions = boardDecisionCount(snapshot);
  expect(view.messages[0]).toEqual({ type: "theme", setting: "auto" });
  expect(states(view)).toEqual([{ type: "menuState", situation: "project", decisions, tasksSinceScan: snapshot.tasksSinceScan, advisorScanner: false, panelView: null }]);
  expect(view.badge).toEqual(decisions > 0 ? { value: decisions, tooltip: decisions === 1 ? "1 card awaits a decision" : `${decisions} cards await a decision` } : undefined);
  menu.dispose();
  controller.dispose();
});

test("the state follows the panel's view and its closing, the settings, and the menu becoming visible", async () => {
  const controller = new Controller(extensionUri);
  const menu = new MenuView(extensionUri, controller, watcher());
  menu.register();
  const view = fakeView();
  providers["trama.home"]?.resolveWebviewView(view);
  view.receive?.({ type: "ready" });
  await controller.open();
  panels[0]?.receive?.({ type: "viewChanged", view: "requirements" });
  expect(states(view).at(-1)).toMatchObject({ panelView: "requirements" });
  panels[0]?.closed?.();
  expect(states(view).at(-1)).toMatchObject({ panelView: null });

  configuration["advisorScanner"] = true;
  for (const listener of configListeners) listener({ affectsConfiguration: (section) => section === "trama" || section === "trama.advisorScanner" });
  expect(states(view).at(-1)).toMatchObject({ advisorScanner: true });

  const before = states(view).length;
  view.shown?.();
  expect(states(view)).toHaveLength(before + 1);
  view.visible = false;
  view.shown?.();
  expect(states(view)).toHaveLength(before + 1);
  menu.dispose();
  controller.dispose();
});

test("a change of the files of `.trama/` sends the state again, with the panel closed", async () => {
  const controller = new Controller(extensionUri);
  const menu = new MenuView(extensionUri, controller, watcher());
  menu.register();
  const view = fakeView();
  providers["trama.home"]?.resolveWebviewView(view);
  view.receive?.({ type: "ready" });
  const before = states(view).length;
  for (const listener of watcherListeners) listener();
  for (const listener of watcherListeners) listener();
  await new Promise((resolve) => setTimeout(resolve, 400));
  expect(states(view)).toHaveLength(before + 1);
  menu.dispose();
  controller.dispose();
});

test("the situation is noFolder without folders, notProject in a folder with no `.trama/`, and project otherwise", () => {
  const controller = new Controller(extensionUri);
  const menu = new MenuView(extensionUri, controller, watcher());
  menu.register();
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
  const controller = new Controller(extensionUri);
  const menu = new MenuView(extensionUri, controller, watcher());
  menu.register();
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
