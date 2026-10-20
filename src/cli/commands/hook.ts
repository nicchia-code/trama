import { z } from "zod";
import { terminalFromEnv } from "../../core/announcements";
import { hookAnswer, parseCursorHook } from "../../core/cursor-chat";
import { parseCopilotHook } from "../../core/copilot-chat";
import { QUESTION_TOOL_REFUSAL } from "../../core/questions";
import { sendAgentIdle, sendCopilotHook, sendCursorHook } from "../../core/question-channel";
import { defineCommand } from "../registry";

/** Standard input may start with a UTF-8 byte order mark (Windows PowerShell 5.1 adds one to a pipe); it is not part of the JSON. */
const parseHookJson = (input: string): unknown => JSON.parse(input.replace(/^\uFEFF/, ""));

/**
 * `trama hook cursor`: forwards one of Cursor's hooks to the editor of its project and answers Cursor. It never holds
 * Cursor up and never fails: without an editor, a Trama project or valid input it still answers and exits with 0.
 */
export async function runCursorHook(input: string, options: { runtimeDir?: string } = {}): Promise<string> {
  let raw: unknown;
  try { raw = parseHookJson(input); } catch { return "{}"; }
  const hook = parseCursorHook(raw);
  if (hook?.hook === "preToolUse") {
    const refused = await sendCursorHook(hook, options);
    return JSON.stringify(refused ? { permission: "deny", agent_message: QUESTION_TOOL_REFUSAL } : {});
  }
  if (hook) await sendCursorHook(hook, options);
  return JSON.stringify(hookAnswer((raw as { hook_event_name?: unknown } | null)?.hook_event_name));
}

/** `trama hook copilot`: forwards Copilot events without blocking the chat, and refuses the question tool in Trama's conversations. */
export async function runCopilotHook(input: string, options: { runtimeDir?: string } = {}): Promise<string> {
  let raw: unknown;
  try { raw = parseHookJson(input); } catch { return "{}"; }
  const hook = parseCopilotHook(raw);
  if (hook?.hook === "PreToolUse") return (await sendCopilotHook(hook, options)) ? questionToolDenial() : "{}";
  if (hook) await sendCopilotHook(hook, options);
  return "{}";
}

/** `trama hook claude-question-tool`: Claude Code's PreToolUse answer that refuses its own question tool in Trama's work. Reads nothing and never contacts the editor. */
export function questionToolDenial(): string {
  return JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: QUESTION_TOOL_REFUSAL } });
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
    "Run by Cursor's `beforeSubmitPrompt`, `stop`, `sessionEnd`, `preToolUse` and `afterShellExecution` hooks, not by people or agents. It hands every live editor window of the project the hook name, the conversation and the project folder, and answers Cursor with `{}`, `{\"continue\":true}` or the refusal of Cursor's question tool. Whatever happens, even without an editor or a project, it answers and exits with 0.",
  stdin: "Reads the hook's JSON on standard input.",
  input: none,
  output: hookAnswerShape,
  failure: () => answered,
  run: async (_ctx, _input, _args, runtime) => {
    const md = await runCursorHook(await runtime.stdin(), { runtimeDir: runtime.runtimeDir });
    return { md, json: JSON.parse(md) };
  },
});

const copilot = defineCommand({
  object: "hook",
  verb: "copilot",
  mode: "hook",
  hidden: true,
  summary: "Run by VS Code's hooks: tells the editor what Copilot chat does. It always exits with 0.",
  description:
    "Run by VS Code's `UserPromptSubmit`, `Stop` and `PreToolUse` hooks. It hands the editor of the project the hook name, the session and whether a prompt starts a Trama skill, never the prompt, waits at most one second, prints `{}` (or the refusal of the question tool) and exits with 0 even without an editor, a project or valid input.",
  stdin: "Reads the hook's JSON on standard input.",
  input: none,
  output: hookAnswerShape,
  failure: () => answered,
  run: async (_ctx, _input, _args, runtime) => {
    const md = await runCopilotHook(await runtime.stdin(), { runtimeDir: runtime.runtimeDir });
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

const claudeQuestionTool = defineCommand({
  object: "hook",
  verb: "claude-question-tool",
  mode: "hook",
  hidden: true,
  summary: "Run by Claude Code's hook before its own question tool: refuses it.",
  description:
    "Run by the `PreToolUse` hook Trama makes Claude Code load for its `AskUserQuestion` tool. It refuses the tool with the shared refusal, which says to ask only with `trama question new`, reads nothing, never contacts the editor and exits with 0.",
  input: none,
  output: z.object({ hookSpecificOutput: z.object({ hookEventName: z.literal("PreToolUse"), permissionDecision: z.literal("deny"), permissionDecisionReason: z.string() }) }),
  run: async () => {
    const md = questionToolDenial();
    return { md, json: JSON.parse(md) };
  },
});

export const HOOK_COMMANDS = [cursor, copilot, idle, claudeQuestionTool];
