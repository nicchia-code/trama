import type { DriftView } from "../../../src/core/snapshot";
import { renderMarkdown } from "./markdown";

export type DriftHow = "fix-code" | "accept-proposal" | "dismiss";

/** What one "Keep this" button does, and how it is named. */
export interface DriftChoice {
  how: DriftHow;
  /** The line under the button: what choosing it does, or why it cannot be chosen now. */
  consequence: string;
  /** Accessible name: the side and the Drift. */
  aria: string;
  /** The attached Proposal cannot be approved: the button looks disabled but still takes focus and clicks, to explain why. */
  blocked: boolean;
}

export interface DriftComparison {
  happens: string;
  should: string;
  /** Where in the code the difference was seen; null when the Drift has no such section. */
  where: string | null;
  /** What the "should" side is: the Model, or the Requirements when the Drift points only to them. */
  shouldSource: "Model" | "Requirements";
  keepHappens: DriftChoice;
  keepShould: DriftChoice;
}

const LEGACY_SHOULD = "Not stated: this Drift was written before the two sides existed.";

/** The comparison shown for an open Drift in the Diagram and on the Board. */
export function driftComparison(d: DriftView): DriftComparison {
  const keepShould: DriftChoice = {
    how: "fix-code",
    consequence: "A Task is created for the agent to fix the code",
    aria: `Keep what should happen for ${d.title}`,
    blocked: false,
  };
  const aria = `Keep what happens for ${d.title}`;
  let keepHappens: DriftChoice;
  if (d.proposal === null) keepHappens = { how: "dismiss", consequence: "Closes the Drift; nothing changes", aria, blocked: false };
  else if (d.proposalBlock !== null) keepHappens = { how: "accept-proposal", consequence: d.proposalBlock.reason, aria, blocked: true };
  else keepHappens = { how: "accept-proposal", consequence: `Approves Proposal ${d.proposal} and changes the Model to match`, aria, blocked: false };
  return {
    happens: d.sides?.happens ?? d.body,
    should: d.sides?.should ?? LEGACY_SHOULD,
    where: d.sides?.where ?? null,
    shouldSource: d.requirementsOnly ? "Requirements" : "Model",
    keepHappens,
    keepShould,
  };
}

export interface DriftHandlers {
  keep(how: DriftHow): void;
  /** The click on a blocked "Keep this": the host explains why. */
  blocked(): void;
  /** An http or https link of a rendered text was followed. */
  openLink(url: string): void;
  /** The "Where in the code" block: whether it starts open, and told when the developer opens or closes it. Closed, and forgotten, when absent. */
  where?: { open: boolean; toggled(open: boolean): void };
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = className;
  if (text) e.textContent = text;
  return e;
}

function column(heading: string, source: string | null, text: string, choice: DriftChoice, handlers: DriftHandlers, primary: boolean): HTMLElement {
  const col = el("section", "drift-compare-col");
  const head = el("h4", "drift-compare-head", heading);
  if (source !== null) head.append(" ", el("span", "drift-compare-source", source));
  const body = renderMarkdown(text, handlers.openLink);
  body.classList.add("drift-compare-text");
  col.append(head, body);
  const button = el("button", `trama-btn${primary ? " primary" : ""}${choice.blocked ? " is-blocked" : ""}`, "Keep this");
  button.type = "button";
  button.dataset["action"] = choice.how;
  button.setAttribute("aria-label", choice.aria);
  if (choice.blocked) button.setAttribute("aria-disabled", "true");
  button.addEventListener("click", () => (choice.blocked ? handlers.blocked() : handlers.keep(choice.how)));
  col.append(button, el("p", "drift-compare-consequence", choice.consequence));
  return col;
}

/** The two sides of a Drift side by side (stacked when narrow), each with its own "Keep this", and under them the collapsible "Where in the code" when the Drift has it. */
export function renderDriftCompare(d: DriftView, handlers: DriftHandlers): HTMLElement {
  const c = driftComparison(d);
  const block = el("div", "drift-compare-block");
  const grid = el("div", "drift-compare");
  grid.append(
    column("What happens", null, c.happens, c.keepHappens, handlers, false),
    column("What should happen", c.shouldSource, c.should, c.keepShould, handlers, true),
  );
  block.append(grid);
  if (c.where !== null) {
    const details = el("details", "drift-compare-where");
    details.open = handlers.where?.open ?? false;
    details.addEventListener("toggle", () => handlers.where?.toggled(details.open));
    const summary = el("summary", "drift-compare-where-head", "Where in the code");
    const body = renderMarkdown(c.where, handlers.openLink);
    body.classList.add("drift-compare-where-text");
    details.append(summary, body);
    block.append(details);
  }
  return block;
}
