// Pure logic of the Board: no DOM. Turns a Snapshot into columns of cards.
import type { FileChange } from "../../../../src/core/diff";
import { formatDiagnostic } from "../../../../src/core/model";
import { compareByCreation } from "../../../../src/core/schema";
import type { Blocker } from "../../../../src/core/blocking";
import type { AnnouncementView, DriftView, ProposalView, Snapshot, TaskView } from "../../../../src/core/snapshot";
import type { Column } from "../../protocol";
import { appliesUnder, requiredReasons } from "../../../../src/core/required";
import { proposalTouches } from "../requirements/logic";
import { dismissBlocker } from "../dismiss";
import { type CardName, cardNameOf, type CardNumbers, namerOf, noNumbers } from "../../../../src/core/card-names";
import type { DriftAutopilotFailure, DriftAutopilotMode, DriftAutopilotStatus } from "../../host/drift-resolution";

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
  done: "Nothing done in this period",
};

/** The key of a Drift or Task card on the Board. */
const cardKey = (kind: "drift" | "task", id: string) => `${kind}:${id}`;

/**
 * The badge of one blocker: "blocked D2" goes to the Drift on the Diagram, "waiting T4" to the card of the fix Task.
 * Each card is written by its number while live.
 */
export interface BlockBadge {
  label: string;
  /** Tooltip and accessible name: why the Task is blocked, and where the badge leads. */
  tooltip: string;
  target: { kind: "diagram"; drift: string } | { kind: "card"; key: string };
}

export function blockBadge(b: Blocker, numbers: CardNumbers = noNumbers): BlockBadge {
  const name = namerOf(numbers);
  if (b.kind === "fix")
    return { label: `waiting ${name("task", b.task)}`, tooltip: `Waiting for Task ${name("task", b.task)}: ${b.title}, which fixes the code for Drift ${name("drift", b.drift)}. Go to its card.`, target: { kind: "card", key: cardKey("task", b.task) } };
  return { label: `blocked ${name("drift", b.drift)}`, tooltip: `Blocked by Drift ${name("drift", b.drift)}: ${b.title}. Show it on the diagram.`, target: { kind: "diagram", drift: b.drift } };
}

export interface Badge {
  label: string;
  tooltip: string;
  tone: "info" | "warning" | "error";
  card?: { kind: "proposal"; id: string };
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

export interface ResolvedRow {
  drift: string;
  name: CardName;
  title: string;
  critical: boolean;
  /** The Drift this one follows, as its identity and title, when it is recurring. */
  previous: { id: string; title: string } | null;
  decision: string;
  /** The reason the autopilot failed on or excluded this Drift; null when it did not. */
  autopilotFailed: string | null;
}

/** The text of a recurring Drift's badge, its tooltip and accessible name: the identity and title of the Drift it follows. */
export const recurringLabel = (previous: { id: string; title: string }): string => `Recurring: follows Drift ${previous.id} – ${previous.title}`;

export interface ProposalCard {
  kind: "proposal";
  key: string;
  id: string;
  /** How the Proposal is written: its short number, or its identity once it is closed. */
  name: CardName;
  heading: string;
  title: string;
  resolution: boolean;
  badges: Badge[];
  changes: ChangeSummary;
  /** Why Approve is disabled; null when the Proposal can be approved. */
  blocker: string | null;
  /** Whether it changes the Model, its Requirements or both: which views can show it. */
  touches: { model: boolean; requirements: boolean };
  /** The Drifts a resolution resolves, one row each; empty for any other Proposal. */
  resolves: ResolvedRow[];
  /** The text of the muted `Creates N Tasks` line; null when the Proposal creates no Task. */
  creates: string | null;
}

export interface DriftCard {
  kind: "drift";
  key: string;
  id: string;
  name: CardName;
  heading: string;
  title: string;
  refs: string[];
  proposal: string | null;
  /** The Drift as the snapshot carries it: the card shows its two sides and its choices (see `driftComparison`). */
  drift: DriftView;
  /** The reason the autopilot failed on or excluded this Drift; null when it did not. */
  autopilotFailed: string | null;
  /** Why «Dismiss Drift» is disabled on this card, or null when it works. */
  dismissBlocker: string | null;
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
  /** Title of that Proposal, for the tag on each of its Tasks; null when the Task has none or the Proposal is gone. */
  proposalTitle: string | null;
  /** How the Proposal is written, named by its identity or number; the tag falls back to it. */
  proposalName: CardName | null;
  /** True while the agent has taken the Task. */
  agent: boolean;
  /** One badge per thing that blocks the Task; empty when it is free. */
  blocks: BlockBadge[];
  /** What blocks the Task, as the snapshot carries it. */
  blockedBy: Blocker[];
  /** The reason the autopilot failed on or excluded this Task; null when it did not. */
  autopilotFailed: string | null;
  /** The Task's text after its title, in Markdown; empty when it has none. */
  body: string;
  /** Path relative to `.trama/`. */
  file: string;
  column: Column;
  /** When the Task arrived in Done (UTC ISO 8601); null outside Done or when it was not kept. */
  finished: string | null;
  /** The note of a fix Task closed without changes; null otherwise. */
  unchanged: string | null;
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
export function approveBlocker(p: Pick<ProposalView, "stale" | "unbased" | "errors" | "unfixable" | "requires">, numbers: CardNumbers = noNumbers): string | null {
  if (p.requires.length > 0) return `Approve the required Proposals first:\n${requiredReasons(p.requires, (id) => namerOf(numbers)("proposal", id)).join("\n")}`;
  if (p.stale.length > 0) return "Stale: the Model changed since this Proposal touched it. Ask the agent for a new Proposal.";
  if (p.unbased.length > 0) return "Some files were never registered with the Proposal.";
  if (p.errors.length > 0) return "Applying this Proposal would leave the Model or its Requirements invalid.";
  if (p.unfixable.length > 0) return `Cannot be approved, nothing changed:\n${listed(p.unfixable)}\nHave Resolve Drifts rewrite the resolution.`;
  return null;
}

export function proposalBadges(p: Pick<ProposalView, "stale" | "unbased" | "errors" | "unfixable" | "requires" | "kind" | "automatic">, numbers: CardNumbers = noNumbers): Badge[] {
  const badges: Badge[] = [];
  if (p.kind === "import") badges.push({ label: "import", tone: "info", tooltip: "Describes existing code; approving it starts no Scan" });
  if (p.automatic) badges.push({ label: "delegated", tone: "info", tooltip: "Marked for automatic resolution under your delegation. The marker grants no approval: Approve and Reject stay available." });
  for (const r of p.requires)
    badges.push({ label: `requires ${namerOf(numbers)("proposal", r.id)}`, tone: appliesUnder(r.status) ? "info" : "error", tooltip: requiredReasons([r], (id) => namerOf(numbers)("proposal", id)).join(""), card: { kind: "proposal", id: r.id } });
  if (p.stale.length > 0) badges.push({ label: "stale", tone: "warning", tooltip: `The Model changed since the Proposal touched:\n${listed(p.stale)}` });
  if (p.errors.length > 0) badges.push({ label: "invalid", tone: "error", tooltip: `The Model or its Requirements would be invalid:\n${listed(p.errors.map(formatDiagnostic))}` });
  if (p.unfixable.length > 0) badges.push({ label: "unfixable", tone: "error", tooltip: `Resolve Drifts must rewrite the resolution; these Drifts' code can no longer be fixed:\n${listed(p.unfixable)}` });
  if (p.unbased.length > 0) badges.push({ label: "unregistered files", tone: "warning", tooltip: `Never registered with the Proposal:\n${listed(p.unbased)}` });
  return badges;
}

/** The rows of a resolution's `Resolves Drifts` block, in the order the snapshot carries them; none for any other Proposal. */
export const resolvedRows = (p: Pick<ProposalView, "resolves">, numbers: CardNumbers = noNumbers, failed: (drift: string) => string | null = () => null): ResolvedRow[] =>
  p.resolves.map((r) => ({ drift: r.drift, name: cardNameOf(numbers, "drift", r.drift), title: r.title, critical: r.critical, previous: r.previous, decision: r.note === null ? r.decision : `${r.decision} · ${r.note}`, autopilotFailed: failed(r.drift) }));

/** `Creates 1 Task` / `Creates N Tasks`, counting removals too; null for zero. */
export function createsText(n: number): string | null {
  return n === 0 ? null : `Creates ${n} ${n === 1 ? "Task" : "Tasks"}`;
}

 export function proposalCard(p: ProposalView, numbers: CardNumbers = noNumbers, failed: (drift: string) => string | null = () => null): ProposalCard {
  const name = cardNameOf(numbers, "proposal", p.id);
  return {
    kind: "proposal",
    key: `proposal:${p.id}`,
    id: p.id,
    name,
    heading: p.kind === "resolution" ? `Resolution Proposal ${name.text}` : `Proposal ${name.text}`,
    title: p.title,
    resolution: p.kind === "resolution",
    badges: proposalBadges(p, numbers),
    changes: summarizeChanges(p.changes),
    blocker: approveBlocker(p, numbers),
    touches: proposalTouches(p),
    resolves: resolvedRows(p, numbers, failed),
    creates: createsText(p.creates),
  };
}

export function driftCard(d: DriftView, numbers: CardNumbers = noNumbers, autopilotFailed: string | null = null, dismissBlocker: string | null = null): DriftCard {
  const name = cardNameOf(numbers, "drift", d.id);
  return {
    kind: "drift",
    key: cardKey("drift", d.id),
    id: d.id,
    name,
    heading: `Drift ${name.text}`,
    title: d.title,
    refs: d.refs,
    proposal: d.proposal,
    drift: d,
    autopilotFailed,
    dismissBlocker,
  };
}

export function taskCard(t: TaskView, numbers: CardNumbers = noNumbers, autopilotFailed: string | null = null): TaskCard {
  const name = namerOf(numbers);
  return {
    kind: "task",
    key: cardKey("task", t.id),
    id: t.id,
    name: cardNameOf(numbers, "task", t.id),
    title: t.title,
    technical: t.technical,
    refs: t.refs,
    drift: t.drift,
    driftName: t.drift === null ? null : name("drift", t.drift),
    proposal: t.proposal,
    proposalTitle: t.proposalTitle,
    proposalName: t.proposal === null ? null : cardNameOf(numbers, "proposal", t.proposal),
    agent: t.agent,
    blocks: t.blockedBy.map((b) => blockBadge(b, numbers)),
    blockedBy: t.blockedBy,
    body: t.body,
    file: t.file,
    column: t.column,
    finished: t.finished,
    unchanged: t.unchanged,
    autopilotFailed,
  };
}

/** A stable hue, 0 to 359, from a Proposal's identity: all its Tasks wear the same tint in every column. */
export function proposalHue(id: string): number {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash % 360;
}

/** What each Drift autopilot mode means, for the Resolve Drifts tooltip. */
const autopilotModes: Record<DriftAutopilotMode, string> = {
  disabled: "Drift autopilot is off: Resolve Drifts uses the manual flow.",
  enabled: "Drift autopilot is on (enabled): it approves and fixes non-critical Drifts; critical ones stay manual.",
  yolo: "Drift autopilot is on (yolo): it approves and fixes all eligible Drifts, critical ones too.",
};

/** The autopilot mode and, when automation waits or is suspended, why. For the Resolve Drifts tooltip; it grants nothing. */
export function autopilotNote(status: DriftAutopilotStatus): string {
  const mode = autopilotModes[status.mode];
  const waiting = status.reason === null ? [mode] : [mode, `${status.reason}.`];
  // A failed final check of an automatic Run carries no Drift or Task badge, so the tooltip names it.
  const runFailures = status.failures
    .filter((failure) => failure.reason !== undefined && failure.drift === undefined && failure.task === undefined)
    .map((failure) => `Autopilot failed: ${failure.title}`);
  return [...waiting, ...runFailures].join("\n");
}

/** The reason each Drift or Task the autopilot failed on or excluded carries, keyed `drift:<id>` or `task:<id>`. Scan failures name no case and are left out. */
function failedReasons(failures: readonly DriftAutopilotFailure[]): Map<string, string> {
  const reasons = new Map<string, string>();
  for (const f of failures) {
    if (f.reason === undefined) continue;
    if (f.drift !== undefined) reasons.set(`drift:${f.drift}`, f.reason);
    if (f.task !== undefined) reasons.set(`task:${f.task}`, f.reason);
  }
  return reasons;
}

/** The four columns of the Board; open resolution Drifts are represented only on their Proposal card. */
export function buildBoard(snapshot: Snapshot, failures: readonly DriftAutopilotFailure[] = [], resolveBlocker: string | null = null): BoardColumn[] {
  const numbers = snapshot.numbers ?? noNumbers;
  const failed = failedReasons(failures);
  const resolving = new Set(snapshot.proposals.filter((p) => p.kind === "resolution").flatMap((p) => p.resolves.map((r) => r.drift)));
  // To decide holds the open Proposals and Drifts together, oldest first, as the Board Requirement says.
  const decide = [
    ...snapshot.proposals.map((p) => ({ id: p.id, created: p.created, card: proposalCard(p, numbers, (drift) => failed.get(`drift:${drift}`) ?? null) })),
    ...snapshot.drifts.filter((d) => !resolving.has(d.id)).map((d) => ({ id: d.id, created: d.created, card: driftCard(d, numbers, failed.get(`drift:${d.id}`) ?? null, dismissBlocker(d.id, snapshot.proposals, resolveBlocker)) })),
  ];
  const cards: Record<ColumnId, Card[]> = {
    decide: decide.sort(compareByCreation).map((x) => x.card),
    todo: [],
    doing: [],
    done: [],
  };
  // Each Task is a card of its own, in creation order, which is the order of the snapshot.
  for (const t of snapshot.tasks) cards[t.column].push(taskCard(t, numbers, failed.get(`task:${t.id}`) ?? null));
  return COLUMN_ORDER.map((id) => ({ id, title: COLUMN_TITLES[id], hint: EMPTY_HINTS[id], cards: cards[id] }));
}

export type DonePeriod = "today" | "week" | "month" | "all";

/** The choices of the Done column's period menu; `week` is the initial one. */
export const DONE_PERIODS: readonly { id: DonePeriod; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "Last 7 days" },
  { id: "month", label: "Last 30 days" },
  { id: "all", label: "All" },
];

const PERIOD_DAYS: Record<DonePeriod, number | null> = { today: 1, week: 7, month: 30, all: null };

/** One day of the Done column: its heading (`Today · 3`) and its cards. */
export interface DoneGroup {
  key: string;
  heading: string;
  cards: Card[];
}

/** When a Done card was finished, in ms: a Task's `finished`; null when it is not known. */
export function finishedAt(card: Card): number | null {
  if (card.kind !== "task" || card.finished === null) return null;
  const time = Date.parse(card.finished);
  return Number.isNaN(time) ? null : time;
}

/** Start of the local day `back` days before `d`. */
const dayStart = (d: Date, back = 0) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - back).getTime();

/**
 * The Done column for a period: the cards the period lets through, the latest finished first (ties: reverse creation
 * order; `cards` come in creation order), grouped by local day. Cards with no date form a last `No date` group, only
 * with `all`. No group is empty.
 */
export function doneGroups(cards: Card[], period: DonePeriod, now: Date = new Date(), locale?: string): DoneGroup[] {
  const days = PERIOD_DAYS[period];
  const from = days === null ? -Infinity : dayStart(now, days - 1);
  const until = days === null ? Infinity : dayStart(now, -1);
  const dated: { card: Card; index: number; time: number }[] = [];
  const undated: Card[] = [];
  cards.forEach((card, index) => {
    const time = finishedAt(card);
    if (time === null) undated.unshift(card);
    else if (time >= from && time < until) dated.push({ card, index, time });
  });
  dated.sort((a, b) => b.time - a.time || b.index - a.index);
  const today = dayStart(now);
  const yesterday = dayStart(now, 1);
  const groups: { key: string; label: string; cards: Card[] }[] = [];
  for (const { card, time } of dated) {
    const day = dayStart(new Date(time));
    const key = `day:${day}`;
    const last = groups[groups.length - 1];
    if (last?.key === key) last.cards.push(card);
    else {
      const label = day === today ? "Today" : day === yesterday ? "Yesterday" : new Date(day).toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
      groups.push({ key, label, cards: [card] });
    }
  }
  if (period === "all" && undated.length > 0) groups.push({ key: "none", label: "No date", cards: undated });
  return groups.map((g) => ({ key: g.key, heading: `${g.label} · ${g.cards.length}`, cards: g.cards }));
}

/** A card the agent is about to create, or a check it is doing, as the Board draws its ghost. */
export interface AnnouncedCard {
  /** Stable per announcement, so the same node is reused while it is only updated. */
  key: string;
  kind: AnnouncementView["kind"];
  /** "Proposal", "Task", "Drift" or "Check". */
  kindLabel: string;
  title: string;
  /** "Preparing", "Writing", "Writing the Proposal", or "Waiting for your answers" while a question round is open; for a check, its own phase. */
  phase: string;
  /** What assistive technology reads: the kind, the title and the phase. */
  label: string;
}

const ANNOUNCED_KIND_LABELS: Record<AnnouncementView["kind"], string> = { proposal: "Proposal", task: "Task", drift: "Drift", check: "Check" };

/** A check shows its own phase, which an open question round does not change. */
export const announcedPhase = (phase: AnnouncementView["phase"], asking: boolean): string =>
  phase === "verifying" ? "Verifying (tests, lint, build)" : phase === "scanning" ? "Scanning" : asking ? "Waiting for your answers" : phase === "writing" ? "Writing" : phase === "writing-proposal" ? "Writing the Proposal" : "Preparing";

export function announcedCard(a: AnnouncementView, asking: boolean): AnnouncedCard {
  const kindLabel = ANNOUNCED_KIND_LABELS[a.kind];
  const phase = announcedPhase(a.phase, asking);
  const title = a.title;
  const label = a.kind === "check" ? `Agent checking the code: ${title}, ${phase}` : `${kindLabel} the agent is creating, ${phase.toLowerCase()}: ${title}`;
  return { key: `announced:${a.id}`, kind: a.kind, kindLabel, title, phase, label };
}

/** The sentence the notice of a withdrawn announcement shows: a check was not finished, a card was not delivered. */
export const withdrawnNotice = (a: AnnouncementView): string =>
  a.kind === "check" ? `The agent stopped before finishing ${a.title}.` : `The agent finished without delivering ${ANNOUNCED_KIND_LABELS[a.kind]} ${a.title}.`;

export interface PlacedGhost {
  card: AnnouncedCard;
  /** Among the column's real cards: the ghost stands before the real card at this position, or last when it is past the end. */
  index: number;
}

/**
 * The ghosts of the announced cards, by column and in the order announced, whatever their kind. To decide takes Proposals
 * and Drifts, To do takes Tasks, In progress takes checks. A ghost stands after the real cards of its column, and a check
 * after every real card. A Proposal whose Draft is attached to a Drift is not announced to the Board at all (see `buildSnapshot`).
 */
export function announcedGhosts(columns: BoardColumn[], announcements: AnnouncementView[], asking: boolean): Record<ColumnId, PlacedGhost[]> {
  const real = (id: ColumnId) => columns.find((c) => c.id === id)?.cards ?? [];
  const out: Record<ColumnId, PlacedGhost[]> = { decide: [], todo: [], doing: [], done: [] };
  for (const a of announcements) {
    const card = announcedCard(a, asking);
    if (a.kind === "task") out.todo.push({ card, index: real("todo").length });
    else if (a.kind === "check") out.doing.push({ card, index: real("doing").length });
    else out.decide.push({ card, index: real("decide").length });
  }
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
