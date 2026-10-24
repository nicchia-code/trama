import type { RefinementView } from "../protocol";

/** The Proposal refinement of one editor window. Memory only: a reopened window starts empty. */
export interface RefinementState {
  /** Proposals waiting for the agent, in Backlog order. */
  queued: string[];
  /** The Proposal the agent refines now, or null. */
  running: string | null;
  /** Whether the running agent has delivered its Proposal (its `proposal-delivered` notice came in during this job). */
  delivered: boolean;
  /** Proposals delivered and refined, approved only when the Run launched from this window ends; in Backlog order. */
  waiting: string[];
}
export const NO_REFINEMENT: RefinementState = { queued: [], running: null, delivered: false, waiting: [] };
/** Adds `id` to the queue, unless it is already queued or running. The caller keeps the queue in Backlog order. */
export function enqueue(state: RefinementState, id: string): RefinementState {
  if (state.running === id || state.queued.includes(id)) return state;
  return { ...state, queued: [...state.queued, id] };
}

/** Removes `id` from the queue and from the waiting list. A running Proposal is not affected. */
export function withdraw(state: RefinementState, id: string): RefinementState {
  if (!state.queued.includes(id) && !state.waiting.includes(id)) return state;
  return { ...state, queued: state.queued.filter((queued) => queued !== id), waiting: state.waiting.filter((waiting) => waiting !== id) };
}

/** Orders Proposals as the Backlog does: by creation, then by identity; a Proposal without creation instant comes last. */
export function backlogOrder(items: { id: string; created: string | null }[]): string[] {
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

/** Picks the next Proposal to refine among `queued`, dropping those no longer refinable; `queued` keeps the rest in order. */
export function nextToRefine(queued: string[], refinable: (id: string) => boolean): { next: string | null; queued: string[] } {
  const kept = queued.filter(refinable);
  return { next: kept[0] ?? null, queued: kept.slice(1) };
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

/** The Board's view of the refinement. `note` is not tracked yet, so it is null. `runInProgress`: a Run of this window is in progress. */
export function refinementView(state: RefinementState, enabled: boolean, runInProgress: boolean): RefinementView {
  return { enabled, running: state.running, queued: state.queued, note: null, runInProgress, waiting: state.waiting };
}
