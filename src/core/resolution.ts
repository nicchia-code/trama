import { TramaError } from "./errors";
import { joinReasons } from "./design";
import { type DriftDecision, type DriftDecisionKind, getProposal, listProposals, type Proposal, requireEditable, resolutionHolding, save, touch, withProposalLock } from "./proposals";
import { cardName } from "./short-numbers";
import type { Project } from "./store";
import { chosenOption, driftOptions, fixCodeRefusal, followedDrift, getDrift, listDrifts } from "./work";

/**
 * Records, replaces or (`remove`) removes the decision on `driftId` in a resolution Proposal, a Draft or an open one;
 * an open one goes back to Draft. Refused, changing nothing, when the rules of the decision are not met.
 * `returnedToDraft` tells whether the Proposal was open.
 */
export function resolveDriftInProposal(
  p: Project,
  id: string,
  driftId: string,
  input: { decision?: DriftDecisionKind; option?: number; note?: string; remove?: boolean },
): { proposal: Proposal; returnedToDraft: boolean } {
  return withProposalLock(p, id, () => recordDecision(p, id, driftId, input));
}

/** The decision of `resolveDriftInProposal`, run while the Proposal is locked, so it reads what the last writer saved. */
function recordDecision(
  p: Project,
  id: string,
  driftId: string,
  input: { decision?: DriftDecisionKind; option?: number; note?: string; remove?: boolean },
): { proposal: Proposal; returnedToDraft: boolean } {
  const proposal = getProposal(p, id);
  const name = cardName(p, "proposal", proposal.id);
  if (proposal.data.kind !== "resolution") throw new TramaError(`Proposal ${name} is not a resolution: only a resolution lists Drifts`);
  requireEditable(p, proposal);
  const drift = getDrift(p, driftId);
  const driftName = cardName(p, "drift", drift.id);
  const list = proposal.data.drifts.filter((d) => d.drift !== drift.id);
  if (input.remove) {
    if (list.length === proposal.data.drifts.length) throw new TramaError(`Drift ${driftName} is not in Proposal ${name}`);
    return commit(p, proposal, list);
  }
  if (drift.data.status !== "open") throw new TramaError(`Drift ${driftName} is already resolved`);
  const other = resolutionHolding(p, drift.id, proposal.id);
  if (other) throw new TramaError(`Drift ${driftName} is already in resolution ${cardName(p, "proposal", other.id)}, which is still to be decided`);
  const { decision } = input;
  if (decision === undefined) throw new TramaError("A decision is required: proposal, dismissed or fix-code");
  const note = input.note?.trim() || undefined;
  if (decision !== "fix-code" && (input.option !== undefined || input.note !== undefined))
    throw new TramaError(`Drift ${driftName}: ${input.option !== undefined ? "an option" : "a note"} only goes with fix-code, not with ${decision}`);
  if (decision === "fix-code") {
    chosenOption(p, drift, input.option);
    const refusal = fixCodeRefusal(p, drift);
    if (refusal) throw new TramaError(refusal);
  }
  const entry: DriftDecision = { drift: drift.id, decision, ...(input.option === undefined ? {} : { option: input.option }), ...(note === undefined ? {} : { note }) };
  const at = proposal.data.drifts.findIndex((d) => d.drift === drift.id);
  return commit(p, proposal, at < 0 ? [...list, entry] : proposal.data.drifts.map((d, i) => (i === at ? entry : d)));
}

function commit(p: Project, proposal: Proposal, drifts: DriftDecision[]) {
  const returnedToDraft = proposal.data.status === "open";
  touch(proposal);
  proposal.data.drifts = drifts;
  save(proposal);
  return { proposal, returnedToDraft };
}

/** The resolution Proposal still being written or open, the oldest, or null. Always computed from the files, never remembered. */
export function awaitingResolution(p: Project): Proposal | null {
  return listProposals(p).find((r) => r.data.kind === "resolution" && (r.data.status === "draft" || r.data.status === "open")) ?? null;
}

/** Why Resolve Drifts cannot be launched now (the first reason that holds), or null. `window` is the state of Drift resolution in this window. */
export function resolveDriftsBlocker(p: Project, window: "free" | "running-tasks" | "resolving"): string | null {
  if (window === "resolving") return "Drifts are being resolved";
  if (window === "running-tasks") return "A run is in progress";
  const awaiting = awaitingResolution(p);
  if (awaiting) return `Proposal ${cardName(p, "proposal", awaiting.id)} resolving Drifts awaits a decision`;
  return listDrifts(p).some((d) => d.data.status === "open") ? null : "No open Drifts";
}

/** What holds in this window: Drift resolution and a run may both be going. */
export interface WindowWork { resolving: boolean; running: boolean }

/** Why every Run is disabled now: every reason that holds, in order (Drifts are being resolved, then a run in progress unless `trama.submitWhileRunning` is `enabled`), or null. */
export function runWindowBlocker(work: WindowWork, submitWhileRunning: boolean): string | null {
  return joinReasons([
    work.resolving ? "Drifts are being resolved" : null,
    work.running && !submitWhileRunning ? "A run is in progress" : null,
  ]);
}

/** What approving a resolution does to a Drift with this decision, in words; `optionTitle` is the title of the fix option chosen. */
export function decisionText(decision: DriftDecisionKind, optionTitle?: string): string {
  if (decision === "proposal") return "Model updated to match the code";
  if (decision === "dismissed") return "Closed, nothing changes";
  return `Code fixed${optionTitle === undefined ? "" : ` with option ${optionTitle}`}`;
}

/** One Drift of a resolution as a card shows it: what approving does to it, or that it was resolved in another way. */
export interface ResolvedDrift {
  drift: string;
  title: string;
  critical: boolean;
  /** The Drift this one follows, when it is recurring. */
  previous: { id: string; title: string } | null;
  decision: string;
  note: string | null;
}

/** The Drifts a resolution lists, in creation order, read from the files at each call. Empty for any other Proposal. */
export function resolvedDrifts(p: Project, proposal: Proposal): ResolvedDrift[] {
  return listDrifts(p).flatMap((drift) => {
    const d = proposal.data.drifts.find((x) => x.drift === drift.id);
    if (!d) return [];
    const already = drift.data.status === "resolved" && drift.data.resolvedBy !== proposal.id;
    const option = d.option === undefined ? undefined : driftOptions(drift)[d.option - 1]?.title;
    return [{ drift: drift.id, title: drift.title, critical: drift.data.critical, previous: followedDrift(p, drift), decision: already ? "(already resolved)" : decisionText(d.decision, option), note: already ? null : (d.note ?? null) }];
  });
}
