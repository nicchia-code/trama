import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";
import { parseArgs } from "node:util";
import { TramaError } from "../core/errors";
import { type DriftOption, driftOptions, getDrift } from "../core/work";
import { makeContext, type Values } from "./commands";
import { pickCommand, splitGlobals } from "./main";

export interface PromptIo {
  input: Readable;
  output: Writable;
}

/**
 * `trama drift resolve <id> --fix-code` run by the developer in an interactive terminal without `--option`: shows the
 * Drift's fix options as a numbered menu, the recommended (first) one the default taken by pressing Enter, then asks
 * for an optional note, empty for none. Returns the arguments with `--option` (and `--note`) added. Any other command
 * line is returned as it is, for `run` to carry out or refuse; the caller decides whether the terminal is interactive.
 */
export async function completeFixChoice(argv: string[], cwd: string, io: PromptIo): Promise<string[]> {
  const { rest, root } = splitGlobals(argv);
  if (rest[0] !== "drift" || rest[1] !== "resolve") return argv;
  const { command, tail } = pickCommand(rest);
  let values: Values;
  let positionals: string[];
  try {
    ({ values, positionals } = parseArgs({ args: tail, options: command.options ?? {}, allowPositionals: true, strict: true }) as { values: Values; positionals: string[] });
  } catch {
    return argv;
  }
  const only = values["fix-code"] === true && values["accept-proposal"] !== true && values["dismiss"] !== true;
  if (!only || values["option"] !== undefined || positionals.length !== 1) return argv;

  let options: DriftOption[];
  let heading: string;
  try {
    const drift = getDrift(makeContext(cwd, root).project(), positionals[0] as string);
    if (drift.data.status !== "open") return argv;
    options = driftOptions(drift);
    heading = `Drift ${drift.id}: ${drift.title}`;
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
      if (answer === null) throw new TramaError(`An option must be chosen to fix the code of Drift ${positionals[0]}: give its number, from 1 to ${options.length}`);
      const n = answer === "" ? 1 : /^\d+$/.test(answer) ? Number(answer) : 0;
      if (n >= 1 && n <= options.length) option = n;
      else io.output.write(`Choose a number from 1 to ${options.length}, or press Enter for 1.\n`);
    }
    const added = ["--option", String(option)];
    if (values["note"] === undefined) {
      const note = await ask("Note (optional, Enter for none): ");
      if (note) added.push("--note", note);
    }
    return [...argv, ...added];
  } finally {
    rl.close();
  }
}
