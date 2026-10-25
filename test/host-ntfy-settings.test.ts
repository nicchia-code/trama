import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

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
const { NTFY_TOKEN_SECRET, ntfyToken, ntfyTokenSaved, onNtfyTokenChanged, startNtfyToken } = await import("../extension/src/host/ntfy-token");

/** The secret storage of the editor: values in memory, failures a test asks for, and `onDidChange` that also fires for the window's own changes, as the editor's does. */
class FakeSecrets {
  values = new Map<string, string>();
  fail: Partial<Record<"get" | "store" | "delete", string>> = {};
  private readonly listeners = new Set<(event: { key: string }) => void>();
  async get(key: string): Promise<string | undefined> {
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
  /** Another window of the editor saved (or, with undefined, removed) the token. */
  elsewhere(value: string | undefined): void {
    if (value === undefined) this.values.delete(NTFY_TOKEN_SECRET);
    else this.values.set(NTFY_TOKEN_SECRET, value);
    this.fire(NTFY_TOKEN_SECRET);
  }
}

let root: string;
let controller: InstanceType<typeof Controller>;
let secrets: FakeSecrets;
let subscription: { dispose(): void };
const realFetch = globalThis.fetch;
/** What the server answers, and what the host asked of it. */
let answer: () => Response | Promise<Response>;
let requests: { url: string; init: RequestInit }[];

beforeEach(async () => {
  root = mkdtempSync(join(tmpdir(), "trama-ntfy-settings-"));
  workspaceFolders = [{ name: "app", uri: { fsPath: root, scheme: "file" } }];
  messages.length = 0;
  errors.length = 0;
  userSettings.clear();
  receive = undefined;
  typed = undefined;
  inputOptions = undefined;
  inputBoxes = 0;
  requests = [];
  answer = () => new Response("{}", { status: 200 });
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    requests.push({ url: String(input), init: init ?? {} });
    return answer();
  }) as typeof fetch;
  secrets = new FakeSecrets();
  subscription = await startNtfyToken(secrets as never, (message) => void errors.push(message));
  controller = new Controller({ fsPath: root } as never, undefined, undefined, undefined);
});

afterEach(() => {
  controller.dispose();
  subscription.dispose();
  globalThis.fetch = realFetch;
  rmSync(root, { recursive: true, force: true });
});

/** Real time passes here because the host answers on its own turns of the event loop. */
function sleep(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}

/** Opens the panel the first time, sends a message from the webview and waits until the host has been quiet for a while. */
async function send(message: Record<string, unknown>): Promise<void> {
  if (receive === undefined) {
    await controller.open();
    messages.length = 0;
  }
  receive?.(message);
  let seen = -1;
  for (let quiet = 0; quiet < 6; ) {
    await sleep(20);
    quiet = messages.length === seen ? quiet + 1 : 0;
    seen = messages.length;
  }
}

const ofType = (type: string) => messages.filter((m) => m["type"] === type);

test("the token is read at the start, kept in memory with no spaces around it, and none is none", async () => {
  expect(ntfyTokenSaved()).toBe(false);
  expect(ntfyToken()).toBeUndefined();
  secrets.values.set(NTFY_TOKEN_SECRET, "  tk_stored  ");
  subscription.dispose();
  subscription = await startNtfyToken(secrets as never, (message) => void errors.push(message));
  expect(ntfyTokenSaved()).toBe(true);
  expect(ntfyToken()).toBe("tk_stored");
  secrets.values.set(NTFY_TOKEN_SECRET, "   ");
  subscription.dispose();
  subscription = await startNtfyToken(secrets as never, (message) => void errors.push(message));
  expect(ntfyTokenSaved()).toBe(false);
  subscription.dispose();
  expect(ntfyToken()).toBeUndefined();
});

test("a failed read is told once as the editor's error, without the token, and leaves no token", async () => {
  secrets.fail.get = "keychain locked";
  subscription.dispose();
  subscription = await startNtfyToken(secrets as never, (message) => void errors.push(message));
  expect(errors).toEqual(["Trama: could not read the ntfy access token: keychain locked."]);
  expect(ntfyTokenSaved()).toBe(false);
});

test("the Settings tab is told at ready, and at ompStatusWanted, whether a token is saved: never the token", async () => {
  secrets.values.set(NTFY_TOKEN_SECRET, "tk_secret_value");
  subscription.dispose();
  subscription = await startNtfyToken(secrets as never, (message) => void errors.push(message));
  await controller.open();
  messages.length = 0;
  receive?.({ type: "ready" });
  await sleep(50);
  expect(ofType("ntfyToken")).toEqual([{ type: "ntfyToken", saved: true }]);
  messages.length = 0;
  receive?.({ type: "ompStatusWanted" });
  await sleep(100);
  expect(ofType("ntfyToken")).toEqual([{ type: "ntfyToken", saved: true }]);
  expect(JSON.stringify(messages)).not.toContain("tk_secret_value");
});

test("Set access token opens a masked box with the texts of the requirement, saves the token trimmed and tells the panel", async () => {
  typed = "  tk_new  ";
  await send({ type: "setNtfyToken" });
  expect(inputBoxes).toBe(1);
  expect(inputOptions).toMatchObject({ title: "ntfy Access Token", prompt: "Paste the access token of your ntfy server.", password: true, ignoreFocusOut: true });
  expect(inputOptions?.validateInput?.("")).toBe("Enter an access token.");
  expect(inputOptions?.validateInput?.("  \t")).toBe("Enter an access token.");
  expect(inputOptions?.validateInput?.("tk")).toBeUndefined();
  expect(secrets.values.get(NTFY_TOKEN_SECRET)).toBe("tk_new");
  expect(ntfyToken()).toBe("tk_new");
  expect(ofType("ntfyToken")).toEqual([{ type: "ntfyToken", saved: true }]);
  expect(errors).toEqual([]);
  expect(JSON.stringify(messages)).not.toContain("tk_new");
});

test("Esc changes nothing: no token saved, the panel is told the state as it is", async () => {
  typed = undefined;
  await send({ type: "setNtfyToken" });
  expect(secrets.values.size).toBe(0);
  expect(ofType("ntfyToken")).toEqual([{ type: "ntfyToken", saved: false }]);
});

test("a keychain that cannot save tells the developer with the reason, and nothing changes", async () => {
  secrets.values.set(NTFY_TOKEN_SECRET, "tk_old");
  subscription.dispose();
  subscription = await startNtfyToken(secrets as never, (message) => void errors.push(message));
  secrets.fail.store = "disk full";
  typed = "tk_new";
  await send({ type: "setNtfyToken" });
  expect(errors).toEqual(["Trama: could not save the ntfy access token: disk full."]);
  expect(ntfyToken()).toBe("tk_old");
  expect(secrets.values.get(NTFY_TOKEN_SECRET)).toBe("tk_old");
  expect(ofType("ntfyToken")).toEqual([{ type: "ntfyToken", saved: true }]);
});

test("Remove access token removes it without asking; a keychain that cannot remove tells the developer and nothing changes", async () => {
  secrets.values.set(NTFY_TOKEN_SECRET, "tk_old");
  subscription.dispose();
  subscription = await startNtfyToken(secrets as never, (message) => void errors.push(message));
  secrets.fail.delete = "denied";
  await send({ type: "removeNtfyToken" });
  expect(errors).toEqual(["Trama: could not remove the ntfy access token: denied."]);
  expect(ntfyTokenSaved()).toBe(true);
  expect(ofType("ntfyToken")).toEqual([{ type: "ntfyToken", saved: true }]);
  messages.length = 0;
  delete secrets.fail.delete;
  await send({ type: "removeNtfyToken" });
  expect(inputBoxes).toBe(0);
  expect(ntfyTokenSaved()).toBe(false);
  expect(secrets.values.has(NTFY_TOKEN_SECRET)).toBe(false);
  expect(ofType("ntfyToken")).toEqual([{ type: "ntfyToken", saved: false }]);
});

test("a token saved or removed in another window tells the panel and the next request uses it", async () => {
  await controller.open();
  messages.length = 0;
  secrets.elsewhere("tk_elsewhere");
  await sleep(60);
  expect(ofType("ntfyToken")).toEqual([{ type: "ntfyToken", saved: true }]);
  expect(ntfyToken()).toBe("tk_elsewhere");
  const heard: string[] = [];
  const listening = onNtfyTokenChanged(() => heard.push(ntfyToken() ?? "none"));
  secrets.elsewhere(undefined);
  await sleep(60);
  listening.dispose();
  expect(heard).toEqual(["none"]);
  expect(ofType("ntfyToken").at(-1)).toEqual({ type: "ntfyToken", saved: false });
});

test("Send test notification sends one request to the server and topic of now with the saved token, and says sending then sent", async () => {
  mkdirSync(join(root, ".trama"), { recursive: true });
  userSettings.set("ntfyServer", "https://ntfy.example.org");
  userSettings.set("ntfyTopic", "mytopic");
  secrets.values.set(NTFY_TOKEN_SECRET, "tk_secret");
  subscription.dispose();
  subscription = await startNtfyToken(secrets as never, (message) => void errors.push(message));
  await send({ type: "sendTestNotification" });
  expect(requests).toHaveLength(1);
  expect(requests[0]?.url).toBe("https://ntfy.example.org/");
  expect(requests[0]?.init.headers).toEqual({ "Content-Type": "application/json", Authorization: "Bearer tk_secret" });
  expect(JSON.parse(requests[0]?.init.body as string)).toEqual({ topic: "mytopic", title: `${basename(root)} - Test notification`, message: "Trama's notifications reach this device.", tags: ["bell"], priority: 3 });
  expect(ofType("testNotification")).toEqual([{ type: "testNotification", state: "sending" }, { type: "testNotification", state: "sent" }]);
  expect(JSON.stringify(messages)).not.toContain("tk_secret");
  expect(JSON.stringify(messages)).not.toContain("mytopic");
});

test("without a project the title says Trama, and without a token no Authorization header goes", async () => {
  userSettings.set("ntfyTopic", "mytopic");
  await send({ type: "sendTestNotification" });
  expect(requests[0]?.url).toBe("https://ntfy.sh/");
  expect(requests[0]?.init.headers).toEqual({ "Content-Type": "application/json" });
  expect(JSON.parse(requests[0]?.init.body as string).title).toBe("Trama - Test notification");
});

test("a server that does not accept it, a redirect and a network error are told with their reason, and nothing is retried", async () => {
  userSettings.set("ntfyTopic", "mytopic");
  answer = () => new Response(null, { status: 401 });
  await send({ type: "sendTestNotification" });
  answer = () => new Response(null, { status: 302 });
  await send({ type: "sendTestNotification" });
  answer = () => Promise.reject(new TypeError("fetch failed"));
  await send({ type: "sendTestNotification" });
  answer = () => Promise.reject(Object.assign(new Error("The operation timed out."), { name: "TimeoutError" }));
  await send({ type: "sendTestNotification" });
  expect(requests).toHaveLength(4);
  expect(ofType("testNotification").filter((m) => m["state"] === "failed")).toEqual([
    { type: "testNotification", state: "failed", reason: "HTTP 401" },
    { type: "testNotification", state: "failed", reason: "the server redirected the request" },
    { type: "testNotification", state: "failed", reason: "fetch failed" },
    { type: "testNotification", state: "failed", reason: "no response within 10 seconds" },
  ]);
  expect(errors).toEqual([]);
});

test("a test is refused with no topic or an invalid setting, and while another one is being sent", async () => {
  await send({ type: "sendTestNotification" });
  userSettings.set("ntfyTopic", "bad topic");
  await send({ type: "sendTestNotification" });
  userSettings.set("ntfyTopic", "mytopic");
  userSettings.set("ntfyServer", "ftp://nope");
  await send({ type: "sendTestNotification" });
  expect(requests).toEqual([]);
  expect(ofType("testNotification")).toEqual([]);

  userSettings.set("ntfyServer", undefined);
  const gate = Promise.withResolvers<Response>();
  answer = () => gate.promise;
  receive?.({ type: "sendTestNotification" });
  await sleep(30);
  receive?.({ type: "sendTestNotification" });
  await sleep(30);
  expect(requests).toHaveLength(1);
  expect(ofType("testNotification")).toEqual([{ type: "testNotification", state: "sending" }]);
  gate.resolve(new Response("{}", { status: 200 }));
  await sleep(60);
  expect(ofType("testNotification").at(-1)).toEqual({ type: "testNotification", state: "sent" });
  // A new test is accepted once the last one ended.
  answer = () => new Response("{}", { status: 200 });
  await send({ type: "sendTestNotification" });
  expect(requests).toHaveLength(2);
});

test("a workspace value of the topic or the server never counts for the test", async () => {
  // Only the user value is read: the mock gives no workspace value at all, so an empty user value is no topic.
  await send({ type: "sendTestNotification" });
  expect(requests).toEqual([]);
});
