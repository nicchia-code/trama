import { type CardName, cardNameOf, type CardNumbers, ID_NAMES } from "../../../../src/core/card-names";
import { idTag } from "../id-tag";
import type { ViewContext } from "../types";
import type { Column } from "../../protocol";
import type { AnnouncedCard, Badge, BlockBadge, Card, DriftCard, ProposalCard, TaskCard, WaitingCard } from "./logic";
import type { ProposalTag } from "../../../../src/core/snapshot";
import { AGENT_NAMES, recurringLabel, tagColour } from "./logic";
import { renderDriftCompare } from "../drift-compare";
import { dismissButton } from "../dismiss";
import { renderMarkdown } from "../markdown";
import { renderResolves } from "../resolves";
import { notBlockingLine } from "../not-blocking";
import { viewOfRef } from "../requirements/logic";
import { joinReasons } from "../../../../src/core/design";
import { type IconName, icon, setIcon, setIconLabel } from "../icons";

export interface CardEnv {
  context: ViewContext;
  /** Whether a Task's details were left open; kept for the session, so a refresh does not close them. */
  isExpanded(key: string): boolean;
  setExpanded(key: string, expanded: boolean): void;
  /** Scrolls to a card, by its key, and focuses it. */
  showCard(key: string): void;
  /** The short numbers of the snapshot being drawn. */
  numbers(): CardNumbers;
  /** Why a single Task's Run is disabled beyond its own waiting: a Run in progress or Drift resolution. Run all has its own reasons. Null when none holds. */
  runReason(): string | null;
  /** Opens the model window of a Proposal that carries Tasks. */
  chooseModel(proposal: string): void;
  /** Opens the body window of a Proposal in Backlog. */
  openProposal(proposal: string): void;
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
  /** The tooltip of an enabled button; a disabled one shows its reason instead. */
  title?: string;
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
  if (o.title !== undefined) node.title = o.title;
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

export function chips(refs: string[], context: ViewContext): HTMLElement {
  const list = el("div", "board-chips");
  for (const ref of refs) {
    const chip = el("button", "board-chip", ref);
    const view = viewOfRef(ref);
    chip.type = "button";
    chip.dataset["action"] = `ref:${ref}`;
    chip.title = view === "requirements" ? `Show ${ref} in Requirements` : `Show ${ref} on the diagram`;
    chip.addEventListener("click", () => context.navigate(view, { ref }));
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

/**
 * The model controls of a Proposal that carries Tasks, at the end of its head row: the chosen model as a badge (struck and
 * muted when it was chosen for another agent), then the gear that opens the model window. The gear is never disabled.
 */
function modelControls(card: ProposalCard, env: CardEnv): HTMLElement[] {
  const gear = el("button", "board-model-gear");
  gear.type = "button";
  gear.dataset["action"] = "model";
  setIcon(gear, "settings-gear");
  const choose = `Choose the model for ${card.name.text}`;
  gear.title = choose;
  gear.setAttribute("aria-label", choose);
  gear.addEventListener("click", () => env.chooseModel(card.id));
  const chosen = card.model;
  if (chosen === null) return [gear];
  const model = el("span", "board-badge info board-model", chosen.name);
  if (chosen.applies) {
    model.title = `Model for this Proposal's work: ${chosen.name}`;
    model.setAttribute("aria-label", model.title);
  } else {
    model.classList.add("is-stale");
    const text = `Chosen for ${AGENT_NAMES[chosen.agent]}: the Settings roles apply`;
    model.title = text;
    model.setAttribute("aria-label", text);
  }
  return [model, gear];
}

function proposal(card: ProposalCard, env: CardEnv): HTMLElement {
  const node = shell(card, `${card.heading}: ${card.title}`);
  if (card.resolution) node.className = "board-card board-card-resolution";
  const controls = card.choosable ? modelControls(card, env) : [];
  const open = el("button", "board-card-open", card.title);
  open.type = "button";
  open.dataset["action"] = "open";
  open.addEventListener("click", () => env.openProposal(card.id));
  const title = el("h3", "board-card-title");
  title.append(open);
  node.append(head(card.resolution ? "Resolution Proposal" : "Proposal", card.name, ...card.badges.map((b) => badge(b, env.numbers())), ...controls), title);
  node.classList.add("board-card-openable");
  // A click on the card, outside its buttons, badges and Drift rows, opens its body too.
  node.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("button, a, .board-badge") !== null) return;
    env.openProposal(card.id);
  });
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
  if (card.resolves.length > 0) node.append(...renderResolves("board", card.title, card.resolves, (drift) => env.context.navigate("diagram", { drift }), (drift) => (card.resolves.find((r) => r.drift === drift)?.blocked ?? []).map((t) => blockedRow(t, env, drift))));
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
      button({ label: "Reject", icon: "close", aria: `Reject ${card.heading}`, action: "reject", disabled: card.rejectBlocker ?? false, onClick: () => env.context.post({ type: "rejectProposal", id: card.id }) }),
    ),
  );
  return node;
}

/** "Resolving": an agent is working on this Drift now; the card stays in Blocked until the resolution is delivered. */
function resolvingBadge(): HTMLElement {
  const node = el("span", "board-badge info board-resolving", "Resolving");
  node.title = "An agent is resolving this Drift";
  node.setAttribute("aria-label", "An agent is resolving this Drift");
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
  node.append(head("Drift", card.name, ...(critical ? [critical] : []), ...(recurring ? [recurring] : []), ...(card.resolving ? [resolvingBadge()] : []), ...failedBadge(card.autopilotFailed, env)), el("h3", "board-card-title", card.title));
  if (card.refs.length > 0) node.append(chips(card.refs, env.context));
  node.append(renderDriftCompare(card.drift, { openLink: env.context.openLink }));
  const views: HTMLElement[] = [];
  const resolve = button({ label: "Resolve", icon: "wand", aria: `Resolve ${card.heading}`, title: `Ask an agent to resolve this Drift\n${card.resolveNote}`, action: "resolve", disabled: card.resolveBlocker ?? false, onClick: () => env.context.post({ type: "launch", action: { kind: "resolve-drifts", drift: card.id } }) });
  // A disabled Resolve shows its reason first, then the mode; the reason is also its accessible description.
  if (card.resolveBlocker !== null) {
    resolve.title = `${card.resolveBlocker}\n${card.resolveNote}`;
    resolve.setAttribute("aria-description", card.resolveBlocker);
  }
  views.push(resolve);
  views.push(dismissButton({ blocker: card.dismissBlocker, className: "board-btn", onDismiss: () => env.context.post({ type: "dismissDrift", id: card.id }) }));
  node.append(...card.blocked.map((t) => blockedRow(t, env, card.id)));
  const freed = notBlockingLine(card.notBlocking);
  if (freed) node.append(freed);
  node.append(actions(...views));
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

/** A tag with its text in a colour taken from that text. Not a button; it does nothing. */
function tagNode(text: string, tooltip: string): HTMLElement {
  const node = el("span", "board-proposal-tag", text);
  node.style.setProperty("--tag-colour", tagColour(text));
  node.setAttribute("role", "img");
  node.setAttribute("aria-label", tooltip);
  node.title = tooltip;
  return node;
}

/** A Proposal's tag: its label or shortened title, with the tooltip `From Proposal <identity>: <title>`. */
export function proposalTagNode(tag: ProposalTag): HTMLElement {
  return tagNode(tag.text, `From Proposal ${tag.proposal}: ${tag.title}`);
}

/** The Proposal a Task comes from, as a tag; null when the Task has none. A Proposal that is gone is named by its number or identity. */
function proposalTag(card: TaskCard): HTMLElement | null {
  if (card.proposal === null) return null;
  if (card.proposalTag !== null) return proposalTagNode(card.proposalTag);
  return tagNode(`Proposal ${card.proposalName?.text ?? card.proposal}`, `From Proposal ${card.proposal}`);
}

function task(card: TaskCard, env: CardEnv): HTMLElement {
  const node = shell(card, `Task ${card.name.text}: ${card.title}`);
  // The card the agent has taken wears the animated border; the rest have none.
  if (card.agent) node.classList.add("is-working");
  const badges = [
    ...(card.technical && card.refs.length === 0 ? [badge({ label: "technical", tooltip: "Technical Task", tone: "info" }, env.numbers())] : []),
    ...card.blocks.map((b) => blockBadgeLink(b, env)),
    ...failedBadge(card.autopilotFailed, env),
  ];
  const tag = proposalTag(card);
  const top = head(null, card.name, ...(tag === null ? [] : [tag]), ...badges);
  top.prepend(statusDot(card));
  node.append(top, el("h3", "board-card-title", card.title));
  if (card.refs.length > 0) node.append(chips(card.refs, env.context));
  if (card.drift !== null) {
    const origin = el("p", "board-muted board-origin", "from Drift ");
    origin.append(idTag(cardNameOf(env.numbers(), "drift", card.drift)));
    node.append(origin);
  }
  const details = card.body ? taskDetails(card, env) : null;
  if (details) node.append(details.body);
  const open = button({
    label: "Open",
    icon: "go-to-file",
    aria: `Open file of task ${card.name.text}`,
    action: "open",
    onClick: () => env.context.post({ type: "openFile", path: card.file }),
  });
  const runnable = card.column !== "done" && !card.agent;
  node.append(
    actions(
      ...(details ? [details.toggle] : []),
      ...(runnable ? [button({ label: "Run", icon: "play", aria: `Run task ${card.name.text}`, action: "run", primary: true, disabled: joinReasons([card.finishing, env.runReason()]) ?? false, onClick: () => env.context.post({ type: "launch", action: { kind: "implement", task: card.id } }) })] : []),
      open,
    ),
  );
  return node;
}

/** The other open Drifts that also block a Task, as a link icon whose tooltip and name list their short numbers; null when none. */
function alsoBlocked(card: TaskCard, containing: string | null, env: CardEnv): HTMLElement | null {
  const others = card.blockedBy.flatMap((b) => (b.kind === "drift" && b.drift !== containing ? [cardNameOf(env.numbers(), "drift", b.drift).text] : []));
  if (others.length === 0) return null;
  const text = `Also blocked by ${others.join(", ")}`;
  const node = el("span", "board-also-blocked");
  node.append(icon("link"));
  node.title = text;
  node.setAttribute("role", "img");
  node.setAttribute("aria-label", text);
  return node;
}

/**
 * A Task inside a Drift, a resolution Proposal or a waiting card: its status dot, its ID and title, its Proposal tag and
 * the link that says which other open Drifts also block it. No toggle, body, buttons or blocked badges. `containing` is
 * the Drift the row sits under, if any; it is left out of the link.
 */
function blockedRow(card: TaskCard, env: CardEnv, containing: string | null): HTMLElement {
  const row = el("div", "board-blocked-task");
  row.dataset["key"] = card.key;
  row.tabIndex = -1;
  const tag = proposalTag(card);
  const also = alsoBlocked(card, containing, env);
  const top = head(null, card.name, ...(tag === null ? [] : [tag]), ...(also === null ? [] : [also]));
  top.prepend(statusDot(card));
  row.append(top, el("span", "board-row-title", card.title));
  return row;
}

/** The name of a Task's column, as the status dot says it. */
const TASK_STATE: Record<Column, string> = { todo: "To do", doing: "In progress", done: "Done" };

/** A dot for a Task: its column's colour, static. The label is its column's, or "Agent working" while the agent has taken it. */
export function statusDot(task: { column: Column; agent: boolean }): HTMLElement {
  const name = task.agent ? "Agent working" : TASK_STATE[task.column];
  const dot = el("span", `board-dot is-${task.column}`);
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
  const phase = card.phase === "" ? [] : [el("div", "board-announced-phase", card.phase)];
  node.append(top, el("div", "board-card-title", card.title), lines, ...phase);
  return node;
}

/** A fix Task other Tasks wait for, in Blocked: the fix Task stays in Active, and this card lists the Tasks it holds up, with no buttons. */
function waitingCard(card: WaitingCard, env: CardEnv): HTMLElement {
  const node = shell(card, `Waiting for ${card.task.name.text} ${card.task.title}`);
  const top = head("Waiting for", card.task.name);
  top.prepend(statusDot(card.task));
  const heading = el("h3", "board-card-title");
  const link = el("button", "board-waiting-link", card.task.title);
  link.type = "button";
  link.title = "Go to the card of this Task in Active";
  link.setAttribute("aria-label", "Go to the card of this Task in Active");
  link.addEventListener("click", () => env.showCard(card.task.key));
  heading.append(link);
  node.append(top, heading, ...card.waiting.map((t) => blockedRow(t, env, null)));
  return node;
}

export function renderCard(card: Card, env: CardEnv): HTMLElement {
  if (card.kind === "proposal") return proposal(card, env);
  if (card.kind === "drift") return drift(card, env);
  if (card.kind === "waiting") return waitingCard(card, env);
  return task(card, env);
}
