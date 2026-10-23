import { afterEach, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { Question } from "../src/core/questions";
import type { QuestionRoundView } from "../extension/src/host/question-session";
import { applyQuestionAction, type QuestionRoundState, startRound } from "../extension/src/host/question-state";
import type { ToHost } from "../extension/src/protocol";
import { QuestionOverlay } from "../extension/src/webview/questions";

afterEach(cleanup);

const q = (id: string, extra: Partial<Question> = {}): Question => ({
  id,
  question: `${id}?`,
  options: [
    { label: `${id}-a`, description: "first" },
    { label: `${id}-b`, description: "second" },
  ],
  recommended: 0,
  multi: false,
  ...extra,
});

/** The panel next to a stand-in for the host: every action goes through the real state machine and the result is drawn again. */
function setup(questions: Question[]) {
  let state: QuestionRoundState = startRound(questions);
  const delivered: unknown[] = [];
  const actions: string[] = [];
  const messages: ToHost[] = [];
  const view = (): QuestionRoundView => ({ id: 1, agent: "omp", state });
  const ui = render(<QuestionOverlay round={view()} openLink={() => {}} post={onPost} />);
  function onPost(message: ToHost) {
    messages.push(message);
    if (message.type !== "questionAction") return;
    actions.push(message.action.type);
    const step = applyQuestionAction(state, message.action);
    if (step.kind === "state") state = step.state;
    else if (step.kind === "delivered") {
      delivered.push(step.result);
      ui.rerender(<QuestionOverlay round={null} openLink={() => {}} post={onPost} />);
      return;
    }
    ui.rerender(<QuestionOverlay round={view()} openLink={() => {}} post={onPost} />);
  }
  return { ...ui, delivered, actions, messages, state: () => state };
}

const click = (name: string | RegExp) => act(() => void fireEvent.click(screen.getByRole("button", { name })));
const askMoreButton = () => screen.queryByRole("button", { name: "Ask more about this question" });

test("the dialog has its title, the agent and the position, and the focus is on the text of the question", () => {
  setup([q("one"), q("two")]);
  expect(screen.getByRole("dialog", { name: "Questions from the agent" })).not.toBeNull();
  expect(screen.getByText("omp")).not.toBeNull();
  expect(screen.getByText("Question 1 of 2")).not.toBeNull();
  expect(document.activeElement).toBe(screen.getByRole("heading", { name: "one?" }));
});

test("each new question takes the focus, and Esc does nothing", () => {
  setup([q("one"), q("two")]);
  act(() => void fireEvent.keyDown(document.activeElement as Element, { key: "Escape" }));
  expect(screen.getByRole("dialog")).not.toBeNull();
  const text = screen.getByLabelText("Your answer (optional)");
  text.focus();
  click("Next");
  expect(screen.getByText("Question 2 of 2")).not.toBeNull();
  expect(document.activeElement).toBe(screen.getByRole("heading", { name: "two?" }));
});

test("Back and the index keep what was written", () => {
  setup([q("one"), q("two")]);
  fireEvent.change(screen.getByLabelText("Your answer (optional)"), { target: { value: "a note" } });
  click("Skip");
  click("Back");
  expect((screen.getByLabelText("Your answer (optional)") as HTMLTextAreaElement).value).toBe("a note");
  click("Skip");
  fireEvent.change(screen.getByLabelText("Your answer (optional)"), { target: { value: "draft two" } });
  act(() => void fireEvent.click(screen.getAllByRole("button", { name: /one\?/ })[0] as Element));
  expect(screen.getByText("Question 1 of 2")).not.toBeNull();
  act(() => void fireEvent.click(screen.getAllByRole("button", { name: /two\?/ })[0] as Element));
  expect((screen.getByLabelText("Your answer (optional)") as HTMLTextAreaElement).value).toBe("draft two");
});

test("the recommended option is selected on the first visit and a click on the selected option clears it", () => {
  setup([q("one", { recommended: 1 })]);
  const radios = screen.getAllByRole("radio") as HTMLInputElement[];
  expect(radios.map((r) => r.checked)).toEqual([false, true]);
  expect(screen.getByText("Recommended")).not.toBeNull();
  act(() => void fireEvent.click(radios[1] as Element));
  expect((screen.getAllByRole("radio") as HTMLInputElement[]).map((r) => r.checked)).toEqual([false, false]);
  expect((screen.getByRole("button", { name: "Review" }) as HTMLButtonElement).disabled).toBe(true);
});

test("Skip all asks for confirmation with the focus on Go back, and Go back changes nothing", () => {
  const { delivered } = setup([q("one"), q("two")]);
  click("Skip all");
  const confirm = screen.getByRole("alertdialog", { name: "Skip all unanswered questions?" });
  expect(within(confirm).getByText("The agent will use its recommendation for each of them.")).not.toBeNull();
  expect(document.activeElement).toBe(within(confirm).getByRole("button", { name: "Go back" }));
  act(() => void fireEvent.click(within(confirm).getByRole("button", { name: "Go back" })));
  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(delivered).toEqual([]);
  expect(screen.getByText("Question 1 of 2")).not.toBeNull();
});

test("Skip all, confirmed, delivers the round with every unanswered question skipped", () => {
  const { delivered } = setup([q("one"), q("two")]);
  click("Next");
  click("Skip all");
  act(() => void fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Skip all" })));
  expect(delivered).toEqual([{ status: "answered", answers: { one: { status: "answered", selected: ["one-a"] }, two: { status: "skipped" } } }]);
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("the summary lists the answers and sends them", () => {
  const { delivered } = setup([q("one")]);
  fireEvent.change(screen.getByLabelText("Your answer (optional)"), { target: { value: "line 1\nline 2" } });
  click("Review");
  expect(screen.getByRole("heading", { name: "Summary" })).not.toBeNull();
  expect(screen.getByText("one-a")).not.toBeNull();
  expect(screen.queryByText(/more question/)).toBeNull();
  click("Send to agent");
  expect(delivered).toEqual([{ status: "answered", answers: { one: { status: "answered", selected: ["one-a"], text: "line 1\nline 2" } } }]);
});

test("the summary marks what is missing and keeps Send to agent disabled", () => {
  setup([q("one"), q("two")]);
  act(() => void fireEvent.click(screen.getAllByRole("button", { name: "Summary" })[0] as Element));
  expect((screen.getByRole("button", { name: "Send to agent" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByText("Answer or skip 2 more question(s) to send.")).not.toBeNull();
});

test("Minimize reduces to the bar and Reopen brings the overlay back on the same question", () => {
  setup([q("one"), q("two")]);
  click("Next");
  click("Minimize");
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByText("The agent is waiting for your answers (question 2 of 2)")).not.toBeNull();
  click("Open questions");
  expect(screen.getByText("Question 2 of 2")).not.toBeNull();
  expect(document.activeElement).toBe(screen.getByRole("heading", { name: "two?" }));
});

test("digits choose options outside the text area, and Show details opens the details closed by default", () => {
  setup([q("one", { multi: true, options: [{ label: "a", description: "d", details: "the **pros**" }, { label: "b", description: "d" }] })]);
  expect(screen.getAllByRole("checkbox").map((c) => c.getAttribute("aria-checked"))).toEqual(["true", "false"]);
  act(() => void fireEvent.keyDown(document.body, { key: "2" }));
  expect(screen.getAllByRole("checkbox").map((c) => c.getAttribute("aria-checked"))).toEqual(["true", "true"]);
  const text = screen.getByLabelText("Your answer (optional)");
  act(() => void fireEvent.keyDown(text, { key: "1" }));
  expect(screen.getAllByRole("checkbox").map((c) => c.getAttribute("aria-checked"))).toEqual(["true", "true"]);
  expect(screen.getByRole("button", { name: "Show details" })).not.toBeNull();
  click("Show details");
  expect(screen.getByRole("button", { name: "Hide details" })).not.toBeNull();
});

test("Ask more on a question sends its ID and leaves the round and the overlay as they were", () => {
  const { messages, state, actions } = setup([q("one"), q("two")]);
  click("Skip");
  const before = state();
  expect(askMoreButton()).not.toBeNull();
  click("Ask more about this question");
  expect(messages.at(-1)).toEqual({ type: "questionAction", round: 1, action: { type: "askMore", id: "two" } });
  expect(actions.at(-1)).toBe("askMore");
  expect(state()).toBe(before);
  expect(screen.getByRole("dialog", { name: "Questions from the agent" })).not.toBeNull();
  expect(screen.getByText("Question 2 of 2")).not.toBeNull();
  expect(screen.getByRole("heading", { name: "two?" })).not.toBeNull();
});

test("Ask more keeps the choice and the written answer of the question in view", () => {
  const { state } = setup([q("one")]);
  act(() => void fireEvent.keyDown(document.body, { key: "2" }));
  fireEvent.change(screen.getByLabelText("Your answer (optional)"), { target: { value: "a note" } });
  click("Ask more about this question");
  expect(state().drafts[0]).toEqual({ selected: [1], text: "a note" });
  expect((screen.getByLabelText("Your answer (optional)") as HTMLTextAreaElement).value).toBe("a note");
  expect((screen.getAllByRole("radio") as HTMLInputElement[]).map((r) => r.checked)).toEqual([false, true]);
});

test("Ask more is not on the summary", () => {
  setup([q("one")]);
  click("Review");
  expect(screen.getByRole("heading", { name: "Summary" })).not.toBeNull();
  expect(askMoreButton()).toBeNull();
});
