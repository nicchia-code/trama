import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execute, reportActivity } from "../src/cli/main";
import { runCursorHook } from "../src/cli/commands/hook";
import type { AgentOrigin } from "../src/core/announcements";
import { type ChatState, completedCommandAnswer, CursorConversations, type CursorHook, hookAnswer, parseCursorHook, registersAgentWork, writeCursorHooks } from "../src/core/cursor-chat";
import { createQuestionServer, questionProjectId, readChatStates } from "../src/core/question-channel";
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
  expect(parseCursorHook({ ...prompt("x"), hook_event_name: "notAHook" })).toBeNull();
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
  expect(at({ hook: "sessionEnd", conversation: "t", reason: "aborted" })).toBe("AGENT_INTERRUPTED");
  expect(at({ hook: "sessionEnd", conversation: "t", reason: "error" })).toBe("AGENT_INTERRUPTED");
  expect(at({ hook: "sessionEnd", conversation: "t", reason: "user_close" })).toBe("CONVERSATION_CLOSED");
  expect(at({ hook: "stop", conversation: "t", status: "completed" })).toBeNull();
});

test("trama hook cursor hands the hook, never the prompt, to the project's editor and always answers Cursor", async () => {
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
  const mine = (program: string) => [{ command: `"${program}" hook cursor` }];
  const limitless = (program: string) => [{ command: `"${program}" hook cursor`, loop_limit: null }];
  const shell = (program: string) => [{ command: `"${program}" hook cursor`, matcher: "trama" }, { command: `"${program}" hook cursor` }];
  const question = (program: string) => [{ command: `"${program}" hook cursor`, matcher: "AskQuestion" }, { command: `"${program}" hook cursor`, matcher: "Shell" }];
  const all = (program: string) => ({
    beforeSubmitPrompt: mine(program), stop: limitless(program), sessionEnd: mine(program), afterShellExecution: shell(program), preToolUse: question(program),
    afterFileEdit: mine(program), postToolUse: mine(program), subagentStart: mine(program), subagentStop: limitless(program),
  });
  expect(read()).toEqual({ version: 1, hooks: all("/old/bin/trama") });

  writeFileSync(file, JSON.stringify({ version: 1, hooks: { stop: [{ command: "./mine.sh" }, ...mine("/old/bin/trama")], afterFileEdit: [{ command: "fmt" }] } }));
  writeCursorHooks(file, "/new/bin/trama", false);
  expect(read().hooks).toEqual({ ...all("/new/bin/trama"), stop: [{ command: "./mine.sh" }, ...limitless("/new/bin/trama")], afterFileEdit: [{ command: "fmt" }, ...mine("/new/bin/trama")] });

  // Entries with the old `cursor-hook` command are Trama's too and are rewritten; another tool's entry that merely mentions it is not.
  const old = (program: string, matcher?: string) => ({ command: `"${program}" cursor-hook`, ...(matcher === undefined ? {} : { matcher }) });
  writeFileSync(file, JSON.stringify({ version: 1, hooks: { stop: [{ command: "./mine.sh" }, old("/older/bin/trama")], afterShellExecution: [old("/older/bin/trama", "trama"), { command: "./other cursor-hook", matcher: "x" }], preToolUse: [old("/older/bin/trama", "AskQuestion")] } }));
  writeCursorHooks(file, "/new/bin/trama", false);
  expect(read().hooks.stop).toEqual([{ command: "./mine.sh" }, ...limitless("/new/bin/trama")]);
  expect(read().hooks.afterShellExecution).toEqual([{ command: "./other cursor-hook", matcher: "x" }, ...shell("/new/bin/trama")]);
  expect(read().hooks.preToolUse).toEqual(question("/new/bin/trama"));
  expect(JSON.stringify(read())).not.toContain('" cursor-hook');

  writeFileSync(file, "{ broken");
  expect(() => writeCursorHooks(file, "/new/bin/trama")).toThrow(/not valid JSON/);
  expect(readFileSync(file, "utf8")).toBe("{ broken");
});

test("on Windows Cursor's entries have the PowerShell form, and either form is replaced by the other on update", () => {
  const file = join(root, ".cursor", "hooks.json");
  writeCursorHooks(file, "C:\\old\\trama.exe", false);
  writeCursorHooks(file, "C:\\new\\trama.exe", true);
  const read = () => JSON.parse(readFileSync(file, "utf8")).hooks;
  expect(read().postToolUse).toEqual([{ command: '& "C:\\new\\trama.exe" hook cursor' }]);
  writeCursorHooks(file, "C:\\newer\\trama.exe", false);
  expect(read().postToolUse).toEqual([{ command: '"C:\\newer\\trama.exe" hook cursor' }]);
});

test("only commands that change project state tell the editor; read-only commands do not", async () => {
  const received: AgentOrigin[] = [];
  const server = await createQuestionServer({ project: projectAt(project), runtimeDir, handler: async () => ({ status: "unavailable" }) as never, onActivity: (origin) => received.push(origin) });
  try {
    const tell = (argv: string[], env: Record<string, string>) => reportActivity(argv, project, { env, runtimeDir });
    await tell(["task", "move", "abcd1234", "doing"], { TRAMA_TERMINAL: "abc123" });
    await tell(["drift", "new", "x"], { CURSOR_AGENT: "1" });
    await tell(["announcement", "new"], {});
    await tell(["task", "list"], { TRAMA_TERMINAL: "abc123" });
    await tell(["proposal", "edit", "abcd1234"], { TRAMA_TERMINAL: "abc123" });
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
    await execute(["hook", "idle"], project, { env: { TRAMA_TERMINAL: "abc123" }, runtimeDir });
    await execute(["hook", "idle"], project, { env: {}, runtimeDir });
    expect(received).toEqual([["abc123", project]]);
  } finally {
    await server.dispose();
  }
  await expect(execute(["hook", "idle"], project, { env: { TRAMA_TERMINAL: "abc123" }, runtimeDir })).resolves.toEqual({ out: "", exit: 0 });
  await expect(execute(["hook", "alive"], project, { env: {}, runtimeDir })).rejects.toThrow('Unknown command "hook alive"');
  await expect(execute(["agent-event", "idle"], project, { env: {}, runtimeDir })).rejects.toThrow('Run "trama --help"');
});

test("the start hook tells the project's editor the process of the agent; a bad pid, no terminal or no editor tells nothing and never fails", async () => {
  const received: [string, number, string][] = [];
  const server = await createQuestionServer({ project: projectAt(project), runtimeDir, handler: async () => ({ status: "unavailable" }) as never, onAgentStarted: (terminal, pid, root) => received.push([terminal, pid, root]) });
  try {
    await execute(["hook", "start", "4242"], project, { env: { TRAMA_TERMINAL: "abc123" }, runtimeDir });
    await execute(["hook", "start", "4242"], project, { env: {}, runtimeDir });
    for (const bad of ["0", "-3", "abc", "1.5", "99999999999999999999"]) await expect(execute(["hook", "start", bad], project, { env: { TRAMA_TERMINAL: "abc123" }, runtimeDir })).resolves.toEqual({ out: "", exit: 0 });
    expect(received).toEqual([["abc123", 4242, project]]);
  } finally {
    await server.dispose();
  }
  await expect(execute(["hook", "start", "4242"], project, { env: { TRAMA_TERMINAL: "abc123" }, runtimeDir })).resolves.toEqual({ out: "", exit: 0 });
  await expect(execute(["hook", "start"], project, { env: { TRAMA_TERMINAL: "abc123" }, runtimeDir })).rejects.toThrow("Usage");
});

test("a shell command that registers the agent's work makes its conversation Trama's, with no Event of its own", () => {
  const commands: [string, boolean][] = [
    ['export PATH="/x/bin:$PATH" && trama announcement new --input -', true],
    ["trama announcement move abcd1234 --input -", true],
    ["trama announcement list", false],
    ['"/home/u/.cursor/extensions/trama/bin/trama" task move abcd1234 doing', true],
    ['& "C:\\Users\\u\\trama.exe" question new --input -', true],
    ["trama --root /p question new --input -", true],
    ["trama ask", false],
    ["trama announce task x", false],
    ["trama --root /project proposal new Design --json", true],
    ["trama comparison new order --input -", true],
    ["trama comparison move j340jw58 delivered --input -", false],
    ["trama task list --input -", false],
    ["trama model list --input -", false],
    ["trama proposal show abcd1234", false],
    ["trama task move abcd1234 done", false],
    ["grep trama announce notes.md", false],
    ["echo trama announce", false],
  ];
  for (const [command, work] of commands) expect(registersAgentWork(command)).toBe(work);

  const conversations = new CursorConversations();
  const shell = (conversation: string, command: string) => parseCursorHook({ hook_event_name: "afterShellExecution", conversation_id: conversation, workspace_roots: [project], command, output: "Secret output" });
  const work = shell("s1", 'trama announcement new --input - <<< \'{"kind":"task","title":"Secret card"}\'');
  expect(work).toEqual({ hook: "afterShellExecution", conversation: "s1", root: project, tramaWork: true });
  expect(JSON.stringify(work)).not.toContain("Secret");
  expect(conversations.translate(work!)).toBeNull();
  expect(conversations.translate({ hook: "stop", conversation: "s1", root: project, status: "completed" })?.event).toBe("AGENT_STOPPED");
  const reads = shell("s2", "trama task list --input -");
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
  expect(JSON.parse(readFileSync(file, "utf8")).hooks.preToolUse).toEqual([{ command: `"/bin/trama" hook cursor`, matcher: "AskQuestion" }, { command: `"/bin/trama" hook cursor`, matcher: "Shell" }]);
});

const shellTool = (command: string, extra: object = {}, conversation = "c1") => ({ hook_event_name: "preToolUse", conversation_id: conversation, workspace_roots: [project], tool_name: "Shell", tool_input: { command, working_directory: project }, ...extra });

test("a command line that runs trama is completed with its conversation and job, and nothing else is touched", async () => {
  const server = await createQuestionServer({ project: projectAt(project), runtimeDir, windowId: "w1", handler: async () => ({ status: "unavailable" }) as never });
  try {
    server.setChatState(chatState({ conversations: [{ conversation: "c1", job: "j1", advisor: false }, { conversation: "c2", advisor: false }], subagents: [{ call: "k1", conversation: "c1" }, { call: "k2", conversation: "k1" }] }));
    const run = async (input: object) => JSON.parse(await runCursorHook(JSON.stringify(input), { runtimeDir }));
    // The identity as the shell of this platform gets it: PowerShell on Windows, a POSIX shell elsewhere.
    const identity = (conversation: string, job?: string) => process.platform === "win32"
      ? `$env:TRAMA_CHAT='${conversation}'; ${job === undefined ? "" : `$env:TRAMA_JOB='${job}'; `}`
      : `TRAMA_CHAT='${conversation}' ${job === undefined ? "" : `TRAMA_JOB='${job}' `}`;
    const done = await run(shellTool("trama task list"));
    expect(done).toEqual({ updated_input: { command: `${identity("c1", "j1")}trama task list`, working_directory: project } });
    expect(done.permission).toBeUndefined();
    // A conversation without a job gets no TRAMA_JOB.
    expect((await run(shellTool("trama model show", {}, "c2"))).updated_input.command).toBe(`${identity("c2")}trama model show`);
    expect(await run(shellTool(`echo 'x && trama task list'`, {}, "c2"))).toEqual({});
    // A sub-agent, also a nested one, is its main conversation.
    expect((await run(shellTool("trama task list", { parent_tool_call_id: "k1" }, "sub"))).updated_input.command).toBe(`${identity("c1", "j1")}trama task list`);
    expect((await run(shellTool("trama task list", { parent_tool_call_id: "k2" }, "sub2"))).updated_input.command).toBe(`${identity("c1", "j1")}trama task list`);
    // Not a conversation of Trama, a line that does not run trama, another tool: nothing changes.
    expect(await run(shellTool("trama task list", {}, "other"))).toEqual({});
    expect(await run(shellTool("echo trama"))).toEqual({});
    expect(await run({ ...shellTool("trama task list"), tool_name: "Read" })).toEqual({});
  } finally {
    await server.dispose();
  }
});

test("on a POSIX shell every trama invocation of a line gets the literal prefix, and quoted text is never rewritten", () => {
  const answer = (command: string, who: { conversation: string; job?: string } = { conversation: "c2" }) => completedCommandAnswer({ command }, who, false);
  const completed = (command: string) => ({ updated_input: { command } });
  // No `export` leaves variables in the shell.
  expect(answer("cd x && trama model show")).toEqual(completed("cd x && TRAMA_CHAT='c2' trama model show"));
  expect(answer("trama task list | cat; (cd y && trama --root /p question new --input -)", { conversation: "c1", job: "j1" }))
    .toEqual(completed("TRAMA_CHAT='c1' TRAMA_JOB='j1' trama task list | cat; (cd y && TRAMA_CHAT='c1' TRAMA_JOB='j1' trama --root /p question new --input -)"));
  expect(answer("echo hi && FOO=1 trama task list && trama model show")).toEqual(completed("echo hi && TRAMA_CHAT='c2' FOO=1 trama task list && TRAMA_CHAT='c2' trama model show"));
  // Text inside quotes and here-document bodies is never rewritten, even when it looks like a trama command.
  expect(answer(`echo "a; trama task move x doing" && trama task list`)).toEqual(completed(`echo "a; trama task move x doing" && TRAMA_CHAT='c2' trama task list`));
  expect(answer(`trama question new --input - <<'EOF'\n{"a":1}\ntrama task list\nEOF\ntrama model show`))
    .toEqual(completed(`TRAMA_CHAT='c2' trama question new --input - <<'EOF'\n{"a":1}\ntrama task list\nEOF\nTRAMA_CHAT='c2' trama model show`));
  expect(answer("trama task list", { conversation: "it's" })).toEqual(completed(`TRAMA_CHAT='it'\\''s' trama task list`));
});

test("on Windows the line starts with the PowerShell assignments, with single quotes doubled", () => {
  expect(completedCommandAnswer({ command: "cd x; trama model show", working_directory: "p" }, { conversation: "it's", job: "j1" }, true))
    .toEqual({ updated_input: { command: "$env:TRAMA_CHAT='it''s'; $env:TRAMA_JOB='j1'; cd x; trama model show", working_directory: "p" } });
  expect(completedCommandAnswer({ command: "trama task list" }, { conversation: "c2" }, true)).toEqual({ updated_input: { command: "$env:TRAMA_CHAT='c2'; trama task list" } });
});

test("without a state file the command line starts as it is", async () => {
  expect(await runCursorHook(JSON.stringify(shellTool("trama task list")), { runtimeDir })).toBe("{}");
});

test("trama hook cursor refuses Cursor's question tool only in a conversation an editor knows as Trama's", async () => {
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

const chatState = (extra: Partial<ChatState> = {}): ChatState => ({ root: project, conversations: [{ conversation: "main", job: "job1", advisor: true }], subagents: [], agents: [{ agent: "main", text: false }], ...extra });
const hookJson = (name: string, extra: Record<string, unknown> = {}, conversation = "main") => JSON.stringify({ hook_event_name: name, conversation_id: conversation, workspace_roots: [project], ...extra });

test("the new hooks are read with project-relative paths and never keep the edit, the command or the output", () => {
  expect(parseCursorHook({ hook_event_name: "afterFileEdit", conversation_id: "a", workspace_roots: [project], file_path: join(project, "src", "a.ts"), edits: [{ new_string: "Secret" }] })).toEqual({ hook: "afterFileEdit", conversation: "a", root: project, file: "src/a.ts" });
  expect(parseCursorHook({ hook_event_name: "afterFileEdit", conversation_id: "a", workspace_roots: [project], file_path: join(root, "elsewhere.ts") })).toEqual({ hook: "afterFileEdit", conversation: "a", root: project });
  expect(parseCursorHook({ hook_event_name: "subagentStart", conversation_id: "a", workspace_roots: [project], parent_conversation_id: "p", subagent_type: "task", subagent_id: "call1", task: "Secret" })).toEqual({ hook: "subagentStart", conversation: "a", root: project, parent: "p", subagentType: "task", call: "call1" });
  expect(parseCursorHook({ hook_event_name: "subagentStop", conversation_id: "a", workspace_roots: [project], status: "error", subagent_type: "task", subagent_id: "call1", child_conversation_id: "kid", modified_files: [join(project, "x.ts"), "/etc/passwd"] })).toEqual({ hook: "subagentStop", conversation: "a", root: project, status: "error", subagentType: "task", call: "call1", child: "kid", modifiedFiles: ["x.ts"] });
  expect(parseCursorHook({ hook_event_name: "postToolUse", conversation_id: "a", workspace_roots: [project], tool_name: "Shell", tool_output: "Secret" })).toEqual({ hook: "postToolUse", conversation: "a", root: project });
});

test("the hooks of watched agents become Events, and a stop is TURN_FINISHING only for a conversation with the chat Advisor", () => {
  const c = new CursorConversations();
  const at = (h: Omit<CursorHook, "root">, advisor = false) => c.translate({ root: project, ...h }, () => advisor);
  expect(at({ hook: "afterFileEdit", conversation: "m", file: "a.ts" })).toEqual({ event: "FILES_CHANGED", conversation: "m", root: project, files: ["a.ts"] });
  expect(at({ hook: "afterFileEdit", conversation: "m" })).toBeNull();
  expect(at({ hook: "afterShellExecution", conversation: "m", snapshot: [{ path: "a.ts", hash: "h" }, { path: "gone.ts" }] })).toEqual({ event: "FILES_CHANGED", conversation: "m", root: project, snapshot: [{ path: "a.ts", hash: "h" }, { path: "gone.ts" }] });
  expect(at({ hook: "postToolUse", conversation: "m" })?.event).toBe("TOOL_FINISHED");
  expect(at({ hook: "subagentStart", conversation: "m", parent: "m", call: "c1" })).toBeNull();
  expect(at({ hook: "subagentStop", conversation: "m", status: "completed", call: "c1", child: "k", modifiedFiles: ["a.ts"] })).toEqual({ event: "SUBAGENT_STOPPED", conversation: "m", root: project, subagent: { call: "c1", child: "k", modifiedFiles: ["a.ts"] } });
  expect(at({ hook: "subagentStop", conversation: "m", status: "aborted" })?.event).toBe("SUBAGENT_INTERRUPTED");
  expect(at({ hook: "subagentStop", conversation: "m", status: "error" })?.event).toBe("SUBAGENT_INTERRUPTED");
  at({ hook: "beforeSubmitPrompt", conversation: "t", tramaPrompt: true });
  expect(at({ hook: "stop", conversation: "t", status: "completed" }, true)?.event).toBe("TURN_FINISHING");
  expect(at({ hook: "stop", conversation: "t", status: "completed" }, false)?.event).toBe("AGENT_STOPPED");
});

test("the hooks answer Cursor: context for postToolUse, allow for subagentStart, follow-up for stop and subagentStop", () => {
  expect(hookAnswer("postToolUse", "note")).toEqual({ additional_context: "note" });
  expect(hookAnswer("postToolUse")).toEqual({});
  expect(hookAnswer("subagentStart")).toEqual({ permission: "allow" });
  expect(hookAnswer("stop", "again")).toEqual({ followup_message: "again" });
  expect(hookAnswer("subagentStop", "again")).toEqual({ followup_message: "again" });
  expect(hookAnswer("subagentStop")).toEqual({});
  expect(hookAnswer("afterFileEdit", "x")).toEqual({});
});

test("a window's state file holds only identities, is replaced atomically, and goes with the window", async () => {
  const server = await createQuestionServer({ project: projectAt(project), runtimeDir, windowId: "w1", handler: async () => ({ status: "unavailable" }) as never });
  const projectId = questionProjectId(projectAt(project));
  try {
    expect(readChatStates(projectId, runtimeDir)).toEqual([]);
    server.setChatState(chatState({ subagents: [{ call: "c1", conversation: "main" }] }));
    const [state] = readChatStates(projectId, runtimeDir);
    expect(state).toEqual({ windowId: "w1", ...chatState({ subagents: [{ call: "c1", conversation: "main" }] }) });
    const name = readdirSync(runtimeDir).find((n) => n.endsWith(".state"))!;
    expect(readdirSync(runtimeDir).some((n) => n.includes(".tmp"))).toBe(false);
    // A value that is not an identity is ignored.
    writeFileSync(join(runtimeDir, name), JSON.stringify({ projectId, windowId: "w1", root: project, conversations: [{ conversation: "bad id with spaces", advisor: true }, { conversation: "ok", advisor: true }], subagents: [], agents: [{ agent: "/etc/passwd", text: true }] }), { mode: 0o600 });
    expect(readChatStates(projectId, runtimeDir)[0]).toEqual({ windowId: "w1", root: project, conversations: [{ conversation: "ok", advisor: true }], subagents: [], agents: [] });
    expect(readChatStates("other-project", runtimeDir)).toEqual([]);
    server.setChatState(undefined);
    expect(readChatStates(projectId, runtimeDir)).toEqual([]);
    server.setChatState(chatState());
  } finally {
    await server.dispose();
  }
  expect(readdirSync(runtimeDir).filter((n) => n.endsWith(".state"))).toEqual([]);
});

test("the frequent hooks read the state file and contact a window only for an agent it watches", async () => {
  const received: string[] = [];
  const server = await createQuestionServer({
    project: projectAt(project), runtimeDir, windowId: "w1", handler: async () => ({ status: "unavailable" }) as never,
    onCursorHook: (h) => {
      received.push(`${h.hook}:${h.conversation}`);
      if (h.hook === "postToolUse") return { text: "Trama's Advisor: fix it" };
      if (h.hook === "stop" || h.hook === "subagentStop") return { text: "review again" };
    },
  });
  try {
    // Without a state file nothing is contacted, and subagentStart is still allowed.
    expect(await runCursorHook(hookJson("afterFileEdit", { file_path: join(project, "a.ts") }), { runtimeDir })).toBe("{}");
    expect(await runCursorHook(hookJson("postToolUse"), { runtimeDir })).toBe("{}");
    expect(await runCursorHook(hookJson("subagentStart", { subagent_type: "task", subagent_id: "c1" }), { runtimeDir })).toBe('{"permission":"allow"}');
    expect(await runCursorHook(hookJson("subagentStop", { status: "completed", subagent_id: "c1" }), { runtimeDir })).toBe("{}");
    expect(received).toEqual([]);

    server.setChatState(chatState());
    // A watched agent's edit is sent; another conversation's is not.
    expect(await runCursorHook(hookJson("afterFileEdit", { file_path: join(project, "a.ts") }), { runtimeDir })).toBe("{}");
    expect(await runCursorHook(hookJson("afterFileEdit", { file_path: join(project, "a.ts") }, "stranger"), { runtimeDir })).toBe("{}");
    expect(received).toEqual(["afterFileEdit:main"]);
    // postToolUse asks for the text only when the state says one waits.
    expect(await runCursorHook(hookJson("postToolUse"), { runtimeDir })).toBe("{}");
    server.setChatState(chatState({ agents: [{ agent: "main", text: true }] }));
    expect(await runCursorHook(hookJson("postToolUse"), { runtimeDir })).toBe(JSON.stringify({ additional_context: "Trama's Advisor: fix it" }));
    expect(await runCursorHook(hookJson("postToolUse", {}, "stranger"), { runtimeDir })).toBe("{}");
    // subagentStart for a Trama conversation is sent and allowed; for another it is only allowed.
    expect(await runCursorHook(hookJson("subagentStart", { subagent_type: "task", subagent_id: "c1" }), { runtimeDir })).toBe('{"permission":"allow"}');
    expect(await runCursorHook(hookJson("subagentStart", { subagent_type: "task", subagent_id: "c2" }, "stranger"), { runtimeDir })).toBe('{"permission":"allow"}');
    // A watched sub-agent's stop continues it with the host's message.
    server.setChatState(chatState({ agents: [{ agent: "main", text: false }, { agent: "kid", text: false }], subagents: [{ call: "c1", conversation: "main" }] }));
    expect(await runCursorHook(hookJson("subagentStop", { status: "completed", subagent_id: "c1", child_conversation_id: "kid" }, "kid"), { runtimeDir })).toBe(JSON.stringify({ followup_message: "review again" }));
    expect(await runCursorHook(hookJson("subagentStop", { status: "completed", subagent_id: "c9" }, "stranger"), { runtimeDir })).toBe("{}");
    expect(await runCursorHook(hookJson("stop", { status: "completed" }), { runtimeDir })).toBe(JSON.stringify({ followup_message: "review again" }));
    expect(received).toEqual(["afterFileEdit:main", "postToolUse:main", "subagentStart:main", "subagentStop:kid", "stop:main"]);
  } finally {
    await server.dispose();
  }
});

test("a shell command of a watched agent sends the photograph of git status with content hashes; other commands send nothing", async () => {
  const git = (...args: string[]) => Bun.spawnSync(["git", ...args], { cwd: project, env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null" } });
  expect(git("init", "-q").exitCode).toBe(0);
  writeFileSync(join(project, "a.ts"), "export const a = 1;\n");
  mkdirSync(join(project, ".agents", "skills", "x"), { recursive: true });
  writeFileSync(join(project, ".agents", "skills", "x", "SKILL.md"), "skill\n");
  const received: CursorHook[] = [];
  const server = await createQuestionServer({ project: projectAt(project), runtimeDir, windowId: "w1", handler: async () => ({ status: "unavailable" }) as never, onCursorHook: (h) => { received.push(h); } });
  try {
    expect(await runCursorHook(hookJson("afterShellExecution", { command: "git checkout x", output: "Secret" }, "stranger"), { runtimeDir })).toBe("{}");
    expect(received).toEqual([]);
    server.setChatState(chatState());
    expect(await runCursorHook(hookJson("afterShellExecution", { command: "git apply p.diff", output: "Secret" }), { runtimeDir })).toBe("{}");
    const expectedHash = new TextDecoder().decode(git("hash-object", "a.ts").stdout).trim();
    expect(received).toEqual([{ hook: "afterShellExecution", conversation: "main", root: project, tramaWork: false, snapshot: [{ path: "a.ts", hash: expectedHash }] }]);
    expect(JSON.stringify(received)).not.toContain("Secret");
  } finally {
    await server.dispose();
  }
});

test("outside a git repository a watched agent's shell command sends nothing", async () => {
  const received: CursorHook[] = [];
  const server = await createQuestionServer({ project: projectAt(project), runtimeDir, windowId: "w1", handler: async () => ({ status: "unavailable" }) as never, onCursorHook: (h) => { received.push(h); } });
  try {
    server.setChatState(chatState());
    // A trama command still reaches the window as before, with no photograph.
    expect(await runCursorHook(hookJson("afterShellExecution", { command: "trama announcement new" }), { runtimeDir })).toBe("{}");
    expect(await runCursorHook(hookJson("afterShellExecution", { command: "ls" }), { runtimeDir })).toBe("{}");
    expect(received).toEqual([{ hook: "afterShellExecution", conversation: "main", root: project, tramaWork: true }]);
  } finally {
    await server.dispose();
  }
});
