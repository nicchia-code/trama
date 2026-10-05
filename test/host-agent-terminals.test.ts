import { afterAll, beforeAll, describe, expect, mock, spyOn, test } from "bun:test";
import { basename, join } from "node:path";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { announce, listAnnouncements, withdrawAll } from "../src/core/announcements";
import type { CursorHook } from "../src/core/cursor-chat";
import { newProposal } from "../src/core/proposals";
import { handOver } from "./handover";
import { projectAt } from "../src/core/store";
import { getTask, moveTask, newTask } from "../src/core/work";

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

/** The open workspace folder the panel looks for a Trama project in. */
let workspaceRoot = "";
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
    showErrorMessage: () => undefined,
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
      return [{ uri: { scheme: "file", fsPath: workspaceRoot } }];
    },
    getConfiguration: () => ({
      get: (key: string, fallback: unknown) => (key === "agentCommand" ? "agent {prompt}" : (settingValues[key] ?? fallback)),
      inspect: (key: string) => inspected[key],
      update: async (key: string, value: unknown) => void updates.push({ key, value }),
    }),
    createFileSystemWatcher: () => ({ onDidCreate() {}, onDidChange() {}, onDidDelete() {}, dispose() {} }),
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
mock.module("../extension/src/host/questions", () => ({ questionEndpoint: async () => "endpoint" }));

let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-terminals-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("taken Tasks and the agent terminals", () => {
  test("a command ending in an earlier terminal still sends the Tasks taken while a later one runs back to To do", async () => {
    // Dynamic: the module must load after mock.module replaced "vscode".
    const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    const p = projectAt(dir);
    watchAgentTerminal();

    expect(await launchAgent(dir, "first", "Scan")).toBe("terminal");
    const first = terminals[0] as FakeTerminal;
    listeners.start.forEach((fn) => fn(shell(first)));
    await launchAgent(dir, "second", "Scan"); // the first is busy, so this one starts another terminal
    const second = terminals[1] as FakeTerminal;
    expect(second).not.toBe(first);
    listeners.start.forEach((fn) => fn(shell(second)));

    const a = newTask(p, { title: "A", refs: ["order/Paid"], technical: false });
    const b = newTask(p, { title: "B", refs: ["order/Paid"], technical: false });
    moveTask(p, a.id, "doing", "agent");
    moveTask(p, b.id, "doing", "agent");
    expect(getTask(p, a.id).data.agent).toBe(true);

    listeners.end.forEach((fn) => fn(shell(first)));
    for (const id of [a.id, b.id]) {
      const task = getTask(p, id);
      expect(task.data.agent).toBe(false);
      expect(task.data.column).toBe("todo");
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
      await launchAgent(dir, instruction, "Scan"); // the plain terminal stays in the terminal area and is shown as before
      expect(created.at(-1)?.location).toBeUndefined();
      expect(terminals.at(-1)?.shown).toEqual([false]);
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

describe("the notice on the end of the agent's command", () => {
  test("only the end of the command Trama typed makes one, with the terminal's status; any instruction really written takes back the waiting ones", async () => {
    // Dynamic, as above: the modules must load after mock.module replaced "vscode".
    const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    const { endNotices } = await import("../extension/src/host/notice-host");
    const born = spyOn(endNotices, "born").mockImplementation(() => {});
    const cancelAll = spyOn(endNotices, "cancelAll").mockImplementation(() => {});
    listeners.end.length = 0;
    watchAgentTerminal();
    try {
      await launchAgent(dir, "Use the trama-scan skill on the whole System.", "Scan");
      expect(cancelAll).toHaveBeenCalledTimes(1);
      const terminal = terminals.at(-1) as FakeTerminal;

      listeners.end.forEach((fn) => fn(shell(terminal, "ls")));
      listeners.end.forEach((fn) => fn(shell(terminal, "")));
      expect(born).not.toHaveBeenCalled();

      listeners.end.forEach((fn) => fn({ ...shell(terminal), exitCode: 3 } as ShellEvent));
      expect(born).toHaveBeenCalledTimes(1);
      expect(born.mock.calls[0]?.[0]).toBe(basename(dir));
      expect(born.mock.calls[0]?.[1]).toEqual({ kind: "failed", exitCode: 3 });

      listeners.end.forEach((fn) => fn(shell(terminal)));
      expect(born.mock.calls[1]?.[1]).toEqual({ kind: "unreported" });

      // The terminal is free again, so the next instruction reuses it and takes back what waits.
      await launchAgent(dir, "Use the trama-scan skill on the whole System.", "Scan");
      expect(cancelAll).toHaveBeenCalledTimes(2);

      // The chat gets no terminal: nothing is written, so nothing is taken back.
      settingValues["agentLauncher"] = "chat";
      try {
        await launchAgent(dir, "Use the trama-scan skill on the whole System.", "Scan");
      } finally {
        delete settingValues["agentLauncher"];
      }
      expect(cancelAll).toHaveBeenCalledTimes(2);
    } finally {
      born.mockRestore();
      cancelAll.mockRestore();
    }
  });

  test("closing the terminal makes no notice", async () => {
    const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    const { endNotices } = await import("../extension/src/host/notice-host");
    const born = spyOn(endNotices, "born").mockImplementation(() => {});
    watchAgentTerminal();
    try {
      await launchAgent(dir, "Use the trama-scan skill on the whole System.", "Scan");
      listeners.close.forEach((fn) => fn(terminals.at(-1) as FakeTerminal));
      expect(born).not.toHaveBeenCalled();
    } finally {
      born.mockRestore();
    }
  });

  test("in Cursor's chat every end of a Trama conversation's turn makes one, closing makes none, a new prompt takes back the waiting ones", async () => {
    // Dynamic, as above: the modules must load after mock.module replaced "vscode".
    const { chatEndNotices, endNotices, watchCursorChatNotices } = await import("../extension/src/host/notice-host");
    const { receiveCursorHook } = await import("../extension/src/host/cursor");
    const born = spyOn(chatEndNotices, "born").mockImplementation(() => {});
    const cancelAll = spyOn(chatEndNotices, "cancelAll").mockImplementation(() => {});
    const terminalCancel = spyOn(endNotices, "cancelAll").mockImplementation(() => {});
    const watching = watchCursorChatNotices();
    const hook = (h: Partial<CursorHook> & Pick<CursorHook, "hook">) => receiveCursorHook({ root: dir, conversation: "n1", ...h });
    try {
      hook({ hook: "stop", status: "completed", conversation: "other" });
      hook({ hook: "beforeSubmitPrompt", tramaPrompt: true });
      hook({ hook: "beforeSubmitPrompt", tramaPrompt: true, conversation: "n2" });
      expect(cancelAll).toHaveBeenCalledTimes(2);
      hook({ hook: "stop", status: "completed" });
      hook({ hook: "stop", status: "aborted", conversation: "n2" });
      hook({ hook: "sessionEnd", reason: "user_close" });
      expect(born.mock.calls.map((c) => [c[0], c[1]])).toEqual([[basename(dir), { kind: "chat-stopped" }], [basename(dir), { kind: "chat-interrupted" }]]);
      expect(terminalCancel).not.toHaveBeenCalled();
    } finally {
      watching.dispose();
      born.mockRestore();
      cancelAll.mockRestore();
      terminalCancel.mockRestore();
    }
  });
});

describe("worktree agent terminal", () => {
  test("it is born in the worktree, named Trama agent, with TRAMA_AGENT, and it does not take the open folder's terminal", async () => {
    const { launchAgent, launchWorktreeAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    const watching = watchAgentTerminal();
    settingValues.worktreeAgent = "echo {prompt}";
    try {
      expect(await launchAgent(dir, "open-folder-marker", "Scan")).toBe("terminal");
      const open = [...terminals].reverse().find((t) => t.line.includes("open-folder-marker")) as FakeTerminal;
      listeners.start.forEach((fn) => fn(shell(open)));
      listeners.end.forEach((fn) => fn(shell(open)));

      const before = terminals.length;
      await launchWorktreeAgent(dir, "/tmp/repo.trama-worktrees/0001", "scan checkout", "0001");
      expect(terminals.length).toBe(before + 1);
      const work = terminals.at(-1) as FakeTerminal;
      expect(created.at(-1)?.name).toBe("Trama agent");
      expect(created.at(-1)?.cwd).toBe("/tmp/repo.trama-worktrees/0001");
      expect(created.at(-1)?.env.TRAMA_AGENT).toBe("1");
      expect(work.line).toBe("echo 'scan checkout'");

      await launchAgent(dir, "open-again-marker", "Scan");
      expect(open.line).toContain("open-again-marker");
      expect(work.line).toBe("echo 'scan checkout'");
    } finally {
      delete settingValues.worktreeAgent;
      watching.dispose();
    }
  });

  test("a missing worktree agent key is written empty, and a command already set is kept", async () => {
    const { ensureWorktreeAgentSetting } = await import("../extension/src/host/agent");
    delete inspected.worktreeAgent;
    updates.length = 0;
    await ensureWorktreeAgentSetting();
    expect(updates).toEqual([{ key: "worktreeAgent", value: "" }]);

    inspected.worktreeAgent = { globalValue: "agent {prompt}" };
    updates.length = 0;
    await ensureWorktreeAgentSetting();
    expect(updates).toEqual([]);

    inspected.worktreeAgent = { globalValue: "" };
    updates.length = 0;
    await ensureWorktreeAgentSetting();
    expect(updates).toEqual([]);
    delete inspected.worktreeAgent;
  });

  test("the end of the worktree command releases only that worktree's Tasks and notices the open project", async () => {
    const { launchAgent, launchWorktreeAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    const { endNotices } = await import("../extension/src/host/notice-host");
    const born = spyOn(endNotices, "born").mockImplementation(() => {});
    const work = mkdtempSync(join(tmpdir(), "trama-wt-"));
    cpSync(join(import.meta.dir, "../examples/shop"), work, { recursive: true });
    listeners.end.length = 0;
    const watching = watchAgentTerminal();
    settingValues.worktreeAgent = "echo {prompt}";
    const openProject = projectAt(dir);
    const workProject = projectAt(work);
    try {
      const openTask = newTask(openProject, { title: "Open", refs: ["order/Paid"], technical: false });
      moveTask(openProject, openTask.id, "doing", "agent");
      const workTask = newTask(workProject, { title: "There", refs: ["order/Paid"], technical: false });
      moveTask(workProject, workTask.id, "doing", "agent");

      await launchAgent(dir, "busy-in-the-open-folder", "Scan");
      await launchWorktreeAgent(dir, work, "scan", "0001");
      const workTerminal = terminals.at(-1) as FakeTerminal;
      listeners.end.forEach((fn) => fn(shell(workTerminal)));

      expect(getTask(openProject, openTask.id).data).toMatchObject({ column: "doing", agent: true });
      expect(getTask(workProject, workTask.id).data).toMatchObject({ column: "todo", agent: false });
      expect(born).toHaveBeenCalledTimes(1);
      expect(born.mock.calls[0]?.[0]).toBe(basename(dir));
      expect(workTerminal.line).toBe("echo 'scan'");
      // The open folder's terminal is still busy: ending the worktree does not free it.
      const count = terminals.length;
      await launchAgent(dir, "still-not-reused", "Scan");
      expect(terminals.length).toBe(count + 1);

      const takenAgain = newTask(workProject, { title: "Stays", refs: ["order/Paid"], technical: false });
      moveTask(workProject, takenAgain.id, "doing", "agent");
      const openTerminal = [...terminals].reverse().find((t) => t.line.includes("busy-in-the-open-folder")) as FakeTerminal;
      listeners.end.forEach((fn) => fn(shell(openTerminal)));
      expect(getTask(workProject, takenAgain.id).data).toMatchObject({ column: "doing", agent: true });
      expect(getTask(openProject, openTask.id).data).toMatchObject({ column: "todo", agent: false });
    } finally {
      born.mockRestore();
      delete settingValues.worktreeAgent;
      watching.dispose();
      rmSync(work, { recursive: true, force: true });
    }
  });

  test("a scan that created Tasks types the implement instruction into the same terminal, and that command's end does not type another", async () => {
    const { launchWorktreeAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    const { endNotices } = await import("../extension/src/host/notice-host");
    const born = spyOn(endNotices, "born").mockImplementation(() => {});
    const work = mkdtempSync(join(tmpdir(), "trama-wt-"));
    cpSync(join(import.meta.dir, "../examples/shop"), work, { recursive: true });
    listeners.end.length = 0;
    const watching = watchAgentTerminal();
    settingValues.worktreeAgent = "echo {prompt}";
    settingValues.language = "Italian";
    const workProject = projectAt(work);
    try {
      const proposal = newProposal(workProject, "In the worktree");
      handOver(workProject, proposal.id);
      await launchWorktreeAgent(dir, work, "scan the proposal", proposal.id);
      const terminal = terminals.at(-1) as FakeTerminal;
      newTask(workProject, { title: "Born", refs: ["order/Paid"], technical: false, proposal: proposal.id });

      listeners.end.forEach((fn) => fn(shell(terminal)));
      const implement = `Use the trama-implement skill on every Task of Proposal ${proposal.id} that is in the "todo" column. Take each one from \`trama task next --proposal ${proposal.id}\`, one after the other, until it says there is none. Write everything you generate in Italian, except code, which always stays in English.`;
      expect(terminal.line).toBe(`echo '${implement}'`);
      expect(born).not.toHaveBeenCalled();

      listeners.end.forEach((fn) => fn({ ...shell(terminal), exitCode: 0 } as ShellEvent & { exitCode: number }));
      expect(terminal.line).toBe(`echo '${implement}'`);
      expect(born).toHaveBeenCalledTimes(1);
      expect(born.mock.calls[0]?.[1]).toEqual({ kind: "finished" });
    } finally {
      born.mockRestore();
      delete settingValues.worktreeAgent;
      delete settingValues.language;
      watching.dispose();
      rmSync(work, { recursive: true, force: true });
    }
  });

  test("a scan that created only Tasks already Done does not type another command", async () => {
    const { launchWorktreeAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    const { endNotices } = await import("../extension/src/host/notice-host");
    const born = spyOn(endNotices, "born").mockImplementation(() => {});
    const work = mkdtempSync(join(tmpdir(), "trama-wt-"));
    cpSync(join(import.meta.dir, "../examples/shop"), work, { recursive: true });
    listeners.end.length = 0;
    watchAgentTerminal();
    settingValues.worktreeAgent = "echo {prompt}";
    const workProject = projectAt(work);
    try {
      const proposal = newProposal(workProject, "Done already");
      handOver(workProject, proposal.id);
      await launchWorktreeAgent(dir, work, "scan", proposal.id);
      const terminal = terminals.at(-1) as FakeTerminal;
      const task = newTask(workProject, { title: "Finished", refs: ["order/Paid"], technical: false, proposal: proposal.id });
      moveTask(workProject, task.id, "done", "developer");
      listeners.end.forEach((fn) => fn(shell(terminal)));
      expect(terminal.line).toBe("echo 'scan'");
      expect(born).toHaveBeenCalledTimes(1);
    } finally {
      born.mockRestore();
      delete settingValues.worktreeAgent;
      rmSync(work, { recursive: true, force: true });
    }
  });

  test("after a worktree Drift is decided, the Tasks of that worktree's Proposal still in To do are typed into it, and a busy terminal is not reused", async () => {
    const { launchWorktreeAgent, resumeWorktreeTasks, watchAgentTerminal } = await import("../extension/src/host/agent");
    listeners.end.length = 0;
    const watching = watchAgentTerminal();
    settingValues.worktreeAgent = "echo {prompt}";
    const work = "/tmp/repo.trama-worktrees/0004";
    try {
      await launchWorktreeAgent(dir, work, "scan", "0004");
      const first = terminals.at(-1) as FakeTerminal;
      const count = terminals.length;
      await resumeWorktreeTasks(dir, work, "0004");
      expect(terminals.length).toBe(count + 1);
      expect(first.line).toBe("echo 'scan'");

      listeners.end.forEach((fn) => fn(shell(terminals.at(-1) as FakeTerminal)));
      const before = terminals.length;
      await resumeWorktreeTasks(dir, work, "0004");
      expect(terminals.length).toBe(before);
      const again = 'Use the trama-implement skill on every Task of Proposal 0004 that is in the "todo" column. Take each one from `trama task next --proposal 0004`, one after the other, until it says there is none.';
      expect((terminals.at(-1) as FakeTerminal).line).toBe(`echo '${again}'`);
    } finally {
      delete settingValues.worktreeAgent;
      watching.dispose();
    }
  });
});

describe("the end of an external window's command", () => {
  test("the marker of the run in progress releases the taken Tasks, withdraws that window's ghosts and makes the notice; a marker of a run no longer followed does nothing", async () => {
    const { startExternalRun, watchExternalRuns } = await import("../extension/src/host/agent");
    const { endNotices } = await import("../extension/src/host/notice-host");
    const p = projectAt(dir);
    const markers = mkdtempSync(join(tmpdir(), "trama-markers-"));
    let noticed = Promise.withResolvers<void>();
    const born = spyOn(endNotices, "born").mockImplementation(() => noticed.resolve());
    const cancelAll = spyOn(endNotices, "cancelAll").mockImplementation(() => {});
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
      expect(cancelAll).toHaveBeenCalledTimes(1);

      const task = newTask(p, { title: "External", refs: ["order/Paid"], technical: false });
      moveTask(p, task.id, "doing", "agent");
      announce(p, { kind: "task", title: "A Task", terminal: "win111" });
      announce(p, { kind: "task", title: "Another window", terminal: "other1" });

      leave("win111-1.end", "3\n");
      await noticed.promise;
      expect(born).toHaveBeenCalledTimes(1);
      expect(born.mock.calls[0]?.[0]).toBe(basename(dir));
      expect(born.mock.calls[0]?.[1]).toEqual({ kind: "failed", exitCode: 3 });
      expect(getTask(p, task.id).data.column).toBe("todo");
      expect(getTask(p, task.id).data.agent).toBe(false);
      expect(listAnnouncements(p).map((a) => a.title)).toEqual(["Another window"]);

      // A new window while the run goes on: the old window's marker no longer counts, so its ghost stays.
      startExternalRun(dir, "win222", "agent {prompt}", "Use the trama-scan skill on the whole System.").sent();
      startExternalRun(dir, "win333", "agent {prompt}", "Use the trama-scan skill on the whole System.").sent();
      expect(cancelAll).toHaveBeenCalledTimes(3);
      announce(p, { kind: "task", title: "Window two", terminal: "win222" });
      announce(p, { kind: "task", title: "Window three", terminal: "win333" });
      noticed = Promise.withResolvers<void>();
      leave("win222-1.end", "0\n");
      leave("win333-1.end", "0\n");
      await noticed.promise;
      expect(readdirSync(markers)).toEqual([]);
      expect(born).toHaveBeenCalledTimes(2);
      expect(listAnnouncements(p).map((a) => a.title).sort()).toEqual(["Another window", "Window two"]);
    } finally {
      watching.dispose();
      born.mockRestore();
      cancelAll.mockRestore();
      rmSync(markers, { recursive: true, force: true });
      withdrawAll(p);
    }
  });

  test("a design request sent to an external window announces a Proposal that belongs to that window and the end of its command withdraws it; a plain request announces nothing", async () => {
    const { startExternalRun, watchExternalRuns } = await import("../extension/src/host/agent");
    const { endNotices } = await import("../extension/src/host/notice-host");
    const p = projectAt(dir);
    const markers = mkdtempSync(join(tmpdir(), "trama-markers-"));
    const noticed = Promise.withResolvers<void>();
    const born = spyOn(endNotices, "born").mockImplementation(() => noticed.resolve());
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
      await noticed.promise;
      expect(listAnnouncements(p)).toEqual([]);
    } finally {
      watching.dispose();
      born.mockRestore();
      rmSync(markers, { recursive: true, force: true });
      withdrawAll(p);
    }
  });
});

describe("reusing a free external window", () => {
  test("only a finished run of the same project, in the detected terminal, with no terminal command set, is written into; a failure forgets the window and says why", async () => {
    const { rememberExternalWindow, reuseExternalWindow, startExternalRun, warnExternalReuseFailed, watchExternalRuns } = await import("../extension/src/host/agent");
    const { endNotices } = await import("../extension/src/host/notice-host");
    const vscode = await import("vscode");
    const bin = mkdtempSync(join(tmpdir(), "trama-fake-kitten-"));
    const markers = mkdtempSync(join(tmpdir(), "trama-markers-"));
    const log = join(bin, "log");
    const fail = join(bin, "fail");
    writeFileSync(join(bin, "kitten"), `#!/bin/sh\nprintf 'CALL %s\\n' "$*" >> ${log}\ncat >> ${log}\nif [ -e ${fail} ]; then echo boom >&2; exit 1; fi\n`, { mode: 0o755 });
    const calls = () => (existsSync(log) ? readFileSync(log, "utf8").split("CALL ").length - 1 : 0);
    const path = process.env.PATH;
    process.env.PATH = `${bin}:${path}`;
    let noticed = Promise.withResolvers<void>();
    const born = spyOn(endNotices, "born").mockImplementation(() => noticed.resolve());
    const cancelAll = spyOn(endNotices, "cancelAll").mockImplementation(() => {});
    const warning = spyOn(vscode.window, "showWarningMessage");
    const watching = watchExternalRuns(markers);
    const finish = async (name: string) => {
      noticed = Promise.withResolvers<void>();
      writeFileSync(join(markers, `${name}.tmp`), "0\n");
      renameSync(join(markers, `${name}.tmp`), join(markers, name));
      await noticed.promise;
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
      const before = cancelAll.mock.calls.length;
      expect(await reuse("kitty")).toEqual({ kind: "reused" });
      expect(calls()).toBe(1);
      const written = readFileSync(log, "utf8");
      expect(written).toContain("@ --to unix:/tmp/trama-test-kitty send-text --match id:1 --stdin");
      expect(written).toContain("sh -c 'export TRAMA_AGENT=1 TRAMA_TERMINAL=");
      expect(written).toContain("kw1111");
      expect(written).toContain(join(markers, "kw1111-2.end"));
      expect(cancelAll.mock.calls.length).toBe(before + 1);

      // The new run is the one that counts, and until it ends the window is busy.
      expect(await reuse("kitty")).toEqual({ kind: "new-window" });
      expect(calls()).toBe(1);
      await finish("kw1111-2.end");
      expect(born).toHaveBeenCalledTimes(2);

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
      born.mockRestore();
      cancelAll.mockRestore();
      warning.mockRestore();
      rmSync(bin, { recursive: true, force: true });
      rmSync(markers, { recursive: true, force: true });
    }
  });
});

describe("launching into an external window", () => {
  test("a design request opens a window through the developer's command, announces a Proposal that belongs to it, and the end of its command withdraws it; the editor opens no terminal", async () => {
    const { launchAgent, watchExternalRuns } = await import("../extension/src/host/agent");
    const { endNotices } = await import("../extension/src/host/notice-host");
    const { onAnnouncementsWithdrawn } = await import("../extension/src/host/announcements");
    const p = projectAt(dir);
    const bin = mkdtempSync(join(tmpdir(), "trama-fake-terminal-"));
    const markers = mkdtempSync(join(tmpdir(), "trama-markers-"));
    // A terminal like alacritty: after -e a program and its arguments, which it runs.
    const terminal = join(bin, "faketerm");
    writeFileSync(terminal, `#!/bin/sh\n[ "$1" = -e ] || exit 9\nshift\nexec "$@"\n`, { mode: 0o755 });
    const noticed = Promise.withResolvers<unknown[]>();
    const born = spyOn(endNotices, "born").mockImplementation((...args: unknown[]) => noticed.resolve(args));
    const cancelAll = spyOn(endNotices, "cancelAll").mockImplementation(() => {});
    const watching = watchExternalRuns(markers);
    const told: string[] = [];
    const subscription = onAnnouncementsWithdrawn((views) => told.push(...views.map((v) => `${v.kind}:${v.title}`)));
    const shell = process.env["SHELL"];
    process.env["SHELL"] = "/bin/true";
    settingValues["agentLauncher"] = "external-terminal";
    settingValues["externalTerminalCommand"] = `${terminal} -e {command}`;
    const openedBefore = created.length;
    try {
      withdrawAll(p);
      expect(await launchAgent(dir, "Use the trama-design skill. Cancel orders", "Design", "Cancel orders")).toBe("terminal");
      expect(cancelAll).toHaveBeenCalledTimes(1);
      expect(created).toHaveLength(openedBefore);
      // `agent` does not exist here, so the command fails at once (127) and its marker may come before the window is known
      // to be open: the ghost is announced first all the same, and withdrawn by that end.
      const [project, outcome] = await noticed.promise;
      expect(project).toBe(basename(dir));
      expect(outcome).toEqual({ kind: "failed", exitCode: 127 });
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
      born.mockRestore();
      cancelAll.mockRestore();
      rmSync(bin, { recursive: true, force: true });
      rmSync(markers, { recursive: true, force: true });
      withdrawAll(p);
    }
  });

  test("when no window can be opened nothing starts: the instruction is on the clipboard with the reason, no notice is taken back, nothing is announced and no terminal opens", async () => {
    const { launched, launchAgent, watchExternalRuns } = await import("../extension/src/host/agent");
    const { endNotices } = await import("../extension/src/host/notice-host");
    const vscode = await import("vscode");
    const p = projectAt(dir);
    const markers = mkdtempSync(join(tmpdir(), "trama-markers-"));
    const cancelAll = spyOn(endNotices, "cancelAll").mockImplementation(() => {});
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

      expect(cancelAll).not.toHaveBeenCalled();
      expect(created).toHaveLength(openedBefore);
    } finally {
      delete settingValues["agentLauncher"];
      delete settingValues["externalTerminalCommand"];
      Object.defineProperty(process, "platform", platform);
      delete env.remoteName;
      process.env["PATH"] = path;
      if (terminalVariable !== undefined) process.env["TERMINAL"] = terminalVariable;
      watching.dispose();
      cancelAll.mockRestore();
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
