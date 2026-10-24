import { afterAll, afterEach, beforeAll, expect, mock, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cardName } from "../src/core/short-numbers";
import { projectAt } from "../src/core/store";
import { getTaskOrNull, moveTask, newTask } from "../src/core/work";

// A minimal editor: one webview panel, what the host posts to it, and what it shows the developer in dialogs.
interface FakePanel {
  receive?: (raw: unknown) => void;
}
interface Dialog {
  message: string;
  options: unknown;
  items: string[];
}
const panels: FakePanel[] = [];
const posted: { type: string; text?: string }[] = [];
const dialogs: Dialog[] = [];
const errors: string[] = [];
let workspaceFolders: { uri: { fsPath: string; scheme: string } }[] = [];
// What the developer answers in the modal dialog that confirms Delete, and what happens while it is open.
let dialogAnswer: string | undefined = "Delete";
let whileOpen: () => void = () => {};

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
          postMessage: async (message: { type: string; text?: string }) => {
            posted.push(message);
            return true;
          },
        },
      };
    },
    showInformationMessage: async () => undefined,
    showWarningMessage: (message: string, options: unknown, ...items: string[]) => {
      dialogs.push({ message, options, items });
      whileOpen();
      return Promise.resolve(dialogAnswer);
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
const { endUnsentJob, localProjectJobs, receiveNotice, startJob } = await import("../extension/src/host/drift-resolution");

let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-delete-task-host-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  workspaceFolders = [{ uri: { fsPath: dir, scheme: "file" } }];
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));
afterEach(() => {
  // Jobs live in module state: none may outlive its test.
  const root = projectAt(dir).root;
  for (const job of localProjectJobs(root)) endUnsentJob(root, job.id);
  posted.length = 0;
  dialogs.length = 0;
  errors.length = 0;
  dialogAnswer = "Delete";
  whileOpen = () => {};
});

// The handler of a message is async but waits only for microtasks (the fake dialog is an already resolved promise): one turn of the event loop lets it end. Not a wait for a duration.
const settle = () => Bun.sleep(0);
const notices = () => posted.filter((m) => m.type === "notice").map((m) => m.text);
const snapshots = () => posted.filter((m) => m.type === "snapshot").length;

/** A panel of the Controller, ready, and a Task in To do. */
async function setup(title: string) {
  const project = projectAt(dir);
  const task = newTask(project, { title, refs: ["order/Paid"], technical: false });
  const controller = new Controller({ fsPath: dir } as never);
  await controller.open();
  const panel = panels.at(-1);
  panel?.receive?.({ type: "ready" });
  await settle();
  posted.length = 0;
  errors.length = 0;
  const name = cardName(project, "task", task.id);
  const press = async () => {
    panel?.receive?.({ type: "deleteTask", task: task.id });
    await settle();
  };
  return { project, task, name, controller, press, exists: () => getTaskOrNull(project, task.id) !== null };
}

test("cancelling the dialog, or closing it, deletes nothing and sends nothing", async () => {
  const { task, name, controller, press, exists } = await setup("Cancel me");
  dialogAnswer = undefined;
  await press();
  expect(dialogs).toEqual([{ message: `Delete ${name} "Cancel me"?`, options: { modal: true, detail: "The Task is deleted for good and cannot be brought back." }, items: ["Delete"] }]);
  expect(exists()).toBe(true);
  expect(notices()).toEqual([]);
  expect(snapshots()).toBe(0);
  expect(errors).toEqual([]);
  dialogAnswer = "Cancel";
  await press();
  expect(exists()).toBe(true);
  expect(notices()).toEqual([]);
  expect(task.id).toBeString();
  controller.dispose();
});

test("a Run in progress in this window refuses before the dialog, with a notice and a fresh picture", async () => {
  const { project, name, controller, press, exists } = await setup("Refused by a Run");
  startJob("run", project.root, { held: true }, "delete-run");
  await press();
  expect(dialogs).toEqual([]);
  expect(notices()).toEqual([`Trama could not delete ${name}: A run is in progress.`]);
  expect(snapshots()).toBeGreaterThan(0);
  expect(exists()).toBe(true);
  controller.dispose();
});

test("a Task whose agent is still finishing refuses before the dialog, and the Run does not matter once the turn ends", async () => {
  const { project, task, name, controller, press, exists } = await setup("Refused by the turn");
  receiveNotice({ type: "task-filed", root: project.root, task: task.id, holder: "terminal-1" });
  await press();
  expect(dialogs).toEqual([]);
  expect(notices()).toEqual([`Trama could not delete ${name}: The agent is still finishing.`]);
  expect(exists()).toBe(true);
  receiveNotice({ type: "turn-ended", root: project.root, holder: "terminal-1" });
  posted.length = 0;
  await press();
  expect(dialogs).toHaveLength(1);
  expect(notices()).toEqual([]);
  expect(exists()).toBe(false);
  controller.dispose();
});

test("the conditions are checked again at the instant of deleting: a Run that started while the dialog was open refuses", async () => {
  const { project, name, controller, press, exists } = await setup("Run during the dialog");
  whileOpen = () => startJob("run", project.root, { held: true }, "late-run");
  await press();
  expect(dialogs).toHaveLength(1);
  expect(notices()).toEqual([`Trama could not delete ${name}: A run is in progress.`]);
  expect(snapshots()).toBeGreaterThan(0);
  expect(exists()).toBe(true);
  controller.dispose();
});

test("a Task taken while the dialog was open is not deleted: the core refusal reaches the Board as a notice", async () => {
  const { project, task, name, controller, press, exists } = await setup("Taken during the dialog");
  whileOpen = () => moveTask(project, task.id, "doing", "agent");
  await press();
  expect(notices()).toEqual([`Trama could not delete ${name}: Task ${name} is not in To do (it is doing): only a Task in To do is deleted, so nothing was deleted.`]);
  expect(snapshots()).toBeGreaterThan(0);
  expect(exists()).toBe(true);
  controller.dispose();
});

test("a confirmed Delete deletes the Task, sends the fresh picture and no notice", async () => {
  const { name, controller, press, exists } = await setup("Delete me");
  await press();
  expect(dialogs.map((d) => d.message)).toEqual([`Delete ${name} "Delete me"?`]);
  expect(exists()).toBe(false);
  expect(notices()).toEqual([]);
  expect(errors).toEqual([]);
  expect(snapshots()).toBeGreaterThan(0);
  controller.dispose();
});

test("a message without a valid identity is not a deleteTask: nothing is asked and nothing is deleted", async () => {
  const { controller, exists } = await setup("Not asked");
  const panel = panels.at(-1);
  panel?.receive?.({ type: "deleteTask" });
  panel?.receive?.({ type: "deleteTask", task: "../x" });
  await settle();
  expect(dialogs).toEqual([]);
  expect(exists()).toBe(true);
  controller.dispose();
});
