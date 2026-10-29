import { z } from "zod";
import { terminalFromEnv } from "../../core/announcements";
import { sendAgentIdle, sendAgentStarted } from "../../core/question-channel";
import { defineCommand } from "../registry";

const none = z.strictObject({});

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
    "Run by the hook Trama makes omp load, once, at the first start of its main session, not by people. It takes the terminal from `TRAMA_TERMINAL`, finds the editor of the project and tells it the process of the agent of that terminal, so the run check can watch it. It starts no process and does not read the start time of the process: the editor does that afterwards, in the background, so the command never waits for it. It is not a sign of life and is never repeated. It waits at most one second, prints nothing and exits with 0 also without an editor, a project or `TRAMA_TERMINAL`, or with a process that is not a positive integer (then it sends nothing); only a wrong use exits with 2.",
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

export const HOOK_COMMANDS = [idle, start];
