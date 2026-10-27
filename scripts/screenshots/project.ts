// The project of a scene: a fresh copy of `examples/shop`, brought to the state to show with `trama` commands and written files, as the developer or the agent would have left it.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join } from "node:path";
import type { AgentCommand, FileEdit, PrepareStep, ProjectKind, TramaCommand } from "./types";

const root = join(import.meta.dir, "..", "..");

/** What a `trama` command printed that later commands may name: the `id` and the short `number` of a card. */
export interface Result {
  id?: string;
  number?: string | null;
  paths?: { path: string; edit: string }[];
  [field: string]: unknown;
}

/** Copies `examples/shop` into `folder`; `code` leaves out its `.trama/`, the project of a developer who has not put Trama in it yet; `empty` copies nothing. */
export function copyShop(kind: ProjectKind, folder: string): void {
  rmSync(folder, { recursive: true, force: true });
  mkdirSync(folder, { recursive: true });
  if (kind === "empty") return;
  cpSync(join(root, "examples", "shop"), folder, { recursive: true, filter: (source) => kind === "shop" || !/[\\/]\.trama([\\/]|$)/.test(source) });
}

/** The words of a command with `$name` and `$name.number` replaced by what the earlier results printed. */
function substitute(value: unknown, results: ReadonlyMap<string, Result>): unknown {
  if (typeof value === "string") {
    // `$name` is the `id` the command printed, `$name.number` its short number, `$name.a.0.b` any field of its JSON.
    return value.replace(/\$([A-Za-z][\w-]*)(?:\.([\w.]+))?/g, (_whole, name: string, field: string | undefined) => {
      const result = results.get(name);
      if (result === undefined) throw new Error(`no earlier command is named "${name}" (in ${JSON.stringify(value)})`);
      let wanted: unknown = result;
      for (const key of (field ?? "id").split(".")) wanted = typeof wanted === "object" && wanted !== null ? (wanted as Record<string, unknown>)[key] : undefined;
      if (typeof wanted !== "string" && typeof wanted !== "number") throw new Error(`the command named "${name}" printed no ${field ?? "id"}`);
      return String(wanted);
    });
  }
  if (Array.isArray(value)) return value.map((each) => substitute(each, results));
  if (typeof value === "object" && value !== null) return Object.fromEntries(Object.entries(value).map(([key, each]) => [key, substitute(each, results)]));
  return value;
}

export interface Runner {
  /** The project's folder. */
  readonly folder: string;
  readonly results: Map<string, Result>;
  /** The `trama` binary. */
  readonly trama: string;
  /** The environment of the commands: the agent's, for the steps of an `agent` step. */
  env: Record<string, string>;
}

export function runner(folder: string, trama: string, env: Record<string, string> = {}): Runner {
  return { folder, trama, results: new Map(), env };
}

/** The arguments of a command: `--root`, `--json`, the words and, with an input, `--input -`. */
function argumentsOf(r: Runner, command: TramaCommand): { args: string[]; stdin: string | undefined } {
  const words = substitute(command.run, r.results) as string[];
  const input = command.input === undefined ? undefined : JSON.stringify(substitute(command.input, r.results));
  return { args: ["--root", r.folder, "--json", ...words, ...(input === undefined ? [] : ["--input", "-"])], stdin: input };
}

function parse(text: string): Result {
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === "object" && value !== null ? (value as Result) : {};
  } catch {
    return {};
  }
}

/** Runs a `trama` command and waits for it; a failure names the command and what it said. */
export async function tramaRun(r: Runner, command: TramaCommand): Promise<Result> {
  const { args, stdin } = argumentsOf(r, command);
  const child = Bun.spawn([r.trama, ...args], { cwd: r.folder, env: { ...process.env, ...r.env }, stdin: stdin === undefined ? "ignore" : new TextEncoder().encode(stdin), stdout: "pipe", stderr: "pipe" });
  const [out, err, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  if (code !== 0) throw new Error(`trama ${command.run.join(" ")} exited with ${code}: ${(err || out).trim()}`);
  const result = parse(out);
  if (command.as !== undefined) r.results.set(command.as, result);
  return result;
}

/** Starts a `trama` command that waits for the developer (a question round) and leaves it running; the returned function stops it. */
export function tramaStart(r: Runner, command: AgentCommand): () => void {
  const { args, stdin } = argumentsOf(r, command);
  const child = Bun.spawn([r.trama, ...args], { cwd: r.folder, env: { ...process.env, ...r.env }, stdin: stdin === undefined ? "ignore" : new TextEncoder().encode(stdin), stdout: "ignore", stderr: "ignore" });
  return () => child.kill();
}

/** Writes a file the scene edits: whole, or by replacing text in what it holds. For a file inside a Proposal the Proposal is asked to hold it first. */
export async function writeFile(r: Runner, edit: FileEdit): Promise<void> {
  let target = isAbsolute(edit.path) ? edit.path : join(r.folder, edit.path);
  if (edit.proposal !== undefined) {
    const made = await tramaRun(r, { run: ["proposal", "edit", edit.proposal], input: { edit: [edit.path] } });
    const found = made.paths?.find((each) => each.path === edit.path);
    if (found === undefined) throw new Error(`trama proposal edit printed no path for ${edit.path}`);
    target = isAbsolute(found.edit) ? found.edit : join(r.folder, found.edit);
    // A new Task or issue is named `<identity>-<slug>.md`.
    if (edit.as !== undefined) r.results.set(edit.as, { id: basename(target).split("-")[0] });
  }
  mkdirSync(dirname(target), { recursive: true });
  if (edit.content !== undefined) {
    writeFileSync(target, edit.content);
    return;
  }
  let text = existsSync(target) ? readFileSync(target, "utf8") : "";
  for (const [from, to] of edit.replace ?? []) {
    if (!text.includes(from)) throw new Error(`${edit.path} has no text ${JSON.stringify(from)} to replace`);
    text = text.replace(from, to);
  }
  writeFileSync(target, text);
}

async function git(r: Runner, args: string[]): Promise<void> {
  const child = Bun.spawn(["git", ...args], { cwd: r.folder, stdout: "pipe", stderr: "pipe", env: { ...process.env, GIT_AUTHOR_NAME: "Trama", GIT_AUTHOR_EMAIL: "trama@example.com", GIT_COMMITTER_NAME: "Trama", GIT_COMMITTER_EMAIL: "trama@example.com", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_SYSTEM: "/dev/null" } });
  const [out, err, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  if (code !== 0) throw new Error(`git ${args.join(" ")} exited with ${code}: ${(err || out).trim()}`);
}

/** Runs the steps of a scene that touch only the project. */
export async function prepare(r: Runner, steps: readonly PrepareStep[]): Promise<void> {
  for (const step of steps) {
    if (step.kind === "trama") await tramaRun(r, step);
    else if (step.kind === "file") await writeFile(r, step);
    else await git(r, step.args);
  }
}
