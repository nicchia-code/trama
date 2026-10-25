import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// A minimal editor: one webview panel that records what it is sent, user settings in memory, the input box and the error messages.
const messages: Record<string, unknown>[] = [];
const userSettings = new Map<string, unknown>();
const errors: string[] = [];
let workspaceFolders: { name: string; uri: { fsPath: string; scheme: string } }[] = [];
let receive: ((raw: unknown) => void) | undefined;
/** What the developer types in the input box; undefined is Esc. */
let typed: string | undefined;
let inputOptions: { title?: string; prompt?: string; password?: boolean; ignoreFocusOut?: boolean; validateInput?: (text: string) => string | undefined } | undefined;
let inputBoxes = 0;

mock.module("vscode", () => ({
  window: {
    createWebviewPanel: () => {
      const disposed: (() => void)[] = [];
      return {
        title: "",
        reveal() {},
        onDidDispose: (listener: () => void) => {
          disposed.push(listener);
          return { dispose() {} };
        },
        // As the editor does, closing the panel tells whoever listens, so the controller drops its subscriptions.
        dispose() {
          for (const listener of disposed.splice(0)) listener();
        },
        webview: {
          html: "",
          cspSource: "",
          asWebviewUri: (uri: unknown) => uri,
          onDidReceiveMessage: (listener: (raw: unknown) => void) => {
            receive = listener;
            return { dispose() {} };
          },
          postMessage: async (message: Record<string, unknown>) => {
            messages.push(message);
            return true;
          },
        },
      };
    },
    showInformationMessage: async () => undefined,
    showWarningMessage: async () => undefined,
    showErrorMessage: async (message: string) => void errors.push(message),
    showInputBox: async (options: typeof inputOptions) => {
      inputBoxes++;
      inputOptions = options;
      return typed;
    },
  },
  workspace: {
    get workspaceFolders() {
      return workspaceFolders;
    },
    getWorkspaceFolder: () => undefined,
    getConfiguration: () => ({
      get: (key: string, fallback: unknown) => userSettings.get(key) ?? fallback,
      inspect: (key: string) => ({ globalValue: userSettings.get(key) }),
      update: async () => undefined,
    }),
    fs: { readDirectory: async () => [] },
  },
  extensions: { getExtension: () => ({ packageJSON: JSON.parse(readFileSync(join(import.meta.dir, "../extension/package.json"), "utf8")) }) },
  ConfigurationTarget: { Global: 1, Workspace: 2 },
  Uri: {
    joinPath: (base: { fsPath: string }, ...parts: string[]) => ({ fsPath: join(base.fsPath, ...parts) }),
    file: (path: string) => ({ fsPath: path }),
    parse: (value: string) => ({ toString: () => value }),
  },
  ViewColumn: { Active: 1, Beside: -2 },
  commands: { executeCommand: async () => undefined },
  env: { appName: "Visual Studio Code", openExternal: async () => true },
  Disposable: class {
    constructor(readonly dispose: () => void) {}
  },
}));

const { Controller } = await import("../extension/src/host/controller");
const { CURSOR_API_KEY_SECRET, cursorKeyEnv, startCursorApiKey } = await import("../extension/src/host/cursor-api-key");
const { ensureOmpUpdated, forgetUpdateCheck } = await import("../extension/src/host/omp-update");
const { ompModels } = await import("../extension/src/host/model-lists");
const { ompStatus } = await import("../extension/src/host/omp-status");
const { ompUsageRunner } = await import("../extension/src/host/omp-chat/usage");

/** The secret storage of the editor: values in memory, failures a test asks for, and `onDidChange` that also fires for the window's own changes, as the editor's does. */
class FakeSecrets {
  values = new Map<string, string>();
  fail: Partial<Record<"get" | "store" | "delete", string>> = {};
  gets = 0;
  private readonly listeners = new Set<(event: { key: string }) => void>();
  async get(key: string): Promise<string | undefined> {
    this.gets++;
    if (this.fail.get !== undefined) throw new Error(this.fail.get);
    return this.values.get(key);
  }
  async store(key: string, value: string): Promise<void> {
    if (this.fail.store !== undefined) throw new Error(this.fail.store);
    this.values.set(key, value);
    this.fire(key);
  }
  async delete(key: string): Promise<void> {
    if (this.fail.delete !== undefined) throw new Error(this.fail.delete);
    this.values.delete(key);
    this.fire(key);
  }
  onDidChange = (listener: (event: { key: string }) => void) => {
    this.listeners.add(listener);
    return { dispose: () => void this.listeners.delete(listener) };
  };
  fire(key: string): void {
    for (const listener of [...this.listeners]) listener({ key });
  }
  /** Another window of the editor saved (or, with undefined, removed) the key. */
  elsewhere(value: string | undefined): void {
    if (value === undefined) this.values.delete(CURSOR_API_KEY_SECRET);
    else this.values.set(CURSOR_API_KEY_SECRET, value);
    this.fire(CURSOR_API_KEY_SECRET);
  }
}

const SECRET_KEY = "trama.cursorApiKey";
let root: string;
let controller: InstanceType<typeof Controller>;
let secrets: FakeSecrets;
let subscription: { dispose(): void };
let program: string;
let log: string;
const inherited = process.env["CURSOR_ACCESS_TOKEN"];

beforeEach(async () => {
  root = mkdtempSync(join(tmpdir(), "trama-cursor-key-"));
  workspaceFolders = [{ name: "app", uri: { fsPath: root, scheme: "file" } }];
  messages.length = 0;
  errors.length = 0;
  userSettings.clear();
  receive = undefined;
  typed = undefined;
  inputOptions = undefined;
  inputBoxes = 0;
  delete process.env["CURSOR_ACCESS_TOKEN"];
  forgetUpdateCheck();
  // An omp that lists one model, says its version and logs every call with the variable it received.
  program = join(root, "omp");
  log = join(root, "calls.log");
  writeFileSync(program, `#!/bin/sh\nprintf '%s|%s\\n' "$*" "\${CURSOR_ACCESS_TOKEN-unset}" >> '${log}'\ncase "$1" in\n  models) echo '{"models":[{"selector":"a/b","provider":"anthropic"}]}' ;;\n  update) echo 'Current version: 18.12.6'; echo 'Already up to date' ;;\n  usage) echo '{}' ;;\n  *) echo 'omp/18.12.6' ;;\nesac\n`);
  chmodSync(program, 0o755);
  userSettings.set("ompPath", program);
  secrets = new FakeSecrets();
  subscription = await startCursorApiKey(secrets as never, (message) => void errors.push(message));
  controller = new Controller({ fsPath: root } as never, undefined, undefined, undefined);
});

afterEach(() => {
  controller.dispose();
  subscription.dispose();
  if (inherited === undefined) delete process.env["CURSOR_ACCESS_TOKEN"];
  else process.env["CURSOR_ACCESS_TOKEN"] = inherited;
  rmSync(root, { recursive: true, force: true });
});

/** Real time passes here because the host under test runs real child processes (the fake omp) and its answers arrive when they end. */
function sleep(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}

async function waitFor(condition: () => boolean, ms = 5000): Promise<void> {
  for (let waited = 0; waited < ms && !condition(); waited += 10) await sleep(10);
}

/** Opens the panel the first time, sends a message from the webview and waits until the host has been quiet for a while, so repeated checks would show. */
async function send(message: Record<string, unknown>): Promise<void> {
  if (receive === undefined) {
    await controller.open();
    messages.length = 0;
  }
  receive?.(message);
  let seen = -1;
  for (let quiet = 0; quiet < 8; ) {
    await sleep(25);
    quiet = messages.length === seen ? quiet + 1 : 0;
    seen = messages.length;
  }
}

const ofType = (type: string) => messages.filter((m) => m["type"] === type);
const calls = (): string[] => (existsSync(log) ? readFileSync(log, "utf8").split("\n").filter((line) => line !== "") : []);
/** The variable each call of omp received, by its arguments. */
const received = (args: string): string[] => calls().filter((line) => line.startsWith(`${args}|`)).map((line) => line.slice(args.length + 1));
/** Waits until the follow-up of a change has ended: the wizard's check and the omp status are both done. */
const checked = () => waitFor(() => ofType("agentCheck").some((m) => m["state"] === "done") && doneChecks().length > 0);
const doneChecks = () => ofType("ompStatus").filter((m) => m["state"] === "done");

test("without a saved key the environment is empty, and a saved key gives CURSOR_ACCESS_TOKEN, which wins over the one the editor inherited", async () => {
  expect(cursorKeyEnv()).toEqual({});
  secrets.values.set(CURSOR_API_KEY_SECRET, "  stored  ");
  subscription.dispose();
  subscription = await startCursorApiKey(secrets as never, (message) => void errors.push(message));
  expect(cursorKeyEnv()).toEqual({ CURSOR_ACCESS_TOKEN: "stored" });

  process.env["CURSOR_ACCESS_TOKEN"] = "editor-token";
  await ompModels(program);
  expect(received("models --json")).toEqual(["stored"]);
  subscription.dispose();
  expect(cursorKeyEnv()).toEqual({});
  await ompModels(program);
  // Without a key Trama neither adds nor removes the variable: the editor's own reaches omp.
  expect(received("models --json")).toEqual(["stored", "editor-token"]);
});

test("omp models, omp --version, the update check and omp usage all receive the key and never a key in their arguments", async () => {
  secrets.values.set(CURSOR_API_KEY_SECRET, "secret-value");
  subscription.dispose();
  subscription = await startCursorApiKey(secrets as never, (message) => void errors.push(message));
  process.env["CURSOR_ACCESS_TOKEN"] = "editor-token";
  await ompModels(program);
  await ompStatus(program);
  await ensureOmpUpdated(program);
  await ompUsageRunner({ ompPath: () => program, findOmp: async () => program, folder: () => root })();
  const seen = calls();
  expect(seen.map((line) => line.split("|")[0]).sort()).toEqual(["--version", "--version", "models --json", "update --check", "usage --json"]);
  for (const line of seen) expect(line.split("|")[1]).toBe("secret-value");
  expect(seen.some((line) => line.split("|")[0]?.includes("secret-value"))).toBe(false);
});

test("Set API key opens a masked box, saves the key without the spaces around it, tells the panel and checks omp once with the path of the message", async () => {
  typed = "  sk-test-key  ";
  await send({ type: "setCursorApiKey", ompPath: program });
  await checked();
  expect(inputBoxes).toBe(1);
  expect(inputOptions).toMatchObject({ title: "Cursor API key", prompt: "Paste a user API key from the Cursor dashboard. Trama keeps it in the editor's secret storage.", password: true, ignoreFocusOut: true });
  expect(inputOptions?.validateInput?.("")).toBe("Enter a Cursor API key.");
  expect(inputOptions?.validateInput?.("   \t")).toBe("Enter a Cursor API key.");
  expect(inputOptions?.validateInput?.("sk")).toBeUndefined();
  expect(secrets.values.get(SECRET_KEY)).toBe("sk-test-key");
  expect(cursorKeyEnv()).toEqual({ CURSOR_ACCESS_TOKEN: "sk-test-key" });

  expect(ofType("cursorApiKey")).toEqual([{ type: "cursorApiKey", saved: true }]);
  // The checks run once although the secret storage also announced the window's own change.
  expect(ofType("agentCheck").filter((m) => m["state"] === "done")).toEqual([{ type: "agentCheck", ompPath: program, state: "done", ok: true, missing: false, version: "18.12.6", models: 1, providers: ["anthropic"] }]);
  expect(ofType("ompStatus").filter((m) => m["state"] === "checking")).toHaveLength(1);
  expect(doneChecks()).toHaveLength(1);
  expect(ofType("modelSuggestions")).toHaveLength(1);
  expect(errors).toEqual([]);
  // The processes of the checks got the new key; the key itself is in no message.
  expect(received("models --json")).toEqual(["sk-test-key", "sk-test-key"]);
  expect(received("--version").every((value) => value === "sk-test-key")).toBe(true);
  expect(JSON.stringify(messages)).not.toContain("sk-test-key");
});

test("without an omp path in the message the check is for the saved trama.ompPath", async () => {
  typed = "k1";
  await send({ type: "setCursorApiKey" });
  await checked();
  expect(ofType("agentCheck").filter((m) => m["state"] === "done").map((m) => m["ompPath"])).toEqual([program]);
});

test("Esc, or a text that is only spaces, changes nothing and checks nothing, and the panel is only told the state as it is", async () => {
  typed = undefined;
  await send({ type: "setCursorApiKey", ompPath: program });
  typed = "   ";
  await send({ type: "setCursorApiKey", ompPath: program });
  expect(inputBoxes).toBe(2);
  expect(secrets.values.size).toBe(0);
  expect(cursorKeyEnv()).toEqual({});
  expect(messages).toEqual([
    { type: "cursorApiKey", saved: false },
    { type: "cursorApiKey", saved: false },
  ]);
  expect(calls()).toEqual([]);
  expect(errors).toEqual([]);
});

test("a new key replaces the old one, which the next processes no longer see", async () => {
  typed = "first";
  await send({ type: "setCursorApiKey", ompPath: program });
  await checked();
  messages.length = 0;
  typed = "second";
  await send({ type: "setCursorApiKey", ompPath: program });
  await checked();
  expect(secrets.values.get(SECRET_KEY)).toBe("second");
  expect([...secrets.values.keys()]).toEqual([SECRET_KEY]);
  expect(cursorKeyEnv()).toEqual({ CURSOR_ACCESS_TOKEN: "second" });
  expect(received("models --json").at(-1)).toBe("second");
  expect(ofType("cursorApiKey")).toEqual([{ type: "cursorApiKey", saved: true }]);
});

test("Remove API key removes the key without asking, tells the panel, checks omp once again, and the editor's own CURSOR_ACCESS_TOKEN reaches omp again", async () => {
  process.env["CURSOR_ACCESS_TOKEN"] = "editor-token";
  typed = "saved-key";
  await send({ type: "setCursorApiKey", ompPath: program });
  await checked();
  expect(received("models --json").at(-1)).toBe("saved-key");
  messages.length = 0;
  inputBoxes = 0;
  await send({ type: "removeCursorApiKey", ompPath: program });
  await checked();
  expect(inputBoxes).toBe(0);
  expect(secrets.values.size).toBe(0);
  expect(cursorKeyEnv()).toEqual({});
  expect(ofType("cursorApiKey")).toEqual([{ type: "cursorApiKey", saved: false }]);
  expect(ofType("agentCheck").filter((m) => m["state"] === "done")).toHaveLength(1);
  expect(doneChecks()).toHaveLength(1);
  expect(received("models --json").at(-1)).toBe("editor-token");
  expect(process.env["CURSOR_ACCESS_TOKEN"]).toBe("editor-token");
});

test("a secret storage that fails to save shows the reason, changes nothing and checks nothing, and the panel is only told the state as it is", async () => {
  secrets.fail.store = "keychain locked";
  typed = "doomed";
  await send({ type: "setCursorApiKey", ompPath: program });
  expect(errors).toEqual(["Trama: could not save the Cursor API key: keychain locked."]);
  expect(secrets.values.size).toBe(0);
  expect(cursorKeyEnv()).toEqual({});
  expect(messages).toEqual([{ type: "cursorApiKey", saved: false }]);
  expect(calls()).toEqual([]);
});

test("a secret storage that fails to delete shows the reason, keeps the key and checks nothing, and the panel is only told the state as it is", async () => {
  typed = "kept";
  await send({ type: "setCursorApiKey", ompPath: program });
  messages.length = 0;
  secrets.fail.delete = "denied";
  const before = calls().length;
  await send({ type: "removeCursorApiKey", ompPath: program });
  expect(errors).toEqual(["Trama: could not remove the Cursor API key: denied."]);
  expect(secrets.values.get(SECRET_KEY)).toBe("kept");
  expect(cursorKeyEnv()).toEqual({ CURSOR_ACCESS_TOKEN: "kept" });
  expect(messages).toEqual([{ type: "cursorApiKey", saved: true }]);
  expect(calls()).toHaveLength(before);
});

test("a key that cannot be read at activation is reported once, omp starts without it, and the row is as without a key", async () => {
  subscription.dispose();
  secrets.values.set(CURSOR_API_KEY_SECRET, "unreadable");
  secrets.fail.get = "boom";
  subscription = await startCursorApiKey(secrets as never, (message) => void errors.push(message));
  expect(errors).toEqual(["Trama: could not read the Cursor API key: boom."]);
  expect(cursorKeyEnv()).toEqual({});
  await send({ type: "ompStatusWanted" });
  expect(ofType("cursorApiKey")).toEqual([{ type: "cursorApiKey", saved: false }]);
  // A change announced by another window that cannot be read is reported again, once, and runs nothing.
  messages.length = 0;
  secrets.fire(CURSOR_API_KEY_SECRET);
  await sleep(100);
  expect(errors).toEqual(["Trama: could not read the Cursor API key: boom.", "Trama: could not read the Cursor API key: boom."]);
  expect(messages).toEqual([]);
});

test("a key saved, changed or removed by another window is read again, the panel is told and omp is read again, with the check left to the wizard's webview", async () => {
  await send({ type: "ompStatusWanted" });
  messages.length = 0;
  secrets.elsewhere("from-elsewhere");
  await waitFor(() => doneChecks().length > 0);
  await sleep(100);
  expect(cursorKeyEnv()).toEqual({ CURSOR_ACCESS_TOKEN: "from-elsewhere" });
  expect(ofType("cursorApiKey")).toEqual([{ type: "cursorApiKey", saved: true }]);
  expect(ofType("ompStatus").filter((m) => m["state"] === "checking")).toHaveLength(1);
  expect(doneChecks()).toHaveLength(1);
  expect(ofType("agentCheck")).toEqual([]);
  expect(received("models --json")).toContain("from-elsewhere");

  // An event that brings no change (the same value) does nothing.
  messages.length = 0;
  secrets.fire(CURSOR_API_KEY_SECRET);
  await sleep(100);
  expect(messages).toEqual([]);

  // Another secret is not ours.
  secrets.fire("another.key");
  await sleep(50);
  expect(messages).toEqual([]);

  secrets.elsewhere(undefined);
  await waitFor(() => ofType("cursorApiKey").length > 0);
  await sleep(100);
  expect(cursorKeyEnv()).toEqual({});
  expect(ofType("cursorApiKey")).toEqual([{ type: "cursorApiKey", saved: false }]);
  expect(ofType("agentCheck")).toEqual([]);
});

test("the panel is told whether a key is saved at ready and when the Settings tab becomes visible, and never the key", async () => {
  secrets.values.set(CURSOR_API_KEY_SECRET, "never-shown");
  subscription.dispose();
  subscription = await startCursorApiKey(secrets as never, (message) => void errors.push(message));
  await send({ type: "ready" });
  expect(ofType("cursorApiKey")).toEqual([{ type: "cursorApiKey", saved: true }]);
  messages.length = 0;
  await send({ type: "ompStatusWanted" });
  expect(ofType("cursorApiKey")).toEqual([{ type: "cursorApiKey", saved: true }]);
  expect(JSON.stringify(messages)).not.toContain("never-shown");
});

test("the key is only in the secret storage and in memory: no file under the project, no setting", async () => {
  typed = "only-in-the-keychain";
  await send({ type: "setCursorApiKey", ompPath: program });
  expect([...userSettings.keys()]).toEqual(["ompPath"]);
  const found = Bun.spawnSync(["grep", "-rl", "only-in-the-keychain", root]);
  // The only file that could hold it is the fake omp's log of the variable it received.
  expect(found.stdout.toString().trim().split("\n").filter((file) => file !== "" && file !== log)).toEqual([]);
});
