import { cardNameOf, type CardNumbers } from "../../../../src/core/card-names";
import type { HistoryTaskView, HistoryView } from "../../../../src/core/snapshot";
import { idTag } from "../id-tag";
import { setIcon, setIconLabel } from "../icons";
import { renderInline, renderMarkdown } from "../markdown";
import type { ViewContext } from "../types";
import { historyWhen } from "./logic";
import { chips, proposalTagNode, statusDot } from "./render";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** A History entry on the Board. Kept by the Board across refreshes, so an open details window stays open. */
export interface HistoryEntryNode {
  node: HTMLElement;
  /** Shows the entry as it is now; when its details are open they are redrawn with it. */
  update(entry: HistoryView, numbers: CardNumbers, now?: Date): void;
}

/** One Task in the details: its status dot, ID and Proposal tag, then its title, end date and references. */
function taskLine(task: HistoryTaskView, numbers: CardNumbers, context: ViewContext): HTMLElement {
  const item = el("li", "board-history-task");
  const top = el("div", "board-history-task-head");
  if (!task.exists || task.column === null || task.title === null) {
    top.append(idTag(cardNameOf(numbers, "task", task.id)));
    item.append(top, el("span", "board-muted", "no longer exists"));
    return item;
  }
  top.append(statusDot({ column: task.column, agent: false }), idTag(cardNameOf(numbers, "task", task.id)));
  if (task.proposalTag !== null) top.append(proposalTagNode(task.proposalTag));
  item.append(top, el("span", "board-history-task-title", task.title));
  if (task.finished !== null) {
    const finished = el("time", "board-muted", new Date(task.finished).toLocaleDateString(undefined, { dateStyle: "medium" }));
    finished.dateTime = task.finished;
    item.append(finished);
  }
  if (task.refs.length > 0) item.append(chips(task.refs, context));
  return item;
}

/** One History entry: title and «i» on top, the time, then the summary. «i» opens its details in a modal dialog. */
export function historyEntryNode(context: ViewContext): HistoryEntryNode {
  const node = el("article", "board-history-entry");
  const head = el("div", "board-history-head");
  const title = el("h4", "board-history-title");
  const info = el("button", "board-history-info");
  info.type = "button";
  setIcon(info, "info");
  const time = el("time", "board-history-time");
  const summary = el("div", "board-history-summary");
  const dialog = el("dialog", "board-history-dialog");
  const close = el("button", "trama-btn board-history-close");
  close.type = "button";
  setIconLabel(close, "close", "Close");
  close.addEventListener("click", () => dialog.close());
  head.append(title, info);
  node.append(head, time, summary, dialog);

  let current: { entry: HistoryView; numbers: CardNumbers; now: Date } | null = null;
  let summarised: string | null = null;

  /** The details of the entry as it is now: date, full text, then its Tasks. */
  const fill = () => {
    if (current === null) return;
    const { entry, numbers, now } = current;
    const heading = el("div", "board-history-dialog-head");
    const when = el("time", "board-history-time", historyWhen(entry.updated, now).title);
    when.dateTime = entry.updated;
    heading.append(el("h2", "board-history-dialog-title", entry.title), when, close);
    const body = el("div", "board-history-dialog-body", "");
    body.append(heading);
    if (entry.body.trim() !== "") body.append(renderMarkdown(entry.body, context.openLink));
    body.append(el("h3", "board-history-tasks-head", "Tasks"));
    const tasks = el("ul", "board-history-tasks");
    // Creation order; a Task with no creation date goes last.
    const ordered = [...entry.tasks].sort((a, b) => (a.created ?? "9999").localeCompare(b.created ?? "9999") || a.id.localeCompare(b.id));
    tasks.append(...ordered.map((task) => taskLine(task, numbers, context)));
    body.append(tasks);
    dialog.replaceChildren(body);
  };

  info.addEventListener("click", () => {
    fill();
    if (!dialog.open) dialog.showModal();
    close.focus();
  });
  dialog.addEventListener("close", () => info.focus());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  // A link to the Diagram or to Requirements leaves the Board: the dialog closes first, in the capture phase.
  dialog.addEventListener(
    "click",
    (event) => {
      if (event.target instanceof Element && event.target.closest(".board-chip") !== null) dialog.close();
    },
    { capture: true },
  );

  return {
    node,
    update(entry, numbers, now = new Date()) {
      current = { entry, numbers, now };
      const when = historyWhen(entry.updated, now);
      title.textContent = entry.title;
      const label = `Show the Tasks of ${entry.title}`;
      info.title = label;
      info.setAttribute("aria-label", label);
      time.textContent = when.text;
      time.title = when.title;
      time.dateTime = entry.updated;
      if (summarised !== entry.summary) {
        summary.replaceChildren(renderInline(entry.summary, context.openLink));
        summarised = entry.summary;
      }
      summary.hidden = entry.summary === "";
      dialog.setAttribute("aria-label", entry.title);
      if (dialog.open) fill();
    },
  };
}
