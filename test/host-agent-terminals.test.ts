import { afterAll, beforeAll, describe, expect, mock, spyOn, test, vi } from "bun:test";
import { basename, join, relative, isAbsolute } from "node:path";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import * as os from "node:os";
const { tmpdir } = os;
// The editor writes the chat's sub-agent definition into the developer's home: a temporary one keeps the real home untouched.
const home = mkdtempSync(join(tmpdir(), "trama-agent-home-"));
mock.module("node:os", () => ({ ...os, homedir: () => home }));
afterAll(() => rmSync(home, { recursive: true, force: true }));
import { announce, listAnnouncements, withdrawAll } from "../src/core/announcements";
import type { CursorHook } from "../src/core/cursor-chat";
import { newProposal } from "../src/core/proposals";
import { projectAt } from "../src/core/store";
import { getTask, moveTask, newTask } from "../src/core/work";
import { syncRequirementSkills } from "../src/core/requirement-skills";
import type { AgentAction } from "../extension/src/protocol";
import type { Project } from "../src/core/store";

// A minimal editor: just the terminal events and the calls launchAgent makes.
type Listener<T> = (event: T) => void;
interface FakeTerminal {
  exitStatus: number | undefined;
  shellIntegration: object;
  /** The last command line typed into it. */
  line: string;
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
const listeners: { start: Listener<ShellEvent>[]; end: Listener<ShellEvent>[]; close: Listener<FakeTerminal>[]; tabs: Listener<TabChange>[] } = { start: [], end: [], close: [], tabs: [] };
class TabInputTerminal {}
/** What the editor reports about a command in `terminal`: by default the line Trama typed into it. */
const shell = (terminal: FakeTerminal, commandLine = terminal.line, exitCode?: number): ShellEvent => ({ terminal, execution: { commandLine: { value: commandLine } }, exitCode });
const subscribe = <T>(list: Listener<T>[]) => (fn: Listener<T>) => {
  list.push(fn);
  return { dispose() {} };
};
const terminals: FakeTerminal[] = [];
/** Every command line typed into any fake terminal, in order. */
const typed: string[] = [];
/** The environment each fake terminal was created with, in the order created. */
const environments: Record<string, string>[] = [];
/** Every terminal Trama created, in order, including the folder, the name and where it opened. */
const created: { name?: string; cwd?: string; env: Record<string, string>; location?: unknown }[] = [];
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
/** The answers to the offer to initialize a project, in the order the offers were shown. */
const answerOffer: Array<(choice: string | undefined) => void> = [];
let panelsCreated = 0;
let reveals = 0;
let questionEndpoint: () => Promise<string> = async () => "endpoint";

mock.module("vscode", () => ({
  window: {
    onDidStartTerminalShellExecution: subscribe(listeners.start),
    onDidEndTerminalShellExecution: subscribe(listeners.end),
    onDidCloseTerminal: subscribe(listeners.close),
    createTerminal: (options: { name?: string; cwd?: string; env: Record<string, string>; location?: unknown }) => {
      environments.push(options.env);
      created.push(options);
      const terminal: FakeTerminal = {
        exitStatus: undefined,
        shellIntegration: {},
        line: "",
        shown: [],
        disposals: 0,
        show(preserveFocus?: boolean) {
          this.shown.push(preserveFocus);
        },
        sendText(text: string) {
          this.line = text;
          typed.push(text);
        },
        dispose() {
          this.disposals++;
        },
      };
      terminals.push(terminal);
      return terminal;
    },
    showErrorMessage: (message: string) => void errorMessages.push(message),
    showQuickPick: async (items: { label: string; description?: string }[], options: { title?: string }) => pick(items, options),
    showInputBox: async () => typeIn(),
    showWarningMessage: () => undefined,
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
        return path !== ".." && !path.startsWith("../") && !isAbsolute(path);
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
  Uri: { joinPath: (base: unknown, ...parts: string[]) => ({ base, parts, toString: () => parts.join("/") }), parse: (value: string) => ({ toString: () => value }) },
  RelativePattern: class {},
  // Bun re-mocks "vscode" in place, keeping only these keys, for every later test file that mocks it too.
  TabInputText: class {},
  TabInputTerminal,
  ViewColumn: { Active: 1, Beside: -2 },
  commands: { executeCommand: async (id: string, ...args: unknown[]) => (editorCalls.push(id), commandHandler(id, ...args)) },
  env: {
    get appName() { return editor.appName; },
    shell: "/bin/bash",
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
mock.module("../extension/src/host/questions", () => ({ questionEndpoint: () => questionEndpoint(), questionWindowId: async () => "window-id", EditorQuestions: class {} }));

let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-terminals-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("taken Tasks and the agent terminals", () => {
  test("a command ending in one terminal sends back to To do only the Tasks that terminal took, and those taken before the holder was kept", async () => {
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

    const take = (title: string, terminal?: string) => moveTask(p, newTask(p, { title, refs: ["order/Paid"], technical: false }).id, "doing", "agent", terminal ? { terminal } : {}).id;
    const a = take("A", firstId);
    const b = take("B", secondId);
    const old = take("Old"); // taken with no holder recorded, as before the mark kept one
    expect(readFileSync(getTask(p, a).path, "utf8")).toContain(`agent: ${firstId}`);
    const state = (id: string) => [getTask(p, id).data.column, getTask(p, id).data.agent];

    listeners.end.forEach((fn) => fn(shell(first)));
    expect([a, b, old].map(state)).toEqual([["todo", false], ["doing", true], ["todo", false]]);
    listeners.end.forEach((fn) => fn(shell(second)));
    expect(state(b)).toEqual(["todo", false]);
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
      await expect(allRun).rejects.toThrow(/Run all To do is unavailable: An agent is working on Task/);
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

  test("a whole-System scan from the Scan command remembers its launch instant as the button does; a Feature scan does not", async () => {
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
      await launch.launchAction(p, { kind: "scan", feature: "checkout" });
      expect(existsSync(remembered)).toBe(false);
    } finally {
      watching.dispose();
      controller.dispose();
      if (previousAgent === undefined) delete settingValues["agent"];
      else settingValues["agent"] = previousAgent;
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("the end of a turn of a Trama conversation in Cursor's chat, however it ends, sends every taken Task back to To do", async () => {
    // Dynamic, as above: the modules must load after mock.module replaced "vscode".
    const { watchAgentTerminal } = await import("../extension/src/host/agent");
    const { receiveCursorHook } = await import("../extension/src/host/cursor");
    const p = projectAt(dir);
    const watching = watchAgentTerminal();
    const hook = (h: Partial<CursorHook> & Pick<CursorHook, "hook">) => receiveCursorHook({ root: dir, conversation: "r1", ...h });
    const take = () => {
      const t = newTask(p, { title: "T", refs: ["order/Paid"], technical: false });
      moveTask(p, t.id, "doing", "agent");
      return t.id;
    };
    const taken = (id: string) => [getTask(p, id).data.column, getTask(p, id).data.agent];
    try {
      const a = take();
      hook({ hook: "stop", status: "completed", conversation: "not-trama" });
      hook({ hook: "beforeSubmitPrompt", tramaPrompt: true });
      expect(taken(a)).toEqual(["doing", true]);
      hook({ hook: "stop", status: "completed" });
      expect(taken(a)).toEqual(["todo", false]);

      const b = take();
      hook({ hook: "stop", status: "error" });
      expect(taken(b)).toEqual(["todo", false]);

      const c = take();
      hook({ hook: "sessionEnd", reason: "window_close" });
      expect(taken(c)).toEqual(["todo", false]);
    } finally {
      watching.dispose();
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

describe("Claude Code run hooks", () => {
  test("every job gets terminal-scoped Stop and SessionEnd hooks using the bundled CLI", async () => {
    // Dynamic import is intentional: the fake vscode extension registry must be in place before agent.ts loads.
    const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    const testDir = mkdtempSync(join(tmpdir(), "trama-claude-hooks-"));
    projectAt(testDir);
    extensionPath = join(testDir, "extension");
    mkdirSync(join(extensionPath, "bin"), { recursive: true });
    writeFileSync(join(extensionPath, "bin", "trama"), "");
    settingValues.agent = "claude";
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
        expect(terminal.line).toContain("claude --settings");
        expect(terminal.line).toContain("Stop");
        expect(terminal.line).toContain("SessionEnd");
        expect(terminal.line).not.toContain("SubagentStop");
        expect(terminal.line).toContain(`' --model 'haiku' `);
        expect(terminal.line).toContain("agent-event idle");
        expect(id).toMatch(/^[a-z0-9]{6}$/);
        expect(environments.find((env) => env["TRAMA_TERMINAL"] === id)?.["TRAMA_TERMINAL"]).toBe(id);
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
  test("autoExit never closes chats", async () => {
    const { launchAgent } = await import("../extension/src/host/agent");
    const count = terminals.length;
    const appName = editor.appName;
    settingValues.agent = "chat";
    editor.appName = "Cursor";
    try {
      expect(await launchAgent(dir, "Use the trama-scan skill on the whole System.", "Scan")).toBe("sent");
      expect(terminals).toHaveLength(count);
    } finally {
      settingValues.agent = "omp";
      editor.appName = appName;
    }
  });
  test("chat instructions include the user-scoped sub-agent limit", async () => {
    const { launchAgent } = await import("../extension/src/host/agent");
    const previousHandler = commandHandler;
    const previousApp = editor.appName;
    let query = "";
    settingValues.agent = "chat";
    editor.appName = "Visual Studio Code";
    settingValues.maxParallelAgents = 6;
    inspected.maxParallelAgents = { globalValue: 6, workspaceValue: 80 };
    commandHandler = (id, ...args) => {
      const options = args[0];
      if (id === "workbench.action.chat.open" && typeof options === "object" && options !== null && "query" in options && typeof options.query === "string") query = options.query;
    };
    try {
      expect(await launchAgent(dir, "Use the trama-design skill. Add refunds.", "Design")).toBe("sent");
      expect(query).toBe("Use the trama-design skill. Add refunds. Run at most 6 sub-agents at once.");
    } finally {
      commandHandler = previousHandler;
      editor.appName = previousApp;
      settingValues.agent = "omp";
      delete settingValues.maxParallelAgents;
      delete inspected.maxParallelAgents;
    }
  });
  test("chat instructions are built after newChat and not sent if delivery conditions change", async () => {
    const { launchAgent } = await import("../extension/src/host/agent");
    const previousHandler = commandHandler;
    const previousApp = editor.appName;
    let scope = "the Drift open before preparation";
    let query = "";
    let canDeliver = true;
    settingValues.agent = "chat";
    editor.appName = "Visual Studio Code";
    commandHandler = async (id, ...args) => {
      if (id === "workbench.action.chat.newChat") scope = "the Drift open at send time";
      if (id === "workbench.action.chat.open" && typeof args[0] === "object" && args[0] !== null && "query" in args[0] && typeof args[0].query === "string") query = args[0].query;
    };
    try {
      expect(await launchAgent(dir, () => `Resolve ${scope}.`, "Drifts")).toBe("sent");
      expect(query).toBe("Resolve the Drift open at send time. Run at most 20 sub-agents at once.");

      editorCalls.length = 0;
      query = "";
      commandHandler = (id) => {
        if (id === "workbench.action.chat.newChat") canDeliver = false;
      };
      expect(await launchAgent(dir, () => `Resolve ${scope}.`, "Resolve Drifts", undefined, () => canDeliver)).toBe("not-sent");
      expect(editorCalls).toEqual(["workbench.action.chat.newChat"]);
      expect(query).toBe("");
    } finally {
      commandHandler = previousHandler;
      editor.appName = previousApp;
      settingValues.agent = "omp";
    }
  });
});

describe("the agent terminal as an editor tab", () => {
  test("terminal tabs open beside the active group or the previous tab's group while it remains open", async () => {
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
      expect(created.at(-1)).toMatchObject({ name: "Scan", cwd: dir, env: { TRAMA_AGENT: "1", TRAMA_QUESTION_ENDPOINT: "endpoint", TRAMA_TERMINAL: expect.stringMatching(/^[a-z0-9]{6}$/) }, location: { viewColumn: -2, preserveFocus: true } });
      expect(terminals.at(-1)?.shown).toEqual([true]);
      // Not the agent's tab: another label, or not a terminal. Then the agent's tab, then a later one with its label.
      opened("Scan", 3, {});
      opened("Other", 3);
      opened("Scan", 2);
      opened("Scan", 3);

      await launchAgent(dir, instruction, "Scan"); // the first is busy: a new tab in its group
      expect(created.at(-1)?.location).toEqual({ viewColumn: 2, preserveFocus: true });
      opened("Scan", 2);

      tabGroups.columns = [1]; // that group is gone
      await launchAgent(dir, instruction, "Scan");
      expect(created.at(-1)?.location).toEqual({ viewColumn: -2, preserveFocus: true });
      opened("Scan", 2);

      tabGroups.columns = [1, 2];
      const free = terminals.at(-1) as FakeTerminal;
      free.exitStatus = 0; // its process ended but its tab is still open: the next tab still joins its group
      const count = created.length;
      await launchAgent(dir, instruction, "Scan");
      expect(created.at(-1)?.location).toEqual({ viewColumn: 2, preserveFocus: true });
      expect(created).toHaveLength(count + 1);
      expect(terminals.at(-1)).not.toBe(free);
      expect(free.shown).toEqual([true]);

      closeAll(); // the previous tab is closed
      await launchAgent(dir, instruction, "Scan");
      expect(created.at(-1)?.location).toEqual({ viewColumn: -2, preserveFocus: true });

      delete settingValues["terminalLocation"];
      closeAll();
      await launchAgent(dir, instruction, "Scan"); // unset means the editor tab, the default
      expect(created.at(-1)?.location).toEqual({ viewColumn: -2, preserveFocus: true });
      expect(terminals.at(-1)?.shown).toEqual([true]);
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
      expect(created.at(-1)?.location).toEqual({ viewColumn: -2, preserveFocus: true });
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
      expect(created.at(-1)?.location).toEqual({ viewColumn: -2, preserveFocus: true });

    } finally {
      delete settingValues["terminalLocation"];
      tabGroups.columns = [1];
    }
  });
});

describe("agent instruction settings", () => {
  test("the language and sub-agent limit are read at each launch", async () => {
    const { launchAgent } = await import("../extension/src/host/agent");
    const instruction = "Use the trama-scan skill on the whole System.";

    await launchAgent(dir, instruction, "Scan");
    expect(typed.at(-1)).toBe(`omp '${instruction} Run at most 20 sub-agents at once. Compare each Machine with the trama-analysis sub-agent.'`);
    settingValues["maxParallelAgents"] = 4;
    inspected["maxParallelAgents"] = { globalValue: 4, workspaceValue: 99 };
    await launchAgent(dir, instruction, "Scan");
    expect(typed.at(-1)).toBe(`omp '${instruction} Run at most 4 sub-agents at once. Compare each Machine with the trama-analysis sub-agent.'`);
    delete inspected["maxParallelAgents"];
    for (const invalid of ["", 0, -2, 1.5, "3"]) {
      settingValues["maxParallelAgents"] = invalid;
      await launchAgent(dir, instruction, "Scan");
      expect(typed.at(-1)).toBe(`omp '${instruction} Run at most 20 sub-agents at once. Compare each Machine with the trama-analysis sub-agent.'`);
    }

    settingValues["language"] = " Italian ";
    try {
      settingValues["maxParallelAgents"] = 4;
      await launchAgent(dir, instruction, "Scan");
      expect(typed.at(-1)).toBe(`omp '${instruction} Run at most 4 sub-agents at once. Compare each Machine with the trama-analysis sub-agent. Write everything you generate in Italian, except code, which always stays in English.'`);
      expect(typed.at(-1)?.split("\\n")).toHaveLength(1);

      settingValues["language"] = "English";
      await launchAgent(dir, instruction, "Scan");
      expect(typed.at(-1)).toBe(`omp '${instruction} Run at most 4 sub-agents at once. Compare each Machine with the trama-analysis sub-agent. Write everything you generate in English, except code, which always stays in English.'`);

      settingValues["language"] = "   ";
      await launchAgent(dir, instruction, "Scan");
      expect(typed.at(-1)).toBe(`omp '${instruction} Run at most 4 sub-agents at once. Compare each Machine with the trama-analysis sub-agent.'`);
    } finally {
      delete settingValues["language"];
      delete settingValues["maxParallelAgents"];
    }
  });
});

describe("choosing the agent", () => {
  test("chat is the default and legacy settings cannot redirect or configure a launch", async () => {
    const { agentName, launchAgent } = await import("../extension/src/host/agent");
    const instruction = "Use the trama-scan skill on the whole System.";
    const createdBefore = created.length;
    delete settingValues.agent;
    settingValues.agentLauncher = "terminal";
    settingValues.terminalAgent = "codex";
    settingValues.agentCommand = "custom-agent {prompt}";
    updates.length = 0;
    editorCalls.length = 0;
    try {
      expect(await launchAgent(dir, instruction, "Scan")).toBe("sent");
      expect(editorCalls).toEqual(["workbench.action.chat.newChat", "workbench.action.chat.open"]);
      expect(created).toHaveLength(createdBefore);
      expect(updates).toEqual([]);
      expect(agentName({ fromTramaTerminal: true })).toBeNull();
    } finally {
      settingValues.agent = "omp";
      for (const key of ["agentLauncher", "terminalAgent", "agentCommand"]) delete settingValues[key];
    }
  });

  test("the selected terminal agent launches without a prompt or settings migration", async () => {
    const { launchAgent } = await import("../extension/src/host/agent");
    settingValues.agent = "omp";
    settingValues.terminalAgent = "codex";
    settingValues.agentCommand = "legacy {prompt}";
    updates.length = 0;
    try {
      pick = () => {
        throw new Error("unexpected agent-selection prompt");
      };
      expect(await launchAgent(dir, "Use the trama-scan skill on the whole System.", "Scan")).toBe("terminal");
      expect(typed.at(-1)).toStartWith("omp '");
      expect(updates).toEqual([]);
    } finally {
      settingValues.agent = "omp";
      delete settingValues.terminalAgent;
      delete settingValues.agentCommand;
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
  });

  test("the chat launcher announces nothing: the ghost comes with the Draft", async () => {
    const { launchAgent } = await import("../extension/src/host/agent");
    const p = projectAt(dir);
    const before = listAnnouncements(p).length;
    settingValues.agent = "chat";
    try {
      await launchAgent(dir, "Use the trama-design skill. Another change", "Design", "Another change");
    } finally {
      settingValues.agent = "omp";
    }
    expect(listAnnouncements(p)).toHaveLength(before);
  });
});

describe("the selected chat in Cursor", () => {
  test("the chat tries self-sending, then the deeplink, then the clipboard, each once", async () => {
    const { launchAgent } = await import("../extension/src/host/agent");
    const typedBefore = typed.length;
    editor.appName = "Cursor";
    settingValues.agent = "chat";
    try {
      editorCalls.length = 0;
      commandHandler = (id) => (id === "composer.createNew" ? { composerId: "c" } : undefined);
      expect(await launchAgent(dir, "Use the trama-scan skill on the whole System.", "Scan")).toBe("sent");
      expect(editorCalls).toEqual(["composer.createNew"]);

      editorCalls.length = 0;
      commandHandler = () => undefined;
      expect(await launchAgent(dir, "Use the trama-scan skill on the whole System.", "Scan")).toBe("sent");
      expect(editorCalls).toEqual(["composer.createNew"]);
      expect(await launchAgent(dir, "Use the trama-scan skill on the Feature `checkout`.", "Scan")).toBe("sent");

      editorCalls.length = 0;
      commandHandler = () => { throw new Error("command 'composer.createNew' not found"); };
      expect(await launchAgent(dir, "Use the trama-scan skill on the whole System.", "Scan")).toBe("confirm");
      expect(editorCalls).toHaveLength(2);
      expect(editorCalls[0]).toBe("composer.createNew");
      expect(String(editorCalls[1])).toContain(`cursor://anysphere.cursor-deeplink/prompt?text=${encodeURIComponent("Use the trama-scan skill on the whole System.")}`);

      editorCalls.length = 0;
      clipboard.length = 0;
      expect(await launchAgent(dir, "Use the trama-design skill. Read .env", "Design")).toBe("clipboard");
      expect(editorCalls).toEqual(["composer.createNew"]);
      expect(clipboard).toEqual(["Use the trama-design skill. Read .env Run at most 20 sub-agents at once."]);
      expect(typed.length).toBe(typedBefore);

      editorCalls.length = 0;
      clipboard.length = 0;
      commandHandler = () => { throw new Error("command 'composer.createNew' not found"); };
      expect(await launchAgent(dir, "Use the trama-scan skill on the Feature `checkout`.", "Scan", undefined, () => true, "scan")).toBe("confirm");
      expect(editorCalls).toHaveLength(2);
      expect(String(editorCalls[1])).toContain("cursor://anysphere.cursor-deeplink/prompt?");
      editorCalls.length = 0;
      expect(await launchAgent(dir, "Use the trama-scan skill. Read .env", "Scan", undefined, () => true, "scan")).toBe("clipboard");
      expect(editorCalls).toEqual(["composer.createNew"]);
      expect(clipboard).toHaveLength(1);
    } finally {
      settingValues.agent = "omp";
      editor.appName = "Visual Studio Code";
      commandHandler = () => undefined;
    }
  });

  test("the instruction to Cursor's chat says where the shipped trama program is, and stays one line without one", async () => {
    // Dynamic, as above: the module must load after mock.module replaced "vscode".
    const { withTramaPath } = await import("../extension/src/host/cursor");
    expect(withTramaPath("Use the trama-scan skill on the whole System. Write in Italian.", "/ext/bin/trama")).toBe(
      'Use the trama-scan skill on the whole System. Write in Italian.\nThe trama command may not be on your PATH. Before anything else run: export PATH="/ext/bin:$PATH"',
    );
    expect(withTramaPath("Use the trama-scan skill on the whole System.")).toBe("Use the trama-scan skill on the whole System.");
    const platform = Object.getOwnPropertyDescriptor(process, "platform");
    try {
      Object.defineProperty(process, "platform", { value: "win32" });
      expect(withTramaPath("Use the trama-scan skill on the whole System. Write in Italian.", "C:\\ext\\bin\\trama.exe")).toBe(
        "Use the trama-scan skill on the whole System. Write in Italian.\nThe trama command may not be on your PATH. Run it by its full path: C:\\ext\\bin\\trama.exe",
      );
    } finally {
      if (platform) Object.defineProperty(process, "platform", platform);
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
      const originlessTask = moveTask(p, newTask(p, { title: "Originless", refs: ["order/Paid"], technical: false }).id, "doing", "agent").id;
      const secondTask = moveTask(p, newTask(p, { title: "Other terminal", refs: ["order/Paid"], technical: false }).id, "doing", "agent", { terminal: secondId }).id;

      listeners.close.forEach((listener) => listener(first));

      expect([firstTask, originlessTask, secondTask].map((id) => [getTask(p, id).data.column, getTask(p, id).data.agent])).toEqual([
        ["todo", false],
        ["todo", false],
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
    newProposal(p, "Real title");
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
      const draft = newProposal(p, "Initial", "", { announcement: a.id });
      const boundTouched = listAnnouncements(p)[0]?.touched;
      const file = join(p.dir, "announcements", `${a.id}.md`);
      const proposalFile = join(draft.dir, "proposal.md");
      const original = readFileSync(file, "utf8");
      const proposal = readFileSync(proposalFile, "utf8");
      writeFileSync(proposalFile, proposal.replace("# Initial", "# Updated title è"));
      synchronizeAnnouncementTitles(p);
      expect(readFileSync(file, "utf8")).toBe(original.replace("# Initial", "# Updated title è"));
      expect(listAnnouncements(p)[0]?.touched).toBe(boundTouched);

      const old = new Date(Date.now() - 60_000);
      utimesSync(file, old, old);
      expect(statSync(file).mtimeMs).toBe(old.getTime());

      writeFileSync(proposalFile, "unreadable");
      expect(readFileSync(file, "utf8")).toContain("# Planned");
      writeFileSync(proposalFile, proposal.replace("status: draft", "status: open").replace("# Initial", "# Handed over"));
      synchronizeAnnouncementTitles(p);
      expect(readFileSync(file, "utf8")).toContain("# Planned");
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

describe("the ghosts of Cursor's chat agent", () => {
  test("normal and interrupted turns withdraw chat ghosts with notice, closing withdraws silently", async () => {
    // Dynamic, as above: the modules must load after mock.module replaced "vscode".
    const { onAnnouncementsWithdrawn, watchAnnouncements } = await import("../extension/src/host/announcements");
    const { receiveCopilotHook } = await import("../extension/src/host/copilot-chat");
    const { receiveCursorHook } = await import("../extension/src/host/cursor");
    const p = projectAt(dir);
    withdrawAll(p);
    const watching = watchAnnouncements(() => undefined);
    const told: string[] = [];
    const subscription = onAnnouncementsWithdrawn((views) => told.push(...views.map((v) => v.title)));
    const hook = (h: Partial<CursorHook> & Pick<CursorHook, "hook">) => receiveCursorHook({ conversation: "t", root: dir, ...h });
    const chatGhost = (title: string) => announce(p, { kind: "task", title, chat: "cursor" });
    try {
      chatGhost("Chat");
      announce(p, { kind: "task", title: "Terminal", terminal: "ab12cd" });
      announce(p, { kind: "task", title: "Nobody's", source: "request" });
      const titles = () => listAnnouncements(p).map((a) => a.title).sort();

      hook({ hook: "stop", status: "aborted" }); // not yet a Trama conversation
      hook({ hook: "beforeSubmitPrompt", tramaPrompt: true });
      hook({ hook: "stop", status: "completed" });
      expect(titles()).toEqual(["Nobody's", "Terminal"]);
      expect(told).toEqual(["Chat"]);

      chatGhost("Interrupted");
      hook({ hook: "stop", status: "error" });
      expect(titles()).toEqual(["Nobody's", "Terminal"]);
      expect(told).toEqual(["Chat", "Interrupted"]);

      chatGhost("Closed");
      hook({ hook: "sessionEnd", reason: "user_close" });
      expect(titles()).toEqual(["Nobody's", "Terminal"]);
      chatGhost("Copilot");
      receiveCopilotHook({ hook: "UserPromptSubmit", root: dir, conversation: "copilot", tramaPrompt: true });
      receiveCopilotHook({ hook: "Stop", root: dir, conversation: "copilot" });
      expect(titles()).toEqual(["Nobody's", "Terminal"]);
      expect(told).toEqual(["Chat", "Interrupted", "Copilot"]);
    } finally {
      subscription.dispose();
      watching.dispose();
      withdrawAll(p);
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
    const { activeProjectJobs, jobAbnormalEnd } = await import("../extension/src/host/drift-resolution");
    const watching = watchAgentTerminal();
    try {
      const startRun = async (name: string) => {
        await launchAgent(dir, `Run ${name}`, name, undefined, () => true, "run");
        const terminal = terminals.at(-1) as FakeTerminal;
        listeners.start.forEach((fn) => fn(shell(terminal)));
        const job = activeProjectJobs(dir).at(-1);
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
    const { receiveCursorHook } = await import("../extension/src/host/cursor");
    const turn = (h: Partial<CursorHook> & Pick<CursorHook, "hook">, conversation: string) => receiveCursorHook({ root: dir, conversation, ...h });
    const watching = watchAgentTerminal();
    const queries: string[] = [];
    let open = ["d1"];
    settingValues.agent = "chat";
    editor.appName = "Cursor";
    commandHandler = async (id, ...args) => {
      if (id === "composer.createNew") {
        const options = args[0];
        if (options && typeof options === "object" && "partialState" in options) {
          const partialState = options.partialState;
          if (partialState && typeof partialState === "object" && "text" in partialState && typeof partialState.text === "string")
            queries.push(partialState.text);
        }
        return { composerId: "c" };
      }
    };
    const resolve = () => launchAgent(dir, () => `Resolve ${open.join(",")}`, "Resolve Drifts", undefined, () => !driftWork().resolving && !driftWork().running, "resolve");
    const run = () => launchAgent(dir, "Run", "Run", undefined, () => !driftWork().resolving, "run");
    try {
      // Double click: one agent only, and its instruction names the Drifts open when it is sent.
      const first = resolve();
      open = ["d1", "d2"];
      const second = resolve();
      expect(await Promise.all([first, second])).toEqual(["sent", "not-sent"]);
      expect(queries).toHaveLength(1);
      expect(queries[0]).toContain("Resolve d1,d2");
      expect(driftWork().resolving).toBe(true);
      turn({ hook: "beforeSubmitPrompt", tramaPrompt: true }, "c1"); // the chat starts the conversation of the job

      // A Run asked while Resolve Drifts works sends nothing.
      expect(await run()).toBeUndefined();
      turn({ hook: "stop", status: "completed" }, "c1");
      expect(driftWork()).toEqual({ resolving: false, running: false });

      // A Run and Resolve Drifts asked together: the first to send wins, the other sends nothing.
      queries.length = 0;
      const runFirst = run();
      const resolveSecond = resolve();
      expect(await Promise.all([runFirst, resolveSecond])).toEqual(["sent", "not-sent"]);
      turn({ hook: "beforeSubmitPrompt", tramaPrompt: true }, "c2");
      expect(driftWork()).toEqual({ resolving: false, running: true });
      expect(queries).toHaveLength(1);
    } finally {
      turn({ hook: "stop", status: "completed" }, "c1");
      turn({ hook: "stop", status: "completed" }, "c2");
      settingValues.agent = "omp";
      editor.appName = "Visual Studio Code";
      commandHandler = () => undefined;
      watching.dispose();
    }
  });
  test("a terminal Run waits for a pending chat Resolve Drifts delivery before checking its conditions", async () => {
    const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    const { bindCopilotChatJob, driftWork, endCopilotChatJobs } = await import("../extension/src/host/drift-resolution");
    const watching = watchAgentTerminal();
    const previousHandler = commandHandler;
    const previousApp = editor.appName;
    let releaseNewChat!: () => void;
    const newChatStarted = Promise.withResolvers<void>();
    const preparing = new Promise<void>((resolve) => { releaseNewChat = resolve; });
    let chat: Promise<unknown> | undefined;
    let run: Promise<unknown> | undefined;
    let terminalChecks = 0;
    const terminalCount = terminals.length;
    settingValues.agent = "chat";
    editor.appName = "Visual Studio Code";
    commandHandler = async (id) => {
      if (id === "workbench.action.chat.newChat") {
        newChatStarted.resolve();
        await preparing;
      }
    };
    editorCalls.length = 0;
    try {
      chat = launchAgent(dir, "Resolve Drifts", "Resolve Drifts", undefined, () => true, "resolve");
      await newChatStarted.promise;
      expect(editorCalls).toContain("workbench.action.chat.newChat");

      settingValues.agent = "omp";
      run = launchAgent(dir, "Run", "Run", undefined, () => {
        terminalChecks++;
        return !driftWork().resolving;
      }, "run");
      await Promise.resolve();
      expect(terminalChecks).toBe(0);

      releaseNewChat();
      expect(await chat).toBe("sent");
      expect(driftWork().resolving).toBe(true);
      expect(await run).toBeUndefined();
      expect(terminalChecks).toBe(1);
      expect(terminals).toHaveLength(terminalCount);
    } finally {
      releaseNewChat();
      await chat?.catch(() => undefined);
      await run?.catch(() => undefined);
      for (const terminal of terminals.slice(terminalCount)) listeners.close.forEach((fn) => fn(terminal));
      bindCopilotChatJob(dir, "cross-destination");
      endCopilotChatJobs(dir, "cross-destination");
      settingValues.agent = "omp";
      editor.appName = previousApp;
      commandHandler = previousHandler;
      watching.dispose();
    }
  });
  test("a chat Resolve Drifts waits for a pending terminal Run delivery before checking its conditions", async () => {
    const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    const { driftWork } = await import("../extension/src/host/drift-resolution");
    const watching = watchAgentTerminal();
    const previousApp = editor.appName;
    const previousHandler = commandHandler;
    const previousQuestionEndpoint = questionEndpoint;
    const waiting = Promise.withResolvers<void>();
    const delivery = Promise.withResolvers<string>();
    const terminalCount = terminals.length;
    let run: Promise<unknown> | undefined;
    let resolve: Promise<unknown> | undefined;
    questionEndpoint = () => {
      waiting.resolve();
      return delivery.promise;
    };
    settingValues.agent = "omp";
    editorCalls.length = 0;
    try {
      run = launchAgent(dir, "Run", "Run", undefined, () => !driftWork().resolving, "run");
      await waiting.promise;

      settingValues.agent = "chat";
      editor.appName = "Visual Studio Code";
      resolve = launchAgent(dir, "Resolve Drifts", "Resolve Drifts", undefined, () => !driftWork().resolving && !driftWork().running, "resolve");
      await Promise.resolve();
      expect(editorCalls).not.toContain("workbench.action.chat.newChat");

      delivery.resolve("endpoint");
      expect(await run).toBe("terminal");
      expect(driftWork()).toEqual({ resolving: false, running: true });
      expect(await resolve).toBe("not-sent");
      expect(editorCalls).not.toContain("workbench.action.chat.newChat");
    } finally {
      delivery.resolve("endpoint");
      await run?.catch(() => undefined);
      await resolve?.catch(() => undefined);
      for (const terminal of terminals.slice(terminalCount)) listeners.close.forEach((fn) => fn(terminal));
      settingValues.agent = "omp";
      editor.appName = previousApp;
      questionEndpoint = previousQuestionEndpoint;
      commandHandler = previousHandler;
      watching.dispose();
    }
  });

  test("a job in Cursor's chat begins only when the chat sends it by itself and ends with the first turn end, interruption or closing that follows", async () => {
    // Dynamic, as above: the modules must load after mock.module replaced "vscode".
    const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    const { receiveCursorHook } = await import("../extension/src/host/cursor");
    const { driftWork } = await import("../extension/src/host/drift-resolution");
    const watching = watchAgentTerminal();
    let conversation = "";
    let loops = 0;
    const hook = (h: Partial<CursorHook> & Pick<CursorHook, "hook">) => receiveCursorHook({ root: dir, conversation, ...h });
    editor.appName = "Cursor";
    settingValues.agent = "chat";
    try {
      commandHandler = () => { throw new Error("command 'composer.createNew' not found"); };
      expect(await launchAgent(dir, "Run", "Run", undefined, () => true, "run")).toBe("confirm");
      clipboard.length = 0;
      expect(await launchAgent(dir, "Read .env", "Run", undefined, () => true, "run")).toBe("clipboard");
      expect(driftWork()).toEqual({ resolving: false, running: false });

      commandHandler = () => undefined;
      for (const end of [{ hook: "stop", status: "completed" }, { hook: "stop", status: "error" }, { hook: "sessionEnd", reason: "window_close" }] as const) {
        conversation = `j${loops++}`; // each job's chat is a new conversation
        expect(await launchAgent(dir, "Resolve", "Resolve Drifts", undefined, () => true, "resolve")).toBe("sent");
        hook({ hook: "beforeSubmitPrompt", tramaPrompt: true });
        expect(driftWork().resolving).toBe(true);
        hook({ hook: "stop", status: "completed", conversation: "not-trama" });
        expect(driftWork().resolving).toBe(true);
        hook(end);
        expect(driftWork()).toEqual({ resolving: false, running: false });
      }
    } finally {
      editor.appName = "Visual Studio Code";
      commandHandler = () => undefined;
      watching.dispose();
    }
  });

  test("a Cursor chat job binds only the conversation that starts after its send: a later prompt of a conversation already seen takes no job, and a first prompt that arrives just before its job waits for it", async () => {
    // Dynamic, as above: the modules must load after mock.module replaced "vscode".
    const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    const { receiveCursorHook } = await import("../extension/src/host/cursor");
    const { driftWork } = await import("../extension/src/host/drift-resolution");
    const watching = watchAgentTerminal();
    const turn = (h: Partial<CursorHook> & Pick<CursorHook, "hook">, conversation: string) => receiveCursorHook({ root: dir, conversation, ...h });
    const run = () => launchAgent(dir, "Run", "Run", undefined, () => true, "run");
    const resolve = () => launchAgent(dir, "Resolve", "Resolve Drifts", undefined, () => true, "resolve");
    settingValues.agent = "chat";
    editor.appName = "Cursor";
    let startComposer: () => void = () => {};
    let finishComposer: () => void = () => {};
    const composerStarted = new Promise<void>((resolve) => { startComposer = resolve; });
    const composerRelease = new Promise<void>((resolve) => { finishComposer = resolve; });
    commandHandler = async (id) => {
      if (id === "composer.createNew") {
        startComposer();
        await composerRelease;
      }
    };
    try {
      // The prompt arrives after sending starts but before the chat job is registered.
      const sending = run();
      await composerStarted;
      turn({ hook: "beforeSubmitPrompt", tramaPrompt: true }, "early");
      finishComposer();
      expect(await sending).toBe("sent");
      turn({ hook: "stop", status: "completed" }, "early");
      expect(driftWork()).toEqual({ resolving: false, running: false });

      // A later prompt of a conversation already seen takes no job: the next new conversation does.
      expect(await resolve()).toBe("sent");
      turn({ hook: "beforeSubmitPrompt", tramaPrompt: true }, "p");
      expect(await run()).toBe("sent");
      turn({ hook: "beforeSubmitPrompt", tramaPrompt: true }, "p");
      turn({ hook: "stop", status: "completed" }, "p");
      expect(driftWork()).toEqual({ resolving: false, running: true });
      turn({ hook: "beforeSubmitPrompt", tramaPrompt: true }, "q");
      turn({ hook: "stop", status: "completed" }, "q");
      expect(driftWork()).toEqual({ resolving: false, running: false });
    } finally {
      for (const c of ["early", "p", "q"]) turn({ hook: "sessionEnd", reason: "window_close" }, c);
      settingValues.agent = "omp";
      editor.appName = "Visual Studio Code";
      commandHandler = () => undefined;
      watching.dispose();
    }
  });

  test("a chat job ends only with the turn of its own Trama conversation: another conversation's end, interruption or closing leaves it running", async () => {
    // Dynamic, as above: the modules must load after mock.module replaced "vscode".
    const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    const { receiveCursorHook } = await import("../extension/src/host/cursor");
    const { driftWork } = await import("../extension/src/host/drift-resolution");
    const watching = watchAgentTerminal();
    const turn = (h: Partial<CursorHook> & Pick<CursorHook, "hook">, conversation: string) => receiveCursorHook({ root: dir, conversation, ...h });
    const run = () => launchAgent(dir, "Run", "Run", undefined, () => true, "run");
    const resolve = () => launchAgent(dir, "Resolve", "Resolve Drifts", undefined, () => true, "resolve");
    const conversations: string[] = [];
    settingValues.agent = "chat";
    editor.appName = "Cursor";
    commandHandler = () => undefined;
    const ends = [{ hook: "stop", status: "completed" }, { hook: "stop", status: "aborted" }, { hook: "sessionEnd", reason: "user_close" }] as const;
    try {
      // Two Runs, each in its own conversation: the end of one of them leaves the other running.
      for (const [i, end] of ends.entries()) {
        const [first, second] = [`${i}a`, `${i}b`];
        conversations.push(first, second);
        expect(await run()).toBe("sent");
        turn({ hook: "beforeSubmitPrompt", tramaPrompt: true }, first);
        expect(await run()).toBe("sent");
        turn({ hook: "beforeSubmitPrompt", tramaPrompt: true }, second);
        expect(driftWork()).toEqual({ resolving: false, running: true });
        turn({ hook: "stop", status: "completed" }, "not-trama");
        turn(end, first);
        expect(driftWork()).toEqual({ resolving: false, running: true });
        turn(end, second);
        expect(driftWork()).toEqual({ resolving: false, running: false });
      }

      // Resolve Drifts keeps working when a Run's conversation ends, and ends only with its own.
      conversations.push("r", "u");
      expect(await resolve()).toBe("sent");
      turn({ hook: "beforeSubmitPrompt", tramaPrompt: true }, "r");
      expect(await run()).toBe("sent");
      turn({ hook: "beforeSubmitPrompt", tramaPrompt: true }, "u");
      expect(driftWork().resolving).toBe(true);
      turn({ hook: "stop", status: "completed" }, "u");
      expect(driftWork().resolving).toBe(true);
      turn({ hook: "stop", status: "error" }, "r");
      expect(driftWork()).toEqual({ resolving: false, running: false });
    } finally {
      for (const c of conversations) turn({ hook: "sessionEnd", reason: "window_close" }, c);
      settingValues.agent = "omp";
      editor.appName = "Visual Studio Code";
      commandHandler = () => undefined;
      watching.dispose();
    }
  });

  test("a chat job ignores prompts from chat preparation and binds only the first prompt after delivery starts", async () => {
    const { bindChatJob, chatJobSendStarted, driftWork, endChatJobs, startJob } = await import("../extension/src/host/drift-resolution");
    try {
      bindChatJob(dir, "scan-before-send");
      const sentAfter = chatJobSendStarted(dir, "cursor");
      startJob("run", dir, { chat: "cursor" }, true, sentAfter);
      expect(driftWork()).toEqual({ resolving: false, running: true });
      bindChatJob(dir, "run-own");
      endChatJobs(dir, "scan-before-send");
      expect(driftWork()).toEqual({ resolving: false, running: true });
      endChatJobs(dir, "run-own");
      expect(driftWork()).toEqual({ resolving: false, running: false });
    } finally {
      endChatJobs(dir, "scan-before-send");
      endChatJobs(dir, "run-own");
    }
  });
  test("chat jobs without an observable conversation stay active until an end event", async () => {
    const { bindChatJob, driftWork, endChatJobs, startJob } = await import("../extension/src/host/drift-resolution");
    const project = join(dir, crypto.randomUUID());
    startJob("run", project, { chat: "cursor" }, true);
    expect(driftWork()).toEqual({ resolving: false, running: true });
    bindChatJob(project, "bound-conversation");
    expect(driftWork()).toEqual({ resolving: false, running: true });
    endChatJobs(project, "bound-conversation");
    expect(driftWork()).toEqual({ resolving: false, running: false });
  });

  test("terminal jobs without an observable end stay active until the terminal closes", async () => {
    const { driftWork, endTerminalJobs, setHooked, startJob } = await import("../extension/src/host/drift-resolution");
    startJob("run", dir, { terminal: "aaaaaa" }, false);
    startJob("resolve", dir, { terminal: "bbbbbb" }, true);
    setHooked("bbbbbb", true);
    expect(driftWork().resolving).toBe(true);
    endTerminalJobs("aaaaaa");
    expect(driftWork().resolving).toBe(true);
    endTerminalJobs("bbbbbb");
    setHooked("bbbbbb", false);
    expect(driftWork()).toEqual({ resolving: false, running: false });
  });
});
  test("Copilot jobs bind after new-chat preparation and retain their own end before send returns", async () => {
    const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    const { receiveCopilotHook } = await import("../extension/src/host/copilot-chat");
    const { driftWork } = await import("../extension/src/host/drift-resolution");
    const previousHandler = commandHandler;
    const previousApp = editor.appName;
    let preparation = "copilot-preparation";
    let owner = "copilot-owner";
    let stopOwnerDuringDelivery = false;
    const hook = (event: "UserPromptSubmit" | "Stop", conversation: string) => receiveCopilotHook({
      hook: event, root: dir, conversation, ...(event === "UserPromptSubmit" ? { tramaPrompt: true } : {}),
    });
    const watching = watchAgentTerminal();
    settingValues.agent = "chat";
    editor.appName = "Visual Studio Code";
    commandHandler = (id) => {
      if (id === "workbench.action.chat.newChat") hook("UserPromptSubmit", preparation);
      if (id === "workbench.action.chat.open") {
        hook("UserPromptSubmit", owner);
        if (stopOwnerDuringDelivery) hook("Stop", owner);
      }
    };
    try {
      expect(await launchAgent(dir, "Run", "Run", undefined, () => true, "run")).toBe("sent");
      expect(driftWork()).toEqual({ resolving: false, running: true });
      hook("Stop", preparation);
      expect(driftWork()).toEqual({ resolving: false, running: true });
      hook("Stop", owner);
      expect(driftWork()).toEqual({ resolving: false, running: false });

      preparation = "copilot-preparation-ended";
      owner = "copilot-finished-during-delivery";
      stopOwnerDuringDelivery = true;
      expect(await launchAgent(dir, "Resolve", "Resolve Drifts", undefined, () => true, "resolve")).toBe("sent");
      expect(driftWork()).toEqual({ resolving: false, running: false });
    } finally {
      for (const conversation of [preparation, owner, "copilot-preparation", "copilot-owner"])
        hook("Stop", conversation);
      settingValues.agent = "omp";
      editor.appName = previousApp;
      commandHandler = previousHandler;
      watching.dispose();
    }
  });
test("Copilot chat releases only originless Tasks at each recognized turn end", async () => {
  const { watchAgentTerminal } = await import("../extension/src/host/agent");
  const { receiveCopilotHook } = await import("../extension/src/host/copilot-chat");
  const p = projectAt(dir);
  const watching = watchAgentTerminal();
  const hook = (event: "UserPromptSubmit" | "Stop", tramaPrompt?: boolean) => receiveCopilotHook({
    hook: event, root: dir, conversation: "copilot-session",
    ...(event === "UserPromptSubmit" ? { tramaPrompt: tramaPrompt === true } : {}),
  });
  const take = (title: string, origin = {}) => {
    const task = newTask(p, { title, refs: ["order/Paid"], technical: false });
    moveTask(p, task.id, "doing", "agent", origin);
    return task.id;
  };
  const state = (id: string) => [getTask(p, id).data.column, getTask(p, id).data.agent];
  try {
    const unknown = take("Copilot unknown");
    const cursor = take("Cursor holder", { chat: "cursor" });
    const terminal = take("Terminal holder", { terminal: "known-terminal" });
    hook("Stop");
    expect([unknown, cursor, terminal].map(state)).toEqual([["doing", true], ["doing", true], ["doing", true]]);
    hook("UserPromptSubmit", true);
    hook("Stop");
    expect([unknown, cursor, terminal].map(state)).toEqual([["todo", false], ["doing", true], ["doing", true]]);

    const nextTurn = take("Next Copilot turn");
    hook("UserPromptSubmit", false);
    hook("Stop");
    expect(state(nextTurn)).toEqual(["todo", false]);
  } finally {
    watching.dispose();
  }
});
