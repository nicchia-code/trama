import type { QuestionRoundView } from "../../host/question-session";
import type { QuestionAction, QuestionRoundState } from "../../host/question-state";
import type { Question } from "../../../../src/core/questions";
import type { ToHost } from "../../protocol";
import { renderMarkdown } from "../markdown";
import css from "./questions.css" with { type: "text" };
import { barText, isMissing, missingLine, optionKey, primaryLabel, questionStatus, type QuestionStatus, stepTitle, summaryAnswer } from "./logic";

/** How long typing waits before the text goes to the host, so a closed panel loses at most this much. */
const TEXT_DELAY_MS = 300;
const MAX_TEXT_ROWS = 10;

const STATUS_ICON: Record<QuestionStatus, string> = { Answered: "✓", Skipped: "↷", Missing: "!" };

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(label: string, className: string, onClick: () => void, options: { title?: string; aria?: string } = {}): HTMLButtonElement {
  const node = el("button", className, label);
  node.type = "button";
  if (options.title !== undefined) node.title = options.title;
  if (options.aria !== undefined) node.setAttribute("aria-label", options.aria);
  node.addEventListener("click", onClick);
  return node;
}

function statusTag(status: QuestionStatus): HTMLElement {
  const tag = el("span", `qo-status qo-status-${status.toLowerCase()}`);
  const icon = el("span", "qo-status-icon", STATUS_ICON[status]);
  icon.setAttribute("aria-hidden", "true");
  tag.append(icon, document.createTextNode(status));
  return tag;
}

export interface QuestionOverlay {
  update(round: QuestionRoundView | null): void;
}

/**
 * The question round over the panel's tabs. It only draws the state the host sends and sends back what the developer
 * does; the host decides. `app` is the panel's root, so the overlay and its bar sit above every tab.
 */
export function mountQuestions(app: HTMLElement, post: (message: ToHost) => void, openLink: (url: string) => void): QuestionOverlay {
  const style = document.createElement("style");
  style.textContent = css;
  document.head.append(style);

  const bar = el("div", "qo-bar");
  bar.hidden = true;
  const barLabel = el("span", "qo-bar-text");
  bar.append(barLabel, button("Open questions", "trama-btn primary", () => act({ type: "restore" })));
  bar.addEventListener("click", (e) => {
    if (e.target === bar || e.target === barLabel) act({ type: "restore" });
  });
  app.prepend(bar);

  const overlay = el("div", "qo");
  overlay.hidden = true;
  const dialog = el("div", "qo-dialog");
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "qo-title");
  const head = el("div", "qo-head");
  const titles = el("div", "qo-titles");
  const title = el("h2", "qo-title", "Questions from the agent");
  title.id = "qo-title";
  const agent = el("span", "qo-agent");
  const step = el("span", "qo-step");
  titles.append(title, agent, step);
  head.append(
    titles,
    button("–", "qo-icon", () => act({ type: "minimize" }), { title: "Minimize", aria: "Minimize" }),
    button("×", "qo-icon", () => act({ type: "closeQuestions" }), { title: "Close", aria: "Close" }),
  );
  const body = el("div", "qo-body");
  const index = el("nav", "qo-index");
  index.setAttribute("aria-label", "Questions");
  const dots = el("nav", "qo-dots");
  dots.setAttribute("aria-label", "Questions");
  const main = el("div", "qo-main");
  const content = el("div", "qo-content");
  main.append(dots, content);
  body.append(index, main);
  const confirm = el("div", "qo-confirm");
  confirm.hidden = true;
  dialog.append(head, body, confirm);
  overlay.append(el("div", "qo-backdrop"), dialog);
  app.append(overlay);

  let round: QuestionRoundView | null = null;
  /** Identifies what is in front of the developer; when it changes, focus moves and details close. */
  let shownKey = "";
  let textarea: HTMLTextAreaElement | null = null;
  let textTimer: ReturnType<typeof setTimeout> | undefined;
  let pendingText: string | null = null;
  const openDetails = new Set<number>();
  let wasConfirming = false;

  const flushText = () => {
    clearTimeout(textTimer);
    if (pendingText === null || !round) return;
    const text = pendingText;
    pendingText = null;
    post({ type: "questionAction", round: round.id, action: { type: "setText", text } });
  };
  function act(action: QuestionAction) {
    if (!round) return;
    flushText();
    post({ type: "questionAction", round: round.id, action });
  }

  // Esc does nothing while the overlay is open; focus stays inside it; digits choose options outside the text area.
  overlay.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (e.key === "Tab") {
      trapFocus(e);
      return;
    }
    const state = round?.state;
    if (!state || state.view !== "question" || state.confirming !== null || e.target instanceof HTMLTextAreaElement) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const n = optionKey(e.key, state.questions[state.current]?.options.length ?? 0);
    if (n === null) return;
    e.preventDefault();
    act({ type: "toggleOption", option: n });
  });

  function trapFocus(e: KeyboardEvent) {
    // While Skip all is being confirmed, only the confirmation and the header (Minimize, Close) take focus.
    const scopes = confirm.hidden ? [dialog] : [head, confirm];
    const focusable = scopes.flatMap((s) => [...s.querySelectorAll<HTMLElement>("button, textarea, input, a[href]")]).filter((n) => !n.hasAttribute("disabled") && n.offsetParent !== null && n.closest("[inert]") === null);
    const inside = scopes.some((s) => s.contains(document.activeElement));
    if (focusable.length === 0) return;
    const first = focusable[0] as HTMLElement;
    const last = focusable[focusable.length - 1] as HTMLElement;
    if (e.shiftKey && (document.activeElement === first || !inside)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
      e.preventDefault();
      first.focus();
    }
  }

  function renderIndex(state: QuestionRoundState) {
    const items = state.questions.map((q, i) => {
      const status = questionStatus(state, i);
      const current = state.view === "question" && state.current === i;
      const entry = button("", `qo-index-item${current ? " is-current" : ""}`, () => act({ type: "openQuestion", index: i }), { title: q.question });
      if (current) entry.setAttribute("aria-current", "step");
      entry.append(el("span", "qo-index-number", String(i + 1)), el("span", "qo-index-text", q.question), statusTag(status));
      return entry;
    });
    const summary = button("Summary", `qo-index-item qo-index-summary${state.view === "summary" ? " is-current" : ""}`, () => act({ type: "openSummary" }));
    if (state.view === "summary") summary.setAttribute("aria-current", "step");
    index.replaceChildren(...items, summary);

    dots.replaceChildren(
      ...state.questions.map((q, i) => {
        const status = questionStatus(state, i);
        const current = state.view === "question" && state.current === i;
        const name = `Question ${i + 1}: ${status}`;
        const dot = button(String(i + 1), `qo-dot qo-dot-${status.toLowerCase()}${current ? " is-current" : ""}`, () => act({ type: "openQuestion", index: i }), { title: `${name}. ${q.question}`, aria: name });
        if (current) dot.setAttribute("aria-current", "step");
        return dot;
      }),
      (() => {
        const dot = button("Σ", `qo-dot qo-dot-summary${state.view === "summary" ? " is-current" : ""}`, () => act({ type: "openSummary" }), { title: "Summary", aria: "Summary" });
        if (state.view === "summary") dot.setAttribute("aria-current", "step");
        return dot;
      })(),
    );
  }

  function renderQuestion(state: QuestionRoundState, fresh: boolean): HTMLElement {
    const question = state.questions[state.current] as Question;
    const draft = state.drafts[state.current] ?? { selected: [question.recommended], text: "" };
    const view = el("div", "qo-question-view");
    const text = el("div", "qo-question");
    text.setAttribute("role", "heading");
    text.setAttribute("aria-level", "3");
    text.append(renderMarkdown(question.question, openLink));
    text.tabIndex = -1;
    text.id = "qo-question";
    view.append(text);
    if (question.context !== undefined) {
      const context = renderMarkdown(question.context, openLink);
      context.classList.add("qo-context");
      view.append(context);
    }

    const options = el("div", "qo-options");
    options.setAttribute("role", question.multi ? "group" : "radiogroup");
    options.setAttribute("aria-labelledby", "qo-question");
    question.options.forEach((option, n) => {
      const selected = draft.selected.includes(n);
      const row = el("div", `qo-option${selected ? " is-selected" : ""}`);
      const input = document.createElement("input");
      input.type = question.multi ? "checkbox" : "radio";
      input.name = "qo-option";
      input.checked = selected;
      input.id = `qo-option-${n}`;
      // The host decides what is selected; the control only reports the click.
      input.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        act({ type: "toggleOption", option: n });
      });
      const key = el("kbd", "qo-key", n < 9 ? String(n + 1) : "");
      key.setAttribute("aria-hidden", "true");
      const label = el("label", "qo-option-label");
      label.htmlFor = input.id;
      label.append(el("strong", "qo-option-name", option.label));
      if (n === question.recommended) label.append(el("span", "qo-recommended", "Recommended"));
      const description = renderMarkdown(option.description, openLink);
      description.classList.add("qo-option-description");
      const textBox = el("div", "qo-option-text");
      textBox.append(label, description);
      if (option.details !== undefined) {
        const open = openDetails.has(n);
        const details = renderMarkdown(option.details, openLink);
        details.classList.add("qo-details");
        details.id = `qo-details-${n}`;
        details.hidden = !open;
        const toggle = button(open ? "Hide details" : "Show details", "shell-link qo-details-toggle", () => {
          if (openDetails.has(n)) openDetails.delete(n);
          else openDetails.add(n);
          const nowOpen = openDetails.has(n);
          details.hidden = !nowOpen;
          toggle.textContent = nowOpen ? "Hide details" : "Show details";
          toggle.setAttribute("aria-expanded", String(nowOpen));
        });
        toggle.setAttribute("aria-expanded", String(open));
        toggle.setAttribute("aria-controls", details.id);
        toggle.addEventListener("click", (e) => e.stopPropagation());
        textBox.append(toggle, details);
      }
      row.append(input, key, textBox);
      row.addEventListener("click", (e) => {
        if (e.target instanceof HTMLAnchorElement || (e.target instanceof HTMLElement && e.target.closest(".qo-details"))) return;
        e.preventDefault();
        act({ type: "toggleOption", option: n });
      });
      options.append(row);
    });
    view.append(options);

    if (fresh || !textarea) {
      textarea = el("textarea", "qo-text");
      textarea.id = "qo-text";
      textarea.rows = 2;
      textarea.placeholder = "Write a free answer or a note for the agent";
      textarea.value = draft.text;
      const area = textarea;
      area.addEventListener("input", () => {
        pendingText = area.value;
        clearTimeout(textTimer);
        textTimer = setTimeout(flushText, TEXT_DELAY_MS);
        grow(area);
        updatePrimary();
      });
      area.addEventListener("blur", flushText);
    }
    const field = el("div", "qo-field");
    const fieldLabel = el("label", "qo-field-label", "Your answer (optional)");
    fieldLabel.htmlFor = "qo-text";
    field.append(fieldLabel, textarea);
    view.append(field);

    const footer = el("div", "qo-footer");
    if (state.current > 0) footer.append(button("Back", "trama-btn", () => act({ type: "back" })));
    footer.append(el("span", "qo-spacer"), button("Skip all", "trama-btn", () => act({ type: "closeQuestions" })), button("Skip", "trama-btn", () => act({ type: "skip" })));
    const primary = button(primaryLabel(state), "trama-btn primary qo-primary", () => act({ type: "next" }));
    footer.append(primary);
    const updatePrimary = () => {
      const can = draft.selected.length > 0 || (textarea?.value.trim() ?? "") !== "";
      primary.disabled = !can;
      primary.title = can ? "" : "Choose an option or write an answer first";
    };
    updatePrimary();
    view.append(footer);
    return view;
  }

  function renderSummary(state: QuestionRoundState): HTMLElement {
    const view = el("div", "qo-summary-view");
    const heading = el("h3", "qo-question qo-summary-title", "Summary");
    heading.tabIndex = -1;
    view.append(heading);
    const list = el("ol", "qo-summary");
    state.questions.forEach((q, i) => {
      const item = el("li", "qo-summary-item");
      const top = el("div", "qo-summary-top");
      const questionText = renderMarkdown(q.question, openLink);
      questionText.classList.add("qo-summary-question");
      top.append(el("span", "qo-index-number", String(i + 1)), questionText, button("Edit", "trama-btn", () => act({ type: "openQuestion", index: i }), { aria: `Edit question ${i + 1}` }));
      const answer = summaryAnswer(state, i);
      const shown = el("div", "qo-summary-answer");
      if (answer.kind === "missing") shown.append(statusTag("Missing"));
      else if (answer.kind === "skipped") shown.append(statusTag("Skipped"));
      else {
        if (answer.labels.length > 0) shown.append(el("div", "qo-summary-labels", answer.labels.join(", ")));
        if (answer.text !== "") shown.append(el("div", "qo-summary-text", answer.text));
      }
      item.append(top, shown);
      list.append(item);
    });
    view.append(list);
    const missing = state.confirmed.filter(isMissing).length;
    if (missing > 0) {
      const line = el("p", "qo-missing");
      const icon = el("span", "qo-status-icon", STATUS_ICON.Missing);
      icon.setAttribute("aria-hidden", "true");
      line.append(icon, document.createTextNode(` ${missingLine(missing)}`));
      view.append(line);
    }
    const footer = el("div", "qo-footer");
    footer.append(button("Skip all", "trama-btn", () => act({ type: "closeQuestions" })), el("span", "qo-spacer"));
    const send = button("Send to agent", "trama-btn primary qo-primary", () => act({ type: "send" }));
    send.disabled = missing > 0;
    footer.append(send);
    view.append(footer);
    return view;
  }

  function renderConfirm(state: QuestionRoundState) {
    confirm.hidden = state.confirming === null;
    body.inert = state.confirming !== null;
    if (state.confirming === null) {
      confirm.replaceChildren();
      return;
    }
    if (confirm.childElementCount > 0) return;
    confirm.setAttribute("role", "alertdialog");
    confirm.setAttribute("aria-labelledby", "qo-confirm-title");
    confirm.setAttribute("aria-describedby", "qo-confirm-text");
    const box = el("div", "qo-confirm-box");
    const heading = el("h3", "qo-confirm-title", "Skip all unanswered questions?");
    heading.id = "qo-confirm-title";
    const text = el("p", "qo-confirm-text", "The agent will use its recommendation for each of them.");
    text.id = "qo-confirm-text";
    const actions = el("div", "qo-footer");
    const goBack = button("Go back", "trama-btn", () => act({ type: "cancelSkipAll" }));
    actions.append(el("span", "qo-spacer"), button("Skip all", "trama-btn primary", () => act({ type: "confirmSkipAll" })), goBack);
    box.append(heading, text, actions);
    confirm.append(box);
    goBack.focus();
  }

  return {
    update(next) {
      if (round && (!next || next.id !== round.id)) {
        clearTimeout(textTimer);
        pendingText = null;
      }
      round = next;
      if (!next) {
        overlay.hidden = true;
        bar.hidden = true;
        textarea = null;
        shownKey = "";
        wasConfirming = false;
        confirm.replaceChildren();
        return;
      }
      const state = next.state;
      bar.hidden = !state.minimized;
      barLabel.textContent = barText(state);
      overlay.hidden = state.minimized;
      if (state.minimized) return;

      agent.textContent = next.agent ?? "";
      agent.hidden = next.agent === null;
      step.textContent = stepTitle(state);
      renderIndex(state);
      const key = `${next.id}:${state.view}:${state.view === "question" ? state.current : ""}`;
      const fresh = key !== shownKey;
      if (fresh) openDetails.clear();
      // Redrawing replaces the controls: the one that had focus gets it back, unless something new is in front.
      const focusedId = document.activeElement instanceof HTMLElement && content.contains(document.activeElement) ? document.activeElement.id : "";
      content.replaceChildren(state.view === "question" ? renderQuestion(state, fresh) : renderSummary(state));
      if (textarea) grow(textarea);
      shownKey = key;
      renderConfirm(state);
      const closedConfirm = wasConfirming && state.confirming === null;
      wasConfirming = state.confirming !== null;
      if (state.confirming !== null) return;
      if (fresh || closedConfirm) content.querySelector<HTMLElement>(".qo-question")?.focus();
      else if (focusedId !== "") document.getElementById(focusedId)?.focus();
    },
  };
}

/** The text area grows with its text up to ten rows, then scrolls. */
function grow(area: HTMLTextAreaElement) {
  area.style.height = "auto";
  const line = parseFloat(getComputedStyle(area).lineHeight) || 18;
  const max = line * MAX_TEXT_ROWS + 12;
  area.style.height = `${Math.min(area.scrollHeight, max)}px`;
  area.style.overflowY = area.scrollHeight > max ? "auto" : "hidden";
}
