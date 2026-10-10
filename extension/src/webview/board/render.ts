import { type CardName, cardNameOf, type CardNumbers, ID_NAMES, namerOf } from "../../../../src/core/card-names";
import { runBlocker } from "../../../../src/core/design";
import { idTag } from "../id-tag";
import type { ViewContext } from "../types";
import type { AnnouncedCard, Badge, BlockBadge, Card, DesignCard, DriftCard, ProposalCard, TaskCard } from "./logic";
import { COLUMN_TITLES } from "./logic";
import { renderDriftCompare } from "../drift-compare";
import { renderMarkdown } from "../markdown";
import { renderResolves } from "../resolves";
import { viewOfRef } from "../requirements/logic";

export interface CardEnv {
  context: ViewContext;
  /** Whether a design card was left open; kept for the session, so a refresh does not close it. */
  isExpanded(key: string): boolean;
  setExpanded(key: string, expanded: boolean): void;
  /** Scrolls to a card, by its key, and focuses it; with `row`, opens the design card and focuses that Task's row. */
  showCard(key: string, row?: string): void;
  /** The short numbers of the snapshot being drawn. */
  numbers(): CardNumbers;
  /** The reason every Run is disabled while Resolve Drifts works, otherwise null. It wins over any other reason. */
  resolvingReason(): string | null;
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

function badge(b: Badge, numbers: CardNumbers): HTMLElement {
  const node = el("span", `board-badge ${b.tone}`);
  if (b.card === undefined) {
    node.textContent = b.label;
    node.title = b.tooltip;
  } else {
    const name = cardNameOf(numbers, b.card.kind, b.card.id);
    const distinction = `${name.isNumber ? ID_NAMES.number : ID_NAMES.identity} ${name.text}`;
    node.title = `${b.tooltip} (${distinction})`;
    node.append(document.createTextNode("requires "), idTag(name));
  }
  return node;
}

/** "blocked D2" / "waiting T4": a link to the Drift on the Diagram or to a card of the Board. It disables nothing. */
function blockBadgeLink(b: BlockBadge, env: CardEnv): HTMLElement {
  const node = el("button", "board-badge board-blocked");
  node.type = "button";
  const target = b.target;
  node.dataset["action"] = target.kind === "diagram" ? `blocked:diagram:${target.drift}` : `blocked:${target.key}`;
  const prefix = b.label.startsWith("blocked ") ? "blocked " : "waiting ";
  const card = target.kind === "diagram" ? target.drift : target.key.slice("task:".length);
  const name = cardNameOf(env.numbers(), target.kind === "diagram" ? "drift" : "task", card);
  const distinction = `${name.isNumber ? ID_NAMES.number : ID_NAMES.identity} ${name.text}`;
  node.title = `${b.tooltip} (${distinction})`;
  node.setAttribute("aria-label", `${b.tooltip} (${distinction})`);
  node.append(document.createTextNode(prefix), idTag(name));
  node.addEventListener("click", () => (target.kind === "diagram" ? env.context.navigate("diagram", { drift: target.drift }) : env.showCard(target.key, target.row)));
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

function shell(card: { kind: string; key: string }, name: string): HTMLElement {
  const node = el("article", `board-card board-card-${card.kind}`);
  node.dataset["key"] = card.key;
  node.tabIndex = -1;
  node.setAttribute("aria-label", name);
  return node;
}

/** The top row of a card: its kind in words (none for a Task), its number or identity, then the badges. */
function head(kind: string | null, name: CardName | null, ...extra: HTMLElement[]): HTMLElement {
  const row = el("div", "board-card-head");
  if (kind !== null) row.append(el("span", "board-card-kind", kind));
  if (name !== null) row.append(idTag(name));
  row.append(...extra);
  return row;
}

function proposal(card: ProposalCard, env: CardEnv): HTMLElement {
  const node = shell(card, `${card.heading}: ${card.title}`);
  if (card.resolution) node.className += " board-card-resolution";
  node.append(head(card.resolution ? "Resolution Proposal" : "Proposal", card.name, ...card.badges.map((b) => badge(b, env.numbers()))), el("h3", "board-card-title", card.title));
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
  if (card.resolves.length > 0) node.append(...renderResolves("board", card.title, card.resolves, (drift) => env.context.navigate("diagram", { drift })));
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
  node.append(head("Drift", card.name), el("h3", "board-card-title", card.title));
  if (card.refs.length > 0) node.append(chips(card.refs, env));
  node.append(renderDriftCompare(card.drift, { openLink: env.context.openLink }));
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
    toggle.setAttribute("aria-label", `${toggle.textContent} of task ${card.name.text}`);
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
  const node = shell(card, `Task ${card.name.text}: ${card.title}`);
  const badges = [
    ...(card.technical && card.refs.length === 0 ? [badge({ label: "technical", tooltip: "Technical Task", tone: "info" }, env.numbers())] : []),
    ...card.blocks.map((b) => blockBadgeLink(b, env)),
  ];
  const top = head(null, card.name, ...badges);
  top.prepend(statusDot(card));
  node.append(top, el("h3", "board-card-title", card.title));
  if (card.refs.length > 0) node.append(chips(card.refs, env));
  if (card.drift !== null) {
    const origin = el("p", "board-muted board-origin", "from Drift ");
    origin.append(idTag(cardNameOf(env.numbers(), "drift", card.drift)));
    node.append(origin);
  }
  const details = card.body ? taskDetails(card, env) : null;
  if (details) node.append(details.body);
  const open = button({
    label: "Open",
    aria: `Open file of task ${card.name.text}`,
    action: "open",
    onClick: () => env.context.post({ type: "openFile", path: card.file }),
  });
  const runnable = card.column === "todo";
  node.append(
    actions(
      ...(details ? [details.toggle] : []),
      ...(runnable ? [button({ label: "Run", aria: `Run task ${card.name.text}`, action: "run", primary: true, disabled: env.resolvingReason() ?? false, onClick: () => env.context.post({ type: "launch", action: { kind: "implement", task: card.id } }) })] : []),
      open,
    ),
  );
  return node;
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

/** The Tasks of one design as a single card, closed until the developer expands it. */
function design(card: DesignCard, env: CardEnv): HTMLElement {
  const node = shell(card, `${card.heading}: ${card.title}, ${card.done} of ${card.tasks.length} tasks done`);
  node.append(
    head(
      "Proposal",
      card.name,
      badge({ label: `${card.done}/${card.tasks.length} done`, tooltip: `${card.done} of ${card.tasks.length} Tasks are done`, tone: "info" }, env.numbers()),
    ),
    el("h3", "board-card-title", card.title),
  );

  const list = el("ul", "board-design-tasks");
  list.id = `board-design-${card.id}`;
  for (const t of card.tasks) {
    const item = el("li", "board-design-task");
    item.dataset["row"] = t.key;
    item.tabIndex = -1;
    item.append(statusDot(t), idTag(t.name, "board-card-kind board-card-id"), el("span", "board-design-title", t.title));
    item.append(...t.blocks.map((b) => blockBadgeLink(b, env)));
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
    disabled: env.resolvingReason() ?? runBlocker(card.tasks, "design", namerOf(env.numbers())) ?? false,
    onClick: () => env.context.post({ type: "launch", action: { kind: "implement-design", proposal: card.id } }),
  });
  node.append(actions(run, toggle), list);
  return node;
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
