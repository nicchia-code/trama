import { setIconLabel } from "../icons";
import { renderMarkdown } from "../markdown";
import type { ViewContext } from "../types";
import type { ProposalCard } from "./logic";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** The read-only window of the body of a Backlog Proposal. One window serves every card: it shows the Proposal it was opened for. */
export interface ProposalDialog {
  node: HTMLDialogElement;
  /** Opens the window for the Proposal of `card`. */
  open(card: ProposalCard): void;
  /** Redraws the window from the newest card of its Proposal; with no card (the Proposal left Backlog) the window closes. */
  update(card: ProposalCard | undefined): void;
  /** The Proposal the window shows; null when it is closed. */
  shown(): string | null;
}

/**
 * The body window of a Proposal, a modal `<dialog>` as the History entries have. Its only control is Close; `onClosed` gets
 * the Proposal the window showed, so the developer's focus goes back to its title on the card.
 */
export function proposalDialog(context: ViewContext, onClosed: (proposal: string) => void): ProposalDialog {
  const node = el("dialog", "board-proposal-dialog");
  const title = el("h2", "board-proposal-dialog-title");
  title.id = "board-proposal-dialog-title";
  node.setAttribute("aria-labelledby", title.id);
  const close = el("button", "trama-btn board-proposal-close");
  close.type = "button";
  setIconLabel(close, "close", "Close");
  close.addEventListener("click", () => node.close());

  const heading = el("div", "board-proposal-dialog-head");
  heading.append(title, close);
  const content = el("div", "board-proposal-dialog-content");
  const body = el("div", "board-proposal-dialog-body");
  body.append(heading, content);
  node.append(body);

  /** The Proposal the window shows; null once it is closed. */
  let openId: string | null = null;
  /** The text the window shows now, so a refresh that changes nothing keeps the scroll position. */
  let drawn: string | null = null;

  /** Draws the window for the card: its number and title, then its body, or the note that it has none. */
  function fill(card: ProposalCard) {
    title.textContent = `${card.name.text} ${card.title}`;
    const text = `${card.name.text}\n${card.title}\n${card.body}`;
    if (text === drawn) return;
    drawn = text;
    content.replaceChildren(card.body.trim() === "" ? el("p", "board-muted", "This Proposal has no description.") : renderMarkdown(card.body, context.openLink));
  }

  node.addEventListener("click", (event) => {
    if (event.target === node) node.close();
  });
  node.addEventListener("close", () => {
    const proposal = openId;
    openId = null;
    if (proposal !== null) onClosed(proposal);
  });

  return {
    node,
    open(card) {
      openId = card.id;
      fill(card);
      if (!node.open) node.showModal();
      close.focus();
    },
    update(card) {
      if (card === undefined) {
        node.close();
        return;
      }
      fill(card);
    },
    shown: () => openId,
  };
}
