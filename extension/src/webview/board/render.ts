// DOM builders for Board cards. Every piece of data goes in through textContent, never innerHTML.
import type { ViewContext } from "../types";
import type { Badge, Card, DriftCard, ProposalCard, TaskCard } from "./logic";
import { COLUMN_TITLES } from "./logic";
import { viewOfRef } from "../requirements/logic";

export interface CardEnv {
  context: ViewContext;
  /** Ask the host to move a Task; the card stays put until the next snapshot. */
  moveTask(card: TaskCard, column: TaskCard["column"]): void;
  /** Called when a Task card starts or stops being dragged. */
  drag(card: TaskCard | null): void;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

interface ButtonOptions {
  label: string;
  /** Screen-reader name when the visible label is not enough. */
  aria?: string;
  action: string;
  onClick: () => void;
  primary?: boolean;
  /** A reason: disables the button and shows as its tooltip. */
  disabled?: string | boolean;
  className?: string;
}

function button(o: ButtonOptions): HTMLButtonElement {
  const node = el("button", `trama-btn board-btn${o.primary ? " primary" : ""}${o.className ? ` ${o.className}` : ""}`, o.label);
  node.type = "button";
  node.dataset["action"] = o.action;
  if (o.aria) node.setAttribute("aria-label", o.aria);
  if (o.disabled) {
    node.disabled = true;
    if (typeof o.disabled === "string") node.title = o.disabled;
  }
  node.addEventListener("click", o.onClick);
  return node;
}

function badge(b: { label: string; tone?: Badge["tone"]; tooltip?: string }): HTMLElement {
  const node = el("span", `board-badge${b.tone ? ` ${b.tone}` : ""}`, b.label);
  if (b.tooltip) node.title = b.tooltip;
  return node;
}

function chips(refs: string[], env: CardEnv): HTMLElement {
  const list = el("div", "board-chips");
  for (const ref of refs) {
    const chip = el("button", "board-chip", ref);
    const view = viewOfRef(ref);
    chip.type = "button";
    chip.dataset["action"] = `ref:${ref}`;
    chip.title = view === "requirements" ? `Show ${ref} in Requirements` : `Show ${ref} on the diagram`;
    chip.addEventListener("click", () => env.context.navigate(view, { ref }));
    list.append(chip);
  }
  return list;
}

const actions = (...buttons: HTMLElement[]) => {
  const row = el("div", "board-actions");
  row.append(...buttons);
  return row;
};

function shell(card: Card, name: string): HTMLElement {
  const node = el("article", `board-card board-card-${card.kind}`);
  node.dataset["key"] = card.key;
  node.tabIndex = -1;
  node.setAttribute("aria-label", name);
  return node;
}

function head(kind: string, ...extra: HTMLElement[]): HTMLElement {
  const row = el("div", "board-card-head");
  row.append(el("span", "board-card-kind", kind), ...extra);
  return row;
}

function proposal(card: ProposalCard, env: CardEnv): HTMLElement {
  const node = shell(card, `${card.heading}: ${card.title}`);
  node.append(head(card.heading, ...card.badges.map(badge)), el("h3", "board-card-title", card.title));
  if (card.changes.files.length > 0) {
    const list = el("ul", "board-changes");
    for (const file of card.changes.files) {
      const item = el("li", "board-change");
      item.append(el("span", "board-change-path", file.path), el("span", "board-change-counts", file.text));
      list.append(item);
    }
    if (card.changes.more > 0) list.append(el("li", "board-change board-muted", `and ${card.changes.more} more ${card.changes.more === 1 ? "file" : "files"}`));
    node.append(list);
  }
  const touches = card.touches;
  const views: HTMLElement[] = [];
  if (touches.model || !touches.requirements)
    views.push(button({ label: "View on diagram", aria: `View ${card.heading} on diagram`, action: "view", onClick: () => env.context.navigate("diagram", { proposal: card.id }) }));
  if (touches.requirements)
    views.push(button({ label: "View requirements", aria: `View the Requirements ${card.heading} changes`, action: "view-requirements", onClick: () => env.context.navigate("requirements", { proposal: card.id }) }));
  node.append(
    actions(
      ...views,
      button({ label: "Approve", aria: `Approve ${card.heading}`, action: "approve", primary: true, disabled: card.blocker ?? false, onClick: () => env.context.post({ type: "approveProposal", id: card.id }) }),
      button({ label: "Reject", aria: `Reject ${card.heading}`, action: "reject", onClick: () => env.context.post({ type: "rejectProposal", id: card.id }) }),
    ),
  );
  return node;
}

function drift(card: DriftCard, env: CardEnv): HTMLElement {
  const node = shell(card, `${card.heading}: ${card.title}`);
  node.append(head(card.heading), el("h3", "board-card-title", card.title));
  if (card.excerpt) node.append(el("p", "board-excerpt", card.excerpt));
  if (card.refs.length > 0) node.append(chips(card.refs, env));
  const proposalId = card.proposal;
  if (proposalId !== null) {
    const link = el("button", "board-link", `Proposal ${proposalId} attached`);
    link.type = "button";
    link.dataset["action"] = "proposal-link";
    link.title = `Show Proposal ${proposalId} on the diagram`;
    link.addEventListener("click", () => env.context.navigate("diagram", { proposal: proposalId }));
    node.append(link);
  }
  const resolve = (how: "fix-code" | "accept-proposal" | "dismiss") => () => env.context.post({ type: "resolveDrift", id: card.id, how });
  const firstRef = card.refs[0];
  const buttons = [button({ label: "Fix code", aria: `Fix code for ${card.heading}`, action: "fix-code", primary: true, onClick: resolve("fix-code") })];
  if (proposalId !== null)
    buttons.push(button({ label: "Accept Proposal", aria: `Accept Proposal ${proposalId} for ${card.heading}`, action: "accept-proposal", disabled: card.acceptBlocker ?? false, onClick: resolve("accept-proposal") }));
  buttons.push(button({ label: "Dismiss", aria: `Dismiss ${card.heading}`, action: "dismiss", onClick: resolve("dismiss") }));
  if (firstRef !== undefined) {
    const view = viewOfRef(firstRef);
    const label = view === "requirements" ? "View requirement" : "View on diagram";
    buttons.push(button({ label, aria: `${label} for ${card.heading}`, action: "view", onClick: () => env.context.navigate(view, { ref: firstRef }) }));
  }
  node.append(actions(...buttons));
  return node;
}

function task(card: TaskCard, env: CardEnv): HTMLElement {
  const node = shell(card, `Task ${card.id}: ${card.title}`);
  node.draggable = true;
  node.addEventListener("dragstart", (event) => {
    event.dataTransfer?.setData("text/plain", card.key);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    node.classList.add("is-dragging");
    env.drag(card);
  });
  node.addEventListener("dragend", () => {
    node.classList.remove("is-dragging");
    env.drag(null);
  });

  const move = (direction: "left" | "right", target: TaskCard["column"] | null) =>
    button({
      label: direction === "left" ? "←" : "→",
      aria: target === null ? `Task ${card.id} cannot move ${direction}` : `Move task ${card.id} to ${COLUMN_TITLES[target]}`,
      action: `move-${direction}`,
      className: "board-move",
      disabled: target === null,
      onClick: () => target !== null && env.moveTask(card, target),
    });
  const moves = el("span", "board-moves");
  moves.append(move("left", card.left), move("right", card.right));

  node.append(head(card.id, ...(card.technical && card.refs.length === 0 ? [badge({ label: "technical" })] : []), moves), el("h3", "board-card-title", card.title));
  if (card.refs.length > 0) node.append(chips(card.refs, env));
  if (card.drift !== null) node.append(el("p", "board-muted board-origin", `from Drift ${card.drift}`));
  if (card.excerpt) node.append(el("p", "board-excerpt", card.excerpt));
  const open = button({ label: "Open", aria: `Open file of task ${card.id}`, action: "open", onClick: () => env.context.post({ type: "openFile", path: card.file }) });
  node.append(
    actions(
      ...(card.column === "todo" ? [button({ label: "Run", aria: `Run task ${card.id}`, action: "run", primary: true, onClick: () => env.context.post({ type: "launch", action: { kind: "implement", task: card.id } }) })] : []),
      open,
    ),
  );
  return node;
}

/** Dims a Task card while its move waits for the host's next snapshot. */
export function setPending(node: HTMLElement, pending: boolean) {
  node.draggable = !pending;
  node.classList.toggle("is-pending", pending);
  node.setAttribute("aria-busy", String(pending));
}

export function renderCard(card: Card, env: CardEnv): HTMLElement {
  if (card.kind === "proposal") return proposal(card, env);
  if (card.kind === "drift") return drift(card, env);
  return task(card, env);
}
