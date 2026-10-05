// Pure logic of the Board: no DOM. Turns a Snapshot into columns of cards.
import type { FileChange } from "../../../../src/core/diff";
import { formatDiagnostic } from "../../../../src/core/model";
import type { Blocker } from "../../../../src/core/blocking";
import type { AnnouncementView, DriftView, ProposalView, Snapshot, TaskView } from "../../../../src/core/snapshot";
import type { Column } from "../../protocol";
import { designColumn, placeTasks } from "../../../../src/core/design";
import { appliesUnder, requiredReasons } from "../../../../src/core/required";
import { proposalTouches } from "../requirements/logic";
import { type CardName, cardNameOf, type CardNumbers, namerOf, noNumbers } from "../../../../src/core/card-names";

export type ColumnId = "decide" | Column;

export const COLUMN_ORDER: readonly ColumnId[] = ["decide", "todo", "doing", "done"];

export const COLUMN_TITLES: Record<ColumnId, string> = {
  decide: "To decide",
  todo: "To do",
  doing: "In progress",
  done: "Done",
};

export const EMPTY_HINTS: Record<ColumnId, string> = {
  decide: "Nothing to decide",
  todo: "Nothing to do",
  doing: "Nothing in progress",
  done: "Nothing done yet",
};

/** The key of a Drift or Task card on the Board; a card of a worktree is keyed by its Proposal too. */
const cardKey = (kind: "drift" | "task", id: string, worktree: string | null) => (worktree ? `worktree:${worktree}:${kind}:${id}` : `${kind}:${id}`);

/**
 * The badge of one blocker: "blocked D2" goes to the Drift on the Diagram, "waiting T4" to the card of the fix Task.
 * The Diagram does not draw the Drifts of a worktree, so "blocked" for a Task of a worktree goes to the Drift's card.
 * Each card is written by its number while live.
 */
export interface BlockBadge {
  label: string;
  /** Tooltip and accessible name: why the Task is blocked, and where the badge leads. */
  tooltip: string;
  target: { kind: "diagram"; drift: string } | { kind: "card"; key: string };
}

/** `worktree` is the Proposal whose worktree holds the blocked Task; its blockers live in the same worktree. */
export function blockBadge(b: Blocker, numbers: CardNumbers = noNumbers, worktree: string | null = null): BlockBadge {
  const name = namerOf(numbers);
  if (b.kind === "fix")
    return { label: `waiting ${name("task", b.task)}`, tooltip: `Waiting for Task ${name("task", b.task)}: ${b.title}, which fixes the code for Drift ${name("drift", b.drift)}. Go to its card.`, target: { kind: "card", key: cardKey("task", b.task, worktree) } };
  const why = `Blocked by Drift ${name("drift", b.drift)}: ${b.title}.`;
  return worktree
    ? { label: `blocked ${name("drift", b.drift)}`, tooltip: `${why} Go to its card.`, target: { kind: "card", key: cardKey("drift", b.drift, worktree) } }
    : { label: `blocked ${name("drift", b.drift)}`, tooltip: `${why} Show it on the diagram.`, target: { kind: "diagram", drift: b.drift } };
}

export interface Badge {
  label: string;
  tooltip: string;
  tone: "info" | "warning" | "error";
}

export interface FileSummary {
  path: string;
  added: number;
  changed: number;
  removed: number;
  /** `+2 ~1 -1`, or the kind of change when the file has no structural details. */
  text: string;
}

export interface ChangeSummary {
  files: FileSummary[];
  /** Files left out of `files` to keep the card short. */
  more: number;
}

/** A Proposal that has a worktree: title and, before the round starts merging, Remove from round. No Approve and no Reject. */
export interface WorktreeCard {
  kind: "worktree";
  key: string;
  id: string;
  /** How the Proposal is written: its short number, or its identity once it is closed. */
  name: CardName;
  heading: string;
  title: string;
  removable: boolean;
}

export interface ProposalCard {
  kind: "proposal";
  key: string;
  id: string;
  /** How the Proposal is written: its short number, or its identity once it is closed. */
  name: CardName;
  heading: string;
  title: string;
  badges: Badge[];
  changes: ChangeSummary;
  /** Why Approve is disabled; null when the Proposal can be approved. */
  blocker: string | null;
  /** Whether it changes the Model, its Requirements or both: which views can show it. */
  touches: { model: boolean; requirements: boolean };
}

export interface DriftCard {
  kind: "drift";
  key: string;
  id: string;
  /** How the Drift is written; null for the merge Drift, which has none. */
  name: CardName | null;
  heading: string;
  title: string;
  refs: string[];
  proposal: string | null;
  /** How the attached Proposal is written. */
  proposalName: string | null;
  /** Proposal whose worktree this Drift lives in, or null when it lives in the open folder. */
  worktree: string | null;
  /** The Drift as the snapshot carries it: the card shows its two sides and its choices (see `driftComparison`). */
  drift: DriftView;
}

export interface TaskCard {
  kind: "task";
  key: string;
  id: string;
  /** How the Task is written: its short number while it is in To do or In progress, otherwise its identity. */
  name: CardName;
  title: string;
  technical: boolean;
  refs: string[];
  drift: string | null;
  /** How the Drift the Task came from is written. */
  driftName: string | null;
  /** ID of the Proposal (the design) the Task comes from, if any. */
  proposal: string | null;
  /** True while the agent has taken the Task. */
  agent: boolean;
  /** One badge per thing that blocks the Task; empty when it is free. */
  blocks: BlockBadge[];
  /** What blocks the Task, as the snapshot carries it; Run this design reads it. */
  blockedBy: Blocker[];
  /** The Task's text after its title, in Markdown; empty when it has none. */
  body: string;
  /** Path relative to `.trama/`. */
  file: string;
  column: Column;
  /** Proposal whose worktree this Task lives in, or null when it lives in the open folder. */
  worktree: string | null;
}

/** The Tasks of one design (Proposal) shown as a single card; it stands in the column its Tasks add up to. */
export interface DesignCard {
  kind: "design";
  key: string;
  /** The Proposal's ID. */
  id: string;
  /** How the Proposal is written: its short number, or its identity once it is closed. */
  name: CardName;
  heading: string;
  title: string;
  /** The design's Tasks in creation order, each with its own column. */
  tasks: TaskCard[];
  done: number;
  column: Column;
}

export type Card = ProposalCard | DriftCard | TaskCard | DesignCard;

export interface BoardColumn {
  id: ColumnId;
  title: string;
  hint: string;
  cards: Card[];
}

const MAX_FILES = 4;
const MAX_TOOLTIP_ITEMS = 3;

/** `+2 ~1 -1`, zeros left out. */
export function formatCounts(added: number, changed: number, removed: number): string {
  return [added > 0 ? `+${added}` : "", changed > 0 ? `~${changed}` : "", removed > 0 ? `-${removed}` : ""].filter(Boolean).join(" ");
}

const CHANGE_LABEL: Record<FileChange["change"], string> = { added: "new file", removed: "deleted file", modified: "modified" };

export function summarizeFile(file: FileChange): FileSummary {
  const count = (mark: string) => file.details.filter((d) => d.startsWith(mark)).length;
  const added = count("+");
  const changed = count("~");
  const removed = count("-");
  return { path: file.path, added, changed, removed, text: formatCounts(added, changed, removed) || CHANGE_LABEL[file.change] };
}

export function summarizeChanges(changes: FileChange[], maxFiles = MAX_FILES): ChangeSummary {
  return { files: changes.slice(0, maxFiles).map(summarizeFile), more: Math.max(0, changes.length - maxFiles) };
}

const listed = (items: string[]) => (items.length > MAX_TOOLTIP_ITEMS ? `${items.slice(0, MAX_TOOLTIP_ITEMS).join("\n")}\nand ${items.length - MAX_TOOLTIP_ITEMS} more` : items.join("\n"));

/** The reason a Proposal cannot be approved, or null. Mirrors what the host refuses. */
export function approveBlocker(p: Pick<ProposalView, "stale" | "unbased" | "errors" | "requires">, numbers: CardNumbers = noNumbers): string | null {
  if (p.requires.length > 0) return `Approve the required Proposals first:\n${requiredReasons(p.requires, (id) => namerOf(numbers)("proposal", id)).join("\n")}`;
  if (p.stale.length > 0) return "Stale: the Model changed since this Proposal touched it. Ask the agent for a new Proposal.";
  if (p.unbased.length > 0) return "Some files were never registered with the Proposal.";
  if (p.errors.length > 0) return "Applying this Proposal would leave the Model or its Requirements invalid.";
  return null;
}

export function proposalBadges(p: Pick<ProposalView, "stale" | "unbased" | "errors" | "requires" | "kind">, numbers: CardNumbers = noNumbers): Badge[] {
  const badges: Badge[] = [];
  if (p.kind === "import") badges.push({ label: "import", tone: "info", tooltip: "Describes existing code; approving it starts no Scan" });
  for (const r of p.requires)
    badges.push({ label: `requires ${namerOf(numbers)("proposal", r.id)}`, tone: appliesUnder(r.status) ? "info" : "error", tooltip: requiredReasons([r], (id) => namerOf(numbers)("proposal", id)).join("") });
  if (p.stale.length > 0) badges.push({ label: "stale", tone: "warning", tooltip: `The Model changed since the Proposal touched:\n${listed(p.stale)}` });
  if (p.errors.length > 0) badges.push({ label: "invalid", tone: "error", tooltip: `The Model or its Requirements would be invalid:\n${listed(p.errors.map(formatDiagnostic))}` });
  if (p.unbased.length > 0) badges.push({ label: "unregistered files", tone: "warning", tooltip: `Never registered with the Proposal:\n${listed(p.unbased)}` });
  return badges;
}

/** The In worktree group. These Proposals are not cards of To decide. */
export function worktreeCards(snapshot: Snapshot): WorktreeCard[] {
  return snapshot.inWorktree.map((item) => {
    const name = cardNameOf(snapshot.numbers ?? noNumbers, "proposal", item.id);
    return {
      kind: "worktree",
      key: `worktree:${item.id}`,
      id: item.id,
      name,
      heading: `Proposal ${name.text}`,
      title: item.title,
      removable: item.removable,
    };
  });
}

export function proposalCard(p: ProposalView, numbers: CardNumbers = noNumbers): ProposalCard {
  const name = cardNameOf(numbers, "proposal", p.id);
  return {
    kind: "proposal",
    key: `proposal:${p.id}`,
    id: p.id,
    name,
    heading: `Proposal ${name.text}`,
    title: p.title,
    badges: proposalBadges(p, numbers),
    changes: summarizeChanges(p.changes),
    blocker: approveBlocker(p, numbers),
    touches: proposalTouches(p),
  };
}

export function driftCard(d: DriftView, numbers: CardNumbers = noNumbers): DriftCard {
  const name = d.merge === true ? null : cardNameOf(numbers, "drift", d.id);
  return {
    kind: "drift",
    key: cardKey("drift", d.id, d.worktree),
    id: d.id,
    name,
    heading: name === null ? "Merge Drift" : `Drift ${name.text}`,
    title: d.title,
    refs: d.refs,
    proposal: d.proposal,
    proposalName: d.proposal === null ? null : namerOf(numbers)("proposal", d.proposal),
    worktree: d.worktree,
    drift: d,
  };
}

export function taskCard(t: TaskView, numbers: CardNumbers = noNumbers): TaskCard {
  const name = namerOf(numbers);
  return {
    kind: "task",
    key: cardKey("task", t.id, t.worktree),
    id: t.id,
    name: cardNameOf(numbers, "task", t.id),
    title: t.title,
    technical: t.technical,
    refs: t.refs,
    drift: t.drift,
    driftName: t.drift === null ? null : name("drift", t.drift),
    proposal: t.proposal,
    agent: t.agent,
    blocks: t.blockedBy.map((b) => blockBadge(b, numbers, t.worktree)),
    blockedBy: t.blockedBy,
    body: t.body,
    file: t.file,
    column: t.column,
    worktree: t.worktree,
  };
}

export function designCard(proposal: string, title: string | null, tasks: TaskCard[], numbers: CardNumbers = noNumbers): DesignCard {
  const name = cardNameOf(numbers, "proposal", proposal);
  return {
    kind: "design",
    key: `design:${proposal}`,
    id: proposal,
    name,
    heading: `Proposal ${name.text}`,
    title: title ?? `Proposal ${name.text}`,
    tasks,
    done: tasks.filter((t) => t.column === "done").length,
    column: designColumn(tasks.map((t) => t.column)),
  };
}

/** The four columns of the Board: open Proposals then open Drifts to decide, Tasks by column. */
export function buildBoard(snapshot: Snapshot): BoardColumn[] {
  const numbers = snapshot.numbers ?? noNumbers;
  const cards: Record<ColumnId, Card[]> = {
    decide: [...snapshot.proposals.map((p) => proposalCard(p, numbers)), ...snapshot.drifts.map((d) => driftCard(d, numbers))],
    todo: [],
    doing: [],
    done: [],
  };
  // Tasks of one design are shown together once there are enough of them (see `placeTasks`).
  for (const placed of placeTasks(snapshot.tasks)) {
    if (!placed.design) cards[placed.column].push(taskCard(placed.task, numbers));
    else cards[placed.column].push(designCard(placed.proposal, placed.tasks[0]?.proposalTitle ?? null, placed.tasks.map((t) => taskCard(t, numbers)), numbers));
  }
  return COLUMN_ORDER.map((id) => ({ id, title: COLUMN_TITLES[id], hint: EMPTY_HINTS[id], cards: cards[id] }));
}

/** A card the agent is about to create, as the Board draws its ghost. */
export interface AnnouncedCard {
  /** Stable per announcement, so the same node is reused while it is only updated. */
  key: string;
  kind: AnnouncementView["kind"];
  /** "Proposal", "Task" or "Drift". */
  kindLabel: string;
  title: string;
  /** "Preparing", "Writing", or "Waiting for your answers" while a question round is open. */
  phase: string;
  /** What assistive technology reads: the kind, the title and the phase. */
  label: string;
}

const ANNOUNCED_KIND_LABELS: Record<AnnouncementView["kind"], string> = { proposal: "Proposal", task: "Task", drift: "Drift" };

export const announcedPhase = (phase: AnnouncementView["phase"], asking: boolean): string => (asking ? "Waiting for your answers" : phase === "writing" ? "Writing" : "Preparing");

const REWORK_TITLE = /^Rework of Proposal ([a-z0-9]+)$/;

/** The file of a rework announcement names the Proposal by its identity; the Board writes it by its number while it is live. */
function shownTitle(title: string, numbers: CardNumbers): string {
  const id = REWORK_TITLE.exec(title)?.[1];
  return id === undefined ? title : `Rework of Proposal ${namerOf(numbers)("proposal", id)}`;
}

export function announcedCard(a: AnnouncementView, asking: boolean, numbers: CardNumbers = noNumbers): AnnouncedCard {
  const kindLabel = ANNOUNCED_KIND_LABELS[a.kind];
  const phase = announcedPhase(a.phase, asking);
  const title = shownTitle(a.title, numbers);
  return { key: `announced:${a.id}`, kind: a.kind, kindLabel, title, phase, label: `${kindLabel} the agent is creating, ${phase.toLowerCase()}: ${title}` };
}

/** The sentence the notice of a withdrawn announcement shows. */
export const withdrawnNotice = (a: AnnouncementView, numbers: CardNumbers = noNumbers): string =>
  `The agent finished without delivering ${ANNOUNCED_KIND_LABELS[a.kind]} ${shownTitle(a.title, numbers)}.`;

export interface PlacedGhost {
  card: AnnouncedCard;
  /** Among the column's real cards: the ghost stands before the real card at this position, or last when it is past the end. */
  index: number;
}

/**
 * The ghosts of the announced cards, by column and in the order announced. To decide takes Proposals and Drifts, To do
 * takes Tasks. A ghost stands after the real cards of its kind (Proposals before Drifts), where its real card will take
 * its place, so no other card jumps when it arrives.
 */
export function announcedGhosts(columns: BoardColumn[], announcements: AnnouncementView[], asking: boolean, numbers: CardNumbers = noNumbers): Record<ColumnId, PlacedGhost[]> {
  const real = (id: ColumnId) => columns.find((c) => c.id === id)?.cards ?? [];
  const proposals = real("decide").filter((c) => c.kind === "proposal").length;
  const out: Record<ColumnId, PlacedGhost[]> = { decide: [], todo: [], doing: [], done: [] };
  for (const a of announcements) {
    const card = announcedCard(a, asking, numbers);
    if (a.kind === "task") out.todo.push({ card, index: real("todo").length });
    else out.decide.push({ card, index: a.kind === "proposal" ? proposals : real("decide").length });
  }
  // Proposals stand before Drifts even when they were announced after them, as the real cards do.
  out.decide = [...out.decide.filter((g) => g.card.kind === "proposal"), ...out.decide.filter((g) => g.card.kind === "drift")];
  return out;
}

/** `real` with each extra put before the real item at its index (last when past the end); extras with one index keep their order. */
export function interleave<T>(real: T[], extras: { item: T; index: number }[]): T[] {
  const out = [...real];
  let added = 0;
  for (const extra of [...extras].sort((a, b) => a.index - b.index)) {
    out.splice(Math.min(extra.index + added, out.length), 0, extra.item);
    added++;
  }
  return out;
}
