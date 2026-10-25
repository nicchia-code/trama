import { TramaError } from "./errors";
import { joinReasons, RUN_IN_PROGRESS } from "./design";
import { copyProposalFiles, type DriftDecision, type DriftDecisionKind, discardProposal, getProposal, listProposals, newProposal, type Proposal, requireEditable, resolutionHolding, save, submitProposal, touch, withProposalLock } from "./proposals";
import { cardName } from "./short-numbers";
import type { Project } from "./store";
import { chosenOption, driftOptions, fixCodeRefusal, followedDrifts, getDrift, listDrifts, unifiedDrifts } from "./work";

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

/**
 * The resolution Proposal still being written or open, the oldest, or null. Always computed from the files, never remembered.
 * A resolution born from a prepared question (`prepared: true`) never stops Resolve, so it is not counted here.
 */
export function awaitingResolution(p: Project, exceptId?: string): Proposal | null {
  return listProposals(p).find((r) => r.id !== exceptId && r.data.kind === "resolution" && !r.data.prepared && (r.data.status === "draft" || r.data.status === "open")) ?? null;
}

/** Why Resolve Drifts cannot be launched now: every reason that holds, in order (Drifts are being resolved, a run in progress, the resolution Proposal awaiting a decision, no open Drifts), or null. `work` is what holds in this window. */
export function resolveDriftsBlocker(p: Project, work: WindowWork): string | null {
  const awaiting = awaitingResolution(p);
  return joinReasons([
    work.resolving ? "Drifts are being resolved" : null,
    work.running ? "A run is in progress" : null,
    awaiting ? `Proposal ${cardName(p, "proposal", awaiting.id)} resolving Drifts awaits a decision` : null,
    listDrifts(p).some((d) => d.data.status === "open") ? null : "No open Drifts",
  ]);
}

/**
 * Why Resolve on one open Drift cannot be launched now, or null: the reasons of `resolveDriftsBlocker` that hold for it,
 * in the same order, without «No open Drifts». `agentOnIt` tells whether the agent resolving Drifts works on this one.
 * `preparedQuestion` is true when Resolve opens the Drift's valid prepared question: no resolution awaiting a decision stops it.
 */
export function resolveDriftBlocker(p: Project, work: WindowWork, agentOnIt: boolean, preparedQuestion = false): string | null {
  const awaiting = preparedQuestion ? null : awaitingResolution(p);
  return joinReasons([
    work.resolving ? (agentOnIt ? "An agent is resolving this Drift" : "Drifts are being resolved") : null,
    work.running ? "A run is in progress" : null,
    awaiting ? `Proposal ${cardName(p, "proposal", awaiting.id)} resolving Drifts awaits a decision` : null,
  ]);
}

/**
 * The Drifts Unify Drifts would unite now, in creation order: open, in no resolution being written or open (a prepared one
 * included), and not held by the turn of the agent that filed them (`finishing`).
 */
export function unifiableDrifts(p: Project, finishing: readonly string[] = []): string[] {
  return listDrifts(p).filter((d) => d.data.status === "open" && !finishing.includes(d.id) && resolutionHolding(p, d.id) === null).map((d) => d.id);
}

/**
 * Why Unify Drifts cannot be launched now: every reason that holds, in order (Drifts are being resolved, a run in progress,
 * the resolution Proposal awaiting a decision, fewer than two Drifts to unify). Empty when it works. `work` is what holds in this window.
 */
export function unifyDriftsBlockers(p: Project, work: WindowWork, finishing: readonly string[] = []): string[] {
  const awaiting = awaitingResolution(p);
  return [
    work.resolving ? "Drifts are being resolved" : null,
    work.running ? "A run is in progress" : null,
    awaiting ? `Proposal ${cardName(p, "proposal", awaiting.id)} resolving Drifts awaits a decision` : null,
    unifiableDrifts(p, finishing).length < 2 ? "Unify needs at least two open Drifts" : null,
  ].filter((reason): reason is string => reason !== null);
}

/**
 * Why Rework with feedback on the open resolution `proposal` cannot be launched now, or null: it is not an open resolution,
 * Drifts are being resolved, a run is in progress, or another resolution (not born from a prepared question) awaits a decision.
 */
export function reworkProposalBlocker(p: Project, work: WindowWork, proposal: string): string | null {
  const r = getProposal(p, proposal);
  const awaiting = awaitingResolution(p, r.id);
  return joinReasons([
    r.data.kind === "resolution" && r.data.status === "open" ? null : `Proposal ${cardName(p, "proposal", r.id)} is not an open resolution`,
    work.resolving ? "Drifts are being resolved" : null,
    work.running ? "A run is in progress" : null,
    awaiting ? `Proposal ${cardName(p, "proposal", awaiting.id)} resolving Drifts awaits a decision` : null,
  ]);
}

/** The Drifts a reworked resolution hands back to the agent: its Drifts still open and in no other resolution, in the order the resolution lists them. Call it after the rejection. */
export function reworkProposalDrifts(p: Project, proposal: string): string[] {
  const r = getProposal(p, proposal);
  const open = new Set(listDrifts(p).filter((d) => d.data.status === "open").map((d) => d.id));
  return r.data.drifts.map((d) => d.drift).filter((id) => open.has(id) && resolutionHolding(p, id, r.id) === null);
}

/** The answer to a Drift's prepared question, as the host reads it: the decision it comes to. */
export interface PreparedAnswer {
  decision: DriftDecisionKind;
  /** Only with `fix-code`: the number of the chosen fix option, from 1. */
  option?: number;
  /** Only with `fix-code`: a free note for the fix Task. */
  note?: string;
}

/** The outcome of `writePreparedResolution`: the open resolution, or why it was refused (the Draft is then Discarded). */
export type PreparedResolution = { proposal: Proposal; refusal: null } | { proposal: null; refusal: string };

/**
 * Trama's own path from the answer to a Drift's prepared question to an open resolution, with no agent: creates a Draft
 * resolution marked `prepared`, titled `Resolve: <Drift title>`, records the one decision of the answer (for `proposal`, the
 * files of the Proposal attached to the Drift are copied into it), and hands it over with the same checks as the agent's hand-over.
 * When any step is refused, the Draft is Discarded with no feedback, so it never shows on the Board, and the refusal is returned
 * for the caller to pass the answer to the Drift resolution agent.
 */
export function writePreparedResolution(p: Project, driftId: string, answer: PreparedAnswer, skillsDirs: string[] = []): PreparedResolution {
  const drift = getDrift(p, driftId);
  const optionTitle = answer.option === undefined ? undefined : driftOptions(drift)[answer.option - 1]?.title;
  const body = `Resolves Drift ${drift.id} (${drift.title}): ${decisionText(answer.decision, optionTitle).toLowerCase()}.`;
  const proposal = newProposal(p, `Resolve: ${drift.title}`, body, { kind: "resolution", prepared: true });
  try {
    resolveDriftInProposal(p, proposal.id, drift.id, answer);
    if (answer.decision === "proposal") {
      if (drift.data.proposal === null) throw new TramaError(`Drift ${cardName(p, "drift", drift.id)} has no attached Proposal to copy`);
      copyProposalFiles(p, proposal.id, drift.data.proposal);
    }
    return { proposal: submitProposal(p, proposal.id, skillsDirs), refusal: null };
  } catch (err) {
    if (!(err instanceof TramaError)) throw err;
    discardProposal(p, proposal.id);
    return { proposal: null, refusal: err.message };
  }
}

/** What holds in this window: Drift resolution and a run may both be going. */
export interface WindowWork { resolving: boolean; running: boolean }

/** Why every Run is disabled now: every reason that holds, in order (Drifts are being resolved, then a run in progress), or null. */
export function runWindowBlocker(work: WindowWork): string | null {
  return joinReasons([
    work.resolving ? "Drifts are being resolved" : null,
    work.running ? RUN_IN_PROGRESS : null,
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
  /** The Drift this one follows, when it is recurring. */
  previous: { id: string; title: string }[];
  /** The Drifts a unified Drift merged, in creation order; empty for any other Drift. */
  unifies: { id: string; title: string }[];
  /** True for a Drift from a merge: the code may be right. */
  merge: boolean;
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
    return [{ drift: drift.id, title: drift.title, previous: followedDrifts(p, drift), unifies: unifiedDrifts(p, drift), merge: drift.data.merge, decision: already ? "(already resolved)" : decisionText(d.decision, option), note: already ? null : (d.note ?? null) }];
  });
}
