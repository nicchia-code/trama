import { z } from "zod";
import { UsageError } from "../../core/errors";
import { askEditor } from "../../core/question-channel";
import { parseQuestionRequest, questionAborted, questionFailure, type QuestionHandler, type QuestionRequest } from "../../core/questions";
import type { Context } from "../context";
import { defineCommand } from "../registry";
import type { Result } from "../result";

const notBlank = z.string().refine((value) => value.trim() !== "", "must not be blank");

const option = z.strictObject({
  label: notBlank.describe("The answer, plain text."),
  description: notBlank.describe("What choosing it means, in Markdown."),
  details: notBlank.optional().describe("A longer explanation the developer can open, in Markdown."),
});

const question = z
  .strictObject({
    id: notBlank.describe("Unique in the round."),
    question: notBlank.describe("The question, in Markdown: one short sentence that reads on its own. The developer sees only the round, never the agent's conversation, so it must not refer to it. No first person (write \"Trama\" or \"the agent\", never \"I\" or \"we\")."),
    context: notBlank.optional().describe("The background of the decision, in Markdown, shown under the question. The developer does not see the agent's conversation, so the context says what is needed to decide, with no first person. Omit it when the question and the options are enough on their own."),
    options: z.array(option).min(2).describe("At least two options; never add an Other option, the editor always offers a free answer."),
    recommended: z.number().int().min(0).describe("The index of the recommended option."),
    multi: z.boolean().describe("Whether several options can be chosen."),
  })
  .superRefine((q, ctx) => {
    if (q.recommended >= q.options.length) ctx.addIssue({ code: "custom", path: ["recommended"], message: "must be the index of an option" });
  });

const round = z.strictObject({
  questions: z
    .array(question)
    .min(1)
    .superRefine((questions, ctx) => {
      const seen = new Set<string>();
      questions.forEach((q, index) => {
        if (seen.has(q.id)) ctx.addIssue({ code: "custom", path: [index, "id"], message: `duplicates ${JSON.stringify(q.id)}` });
        seen.add(q.id);
      });
    })
    .describe("The questions of the round, asked together."),
});

const answer = z.union([z.object({ status: z.literal("answered"), selected: z.array(z.string()), text: z.string().optional() }), z.object({ status: z.literal("skipped") })]);

/**
 * Opens a round in the editor, waits for the developer and returns the result. The result is always JSON, also on
 * failure (`failure` below). `handler` replaces the editor, for tests.
 */
export async function runQuestion(ctx: Context, request: QuestionRequest, options: { handler?: QuestionHandler; signal?: AbortSignal; env?: Record<string, string | undefined>; runtimeDir?: string } = {}): Promise<Result> {
  if (options.signal?.aborted) throw questionAborted();
  const project = ctx.project();
  const handler: QuestionHandler = options.handler ?? ((p, r, context) => askEditor(p, r, context, { env: options.env, runtimeDir: options.runtimeDir }));
  const result = await handler(project, request, { signal: options.signal });
  return { md: JSON.stringify(result), json: result };
}

const create = defineCommand({
  object: "question",
  verb: "new",
  mode: "blocking",
  summary: "Ask the developer a round of questions in the editor and wait for the answers.",
  description:
    "Reads one complete question round from `--input -` (or the JSON text), shows it in the editor's Trama panel, waits for the developer and prints the result as JSON, always, also when it fails. The developer sees only the round (each question, its context, its options and their own answers), never the agent's conversation, so every question with its context and options must be understandable on its own, and the texts use no first person (write \"Trama\" or \"the agent\", never \"I\" or \"we\"). The whole round is checked before any question is shown. Every question has 2 or more options, an in-range recommendation and an explicit `multi`. Completed and initially unavailable results exit 0; question failures and cancellation exit 1; a malformed round exits 2. `unavailable` means the editor is not reachable: stop and tell the developer.",
  input: round,
  output: z.union([
    z.object({ status: z.literal("answered"), answers: z.record(z.string(), answer).describe("By question ID.") }).describe("Completed"),
    z.object({ status: z.literal("unavailable"), reason: z.string() }).describe("The editor is not available"),
    z.object({ error: z.object({ code: z.enum(["invalid-input", "editor-interrupted", "cancelled", "question-failed"]), message: z.string() }) }).describe("Failed"),
  ]),
  example: {
    questions: [{ id: "route", question: "Choose the route", options: [{ label: "Fast", description: "Fewer checks" }, { label: "Safe", description: "More checks" }], recommended: 1, multi: false }],
  },
  failure: (error) => ({ out: JSON.stringify(questionFailure(error)), exit: error instanceof UsageError || error instanceof SyntaxError ? 2 : 1 }),
  run: (ctx, input, _args, runtime) => runQuestion(ctx, parseQuestionRequest(input), { signal: runtime.signal, env: runtime.env, runtimeDir: runtime.runtimeDir }),
});

export const QUESTION_COMMANDS = [create];
