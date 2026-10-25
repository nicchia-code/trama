import { afterAll, beforeAll, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// A minimal editor: one webview panel and what the host posts to it.
interface FakePanel {
  receive?: (raw: unknown) => void;
}
const panels: FakePanel[] = [];
const posted: { type: string; githubRepo?: string }[] = [];
let workspaceFolders: { uri: { fsPath: string; scheme: string } }[] = [];

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
          options: { localResourceRoots: [] as { fsPath: string }[] },
          html: "",
          cspSource: "",
          asWebviewUri: (uri: unknown) => uri,
          onDidReceiveMessage: (listener: (raw: unknown) => void) => {
            panel.receive = listener;
            return { dispose() {} };
          },
          postMessage: async (message: { type: string; githubRepo?: string }) => {
            posted.push(message);
            return true;
          },
        },
      };
    },
    showInformationMessage: async () => undefined,
    showWarningMessage: async () => undefined,
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

let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-github-repo-host-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  workspaceFolders = [{ uri: { fsPath: dir, scheme: "file" } }];
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const git = (...args: string[]) => spawnSync("git", args, { cwd: dir, stdio: "ignore", timeout: 30_000, killSignal: "SIGKILL" });

/** The panel's pictures after `ready`, in the folder as it is now. */
async function pictures() {
  posted.length = 0;
  const controller = new Controller({ fsPath: dir } as never);
  await controller.open();
  panels.at(-1)?.receive?.({ type: "ready" });
  await Bun.sleep(0);
  return posted.filter((message) => message.type === "snapshot");
}

test("the picture carries the GitHub repository of the origin remote, and nothing without one or when origin is elsewhere", async () => {
  git("init", "-q");
  const without = await pictures();
  expect(without.length).toBeGreaterThan(0);
  expect(without.every((picture) => !("githubRepo" in picture))).toBe(true);

  git("remote", "add", "origin", "https://gitlab.com/acme/shop.git");
  expect((await pictures()).every((picture) => !("githubRepo" in picture))).toBe(true);

  git("remote", "set-url", "origin", "git@github.com:acme/shop.git");
  const on = await pictures();
  expect(on.length).toBeGreaterThan(0);
  expect(on.every((picture) => picture.githubRepo === "acme/shop")).toBe(true);
});
