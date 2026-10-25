import type { DriftView, Snapshot } from "./snapshot";

/** The Drifts a delivered resolution lists: they are decided on that Proposal's card, so they have no card of their own. */
export function resolvedByDelivered(snapshot: Pick<Snapshot, "proposals">): Set<string> {
  return new Set(snapshot.proposals.filter((p) => p.kind === "resolution").flatMap((p) => p.resolves.map((r) => r.drift)));
}

/** The open Drifts that have a card of their own on the Board: every open Drift but the ones a delivered resolution lists. */
export function driftsWithCard(snapshot: Pick<Snapshot, "proposals" | "drifts">): DriftView[] {
  const delivered = resolvedByDelivered(snapshot);
  return snapshot.drifts.filter((d) => !delivered.has(d.id));
}

/**
 * How many cards wait for a decision of the developer: the cards of the Board's Backlog, the open Proposals and the open Drifts with a card of their own.
 * Ghosts do not count. With Auto-update Stale Proposals off (`refiningOn` false), a Draft left half-way that no agent writes does not count either: the
 * developer cannot decide it. The panel's Board and the side menu (its Board entry and the badge of the icon) use this number.
 */
export function boardDecisionCount(snapshot: Pick<Snapshot, "proposals" | "drifts">, refiningOn = true): number {
  const decidable = snapshot.proposals.filter((p) => refiningOn || !p.refining || p.writer !== null);
  return decidable.length + driftsWithCard(snapshot).length;
}
