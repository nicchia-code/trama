import { z } from "zod";
import { terminalFromEnv } from "../../core/announcements";
import { completedCommandAnswer, conversationIdentity, type CursorHook, hookAnswer, parseCursorHook, parseShellHook, windowsConcerned, workingTreeSnapshot } from "../../core/cursor-chat";
import { QUESTION_TOOL_REFUSAL } from "../../core/questions";
import { projectAt } from "../../core/store";
import { questionProjectId, readChatStates, sendAgentIdle, sendAgentStarted, sendCursorHook } from "../../core/question-channel";
import { defineCommand } from "../registry";

/** Standard input may start with a UTF-8 byte order mark (Windows PowerShell 5.1 adds one to a pipe); it is not part of the JSON. */
const parseHookJson = (input: string): unknown => JSON.parse(input.replace(/^\uFEFF/, ""));

/**
 * `trama hook cursor`: forwards one of Cursor's hooks to the editor of its project and answers Cursor. It never holds
 * Cursor up and never fails: without an editor, a Trama project or valid input it still answers and exits with 0.
 * The frequent hooks (`afterFileEdit`, `postToolUse`, `subagentStart`, `afterShellExecution`, `subagentStop`) first read
 * the editor's state file and contact a window only when it names the conversation or the agent.
 */
export async function runCursorHook(input: string, options: { runtimeDir?: string } = {}): Promise<string> {
  let raw: unknown;
  try { raw = parseHookJson(input); } catch { return "{}"; }
  const shell = parseShellHook(raw);
  if (shell) {
    // A line that runs `trama` is completed from the state file alone; any trouble leaves it as it is.
    try {
      const states = readChatStates(questionProjectId(projectAt(shell.root)), options.runtimeDir);
      return JSON.stringify(completedCommandAnswer(shell.toolInput, conversationIdentity(states, shell.conversation, shell.parentCall)));
    } catch { return "{}"; }
  }
  const hook = parseCursorHook(raw);
  const name = raw !== null && typeof raw === "object" && "hook_event_name" in raw ? raw.hook_event_name : undefined;
  if (!hook) return JSON.stringify(hookAnswer(name));
  if (hook.hook === "preToolUse") {
    const refused = await sendCursorHook(hook, options);
    return JSON.stringify(refused.trama ? { permission: "deny", agent_message: QUESTION_TOOL_REFUSAL } : {});
  }
  if (hook.hook === "afterFileEdit" || hook.hook === "postToolUse" || hook.hook === "subagentStart" || hook.hook === "subagentStop" || hook.hook === "afterShellExecution") {
    return JSON.stringify(hookAnswer(name, await sendWatched(hook, options)));
  }
  const reply = await sendCursorHook(hook, options);
  return JSON.stringify(hookAnswer(name, reply.text));
}

/**
 * The hooks that concern only some agents. Returns the text a window gives for the agent, if any. An agent no state file
 * names costs nothing but the read of the file: no window is contacted and no `git status` runs.
 */
async function sendWatched(hook: CursorHook, options: { runtimeDir?: string }): Promise<string | undefined> {
  let windows: string[];
  try {
    windows = windowsConcerned(readChatStates(questionProjectId(projectAt(hook.root)), options.runtimeDir), hook);
  } catch { return undefined; }
  if (hook.hook === "afterShellExecution") {
    // The snapshot is taken only for a watched agent; a command that registers the agent's work reaches every window, as before.
    const snapshot = windows.length > 0 ? workingTreeSnapshot(hook.root) : null;
    if (snapshot === null && hook.tramaWork !== true) return undefined;
    const sent: CursorHook = snapshot === null ? hook : { ...hook, snapshot };
    return (await sendCursorHook(sent, hook.tramaWork === true ? options : { ...options, windows, timeoutMs: 1000 })).text;
  }
  if (windows.length === 0) return undefined;
  return (await sendCursorHook(hook, { ...options, windows })).text;
}

const answered = { out: "{}", exit: 0 };
const none = z.strictObject({});
const hookAnswerShape = z.looseObject({}).describe("The answer the agent's hook expects: `{}` when nothing is refused.");

const cursor = defineCommand({
  object: "hook",
  verb: "cursor",
  mode: "hook",
  hidden: true,
  summary: "Run by Cursor's hooks: tells the editor what Cursor does. It always exits with 0.",
  description:
    "Run by Cursor's `beforeSubmitPrompt`, `stop`, `sessionEnd`, `preToolUse` and `afterShellExecution` hooks, not by people or agents. It hands every live editor window of the project the hook name, the conversation and the project folder, and answers Cursor with `{}`, `{\"continue\":true}`, the refusal of Cursor's question tool or, for a shell line that runs `trama` in a conversation of Trama, the line with `TRAMA_CHAT` and `TRAMA_JOB` written before every `trama` invocation of the line (so a compound line such as `cd x && trama model show` completes only its `trama` part and leaves no variable in the shell; on Windows the line starts with the `$env:` assignments instead). Whatever happens, even without an editor or a project, it answers and exits with 0.",
  stdin: "Reads the hook's JSON on standard input.",
  input: none,
  output: hookAnswerShape,
  failure: () => answered,
  run: async (_ctx, _input, _args, runtime) => {
    const md = await runCursorHook(await runtime.stdin(), { runtimeDir: runtime.runtimeDir });
    return { md, json: JSON.parse(md) };
  },
});

const idle = defineCommand({
  object: "hook",
  verb: "idle",
  mode: "hook",
  hidden: true,
  summary: "Run by an agent's hook when its session settles: tells the editor the terminal is idle.",
  description:
    "Run by the hook Trama makes omp load when its main session settles or ends, not by people. It takes the terminal from `TRAMA_TERMINAL`, finds the editor of the project and tells it that the agent of that terminal is idle: the editor then ends the run, releases the Tasks the terminal had taken and withdraws its announcements. It waits at most one second, prints nothing and exits with 0 also without an editor, a project or `TRAMA_TERMINAL`.",
  input: none,
  output: z.object({}),
  failure: () => ({ out: "", exit: 0 }),
  run: async (ctx, _input, _args, runtime) => {
    const terminal = terminalFromEnv(runtime.env);
    if (terminal !== undefined) await sendAgentIdle(ctx.project(), terminal, { env: runtime.env, runtimeDir: runtime.runtimeDir });
    return { md: "", json: {} };
  },
});

const start = defineCommand({
  object: "hook",
  verb: "start",
  mode: "hook",
  hidden: true,
  summary: "Run by an agent's hook when its main session starts: tells the editor which process is the agent of the terminal.",
  description:
    "Run by the hook Trama makes omp load, once, at the first start of its main session, not by people. It takes the terminal from `TRAMA_TERMINAL`, finds the editor of the project and tells it the process of the agent of that terminal, so the run check can watch it. It is not a sign of life and is never repeated. It waits at most one second, prints nothing and exits with 0 also without an editor, a project or `TRAMA_TERMINAL`, or with a process that is not a positive integer (then it sends nothing); only a wrong use exits with 2.",
  positionals: [{ name: "pid", description: "The process of the agent (omp), a positive integer." }],
  input: none,
  output: z.object({}),
  exampleArgs: ["12345"],
  failure: () => ({ out: "", exit: 0 }),
  run: async (ctx, _input, args, runtime) => {
    const text = args[0] ?? "";
    const pid = /^[0-9]+$/.test(text) ? Number(text) : 0;
    const terminal = terminalFromEnv(runtime.env);
    if (terminal !== undefined && Number.isSafeInteger(pid) && pid > 0) await sendAgentStarted(ctx.project(), terminal, pid, { env: runtime.env, runtimeDir: runtime.runtimeDir });
    return { md: "", json: {} };
  },
});

export const HOOK_COMMANDS = [cursor, idle, start];
