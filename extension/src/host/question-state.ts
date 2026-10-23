import type { CompletedQuestionRound } from "../../../src/core/question-rounds";
import type { Question, QuestionAnswer } from "../../../src/core/questions";

/** What is chosen or written on a question, confirmed or not: option indices and the free text as typed. */
export interface QuestionDraft {
  selected: number[];
  text: string;
}

export type ConfirmedAnswer = ({ status: "answered" } & QuestionDraft) | { status: "skipped" };

/**
 * A question round while the developer answers it. Kept in the extension host only, in memory, for the life of the
 * round: the panel receives it and sends back the developer's actions.
 */
export interface QuestionRoundState {
  questions: Question[];
  /** Per question: the confirmed answer or skip; undefined while missing. */
  confirmed: (ConfirmedAnswer | undefined)[];
  /** Per question: what is on it without confirmation; undefined until the question is first visited. */
  drafts: (QuestionDraft | undefined)[];
  current: number;
  view: "question" | "summary";
  /** The current question was opened from the summary: confirming or skipping it goes back there. */
  fromSummary: boolean;
  /** The confirmation of Skip all is open, asked from a question or from the summary; null when closed. */
  confirming: "question" | "summary" | null;
  /** The overlay is reduced to the bar. */
  minimized: boolean;
}

/** What the developer does on the overlay. */
export type QuestionAction =
  | { type: "toggleOption"; option: number }
  | { type: "pressKey"; option: number }
  | { type: "setText"; text: string }
  | { type: "next" }
  | { type: "skip" }
  | { type: "back" }
  | { type: "openQuestion"; index: number }
  | { type: "openSummary" }
  /** Close (×) or Skip all: opens the confirmation. */
  | { type: "closeQuestions" }
  | { type: "cancelSkipAll" }
  | { type: "confirmSkipAll" }
  | { type: "send" }
  | { type: "minimize" }
  | { type: "restore" }
  /** Ask more on the question `id`: opens a new chat about it and changes nothing in the round. */
  | { type: "askMore"; id: string };

export type QuestionStep =
  | { kind: "state"; state: QuestionRoundState }
  /** The round is delivered to the agent: only confirmed answers and skips. */
  | { kind: "delivered"; result: CompletedQuestionRound }
  /** The action is not allowed now; the state does not change. */
  | { kind: "refused"; reason: string };

const firstVisit = (question: Question): QuestionDraft => ({ selected: [question.recommended], text: "" });

/** Visiting a question for the first time selects its recommended option; later visits find what was left there. */
function visit(state: QuestionRoundState, index: number, fromSummary: boolean): QuestionRoundState {
  const drafts = [...state.drafts];
  drafts[index] ??= firstVisit(state.questions[index] as Question);
  return { ...state, drafts, current: index, view: "question", fromSummary, confirming: null };
}

export function startRound(questions: Question[]): QuestionRoundState {
  const empty: QuestionRoundState = {
    questions,
    confirmed: questions.map(() => undefined),
    drafts: questions.map(() => undefined),
    current: 0,
    view: "question",
    fromSummary: false,
    confirming: null,
    minimized: false,
  };
  return visit(empty, 0, false);
}

export const canConfirm = (draft: QuestionDraft | undefined): boolean => draft !== undefined && (draft.selected.length > 0 || draft.text.trim() !== "");

/** The questions still without a confirmed answer or skip. */
export const missingQuestions = (state: QuestionRoundState): number => state.confirmed.filter((c) => c === undefined).length;

/** After confirming or skipping: the next question, or the summary from the last one or from one opened from the summary. */
function advance(state: QuestionRoundState): QuestionRoundState {
  const last = state.current === state.questions.length - 1;
  if (last || state.fromSummary) return { ...state, view: "summary", fromSummary: false, confirming: null };
  return visit(state, state.current + 1, false);
}

function deliver(state: QuestionRoundState, confirmed: ConfirmedAnswer[]): QuestionStep {
  const answers: Record<string, QuestionAnswer> = Object.create(null) as Record<string, QuestionAnswer>;
  state.questions.forEach((question, index) => {
    const answer = confirmed[index] as ConfirmedAnswer;
    if (answer.status === "skipped") {
      answers[question.id] = { status: "skipped" };
      return;
    }
    const selected = answer.selected.map((n) => question.options[n]?.label).filter((label): label is string => label !== undefined);
    answers[question.id] = { status: "answered", selected, ...(answer.text.trim() === "" ? {} : { text: answer.text }) };
  });
  return { kind: "delivered", result: { status: "answered", answers } };
}

const ok = (state: QuestionRoundState): QuestionStep => ({ kind: "state", state });
const refused = (reason: string): QuestionStep => ({ kind: "refused", reason });

/**
 * The question Ask more may ask about: the one in view, on an open question (not the summary, not the confirmation of Skip all,
 * not the reduced bar); null otherwise, so a message that arrives after the view changed asks about nothing.
 */
export function askMoreTarget(state: QuestionRoundState, id: string): Question | null {
  if (state.minimized || state.view !== "question" || state.confirming !== null) return null;
  const question = state.questions[state.current];
  return question !== undefined && question.id === id ? question : null;
}

/** Applies one developer action. Anything the overlay should not have offered is refused, even if the panel sent it. */
export function applyQuestionAction(state: QuestionRoundState, action: QuestionAction): QuestionStep {
  // Ask more changes nothing in the round: the host opens the chat and the overlay stays as it was.
  if (action.type === "askMore") return askMoreTarget(state, action.id) ? ok(state) : refused("Ask more is about the question in view");
  if (action.type === "minimize") return ok({ ...state, minimized: true, confirming: null });
  if (action.type === "restore") return ok({ ...state, minimized: false });
  if (state.minimized) return refused("the questions are minimized");

  if (state.confirming !== null) {
    switch (action.type) {
      case "cancelSkipAll":
        return ok({ ...state, confirming: null });
      case "confirmSkipAll":
        return deliver(state, state.confirmed.map((c) => c ?? { status: "skipped" }));
      case "closeQuestions":
        return ok(state);
      default:
        return refused("the confirmation of Skip all is open");
    }
  }

  switch (action.type) {
    case "closeQuestions":
      return ok({ ...state, confirming: state.view });
    case "openQuestion":
      if (!Number.isInteger(action.index) || action.index < 0 || action.index >= state.questions.length) return refused("there is no such question");
      return ok(visit(state, action.index, state.view === "summary"));
    case "openSummary":
      return ok({ ...state, view: "summary", fromSummary: false });
    case "send": {
      if (state.view !== "summary") return refused("the answers are sent from the summary");
      const missing = missingQuestions(state);
      if (missing > 0) return refused(`${missing} question(s) are neither answered nor skipped`);
      return deliver(state, state.confirmed as ConfirmedAnswer[]);
    }
    case "cancelSkipAll":
    case "confirmSkipAll":
      return refused("the confirmation of Skip all is not open");
  }

  if (state.view !== "question") return refused("no question is open");
  const question = state.questions[state.current] as Question;
  const draft = state.drafts[state.current] ?? firstVisit(question);
  const withDraft = (next: QuestionDraft): QuestionStep => {
    const drafts = [...state.drafts];
    drafts[state.current] = next;
    return ok({ ...state, drafts });
  };
  switch (action.type) {
    case "toggleOption": {
      const n = action.option;
      if (!Number.isInteger(n) || n < 0 || n >= question.options.length) return refused("there is no such option");
      const has = draft.selected.includes(n);
      // Single choice: clicking the selected option clears it, so the answer can be the text alone.
      const selected = question.multi ? (has ? draft.selected.filter((x) => x !== n) : [...draft.selected, n].sort((a, b) => a - b)) : has ? [] : [n];
      return withDraft({ ...draft, selected });
    }
    case "pressKey": {
      // A digit key selects in a single choice and never clears it; in a multiple choice it toggles like a click.
      const n = action.option;
      if (!Number.isInteger(n) || n < 0 || n >= question.options.length) return refused("there is no such option");
      const has = draft.selected.includes(n);
      const selected = question.multi ? (has ? draft.selected.filter((x) => x !== n) : [...draft.selected, n].sort((a, b) => a - b)) : [n];
      return withDraft({ ...draft, selected });
    }
    case "setText":
      return withDraft({ ...draft, text: action.text });
    case "next": {
      if (!canConfirm(draft)) return refused("choose an option or write an answer first");
      const confirmed = [...state.confirmed];
      confirmed[state.current] = { status: "answered", selected: [...draft.selected], text: draft.text };
      return ok(advance({ ...state, confirmed }));
    }
    case "skip": {
      const confirmed = [...state.confirmed];
      confirmed[state.current] = { status: "skipped" };
      return ok(advance({ ...state, confirmed }));
    }
    case "back":
      if (state.current === 0) return refused("this is the first question");
      return ok(visit(state, state.current - 1, false));
  }
}
