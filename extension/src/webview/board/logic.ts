// Pure logic of the Board: no DOM. Turns a Snapshot into columns of cards.
import type { FileChange } from "../../../../src/core/diff";
import { formatDiagnostic } from "../../../../src/core/model";
import type { Blocker } from "../../../../src/core/blocking";
import type { AnnouncementView, DriftView, ProposalView, Snapshot, TaskView } from "../../../../src/core/snapshot";
import type { Column } from "../../protocol";
import { designColumn, placeTasks } from "../../../../src/core/design";
import { appliesUnder, requiredReasons } from "../../../../src/core/required";
import { proposalTouches } from "../requirements/logic";

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

/** The badge of one blocker: "blocked 0003" goes to the Drift on the Diagram, "waiting 0004" to the card of the fix Task. */
export interface BlockBadge {
  label: string;
  /** Tooltip and accessible name: why the Task is blocked, and where the badge leads. */
  tooltip: string;
  target: { kind: "drift" | "task"; id: string };
}

export function blockBadge(b: Blocker): BlockBadge {
  return b.kind === "drift"
    ? { label: `blocked ${b.drift}`, tooltip: `Blocked by Drift ${b.drift}: ${b.title}. Show it on the diagram.`, target: { kind: "drift", id: b.drift } }
    : { label: `waiting ${b.task}`, tooltip: `Waiting for Task ${b.task}: ${b.title}, which fixes the code for Drift ${b.drift}. Go to its card.`, target: { kind: "task", id: b.task } };
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
  heading: string;
  title: string;
  removable: boolean;
}

export interface ProposalCard {
  kind: "proposal";
  key: string;
  id: string;
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
  heading: string;
  title: string;
  refs: string[];
  proposal: string | null;
  /** Proposal whose worktree this Drift lives in, or null when it lives in the open folder. */
  worktree: string | null;
  /** The Drift as the snapshot carries it: the card shows its two sides and its choices (see `driftComparison`). */
  drift: DriftView;
}

export interface TaskCard {
  kind: "task";
  key: string;
  id: string;
  title: string;
  technical: boolean;
  refs: string[];
  drift: string | null;
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
export function approveBlocker(p: Pick<ProposalView, "stale" | "unbased" | "errors" | "requires">): string | null {
  if (p.requires.length > 0) return `Approve the required Proposals first:\n${requiredReasons(p.requires).join("\n")}`;
  if (p.stale.length > 0) return "Stale: the Model changed since this Proposal touched it. Ask the agent for a new Proposal.";
  if (p.unbased.length > 0) return "Some files were never registered with the Proposal.";
  if (p.errors.length > 0) return "Applying this Proposal would leave the Model or its Requirements invalid.";
  return null;
}

export function proposalBadges(p: Pick<ProposalView, "stale" | "unbased" | "errors" | "requires" | "kind">): Badge[] {
  const badges: Badge[] = [];
  if (p.kind === "import") badges.push({ label: "import", tone: "info", tooltip: "Describes existing code; approving it starts no Scan" });
  for (const r of p.requires)
    badges.push({ label: `requires ${r.id}`, tone: appliesUnder(r.status) ? "info" : "error", tooltip: requiredReasons([r]).join("") });
  if (p.stale.length > 0) badges.push({ label: "stale", tone: "warning", tooltip: `The Model changed since the Proposal touched:\n${listed(p.stale)}` });
  if (p.errors.length > 0) badges.push({ label: "invalid", tone: "error", tooltip: `The Model or its Requirements would be invalid:\n${listed(p.errors.map(formatDiagnostic))}` });
  if (p.unbased.length > 0) badges.push({ label: "unregistered files", tone: "warning", tooltip: `Never registered with the Proposal:\n${listed(p.unbased)}` });
  return badges;
}

/** The In worktree group. These Proposals are not cards of To decide. */
export function worktreeCards(snapshot: Snapshot): WorktreeCard[] {
  return snapshot.inWorktree.map((item) => ({
    kind: "worktree",
    key: `worktree:${item.id}`,
    id: item.id,
    heading: `Proposal ${item.id}`,
    title: item.title,
    removable: item.removable,
  }));
}

export function proposalCard(p: ProposalView): ProposalCard {
  return {
    kind: "proposal",
    key: `proposal:${p.id}`,
    id: p.id,
    heading: `Proposal ${p.id}`,
    title: p.title,
    badges: proposalBadges(p),
    changes: summarizeChanges(p.changes),
    blocker: approveBlocker(p),
    touches: proposalTouches(p),
  };
}

export function driftCard(d: DriftView): DriftCard {
  return {
    kind: "drift",
    key: d.worktree ? `worktree:${d.worktree}:drift:${d.id}` : `drift:${d.id}`,
    id: d.id,
    heading: d.merge === true ? "Merge Drift" : `Drift ${d.id}`,
    title: d.title,
    refs: d.refs,
    proposal: d.proposal,
    worktree: d.worktree,
    drift: d,
  };
}

export function taskCard(t: TaskView): TaskCard {
  return {
    kind: "task",
    key: t.worktree ? `worktree:${t.worktree}:task:${t.id}` : `task:${t.id}`,
    id: t.id,
    title: t.title,
    technical: t.technical,
    refs: t.refs,
    drift: t.drift,
    proposal: t.proposal,
    agent: t.agent,
    blocks: t.blockedBy.map(blockBadge),
    blockedBy: t.blockedBy,
    body: t.body,
    file: t.file,
    column: t.column,
    worktree: t.worktree,
  };
}

export function designCard(proposal: string, title: string | null, tasks: TaskCard[]): DesignCard {
  return {
    kind: "design",
    key: `design:${proposal}`,
    id: proposal,
    heading: `Proposal ${proposal}`,
    title: title ?? `Proposal ${proposal}`,
    tasks,
    done: tasks.filter((t) => t.column === "done").length,
    column: designColumn(tasks.map((t) => t.column)),
  };
}

/** The four columns of the Board: open Proposals then open Drifts to decide, Tasks by column. */
export function buildBoard(snapshot: Snapshot): BoardColumn[] {
  const cards: Record<ColumnId, Card[]> = {
    decide: [...snapshot.proposals.map(proposalCard), ...snapshot.drifts.map(driftCard)],
    todo: [],
    doing: [],
    done: [],
  };
  // Tasks of one design are shown together once there are enough of them (see `placeTasks`).
  for (const placed of placeTasks(snapshot.tasks)) {
    if (!placed.design) cards[placed.column].push(taskCard(placed.task));
    else cards[placed.column].push(designCard(placed.proposal, placed.tasks[0]?.proposalTitle ?? null, placed.tasks.map(taskCard)));
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

export function announcedCard(a: AnnouncementView, asking: boolean): AnnouncedCard {
  const kindLabel = ANNOUNCED_KIND_LABELS[a.kind];
  const phase = announcedPhase(a.phase, asking);
  return { key: `announced:${a.id}`, kind: a.kind, kindLabel, title: a.title, phase, label: `${kindLabel} the agent is creating, ${phase.toLowerCase()}: ${a.title}` };
}

/** The sentence the notice of a withdrawn announcement shows. */
export const withdrawnNotice = (a: AnnouncementView): string => `The agent finished without delivering ${ANNOUNCED_KIND_LABELS[a.kind]} ${a.title}.`;

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
export function announcedGhosts(columns: BoardColumn[], announcements: AnnouncementView[], asking: boolean): Record<ColumnId, PlacedGhost[]> {
  const real = (id: ColumnId) => columns.find((c) => c.id === id)?.cards ?? [];
  const proposals = real("decide").filter((c) => c.kind === "proposal").length;
  const out: Record<ColumnId, PlacedGhost[]> = { decide: [], todo: [], doing: [], done: [] };
  for (const a of announcements) {
    const card = announcedCard(a, asking);
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
