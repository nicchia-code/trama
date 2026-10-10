import { parseArgs } from "node:util";
import { CURSOR_AGENT_ENV, originFromEnv, terminalFromEnv } from "../core/announcements";
import { TramaError, UsageError } from "../core/errors";
import { askEditor, sendActivity, sendAgentIdle, sendCursorHook } from "../core/question-channel";
import { loadModel, type Project } from "../core/store";
import { hookAnswer, parseCursorHook } from "../core/cursor-chat";
import { sendCopilotHook } from "../core/question-channel";
import { parseCopilotHook } from "../core/copilot-chat";
import { parseQuestionRequest, questionAborted, questionFailure, type QuestionHandler } from "../core/questions";
import { arity, COMMANDS, type Command, makeContext, type Values } from "./commands";
import type { Result } from "./result";

/** Command groups; `announce` is also a command of its own (`announce <kind> <title>`) besides `announce phase` and `announce done`. */
const GROUPS = ["proposal", "task", "drift", "skills", "ids", "announce"];

function help(): string {
  const width = Math.max(...COMMANDS.map((c) => `${c.name} ${c.args}`.length));
  const rows = COMMANDS.map((c) => `  ${`${c.name} ${c.args}`.trimEnd().padEnd(width)}  ${c.summary}`);
  return [
    "trama [--json] [--root <dir>] <command> …",
    "",
    "Explore the Model and manage Proposals, Tasks and Drifts. Never reads your code.",
    "",
    ...rows,
    "",
    "Options: --json prints JSON instead of Markdown; --root <dir> uses <dir>/.trama.",
    "trama ask [--root <dir>] reads a question round as JSON from stdin and waits for the editor; stdout is JSON.",
    "trama cursor-hook is run by Cursor's hooks: it reads the hook's JSON from stdin and tells the editor; it always exits with 0.",
    "trama copilot-hook is run by VS Code's hooks: it reads the hook's JSON from stdin and tells the editor; it always exits with 0.",
    "trama agent-event idle is run by the hook of an agent in a terminal Trama started, when the agent has settled; it tells the editor and exits with 0.",
    "Exit codes: 0 ok, 1 failure (validation errors, unknown element, stale Proposal), 2 usage.",
  ].join("\n");
}

/** Pulls the global options out of argv, wherever they appear. */
export function splitGlobals(argv: string[]): { rest: string[]; json: boolean; root?: string } {
  const rest: string[] = [];
  let json = false;
  let root: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] as string;
    if (a === "--json") json = true;
    else if (a === "--root") {
      root = argv[++i];
      if (root === undefined) throw new UsageError("--root needs a directory");
    } else if (a.startsWith("--root=")) root = a.slice("--root=".length);
    else rest.push(a);
  }
  return { rest, json, root };
}

/** The command an argv names, or undefined; `tail` is what follows its name. */
function findCommand(rest: string[]): { command: Command; tail: string[] } | undefined {
  const [first, second] = rest;
  const grouped = first !== undefined && GROUPS.includes(first) ? COMMANDS.find((c) => c.name === `${first} ${second ?? ""}`.trim()) : undefined;
  const command = grouped ?? COMMANDS.find((c) => c.name === first);
  return command && { command, tail: rest.slice(command.name.split(" ").length) };
}

/** Commands that run in the executable (they read stdin or wait for the editor) and have no entry in COMMANDS. */
const STANDALONE: Record<string, { usage: string; summary: string }> = {
  ask: { usage: "trama ask [--root <dir>]", summary: "Reads one question round as JSON from stdin, waits for the editor and prints the JSON result on stdout." },
  "cursor-hook": { usage: "trama cursor-hook", summary: "Run by Cursor's hooks: reads the hook's JSON from stdin and tells the editor. It always exits with 0." },
  "copilot-hook": { usage: "trama copilot-hook", summary: "Run by VS Code's hooks: reads the hook's JSON from stdin and tells the editor. It always exits with 0." },
  "agent-event": { usage: "trama agent-event idle [--root <dir>]", summary: "Run by the hook of an agent in a terminal Trama started when the main agent has settled. It exits with 0, also without an editor or a terminal of Trama's." },
};

export function pickCommand(rest: string[]): { command: Command; tail: string[] } {
  const picked = findCommand(rest);
  const [first, second] = rest;
  if (!picked) {
    const group = first !== undefined && GROUPS.includes(first);
    const hint = group ? `Known "${first}" commands: ${COMMANDS.filter((c) => c.name.startsWith(`${first} `)).map((c) => c.name.slice(first.length + 1)).join(", ")}` : "Run trama --help";
    throw new UsageError(`Unknown command "${(group ? `${first} ${second ?? ""}` : first)?.trim() ?? ""}". ${hint}`);
  }
  return picked;
}

/** `--help` or `-h` after the command name: the usage and description of that command, or null when argv has none. Touches nothing else. */
export function helpFor(argv: string[]): string | null {
  const { rest } = splitGlobals(argv);
  const [first] = rest;
  if (first === undefined || first === "help" || !rest.slice(1).some((a) => a === "--help" || a === "-h")) return null;
  const standalone = STANDALONE[first];
  if (standalone) return `Usage: ${standalone.usage}\n\n${standalone.summary}`;
  const picked = findCommand(rest);
  if (picked) {
    const { command } = picked;
    const options = Object.entries(command.options ?? {}).map(([k, o]) => `--${k}${o.type === "string" ? " <value>" : ""}`);
    return [`Usage: trama ${command.name} ${command.args}`.trimEnd(), "", command.summary, ...(options.length > 0 ? ["", `Options: ${options.join(", ")}`] : [])].join("\n");
  }
  if (!GROUPS.includes(first)) return null;
  return [`Usage: trama ${first} <command>`, "", ...COMMANDS.filter((c) => c.name.startsWith(`${first} `)).map((c) => `  ${c.name} ${c.args}`.trimEnd())].join("\n");
}

/** Set by the Trama extension in every agent it launches. */
export const AGENT_ENV = "TRAMA_AGENT";

/**
 * The variable that makes a command the agent's, or undefined for the developer: `TRAMA_AGENT` in the terminal Trama
 * started, `CURSOR_AGENT=1` in the shell of Cursor's chat agent (ADR 0010). A guard against mistakes, not a boundary (ADR 0005).
 */
export function agentVariable(env: Record<string, string | undefined>): string | undefined {
  if (env[AGENT_ENV]) return AGENT_ENV;
  return env[CURSOR_AGENT_ENV] === "1" ? CURSOR_AGENT_ENV : undefined;
}

export function run(argv: string[], cwd: string, env: Record<string, string | undefined> = process.env): { out: string; exit: number } {
  const { rest, json, root } = splitGlobals(argv);
  const helped = helpFor(argv);
  if (helped !== null) return { out: helped, exit: 0 };
  if (rest.length === 0 || rest[0] === "--help" || rest[0] === "-h" || rest[0] === "help") return { out: help(), exit: rest.length === 0 ? 2 : 0 };
  const standalone = STANDALONE[rest[0] as string];
  if (standalone) throw new UsageError(`Usage: ${standalone.usage}`);
  const { command, tail } = pickCommand(rest);
  let parsed: { values: Values; positionals: string[] };
  try {
    parsed = parseArgs({ args: tail, options: command.options ?? {}, allowPositionals: true, strict: true }) as typeof parsed;
  } catch (err) {
    throw new UsageError(`trama ${command.name}: ${(err as Error).message}`);
  }
  const { min, max } = arity(command);
  if (parsed.positionals.length < min || parsed.positionals.length > max)
    throw new UsageError(`Usage: trama ${command.name} ${command.args}`.trimEnd());
  const agent = agentVariable(env);

  const result: Result = command.run(makeContext(cwd, root, agent !== undefined, originFromEnv(env)), parsed.positionals, parsed.values);
  return { out: json ? JSON.stringify(result.json, null, 2) : result.md.replace(/\n{3,}/g, "\n\n").trimEnd(), exit: result.exit ?? 0 };
}

const ACTIVITY_COMMANDS: Record<string, true> = {
  announce: true, "announce phase": true, "announce done": true,
  "proposal new": true, "proposal edit": true, "proposal delete": true, "proposal resolve-drift": true, "proposal submit": true,
  "task new": true, "task move": true, "drift new": true,
};

/** Reports commands that change project state; read-only commands are not activity. */
export async function reportActivity(argv: string[], cwd: string, options: { env?: Record<string, string | undefined>; runtimeDir?: string } = {}): Promise<void> {
  const { rest, root } = splitGlobals(argv);
  const name = findCommand(rest)?.command.name;
  if (name === undefined || ACTIVITY_COMMANDS[name] !== true) return;
  const env = options.env ?? process.env;
  try {
    await sendActivity(makeContext(cwd, root).project(), originFromEnv(env), { env, runtimeDir: options.runtimeDir });
  } catch {
    // Without a project there is nobody to tell.
  }
}


/** The `ask` command, whose asynchronous lifetime is owned by the executable, not the ordinary synchronous command API. */
export function asyncCommand(argv: string[]): { command: "ask"; root?: string } | null {
  const { rest, root } = splitGlobals(argv);
  return rest.length === 1 && rest[0] === "ask" ? { command: "ask", root } : null;
}

/** The blocking JSON-only ask command: question validation and outcomes are shared with the editor's local channel. */
export async function runAsk(argv: string[], cwd: string, input: string, options: { handler?: QuestionHandler; signal?: AbortSignal; env?: Record<string, string | undefined> } = {}): Promise<{ out: string; exit: number }> {
  try {
    const selected = asyncCommand(argv);
    if (!selected) throw new UsageError("Usage: trama ask [--root <dir>]");
    const request = parseQuestionRequest(JSON.parse(input));
    if (options.signal?.aborted) throw questionAborted();
    const project = makeContext(cwd, selected.root).project();
    const handler: QuestionHandler = options.handler ?? ((project, request, context) => askEditor(project, request, context, { env: options.env }));
    const result = await handler(project, request, { signal: options.signal });
    return { out: JSON.stringify(result), exit: 0 };
  } catch (error) {
    return { out: JSON.stringify(questionFailure(error)), exit: error instanceof UsageError || error instanceof SyntaxError ? 2 : 1 };
  }
}


/**
 * `trama cursor-hook`: forwards one of Cursor's hooks to the editor of its project and answers Cursor. It never holds
 * Cursor up and never fails: without an editor, a Trama project or valid input it still answers and exits with 0.
 */
export async function runCursorHook(input: string, options: { runtimeDir?: string } = {}): Promise<string> {
  let raw: unknown;
  try { raw = JSON.parse(input); } catch { return "{}"; }
  const hook = parseCursorHook(raw);
  if (hook) await sendCursorHook(hook, options);
  return JSON.stringify(hookAnswer((raw as { hook_event_name?: unknown } | null)?.hook_event_name));
}

/** `trama copilot-hook`: forwards Copilot events without blocking the chat. */
export async function runCopilotHook(input: string, options: { runtimeDir?: string } = {}): Promise<string> {
  let raw: unknown;
  try { raw = JSON.parse(input); } catch { return "{}"; }
  const hook = parseCopilotHook(raw);
  if (hook) await sendCopilotHook(hook, options);
  return "{}";
}

/** The `agent-event` command, which waits for the editor; null for any other command. */
export function agentEventCommand(argv: string[]): { rest: string[]; root?: string } | null {
  const { rest, root } = splitGlobals(argv);
  return rest[0] === "agent-event" ? { rest, root } : null;
}

/** `trama agent-event idle`: tells the editor the agent of this terminal (`TRAMA_TERMINAL`) has settled. Never fails because of the editor. */
export async function runAgentEvent(argv: string[], cwd: string, options: { env?: Record<string, string | undefined>; runtimeDir?: string } = {}): Promise<void> {
  const selected = agentEventCommand(argv);
  if (!selected || selected.rest.length !== 2 || selected.rest[1] !== "idle") throw new UsageError("Usage: trama agent-event idle [--root <dir>]");
  const env = options.env ?? process.env;
  const terminal = terminalFromEnv(env);
  if (terminal === undefined) return;
  try {
    await sendAgentIdle(makeContext(cwd, selected.root).project(), terminal, { env, runtimeDir: options.runtimeDir });
  } catch {
    // Without a project there is nobody to tell.
  }
}

