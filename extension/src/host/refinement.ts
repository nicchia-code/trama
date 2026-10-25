import type { Announcement } from "../../../src/core/announcements";
import type { QueuedRefinement, RefinementView } from "../protocol";
import { shareSeats } from "./run-groups";

/** One refinement at work: the Proposal, the sub-agent places it holds from its start to its end, the job (its terminal or omp Chat conversation) and whether the Proposal was delivered during the job. */
export interface RefinementJob {
  proposal: string;
  seats: number;
  /** The identity of the job: the work of its terminal or its conversation. A signal of any other job is not about this refinement. */
  job: string;
  /** The `proposal-delivered` notice of the Proposal came in during this job. */
  delivered: boolean;
}

/** The Proposal refinement of one editor window. Memory only: a reopened window starts empty. */
export interface RefinementState {
  /** Proposals waiting to start, in Backlog order. */
  queued: string[];
  /** The refinements at work, by Proposal, in the order they started. */
  running: ReadonlyMap<string, RefinementJob>;
  /** Proposals delivered and refined, approved only when the Run launched from this window ends; in Backlog order. */
  waiting: string[];
  /** The instant of the click on Refine All while it is in progress; null otherwise. It is in progress while the queue holds a Proposal that waits to start. */
  refineAllSince: number | null;
}
export const NO_REFINEMENT: RefinementState = { queued: [], running: new Map(), waiting: [], refineAllSince: null };

/** The delay after the click on Refine All before Cancel Refine All works. */
export const CANCEL_REFINE_ALL_DELAY_MS = 2000;
/** Why Refine All is unavailable, in the order they are listed. */
export const REFINE_ALL_OFF = "Turn on Auto-update Stale Proposals in Settings";
export const REFINE_ALL_NONE = "No Proposal to refine";

/** The queue changes; Refine All is over once nothing waits to start. */
function withQueue(state: RefinementState, queued: string[]): RefinementState {
  return { ...state, queued, refineAllSince: queued.length === 0 ? null : state.refineAllSince };
}

/** Adds `ids` to the queue, in the order given, except those already queued or at work. A Proposal that waited for a Run leaves the waiting list: it is queued again. The caller keeps the queue in Backlog order. */
export function enqueue(state: RefinementState, ids: readonly string[]): RefinementState {
  const added = ids.filter((id, index) => !state.queued.includes(id) && !state.running.has(id) && ids.indexOf(id) === index);
  if (added.length === 0) return state;
  return { ...withQueue(state, [...state.queued, ...added]), waiting: state.waiting.filter((id) => !added.includes(id)) };
}

/** Takes `id` out of the queue; one at work or waiting for a Run is not affected. */
export function dequeue(state: RefinementState, id: string): RefinementState {
  return state.queued.includes(id) ? withQueue(state, state.queued.filter((queued) => queued !== id)) : state;
}

/** Takes `id` out of the queue and out of the waiting list (the Proposal was rejected). A refinement at work is not affected. */
export function withdraw(state: RefinementState, id: string): RefinementState {
  if (!state.queued.includes(id) && !state.waiting.includes(id)) return state;
  return { ...withQueue(state, state.queued.filter((queued) => queued !== id)), waiting: state.waiting.filter((waiting) => waiting !== id) };
}

/** Empties the whole queue and ends Refine All; the refinements at work and the Proposals waiting for a Run stay. */
export function emptyQueue(state: RefinementState): RefinementState {
  return state.queued.length === 0 && state.refineAllSince === null ? state : withQueue(state, []);
}

/** The setting was turned off: the queue and the waiting list are emptied, Refine All ends, and the refinements at work go on. */
export function switchedOff(state: RefinementState): RefinementState {
  return state.queued.length === 0 && state.waiting.length === 0 && state.refineAllSince === null ? state : { ...withQueue(state, []), waiting: [] };
}

/** Records the click on Refine All at `now`, once its Proposals are queued: it is in progress while something waits to start. One already in progress keeps its instant. */
export function refineAllClicked(state: RefinementState, now: number): RefinementState {
  return state.queued.length === 0 ? state : { ...state, refineAllSince: state.refineAllSince ?? now };
}

/** Whether Cancel Refine All works at `now`: Refine All is in progress and at least two seconds have passed since its click. */
export function cancelRefineAllAllowed(state: RefinementState, now: number): boolean {
  return state.refineAllSince !== null && now - state.refineAllSince >= CANCEL_REFINE_ALL_DELAY_MS;
}

/** A Proposal starts: it leaves the queue and holds `seats` places. */
export function beginRefinement(state: RefinementState, job: RefinementJob): RefinementState {
  const running = new Map(state.running);
  running.set(job.proposal, job);
  return { ...withQueue(state, state.queued.filter((queued) => queued !== job.proposal)), running };
}

/** The Proposal `id` was delivered: the refinement that works on it remembers it for its job. */
export function markDelivered(state: RefinementState, id: string): RefinementState {
  const current = state.running.get(id);
  if (current === undefined || current.delivered) return state;
  return { ...state, running: new Map(state.running).set(id, { ...current, delivered: true }) };
}

/**
 * The job `job` of the Proposal `id` ended: its places are released. Null when no refinement of that job is at work: a repeated signal, or the signal of
 * another job, changes nothing. The end of one refinement never touches the others.
 */
export function endRefinementJob(state: RefinementState, id: string, job: string): { state: RefinementState; ended: RefinementJob } | null {
  const ended = state.running.get(id);
  if (ended === undefined || ended.job !== job) return null;
  const running = new Map(state.running);
  running.delete(id);
  return { state: { ...state, running }, ended };
}

/** Orders Proposals as the Backlog does: by creation, then by identity; a Proposal without creation instant comes last. */
export function backlogOrder(items: readonly { id: string; created: string | null }[]): string[] {
  return [...items]
    .sort((a, b) => {
      if (a.created !== b.created) {
        if (a.created === null) return 1;
        if (b.created === null) return -1;
        return a.created < b.created ? -1 : 1;
      }
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    })
    .map((item) => item.id);
}

/** What the queue knows of a Proposal that is queued or at work. */
export interface ChainFact {
  id: string;
  created: string | null;
  /** The files it touches: the keys of its `base`, the files of its folder and its `delete`. */
  touched: readonly string[];
  /** The Proposals it requires, directly or through others, that are not approved yet (`requiredProposals`). */
  requires: readonly string[];
  /** A Proposal it requires is missing or in a cycle: it can never be refined, so it never waits. */
  broken?: boolean;
}

/**
 * Puts `ids` in the order their dependencies apply: a Proposal after the ones it requires that are among `ids`, and otherwise in Backlog order.
 * `rank` is the Backlog position of each. A cycle is broken at the first Proposal in Backlog order.
 */
export function dependencyOrder(ids: readonly string[], requires: (id: string) => readonly string[], rank: ReadonlyMap<string, number>): string[] {
  const remaining = [...ids].sort((a, b) => (rank.get(a) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b) ?? Number.MAX_SAFE_INTEGER));
  const ordered: string[] = [];
  while (remaining.length > 0) {
    const index = remaining.findIndex((id) => !requires(id).some((other) => other !== id && remaining.includes(other)));
    ordered.push(...remaining.splice(index === -1 ? 0 : index, 1));
  }
  return ordered;
}

/**
 * The chains of the Proposals queued or at work: two Proposals are in the same chain when they touch a file in common or one requires the other, and the
 * relation is transitive. Each chain is in the order its Proposals apply (the required first, then the Backlog); the chains follow the Backlog position of
 * their first Proposal. Recomputed from the facts of the moment, never stored.
 */
export function chainsOf(facts: readonly ChainFact[]): string[][] {
  const rank = new Map(backlogOrder(facts).map((id, index) => [id, index]));
  const parent = new Map(facts.map((fact) => [fact.id, fact.id]));
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root) ?? root;
    parent.set(id, root);
    return root;
  };
  const join = (a: string, b: string): void => void parent.set(find(a), find(b));
  const owner = new Map<string, string>();
  for (const fact of facts) {
    for (const file of fact.touched) {
      const first = owner.get(file);
      if (first === undefined) owner.set(file, fact.id);
      else join(first, fact.id);
    }
    for (const required of fact.requires) if (parent.has(required)) join(fact.id, required);
  }
  const requires = new Map(facts.map((fact) => [fact.id, fact.requires]));
  const groups = new Map<string, string[]>();
  for (const fact of facts) groups.set(find(fact.id), [...(groups.get(find(fact.id)) ?? []), fact.id]);
  return [...groups.values()].map((ids) => dependencyOrder(ids, (id) => requires.get(id) ?? [], rank)).sort((a, b) => (rank.get(a[0] ?? "") ?? 0) - (rank.get(b[0] ?? "") ?? 0));
}

/** Why a queued Proposal does not start now; `on` is the Proposal it waits for, none for `slot`. */
export type QueueWait = Omit<QueuedRefinement, "proposal">;

/** What the queue does at one moment: the Proposals that start with their places, those that leave the queue without starting, and why each of the others waits. */
export interface QueuePlan {
  start: { proposal: string; seats: number }[];
  drop: string[];
  waits: Map<string, QueueWait>;
}

/**
 * Plans the queue. `facts` has every Proposal queued or at work (one without facts leaves the queue). `waiting` are the Proposals refined and waiting for a Run.
 * `limit` is `trama.maxParallelAgents`.
 *
 * - A queued Proposal that requires a Proposal that is not approved and is not queued, at work or waiting leaves the queue without starting (repeatedly, as the Proposals that required it leave in turn).
 * - Ready: the first queued Proposal of a chain where no refinement works, when it requires no Proposal that is not approved.
 * - Free places are `limit` less those held. The ready Proposals start in Backlog order, at most as many as there are free places, dividing the free places equally (`shareSeats`), at least one each.
 * - A Proposal that does not start waits: for `approval` of a Proposal it requires, else for `chain` (the one at work in its chain, else the one before it), else for a `slot`.
 */
export function planQueue(input: { queued: readonly string[]; running: ReadonlyMap<string, { seats: number }>; waiting: readonly string[]; facts: ReadonlyMap<string, ChainFact>; limit: number }): QueuePlan {
  const { running, facts } = input;
  const dropped = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    const held = new Set([...input.queued.filter((id) => !dropped.has(id)), ...running.keys(), ...input.waiting]);
    for (const id of input.queued) {
      if (dropped.has(id)) continue;
      const fact = facts.get(id);
      if (fact === undefined || fact.broken === true || fact.requires.some((required) => !held.has(required))) {
        dropped.add(id);
        changed = true;
      }
    }
  }
  const live = input.queued.filter((id) => !dropped.has(id));
  const liveFacts = [...live, ...running.keys()].flatMap((id) => {
    const fact = facts.get(id);
    return fact === undefined ? [{ id, created: null, touched: [], requires: [] } satisfies ChainFact] : [fact];
  });
  const rank = new Map(backlogOrder(liveFacts).map((id, index) => [id, index]));
  const waits = new Map<string, QueueWait>();
  const ready: string[] = [];
  for (const chain of chainsOf(liveFacts)) {
    const working = chain.find((id) => running.has(id));
    chain.forEach((id, index) => {
      if (running.has(id)) return;
      const required = facts.get(id)?.requires[0];
      const previous = chain[index - 1];
      if (required !== undefined) waits.set(id, { waiting: "approval", on: required });
      else if (working !== undefined) waits.set(id, { waiting: "chain", on: working });
      else if (previous !== undefined) waits.set(id, { waiting: "chain", on: previous });
      else ready.push(id);
    });
  }
  ready.sort((a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0));
  let held = 0;
  for (const job of running.values()) held += job.seats;
  const free = input.limit - held;
  const now = free > 0 ? ready.slice(0, free) : [];
  const shares = now.length === 0 ? [] : shareSeats(now.map(() => 1), free);
  for (const id of ready.slice(now.length)) waits.set(id, { waiting: "slot" });
  return { start: now.map((proposal, index) => ({ proposal, seats: shares[index] ?? 1 })), drop: [...dropped], waits };
}

/** A Proposal that may be refined, as Refine All sees it. `block`: `none` Approve would be available; `requires` only Proposals it requires that are not approved block it; `other` something else does. */
export interface PickFact {
  id: string;
  block: "none" | "requires" | "other";
  /** The Proposals it requires that are not approved yet. */
  requires: readonly string[];
}

/**
 * The Proposals one click on Refine All takes: `candidates` are the refinable Proposals that are not queued, at work or waiting, in Backlog order. It takes every
 * one whose Approve would be available (not counting a Run in progress), and every one blocked only by Proposals it requires, when each of those is taken, queued, at work or waiting
 * (`held`), transitively.
 */
export function refineAllPick(candidates: readonly PickFact[], held: ReadonlySet<string>): string[] {
  const taken = new Set<string>();
  for (const candidate of candidates) if (candidate.block === "none") taken.add(candidate.id);
  let changed = true;
  while (changed) {
    changed = false;
    for (const candidate of candidates) {
      if (taken.has(candidate.id) || candidate.block !== "requires") continue;
      if (candidate.requires.length > 0 && candidate.requires.every((required) => held.has(required) || taken.has(required))) {
        taken.add(candidate.id);
        changed = true;
      }
    }
  }
  return candidates.filter((candidate) => taken.has(candidate.id)).map((candidate) => candidate.id);
}

/** The reasons Refine All is unavailable, in their order: the setting is off, then `count` (what a click takes now) is 0. */
export function refineAllBlockers(enabled: boolean, count: number): string[] {
  return [...(enabled ? [] : [REFINE_ALL_OFF]), ...(count === 0 ? [REFINE_ALL_NONE] : [])];
}

/** What the end of a refinement job does with its Proposal. */
export type RefinementEnd = "approve" | "requeue" | "keep" | "drop";

/**
 * `delivered`: the agent delivered the Proposal during the job (its `proposal-delivered` notice came in).
 * `open`: the Proposal is Open now. `stale`: it is still stale. `blocked`: approval is blocked for a reason other than staleness.
 * Nothing delivered: drop, the Proposal stays as it was.
 */
export function refinementEnd(facts: { delivered: boolean; open: boolean; stale: boolean; blocked: boolean }): RefinementEnd {
  if (!facts.delivered || !facts.open) return "drop";
  if (facts.stale) return "requeue";
  if (facts.blocked) return "keep";
  return "approve";
}

/** Whether a Proposal can be refined now: a change not attached to an open Drift, and either stale and Open, or a Draft left refining that nothing writes. */
export function refinable(facts: { kind: string; attached: boolean; open: boolean; stale: boolean; draftRefining: boolean; writing: boolean }): boolean {
  if (facts.kind !== "change" || facts.attached) return false;
  if (facts.open) return facts.stale;
  return facts.draftRefining && !facts.writing;
}

/** The latest note the agent declared for each Proposal in `running`, from the announcements bound to them (the notes are oldest first); a Proposal whose agent declared none has no entry. */
export function refinementNotes(announcements: readonly Pick<Announcement, "kind" | "proposal" | "notes">[], running: readonly string[]): Record<string, string> {
  const notes: Record<string, string> = {};
  for (const announcement of announcements) {
    const text = announcement.notes[announcement.notes.length - 1]?.text;
    if (announcement.kind === "proposal" && announcement.proposal !== null && text !== undefined && running.includes(announcement.proposal)) notes[announcement.proposal] = text;
  }
  return notes;
}

/**
 * The Board's view of the refinement. `waits` say why each queued Proposal waits; `count` is what a click on Refine All takes now and `refineAll` carries its
 * reasons. `runInProgress`: a Run of this window is in progress. `notes`: the latest note of the agent of each Proposal at work (`refinementNotes`).
 */
export function refinementView(input: { state: RefinementState; enabled: boolean; runInProgress: boolean; waits: ReadonlyMap<string, QueueWait>; count: number; notes: Readonly<Record<string, string>> }): RefinementView {
  const { state } = input;
  const since = state.refineAllSince;
  return {
    enabled: input.enabled,
    running: [...state.running.keys()],
    queued: state.queued.map((proposal): QueuedRefinement => ({ proposal, ...(input.waits.get(proposal) ?? { waiting: "slot" }) })),
    notes: { ...input.notes },
    runInProgress: input.runInProgress,
    waiting: state.waiting,
    refineAll: { mode: since === null ? "refine" : "cancel", count: input.count, blockers: refineAllBlockers(input.enabled, input.count), ...(since === null ? {} : { since }) },
  };
}
