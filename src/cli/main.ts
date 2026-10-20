import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { CURSOR_AGENT_ENV, originFromEnv } from "../core/announcements";
import { UsageError } from "../core/errors";
import { sendActivity } from "../core/question-channel";
import { REGISTRY } from "./commands";
import { type Context, jobFromEnv, makeContext } from "./context";
import { commandHelp, objectHelp, rootHelp, schemaHelp } from "./help";
import { type Command, checkPositionals, commandName, type CommonOptions, type Mode, parseInput, type Runtime, splitCommon, usageOf } from "./registry";
import type { Result } from "./result";

/** What a command line printed and how it ended. */
export interface Outcome {
  out: string;
  exit: number;
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

/** The error for a command that does not exist: an old name, a mistyped verb or an object without a verb. */
function unknownCommand(rest: string[]): UsageError {
  const [first, second] = rest;
  const verbs = first === undefined ? [] : REGISTRY.ofObject(first).map((c) => c.verb);
  if (verbs.length === 0) return new UsageError(`Unknown command "${first ?? ""}". Run "trama --help".`);
  if (second === undefined) return new UsageError(`"${first}" needs a verb: ${verbs.join(", ")}. Run "trama --help".`);
  return new UsageError(`Unknown command "${first} ${second}". Known "${first}" commands: ${verbs.join(", ")}. Run "trama --help".`);
}

/** The command a command line names, or undefined; `tail` is what follows its name. */
function lookup(rest: string[]): { command: Command; tail: string[] } | undefined {
  const command = REGISTRY.find(rest[0] ?? "", rest[1]);
  return command && { command, tail: rest.slice(2) };
}

/**
 * `--help` or `-h` anywhere: the usage of the command, of an object or of the whole command line; with `--json`, the
 * JSON Schemas of a command. Null when argv asks for no help. It reads no standard input, contacts no editor and opens nothing.
 */
export function helpFor(argv: string[]): string | null {
  const { rest, common } = splitCommon(argv);
  if (!common.help) return null;
  if (rest.length === 0) return rootHelp(REGISTRY);
  const found = lookup(rest);
  if (found) return common.json ? schemaHelp(found.command) : commandHelp(found.command);
  const [object] = rest;
  if (rest.length === 1 && object !== undefined && REGISTRY.has(object)) return objectHelp(REGISTRY, object);
  throw unknownCommand(rest);
}

/** A command line, read: what to run and in what context. Nothing has run yet. */
type Plan = { kind: "done"; outcome: Outcome } | { kind: "new"; command: Command; ctx: Context; args: string[]; common: CommonOptions };

function plan(argv: string[], cwd: string, env: Record<string, string | undefined>): Plan {
  const helped = helpFor(argv);
  if (helped !== null) return { kind: "done", outcome: { out: helped, exit: 0 } };
  const { rest, common } = splitCommon(argv);
  if (rest.length === 0) return { kind: "done", outcome: { out: rootHelp(REGISTRY), exit: 2 } };
  const found = lookup(rest);
  if (!found) throw unknownCommand(rest);
  const agent = agentVariable(env);
  const ctx = makeContext(cwd, common.root, agent !== undefined, originFromEnv(env), jobFromEnv(env));
  return { kind: "new", command: found.command, ctx, args: checkPositionals(found.command, found.tail), common };
}

/** Markdown by default, JSON with `--json`; runs of blank lines collapse. */
const render = (result: Result, json: boolean): Outcome => ({ out: json ? JSON.stringify(result.json, null, 2) : result.md.replace(/\n{3,}/g, "\n\n").trimEnd(), exit: result.exit ?? 0 });

/** What a hook prints is its answer as it is, whatever `--json` says. */
const rendered = (command: Command, result: Result, json: boolean): Outcome => (command.mode === "hook" ? { out: result.md, exit: result.exit ?? 0 } : render(result, json));

/** Reads standard input to its end, synchronously: for `--input -` of a command that answers at once. */
const readStdinSync = (): string => readFileSync(0, "utf8");

/** Reads standard input to its end. */
async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

/** Runs a command that answers at once, synchronously: the extension's way in. A command that waits for the editor needs `execute`. */
export function run(argv: string[], cwd: string, env: Record<string, string | undefined> = process.env, io: { stdin?: () => string } = {}): Outcome {
  const planned = plan(argv, cwd, env);
  if (planned.kind === "done") return planned.outcome;
  const { command, ctx, args, common } = planned;
  if (command.mode !== "immediate") throw new UsageError(`trama ${commandName(command)} waits for the editor or runs as a hook: it runs only in the executable. Usage: ${usageOf(command)}`);
  try {
    const input = parseInput(command, common.input === "-" ? (io.stdin ?? readStdinSync)() : common.input);
    return render(command.run(ctx, input as never, args, undefined as never) as Result, common.json);
  } catch (error) {
    if (command.failure) return command.failure(error);
    throw error;
  }
}

/** What `execute` needs from its surroundings. */
export interface ExecuteOptions {
  env?: Record<string, string | undefined>;
  /** The directory of the editor's discovery records, for tests. */
  runtimeDir?: string;
  /** Cancels a command that waits for the editor. */
  signal?: AbortSignal;
  /** Standard input, read when the command line asks for it. Default: the process's. */
  stdin?: () => Promise<string>;
}

/** Runs any command: one that answers at once, one that waits for the editor, or a hook. */
export async function execute(argv: string[], cwd: string, options: ExecuteOptions = {}): Promise<Outcome> {
  const env = options.env ?? process.env;
  const planned = plan(argv, cwd, env);
  if (planned.kind === "done") return planned.outcome;
  const runtime: Runtime = { env, runtimeDir: options.runtimeDir, signal: options.signal, stdin: options.stdin ?? readStdin };
  const { command, ctx, args, common } = planned;
  try {
    const input = parseInput(command, common.input === "-" ? await runtime.stdin() : common.input);
    return rendered(command, await command.run(ctx, input as never, args, runtime), common.json);
  } catch (error) {
    if (command.failure) return command.failure(error);
    throw error;
  }
}

/** How the command line runs, or null when it asks for help or names no command: the executable sets up signals for a blocking one. */
export function modeOf(argv: string[]): Mode | null {
  const { rest, common } = splitCommon(argv);
  if (common.help) return null;
  return lookup(rest)?.command.mode ?? null;
}

/** Whether the command line is a command that counts as the agent's activity: the declared commands say so in their `effects`. */
export function countsAsActivity(argv: string[]): boolean {
  const found = lookup(splitCommon(argv).rest);
  if (found?.command.effects.activity !== true) return false;
  const states = found.command.effects.activityStates;
  return states === undefined || states.includes(found.tail[1] ?? "");
}

/** Reports commands that change project state; read-only commands are not activity. */
export async function reportActivity(argv: string[], cwd: string, options: { env?: Record<string, string | undefined>; runtimeDir?: string } = {}): Promise<void> {
  if (!countsAsActivity(argv)) return;
  const { common } = splitCommon(argv);
  const env = options.env ?? process.env;
  try {
    await sendActivity(makeContext(cwd, common.root).project(), originFromEnv(env), { env, runtimeDir: options.runtimeDir });
  } catch {
    // Without a project there is nobody to tell.
  }
}
