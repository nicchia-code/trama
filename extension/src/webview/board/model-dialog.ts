import type { ModelSuggestion } from "../../host/model-lists";
import type { ProposalAgent } from "../../host/proposal-models";
import { modelField } from "../model-field";
import { setIconLabel } from "../icons";
import type { ViewContext } from "../types";
import { AGENT_NAMES, type ProposalCard } from "./logic";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** The window that chooses the model of one Proposal on the Board. One window serves every card: it shows the Proposal it was opened for. */
export interface ModelDialog {
  node: HTMLDialogElement;
  /** Opens the window for the Proposal of `card`, and asks the agent for the model names it offers. */
  open(card: ProposalCard, agent: ProposalAgent): void;
  /** Redraws the window from the newest card of its Proposal; with no card (the Proposal left Backlog) the window closes. */
  update(card: ProposalCard | undefined, agent: ProposalAgent): void;
  /** The newest model names, and why omp gives none. */
  receiveModels(models: ModelSuggestion[], error: string | null): void;
  /** The Proposal the window is open for; null when it is closed. */
  shown(): string | null;
}

/**
 * The model window of a Proposal, a modal `<dialog>` as the History entries have. `onClosed` gets the Proposal the window
 * showed, so the developer's focus goes back to its gear. A confirmed field saves at once: the window stays open until it is closed.
 */
export function modelDialog(context: ViewContext, onClosed: (proposal: string) => void): ModelDialog {
  const node = el("dialog", "board-model-dialog");
  const title = el("h2", "board-model-title");
  title.id = "board-model-title";
  node.setAttribute("aria-labelledby", title.id);
  const close = el("button", "trama-btn board-model-close");
  close.type = "button";
  setIconLabel(close, "close", "Close");
  close.addEventListener("click", () => node.close());

  /** The Proposal the window is for; kept after it closes, so a confirmed field still saves for it. */
  let openId: string | null = null;

  const chosen = el("p", "board-model-chosen");
  chosen.id = "board-model-chosen";
  chosen.hidden = true;
  const field = modelField("board-model-field", (value) => {
    if (openId !== null) context.post({ type: "setProposalModel", proposal: openId, model: value });
  });
  field.input.placeholder = "Settings roles (trama.analysis, trama.execution)";
  const label = el("label", "board-model-label", "Model");
  label.htmlFor = field.input.id;
  const hint = el("p", "board-muted board-model-hint", "Used by the Runs of this Proposal's Tasks and by Resolve on a Drift filed from one of them. Scans always use trama.scan. Leave empty to use the Settings roles.");
  hint.id = "board-model-hint";
  field.input.setAttribute("aria-describedby", [chosen.id, hint.id, field.note.id].join(" "));

  const heading = el("div", "board-model-head");
  heading.append(title, close);
  const body = el("div", "board-model-body");
  body.append(heading, chosen, label, field.input, field.note, field.datalist, hint);
  node.append(body);

  /** Draws the window for the card: its title, the model in the field, and the note of a model chosen for another agent. */
  function fill(card: ProposalCard, agent: ProposalAgent) {
    title.textContent = `Model for ${card.name.text} ${card.title}`;
    field.setValue(card.model?.name ?? "");
    const other = card.model !== null && !card.model.applies ? card.model : null;
    chosen.hidden = other === null;
    chosen.textContent = other === null
      ? ""
      : `Chosen for ${AGENT_NAMES[other.agent]}: the Settings roles apply. Confirm a model to use it with ${AGENT_NAMES[agent]}.`;
  }

  node.addEventListener("click", (event) => {
    if (event.target === node) node.close();
  });
  node.addEventListener("close", () => {
    if (openId !== null) onClosed(openId);
  });

  return {
    node,
    open(card, agent) {
      openId = card.id;
      fill(card, agent);
      context.post({ type: "modelSuggestionsWanted" });
      if (!node.open) node.showModal();
      field.input.focus();
    },
    update(card, agent) {
      if (!node.open) return;
      if (card === undefined) {
        node.close();
        return;
      }
      openId = card.id;
      fill(card, agent);
    },
    receiveModels(models, error) {
      field.setModels(models, error);
    },
    shown() {
      return node.open ? openId : null;
    },
  };
}
