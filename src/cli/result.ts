import type { Model, State, Transition } from "../core/types";

/** What a command produces: the same data as Markdown (default) and as JSON (`--json`). */
export interface Result {
  md: string;
  json: unknown;
  /** Exit code; 0 when absent. */
  exit?: number;
}

export const firstLine = (text: string): string =>
  text
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0) ?? "";

export const dash = (text: string): string => (text ? ` — ${text}` : "");

export const prose = (t: Transition): string => (t.prose ? `: ${t.prose}` : "");

export const eventKey = (t: Transition): string => `${t.event.owner}.${t.event.name}`;

export function marker(s: State): string {
  return s.initial ? " (initial)" : s.final ? " (final)" : "";
}

export function modelNote(model: Model): string {
  const n = model.diagnostics.length;
  return n > 0 ? `\n> The Model has ${n} validation error${n === 1 ? "" : "s"}; run \`trama model check\`.\n` : "";
}

export const bullets = (lines: string[], none = "_none_"): string => (lines.length > 0 ? lines.join("\n") : none);

/** A result whose JSON is just its text, for commands that only say something. */
export const text = (md: string, json: unknown = { message: md }): Result => ({ md, json });
