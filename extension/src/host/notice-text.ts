/** What a notice says is composed from facts alone, when it is sent: no editor and no network are needed to check it. */

/**
 * How the agent stopped: the command it was started with, as the terminal reported it, or a turn of a Trama
 * conversation in Cursor's chat, ended normally or interrupted (or failed).
 */
export type CommandOutcome =
  | { kind: "finished" }
  | { kind: "failed"; exitCode: number }
  | { kind: "unreported" }
  | { kind: "chat-stopped" }
  | { kind: "chat-interrupted" };

const VERDICTS: Record<Exclude<CommandOutcome["kind"], "failed">, string> = {
  finished: "The agent finished.",
  unreported: "The agent command ended.",
  "chat-stopped": "The agent stopped and may be waiting for you.",
  "chat-interrupted": "The agent was interrupted or failed.",
};

export type NoticeFacts =
  | {
      kind: "question";
      /** The name of the project folder. */
      project: string;
      /** The question the developer has in front of them, 1-based, with the number of questions in the round. */
      step: number;
      total: number;
      question: string;
      /** The labels of its options as the agent wrote them, in order. */
      options: string[];
    }
  | {
      kind: "end";
      project: string;
      outcome: CommandOutcome;
      /** The Board: Proposals awaiting a decision (never Drafts) plus open Drifts, Tasks in To do and Tasks in In progress. */
      toDecide: number;
      todo: number;
      inProgress: number;
    };

export interface NoticeText {
  /** ASCII only, as it travels in an HTTP header. */
  title: string;
  message: string;
  /** From 1 to 5. */
  priority: number;
  tags: string[];
}

/** The longest message ntfy is given, in bytes of UTF-8. */
export const MAX_MESSAGE_BYTES = 4000;

const ELLIPSIS = "…";
const encoder = new TextEncoder();
const bytes = (text: string): number => encoder.encode(text).length;

/**
 * Cuts `text` to at most `MAX_MESSAGE_BYTES` bytes at a character boundary, ending with `…`. The end goes first, so with
 * a question the last options are lost before anything else; the project line and the position in the round stay.
 */
export function limitMessage(text: string): string {
  if (bytes(text) <= MAX_MESSAGE_BYTES) return text;
  let budget = MAX_MESSAGE_BYTES - bytes(ELLIPSIS);
  let kept = "";
  for (const character of text) {
    const size = bytes(character);
    if (size > budget) break;
    budget -= size;
    kept += character;
  }
  return kept + ELLIPSIS;
}

export function composeNotice(facts: NoticeFacts): NoticeText {
  if (facts.kind === "question") {
    const lines = [facts.project, `Question ${facts.step} of ${facts.total}: ${facts.question}`, ...facts.options.map((label) => `- ${label}`)];
    return { title: "Trama: the agent asks", message: limitMessage(lines.join("\n")), priority: 4, tags: ["question"] };
  }
  const { outcome } = facts;
  const verdict = outcome.kind === "failed" ? `The agent failed (exit code ${outcome.exitCode}).` : VERDICTS[outcome.kind];
  const lines = [facts.project, verdict, `To decide: ${facts.toDecide}`, `To do: ${facts.todo}`, `In progress: ${facts.inProgress}`];
  const failed = outcome.kind === "failed" || outcome.kind === "chat-interrupted";
  return {
    title: "Trama: the agent stopped",
    message: limitMessage(lines.join("\n")),
    priority: failed ? 4 : 3,
    tags: [failed ? "warning" : "white_check_mark"],
  };
}
