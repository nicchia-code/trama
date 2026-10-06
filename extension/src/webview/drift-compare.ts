import { identityNamer, type Namer } from "../../../src/core/card-names";
import type { DriftView } from "../../../src/core/snapshot";
import { renderMarkdown } from "./markdown";

export type DriftHow = "fix-code" | "accept-proposal" | "dismiss";

/** What the developer picked for a Drift: the number of the selected fix option, from 1, and the text of the note field. */
export interface FixSelection {
  option: number;
  note: string;
}

/** What a "Keep this" takes along with the decision: the option and the note for fixing the code, nothing for keeping what happens. */
export interface Carried {
  option?: number;
  note?: string;
}

/** One fix option as the radio group shows it. */
export interface FixOptionView {
  /** Counted from 1, in the order written. */
  number: number;
  title: string;
  text: string;
  /** The first option is the agent's recommendation. */
  recommended: boolean;
  selected: boolean;
}

/** What the developer selected and typed for each Drift: kept while the Board or the Diagram refresh, gone with the panel (this module lives in the view). */
const remembered = new Map<string, Partial<FixSelection>>();

/** The selection to show for a Drift: the remembered one, or the recommended option and an empty note; always exactly one option, even if the Drift's options changed since. */
export function fixSelection(d: DriftView): FixSelection {
  const kept = remembered.get(d.id);
  const option = kept?.option !== undefined && kept.option >= 1 && kept.option <= d.options.length ? kept.option : 1;
  return { option: d.options.length === 0 ? 0 : option, note: kept?.note ?? "" };
}

export function rememberOption(id: string, option: number): void {
  remembered.set(id, { ...remembered.get(id), option });
}

export function rememberNote(id: string, note: string): void {
  remembered.set(id, { ...remembered.get(id), note });
}

/** What one "Keep this" button does, and how it is named. */
export interface DriftChoice {
  how: DriftHow;
  /** The line under the button: what choosing it does, or why it cannot be chosen now. */
  consequence: string;
  /** Accessible name: the side and the Drift. */
  aria: string;
  /** The attached Proposal cannot be approved: the button looks disabled but still takes focus and clicks, to explain why. */
  blocked: boolean;
  /** What the click takes along: the selected option and the note when not empty for fixing the code, nothing otherwise. */
  carries: Carried;
}

export interface DriftComparison {
  happens: string;
  should: string;
  /** Where in the code the difference was seen; null when the Drift has no such section. */
  where: string | null;
  /** What the "should" side is: the Model, or the Requirements when the Drift points only to them. */
  shouldSource: "Model" | "Requirements";
  /** The fix options in their order with the selected one marked; empty for a Drift without options, which shows neither the group nor its heading. */
  options: FixOptionView[];
  /** Accessible name of the group of options. */
  optionsName: string;
  /** Accessible name of the note field. */
  noteName: string;
  /** The text of the note field. */
  note: string;
  keepHappens: DriftChoice;
  keepShould: DriftChoice;
}

const LEGACY_SHOULD = "Not stated: this Drift was written before the two sides existed.";

/** The comparison shown for an open Drift in the Diagram and on the Board. */
export function driftComparison(d: DriftView, selection: FixSelection = fixSelection(d), name: Namer = identityNamer): DriftComparison {
  const options = d.options.map((o, i) => ({ number: i + 1, title: o.title, text: o.text, recommended: i === 0, selected: i + 1 === selection.option }));
  const selected = options.find((o) => o.selected);
  const note = selection.note.trim() === "" ? undefined : selection.note;
  const keepShould: DriftChoice = {
    how: "fix-code",
    consequence: `A Task is created for the agent to fix the code${selected ? " with the chosen option" : ""}`,
    aria: `Keep what should happen for ${d.title}${selected ? ` with option ${selected.title}` : ""}`,
    blocked: false,
    carries: { ...(selected ? { option: selected.number } : {}), ...(note !== undefined ? { note } : {}) },
  };
  const aria = `Keep what happens for ${d.title}`;
  let keepHappens: DriftChoice;
  if (d.proposal === null) keepHappens = { how: "dismiss", consequence: "Closes the Drift; nothing changes", aria, blocked: false, carries: {} };
  else if (d.proposalBlock !== null) keepHappens = { how: "accept-proposal", consequence: d.proposalBlock.reason, aria, blocked: true, carries: {} };
  else keepHappens = { how: "accept-proposal", consequence: `Approves Proposal ${name("proposal", d.proposal)} and changes the Model to match`, aria, blocked: false, carries: {} };
  if (d.merge === true) {
    keepShould.consequence = "A Task is created to reconcile the conflicts";
    keepHappens = { how: "dismiss", consequence: "Every Proposal in the round returns to To decide and the worktrees are deleted", aria, blocked: false, carries: {} };
  }
  return {
    happens: d.sides?.happens ?? d.body,
    should: d.sides?.should ?? LEGACY_SHOULD,
    where: d.sides?.where ?? null,
    shouldSource: d.requirementsOnly ? "Requirements" : "Model",
    options,
    optionsName: `Fix options for ${d.title}`,
    noteName: `Note for ${d.title}`,
    note: selection.note,
    keepHappens,
    keepShould,
  };
}

export interface DriftHandlers {
  /** A "Keep this" was clicked: the decision, with what it takes along (the selected option and the note for fixing the code). */
  keep(how: DriftHow, carries: Carried): void;
  /** The click on a blocked "Keep this": the host explains why. */
  blocked(): void;
  /** An http or https link of a rendered text was followed. */
  openLink(url: string): void;
  /** The "Where in the code" block: whether it starts open, and told when the developer opens or closes it. Closed, and forgotten, when absent. */
  where?: { open: boolean; toggled(open: boolean): void };
  /** How a card is written in the lines under "Keep this": by its short number while live. Identities when absent. */
  name?: Namer;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = className;
  if (text) e.textContent = text;
  return e;
}

/** The button of a side with the line under it. `choice` is read at click time, so it carries the selection as it is then. */
function keepButton(choice: () => DriftChoice, handlers: DriftHandlers, primary: boolean): { button: HTMLButtonElement; consequence: HTMLElement; sync(): void } {
  const first = choice();
  const button = el("button", `trama-btn${primary ? " primary" : ""}${first.blocked ? " is-blocked" : ""}`, "Keep this");
  button.type = "button";
  button.dataset["action"] = first.how;
  if (first.blocked) button.setAttribute("aria-disabled", "true");
  button.addEventListener("click", () => {
    const now = choice();
    if (now.blocked) handlers.blocked();
    else handlers.keep(now.how, now.carries);
  });
  const consequence = el("p", "drift-compare-consequence");
  const sync = () => {
    button.setAttribute("aria-label", choice().aria);
    consequence.textContent = choice().consequence;
  };
  sync();
  return { button, consequence, sync };
}

let groups = 0;

/** The "Fix options" radio group (when the Drift has options) and the note field: what the developer selects and types is remembered for the session. */
function fixControls(d: DriftView, handlers: DriftHandlers, sync: () => void): HTMLElement {
  const c = driftComparison(d, fixSelection(d), handlers.name);
  const box = el("div", "drift-fix");
  if (c.options.length > 0) {
    const group = el("div", "drift-options");
    group.setAttribute("role", "radiogroup");
    group.setAttribute("aria-label", c.optionsName);
    const name = `drift-option-${d.id}-${++groups}`;
    box.append(el("h5", "drift-fix-head", "Fix options"), group);
    for (const o of c.options) {
      const row = el("div", "drift-option");
      const input = el("input", "drift-option-radio");
      input.type = "radio";
      input.name = name;
      input.id = `${name}-${o.number}`;
      input.value = String(o.number);
      input.checked = o.selected;
      input.dataset["option"] = String(o.number);
      input.addEventListener("change", () => {
        if (!input.checked) return;
        rememberOption(d.id, o.number);
        sync();
      });
      const label = el("label", "drift-option-title");
      label.htmlFor = input.id;
      label.append(el("strong", "", o.title), o.recommended ? " (recommended)" : "");
      const text = renderMarkdown(o.text, handlers.openLink);
      text.classList.add("drift-option-text");
      row.append(input, label, text);
      group.append(row);
    }
  }
  const field = el("label", "drift-note");
  field.append(el("span", "drift-note-label", "Note (optional)"));
  const note = el("textarea", "drift-note-field");
  note.rows = 3;
  note.value = c.note;
  note.setAttribute("aria-label", c.noteName);
  note.addEventListener("input", () => {
    rememberNote(d.id, note.value);
    sync();
  });
  field.append(note);
  box.append(field);
  return box;
}

/** `keep` is null when the Drift can no longer be decided: the side shows its text only. */
function column(heading: string, source: string | null, text: string, keep: (() => DriftChoice) | null, handlers: DriftHandlers, primary: boolean, controls?: (sync: () => void) => HTMLElement): HTMLElement {
  const col = el("section", "drift-compare-col");
  const head = el("h4", "drift-compare-head", heading);
  if (source !== null) head.append(" ", el("span", "drift-compare-source", source));
  const body = renderMarkdown(text, handlers.openLink);
  body.classList.add("drift-compare-text");
  col.append(head, body);
  if (keep === null) return col;
  const { button, consequence, sync } = keepButton(keep, handlers, primary);
  if (controls) col.append(controls(sync));
  col.append(button, consequence);
  return col;
}

/** The two sides of a Drift side by side (stacked when narrow), each with its own "Keep this", and under them the collapsible "Where in the code" when the Drift has it. */
export function renderDriftCompare(d: DriftView, handlers: DriftHandlers): HTMLElement {
  const c = driftComparison(d, fixSelection(d), handlers.name);
  const block = el("div", "drift-compare-block");
  const grid = el("div", "drift-compare");
  // A worktree's Drift is no longer decided once its round has started merging.
  const open = d.merging !== true;
  grid.append(
    column("What happens", null, c.happens, open ? () => driftComparison(d, fixSelection(d), handlers.name).keepHappens : null, handlers, false),
    column("What should happen", c.shouldSource, c.should, open ? () => driftComparison(d, fixSelection(d), handlers.name).keepShould : null, handlers, true, (sync) => fixControls(d, handlers, sync)),
  );
  block.append(grid);
  if (!open) block.append(el("p", "drift-compare-consequence", "The round has started merging: this Drift can no longer be decided and goes with the round."));
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
