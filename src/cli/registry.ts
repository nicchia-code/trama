import { z } from "zod";
import { UsageError } from "../core/errors";
import type { Context } from "./context";
import type { Result } from "./result";

/**
 * The one registry of the command line (`cli#General`). Every command is one declaration: its object and verb, its
 * positional arguments, the zod schemas of its input and output, its effects and how it runs. The choice of the
 * command, the check of its arguments and of its `--input`, `--help`, the list of the commands that count as the
 * agent's activity and the command reference of `docs/cli.md` all derive from it.
 *
 * To add a command: write a `defineCommand({ ... })` in a file of `src/cli/commands/` and list it in
 * `src/cli/commands/index.ts`. Nothing else names it.
 */

/** The objects of the command line, in the order `trama --help` lists them. */
export const OBJECTS = ["model", "proposal", "task", "drift", "issue", "team", "history", "announcement", "comparison", "question", "advisor", "project", "timing", "hook"] as const;
export type CommandObject = (typeof OBJECTS)[number];

/** The verbs of the objects: seven mean the same for every object that has them; `delete` exists only for `task`, `review` only for `advisor` and `fields` only for `issue`. `hook` is the only object that does not follow them (requirements/cli#General). */
export const VERBS = ["show", "list", "new", "edit", "move", "check", "delete", "review", "fields"] as const;

/** A positional argument: the identity of a card, the reference of a Model element, or the state `move` brings a card to. */
export interface Positional {
  name: string;
  description: string;
  /** Absent means required. */
  optional?: boolean;
  /** The only values accepted, for the state of arrival of `move`. */
  choices?: readonly string[];
}

/** What a command does besides answering. */
export interface Effects {
  /** It writes in `.trama/` (or the skill folders). */
  writes?: boolean;
  /** It counts as the agent's activity: the editor learns that this terminal or chat is working. */
  activity?: boolean;
  /** With `activity`, for a `move`: only these states of arrival count; the others do not. */
  activityStates?: readonly string[];
  /** It sends messages to the editor. */
  editor?: boolean;
}

/**
 * How a command runs. `immediate` answers at once and synchronously; `blocking` waits for the editor and has its own
 * lifetime (a signal cancels it); `hook` is run by an agent's hook, reads the hook's JSON on standard input and
 * answers whatever happens.
 */
export type Mode = "immediate" | "blocking" | "hook";

/** What the executable gives a command that is not immediate. */
export interface Runtime {
  env: Record<string, string | undefined>;
  /** The directory of the editor's discovery records, for tests. */
  runtimeDir?: string;
  /** Cancels a blocking command. */
  signal?: AbortSignal;
  /** Standard input, read when the command asks for it. */
  stdin(): Promise<string>;
}

interface Declaration<I extends z.ZodObject, O extends z.ZodType> {
  object: CommandObject;
  verb: string;
  /** Positional arguments, in order. */
  positionals?: readonly Positional[];
  /** The line `trama --help` and `trama <object> --help` show. */
  summary: string;
  /** What `--help` of the command adds to the summary, in short Markdown. */
  description?: string;
  /** The input: a strict object, so an unknown field is refused. Every field has `.describe()`. */
  input: I;
  /** The data `--json` prints. */
  output: O;
  /** An example of `--input`, for `--help`. */
  example?: z.input<I>;
  /** The positional arguments of the example, in order; without them the example shows the placeholders. */
  exampleArgs?: readonly string[];
  effects?: Effects;
  /** Left out of `trama --help` and `trama <object> --help`; the command keeps its own `--help`. */
  hidden?: boolean;
  /** For a hook: what it reads on standard input, since it takes no `--input`. */
  stdin?: string;
  /** The way the command fails when it must answer in a fixed form: given the error, the text to print and the exit code. Without it an error is printed on standard error. */
  failure?: (error: unknown) => { out: string; exit: number };
}

export interface ImmediateDeclaration<I extends z.ZodObject, O extends z.ZodType> extends Declaration<I, O> {
  mode: "immediate";
  /**
   * What the executable (not `run`, the synchronous way in of the extension and the tests) gathers from the editor before `run`, which then answers at once: it puts it in the
   * context. `proposal move` reads the team there for the hand-over of a handoff.
   */
  beforeRun?(ctx: Context, input: z.output<I>, args: string[], runtime: Runtime): Promise<void>;
  run(ctx: Context, input: z.output<I>, args: string[]): Result;
}

export interface DeferredDeclaration<I extends z.ZodObject, O extends z.ZodType> extends Declaration<I, O> {
  mode: "blocking" | "hook";
  run(ctx: Context, input: z.output<I>, args: string[], runtime: Runtime): Promise<Result>;
}

/** A declared command, with its schemas erased: what the registry holds. */
export interface Command {
  object: CommandObject;
  verb: string;
  positionals: readonly Positional[];
  summary: string;
  description?: string;
  input: z.ZodObject;
  output: z.ZodType;
  example?: unknown;
  exampleArgs?: readonly string[];
  effects: Required<Omit<Effects, "activityStates">> & Pick<Effects, "activityStates">;
  hidden: boolean;
  stdin?: string;
  failure?: (error: unknown) => { out: string; exit: number };
  beforeRun?(ctx: Context, input: never, args: string[], runtime: Runtime): Promise<void>;
  mode: Mode;
  run(ctx: Context, input: never, args: string[], runtime: Runtime): Result | Promise<Result>;
}

/** Declares a command. The input of `run` has the type of the input schema. */
export function defineCommand<I extends z.ZodObject, O extends z.ZodType>(declaration: ImmediateDeclaration<I, O> | DeferredDeclaration<I, O>): Command {
  return {
    object: declaration.object,
    verb: declaration.verb,
    positionals: declaration.positionals ?? [],
    summary: declaration.summary,
    description: declaration.description,
    input: declaration.input,
    output: declaration.output,
    example: declaration.example,
    exampleArgs: declaration.exampleArgs,
    effects: { writes: declaration.effects?.writes ?? false, activity: declaration.effects?.activity ?? false, activityStates: declaration.effects?.activityStates, editor: declaration.effects?.editor ?? false },
    hidden: declaration.hidden ?? false,
    stdin: declaration.stdin,
    failure: declaration.failure,
    mode: declaration.mode,
    ...(declaration.mode === "immediate" && declaration.beforeRun !== undefined ? { beforeRun: declaration.beforeRun as NonNullable<Command["beforeRun"]> } : {}),
    run: declaration.run as Command["run"],
  };
}

export const commandName = (command: Command): string => `${command.object} ${command.verb}`;

/** The usage line of a command, without the common options: `<id>` for a required argument, `[<ref>]` for an optional one. */
export const usageOf = (command: Command): string => ["trama", command.object, command.verb, ...command.positionals.map((p) => (p.optional ? `[<${p.name}>]` : `<${p.name}>`))].join(" ");

/** The options every command takes, in any position. */
export const COMMON_OPTIONS = "[--root <dir>] [--json] [--input <json>]";

/** The registry: commands by name, and by object. */
export class Registry {
  private readonly byName = new Map<string, Command>();

  constructor(readonly commands: readonly Command[]) {
    for (const command of commands) {
      const name = commandName(command);
      if (this.byName.has(name)) throw new Error(`Command "${name}" is declared twice`);
      this.byName.set(name, command);
    }
  }

  find(object: string, verb: string | undefined): Command | undefined {
    return verb === undefined ? undefined : this.byName.get(`${object} ${verb}`);
  }

  /** The commands of an object, in declaration order. */
  ofObject(object: string): Command[] {
    return this.commands.filter((c) => c.object === object);
  }

  /** The objects that have at least one command, in the order of `OBJECTS`. */
  objects(): CommandObject[] {
    return OBJECTS.filter((o) => this.commands.some((c) => c.object === o));
  }

  has(object: string): boolean {
    return this.commands.some((c) => c.object === object);
  }
}

/** The options every command takes, pulled out of argv wherever they appear. */
export interface CommonOptions {
  json: boolean;
  root?: string;
  /** The text after `--input`: JSON text, or `-` for standard input. */
  input?: string;
  help: boolean;
}

/** Pulls `--root`, `--json`, `--input` and `--help`/`-h` out of argv, wherever they appear; what remains is the command and its arguments. */
export function splitCommon(argv: string[]): { rest: string[]; common: CommonOptions } {
  const rest: string[] = [];
  const common: CommonOptions = { json: false, help: false };
  const value = (flag: string, i: number): string => {
    const next = argv[i + 1];
    if (next === undefined) throw new UsageError(flag === "--root" ? "--root needs a directory" : "--input needs the JSON text, or - for standard input");
    return next;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] as string;
    if (a === "--json") common.json = true;
    else if (a === "--help" || a === "-h") common.help = true;
    else if (a === "--root") common.root = value(a, i++);
    else if (a.startsWith("--root=")) common.root = a.slice("--root=".length);
    else if (a === "--input") common.input = value(a, i++);
    else if (a.startsWith("--input=")) common.input = a.slice("--input=".length);
    else rest.push(a);
  }
  return { rest, common };
}

/** The positional arguments of a command, checked: how many, and the values `move` accepts. Every other token starting with `-` is an unknown option. */
export function checkPositionals(command: Command, tail: string[]): string[] {
  for (const [i, token] of tail.entries())
    // A process number is a plain value: a wrong one (`-3`) is the command's own business, not an unknown option.
    if (token.startsWith("-") && token !== "-" && command.positionals[i]?.name !== "pid")
      throw new UsageError(`trama ${commandName(command)} has no option ${token.split("=")[0]}: its fields go in --input, as a JSON object. Run "trama ${commandName(command)} --help".`);
  const min = command.positionals.filter((p) => !p.optional).length;
  if (tail.length < min || tail.length > command.positionals.length) throw new UsageError(`Usage: ${usageOf(command)} ${COMMON_OPTIONS}`);
  command.positionals.forEach((p, i) => {
    const given = tail[i];
    if (given !== undefined && p.choices !== undefined && !p.choices.includes(given))
      throw new UsageError(`<${p.name}> must be one of ${p.choices.join(", ")}, not "${given}". Usage: ${usageOf(command)}`);
  });
  return tail;
}

/** A field path as the developer reads it: `options[1].text`. */
export function formatPath(path: readonly PropertyKey[]): string {
  return path.reduce<string>((text, key) => (typeof key === "number" ? `${text}[${key}]` : text === "" ? String(key) : `${text}.${String(key)}`), "");
}

/** Every problem of an input that does not fit its schema, one per line with the path of the field. */
export function inputProblems(error: z.ZodError): string[] {
  return error.issues.flatMap((issue) => {
    const base = formatPath(issue.path);
    if (issue.code === "unrecognized_keys") return issue.keys.map((key) => `- ${base === "" ? key : `${base}.${key}`}: unknown field`);
    const message = /received undefined$/.test(issue.message) ? "required" : issue.message;
    return [`- ${base === "" ? "(input)" : base}: ${message}`];
  });
}

/**
 * The input of a command: the JSON text of `--input` (a UTF-8 byte order mark, which Windows PowerShell 5.1 puts in a
 * pipe, is not part of it) or `{}` without it, checked against the schema. Anything wrong is a usage error that lists
 * every problem, and nothing has changed by then.
 */
export function parseInput(command: Command, text: string | undefined): unknown {
  let value: unknown = {};
  if (text !== undefined) {
    try {
      value = JSON.parse(text.replace(/^\uFEFF/, ""));
    } catch (error) {
      throw new UsageError(`The input of trama ${commandName(command)} is not valid JSON (${(error as Error).message}). Pass the JSON with --input - on standard input.`);
    }
    if (typeof value !== "object" || value === null || Array.isArray(value)) throw new UsageError(`The input of trama ${commandName(command)} must be a JSON object.`);
  }
  const parsed = command.input.safeParse(value);
  if (parsed.success) return parsed.data;
  throw new UsageError(`The input of trama ${commandName(command)} does not fit its schema:\n${inputProblems(parsed.error).join("\n")}\nNothing changed. Run "trama ${commandName(command)} --help" for the fields.`);
}
