import { afterAll, beforeAll, expect, mock, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { questionAborted, type QuestionRequest } from "../src/core/questions";

// A minimal editor: one webview panel that records what it is shown and what it is sent.
interface FakePanel {
  reveals: unknown[][];
  messages: unknown[];
  receive?: (raw: unknown) => void;
}
const panels: FakePanel[] = [];
let workspaceFolders: { uri: { fsPath: string; scheme: string } }[] = [];

mock.module("vscode", () => ({
  window: {
    createWebviewPanel: () => {
      const panel: FakePanel = { reveals: [], messages: [] };
      panels.push(panel);
      return {
        reveal: (...args: unknown[]) => void panel.reveals.push(args),
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
          postMessage: async (message: unknown) => {
            panel.messages.push(message);
            return true;
          },
        },
      };
    },
    showInformationMessage: async () => undefined,
    showWarningMessage: () => undefined,
    showErrorMessage: () => undefined,
  },
  workspace: {
    get workspaceFolders() {
      return workspaceFolders;
    },
    getWorkspaceFolder: () => undefined,
  },
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
  const session = new QuestionSession(() => controller?.revealForQuestions());
  controller = new Controller({ fsPath: dir } as never, session);

  const asking = new AbortController();
  const answered = session.present(request, { signal: asking.signal });
  const round = session.current();

  expect(panels).toHaveLength(1);
  expect(round).not.toBeNull();
  // The webview says it is ready: the overlay of the open round is sent to it, though there is no snapshot.
  panels[0]?.receive?.({ type: "ready" });
  expect(panels[0]?.messages).toContainEqual({ type: "questions", round: expect.objectContaining({ id: round?.id }) });

  asking.abort(questionAborted());
  await expect(answered).rejects.toThrow(/stopped waiting/);
  controller.dispose();
});
