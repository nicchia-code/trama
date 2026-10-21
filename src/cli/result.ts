import type { Model } from "../core/types";

/** What a command produces: the same data as Markdown (default) and as JSON (`--json`). */
export interface Result {
  md: string;
  json: unknown;
  /** Exit code; 0 when absent. */
  exit?: number;
}

export function modelNote(model: Model): string {
  const n = model.diagnostics.length;
  return n > 0 ? `\n> The Model has ${n} validation error${n === 1 ? "" : "s"}; run \`trama model check\`.\n` : "";
}

/** A result whose JSON is just its text, for commands that only say something. */
export const text = (md: string, json: unknown = { message: md }): Result => ({ md, json });
