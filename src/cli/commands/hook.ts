import { z } from "zod";
import { terminalFromEnv } from "../../core/announcements";
import { hookAnswer, parseCursorHook } from "../../core/cursor-chat";
import { QUESTION_TOOL_REFUSAL } from "../../core/questions";
import { sendAgentIdle, sendCursorHook } from "../../core/question-channel";
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

export const HOOK_COMMANDS = [cursor, idle];
