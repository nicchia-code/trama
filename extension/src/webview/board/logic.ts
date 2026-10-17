// Pure logic of the Board: no DOM. Turns a Snapshot into columns of cards.
import type { FileChange } from "../../../../src/core/diff";
import { formatDiagnostic } from "../../../../src/core/model";
import { compareByCreation } from "../../../../src/core/schema";
import { joinReasons } from "../../../../src/core/design";
import type { Blocker } from "../../../../src/core/blocking";
import type { AnnouncementView, DriftView, HistoryView, ProposalView, Snapshot, TaskView } from "../../../../src/core/snapshot";
import type { Column } from "../../protocol";
import { appliesUnder, requiredReasons } from "../../../../src/core/required";
import { proposalTouches } from "../requirements/logic";
import { dismissBlocker } from "../dismiss";
import { type CardName, cardNameOf, type CardNumbers, namerOf, noNumbers } from "../../../../src/core/card-names";
import type { DriftAutopilotFailure, DriftAutopilotMode, DriftAutopilotStatus } from "../../host/drift-resolution";

/** The columns that hold cards. */
export type CardColumnId = "backlog" | "active" | "blocked";

export type ColumnId = CardColumnId | "history";

export const CARD_COLUMNS: readonly CardColumnId[] = ["backlog", "active", "blocked"];

export const COLUMN_ORDER: readonly ColumnId[] = ["backlog", "active", "blocked", "history"];

export const COLUMN_TITLES: Record<ColumnId, string> = {
  backlog: "Backlog",
  active: "Active",
  blocked: "Blocked",
  history: "History",
};

export const EMPTY_HINTS: Record<ColumnId, string> = {
  backlog: "No proposals",
  active: "Nothing active",
  blocked: "Nothing blocked",
  history: "Nothing done in this period",
};

/** The key of a card on the Board: its kind and its ID. */
const cardKey = (kind: "drift" | "task" | "waiting", id: string) => `${kind}:${id}`;

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
  /** The Tasks this Drift blocks, shown under its row. */
  blocked: TaskCard[];
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
  /** Why Reject is disabled; null when the Proposal can be rejected. */
  rejectBlocker: string | null;
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
  /** Whether the agent is resolving this Drift now: it stays in Blocked with a Resolving badge. */
  resolving: boolean;
  /** The tooltip text of Resolve: the mode of Resolve Drifts, see `autopilotNote`. */
  resolveNote: string;
  /** Why «Resolve» is disabled on this card, or null when it works. */
  resolveBlocker: string | null;
  /** The Tasks this open Drift blocks, shown under its card. */
  blocked: TaskCard[];
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
  /** The tag the Board shows on the Task (the Proposal's label, or its title); null when the Task has none or the Proposal is gone. */
  proposalTag: string | null;
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
  /** Why the Task's Run waits: the agent that filed the Task is still finishing its turn. Null when it is not waiting. */
  finishing: string | null;
  /** The Task's text after its title, in Markdown; empty when it has none. */
  body: string;
  /** Path relative to `.trama/`. */
  file: string;
  column: Column;
}

/** A fix Task that other Tasks wait for, in Blocked: the fix Task stays in Active, and this card lists the Tasks it holds up. */
export interface WaitingCard {
  kind: "waiting";
  key: string;
  /** The fix Task, as its card in Active shows it. */
  task: TaskCard;
  /** The Tasks waiting for it that the agent has not taken, in snapshot order. */
  waiting: TaskCard[];
}

export type Card = ProposalCard | DriftCard | TaskCard | WaitingCard;

export interface BoardColumn {
  id: CardColumnId;
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

/** Why an action on a card is disabled while the agent that filed or delivered it is still finishing its turn, or null. `finishing` lists those ids. */
export function finishingBlocker(id: string, finishing: readonly string[]): string | null {
  return finishing.includes(id) ? "The agent is still finishing" : null;
}

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
export const resolvedRows = (p: Pick<ProposalView, "resolves">, numbers: CardNumbers = noNumbers, failed: (drift: string) => string | null = () => null, blocked: Map<string, TaskCard[]> = new Map()): ResolvedRow[] =>
  p.resolves.map((r) => ({ drift: r.drift, name: cardNameOf(numbers, "drift", r.drift), title: r.title, critical: r.critical, previous: r.previous, decision: r.note === null ? r.decision : `${r.decision} · ${r.note}`, autopilotFailed: failed(r.drift), blocked: blocked.get(r.drift) ?? [] }));

/** `Creates 1 Task` / `Creates N Tasks`, counting removals too; null for zero. */
export function createsText(n: number): string | null {
  return n === 0 ? null : `Creates ${n} ${n === 1 ? "Task" : "Tasks"}`;
}

export function proposalCard(p: ProposalView, numbers: CardNumbers = noNumbers, failed: (drift: string) => string | null = () => null, blocked: Map<string, TaskCard[]> = new Map(), finishing: readonly string[] = []): ProposalCard {
  const wait = finishingBlocker(p.id, finishing);
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
    blocker: joinReasons([wait, approveBlocker(p, numbers)]),
    rejectBlocker: wait,
    touches: proposalTouches(p),
    resolves: resolvedRows(p, numbers, failed, blocked),
    creates: createsText(p.creates),
  };
}

/** What the Board shows of one Drift's Resolve: why it is refused, whether the agent works on the Drift now, and the mode note. */
export interface DriftResolve {
  blocker: string | null;
  resolving: boolean;
  note: string;
}

/** A Drift's card. `resolve` says why its Resolve is refused, whether the agent is resolving it now, and the note of its tooltip. */
export function driftCard(d: DriftView, numbers: CardNumbers = noNumbers, autopilotFailed: string | null = null, dismissBlocker: string | null = null, resolve: DriftResolve = { blocker: null, resolving: false, note: "" }, blocked: TaskCard[] = []): DriftCard {
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
    resolving: resolve.resolving,
    resolveNote: resolve.note,
    resolveBlocker: resolve.blocker,
    blocked,
  };
}

export function taskCard(t: TaskView, numbers: CardNumbers = noNumbers, autopilotFailed: string | null = null, finishing: string | null = null): TaskCard {
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
    proposalTag: t.proposalTag,
    proposalName: t.proposal === null ? null : cardNameOf(numbers, "proposal", t.proposal),
    agent: t.agent,
    blocks: t.blockedBy.map((b) => blockBadge(b, numbers)),
    blockedBy: t.blockedBy,
    body: t.body,
    file: t.file,
    column: t.column,
    autopilotFailed,
    finishing,
  };
}

/** The six terminal colours a tag can wear, in the order the hash picks them. */
const TAG_COLOURS = [
  "var(--vscode-terminal-ansiBlue)",
  "var(--vscode-terminal-ansiGreen)",
  "var(--vscode-terminal-ansiYellow)",
  "var(--vscode-terminal-ansiMagenta)",
  "var(--vscode-terminal-ansiCyan)",
  "var(--vscode-terminal-ansiRed)",
] as const;

/** A stable colour for a tag, from the hash of its label text: the same label always wears the same colour. */
export function tagColour(label: string): string {
  let hash = 0;
  for (const ch of label) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return TAG_COLOURS[hash % TAG_COLOURS.length]!;
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

/** What the panel knows of Resolve Drifts for the Board: why it is refused, why each Drift's Resolve is, the Drifts being resolved, and the mode note. */
export interface BoardResolve {
  /** Why Resolve Drifts is refused now, or null when it works. */
  blocker: string | null;
  /** Why the Resolve of each open Drift is refused, by Drift ID; a Drift missing from it works. */
  drifts: Readonly<Record<string, string | null>>;
  /** The open Drifts the running resolution works on: they stay in Blocked with a Resolving badge. */
  resolving: readonly string[];
  /** The mode of Resolve Drifts, the note of every Resolve tooltip; see `autopilotNote`. */
  note: string;
}

export const NO_RESOLVE: BoardResolve = { blocker: null, drifts: {}, resolving: [], note: "" };

/** Sorts items by creation, oldest first, as the Board Requirement says. */
const byCreation = <T extends { id: string; created: string | null }>(items: T[]): T[] => items.sort(compareByCreation);

/**
 * The three card columns of the Board. Backlog holds the open Proposals; Active the Tasks that can run now or the agent has taken;
 * Blocked the open Drifts outside a delivered resolution, each with the Tasks it blocks, and a waiting card for each fix Task
 * that Tasks wait for. Done Tasks have no card, and the History column lists them apart. A blocked Task the agent has not taken sits under what blocks it, not in a column.
 */
export function buildBoard(snapshot: Snapshot, failures: readonly DriftAutopilotFailure[] = [], resolve: BoardResolve = NO_RESOLVE): BoardColumn[] {
  const numbers = snapshot.numbers ?? noNumbers;
  const failed = failedReasons(failures);
  // A Drift a delivered resolution lists is decided on that Proposal's card, so it has no card of its own in Blocked.
  const delivered = new Set(snapshot.proposals.filter((p) => p.kind === "resolution").flatMap((p) => p.resolves.map((r) => r.drift)));
  const tasks = new Map<string, TaskCard>(snapshot.tasks.map((t): [string, TaskCard] => [t.id, taskCard(t, numbers, failed.get(`task:${t.id}`) ?? null, finishingBlocker(t.id, snapshot.finishingTasks))]));
  // The Tasks blocked and not taken by the agent, by the Drift or fix Task they wait for. A fix Task some Task waits for
  // keeps its waiting card even when the agent has taken all of them: the card then lists no rows.
  const underDrift = new Map<string, TaskCard[]>();
  const underTask = new Map<string, TaskCard[]>();
  const waitedFor = new Set<string>();
  for (const card of tasks.values()) {
    for (const b of card.blockedBy) {
      if (b.kind !== "drift") waitedFor.add(b.task);
    }
    if (card.agent) continue;
    for (const b of card.blockedBy) {
      const list = b.kind === "drift" ? underDrift : underTask;
      const id = b.kind === "drift" ? b.drift : b.task;
      list.set(id, [...(list.get(id) ?? []), card]);
    }
  }
  const backlog = byCreation(snapshot.proposals.map((p) => ({ id: p.id, created: p.created, card: proposalCard(p, numbers, (drift) => failed.get(`drift:${drift}`) ?? null, underDrift, snapshot.finishingProposals) })));
  const blocked = byCreation([
    ...snapshot.drifts
      .filter((d) => !delivered.has(d.id))
      .map((d) => ({ id: d.id, created: d.created, card: driftCard(d, numbers, failed.get(`drift:${d.id}`) ?? null, dismissBlocker(d.id, snapshot.resolutionDrifts, resolve.blocker, snapshot.finishingDrifts), { blocker: joinReasons([finishingBlocker(d.id, snapshot.finishingDrifts), resolve.drifts[d.id] ?? null]), resolving: resolve.resolving.includes(d.id), note: resolve.note }, underDrift.get(d.id) ?? []) })),
    // A fix Task keeps its card in Active; its waiting card stands in Blocked at the fix Task's creation.
    ...snapshot.tasks.flatMap((t) => {
      const fix = tasks.get(t.id);
      const waiting = underTask.get(t.id) ?? [];
      return fix === undefined || !waitedFor.has(t.id) ? [] : [{ id: t.id, created: t.created, card: waitingCard(fix, waiting) }];
    }),
  ]);
  const active: Card[] = [];
  for (const card of tasks.values()) {
    if (card.column !== "done" && (card.agent || card.blockedBy.length === 0)) active.push(card);
  }
  const cards: Record<CardColumnId, Card[]> = {
    backlog: backlog.map((x) => x.card),
    active,
    blocked: blocked.map((x) => x.card),
  };
  return CARD_COLUMNS.map((id) => ({ id, title: COLUMN_TITLES[id], hint: EMPTY_HINTS[id], cards: cards[id] }));
}

/** The number on the Board tab: the cards of Backlog and the Drift cards of Blocked. Waiting cards and ghosts do not count. */
export function boardDecisionCount(columns: readonly BoardColumn[]): number {
  const backlog = columns.find((column) => column.id === "backlog")?.cards.length ?? 0;
  const drifts = columns.find((column) => column.id === "blocked")?.cards.filter((card) => card.kind === "drift").length ?? 0;
  return backlog + drifts;
}

/** The waiting card of a fix Task: the Tasks that wait for it and that the agent has not taken. */
function waitingCard(task: TaskCard, waiting: TaskCard[]): WaitingCard {
  return { kind: "waiting", key: cardKey("waiting", task.id), task, waiting };
}

export type HistoryPeriod = "today" | "week" | "month" | "all";

/** The choices of the History column's period menu; `week` is the initial one. */
export const HISTORY_PERIODS: readonly { id: HistoryPeriod; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "Last 7 days" },
  { id: "month", label: "Last 30 days" },
  { id: "all", label: "All" },
];

const PERIOD_DAYS: Record<HistoryPeriod, number | null> = { today: 1, week: 7, month: 30, all: null };

/** One day of the History column: its heading (`Today · 3`) and its entries. */
export interface HistoryGroup {
  key: string;
  heading: string;
  entries: HistoryView[];
}

/** Start of the local day `back` days before `d`. */
const dayStart = (d: Date, back = 0) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - back).getTime();

/**
 * The History column for a period: the entries whose `updated` day the period lets through, the latest updated first
 * (ties: reverse creation order), grouped by local day. Entries with no valid date are left out.
 */
export function historyGroups(entries: HistoryView[], period: HistoryPeriod, now: Date = new Date(), locale?: string): HistoryGroup[] {
  const days = PERIOD_DAYS[period];
  const from = days === null ? -Infinity : dayStart(now, days - 1);
  const until = days === null ? Infinity : dayStart(now, -1);
  const dated = entries
    .map((entry) => ({ entry, time: Date.parse(entry.updated) }))
    .filter(({ time }) => !Number.isNaN(time) && time >= from && time < until)
    .sort((a, b) => b.time - a.time || Date.parse(b.entry.created) - Date.parse(a.entry.created) || b.entry.id.localeCompare(a.entry.id));
  const today = dayStart(now);
  const yesterday = dayStart(now, 1);
  const groups: { key: string; label: string; entries: HistoryView[] }[] = [];
  for (const { entry, time } of dated) {
    const day = dayStart(new Date(time));
    const key = `day:${day}`;
    const last = groups[groups.length - 1];
    if (last?.key === key) last.entries.push(entry);
    else {
      const label = day === today ? "Today" : day === yesterday ? "Yesterday" : new Date(day).toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
      groups.push({ key, label, entries: [entry] });
    }
  }
  return groups.map((g) => ({ key: g.key, heading: `${g.label} · ${g.entries.length}`, entries: g.entries }));
}

/**
 * When a History entry was last written, as its card shows it: the time alone in the `Today` and `Yesterday` groups, the
 * date and the time otherwise; `title` is the full date and time, for the tooltip.
 */
export function historyWhen(updated: string, now: Date = new Date(), locale?: string): { text: string; time: string; title: string } {
  const at = new Date(updated);
  const day = dayStart(at);
  const recent = day === dayStart(now) || day === dayStart(now, 1);
  const text = recent ? at.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) : at.toLocaleString(locale, { dateStyle: "long", timeStyle: "short" });
  return { text, time: at.toISOString(), title: at.toLocaleString(locale, { dateStyle: "full", timeStyle: "medium" }) };
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

const ANNOUNCED_KIND_LABELS: Record<AnnouncementView["kind"], string> = { proposal: "Proposal", task: "Task", drift: "Drift", check: "Check", scan: "Scan", resolve: "Resolve", work: "Import" };

/** A check shows its own phase, which an open question round does not change. */
export const announcedPhase = (phase: AnnouncementView["phase"], asking: boolean): string =>
  phase === null ? "" : phase === "verifying" ? "Verifying (tests, lint, build)" : phase === "scanning" ? "Scanning" : phase === "history" ? "Updating History" : asking ? "Waiting for your answers" : phase === "writing" ? "Writing" : phase === "writing-proposal" ? "Writing the Proposal" : "Preparing";

export function announcedCard(a: AnnouncementView, asking: boolean): AnnouncedCard {
  const kindLabel = ANNOUNCED_KIND_LABELS[a.kind];
  const phase = announcedPhase(a.phase, asking);
  const title = a.title;
  const isCheck = a.kind === "check" || a.kind === "scan";
  const label = isCheck
    ? `Agent checking the code: ${title}, ${phase}`
    : a.kind === "resolve"
      ? `Agent resolving Drifts: ${title}, ${phase}`
      : a.kind === "work"
        ? "Agent importing the code"
        : `${kindLabel} the agent is creating, ${phase.toLowerCase()}: ${title}`;
  return { key: `announced:${a.id}`, kind: a.kind, kindLabel, title, phase, label };
}

/** The sentence the notice of a withdrawn announcement shows: a check was not finished, a card was not delivered; a Resolve Drifts ghost is a Proposal. */
export const withdrawnNotice = (a: AnnouncementView): string =>
  a.kind === "check" || a.kind === "scan" ? `The agent stopped before finishing ${a.title}.` : `The agent finished without delivering ${a.kind === "resolve" ? "Proposal" : ANNOUNCED_KIND_LABELS[a.kind]} ${a.title}.`;

export interface PlacedGhost {
  card: AnnouncedCard;
  /** Among the column's real cards: the ghost stands before the real card at this position, or last when it is past the end. */
  index: number;
}

/** The column the ghosts stand in, after its real cards: Active. */
export const GHOST_COLUMN: ColumnId = "active";

/**
 * The ghosts of all the announced cards, whatever their kind, in the order announced, after the real cards of `GHOST_COLUMN`.
 * A Proposal whose Draft is attached to a Drift is not announced to the Board at all (see `buildSnapshot`).
 */
export function announcedGhosts(columns: BoardColumn[], announcements: AnnouncementView[], asking: boolean): PlacedGhost[] {
  const index = columns.find((c) => c.id === GHOST_COLUMN)?.cards.length ?? 0;
  return announcements.map((a) => ({ card: announcedCard(a, asking), index }));
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
