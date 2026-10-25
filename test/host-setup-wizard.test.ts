import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startCursorApiKey } from "../extension/src/host/cursor-api-key";

const NO_ORIGIN = { repository: null, reason: "No origin remote" };
// A minimal editor: one webview panel that records what it is sent, user settings in memory, and the modal dialog answers.
const messages: Record<string, unknown>[] = [];
const userSettings = new Map<string, unknown>();
const writes: string[] = [];
let failOn: string | undefined;
let workspaceFolders: { name: string; uri: { fsPath: string; scheme: string } }[] = [];
let receive: ((raw: unknown) => void) | undefined;
let modalAnswer: string | undefined;
/** Called with every message the panel is sent, so a test can wait for one instead of guessing a delay. */
const postListeners = new Set<(message: Record<string, unknown>) => void>();
const modals: string[] = [];
/** What the editor showed outside the panel: information and error messages, and the modal dialogs with their options and buttons. */
const infos: string[] = [];
const errors: string[] = [];
const warnings: { message: string; options: unknown; items: string[] }[] = [];
const opened: { path: string; options: unknown }[] = [];
/** Every login terminal the controller opened: what it ran and the callback that tells its command ended. */
const logins: { program: string; provider: { id: string; name: string }; finish: () => void }[] = [];

mock.module("vscode", () => ({
  window: {
    createWebviewPanel: () => ({
      title: "",
      reveal() {},
      onDidDispose: () => ({ dispose() {} }),
      dispose() {},
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
          for (const listener of [...postListeners]) listener(message);
          return true;
        },
      },
    }),
    showInformationMessage: async (message: string) => void infos.push(message),
    showWarningMessage: async (message: string, options?: unknown, ...items: string[]) => {
      modals.push(message);
      warnings.push({ message, options, items });
      return modalAnswer;
    },
    showErrorMessage: async (message: string) => void errors.push(message),
    showTextDocument: async (document: { fsPath: string }, options: unknown) => void opened.push({ path: document.fsPath, options }),
  },
  workspace: {
    get workspaceFolders() {
      return workspaceFolders;
    },
    getWorkspaceFolder: () => undefined,
    openTextDocument: async (uri: { fsPath: string }) => uri,
    getConfiguration: () => ({
      get: (key: string, fallback: unknown) => userSettings.get(key) ?? fallback,
      inspect: (key: string) => ({ globalValue: userSettings.get(key) }),
      update: async (key: string, value: unknown) => {
        if (key === failOn) throw new Error("disk full");
        writes.push(key);
        if (value === undefined) userSettings.delete(key);
        else userSettings.set(key, value);
      },
    }),
    fs: {
      readDirectory: async () => [],
    },
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

// The agent is not started: its instruction is what the wizard's confirmation hands over.
const launched: { instruction: unknown; name: unknown }[] = [];
const realAgent = await import("../extension/src/host/agent");
mock.module("../extension/src/host/agent", () => ({
  ...realAgent,
  launchAgent: async (_root: string, instruction: unknown, name: unknown) => {
    launched.push({ instruction, name });
    return { kind: "sent" };
  },
  launched: () => true,
  loginOmp: (program: string, provider: { id: string; name: string }, finish: () => void) => void logins.push({ program, provider, finish }),
}));
const { Controller } = await import("../extension/src/host/controller");

let root: string;
let controller: InstanceType<typeof Controller>;
let setups: number;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "trama-wizard-host-"));
  workspaceFolders = [{ name: "app", uri: { fsPath: root, scheme: "file" } }];
  messages.length = 0;
  userSettings.clear();
  writes.length = 0;
  launched.length = 0;
  modals.length = 0;
  infos.length = 0;
  errors.length = 0;
  warnings.length = 0;
  opened.length = 0;
  modalAnswer = undefined;
  failOn = undefined;
  setups = 0;
  logins.length = 0;
  receive = undefined;
  controller = new Controller({ fsPath: root } as never, undefined, undefined, { writeSetup: async () => void setups++ } as never);
});

afterEach(() => {
  controller.dispose();
  rmSync(root, { recursive: true, force: true });
});

/** Opens the panel, sends one message from the webview and waits for the host to answer. */
async function send(message: Record<string, unknown>): Promise<void> {
  if (receive === undefined) {
    await controller.open();
    messages.length = 0;
  }
  receive?.(message);
  await settled();
}

/** Waits until the host has said and done nothing new for a while. */
async function settled(): Promise<void> {
  let seen = -1;
  for (let quiet = 0; quiet < 5; ) {
    await new Promise((resolve) => setTimeout(resolve, 20));
    const now = messages.length + launched.length + setups + writes.length;
    quiet = now === seen ? quiet + 1 : 0;
    seen = now;
  }
}

const confirm = (over: Record<string, unknown> = {}) => ({ type: "confirmSetup", mode: "first", choice: "import", root, values: [], excluded: [], ...over });
const results = () => messages.filter((m) => m["type"] === "setup" || m["type"] === "guidedSetupResult");

test("the first setup saves the changed keys in order, initializes the chosen folder with the chosen skills folder, then asks the agent to import without the excluded paths", async () => {
  await send(confirm({ values: [{ key: "trama.scan", value: "gpt-5" }, { key: "trama.skillsDir", value: ".claude/skills" }, { key: "trama.theme", value: "auto" }], excluded: ["docs", "src/old"] }));
  expect(writes).toEqual(["scan", "skillsDir", "theme"]);
  // A value equal to the default is removed from the user settings, not stored.
  expect(userSettings.get("theme")).toBeUndefined();
  expect(userSettings.get("skillsDir")).toBe(".claude/skills");
  expect(existsSync(join(root, ".trama", "model", "system.md"))).toBe(true);
  expect(existsSync(join(root, ".claude", "skills", "trama-design", "SKILL.md"))).toBe(true);
  expect(results()).toEqual([{ type: "setup", busy: true, error: null }, { type: "setup", busy: false, error: null }]);
  expect(launched).toHaveLength(1);
  expect(launched[0]?.name).toBe("Import");
  expect(String(launched[0]?.instruction)).toContain("Use the trama-import skill on this repository. Do not import these paths and do not ask which folders to import: `docs`, `src/old`.");
});

test("the first setup with Import from Code and nothing excluded says every folder is imported", async () => {
  await send(confirm());
  expect(String(launched[0]?.instruction)).toContain("Use the trama-import skill on this repository. Import every folder and do not ask which folders to import.");
});

test("the first setup with Start from Scratch opens the setup request and launches nothing", async () => {
  await send(confirm({ choice: "scratch" }));
  expect(existsSync(join(root, ".trama"))).toBe(true);
  expect(setups).toBe(1);
  expect(launched).toEqual([]);
});

test("a saving that fails stops the confirmation: the keys already saved stay, nothing is initialized and nothing starts, and the reason shows", async () => {
  failOn = "skillsDir";
  await send(confirm({ values: [{ key: "trama.scan", value: "gpt-5" }, { key: "trama.skillsDir", value: "x" }, { key: "trama.theme", value: "dark" }] }));
  expect(writes).toEqual(["scan"]);
  expect(userSettings.get("scan")).toBe("gpt-5");
  expect(existsSync(join(root, ".trama"))).toBe(false);
  expect(launched).toEqual([]);
  expect(results().at(-1)).toEqual({ type: "setup", busy: false, error: "Could not save Skills Dir: disk full." });
  // The settings are sent again, so the wizard compares with what really holds.
  expect(messages.some((m) => m["type"] === "settings")).toBe(true);
});

test("the developer who declines to overwrite customised skills gets no message, and nothing is created or started", async () => {
  mkdirSync(join(root, ".agents", "skills", "trama-design"), { recursive: true });
  writeFileSync(join(root, ".agents", "skills", "trama-design", "SKILL.md"), "my own version");
  modalAnswer = undefined;
  await send(confirm({ values: [{ key: "trama.scan", value: "gpt-5" }] }));
  expect(modals).toEqual(["Trama did not initialize this project."]);
  expect(existsSync(join(root, ".trama"))).toBe(false);
  expect(launched).toEqual([]);
  expect(results().at(-1)).toEqual({ type: "setup", busy: false, error: null });
  // The settings stay saved; a repeated confirmation writes only what the wizard still sees as different.
  expect(userSettings.get("scan")).toBe("gpt-5");
});

test("a confirmation of the mode Settings only saves the keys and answers with the result", async () => {
  await send(confirm({ mode: "settings", choice: undefined, root: undefined, values: [{ key: "trama.advisorScanner", value: false }] }));
  expect(userSettings.get("advisorScanner")).toBe(false);
  expect(existsSync(join(root, ".trama"))).toBe(false);
  expect(launched).toEqual([]);
  expect(results()).toEqual([{ type: "guidedSetupResult", ok: true, error: null }]);
});

test("a failure of the mode Settings leaves the wizard on the summary with the reason", async () => {
  failOn = "theme";
  await send(confirm({ mode: "settings", choice: undefined, root: undefined, values: [{ key: "trama.theme", value: "dark" }] }));
  expect(results()).toEqual([{ type: "guidedSetupResult", ok: false, error: "Could not save Theme: disk full." }]);
});

test("the Empty Model mode, in a project, saves the keys and carries on with the path without initializing", async () => {
  mkdirSync(join(root, ".trama", "model"), { recursive: true });
  writeFileSync(join(root, ".trama", "model", "system.md"), "# App\n\nx\n");
  await send(confirm({ mode: "empty-model", root: undefined, values: [{ key: "trama.scan", value: "m" }], excluded: ["a"] }));
  expect(results()).toEqual([{ type: "guidedSetupResult", ok: true, error: null }]);
  expect(String(launched[0]?.instruction)).toContain("Do not import these paths and do not ask which folders to import: `a`.");
});

test("omp is checked at the given path: omp that is not found says where it looked", async () => {
  await send({ type: "agentCheckWanted", ompPath: join(root, "no-such-omp") });
  expect(messages.find((m) => m["type"] === "agentCheck")).toEqual({ type: "agentCheck", ompPath: join(root, "no-such-omp"), state: "done", ok: false, missing: true, error: `omp not found at ${join(root, "no-such-omp")}` });
});

test("the model names for the wizard answer for the omp path it asked about and say so", async () => {
  await send({ type: "modelSuggestionsWanted", ompPath: join(root, "no-such-omp") });
  expect(messages.find((m) => m["type"] === "modelSuggestions")).toEqual({ type: "modelSuggestions", models: [], error: `omp not found at ${join(root, "no-such-omp")}`, missing: true, ompPath: join(root, "no-such-omp") });
});

test("the omp status says checking, then that omp is not found at the path set; the model suggestions come from the same call", async () => {
  userSettings.set("ompPath", join(root, "no-such-omp"));
  await send({ type: "ompStatusWanted" });
  expect(messages.filter((m) => m["type"] === "ompStatus")).toEqual([
    { type: "ompStatus", state: "checking" },
    { type: "ompStatus", state: "done", missing: true, error: `omp not found at ${join(root, "no-such-omp")}` },
  ]);
  expect(messages.filter((m) => m["type"] === "modelSuggestions")).toEqual([{ type: "modelSuggestions", models: [], error: `omp not found at ${join(root, "no-such-omp")}`, missing: true }]);
});

/** An omp that lists two models and says its version, and counts how many times it is asked for the list. */
function fakeOmp(): { program: string; calls: () => number } {
  const program = join(root, "omp");
  const counter = join(root, "models-calls");
  writeFileSync(program, `#!/bin/sh\ncase "$1" in\n  models) echo x >> '${counter}'; echo '{"models":[{"selector":"a/b","provider":"anthropic"},{"selector":"c/d","provider":"xai-oauth"},{"selector":"c/e","provider":"xai-oauth"}]}' ;;\n  *) echo 'omp/18.12.6' ;;\nesac\n`, { mode: 0o755 });
  return { program, calls: () => (existsSync(counter) ? readFileSync(counter, "utf8").split("\n").filter((l) => l !== "").length : 0) };
}

test.skipIf(process.platform === "win32")("a change of the omp path sends the status again; the status of omp that answers carries its version and the number of its models", async () => {
  const { program } = fakeOmp();
  userSettings.set("ompPath", program);
  await send({ type: "ompStatusWanted" });
  messages.length = 0;
  controller.settingsChanged(true);
  await controller.refreshOmp();
  expect(messages.filter((m) => m["type"] === "ompStatus")).toEqual([
    { type: "ompStatus", state: "checking" },
    { type: "ompStatus", state: "done", missing: false, version: "18.12.6", models: 3, providers: ["anthropic", "xai-oauth"] },
  ]);
  expect(messages.filter((m) => m["type"] === "modelSuggestions")).toEqual([{ type: "modelSuggestions", models: [{ value: "a/b" }, { value: "c/d" }, { value: "c/e" }] }]);
});

/** An omp of version `version` that is up to date and lists one model. */
function fakeOmpOfVersion(version: string): string {
  const program = join(root, "omp");
  writeFileSync(program, `#!/bin/sh\ncase "$1" in\n  models) echo '{"models":[{"selector":"a/b","provider":"anthropic"}]}' ;;\n  update) echo 'Current version: ${version}'; echo 'Already up to date' ;;\n  *) echo 'omp/${version}' ;;\nesac\n`, { mode: 0o755 });
  return program;
}

test.skipIf(process.platform === "win32")("an omp older than the minimum is flagged tooOld in the Settings status and in the wizard's check, with its version, and a recent one is not", async () => {
  const { forgetUpdateCheck } = await import("../extension/src/host/omp-update");
  forgetUpdateCheck();
  const program = fakeOmpOfVersion("18.12.5");
  userSettings.set("ompPath", program);
  await send({ type: "ompStatusWanted" });
  await controller.refreshOmp();
  expect(messages.filter((m) => m["type"] === "ompStatus").at(-1)).toEqual({ type: "ompStatus", state: "done", missing: false, version: "18.12.5", tooOld: true, models: 1, providers: ["anthropic"] });
  await send({ type: "agentCheckWanted", ompPath: program });
  expect(messages.filter((m) => m["type"] === "agentCheck").at(-1)).toEqual({ type: "agentCheck", ompPath: program, state: "done", ok: true, missing: false, version: "18.12.5", models: 1, providers: ["anthropic"], tooOld: true });

  forgetUpdateCheck();
  fakeOmpOfVersion("18.12.6");
  messages.length = 0;
  await send({ type: "ompStatusWanted" });
  await controller.refreshOmp(true);
  expect(messages.filter((m) => m["type"] === "ompStatus").at(-1)).toEqual({ type: "ompStatus", state: "done", missing: false, version: "18.12.6", models: 1, providers: ["anthropic"] });
  await send({ type: "agentCheckWanted", ompPath: program });
  expect(messages.filter((m) => m["type"] === "agentCheck").at(-1)).toEqual({ type: "agentCheck", ompPath: program, state: "done", ok: true, missing: false, version: "18.12.6", models: 1, providers: ["anthropic"] });
});

test.skipIf(process.platform === "win32")("ompLogin from the wizard opens the login terminal with the omp of the step, saved or not, and checks omp at that path again when the command ends", async () => {
  const program = fakeOmpOfVersion("18.12.6");
  userSettings.set("ompPath", join(root, "saved-omp"));
  await send({ type: "ompLogin", provider: "anthropic", ompPath: program });
  expect(logins).toHaveLength(1);
  expect(logins[0]).toMatchObject({ program, provider: { id: "anthropic", name: "Anthropic" } });
  // Nothing is checked before the command ends, and the terminal opening shows no notice.
  expect(messages.filter((m) => m["type"] === "agentCheck" || m["type"] === "ompStatus")).toEqual([]);
  logins[0]?.finish();
  for (let waited = 0; waited < 5000 && !messages.some((m) => m["type"] === "agentCheck"); waited += 20) await new Promise((resolve) => setTimeout(resolve, 20));
  await settled();
  expect(messages.filter((m) => m["type"] === "agentCheck")).toEqual([{ type: "agentCheck", ompPath: program, state: "done", ok: true, missing: false, version: "18.12.6", models: 1, providers: ["anthropic"] }]);
  // The Settings tab's own status is checked again too, for the saved path.
  expect(messages.some((m) => m["type"] === "ompStatus" && m["state"] === "checking")).toBe(true);
  expect(messages.some((m) => m["type"] === "notice" || m["type"] === "error")).toBe(false);
});

test("ompLogin without a path takes trama.ompPath, and a provider outside the list opens nothing", async () => {
  const program = fakeOmpOfVersion("18.12.6");
  userSettings.set("ompPath", program);
  await send({ type: "ompLogin", provider: "cursor" });
  expect(logins.map((login) => [login.program, login.provider.id])).toEqual([[program, "cursor"]]);
  for (const provider of ["openai", "", 3, undefined]) await send({ type: "ompLogin", provider });
  await send({ type: "ompLogin", provider: "anthropic", ompPath: 3 });
  expect(logins).toHaveLength(1);
});

/**
 * An up-to-date omp that lists the models of `models.json` (in its folder) and, asked `auth-broker logout <id>`, appends its arguments and `CURSOR_ACCESS_TOKEN` to `logout-calls`, prints
 * `logout-stderr` on its error output, replaces `models.json` by `models-after` when the file exists and the exit code is 0, and exits with the code in `logout-exit` (0 by default).
 */
function fakeLoggingOutOmp(models: string): { program: string; calls: () => string[]; set: (name: string, text: string) => void } {
  const program = join(root, "omp");
  const file = (name: string) => join(root, name);
  writeFileSync(file("models.json"), models);
  writeFileSync(
    program,
    `#!/bin/sh
case "$1" in
  models) cat '${file("models.json")}' ;;
  update) echo 'Current version: 18.12.6'; echo 'Already up to date' ;;
  auth-broker)
    echo "$*|$CURSOR_ACCESS_TOKEN" >> '${file("logout-calls")}'
    [ -f '${file("logout-stderr")}' ] && cat '${file("logout-stderr")}' >&2
    code=0
    [ -f '${file("logout-exit")}' ] && code=$(cat '${file("logout-exit")}')
    [ "$code" = 0 ] && [ -f '${file("models-after")}' ] && cp '${file("models-after")}' '${file("models.json")}'
    exit $code ;;
  *) echo 'omp/18.12.6' ;;
esac
`,
    { mode: 0o755 },
  );
  return {
    program,
    calls: () => (existsSync(file("logout-calls")) ? readFileSync(file("logout-calls"), "utf8").split("\n").filter((line) => line !== "") : []),
    set: (name, text) => writeFileSync(file(name), text),
  };
}

const ANTHROPIC_ONLY = '{"models":[{"selector":"a/b","provider":"anthropic"},{"selector":"c/d","provider":"cursor"}]}';
const CURSOR_ONLY = '{"models":[{"selector":"c/d","provider":"cursor"}]}';
const logoutStates = () => messages.filter((m) => m["type"] === "ompLogoutState").map((m) => `${m["provider"]} ${m["running"]}`);

/** Sends a confirmed `ompLogout` and waits until the host says the logout ended: the fake omp takes a while to run the first time. */
async function loggedOut(message: Record<string, unknown>): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  const listener = (sent: Record<string, unknown>) => {
    if (sent["type"] === "ompLogoutState" && sent["running"] === false) resolve();
  };
  postListeners.add(listener);
  try {
    await send(message);
    await promise;
    await settled();
  } finally {
    postListeners.delete(listener);
  }
}

test.skipIf(process.platform === "win32")("ompLogout asks a modal confirmation first, and closing it does nothing at all", async () => {
  const { program, calls } = fakeLoggingOutOmp(ANTHROPIC_ONLY);
  userSettings.set("ompPath", program);
  for (const answer of [undefined, "Cancel"]) {
    modalAnswer = answer;
    await send({ type: "ompLogout", provider: "anthropic" });
  }
  expect(warnings).toHaveLength(2);
  expect(warnings[0]).toEqual({
    message: "Log out of Anthropic?",
    options: { modal: true, detail: "omp forgets every account of Anthropic it stored. Credentials in environment variables, `.env` files or `models.yml` stay." },
    items: ["Log out"],
  });
  expect(calls()).toEqual([]);
  expect(messages.filter((m) => m["type"] === "ompLogoutState" || m["type"] === "agentCheck" || m["type"] === "ompStatus")).toEqual([]);
  expect(errors).toEqual([]);
  expect(infos).toEqual([]);
  // A provider outside the list and a path that is not text never reach the confirmation.
  for (const provider of ["openai", "", 3, undefined]) await send({ type: "ompLogout", provider });
  await send({ type: "ompLogout", provider: "anthropic", ompPath: 3 });
  expect(warnings).toHaveLength(2);
});

test.skipIf(process.platform === "win32")("a confirmed logout runs auth-broker logout with the id of the list for the omp of the message (or of trama.ompPath), then checks omp again, and tells nothing when the provider is gone", async () => {
  const { program, calls, set } = fakeLoggingOutOmp(ANTHROPIC_ONLY);
  set("models-after", CURSOR_ONLY);
  userSettings.set("ompPath", join(root, "saved-omp"));
  modalAnswer = "Log out";
  await loggedOut({ type: "ompLogout", provider: "anthropic", ompPath: program });
  expect(calls()).toEqual(["auth-broker logout anthropic|"]);
  expect(logoutStates()).toEqual(["anthropic true", "anthropic false"]);
  const kinds = messages.map((m) => m["type"]);
  expect(messages[0]).toEqual({ type: "ompLogoutState", provider: "anthropic", running: true });
  expect(messages.at(-1)).toEqual({ type: "ompLogoutState", provider: "anthropic", running: false });
  // The wizard's check, with the program used by the logout, and the Settings tab's check, both answered before the row is free again.
  expect(messages.filter((m) => m["type"] === "agentCheck")).toEqual([{ type: "agentCheck", ompPath: program, state: "done", ok: true, missing: false, version: "18.12.6", models: 1, providers: ["cursor"] }]);
  expect(kinds.lastIndexOf("agentCheck")).toBeLessThan(kinds.length - 1);
  expect(messages.some((m) => m["type"] === "ompStatus" && m["state"] === "checking")).toBe(true);
  expect(kinds.lastIndexOf("ompStatus")).toBeLessThan(kinds.length - 1);
  // No message confirms a logout that disconnected the provider.
  expect(infos).toEqual([]);
  expect(errors).toEqual([]);

  // Without a path in the message the omp is the saved one.
  messages.length = 0;
  userSettings.set("ompPath", program);
  await loggedOut({ type: "ompLogout", provider: "cursor" });
  expect(calls()).toEqual(["auth-broker logout anthropic|", "auth-broker logout cursor|"]);
  expect(messages.filter((m) => m["type"] === "agentCheck").map((m) => m["ompPath"])).toEqual([program]);
});

test.skipIf(process.platform === "win32")("after a success, a provider the check still lists as Connected is told once to be reachable through another credential; the Cursor text names the saved key, which stays", async () => {
  const { program, calls } = fakeLoggingOutOmp(ANTHROPIC_ONLY);
  userSettings.set("ompPath", program);
  modalAnswer = "Log out";
  await loggedOut({ type: "ompLogout", provider: "anthropic" });
  expect(calls()).toEqual(["auth-broker logout anthropic|"]);
  expect(infos).toEqual(["Trama: Anthropic is still connected through another credential (environment variable, `.env` file or `models.yml`). Remove it there to disconnect."]);

  // A saved Cursor API key goes to omp in the environment, never in the arguments, and is not removed.
  let stored: string | undefined = "  sk-cursor  ";
  const secrets = { get: async () => stored, store: async (_k: string, v: string) => void (stored = v), delete: async () => void (stored = undefined), onDidChange: () => ({ dispose() {} }) };
  const following = await startCursorApiKey(secrets as never, () => {});
  try {
    infos.length = 0;
    await loggedOut({ type: "ompLogout", provider: "cursor" });
    expect(calls().at(-1)).toBe("auth-broker logout cursor|sk-cursor");
    expect(infos).toEqual(["Trama: Cursor is still connected through the Cursor API key saved in Trama or another credential. Remove them to disconnect."]);
    expect(stored).toBe("  sk-cursor  ");
    // Another provider's logout with the key saved keeps the generic text.
    infos.length = 0;
    await loggedOut({ type: "ompLogout", provider: "anthropic" });
    expect(infos).toEqual(["Trama: Anthropic is still connected through another credential (environment variable, `.env` file or `models.yml`). Remove it there to disconnect."]);
  } finally {
    following.dispose();
  }
  expect(errors).toEqual([]);
});

test.skipIf(process.platform === "win32")("with the models list in error after a success, no notice shows", async () => {
  const { program, set } = fakeLoggingOutOmp(ANTHROPIC_ONLY);
  set("models-after", "not json");
  userSettings.set("ompPath", program);
  modalAnswer = "Log out";
  await loggedOut({ type: "ompLogout", provider: "anthropic" });
  expect(messages.filter((m) => m["type"] === "agentCheck").at(-1)).toMatchObject({ state: "done", ok: false });
  expect(infos).toEqual([]);
  expect(errors).toEqual([]);
  expect(logoutStates()).toEqual(["anthropic true", "anthropic false"]);
});

test.skipIf(process.platform === "win32")("a failed logout shows the editor error with the last line of omp's error output or its exit code, no notice, and omp is checked again anyway", async () => {
  const { program, set } = fakeLoggingOutOmp(ANTHROPIC_ONLY);
  userSettings.set("ompPath", program);
  modalAnswer = "Log out";
  set("logout-exit", "3");
  set("logout-stderr", "first\n\n  could not reach the broker  \n\n");
  await loggedOut({ type: "ompLogout", provider: "anthropic" });
  expect(errors).toEqual(["Trama: could not log out of Anthropic: could not reach the broker."]);
  expect(messages.filter((m) => m["type"] === "agentCheck")).toHaveLength(1);
  expect(messages.some((m) => m["type"] === "ompStatus" && m["state"] === "done")).toBe(true);
  expect(logoutStates()).toEqual(["anthropic true", "anthropic false"]);

  errors.length = 0;
  set("logout-stderr", "");
  await loggedOut({ type: "ompLogout", provider: "anthropic" });
  expect(errors).toEqual(["Trama: could not log out of Anthropic: exit code 3."]);
  // The provider is still Connected, but only a success tells so.
  expect(infos).toEqual([]);

  // An omp that cannot be started is a failure too, and the row is free again.
  errors.length = 0;
  await loggedOut({ type: "ompLogout", provider: "anthropic", ompPath: join(root, "missing", "omp") });
  expect(errors).toEqual(["Trama: could not log out of Anthropic: could not start omp."]);
  expect(logoutStates().at(-1)).toBe("anthropic false");
});

test.skipIf(process.platform === "win32")("the Settings tab asking for the model names and for the status together runs `omp models` once", async () => {
  const { program, calls } = fakeOmp();
  userSettings.set("ompPath", program);
  await controller.open();
  messages.length = 0;
  receive?.({ type: "modelSuggestionsWanted" });
  receive?.({ type: "ompStatusWanted" });
  await controller.refreshOmp();
  expect(calls()).toBe(1);
  expect(messages.filter((m) => m["type"] === "ompStatus")).toHaveLength(2);
  expect(messages.filter((m) => m["type"] === "modelSuggestions")).toHaveLength(1);
});

test.skipIf(process.platform === "win32")("omp that answers its version but gives no list says why, with no number of models", async () => {
  const program = join(root, "omp");
  writeFileSync(program, "#!/bin/sh\ncase \"$1\" in\n  models) echo 'not json' ;;\n  *) echo 'omp/18.12.6' ;;\nesac\n", { mode: 0o755 });
  userSettings.set("ompPath", program);
  await send({ type: "ompStatusWanted" });
  await controller.refreshOmp();
  expect(messages.filter((m) => m["type"] === "ompStatus").at(-1)).toEqual({ type: "ompStatus", state: "done", missing: false, version: "18.12.6", error: "omp models did not return a valid list" });
});

test("a folder outside the workspace is refused, and the workspace folders are sent without a project", async () => {
  await send({ type: "folderChildrenWanted", root: join(root, ".."), path: "" });
  expect(messages.some((m) => m["type"] === "folderChildren")).toBe(false);
  expect(messages.some((m) => m["type"] === "error")).toBe(true);
  messages.length = 0;
  await send({ type: "ready" });
  expect(messages).toContainEqual({ type: "workspaceFolders", folders: [{ name: "app", root, hasFiles: false, inGit: false, origin: NO_ORIGIN }] });
});

test("the folders of the first setup say whether a folder has files: a name without a dot counts, a dot name does not", async () => {
  mkdirSync(join(root, ".git"));
  await send({ type: "ready" });
  expect(messages).toContainEqual({ type: "workspaceFolders", folders: [{ name: "app", root, hasFiles: false, inGit: false, origin: NO_ORIGIN }] });
  writeFileSync(join(root, "main.ts"), "");
  messages.length = 0;
  await send({ type: "ready" });
  expect(messages).toContainEqual({ type: "workspaceFolders", folders: [{ name: "app", root, hasFiles: true, inGit: false, origin: NO_ORIGIN }] });
});

test("Import from Code or Start from Scratch on the Diagram with the empty Model opens the wizard in the Settings tab with that path", async () => {
  mkdirSync(join(root, ".trama", "model"), { recursive: true });
  writeFileSync(join(root, ".trama", "model", "system.md"), "# App\n\nx\n");
  await send({ type: "openGuidedSetup", choice: "scratch" });
  expect(messages).toContainEqual({ type: "navigate", view: "settings" });
  expect(messages).toContainEqual({ type: "guidedSetup", mode: "empty-model", choice: "scratch", root });
  expect(launched).toEqual([]);
});

test("the command Import from Code opens the wizard with an empty Model and imports at once, with no instruction about folders, with a Model", async () => {
  mkdirSync(join(root, ".trama", "model"), { recursive: true });
  writeFileSync(join(root, ".trama", "model", "system.md"), "# App\n\nx\n");
  await controller.importFromCode();
  receive?.({ type: "ready" });
  await settled();
  expect(messages).toContainEqual({ type: "guidedSetup", mode: "empty-model", choice: "import", root });
  expect(launched).toEqual([]);

  mkdirSync(join(root, ".trama", "model", "shop"));
  writeFileSync(join(root, ".trama", "model", "shop", "feature.md"), "# Shop\n\nx\n");
  await controller.importFromCode();
  expect(launched).toHaveLength(1);
  expect(String(launched[0]?.instruction)).toContain("Use the trama-import skill on this repository.");
  expect(String(launched[0]?.instruction)).not.toContain("folders");
});

test("the command Import from Code with the panel already open and an empty Model brings the Settings tab forward with the wizard, in that order", async () => {
  mkdirSync(join(root, ".trama", "model"), { recursive: true });
  writeFileSync(join(root, ".trama", "model", "system.md"), "# App\n\nx\n");
  await send({ type: "ready" });
  messages.length = 0;
  await controller.importFromCode();
  await settled();
  const shown = messages.map((m) => m["type"]);
  expect(shown.indexOf("navigate")).toBeGreaterThanOrEqual(0);
  expect(shown.indexOf("guidedSetup")).toBeGreaterThan(shown.indexOf("navigate"));
  expect(messages).toContainEqual({ type: "navigate", view: "settings" });
  expect(messages).toContainEqual({ type: "guidedSetup", mode: "empty-model", choice: "import", root });
  expect(launched).toEqual([]);
  expect(setups).toBe(0);
});

test("opening ghost details with the panel already open brings the Board forward with that announcement", async () => {
  await send({ type: "ready" });
  messages.length = 0;
  controller.openGhostDetails("c00001");
  await settled();
  expect(messages).toContainEqual({ type: "navigate", view: "board", ghost: "c00001" });
});

test("opening ghost details with no panel creates it and sends the navigate once its webview is ready", async () => {
  controller.openGhostDetails("c00002");
  await settled();
  expect(messages.some((m) => m["type"] === "navigate")).toBe(false);
  receive?.({ type: "ready" });
  await settled();
  expect(messages).toContainEqual({ type: "navigate", view: "board", ghost: "c00002" });
});

test("the Diagram's buttons with a Model that is not empty carry out the path as before and open no wizard", async () => {
  mkdirSync(join(root, ".trama", "model", "shop"), { recursive: true });
  writeFileSync(join(root, ".trama", "model", "system.md"), "# App\n\nx\n");
  writeFileSync(join(root, ".trama", "model", "shop", "feature.md"), "# Shop\n\nx\n");
  await send({ type: "openGuidedSetup", choice: "scratch" });
  expect(setups).toBe(1);
  await send({ type: "openGuidedSetup", choice: "import" });
  expect(launched).toHaveLength(1);
  expect(String(launched[0]?.instruction)).not.toContain("folders");
  expect(messages.some((m) => m["type"] === "guidedSetup" || m["type"] === "guidedSetupResult")).toBe(false);
});

test("the instruction files of a workspace folder are sent as labels and paths, and only those can be opened", async () => {
  writeFileSync(join(root, "AGENTS.md"), "SECRET");
  await send({ type: "instructionFilesWanted", root });
  const answer = messages.find((m) => m["type"] === "instructionFiles") as { root: string; files: { label: string; path: string }[] };
  expect(answer.root).toBe(root);
  expect(answer.files).toContainEqual({ label: "AGENTS.md", path: join(root, "AGENTS.md") });
  expect(JSON.stringify(answer)).not.toContain("SECRET");

  await send({ type: "openInstructionFile", path: join(root, "AGENTS.md") });
  expect(opened).toEqual([{ path: join(root, "AGENTS.md"), options: { viewColumn: -2, preview: false } }]);
  messages.length = 0;
  await send({ type: "openInstructionFile", path: join(root, "package.json") });
  expect(opened).toHaveLength(1);
  expect(messages.some((m) => m["type"] === "error")).toBe(true);
});

test("a search for a folder outside the workspace is refused, and without a folder it is for the project's folder", async () => {
  await send({ type: "instructionFilesWanted", root: join(root, "..") });
  expect(messages.some((m) => m["type"] === "instructionFiles")).toBe(false);
  expect(messages.some((m) => m["type"] === "error")).toBe(true);
  messages.length = 0;
  mkdirSync(join(root, ".trama", "model"), { recursive: true });
  writeFileSync(join(root, "CLAUDE.md"), "x");
  await send({ type: "instructionFilesWanted" });
  const answer = messages.find((m) => m["type"] === "instructionFiles") as { root: string; files: { label: string }[] };
  expect(answer.root).toBe(root);
  expect(answer.files.map((f) => f.label)).toContain("CLAUDE.md");
});

// ---- Solo mode ----

/** Makes the workspace folder a git repository and, when asked, a Trama project with an empty Model. */
function gitRepo(project = false): void {
  spawnSync("git", ["init", "-q"], { cwd: root });
  if (!project) return;
  mkdirSync(join(root, ".trama", "model"), { recursive: true });
  writeFileSync(join(root, ".trama", "model", "system.md"), "# App\n\nx\n");
}

const excludeFile = () => join(root, ".git", "info", "exclude");
const soloMessages = () => messages.filter((m) => m["type"] === "soloMode");

test("the folders of the first setup say whether a folder is in a git repository", async () => {
  gitRepo();
  await send({ type: "ready" });
  expect(messages).toContainEqual({ type: "workspaceFolders", folders: [{ name: "app", root, hasFiles: false, inGit: true, origin: NO_ORIGIN }] });
});

test("without a project no soloMode is sent; in a project it is sent at ready and each time the Settings view asks for the omp status", async () => {
  gitRepo();
  await send({ type: "ready" });
  expect(soloMessages()).toEqual([]);
  mkdirSync(join(root, ".trama", "model"), { recursive: true });
  writeFileSync(join(root, ".trama", "model", "system.md"), "# App\n\nx\n");
  messages.length = 0;
  await send({ type: "ready" });
  expect(soloMessages()).toEqual([{ type: "soloMode", available: true, solo: "off", tracked: [] }]);
  messages.length = 0;
  await send({ type: "ompStatusWanted" });
  expect(soloMessages()).toEqual([{ type: "soloMode", available: true, solo: "off", tracked: [] }]);
});

test("setSoloMode writes the project's Solo mode and answers with it, with the tracked files of Trama; off removes it again", async () => {
  gitRepo(true);
  spawnSync("git", ["add", "-f", ".trama/model/system.md"], { cwd: root });
  await send({ type: "setSoloMode", solo: "folders" });
  expect(soloMessages()).toEqual([{ type: "soloMode", available: true, solo: "folders", tracked: [".trama/model/system.md"] }]);
  expect(readFileSync(excludeFile(), "utf8")).toContain("# trama solo mode");
  expect(JSON.parse(readFileSync(join(root, ".trama", "solo", "mode.json"), "utf8"))).toEqual({ exclusions: "folders" });
  messages.length = 0;
  await send({ type: "setSoloMode", solo: "files" });
  expect(soloMessages()).toEqual([{ type: "soloMode", available: true, solo: "files", tracked: [".trama/model/system.md"] }]);
  messages.length = 0;
  await send({ type: "setSoloMode", solo: "off" });
  expect(soloMessages()).toEqual([{ type: "soloMode", available: true, solo: "off", tracked: [] }]);
  expect(readFileSync(excludeFile(), "utf8")).not.toContain("trama solo mode");
  expect(errors).toEqual([]);
});

test("a failed write of Solo mode is an editor error with the reason, and the row is told the project's real value", async () => {
  // Outside a git repository Solo mode cannot be turned on.
  mkdirSync(join(root, ".trama", "model"), { recursive: true });
  writeFileSync(join(root, ".trama", "model", "system.md"), "# App\n\nx\n");
  await send({ type: "setSoloMode", solo: "folders" });
  expect(errors).toEqual(["Trama: could not save Solo Mode: Solo mode needs a git repository."]);
  expect(soloMessages()).toEqual([{ type: "soloMode", available: false, solo: "off", tracked: [] }]);
  expect(existsSync(join(root, ".trama", "solo"))).toBe(false);
});

test("Solo mode is not a setting: setSetting refuses it, and a value that is not a kind is refused", async () => {
  gitRepo(true);
  await send({ type: "setSetting", key: "trama.soloMode", value: true });
  await send({ type: "setSoloMode", solo: "everything" });
  expect(messages.filter((m) => m["type"] === "error")).toHaveLength(2);
  expect(existsSync(join(root, ".trama", "solo"))).toBe(false);
});

test("the first setup with Solo mode initializes through project new with it: the block and the file are written, and the project is told", async () => {
  gitRepo();
  await send(confirm({ choice: "scratch", solo: "folders" }));
  expect(readFileSync(excludeFile(), "utf8")).toContain("/.trama/");
  expect(JSON.parse(readFileSync(join(root, ".trama", "solo", "mode.json"), "utf8"))).toEqual({ exclusions: "folders" });
  expect(results().at(-1)).toEqual({ type: "setup", busy: false, error: null });
  expect(soloMessages().at(-1)).toEqual({ type: "soloMode", available: true, solo: "folders", tracked: [] });
});

test("the first setup with Solo mode outside a git repository fails and creates nothing, with the reason in the summary", async () => {
  await send(confirm({ choice: "scratch", solo: "files" }));
  expect(existsSync(join(root, ".trama"))).toBe(false);
  expect(launched).toEqual([]);
  expect(setups).toBe(0);
  // The reason shows as the failures of the initialization show today.
  expect(results().at(-1)).toEqual({ type: "setup", busy: false, error: "Unexpected error: Solo mode needs a git repository." });
});

test("the first setup with Solo mode off writes nothing of Solo mode", async () => {
  gitRepo();
  await send(confirm({ choice: "scratch", solo: "off" }));
  expect(existsSync(join(root, ".trama", "model", "system.md"))).toBe(true);
  expect(existsSync(join(root, ".trama", "solo"))).toBe(false);
});

test("the Empty Model mode writes Solo mode after the settings and before the path, only when it differs from the project's value", async () => {
  gitRepo(true);
  await send(confirm({ mode: "empty-model", root: undefined, solo: "files", values: [{ key: "trama.scan", value: "m" }] }));
  expect(JSON.parse(readFileSync(join(root, ".trama", "solo", "mode.json"), "utf8"))).toEqual({ exclusions: "files" });
  expect(results()).toEqual([{ type: "guidedSetupResult", ok: true, error: null }]);
  expect(launched).toHaveLength(1);
  // The same value again writes nothing: the exclusion file is left as the developer made it.
  writeFileSync(excludeFile(), `${readFileSync(excludeFile(), "utf8")}# mine\n`);
  const before = readFileSync(excludeFile(), "utf8");
  const mode = readFileSync(join(root, ".trama", "solo", "mode.json"), "utf8");
  messages.length = 0;
  await send(confirm({ mode: "empty-model", root: undefined, solo: "files" }));
  expect(readFileSync(excludeFile(), "utf8")).toBe(before);
  expect(readFileSync(join(root, ".trama", "solo", "mode.json"), "utf8")).toBe(mode);
  // Off writes again.
  await send(confirm({ mode: "empty-model", root: undefined, solo: "off" }));
  expect(existsSync(join(root, ".trama", "solo", "mode.json"))).toBe(false);
  expect(readFileSync(excludeFile(), "utf8")).toContain("# mine");
  expect(readFileSync(excludeFile(), "utf8")).not.toContain("trama solo mode");
});

test("a failed write of Solo mode in the Empty Model mode counts as a failed save: the wizard stays on the summary and nothing starts", async () => {
  mkdirSync(join(root, ".trama", "model"), { recursive: true });
  writeFileSync(join(root, ".trama", "model", "system.md"), "# App\n\nx\n");
  await send(confirm({ mode: "empty-model", root: undefined, solo: "folders", values: [{ key: "trama.scan", value: "m" }] }));
  expect(results()).toEqual([{ type: "guidedSetupResult", ok: false, error: "Could not save Solo Mode: Solo mode needs a git repository." }]);
  expect(userSettings.get("scan")).toBe("m");
  expect(launched).toEqual([]);
  expect(setups).toBe(0);
});

// ---- Manager mode ----

const managerMessages = () => messages.filter((m) => m["type"] === "managerMode");
const managerFile = () => join(root, ".trama", "manager", "mode.json");
const GITHUB_ORIGIN = "git@github.com:Acme/Web.git";

/** A git repository with the given origin, and a Trama project with an empty Model when asked. */
function repoWithOrigin(origin: string | null, project = true): void {
  gitRepo(project);
  if (origin !== null) spawnSync("git", ["remote", "add", "origin", origin], { cwd: root });
}

test("the folders of the first setup carry what their origin says", async () => {
  repoWithOrigin(GITHUB_ORIGIN, false);
  await send({ type: "ready" });
  expect(messages).toContainEqual({ type: "workspaceFolders", folders: [{ name: "app", root, hasFiles: false, inGit: true, origin: { repository: "acme/web", reason: null } }] });
});

test("without a project no managerMode is sent; in a project it is sent at ready, with every picture and each time the Settings view asks for the omp status", async () => {
  repoWithOrigin(GITHUB_ORIGIN, false);
  await send({ type: "ready" });
  expect(managerMessages()).toEqual([]);
  mkdirSync(join(root, ".trama", "model"), { recursive: true });
  writeFileSync(join(root, ".trama", "model", "system.md"), "# App\n\nx\n");
  messages.length = 0;
  await send({ type: "ready" });
  expect(managerMessages()).toEqual([{ type: "managerMode", available: false, recorded: false, repository: "acme/web", reason: null }]);
  messages.length = 0;
  await send({ type: "ompStatusWanted" });
  expect(managerMessages()).toEqual([{ type: "managerMode", available: false, recorded: false, repository: "acme/web", reason: null }]);
});

test("the origin is read again with every picture: a change of origin reaches the panel without reloading", async () => {
  repoWithOrigin(GITHUB_ORIGIN);
  await send({ type: "setManagerMode", on: true });
  spawnSync("git", ["remote", "set-url", "origin", "https://gitlab.com/acme/web"], { cwd: root });
  messages.length = 0;
  await send({ type: "ready" });
  expect(managerMessages().at(-1)).toEqual({ type: "managerMode", available: false, recorded: true, repository: null, reason: "Origin is not on GitHub" });
  spawnSync("git", ["remote", "remove", "origin"], { cwd: root });
  messages.length = 0;
  await send({ type: "ready" });
  expect(managerMessages().at(-1)).toEqual({ type: "managerMode", available: false, recorded: true, repository: null, reason: "No origin remote" });
});

test("setManagerMode writes only the Manager mode file and answers with the status; off deletes only the file", async () => {
  repoWithOrigin(GITHUB_ORIGIN);
  await send({ type: "setManagerMode", on: true });
  expect(managerMessages()).toEqual([{ type: "managerMode", available: true, recorded: true, repository: "acme/web", reason: null }]);
  expect(readFileSync(managerFile(), "utf8")).toBe("{}\n");
  expect(readFileSync(join(root, ".trama", "manager", ".gitignore"), "utf8")).toBe("*\n");
  messages.length = 0;
  await send({ type: "setManagerMode", on: false });
  expect(managerMessages()).toEqual([{ type: "managerMode", available: false, recorded: false, repository: "acme/web", reason: null }]);
  expect(existsSync(managerFile())).toBe(false);
  expect(existsSync(join(root, ".trama", "model", "system.md"))).toBe(true);
  expect(errors).toEqual([]);
});

test("turning Manager mode on without origin on GitHub is an editor error with the reason, and the row is told the recorded value", async () => {
  repoWithOrigin(null);
  await send({ type: "setManagerMode", on: true });
  expect(errors).toEqual(["Trama: could not save Manager Mode: Manager Mode needs a repository on GitHub (the origin remote)."]);
  expect(managerMessages()).toEqual([{ type: "managerMode", available: false, recorded: false, repository: null, reason: "No origin remote" }]);
  expect(existsSync(join(root, ".trama", "manager"))).toBe(false);
});

test("Manager mode is not a setting: setSetting refuses it, and a value that is not a boolean is refused", async () => {
  repoWithOrigin(GITHUB_ORIGIN);
  await send({ type: "setSetting", key: "trama.managerMode", value: true });
  await send({ type: "setManagerMode", on: "yes" });
  expect(messages.filter((m) => m["type"] === "error")).toHaveLength(2);
  expect(existsSync(join(root, ".trama", "manager"))).toBe(false);
});

test("the first setup with Manager mode passes it to project new: written after the project's files, with the project told", async () => {
  repoWithOrigin(GITHUB_ORIGIN, false);
  await send(confirm({ choice: "scratch", manager: true }));
  expect(existsSync(join(root, ".trama", "model", "system.md"))).toBe(true);
  expect(readFileSync(managerFile(), "utf8")).toBe("{}\n");
  expect(results().at(-1)).toEqual({ type: "setup", busy: false, error: null });
  expect(managerMessages().at(-1)).toEqual({ type: "managerMode", available: true, recorded: true, repository: "acme/web", reason: null });
  expect(errors).toEqual([]);
});

test("the first setup with Manager mode off writes nothing of Manager mode", async () => {
  repoWithOrigin(GITHUB_ORIGIN, false);
  await send(confirm({ choice: "scratch", manager: false }));
  expect(existsSync(join(root, ".trama", "model", "system.md"))).toBe(true);
  expect(existsSync(join(root, ".trama", "manager"))).toBe(false);
});

test("the first setup whose Manager mode cannot be written still creates the project and goes on, with the reason shown", async () => {
  repoWithOrigin(null, false);
  await send(confirm({ choice: "scratch", manager: true }));
  expect(existsSync(join(root, ".trama", "model", "system.md"))).toBe(true);
  expect(existsSync(join(root, ".trama", "manager"))).toBe(false);
  expect(errors).toEqual(["Trama: could not save Manager Mode: Manager Mode needs a repository on GitHub (the origin remote)."]);
  expect(results().at(-1)).toEqual({ type: "setup", busy: false, error: null });
  expect(setups).toBe(1);
});

test("the Guided setup writes Manager mode after the settings, only when it differs from the project's value", async () => {
  repoWithOrigin(GITHUB_ORIGIN);
  await send(confirm({ mode: "settings", choice: undefined, root: undefined, manager: true, values: [{ key: "trama.scan", value: "m" }] }));
  expect(readFileSync(managerFile(), "utf8")).toBe("{}\n");
  expect(userSettings.get("scan")).toBe("m");
  expect(results()).toEqual([{ type: "guidedSetupResult", ok: true, error: null }]);
  // The same value again writes nothing: a file the developer edited is left as it is.
  writeFileSync(managerFile(), "{ }\n");
  await send(confirm({ mode: "settings", choice: undefined, root: undefined, manager: true }));
  expect(readFileSync(managerFile(), "utf8")).toBe("{ }\n");
  await send(confirm({ mode: "settings", choice: undefined, root: undefined, manager: false }));
  expect(existsSync(managerFile())).toBe(false);
  expect(launched).toEqual([]);
});

test("the Empty Model mode writes Manager mode before going on with the path", async () => {
  repoWithOrigin(GITHUB_ORIGIN);
  await send(confirm({ mode: "empty-model", root: undefined, manager: true }));
  expect(existsSync(managerFile())).toBe(true);
  expect(results()).toEqual([{ type: "guidedSetupResult", ok: true, error: null }]);
  expect(launched).toHaveLength(1);
});

test("a failed write of Manager mode in the other modes counts as a failed save: the wizard stays on the summary and nothing starts", async () => {
  repoWithOrigin(null);
  await send(confirm({ mode: "empty-model", root: undefined, manager: true, values: [{ key: "trama.scan", value: "m" }] }));
  expect(results()).toEqual([{ type: "guidedSetupResult", ok: false, error: "Could not save Manager Mode: Manager Mode needs a repository on GitHub (the origin remote)." }]);
  expect(userSettings.get("scan")).toBe("m");
  expect(launched).toEqual([]);
  expect(setups).toBe(0);
});

test("a Manager mode left on whose origin moved away stays recorded when the wizard writes nothing for it", async () => {
  repoWithOrigin(GITHUB_ORIGIN);
  await send({ type: "setManagerMode", on: true });
  spawnSync("git", ["remote", "remove", "origin"], { cwd: root });
  await send(confirm({ mode: "settings", choice: undefined, root: undefined, values: [{ key: "trama.scan", value: "m" }] }));
  expect(existsSync(managerFile())).toBe(true);
  expect(results().at(-1)).toEqual({ type: "guidedSetupResult", ok: true, error: null });
});
