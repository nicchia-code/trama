// Pure logic of the Board: no DOM. Turns a Snapshot into columns of cards.
import type { FileChange } from "../../../../src/core/diff";
import { formatDiagnostic } from "../../../../src/core/model";
import type { DriftView, ProposalView, Snapshot, TaskView } from "../../../../src/core/snapshot";
import type { Column } from "../../protocol";
import { proposalTouches } from "../requirements/logic";

export type ColumnId = "decide" | Column;

export const COLUMN_ORDER: readonly ColumnId[] = ["decide", "todo", "doing", "done"];
/** The columns a Task can live in, left to right. */
export const TASK_COLUMNS: readonly Column[] = ["todo", "doing", "done"];

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

export interface Badge {
  label: string;
  tooltip: string;
  tone: "warning" | "error";
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
  excerpt: string;
  refs: string[];
  proposal: string | null;
  /** Why Accept Proposal is disabled although a Proposal is attached; null when it is available. */
  acceptBlocker: string | null;
}

export interface TaskCard {
  kind: "task";
  key: string;
  id: string;
  title: string;
  technical: boolean;
  refs: string[];
  drift: string | null;
  excerpt: string;
  /** Path relative to `.trama/`. */
  file: string;
  column: Column;
  /** Neighbouring Task columns; null at the ends. */
  left: Column | null;
  right: Column | null;
}

export type Card = ProposalCard | DriftCard | TaskCard;

export interface BoardColumn {
  id: ColumnId;
  title: string;
  hint: string;
  cards: Card[];
}

const MAX_FILES = 4;
const MAX_TOOLTIP_ITEMS = 3;
const EXCERPT_CHARS = 200;

/** First non-empty lines of a Markdown body, cut to a short length. */
export function excerpt(body: string, maxLines = 2, maxChars = EXCERPT_CHARS): string {
  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, maxLines);
  const text = lines.join("\n");
  return text.length > maxChars ? `${text.slice(0, maxChars - 1).trimEnd()}…` : text;
}

/** The Task column next to `column` in the given direction, or null at the ends. */
export function neighbour(column: Column, direction: "left" | "right"): Column | null {
  const index = TASK_COLUMNS.indexOf(column) + (direction === "left" ? -1 : 1);
  return TASK_COLUMNS[index] ?? null;
}

/** Where dropping a card from `from` onto `target` moves it; null when the drop is refused or pointless. */
export function dropTarget(from: Column, target: ColumnId): Column | null {
  return target === "decide" || target === from ? null : target;
}

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
export function approveBlocker(p: Pick<ProposalView, "stale" | "unbased" | "errors">): string | null {
  if (p.stale.length > 0) return "Stale: the Model changed since this Proposal touched it. Ask the agent for a new Proposal.";
  if (p.unbased.length > 0) return "Some files were never registered with the Proposal.";
  if (p.errors.length > 0) return "Applying this Proposal would leave the Model or its Requirements invalid.";
  return null;
}

export function proposalBadges(p: Pick<ProposalView, "stale" | "unbased" | "errors">): Badge[] {
  const badges: Badge[] = [];
  if (p.stale.length > 0) badges.push({ label: "stale", tone: "warning", tooltip: `The Model changed since the Proposal touched:\n${listed(p.stale)}` });
  if (p.errors.length > 0) badges.push({ label: "invalid", tone: "error", tooltip: `The Model or its Requirements would be invalid:\n${listed(p.errors.map(formatDiagnostic))}` });
  if (p.unbased.length > 0) badges.push({ label: "unregistered files", tone: "warning", tooltip: `Never registered with the Proposal:\n${listed(p.unbased)}` });
  return badges;
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

export function driftCard(d: DriftView, proposals: ProposalView[]): DriftCard {
  const attached = d.proposal === null ? undefined : proposals.find((p) => p.id === d.proposal);
  return {
    kind: "drift",
    key: `drift:${d.id}`,
    id: d.id,
    heading: `Drift ${d.id}`,
    title: d.title,
    excerpt: excerpt(d.body),
    refs: d.refs,
    proposal: d.proposal,
    acceptBlocker: attached ? approveBlocker(attached) : null,
  };
}

export function taskCard(t: TaskView): TaskCard {
  return {
    kind: "task",
    key: `task:${t.id}`,
    id: t.id,
    title: t.title,
    technical: t.technical,
    refs: t.refs,
    drift: t.drift,
    excerpt: excerpt(t.body),
    file: t.file,
    column: t.column,
    left: neighbour(t.column, "left"),
    right: neighbour(t.column, "right"),
  };
}

/** The four columns of the Board: open Proposals then open Drifts to decide, Tasks by column. */
export function buildBoard(snapshot: Snapshot): BoardColumn[] {
  const cards: Record<ColumnId, Card[]> = {
    decide: [...snapshot.proposals.map(proposalCard), ...snapshot.drifts.map((d) => driftCard(d, snapshot.proposals))],
    todo: [],
    doing: [],
    done: [],
  };
  for (const task of snapshot.tasks) cards[task.column].push(taskCard(task));
  return COLUMN_ORDER.map((id) => ({ id, title: COLUMN_TITLES[id], hint: EMPTY_HINTS[id], cards: cards[id] }));
}
