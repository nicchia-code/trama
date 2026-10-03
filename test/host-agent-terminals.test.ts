import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { projectAt } from "../src/core/store";
import { getTask, moveTask, newTask } from "../src/core/work";

// A minimal editor: just the terminal events and the calls launchAgent makes.
type Listener<T> = (event: T) => void;
interface FakeTerminal {
  exitStatus: undefined;
  shellIntegration: object;
  show(): void;
  sendText(text: string): void;
}
const listeners: { start: Listener<{ terminal: FakeTerminal }>[]; end: Listener<{ terminal: FakeTerminal }>[]; close: Listener<FakeTerminal>[] } = { start: [], end: [], close: [] };
const subscribe = <T>(list: Listener<T>[]) => (fn: Listener<T>) => {
  list.push(fn);
  return { dispose() {} };
};
const terminals: FakeTerminal[] = [];

mock.module("vscode", () => ({
  window: {
    onDidStartTerminalShellExecution: subscribe(listeners.start),
    onDidEndTerminalShellExecution: subscribe(listeners.end),
    onDidCloseTerminal: subscribe(listeners.close),
    createTerminal: () => {
      const terminal: FakeTerminal = { exitStatus: undefined, shellIntegration: {}, show() {}, sendText() {} };
      terminals.push(terminal);
      return terminal;
    },
    showErrorMessage: () => undefined,
  },
  workspace: { getConfiguration: () => ({ get: (_key: string, fallback: unknown) => (_key === "agentCommand" ? "agent {prompt}" : fallback), update: async () => {} }) },
  commands: { executeCommand: async () => {} },
  env: { shell: "/bin/bash", clipboard: { writeText: async () => {} } },
  Disposable: { from: (...items: unknown[]) => ({ dispose() { void items; } }) },
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
  test("a command ending in an earlier terminal still releases the Tasks taken while a later one runs", async () => {
    // Dynamic: the module must load after mock.module replaced "vscode".
    const { launchAgent, watchAgentTerminal } = await import("../extension/src/host/agent");
    const p = projectAt(dir);
    watchAgentTerminal();

    await launchAgent(dir, "first");
    const first = terminals[0] as FakeTerminal;
    listeners.start.forEach((fn) => fn({ terminal: first }));
    await launchAgent(dir, "second"); // the first is busy, so this one starts another terminal
    const second = terminals[1] as FakeTerminal;
    expect(second).not.toBe(first);
    listeners.start.forEach((fn) => fn({ terminal: second }));

    const a = newTask(p, { title: "A", refs: ["order/Paid"], technical: false });
    const b = newTask(p, { title: "B", refs: ["order/Paid"], technical: false });
    moveTask(p, a.id, "doing", "agent");
    moveTask(p, b.id, "doing", "agent");
    expect(getTask(p, a.id).data.agent).toBe(true);

    listeners.end.forEach((fn) => fn({ terminal: first }));
    for (const id of [a.id, b.id]) {
      const task = getTask(p, id);
      expect(task.data.agent).toBe(false);
      expect(task.data.column).toBe("doing");
    }
  });
});
