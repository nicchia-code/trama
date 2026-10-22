// Pure logic of the Board: no DOM. Turns a Snapshot into columns of cards.
import type { FileChange } from "../../../../src/core/diff";
import { formatDiagnostic } from "../../../../src/core/model";
import { compareByCreation } from "../../../../src/core/schema";
import { joinReasons } from "../../../../src/core/design";
import type { Blocker } from "../../../../src/core/blocking";
import type { AnnouncementView, DriftView, HistoryView, ProposalTag, ProposalView, Snapshot, TaskImageView, TaskView } from "../../../../src/core/snapshot";
import type { Column, FocusRequest } from "../../protocol";
import { appliesUnder, requiredReasons } from "../../../../src/core/required";
import { focusStepCount } from "../focus/steps";
import { dismissBlocker } from "../dismiss";
import { type CardName, cardNameOf, type CardNumbers, namerOf, noNumbers } from "../../../../src/core/card-names";
import type { BoardModels, BoardProposalModel, ProposalAgent } from "../../host/proposal-models";

/** How each agent of `trama.agent` is named in the texts of the model window and of its badge. */
export const AGENT_NAMES: Record<ProposalAgent, string> = {
  cursor: "Cursor's chat",
  omp: "omp",
};

/** The models of no Proposal: the Board draws them as none chosen and none choosable. */
export const NO_MODELS: BoardModels = { agent: "cursor", proposals: {} };

/** The columns that hold cards. */
export type CardColumnId = "backlog" | "active" | "system";

export type ColumnId = CardColumnId | "history";

export const CARD_COLUMNS: readonly CardColumnId[] = ["backlog", "active", "system"];

export const COLUMN_ORDER: readonly ColumnId[] = ["backlog", "active", "system", "history"];

export const COLUMN_TITLES: Record<ColumnId, string> = {
  backlog: "Backlog",
  active: "Active",
  system: "System Activities",
  history: "History",
};

export const EMPTY_HINTS: Record<ColumnId, string> = {
  backlog: "Nothing to decide",
  active: "Nothing active",
  system: "Nothing running",
  history: "Nothing done in this period",
};

/** The key of a card on the Board: its kind and its ID. */
const cardKey = (kind: "drift" | "task", id: string) => `${kind}:${id}`;

/** An open Drift that blocks a Task: where its badge popup leads (`key` is its red card, or its row in the yellow card). */
export interface DriftBlocker {
  id: string;
  key: string;
  name: CardName;
  title: string;
}

/** The fix Task a Task waits for, and the Drift it fixes (already decided). */
export interface FixWait {
  id: string;
  key: string;
  name: CardName;
  title: string;
  column: Column;
  agent: boolean;
  drift: { id: string; name: CardName; title: string };
}

/** Card names in a sentence: the first few, then `and N more`. */
export const namesList = (names: string[]): string =>
  names.length > MAX_TOOLTIP_ITEMS ? `${names.slice(0, MAX_TOOLTIP_ITEMS).join(", ")} and ${names.length - MAX_TOOLTIP_ITEMS} more` : names.join(", ");

/** "Blocked by Drift D3, D7" / "Waiting for Task T4": the Run reason of a blocked Task; null when it is free. */
export function blockedReason(blockedByDrifts: readonly DriftBlocker[], waitingFor: readonly FixWait[]): string | null {
  const reasons = [
    blockedByDrifts.length === 0 ? null : `Blocked by Drift ${namesList(blockedByDrifts.map((d) => d.name.text))}`,
    waitingFor.length === 0 ? null : `Waiting for Task ${namesList(waitingFor.map((t) => t.name.text))}`,
  ];
  return joinReasons(reasons);
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

/** A Task a Drift leaves free, as the Board names it: its short number or identity, and the reason it gives. */
export interface NotBlockingItem {
  name: CardName;
  reason: string;
}

/** The Tasks a Drift leaves free that still exist, named as the Board names Tasks; a Task that no longer exists is left out. */
export const notBlockingItems = (freed: DriftView["notBlocking"], numbers: CardNumbers): NotBlockingItem[] =>
  freed.flatMap((f) => (f.title === null ? [] : [{ name: cardNameOf(numbers, "task", f.task), reason: f.reason }]));

/** Which of the two View buttons a card has. */
export interface FocusViews {
  diagram: boolean;
  requirements: boolean;
}

/** No View button: a card whose focus is not computed. */
export const NO_VIEWS: FocusViews = { diagram: false, requirements: false };

/** The View buttons a Proposal or a Task has on the current picture: one per tab that would show at least one step of its focus. */
export const focusViews = (snapshot: Snapshot, focus: FocusRequest): FocusViews => ({
  diagram: focusStepCount(snapshot, focus, "diagram") > 0,
  requirements: focusStepCount(snapshot, focus, "requirements") > 0,
});

export interface ResolvedRow {
  drift: string;
  name: CardName;
  title: string;
  /** The Drift this one follows, as its identity and title, when it is recurring. */
  previous: { id: string; title: string } | null;
  decision: string;
  /** The Tasks this Drift blocks, shown under its row. */
  blocked: TaskCard[];
  /** The Tasks this Drift leaves free, with the reason, shown under the Tasks it blocks. */
  notBlocking: NotBlockingItem[];
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
  /** The Proposal's text after its title, in Markdown; empty when it has none. */
  body: string;
  resolution: boolean;
  badges: Badge[];
  changes: ChangeSummary;
  /** Why Approve is disabled; null when the Proposal can be approved. */
  blocker: string | null;
  /** Why Reject is disabled; null when the Proposal can be rejected. */
  rejectBlocker: string | null;
  /** Why the arrow of Reject (Rework with feedback) is disabled: Reject's reasons, and for a resolution also Resolve's; null when it works. */
  reworkBlocker: string | null;
  /** Which View buttons the card has: each shows only when its tab would have at least one step of the Proposal's focus (`rules#focus`). */
  views: FocusViews;
  /** The Drifts a resolution resolves, one row each; empty for any other Proposal. */
  resolves: ResolvedRow[];
  /** The text of the muted `Creates N Tasks` line; null when the Proposal creates no Task. */
  creates: string | null;
  /** Whether the Proposal carries Tasks, so its model can be chosen: only then the card has the model gear. */
  choosable: boolean;
  /** The model chosen for the Proposal, as the host carries it; null when none is chosen or it cannot be chosen. */
  model: BoardProposalModel | null;
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
  /** Why «Dismiss Drift» is disabled on this card, or null when it works. */
  dismissBlocker: string | null;
  /** Why the arrow of «Dismiss Drift» (Rework with feedback) is disabled: the reasons of Dismiss Drift, then those of Resolve; null when it works. */
  reworkBlocker: string | null;
  /** Whether the agent is resolving this Drift now: it stays in Blocked with a Resolving badge. */
  resolving: boolean;
  /** Why «Resolve» is disabled on this card, or null when it works. */
  resolveBlocker: string | null;
  /** The Tasks this open Drift blocks, shown under its card. */
  blocked: TaskCard[];
  /** The Tasks this open Drift leaves free, with the reason, shown under the Tasks it blocks. */
  notBlocking: NotBlockingItem[];
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
  /** The tag the Board shows on the Task: the Proposal's label, or its shortened title; null when the Task has none or the Proposal is gone. */
  proposalTag: ProposalTag | null;
  /** How the Proposal is written, named by its identity or number; the tag falls back to it. */
  proposalName: CardName | null;
  /** True while the agent has taken the Task. */
  agent: boolean;
  /** The percentage the agent declared for the Task it has taken; null when none. */
  progress: number | null;
  /** The open Drifts that block the Task, in creation order; empty when none does. */
  blockedByDrifts: DriftBlocker[];
  /** The fix Tasks the Task waits for; empty when it waits for none. */
  waitingFor: FixWait[];
  /** What blocks the Task, as the snapshot carries it. */
  blockedBy: Blocker[];
  /** Why the Task's Run waits: the agent that filed the Task is still finishing its turn. Null when it is not waiting. */
  finishing: string | null;
  /** The Task's text after its title, in Markdown; empty when it has none. */
  body: string;
  /** The images the Task carries, in the order they were tied; the details show them under the body. */
  images: TaskImageView[];
  /** Path relative to `.trama/`. */
  file: string;
  column: Column;
  /** Which View buttons the card has: each shows only when its tab would have at least one step of the Task's focus (`rules#focus`). */
  views: FocusViews;
}

export type Card = ProposalCard | DriftCard | TaskCard;

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
  if (p.requires.length > 0) return `Approve the required Proposals first:\n${listed(requiredReasons(p.requires, (id) => namerOf(numbers)("proposal", id)))}`;
  if (p.stale.length > 0) return "Stale: the Model changed since this Proposal touched it. Ask the agent for a new Proposal.";
  if (p.unbased.length > 0) return "Some files were never registered with the Proposal.";
  if (p.errors.length > 0) return "Applying this Proposal would leave the Model or its Requirements invalid.";
  if (p.unfixable.length > 0) return `Cannot be approved, nothing changed:\n${listed(p.unfixable)}\nHave Resolve Drifts rewrite the resolution.`;
  return null;
}

export function proposalBadges(p: Pick<ProposalView, "stale" | "unbased" | "errors" | "unfixable" | "requires" | "kind" | "nonBlocking">, numbers: CardNumbers = noNumbers): Badge[] {
  const badges: Badge[] = [];
  if (p.kind === "import") badges.push({ label: "import", tone: "info", tooltip: "Describes existing code; approving it starts no Scan" });
  if (p.nonBlocking) badges.push({ label: "blocks nothing", tone: "info", tooltip: "Filed by the experimental Drift blocker: these Drifts block no Task. Approve or reject it like any resolution." });
  for (const r of p.requires)
    badges.push({ label: `requires ${namerOf(numbers)("proposal", r.id)}`, tone: appliesUnder(r.status) ? "info" : "error", tooltip: requiredReasons([r], (id) => namerOf(numbers)("proposal", id)).join(""), card: { kind: "proposal", id: r.id } });
  if (p.stale.length > 0) badges.push({ label: "stale", tone: "warning", tooltip: `The Model changed since the Proposal touched:\n${listed(p.stale)}` });
  if (p.errors.length > 0) badges.push({ label: "invalid", tone: "error", tooltip: `The Model or its Requirements would be invalid:\n${listed(p.errors.map(formatDiagnostic))}` });
  if (p.unfixable.length > 0) badges.push({ label: "unfixable", tone: "error", tooltip: `Resolve Drifts must rewrite the resolution; these Drifts' code can no longer be fixed:\n${listed(p.unfixable)}` });
  if (p.unbased.length > 0) badges.push({ label: "unregistered files", tone: "warning", tooltip: `Never registered with the Proposal:\n${listed(p.unbased)}` });
  return badges;
}

/** The rows of a resolution's `Resolves Drifts` block, in the order the snapshot carries them; none for any other Proposal. */
export const resolvedRows = (p: Pick<ProposalView, "resolves">, numbers: CardNumbers = noNumbers, blocked: Map<string, TaskCard[]> = new Map()): ResolvedRow[] =>
  p.resolves.map((r) => ({ drift: r.drift, name: cardNameOf(numbers, "drift", r.drift), title: r.title, previous: r.previous, decision: r.note === null ? r.decision : `${r.decision} · ${r.note}`, blocked: blocked.get(r.drift) ?? [], notBlocking: notBlockingItems(r.notBlocking, numbers) }));

/** `Creates 1 Task` / `Creates N Tasks`, counting removals too; null for zero. */
export function createsText(n: number): string | null {
  return n === 0 ? null : `Creates ${n} ${n === 1 ? "Task" : "Tasks"}`;
}

export function proposalCard(p: ProposalView, numbers: CardNumbers = noNumbers, blocked: Map<string, TaskCard[]> = new Map(), finishing: readonly string[] = [], models: BoardModels = NO_MODELS, views: FocusViews = NO_VIEWS, resolveReason: string | null = null): ProposalCard {
  const wait = finishingBlocker(p.id, finishing);
  const name = cardNameOf(numbers, "proposal", p.id);
  const choosable = Object.hasOwn(models.proposals, p.id);
  return {
    kind: "proposal",
    key: `proposal:${p.id}`,
    id: p.id,
    name,
    heading: p.kind === "resolution" ? `Resolution Proposal ${name.text}` : `Proposal ${name.text}`,
    title: p.title,
    body: p.body,
    resolution: p.kind === "resolution",
    badges: proposalBadges(p, numbers),
    changes: summarizeChanges(p.changes),
    blocker: joinReasons([wait, approveBlocker(p, numbers)]),
    rejectBlocker: wait,
    reworkBlocker: joinReasons([wait, p.kind === "resolution" ? resolveReason : null]),
    views,
    resolves: resolvedRows(p, numbers, blocked),
    creates: createsText(p.creates),
    choosable,
    model: models.proposals[p.id] ?? null,
  };
}

/** What the Board shows of one Drift's Resolve: why it is refused, and whether the agent works on the Drift now. */
export interface DriftResolve {
  blocker: string | null;
  /** The host's reasons for this Drift's Resolve, without «The agent is still finishing»; null when it has none. */
  hostReason?: string | null;
  resolving: boolean;
}

/** Why the arrow of «Dismiss Drift» is disabled: the reasons of Dismiss Drift, in their order, then those of Resolve. */
export function driftReworkBlocker(dismiss: string | null, resolveReasons: string | null): string | null {
  return joinReasons([dismiss, resolveReasons]);
}

/** A Drift's card. `resolve` says why its Resolve is refused and whether the agent is resolving it now. */
export function driftCard(d: DriftView, numbers: CardNumbers = noNumbers, dismissBlocker: string | null = null, resolve: DriftResolve = { blocker: null, resolving: false }, blocked: TaskCard[] = []): DriftCard {
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
    dismissBlocker,
    reworkBlocker: driftReworkBlocker(dismissBlocker, resolve.hostReason ?? null),
    resolving: resolve.resolving,
    resolveBlocker: resolve.blocker,
    blocked,
    notBlocking: notBlockingItems(d.notBlocking, numbers),
  };
}

export function taskCard(t: TaskView, numbers: CardNumbers = noNumbers, finishing: string | null = null, views: FocusViews = NO_VIEWS, peers: readonly TaskView[] = []): TaskCard {
  const name = namerOf(numbers);
  const blockedByDrifts = t.blockedBy.flatMap((b): DriftBlocker[] => (b.kind === "drift" ? [{ id: b.drift, key: cardKey("drift", b.drift), name: cardNameOf(numbers, "drift", b.drift), title: b.title }] : []));
  const waitingFor = t.blockedBy.flatMap((b): FixWait[] => {
    if (b.kind !== "fix") return [];
    const fix = peers.find((p) => p.id === b.task);
    return [{ id: b.task, key: cardKey("task", b.task), name: cardNameOf(numbers, "task", b.task), title: b.title, column: fix?.column ?? "todo", agent: fix?.agent ?? false, drift: { id: b.drift, name: cardNameOf(numbers, "drift", b.drift), title: b.driftTitle } }];
  });
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
    progress: t.progress,
    blockedByDrifts,
    waitingFor,
    blockedBy: t.blockedBy,
    body: t.body,
    images: t.images,
    file: t.file,
    column: t.column,
    finishing,
    views,
  };
}

/** The six colours of Tailwind's palette a tag can wear, in the order the hash picks them. */
export const TAG_COLOURS = ["blue", "green", "amber", "fuchsia", "cyan", "red"] as const;

export type TagColour = (typeof TAG_COLOURS)[number];

/** A stable colour for a tag, from the hash of its label text: the same label always wears the same colour. */
export function tagColour(label: string): TagColour {
  let hash = 0;
  for (const ch of label) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return TAG_COLOURS[hash % TAG_COLOURS.length]!;
}

/** What the panel knows of Resolve Drifts for the Board: why it is refused, why each Drift's Resolve is, and the Drifts being resolved. */
export interface BoardResolve {
  /** Why Resolve Drifts is refused now, or null when it works. */
  blocker: string | null;
  /** Why the Resolve of each open Drift is refused, by Drift ID; a Drift missing from it works. */
  drifts: Readonly<Record<string, string | null>>;
  /** The open Drifts the running resolution works on: they stay in Blocked with a Resolving badge. */
  resolving: readonly string[];
}

export const NO_RESOLVE: BoardResolve = { blocker: null, drifts: {}, resolving: [] };

/**
 * Why «Resolve» is disabled on one open Drift's card, or null when it works: every reason that holds, in order: the agent
 * that filed the Drift is still finishing, then the host's reasons for that Drift (an agent is resolving this Drift or Drifts
 * are being resolved, a run is in progress, a resolution Proposal awaits a decision).
 */
export function resolveBlocker(driftId: string, finishingDrifts: readonly string[], resolve: Pick<BoardResolve, "drifts">): string | null {
  return joinReasons([finishingBlocker(driftId, finishingDrifts), resolve.drifts[driftId] ?? null]);
}

/** Sorts items by creation, oldest first, as the Board Requirement says. */
const byCreation = <T extends { id: string; created: string | null }>(items: T[]): T[] => items.sort(compareByCreation);

/**
 * The card columns of the Board. Backlog holds the open Proposals and the red cards of the open Drifts outside a delivered resolution, in one creation order;
 * Active every Task in To do or In progress, blocked ones included; System Activities no real card (only the ghosts stand there). Done Tasks have no card,
 * and the History column lists them apart.
 */
export function buildBoard(snapshot: Snapshot, resolve: BoardResolve = NO_RESOLVE, models: BoardModels = NO_MODELS): BoardColumn[] {
  const numbers = snapshot.numbers ?? noNumbers;
  // A Drift a delivered resolution lists is decided on that Proposal's card, so it has no card of its own.
  const delivered = new Set(snapshot.proposals.filter((p) => p.kind === "resolution").flatMap((p) => p.resolves.map((r) => r.drift)));
  const tasks = new Map<string, TaskCard>(snapshot.tasks.map((t): [string, TaskCard] => [t.id, taskCard(t, numbers, finishingBlocker(t.id, snapshot.finishingTasks), t.column === "done" ? NO_VIEWS : focusViews(snapshot, { kind: "task", id: t.id }), snapshot.tasks)]));
  // The Tasks blocked by an open Drift and not taken by the agent, by the Drift they wait for.
  const underDrift = new Map<string, TaskCard[]>();
  for (const card of tasks.values()) {
    if (card.agent) continue;
    for (const b of card.blockedBy) {
      if (b.kind === "drift") underDrift.set(b.drift, [...(underDrift.get(b.drift) ?? []), card]);
    }
  }
  const backlog = byCreation<{ id: string; created: string | null; card: Card }>([
    ...snapshot.proposals.map((p) => ({ id: p.id, created: p.created, card: proposalCard(p, numbers, underDrift, snapshot.finishingProposals, models, focusViews(snapshot, { kind: "proposal", id: p.id }), resolve.blocker) as Card })),
    ...snapshot.drifts
      .filter((d) => !delivered.has(d.id))
      .map((d) => ({ id: d.id, created: d.created, card: driftCard(d, numbers, dismissBlocker(d.id, snapshot.resolutionDrifts, resolve.blocker, snapshot.finishingDrifts), { blocker: resolveBlocker(d.id, snapshot.finishingDrifts, resolve), hostReason: resolve.drifts[d.id] ?? null, resolving: resolve.resolving.includes(d.id) }, underDrift.get(d.id) ?? []) as Card })),
  ]);
  // A blocked Task keeps its card in Active, with its blocked and waiting badges.
  const active: Card[] = [...tasks.values()].filter((card) => card.column !== "done");
  const cards: Record<CardColumnId, Card[]> = {
    backlog: backlog.map((x) => x.card),
    active,
    system: [],
  };
  return CARD_COLUMNS.map((id) => ({ id, title: COLUMN_TITLES[id], hint: EMPTY_HINTS[id], cards: cards[id] }));
}

/** The number on the Board tab: the cards of Backlog. Ghosts do not count. */
export function boardDecisionCount(columns: readonly BoardColumn[]): number {
  return columns.find((column) => column.id === "backlog")?.cards.length ?? 0;
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

const ANNOUNCED_KIND_LABELS: Record<AnnouncementView["kind"], string> = { proposal: "Proposal", task: "Task", drift: "Drift", check: "Check", scan: "Scan", resolve: "Resolve", work: "Import", comparison: "Compare" };

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
    : a.kind === "comparison"
      ? `Agent comparing the code: ${title}`
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

/** The sentence the notice of a Run that ended without the Advisor's final review shows; the reason is English whatever `trama.language` says. */
export const finalReviewMissingNotice = (reason: string): string => `The Run finished without the Advisor's final review: ${reason}.`;

/** The sentence the notice of a job or Task the run control stopped following shows; English whatever `trama.language` says. */
export const stoppedFollowingNotice = (subject: string, reason: string): string => `Trama stopped following ${subject}: ${reason}.`;

export interface PlacedGhost {
  card: AnnouncedCard;
  /** Among the column's real cards: the ghost stands before the real card at this position, or last when it is past the end. */
  index: number;
}

/** The column the ghosts stand in: System Activities, which has no real card. */
export const GHOST_COLUMN: ColumnId = "system";

/** The ghosts of all the announced cards, whatever their kind, in the order announced, in `GHOST_COLUMN`. */
export function announcedGhosts(announcements: AnnouncementView[], asking: boolean): PlacedGhost[] {
  return announcements.map((a) => ({ card: announcedCard(a, asking), index: 0 }));
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
