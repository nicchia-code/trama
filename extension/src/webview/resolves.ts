import { type ResolvedRow, recurringLabel } from "./board/logic";
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
export function renderResolves(prefix: "board" | "dg", title: string, rows: ResolvedRow[], showDrift: (drift: string) => void, blockedRows: (drift: string) => HTMLElement[] = () => []): HTMLElement[] {
  const list = el("ul", `${prefix}-resolves`);
  list.setAttribute("aria-label", `Drifts resolved by ${title}`);
  for (const row of rows) {
    const link = el("button", `${prefix}-resolves-row`);
    link.type = "button";
    link.dataset["action"] = `resolves:${row.drift}`;
    link.title = "Show the Drift on the diagram";
    link.append(idTag(row.name, prefix === "dg" ? "dg-id" : undefined), el("span", `${prefix}-resolves-title`, row.title));
    if (row.critical) {
      const critical = el("span", `${prefix}-critical`, "Critical");
      critical.title = "Urgent developer decision";
      critical.setAttribute("aria-label", "Critical Drift: urgent developer decision");
      link.append(critical);
    }
    if (row.previous !== null) {
      const recurring = el("span", `${prefix}-recurring`, "recurring");
      recurring.title = recurringLabel(row.previous);
      recurring.setAttribute("aria-label", recurringLabel(row.previous));
      link.append(recurring);
    }
    link.append(el("span", `${prefix}-resolves-decision`, row.decision));
    link.addEventListener("click", () => showDrift(row.drift));
    const item = el("li", `${prefix}-resolves-item`);
    item.append(link);
    if (row.autopilotFailed !== null) {
      // The reason is in the tooltip and the accessible name; the badge moves no focus.
      const failed = el("span", "board-badge error", "autopilot failed");
      failed.title = `Autopilot failed: ${row.autopilotFailed}`;
      failed.setAttribute("aria-label", `Autopilot failed: ${row.autopilotFailed}`);
      item.append(failed);
    }
    item.append(...blockedRows(row.drift));
    list.append(item);
  }
  return [el("div", `${prefix}-resolves-head`, "Resolves Drifts"), list];
}
