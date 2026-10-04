import { afterAll, beforeAll, describe, expect, mock, spyOn, test } from "bun:test";
import { basename, join } from "node:path";
import { cpSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { announce, listAnnouncements, withdrawAll } from "../src/core/announcements";
import type { CursorHook } from "../src/core/cursor-chat";
import { newProposal } from "../src/core/proposals";
import { projectAt } from "../src/core/store";
import { getTask, moveTask, newTask } from "../src/core/work";

// A minimal editor: just the terminal events and the calls launchAgent makes.
type Listener<T> = (event: T) => void;
interface FakeTerminal {
  exitStatus: undefined;
  shellIntegration: object;
  /** The last command line typed into it. */
  line: string;
  show(): void;
  sendText(text: string): void;
}
interface ShellEvent {
  terminal: FakeTerminal;
  execution: { commandLine: { value: string } };
}
const listeners: { start: Listener<ShellEvent>[]; end: Listener<ShellEvent>[]; close: Listener<FakeTerminal>[] } = { start: [], end: [], close: [] };
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
    createTerminal: (options: { env: Record<string, string> }) => {
      environments.push(options.env);
      const terminal: FakeTerminal = {
        exitStatus: undefined,
        shellIntegration: {},
        line: "",
        show() {},
        sendText(text: string) {
          this.line = text;
          typed.push(text);
        },
      };
      terminals.push(terminal);
      return terminal;
    },
    showErrorMessage: () => undefined,
    showInformationMessage: () => {
      const offer = Promise.withResolvers<string | undefined>();
      answerOffer.push(offer.resolve);
      return offer.promise;
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
    getConfiguration: () => ({ get: (key: string, fallback: unknown) => (key === "agentCommand" ? "agent {prompt}" : (settingValues[key] ?? fallback)), update: async () => {} }),
    createFileSystemWatcher: () => ({ onDidCreate() {}, onDidChange() {}, onDidDelete() {}, dispose() {} }),
  },
  Uri: { joinPath: (base: unknown, ...parts: string[]) => ({ base, parts, toString: () => parts.join("/") }), parse: (value: string) => ({ toString: () => value }) },
  RelativePattern: class {},
  // Bun re-mocks "vscode" in place, keeping only these keys, for every later test file that mocks it too.
  TabInputText: class {},
  ViewColumn: { Active: 1 },
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

    expect(await launchAgent(dir, "first")).toBe("terminal");
    const first = terminals[0] as FakeTerminal;
    listeners.start.forEach((fn) => fn(shell(first)));
    await launchAgent(dir, "second"); // the first is busy, so this one starts another terminal
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

    await launchAgent(dir, "Use the trama-design skill. One", "One");
    const firstId = environments.at(-1)?.["TRAMA_TERMINAL"] as string;
    expect(firstId).toMatch(/^[a-z0-9]{6}$/);
    expect(listAnnouncements(p).map((a) => [a.title, a.terminal])).toEqual([["One", firstId]]);

    await launchAgent(dir, "Use the trama-design skill. Two", "Two"); // the first is busy: another terminal
    const second = terminals.at(-1) as FakeTerminal;
    const secondId = environments.at(-1)?.["TRAMA_TERMINAL"] as string;
    expect(secondId).toMatch(/^[a-z0-9]{6}$/);
    expect(secondId).not.toBe(firstId);
    expect(listAnnouncements(p).map((a) => [a.title, a.terminal])).toEqual([["One", firstId], ["Two", secondId]]);

    withdrawAll(p);
    listeners.end.forEach((fn) => fn(shell(second))); // its command ended: free to reuse
    const created = terminals.length;
    await launchAgent(dir, "Use the trama-design skill. Three", "Three");
    expect(terminals).toHaveLength(created);
    expect(listAnnouncements(p).map((a) => [a.title, a.terminal])).toEqual([["Three", secondId]]);
    withdrawAll(p);
  });
});

describe("the language the agent writes in", () => {
  test("the setting is read at each launch; blank adds nothing", async () => {
    // Dynamic: the module must load after mock.module replaced "vscode".
    const { launchAgent } = await import("../extension/src/host/agent");
    const instruction = "Use the trama-scan skill on the whole System.";

    await launchAgent(dir, instruction);
    expect(typed.at(-1)).not.toContain("Write everything");

    settingValues["language"] = " Italian ";
    try {
      await launchAgent(dir, instruction);
      expect(typed.at(-1)).toContain(`${instruction} Write everything you generate in Italian, except code, which always stays in English.`);
      expect(typed.at(-1)?.split("\n")).toHaveLength(1);

      settingValues["language"] = "   ";
      await launchAgent(dir, instruction);
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
    await launchAgent(dir, "Use the trama-scan skill on the whole System.");
    expect(listAnnouncements(p)).toEqual([]);
    await launchAgent(dir, "Use the trama-design skill. Add refunds", "Add refunds");
    expect(listAnnouncements(p).map((a) => ({ kind: a.kind, source: a.source, title: a.title, proposal: a.proposal }))).toEqual([{ kind: "proposal", source: "request", title: "Add refunds", proposal: null }]);
  });

  test("the chat launcher announces nothing: the ghost comes with the Draft", async () => {
    const { launchAgent } = await import("../extension/src/host/agent");
    const p = projectAt(dir);
    const before = listAnnouncements(p).length;
    settingValues["agentLauncher"] = "chat";
    try {
      await launchAgent(dir, "Use the trama-design skill. Another change", "Another change");
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

      editorCalls.length = 0;
      commandHandler = (id) => (id === "composer.createNew" ? { composerId: "c" } : undefined);
      expect(await launchAgent(dir, "Use the trama-scan skill on the whole System.")).toBe("sent");
      expect(editorCalls).toEqual(["composer.createNew"]);

      // Cursor's command returns nothing even when it created and sent the chat: only an error moves to the deeplink.
      editorCalls.length = 0;
      commandHandler = () => undefined;
      expect(await launchAgent(dir, "Use the trama-scan skill on the whole System.")).toBe("sent");
      expect(editorCalls).toEqual(["composer.createNew"]);
      expect(await launchAgent(dir, "Use the trama-scan skill on the Feature `checkout`.", undefined, true)).toBe("sent");

      editorCalls.length = 0;
      commandHandler = () => { throw new Error("command 'composer.createNew' not found"); };
      expect(await launchAgent(dir, "Use the trama-scan skill on the whole System.")).toBe("confirm");
      expect(editorCalls).toEqual(["composer.createNew", `cursor://anysphere.cursor-deeplink/prompt?text=${encodeURIComponent("Use the trama-scan skill on the whole System.")}&workspace=${encodeURIComponent(basename(dir))}&mode=agent`]);

      editorCalls.length = 0;
      clipboard.length = 0;
      expect(await launchAgent(dir, "Use the trama-design skill. Read .env")).toBe("clipboard");
      expect(editorCalls).toEqual(["composer.createNew"]);
      expect(clipboard).toEqual(["Use the trama-design skill. Read .env"]);
      expect(typed.length).toBe(typedBefore);

      // The automatic scan: only a chat that sends by itself, never a chat left waiting nor the clipboard.
      editorCalls.length = 0;
      clipboard.length = 0;
      expect(await launchAgent(dir, "Use the trama-scan skill on the Feature `checkout`.", undefined, true)).toBe("not-sent");
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

    await launchAgent(dir, "Use the trama-design skill. Cancel orders", "Cancel orders");
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

    await launchAgent(dir, "Use the trama-design skill. One", "One");
    const first = terminals.at(-1) as FakeTerminal;
    const firstId = environments.at(-1)?.["TRAMA_TERMINAL"] as string;
    await launchAgent(dir, "Use the trama-design skill. Two", "Two");
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

    await launchAgent(dir, "Use the trama-design skill. Alone", "Alone");
    const terminal = terminals.at(-1) as FakeTerminal;
    listeners.end.forEach((fn) => fn(shell(terminal, "ls")));
    listeners.end.forEach((fn) => fn(shell(terminal, "")));
    listeners.end.forEach((fn) => fn(shell(terminal, ` ${terminal.line}x`)));
    expect(listAnnouncements(p).map((a) => a.title)).toEqual(["Alone"]);
    expect(told).toEqual([]);

    // Still busy: the next launch opens another terminal instead of typing into this one.
    const created = terminals.length;
    await launchAgent(dir, "Use the trama-scan skill on the whole System.");
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
      await launchAgent(dir, "Use the trama-scan skill on the whole System.");
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
      await launchAgent(dir, "Use the trama-scan skill on the whole System.");
      expect(cancelAll).toHaveBeenCalledTimes(2);

      // The chat gets no terminal: nothing is written, so nothing is taken back.
      settingValues["agentLauncher"] = "chat";
      try {
        await launchAgent(dir, "Use the trama-scan skill on the whole System.");
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
      await launchAgent(dir, "Use the trama-scan skill on the whole System.");
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
