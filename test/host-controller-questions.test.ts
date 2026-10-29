import { afterAll, beforeAll, expect, mock, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { questionAborted, type QuestionRequest } from "../src/core/questions";
import { removeTree } from "./remove-tree";

// A minimal editor: one webview panel that records what it is shown and what it is sent.
interface FakePanel {
  title: string;
  reveals: unknown[][];
  messages: unknown[];
  receive?: (raw: unknown) => void;
  closed?: () => void;
}
const panels: FakePanel[] = [];
const informationMessages: string[] = [];
let workspaceFolders: { uri: { fsPath: string; scheme: string } }[] = [];

mock.module("vscode", () => ({
  window: {
    createWebviewPanel: (_viewType: string, title: string) => {
      const panel: FakePanel = { title, reveals: [], messages: [] };
      panels.push(panel);
      return {
        get title() { return panel.title; },
        set title(value: string) { panel.title = value; },
        reveal: (...args: unknown[]) => void panel.reveals.push(args),
        onDidDispose: (listener: () => void) => {
          panel.closed = listener;
          return { dispose() {} };
        },
        dispose() {},
        webview: {
          html: "",
          cspSource: "",
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
    getConfiguration: () => ({ get: () => undefined, inspect: () => undefined, update: async () => undefined }),
  },
  extensions: { getExtension: () => ({ packageJSON: JSON.parse(readFileSync(join(import.meta.dir, "../extension/package.json"), "utf8")) }) },
  ConfigurationTarget: { Global: 1, Workspace: 2 },
  Uri: {
    joinPath: (base: { fsPath: string }, ...parts: string[]) => ({ fsPath: join(base.fsPath, ...parts), toString: () => join(base.fsPath, ...parts) }),
    file: (path: string) => ({ fsPath: path, toString: () => path }),
    parse: (value: string) => ({ toString: () => value }),
  },
  ViewColumn: { Active: 1, Beside: -2 },
  commands: { executeCommand: async () => undefined },
  env: { appName: "Visual Studio Code", openExternal: async () => true },
  Disposable: class {
    constructor(readonly dispose: () => void) {}
  },
}));

// The modules load after mock.module replaced "vscode", so they are imported here, as the other host tests do.
const { Controller } = await import("../extension/src/host/controller");
const { QuestionSession } = await import("../extension/src/host/question-session");

let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-controller-"));
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const request: QuestionRequest = {
  questions: [{ id: "q1", question: "Which?", options: [{ label: "A", description: "a" }, { label: "B", description: "b" }], recommended: 0, multi: false }],
};

test("a question round opens the panel even when the workspace has no Trama project", async () => {
  // A workspace folder without `.trama/`: there is no project to show.
  workspaceFolders = [{ uri: { fsPath: dir, scheme: "file" } }];
  let controller: InstanceType<typeof Controller> | undefined;
  const session = new QuestionSession(() => controller?.revealForQuestions(), () => undefined);
  controller = new Controller({ fsPath: dir } as never, session);

  const asking = new AbortController();
  const answered = session.present(request, { signal: asking.signal });
  const round = session.current();

  expect(panels).toHaveLength(1);
  expect(panels[0]?.title).toBe("Get Started");
  expect(round).not.toBeNull();
  // The webview says it is ready: the overlay of the open round is sent to it, though there is no snapshot.
  panels[0]?.receive?.({ type: "ready" });
  expect(panels[0]?.messages).toContainEqual({ type: "questions", round: expect.objectContaining({ id: round?.id }) });

  asking.abort(questionAborted());
  await expect(answered).rejects.toThrow(/stopped waiting/);
  controller.dispose();
});

test("reopening the panel with an open round shows the round without offering to initialize a project", async () => {
  // No `.trama/` in the workspace. The developer closes the panel while the round is open, then Reopen runs.
  panels.length = 0;
  workspaceFolders = [{ uri: { fsPath: dir, scheme: "file" } }];
  let controller: InstanceType<typeof Controller> | undefined;
  const session = new QuestionSession(() => controller?.revealForQuestions(), () => undefined);
  controller = new Controller({ fsPath: dir } as never, session);

  const asking = new AbortController();
  const answered = session.present(request, { signal: asking.signal });
  const round = session.current();
  informationMessages.length = 0;
  panels[0]?.closed?.();
  expect(informationMessages).toEqual(["Trama has questions from the agent waiting."]);

  panels.length = 0;
  await controller.open();

  expect(informationMessages).toHaveLength(1);
  expect(panels).toHaveLength(1);
  expect(panels[0]?.title).toBe("Get Started");
  expect(session.current()?.id).toBe(round?.id);
  panels[0]?.receive?.({ type: "ready" });
  expect(panels[0]?.messages).toContainEqual({ type: "questions", round: expect.objectContaining({ id: round?.id }) });

  asking.abort(questionAborted());
  await expect(answered).rejects.toThrow(/stopped waiting/);
  controller.dispose();
});

test("panel title is the name of the view shown and a refresh never changes it", async () => {
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  workspaceFolders = [{ uri: { fsPath: dir, scheme: "file" } }];
  const controller = new Controller({ fsPath: dir } as never);
  await controller.open();
  const panel = panels.at(-1);
  expect(panel?.title).toBe("Board");

  const names = { diagram: "Diagram", requirements: "Requirements", specs: "Specs", history: "History", settings: "Settings", board: "Board" };
  for (const [view, name] of Object.entries(names)) {
    panel?.receive?.({ type: "viewChanged", view });
    expect(panel?.title).toBe(name);
  }

  panel?.receive?.({ type: "viewChanged", view: "specs" });
  writeFileSync(join(dir, ".trama/model/system.md"), "#  New System  \n");
  (controller as unknown as { refresh(): void }).refresh();
  expect(panel?.title).toBe("Specs");
  writeFileSync(join(dir, ".trama/model/system.md"), "not a valid System");
  (controller as unknown as { refresh(): void }).refresh();
  expect(panel?.title).toBe("Specs");
  controller.dispose();
});

test("a panel opened on a view carries its name, and Settings stays Settings under the guided setup", async () => {
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  workspaceFolders = [{ uri: { fsPath: dir, scheme: "file" } }];
  const controller = new Controller({ fsPath: dir } as never);
  await controller.show("history");
  expect(panels.at(-1)?.title).toBe("History");
  panels.at(-1)?.closed?.();

  await controller.openSettings({ type: "guidedSetup", mode: "settings" } as never);
  const panel = panels.at(-1);
  expect(panel?.title).toBe("Settings");
  panel?.receive?.({ type: "viewChanged", view: "settings" });
  expect(panel?.title).toBe("Settings");
  controller.dispose();
});

test("a window without folders opens the panel titled Settings", async () => {
  workspaceFolders = [];
  const controller = new Controller({ fsPath: dir } as never);
  await controller.openSettings();
  expect(panels.at(-1)?.title).toBe("Settings");
  controller.dispose();
});

test("the panel goes back to Get Started when the Trama folder is removed while it is open", async () => {
  const project = mkdtempSync(join(tmpdir(), "trama-controller-removed-"));
  cpSync(join(import.meta.dir, "../examples/shop"), project, { recursive: true });
  workspaceFolders = [{ uri: { fsPath: project, scheme: "file" } }];
  const controller = new Controller({ fsPath: project } as never);
  await controller.open();
  const panel = panels.at(-1);
  panel?.receive?.({ type: "ready" });
  expect(panel?.messages).toContainEqual({ type: "project", present: true });

  rmSync(join(project, ".trama"), { recursive: true, force: true });
  // refresh is private: the test drives it directly, as the test above does.
  const internals = controller as unknown as { refresh(): void };
  internals.refresh();
  expect(panel?.messages).toContainEqual({ type: "project", present: false });
  controller.dispose();
  await removeTree(project);
}, 30_000);

