import { joinReasons } from "../../../src/core/design";

/** The text `Resolve Drifts` puts in its reason while an agent works on the Drifts (`resolveDriftsBlocker` in `src/core`). */
const RESOLVING_REASON = "Drifts are being resolved";

/** Why «Dismiss Drift» cannot be used on this open Drift now, or null: an agent is still finishing the turn that filed it (first, as every button's reason), it sits in a resolution being written or open, or an agent works on the Drifts. All the reasons that hold are given. `resolutionDrifts` and `finishingDrifts` are the Snapshot's lists of those. */
export function dismissBlocker(driftId: string, resolutionDrifts: readonly string[], resolveBlocker: string | null, finishingDrifts: readonly string[]): string | null {
  return joinReasons([
    finishingDrifts.includes(driftId) ? "The agent is still finishing" : null,
    resolutionDrifts.includes(driftId) ? "This Drift is part of a resolution: decide it there" : null,
    resolveBlocker?.includes(RESOLVING_REASON) ? "An agent is resolving Drifts" : null,
  ]);
}
