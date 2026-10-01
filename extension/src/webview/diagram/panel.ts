import type { DriftView, ProposalView } from "../../../../src/core/snapshot";
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
  resolveDrift(drift: string, how: "fix-code" | "accept-proposal" | "dismiss"): void;
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

export function createPanel(root: HTMLElement, actions: PanelActions): Panel {
  const renderItem = (item: DetailItem): HTMLElement => {
    const li = el("li", `dg-item change-${item.change}`);
    const head = item.ref ? el("button", "dg-link", item.text) : el("span", "dg-item-text", item.text);
    if (head instanceof HTMLButtonElement) {
      head.type = "button";
      head.addEventListener("click", () => actions.jump(item.ref as string));
    }
    li.append(head);
    if (item.change !== "same") li.append(el("span", "dg-tag", item.change));
    if (item.note) li.append(el("div", "dg-note", item.note));
    return li;
  };

  const renderProposal = (p: ProposalView): HTMLElement => {
    const box = el("section", "dg-proposal");
    box.append(el("div", "dg-kind", `Proposal ${p.id}`), el("h3", "", p.title));
    if (p.body) box.append(el("p", "dg-body", p.body));
    if (p.stale.length > 0) box.append(el("div", "dg-problem-head", "Stale: the Model changed since the Proposal was written"), list("dg-problems", p.stale));
    if (p.unbased.length > 0) box.append(el("div", "dg-problem-head", "Touches files it has no base for"), list("dg-problems", p.unbased));
    if (p.errors.length > 0) {
      box.append(el("div", "dg-problem-head", "The Model with this Proposal applied is invalid"), list("dg-problems", p.errors.map((d) => (d.line > 0 ? `${d.file}:${d.line}: ${d.message}` : `${d.file}: ${d.message}`))));
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
    const blocked = p.stale.length > 0 || p.unbased.length > 0 || p.errors.length > 0;
    const row = el("div", "dg-actions");
    row.append(
      button("Approve", () => actions.approve(p.id), { primary: true, disabled: blocked, title: blocked ? "Stale or invalid Proposals cannot be approved" : "Apply this Proposal to the Model" }),
      button("Reject", () => actions.reject(p.id), { title: "Reject this Proposal and give the agent feedback" }),
    );
    box.append(row);
    return box;
  };

  const renderDrift = (d: DriftView): HTMLElement => {
    const row = el("div", "dg-actions");
    row.append(button("Fix code", () => actions.resolveDrift(d.id, "fix-code"), { primary: true, title: "The Model is right: have the agent fix the code" }));
    if (d.proposal) row.append(button("Accept Proposal", () => actions.resolveDrift(d.id, "accept-proposal"), { title: `The code is right: approve Proposal ${d.proposal}` }));
    row.append(button("Dismiss", () => actions.resolveDrift(d.id, "dismiss"), { title: "Ignore this difference" }));
    return row;
  };

  return {
    render(detail) {
      root.replaceChildren();
      const head = el("header", "dg-panel-head");
      head.append(el("div", "dg-kind", detail.kind));
      head.append(el("h2", "", detail.title));
      if (detail.change !== "same") head.append(el("div", `dg-badge change-${detail.change}`, CHANGE_TEXT[detail.change]));
      root.append(head);

      if (detail.description) root.append(el("p", "dg-body", detail.description));
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
      if (detail.drift) root.append(renderDrift(detail.drift));
      if (detail.proposal) root.append(renderProposal(detail.proposal));
    },
  };
}
