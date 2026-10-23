import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// A minimal editor: one webview panel that records what it is sent, user settings in memory, and the modal dialog answers.
const messages: Record<string, unknown>[] = [];
const userSettings = new Map<string, unknown>();
const writes: string[] = [];
let failOn: string | undefined;
let workspaceFolders: { name: string; uri: { fsPath: string; scheme: string } }[] = [];
let receive: ((raw: unknown) => void) | undefined;
let modalAnswer: string | undefined;
const modals: string[] = [];
const opened: { path: string; options: unknown }[] = [];

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
          return true;
        },
      },
    }),
    showInformationMessage: async () => undefined,
    showWarningMessage: async (message: string) => {
      modals.push(message);
      return modalAnswer;
    },
    showErrorMessage: async () => undefined,
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
  opened.length = 0;
  modalAnswer = undefined;
  failOn = undefined;
  setups = 0;
  receive = undefined;
  controller = new Controller({ fsPath: root } as never, undefined, undefined, undefined, { writeSetup: async () => void setups++ } as never);
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
  await send(confirm({ mode: "settings", choice: undefined, root: undefined, values: [{ key: "trama.driftBlocker", value: true }] }));
  expect(userSettings.get("driftBlocker")).toBe(true);
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

test("the chosen agent is checked: omp that is not found says where it looked, and the editor decides for Cursor's chat", async () => {
  await send({ type: "agentCheckWanted", agent: "omp", ompPath: join(root, "no-such-omp") });
  expect(messages.find((m) => m["type"] === "agentCheck")).toEqual({ type: "agentCheck", agent: "omp", ompPath: join(root, "no-such-omp"), ok: false, models: 0, error: `omp not found at ${join(root, "no-such-omp")}` });
  messages.length = 0;
  await send({ type: "agentCheckWanted", agent: "cursor", ompPath: "" });
  expect(messages.find((m) => m["type"] === "agentCheck")).toEqual({ type: "agentCheck", agent: "cursor", ompPath: "", ok: false });
});

test("the model names for the wizard answer for the agent it asked about and say so", async () => {
  await send({ type: "modelSuggestionsWanted", agent: "cursor", ompPath: "" });
  expect(messages.find((m) => m["type"] === "modelSuggestions")).toEqual({ type: "modelSuggestions", models: [], agent: "cursor", ompPath: "" });
});

test("a folder outside the workspace is refused, and the workspace folders are sent without a project", async () => {
  await send({ type: "folderChildrenWanted", root: join(root, ".."), path: "" });
  expect(messages.some((m) => m["type"] === "folderChildren")).toBe(false);
  expect(messages.some((m) => m["type"] === "error")).toBe(true);
  messages.length = 0;
  await send({ type: "ready" });
  expect(messages).toContainEqual({ type: "workspaceFolders", folders: [{ name: "app", root, hasFiles: false }] });
});

test("the folders of the first setup say whether a folder has files: a name without a dot counts, a dot name does not", async () => {
  mkdirSync(join(root, ".git"));
  await send({ type: "ready" });
  expect(messages).toContainEqual({ type: "workspaceFolders", folders: [{ name: "app", root, hasFiles: false }] });
  writeFileSync(join(root, "main.ts"), "");
  messages.length = 0;
  await send({ type: "ready" });
  expect(messages).toContainEqual({ type: "workspaceFolders", folders: [{ name: "app", root, hasFiles: true }] });
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
