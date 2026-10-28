import { TramaError } from "./errors";
import { joinReasons, RUN_IN_PROGRESS } from "./design";
import { copyProposalFiles, type DriftDecision, type DriftDecisionKind, discardProposal, getProposal, listProposals, newProposal, type Proposal, requireEditable, resolutionHolding, save, submitProposal, touch, touchedFiles, withProposalLock } from "./proposals";
import { cardName } from "./short-numbers";
import type { Project } from "./store";
import { chosenOption, differenceOf, differenceTitle, driftOptions, fixCodeRefusal, followedDrifts, getDrift, hasDifferences, indexDrifts, listDrifts, unifiedDrifts, type Drift } from "./work";

/**
 * Records, replaces or (`remove`) removes the decision on `driftId` in a resolution Proposal, a Draft or an open one;
 * an open one goes back to Draft. Entries are indexed by Drift and difference: a unified Drift with differences is decided only by
 * entries that name `difference` (the `drift` of one of its open differences), one per difference; any other Drift only by an entry
 * without it. `remove` without `difference` takes out every entry of the Drift. Refused, changing nothing, when the rules of the decision are not met.
 * `returnedToDraft` tells whether the Proposal was open.
 */
export function resolveDriftInProposal(
  p: Project,
  id: string,
  driftId: string,
  input: { decision?: DriftDecisionKind; option?: number; note?: string; remove?: boolean; difference?: string },
): { proposal: Proposal; returnedToDraft: boolean } {
  return withProposalLock(p, id, () => recordDecision(p, id, driftId, input));
}

/** The decision of `resolveDriftInProposal`, run while the Proposal is locked, so it reads what the last writer saved. */
function recordDecision(
  p: Project,
  id: string,
  driftId: string,
  input: { decision?: DriftDecisionKind; option?: number; note?: string; remove?: boolean; difference?: string },
): { proposal: Proposal; returnedToDraft: boolean } {
  const proposal = getProposal(p, id);
  const name = cardName(p, "proposal", proposal.id);
  if (proposal.data.kind !== "resolution") throw new TramaError(`Proposal ${name} is not a resolution: only a resolution lists Drifts`);
  requireEditable(p, proposal);
  const drift = getDrift(p, driftId);
  const driftName = cardName(p, "drift", drift.id);
  const { difference } = input;
  const on = difference === undefined ? `Drift ${driftName}` : `Drift ${driftName}, difference ${cardName(p, "drift", difference)}`;
  // The entry names a difference exactly when its Drift has them: the entry is refused otherwise, naming it.
  if (difference !== undefined && differenceOf(drift, difference) === null)
    throw new TramaError(hasDifferences(drift) ? `The entry for ${on} names a difference the Drift does not have` : `The entry for ${on} names a difference, but Drift ${driftName} is not a unified Drift with differences: "difference" goes only with one`);
  const same = (d: DriftDecision) => d.drift === drift.id && (difference === undefined ? input.remove === true || d.difference === undefined : d.difference === difference);
  const list = proposal.data.drifts.filter((d) => !same(d));
  if (input.remove) {
    if (list.length === proposal.data.drifts.length) throw new TramaError(`${on} is not in Proposal ${name}`);
    return commit(p, proposal, list);
  }
  if (hasDifferences(drift) && difference === undefined)
    throw new TramaError(`The entry for Drift ${driftName} has no "difference": it is a unified Drift with differences, so each difference is decided by its own entry, giving its "difference"`);
  if (drift.data.status !== "open") throw new TramaError(`Drift ${driftName} is already resolved`);
  if (difference !== undefined && differenceOf(drift, difference)?.decision !== null) throw new TramaError(`The difference ${cardName(p, "drift", difference)} of Drift ${driftName} is already decided`);
  const other = resolutionHolding(p, drift.id, proposal.id);
  if (other) throw new TramaError(`Drift ${driftName} is already in resolution ${cardName(p, "proposal", other.id)}, which is still to be decided`);
  const { decision } = input;
  if (decision === undefined) throw new TramaError("A decision is required: proposal, dismissed or fix-code");
  const note = input.note?.trim() || undefined;
  if (decision !== "fix-code" && (input.option !== undefined || input.note !== undefined))
    throw new TramaError(`${on}: ${input.option !== undefined ? "an option" : "a note"} only goes with fix-code, not with ${decision}`);
  if (decision === "fix-code") {
    chosenOption(p, drift, input.option, difference);
    const refusal = fixCodeRefusal(p, drift, undefined, difference);
    if (refusal) throw new TramaError(refusal);
  }
  const entry: DriftDecision = { drift: drift.id, ...(difference === undefined ? {} : { difference }), decision, ...(input.option === undefined ? {} : { option: input.option }), ...(note === undefined ? {} : { note }) };
  const at = proposal.data.drifts.findIndex(same);
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
 * `proposals` are the Proposals already read: without them they are listed.
 */
export function awaitingResolution(p: Project, exceptId?: string, proposals: readonly Proposal[] = listProposals(p)): Proposal | null {
  return awaitingIn(proposals, exceptId);
}

const awaitingIn = (proposals: readonly Proposal[], exceptId?: string): Proposal | null =>
  proposals.find((r) => r.id !== exceptId && r.data.kind === "resolution" && !r.data.prepared && (r.data.status === "draft" || r.data.status === "open")) ?? null;

/** What the blockers below ask of the cards, worked out once from the Proposals and Drifts a reader has already read. */
export interface ResolutionFacts {
  drifts: readonly Drift[];
  /** The resolution awaiting a decision (`awaitingResolution`). */
  awaiting: Proposal | null;
  /** The Drifts listed by a resolution being written or open, a prepared one included. */
  held: ReadonlySet<string>;
}

export function resolutionFacts(proposals: readonly Proposal[], drifts: readonly Drift[]): ResolutionFacts {
  const held = new Set(proposals.filter((r) => r.data.kind === "resolution" && (r.data.status === "draft" || r.data.status === "open")).flatMap((r) => r.data.drifts.map((d) => d.drift)));
  return { drifts, awaiting: awaitingIn(proposals), held };
}

/** The facts of the files now: used when the caller has no cards already read. */
const factsOf = (p: Project, facts: ResolutionFacts | undefined): ResolutionFacts => facts ?? resolutionFacts(listProposals(p), listDrifts(p));

/** Why Resolve Drifts cannot be launched now: every reason that holds, in order (Drifts are being resolved, a run in progress, the resolution Proposal awaiting a decision, no open Drifts), or null. `work` is what holds in this window; `facts` are the cards a reader has already read. */
export function resolveDriftsBlocker(p: Project, work: WindowWork, facts?: ResolutionFacts): string | null {
  const { awaiting, drifts } = factsOf(p, facts);
  return joinReasons([
    work.resolving ? "Drifts are being resolved" : null,
    work.running ? "A run is in progress" : null,
    awaiting ? `Proposal ${cardName(p, "proposal", awaiting.id)} resolving Drifts awaits a decision` : null,
    drifts.some((d) => d.data.status === "open") ? null : "No open Drifts",
  ]);
}

/**
 * Why Resolve on one open Drift cannot be launched now, or null: the reasons of `resolveDriftsBlocker` that hold for it,
 * in the same order, without «No open Drifts». `agentOnIt` tells whether the agent resolving Drifts works on this one.
 * `preparedQuestion` is true when Resolve opens the Drift's valid prepared question: no resolution awaiting a decision stops it.
 * `facts` are the cards a reader has already read.
 */
export function resolveDriftBlocker(p: Project, work: WindowWork, agentOnIt: boolean, preparedQuestion = false, facts?: ResolutionFacts): string | null {
  const awaiting = preparedQuestion ? null : factsOf(p, facts).awaiting;
  return joinReasons([
    work.resolving ? (agentOnIt ? "An agent is resolving this Drift" : "Drifts are being resolved") : null,
    work.running ? "A run is in progress" : null,
    awaiting ? `Proposal ${cardName(p, "proposal", awaiting.id)} resolving Drifts awaits a decision` : null,
  ]);
}

/**
 * The Drifts Unify Drifts would unite now, in creation order: open, in no resolution being written or open (a prepared one
 * included), and not held by the turn of the agent that filed them (`finishing`). `facts` are the cards a reader has already read.
 */
export function unifiableDrifts(p: Project, finishing: readonly string[] = [], facts?: ResolutionFacts): string[] {
  const { drifts, held } = factsOf(p, facts);
  return drifts.filter((d) => d.data.status === "open" && !finishing.includes(d.id) && !held.has(d.id) && d.data.differences.every((x) => x.decision === null)).map((d) => d.id);
}

/**
 * Why Unify Drifts cannot be launched now: every reason that holds, in order (Drifts are being resolved, a run in progress,
 * the resolution Proposal awaiting a decision, fewer than two Drifts to unify). Empty when it works. `work` is what holds in this window; `facts` are the cards a reader has already read.
 */
export function unifyDriftsBlockers(p: Project, work: WindowWork, finishing: readonly string[] = [], facts?: ResolutionFacts): string[] {
  const all = factsOf(p, facts);
  return [
    work.resolving ? "Drifts are being resolved" : null,
    work.running ? "A run is in progress" : null,
    all.awaiting ? `Proposal ${cardName(p, "proposal", all.awaiting.id)} resolving Drifts awaits a decision` : null,
    unifiableDrifts(p, finishing, all).length < 2 ? "Unify needs at least two open Drifts" : null,
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

/** The answer to the prepared question of one difference of a unified Drift with differences: the decision it comes to. */
export interface DifferenceAnswer {
  /** The `drift` of the difference. */
  difference: string;
  answer: PreparedAnswer;
}

/**
 * Creates the Draft resolution marked `prepared` that holds `entries` (one decision each, `difference` only for a unified Drift with
 * differences), copies the files of the Proposal attached to the Drift or difference of each `proposal` decision, and hands it over with
 * the same checks as the agent's hand-over. When any step is refused, the Draft is Discarded with no feedback, so it never shows on
 * the Board, and the refusal is returned.
 */
function writePrepared(p: Project, drift: Drift, body: string, entries: { difference?: string; answer: PreparedAnswer }[], skillsDirs: string[]): PreparedResolution {
  const proposal = newProposal(p, `Resolve: ${drift.title}`, body, { kind: "resolution", prepared: true });
  try {
    for (const { difference, answer } of entries) resolveDriftInProposal(p, proposal.id, drift.id, { ...answer, ...(difference === undefined ? {} : { difference }) });
    const touched = new Map<string, string>();
    for (const { difference, answer } of entries) {
      if (answer.decision !== "proposal") continue;
      const attached = difference === undefined ? drift.data.proposal : (differenceOf(drift, difference)?.proposal ?? null);
      const on = difference === undefined ? `Drift ${cardName(p, "drift", drift.id)}` : `Drift ${cardName(p, "drift", drift.id)}, difference ${cardName(p, "drift", difference)}`;
      if (attached === null) throw new TramaError(`${on} has no attached Proposal to copy`);
      // Two Proposals that change the same file cannot be merged by copying: the agent adapts them.
      for (const path of touchedFiles(getProposal(p, attached))) {
        const other = touched.get(path);
        if (other !== undefined) throw new TramaError(`Proposals ${cardName(p, "proposal", other)} and ${cardName(p, "proposal", attached)} both change ${path}`);
        touched.set(path, attached);
      }
      copyProposalFiles(p, proposal.id, attached);
    }
    return { proposal: submitProposal(p, proposal.id, skillsDirs), refusal: null };
  } catch (err) {
    if (!(err instanceof TramaError)) throw err;
    discardProposal(p, proposal.id);
    return { proposal: null, refusal: err.message };
  }
}

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
  return writePrepared(p, drift, body, [{ answer }], skillsDirs);
}

/**
 * `writePreparedResolution` for the answers to the round of a unified Drift with differences: one entry of `drifts` for each difference
 * answered, with its `difference`, and one line of the body for each. The differences without an answer stay open.
 */
export function writePreparedRoundResolution(p: Project, driftId: string, answers: DifferenceAnswer[], skillsDirs: string[] = []): PreparedResolution {
  const drift = getDrift(p, driftId);
  const body = answers
    .map(({ difference, answer }) => {
      const optionTitle = answer.option === undefined ? undefined : driftOptions(drift, difference)[answer.option - 1]?.title;
      return `Resolves Drift ${drift.id} (${drift.title}), difference ${difference} (${differenceTitle(drift, difference)}): ${decisionText(answer.decision, optionTitle).toLowerCase()}.`;
    })
    .join("\n");
  return writePrepared(p, drift, body, answers, skillsDirs);
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

/** One Drift of a resolution as a card shows it, or one difference of a unified Drift with differences: what approving does to it, or that it was resolved in another way. */
export interface ResolvedDrift {
  drift: string;
  /** The `drift` of the difference this line is about, for a unified Drift with differences; null for any other Drift. Then `title`, `previous` and `merge` are those of the difference. */
  difference: string | null;
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

/** The Drifts a resolution lists, in creation order, read from the files at each call: one line for a Drift, and one for each difference a unified Drift with differences has decided in it. Empty for any other Proposal. `drifts` are the Drifts already read: without them they are listed. */
export function resolvedDrifts(p: Project, proposal: Proposal, drifts: readonly Drift[] = listDrifts(p)): ResolvedDrift[] {
  const index = indexDrifts(drifts);
  return drifts.flatMap((drift): ResolvedDrift[] => {
    if (hasDifferences(drift)) {
      return drift.data.differences.flatMap((difference): ResolvedDrift[] => {
        const d = proposal.data.drifts.find((x) => x.drift === drift.id && x.difference === difference.drift);
        if (!d) return [];
        const already = difference.decision !== null && difference.resolvedBy !== proposal.id;
        const option = d.option === undefined ? undefined : driftOptions(drift, difference.drift)[d.option - 1]?.title;
        const source = index.get(difference.drift);
        return [{ drift: drift.id, difference: difference.drift, title: differenceTitle(drift, difference.drift), previous: source === undefined ? [] : followedDrifts(p, source, index), unifies: [], merge: source?.data.merge ?? false, decision: already ? "(already resolved)" : decisionText(d.decision, option), note: already ? null : (d.note ?? null) }];
      });
    }
    const d = proposal.data.drifts.find((x) => x.drift === drift.id);
    if (!d) return [];
    const already = drift.data.status === "resolved" && drift.data.resolvedBy !== proposal.id;
    const option = d.option === undefined ? undefined : driftOptions(drift)[d.option - 1]?.title;
    return [{ drift: drift.id, difference: null, title: drift.title, previous: followedDrifts(p, drift, index), unifies: unifiedDrifts(p, drift, index), merge: drift.data.merge, decision: already ? "(already resolved)" : decisionText(d.decision, option), note: already ? null : (d.note ?? null) }];
  });
}
