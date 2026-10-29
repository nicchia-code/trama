// Pure logic of the Board: no DOM. Turns a Snapshot into columns of cards.
import type { FileChange } from "../../../../src/core/diff";
import { ghostColumn } from "../../../../src/core/ghost-column";
import { formatDiagnostic } from "../../../../src/core/model";
import { compareByCreation } from "../../../../src/core/schema";
import { driftsWithCard } from "../../../../src/core/board-decisions";
import { joinReasons, RUN_IN_PROGRESS } from "../../../../src/core/design";
import type { Blocker } from "../../../../src/core/blocking";
import type { AnnouncementView, DriftView, HistoryView, ProposalTag, ProposalView, Snapshot, TaskImageView, TaskView } from "../../../../src/core/snapshot";
import type { Column, FocusRequest, RefinementView, RunEstimateView } from "../../protocol";
import { appliesUnder, requiredReasons } from "../../../../src/core/required";
import { focusStepCount } from "../focus/steps";
import { dismissBlocker } from "../dismiss";
import { type CardName, cardNameOf, type CardNumbers, namerOf, noNumbers } from "../../../../src/core/card-names";
import type { BoardModels, BoardProposalModel } from "../../host/proposal-models";

/** The models of no Proposal: the Board draws them as none chosen and none choosable. */
export const NO_MODELS: BoardModels = { proposals: {} };

/** The columns of the Board, in order: all hold cards. */
export type CardColumnId = "backlog" | "active" | "done";

export type ColumnId = CardColumnId;

export const CARD_COLUMNS: readonly CardColumnId[] = ["backlog", "active", "done"];

export const COLUMN_ORDER: readonly ColumnId[] = CARD_COLUMNS;

export const COLUMN_TITLES: Record<ColumnId, string> = {
  backlog: "Backlog",
  active: "Active",
  done: "Done",
};

export const EMPTY_HINTS: Record<ColumnId, string> = {
  backlog: "Nothing to decide",
  active: "Nothing active",
  done: "Nothing done yet",
};

/** The empty text of the History view for the period it shows. */
export const HISTORY_EMPTY = "Nothing done in this period";

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
  /** The name read by assistive technology when it is not the visible label; the tooltip otherwise. */
  accessibleName?: string;
  tone: "primary" | "info" | "warning" | "error";
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
  /** The `drift` of the difference of a unified Drift this row decides; null for any other Drift. Then `title` is the difference's. */
  difference: string | null;
  name: CardName;
  title: string;
  /** The Drift this one follows, as its identity and title, when it is recurring. */
  previous: { id: string; title: string }[];
  /** The Drifts this one unifies, when it is a unified Drift. */
  unifies: { id: string; title: string }[];
  /** True for a Drift from a merge. */
  merge: boolean;
  decision: string;
  /** The Tasks this Drift blocks, shown under its row. */
  blocked: TaskCard[];
}

/** How a followed Drift was decided, in words, for the list of a recurring Drift's details. */
export const decisionLabel = (decision: DriftView["previous"][number]["decision"]): string =>
  decision === "fix-code" ? "Code fixed" : decision === "proposal" ? "Model updated to match the code" : decision === "dismissed" ? "Closed, nothing changes" : decision === "unified" ? "Unified" : "Not decided";

/** The secondary text of the red card of a unified Drift with differences: how many are still open, also its accessible description. Null for a Drift without differences (an older unified Drift counts as no difference). */
export const differencesOpenLabel = (drift: Pick<DriftView, "differences">): string | null =>
  drift.differences.length === 0 ? null : `${drift.differences.filter((d) => d.open).length} of ${drift.differences.length} open`;

/** The state of a difference in its block header: `Open`, or how it was decided. */
export const differenceStateLabel = (difference: Pick<DriftView["differences"][number], "decision">): string =>
  difference.decision === null ? "Open" : difference.decision === "fix-code" ? "Fix code" : difference.decision === "proposal" ? "Adapt model" : "Dismissed";

/** The text of a unified Drift's badge, its tooltip and accessible name: how many Drifts it unifies. */
export const unifiedLabel = (count: number): string => `Unifies ${count} Drifts`;

/** The text of a recurring Drift's badge, its tooltip and accessible name: the identity and title of the Drift it follows, or how many it follows. */
export const recurringLabel = (previous: readonly { id: string; title: string }[]): string =>
  previous.length === 1 ? `Recurring: follows Drift ${previous[0]?.id} – ${previous[0]?.title}` : `Recurring: follows ${previous.length} Drifts`;

/** The text of a merge Drift's tooltip and accessible name: its badge says `Merge`. */
export const MERGE_LABEL = "From a merge: the code may be right, keeping it is recommended";

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
  /** What Approve does on a Proposal the refinement touches, as its tooltip when it works; null otherwise. */
  approveHint: string | null;
  /** Where the Proposal stands in the refinement; null when the refinement does not touch it. */
  refine: RefineStatus | null;
  /** The phase line of a Proposal the agent refines now; null otherwise. */
  refinePhase: string | null;
  /** The latest note of the agent refining this Proposal; null when it has none or it does not refine it. */
  refineNote: string | null;
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
  /** Whether the Unify Drifts agent gathered this Drift and works on it now: it stays in Backlog with an Unifying badge. */
  unifying: boolean;
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
  /** The tag the Board shows on the Task: the Proposal's label, or its shortened title; null when the Task has none or the Proposal is gone. */
  proposalTag: ProposalTag | null;
  /** How the Proposal is written, named by its identity or number; the tag falls back to it. */
  proposalName: CardName | null;
  /** True while the agent has taken the Task. */
  agent: boolean;
  /** The open Drifts that block the Task, in creation order; empty when none does. */
  blockedByDrifts: DriftBlocker[];
  /** The fix Tasks the Task waits for; empty when it waits for none. */
  waitingFor: FixWait[];
  /** What blocks the Task, as the snapshot carries it. */
  blockedBy: Blocker[];
  /** Why the Task's Run waits: the agent that filed the Task is still finishing its turn. Null when it is not waiting. */
  finishing: string | null;
  /** Whether an open Drift holds the Task in To do, so Delete refuses it (from the snapshot: the webview does not recompute the rule). */
  heldByDrift: boolean;
  /** The Task's text after its title, in Markdown; empty when it has none. */
  body: string;
  /** The images the Task carries, in the order they were tied; the details show them under the body. */
  images: TaskImageView[];
  /** Path relative to `.trama/`. */
  file: string;
  column: Column;
  /** Which View buttons the card has: each shows only when its tab would have at least one step of the Task's focus (`rules#focus`). */
  views: FocusViews;
  /** When the Task arrived in Done, UTC ISO 8601; null outside Done and on Tasks that reached Done before the instant was kept. */
  finished: string | null;
  /** The note of a Task closed without changes; null otherwise. */
  unchanged: string | null;
  /** The open Drifts that name the Task as their origin or as the Task that fixes their code, in creation order: Clear leaves the Task in Done while any is open. */
  keptBy: CardName[];
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

/** The reason a Proposal cannot be approved, or null. Mirrors what the host refuses: while a Run of this window is in progress, Approve waits for it. */
export function approveBlocker(p: Pick<ProposalView, "stale" | "unbased" | "errors" | "unfixable" | "requires">, numbers: CardNumbers = noNumbers, runInProgress = false): string | null {
  return joinReasons([runInProgress ? RUN_IN_PROGRESS : null, ownApproveBlocker(p, numbers)]);
}

/** The reasons of the Proposal itself that block its approval, without the Run. */
function ownApproveBlocker(p: Pick<ProposalView, "stale" | "unbased" | "errors" | "unfixable" | "requires">, numbers: CardNumbers): string | null {
  if (p.requires.length > 0) return `Approve the required Proposals first:\n${listed(requiredReasons(p.requires, (id) => namerOf(numbers)("proposal", id)))}`;
  if (p.stale.length > 0) return "Stale: the Model changed since this Proposal touched it. Ask the agent for a new Proposal.";
  if (p.unbased.length > 0) return "Some files were never registered with the Proposal.";
  if (p.errors.length > 0) return "Applying this Proposal would leave the Model or its Requirements invalid.";
  if (p.unfixable.length > 0) return `Cannot be approved, nothing changed:\n${listed(p.unfixable)}\nHave Resolve Drifts rewrite the resolution.`;
  return null;
}

/** The refinement of the Proposals is off: the Board and the diagram draw them as before. */
export const REFINEMENT_OFF: RefinementView = { enabled: false, running: [], queued: [], notes: {}, runInProgress: false, waiting: [], refineAll: { mode: "refine", count: 0, blockers: ["Turn on Auto-update Stale Proposals in Settings", "No Proposal to refine"] } };

/** The wait after the click on Refine All before Cancel Refine All can be chosen. */
export const CANCEL_REFINE_ALL_DELAY_MS = 2000;

/** The text of the tooltip's first line while the Run all estimate is being worked out. */
export const ESTIMATING_TEXT = "Estimating time left…";

/** The text of the button during a Run all. */
export const RUNNING_TEXT = "Running…";

/** The text of the button when the Run all lasts longer than its reference. */
export const OVER_TEXT = "Taking longer than expected";

/** An hour count rounded to the half hour, at least half an hour, written with a dot: `1`, `2.5`. */
const hoursText = (minutes: number): string => String(Math.max(0.5, Math.round((minutes / 60) * 2) / 2));

/**
 * The range of a Run all estimate as words, rounded as the host's Requirements say: with a high limit under 60 minutes both
 * limits go to the minute, at least 1; from 60 minutes up both go to the half hour, at least half an hour. Equal limits are written once.
 */
function estimateRange(low: number, high: number): { text: string; spoken: string } {
  const hours = high >= 60;
  const [from, to] = hours ? [hoursText(low), hoursText(high)] : [String(Math.max(1, Math.round(low))), String(Math.max(1, Math.round(high)))];
  const unit = hours ? "h" : "min";
  const spokenUnit = hours ? "hours" : "minutes";
  if (from === to) return { text: `~${from} ${unit} left`, spoken: `about ${from} ${spokenUnit} left` };
  return { text: `~${from}–${to} ${unit} left`, spoken: `about ${from} to ${to} ${spokenUnit} left` };
}

/** What the `Run all` button shows while a Run all launched from this window goes on. */
export interface RunAllButtonText {
  /** The visible text of the button: no number. */
  label: string;
  /** The first line of the tooltip: the estimate as it is now, even when the button says it takes longer than expected. */
  tooltipHead: string;
  /** The accessible name of the button. */
  aria: string;
  /** The loading bar inside the button: `"indeterminate"` while the estimate is worked out, otherwise its width in whole percent. */
  bar: "indeterminate" | number;
}

/**
 * The text, the first tooltip line, the accessible name and the bar of `Run all` for the estimate the host sends; null without a
 * Run all (the button is then the usual one). The texts are English and do not follow `trama.language`.
 */
export function runAllButtonText(estimate: RunEstimateView): RunAllButtonText | null {
  if (estimate === null) return null;
  if ("estimating" in estimate) return { label: RUNNING_TEXT, tooltipHead: ESTIMATING_TEXT, aria: "Run all, estimating time left", bar: "indeterminate" };
  const range = estimateRange(estimate.low, estimate.high);
  const percent = Math.round(estimate.done * 100);
  if (estimate.over) return { label: OVER_TEXT, tooltipHead: range.text, aria: `Run all, ${percent} percent done, taking longer than expected`, bar: percent };
  return { label: RUNNING_TEXT, tooltipHead: range.text, aria: `Run all, ${percent} percent done, ${range.spoken}`, bar: percent };
}

/**
 * The second entry of the menu of `+ Add Work Item`, as the host's `refineAll` says: `Refine All (<count>)` (`Refine All` with none), disabled with the host's reasons;
 * with Refine All in progress `Cancel Refine All`, disabled with no written reason until `cancelReady`. `message` is what choosing it sends.
 */
export function refineAllEntry(refineAll: RefinementView["refineAll"], cancelReady: boolean): { label: string; description: string; disabled: boolean; reason: string; message: "refineAll" | "cancelRefineAll" } {
  if (refineAll.mode === "cancel") return { label: "Cancel Refine All", description: "Take every waiting Proposal out of the refining queue", disabled: !cancelReady, reason: "", message: "cancelRefineAll" };
  return {
    label: refineAll.count === 0 ? "Refine All" : `Refine All (${refineAll.count})`,
    description: "Refine every stale design Proposal on the current Model, then approve it",
    disabled: refineAll.blockers.length > 0,
    reason: refineAll.blockers.join("\n"),
    message: "refineAll",
  };
}

/** Why Approve and Reject wait while the agent refines this Proposal. */
export const REFINING_REASON = "The agent is refining this Proposal";
/** Why Approve waits on a Proposal already in the refining queue. */
export const QUEUED_REASON = "Already queued for refining";
/** The tooltip of the `waiting for the run` badge: a refined Proposal that Trama approves once the Run in progress ends. */
export const WAITING_RUN_TIP = "Refined; Trama approves it when the run in progress ends";
/** Why Reject waits on a Proposal whose refining stopped before its hand-over: Approve resumes it. */
export const RESUME_REASON = "Approve to resume refining first";
/** Why Approve, Reject and the arrow of Reject wait on a Draft left half-way that nothing writes, with Auto-update Stale Proposals off. */
export const STILL_WRITTEN_REASON = "Still being written. Turn on Auto-update Stale Proposals to resume refining";
/** The tooltip and accessible name of the `to refine` chip of that Draft. */
export const PAUSED_TIP = "Refining stopped before the hand-over. Turn on Auto-update Stale Proposals to resume it.";
/** The tooltip of the `to refine` badge, and of Approve when it refines the Proposal first. */
export const TO_REFINE_TIP = "The Model changed under this Proposal. Approve refines it on the current Model, then approves it.";

/**
 * Where a Proposal stands in the refinement, or null when the refinement does not touch it (a Proposal the Model did not
 * change): `running` the one a refinement of this window writes now, `elsewhere` a Draft some other agent writes (its `writer`
 * is set: another window, an agent started before the editor was reopened, a refinement launched by hand), `queued` one waiting
 * for a refinement, `stopped` a Draft whose refining stopped before its hand-over, `paused` the same Draft with Auto-update Stale
 * Proposals off (nothing resumes it), `to-refine` a stale open Proposal that Approve refines first. A Draft written by an
 * agent is never `queued`, `stopped` or `paused`, with the function on or off.
 */
export function refineStatus(p: Pick<ProposalView, "id" | "stale" | "refining" | "writer">, refinement: RefinementView): RefineStatus | null {
  if (refinement.running.includes(p.id)) return "running";
  if (p.writer !== null) return "elsewhere";
  if (!refinement.enabled) return p.refining ? "paused" : null;
  if (refinement.queued.some((entry) => entry.proposal === p.id)) return "queued";
  if (p.refining) return "stopped";
  return p.stale.length > 0 ? "to-refine" : null;
}

export type RefineStatus = "running" | "elsewhere" | "queued" | "stopped" | "paused" | "to-refine";

/** Whether an agent is writing the Proposal now: its card is drawn as in refining. */
export const isRefining = (status: RefineStatus | null): boolean => status === "running" || status === "elsewhere";

/**
 * Why Approve is disabled on a Proposal the refinement touches. Stale, unbased, invalid and unfixable do not block a Proposal
 * that is refined or to refine: the refinement settles them. Only the required Proposals and the finishing of the agent that
 * filed it do. A Draft written by an agent, or left half-way with the function off, says so before the Run and every other reason.
 */
export function refineApproveBlocker(status: RefineStatus, p: Pick<ProposalView, "stale" | "unbased" | "errors" | "unfixable" | "requires">, numbers: CardNumbers, refinement: RefinementView): string | null {
  if (isRefining(status)) return joinReasons([REFINING_REASON, refinement.runInProgress ? RUN_IN_PROGRESS : null]);
  if (status === "paused") return joinReasons([STILL_WRITTEN_REASON, approveBlocker(p, numbers, refinement.runInProgress)]);
  if (status === "queued") return joinReasons([refinement.runInProgress ? RUN_IN_PROGRESS : null, QUEUED_REASON]);
  return approveBlocker({ requires: p.requires, stale: [], unbased: [], errors: [], unfixable: [] }, numbers, refinement.runInProgress);
}

/** Why Reject and the arrow of Reject are disabled on a Proposal, after the reason `finishing` of the agent that filed it (null when it is done). */
export function refineRejectBlocker(status: RefineStatus | null, finishing: string | null): string | null {
  return joinReasons([finishing, isRefining(status) ? REFINING_REASON : status === "paused" ? STILL_WRITTEN_REASON : status === "stopped" ? RESUME_REASON : null]);
}

/**
 * The reasons Approve and Reject are disabled on a Proposal, computed once for the Board's card and the Diagram's details: the
 * reason of the agent still finishing first, then those of a Draft written by an agent or left half-way (`refineApproveBlocker`),
 * then the Run and every other reason.
 */
export function decisionBlockers(p: Pick<ProposalView, "stale" | "unbased" | "errors" | "unfixable" | "requires">, status: RefineStatus | null, numbers: CardNumbers, refinement: RefinementView, finishing: string | null): { approve: string | null; reject: string | null } {
  return {
    approve: joinReasons([finishing, status === null ? approveBlocker(p, numbers, refinement.runInProgress) : refineApproveBlocker(status, p, numbers, refinement)]),
    reject: refineRejectBlocker(status, finishing),
  };
}

export function proposalBadges(p: Pick<ProposalView, "stale" | "unbased" | "errors" | "unfixable" | "requires" | "kind">, numbers: CardNumbers = noNumbers): Badge[] {
  const badges: Badge[] = [];
  if (p.kind === "import") badges.push({ label: "import", tone: "info", tooltip: "Describes existing code; approving it starts no Scan" });
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
  p.resolves.map((r) => ({ drift: r.drift, difference: r.difference, name: cardNameOf(numbers, "drift", r.drift), title: r.title, previous: r.previous, unifies: r.unifies, merge: r.merge, decision: r.note === null ? r.decision : `${r.decision} · ${r.note}`, blocked: blocked.get(r.drift) ?? [] }));

/** `Creates 1 Task` / `Creates N Tasks`, counting removals too; null for zero. */
export function createsText(n: number): string | null {
  return n === 0 ? null : `Creates ${n} ${n === 1 ? "Task" : "Tasks"}`;
}

export function proposalCard(p: ProposalView, numbers: CardNumbers = noNumbers, blocked: Map<string, TaskCard[]> = new Map(), finishing: readonly string[] = [], models: BoardModels = NO_MODELS, views: FocusViews = NO_VIEWS, resolveReason: string | null = null, refinement: RefinementView = REFINEMENT_OFF, asking = false): ProposalCard {
  const wait = finishingBlocker(p.id, finishing);
  const name = cardNameOf(numbers, "proposal", p.id);
  const choosable = Object.hasOwn(models.proposals, p.id);
  const refine = refineStatus(p, refinement);
  const queuedEntry = refinement.queued.find((entry) => entry.proposal === p.id);
  const queuedTip =
    queuedEntry === undefined || queuedEntry.waiting === "slot"
      ? "Waiting for a free refining slot"
      : `Waiting for ${queuedEntry.on === undefined ? "another Proposal" : namerOf(numbers)("proposal", queuedEntry.on)} to be ${queuedEntry.waiting === "approval" ? "approved" : "refined"} first`;
  const blockers = decisionBlockers(p, refine, numbers, refinement, wait);
  const refineBadge: Badge | null =
    refine === null
      ? null
      : isRefining(refine)
        ? { label: "refining", tone: "info", tooltip: "The agent is refining this Proposal on the current Model", accessibleName: "The agent is refining this Proposal on the current Model" }
        : refine === "queued"
          ? { label: "queued", tone: "info", tooltip: queuedTip, accessibleName: queuedTip }
          : refine === "stopped"
            ? { label: "to refine", tone: "primary", tooltip: "Refining stopped before the hand-over. Approve resumes it.", accessibleName: "Refining stopped before the hand-over. Approve resumes it." }
            : refine === "paused"
              ? { label: "to refine", tone: "primary", tooltip: PAUSED_TIP, accessibleName: PAUSED_TIP }
              : { label: "to refine", tone: "primary", tooltip: TO_REFINE_TIP };
  // Refined while a Run of this window was in progress: Trama approves it when that Run ends.
  const waitingRun: Badge | null = refinement.waiting.includes(p.id) ? { label: "waiting for the run", tone: "info", tooltip: WAITING_RUN_TIP, accessibleName: WAITING_RUN_TIP } : null;
  return {
    kind: "proposal",
    key: `proposal:${p.id}`,
    id: p.id,
    name,
    heading: p.kind === "resolution" ? `Resolution Proposal ${name.text}` : `Proposal ${name.text}`,
    title: p.title,
    body: p.body,
    resolution: p.kind === "resolution",
    badges: [...(refineBadge === null ? [] : [refineBadge]), ...(waitingRun === null ? [] : [waitingRun]), ...proposalBadges(refine === null ? p : { ...p, stale: [] }, numbers)],
    changes: summarizeChanges(p.changes),
    blocker: blockers.approve,
    approveHint: refine === "to-refine" ? "Refine it on the current Model, then approve it" : null,
    refine,
    refinePhase: isRefining(refine) ? (asking ? "Waiting for your answers" : "Refining") : null,
    refineNote: isRefining(refine) ? refinement.notes[p.id] ?? p.writer?.note ?? null : null,
    rejectBlocker: blockers.reject,
    reworkBlocker: joinReasons([blockers.reject, p.kind === "resolution" ? resolveReason : null]),
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
  /** Whether the Unify Drifts agent works on this Drift now. */
  unifying?: boolean;
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
    unifying: resolve.unifying === true,
    resolveBlocker: resolve.blocker,
    blocked,
  };
}

export function taskCard(t: TaskView, numbers: CardNumbers = noNumbers, finishing: string | null = null, views: FocusViews = NO_VIEWS, peers: readonly TaskView[] = [], keptBy: CardName[] = []): TaskCard {
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
    blockedByDrifts,
    waitingFor,
    blockedBy: t.blockedBy,
    body: t.body,
    images: t.images,
    file: t.file,
    column: t.column,
    finishing,
    heldByDrift: t.heldByDrift,
    views,
    finished: t.finished,
    unchanged: t.unchanged,
    keptBy,
  };
}

/** The six colours of Tailwind's palette a tag can wear, in the order the hash picks them. */
export const TAG_COLOURS = ["blue", "green", "amber", "violet", "cyan", "red"] as const;

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
  /** The open Drifts the Unify Drifts agent gathered and works on: their cards wear an Unifying badge. */
  unifying?: readonly string[];
  /** The Proposal refinement, as the host carries it; absent: off. */
  refinement?: RefinementView;
  /** Whether a question round is open: the refining Proposal's phase says so. */
  asking?: boolean;
}

export const NO_RESOLVE: BoardResolve = { blocker: null, drifts: {}, resolving: [], unifying: [] };

/** Why Resolve is disabled on a Drift the Unify Drifts agent works on, ahead of the host's reason. */
export const UNIFYING_REASON = "An agent is unifying this Drift";

/**
 * Why «Resolve» is disabled on one open Drift's card, or null when it works: every reason that holds, in order: the agent
 * that filed the Drift is still finishing, then the host's reasons for that Drift (an agent is resolving this Drift or Drifts
 * are being resolved, a run is in progress, a resolution Proposal awaits a decision).
 */
export function resolveBlocker(driftId: string, finishingDrifts: readonly string[], resolve: Pick<BoardResolve, "drifts" | "unifying">): string | null {
  return joinReasons([finishingBlocker(driftId, finishingDrifts), resolve.unifying?.includes(driftId) === true ? UNIFYING_REASON : null, resolve.drifts[driftId] ?? null]);
}

/** Sorts items by creation, oldest first, as the Board Requirement says. */
const byCreation = <T extends { id: string; created: string | null }>(items: T[]): T[] => items.sort(compareByCreation);

/** The open Drifts (given in the order the Snapshot carries them) by the Tasks they name, as origin or as the Task that fixes their code: each Task maps to the Drifts' names in creation order. */
export function keptTasks(drifts: readonly DriftView[], numbers: CardNumbers): Map<string, CardName[]> {
  const kept = new Map<string, CardName[]>();
  for (const drift of [...drifts].sort(compareByCreation)) {
    for (const task of new Set([...drift.origin, ...(drift.task === null ? [] : [drift.task])])) kept.set(task, [...(kept.get(task) ?? []), cardNameOf(numbers, "drift", drift.id)]);
  }
  return kept;
}

/** The cards of the Done column: the latest arrival first (`finished`); the Tasks with no instant come after all the others, in reverse creation order. A tie is broken by reverse creation order too. */
function doneCards(all: readonly TaskView[], cards: ReadonlyMap<string, TaskCard>): TaskCard[] {
  const done = all.filter((t) => t.column === "done");
  const finishedAt = (t: TaskView) => (t.finished === null ? Number.NaN : Date.parse(t.finished));
  return [...done]
    .sort((a, b) => {
      const [x, y] = [finishedAt(a), finishedAt(b)];
      if (Number.isNaN(x) !== Number.isNaN(y)) return Number.isNaN(x) ? 1 : -1;
      return (Number.isNaN(x) ? 0 : y - x) || compareByCreation(b, a);
    })
    .flatMap((t) => cards.get(t.id) ?? []);
}

/**
 * The card columns of the Board. Backlog holds the open Proposals and the red cards of the open Drifts outside a delivered resolution, in one creation order;
 * Active every Task in To do or In progress, blocked ones included; Done every Task in Done, the latest first.
 */
export function buildBoard(snapshot: Snapshot, resolve: BoardResolve = NO_RESOLVE, models: BoardModels = NO_MODELS): BoardColumn[] {
  const numbers = snapshot.numbers ?? noNumbers;
  // A Drift a delivered resolution lists is decided on that Proposal's card, so it has no card of its own (`driftsWithCard`).
  const keptBy = keptTasks(snapshot.drifts, numbers);
  const tasks = new Map<string, TaskCard>(snapshot.tasks.map((t): [string, TaskCard] => [t.id, taskCard(t, numbers, finishingBlocker(t.id, snapshot.finishingTasks), t.column === "done" ? NO_VIEWS : focusViews(snapshot, { kind: "task", id: t.id }), snapshot.tasks, keptBy.get(t.id) ?? [])]));
  // The Tasks blocked by an open Drift and not taken by the agent, by the Drift they wait for.
  const underDrift = new Map<string, TaskCard[]>();
  for (const card of tasks.values()) {
    if (card.agent) continue;
    for (const b of card.blockedBy) {
      if (b.kind === "drift") underDrift.set(b.drift, [...(underDrift.get(b.drift) ?? []), card]);
    }
  }
  const backlog = byCreation<{ id: string; created: string | null; card: Card }>([
    ...snapshot.proposals.map((p) => ({ id: p.id, created: p.created, card: proposalCard(p, numbers, underDrift, snapshot.finishingProposals, models, focusViews(snapshot, { kind: "proposal", id: p.id }), resolve.blocker, resolve.refinement, resolve.asking) as Card })),
    ...driftsWithCard(snapshot)
      .map((d) => ({ id: d.id, created: d.created, card: driftCard(d, numbers, dismissBlocker(d.id, snapshot.resolutionDrifts, resolve.blocker, snapshot.finishingDrifts), { blocker: resolveBlocker(d.id, snapshot.finishingDrifts, resolve), hostReason: resolve.drifts[d.id] ?? null, resolving: resolve.resolving.includes(d.id), unifying: resolve.unifying?.includes(d.id) === true }, underDrift.get(d.id) ?? []) as Card })),
  ]);
  // A blocked Task keeps its card in Active, with its blocked and waiting badges.
  const active: Card[] = [...tasks.values()].filter((card) => card.column !== "done");
  const cards: Record<CardColumnId, Card[]> = {
    backlog: backlog.map((x) => x.card),
    active,
    done: doneCards(snapshot.tasks, tasks),
  };
  return CARD_COLUMNS.map((id) => ({ id, title: COLUMN_TITLES[id], hint: EMPTY_HINTS[id], cards: cards[id] }));
}

/** The Tasks `Clear` deletes: every card of Done except the ones with the `kept` badge (an open Drift names them). */
export const clearableTasks = (done: readonly Card[]): string[] => done.flatMap((card) => (card.kind === "task" && card.keptBy.length === 0 ? [card.id] : []));

/**
 * The columns with the cards `Clear` is deleting taken out of Done: the Tasks in `hidden`, from the click until the host says it is done. A `kept` card is never hidden.
 * What the column shows (its number, its groups by day, `Nothing done yet`, the state of `Clear`) is computed from the cards left, so it follows them. With nothing hidden the columns are returned as they are.
 */
export function hideCleared(columns: readonly BoardColumn[], hidden: readonly string[]): BoardColumn[] {
  if (hidden.length === 0) return [...columns];
  const gone = new Set(hidden);
  return columns.map((column) => (column.id === "done" ? { ...column, cards: column.cards.filter((card) => !(card.kind === "task" && card.keptBy.length === 0 && gone.has(card.id))) } : column));
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

/** The heading of a local day, as the History and the Done column group by it: `Today`, `Yesterday`, then the date in full. */
const dayLabel = (day: number, now: Date, locale?: string): string =>
  day === dayStart(now) ? "Today" : day === dayStart(now, 1) ? "Yesterday" : new Date(day).toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });

/**
 * The History view for a period: the entries whose `updated` day the period lets through, the latest updated first
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
  const groups: { key: string; label: string; entries: HistoryView[] }[] = [];
  for (const { entry, time } of dated) {
    const day = dayStart(new Date(time));
    const key = `day:${day}`;
    const last = groups[groups.length - 1];
    if (last?.key === key) last.entries.push(entry);
    else groups.push({ key, label: dayLabel(day, now, locale), entries: [entry] });
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

/** One day of the Done column: its heading (`Today · 3`, `Earlier · 2` for the Tasks with no instant) and its cards. */
export interface DoneGroup {
  key: string;
  heading: string;
  cards: TaskCard[];
}

/** The cards of the Done column (already latest first) grouped by the local day they finished, with the headings of the History; the Tasks with no instant go last, under `Earlier`. An empty group is not listed. */
export function doneGroups(cards: readonly Card[], now: Date = new Date(), locale?: string): DoneGroup[] {
  const groups: { key: string; label: string; cards: TaskCard[] }[] = [];
  const earlier: TaskCard[] = [];
  for (const card of cards) {
    if (card.kind !== "task") continue;
    const time = card.finished === null ? Number.NaN : Date.parse(card.finished);
    if (Number.isNaN(time)) {
      earlier.push(card);
      continue;
    }
    const day = dayStart(new Date(time));
    const key = `day:${day}`;
    const last = groups[groups.length - 1];
    if (last?.key === key) last.cards.push(card);
    else groups.push({ key, label: dayLabel(day, now, locale), cards: [card] });
  }
  if (earlier.length > 0) groups.push({ key: "earlier", label: "Earlier", cards: earlier });
  return groups.map((g) => ({ key: g.key, heading: `${g.label} · ${g.cards.length}`, cards: g.cards }));
}

/** A card the agent is about to create, or a check it is doing, as the Board draws its ghost. */
export interface AnnouncedCard {
  /** Stable per announcement, so the same node is reused while it is only updated. */
  key: string;
  kind: AnnouncementView["kind"];
  /** "Proposal", "Task", "Drift", "Check", "Scan", "Resolve", "Unify", "Import" or "Compare". */
  kindLabel: string;
  title: string;
  /** "Preparing", "Writing", "Writing the Proposal", or "Waiting for your answers" while a question round is open; for a check, its own phase. */
  phase: string;
  /** What assistive technology reads: the kind, the title and the phase. */
  label: string;
  /** The note the ghost shows under its phase: the latest the agent declared, or null when it declared none. */
  note: string | null;
  /** What the details explain, chosen by kind and phase. */
  explanation: string;
  /** The notes of the agent, newest first, each with its time (`HH:MM`, local). */
  notes: GhostNote[];
  /** When the announcement was born, UTC ISO 8601: the details measure how long the work has gone on. */
  announced: string;
}

const ANNOUNCED_KIND_LABELS: Record<AnnouncementView["kind"], string> = { proposal: "Proposal", task: "Task", drift: "Drift", check: "Check", scan: "Scan", resolve: "Resolve", unify: "Unify", work: "Import", comparison: "Compare" };

/** A check shows its own phase, which an open question round does not change. */
export const announcedPhase = (phase: AnnouncementView["phase"], asking: boolean): string =>
  phase === null ? "" : phase === "verifying" ? "Verifying (tests, lint, build)" : phase === "scanning" ? "Scanning" : phase === "history" ? "Updating History" : asking ? "Waiting for your answers" : phase === "writing" ? "Writing" : phase === "writing-proposal" ? "Writing the Proposal" : "Preparing";

/** A note of the agent as the details show it. */
export interface GhostNote {
  text: string;
  /** UTC ISO 8601. */
  at: string;
  /** `HH:MM`, local. */
  time: string;
}

/** The time of a note, as the details show it: hours and minutes, local. */
export const noteTime = (at: string, locale?: string): string => new Date(at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** The notes of an announcement (oldest first) as the details list them: newest first. */
export const ghostNotes = (notes: AnnouncementView["notes"], locale?: string): GhostNote[] => [...notes].reverse().map((n) => ({ text: n.text, at: n.at, time: noteTime(n.at, locale) }));

/** How long a ghost has been running, as the details say it: `less than a minute`, `<n> min`, `<h> h <m> min`. */
export function runningFor(announced: string, now: Date = new Date()): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - Date.parse(announced)) / 60_000));
  if (!Number.isFinite(minutes) || minutes < 1) return "less than a minute";
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

const WAITING_EXPLANATION = "The agent is waiting for your answers to its questions.";

/** What the details explain about a ghost, by its kind and phase; `asking` is whether a question round is open (it does not change a check, an import, a comparison or Unify Drifts). */
export function ghostExplanation(a: AnnouncementView, asking: boolean): string {
  if (a.kind === "check" || a.kind === "scan")
    return a.phase === "history"
      ? "The agent is writing the History entries of the finished Tasks."
      : a.phase === "scanning"
        ? "The agent is comparing the code with the Model and the Requirements."
        : "The agent is running the final checks of the run: tests, lint and build.";
  if (a.kind === "comparison") return "A comparison of one Machine with the code; its Tasks and Drifts arrive together.";
  if (a.kind === "work") return "The agent is describing the existing code as Proposals.";
  if (asking && a.kind !== "unify") return WAITING_EXPLANATION;
  switch (a.kind) {
    case "proposal":
      return a.phase === "writing" ? "The agent is writing this Proposal's Draft; it lands in Backlog when handed over." : "The agent is exploring the Model and the code for this design; nothing is written yet.";
    case "drift":
      return a.phase === "writing-proposal" ? "The agent is writing the Proposal this Drift will carry." : "The agent is preparing a Drift: a difference between the code and the Model that you will decide on.";
    case "task":
      return "The agent is preparing a Task; it lands in Active.";
    case "resolve":
      return "The agent is preparing the resolution of this Drift; it lands in Backlog for you to approve.";
    default:
      return "The agent is merging these Drifts into one unified Drift.";
  }
}

export function announcedCard(a: AnnouncementView, asking: boolean): AnnouncedCard {
  const kindLabel = ANNOUNCED_KIND_LABELS[a.kind];
  // The Draft Unify Drifts' agent attaches is just «Writing» on its ghost.
  // Unify Drifts asks the developer nothing, not even when the Async Drift Resolver writes the prepared round of the unified Drift: its ghost keeps its own phases.
  const phase = announcedPhase(a.kind === "unify" && a.phase === "writing-proposal" ? "writing" : a.phase, asking && a.kind !== "unify");
  const title = a.title;
  const isCheck = a.kind === "check" || a.kind === "scan";
  const label = isCheck
    ? `Agent checking the code: ${title}, ${phase}`
    : a.kind === "comparison"
      ? `Agent comparing the code: ${title}`
    : a.kind === "resolve"
      ? `Agent resolving Drifts: ${title}, ${phase}`
      : a.kind === "unify"
        ? `Agent unifying Drifts: ${title}, ${phase}`
      : a.kind === "work"
        ? "Agent importing the code"
        : `${kindLabel} the agent is creating, ${phase.toLowerCase()}: ${title}`;
  const notes = ghostNotes(a.notes);
  return { key: `announced:${a.id}`, kind: a.kind, kindLabel, title, phase, label, note: notes[0]?.text ?? null, explanation: ghostExplanation(a, asking), notes, announced: a.announced };
}

/** The sentence the notice of a withdrawn announcement shows: a check was not finished, a card was not delivered; a Resolve Drifts ghost is a Proposal. */
export const withdrawnNotice = (a: AnnouncementView): string =>
  a.kind === "check" || a.kind === "scan" ? `The agent stopped before finishing ${a.title}.` : `The agent finished without delivering ${a.kind === "resolve" ? "Proposal" : ANNOUNCED_KIND_LABELS[a.kind]} ${a.title}.`;

/** The sentence the notice of a job or Task the run control stopped following shows; English whatever `trama.language` says. */
export const stoppedFollowingNotice = (subject: string, reason: string): string => `Trama stopped following ${subject}: ${reason}.`;

export interface PlacedGhost {
  card: AnnouncedCard;
  /** The column the ghost stands in. */
  column: CardColumnId;
  /** Among the column's real cards: the ghost stands before the real card at this position, or last when it is past the end. */
  index: number;
}

/** An index past the end of any column: the ghost stands after the real cards. */
const AT_THE_BOTTOM = Number.MAX_SAFE_INTEGER;

/** The ghosts of the announced cards that have a column (see `ghostColumn`), at the bottom of that column, in the order announced; the ghosts with no column are left out. */
export function announcedGhosts(announcements: AnnouncementView[], asking: boolean): PlacedGhost[] {
  return announcements.flatMap((a) => {
    const column = ghostColumn(a.kind);
    return column === "none" ? [] : [{ card: announcedCard(a, asking), column, index: AT_THE_BOTTOM }];
  });
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
