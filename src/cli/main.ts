import { parseArgs } from "node:util";
import { terminalFromEnv } from "../core/announcements";
import { TramaError, UsageError } from "../core/errors";
import { askEditor } from "../core/question-channel";
import { parseQuestionRequest, questionAborted, questionFailure, type QuestionHandler } from "../core/questions";
import { arity, COMMANDS, type Command, makeContext, type Values } from "./commands";
import type { Result } from "./result";

const GROUPS = ["proposal", "task", "drift", "skills"];

function help(): string {
  const width = Math.max(...COMMANDS.map((c) => `${c.name} ${c.args}`.length));
  const rows = COMMANDS.map((c) => `  ${`${c.name} ${c.args}`.trimEnd().padEnd(width)}  ${c.developerOnly ? "[developer only] " : ""}${c.summary}`);
  return [
    "trama [--json] [--root <dir>] <command> …",
    "",
    "Explore the Model and manage Proposals, Tasks and Drifts. Never reads your code.",
    "",
    ...rows,
    "",
    "Options: --json prints JSON instead of Markdown; --root <dir> uses <dir>/.trama.",
    "trama mcp [--root <dir>] serves the agent tools over MCP (stdio) until stdin closes.",
    "trama ask [--root <dir>] reads a question round as JSON from stdin and waits for the editor; stdout is JSON.",
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

export function pickCommand(rest: string[]): { command: Command; tail: string[] } {
  const [first, second] = rest;
  const name = first !== undefined && GROUPS.includes(first) ? `${first} ${second ?? ""}`.trim() : first;
  const command = COMMANDS.find((c) => c.name === name);
  if (!command) {
    const hint = first !== undefined && GROUPS.includes(first) ? `Known "${first}" commands: ${COMMANDS.filter((c) => c.name.startsWith(`${first} `)).map((c) => c.name.slice(first.length + 1)).join(", ")}` : "Run trama --help";
    throw new UsageError(`Unknown command "${name ?? ""}". ${hint}`);
  }
  return { command, tail: rest.slice(command.name.split(" ").length) };
}

/** Set by the Trama extension in every agent it launches. */
export const AGENT_ENV = "TRAMA_AGENT";

export function run(argv: string[], cwd: string, env: Record<string, string | undefined> = process.env): { out: string; exit: number } {
  const { rest, json, root } = splitGlobals(argv);
  if (rest.length === 0 || rest[0] === "--help" || rest[0] === "-h" || rest[0] === "help") return { out: help(), exit: rest.length === 0 ? 2 : 0 };

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
  if (command.developerOnly && env[AGENT_ENV])
    throw new TramaError(`"trama ${command.name}" is the developer's decision and cannot be run by an agent (${AGENT_ENV} is set). Ask the developer to decide on the board.`);

  const result: Result = command.run(makeContext(cwd, root, Boolean(env[AGENT_ENV]), terminalFromEnv(env)), parsed.positionals, parsed.values);
  return { out: json ? JSON.stringify(result.json, null, 2) : result.md.replace(/\n{3,}/g, "\n\n").trimEnd(), exit: result.exit ?? 0 };
}

/** Commands whose asynchronous lifetime is owned by the executable, not the ordinary synchronous command API. */
export function asyncCommand(argv: string[]): { command: "mcp" | "ask"; root?: string } | null {
  const { rest, root } = splitGlobals(argv);
  const command = rest[0];
  return rest.length === 1 && (command === "mcp" || command === "ask") ? { command, root } : null;
}

/** The blocking JSON-only ask command, sharing validation and outcomes with the agent tools. */
export async function runAsk(argv: string[], cwd: string, input: string, options: { handler?: QuestionHandler; signal?: AbortSignal; env?: Record<string, string | undefined> } = {}): Promise<{ out: string; exit: number }> {
  try {
    const selected = asyncCommand(argv);
    if (selected?.command !== "ask") throw new UsageError("Usage: trama ask [--root <dir>]");
    const request = parseQuestionRequest(JSON.parse(input));
    if (options.signal?.aborted) throw questionAborted();
    const project = makeContext(cwd, selected.root).project();
    const handler: QuestionHandler = options.handler ?? ((project, request, context) => askEditor(project, request, context, { env: options.env }));
    const result = await handler(project, request, { agent: "trama ask", signal: options.signal });
    return { out: JSON.stringify(result), exit: 0 };
  } catch (error) {
    return { out: JSON.stringify(questionFailure(error)), exit: error instanceof UsageError || error instanceof SyntaxError ? 2 : 1 };
  }
}

