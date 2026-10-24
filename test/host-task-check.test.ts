import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// A minimal editor: no terminal is open and nothing is configured.
const noop = () => ({ dispose() {} });
mock.module("vscode", () => ({
  window: { terminals: [], state: { focused: true }, onDidStartTerminalShellExecution: noop, onDidEndTerminalShellExecution: noop, onDidChangeTerminalShellIntegration: noop, onDidCloseTerminal: noop, showErrorMessage: async () => undefined, showInformationMessage: async () => undefined },
  workspace: { getConfiguration: () => ({ get: (_key: string, fallback: unknown) => fallback }) },
  Disposable: { from: () => ({ dispose() {} }) },
}));

// Dynamic: the editor mock must exist before the host modules load, and static imports are hoisted above it.
const { checkTaskHolder } = await import("../extension/src/host/task-check");
const { onStoppedFollowing } = await import("../extension/src/host/drift-resolution");
const { projectAt } = await import("../src/core/store");
const { getTask, moveTask, newTask } = await import("../src/core/work");

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-htc-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  mkdirSync(join(dir, ".trama"), { recursive: true });
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

test("a Task held by a terminal no window follows is released with the Board notice", async () => {
  const p = projectAt(dir);
  const notices: string[] = [];
  onStoppedFollowing((subject, reason) => notices.push(`${subject}: ${reason}`));
  const id = newTask(p, { title: "Held", refs: ["order"], technical: false }).id;
  moveTask(p, id, "doing", "agent", { terminal: "c1" });
  const reply = await checkTaskHolder(dir, id);
  expect(reply).toEqual({ result: "released", reason: "no window follows its agent" });
  expect(getTask(p, id).data.column).toBe("todo");
  expect(notices).toHaveLength(1);
});

test("a Task whose file says `agent: true` is held by nobody, so it is unavailable and unchanged", async () => {
  const p = projectAt(dir);
  const anonymous = newTask(p, { title: "Anon", refs: ["order"], technical: false }).id;
  moveTask(p, anonymous, "doing", "developer");
  writeFileSync(getTask(p, anonymous).path, readFileSync(getTask(p, anonymous).path, "utf8").replace(/^agent: false$/m, "agent: true"));
  expect(await checkTaskHolder(dir, anonymous)).toEqual({ result: "unavailable" });
  expect(getTask(p, anonymous).data.column).toBe("doing");
});

test("a Task held by an omp Chat conversation this window follows is alive and stays taken", async () => {
  const { setHooked } = await import("../extension/src/host/drift-resolution");
  const p = projectAt(dir);
  const id = newTask(p, { title: "Chatting", refs: ["order"], technical: false }).id;
  moveTask(p, id, "doing", "agent", { terminal: "chat1" });
  setHooked("chat1", true);
  try {
    expect(await checkTaskHolder(dir, id)).toEqual({ result: "alive", holder: "chat1" });
    expect(getTask(p, id).data.column).toBe("doing");
  } finally {
    setHooked("chat1", false);
  }
});
