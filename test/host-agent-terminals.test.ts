import { afterAll, beforeAll, describe, expect, mock, spyOn, test, vi } from "bun:test";
import { basename, join, relative, isAbsolute } from "node:path";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { setTimeout as delay } from "node:timers/promises";
import { announce, listAnnouncements, withdrawAll } from "../src/core/announcements";
import type { CursorHook } from "../src/core/cursor-chat";
import { newProposal } from "../src/core/proposals";
import { handOver } from "./handover";
import { projectAt } from "../src/core/store";
import { getTask, moveTask, newTask } from "../src/core/work";
import { syncRequirementSkills } from "../src/core/requirement-skills";

// A minimal editor: just the terminal events and the calls launchAgent makes.
type Listener<T> = (event: T) => void;
interface FakeTerminal {
  exitStatus: undefined;
  shellIntegration: object;
  /** The last command line typed into it. */
  line: string;
  /** Whether each `show` kept the focus where it was. */
  shown: (boolean | undefined)[];
  show(preserveFocus?: boolean): void;
  sendText(text: string): void;
}
interface ShellEvent {
  terminal: FakeTerminal;
  execution: { commandLine: { value: string } };
}
/** A tab the editor opened: a terminal tab with its label and the column of its group. */
interface TabChange {
  opened: { input: unknown; label: string; group: { viewColumn: number } }[];
}
const listeners: { start: Listener<ShellEvent>[]; end: Listener<ShellEvent>[]; close: Listener<FakeTerminal>[]; tabs: Listener<TabChange>[] } = { start: [], end: [], close: [], tabs: [] };
class TabInputTerminal {}
/** What the editor reports about a command in `terminal`: by default the line Trama typed into it. */
const shell = (terminal: FakeTerminal, commandLine = terminal.line): ShellEvent => ({ terminal, execution: { commandLine: { value: commandLine } } });
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
const settingValues: Record<string, unknown> = {};
/** The editor's name: "Cursor" makes the extension behave as in Cursor. */
const editor = { appName: "Visual Studio Code" };
/** What the fake editor does with a command: by default nothing; a test may make it fail or return a value. */
let commandHandler: (id: string, ...args: unknown[]) => unknown = () => undefined;
/** Every command run and every link opened externally, in order. */
const editorCalls: string[] = [];
const clipboard: string[] = [];
/** What the developer picks in a list or types in an input box; undefined is Esc. */
let pick: (items: { label: string; description?: string }[], options: { title?: string }) => unknown = () => undefined;
let typeIn: () => string | undefined = () => undefined;

/** Wait for the external marker watcher to finish the observable state change. */
async function waitUntil(done: () => boolean): Promise<void> {
  const deadline = Date.now() + 2_000;
  while (!done()) {
    if (Date.now() >= deadline) throw new Error("External terminal state did not settle.");
    await delay(5);
  }
}
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
        show(preserveFocus?: boolean) {
          this.shown.push(preserveFocus);
        },
        sendText(text: string) {
          this.line = text;
          typed.push(text);
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
      get: (key: string, fallback: unknown) => (key in settingValues ? settingValues[key] : key === "agentCommand" ? "agent {prompt}" : fallback),
      inspect: (key: string) => inspected[key],
      update: async (key: string, value: unknown) => void updates.push({ key, value }),
    }),
    createFileSystemWatcher: (pattern: string) => pattern === "**/.trama/requirements/**"
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
    clipboard: { writeText: async (text: string) => void clipboard.push(text) },
    openExternal: async (uri: { toString(): string }) => (editorCalls.push(uri.toString()), true),
  },
  Disposable: class {
    constructor(readonly dispose: () => void) {}
    static from(...items: unknown[]) { return { dispose() { void items; } }; }
  },
  ConfigurationTarget: { Global: 1 },
  extensions: { getExtension: () => undefined },
}));
mock.module("../extension/src/host/questions", () => ({ questionEndpoint: async () => "endpoint", EditorQuestions: class {} }));

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
  test("each new terminal has its own ID, the design request's ghost belongs to it, and a reused terminal keeps it", async () => {
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
    listeners.end.forEach((fn) => fn(shell(second))); // its command ended: free to reuse
    const created = terminals.length;
    await launchAgent(dir, "Use the trama-design skill. Three", "Design", "Three");
    expect(terminals).toHaveLength(created);
    expect(listAnnouncements(p).map((a) => [a.title, a.terminal])).toEqual([["Three", secondId]]);
    withdrawAll(p);
  });

  test("a free terminal is reused only for an instruction with the same name; another name opens a terminal of its own", async () => {
    // Dynamic: the module must load after mock.module replaced "vscode".
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
    expect(terminals).toHaveLength(count);
  });
});

describe("the agent terminal as an editor tab", () => {
  test("terminal-tab opens beside the active group without the focus, then in the group where the previous tab opened while it and its group exist", async () => {
    // Dynamic: the module must load after mock.module replaced "vscode".
    const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    watchAgentTerminal();
    const instruction = "Use the trama-scan skill on the whole System.";
    const closeAll = () => terminals.forEach((t) => listeners.close.forEach((fn) => fn(t)));
    /** The editor reports that a tab opened in `viewColumn`, labelled `label`. */
    const opened = (label: string, viewColumn: number, input: unknown = new TabInputTerminal()) =>
      listeners.tabs.forEach((fn) => fn({ opened: [{ input, label, group: { viewColumn } }] }));
    closeAll(); // no earlier terminal to reuse
    settingValues["agentLauncher"] = "terminal-tab";
    tabGroups.columns = [1, 2, 3];
    try {
      await launchAgent(dir, instruction, "Scan");
      expect(created.at(-1)).toMatchObject({ name: "Scan", cwd: dir, env: { TRAMA_AGENT: "1" }, location: { viewColumn: -2, preserveFocus: true } });
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
      listeners.end.forEach((fn) => fn(shell(free))); // free: reused without the focus, no new tab
      const count = created.length;
      await launchAgent(dir, instruction, "Scan");
      expect(created).toHaveLength(count);
      expect(free.shown).toEqual([true, true]);

      closeAll(); // the previous tab is closed
      await launchAgent(dir, instruction, "Scan");
      expect(created.at(-1)?.location).toEqual({ viewColumn: -2, preserveFocus: true });

      delete settingValues["agentLauncher"];
      closeAll();
      await launchAgent(dir, instruction, "Scan"); // the plain terminal stays in the terminal area and is never shown
      expect(created.at(-1)?.location).toBeUndefined();
      expect(terminals.at(-1)?.shown).toEqual([]);
    } finally {
      delete settingValues["agentLauncher"];
      tabGroups.columns = [1];
    }
  });

  test("a free terminal is reused only in the selected location, including auto outside Cursor", async () => {
    // Load after mock.module installs the editor API.
    const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    watchAgentTerminal();
    terminals.forEach((terminal) => listeners.close.forEach((fn) => fn(terminal)));
    const instruction = "Use the trama-scan skill on the whole System.";
    settingValues["agentLauncher"] = "terminal";
    tabGroups.columns = [1, 2];
    try {
      await launchAgent(dir, instruction, "Scan");
      const area = terminals.at(-1) as FakeTerminal;
      listeners.end.forEach((fn) => fn(shell(area)));
      settingValues["agentLauncher"] = "terminal-tab";
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
      expect(terminals.at(-1)).toBe(tab);
      expect(environments.at(-1)?.["TRAMA_TERMINAL"]).toBe(tabId);
      expect(tab.shown).toEqual([true, true]);

      listeners.end.forEach((fn) => fn(shell(tab)));
      settingValues["agentLauncher"] = "auto";
      await launchAgent(dir, instruction, "Scan");
      const nextArea = terminals.at(-1) as FakeTerminal;
      expect(nextArea).not.toBe(tab);
      expect(created.at(-1)?.location).toBeUndefined();
      expect(nextArea.shown).toEqual([]);
      listeners.end.forEach((fn) => fn(shell(nextArea)));
      settingValues["agentLauncher"] = "terminal";
      await launchAgent(dir, instruction, "Scan");
      expect(terminals.at(-1)).toBe(nextArea);
      expect(nextArea.shown).toEqual([]); // reused, still not shown

      listeners.end.forEach((fn) => fn(shell(nextArea)));
      settingValues["agentLauncher"] = "terminal-tab";
      await launchAgent(dir, instruction, "Scan");
      expect(created.at(-1)?.location).toEqual({ viewColumn: 2, preserveFocus: true });
    } finally {
      delete settingValues["agentLauncher"];
      tabGroups.columns = [1];
    }
  });
});

describe("the language the agent writes in", () => {
  test("the setting is read at each launch; blank adds nothing", async () => {
    // Dynamic: the module must load after mock.module replaced "vscode".
    const { launchAgent } = await import("../extension/src/host/agent");
    const instruction = "Use the trama-scan skill on the whole System.";

    await launchAgent(dir, instruction, "Scan");
    expect(typed.at(-1)).not.toContain("Write everything");

    settingValues["language"] = " Italian ";
    try {
      await launchAgent(dir, instruction, "Scan");
      expect(typed.at(-1)).toContain(`${instruction} Write everything you generate in Italian, except code, which always stays in English.`);
      expect(typed.at(-1)?.split("\n")).toHaveLength(1);

      settingValues["language"] = "   ";
      await launchAgent(dir, instruction, "Scan");
      expect(typed.at(-1)).not.toContain("Write everything");
    } finally {
      delete settingValues["language"];
    }
  });
});

describe("choosing the terminal agent", () => {
  test("with no agent and no command the developer chooses once; Esc sends nothing; an existing command is custom and asks nothing", async () => {
    // Dynamic, as above: the module must load after mock.module replaced "vscode".
    const { agentReady, configuredTerminalAgent, launchAgent } = await import("../extension/src/host/agent");
    const instruction = "Use the trama-scan skill on the whole System.";
    const shown: string[] = [];
    settingValues["agentCommand"] = "";
    settingValues["terminalAgent"] = "";
    updates.length = 0;
    try {
      expect(configuredTerminalAgent()).toBeUndefined();
      expect(agentReady()).toBe(false); // no automatic scan without an agent

      const typedBefore = typed.length;
      pick = (items, options) => void shown.push(options.title ?? "", ...items.map((i) => `${i.label}|${i.description ?? ""}`));
      expect(await launchAgent(dir, instruction, "Scan")).toBeUndefined();
      expect(typed.length).toBe(typedBefore);
      expect(updates).toEqual([]);
      expect(shown).toEqual(["Choose the agent Trama starts in the terminal", "omp|omp", "Claude Code|claude", "Codex|codex", "Copilot CLI|copilot -i", "Cursor CLI|agent", "Other command…|"]);

      // Other command… then Esc on the command: nothing sent, nothing saved.
      pick = (items) => items.at(-1);
      typeIn = () => undefined;
      expect(await launchAgent(dir, instruction, "Scan")).toBeUndefined();
      expect(updates).toEqual([]);

      typeIn = () => " my-agent {prompt} ";
      expect(await launchAgent(dir, instruction, "Scan")).toBe("terminal");
      expect(updates).toEqual([{ key: "agentCommand", value: "my-agent {prompt}" }, { key: "terminalAgent", value: "custom" }]);
      expect(typed.at(-1)).toStartWith("my-agent '");

      updates.length = 0;
      pick = (items) => items.find((i) => i.label === "Copilot CLI");
      listeners.end.forEach((fn) => fn(shell(terminals.at(-1) as FakeTerminal)));
      expect(await launchAgent(dir, instruction, "Scan")).toBe("terminal");
      expect(updates).toEqual([{ key: "terminalAgent", value: "copilot" }]);
      expect(typed.at(-1)).toStartWith("copilot -i '");

      // Chosen: no question, ready for the automatic scan.
      settingValues["terminalAgent"] = "claude";
      pick = () => {
        throw new Error("asked again");
      };
      expect(agentReady()).toBe(true);
      listeners.end.forEach((fn) => fn(shell(terminals.at(-1) as FakeTerminal)));
      await launchAgent(dir, "Use the trama-design skill. X", "Design");
      expect(typed.at(-1)).toBe("claude 'Use the trama-design skill. X'");

      // A scan on its role's model, with the sub-agents sentence before the language sentence; the chat gets neither.
      settingValues["scan"] = " sonnet ";
      settingValues["language"] = "Italian";
      listeners.end.forEach((fn) => fn(shell(terminals.at(-1) as FakeTerminal)));
      await launchAgent(dir, instruction, "Scan");
      expect(typed.at(-1)).toStartWith("claude --model 'sonnet' --agents '{");
      expect(typed.at(-1)).toEndWith(`'${instruction} Triage each Machine with the trama-triage sub-agent and analyse every Machine in conflict with the trama-analysis sub-agent. Write everything you generate in Italian, except code, which always stays in English.'`);
      settingValues["agentLauncher"] = "chat";
      clipboard.length = 0;
      commandHandler = () => {
        throw new Error("no chat"); // the prompt goes to the clipboard, where the test reads it
      };
      await launchAgent(dir, instruction, "Scan");
      commandHandler = () => undefined;
      expect(clipboard.at(-1)).toBe(`${instruction} Write everything you generate in Italian, except code, which always stays in English.`);
      delete settingValues["agentLauncher"];

      // An existing command and no agent chosen: custom, no choice.
      settingValues["terminalAgent"] = "";
      settingValues["agentCommand"] = "codex {prompt}";
      expect(configuredTerminalAgent()).toBe("custom");
      expect(agentReady()).toBe(true);

      // custom chosen but no command yet: the command is asked, so no automatic scan.
      settingValues["terminalAgent"] = "custom";
      settingValues["agentCommand"] = "";
      expect(agentReady()).toBe(false);
    } finally {
      for (const key of ["agentCommand", "terminalAgent", "agentLauncher", "scan", "language"]) delete settingValues[key];
      pick = () => undefined;
      typeIn = () => undefined;
      updates.length = 0;
    }
  });

  test("the chat tells once, for all projects, that model roles apply only to terminal agents, and only when a role is set", async () => {
    // Dynamic, as above: the module must load after mock.module replaced "vscode".
    const { launchAgent, useGlobalState } = await import("../extension/src/host/agent");
    const vscode = await import("vscode");
    const state = new Map<string, unknown>();
    useGlobalState({ get: (key: string) => state.get(key), update: async (key: string, value: unknown) => void state.set(key, value), keys: () => [...state.keys()] } as never);
    const info = spyOn(vscode.window, "showInformationMessage").mockImplementation(() => Promise.resolve(undefined) as never);
    settingValues["agentLauncher"] = "chat";
    try {
      await launchAgent(dir, "Use the trama-scan skill on the whole System.", "Scan");
      expect(info).not.toHaveBeenCalled(); // no role set
      settingValues["execution"] = "haiku";
      await launchAgent(dir, "Use the trama-scan skill on the whole System.", "Scan");
      await launchAgent(dir, "Use the trama-design skill. X", "Design");
      expect(info.mock.calls.map((call) => call[0])).toEqual(["Trama: model roles (trama.analysis, trama.scan, trama.execution) apply only to terminal agents. The chat uses the model chosen in the chat."]);
      expect(state.get("trama.chatModelRolesNoticeShown")).toBe(true);
    } finally {
      info.mockRestore();
      delete settingValues["agentLauncher"];
      delete settingValues["execution"];
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
    settingValues["agentLauncher"] = "chat";
    try {
      await launchAgent(dir, "Use the trama-design skill. Another change", "Design", "Another change");
    } finally {
      delete settingValues["agentLauncher"];
    }
    expect(listAnnouncements(p)).toHaveLength(before);
  });
});

describe("the launcher in Cursor", () => {
  test("auto is the chat in Cursor, which tries a self-sending chat, then the deeplink, then the clipboard, each once", async () => {
    // Dynamic, as above: the module must load after mock.module replaced "vscode".
    const { agentLauncher, launchAgent } = await import("../extension/src/host/agent");
    const typedBefore = typed.length;
    expect(agentLauncher()).toBe("terminal");
    editor.appName = "Cursor";
    try {
      expect(agentLauncher()).toBe("chat");
      settingValues["agentLauncher"] = "terminal";
      expect(agentLauncher()).toBe("terminal");
      delete settingValues["agentLauncher"];
      // Chosen by hand, the external terminal and the editor tab win even in Cursor; auto never picks them.
      settingValues["agentLauncher"] = "terminal-tab";
      expect(agentLauncher()).toBe("terminal-tab");
      settingValues["agentLauncher"] = "external-terminal";
      expect(agentLauncher()).toBe("external-terminal");
      delete settingValues["agentLauncher"];

      editorCalls.length = 0;
      commandHandler = (id) => (id === "composer.createNew" ? { composerId: "c" } : undefined);
      expect(await launchAgent(dir, "Use the trama-scan skill on the whole System.", "Scan")).toBe("sent");
      expect(editorCalls).toEqual(["composer.createNew"]);

      // Cursor's command returns nothing even when it created and sent the chat: only an error moves to the deeplink.
      editorCalls.length = 0;
      commandHandler = () => undefined;
      expect(await launchAgent(dir, "Use the trama-scan skill on the whole System.", "Scan")).toBe("sent");
      expect(editorCalls).toEqual(["composer.createNew"]);
      expect(await launchAgent(dir, "Use the trama-scan skill on the Feature `checkout`.", "Scan", undefined, true)).toBe("sent");

      editorCalls.length = 0;
      commandHandler = () => { throw new Error("command 'composer.createNew' not found"); };
      expect(await launchAgent(dir, "Use the trama-scan skill on the whole System.", "Scan")).toBe("confirm");
      expect(editorCalls).toEqual(["composer.createNew", `cursor://anysphere.cursor-deeplink/prompt?text=${encodeURIComponent("Use the trama-scan skill on the whole System.")}&workspace=${encodeURIComponent(basename(dir))}&mode=agent`]);

      editorCalls.length = 0;
      clipboard.length = 0;
      expect(await launchAgent(dir, "Use the trama-design skill. Read .env", "Scan")).toBe("clipboard");
      expect(editorCalls).toEqual(["composer.createNew"]);
      expect(clipboard).toEqual(["Use the trama-design skill. Read .env"]);
      expect(typed.length).toBe(typedBefore);

      // The automatic scan: only a chat that sends by itself, never a chat left waiting nor the clipboard.
      editorCalls.length = 0;
      clipboard.length = 0;
      expect(await launchAgent(dir, "Use the trama-scan skill on the Feature `checkout`.", "Scan", undefined, true)).toBe("not-sent");
      expect(editorCalls).toEqual(["composer.createNew"]);
      expect(clipboard).toEqual([]);
    } finally {
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

    announce(p, { kind: "drift", title: "A Drift", terminal: id });
    listeners.close.forEach((fn) => fn(terminal));
    expect(listAnnouncements(p)).toEqual([]);
    expect(told[1]).toEqual(["drift:A Drift"]);

    // A terminal Trama did not start ends nothing.
    announce(p, { kind: "drift", title: "Not ours", terminal: id });
    listeners.close.forEach((fn) => fn({ ...terminal }));
    listeners.end.forEach((fn) => fn(shell({ ...terminal })));
    expect(listAnnouncements(p)).toHaveLength(1);
    subscription.dispose();
    withdrawAll(p);
  });

  test("only the announcements of the terminal that ended or closed go; those of another terminal and of none stay", async () => {
    const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    const p = projectAt(dir);
    watchAgentTerminal();
    withdrawAll(p);

    await launchAgent(dir, "Use the trama-design skill. One", "Design", "One");
    const first = terminals.at(-1) as FakeTerminal;
    const firstId = environments.at(-1)?.["TRAMA_TERMINAL"] as string;
    await launchAgent(dir, "Use the trama-design skill. Two", "Design", "Two");
    const second = terminals.at(-1) as FakeTerminal;
    const secondId = environments.at(-1)?.["TRAMA_TERMINAL"] as string;
    announce(p, { kind: "task", title: "Nobody's" });
    const waiting = () => listAnnouncements(p).map((a) => [a.title, a.terminal]);

    listeners.end.forEach((fn) => fn(shell(first)));
    expect(waiting()).toEqual([["Two", secondId], ["Nobody's", null]]);

    listeners.close.forEach((fn) => fn(second));
    expect(waiting()).toEqual([["Nobody's", null]]);
    expect(firstId).not.toBe(secondId);
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
  test("updates only the H1, preserves inactivity, skips unreadable or non-Draft proposals and never restores a withdrawn ghost", async () => {
    // The editor mock must replace vscode before this host module loads.
    const { watchAnnouncements } = await import("../extension/src/host/announcements");
    const root = mkdtempSync(join(tmpdir(), "trama-writing-"));
    cpSync(join(import.meta.dir, "../examples/shop"), root, { recursive: true });
    const p = projectAt(root);
    vi.useFakeTimers();
    const watching = watchAnnouncements(() => root);
    try {
      const a = announce(p, { kind: "proposal", title: "Planned", source: "request", terminal: "ab12cd" });
      const draft = newProposal(p, "Initial", "", { announcement: a.id });
      const file = join(p.dir, "announcements", `${a.id}.md`);
      const proposalFile = join(draft.dir, "proposal.md");
      const original = readFileSync(file, "utf8");
      const proposal = readFileSync(proposalFile, "utf8");
      writeFileSync(proposalFile, proposal.replace("# Initial", "# Updated title è"));
      vi.advanceTimersByTime(30_000);
      expect(readFileSync(file, "utf8")).toBe(original.replace("# Initial", "# Updated title è"));
      expect(listAnnouncements(p)[0]?.touched).toBe(a.touched);

      const old = new Date(Date.now() - 60_000);
      utimesSync(file, old, old);
      vi.advanceTimersByTime(30_000);
      expect(statSync(file).mtimeMs).toBe(old.getTime());

      writeFileSync(proposalFile, "unreadable");
      vi.advanceTimersByTime(30_000);
      expect(readFileSync(file, "utf8")).toContain("# Updated title è");
      writeFileSync(proposalFile, proposal.replace("status: draft", "status: open").replace("# Initial", "# Handed over"));
      vi.advanceTimersByTime(30_000);
      expect(readFileSync(file, "utf8")).toContain("# Updated title è");

      withdrawAll(p);
      writeFileSync(proposalFile, proposal.replace("# Initial", "# After withdrawal"));
      vi.advanceTimersByTime(30_000);
      expect(existsSync(file)).toBe(false);
    } finally {
      watching.dispose();
      vi.useRealTimers();
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("the ghosts of Cursor's chat agent", () => {
  test("an interrupted turn of a Trama conversation withdraws them with the notice, closing it withdraws them silently, a normal end keeps them", async () => {
    // Dynamic, as above: the modules must load after mock.module replaced "vscode".
    const { onAnnouncementsWithdrawn, watchAnnouncements } = await import("../extension/src/host/announcements");
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
      announce(p, { kind: "task", title: "Nobody's" });
      const titles = () => listAnnouncements(p).map((a) => a.title);

      hook({ hook: "stop", status: "aborted" }); // not yet a Trama conversation
      hook({ hook: "beforeSubmitPrompt", tramaPrompt: true });
      hook({ hook: "stop", status: "completed" });
      expect(titles()).toEqual(["Chat", "Terminal", "Nobody's"]);

      hook({ hook: "stop", status: "error" });
      expect(titles()).toEqual(["Terminal", "Nobody's"]);
      expect(told).toEqual(["Chat"]);

      chatGhost("Closed");
      hook({ hook: "sessionEnd", reason: "user_close" });
      expect(titles()).toEqual(["Terminal", "Nobody's"]);
      expect(told).toEqual(["Chat"]);
    } finally {
      subscription.dispose();
      watching.dispose();
      withdrawAll(p);
    }
  });
});

describe("parallel integrated and external terminals", () => {
  test("every terminal ending releases its own Tasks and announcements after a new instruction", async () => {
    // The host modules must load after the editor mock establishes their boundary.
    const { launchAgent, watchAgentTerminal, watchExternalRuns, startExternalRun } = await import("../extension/src/host/agent");
    const { markerName } = await import("../extension/src/host/external-terminal");
    const markers = mkdtempSync(join(tmpdir(), "trama-parallel-"));
    const external = watchExternalRuns(markers);
    const p = projectAt(dir);
    listeners.end.length = 0;
    watchAgentTerminal();
    withdrawAll(p);
    try {
      await launchAgent(dir, "Use the trama-design skill. Old", "Design", "Old");
      const old = terminals.at(-1) as FakeTerminal;
      const oldId = environments.at(-1)?.["TRAMA_TERMINAL"] as string;
      listeners.start.forEach((fn) => fn(shell(old)));
      await launchAgent(dir, "Use the trama-design skill. New", "Design", "New"); // the old one is busy: a new terminal
      const current = terminals.at(-1) as FakeTerminal;
      expect(current).not.toBe(old);
      const task = newTask(p, { title: "Old", refs: ["order/Paid"], technical: false }).id;
      moveTask(p, task, "doing", "agent", { terminal: oldId });
      // A later external instruction leaves the earlier integrated terminal followed.
      listeners.end.forEach((fn) => fn({ ...shell(current), exitCode: 9 } as ShellEvent));
      startExternalRun(dir, "ext111", "true", "first").sent();
      // Sending to an integrated terminal must not stop either external run from reporting its end.
      startExternalRun(dir, "ext222", "true", "second").sent();
      await launchAgent(dir, "Use the trama-scan skill.", "Scan");
      const latest = terminals.at(-1) as FakeTerminal;
      const externalTasks = ["ext111", "ext222"].map((terminal) => {
        const task = newTask(p, { title: terminal, refs: ["order/Paid"], technical: false });
        moveTask(p, task.id, "doing", "agent", { terminal });
        announce(p, { kind: "task", title: terminal, terminal });
        return task.id;
      });

      listeners.end.forEach((fn) => fn({ ...shell(old), exitCode: 3 } as ShellEvent));
      expect([getTask(p, task).data.column, getTask(p, task).data.agent]).toEqual(["todo", false]);
      expect(listAnnouncements(p).map((a) => a.terminal)).toEqual(["ext111", "ext222"]);

      listeners.end.forEach((fn) => fn({ ...shell(latest), exitCode: 0 } as ShellEvent));
      writeFileSync(join(markers, markerName("ext111", 1)), "7\n");
      writeFileSync(join(markers, markerName("ext222", 1)), "0\n");
      await waitUntil(() => externalTasks.every((id) => getTask(p, id).data.column === "todo") && readdirSync(markers).length === 0);
      expect(externalTasks.map((id) => [getTask(p, id).data.column, getTask(p, id).data.agent])).toEqual([["todo", false], ["todo", false]]);
      expect(listAnnouncements(p)).toEqual([]);
    } finally {
      external.dispose();
      rmSync(markers, { recursive: true, force: true });
      withdrawAll(p);
    }
  }, 15_000);
});

describe("the end of an external window's command", () => {
  test("a previous window ending during a failed opening releases its work", async () => {
    // Load the host only after this test module installs its VS Code mock.
    const { startExternalRun, watchExternalRuns } = await import("../extension/src/host/agent");
    const p = projectAt(dir);
    const markers = mkdtempSync(join(tmpdir(), "trama-markers-"));
    const watching = watchExternalRuns(markers);
    try {
      withdrawAll(p);
      startExternalRun(dir, "prior1", "true", "Use the trama-scan skill on the whole System.").sent();
      const task = newTask(p, { title: "Previous run", refs: ["order/Paid"], technical: false });
      moveTask(p, task.id, "doing", "agent", { terminal: "prior1" });
      announce(p, { kind: "task", title: "Previous work", terminal: "prior1" });
      announce(p, { kind: "task", title: "Unrelated work", terminal: "other1" });
      const failed = startExternalRun(dir, "failed1", "true", "Use the trama-design skill.");
      writeFileSync(join(markers, "prior1-1.end.tmp"), "0\n");
      renameSync(join(markers, "prior1-1.end.tmp"), join(markers, "prior1-1.end"));
      await waitUntil(() => getTask(p, task.id).data.column === "todo" && readdirSync(markers).length === 0);
      failed.abandon();
      expect(getTask(p, task.id).data.column).toBe("todo");
      expect(getTask(p, task.id).data.agent).toBe(false);
      expect(listAnnouncements(p).map((a) => a.title)).toEqual(["Unrelated work"]);
      expect(readdirSync(markers)).toEqual([]);
    } finally {
      watching.dispose();
      rmSync(markers, { recursive: true, force: true });
      withdrawAll(p);
    }
  });

  test("each window's marker releases only its taken Tasks and ghosts", async () => {
    const { startExternalRun, watchExternalRuns } = await import("../extension/src/host/agent");
    const p = projectAt(dir);
    const markers = mkdtempSync(join(tmpdir(), "trama-markers-"));
    const watching = watchExternalRuns(markers);
    const leave = (name: string, status: string) => {
      writeFileSync(join(markers, `${name}.tmp`), status);
      renameSync(join(markers, `${name}.tmp`), join(markers, name));
    };
    try {
      withdrawAll(p);
      const first = startExternalRun(dir, "win111", "agent {prompt}", "Use the trama-scan skill on the whole System.");
      expect(first.line).toContain(join(markers, "win111-1.end"));
      first.sent();

      const task = newTask(p, { title: "External", refs: ["order/Paid"], technical: false });
      moveTask(p, task.id, "doing", "agent");
      announce(p, { kind: "task", title: "A Task", terminal: "win111" });
      announce(p, { kind: "task", title: "Another window", terminal: "other1" });

      leave("win111-1.end", "3\n");
      await waitUntil(() => getTask(p, task.id).data.column === "todo" && readdirSync(markers).length === 0);
      expect(getTask(p, task.id).data.column).toBe("todo");
      expect(getTask(p, task.id).data.agent).toBe(false);
      expect(listAnnouncements(p).map((a) => a.title)).toEqual(["Another window"]);

      // A new window while the run goes on: both markers release their own work.
      startExternalRun(dir, "win222", "agent {prompt}", "Use the trama-scan skill on the whole System.").sent();
      startExternalRun(dir, "win333", "agent {prompt}", "Use the trama-scan skill on the whole System.").sent();
      const replacedTask = newTask(p, { title: "Replaced", refs: ["order/Paid"], technical: false });
      moveTask(p, replacedTask.id, "doing", "agent", { terminal: "win222" });
      announce(p, { kind: "task", title: "Window two", terminal: "win222" });
      announce(p, { kind: "task", title: "Window three", terminal: "win333" });
      leave("win222-1.end", "0\n");
      leave("win333-1.end", "0\n");
      await waitUntil(() => readdirSync(markers).length === 0 && !listAnnouncements(p).some((a) => a.terminal === "win222" || a.terminal === "win333"));
      expect(readdirSync(markers)).toEqual([]);
      expect(getTask(p, replacedTask.id).data.column).toBe("todo");
      expect(listAnnouncements(p).map((a) => a.title)).toEqual(["Another window"]);
    } finally {
      watching.dispose();
      rmSync(markers, { recursive: true, force: true });
      withdrawAll(p);
    }
  });

  test("switching launcher preserves the old terminal's command ending and releases its Tasks", async () => {
    const { launchAgent, startExternalRun, watchAgentTerminal, watchExternalRuns } = await import("../extension/src/host/agent");
    const p = projectAt(dir);
    const markers = mkdtempSync(join(tmpdir(), "trama-markers-"));
    listeners.end.length = 0;
    watchAgentTerminal();
    const watching = watchExternalRuns(markers);
    try {
      // An external window runs, then an instruction goes to the integrated terminal.
      startExternalRun(dir, "win444", "agent {prompt}", "Use the trama-scan skill on the whole System.").sent();
      const external = newTask(p, { title: "External", refs: ["order/Paid"], technical: false });
      moveTask(p, external.id, "doing", "agent", { terminal: "win444" });
      await launchAgent(dir, "Use the trama-scan skill on the whole System.", "Scan");
      const integrated = terminals.at(-1) as FakeTerminal;
      const integratedId = environments.at(-1)?.["TRAMA_TERMINAL"] as string;
      writeFileSync(join(markers, "win444-1.end.tmp"), "0\n");
      renameSync(join(markers, "win444-1.end.tmp"), join(markers, "win444-1.end"));
      await waitUntil(() => getTask(p, external.id).data.column === "todo" && readdirSync(markers).length === 0);
      expect(getTask(p, external.id).data.column).toBe("todo");

      // Then a new external window while the integrated one runs: its end still releases its Tasks.
      const local = newTask(p, { title: "Integrated", refs: ["order/Paid"], technical: false });
      moveTask(p, local.id, "doing", "agent", { terminal: integratedId });
      startExternalRun(dir, "win555", "agent {prompt}", "Use the trama-scan skill on the whole System.").sent();
      listeners.end.forEach((fn) => fn(shell(integrated)));
      expect(getTask(p, local.id).data.column).toBe("todo");
    } finally {
      watching.dispose();
      rmSync(markers, { recursive: true, force: true });
      withdrawAll(p);
    }
  });

  test("a design request sent to an external window announces a Proposal that belongs to that window and the end of its command withdraws it; a plain request announces nothing", async () => {
    const { startExternalRun, watchExternalRuns } = await import("../extension/src/host/agent");
    const p = projectAt(dir);
    const markers = mkdtempSync(join(tmpdir(), "trama-markers-"));
    const watching = watchExternalRuns(markers);
    try {
      withdrawAll(p);
      startExternalRun(dir, "plain1", "agent {prompt}", "Use the trama-scan skill on the whole System.").sent();
      expect(listAnnouncements(p)).toEqual([]);

      startExternalRun(dir, "desgn1", "agent {prompt}", "Use the trama-design skill. Cancel orders").sent("Cancel orders");
      const [ghost] = listAnnouncements(p);
      expect(listAnnouncements(p)).toHaveLength(1);
      expect([ghost?.kind, ghost?.title, ghost?.terminal]).toEqual(["proposal", "Cancel orders", "desgn1"]);

      writeFileSync(join(markers, "desgn1-1.end.tmp"), "0\n");
      renameSync(join(markers, "desgn1-1.end.tmp"), join(markers, "desgn1-1.end"));
      await waitUntil(() => listAnnouncements(p).length === 0 && readdirSync(markers).length === 0);
      expect(listAnnouncements(p)).toEqual([]);
    } finally {
      watching.dispose();
      rmSync(markers, { recursive: true, force: true });
      withdrawAll(p);
    }
  });
});

describe("reusing a free external window", () => {
  test("only a finished run of the same project, in the detected terminal, with no terminal command set, is written into; a failure forgets the window and says why", async () => {
    const { rememberExternalWindow, reuseExternalWindow, startExternalRun, warnExternalReuseFailed, watchExternalRuns } = await import("../extension/src/host/agent");
    const vscode = await import("vscode");
    const bin = mkdtempSync(join(tmpdir(), "trama-fake-kitten-"));
    const markers = mkdtempSync(join(tmpdir(), "trama-markers-"));
    const log = join(bin, "log");
    const fail = join(bin, "fail");
    writeFileSync(join(bin, "kitten"), `#!/bin/sh\nprintf 'CALL %s\\n' "$*" >> ${log}\ncat >> ${log}\nif [ -e ${fail} ]; then echo boom >&2; exit 1; fi\n`, { mode: 0o755 });
    const calls = () => (existsSync(log) ? readFileSync(log, "utf8").split("CALL ").length - 1 : 0);
    const path = process.env.PATH;
    process.env.PATH = `${bin}:${path}`;
    const warning = spyOn(vscode.window, "showWarningMessage");
    const watching = watchExternalRuns(markers);
    const finish = async (name: string) => {
      writeFileSync(join(markers, `${name}.tmp`), "0\n");
      renameSync(join(markers, `${name}.tmp`), join(markers, name));
      await waitUntil(() => !existsSync(join(markers, name)));
    };
    const window = { terminal: "kitty", address: "unix:/tmp/trama-test-kitty", windowId: 1 } as const;
    const reuse = (detected: "kitty" | "wezterm" | undefined, root = dir, name = "Scan") => reuseExternalWindow(root, name, "agent {prompt}", "Use the trama-scan skill on the whole System.", detected);
    try {
      // No window opened yet.
      expect(await reuse("kitty")).toEqual({ kind: "new-window" });

      startExternalRun(dir, "kw1111", "agent {prompt}", "Use the trama-scan skill on the whole System.").sent();
      rememberExternalWindow("kw1111", dir, "Scan", window);

      // The run has not finished: its marker has not come.
      expect(await reuse("kitty")).toEqual({ kind: "new-window" });
      await finish("kw1111-1.end");

      // A condition missing at the start: a new window, no scripting run, no warning.
      expect(await reuse("wezterm")).toEqual({ kind: "new-window" });
      expect(await reuse(undefined)).toEqual({ kind: "new-window" });
      expect(await reuse("kitty", join(dir, "other"))).toEqual({ kind: "new-window" });
      expect(await reuse("kitty", dir, "T3")).toEqual({ kind: "new-window" }); // another name: a window of its own
      settingValues["externalTerminalCommand"] = "alacritty -e {command}";
      try {
        expect(await reuse("kitty")).toEqual({ kind: "new-window" });
      } finally {
        delete settingValues["externalTerminalCommand"];
      }
      expect(calls()).toBe(0);
      expect(warning).not.toHaveBeenCalled();

      // Free window: the same line as a new window, with the same identity and a new run number, goes through the scripting.
      expect(await reuse("kitty")).toEqual({ kind: "reused" });
      expect(calls()).toBe(1);
      const written = readFileSync(log, "utf8");
      expect(written).toContain("@ --to unix:/tmp/trama-test-kitty send-text --match id:1 --stdin");
      expect(written).toContain("sh -c 'export TRAMA_AGENT=1 TRAMA_TERMINAL=");
      expect(written).toContain("kw1111");
      expect(written).toContain(join(markers, "kw1111-2.end"));

      // The new run is the one that counts, and until it ends the window is busy.
      expect(await reuse("kitty")).toEqual({ kind: "new-window" });
      expect(calls()).toBe(1);
      await finish("kw1111-2.end");

      // The scripting fails: the reason is the scripting's, the window is forgotten, nothing is warned until the caller says so.
      writeFileSync(fail, "");
      expect(await reuse("kitty")).toEqual({ kind: "new-window", failure: "boom" });
      expect(calls()).toBe(2);
      expect(await reuse("kitty")).toEqual({ kind: "new-window" });
      expect(calls()).toBe(2);
      expect(warning).not.toHaveBeenCalled();
      warnExternalReuseFailed("boom");
      expect(warning).toHaveBeenCalledWith("Trama could not reuse the external terminal window: boom. A new window was opened.");
    } finally {
      process.env.PATH = path;
      watching.dispose();
      warning.mockRestore();
      rmSync(bin, { recursive: true, force: true });
      rmSync(markers, { recursive: true, force: true });
    }
  });
});

describe("launching into an external window", () => {
  test("a design request opens a window through the developer's command, announces a Proposal that belongs to it, and the end of its command withdraws it; the editor opens no terminal", async () => {
    const { launchAgent, watchExternalRuns } = await import("../extension/src/host/agent");
    const { onAnnouncementsWithdrawn } = await import("../extension/src/host/announcements");
    const p = projectAt(dir);
    const bin = mkdtempSync(join(tmpdir(), "trama-fake-terminal-"));
    const markers = mkdtempSync(join(tmpdir(), "trama-markers-"));
    // A terminal like alacritty: after -e a program and its arguments, which it runs.
    const terminal = join(bin, "faketerm");
    writeFileSync(terminal, `#!/bin/sh\n[ "$1" = -e ] || exit 9\nshift\nexec "$@"\n`, { mode: 0o755 });
    const watching = watchExternalRuns(markers);
    const told: string[] = [];
    const subscription = onAnnouncementsWithdrawn((views) => told.push(...views.map((v) => `${v.kind}:${v.title}`)));
    const shell = process.env["SHELL"];
    process.env["SHELL"] = "/usr/bin/true";
    settingValues["agentLauncher"] = "external-terminal";
    settingValues["externalTerminalCommand"] = `${terminal} -e {command}`;
    const openedBefore = created.length;
    try {
      withdrawAll(p);
      expect(await launchAgent(dir, "Use the trama-design skill. Cancel orders", "Design", "Cancel orders")).toBe("terminal");
      expect(created).toHaveLength(openedBefore);
      // `agent` does not exist here, so the command fails at once (127) and its marker may come before the window is known
      // to be open: the ghost is announced first all the same, and withdrawn by that end.
      await waitUntil(() => told.includes("proposal:Cancel orders") && readdirSync(markers).length === 0);
      expect(told).toEqual(["proposal:Cancel orders"]);
      expect(listAnnouncements(p)).toEqual([]);
      expect(readdirSync(markers)).toEqual([]);
    } finally {
      subscription.dispose();
      delete settingValues["agentLauncher"];
      delete settingValues["externalTerminalCommand"];
      if (shell === undefined) delete process.env["SHELL"];
      else process.env["SHELL"] = shell;
      watching.dispose();
      rmSync(bin, { recursive: true, force: true });
      rmSync(markers, { recursive: true, force: true });
      withdrawAll(p);
    }
  });

  test("when no window can be opened nothing starts: the instruction is on the clipboard with the reason, nothing is announced and no terminal opens", async () => {
    const { launched, launchAgent, watchExternalRuns } = await import("../extension/src/host/agent");
    const vscode = await import("vscode");
    const p = projectAt(dir);
    const markers = mkdtempSync(join(tmpdir(), "trama-markers-"));
    const error = spyOn(vscode.window, "showErrorMessage");
    const watching = watchExternalRuns(markers);
    const platform = Object.getOwnPropertyDescriptor(process, "platform") as PropertyDescriptor;
    const env = vscode.env as { remoteName?: string };
    const path = process.env["PATH"];
    const terminalVariable = process.env["TERMINAL"];
    const openedBefore = created.length;
    const instruction = "Use the trama-design skill. Cancel orders";
    settingValues["agentLauncher"] = "external-terminal";
    /** Launches with the given setting up and returns what the developer was told. */
    const attempt = async (): Promise<string> => {
      error.mockClear();
      const clipboardBefore = clipboard.length;
      const result = await launchAgent(dir, instruction, "Design", "Cancel orders");
      expect(launched(result)).toBe(false);
      expect(clipboard.slice(clipboardBefore)).toEqual([instruction]);
      expect(listAnnouncements(p)).toEqual([]);
      expect(error).toHaveBeenCalledTimes(1);
      return String(error.mock.calls[0]?.[0]);
    };
    const told = (reason: string) => `Trama could not open an external terminal: ${reason}. The instruction was copied to the clipboard.`;
    try {
      withdrawAll(p);
      Object.defineProperty(process, "platform", { value: "win32" });
      expect(await attempt()).toBe(told("external terminals are not supported on this platform"));
      Object.defineProperty(process, "platform", platform);

      env.remoteName = "ssh-remote";
      expect(await attempt()).toBe(told("external terminals are not available in a remote workspace"));
      delete env.remoteName;

      process.env["PATH"] = join(markers, "nothing");
      delete process.env["TERMINAL"];
      if (process.platform === "linux") expect(await attempt()).toBe(told("no terminal was found; set trama.externalTerminalCommand"));

      process.env["PATH"] = path;
      settingValues["externalTerminalCommand"] = "/nonexistent/terminal {command}";
      expect(await attempt()).toBe(told("the terminal could not be started"));

      // The end markers could not be watched at start: the reason is the error that stopped the watching.
      watching.dispose();
      const blocker = join(markers, "file");
      writeFileSync(blocker, "");
      let failure = "";
      try {
        watchExternalRuns(join(blocker, "external-terminals"));
      } catch (err) {
        failure = (err as Error).message;
      }
      expect(failure).toContain("ENOTDIR");
      expect(await attempt()).toBe(told(failure));

      expect(created).toHaveLength(openedBefore);
    } finally {
      delete settingValues["agentLauncher"];
      delete settingValues["externalTerminalCommand"];
      Object.defineProperty(process, "platform", platform);
      delete env.remoteName;
      process.env["PATH"] = path;
      if (terminalVariable !== undefined) process.env["TERMINAL"] = terminalVariable;
      watching.dispose();
      error.mockRestore();
      rmSync(markers, { recursive: true, force: true });
      withdrawAll(p);
    }
  });
});

describe("opening the panel", () => {
  test("a second open while the offer to initialize waits brings the one panel forward instead of making another", async () => {
    // Dynamic, as above: the module must load after mock.module replaced "vscode".
    const { Controller } = await import("../extension/src/host/controller");
    const empty = mkdtempSync(join(tmpdir(), "trama-panel-"));
    workspaceRoot = empty;
    answerOffer.length = 0;
    const panelsBefore = panelsCreated;
    const revealsBefore = reveals;
    try {
      const controller = new Controller({ scheme: "file" } as never);
      const first = controller.open();
      const second = controller.open();
      expect(answerOffer).toHaveLength(2);
      answerOffer[0]?.("Initialize Project");
      await first;
      expect(existsSync(join(empty, ".trama"))).toBe(true);
      expect(panelsCreated - panelsBefore).toBe(1);

      // The developer accepts the second offer too: the project already exists and the panel is open.
      answerOffer[1]?.("Initialize Project");
      await second;
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
