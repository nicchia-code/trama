// In the harness, `#questions` in the address plays the host's side of a question round: it starts a round, applies
// every action the overlay posts and answers with the new state, as the extension host does.
import { applyQuestionAction, type QuestionAction, startRound } from "../extension/src/host/question-state";
import type { Question } from "../src/core/questions";

const questions: Question[] = [
  {
    id: "refund",
    question: "When can a shipped order still be **refunded**?",
    context: "Today the code refunds an order even after the courier has picked it up, so the customer can keep the parcel *and* the money.",
    options: [
      { label: "Only before pickup", description: "Simple and safe; customers lose the refund once the courier has it.", details: "- **Pro**: no refund without the parcel\n- **Con**: more support tickets in the first days" },
      { label: "After the return arrives", description: "Fair to both sides; the money waits for the parcel." },
      { label: "Always, within 30 days", description: "Friendliest for customers; finance carries the risk." },
    ],
    recommended: 1,
    multi: false,
  },
  {
    id: "notify",
    question: "Who is told when a refund is refused?",
    options: [
      { label: "The customer", description: "An email with the reason." },
      { label: "Support", description: "A ticket, so a person can follow up." },
      { label: "Finance", description: "A line in the daily report." },
    ],
    recommended: 0,
    multi: true,
  },
  {
    id: "label",
    question: "Should the return label be printed by the customer or sent by the courier? This question is deliberately long so that the index shortens it with an ellipsis while the question itself wraps in full.",
    options: [
      { label: "Customer prints it", description: "Cheaper." },
      { label: "Courier brings it", description: "Easier for the customer." },
    ],
    recommended: 1,
    multi: false,
  },
];

// `#questions-summary` opens the summary with one question missing; `#questions-confirm` also asks to skip all.
const prelude: Record<string, QuestionAction[]> = {
  "#questions": [],
  "#questions-summary": [{ type: "next" }, { type: "setText", text: "Support only.\nFinance reads the tickets anyway." }, { type: "next" }, { type: "openSummary" }],
};
prelude["#questions-confirm"] = [...prelude["#questions-summary"]!, { type: "closeQuestions" }];

const actions = prelude[location.hash];
if (actions) {
  let state = startRound(questions);
  for (const action of actions) {
    const step = applyQuestionAction(state, action);
    if (step.kind === "state") state = step.state;
  }
  // The editor serialises messages to the webview as JSON: `undefined` in arrays arrives as `null`.
  const send = () => window.postMessage(JSON.parse(JSON.stringify({ type: "questions", round: { id: 1, agent: "claude", state } })), "*");
  const original = (window as unknown as { acquireVsCodeApi: () => { postMessage(m: unknown): void } }).acquireVsCodeApi;
  (window as unknown as { acquireVsCodeApi: () => { postMessage(m: unknown): void } }).acquireVsCodeApi = () => {
    const api = original();
    return {
      postMessage(message: unknown) {
        api.postMessage(message);
        const m = message as { type: string; action?: QuestionAction };
        if (m.type === "ready") setTimeout(send, 10);
        if (m.type !== "questionAction" || !m.action) return;
        const step = applyQuestionAction(state, m.action);
        if (step.kind === "delivered") {
          console.log("delivered", JSON.stringify(step.result));
          window.postMessage({ type: "questions", round: null }, "*");
          return;
        }
        if (step.kind === "state") state = step.state;
        if (m.action.type !== "setText") send();
      },
    };
  };
}
