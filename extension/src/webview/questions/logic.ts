import type { QuestionRoundState } from "../../host/question-state";

/** What the overlay says about each question, in text as well as with an icon: never only a colour. */
export type QuestionStatus = "Answered" | "Skipped" | "Missing";

/** The state reaches the webview as JSON, so a missing answer arrives as `null`, not `undefined`. */
export const isMissing = (confirmed: QuestionRoundState["confirmed"][number] | null): confirmed is undefined | null => confirmed == null;

export function questionStatus(state: QuestionRoundState, index: number): QuestionStatus {
  const confirmed = state.confirmed[index];
  if (isMissing(confirmed)) return "Missing";
  return confirmed.status === "skipped" ? "Skipped" : "Answered";
}

/** `Question <n> of <total>`, or `Summary` on the summary. */
export function stepTitle(state: QuestionRoundState): string {
  return state.view === "summary" ? "Summary" : `Question ${state.current + 1} of ${state.questions.length}`;
}

/** The main button of a question: `Review` on the last question and on one opened from the summary, `Next` otherwise. */
export function primaryLabel(state: QuestionRoundState): "Next" | "Review" {
  return state.current === state.questions.length - 1 || state.fromSummary ? "Review" : "Next";
}

export const missingLine = (missing: number): string => `Answer or skip ${missing} more question(s) to send.`;

export const barText = (state: QuestionRoundState): string =>
  `The agent is waiting for your answers (question ${state.current + 1} of ${state.questions.length})`;

export type SummaryAnswer = { kind: "answered"; labels: string[]; text: string } | { kind: "skipped" } | { kind: "missing" };

/** The confirmed answer of a question as the summary lists it; text made only of spaces is not an answer. */
export function summaryAnswer(state: QuestionRoundState, index: number): SummaryAnswer {
  const confirmed = state.confirmed[index];
  if (isMissing(confirmed)) return { kind: "missing" };
  if (confirmed.status === "skipped") return { kind: "skipped" };
  const question = state.questions[index];
  const labels = confirmed.selected.map((n) => question?.options[n]?.label).filter((l): l is string => l !== undefined);
  return { kind: "answered", labels, text: confirmed.text.trim() === "" ? "" : confirmed.text };
}

/** Digits 1 to 9 choose the option with that number; anything else is not a shortcut. */
export function optionKey(key: string, options: number): number | null {
  if (!/^[1-9]$/.test(key)) return null;
  const index = Number(key) - 1;
  return index < options ? index : null;
}
