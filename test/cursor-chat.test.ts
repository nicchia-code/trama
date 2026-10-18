import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { reportActivity, runAgentEvent, runCursorHook } from "../src/cli/main";
import type { AgentOrigin } from "../src/core/announcements";
import { CursorConversations, type CursorHook, parseCursorHook, registersAgentWork, writeCursorHooks } from "../src/core/cursor-chat";
import { createQuestionServer } from "../src/core/question-channel";
import { QUESTION_TOOL_REFUSAL } from "../src/core/questions";
import { projectAt } from "../src/core/store";

// Short paths: a Unix socket path is limited to about 100 bytes.
let root: string;
let project: string;
let runtimeDir: string;
beforeEach(() => {
  root = mkdtempSync(process.platform === "win32" ? join(tmpdir(), "trama-hook-") : "/tmp/trama-hook-");
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
  expect(parseCursorHook(prompt("Please use the trama-design skill"))?.tramaPrompt).toBe(true);
  expect(parseCursorHook(prompt("Use the trama-req-ui skill"))?.tramaPrompt).toBe(false);
  expect(parseCursorHook(prompt("Use the trama-designer skill"))?.tramaPrompt).toBe(false);
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
  const server = await createQuestionServer({ project: projectAt(project), runtimeDir, handler: async () => ({ status: "unavailable" }) as never, onCursorHook: (h) => { received.push(h); } });
  try {
    expect(await runCursorHook(JSON.stringify(prompt("Use the trama-design skill. Secret")), { runtimeDir })).toBe('{"continue":true}');
    expect(await runCursorHook(JSON.stringify({ hook_event_name: "stop", conversation_id: "c1", workspace_roots: [project], status: "completed" }), { runtimeDir })).toBe("{}");
    expect(await runCursorHook("\uFEFF" + JSON.stringify({ hook_event_name: "stop", conversation_id: "c2", workspace_roots: [project], status: "completed" }), { runtimeDir })).toBe("{}");
    expect(received).toEqual([
      { hook: "beforeSubmitPrompt", conversation: "c1", root: project, tramaPrompt: true },
      { hook: "stop", conversation: "c1", root: project, status: "completed" },
      { hook: "stop", conversation: "c2", root: project, status: "completed" },
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
  writeCursorHooks(file, "/old/bin/trama", false);
  const read = () => JSON.parse(readFileSync(file, "utf8"));
  const mine = (program: string) => [{ command: `"${program}" cursor-hook` }];
  const shell = (program: string) => [{ command: `"${program}" cursor-hook`, matcher: "trama" }];
  const question = (program: string) => [{ command: `"${program}" cursor-hook`, matcher: "AskQuestion" }];
  expect(read()).toEqual({ version: 1, hooks: { beforeSubmitPrompt: mine("/old/bin/trama"), stop: mine("/old/bin/trama"), sessionEnd: mine("/old/bin/trama"), afterShellExecution: shell("/old/bin/trama"), preToolUse: question("/old/bin/trama") } });

  writeFileSync(file, JSON.stringify({ version: 1, hooks: { stop: [{ command: "./mine.sh" }, ...mine("/old/bin/trama")], afterFileEdit: [{ command: "fmt" }] } }));
  writeCursorHooks(file, "/new/bin/trama", false);
  expect(read().hooks).toEqual({
    stop: [{ command: "./mine.sh" }, ...mine("/new/bin/trama")],
    afterFileEdit: [{ command: "fmt" }],
    beforeSubmitPrompt: mine("/new/bin/trama"),
    sessionEnd: mine("/new/bin/trama"),
    afterShellExecution: shell("/new/bin/trama"),
    preToolUse: question("/new/bin/trama"),
  });

  writeFileSync(file, "{ broken");
  expect(() => writeCursorHooks(file, "/new/bin/trama")).toThrow(/not valid JSON/);
  expect(readFileSync(file, "utf8")).toBe("{ broken");
});

test("on Windows Cursor's entries have the PowerShell form, and either form is replaced by the other on update", () => {
  const file = join(root, ".cursor", "hooks.json");
  writeCursorHooks(file, "C:\\old\\trama.exe", false);
  writeCursorHooks(file, "C:\\new\\trama.exe", true);
  const read = () => JSON.parse(readFileSync(file, "utf8")).hooks;
  expect(read().stop).toEqual([{ command: '& "C:\\new\\trama.exe" cursor-hook' }]);
  writeCursorHooks(file, "C:\\newer\\trama.exe", false);
  expect(read().stop).toEqual([{ command: '"C:\\newer\\trama.exe" cursor-hook' }]);
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

test("a shell command that registers the agent's work makes its conversation Trama's, with no Event of its own", () => {
  const commands: [string, boolean][] = [
    ['export PATH="/x/bin:$PATH" && trama announce task "Card"', true],
    ['"/home/u/.cursor/extensions/trama/bin/trama" task move abcd1234 doing', true],
    ['& "C:\\Users\\u\\trama.exe" ask', true],
    ["trama --root /project proposal new Design --json", true],
    ["trama compare brief order --candidates", true],
    ["trama compare file j340jw58 comparison.json", false],
    ["trama task next --batch --max 4", false],
    ["trama search announce", false],
    ["trama task move abcd1234 done", false],
    ["grep trama announce notes.md", false],
    ["echo trama announce", false],
  ];
  for (const [command, work] of commands) expect(registersAgentWork(command)).toBe(work);

  const conversations = new CursorConversations();
  const shell = (conversation: string, command: string) => parseCursorHook({ hook_event_name: "afterShellExecution", conversation_id: conversation, workspace_roots: [project], command, output: "Secret output" });
  const work = shell("s1", 'trama announce task "Secret card"');
  expect(work).toEqual({ hook: "afterShellExecution", conversation: "s1", root: project, tramaWork: true });
  expect(JSON.stringify(work)).not.toContain("Secret");
  expect(conversations.translate(work!)).toBeNull();
  expect(conversations.translate({ hook: "stop", conversation: "s1", root: project, status: "completed" })?.event).toBe("AGENT_STOPPED");
  const reads = shell("s2", "trama task next --batch --max 4");
  expect(conversations.translate(reads!)).toBeNull();
  expect(conversations.translate({ hook: "stop", conversation: "s2", root: project, status: "completed" })).toBeNull();
});

test("Cursor's hooks file is written again only when Trama's entries change", () => {
  const file = join(root, ".cursor", "hooks.json");
  writeCursorHooks(file, "/bin/trama", false);
  utimesSync(file, new Date(1000), new Date(1000));
  writeCursorHooks(file, "/bin/trama", false);
  expect(statSync(file).mtimeMs).toBe(1000);
  writeCursorHooks(file, "/other/trama", false);
  expect(statSync(file).mtimeMs).not.toBe(1000);
});

test("every editor window of the project gets the hook, and a window that never answers holds back none of them", async () => {
  const received: string[] = [];
  const windows = [
    await createQuestionServer({ project: projectAt(project), runtimeDir, windowId: "answering", handler: async () => ({ status: "unavailable" }) as never, onCursorHook: (h) => { received.push(`answering ${h.hook}`); } }),
    await createQuestionServer({ project: projectAt(project), runtimeDir, windowId: "other", handler: async () => ({ status: "unavailable" }) as never, onCursorHook: (h) => { received.push(`other ${h.hook}`); } }),
  ];
  const record = JSON.parse(readFileSync(join(runtimeDir, readdirSync(runtimeDir).find((name) => name.endsWith(".json"))!), "utf8")) as { projectId: string };
  const silentEndpoint = join(root, "silent.sock");
  const silent = createServer(() => {});
  await new Promise<void>((resolve) => silent.listen(silentEndpoint, resolve));
  writeFileSync(join(runtimeDir, "silent.json"), JSON.stringify({ projectId: record.projectId, windowId: "silent", endpoint: silentEndpoint, focusedAt: Date.now(), secret: "s" }), { mode: 0o600 });
  try {
    const started = Date.now();
    expect(await runCursorHook(JSON.stringify(prompt("Use the trama-design skill")), { runtimeDir })).toBe('{"continue":true}');
    expect(received.sort()).toEqual(["answering beforeSubmitPrompt", "other beforeSubmitPrompt"]);
    expect(Date.now() - started).toBeLessThan(2000);
  } finally {
    silent.close();
    for (const server of windows) await server.dispose();
  }
});

const questionTool = (conversation = "c1", toolName = "AskQuestion") => ({ hook_event_name: "preToolUse", conversation_id: conversation, workspace_roots: [project], tool_name: toolName });

test("the question tool's hook is read only for that tool, and its check produces no Event", () => {
  expect(parseCursorHook(questionTool("c1"))).toEqual({ hook: "preToolUse", conversation: "c1", root: project });
  expect(parseCursorHook(questionTool("c1", "Shell"))).toBeNull();
  const c = new CursorConversations();
  c.translate({ root: project, hook: "beforeSubmitPrompt", conversation: "t", tramaPrompt: true });
  expect(c.translate({ root: project, hook: "preToolUse", conversation: "t" })).toBeNull();
  expect(c.isTrama("t")).toBe(true);
  expect(c.isTrama("a")).toBe(false);
});

test("Cursor's hooks file has the question tool's entry, matched to that tool only", () => {
  const file = join(root, ".cursor", "hooks.json");
  writeCursorHooks(file, "/bin/trama", false);
  expect(JSON.parse(readFileSync(file, "utf8")).hooks.preToolUse).toEqual([{ command: `"/bin/trama" cursor-hook`, matcher: "AskQuestion" }]);
});

test("trama cursor-hook refuses Cursor's question tool only in a conversation an editor knows as Trama's", async () => {
  const asked: CursorHook[] = [];
  const server = await createQuestionServer({ project: projectAt(project), runtimeDir, handler: async () => ({ status: "unavailable" }) as never, onCursorHook: (h) => { asked.push(h); return h.conversation === "t"; } });
  try {
    expect(await runCursorHook(JSON.stringify(questionTool("t")), { runtimeDir })).toBe(JSON.stringify({ permission: "deny", agent_message: QUESTION_TOOL_REFUSAL }));
    expect(await runCursorHook(JSON.stringify(questionTool("other")), { runtimeDir })).toBe("{}");
    expect(await runCursorHook(JSON.stringify(questionTool("t", "Shell")), { runtimeDir })).toBe("{}");
    expect(asked).toEqual([
      { hook: "preToolUse", conversation: "t", root: project },
      { hook: "preToolUse", conversation: "other", root: project },
    ]);
  } finally {
    await server.dispose();
  }
  expect(await runCursorHook(JSON.stringify(questionTool("t")), { runtimeDir })).toBe("{}");
});
