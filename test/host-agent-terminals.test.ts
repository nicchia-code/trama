import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, mock, spyOn, test, vi } from "bun:test";
import { basename, delimiter, join, relative, isAbsolute, sep } from "node:path";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import * as os from "node:os";
const { tmpdir } = os;
// Some host code reads the developer's home: a temporary one keeps the real home untouched.
const home = mkdtempSync(join(tmpdir(), "trama-agent-home-"));
mock.module("node:os", () => ({ ...os, homedir: () => home }));
afterAll(() => rmSync(home, { recursive: true, force: true }));
import { announce, listAnnouncements, withdrawAll } from "../src/core/announcements";
import { newProposal } from "../src/core/proposals";
import { buildSnapshot } from "../src/core/snapshot";
import { ADVISOR_SENTENCE } from "../src/core/advisors";
import { announcedGhosts } from "../extension/src/webview/board/logic";
import { projectAt } from "../src/core/store";
import type { TurnEnd } from "../src/core/omp-chat-conversation";
import { dismissDrift, getTask, listDrifts, listTasks, moveTask, newDrift, newTask } from "../src/core/work";
import { FIX_OPTIONS } from "./fix-options";
import { syncRequirementSkills } from "../src/core/requirement-skills";
import type { AgentAction } from "../extension/src/protocol";
import { ASK_DEVELOPER_SENTENCE, AUTO_EXIT_SENTENCE, buildPrompt, languageSentence } from "../extension/src/host/prompts";
import { ompPathVariable } from "../extension/src/host/model-lists";
import { type OmpLoginProvider, OMP_LOGIN_PROVIDERS, ompLoginProvider } from "../extension/src/omp-login";
import type { Project } from "../src/core/store";

// A minimal editor: just the terminal events and the calls launchAgent makes.
type Listener<T> = (event: T) => void;
interface FakeTerminal {
  exitStatus: number | undefined;
  name: string;
  /** The shell's process, as the editor reports it. */
  processId: Promise<number | undefined>;
  /** Absent until the shell integration activates; `executeCommand` types the line like `sendText` does. */
  shellIntegration: { executeCommand(line: string): void } | undefined;
  /** The last command line typed into it. */
  line: string;
  /** How each line reached it, in order. */
  writes: ("executeCommand" | "sendText")[];
  recordWrite(how: "executeCommand" | "sendText", text: string): void;
  /** Whether each `show` kept the focus where it was. */
  shown: (boolean | undefined)[];
  disposals: number;
  show(preserveFocus?: boolean): void;
  sendText(text: string): void;
  dispose(): void;
}
interface ShellEvent {
  terminal: FakeTerminal;
  execution: { commandLine: { value: string } };
  exitCode?: number;
}
/** A tab the editor opened: a terminal tab with its label and the column of its group. */
interface TabChange {
  opened: { input: unknown; label: string; group: { viewColumn: number } }[];
}
interface IntegrationEvent {
  terminal: FakeTerminal;
  shellIntegration: NonNullable<FakeTerminal["shellIntegration"]>;
}
const listeners: { start: Listener<ShellEvent>[]; end: Listener<ShellEvent>[]; close: Listener<FakeTerminal>[]; tabs: Listener<TabChange>[]; integration: Listener<IntegrationEvent>[] } = { start: [], end: [], close: [], tabs: [], integration: [] };
class TabInputTerminal {}
/** What the editor reports about a command in `terminal`: by default the line Trama typed into it. */
const shell = (terminal: FakeTerminal, commandLine = terminal.line, exitCode?: number): ShellEvent => ({ terminal, execution: { commandLine: { value: commandLine } }, exitCode });
const subscribe = <T>(list: Listener<T>[]) => (fn: Listener<T>) => {
  list.push(fn);
  return { dispose() {} };
};
const terminals: FakeTerminal[] = [];
/** Terminals the editor no longer lists (`vscode.window.terminals`), without a close event having reached Trama. */
const unlisted = new Set<FakeTerminal>();
/** Every command line typed into any fake terminal, in order. */
const typed: string[] = [];
/** Whether a new fake terminal starts with its shell integration already active. */
let integrationAtCreation = true;
/** Activates the shell integration of `terminal` and tells the listeners, as the editor does. */
const activateIntegration = (terminal: FakeTerminal): void => {
  const integration = { executeCommand: (line: string) => terminal.recordWrite("executeCommand", line) };
  terminal.shellIntegration = integration;
  listeners.integration.forEach((fn) => fn({ terminal, shellIntegration: integration }));
};
/** The environment each fake terminal was created with, in the order created. */
const environments: Record<string, string>[] = [];
/** Every terminal Trama created, in order, including the folder, the name and where it opened. */
const created: { name?: string; cwd?: string; shellPath?: string; env: Record<string, string>; location?: unknown }[] = [];
/** The editor's tab groups by column. */
const tabGroups = { columns: [1] };
/** What `inspect` reports for a setting key. */
const inspected: Record<string, { globalValue?: unknown; workspaceValue?: unknown; workspaceFolderValue?: unknown }> = {};
/** Values written with `update`. */
const updates: { key: string; value: unknown }[] = [];
/** Settings the test changes; anything else reads as the editor's default. */
const settingValues: Record<string, unknown> = { agent: "omp" };
let extensionPath = "";
const editor = { appName: "Visual Studio Code" };
/** What the fake editor does with a command: by default nothing; a test may make it fail or return a value. */
let commandHandler: (id: string, ...args: unknown[]) => unknown = () => undefined;
/** Every command run and every link opened externally, in order. */
const editorCalls: string[] = [];
const clipboard: string[] = [];
/** What the developer picks in a list or types in an input box; undefined is Esc. */
let pick: (items: { label: string; description?: string }[], options: { title?: string }) => unknown = () => undefined;
let typeIn: () => string | undefined = () => undefined;

/** The open workspace folder the panel looks for a Trama project in. */
let workspaceRoot = "";
let workspaceRoots: string[] | undefined;
type FileUri = { scheme: string; fsPath: string };
const requirementEvents = { create: [] as Listener<FileUri>[], change: [] as Listener<FileUri>[], delete: [] as Listener<FileUri>[] };
const errorMessages: string[] = [];
const warningMessages: string[] = [];
/** The answer to the whole-System scan dialog; undefined is Cancel, Esc or a closed dialog. */
let scanAnswer: string | undefined = "Scan";
/** The answers to the offer to initialize a project, in the order the offers were shown. */
const answerOffer: Array<(choice: string | undefined) => void> = [];
let panelsCreated = 0;
let reveals = 0;
let questionEndpoint: () => Promise<string> = async () => "endpoint";

mock.module("vscode", () => ({
  window: {
    get terminals() {
      return terminals.filter((listed) => !unlisted.has(listed));
    },
    onDidStartTerminalShellExecution: subscribe(listeners.start),
    onDidEndTerminalShellExecution: subscribe(listeners.end),
    onDidChangeTerminalShellIntegration: subscribe(listeners.integration),
    onDidCloseTerminal: subscribe(listeners.close),
    createTerminal: (options: { name?: string; cwd?: string; shellPath?: string; env: Record<string, string>; location?: unknown }) => {
      environments.push(options.env);
      created.push(options);
      const terminal: FakeTerminal = {
        exitStatus: undefined,
        processId: Promise.resolve(undefined),
        name: options.name ?? "",
        shellIntegration: undefined,
        line: "",
        writes: [],
        recordWrite(how: "executeCommand" | "sendText", text: string) {
          this.writes.push(how);
          this.line = text;
          typed.push(text);
        },
        shown: [],
        disposals: 0,
        show(preserveFocus?: boolean) {
          this.shown.push(preserveFocus);
        },
        sendText(text: string) {
          this.recordWrite("sendText", text);
        },
        dispose() {
          this.disposals++;
        },
      };
      terminals.push(terminal);
      if (integrationAtCreation) terminal.shellIntegration = { executeCommand: (line: string) => terminal.recordWrite("executeCommand", line) };
      return terminal;
    },
    showErrorMessage: (message: string) => void errorMessages.push(message),
    showQuickPick: async (items: { label: string; description?: string }[], options: { title?: string }) => pick(items, options),
    showInputBox: async () => typeIn(),
    showWarningMessage: (message: string) => (message === "Scan the whole System?" ? Promise.resolve(scanAnswer) : void warningMessages.push(message)),
    showInformationMessage: () => {
      const offer = Promise.withResolvers<string | undefined>();
      answerOffer.push(offer.resolve);
      return offer.promise;
    },
    tabGroups: {
      get all() { return tabGroups.columns.map((viewColumn) => ({ viewColumn })); },
      onDidChangeTabs: subscribe(listeners.tabs),
    },
    createWebviewPanel: () => {
      panelsCreated++;
      return {
        reveal: () => void reveals++,
        dispose: () => {},
        onDidDispose: () => ({ dispose() {} }),
        webview: { html: "", cspSource: "", asWebviewUri: (uri: unknown) => uri, onDidReceiveMessage: () => ({ dispose() {} }), postMessage: async () => true },
      };
    },
  },
  workspace: {
    get workspaceFolders() {
      return (workspaceRoots ?? [workspaceRoot]).map((fsPath) => ({ uri: { scheme: "file", fsPath } }));
    },
    getWorkspaceFolder: (uri: FileUri) => {
      const root = (workspaceRoots ?? [workspaceRoot]).find((root) => {
        const path = relative(root, uri.fsPath);
        return path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path);
      });
      return root === undefined ? undefined : { uri: { scheme: "file", fsPath: root } };
    },
    getConfiguration: () => ({
      get: (key: string, fallback: unknown) => (key in settingValues ? settingValues[key] : fallback),
      inspect: (key: string) => inspected[key] ?? (key in settingValues ? { globalValue: settingValues[key] } : undefined),
      update: async (key: string, value: unknown) => void updates.push({ key, value }),
    }),
    createFileSystemWatcher: (pattern: string) => pattern === "**/.trama/{requirements/**,specs.yaml}"
      ? { onDidCreate: subscribe(requirementEvents.create), onDidChange: subscribe(requirementEvents.change), onDidDelete: subscribe(requirementEvents.delete), dispose() { for (const list of Object.values(requirementEvents)) list.length = 0; } }
      : { onDidCreate() {}, onDidChange() {}, onDidDelete() {}, dispose() {} },
  },
  Uri: { file: (fsPath: string) => ({ scheme: "file", fsPath, toString: () => fsPath }), joinPath: (base: unknown, ...parts: string[]) => ({ base, parts, toString: () => parts.join("/") }), parse: (value: string) => ({ toString: () => value }) },
  RelativePattern: class {},
  // Bun re-mocks "vscode" in place, keeping only these keys, for every later test file that mocks it too.
  TabInputText: class {},
  TabInputTerminal,
  ViewColumn: { Active: 1, Beside: -2 },
  commands: { executeCommand: async (id: string, ...args: unknown[]) => (editorCalls.push(id), commandHandler(id, ...args)) },
  env: {
    get appName() { return editor.appName; },
    // Git Bash on Windows, so the command lines are quoted for a POSIX shell on every platform.
    shell: process.platform === "win32" ? "C:\\Program Files\\Git\\bin\\bash.exe" : "/bin/bash",
    clipboard: { writeText: async (text: string) => { clipboard.push(text); } },
    openExternal: async (uri: { toString(): string }) => (editorCalls.push(uri.toString()), true),
  },
  Disposable: class {
    constructor(readonly dispose: () => void) {}
    static from(...items: unknown[]) { return { dispose() { void items; } }; }
  },
  ConfigurationTarget: { Global: 1 },
  extensions: { getExtension: () => extensionPath === "" ? undefined : { extensionPath } },
}));
/** The terminals whose question rounds the host interrupted, in order. */
const interruptedRounds: string[] = [];
mock.module("../extension/src/host/questions", () => ({ questionEndpoint: () => questionEndpoint(), questionWindowId: async () => "window-id", ownWindowId: () => undefined, interruptTerminalRounds: (terminal: string) => void interruptedRounds.push(terminal), EditorQuestions: class {}, askPreparedRound: async () => undefined }));

let dir: string;
/** The omp the launches find: what `trama.ompPath` says, else `omp`; the check before a launch is tested in omp-launch.test.ts. */
let ompFound: (ompPath: string) => Promise<string | undefined> = async (ompPath) => (ompPath === "" ? "omp" : ompPath);
beforeAll(async () => {
  (await import("../extension/src/host/omp-launch")).setOmpLauncher((ompPath) => ompFound(ompPath));
  dir = mkdtempSync(join(tmpdir(), "trama-terminals-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("taken Tasks and the agent terminals", () => {
  test("a command ending in one terminal sends back to To do only the Tasks that terminal took, never another holder's nor a Task nobody holds", async () => {
    // Dynamic: the module must load after mock.module replaced "vscode".
    const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    const p = projectAt(dir);
    watchAgentTerminal();

    expect(await launchAgent(dir, "first", "Scan")).toBe("terminal");
    const first = terminals[0] as FakeTerminal;
    const firstId = environments.at(-1)?.["TRAMA_TERMINAL"] as string;
    listeners.start.forEach((fn) => fn(shell(first)));
    await launchAgent(dir, "second", "Scan"); // the first is busy, so this one starts another terminal
    const second = terminals[1] as FakeTerminal;
    const secondId = environments.at(-1)?.["TRAMA_TERMINAL"] as string;
    expect(second).not.toBe(first);
    listeners.start.forEach((fn) => fn(shell(second)));

    const take = (title: string, terminal: string) => moveTask(p, newTask(p, { title, refs: ["order/Paid"], technical: false }).id, "doing", "agent", { terminal }).id;
    const a = take("A", firstId);
    const b = take("B", secondId);
    const old = moveTask(p, newTask(p, { title: "Old", refs: ["order/Paid"], technical: false }).id, "doing", "developer").id;
    writeFileSync(getTask(p, old).path, readFileSync(getTask(p, old).path, "utf8").replace(/^agent: false$/m, "agent: true")); // a mark with no holder, as an earlier version wrote it
    expect(readFileSync(getTask(p, a).path, "utf8")).toContain(`agent: ${firstId}`);
    const state = (id: string) => [getTask(p, id).data.column, getTask(p, id).data.agent];

    listeners.end.forEach((fn) => fn(shell(first)));
    expect([a, b, old].map(state)).toEqual([["todo", false], ["doing", true], ["doing", false]]);
    listeners.end.forEach((fn) => fn(shell(second)));
    expect(state(b)).toEqual(["todo", false]);
    expect(state(old)).toEqual(["doing", false]);
  });

  test("a pending Run rechecks taken Tasks in its scope before delivery", async () => {
    // Dynamic: Controller must load after mock.module replaced "vscode".
    const { Controller } = await import("../extension/src/host/controller");
    const { watchAgentTerminal } = await import("../extension/src/host/agent");
    const watching = watchAgentTerminal();
    const root = mkdtempSync(join(tmpdir(), "trama-pending-run-"));
    cpSync(join(import.meta.dir, "../examples/shop"), root, { recursive: true });
    const p = projectAt(root);
    const previousAgent = settingValues["agent"];
    settingValues["agent"] = "omp";
    const controller = new Controller({ scheme: "file" } as never);
    const launch = controller as unknown as { launchAction(project: Project, action: AgentAction): Promise<void> };
    const pauseDelivery = () => {
      const waiting = Promise.withResolvers<void>();
      const delivery = Promise.withResolvers<string>();
      questionEndpoint = () => {
        waiting.resolve();
        return delivery.promise;
      };
      return { waiting: waiting.promise, delivery };
    };
    try {
      const allTask = newTask(p, { title: "All scope", refs: ["order"], technical: false }).id;
      const allDelivery = pauseDelivery();
      const beforeAll = created.length;
      const allRun = launch.launchAction(p, { kind: "implement-all" });
      await allDelivery.waiting;
      moveTask(p, allTask, "doing", "agent", { terminal: "all-agent" });
      allDelivery.delivery.resolve("endpoint");
      await expect(allRun).rejects.toThrow(/Run all is unavailable: An agent is working on Task/);
      expect(created).toHaveLength(beforeAll);
      moveTask(p, allTask, "todo", "agent");
    } finally {
      watching.dispose();
      controller.dispose();
      questionEndpoint = async () => "endpoint";
      if (previousAgent === undefined) delete settingValues["agent"];
      else settingValues["agent"] = previousAgent;
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a whole-System scan remembers its launch instant as the button does; Cancel at its dialog remembers nothing", async () => {
    // Dynamic: Controller must load after mock.module replaced "vscode".
    const { Controller } = await import("../extension/src/host/controller");
    const { watchAgentTerminal } = await import("../extension/src/host/agent");
    const watching = watchAgentTerminal();
    const root = mkdtempSync(join(tmpdir(), "trama-scan-command-"));
    cpSync(join(import.meta.dir, "../examples/shop"), root, { recursive: true });
    const p = projectAt(root);
    const previousAgent = settingValues["agent"];
    settingValues["agent"] = "omp";
    const controller = new Controller({ scheme: "file" } as never);
    const launch = controller as unknown as { launchAction(project: Project, action: AgentAction): Promise<void> };
    const remembered = join(root, ".trama/last-scan/system");
    try {
      const before = Date.now();
      await launch.launchAction(p, { kind: "scan" });
      const after = Date.now();
      const instant = Date.parse(readFileSync(remembered, "utf8").trim());
      expect(instant).toBeGreaterThanOrEqual(before);
      expect(instant).toBeLessThanOrEqual(after);

      rmSync(join(root, ".trama/last-scan"), { recursive: true, force: true });
      scanAnswer = undefined;
      await launch.launchAction(p, { kind: "scan" });
      expect(existsSync(remembered)).toBe(false);
      scanAnswer = "Scan";
    } finally {
      watching.dispose();
      controller.dispose();
      if (previousAgent === undefined) delete settingValues["agent"];
      else settingValues["agent"] = previousAgent;
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("with the Advisor Scanner on, Scan System still launches the scan of the whole System with no advisor, and remembers its launch instant", async () => {
    // Dynamic: Controller must load after mock.module replaced "vscode".
    const { Controller } = await import("../extension/src/host/controller");
    const { watchAgentTerminal } = await import("../extension/src/host/agent");
    const watching = watchAgentTerminal();
    const root = mkdtempSync(join(tmpdir(), "trama-scan-advisor-"));
    cpSync(join(import.meta.dir, "../examples/shop"), root, { recursive: true });
    const p = projectAt(root);
    const previousAgent = settingValues["agent"];
    settingValues["agent"] = "omp";
    inspected.advisorScanner = { globalValue: true };
    const controller = new Controller({ scheme: "file" } as never);
    const launch = controller as unknown as { launchAction(project: Project, action: AgentAction): Promise<void> };
    const remembered = join(root, ".trama/last-scan/system");
    try {
      const terminalCount = terminals.length;
      const before = Date.now();
      await launch.launchAction(p, { kind: "scan" });
      expect(terminals).toHaveLength(terminalCount + 1);
      expect(Date.parse(readFileSync(remembered, "utf8").trim())).toBeGreaterThanOrEqual(before);
      const terminal = terminals.at(-1) as FakeTerminal;
      expect(terminal.line).toContain("Use the trama-scan skill on the whole System.");
      expect(terminal.line).toContain("Compare each Machine with the trama-analysis sub-agent.");
      expect(terminal.line).not.toMatch(/--advisor/);
      expect(Object.keys(environments.at(-1) ?? {})).not.toContain("TRAMA_ADVISOR_SCANNER");
      expect(terminal.line).not.toContain(ADVISOR_SENTENCE);
    } finally {
      delete inspected.advisorScanner;
      watching.dispose();
      controller.dispose();
      if (previousAgent === undefined) delete settingValues["agent"];
      else settingValues["agent"] = previousAgent;
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("Resolve on one Drift names only that Drift, and is refused once that Drift is no longer open", async () => {
    // Dynamic, as above: Controller must load after mock.module replaced "vscode".
    const { Controller } = await import("../extension/src/host/controller");
    const { watchAgentTerminal } = await import("../extension/src/host/agent");
    const watching = watchAgentTerminal();
    const root = mkdtempSync(join(tmpdir(), "trama-resolve-one-"));
    cpSync(join(import.meta.dir, "../examples/shop"), root, { recursive: true });
    const p = projectAt(root);
    const terminalCount = terminals.length;
    const drift = (title: string) => newDrift(p, { where: "src/refund.ts", title, refs: ["order"], happens: "Code does it.", should: "Model says so.", options: FIX_OPTIONS });
    const named = drift("Named");
    const other = drift("Other");
    const previousAgent = settingValues["agent"];
    settingValues["agent"] = "omp";
    const controller = new Controller({ scheme: "file" } as never);
    const launch = controller as unknown as { launchAction(project: Project, action: AgentAction): Promise<void> };
    try {
      await launch.launchAction(p, { kind: "resolve-drifts", drift: named.id });
      const line = (terminals.at(-1) as FakeTerminal).line;
      expect(line).toContain(`the open Drift ${named.id}, and on no other open Drift`);
      expect(line).not.toContain(other.id);

      dismissDrift(p, other.id);
      await expect(launch.launchAction(p, { kind: "resolve-drifts", drift: other.id })).rejects.toThrow("Resolve this Drift is unavailable: Drift");
    } finally {
      // Ends the terminal the Resolve opened, so its Run and resolution are not left open for the tests that follow.
      for (const terminal of terminals.slice(terminalCount)) listeners.close.forEach((fn) => fn(terminal));
      watching.dispose();
      controller.dispose();
      if (previousAgent === undefined) delete settingValues["agent"];
      else settingValues["agent"] = previousAgent;
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("the identity of an agent terminal", () => {
  test("each new terminal has its own ID and design announcement", async () => {
    // Dynamic: the module must load after mock.module replaced "vscode".
    const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    const p = projectAt(dir);
    watchAgentTerminal();
    withdrawAll(p);

    await launchAgent(dir, "Use the trama-design skill. One", "Design", "One");
    const firstId = environments.at(-1)?.["TRAMA_TERMINAL"] as string;
    expect(firstId).toMatch(/^[a-z0-9]{6}$/);
    expect(listAnnouncements(p).map((a) => [a.title, a.terminal])).toEqual([["One", firstId]]);

    await launchAgent(dir, "Use the trama-design skill. Two", "Design", "Two"); // the first is busy: another terminal
    const second = terminals.at(-1) as FakeTerminal;
    const secondId = environments.at(-1)?.["TRAMA_TERMINAL"] as string;
    expect(secondId).toMatch(/^[a-z0-9]{6}$/);
    expect(secondId).not.toBe(firstId);
    expect(listAnnouncements(p).map((a) => [a.title, a.terminal])).toEqual([["One", firstId], ["Two", secondId]]);

    withdrawAll(p);
    listeners.end.forEach((fn) => fn(shell(second)));
    expect(second.disposals).toBe(1);
    const created = terminals.length;
    await launchAgent(dir, "Use the trama-design skill. Three", "Design", "Three");
    expect(terminals).toHaveLength(created + 1);
    expect(environments.at(-1)?.["TRAMA_TERMINAL"]).not.toBe(secondId);
    expect(listAnnouncements(p).map((a) => a.title)).toEqual(["Three"]);
    withdrawAll(p);
  });

  test("a terminal launch reports the instant its command was sent", async () => {
    const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    watchAgentTerminal();
    const sent: number[] = [];
    const before = Date.now();
    await launchAgent(dir, "Scan of the System", "Scan", undefined, () => true, "scan", (startedAt) => sent.push(startedAt));
    expect(sent).toHaveLength(1);
    expect(sent[0]).toBeGreaterThanOrEqual(before);
    expect(sent[0]).toBeLessThanOrEqual(Date.now());
  });

  test("an ended terminal is not reused even when the next instruction has the same name", async () => {
    const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    watchAgentTerminal();
    const end = () => listeners.end.forEach((fn) => fn(shell(terminals.at(-1) as FakeTerminal)));

    await launchAgent(dir, "Use the trama-implement skill on Task abcd1234.", "T3");
    const first = terminals.at(-1);
    expect(created.at(-1)?.name).toBe("T3");
    end();

    await launchAgent(dir, "Use the trama-implement skill on Task efgh5678.", "T4");
    expect(terminals.at(-1)).not.toBe(first);
    expect(created.at(-1)?.name).toBe("T4");
    end();

    const count = terminals.length;
    await launchAgent(dir, "Use the trama-implement skill on Task efgh5678.", "T4");
    expect(terminals).toHaveLength(count + 1);
  });
});

describe("Install omp", () => {
  test("Install omp opens a bare terminal in the home folder with the official installer, and the end of the command or the terminal tells it finished", async () => {
    const { installOmp, INSTALL_OMP_COMMAND, watchAgentTerminal } = await import("../extension/src/host/agent");
    const watching = watchAgentTerminal();
    const p = projectAt(dir);
    withdrawAll(p);
    inspected["terminalLocation"] = { globalValue: "editor" };
    try {
      let finished = 0;
      const first = installOmp(() => void finished++, false) as unknown as FakeTerminal;
      expect(created.at(-1)).toMatchObject({ name: "Install omp", cwd: os.homedir() });
      expect(created.at(-1)?.location).toBeUndefined();
      expect(created.at(-1)?.shellPath).toBeUndefined();
      const env = created.at(-1)?.env ?? {};
      expect(Object.keys(env).filter((key) => key.startsWith("TRAMA_"))).toEqual([]);
      expect(first.line).toBe("curl -fsSL https://omp.sh/install | sh");
      expect(first.line).toBe(INSTALL_OMP_COMMAND.posix);
      expect(first.shown).toEqual([false]);
      expect(listAnnouncements(p)).toEqual([]);
      listeners.end.forEach((fn) => fn(shell(first, "unrelated command")));
      expect(finished).toBe(0);
      listeners.end.forEach((fn) => fn(shell(first)));
      expect(finished).toBe(1);
      listeners.close.forEach((fn) => fn(first));
      listeners.end.forEach((fn) => fn(shell(first)));
      expect(finished).toBe(1);

      const second = installOmp(() => void finished++, true) as unknown as FakeTerminal;
      expect(second).not.toBe(first);
      expect(second.line).toBe("irm https://omp.sh/install.ps1 | iex");
      expect(created.at(-1)?.shellPath).toMatch(/WindowsPowerShell.v1\.0.powershell\.exe$/);
      listeners.close.forEach((fn) => fn(second));
      expect(finished).toBe(2);
    } finally {
      delete inspected["terminalLocation"];
      watching.dispose();
    }
  });

  test("the controller's Install omp forgets the update outcome and checks omp again in the wizard and in Settings when the command ends", async () => {
    const { setUpdateStore, OMP_UPDATE_KEY } = await import("../extension/src/host/omp-update");
    const data = new Map<string, unknown>([[OMP_UPDATE_KEY, { checkedAt: 1 }]]);
    setUpdateStore({ get: <T>(key: string) => data.get(key) as T | undefined, update: async (key: string, value: unknown) => void (value === undefined ? data.delete(key) : data.set(key, value)) } as never);
    const { Controller } = await import("../extension/src/host/controller");
    const controller = new Controller({ scheme: "file" } as never);
    const calls: string[] = [];
    const spied = controller as unknown as { checkAgent(path: string): Promise<void>; refreshOmp(fresh?: boolean): Promise<void> };
    spied.checkAgent = async () => void calls.push("checkAgent");
    spied.refreshOmp = async (fresh) => void calls.push(`refreshOmp ${fresh}`);
    const watching = (await import("../extension/src/host/agent")).watchAgentTerminal();
    try {
      controller.installOmp();
      const terminal = terminals.at(-1) as FakeTerminal;
      expect(calls).toEqual([]);
      expect(data.has(OMP_UPDATE_KEY)).toBe(true);
      listeners.close.forEach((fn) => fn(terminal));
      expect(calls).toEqual(["checkAgent", "refreshOmp true"]);
      expect(data.has(OMP_UPDATE_KEY)).toBe(false);
    } finally {
      setUpdateStore(undefined);
      watching.dispose();
    }
  });
});

describe("Log in to a provider", () => {
  const pathKey = process.platform === "win32" ? "Path" : "PATH";
  const providerOf = (id: string): OmpLoginProvider => {
    const found = ompLoginProvider(id);
    if (found === undefined) throw new Error(`no provider ${id}`);
    return found;
  };
  /** Runs `body` with the editor's default shell set to `shellPath`. */
  const withShell = async <T>(shellPath: string, body: () => T): Promise<T> => {
    const { env } = await import("vscode");
    const before = env.shell;
    Object.defineProperty(env, "shell", { value: shellPath, configurable: true, writable: true });
    try {
      return body();
    } finally {
      Object.defineProperty(env, "shell", { value: before, configurable: true, writable: true });
    }
  };

  test("opens a new bare visible terminal named after the provider, in the home folder and the terminals area, with the quoted program, login and the id of the list", async () => {
    const { loginOmp, watchAgentTerminal } = await import("../extension/src/host/agent");
    const watching = watchAgentTerminal();
    const p = projectAt(dir);
    withdrawAll(p);
    inspected["terminalLocation"] = { globalValue: "editor" };
    try {
      let finished = 0;
      const anthropic = providerOf("anthropic");
      const first = loginOmp("/opt/my omp/bin/omp", anthropic, () => void finished++, false) as unknown as FakeTerminal;
      expect(created.at(-1)).toMatchObject({ name: "Log in to Anthropic", cwd: os.homedir() });
      expect(created.at(-1)?.location).toBeUndefined();
      expect(created.at(-1)?.shellPath).toBeUndefined();
      const env = created.at(-1)?.env ?? {};
      expect(Object.keys(env).filter((key) => key.startsWith("TRAMA_"))).toEqual([]);
      expect(env[pathKey]).toBe(ompPathVariable("/opt/my omp/bin/omp"));
      expect(env[pathKey]?.split(delimiter)[0]).toBe("/opt/my omp/bin");
      expect(first.line).toBe("'/opt/my omp/bin/omp' login anthropic");
      expect(first.shown).toEqual([false]);
      expect(listAnnouncements(p)).toEqual([]);

      // Every provider of the list names its own terminal and takes its own id.
      for (const provider of OMP_LOGIN_PROVIDERS) {
        const terminal = loginOmp("omp", provider, () => {}, false) as unknown as FakeTerminal;
        expect(created.at(-1)?.name).toBe(`Log in to ${provider.name}`);
        expect(terminal.line).toBe(`'omp' login ${provider.id}`);
      }
      expect(terminals.filter((terminal) => terminal.name === "Log in to Anthropic").length).toBeGreaterThanOrEqual(2);
      expect(first.disposals).toBe(0);

      listeners.end.forEach((fn) => fn(shell(first, "unrelated command")));
      expect(finished).toBe(0);
      listeners.end.forEach((fn) => fn(shell(first, first.line, 1)));
      expect(finished).toBe(1);
      listeners.close.forEach((fn) => fn(first));
      listeners.end.forEach((fn) => fn(shell(first)));
      expect(finished).toBe(1);
      expect(first.disposals).toBe(0);

      const closed = loginOmp("omp", anthropic, () => void finished++, false) as unknown as FakeTerminal;
      listeners.close.forEach((fn) => fn(closed));
      expect(finished).toBe(2);
      expect(closed.disposals).toBe(0);
    } finally {
      delete inspected["terminalLocation"];
      watching.dispose();
    }
  });

  test("quotes the program for the shell of the terminal: POSIX, fish, PowerShell 7, and Windows PowerShell 5.1 for the replaced Windows shells", async () => {
    const { loginOmp } = await import("../extension/src/host/agent");
    const provider = providerOf("xai-oauth");
    const line = (shellPath: string, windows: boolean) => withShell(shellPath, () => (loginOmp("/opt/it's omp/omp", provider, () => {}, windows) as unknown as FakeTerminal).line);
    expect(await line("/bin/zsh", false)).toBe(`'/opt/it'\\''s omp/omp' login xai-oauth`);
    expect(await line("/usr/bin/fish", false)).toBe(`'/opt/it\\'s omp/omp' login xai-oauth`);
    expect(await line("/usr/local/bin/pwsh", false)).toBe(`& '/opt/it''s omp/omp' login xai-oauth`);
    // On Windows the other shells (and Git Bash, whose command is not PowerShell's) are replaced by Windows PowerShell 5.1 for this terminal.
    expect(await line("C:\\Windows\\System32\\cmd.exe", true)).toBe(`& '/opt/it''s omp/omp' login xai-oauth`);
    expect(created.at(-1)?.shellPath).toMatch(/WindowsPowerShell.v1\.0.powershell\.exe$/);
    expect(await line("C:\\Program Files\\PowerShell\\7\\pwsh.exe", true)).toBe(`& '/opt/it''s omp/omp' login xai-oauth`);
    expect(created.at(-1)?.shellPath).toBeUndefined();
  });

  test("the controller opens the terminal for the omp of trama.ompPath, or of the path of the message, and checks omp again once when the command ends", async () => {
    const { Controller } = await import("../extension/src/host/controller");
    const controller = new Controller({ scheme: "file" } as never);
    const calls: string[] = [];
    const spied = controller as unknown as { checkAgent(path: string): Promise<void>; refreshOmp(fresh?: boolean): Promise<void>; dispatch(message: unknown): Promise<void> };
    spied.checkAgent = async (path) => void calls.push(`checkAgent ${path}`);
    spied.refreshOmp = async (fresh) => void calls.push(`refreshOmp ${fresh}`);
    const watching = (await import("../extension/src/host/agent")).watchAgentTerminal();
    inspected["ompPath"] = { globalValue: " /saved/omp " };
    try {
      await spied.dispatch({ type: "ompLogin", provider: "github-copilot" });
      const saved = terminals.at(-1) as FakeTerminal;
      expect(created.at(-1)).toMatchObject({ name: "Log in to GitHub Copilot", cwd: os.homedir() });
      expect(saved.line).toBe("'/saved/omp' login github-copilot");
      expect(calls).toEqual([]);

      await spied.dispatch({ type: "ompLogin", provider: "cursor", ompPath: "/typed/omp" });
      const typedPath = terminals.at(-1) as FakeTerminal;
      expect(typedPath).not.toBe(saved);
      expect(typedPath.line).toBe("'/typed/omp' login cursor");

      listeners.end.forEach((fn) => fn(shell(typedPath)));
      listeners.close.forEach((fn) => fn(typedPath));
      expect(calls).toEqual(["checkAgent /typed/omp", "refreshOmp true"]);
      listeners.close.forEach((fn) => fn(saved));
      expect(calls).toEqual(["checkAgent /typed/omp", "refreshOmp true", "checkAgent /saved/omp", "refreshOmp true"]);
      expect(saved.disposals + typedPath.disposals).toBe(0);
    } finally {
      delete inspected["ompPath"];
      watching.dispose();
    }
  });
});

describe("omp run hooks", () => {
  test("every job loads the bundled omp hook module in its own terminal", async () => {
    // Dynamic import is intentional: the fake vscode extension registry must be in place before agent.ts loads.
    const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    const testDir = mkdtempSync(join(tmpdir(), "trama-omp-hooks-"));
    projectAt(testDir);
    extensionPath = join(testDir, "extension");
    mkdirSync(join(extensionPath, "dist"), { recursive: true });
    writeFileSync(join(extensionPath, "dist", "omp-hook.js"), "");
    settingValues.agent = "omp";
    settingValues.execution = "haiku";
    watchAgentTerminal();
    try {
      await launchAgent(testDir, "first prompt", "T3");
      const first = terminals.at(-1) as FakeTerminal;
      const firstId = environments.at(-1)?.["TRAMA_TERMINAL"];

      await launchAgent(testDir, "second prompt", "T4");
      const second = terminals.at(-1) as FakeTerminal;
      const secondId = environments.at(-1)?.["TRAMA_TERMINAL"];
      expect(second).not.toBe(first);
      expect(secondId).not.toBe(firstId);

      for (const [terminal, id] of [[first, firstId], [second, secondId]] as const) {
        expect(terminal.line).toContain(`'omp' --hook '${join(extensionPath, "dist", "omp-hook.js")}' --model 'haiku' `);
        expect(id).toMatch(/^[a-z0-9]{6}$/);
        expect(environments.find((env) => env?.["TRAMA_TERMINAL"] === id)?.["TRAMA_TERMINAL"]).toBe(id);
      }
      expect(typed.slice(-2)).toEqual([first.line, second.line]);
      listeners.end.forEach((fn) => fn(shell(first)));
      listeners.end.forEach((fn) => fn(shell(second)));
    } finally {
      extensionPath = "";
      settingValues.agent = "omp";
      delete settingValues.execution;
      rmSync(testDir, { recursive: true, force: true });
    }
  });
});

describe("the model a launch runs on", () => {
  test("the model given at the launch replaces the role's model in the command, and the scan model stays for Machine comparison", async () => {
    // Dynamic import is intentional, as above: the fake vscode extension registry must be in place before agent.ts loads.
    const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    const dir = mkdtempSync(join(tmpdir(), "trama-run-model-"));
    projectAt(dir);
    settingValues.agent = "omp";
    settingValues.execution = "haiku";
    settingValues.scan = "sonnet";
    watchAgentTerminal();
    try {
      await launchAgent(dir, "Use the trama-implement skill on Task abcd1234.", "T3", undefined, () => true, undefined, undefined, { model: { model: "gpt-5" } });
      const proposal = terminals.at(-1) as FakeTerminal;
      expect(proposal.line).toContain("--model 'gpt-5'");
      expect(proposal.line).toContain("--slow 'sonnet'");
      expect(proposal.line).not.toContain("haiku");
      listeners.end.forEach((fn) => fn(shell(proposal)));

      await launchAgent(dir, "Use the trama-implement skill on Task efgh5678.", "T4");
      const role = terminals.at(-1) as FakeTerminal;
      expect(role.line).toContain("--model 'haiku'");
      expect(role.line).not.toContain("gpt-5");
      listeners.end.forEach((fn) => fn(shell(role)));
    } finally {
      delete settingValues.execution;
      delete settingValues.scan;
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("the end of a Run reaches the step that follows it", () => {
  test("a normal end calls onEnd with nothing; a failed command or a closed terminal calls it with its reason", async () => {
    const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    const dir = mkdtempSync(join(tmpdir(), "trama-run-end-"));
    projectAt(dir);
    settingValues.agent = "omp";
    watchAgentTerminal();
    const ends: string[] = [];
    const record = (abnormal?: string) => void ends.push(abnormal ?? "normal");
    try {
      expect(await launchAgent(dir, "Use the trama-implement skill on Task abcd1234.", "T3", undefined, () => true, "run", undefined, { onEnd: record })).toBe("terminal");
      const failed = terminals.at(-1) as FakeTerminal;
      listeners.end.forEach((fn) => fn(shell(failed, failed.line, 1)));
      expect(ends).toEqual(["its command exited with code 1"]);

      await launchAgent(dir, "Use the trama-implement skill on Task efgh5678.", "T4", undefined, () => true, "run", undefined, { onEnd: record });
      const done = terminals.at(-1) as FakeTerminal;
      listeners.end.forEach((fn) => fn(shell(done, done.line, 0)));
      expect(ends).toEqual(["its command exited with code 1", "normal"]);

      await launchAgent(dir, "Use the trama-implement skill on Task ijkl9012.", "T5", undefined, () => true, "run", undefined, { onEnd: record });
      const closed = terminals.at(-1) as FakeTerminal;
      listeners.close.forEach((fn) => fn(closed));
      expect(ends).toEqual(["its command exited with code 1", "normal", "its terminal was closed"]);
    } finally {
      settingValues.agent = "omp";
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("automatic terminal exit", () => {
  test("the first idle or typed-command end finalizes only its tracked terminal once", async () => {
    delete settingValues.autoExit;
    const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    const { driftWork, receiveAgentIdle } = await import("../extension/src/host/drift-resolution");
    const p = projectAt(dir);
    const watching = watchAgentTerminal();
    try {
      await launchAgent(dir, "Use the trama-implement skill on Task abcd1234.", "T3", undefined, () => true, "run");
      const idleTerminal = terminals.at(-1) as FakeTerminal;
      const idleId = environments.at(-1)?.["TRAMA_TERMINAL"] as string;
      announce(p, { kind: "task", title: "Idle ghost", terminal: idleId });
      expect(driftWork()).toEqual({ resolving: false, running: true });
      listeners.end.forEach((listener) => listener(shell(idleTerminal, "unrelated command")));
      const foreignTerminal = { ...idleTerminal };
      listeners.end.forEach((listener) => listener(shell(foreignTerminal)));
      expect(idleTerminal.disposals).toBe(0);
      expect(driftWork()).toEqual({ resolving: false, running: true });
      receiveAgentIdle(idleId, dir);
      expect(idleTerminal.disposals).toBe(1);
      expect(driftWork()).toEqual({ resolving: false, running: false });
      expect(listAnnouncements(p)).toEqual([]);
      listeners.end.forEach((listener) => listener(shell(idleTerminal)));
      listeners.close.forEach((listener) => listener(idleTerminal));
      receiveAgentIdle(idleId, dir);
      expect(idleTerminal.disposals).toBe(1);

      await launchAgent(dir, "Use the trama-implement skill on Task efgh5678.", "T4", undefined, () => true, "run");
      const endedTerminal = terminals.at(-1) as FakeTerminal;
      const endedId = environments.at(-1)?.["TRAMA_TERMINAL"] as string;
      announce(p, { kind: "task", title: "Ended ghost", terminal: endedId });
      listeners.end.forEach((listener) => listener(shell(endedTerminal)));
      expect(endedTerminal.disposals).toBe(1);
      expect(driftWork()).toEqual({ resolving: false, running: false });
      expect(listAnnouncements(p)).toEqual([]);
      listeners.end.forEach((listener) => listener(shell(endedTerminal)));
      listeners.close.forEach((listener) => listener(endedTerminal));
      expect(endedTerminal.disposals).toBe(1);
    } finally {
      watching.dispose();
      withdrawAll(p);
      delete settingValues.autoExit;
    }
  });

  test("autoExit off leaves an idle terminal open, no longer follows it, and closing it releases what it took", async () => {
    settingValues.autoExit = false;
    const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    const { driftWork, receiveAgentIdle } = await import("../extension/src/host/drift-resolution");
    const p = projectAt(dir);
    const watching = watchAgentTerminal();
    try {
      await launchAgent(dir, "Use the trama-implement skill on Task abcd1234.", "T3", undefined, () => true, "run");
      const terminal = terminals.at(-1) as FakeTerminal;
      const id = environments.at(-1)?.["TRAMA_TERMINAL"] as string;
      announce(p, { kind: "task", title: "Idle ghost", terminal: id });
      receiveAgentIdle(id, dir);
      expect(terminal.disposals).toBe(0);
      expect(driftWork()).toEqual({ resolving: false, running: false });
      expect(listAnnouncements(p)).toEqual([]);
      const count = terminals.length;
      await launchAgent(dir, "Use the trama-implement skill on Task efgh5678.", "T3", undefined, () => true, "run");
      expect(terminals).toHaveLength(count + 1);
      const nextTerminal = terminals.at(-1) as FakeTerminal;
      const nextId = environments.at(-1)?.["TRAMA_TERMINAL"] as string;
      expect(nextId).not.toBe(id);
      listeners.end.forEach((listener) => listener(shell(nextTerminal)));
      expect(nextTerminal.disposals).toBe(0);
      expect(driftWork()).toEqual({ resolving: false, running: false });
      announce(p, { kind: "task", title: "Resumed ghost", terminal: id });
      const resumedTask = moveTask(p, newTask(p, { title: "Resumed", refs: ["order/Paid"], technical: false }).id, "doing", "agent", { terminal: id }).id;
      receiveAgentIdle(id, dir);
      listeners.end.forEach((listener) => listener(shell(terminal)));
      expect(getTask(p, resumedTask).data.column).toBe("doing");
      listeners.close.forEach((listener) => listener(terminal));
      expect(terminal.disposals).toBe(0);
      expect(driftWork()).toEqual({ resolving: false, running: false });
      expect(getTask(p, resumedTask).data.column).toBe("todo");
      expect(listAnnouncements(p)).toEqual([]);
      withdrawAll(p);
    } finally {
      watching.dispose();
      delete settingValues.autoExit;
    }
  });
  test("a workspace value of autoExit does not turn it off: the idle terminal is closed", async () => {
    delete settingValues.autoExit;
    inspected.autoExit = { workspaceValue: false };
    const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    const { receiveAgentIdle } = await import("../extension/src/host/drift-resolution");
    const watching = watchAgentTerminal();
    try {
      await launchAgent(dir, "Use the trama-implement skill on Task abcd1234.", "T3", undefined, () => true, "run");
      const terminal = terminals.at(-1) as FakeTerminal;
      const id = environments.at(-1)?.["TRAMA_TERMINAL"] as string;
      receiveAgentIdle(id, dir);
      expect(terminal.disposals).toBe(1);
    } finally {
      watching.dispose();
      delete inspected.autoExit;
    }
  });
  test("the Advisor Scanner is on only from the user value true", async () => {
    // Loaded after the editor and home mocks above are in place: a static import would run before them.
    const { configuredAdvisorScanner } = await import("../extension/src/host/agent");
    try {
      inspected.advisorScanner = { globalValue: true };
      expect(configuredAdvisorScanner()).toBe(true);
      inspected.advisorScanner = { globalValue: "true" };
      expect(configuredAdvisorScanner()).toBe(false);
      inspected.advisorScanner = { workspaceValue: true };
      expect(configuredAdvisorScanner()).toBe(false);
    } finally {
      delete inspected.advisorScanner;
    }
  });
  test("the parallel execution is on only from the user value true", async () => {
    const { configuredParallelExecution } = await import("../extension/src/host/agent");
    try {
      expect(configuredParallelExecution()).toBe(false);
      inspected.parallelExecution = { globalValue: true };
      expect(configuredParallelExecution()).toBe(true);
      inspected.parallelExecution = { globalValue: "true" };
      expect(configuredParallelExecution()).toBe(false);
      inspected.parallelExecution = { workspaceValue: true };
      expect(configuredParallelExecution()).toBe(false);
      inspected.parallelExecution = { globalValue: false, workspaceValue: true };
      expect(configuredParallelExecution()).toBe(false);
    } finally {
      delete inspected.parallelExecution;
    }
  });
  test("Ignore Instruction Files is on only from the user value true", async () => {
    const { configuredIgnoreInstructionFiles } = await import("../extension/src/host/agent");
    try {
      expect(configuredIgnoreInstructionFiles()).toBe(false);
      inspected.ignoreInstructionFiles = { globalValue: true };
      expect(configuredIgnoreInstructionFiles()).toBe(true);
      inspected.ignoreInstructionFiles = { globalValue: "true" };
      expect(configuredIgnoreInstructionFiles()).toBe(false);
      inspected.ignoreInstructionFiles = { workspaceValue: true };
      expect(configuredIgnoreInstructionFiles()).toBe(false);
    } finally {
      delete inspected.ignoreInstructionFiles;
    }
  });

  test("Context Sharing is on only from the user value true", async () => {
    const { configuredSubagentsContextSharing } = await import("../extension/src/host/agent");
    try {
      expect(configuredSubagentsContextSharing()).toBe(false);
      inspected.subagentsContextSharing = { globalValue: true };
      expect(configuredSubagentsContextSharing()).toBe(true);
      inspected.subagentsContextSharing = { globalValue: "true" };
      expect(configuredSubagentsContextSharing()).toBe(false);
      inspected.subagentsContextSharing = { workspaceValue: true };
      expect(configuredSubagentsContextSharing()).toBe(false);
    } finally {
      delete inspected.subagentsContextSharing;
    }
  });
  test("the Async Drift Resolver is on only from the user value true, and its sentence follows the Drift blocker's", async () => {
    const { configuredAsyncDriftResolver, launchAgent } = await import("../extension/src/host/agent");
    const blocker = "The Drift blocker is on: follow its steps whenever you file a Drift, and tell your sub-agents.";
    const resolver = "The Async Drift Resolver is on: before finishing, prepare the resolution question of every Drift filed in this job, as your skill says.";
    const scan = "Use the trama-scan skill on the whole System.";
    const base = `${scan} Run at most 20 sub-agents at once. Compare each Machine with the trama-analysis sub-agent.`;
    const send = async (instruction: string, name: string, filesDrifts: boolean) => {
      await launchAgent(dir, instruction, name, undefined, undefined, undefined, undefined, { filesDrifts });
      return typed.at(-1) ?? "";
    };
    try {
      expect(configuredAsyncDriftResolver()).toBe(false);
      inspected.asyncDriftResolver = { globalValue: "true" };
      expect(configuredAsyncDriftResolver()).toBe(false);
      inspected.asyncDriftResolver = { workspaceValue: true };
      expect(configuredAsyncDriftResolver()).toBe(false);
      inspected.asyncDriftResolver = { globalValue: true };
      expect(configuredAsyncDriftResolver()).toBe(true);
      expect(await send(scan, "Scan", true)).toBe(`'omp' '${base} ${resolver} ${ASK_DEVELOPER_SENTENCE} ${AUTO_EXIT_SENTENCE}'`);
      inspected.driftBlocker = { globalValue: true };
      expect(await send(scan, "Scan", true)).toBe(`'omp' '${base} ${blocker} ${resolver} ${ASK_DEVELOPER_SENTENCE} ${AUTO_EXIT_SENTENCE}'`);
      expect(await send("Use the trama-design skill. Add refunds.", "Design", false)).not.toContain(resolver);
      delete inspected.asyncDriftResolver;
      expect(await send(scan, "Scan", true)).toBe(`'omp' '${base} ${blocker} ${ASK_DEVELOPER_SENTENCE} ${AUTO_EXIT_SENTENCE}'`);
    } finally {
      delete inspected.asyncDriftResolver;
      delete inspected.driftBlocker;
    }
  });
  test("the Context Sharing sentence follows the Async Drift Resolver's, or the limit and blocker sentences, on every instruction with the limit", async () => {
    const { launchAgent } = await import("../extension/src/host/agent");
    const sharing = 'The sub-agents context sharing is on: pass each sub-agent what you have already read that concerns its part, as the "Sub-agents context sharing" section of your skill says.';
    const blocker = "The Drift blocker is on: follow its steps whenever you file a Drift, and tell your sub-agents.";
    const resolver = "The Async Drift Resolver is on: before finishing, prepare the resolution question of every Drift filed in this job, as your skill says.";
    const scan = "Use the trama-scan skill on the whole System.";
    const design = "Use the trama-design skill. Add refunds.";
    const scanBase = `${scan} Run at most 20 sub-agents at once. Compare each Machine with the trama-analysis sub-agent.`;
    const designBase = `${design} Run at most 20 sub-agents at once.`;
    const send = async (instruction: string, name: string, filesDrifts: boolean) => {
      await launchAgent(dir, instruction, name, undefined, undefined, undefined, undefined, { filesDrifts });
      return typed.at(-1) ?? "";
    };
    try {
      inspected.subagentsContextSharing = { globalValue: "true" };
      expect(await send(scan, "Scan", true)).toBe(`'omp' '${scanBase} ${ASK_DEVELOPER_SENTENCE} ${AUTO_EXIT_SENTENCE}'`);
      inspected.subagentsContextSharing = { workspaceValue: true };
      expect(await send(scan, "Scan", true)).toBe(`'omp' '${scanBase} ${ASK_DEVELOPER_SENTENCE} ${AUTO_EXIT_SENTENCE}'`);
      inspected.subagentsContextSharing = { globalValue: true };
      expect(await send(scan, "Scan", true)).toBe(`'omp' '${scanBase} ${sharing} ${ASK_DEVELOPER_SENTENCE} ${AUTO_EXIT_SENTENCE}'`);
      expect(await send(design, "Design", false)).toBe(`'omp' '${designBase} ${sharing} ${ASK_DEVELOPER_SENTENCE} ${AUTO_EXIT_SENTENCE}'`);
      expect(await send("Resolve the Drift.", "Resolve Drifts", false)).toBe(`'omp' 'Resolve the Drift. Run at most 20 sub-agents at once. Compare each Machine with the trama-analysis sub-agent. ${sharing} ${ASK_DEVELOPER_SENTENCE} ${AUTO_EXIT_SENTENCE}'`);
      inspected.driftBlocker = { globalValue: true };
      expect(await send(scan, "Scan", true)).toBe(`'omp' '${scanBase} ${blocker} ${sharing} ${ASK_DEVELOPER_SENTENCE} ${AUTO_EXIT_SENTENCE}'`);
      inspected.asyncDriftResolver = { globalValue: true };
      expect(await send(scan, "Scan", true)).toBe(`'omp' '${scanBase} ${blocker} ${resolver} ${sharing} ${ASK_DEVELOPER_SENTENCE} ${AUTO_EXIT_SENTENCE}'`);
    } finally {
      delete inspected.subagentsContextSharing;
      delete inspected.asyncDriftResolver;
      delete inspected.driftBlocker;
    }
  });
  test("an instruction is built when it is sent, and is not sent if the delivery conditions change", async () => {
    const { launchAgent } = await import("../extension/src/host/agent");
    let scope = "the Drift open before the instruction is sent";
    const sending = launchAgent(dir, () => `Resolve ${scope}.`, "Drifts");
    scope = "the Drift open at send time";
    expect(await sending).toBe("terminal");
    expect(typed.at(-1)).toBe(`'omp' 'Resolve the Drift open at send time. Run at most 20 sub-agents at once. ${ASK_DEVELOPER_SENTENCE} ${AUTO_EXIT_SENTENCE}'`);

    const terminalCount = terminals.length;
    const typedCount = typed.length;
    let checks = 0;
    expect(await launchAgent(dir, () => `Resolve ${scope}.`, "Resolve Drifts", undefined, () => checks++ < 2)).toBeUndefined();
    expect(terminals).toHaveLength(terminalCount);
    expect(typed).toHaveLength(typedCount);
  });
});

describe("the agent terminal as an editor tab", () => {
  test("terminal tabs always open in the active group, without remembering the previous tab's group", async () => {
    // Dynamic: the module must load after mock.module replaced "vscode".
    const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    watchAgentTerminal();
    const instruction = "Use the trama-scan skill on the whole System.";
    const closeAll = () => terminals.forEach((t) => listeners.close.forEach((fn) => fn(t)));
    /** The editor reports that a tab opened in `viewColumn`, labelled `label`. */
    const opened = (label: string, viewColumn: number, input: unknown = new TabInputTerminal()) =>
      listeners.tabs.forEach((fn) => fn({ opened: [{ input, label, group: { viewColumn } }] }));
    closeAll(); // no earlier terminal to reuse
    settingValues["terminalLocation"] = "editor";
    tabGroups.columns = [1, 2, 3];
    try {
      await launchAgent(dir, instruction, "Scan");
      const first = terminals.at(-1) as FakeTerminal;
      expect(created.at(-1)).toMatchObject({ name: "Scan", cwd: dir, env: { TRAMA_AGENT: "1", TRAMA_QUESTION_ENDPOINT: "endpoint", TRAMA_TERMINAL: expect.stringMatching(/^[a-z0-9]{6}$/) }, location: { viewColumn: 1, preserveFocus: true } });
      expect(first.shown).toEqual([true]);
      // The editor reports the agent's tab in another group: the next tab still opens in the active group.
      opened("Scan", 3);
      opened("Scan", 2);
      await launchAgent(dir, instruction, "Scan"); // the first is busy: a new tab, again in the active group
      expect(created.at(-1)?.location).toEqual({ viewColumn: 1, preserveFocus: true });
      expect(terminals.at(-1)).not.toBe(first);
      expect(first.shown).toEqual([true]);

      tabGroups.columns = [1]; // the other groups are gone: the active one is still used
      await launchAgent(dir, instruction, "Scan");
      expect(created.at(-1)?.location).toEqual({ viewColumn: 1, preserveFocus: true });

      closeAll(); // the previous tabs are closed
      await launchAgent(dir, instruction, "Scan");
      expect(created.at(-1)?.location).toEqual({ viewColumn: 1, preserveFocus: true });

    } finally {
      delete settingValues["terminalLocation"];
      tabGroups.columns = [1];
    }
  });

  test("terminals are not reused after commands end, regardless of their location", async () => {
    // Load after mock.module installs the editor API.
    const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    watchAgentTerminal();
    terminals.forEach((terminal) => listeners.close.forEach((fn) => fn(terminal)));
    const instruction = "Use the trama-scan skill on the whole System.";
    settingValues["terminalLocation"] = "panel";
    tabGroups.columns = [1, 2];
    try {
      await launchAgent(dir, instruction, "Scan");
      const area = terminals.at(-1) as FakeTerminal;
      listeners.end.forEach((fn) => fn(shell(area)));
      settingValues["terminalLocation"] = "editor";
      await launchAgent(dir, instruction, "Scan");
      const tab = terminals.at(-1) as FakeTerminal;
      expect(tab).not.toBe(area);
      expect(created.at(-1)?.location).toEqual({ viewColumn: 1, preserveFocus: true });
      expect(area.shown).toEqual([]);
      expect(tab.shown).toEqual([true]);
      listeners.tabs.forEach((fn) => fn({ opened: [{ input: new TabInputTerminal(), label: "Scan", group: { viewColumn: 2 } }] }));
      listeners.end.forEach((fn) => fn(shell(tab)));
      const tabId = environments.at(-1)?.["TRAMA_TERMINAL"];
      await launchAgent(dir, instruction, "Scan");
      expect(terminals.at(-1)).not.toBe(tab);
      expect(environments.at(-1)?.["TRAMA_TERMINAL"]).not.toBe(tabId);
      const afterTab = terminals.at(-1) as FakeTerminal;
      expect(afterTab.shown).toEqual([true]);

      settingValues["terminalLocation"] = "panel";
      await launchAgent(dir, instruction, "Scan");
      const nextArea = terminals.at(-1) as FakeTerminal;
      expect(nextArea).not.toBe(tab);
      expect(created.at(-1)?.location).toBeUndefined();
      expect(nextArea.shown).toEqual([]);
      listeners.end.forEach((fn) => fn(shell(nextArea)));
      settingValues["terminalLocation"] = "panel";
      await launchAgent(dir, instruction, "Scan");
      const nextTerminal = terminals.at(-1) as FakeTerminal;
      expect(nextTerminal).not.toBe(nextArea);
      expect(nextTerminal.shown).toEqual([]);

      listeners.end.forEach((fn) => fn(shell(nextTerminal)));
      settingValues["terminalLocation"] = "editor";
      await launchAgent(dir, instruction, "Scan");
      expect(created.at(-1)?.location).toEqual({ viewColumn: 1, preserveFocus: true });

    } finally {
      delete settingValues["terminalLocation"];
      tabGroups.columns = [1];
    }
  });
});

describe("agent instruction settings", () => {
  test("the sub-agent limit is read at each launch, and the language sentence ends the line, trimmed and as typed, only while a language is set", async () => {
    const { launchAgent } = await import("../extension/src/host/agent");
    const instruction = "Use the trama-scan skill on the whole System.";

    await launchAgent(dir, instruction, "Scan");
    expect(typed.at(-1)).toBe(`'omp' '${instruction} Run at most 20 sub-agents at once. Compare each Machine with the trama-analysis sub-agent. ${ASK_DEVELOPER_SENTENCE} ${AUTO_EXIT_SENTENCE}'`);
    settingValues["maxParallelAgents"] = 4;
    inspected["maxParallelAgents"] = { globalValue: 4, workspaceValue: 99 };
    await launchAgent(dir, instruction, "Scan");
    expect(typed.at(-1)).toBe(`'omp' '${instruction} Run at most 4 sub-agents at once. Compare each Machine with the trama-analysis sub-agent. ${ASK_DEVELOPER_SENTENCE} ${AUTO_EXIT_SENTENCE}'`);
    delete inspected["maxParallelAgents"];
    for (const invalid of ["", 0, -2, 1.5, "3"]) {
      settingValues["maxParallelAgents"] = invalid;
      await launchAgent(dir, instruction, "Scan");
      expect(typed.at(-1)).toBe(`'omp' '${instruction} Run at most 20 sub-agents at once. Compare each Machine with the trama-analysis sub-agent. ${ASK_DEVELOPER_SENTENCE} ${AUTO_EXIT_SENTENCE}'`);
    }

    settingValues["language"] = " Italian ";
    try {
      settingValues["maxParallelAgents"] = 4;
      await launchAgent(dir, instruction, "Scan");
      expect(typed.at(-1)).toBe(`'omp' '${instruction} Run at most 4 sub-agents at once. Compare each Machine with the trama-analysis sub-agent. ${ASK_DEVELOPER_SENTENCE} ${AUTO_EXIT_SENTENCE} ${languageSentence("Italian")}'`);
      expect(typed.at(-1)?.split("\\n")).toHaveLength(1);

      settingValues["language"] = "English";
      await launchAgent(dir, instruction, "Scan");
      expect(typed.at(-1)).toBe(`'omp' '${instruction} Run at most 4 sub-agents at once. Compare each Machine with the trama-analysis sub-agent. ${ASK_DEVELOPER_SENTENCE} ${AUTO_EXIT_SENTENCE} ${languageSentence("English")}'`);

      settingValues["language"] = "   ";
      await launchAgent(dir, instruction, "Scan");
      expect(typed.at(-1)).toBe(`'omp' '${instruction} Run at most 4 sub-agents at once. Compare each Machine with the trama-analysis sub-agent. ${ASK_DEVELOPER_SENTENCE} ${AUTO_EXIT_SENTENCE}'`);
    } finally {
      delete settingValues["language"];
      delete settingValues["maxParallelAgents"];
    }
  });
  test("the Drift blocker's sentence reaches only the instructions that may file Drifts, and only from the user setting", async () => {
    const { launchAgent } = await import("../extension/src/host/agent");
    const sentence = "The Drift blocker is on: follow its steps whenever you file a Drift, and tell your sub-agents.";
    const scan = "Use the trama-scan skill on the whole System.";
    const send = async (instruction: string, name: string, filesDrifts: boolean) => {
      await launchAgent(dir, instruction, name, undefined, undefined, undefined, undefined, { filesDrifts });
      return typed.at(-1) ?? "";
    };
    inspected["driftBlocker"] = { globalValue: true };
    try {
      expect(await send(scan, "Scan", true)).toBe(`'omp' '${scan} Run at most 20 sub-agents at once. Compare each Machine with the trama-analysis sub-agent. ${sentence} ${ASK_DEVELOPER_SENTENCE} ${AUTO_EXIT_SENTENCE}'`);
      expect(await send("Use the trama-implement skill on Task abc.", "T3", true)).toBe(`'omp' 'Use the trama-implement skill on Task abc. Run at most 20 sub-agents at once. Compare each Machine with the trama-analysis sub-agent. ${sentence} ${ASK_DEVELOPER_SENTENCE} ${AUTO_EXIT_SENTENCE}'`);
      expect(await send("Use the trama-import skill on this repository.", "Import", true)).toBe(`'omp' 'Use the trama-import skill on this repository. Run at most 20 sub-agents at once. ${sentence} ${ASK_DEVELOPER_SENTENCE} ${AUTO_EXIT_SENTENCE}'`);
      expect((await send(buildPrompt({ kind: "implement-all" }), "All tasks", true)).endsWith(` ${sentence} ${ASK_DEVELOPER_SENTENCE} ${AUTO_EXIT_SENTENCE}'`)).toBe(true);
      expect(await send("Use the trama-design skill. Add refunds.", "Design", false)).not.toContain(sentence);
      expect(await send("Use the trama-resolve-drifts skill on the open Drifts ab12cd34.", "Drifts", false)).not.toContain(sentence);
      expect(await send(scan, "Scan", false)).not.toContain(sentence);

      inspected["driftBlocker"] = { globalValue: false };
      expect(await send(scan, "Scan", true)).not.toContain(sentence);
      inspected["driftBlocker"] = { globalValue: "true" };
      expect(await send(scan, "Scan", true)).not.toContain(sentence);
      inspected["driftBlocker"] = { workspaceValue: true };
      expect(await send(scan, "Scan", true)).not.toContain(sentence);
      delete inspected["driftBlocker"];
      expect(await send(scan, "Scan", true)).not.toContain(sentence);

      inspected["driftBlocker"] = { globalValue: true };
      settingValues["language"] = "Italian";
      expect(await send(scan, "Scan", true)).toBe(`'omp' '${scan} Run at most 20 sub-agents at once. Compare each Machine with the trama-analysis sub-agent. ${sentence} ${ASK_DEVELOPER_SENTENCE} ${AUTO_EXIT_SENTENCE} ${languageSentence("Italian")}'`);
    } finally {
      delete inspected["driftBlocker"];
      delete settingValues["language"];
    }
  });
  test("the parallel execution's sentence reaches only the runs over several Tasks, right after the sub-agent sentence, and only from the user setting", async () => {
    const { launchAgent } = await import("../extension/src/host/agent");
    const { PARALLEL_EXECUTION_SENTENCE } = await import("../extension/src/host/prompts");
    const sentence = 'The parallel execution is on: follow the "Parallel execution" section of the trama-implement skill.';
    expect(PARALLEL_EXECUTION_SENTENCE).toBe(sentence);
    const all = "Use the trama-implement skill on every Task in the todo column.";
    const send = async (instruction: string, name: string, severalTasks: boolean) => {
      await launchAgent(dir, instruction, name, undefined, undefined, undefined, undefined, { filesDrifts: true, severalTasks });
      return typed.at(-1) ?? "";
    };
    inspected["parallelExecution"] = { globalValue: true };
    try {
      expect(await send(all, "All tasks", true)).toBe(`'omp' '${all} Run at most 20 sub-agents at once. Compare each Machine with the trama-analysis sub-agent. ${sentence} ${ASK_DEVELOPER_SENTENCE} ${AUTO_EXIT_SENTENCE}'`);
      expect((await send(buildPrompt({ kind: "implement-all" }), "All tasks", true)).includes(` Compare each Machine with the trama-analysis sub-agent. ${sentence} ${ASK_DEVELOPER_SENTENCE} ${AUTO_EXIT_SENTENCE}'`)).toBe(true);
      expect(await send("Use the trama-implement skill on Task abc.", "T3", false)).not.toContain(sentence);
      expect(await send("Use the trama-scan skill on the whole System.", "Scan", false)).not.toContain(sentence);
      expect(await send("Use the trama-design skill. Add refunds.", "Design", false)).not.toContain(sentence);

      inspected["parallelExecution"] = { globalValue: false };
      expect(await send(all, "All tasks", true)).not.toContain(sentence);
      inspected["parallelExecution"] = { globalValue: "true" };
      expect(await send(all, "All tasks", true)).not.toContain(sentence);
      inspected["parallelExecution"] = { workspaceValue: true };
      expect(await send(all, "All tasks", true)).not.toContain(sentence);
      delete inspected["parallelExecution"];
      expect(await send(all, "All tasks", true)).toBe(`'omp' '${all} Run at most 20 sub-agents at once. Compare each Machine with the trama-analysis sub-agent. ${ASK_DEVELOPER_SENTENCE} ${AUTO_EXIT_SENTENCE}'`);
    } finally {
      delete inspected["parallelExecution"];
    }
  });
  test("a Run that starts with its share of the places says so in its instruction, and its trama task list carries that max", async () => {
    const { launchAgent } = await import("../extension/src/host/agent");
    const all = "Use the trama-implement skill on every Task in the \"todo\" column.";
    inspected["parallelExecution"] = { globalValue: true };
    try {
      await launchAgent(dir, all, "All tasks", undefined, undefined, undefined, undefined, { filesDrifts: true, severalTasks: true, limit: 3 });
      expect(typed.at(-1)).toContain("Run at most 3 sub-agents at once. Compare each Machine with the trama-analysis sub-agent.");
    } finally {
      delete inspected["parallelExecution"];
    }
  });
  test("every instruction carries the ask sentence on its line, then the auto-exit one, then the language one only while a language is set", async () => {
    const { launchAgent } = await import("../extension/src/host/agent");
    const jobs: [string, string][] = [
      [buildPrompt({ kind: "written-design", request: "r" }), "Design"],
      [buildPrompt({ kind: "setup-request", request: "r" }), "Setup"],
      [buildPrompt({ kind: "scan" }), "Scan"],
      [buildPrompt({ kind: "implement", task: "abc" }), "T3"],
      [buildPrompt({ kind: "implement-all" }), "All tasks"],
      [buildPrompt({ kind: "import" }), "Import"],
      [buildPrompt({ kind: "resolve-drifts", drift: "ab12cd34" }), "Drifts"],
      [buildPrompt({ kind: "unify-drifts", drifts: ["aaaa1111", "bbbb2222"] }), "Unify"],
      [buildPrompt({ kind: "rework", proposal: "ab12cd34", skill: "design" }), "Design"],
      [buildPrompt({ kind: "rework-resolution", proposal: "ab12cd34", drifts: ["aaaa1111"] }), "Drifts"],
      [buildPrompt({ kind: "refine", proposal: "ab12cd34", seats: 1, job: "j" }), "Refine P1"],
    ];
    try {
      for (const [instruction, name] of jobs) {
        await launchAgent(dir, instruction, name);
        expect(typed.at(-1)).toEndWith(` ${ASK_DEVELOPER_SENTENCE} ${AUTO_EXIT_SENTENCE}'`);
        expect(typed.at(-1)).not.toContain("Write the texts for the developer");
        expect(typed.at(-1)).not.toContain("\n");
      }
      settingValues["language"] = " Italian ";
      for (const [instruction, name] of jobs) {
        await launchAgent(dir, instruction, name);
        expect(typed.at(-1)).toEndWith(` ${ASK_DEVELOPER_SENTENCE} ${AUTO_EXIT_SENTENCE} ${languageSentence("Italian")}'`);
        expect(typed.at(-1)).not.toContain("\n");
      }
      settingValues["language"] = "   ";
      for (const [instruction, name] of jobs) {
        await launchAgent(dir, instruction, name);
        expect(typed.at(-1)).toEndWith(` ${ASK_DEVELOPER_SENTENCE} ${AUTO_EXIT_SENTENCE}'`);
      }
    } finally {
      delete settingValues["language"];
    }
  });
});

describe("the agent", () => {
  test("every instruction goes to omp in a terminal in any editor: a trama.agent value left in the user settings, cursor included, and the legacy settings are not read, changed or warned about", async () => {
    const { launchAgent } = await import("../extension/src/host/agent");
    const instruction = "Use the trama-scan skill on the whole System.";
    const previousApp = editor.appName;
    const before = { clipboard: clipboard.length, offers: answerOffer.length, errors: errorMessages.length, warnings: warningMessages.length };
    settingValues.agentLauncher = "terminal";
    settingValues.terminalAgent = "codex";
    settingValues.agentCommand = "custom-agent {prompt}";
    updates.length = 0;
    editorCalls.length = 0;
    pick = () => {
      throw new Error("unexpected agent-selection prompt");
    };
    try {
      for (const agent of [undefined, "cursor", "chat", "claude", "omp"]) {
        for (const appName of ["Visual Studio Code", "Cursor"]) {
          if (agent === undefined) delete settingValues.agent;
          else settingValues.agent = agent;
          editor.appName = appName;
          const count = terminals.length;
          expect(await launchAgent(dir, instruction, "Scan")).toBe("terminal");
          expect(terminals).toHaveLength(count + 1);
          expect(typed.at(-1)).toStartWith("'omp' ");
        }
      }
      expect(updates).toEqual([]);
      expect(editorCalls).toEqual([]);
      expect(clipboard).toHaveLength(before.clipboard);
      expect(answerOffer).toHaveLength(before.offers);
      expect(errorMessages).toHaveLength(before.errors);
      expect(warningMessages).toHaveLength(before.warnings);
    } finally {
      editor.appName = previousApp;
      settingValues.agent = "omp";
      for (const key of ["agentLauncher", "terminalAgent", "agentCommand"]) delete settingValues[key];
      pick = () => undefined;
    }
  });

  test("the command is the omp program Trama runs, quoted: trama.ompPath from the user settings without edge spaces, else omp from the PATH, and a workspace value never counts", async () => {
    const { launchAgent } = await import("../extension/src/host/agent");
    const instruction = "Use the trama-scan skill on the whole System.";
    const lineWith = async (value: { globalValue?: unknown; workspaceValue?: unknown } | undefined) => {
      if (value === undefined) delete inspected["ompPath"];
      else inspected["ompPath"] = value;
      await launchAgent(dir, instruction, "Scan");
      return typed.at(-1) ?? "";
    };
    try {
      expect(await lineWith(undefined)).toStartWith("'omp' ");
      expect(await lineWith({ globalValue: "" })).toStartWith("'omp' ");
      expect(await lineWith({ globalValue: "   " })).toStartWith("'omp' ");
      expect(await lineWith({ globalValue: "  /opt/my omp/bin/omp  " })).toStartWith("'/opt/my omp/bin/omp' ");
      expect(await lineWith({ globalValue: "/opt/it's/omp" })).toStartWith(`'/opt/it'\\''s/omp' `);
      expect(await lineWith({ workspaceValue: "/tmp/evil/omp" })).toStartWith("'omp' ");
      expect(await lineWith({ globalValue: "/opt/omp", workspaceValue: "/tmp/evil/omp" })).toStartWith("'/opt/omp' ");
      expect(await lineWith({ globalValue: 7 })).toStartWith("'omp' ");
    } finally {
      delete inspected["ompPath"];
    }
  });
});

describe("announcing a design request", () => {
  test("a design request sent to the terminal announces a Proposal titled with the request, a plain request announces nothing", async () => {
    // Dynamic, as above: the module must load after mock.module replaced "vscode".
    const { launchAgent } = await import("../extension/src/host/agent");
    const p = projectAt(dir);
    await launchAgent(dir, "Use the trama-scan skill on the whole System.", "Scan");
    expect(listAnnouncements(p)).toEqual([]);
    await launchAgent(dir, "Use the trama-design skill. Add refunds", "Design", "Add refunds");
    expect(listAnnouncements(p).map((a) => ({ kind: a.kind, source: a.source, title: a.title, proposal: a.proposal }))).toEqual([{ kind: "proposal", source: "request", title: "Add refunds", proposal: null }]);
    // The ghost of the launch stands at the bottom of Backlog and carries the request's title.
    const ghosts = announcedGhosts(buildSnapshot(p).announcements, false);
    expect(ghosts.map((g) => g.column)).toEqual(["backlog"]);
    expect(ghosts.map((g) => g.card.title)).toEqual(["Add refunds"]);
  });
});

describe("announcing every launch as its instruction starts", () => {
  const announced = (p: Project, from: number) => listAnnouncements(p).slice(from).map((a) => ({ kind: a.kind, title: a.title, phase: a.phase, terminal: a.terminal, drifts: a.drifts }));

  test("a terminal scan, import and Resolve Drifts announce their card at once, and a Run announces nothing", async () => {
    const { launchAgent } = await import("../extension/src/host/agent");
    const p = projectAt(dir);
    const terminalCount = terminals.length;
    try {
      let before = listAnnouncements(p).length;
      await launchAgent(dir, "Use the trama-scan skill on the whole System.", "Scan", { kind: "check", title: "Scanning System" }, () => true, "scan");
      expect(announced(p, before)).toEqual([{ kind: "check", title: "Scanning System", phase: "scanning", terminal: environments.at(-1)?.["TRAMA_TERMINAL"] ?? null, drifts: [] }]);

      before = listAnnouncements(p).length;
      await launchAgent(dir, "Use the trama-import skill on this repository.", "Import", { kind: "work", title: "Importing from code" });
      expect(announced(p, before)).toEqual([{ kind: "work", title: "Importing from code", phase: null, terminal: environments.at(-1)?.["TRAMA_TERMINAL"] ?? null, drifts: [] }]);

      before = listAnnouncements(p).length;
      await launchAgent(dir, "Use the trama-resolve-drifts skill on the Drifts.", "Drifts", { kind: "resolve", drifts: () => ["aaaa1111", "bbbb2222"] });
      expect(announced(p, before)).toEqual([{ kind: "proposal", title: "Resolve Drifts", phase: null, terminal: environments.at(-1)?.["TRAMA_TERMINAL"] ?? null, drifts: ["aaaa1111", "bbbb2222"] }]);

      before = listAnnouncements(p).length;
      await launchAgent(dir, "Use the trama-implement skill on Task abcd1234.", "T3", undefined, () => true, "run");
      expect(listAnnouncements(p)).toHaveLength(before);
    } finally {
      // Ends the terminals the launches opened, so no Run or resolution is left open for the tests that follow.
      for (const terminal of terminals.slice(terminalCount)) listeners.close.forEach((fn) => fn(terminal));
    }
  });
});

describe("the question rounds of an agent terminal", () => {
  test("the end of its command, the closing of its terminal and the execution check interrupt the rounds of that terminal only", async () => {
    const { launchAgent, watchAgentTerminal, checkAgentTerminals } = await import("../extension/src/host/agent");
    const watching = watchAgentTerminal();
    try {
      interruptedRounds.length = 0;
      await launchAgent(dir, "Use the trama-scan skill on the whole System.", "Scan");
      const ended = terminals.at(-1) as FakeTerminal;
      const endedId = environments.at(-1)?.["TRAMA_TERMINAL"] as string;
      await launchAgent(dir, "Use the trama-scan skill on Task abcd1234.", "T3", undefined, () => true, "run");
      const closed = terminals.at(-1) as FakeTerminal;
      const closedId = environments.at(-1)?.["TRAMA_TERMINAL"] as string;
      expect(closedId).not.toBe(endedId);

      // A command Trama did not type ends nothing.
      listeners.end.forEach((fn) => fn(shell({ ...ended })));
      expect(interruptedRounds).toEqual([]);

      listeners.end.forEach((fn) => fn(shell(ended)));
      expect(interruptedRounds).toEqual([endedId]);
      listeners.close.forEach((fn) => fn(closed));
      expect(interruptedRounds).toEqual([endedId, closedId]);
      listeners.close.forEach((fn) => fn(ended));

      // A terminal the editor no longer lists is ended by the check, which interrupts its rounds once.
      await launchAgent(dir, "Use the trama-scan skill on Task abcd1234.", "T4", undefined, () => true, "run");
      const gone = terminals.at(-1) as FakeTerminal;
      const goneId = environments.at(-1)?.["TRAMA_TERMINAL"] as string;
      interruptedRounds.length = 0;
      unlisted.add(gone);
      await checkAgentTerminals();
      expect(interruptedRounds).toEqual([goneId]);
      await checkAgentTerminals();
      expect(interruptedRounds).toEqual([goneId]);
    } finally {
      unlisted.clear();
      watching.dispose();
    }
  });

  test("a terminal of this window is owned, and has its tab's name, while it exists; an unknown terminal or another project's is neither", async () => {
    const { launchAgent, watchAgentTerminal, ownsAgentTerminal, agentTabName } = await import("../extension/src/host/agent");
    const watching = watchAgentTerminal();
    try {
      await launchAgent(dir, "Use the trama-design skill. Cancel orders", "Design", "Cancel orders");
      const terminal = terminals.at(-1) as FakeTerminal;
      const id = environments.at(-1)?.["TRAMA_TERMINAL"] as string;
      expect(ownsAgentTerminal(id, dir)).toBe(true);
      expect(agentTabName(id)).toBe(terminal.name);
      expect(ownsAgentTerminal(id, join(dir, "elsewhere"))).toBe(false);
      expect(ownsAgentTerminal("zzzzzz", dir)).toBe(false);
      expect(agentTabName("zzzzzz")).toBeUndefined();
      listeners.close.forEach((fn) => fn(terminal));
      expect(ownsAgentTerminal(id, dir)).toBe(false);
      expect(agentTabName(id)).toBeUndefined();
    } finally {
      watching.dispose();
    }
  });
});

describe("withdrawing the ghosts", () => {
  test("the end of the command Trama typed withdraws that terminal's announcements and tells the panel; closing the terminal does the same", async () => {
    // Dynamic, as above: the modules must load after mock.module replaced "vscode".
    const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    const { onAnnouncementsWithdrawn } = await import("../extension/src/host/announcements");
    const p = projectAt(dir);
    watchAgentTerminal();
    const told: string[][] = [];
    const subscription = onAnnouncementsWithdrawn((views) => told.push(views.map((v) => `${v.kind}:${v.title}`)));
    withdrawAll(p);

    await launchAgent(dir, "Use the trama-design skill. Cancel orders", "Design", "Cancel orders");
    const terminal = terminals.at(-1) as FakeTerminal;
    const id = environments.at(-1)?.["TRAMA_TERMINAL"] as string;
    announce(p, { kind: "task", title: "A Task", terminal: id });
    listeners.end.forEach((fn) => fn(shell(terminal)));
    expect(listAnnouncements(p)).toEqual([]);
    expect(told).toEqual([["proposal:Cancel orders", "task:A Task"]]);

    // Nothing waiting: nobody is told.
    listeners.end.forEach((fn) => fn(shell(terminal)));
    expect(told).toHaveLength(1);

    await launchAgent(dir, "Use the trama-design skill. Close", "Design", "Close");
    const closeTerminal = terminals.at(-1) as FakeTerminal;
    const closeId = environments.at(-1)?.["TRAMA_TERMINAL"] as string;
    announce(p, { kind: "drift", title: "A Drift", terminal: closeId });
    listeners.close.forEach((fn) => fn(closeTerminal));
    expect(listAnnouncements(p)).toEqual([]);
    expect(told[1]).toEqual(["proposal:Close", "drift:A Drift"]);

    // A terminal Trama did not start ends nothing.
    announce(p, { kind: "drift", title: "Not ours", terminal: closeId });
    listeners.close.forEach((fn) => fn({ ...closeTerminal }));
    listeners.end.forEach((fn) => fn(shell({ ...closeTerminal })));
    expect(listAnnouncements(p)).toHaveLength(1);
    subscription.dispose();
    withdrawAll(p);
  });

  test("an import's work ends silently with its terminal's command: no notice, and a design request on the same terminal still gets one", async () => {
    const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    const { onAnnouncementsWithdrawn } = await import("../extension/src/host/announcements");
    const p = projectAt(dir);
    watchAgentTerminal();
    const told: string[][] = [];
    const subscription = onAnnouncementsWithdrawn((views) => told.push(views.map((v) => `${v.kind}:${v.title}`)));
    withdrawAll(p);

    await launchAgent(dir, "Use the trama-design skill. Import", "Design", "Import");
    const terminal = terminals.at(-1) as FakeTerminal;
    const id = environments.at(-1)?.["TRAMA_TERMINAL"] as string;
    announce(p, { kind: "work", title: "Importing from code", source: "request", terminal: id });
    announce(p, { kind: "task", title: "Left behind", terminal: id });
    listeners.end.forEach((fn) => fn(shell(terminal)));
    expect(listAnnouncements(p)).toEqual([]);
    expect(told).toEqual([["proposal:Import", "task:Left behind"]]);
    subscription.dispose();
    withdrawAll(p);
  });

  test("closing an agent terminal releases its Tasks regardless of hook status; other terminals are unaffected", async () => {
    const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    const p = projectAt(dir);
    const watching = watchAgentTerminal();
    try {
      await launchAgent(dir, "Use the trama-scan skill on the whole System.", "Scan");
      const first = terminals.at(-1) as FakeTerminal;
      const firstId = environments.at(-1)?.["TRAMA_TERMINAL"] as string;
      await launchAgent(dir, "Use the trama-scan skill on the whole System.", "Scan");
      const second = terminals.at(-1) as FakeTerminal;
      const secondId = environments.at(-1)?.["TRAMA_TERMINAL"] as string;
      const firstTask = moveTask(p, newTask(p, { title: "Unhooked", refs: ["order/Paid"], technical: false }).id, "doing", "agent", { terminal: firstId }).id;
      const originlessTask = moveTask(p, newTask(p, { title: "Originless", refs: ["order/Paid"], technical: false }).id, "doing", "developer").id;
      writeFileSync(getTask(p, originlessTask).path, readFileSync(getTask(p, originlessTask).path, "utf8").replace(/^agent: false$/m, "agent: true"));
      const secondTask = moveTask(p, newTask(p, { title: "Other terminal", refs: ["order/Paid"], technical: false }).id, "doing", "agent", { terminal: secondId }).id;

      listeners.close.forEach((listener) => listener(first));

      expect([firstTask, originlessTask, secondTask].map((id) => [getTask(p, id).data.column, getTask(p, id).data.agent])).toEqual([
        ["todo", false],
        ["doing", false],
        ["doing", true],
      ]);
      listeners.close.forEach((listener) => listener(first));
      expect(getTask(p, firstTask).data.column).toBe("todo");
    } finally {
      watching.dispose();
    }
  });

  test("the end of a hooked agent's command releases the Tasks that terminal took, not those of another terminal", async () => {
    const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    const { setHooked } = await import("../extension/src/host/drift-resolution");
    const p = projectAt(dir);
    const watching = watchAgentTerminal();
    try {
      await launchAgent(dir, "Use the trama-scan skill on the whole System.", "Scan");
      const terminal = terminals.at(-1) as FakeTerminal;
      const id = environments.at(-1)?.["TRAMA_TERMINAL"] as string;
      setHooked(id, true);
      const take = (terminalId: string) => moveTask(p, newTask(p, { title: "Hooked", refs: ["order/Paid"], technical: false }).id, "doing", "agent", { terminal: terminalId }).id;
      const mine = take(id);
      const other = take("other-terminal");
      listeners.end.forEach((fn) => fn(shell(terminal)));
      expect(getTask(p, mine).data.column).toBe("todo");
      expect(getTask(p, other).data.column).toBe("doing");
    } finally {
      watching.dispose();
    }
  });

  test("a hooked integrated terminal retains its Tasks regardless of elapsed quiet time", async () => {
    const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    const { setHooked } = await import("../extension/src/host/drift-resolution");
    const p = projectAt(dir);
    vi.useFakeTimers();
    const watching = watchAgentTerminal();
    try {
      await launchAgent(dir, "Use the trama-scan skill on the whole System.", "Scan");
      const id = environments.at(-1)?.["TRAMA_TERMINAL"] as string;
      setHooked(id, true);
      const task = moveTask(p, newTask(p, { title: "Quiet hooked run", refs: ["order/Paid"], technical: false }).id, "doing", "agent", { terminal: id }).id;
      vi.advanceTimersByTime(16 * 60 * 1000);
      expect(getTask(p, task).data.column).toBe("doing");
    } finally {
      watching.dispose();
      vi.useRealTimers();
    }
  });

  test("parallel integrated terminals release only their own Tasks and announcements", async () => {
    const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    const p = projectAt(dir);
    listeners.end.length = 0;
    watchAgentTerminal();
    withdrawAll(p);

    await launchAgent(dir, "Use the trama-design skill. Old", "Design", "Old");
    const old = terminals.at(-1) as FakeTerminal;
    const oldId = environments.at(-1)?.["TRAMA_TERMINAL"] as string;
    listeners.start.forEach((fn) => fn(shell(old)));
    await launchAgent(dir, "Use the trama-design skill. New", "Design", "New");
    const current = terminals.at(-1) as FakeTerminal;
    expect(current).not.toBe(old);
    const task = newTask(p, { title: "Old", refs: ["order/Paid"], technical: false }).id;
    moveTask(p, task, "doing", "agent", { terminal: oldId });
    listeners.end.forEach((fn) => fn(shell(current)));

    const taskIds = [oldId, environments.at(-1)?.["TRAMA_TERMINAL"] as string].map((terminal) => {
      const createdTask = newTask(p, { title: terminal, refs: ["order/Paid"], technical: false });
      moveTask(p, createdTask.id, "doing", "agent", { terminal });
      announce(p, { kind: "task", title: terminal, terminal });
      return createdTask.id;
    });
    listeners.end.forEach((fn) => fn(shell(old)));
    expect([getTask(p, task).data.column, getTask(p, task).data.agent]).toEqual(["todo", false]);
    expect(taskIds.map((id) => getTask(p, id).data.column)).toEqual(["todo", "doing"]);
    expect(listAnnouncements(p).map((announcement) => announcement.terminal)).toEqual([environments.at(-1)?.["TRAMA_TERMINAL"] as string]);
    withdrawAll(p);
  });

  test("the end of any other command, or one reported without the typed line, withdraws nothing and does not free the terminal", async () => {
    const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    const { onAnnouncementsWithdrawn } = await import("../extension/src/host/announcements");
    const p = projectAt(dir);
    watchAgentTerminal();
    withdrawAll(p);
    const told: string[][] = [];
    const subscription = onAnnouncementsWithdrawn((views) => told.push(views.map((v) => v.title)));

    await launchAgent(dir, "Use the trama-design skill. Alone", "Design", "Alone");
    const terminal = terminals.at(-1) as FakeTerminal;
    listeners.end.forEach((fn) => fn(shell(terminal, "ls")));
    listeners.end.forEach((fn) => fn(shell(terminal, "")));
    listeners.end.forEach((fn) => fn(shell(terminal, ` ${terminal.line}x`)));
    expect(listAnnouncements(p).map((a) => a.title)).toEqual(["Alone"]);
    expect(told).toEqual([]);

    // Still busy: the next launch opens another terminal instead of typing into this one.
    const created = terminals.length;
    await launchAgent(dir, "Use the trama-scan skill on the whole System.", "Scan");
    expect(terminals).toHaveLength(created + 1);

    // The line, trimmed, is the typed command: its end withdraws.
    listeners.end.forEach((fn) => fn(shell(terminal, `  ${terminal.line}\n`)));
    expect(listAnnouncements(p)).toEqual([]);
    expect(told).toEqual([["Alone"]]);
    subscription.dispose();
  });

  test("a Draft keeps its own title in the notice", async () => {
    const { onAnnouncementsWithdrawn, withdrawWaiting } = await import("../extension/src/host/announcements");
    const p = projectAt(dir);
    const told: string[] = [];
    const subscription = onAnnouncementsWithdrawn((views) => told.push(...views.map((v) => `${v.phase}:${v.title}`)));
    withdrawAll(p);
    newProposal(p, "Real title", "", { origin: { terminal: "aaa111" } });
    withdrawWaiting(dir);
    subscription.dispose();
    expect(told).toEqual(["writing:Real title"]);
  });
});

describe("synchronizing Writing titles", () => {
  test("synchronizes Draft announcement titles without expiry polling", async () => {
    const { synchronizeAnnouncementTitles, watchAnnouncements } = await import("../extension/src/host/announcements");
    const root = mkdtempSync(join(tmpdir(), "trama-writing-"));
    cpSync(join(import.meta.dir, "../examples/shop"), root, { recursive: true });
    const p = projectAt(root);
    const watching = watchAnnouncements(() => root);
    try {
      const a = announce(p, { kind: "proposal", title: "Planned", source: "request", terminal: "ab12cd" });
      const draft = newProposal(p, "Initial", "", { announcement: a.id, origin: { terminal: "ab12cd" } });
      const boundTouched = listAnnouncements(p)[0]?.touched;
      const file = join(p.dir, "announcements", `${a.id}.md`);
      const proposalFile = join(draft.dir, "proposal.md");
      const original = readFileSync(file, "utf8");
      const proposal = readFileSync(proposalFile, "utf8");
      writeFileSync(proposalFile, proposal.replace("# Initial", "# Updated title è"));
      synchronizeAnnouncementTitles(p);
      expect(readFileSync(file, "utf8")).toBe(original.replace("# Initial", "# Updated title è"));
      expect(readFileSync(file, "utf8")).toContain("Updated title è");
      expect(listAnnouncements(p)[0]?.touched).toBe(boundTouched);

      const old = new Date(Date.now() - 60_000);
      utimesSync(file, old, old);
      expect(statSync(file).mtimeMs).toBe(old.getTime());

      writeFileSync(proposalFile, "unreadable");
      expect(readFileSync(file, "utf8")).toContain("# Updated title è");
      writeFileSync(proposalFile, proposal.replace("status: draft", "status: open").replace("# Initial", "# Handed over"));
      synchronizeAnnouncementTitles(p);
      expect(readFileSync(file, "utf8")).toContain("# Updated title è");
      withdrawAll(p);
      writeFileSync(proposalFile, proposal.replace("# Initial", "# After withdrawal"));
      synchronizeAnnouncementTitles(p);
      expect(existsSync(file)).toBe(false);
    } finally {
      watching.dispose();
      rmSync(root, { recursive: true, force: true });
    }
  });
});


describe("starting the editor with Tasks an agent had taken", () => {
  test("opening the editor withdraws the announcements left on disk and leaves the Tasks an agent took taken", async () => {
    // Dynamic: the module must load after mock.module replaced "vscode".
    const { watchAnnouncements } = await import("../extension/src/host/announcements");
    const root = mkdtempSync(join(tmpdir(), "trama-startup-"));
    cpSync(join(import.meta.dir, "../examples/shop"), root, { recursive: true });
    try {
      const p = projectAt(root);
      const take = (terminal: string) => moveTask(p, newTask(p, { title: "Taken", refs: ["order/Paid"], technical: false }).id, "doing", "agent", { terminal }).id;
      const byTerminal = take("aaa111");
      const byEditor = moveTask(p, newTask(p, { title: "Legacy", refs: ["order/Paid"], technical: false }).id, "doing", "developer").id;
      writeFileSync(getTask(p, byEditor).path, readFileSync(getTask(p, byEditor).path, "utf8").replace(/^agent: false$/m, "agent: true"));
      const byDeveloper = moveTask(p, newTask(p, { title: "Developer", refs: ["order/Paid"], technical: false }).id, "doing", "developer").id;
      announce(p, { kind: "task", title: "Left on disk", terminal: "aaa111" });

      const watching = watchAnnouncements(() => root);
      try {
        // The orphans are withdrawn once the conversations are read: nobody follows terminal aaa111.
        await watching.done;
        expect(listAnnouncements(p)).toEqual([]);
        expect([byTerminal, byEditor, byDeveloper].map((id) => [getTask(p, id).data.column, getTask(p, id).data.agent !== false])).toEqual([
          ["doing", true],
          ["doing", false],
          ["doing", false],
        ]);
      } finally {
        watching.dispose();
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("opening the panel", () => {
  test("a second open of a workspace without a project brings the one panel forward instead of making another, and initializes nothing", async () => {
    // Dynamic, as above: the module must load after mock.module replaced "vscode".
    const { Controller } = await import("../extension/src/host/controller");
    const empty = mkdtempSync(join(tmpdir(), "trama-panel-"));
    workspaceRoot = empty;
    const panelsBefore = panelsCreated;
    const revealsBefore = reveals;
    const offersBefore = answerOffer.length;
    try {
      const controller = new Controller({ scheme: "file" } as never);
      await controller.open();
      await controller.open();
      expect(existsSync(join(empty, ".trama"))).toBe(false);
      expect(answerOffer.length - offersBefore).toBe(0);
      expect(panelsCreated - panelsBefore).toBe(1);
      expect(reveals - revealsBefore).toBe(1);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});

describe("Requirement skills in a multi-root workspace", () => {
  test("changes, creation and deletion regenerate only the owning project, with separate pauses and no panel", async () => {
    // The host must load after the editor API mock is installed.
    const { watchRequirements } = await import("../extension/src/host/main");
    const roots = [mkdtempSync(join(tmpdir(), "trama-skills-first-")), mkdtempSync(join(tmpdir(), "trama-skills-second-"))];
    const fragment = (root: string) => join(root, ".trama/requirements/ui/main.md");
    const skill = (root: string) => join(root, ".agents/skills/trama-req-ui-main/SKILL.md");
    const emit = (kind: keyof typeof requirementEvents, path: string) => requirementEvents[kind].forEach((fn) => fn({ scheme: "file", fsPath: path }));
    vi.useFakeTimers();
    let watching: { dispose(): void } | undefined;
    const panelsBefore = panelsCreated;
    try {
      for (const root of roots) {
        cpSync(join(import.meta.dir, "../examples/shop"), root, { recursive: true });
        mkdirSync(join(root, ".agents/skills/trama-design"), { recursive: true });
        writeFileSync(join(root, ".agents/skills/trama-design/SKILL.md"), "Installed skill marker.");
        syncRequirementSkills(projectAt(root));
      }
      const first = roots[0]!;
      const second = roots[1]!;
      workspaceRoots = roots;
      watching = watchRequirements();
      const originalFirst = readFileSync(skill(first), "utf8");
      writeFileSync(fragment(second), `${readFileSync(fragment(second), "utf8")}\nSecond-project change.\n`);
      emit("change", fragment(second));
      vi.advanceTimersByTime(300);
      expect(readFileSync(skill(second), "utf8")).toContain("Second-project change.");
      expect(readFileSync(skill(first), "utf8")).toBe(originalFirst);

      writeFileSync(fragment(first), `${readFileSync(fragment(first), "utf8")}\nFirst-project change.\n`);
      emit("change", fragment(first));
      vi.advanceTimersByTime(150);
      writeFileSync(fragment(second), `${readFileSync(fragment(second), "utf8")}\nSecond-project latest.\n`);
      emit("change", fragment(second));
      vi.advanceTimersByTime(150);
      expect(readFileSync(skill(first), "utf8")).toContain("First-project change.");
      expect(readFileSync(skill(second), "utf8")).not.toContain("Second-project latest.");
      vi.advanceTimersByTime(150);
      expect(readFileSync(skill(first), "utf8")).toContain("First-project change.");
      expect(readFileSync(skill(second), "utf8")).toContain("Second-project latest.");

      const extra = join(second, ".trama/requirements/ui/extra.md");
      const extraSkill = join(second, ".agents/skills/trama-req-ui-extra/SKILL.md");
      writeFileSync(extra, "---\ndescription: Extra requirements\n---\n# Extra\n\n## General\n\nCreated requirement.\n");
      emit("create", extra);
      vi.advanceTimersByTime(300);
      expect(readFileSync(extraSkill, "utf8")).toContain("Created requirement.");
      rmSync(extra);
      emit("delete", extra);
      vi.advanceTimersByTime(300);
      expect(existsSync(extraSkill)).toBe(false);
      expect(readFileSync(skill(first), "utf8")).not.toContain("Second-project");
      expect(panelsCreated).toBe(panelsBefore);

      const skillFolder = join(second, ".agents/skills/trama-req-ui-main");
      const savedSkill = join(second, "saved-skill");
      const errorsBefore = errorMessages.length;
      renameSync(skillFolder, savedSkill);
      writeFileSync(skillFolder, "A file prevents writing the skill directory.");
      emit("change", fragment(second));
      vi.advanceTimersByTime(300);
      rmSync(skillFolder);
      renameSync(savedSkill, skillFolder);
      expect(errorMessages.slice(errorsBefore).join("\n")).toContain("could not regenerate the Requirement skills");
      expect(readFileSync(skill(second), "utf8")).toContain("Second-project latest.");

      writeFileSync(fragment(second), `${readFileSync(fragment(second), "utf8")}\nCancelled on disposal.\n`);
      emit("change", fragment(second));
      watching.dispose();
      vi.advanceTimersByTime(300);
      expect(readFileSync(skill(second), "utf8")).not.toContain("Cancelled on disposal.");
    } finally {
      watching?.dispose();
      vi.useRealTimers();
      workspaceRoots = undefined;
      for (const root of roots) rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("the Runs and Resolve Drifts a window has not seen end", () => {
  test("a Run in a terminal lasts until the command Trama typed ends or the terminal closes, and Drift resolution is Free only when the last Run is over", async () => {
    // Dynamic, as above: the modules must load after mock.module replaced "vscode".
    const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    const { driftWork, endTerminalJobs } = await import("../extension/src/host/drift-resolution");
    const watching = watchAgentTerminal();
    try {
      expect(driftWork()).toEqual({ resolving: false, running: false });
      await launchAgent(dir, "Scan", "Scan"); // not a Run: the buttons of the Runs and of Resolve Drifts say so
      expect(driftWork()).toEqual({ resolving: false, running: false });

      await launchAgent(dir, "Run one", "One", undefined, () => true, "run");
      const one = terminals.at(-1) as FakeTerminal;
      listeners.start.forEach((fn) => fn(shell(one)));
      await launchAgent(dir, "Run two", "Two", undefined, () => true, "run");
      const two = terminals.at(-1) as FakeTerminal;
      listeners.start.forEach((fn) => fn(shell(two)));
      expect(driftWork()).toEqual({ resolving: false, running: true });

      listeners.end.forEach((fn) => fn(shell(one, "another command"))); // the end of another command counts for nothing
      expect(driftWork()).toEqual({ resolving: false, running: true });
      listeners.end.forEach((fn) => fn(shell(one)));
      expect(driftWork()).toEqual({ resolving: false, running: true });
      listeners.close.forEach((fn) => fn(two));
      expect(driftWork()).toEqual({ resolving: false, running: false });

      await launchAgent(dir, "Resolve", "Resolve Drifts", undefined, () => true, "resolve");
      const resolving = terminals.at(-1) as FakeTerminal;
      expect(driftWork().resolving).toBe(true);
      listeners.close.forEach((fn) => fn(resolving));
      expect(driftWork()).toEqual({ resolving: false, running: false });
      endTerminalJobs("none"); // ending what is not followed changes nothing
    } finally {
      watching.dispose();
    }
  });

  test("a Run whose command exits with a failure or unknown status, or whose terminal closes, records an abnormal end with its reason; a clean exit records none", async () => {
    // Dynamic, as above: the modules must load after mock.module replaced "vscode".
    const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    const { localProjectJobs, jobAbnormalEnd } = await import("../extension/src/host/drift-resolution");
    const watching = watchAgentTerminal();
    try {
      const startRun = async (name: string) => {
        await launchAgent(dir, `Run ${name}`, name, undefined, () => true, "run");
        const terminal = terminals.at(-1) as FakeTerminal;
        listeners.start.forEach((fn) => fn(shell(terminal)));
        const job = localProjectJobs(dir).at(-1);
        expect(job).toBeDefined();
        return { terminal, id: job?.id ?? "" };
      };

      const failed = await startRun("failed");
      listeners.end.forEach((fn) => fn(shell(failed.terminal, failed.terminal.line, 1)));
      expect(jobAbnormalEnd(dir, failed.id)).toBe("its command exited with code 1");

      const unknown = await startRun("unknown");
      listeners.end.forEach((fn) => fn(shell(unknown.terminal)));
      expect(jobAbnormalEnd(dir, unknown.id)).toBe("its command ended without an exit status");

      const clean = await startRun("clean");
      listeners.end.forEach((fn) => fn(shell(clean.terminal, clean.terminal.line, 0)));
      expect(jobAbnormalEnd(dir, clean.id)).toBeUndefined();

      const closed = await startRun("closed");
      listeners.close.forEach((fn) => fn(closed.terminal));
      expect(jobAbnormalEnd(dir, closed.id)).toBe("its terminal was closed");
    } finally {
      watching.dispose();
    }
  });

  test("Resolve Drifts and the Runs are checked again when the instruction is sent: a double click or a Run started meanwhile sends nothing, and the Drifts are those open at that moment", async () => {
    // Dynamic, as above: the modules must load after mock.module replaced "vscode".
    const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    const { driftWork } = await import("../extension/src/host/drift-resolution");
    const watching = watchAgentTerminal();
    const terminalCount = terminals.length;
    const lines = () => terminals.slice(terminalCount).map((terminal) => terminal.line);
    let open = ["d1"];
    const resolve = () => launchAgent(dir, () => `Resolve ${open.join(",")}`, "Resolve Drifts", undefined, () => !driftWork().resolving && !driftWork().running, "resolve");
    const run = () => launchAgent(dir, "Run", "Run", undefined, () => !driftWork().resolving, "run");
    try {
      // Double click: one agent only, and its instruction names the Drifts open when it is sent.
      const first = resolve();
      open = ["d1", "d2"];
      const second = resolve();
      expect(await Promise.all([first, second])).toEqual(["terminal", undefined]);
      expect(lines()).toHaveLength(1);
      expect(lines()[0]).toContain("Resolve d1,d2");
      expect(driftWork().resolving).toBe(true);

      // A Run asked while Resolve Drifts works sends nothing.
      expect(await run()).toBeUndefined();
      expect(lines()).toHaveLength(1);
      const [resolving] = terminals.slice(terminalCount);
      if (resolving !== undefined) listeners.close.forEach((fn) => fn(resolving));
      expect(driftWork()).toEqual({ resolving: false, running: false });

      // A Run and Resolve Drifts asked together: the first to send wins, the other sends nothing.
      const runFirst = run();
      const resolveSecond = resolve();
      expect(await Promise.all([runFirst, resolveSecond])).toEqual(["terminal", undefined]);
      expect(driftWork()).toEqual({ resolving: false, running: true });
      expect(lines()).toHaveLength(2);
    } finally {
      for (const terminal of terminals.slice(terminalCount)) listeners.close.forEach((fn) => fn(terminal));
      watching.dispose();
    }
  });
  test("a Resolve Drifts waits for a pending Run delivery before checking its conditions", async () => {
    const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    const { driftWork } = await import("../extension/src/host/drift-resolution");
    const watching = watchAgentTerminal();
    const previousQuestionEndpoint = questionEndpoint;
    const waiting = Promise.withResolvers<void>();
    const delivery = Promise.withResolvers<string>();
    const terminalCount = terminals.length;
    let resolveChecks = 0;
    let run: Promise<unknown> | undefined;
    let resolve: Promise<unknown> | undefined;
    questionEndpoint = () => {
      waiting.resolve();
      return delivery.promise;
    };
    try {
      run = launchAgent(dir, "Run", "Run", undefined, () => !driftWork().resolving, "run");
      await waiting.promise;

      resolve = launchAgent(dir, "Resolve Drifts", "Resolve Drifts", undefined, () => {
        resolveChecks++;
        return !driftWork().resolving && !driftWork().running;
      }, "resolve");
      await Promise.resolve();
      expect(resolveChecks).toBe(0);

      delivery.resolve("endpoint");
      expect(await run).toBe("terminal");
      expect(driftWork()).toEqual({ resolving: false, running: true });
      expect(await resolve).toBeUndefined();
      expect(resolveChecks).toBe(1);
      expect(terminals).toHaveLength(terminalCount + 1);
    } finally {
      delivery.resolve("endpoint");
      await run?.catch(() => undefined);
      await resolve?.catch(() => undefined);
      for (const terminal of terminals.slice(terminalCount)) listeners.close.forEach((fn) => fn(terminal));
      questionEndpoint = previousQuestionEndpoint;
      watching.dispose();
    }
  });

  test("terminal jobs without an observable end stay active until the terminal closes", async () => {
    const { driftWork, endTerminalJobs, setHooked, startJob } = await import("../extension/src/host/drift-resolution");
    startJob("run", dir, { terminal: "aaaaaa" });
    startJob("resolve", dir, { terminal: "bbbbbb" });
    setHooked("bbbbbb", true);
    expect(driftWork().resolving).toBe(true);
    endTerminalJobs("aaaaaa");
    expect(driftWork().resolving).toBe(true);
    endTerminalJobs("bbbbbb");
    setHooked("bbbbbb", false);
    expect(driftWork()).toEqual({ resolving: false, running: false });
  });
});
describe("the agent command waits for the shell", () => {
  // The imports below are dynamic, as in the rest of this file: agent.ts must load after mock.module replaced "vscode".
  const longInstruction = `Use the trama-implement skill on Task abcd1234. ${"x".repeat(5000)}`;
  const open = async (name: string, onSent?: (startedAt: number) => void) => {
    const { launchAgent } = await import("../extension/src/host/agent");
    const { localProjectJobs } = await import("../extension/src/host/drift-resolution");
    const before = localProjectJobs(dir).length;
    expect(await launchAgent(dir, longInstruction, name, "Waiting for the shell", () => true, "run", onSent)).toBe("terminal");
    return { terminal: terminals.at(-1) as FakeTerminal, started: localProjectJobs(dir).length - before };
  };

  test("the line is typed whole, once, with executeCommand when the shell integration activates, and the work, the announcement and the sent instant start when the terminal opens", async () => {
    const { watchAgentTerminal } = await import("../extension/src/host/agent");
    const p = projectAt(dir);
    withdrawAll(p);
    const watching = watchAgentTerminal();
    integrationAtCreation = false;
    vi.useFakeTimers();
    try {
      const sent: number[] = [];
      const typedBefore = typed.length;
      const { terminal, started } = await open("T7", (startedAt) => sent.push(startedAt));
      expect(terminal.writes).toEqual([]);
      expect(typed).toHaveLength(typedBefore);
      expect(started).toBe(1);
      expect(sent).toHaveLength(1);
      expect(listAnnouncements(p).map((a) => a.title)).toEqual(["Waiting for the shell"]);
      expect(terminal.shown).toEqual([]);

      vi.advanceTimersByTime(9_000);
      expect(terminal.writes).toEqual([]);
      activateIntegration(terminal);
      expect(terminal.writes).toEqual(["executeCommand"]);
      expect(terminal.line).toStartWith("'omp' '");
      expect(terminal.line).toContain("x".repeat(5000));
      expect(terminal.line.split("\n")).toHaveLength(1);

      vi.advanceTimersByTime(60_000); // the 10 seconds pass: nothing is typed a second time
      activateIntegration(terminal);
      expect(terminal.writes).toEqual(["executeCommand"]);
      listeners.end.forEach((fn) => fn(shell(terminal))); // the end is recognised from the line executeCommand wrote
      expect(listAnnouncements(p)).toEqual([]);
    } finally {
      vi.useRealTimers();
      integrationAtCreation = true;
      watching.dispose();
      withdrawAll(p);
    }
  });

  test("without a shell integration the line is typed with sendText only after 10 seconds, and a shell that reports itself later gets nothing more", async () => {
    const { watchAgentTerminal } = await import("../extension/src/host/agent");
    const watching = watchAgentTerminal();
    integrationAtCreation = false;
    vi.useFakeTimers();
    try {
      const { terminal } = await open("T8");
      vi.advanceTimersByTime(9_999);
      expect(terminal.writes).toEqual([]);
      vi.advanceTimersByTime(1);
      expect(terminal.writes).toEqual(["sendText"]);
      expect(terminal.line).toContain("x".repeat(5000));

      activateIntegration(terminal);
      vi.advanceTimersByTime(60_000);
      expect(terminal.writes).toEqual(["sendText"]);
      listeners.close.forEach((fn) => fn(terminal));
    } finally {
      vi.useRealTimers();
      integrationAtCreation = true;
      watching.dispose();
    }
  });

  test("a terminal closed before its shell is ready receives nothing and its work ends with the closing", async () => {
    const { watchAgentTerminal } = await import("../extension/src/host/agent");
    const { localProjectJobs, jobAbnormalEnd } = await import("../extension/src/host/drift-resolution");
    const p = projectAt(dir);
    withdrawAll(p);
    const watching = watchAgentTerminal();
    integrationAtCreation = false;
    vi.useFakeTimers();
    try {
      const typedBefore = typed.length;
      const { terminal } = await open("T9");
      const job = localProjectJobs(dir).at(-1)?.id ?? "";
      expect(job).not.toBe("");
      listeners.close.forEach((fn) => fn(terminal));
      expect(jobAbnormalEnd(dir, job)).toBe("its terminal was closed");
      expect(listAnnouncements(p)).toEqual([]);

      activateIntegration(terminal);
      vi.advanceTimersByTime(60_000);
      expect(terminal.writes).toEqual([]);
      expect(typed).toHaveLength(typedBefore);
    } finally {
      vi.useRealTimers();
      integrationAtCreation = true;
      watching.dispose();
      withdrawAll(p);
    }
  });

  test("with the terminal in the panel, neither executeCommand nor sendText shows the terminal", async () => {
    const { watchAgentTerminal } = await import("../extension/src/host/agent");
    const watching = watchAgentTerminal();
    try {
      const { terminal } = await open("T10");
      expect(terminal.writes).toEqual(["executeCommand"]);
      expect(terminal.shown).toEqual([]);
      listeners.close.forEach((fn) => fn(terminal));
    } finally {
      watching.dispose();
    }
  });
});

/** The registry entry of `id`, waited for: the registration reads the start of the process first, which may take a program on macOS and Windows. */
const registered = async (p: Project, id: string) => {
  const { readAgentProcess } = await import("../src/core/agent-processes");
  const { questionProjectId } = await import("../src/core/question-channel");
  for (let attempt = 0; attempt < 150; attempt++) {
    const entry = readAgentProcess(questionProjectId(p), id);
    if (entry !== undefined) return entry;
    await new Promise((done) => setTimeout(done, 20));
  }
  return undefined;
};
describe("the execution check of agent terminals (time.CHECK_DUE)", () => {
  const dead = () => 2_000_000_000;
  /** Launches a Run in omp, registers `pid` as its agent through the hook, and takes a Task for it. */
  const start = async (pid: number | undefined) => {
    const { launchAgent } = await import("../extension/src/host/agent");
    const { receiveAgentStarted } = await import("../extension/src/host/drift-resolution");
    const p = projectAt(dir);
    await launchAgent(dir, "Use the trama-implement skill on Task abcd1234.", "T3", undefined, () => true, "run");
    const terminal = terminals.at(-1) as FakeTerminal;
    const id = environments.at(-1)?.["TRAMA_TERMINAL"] as string;
    if (pid !== undefined) receiveAgentStarted(id, pid, dir);
    const task = moveTask(p, newTask(p, { title: "Checked", refs: ["order/Paid"], technical: false }).id, "doing", "agent", { terminal: id }).id;
    return { terminal, id, task, p };
  };

  test("an agent killed without a signal ends the Run, releases the Task, reports once and closes the terminal with autoExit on", async () => {
    const { watchAgentTerminal, checkAgentTerminals } = await import("../extension/src/host/agent");
    const { driftWork, onStoppedFollowing } = await import("../extension/src/host/drift-resolution");
    const { readAgentProcess } = await import("../src/core/agent-processes");
    const { questionProjectId } = await import("../src/core/question-channel");
    const notices: string[] = [];
    const noticing = onStoppedFollowing((subject, reason) => notices.push(`${subject}: ${reason}`));
    const watching = watchAgentTerminal();
    try {
      const { terminal, id, task, p } = await start(dead());
      expect((await registered(p, id))?.pid).toBe(dead());
      expect(driftWork().running).toBe(true);
      await checkAgentTerminals();
      expect(notices).toEqual(["T3: the agent's process is gone"]);
      expect(driftWork().running).toBe(false);
      expect(getTask(p, task).data.column).toBe("todo");
      expect(terminal.disposals).toBe(1);
      expect(readAgentProcess(questionProjectId(p), id)).toBeUndefined();
      await checkAgentTerminals();
      listeners.close.forEach((listener) => listener(terminal));
      expect(notices).toHaveLength(1);
      expect(terminal.disposals).toBe(1);
    } finally {
      noticing.dispose();
      watching.dispose();
    }
  });

  test("a live agent that does nothing stays in progress, however many checks pass", async () => {
    const { watchAgentTerminal, checkAgentTerminals } = await import("../extension/src/host/agent");
    const { driftWork } = await import("../extension/src/host/drift-resolution");
    const watching = watchAgentTerminal();
    try {
      const { terminal, id, task, p } = await start(process.pid);
      // The registration carries the start of the process, as the system tells it, so the process can be recognised later.
      expect((await registered(p, id))?.processStart).toBeDefined();
      await checkAgentTerminals();
      await checkAgentTerminals();
      expect(driftWork().running).toBe(true);
      expect(getTask(p, task).data.column).toBe("doing");
      expect(terminal.disposals).toBe(0);
      listeners.close.forEach((listener) => listener(terminal));
    } finally {
      watching.dispose();
    }
  });

  test("without a hook process the terminal's shell decides; with autoExit off the terminal stays open at rest", async () => {
    settingValues.autoExit = false;
    const { watchAgentTerminal, checkAgentTerminals } = await import("../extension/src/host/agent");
    const watching = watchAgentTerminal();
    try {
      const { terminal, task, p } = await start(undefined);
      terminal.processId = Promise.resolve(dead());
      await checkAgentTerminals();
      expect(getTask(p, task).data.column).toBe("todo");
      expect(terminal.disposals).toBe(0);
      listeners.end.forEach((listener) => listener(shell(terminal)));
      listeners.close.forEach((listener) => listener(terminal));
    } finally {
      watching.dispose();
      delete settingValues.autoExit;
    }
  });

  test("a terminal the editor no longer lists ends as a closure, with the notice", async () => {
    const { watchAgentTerminal, checkAgentTerminals } = await import("../extension/src/host/agent");
    const { driftWork, onStoppedFollowing } = await import("../extension/src/host/drift-resolution");
    const notices: string[] = [];
    const noticing = onStoppedFollowing((subject, reason) => notices.push(`${subject}: ${reason}`));
    const watching = watchAgentTerminal();
    try {
      const { terminal, task, p } = await start(process.pid);
      unlisted.add(terminal);
      await checkAgentTerminals();
      expect(notices).toEqual(["T3: the terminal is gone"]);
      expect(driftWork().running).toBe(false);
      expect(getTask(p, task).data.column).toBe("todo");
    } finally {
      unlisted.clear();
      noticing.dispose();
      watching.dispose();
    }
  });

  test("a terminal the check closes withdraws its waiting announcements with the notice, delivers its work silently and leaves other terminals alone", async () => {
    // Dynamic: static imports would load these modules before mock.module replaced "vscode".
    const { watchAgentTerminal, checkAgentTerminals } = await import("../extension/src/host/agent");
    const { onAnnouncementsWithdrawn } = await import("../extension/src/host/announcements");
    const watching = watchAgentTerminal();
    const told: string[][] = [];
    const subscription = onAnnouncementsWithdrawn((views) => told.push(views.map((v) => `${v.kind}:${v.title}`)));
    try {
      const { terminal, id, p } = await start(dead());
      await registered(p, id);
      withdrawAll(p);
      announce(p, { kind: "drift", title: "Ghost", terminal: id });
      announce(p, { kind: "check", title: "Final check", phase: "verifying", terminal: id });
      announce(p, { kind: "work", title: "Importing from code", terminal: id });
      announce(p, { kind: "task", title: "Elsewhere", terminal: "other1" });
      await checkAgentTerminals();
      expect(listAnnouncements(p).map((a) => a.title)).toEqual(["Elsewhere"]);
      expect(told).toEqual([["drift:Ghost", "check:Final check"]]);
      expect(terminal.disposals).toBe(1);
    } finally {
      subscription.dispose();
      watching.dispose();
      withdrawAll(projectAt(dir));
    }
  });
});

/** A fake `.trama` watcher whose events the test fires. */
const fakeFiles = () => {
  const created: Listener<FileUri>[] = [];
  return {
    watcher: { onDidCreate: subscribe(created), onDidChange: () => ({ dispose() {} }) } as never,
    fire: (fsPath: string) => created.forEach((listener) => listener({ scheme: "file", fsPath })),
  };
};
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };

describe("the minute timer of the execution check", () => {
  /** Starts the window's scheduler, with the fake timers already installed, and lets its startup check settle. */
  const startScheduler = async () => {
    const { startExecutionCheck } = await import("../extension/src/host/execution-check");
    const files = fakeFiles();
    const scheduler = startExecutionCheck(() => dir, files.watcher);
    await flush();
    return { scheduler, files };
  };

  test("a minute after a launch the check finds the vanished agent without any other signal", async () => {
    const { watchAgentTerminal } = await import("../extension/src/host/agent");
    const { driftWork, receiveAgentStarted } = await import("../extension/src/host/drift-resolution");
    const { launchAgent } = await import("../extension/src/host/agent");
    const watching = watchAgentTerminal();
    // Terminals of earlier tests may still be followed: closing them leaves the window with none.
    for (const earlier of terminals) listeners.close.forEach((listener) => listener(earlier));
    vi.useFakeTimers();
    const { scheduler } = await startScheduler();
    try {
      await launchAgent(dir, "Use the trama-implement skill on Task abcd1234.", "T3", undefined, () => true, "run");
      receiveAgentStarted(environments.at(-1)?.["TRAMA_TERMINAL"] as string, 2_000_000_000, dir);
      // The hook's registration reads the start of the process first and finishes on its own time, which fake timers cannot wait for: the entry is written here, awaited.
      const { writeAgentProcess } = await import("../src/core/agent-processes");
      const { questionProjectId } = await import("../src/core/question-channel");
      await writeAgentProcess(questionProjectId(projectAt(dir)), environments.at(-1)?.["TRAMA_TERMINAL"] as string, 2_000_000_000);
      expect(driftWork().running).toBe(true);
      vi.advanceTimersByTime(59_000);
      await flush();
      expect(driftWork().running).toBe(true);
      vi.advanceTimersByTime(2_000);
      await flush();
      expect(driftWork().running).toBe(false);
    } finally {
      scheduler.dispose();
      vi.useRealTimers();
      watching.dispose();
    }
  });

  test("at rest nothing is armed, a Task taken by the agent arms the check, and the check releases it when no window follows its terminal", async () => {
    const { watchAgentTerminal } = await import("../extension/src/host/agent");
    const { onStoppedFollowing } = await import("../extension/src/host/drift-resolution");
    const watching = watchAgentTerminal();
    for (const earlier of terminals) listeners.close.forEach((listener) => listener(earlier));
    const p = projectAt(dir);
    // Tasks left taken by earlier tests would arm the check at rest: they are given back first.
    for (const left of listTasks(p)) if (left.data.agent) moveTask(p, left.id, "todo", "agent");
    const notices: string[] = [];
    const noticing = onStoppedFollowing((subject, reason) => notices.push(`${subject}: ${reason}`));
    vi.useFakeTimers();
    const { scheduler, files } = await startScheduler();
    try {
      expect(vi.getTimerCount()).toBe(0);
      const task = moveTask(p, newTask(p, { title: "Orphan", refs: ["order/Paid"], technical: false }).id, "doing", "agent", { terminal: "gone-terminal" }).id;
      files.fire(join(dir, ".trama", "tasks", "orphan.md"));
      expect(vi.getTimerCount()).toBe(1);
      vi.advanceTimersByTime(61_000);
      await flush();
      expect(getTask(p, task).data.column).toBe("todo");
      expect(notices).toHaveLength(1);
      expect(notices[0]).toContain("no window follows its agent");
      // Nothing left to follow: the timer is not re-armed.
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      scheduler.dispose();
      vi.useRealTimers();
      noticing.dispose();
      watching.dispose();
    }
  });

  test("an announcement of no terminal arms the check, which withdraws it; one of a terminal this window follows does not", async () => {
    const { watchAgentTerminal } = await import("../extension/src/host/agent");
    const watching = watchAgentTerminal();
    for (const earlier of terminals) listeners.close.forEach((listener) => listener(earlier));
    const p = projectAt(dir);
    for (const left of listTasks(p)) if (left.data.agent) moveTask(p, left.id, "todo", "agent");
    withdrawAll(p);
    const { addHolderFollower } = await import("../extension/src/host/followed-holders");
    const following = addHolderFollower((holder) => holder === "mine01");
    vi.useFakeTimers();
    const { scheduler, files } = await startScheduler();
    try {
      announce(p, { kind: "task", title: "Mine", terminal: "mine01" });
      files.fire(join(dir, ".trama", "announcements", "mine.json"));
      expect(vi.getTimerCount()).toBe(0);
      announce(p, { kind: "task", title: "Nobody's" });
      files.fire(join(dir, ".trama", "announcements", "nobody.json"));
      expect(vi.getTimerCount()).toBe(1);
      vi.advanceTimersByTime(61_000);
      await flush();
      expect(listAnnouncements(p).map((a) => a.title)).toEqual(["Mine"]);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      scheduler.dispose();
      vi.useRealTimers();
      following.dispose();
      withdrawAll(p);
      watching.dispose();
    }
  });

  test("disposing the scheduler cancels its timer: a vanished agent is no longer looked for", async () => {
    const { watchAgentTerminal, launchAgent } = await import("../extension/src/host/agent");
    const { driftWork, receiveAgentStarted } = await import("../extension/src/host/drift-resolution");
    const watching = watchAgentTerminal();
    for (const earlier of terminals) listeners.close.forEach((listener) => listener(earlier));
    vi.useFakeTimers();
    const { scheduler } = await startScheduler();
    try {
      await launchAgent(dir, "Use the trama-implement skill on Task abcd1234.", "T3", undefined, () => true, "run");
      receiveAgentStarted(environments.at(-1)?.["TRAMA_TERMINAL"] as string, 2_000_000_000, dir);
      // The hook's registration reads the start of the process first and finishes on its own time, which fake timers cannot wait for: the entry is written here, awaited.
      const { writeAgentProcess } = await import("../src/core/agent-processes");
      const { questionProjectId } = await import("../src/core/question-channel");
      await writeAgentProcess(questionProjectId(projectAt(dir)), environments.at(-1)?.["TRAMA_TERMINAL"] as string, 2_000_000_000);
      scheduler.dispose();
      vi.advanceTimersByTime(120_000);
      await flush();
      expect(driftWork().running).toBe(true);
    } finally {
      scheduler.dispose();
      vi.useRealTimers();
      for (const earlier of terminals) listeners.close.forEach((listener) => listener(earlier));
      watching.dispose();
    }
  });
});

describe("Unify Drifts", () => {
  const instructions = "Trama: Unify Drifts\n\nUnite the Drifts into one.\n";
  /** A copy of the shop project with the extension's package beside it: the hook module and the instructions file. */
  const setUp = (analysis: string) => {
    const root = mkdtempSync(join(tmpdir(), "trama-unify-"));
    cpSync(join(import.meta.dir, "../examples/shop"), root, { recursive: true });
    extensionPath = join(root, "ext");
    mkdirSync(join(extensionPath, "dist"), { recursive: true });
    mkdirSync(join(extensionPath, "media"), { recursive: true });
    writeFileSync(join(extensionPath, "dist", "omp-hook.js"), "");
    writeFileSync(join(extensionPath, "media", "unify-drifts.md"), instructions);
    settingValues["analysis"] = analysis;
    settingValues["execution"] = "haiku";
    const p = projectAt(root);
    const drift = (title: string) => newDrift(p, { where: "src/refund.ts", title, refs: ["order"], happens: "Code does it.", should: "Model says so.", options: FIX_OPTIONS }).id;
    return { root, p, drift };
  };
  const tearDown = (root: string) => {
    extensionPath = "";
    settingValues["agent"] = "omp";
    delete settingValues["analysis"];
    delete settingValues["execution"];
    editor.appName = "Visual Studio Code";
    commandHandler = () => undefined;
    rmSync(root, { recursive: true, force: true });
  };

  test("omp gets the terminal Unify on the analysis model, the instructions file as @file and the one-line instruction; the job counts as a resolution", async () => {
    // Dynamic, as above: the modules must load after mock.module replaced "vscode".
    const { Controller } = await import("../extension/src/host/controller");
    const { watchAgentTerminal } = await import("../extension/src/host/agent");
    const { driftWork, unifyingDrifts } = await import("../extension/src/host/drift-resolution");
    const { unifyDriftsBlockers } = await import("../src/core/resolution");
    const watching = watchAgentTerminal();
    const { root, p, drift } = setUp("opus");
    settingValues["agent"] = "omp";
    const terminalCount = terminals.length;
    const controller = new Controller({ scheme: "file" } as never);
    const launch = controller as unknown as { launchAction(project: Project, action: AgentAction): Promise<void> };
    try {
      const [a, b, c] = [drift("A"), drift("B"), drift("C")] as [string, string, string];
      expect(unifyDriftsBlockers(p, driftWork(root))).toEqual([]);
      await launch.launchAction(p, { kind: "unify-drifts" });

      const terminal = terminals.at(-1) as FakeTerminal;
      expect(terminals).toHaveLength(terminalCount + 1);
      expect(created.at(-1)?.name).toBe("Unify");
      expect(environments.at(-1)?.["TRAMA_JOB"]).toBeDefined();
      const file = join(extensionPath, "media", "unify-drifts.md");
      expect(terminal.line).toContain(`'omp' --hook '${join(extensionPath, "dist", "omp-hook.js")}' --model 'opus' '@${file}' 'Unify the open Drifts \`${a}\`, \`${b}\`, \`${c}\` into one Drift, following the instructions above. Run at most 20 sub-agents at once.`);
      expect(terminal.line).not.toContain("--slow");

      const ghost = listAnnouncements(p).find((x) => x.kind === "drift");
      expect(ghost?.title).toBe("Unifying 3 Drifts");
      expect(ghost?.terminal).toBe(environments.at(-1)?.["TRAMA_TERMINAL"]);

      // The job counts as a resolution: the Drifts it gathered are marked and nothing else that resolves or runs can start.
      expect(driftWork(root).resolving).toBe(true);
      expect(unifyingDrifts(root)).toEqual([a, b, c]);
      expect(unifyDriftsBlockers(p, driftWork(root))[0]).toBe("Drifts are being resolved");
      await expect(launch.launchAction(p, { kind: "unify-drifts" })).rejects.toThrow("Unify Drifts is unavailable: Drifts are being resolved");
      await expect(launch.launchAction(p, { kind: "resolve-drifts", drift: a })).rejects.toThrow("Resolve this Drift is unavailable: Drifts are being resolved");
      expect(terminals).toHaveLength(terminalCount + 1);

      // It ends as a resolution does, and changes no Drift.
      listeners.close.forEach((fn) => fn(terminal));
      expect(driftWork(root).resolving).toBe(false);
      expect(unifyingDrifts(root)).toEqual([]);
      expect(listDrifts(p).map((d) => d.data.status)).toEqual(["open", "open", "open"]);
    } finally {
      for (const terminal of terminals.slice(terminalCount)) listeners.close.forEach((fn) => fn(terminal));
      watching.dispose();
      controller.dispose();
      tearDown(root);
    }
  });

  test("it is refused with fewer than two eligible Drifts, and no terminal, job or card is left", async () => {
    const { Controller } = await import("../extension/src/host/controller");
    const { watchAgentTerminal } = await import("../extension/src/host/agent");
    const { driftWork } = await import("../extension/src/host/drift-resolution");
    const { unifyDriftsBlockers } = await import("../src/core/resolution");
    const watching = watchAgentTerminal();
    const { root, p, drift } = setUp("");
    settingValues["agent"] = "omp";
    const terminalCount = terminals.length;
    const controller = new Controller({ scheme: "file" } as never);
    const launch = controller as unknown as { launchAction(project: Project, action: AgentAction): Promise<void> };
    try {
      await expect(launch.launchAction(p, { kind: "unify-drifts" })).rejects.toThrow("Unify Drifts is unavailable: Unify needs at least two open Drifts.");
      drift("Only");
      expect(unifyDriftsBlockers(p, driftWork(root))).toEqual(["Unify needs at least two open Drifts"]);
      await expect(launch.launchAction(p, { kind: "unify-drifts" })).rejects.toThrow("Unify needs at least two open Drifts");
      // A Drift an agent filed in a turn that has not ended does not count.
      const second = drift("Second");
      expect(unifyDriftsBlockers(p, driftWork(root), [second])).toEqual(["Unify needs at least two open Drifts"]);
      expect(unifyDriftsBlockers(p, driftWork(root))).toEqual([]);
      expect(terminals).toHaveLength(terminalCount);
      expect(driftWork(root).resolving).toBe(false);
      expect(listAnnouncements(p)).toEqual([]);
    } finally {
      watching.dispose();
      controller.dispose();
      tearDown(root);
    }
  });
});

describe("Ask more", () => {
  const instructions = "Trama: Ask more\n\nRead, then wait.\n";
  /** A copy of the shop project with the extension's package beside it: the fixed instructions Ask more carries. */
  const setUp = () => {
    const root = mkdtempSync(join(tmpdir(), "trama-ask-more-"));
    cpSync(join(import.meta.dir, "../examples/shop"), root, { recursive: true });
    extensionPath = join(root, "ext");
    mkdirSync(join(extensionPath, "media"), { recursive: true });
    mkdirSync(join(extensionPath, "bin"), { recursive: true });
    writeFileSync(join(extensionPath, "media", "ask-more.md"), instructions);
    writeFileSync(join(extensionPath, "bin", process.platform === "win32" ? "trama.exe" : "trama"), "");
    return root;
  };
  const tearDown = (root: string) => {
    extensionPath = "";
    settingValues["agent"] = "omp";
    delete settingValues["analysis"];
    delete settingValues["language"];
    editor.appName = "Visual Studio Code";
    commandHandler = () => undefined;
    rmSync(root, { recursive: true, force: true });
  };

  test("with omp a bare terminal named after the card takes the focus, on the analysis model with the fixed instructions attached; no hook, no job, one work card", async () => {
    const { openAskMore, watchAgentTerminal } = await import("../extension/src/host/agent");
    const { localProjectJobs } = await import("../extension/src/host/drift-resolution");
    watchAgentTerminal();
    const root = setUp();
    const p = projectAt(root);
    withdrawAll(p);
    settingValues["analysis"] = " opus ";
    settingValues["language"] = "Italian";
    const terminalCount = terminals.length;
    const jobsBefore = localProjectJobs(root).length;
    try {
      await openAskMore(root, "Ask T3", "Ask more about the Task j6tlxyad.\nText:\nLaunch it.", "Ask about the Task…");
      const terminal = terminals.at(-1) as FakeTerminal;
      const id = environments.at(-1)?.["TRAMA_TERMINAL"] as string;
      expect(terminals).toHaveLength(terminalCount + 1);
      expect(created.at(-1)).toMatchObject({ name: "Ask T3", cwd: root });
      expect(environments.at(-1)).toMatchObject({ TRAMA_AGENT: "1", TRAMA_TERMINAL: id });
      expect(Object.keys(environments.at(-1) ?? {})).not.toContain("TRAMA_JOB");
      expect(Object.keys(environments.at(-1) ?? {})).not.toContain("TRAMA_ADVISOR_SCANNER");
      expect(terminal.line).toBe(
        `'omp' --model 'opus' '@${join(extensionPath, "media", "ask-more.md")}' 'Ask more about the Task j6tlxyad. Text: Launch it. ${languageSentence("Italian")}'`,
      );
      expect(terminal.line).not.toMatch(/--hook|--config|--slow|--advisor/);
      expect(terminal.shown).toEqual([false]);
      expect(listAnnouncements(p).map((a) => [a.kind, a.title, a.terminal])).toEqual([["work", "Ask T3", id]]);
      expect(localProjectJobs(root)).toHaveLength(jobsBefore);
      listeners.end.forEach((fn) => fn(shell(terminal)));
      expect(listAnnouncements(p)).toEqual([]);
    } finally {
      tearDown(root);
    }
  });
  test("the Ask terminal runs the configured omp program, quoted, before the options it had", async () => {
    const { openAskMore } = await import("../extension/src/host/agent");
    const root = setUp();
    settingValues["analysis"] = "opus";
    inspected["ompPath"] = { globalValue: " /opt/my omp/omp " };
    try {
      await openAskMore(root, "Ask T3", "Ask more about the Task.", "Ask about the Task…");
      expect((terminals.at(-1) as FakeTerminal).line).toBe(`'/opt/my omp/omp' --model 'opus' '@${join(extensionPath, "media", "ask-more.md")}' 'Ask more about the Task.'`);
    } finally {
      delete inspected["ompPath"];
      withdrawAll(projectAt(root));
      tearDown(root);
    }
  });

  test("General's instructions are the packaged file alone without a language, and a copy that ends with the language sentence, read at each start, with one", async () => {
    const { generalInstructions } = await import("../extension/src/host/agent");
    const root = setUp();
    const general = "Trama: General\n\nThink with the developer.\n";
    writeFileSync(join(extensionPath, "media", "general.md"), general);
    const storage = { fsPath: join(root, "storage") } as Parameters<typeof generalInstructions>[0];
    try {
      expect(generalInstructions(storage)).toBe(join(extensionPath, "media", "general.md"));
      settingValues["language"] = "   ";
      expect(generalInstructions(storage)).toBe(join(extensionPath, "media", "general.md"));
      settingValues["language"] = " Italian ";
      const italian = generalInstructions(storage) as string;
      expect(italian.startsWith(join(root, "storage"))).toBe(true);
      expect(readFileSync(italian, "utf8")).toBe(`${general}\n${languageSentence("Italian")}\n`);
      settingValues["language"] = "Deutsch";
      const german = generalInstructions(storage) as string;
      expect(german).not.toBe(italian);
      expect(readFileSync(german, "utf8")).toBe(`${general}\n${languageSentence("Deutsch")}\n`);
      expect(readFileSync(join(extensionPath, "media", "general.md"), "utf8")).toBe(general);
      expect(() => generalInstructions(undefined)).toThrow();
    } finally {
      tearDown(root);
    }
  });

  test("a `cursor` value left in trama.agent still opens the Ask terminal: no composer command, no clipboard", async () => {
    const { openAskMore, watchAgentTerminal } = await import("../extension/src/host/agent");
    watchAgentTerminal();
    const root = setUp();
    const p = projectAt(root);
    withdrawAll(p);
    settingValues["agent"] = "cursor";
    editor.appName = "Cursor";
    const before = { calls: editorCalls.length, terminals: terminals.length, clipboard: clipboard.length };
    try {
      await openAskMore(root, "Ask question", "Ask more about a question.", "Ask about this question…");
      expect(terminals).toHaveLength(before.terminals + 1);
      expect(created.at(-1)).toMatchObject({ name: "Ask question", cwd: root });
      expect((terminals.at(-1) as FakeTerminal).line).toMatch(/^'?omp'? .*@.*ask-more\.md/);
      expect(editorCalls).toHaveLength(before.calls);
      expect(clipboard).toHaveLength(before.clipboard);
    } finally {
      withdrawAll(p);
      tearDown(root);
    }
  });

  test("in the editor tab the Ask terminal opens with the focus", async () => {
    const { openAskMore, watchAgentTerminal } = await import("../extension/src/host/agent");
    watchAgentTerminal();
    inspected["terminalLocation"] = { globalValue: "editor" };
    const root = setUp();
    const p = projectAt(root);
    withdrawAll(p);
    try {
      await openAskMore(root, "Ask T3", "Ask more about the Task.", "Ask about the Task…");
      expect(created.at(-1)?.location).toEqual({ viewColumn: 1, preserveFocus: false });
      expect((terminals.at(-1) as FakeTerminal).shown).toEqual([false]);
    } finally {
      delete inspected["terminalLocation"];
      withdrawAll(p);
      tearDown(root);
    }
  });
});

describe("omp Chat conversations in place of terminals", () => {
  /** One process of omp that the fake client started. */
  interface FakeProcess {
    launch: { args: string[]; env: Record<string, string>; cwd: string; hook?: boolean };
    first?: { text: string; attachment?: string };
    stops: number;
    /** The pid the client told `spawned`. */
    spawned?: number;
    /** omp answers the prompt of the work: what the conversation's turn-end listener hears. */
    endTurn: (end: TurnEnd) => void;
  }
  let processes: FakeProcess[];
  let failStart: string | undefined;
  let tabs: { id: string; name: string; focus: boolean }[];
  let closedTabs: string[];
  const saved = new Map<string, unknown>();

  const register = async () => {
    const { setOmpChat } = await import("../extension/src/host/agent");
    processes = [];
    tabs = [];
    closedTabs = [];
    failStart = undefined;
    saved.clear();
    const none = () => ({ dispose() {} });
    const session = (process: FakeProcess) => ({
      sessionId: `s${processes.length}`,
      pid: 5000 + processes.length,
      inTurn: true,
      sendPrompt: async () => undefined,
      send: async () => undefined,
      cancel() {},
      stop: async () => void process.stops++,
      onExit: none,
      onTurnEnd: (listener: (end: TurnEnd) => void) => {
        process.endTurn = listener;
        return { dispose() {} };
      },
      onUpdate: none,
      onTurn: none,
      onFormRequest: none,
      answerForm() {},
      onPermissionRequest: none,
      onPermissionCancelled: none,
      answerPermission() {},
      models: async () => ({ available: [] }),
      setModel: async () => undefined,
    });
    await setOmpChat(
      {
        client: {
          start: async (launch, first, spawned) => {
            if (failStart !== undefined) throw new Error(failStart);
            const process: FakeProcess = { launch, ...(first === undefined ? {} : { first }), stops: 0, endTurn: () => undefined };
            processes.push(process);
            spawned?.(5000 + processes.length - 1);
            process.spawned = 5000 + processes.length - 1;
            return session(process);
          },
          resume: async () => {
            throw new Error("not used");
          },
        },
        view: {
          open: (tab, _session, options) => void tabs.push({ ...tab, focus: options.focus }),
          setWorking() {},
          close: (id) => void closedTabs.push(id),
          onStopRequested: () => ({ dispose() {} }),
          onCloseRequested: () => ({ dispose() {} }),
          showGeneral() {},
          setGeneralSession() {},
          setSession() {},
          generalStatus() {},
          generalCleared() {},
          removeGeneral() {},
          returnToField() {},
          onClearGeneralRequested: () => ({ dispose() {} }),
          onInstallOmpRequested: () => ({ dispose() {} }),
          onGeneralMessage: () => ({ dispose() {} }),
        },
      },
      { get: (key) => saved.get(key), update: async (key, value) => void saved.set(key, value) },
      () => undefined,
    );
  };
  const withOmpChat = async (body: () => Promise<void>) => {
    await register();
    const previous = { agent: settingValues["agent"], inspected: inspected["ompChat"] };
    settingValues["agent"] = "omp";
    inspected["ompChat"] = { globalValue: true };
    warningMessages.length = 0;
    try {
      await body();
    } finally {
      delete inspected["ompChat"];
      if (previous.inspected !== undefined) inspected["ompChat"] = previous.inspected;
      if (previous.agent === undefined) delete settingValues["agent"];
      else settingValues["agent"] = previous.agent;
    }
  };

  test("an instruction opens a conversation with the options, the environment and the identity of the terminal it replaces, and the instruction as its first message", async () => {
    await withOmpChat(async () => {
      const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
      const { localProjectJobs } = await import("../extension/src/host/drift-resolution");
      watchAgentTerminal();
      const p = projectAt(dir);
      withdrawAll(p);
      const terminalCount = terminals.length;
      const saveSettings = { ...settingValues };
      Object.assign(settingValues, { execution: " fast ", scan: "slow-model" });
      try {
        expect(await launchAgent(dir, "Scan it.", "Scan", { kind: "check", title: "Scan" }, undefined, "scan")).toBe("conversation");
        expect(terminals).toHaveLength(terminalCount);
        const [started] = processes;
        const id = started?.launch.env["TRAMA_TERMINAL"] as string;
        expect(id).toMatch(/^[a-z0-9]{6}$/);
        expect(started?.launch.cwd).toBe(dir);
        expect(started?.launch.args.slice(-1)).toEqual(["acp"]);
        expect(started?.launch.args).not.toContain("--yolo");
        // Role scan: no --model of the execution role, the scan model for --slow, in the terminal's order.
        expect(started?.launch.args).toContain("--slow");
        expect(started?.launch.args[started.launch.args.indexOf("--slow") + 1]).toBe("slow-model");
        expect(started?.launch.env).toMatchObject({ TRAMA_AGENT: "1", TRAMA_ACP: "1", TRAMA_TERMINAL: id, TRAMA_QUESTION_ENDPOINT: "endpoint" });
        expect(Object.keys(started?.launch.env ?? {})).toContain("TRAMA_JOB");
        expect(started?.first?.text).toContain("Scan it.");
        expect(started?.first?.text).toContain("Compare each Machine with the trama-analysis sub-agent.");
        expect(tabs).toEqual([{ id, name: "Scan", focus: false }]);
        // Registered as the terminal would be: its job and its card, under the same identity.
        expect(localProjectJobs(dir).map((job) => ("terminal" in job.place ? job.place.terminal : undefined))).toContain(id);
        expect(listAnnouncements(p).map((a) => [a.kind, a.title, a.terminal])).toEqual([["check", "Scan", id]]);
        expect(saved.get("trama.ompChat.conversations")).toEqual([expect.objectContaining({ id, name: "Scan", sessionId: "s1", state: "running", hook: expect.any(Boolean), job: expect.objectContaining({ kind: "scan", name: "Scan" }) })]);
      } finally {
        for (const key of Object.keys(settingValues)) delete settingValues[key];
        Object.assign(settingValues, saveSettings);
      }
    });
  });

  test("omp's answer to the prompt ends the conversation's job and card like a terminal's, with no hook signal, and with autoExit off it stays", async () => {
    await withOmpChat(async () => {
      const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
      const { localProjectJobs, receiveAgentIdle } = await import("../extension/src/host/drift-resolution");
      watchAgentTerminal();
      const p = projectAt(dir);
      withdrawAll(p);
      const jobsBefore = localProjectJobs(dir).length;
      await launchAgent(dir, "Scan it.", "Scan", { kind: "check", title: "Scan" }, undefined, "scan");
      const id = processes[0]?.launch.env["TRAMA_TERMINAL"] as string;
      expect(localProjectJobs(dir)).toHaveLength(jobsBefore + 1);
      // The hook's idle and start signals no longer mean anything to a conversation: neither ends its work nor registers another process for it.
      const { readAgentProcess } = await import("../src/core/agent-processes");
      const { questionProjectId } = await import("../src/core/question-channel");
      const { receiveAgentStarted } = await import("../extension/src/host/drift-resolution");
      receiveAgentIdle(id, dir);
      receiveAgentStarted(id, 2_000_000_000, dir);
      // Real wait, on purpose: a registration, if the start signal wrongly made one, reads the start of the process with a child process, which no fake clock or microtask flush can wait for.
      await new Promise((done) => setTimeout(done, 50));
      expect(readAgentProcess(questionProjectId(p), id)?.pid).not.toBe(2_000_000_000);
      expect(localProjectJobs(dir)).toHaveLength(jobsBefore + 1);
      expect(processes[0]?.stops).toBe(0);
      processes[0]?.endTurn({ stopReason: "end_turn" });
      expect(localProjectJobs(dir)).toHaveLength(jobsBefore);
      expect(listAnnouncements(p)).toEqual([]);
      expect(processes[0]?.stops).toBe(1);
      expect(closedTabs).toEqual([id]);
      expect(warningMessages).toEqual([]);

      settingValues["autoExit"] = false;
      try {
        await launchAgent(dir, "Scan again.", "Scan", { kind: "check", title: "Scan" }, undefined, "scan");
        processes[1]?.endTurn({ stopReason: "end_turn" });
        expect(localProjectJobs(dir)).toHaveLength(jobsBefore);
        expect(processes[1]?.stops).toBe(0);
        expect(closedTabs).toEqual([id]);
      } finally {
        delete settingValues["autoExit"];
      }
    });
  });

  test("an abnormal end of the turn ends the job and card and the Board says why; the process spawned is in the registry from the start", async () => {
    await withOmpChat(async () => {
      const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
      const { localProjectJobs, onAgentStopped } = await import("../extension/src/host/drift-resolution");
      watchAgentTerminal();
      const p = projectAt(dir);
      withdrawAll(p);
      const jobsBefore = localProjectJobs(dir).length;
      const stopped: [string, string][] = [];
      const subscription = onAgentStopped((job, reason) => stopped.push([job, reason]));
      try {
        await launchAgent(dir, "Scan it.", "Scan", { kind: "check", title: "Scan" }, undefined, "scan");
        const id = processes[0]?.launch.env["TRAMA_TERMINAL"] as string;
        expect(processes[0]?.spawned).toBe(5000);
        processes[0]?.endTurn({ stopReason: "refusal" });
        expect(stopped).toEqual([["Scan", "the model refused to continue"]]);
        expect(localProjectJobs(dir)).toHaveLength(jobsBefore);
        expect(listAnnouncements(p)).toEqual([]);
        expect(closedTabs).toEqual([id]);
      } finally {
        subscription.dispose();
      }
    });
  });

  test("a conversation's job is in the registry but is not terminal work: the execution check neither looks at it nor is armed by it", async () => {
    await withOmpChat(async () => {
      const { hasTerminalWork, launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
      const { hasJobs } = await import("../extension/src/host/drift-resolution");
      watchAgentTerminal();
      withdrawAll(projectAt(dir));
      await launchAgent(dir, "Scan it.", "Scan", { kind: "check", title: "Scan" }, undefined, "scan");
      const id = processes[0]?.launch.env["TRAMA_TERMINAL"] as string;
      const ofConversation = (job: { place: object }) => "terminal" in job.place && job.place.terminal === id;
      expect(hasJobs(ofConversation)).toBe(true);
      expect(hasJobs(() => false)).toBe(false);
      // A conversation's job alone does not count as terminal work: what is left is a followed terminal or another job.
      expect(hasJobs((job) => !ofConversation(job))).toBe(hasTerminalWork());
      processes[0]?.endTurn({ stopReason: "end_turn" });
      expect(hasJobs(ofConversation)).toBe(false);
    });
  });

  test("omp Chat is on unless the user value is false: false sends the instruction to a terminal, absent or a workspace value does not", async () => {
    await withOmpChat(async () => {
      const { launchAgent } = await import("../extension/src/host/agent");
      inspected["ompChat"] = { globalValue: false };
      expect(await launchAgent(dir, "Scan it.", "Scan", undefined, undefined, "scan")).toBe("terminal");
      expect(processes).toEqual([]);
      inspected["ompChat"] = { workspaceValue: false };
      expect(await launchAgent(dir, "Scan it.", "Scan", undefined, undefined, "scan")).toBe("conversation");
      delete inspected["ompChat"];
      expect(await launchAgent(dir, "Scan it.", "Scan", undefined, undefined, "scan")).toBe("conversation");
    });
  });

  test("a start that fails opens no conversation, warns, and the same instruction runs in a terminal with the same card, job and identity", async () => {
    await withOmpChat(async () => {
      const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
      const { localProjectJobs } = await import("../extension/src/host/drift-resolution");
      watchAgentTerminal();
      const p = projectAt(dir);
      withdrawAll(p);
      const jobsBefore = localProjectJobs(dir).length;
      const terminalCount = terminals.length;
      failStart = "omp not found at omp";
      let sentAt: number | undefined;
      expect(await launchAgent(dir, "Scan it.", "Scan", { kind: "check", title: "Scan" }, undefined, "scan", (at) => (sentAt = at))).toBe("terminal");
      expect(warningMessages).toEqual(["Trama: omp Chat could not start omp (omp not found at omp); the job runs in a terminal."]);
      expect(tabs).toEqual([]);
      expect(terminals).toHaveLength(terminalCount + 1);
      const terminal = terminals.at(-1) as FakeTerminal;
      const id = environments.at(-1)?.["TRAMA_TERMINAL"] as string;
      expect(terminal.line).toContain("Scan it.");
      expect(listAnnouncements(p).map((a) => [a.kind, a.title, a.terminal])).toEqual([["check", "Scan", id]]);
      expect(localProjectJobs(dir)).toHaveLength(jobsBefore + 1);
      expect(sentAt).toBeNumber();
      expect(saved.get("trama.ompChat.conversations")).toBeUndefined();
      listeners.end.forEach((fn) => fn(shell(terminal)));
      expect(localProjectJobs(dir)).toHaveLength(jobsBefore);
      expect(listAnnouncements(p)).toEqual([]);
    });
  });

  test("Ask more opens an empty conversation and holds the fixed instructions and the part for its first message", async () => {
    await withOmpChat(async () => {
      const { openAskMore, watchAgentTerminal } = await import("../extension/src/host/agent");
      watchAgentTerminal();
      const root = mkdtempSync(join(tmpdir(), "trama-ask-chat-"));
      cpSync(join(import.meta.dir, "../examples/shop"), root, { recursive: true });
      extensionPath = join(root, "ext");
      mkdirSync(join(extensionPath, "media"), { recursive: true });
      mkdirSync(join(extensionPath, "bin"), { recursive: true });
      writeFileSync(join(extensionPath, "media", "ask-more.md"), "Trama: Ask more\n");
      writeFileSync(join(extensionPath, "bin", "trama"), "");
      settingValues["analysis"] = " opus ";
      try {
        await openAskMore(root, "Ask T3", "Ask more about the Task.\nText:\nLaunch it.", "Ask about the Task…");
        expect(processes[0]?.launch.args).toEqual(["--model", "opus", "acp"]);
        // `trama.ompChatApproval` is read when a conversation opens, from the user value only: yolo adds `--yolo`, a workspace value or an unknown one does not.
        inspected["ompChatApproval"] = { workspaceValue: "yolo" };
        await openAskMore(root, "Ask T4", "Ask more.", "Ask about the Task…");
        expect(processes[1]?.launch.args).toEqual(["--model", "opus", "acp"]);
        inspected["ompChatApproval"] = { globalValue: "bypass" };
        await openAskMore(root, "Ask T5", "Ask more.", "Ask about the Task…");
        expect(processes[2]?.launch.args).toEqual(["--model", "opus", "acp"]);
        inspected["ompChatApproval"] = { globalValue: "yolo" };
        await openAskMore(root, "Ask T6", "Ask more.", "Ask about the Task…");
        expect(processes[3]?.launch.args).toEqual(["--model", "opus", "acp", "--yolo"]);
        // `trama.ompChatIntentTracing` is read the same way: PI_INTENT_TRACING=0 only for the user value false, 1 for anything else or none.
        inspected["ompChatIntentTracing"] = { globalValue: false };
        await openAskMore(root, "Ask T7", "Ask more.", "Ask about the Task…");
        expect(processes[4]?.launch.env["PI_INTENT_TRACING"]).toBe("0");
        inspected["ompChatIntentTracing"] = { workspaceValue: false };
        await openAskMore(root, "Ask T8", "Ask more.", "Ask about the Task…");
        expect(processes[5]?.launch.env["PI_INTENT_TRACING"]).toBe("1");
        expect(processes[0]?.launch.cwd).toBe(root);
        expect(processes[0]?.first).toBeUndefined(); // Ask more sends nothing until the developer writes; the instruction is composed with that first message
        expect(processes[0]?.launch.hook).toBe(false); // Ask more is not a job conversation: its forms go to the view
        expect(processes[0]?.launch.env["TRAMA_ACP"]).toBe("1");
        expect(tabs[0]).toMatchObject({ name: "Ask T3", focus: true });
      } finally {
        delete inspected["ompChatApproval"];
        delete inspected["ompChatIntentTracing"];
        extensionPath = "";
        delete settingValues["analysis"];
        withdrawAll(projectAt(root));
        rmSync(root, { recursive: true, force: true });
      }
    });
  });
});

describe("omp before a launch", () => {
  test("without omp no launch creates a terminal, a job or a ghost: the instruction and Ask more both stop", async () => {
    const { launchAgent, openAskMore } = await import("../extension/src/host/agent");
    const { localProjectJobs } = await import("../extension/src/host/drift-resolution");
    const p = projectAt(dir);
    withdrawAll(p);
    const terminalsBefore = created.length;
    const jobsBefore = localProjectJobs(dir).length;
    let sent = false;
    ompFound = async () => undefined;
    inspected["ompChat"] = { globalValue: false };
    extensionPath = join(dir, "ext");
    mkdirSync(join(extensionPath, "media"), { recursive: true });
    writeFileSync(join(extensionPath, "media", "ask-more.md"), "Trama: Ask more\n");
    try {
      expect(await launchAgent(dir, "Use the trama-scan skill.", "Scan", { kind: "work", title: "Scan" }, () => true, "scan", () => void (sent = true))).toBeUndefined();
      await openAskMore(dir, "Ask T3", "Ask more about the Task.", "Ask about the Task…");
      expect(created.length).toBe(terminalsBefore);
      expect(localProjectJobs(dir)).toHaveLength(jobsBefore);
      expect(listAnnouncements(p)).toEqual([]);
      expect(sent).toBe(false);
    } finally {
      delete inspected["ompChat"];
      extensionPath = "";
      ompFound = async (ompPath) => (ompPath === "" ? "omp" : ompPath);
    }
  });

  test("the command and the PATH of the terminal use the program the check found, with the folders of omp and bun in front", async () => {
    const { launchAgent } = await import("../extension/src/host/agent");
    const found = join(dir, "found", "omp");
    ompFound = async () => found;
    inspected["ompChat"] = { globalValue: false };
    try {
      expect(await launchAgent(dir, "hello", "Scan")).toBe("terminal");
      expect((terminals.at(-1) as FakeTerminal).line).toStartWith(`'${found}' `);
      const path = (environments.at(-1) ?? {})[process.platform === "win32" ? "Path" : "PATH"] ?? "";
      expect(path.split(delimiter).slice(0, 2)).toEqual([join(dir, "found"), join(os.homedir(), ".bun", "bin")]);
    } finally {
      delete inspected["ompChat"];
      ompFound = async (ompPath) => (ompPath === "" ? "omp" : ompPath);
      withdrawAll(projectAt(dir));
    }
  });
});

// Dynamic imports: the Controller must load after mock.module replaced "vscode", as in the tests above.
describe("Approve waits for a Run in progress", () => {
  // Waiting Proposals only exist with the setting on: turning it off empties the waiting list when the setting changes.
  beforeEach(() => void (settingValues["autoUpdateStaleProposals"] = true));
  afterEach(() => void delete settingValues["autoUpdateStaleProposals"]);
  /** The refinement at work of Proposal `id`, delivered, as the controller keeps it. */
  const delivered = (id: string) => new Map([[id, { proposal: id, seats: 1, job: "job", delivered: true }]]);
  test("a refined Proposal waits while a Run of this window runs, and is approved when the Run ends", async () => {
    const { Controller } = await import("../extension/src/host/controller");
    const { endHeldJob, startJob } = await import("../extension/src/host/drift-resolution");
    const { editInProposal, getProposal, newProposal } = await import("../src/core/proposals");
    const { handOver } = await import("./handover");
    const { coverWithTask } = await import("./cover");
    const root = mkdtempSync(join(tmpdir(), "trama-wait-run-"));
    cpSync(join(import.meta.dir, "../examples/shop"), root, { recursive: true });
    const p = projectAt(root);
    const previousRoot = workspaceRoot;
    workspaceRoot = root;
    const controller = new Controller({ scheme: "file" } as never);
    await controller.open();
    const host = controller as unknown as {
      refinement: { running: ReadonlyMap<string, unknown>; waiting: string[] };
      endRefinement(project: Project, id: string, job: string): void;
      refuseWhileRunning(project: Project): boolean;
    };
    try {
      const prop = newProposal(p, "Change");
      const file = editInProposal(p, prop.id, "checkout/order.md");
      writeFileSync(file, readFileSync(file, "utf8").replace("### Cancelled (final)", "### Cancelled (final)\n\n### Lost (final)"));
      coverWithTask(p, prop.id, "checkout", "user");
      handOver(p, prop.id);
      startJob("run", root, { held: true }, "wait-run");
      expect(host.refuseWhileRunning(p)).toBe(true);
      host.refinement = { ...host.refinement, running: delivered(prop.id) };
      host.endRefinement(p, prop.id, "job");
      expect(host.refinement.waiting).toEqual([prop.id]);
      expect(getProposal(p, prop.id).data.status).toBe("open");
      endHeldJob(root, "wait-run");
      expect(host.refinement.waiting).toEqual([]);
      expect(getProposal(p, prop.id).data.status).toBe("approved");
    } finally {
      controller.dispose();
      workspaceRoot = previousRoot;
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("with no Run in progress a refined Proposal is approved at once, and the guard lets Approve through", async () => {
    const { Controller } = await import("../extension/src/host/controller");
    const { editInProposal, getProposal, newProposal } = await import("../src/core/proposals");
    const { handOver } = await import("./handover");
    const { coverWithTask } = await import("./cover");
    const root = mkdtempSync(join(tmpdir(), "trama-no-run-"));
    cpSync(join(import.meta.dir, "../examples/shop"), root, { recursive: true });
    const p = projectAt(root);
    const previousRoot = workspaceRoot;
    workspaceRoot = root;
    const controller = new Controller({ scheme: "file" } as never);
    await controller.open();
    const host = controller as unknown as {
      refinement: { running: ReadonlyMap<string, unknown>; waiting: string[] };
      endRefinement(project: Project, id: string, job: string): void;
      refuseWhileRunning(project: Project): boolean;
    };
    try {
      const prop = newProposal(p, "Change");
      const file = editInProposal(p, prop.id, "checkout/order.md");
      writeFileSync(file, readFileSync(file, "utf8").replace("### Cancelled (final)", "### Cancelled (final)\n\n### Lost (final)"));
      coverWithTask(p, prop.id, "checkout", "user");
      handOver(p, prop.id);
      expect(host.refuseWhileRunning(p)).toBe(false);
      host.refinement = { ...host.refinement, running: delivered(prop.id) };
      host.endRefinement(p, prop.id, "job");
      expect(host.refinement.waiting).toEqual([]);
      expect(getProposal(p, prop.id).data.status).toBe("approved");
    } finally {
      controller.dispose();
      workspaceRoot = previousRoot;
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a refined Proposal that is stale again when the Run ends rejoins the queue and is refined again", async () => {
    const { Controller } = await import("../extension/src/host/controller");
    const { endHeldJob, startJob } = await import("../extension/src/host/drift-resolution");
    const { editInProposal, getProposal, newProposal } = await import("../src/core/proposals");
    const { handOver } = await import("./handover");
    const { coverWithTask } = await import("./cover");
    const root = mkdtempSync(join(tmpdir(), "trama-requeue-run-"));
    cpSync(join(import.meta.dir, "../examples/shop"), root, { recursive: true });
    const p = projectAt(root);
    const previousRoot = workspaceRoot;
    workspaceRoot = root;
    const controller = new Controller({ scheme: "file" } as never);
    await controller.open();
    const launched: string[] = [];
    const host = controller as unknown as {
      refinement: { running: ReadonlyMap<string, unknown>; waiting: string[]; queued: string[] };
      endRefinement(project: Project, id: string, job: string): void;
      launchAction(project: Project, action: { kind: string; proposal?: string }): Promise<void>;
    };
    // The refinement agent is not launched: the launch is recorded, and the queue is what decides it.
    host.launchAction = async (_project, action) => {
      launched.push(action.proposal ?? "");
      return new Promise(() => {});
    };
    try {
      const prop = newProposal(p, "Change");
      const file = editInProposal(p, prop.id, "checkout/order.md");
      writeFileSync(file, readFileSync(file, "utf8").replace("### Cancelled (final)", "### Cancelled (final)\n\n### Lost (final)"));
      coverWithTask(p, prop.id, "checkout", "user");
      handOver(p, prop.id);
      startJob("run", root, { held: true }, "requeue-run");
      host.refinement = { ...host.refinement, running: delivered(prop.id) };
      host.endRefinement(p, prop.id, "job");
      expect(host.refinement.waiting).toEqual([prop.id]);
      // The Model changes under the Proposal while the Run runs: when the Run ends the Proposal is stale again.
      const model = join(root, ".trama", "model", "checkout", "order.md");
      writeFileSync(model, `${readFileSync(model, "utf8")}\nUna riga in più.\n`);
      endHeldJob(root, "requeue-run");
      expect(host.refinement.waiting).toEqual([]);
      expect(launched).toEqual([prop.id]);
      expect(getProposal(p, prop.id).data.status).toBe("open");
    } finally {
      controller.dispose();
      workspaceRoot = previousRoot;
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("turning the setting off empties the queue and the waiting list, and the waiting Proposal is not approved when the Run ends", async () => {
    const { Controller } = await import("../extension/src/host/controller");
    const { endHeldJob, startJob } = await import("../extension/src/host/drift-resolution");
    const { editInProposal, getProposal, newProposal } = await import("../src/core/proposals");
    const { handOver } = await import("./handover");
    const { coverWithTask } = await import("./cover");
    const root = mkdtempSync(join(tmpdir(), "trama-off-run-"));
    cpSync(join(import.meta.dir, "../examples/shop"), root, { recursive: true });
    const p = projectAt(root);
    const previousRoot = workspaceRoot;
    workspaceRoot = root;
    settingValues["autoUpdateStaleProposals"] = true;
    const controller = new Controller({ scheme: "file" } as never);
    await controller.open();
    const launched: string[] = [];
    const host = controller as unknown as {
      refinement: { running: ReadonlyMap<string, unknown>; waiting: string[]; queued: string[] };
      endRefinement(project: Project, id: string, job: string): void;
      settingsChanged(ompPathChanged?: boolean): void;
      launchAction(project: Project, action: { kind: string; proposal?: string }): Promise<void>;
    };
    host.launchAction = async (_project, action) => {
      launched.push(action.proposal ?? "");
      return new Promise(() => {});
    };
    try {
      const prop = newProposal(p, "Change");
      const file = editInProposal(p, prop.id, "checkout/order.md");
      writeFileSync(file, readFileSync(file, "utf8").replace("### Cancelled (final)", "### Cancelled (final)\n\n### Lost (final)"));
      coverWithTask(p, prop.id, "checkout", "user");
      handOver(p, prop.id);
      startJob("run", root, { held: true }, "off-run");
      host.refinement = { ...host.refinement, running: delivered(prop.id) };
      host.endRefinement(p, prop.id, "job");
      expect(host.refinement.waiting).toEqual([prop.id]);
      host.refinement = { ...host.refinement, queued: ["zzzzzzzz"] };
      settingValues["autoUpdateStaleProposals"] = false;
      host.settingsChanged();
      expect(host.refinement.queued).toEqual([]);
      expect(host.refinement.waiting).toEqual([]);
      endHeldJob(root, "off-run");
      expect(getProposal(p, prop.id).data.status).toBe("open");
      expect(launched).toEqual([]);
    } finally {
      controller.dispose();
      delete settingValues["autoUpdateStaleProposals"];
      workspaceRoot = previousRoot;
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("an approveProposal message during a Run is refused without queueing or launching, and accepted once the Run ends", async () => {
    const { Controller } = await import("../extension/src/host/controller");
    const { endHeldJob, startJob } = await import("../extension/src/host/drift-resolution");
    const { editInProposal, getProposal, newProposal } = await import("../src/core/proposals");
    const { handOver } = await import("./handover");
    const { coverWithTask } = await import("./cover");
    const root = mkdtempSync(join(tmpdir(), "trama-approve-msg-"));
    cpSync(join(import.meta.dir, "../examples/shop"), root, { recursive: true });
    const p = projectAt(root);
    const previousRoot = workspaceRoot;
    workspaceRoot = root;
    const controller = new Controller({ scheme: "file" } as never);
    await controller.open();
    const launched: string[] = [];
    const host = controller as unknown as {
      refinement: { running: ReadonlyMap<string, unknown>; waiting: string[]; queued: string[] };
      handle(raw: unknown): Promise<void>;
      launchAction(project: Project, action: { kind: string; proposal?: string }): Promise<void>;
    };
    host.launchAction = async (_project, action) => {
      launched.push(action.proposal ?? "");
      return new Promise(() => {});
    };
    try {
      const prop = newProposal(p, "Change");
      const file = editInProposal(p, prop.id, "checkout/order.md");
      writeFileSync(file, readFileSync(file, "utf8").replace("### Cancelled (final)", "### Cancelled (final)\n\n### Lost (final)"));
      coverWithTask(p, prop.id, "checkout", "user");
      handOver(p, prop.id);
      // The Model changes under the Proposal: it is stale, so Approve would refine it.
      const model = join(root, ".trama", "model", "checkout", "order.md");
      writeFileSync(model, `${readFileSync(model, "utf8")}\nUna riga in più.\n`);
      startJob("run", root, { held: true }, "approve-msg-run");
      await host.handle({ type: "approveProposal", id: prop.id });
      expect(getProposal(p, prop.id).data.status).toBe("open");
      expect(host.refinement.queued).toEqual([]);
      expect(host.refinement.waiting).toEqual([]);
      expect(launched).toEqual([]);
      endHeldJob(root, "approve-msg-run");
      await host.handle({ type: "approveProposal", id: prop.id });
      expect(host.refinement.queued.concat(host.refinement.waiting)).toEqual([]);
      expect(launched).toEqual([prop.id]);
    } finally {
      controller.dispose();
      workspaceRoot = previousRoot;
      rmSync(root, { recursive: true, force: true });
    }
  });

  /** A window on a copy of the shop project, whose launches of the agent are recorded and never end. */
  const refineWindow = async () => {
    const { Controller } = await import("../extension/src/host/controller");
    const { editInProposal, newProposal } = await import("../src/core/proposals");
    const { handOver } = await import("./handover");
    const { coverWithTask } = await import("./cover");
    const root = mkdtempSync(join(tmpdir(), "trama-refine-all-"));
    cpSync(join(import.meta.dir, "../examples/shop"), root, { recursive: true });
    const p = projectAt(root);
    const previousRoot = workspaceRoot;
    workspaceRoot = root;
    const controller = new Controller({ scheme: "file" } as never);
    await controller.open();
    const launched: { proposal: string; seats: number; job: string }[] = [];
    const host = controller as unknown as {
      refinement: { running: ReadonlyMap<string, { seats: number; job: string; delivered: boolean }>; waiting: string[]; queued: string[]; refineAllSince: number | null };
      handle(raw: unknown): Promise<void>;
      endRefinement(project: Project, id: string, job: string): void;
      noteDelivered(root: string, id: string): void;
      launchAction(project: Project, action: { kind: string; proposal: string; seats: number; job: string }): Promise<void>;
    };
    host.launchAction = async (_project, action) => {
      launched.push({ proposal: action.proposal, seats: action.seats, job: action.job });
      return new Promise(() => {});
    };
    /** An open Proposal of `file` that the Model changes under (`changeModel`), so that it is stale. */
    const stale = (title: string, file: "order" | "cart", line: string): string => {
      const proposal = newProposal(p, title);
      const path = editInProposal(p, proposal.id, `checkout/${file}.md`);
      const marker = file === "order" ? "### Cancelled (final)" : "### Confirmed (final)";
      writeFileSync(path, readFileSync(path, "utf8").replace(marker, `${marker}\n\n### ${line} (final)`));
      coverWithTask(p, proposal.id, "checkout", "user");
      handOver(p, proposal.id);
      return proposal.id;
    };
    const changeModel = (): void => {
      for (const file of ["order", "cart"]) {
        const model = join(root, ".trama", "model", "checkout", `${file}.md`);
        writeFileSync(model, `${readFileSync(model, "utf8")}\nUna riga in più.\n`);
      }
    };
    const close = (): void => {
      controller.dispose();
      delete settingValues["autoUpdateStaleProposals"];
      workspaceRoot = previousRoot;
      rmSync(root, { recursive: true, force: true });
    };
    return { host, p, root, launched, stale, changeModel, close };
  };

  test("Refine All queues every refinable Proposal at once, starts one per chain sharing the places, and Cancel Refine All empties what waits two seconds after the click", async () => {
    const { getProposal } = await import("../src/core/proposals");
    const window = await refineWindow();
    const { host, p, launched } = window;
    try {
      const first = window.stale("First", "order", "Lost");
      const second = window.stale("Second", "order", "Gone");
      const third = window.stale("Third", "cart", "Dropped");
      window.changeModel();
      await host.handle({ type: "refineAll" });
      // The two chains (order.md, cart.md) work together and share the 20 places; the second Proposal of order.md waits for the first.
      expect(launched.map((launch) => [launch.proposal, launch.seats])).toEqual([[first, 10], [third, 10]]);
      expect([...host.refinement.running.keys()]).toEqual([first, third]);
      expect(host.refinement.queued).toEqual([second]);
      expect(host.refinement.refineAllSince).not.toBeNull();
      // Before two seconds, Cancel Refine All does nothing.
      await host.handle({ type: "cancelRefineAll" });
      expect(host.refinement.queued).toEqual([second]);
      host.refinement = { ...host.refinement, refineAllSince: Date.now() - 2500 };
      await host.handle({ type: "cancelRefineAll" });
      expect(host.refinement.queued).toEqual([]);
      expect(host.refinement.refineAllSince).toBeNull();
      // The refinements at work go on, and no file changed.
      expect([...host.refinement.running.keys()]).toEqual([first, third]);
      expect(getProposal(p, second).data.status).toBe("open");
      // Without Refine All in progress, Cancel Refine All does nothing.
      await host.handle({ type: "cancelRefineAll" });
      expect(launched).toHaveLength(2);
    } finally {
      window.close();
    }
  });

  test("Refine All does nothing with the setting off or with nothing to refine", async () => {
    const window = await refineWindow();
    const { host, launched } = window;
    try {
      await host.handle({ type: "refineAll" });
      expect(launched).toEqual([]);
      window.stale("First", "order", "Lost");
      window.changeModel();
      settingValues["autoUpdateStaleProposals"] = false;
      await host.handle({ type: "refineAll" });
      expect(launched).toEqual([]);
      expect(host.refinement.queued).toEqual([]);
      expect(host.refinement.refineAllSince).toBeNull();
    } finally {
      window.close();
    }
  });

  test("Refine All is not refused during a Run: the refinement starts and the refined Proposal waits for the Run, then is approved; a single Approve stays refused", async () => {
    const { endHeldJob, startJob } = await import("../extension/src/host/drift-resolution");
    const { getProposal, rebaseInProposal } = await import("../src/core/proposals");
    const { handOver } = await import("./handover");
    const window = await refineWindow();
    const { host, p, root, launched } = window;
    try {
      const refined = window.stale("Refined", "order", "Lost");
      const single = window.stale("Single", "cart", "Dropped");
      window.changeModel();
      startJob("run", root, { held: true }, "refine-all-run");
      await host.handle({ type: "approveProposal", id: single });
      expect(launched).toEqual([]);
      expect(host.refinement.queued).toEqual([]);
      await host.handle({ type: "refineAll" });
      expect(launched.map((launch) => launch.proposal)).toEqual([refined, single]);
      const job = launched[0]?.job ?? "";
      // The agent realigns and hands the Proposal over; its job ends, twice, while the Run goes on.
      rebaseInProposal(p, refined);
      handOver(p, refined);
      host.noteDelivered(root, refined);
      host.endRefinement(p, refined, job);
      host.endRefinement(p, refined, job);
      expect(host.refinement.waiting).toEqual([refined]);
      expect(getProposal(p, refined).data.status).toBe("open");
      // The other refinement still works: the end of one job did not touch it.
      expect([...host.refinement.running.keys()]).toEqual([single]);
      endHeldJob(root, "refine-all-run");
      expect(host.refinement.waiting).toEqual([]);
      expect(getProposal(p, refined).data.status).toBe("approved");
    } finally {
      window.close();
    }
  });

  test("a Proposal refined after Refine All is approved like one refined after Approve, Tasks included, when no Run is in progress", async () => {
    const { getProposal, rebaseInProposal } = await import("../src/core/proposals");
    const { handOver } = await import("./handover");
    const window = await refineWindow();
    const { host, p, root, launched } = window;
    try {
      const refined = window.stale("Refined", "order", "Lost");
      window.changeModel();
      await host.handle({ type: "refineAll" });
      expect(launched.map((launch) => launch.proposal)).toEqual([refined]);
      rebaseInProposal(p, refined);
      handOver(p, refined);
      host.noteDelivered(root, refined);
      host.endRefinement(p, refined, launched[0]?.job ?? "");
      expect(getProposal(p, refined).data.status).toBe("approved");
      expect(host.refinement.waiting).toEqual([]);
      expect(listTasks(p).filter((item) => item.data.proposal === refined)).toHaveLength(1);
    } finally {
      window.close();
    }
  });

  test("a refinement of Refine All that ends with the Proposal not delivered leaves it Open and to refine, with nothing approved or waiting", async () => {
    const { getProposal } = await import("../src/core/proposals");
    const window = await refineWindow();
    const { host, p, launched } = window;
    try {
      const refined = window.stale("Refined", "order", "Lost");
      window.changeModel();
      await host.handle({ type: "refineAll" });
      host.endRefinement(p, refined, launched[0]?.job ?? "");
      expect(getProposal(p, refined).data.status).toBe("open");
      expect(host.refinement.waiting).toEqual([]);
      expect([...host.refinement.running.keys()]).toEqual([]);
      expect(host.refinement.queued).toEqual([]);
    } finally {
      window.close();
    }
  });
});
