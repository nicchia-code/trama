import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";
import { TramaError } from "../core/errors";
import { type DriftOption, driftOptions, getDrift } from "../core/work";
import { cardName } from "../core/short-numbers";
import { makeContext } from "./context";
import { splitCommon } from "./registry";

export interface PromptIo {
  input: Readable;
  output: Writable;
}

/**
 * `trama drift move <id> code-to-be-fixed` run by the developer in an interactive terminal without `option` in its
 * `--input`: shows the Drift's fix options as a numbered menu, the recommended (first) one the default taken by pressing
 * Enter, then asks for an optional note, empty for none. Returns the arguments with `option` (and `note`) added to the
 * input. Any other command line, and one that reads its input from standard input, is returned as it is, for `run` to
 * carry out or refuse; the caller decides whether the terminal is interactive.
 */
export async function completeFixChoice(argv: string[], cwd: string, io: PromptIo): Promise<string[]> {
  const { rest, common } = splitCommon(argv);
  const root = common.root;
  if (rest[0] !== "drift" || rest[1] !== "move" || rest.length !== 4 || rest[3] !== "code-to-be-fixed" || common.input === "-") return argv;
  let input: Record<string, unknown> = {};
  if (common.input !== undefined) {
    try {
      const parsed: unknown = JSON.parse(common.input.replace(/^\uFEFF/, ""));
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return argv;
      input = parsed as Record<string, unknown>;
    } catch {
      return argv;
    }
  }
  if (input["option"] !== undefined) return argv;
  const driftArgument = rest[2] as string;

  let options: DriftOption[];
  let heading: string;
  try {
    const project = makeContext(cwd, root).project();
    const drift = getDrift(project, driftArgument, true);
    if (drift.data.status !== "open") return argv;
    options = driftOptions(drift);
    heading = `Drift ${cardName(project, "drift", drift.id)}: ${drift.title}`;
  } catch {
    return argv;
  }
  if (options.length === 0) return argv;

  const rl = createInterface({ input: io.input, output: io.output });
  let closed = false;
  rl.once("close", () => (closed = true));
  const lines = rl[Symbol.asyncIterator]();
  const ask = async (prompt: string): Promise<string | null> => {
    // Piped input may already have ended; the lines it held are still delivered by the iterator.
    if (closed) io.output.write(prompt);
    else {
      rl.setPrompt(prompt);
      rl.prompt();
    }
    const next = await lines.next();
    return next.done ? null : next.value.trim();
  };
  try {
    io.output.write(`${heading}\nFix options:\n`);
    options.forEach((o, i) => {
      io.output.write(`  ${i + 1}) ${o.title}${i === 0 ? " (recommended)" : ""}\n`);
      for (const line of o.text.split("\n")) io.output.write(`       ${line}\n`);
    });
    let option: number | undefined;
    while (option === undefined) {
      const answer = await ask(`Option [1]: `);
      if (answer === null) throw new TramaError(`An option must be chosen to fix the code of ${heading.split(": ", 1)[0]}: give its number, from 1 to ${options.length}`);
      const n = answer === "" ? 1 : /^\d+$/.test(answer) ? Number(answer) : 0;
      if (n >= 1 && n <= options.length) option = n;
      else io.output.write(`Choose a number from 1 to ${options.length}, or press Enter for 1.\n`);
    }
    const completed: Record<string, unknown> = { ...input, option };
    if (input["note"] === undefined) {
      const note = await ask("Note (optional, Enter for none): ");
      if (note) completed["note"] = note;
    }
    return [...withoutInput(argv), "--input", JSON.stringify(completed)];
  } finally {
    rl.close();
  }
}

/** The command line without its `--input` and the text after it. */
function withoutInput(argv: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] as string;
    if (a === "--input") i++;
    else if (!a.startsWith("--input=")) out.push(a);
  }
  return out;
}
