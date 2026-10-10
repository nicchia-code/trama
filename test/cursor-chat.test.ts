import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { reportActivity, runAgentEvent, runCursorHook } from "../src/cli/main";
import type { AgentOrigin } from "../src/core/announcements";
import { CursorConversations, type CursorHook, parseCursorHook, writeCursorHooks } from "../src/core/cursor-chat";
import { createQuestionServer } from "../src/core/question-channel";
import { projectAt } from "../src/core/store";

// Short paths: a Unix socket path is limited to about 100 bytes.
let root: string;
let project: string;
let runtimeDir: string;
beforeEach(() => {
  root = mkdtempSync("/tmp/trama-hook-");
  project = join(root, "p");
  runtimeDir = join(root, "rt");
  mkdirSync(join(project, ".trama", "model"), { recursive: true });
  writeFileSync(join(project, ".trama", "model", "system.md"), "# S\n");
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

const prompt = (text: string, conversation = "c1") => ({ hook_event_name: "beforeSubmitPrompt", conversation_id: conversation, workspace_roots: [join(root, "other"), project], prompt: text });

test("the hook names the first workspace folder with a Trama Model, and keeps only whether the prompt names a Trama skill", () => {
  expect(parseCursorHook(prompt("Use the trama-design skill. Secret request"))).toEqual({ hook: "beforeSubmitPrompt", conversation: "c1", root: project, tramaPrompt: true });
  expect(parseCursorHook(prompt("/trama-scan"))?.tramaPrompt).toBe(true);
  expect(parseCursorHook(prompt("Please use the trama-design skill"))?.tramaPrompt).toBe(false);
  expect(parseCursorHook({ ...prompt("x"), workspace_roots: [join(root, "other")] })).toBeNull();
  expect(parseCursorHook({ ...prompt("x"), hook_event_name: "afterFileEdit" })).toBeNull();
});

test("only Trama's conversations produce Events, from the Trama prompt until they are closed", () => {
  const c = new CursorConversations();
  const at = (h: Omit<CursorHook, "root">) => c.translate({ root: project, ...h })?.event ?? null;
  expect(at({ hook: "beforeSubmitPrompt", conversation: "a", tramaPrompt: false })).toBeNull();
  expect(at({ hook: "stop", conversation: "a", status: "completed" })).toBeNull();

  expect(at({ hook: "beforeSubmitPrompt", conversation: "t", tramaPrompt: true })).toBe("PROMPT_SUBMITTED");
  expect(at({ hook: "beforeSubmitPrompt", conversation: "t", tramaPrompt: false })).toBe("PROMPT_SUBMITTED");
  expect(at({ hook: "stop", conversation: "t", status: "completed" })).toBe("AGENT_STOPPED");
  expect(at({ hook: "stop", conversation: "t", status: "aborted" })).toBe("AGENT_INTERRUPTED");
  expect(at({ hook: "stop", conversation: "t", status: "error" })).toBe("AGENT_INTERRUPTED");
  expect(at({ hook: "sessionEnd", conversation: "t", reason: "completed" })).toBeNull();
  expect(at({ hook: "sessionEnd", conversation: "t", reason: "user_close" })).toBe("CONVERSATION_CLOSED");
  expect(at({ hook: "stop", conversation: "t", status: "completed" })).toBeNull();
});

test("trama cursor-hook hands the hook, never the prompt, to the project's editor and always answers Cursor", async () => {
  const received: CursorHook[] = [];
  const server = await createQuestionServer({ project: projectAt(project), runtimeDir, handler: async () => ({ status: "unavailable" }) as never, onCursorHook: (h) => received.push(h) });
  try {
    expect(await runCursorHook(JSON.stringify(prompt("Use the trama-design skill. Secret")), { runtimeDir })).toBe('{"continue":true}');
    expect(await runCursorHook(JSON.stringify({ hook_event_name: "stop", conversation_id: "c1", workspace_roots: [project], status: "completed" }), { runtimeDir })).toBe("{}");
    expect(received).toEqual([
      { hook: "beforeSubmitPrompt", conversation: "c1", root: project, tramaPrompt: true },
      { hook: "stop", conversation: "c1", root: project, status: "completed" },
    ]);
    expect(JSON.stringify(received)).not.toContain("Secret");
  } finally {
    await server.dispose();
  }
  const started = Date.now();
  expect(await runCursorHook(JSON.stringify(prompt("x")), { runtimeDir })).toBe('{"continue":true}');
  expect(await runCursorHook("not json", { runtimeDir })).toBe("{}");
  expect(Date.now() - started).toBeLessThan(1000);
});

test("Trama's hooks replace only Trama's earlier entries, keep the others, and leave a file that is not JSON alone", () => {
  const file = join(root, ".cursor", "hooks.json");
  writeCursorHooks(file, "/old/bin/trama");
  const read = () => JSON.parse(readFileSync(file, "utf8"));
  const mine = (program: string) => [{ command: `"${program}" cursor-hook` }];
  expect(read()).toEqual({ version: 1, hooks: { beforeSubmitPrompt: mine("/old/bin/trama"), stop: mine("/old/bin/trama"), sessionEnd: mine("/old/bin/trama") } });

  writeFileSync(file, JSON.stringify({ version: 1, hooks: { stop: [{ command: "./mine.sh" }, ...mine("/old/bin/trama")], afterFileEdit: [{ command: "fmt" }] } }));
  writeCursorHooks(file, "/new/bin/trama");
  expect(read().hooks).toEqual({
    stop: [{ command: "./mine.sh" }, ...mine("/new/bin/trama")],
    afterFileEdit: [{ command: "fmt" }],
    beforeSubmitPrompt: mine("/new/bin/trama"),
    sessionEnd: mine("/new/bin/trama"),
  });

  writeFileSync(file, "{ broken");
  expect(() => writeCursorHooks(file, "/new/bin/trama")).toThrow(/not valid JSON/);
  expect(readFileSync(file, "utf8")).toBe("{ broken");
});

test("only commands that change project state tell the editor; read-only commands do not", async () => {
  const received: AgentOrigin[] = [];
  const server = await createQuestionServer({ project: projectAt(project), runtimeDir, handler: async () => ({ status: "unavailable" }) as never, onActivity: (origin) => received.push(origin) });
  try {
    const tell = (argv: string[], env: Record<string, string>) => reportActivity(argv, project, { env, runtimeDir });
    await tell(["task", "move", "abcd1234", "doing"], { TRAMA_TERMINAL: "abc123" });
    await tell(["drift", "new", "x"], { CURSOR_AGENT: "1" });
    await tell(["announce", "task", "x"], {});
    await tell(["task", "list"], { TRAMA_TERMINAL: "abc123" });
    await tell(["proposal", "resolve-drift", "abcd1234", "efgh5678", "--remove"], { TRAMA_TERMINAL: "abc123" });
    expect(received).toEqual([
      { terminal: "abc123" },
      { chat: "cursor" },
      {},
      { terminal: "abc123" },
    ]);
  } finally {
    await server.dispose();
  }
  const started = Date.now();
  await reportActivity(["task", "move", "abcd1234", "doing"], project, { env: {}, runtimeDir });
  expect(Date.now() - started).toBeLessThan(1000);
});

test("the hook of an agent in a Trama terminal tells the project's editor it is idle; without that terminal or an editor it tells nothing and never fails", async () => {
  const received: [string, string][] = [];
  const server = await createQuestionServer({ project: projectAt(project), runtimeDir, handler: async () => ({ status: "unavailable" }) as never, onAgentIdle: (terminal, root) => received.push([terminal, root]) });
  try {
    await runAgentEvent(["agent-event", "idle"], project, { env: { TRAMA_TERMINAL: "abc123" }, runtimeDir });
    await runAgentEvent(["agent-event", "idle"], project, { env: {}, runtimeDir });
    expect(received).toEqual([["abc123", project]]);
  } finally {
    await server.dispose();
  }
  await runAgentEvent(["agent-event", "idle"], project, { env: { TRAMA_TERMINAL: "abc123" }, runtimeDir });
  await expect(runAgentEvent(["agent-event", "alive"], project, { env: {}, runtimeDir })).rejects.toThrow("Usage: trama agent-event idle");
  await expect(runAgentEvent(["agent-event", "busy"], project, { env: {}, runtimeDir })).rejects.toThrow("Usage: trama agent-event idle");
});
