import type { ToolKind } from "@agentclientprotocol/sdk";

// What a tool call shows when its row is opened (`ui#omp-chat-conversation`): the whole of what the agent does with the call, never its result. Pure: the
// components draw it, and the tests feed raw inputs to `inputDetail`.

/** One code cell of omp's `eval` tool. */
export interface ToolCell {
  /** The language as the agent wrote it (`py`, `js`); `?` when it wrote none, as omp's own title does. */
  language: string;
  title?: string;
  code: string;
}

/** `text` is a shell command exactly as the agent wrote it, or the whole title omp gives a call; `cells` are the code cells of `eval` in their order. */
export type ToolDetail = { kind: "text"; text: string } | { kind: "cells"; cells: ToolCell[] };

/** The tools of omp that run a shell command. */
const SHELL_TOOLS: Record<string, true> = { bash: true, shell: true, exec: true };

/** A field of an object, read as omp reads the arguments of a call; undefined for anything that is not an object. */
function field(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>)[key] : undefined;
}

/** A string field that is not empty, the only kind omp reads from the arguments of a call. */
function stringField(value: unknown, key: string): string | undefined {
  const text = field(value, key);
  return typeof text === "string" && text.length > 0 ? text : undefined;
}

/** The command of a shell call, from its arguments. */
function commandOf(rawInput: unknown): ToolDetail | undefined {
  const command = stringField(rawInput, "command");
  return command === undefined ? undefined : { kind: "text", text: command };
}

/** The cells of an `eval` call, from its arguments: `cells`, or one cell given as the arguments themselves. A cell without code is not shown. */
function cellsOf(rawInput: unknown): ToolDetail | undefined {
  const listed = field(rawInput, "cells");
  const raw: unknown[] = Array.isArray(listed) ? listed : typeof field(rawInput, "code") === "string" ? [rawInput] : [];
  const cells: ToolCell[] = [];
  for (const cell of raw) {
    const code = stringField(cell, "code");
    if (code === undefined) continue;
    const title = stringField(cell, "title");
    cells.push({ language: stringField(cell, "language") ?? "?", ...(title === undefined ? {} : { title }), code });
  }
  return cells.length > 0 ? { kind: "cells", cells } : undefined;
}

/**
 * The text a call shows opened, from the arguments omp gives it (`rawInput`): the command of a shell (`bash`, `shell`, `exec`) or the cells of `eval`, whole,
 * however long omp cut the title. Undefined for any other call, and when the arguments do not have the shape of their tool: the row then shows the title.
 * A call whose tool omp does not name is read by its type: a call of type `execute` is a shell when its arguments have a `command`, and `eval` when they have cells.
 */
export function inputDetail(name: string | undefined, toolKind: ToolKind | undefined, rawInput: unknown): ToolDetail | undefined {
  if (name !== undefined) {
    if (Object.hasOwn(SHELL_TOOLS, name)) return commandOf(rawInput);
    return name === "eval" ? cellsOf(rawInput) : undefined;
  }
  return toolKind === "execute" ? (commandOf(rawInput) ?? cellsOf(rawInput)) : undefined;
}

/** What a call shows opened when its arguments say nothing more: the whole title omp gives it. */
export const titleDetail = (title: string): ToolDetail => ({ kind: "text", text: title });

/** Whether the detail of a call is only its title, so it follows the title when this changes. */
export const isTitleDetail = (detail: ToolDetail, title: string): boolean => detail.kind === "text" && detail.text === title;

/** The header line of a cell, in secondary text: its language in square brackets and its title, e.g. `[py] Load settings`. */
export const cellHeader = (cell: ToolCell): string => (cell.title === undefined ? `[${cell.language}]` : `[${cell.language}] ${cell.title}`);

/** Whether what a call shows opened has more than one line: text with a line break, or cells (a header line over the code). */
export const isMultiline = (detail: ToolDetail): boolean => (detail.kind === "text" ? /[\r\n]/.test(detail.text) : detail.cells.length > 0);
