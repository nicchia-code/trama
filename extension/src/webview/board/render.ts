// DOM builders for Board cards. Every piece of data goes in through textContent, never innerHTML.
import type { ViewContext } from "../types";
import type { Badge, Card, DesignCard, DriftCard, ProposalCard, TaskCard } from "./logic";
import { AGENT_WORKING, COLUMN_TITLES, designRunBlocker } from "./logic";
import { viewOfRef } from "../requirements/logic";

export interface CardEnv {
  context: ViewContext;
  /** Ask the host to move a Task; the card stays put until the next snapshot. */
  moveTask(card: TaskCard, column: TaskCard["column"]): void;
  /** Called when a Task card starts or stops being dragged. */
  drag(card: TaskCard | null): void;
  /** Whether a design card was left open; kept for the session, so a refresh does not close it. */
  isExpanded(key: string): boolean;
  setExpanded(key: string, expanded: boolean): void;
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
  /** A reason: disables the button, shows as its tooltip and is its accessible description. */
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
    if (typeof o.disabled === "string") {
      node.title = o.disabled;
      node.setAttribute("aria-description", o.disabled);
    }
  }
  node.addEventListener("click", o.onClick);
  return node;
}

function badge(b: { label: string; tone?: Badge["tone"]; tooltip?: string }): HTMLElement {
  const node = el("span", `board-badge${b.tone ? ` ${b.tone}` : ""}`, b.label);
  if (b.tooltip) node.title = b.tooltip;
  return node;
}

/** "agent working": the badge of a Task the agent has taken, with an indicator that stops for reduced motion (see the CSS). */
function workingBadge(): HTMLElement {
  const node = el("span", "board-badge board-working");
  node.title = AGENT_WORKING;
  const indicator = el("span", "board-working-dot");
  indicator.setAttribute("aria-hidden", "true");
  node.append(indicator, "agent working");
  return node;
}

/** Gives the Task back to the developer; shown only on Tasks the agent has taken. */
function takeBack(card: TaskCard, env: CardEnv): HTMLElement {
  return button({
    label: "Take back",
    aria: `Take back task ${card.id} from the agent`,
    action: "take-back",
    onClick: () => env.context.post({ type: "takeBackTask", id: card.id }),
  });
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
  node.draggable = !card.agent;
  node.dataset["agent"] = String(card.agent);
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

  const badges = [...(card.technical && card.refs.length === 0 ? [badge({ label: "technical" })] : []), ...(card.agent ? [workingBadge()] : [])];
  node.append(head(card.id, ...badges, moveButtons(card, env)), el("h3", "board-card-title", card.title));
  if (card.refs.length > 0) node.append(chips(card.refs, env));
  if (card.drift !== null) node.append(el("p", "board-muted board-origin", `from Drift ${card.drift}`));
  if (card.excerpt) node.append(el("p", "board-excerpt", card.excerpt));
  const open = button({ label: "Open", aria: `Open file of task ${card.id}`, action: "open", onClick: () => env.context.post({ type: "openFile", path: card.file }) });
  node.append(
    actions(
      ...(card.agent ? [takeBack(card, env)] : []),
      ...(card.column === "todo" ? [button({ label: "Run", aria: `Run task ${card.id}`, action: "run", primary: true, onClick: () => env.context.post({ type: "launch", action: { kind: "implement", task: card.id } }) })] : []),
      open,
    ),
  );
  return node;
}

/** The two arrows that move a Task to its neighbouring column. */
function moveButtons(card: TaskCard, env: CardEnv): HTMLElement {
  const move = (direction: "left" | "right", target: TaskCard["column"] | null) =>
    button({
      label: direction === "left" ? "←" : "→",
      aria: card.agent ? `Task ${card.id} cannot move: the agent is working on it` : target === null ? `Task ${card.id} cannot move ${direction}` : `Move task ${card.id} to ${COLUMN_TITLES[target]}`,
      action: `move-${direction}`,
      className: "board-move",
      disabled: card.agent ? AGENT_WORKING : target === null,
      onClick: () => target !== null && env.moveTask(card, target),
    });
  const moves = el("span", "board-moves");
  moves.append(move("left", card.left), move("right", card.right));
  return moves;
}

/** A dot for a Task's column: told apart by colour, named for screen readers and tooltips. */
function statusDot(column: TaskCard["column"]): HTMLElement {
  const dot = el("span", `board-dot is-${column}`);
  dot.setAttribute("role", "img");
  dot.setAttribute("aria-label", COLUMN_TITLES[column]);
  dot.title = COLUMN_TITLES[column];
  return dot;
}

/** The Tasks of one design as a single card, closed until the developer expands it. It cannot be dragged. */
function design(card: DesignCard, env: CardEnv): HTMLElement {
  const node = shell(card, `${card.heading}: ${card.title}, ${card.done} of ${card.tasks.length} tasks done`);
  node.append(
    head(card.heading, badge({ label: `${card.done}/${card.tasks.length} done`, tooltip: `${card.done} of ${card.tasks.length} Tasks are done` })),
    el("h3", "board-card-title", card.title),
  );

  const list = el("ul", "board-design-tasks");
  list.id = `board-design-${card.id}`;
  for (const t of card.tasks) {
    const item = el("li", "board-design-task");
    item.dataset["task"] = t.id;
    item.append(statusDot(t.column), el("span", "board-card-kind", t.id), el("span", "board-design-title", t.title));
    if (t.agent) item.append(workingBadge(), takeBack(t, env));
    item.append(moveButtons(t, env));
    list.append(item);
  }

  const label = (open: boolean) => (open ? "Hide tasks" : `Show ${card.tasks.length} tasks`);
  let isOpen = env.isExpanded(card.key);
  const toggle = button({ label: "", action: "toggle", onClick: () => {} });
  const show = () => {
    list.hidden = !isOpen;
    toggle.textContent = label(isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
  };
  toggle.setAttribute("aria-controls", list.id);
  toggle.addEventListener("click", () => {
    isOpen = !isOpen;
    env.setExpanded(card.key, isOpen);
    show();
  });
  show();
  const run = button({
    label: "Run this design",
    aria: `Run the Tasks of ${card.heading} that are in To do`,
    action: "run-design",
    primary: true,
    disabled: designRunBlocker(card.tasks) ?? false,
    onClick: () => env.context.post({ type: "launch", action: { kind: "implement-design", proposal: card.id } }),
  });
  node.append(actions(run, toggle), list);
  return node;
}

/** Dims a Task card while its move waits for the host's next snapshot. */
export function setPending(node: HTMLElement, pending: boolean) {
  node.draggable = !pending && node.dataset["agent"] !== "true";
  node.classList.toggle("is-pending", pending);
  node.setAttribute("aria-busy", String(pending));
}

/** Dims the Tasks of a design card whose move waits for the host's next snapshot. */
export function setDesignPending(node: HTMLElement, pending: ReadonlySet<string>) {
  for (const item of node.querySelectorAll<HTMLElement>("[data-task]")) {
    const busy = pending.has(item.dataset["task"] as string);
    item.classList.toggle("is-pending", busy);
    item.setAttribute("aria-busy", String(busy));
  }
}

export function renderCard(card: Card, env: CardEnv): HTMLElement {
  if (card.kind === "proposal") return proposal(card, env);
  if (card.kind === "drift") return drift(card, env);
  if (card.kind === "design") return design(card, env);
  return task(card, env);
}
