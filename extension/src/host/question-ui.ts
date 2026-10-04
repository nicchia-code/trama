import * as vscode from "vscode";
import { questionAborted, type Question, type QuestionAnswer, type QuestionRequest } from "../../../src/core/questions";
import type { QuestionPresenter } from "../../../src/core/question-rounds";

interface DraftAnswer { indices: number[]; other: boolean; text?: string }
interface ChoiceItem extends vscode.QuickPickItem { index: number }
type PickAction = { kind: "answer"; draft: DraftAnswer } | { kind: "back" } | { kind: "escape" };

/** Dispose before resolving, so one round never leaves controls behind another. */
function waitForInput<T>(input: vscode.QuickInput, signal: AbortSignal, hidden: T, listen: (finish: (result: T) => void) => vscode.Disposable[]): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let finished = false;
    const listeners: vscode.Disposable[] = [];
    const close = (result?: T, error?: unknown) => {
      if (finished) return;
      finished = true;
      signal.removeEventListener("abort", abort);
      for (const listener of listeners) listener.dispose();
      input.dispose();
      if (error !== undefined) reject(error);
      else resolve(result as T);
    };
    const abort = () => close(undefined, signal.reason ?? questionAborted());
    if (signal.aborted) { abort(); return; }
    signal.addEventListener("abort", abort, { once: true });
    listeners.push(input.onDidHide(() => close(hidden)), ...listen((result) => close(result)));
    input.show();
  });
}

function choose(question: Question, title: string, step: number, draft: DraftAnswer, signal: AbortSignal): Promise<PickAction> {
  const pick = vscode.window.createQuickPick<ChoiceItem>();
  pick.title = title;
  pick.placeholder = question.question;
  pick.ignoreFocusOut = true;
  pick.canSelectMany = question.multi;
  pick.buttons = step > 0 ? [vscode.QuickInputButtons.Back] : [];
  const items: ChoiceItem[] = question.options.map((option, index) => ({
    label: `${option.label}${index === question.recommended ? " (recommended)" : ""}`,
    description: option.description,
    index,
  }));
  items.push({ label: "Other…", index: -1 });
  pick.items = items;
  const chosen = items.filter((item) => draft.indices.includes(item.index) || (item.index === -1 && draft.other));
  if (question.multi) pick.selectedItems = chosen;
  else pick.activeItems = chosen;
  return waitForInput<PickAction>(pick, signal, { kind: "escape" }, (finish) => [
    pick.onDidTriggerButton(() => finish({ kind: "back" })),
    pick.onDidAccept(() => {
      const selected = question.multi ? pick.selectedItems : pick.selectedItems.length ? pick.selectedItems : pick.activeItems;
      if (selected.length === 0) return;
      const indices = items.filter((item) => item.index >= 0 && selected.includes(item)).map((item) => item.index);
      const other = selected.some((item) => item.index === -1);
      finish({ kind: "answer", draft: { indices, other, ...(draft.text === undefined ? {} : { text: draft.text }) } });
    }),
  ]);
}

function freeAnswer(question: Question, title: string, previous: string | undefined, signal: AbortSignal): Promise<string | undefined> {
  const input = vscode.window.createInputBox();
  input.title = title;
  input.prompt = question.question;
  input.placeholder = "Write your answer";
  input.ignoreFocusOut = true;
  input.buttons = [vscode.QuickInputButtons.Back];
  input.value = previous ?? "";
  return waitForInput<string | undefined>(input, signal, undefined, (finish) => [
    input.onDidTriggerButton(() => finish(undefined)),
    input.onDidChangeValue((value) => { if (value.trim() !== "") input.validationMessage = undefined; }),
    input.onDidAccept(() => {
      if (input.value.trim() === "") { input.validationMessage = "Enter a non-empty answer."; return; }
      finish(input.value);
    }),
  ]);
}

function confirmSkip(title: string, signal: AbortSignal): Promise<"one" | "all" | "back"> {
  const pick = vscode.window.createQuickPick<vscode.QuickPickItem & { action: "one" | "all" | "back" }>();
  pick.title = title;
  pick.placeholder = "Skip this question?";
  pick.ignoreFocusOut = true;
  pick.items = [
    { label: "Skip this one", action: "one" },
    { label: "Skip all", action: "all" },
    { label: "Go back", action: "back" },
  ];
  pick.activeItems = pick.items.filter((item) => item.action === "back");
  return waitForInput<"one" | "all" | "back">(pick, signal, "back", (finish) => [
    pick.onDidAccept(() => {
      const selected = pick.selectedItems[0] ?? pick.activeItems[0];
      if (selected) finish(selected.action);
    }),
  ]);
}

/** The native controls for every `trama ask` round; no chat or terminal prompts. */
export const presentQuestionRound: QuestionPresenter = async (request: QuestionRequest, context) => {
  const answers: (QuestionAnswer | undefined)[] = [];
  const drafts: (DraftAnswer | undefined)[] = [];
  let step = 0;
  let editing: DraftAnswer | undefined;
  try {
    while (step < request.questions.length) {
      if (context.signal.aborted) throw context.signal.reason ?? questionAborted();
      const question = request.questions[step];
      if (!question) throw new Error("Question position is outside this round");
      const title = `trama ask — Question ${step + 1} of ${request.questions.length}`;
      const draft = editing ?? drafts[step] ?? { indices: [question.recommended], other: false };
      const action = await choose(question, title, step, draft, context.signal);
      if (action.kind === "back") {
        if (step > 0) step--;
        editing = undefined;
        continue;
      }
      if (action.kind === "escape") {
        const skip = await confirmSkip(title, context.signal);
        if (skip === "back") continue;
        const end = skip === "all" ? request.questions.length : step + 1;
        while (step < end) {
          answers[step] = { status: "skipped" };
          drafts[step] = { indices: [], other: false };
          step++;
        }
        editing = undefined;
        continue;
      }
      const chosen = action.draft;
      if (chosen.other) {
        const text = await freeAnswer(question, title, chosen.text, context.signal);
        if (text === undefined) { editing = chosen; continue; }
        chosen.text = text;
      }
      answers[step] = {
        status: "answered",
        selected: chosen.indices.map((index) => {
          const option = question.options[index];
          if (!option) throw new Error("Selected option is outside this question");
          return option.label;
        }),
        ...(chosen.other ? { text: chosen.text } : {}),
      };
      drafts[step] = chosen;
      step++;
      editing = undefined;
    }
    const result: Record<string, QuestionAnswer> = Object.create(null) as Record<string, QuestionAnswer>;
    request.questions.forEach((question, index) => {
      const answer = answers[index];
      if (!answer) throw new Error(`Question ${question.id} has no result`);
      result[question.id] = answer;
    });
    return { status: "answered", answers: result };
  } finally {
    // Never retain partial answers after interruption or navigation lifetime ends.
    answers.length = 0;
    drafts.length = 0;
    editing = undefined;
  }
};
