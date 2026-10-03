import { TramaError, UsageError } from "./errors";
import type { Project } from "./store";

export interface QuestionOption { label: string; description: string }
export interface Question { id: string; question: string; options: QuestionOption[]; recommended: number; multi: boolean }
export interface QuestionRequest { questions: Question[] }
export type QuestionAnswer = { status: "answered"; selected: string[]; text?: string } | { status: "skipped" };
export type QuestionResult = { status: "answered"; answers: Record<string, QuestionAnswer> } | { status: "unavailable"; reason: string };
export interface QuestionContext { agent: string; signal?: AbortSignal }
export type QuestionHandler = (project: Project, request: QuestionRequest, context: QuestionContext) => Promise<QuestionResult>;

export const QUESTION_SCHEMA = {
  type: "object" as const,
  properties: {
    questions: {
      type: "array", minItems: 1, description: "All questions in this round, in presentation order.",
      items: {
        type: "object", additionalProperties: false,
        required: ["id", "question", "options", "recommended", "multi"],
        properties: {
          id: { type: "string", minLength: 1, description: "Unique question ID." },
          question: { type: "string", minLength: 1 },
          options: { type: "array", minItems: 2, items: { type: "object", additionalProperties: false, required: ["label", "description"], properties: { label: { type: "string", minLength: 1 }, description: { type: "string", minLength: 1 } } } },
          recommended: { type: "integer", minimum: 0, description: "Zero-based index of the recommended option." },
          multi: { type: "boolean", description: "Allow multiple options together." },
        },
      },
    },
  },
  required: ["questions"], additionalProperties: false as const,
};

function object(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new UsageError(`${field} must be an object`);
  return value as Record<string, unknown>;
}
function text(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new UsageError(`${field} must be a non-empty string`);
  return value;
}

function fields(value: Record<string, unknown>, allowed: readonly string[], field: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new UsageError(`${field}.${key} is not a supported field`);
  }
}

/** Validate the entire round before any side effect; preserve the caller's wording. */
export function parseQuestionRequest(value: unknown): QuestionRequest {
  const request = object(value, "request");
  fields(request, ["questions"], "request");
  if (!Array.isArray(request.questions) || request.questions.length === 0) throw new UsageError("questions must contain at least one question");
  const ids = new Set<string>();
  const questions = request.questions.map((value, index): Question => {
    const field = `questions[${index}]`;
    const q = object(value, field);
    fields(q, ["id", "question", "options", "recommended", "multi"], field);
    const id = text(q.id, `${field}.id`);
    if (ids.has(id)) throw new UsageError(`${field}.id duplicates ${JSON.stringify(id)}`);
    ids.add(id);
    const question = text(q.question, `${field}.question`);
    if (!Array.isArray(q.options) || q.options.length < 2) throw new UsageError(`${field}.options must contain at least two options`);
    const options = q.options.map((value, n): QuestionOption => {
      const option = object(value, `${field}.options[${n}]`);
      fields(option, ["label", "description"], `${field}.options[${n}]`);
      return { label: text(option.label, `${field}.options[${n}].label`), description: text(option.description, `${field}.options[${n}].description`) };
    });
    if (!Number.isInteger(q.recommended) || (q.recommended as number) < 0 || (q.recommended as number) >= options.length) throw new UsageError(`${field}.recommended must be an option index`);
    if (typeof q.multi !== "boolean") throw new UsageError(`${field}.multi must be a boolean`);
    return { id, question, options, recommended: q.recommended as number, multi: q.multi };
  });
  return { questions };
}

export function unavailableQuestions(): QuestionResult {
  return { status: "unavailable", reason: "Editor not available for this project. Use the agent's own question tool instead." };
}

export function questionAborted(): Error {
  return new DOMException("The caller stopped waiting for the question round", "AbortError");
}

/** The editor was reachable when the round was submitted, then stopped serving it. */
export class QuestionInterruptedError extends TramaError {
  readonly code = "editor-interrupted";

  constructor() {
    super("The editor was lost before the question round completed. Stop this workflow; do not use fallback answers or retry the round.");
    this.name = "QuestionInterruptedError";
  }
}

export interface QuestionFailure {
  error: { code: string; message: string };
}

/** One JSON error contract for the local channel, agent tools and CLI. */
export function questionFailure(error: unknown): QuestionFailure {
  const code = error instanceof QuestionInterruptedError ? error.code
    : error instanceof UsageError || error instanceof SyntaxError ? "invalid-input"
    : error instanceof Error && error.name === "AbortError" ? "cancelled"
    : "question-failed";
  return { error: { code, message: error instanceof Error ? error.message : String(error) } };
}
