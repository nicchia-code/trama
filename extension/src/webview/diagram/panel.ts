import { type CardName, type CardNumbers, cardNameOf } from "../../../../src/core/card-names";
import { appliesUnder, REQUIRED_STATUS } from "../../../../src/core/required";
import type { ProposalView } from "../../../../src/core/snapshot";
import { approveBlocker, recurringLabel, resolvedRows } from "../board/logic";
import { renderDriftCompare } from "../drift-compare";
import { idTag } from "../id-tag";
import { renderInline, renderMarkdown } from "../markdown";
import { renderResolves } from "../resolves";
import type { Detail, DetailItem } from "./details";
import type { Level } from "./graph";

export interface PanelActions {
  /** Jump to an element reference. */
  jump(ref: string): void;
  openFile(path: string): void;
  drill(level: Level): void;
  toggle(state: string): void;
  approve(proposal: string): void;
  reject(proposal: string): void;
  /** An http or https link of a rendered text was followed. */
  openLink(url: string): void;
  /** A row of a resolution's Resolves Drifts block: select that Drift in the Diagram. */
  showDrift(drift: string): void;
}

export interface Panel {
  render(detail: Detail): void;
}

const CHANGE_TEXT = { added: "added by the Proposal", removed: "removed by the Proposal", changed: "changed by the Proposal", same: "" } as const;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text) e.textContent = text;
  return e;
}

function button(label: string, onClick: () => void, options: { primary?: boolean; disabled?: boolean; title?: string } = {}): HTMLButtonElement {
  const b = el("button", `trama-btn${options.primary ? " primary" : ""}`, label);
  b.type = "button";
  b.disabled = options.disabled ?? false;
  if (options.title) b.title = options.title;
  b.addEventListener("click", onClick);
  return b;
}

function list(className: string, lines: string[]): HTMLElement {
  const ul = el("ul", className);
  for (const line of lines) ul.append(el("li", "", line));
  return ul;
}

/** `label` then the card's number or identity tag, so it is named the way the Board names it. */
function named(label: string, name: CardName): HTMLElement {
  const span = el("span", "", label === "" ? "" : `${label} `);
  span.append(idTag(name, "dg-id"));
  return span;
}

export function createPanel(root: HTMLElement, actions: PanelActions): Panel {
  const body = (source: string): HTMLElement => {
    const node = renderMarkdown(source, actions.openLink);
    node.classList.add("dg-body");
    return node;
  };

  const renderItem = (item: DetailItem): HTMLElement => {
    const li = el("li", `dg-item change-${item.change}`);
    const head = item.ref ? el("button", "dg-link", item.text) : el("span", "dg-item-text", item.text);
    if (item.card && !item.card.inNote) head.replaceChildren(named(item.card.label, item.card.name));
    if (head instanceof HTMLButtonElement) {
      head.type = "button";
      head.addEventListener("click", () => actions.jump(item.ref as string));
    }
    li.append(head);
    if (item.change !== "same") li.append(el("span", "dg-tag", item.change));
    if (item.card?.inNote) {
      const note = el("div", "dg-note");
      note.append(named(item.card.label, item.card.name));
      li.append(note);
    } else if (item.note) {
      const note = el("div", "dg-note");
      note.append(item.block ? renderMarkdown(item.note, actions.openLink) : renderInline(item.note, actions.openLink));
      li.append(note);
    }
    return li;
  };

  const renderProposal = (p: ProposalView, numbers: CardNumbers): HTMLElement => {
    const box = el("section", "dg-proposal");
    const kind = el("div", "dg-kind", "Proposal ");
    kind.append(idTag(cardNameOf(numbers, "proposal", p.id), "dg-id"));
    box.append(kind, el("h3", "", p.title));
    if (p.body) box.append(body(p.body));
    const open = p.requires.filter((r) => appliesUnder(r.status));
    if (open.length > 0) {
      const note = el("div", "dg-note", "Drawn on top of ");
      open.forEach((r, i) => note.append(...(i > 0 ? [", "] : []), named("Proposal", cardNameOf(numbers, "proposal", r.id))));
      note.append(", not yet approved: what they add is shown as if approved.");
      box.append(note);
    }
    const unusable = p.requires.filter((r) => !appliesUnder(r.status));
    if (unusable.length > 0) {
      const ul = el("ul", "dg-problems");
      for (const r of unusable) {
        const li = el("li");
        li.append(named("Proposal", cardNameOf(numbers, "proposal", r.id)), `${r.title ? ` "${r.title}"` : ""} ${REQUIRED_STATUS[r.status]}`);
        ul.append(li);
      }
      box.append(el("div", "dg-problem-head", "Requires Proposals that cannot be approved"), ul);
    }
    if (p.stale.length > 0) box.append(el("div", "dg-problem-head", "Stale: the Model changed since the Proposal was written"), list("dg-problems", p.stale));
    if (p.unbased.length > 0) box.append(el("div", "dg-problem-head", "Touches files it has no base for"), list("dg-problems", p.unbased));
    if (p.errors.length > 0) {
      box.append(el("div", "dg-problem-head", "The Model with this Proposal applied is invalid"), list("dg-problems", p.errors.map((d) => (d.line > 0 ? `${d.file}:${d.line}: ${d.message}` : `${d.file}: ${d.message}`))));
    }
    if (p.unfixable.length > 0) {
      box.append(el("div", "dg-problem-head", "Resolve Drifts must rewrite this resolution"), list("dg-problems", p.unfixable));
    }
    if (p.changes.length > 0) {
      box.append(el("div", "dg-heading", "Changes"));
      const ul = el("ul", "dg-changes");
      for (const c of p.changes) {
        const li = el("li", `change-${c.change === "modified" ? "changed" : c.change}`);
        li.append(el("strong", "", `${c.path} (${c.change})`));
        if (c.details.length > 0) li.append(list("dg-change-lines", c.details));
        ul.append(li);
      }
      box.append(ul);
    }
    if (p.resolves.length > 0) box.append(...renderResolves("dg", p.title, resolvedRows(p, numbers), actions.showDrift));
    const blocker = approveBlocker(p, numbers);
    const row = el("div", "dg-actions");
    row.append(
      button("Approve", () => actions.approve(p.id), { primary: true, disabled: blocker !== null, title: blocker ?? "Apply this Proposal to the Model" }),
      button("Reject", () => actions.reject(p.id), { title: "Reject this Proposal; feedback for the agent is optional" }),
    );
    box.append(row);
    return box;
  };

  return {
    render(detail) {
      root.replaceChildren();
      const head = el("header", "dg-panel-head");
      const driftName = detail.drift ? cardNameOf(detail.numbers, "drift", detail.drift.id) : null;
      const kind = el("div", "dg-kind", driftName === null ? detail.kind : "Drift ");
      if (driftName !== null) kind.append(idTag(driftName, "dg-id"));
      head.append(kind);
      head.append(el("h2", "", detail.title));
      if (detail.drift?.critical) {
        const critical = el("span", "dg-badge dg-critical", "Critical");
        critical.title = "Urgent developer decision";
        critical.setAttribute("aria-label", "Critical Drift: urgent developer decision");
        head.append(critical);
      }
      const previous = detail.drift?.previous;
      if (previous) {
        const recurring = el("span", "dg-badge dg-recurring", "recurring");
        recurring.title = recurringLabel(previous);
        recurring.setAttribute("aria-label", recurringLabel(previous));
        head.append(recurring);
      }
      if (detail.change !== "same") head.append(el("div", `dg-badge change-${detail.change}`, CHANGE_TEXT[detail.change]));
      root.append(head);
      if (detail.drift) root.append(renderDriftCompare(detail.drift, { openLink: actions.openLink }));

      if (detail.description) root.append(body(detail.description));
      if (detail.changes.length > 0) root.append(el("div", "dg-heading", "What changes"), list("dg-change-lines", detail.changes));

      const row = el("div", "dg-actions");
      const { drill, toggle, file } = detail;
      if (drill) row.append(button("Drill in", () => actions.drill(drill), { title: "Show this part at the next zoom level" }));
      if (toggle) row.append(button(toggle.expanded ? "Collapse" : "Expand", () => actions.toggle(toggle.state), { title: "Draw the sub-States inside this State" }));
      if (file) row.append(button("Open file", () => actions.openFile(file), { title: file }));
      if (row.childElementCount > 0) root.append(row);

      for (const s of detail.sections) {
        if (s.items.length === 0) continue;
        const ul = el("ul", "dg-items");
        for (const i of s.items) ul.append(renderItem(i));
        root.append(el("div", "dg-heading", s.heading), ul);
      }
      if (detail.proposal) root.append(renderProposal(detail.proposal, detail.numbers));
    },
  };
}
