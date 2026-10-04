// DOM builders for Board cards. Every piece of data goes in through textContent, never innerHTML.
import { runBlocker } from "../../../../src/core/design";
import type { ViewContext } from "../types";
import type { AnnouncedCard, Badge, BlockBadge, Card, DesignCard, DriftCard, ProposalCard, TaskCard } from "./logic";
import { AGENT_WORKING, COLUMN_TITLES } from "./logic";
import { renderDriftCompare } from "../drift-compare";
import { renderMarkdown } from "../markdown";
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
  /** Scrolls to the card of a Task and focuses it. */
  showTask(id: string): void;
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

/** "blocked 0003" / "waiting 0004": a link to the Drift on the Diagram or to the fix Task's card. It disables nothing. */
function blockBadgeLink(b: BlockBadge, env: CardEnv): HTMLElement {
  const node = el("button", "board-badge board-blocked", b.label);
  node.type = "button";
  node.dataset["action"] = `blocked:${b.target.kind}:${b.target.id}`;
  node.title = b.tooltip;
  node.setAttribute("aria-label", b.tooltip);
  node.addEventListener("click", () => (b.target.kind === "drift" ? env.context.navigate("diagram", { drift: b.target.id }) : env.showTask(b.target.id)));
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
  const whereKey = `${card.key}:where`;
  node.append(
    renderDriftCompare(card.drift, {
      keep: (how, carries) => env.context.post({ type: "resolveDrift", id: card.id, how, ...carries }),
      blocked: () => env.context.post({ type: "driftBlocked", id: card.id }),
      openLink: env.context.openLink,
      where: { open: env.isExpanded(whereKey), toggled: (open) => env.setExpanded(whereKey, open) },
    }),
  );
  const firstRef = card.refs[0];
  if (firstRef !== undefined) {
    const view = viewOfRef(firstRef);
    const label = view === "requirements" ? "View requirement" : "View on diagram";
    node.append(actions(button({ label, aria: `${label} for ${card.heading}`, action: "view", onClick: () => env.context.navigate(view, { ref: firstRef }) })));
  }
  return node;
}

/**
 * The whole body of a Task as Markdown, with the toggle that shows it. Closed when the Board first shows; the developer's
 * choice is kept for the session in `env`, so a refresh does not close it.
 */
function taskDetails(card: TaskCard, env: CardEnv): { body: HTMLElement; toggle: HTMLButtonElement } {
  const key = `${card.key}:details`;
  const body = renderMarkdown(card.body, env.context.openLink);
  body.classList.add("board-details");
  body.id = `board-details-${card.id}`;
  const toggle = button({ label: "", action: "details", onClick: () => {} });
  let isOpen = env.isExpanded(key);
  const show = () => {
    body.hidden = !isOpen;
    toggle.textContent = isOpen ? "Hide details" : "Show details";
    toggle.setAttribute("aria-label", `${toggle.textContent} of task ${card.id}`);
    toggle.setAttribute("aria-expanded", String(isOpen));
  };
  toggle.setAttribute("aria-controls", body.id);
  toggle.addEventListener("click", () => {
    isOpen = !isOpen;
    env.setExpanded(key, isOpen);
    show();
  });
  show();
  return { body, toggle };
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

  const badges = [...(card.technical && card.refs.length === 0 ? [badge({ label: "technical" })] : []), ...card.blocks.map((b) => blockBadgeLink(b, env))];
  const top = head(card.id, ...badges, moveButtons(card, env));
  top.prepend(statusDot(card));
  node.append(top, el("h3", "board-card-title", card.title));
  if (card.refs.length > 0) node.append(chips(card.refs, env));
  if (card.drift !== null) node.append(el("p", "board-muted board-origin", `from Drift ${card.drift}`));
  const details = card.body ? taskDetails(card, env) : null;
  if (details) node.append(details.body);
  const open = button({ label: "Open", aria: `Open file of task ${card.id}`, action: "open", onClick: () => env.context.post({ type: "openFile", path: card.file }) });
  node.append(
    actions(
      ...(details ? [details.toggle] : []),
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

/** A dot for a Task: its column's colour, or the pulsing accent dot while the agent has taken it. Named for screen readers and tooltips. */
function statusDot(task: Pick<TaskCard, "column" | "agent">): HTMLElement {
  const name = task.agent ? "Agent working" : COLUMN_TITLES[task.column];
  const dot = el("span", `board-dot ${task.agent ? "is-agent" : `is-${task.column}`}`);
  dot.setAttribute("role", "img");
  dot.setAttribute("aria-label", name);
  dot.title = name;
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
    item.append(statusDot(t), el("span", "board-card-kind", t.id), el("span", "board-design-title", t.title));
    if (t.agent) item.append(takeBack(t, env));
    item.append(...t.blocks.map((b) => blockBadgeLink(b, env)));
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
    disabled: runBlocker(card.tasks, "design") ?? false,
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
export function setDesignPending(node: HTMLElement, pending: { has(id: string): boolean }) {
  for (const item of node.querySelectorAll<HTMLElement>("[data-task]")) {
    const busy = pending.has(item.dataset["task"] as string);
    item.classList.toggle("is-pending", busy);
    item.setAttribute("aria-busy", String(busy));
  }
}

/**
 * The ghost of a card the agent is about to create: a skeleton with the card's kind, its title and what the agent is
 * doing about it. It is not focusable, draggable or clickable and has no buttons or links; its accessible name says
 * the kind, the title and the phase, and its children are hidden from assistive technology.
 */
export function renderAnnounced(card: AnnouncedCard): HTMLElement {
  const node = el("div", `board-card board-announced board-card-${card.kind}`);
  node.dataset["key"] = card.key;
  node.setAttribute("role", "img");
  node.setAttribute("aria-label", card.label);
  const top = el("div", "board-card-head");
  top.append(el("span", "board-card-kind", card.kindLabel));
  const lines = el("div", "board-skeleton");
  lines.append(el("span", "board-skeleton-line"), el("span", "board-skeleton-line is-short"));
  node.append(top, el("div", "board-card-title", card.title), lines, el("div", "board-announced-phase", card.phase));
  return node;
}

export function renderCard(card: Card, env: CardEnv): HTMLElement {
  if (card.kind === "proposal") return proposal(card, env);
  if (card.kind === "drift") return drift(card, env);
  if (card.kind === "design") return design(card, env);
  return task(card, env);
}
