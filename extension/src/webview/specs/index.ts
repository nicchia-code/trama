import { cardLabel, noNumbers } from "../../../../src/core/card-names";
import type { SpecEntry } from "../../../../src/core/specs";
import type { ProposalView, Snapshot } from "../../../../src/core/snapshot";
import type { NavigateOptions } from "../../protocol";
import { renderMarkdown } from "../markdown";
import type { MountView } from "../types";
import { iconNode } from "./icons";
import { type SpecFieldView, type SpecRow, SPECS_FILE, specsView } from "./logic";
import css from "./specs.css" with { type: "text" };

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Markdown text with the given classes. */
function markdown(source: string, openLink: (url: string) => void, className: string): HTMLElement {
  const node = renderMarkdown(source, openLink);
  node.classList.add(...className.split(" "));
  return node;
}

/** Read-only Specs, field by field; a Proposal is drawn over them with what it adds, removes or changes. */
export const mountSpecs: MountView = (root, context) => {
  const style = document.createElement("style");
  style.textContent = css;
  root.append(style);

  const page = el("div", "sp");
  const toolbar = el("div", "sp-toolbar");
  const label = el("label", "sp-field", "Proposal ");
  const select = el("select", "sp-select");
  select.setAttribute("aria-label", "Proposal to draw over the Specs");
  label.append(select);
  toolbar.append(label);
  const errors = el("div", "sp-errors");
  errors.hidden = true;
  const list = el("div", "sp-list");
  page.append(toolbar, errors, list);
  root.append(page);

  let snapshot: Snapshot | null = null;
  let proposalId: string | null = null;

  select.addEventListener("change", () => {
    proposalId = select.value || null;
    render();
  });

  function renderToolbar() {
    if (!snapshot) return;
    select.replaceChildren(new Option("None", ""));
    for (const p of snapshot.proposals) select.append(new Option(`${cardLabel(snapshot.numbers ?? noNumbers, "proposal", p.id)} ${p.title}`, p.id));
    select.value = proposalId ?? "";
    select.disabled = select.options.length === 1;
  }

  function entryNode(row: SpecRow): HTMLElement {
    const node = el("li", `sp-entry ${row.change}`);
    const head = el("div", "sp-entry-head");
    head.append(iconNode(row.entry.name), el("span", "sp-name", row.entry.name));
    if (row.entry.version) head.append(el("span", "sp-version", row.entry.version));
    if (row.change !== "same") head.append(el("span", `sp-badge ${row.change}`, row.change));
    if (row.entry.chosenByAgent !== null) head.append(agentBadge(row.entry));
    node.append(head);
    if (row.before?.note && row.before.note !== row.entry.note) node.append(markdown(row.before.note, context.openLink, "sp-note sp-before"));
    if (row.entry.note) node.append(markdown(row.entry.note, context.openLink, "sp-note"));
    return node;
  }

  function agentBadge(entry: SpecEntry): HTMLElement {
    const reason = entry.chosenByAgent ?? "";
    const badge = el("span", "sp-badge agent", "chosen by agent");
    badge.title = reason;
    badge.setAttribute("role", "note");
    badge.setAttribute("aria-label", `chosen by agent: ${reason}`);
    return badge;
  }

  function fieldNode(view: SpecFieldView): HTMLElement {
    const group = el("section", "sp-field-group");
    group.append(el("h3", "sp-field-title", view.title));
    if (view.notes !== null) {
      if (view.notesBefore) group.append(markdown(view.notesBefore, context.openLink, "sp-note sp-before"));
      group.append(view.notes ? markdown(view.notes, context.openLink, "sp-text") : el("p", "sp-muted", "Empty."));
      return group;
    }
    const items = el("ul", "sp-entries");
    items.append(...view.rows.map(entryNode));
    group.append(items);
    return group;
  }

  function renderErrors() {
    const problems = snapshot?.diagnostics.filter((d) => d.file === SPECS_FILE) ?? [];
    errors.hidden = problems.length === 0;
    errors.replaceChildren(
      ...problems.map((d) => {
        const row = el("p", "sp-error", d.line > 0 ? `${d.file}:${d.line}: ${d.message}` : `${d.file}: ${d.message}`);
        row.setAttribute("role", "alert");
        return row;
      }),
    );
  }

  function render() {
    if (!snapshot) return;
    const proposal: ProposalView | undefined = snapshot.proposals.find((p) => p.id === proposalId);
    if (!proposal) proposalId = null;
    renderToolbar();
    renderErrors();
    const fields = specsView(snapshot, proposal);
    if (fields.length > 0) list.replaceChildren(...fields.map(fieldNode));
    else list.replaceChildren(...(snapshot.specsPresent ? [] : [el("p", "sp-muted", "This project has no Specs yet.")]));
  }

  return {
    update(next) {
      snapshot = next;
      render();
    },
    show(options: NavigateOptions) {
      if (options.proposal !== undefined) proposalId = options.proposal;
      render();
    },
  };
};
