import { afterAll, beforeAll, expect, mock, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FIX_OPTIONS } from "./fix-options";
import { projectAt } from "../src/core/store";
import { getDrift, newDrift } from "../src/core/work";

// A minimal editor: one webview panel, and what the host shows the developer in dialogs.
interface FakePanel {
  receive?: (raw: unknown) => void;
}
const panels: FakePanel[] = [];
const warnings: string[] = [];
const errors: string[] = [];
let workspaceFolders: { uri: { fsPath: string; scheme: string } }[] = [];
// What the developer answers in the modal dialog that confirms Dismiss Drift, and when that answer arrives.
let dialogAnswer: string | undefined = "Dismiss";
let dialog: Promise<string | undefined> = Promise.resolve(undefined);

mock.module("vscode", () => ({
  window: {
    createWebviewPanel: () => {
      const panel: FakePanel = {};
      panels.push(panel);
      return {
        get title() { return ""; },
        set title(_value: string) {},
        reveal: () => {},
        onDidDispose: () => ({ dispose() {} }),
        dispose() {},
        webview: {
          html: "",
          cspSource: "",
          asWebviewUri: (uri: unknown) => uri,
          onDidReceiveMessage: (listener: (raw: unknown) => void) => {
            panel.receive = listener;
            return { dispose() {} };
          },
          postMessage: async () => true,
        },
      };
    },
    showInformationMessage: async () => undefined,
    showWarningMessage: (message: string) => {
      warnings.push(message);
      dialog = Promise.resolve(dialogAnswer);
      return dialog;
    },
    showErrorMessage: (message: string) => {
      errors.push(message);
      return undefined;
    },
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
const { receiveNotice } = await import("../extension/src/host/drift-resolution");

let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-dismiss-turn-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  workspaceFolders = [{ uri: { fsPath: dir, scheme: "file" } }];
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

test("Dismiss Drift from the panel is refused while the agent that filed the Drift is still finishing, and works once its turn ends", async () => {
  const project = projectAt(dir);
  const drift = newDrift(project, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Refund ignores the coupon", refs: ["order"], happens: "The code refunds the full amount.", should: "The Model says the coupon is subtracted first." });

  const controller = new Controller({ fsPath: dir } as never);
  await controller.open();
  const panel = panels.at(-1);
  panel?.receive?.({ type: "ready" });

  // The agent files the Drift from a terminal and its turn is still going on: the refusal comes before any dialog.
  receiveNotice({ type: "drift-filed", root: project.root, drift: drift.id, holder: "terminal-1" });
  panel?.receive?.({ type: "dismissDrift", id: drift.id });

  expect(warnings).toEqual([]);
  expect(errors).toEqual(["Trama: Dismiss Drift is unavailable: the agent is still finishing."]);
  expect(getDrift(project, drift.id).data.status).toBe("open");

  // The agent's turn ends: the Drift is no longer held, and the developer's confirmation closes it without changes.
  receiveNotice({ type: "turn-ended", root: project.root, holder: "terminal-1" });
  errors.length = 0;
  panel?.receive?.({ type: "dismissDrift", id: drift.id });
  await dialog;

  expect(warnings).toHaveLength(1);
  expect(errors).toEqual([]);
  const closed = getDrift(project, drift.id).data;
  expect([closed.status, closed.resolution]).toEqual(["resolved", "dismissed"]);
  controller.dispose();
});
