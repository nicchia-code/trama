import { type CardName, cardNameOf, type CardNumbers, ID_NAMES, namerOf } from "../../../../src/core/card-names";
import { joinReasons, runBlocker } from "../../../../src/core/design";
import { idTag } from "../id-tag";
import type { ViewContext } from "../types";
import type { AnnouncedCard, Badge, BlockBadge, Card, DesignCard, DriftCard, ProposalCard, TaskCard } from "./logic";
import { COLUMN_TITLES, proposalHue, recurringLabel } from "./logic";
import { renderDriftCompare } from "../drift-compare";
import { dismissButton } from "../dismiss";
import { renderMarkdown } from "../markdown";
import { renderResolves } from "../resolves";
import { viewOfRef } from "../requirements/logic";
import { type IconName, setIconLabel } from "../icons";

export interface CardEnv {
  context: ViewContext;
  /** Whether a Task's details were left open; kept for the session, so a refresh does not close them. */
  isExpanded(key: string): boolean;
  setExpanded(key: string, expanded: boolean): void;
  /** Scrolls to a card, by its key, and focuses it. */
  showCard(key: string): void;
  /** The short numbers of the snapshot being drawn. */
  numbers(): CardNumbers;
  /** The reason every Run is disabled while Drifts are being resolved or a run is in progress, otherwise null. It comes before the other reasons. */
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
  /** An icon before the label, in the button's text colour. */
  icon?: IconName;
}

function button(o: ButtonOptions): HTMLButtonElement {
  const node = el("button", `trama-btn board-btn${o.primary ? " primary" : ""}${o.className ? ` ${o.className}` : ""}`);
  if (o.icon) setIconLabel(node, o.icon, o.label);
  else node.textContent = o.label;
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
  node.addEventListener("click", () => (target.kind === "diagram" ? env.context.navigate("diagram", { drift: target.drift }) : env.showCard(target.key)));
  return node;
}

/** "autopilot failed": the autopilot failed on or excluded this case. The reason is in the tooltip; the badge moves no focus. */
function failedBadge(reason: string | null, env: CardEnv): HTMLElement[] {
  if (reason === null) return [];
  const node = badge({ label: "autopilot failed", tooltip: `Autopilot failed: ${reason}`, tone: "error" }, env.numbers());
  node.setAttribute("aria-label", `Autopilot failed: ${reason}`);
  return [node];
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
  if (card.creates !== null) {
    const creates = el("p", "board-muted board-card-creates", card.creates);
    creates.title = card.creates;
    creates.setAttribute("aria-label", card.creates);
    node.append(creates);
  }
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
    views.push(button({ label: "View on diagram", icon: "type-hierarchy", aria: `View ${card.heading} on diagram`, action: "view", onClick: () => env.context.navigate("diagram", { proposal: card.id }) }));
  if (touches.requirements)
    views.push(button({ label: "View requirements", icon: "checklist", aria: `View the Requirements ${card.heading} changes`, action: "view-requirements", onClick: () => env.context.navigate("requirements", { proposal: card.id }) }));
  node.append(
    actions(
      ...views,
      button({ label: "Approve", icon: "check", aria: `Approve ${card.heading}`, action: "approve", primary: true, disabled: card.blocker ?? false, onClick: () => env.context.post({ type: "approveProposal", id: card.id }) }),
      button({ label: "Reject", icon: "close", aria: `Reject ${card.heading}`, action: "reject", onClick: () => env.context.post({ type: "rejectProposal", id: card.id }) }),
    ),
  );
  return node;
}

function drift(card: DriftCard, env: CardEnv): HTMLElement {
  const node = shell(card, `${card.heading}: ${card.title}`);
  const critical = card.drift.critical ? el("span", "board-badge error board-critical", "Critical") : null;
  if (critical) {
    critical.title = "Urgent developer decision";
    critical.setAttribute("aria-label", "Critical Drift: urgent developer decision");
  }
  const previous = card.drift.previous;
  const recurring = previous === null ? null : el("span", "board-badge info board-recurring", "recurring");
  if (previous !== null && recurring) {
    recurring.title = recurringLabel(previous);
    recurring.setAttribute("aria-label", recurringLabel(previous));
  }
  node.append(head("Drift", card.name, ...(critical ? [critical] : []), ...(recurring ? [recurring] : []), ...failedBadge(card.autopilotFailed, env)), el("h3", "board-card-title", card.title));
  if (card.refs.length > 0) node.append(chips(card.refs, env));
  node.append(renderDriftCompare(card.drift, { openLink: env.context.openLink }));
  const views: HTMLElement[] = [];
  const firstRef = card.refs[0];
  if (firstRef !== undefined) {
    const view = viewOfRef(firstRef);
    const label = view === "requirements" ? "View requirement" : "View on diagram";
    views.push(button({ label, icon: view === "requirements" ? "checklist" : "type-hierarchy", aria: `${label} for ${card.heading}`, action: "view", onClick: () => env.context.navigate(view, view === "diagram" ? { drift: card.id } : { ref: firstRef }) }));
  }
  views.push(dismissButton({ blocker: card.dismissBlocker, className: "board-btn", onDismiss: () => env.context.post({ type: "dismissDrift", id: card.id }) }));
  node.append(actions(...views));
  return node;
}

/** "no changes" on a Task closed without changes; its tooltip and accessible name carry the note, and no colour is needed. */
function noChangesBadge(note: string): HTMLElement {
  const node = el("span", "board-badge info", "no changes");
  node.title = `Closed without changes: ${note}`;
  node.setAttribute("aria-label", `Closed without changes: ${note}`);
  return node;
}

/**
 * The whole body of a Task as Markdown, with the toggle that shows it. Closed when the Board first shows; the developer's
 * choice is kept for the session in `env`, so a refresh does not close it.
 */
function taskDetails(card: TaskCard, env: CardEnv): { body: HTMLElement; toggle: HTMLButtonElement } {
  const key = `${card.key}:details`;
  const markdown = renderMarkdown(card.body, env.context.openLink);
  // A Task closed without changes shows its check note first, as Markdown, then its body.
  const body = card.unchanged === null ? markdown : el("div", "board-check-details");
  if (card.unchanged !== null) body.append(el("h4", "board-check-note", "Check note"), renderMarkdown(card.unchanged, env.context.openLink), markdown);
  body.classList.add("board-details");
  body.id = `board-details-${card.id}`;
  const toggle = button({ label: "", action: "details", onClick: () => {} });
  let isOpen = env.isExpanded(key);
  const show = () => {
    body.hidden = !isOpen;
    const text = isOpen ? "Hide details" : "Show details";
    setIconLabel(toggle, isOpen ? "chevron-up" : "chevron-down", text);
    toggle.setAttribute("aria-label", `${text} of task ${card.name.text}`);
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

/** The Proposal a Task comes from, as a tag: its title on a tint taken from the Proposal's identity. Not a button; it does nothing. */
function proposalTag(card: TaskCard): HTMLElement | null {
  if (card.proposal === null) return null;
  const title = card.proposalTitle ?? `Proposal ${card.proposalName?.text ?? card.proposal}`;
  const node = el("span", "board-proposal-tag", title);
  node.style.setProperty("--proposal-hue", String(proposalHue(card.proposal)));
  node.setAttribute("role", "img");
  node.setAttribute("aria-label", `Proposal: ${title}`);
  node.title = `Proposal: ${title}`;
  return node;
}

function task(card: TaskCard, env: CardEnv): HTMLElement {
  const node = shell(card, `Task ${card.name.text}: ${card.title}`);
  const badges = [
    ...(card.technical && card.refs.length === 0 ? [badge({ label: "technical", tooltip: "Technical Task", tone: "info" }, env.numbers())] : []),
    ...(card.unchanged !== null ? [noChangesBadge(card.unchanged)] : []),
    ...card.blocks.map((b) => blockBadgeLink(b, env)),
    ...failedBadge(card.autopilotFailed, env),
  ];
  const tag = proposalTag(card);
  const top = head(null, card.name, ...(tag === null ? [] : [tag]), ...badges);
  top.prepend(statusDot(card));
  node.append(top, el("h3", "board-card-title", card.title));
  if (card.refs.length > 0) node.append(chips(card.refs, env));
  if (card.drift !== null) {
    const origin = el("p", "board-muted board-origin", "from Drift ");
    origin.append(idTag(cardNameOf(env.numbers(), "drift", card.drift)));
    node.append(origin);
  }
  const details = card.body || card.unchanged !== null ? taskDetails(card, env) : null;
  if (details) node.append(details.body);
  const open = button({
    label: "Open",
    icon: "go-to-file",
    aria: `Open file of task ${card.name.text}`,
    action: "open",
    onClick: () => env.context.post({ type: "openFile", path: card.file }),
  });
  const runnable = card.column === "todo";
  node.append(
    actions(
      ...(details ? [details.toggle] : []),
      ...(runnable ? [button({ label: "Run", icon: "play", aria: `Run task ${card.name.text}`, action: "run", primary: true, disabled: env.resolvingReason() ?? false, onClick: () => env.context.post({ type: "launch", action: { kind: "implement", task: card.id } }) })] : []),
      open,
    ),
  );
  return node;
}

/** A Task inside a design card: its status dot, its ID and title, and its blocked, waiting or closed-without-changes marks. No move, no details. */
function designRow(card: TaskCard, env: CardEnv): HTMLElement {
  const row = el("li", "board-design-task");
  row.dataset["key"] = card.key;
  row.tabIndex = -1;
  const top = head(null, card.name, ...card.blocks.map((b) => blockBadgeLink(b, env)), ...failedBadge(card.autopilotFailed, env), ...(card.unchanged === null ? [] : [noChangesBadge(card.unchanged)]));
  top.prepend(statusDot(card));
  row.append(top, el("span", "board-row-title", card.title));
  return row;
}

/**
 * The Tasks of one design as one card: the Proposal's title, how many of its Tasks are done, the Tasks behind a toggle that
 * is closed when the Board first shows, and Run this design, disabled with the reasons of Run Ready Tasks for its Tasks.
 */
function design(card: DesignCard, env: CardEnv): HTMLElement {
  const node = shell(card, `Design: ${card.title}`);
  const count = el("span", "board-badge info board-design-count", `${card.done}/${card.tasks.length} done`);
  node.append(head("Design", null, count), el("h3", "board-card-title", card.title));
  const list = el("ul", "board-design-tasks");
  list.id = `board-design-${card.id}`;
  list.append(...card.tasks.map((t) => designRow(t, env)));
  // The developer's choice is kept for the session in `env`, so a refresh does not close the card.
  let isOpen = env.isExpanded(card.key);
  const toggle = button({ label: "", action: "design-toggle", className: "board-design-toggle", onClick: () => {} });
  const show = () => {
    list.hidden = !isOpen;
    const text = isOpen ? "Hide tasks" : "Show tasks";
    setIconLabel(toggle, isOpen ? "chevron-up" : "chevron-down", text);
    toggle.setAttribute("aria-label", `${text} of design ${card.title}`);
    toggle.setAttribute("aria-expanded", String(isOpen));
  };
  toggle.setAttribute("aria-controls", list.id);
  toggle.addEventListener("click", () => {
    isOpen = !isOpen;
    env.setExpanded(card.key, isOpen);
    show();
  });
  show();
  const reason = joinReasons([env.resolvingReason(), runBlocker(card.tasks, namerOf(env.numbers()))]);
  const run = button({
    label: "Run this design",
    icon: "play",
    aria: `Run this design: ${card.title}`,
    action: "run-design",
    primary: true,
    disabled: reason ?? false,
    onClick: () => env.context.post({ type: "launch", action: { kind: "implement-design", proposal: card.id } }),
  });
  node.append(list, actions(toggle, run));
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
  if (card.kind === "design") return design(card, env);
  if (card.kind === "drift") return drift(card, env);
  return task(card, env);
}
