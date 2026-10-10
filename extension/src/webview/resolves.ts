import type { ResolvedRow } from "./board/logic";
import { idTag } from "./id-tag";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * The `Resolves Drifts` block of a resolution Proposal: a heading and a list named `Drifts resolved by <title>`, one row
 * per Drift that leads to it on the Diagram. Shared by the Board card and the Diagram details; `prefix` is the view's
 * class prefix (`board` or `dg`).
 */
export function renderResolves(prefix: "board" | "dg", title: string, rows: ResolvedRow[], showDrift: (drift: string) => void): HTMLElement[] {
  const list = el("ul", `${prefix}-resolves`);
  list.setAttribute("aria-label", `Drifts resolved by ${title}`);
  for (const row of rows) {
    const link = el("button", `${prefix}-resolves-row`);
    link.type = "button";
    link.dataset["action"] = `resolves:${row.drift}`;
    link.title = "Show the Drift on the diagram";
    link.append(idTag(row.name, prefix === "dg" ? "dg-id" : undefined), el("span", `${prefix}-resolves-title`, row.title), el("span", `${prefix}-resolves-decision`, row.decision));
    link.addEventListener("click", () => showDrift(row.drift));
    const item = el("li", `${prefix}-resolves-item`);
    item.append(link);
    list.append(item);
  }
  return [el("div", `${prefix}-resolves-head`, "Resolves Drifts"), list];
}
