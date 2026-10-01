import { buildModel, flattenStates } from "./model";
import { applied, getProposal } from "./proposals";
import { type Project, readModelFiles } from "./store";
import type { Model } from "./types";

/**
 * The Features whose code a change to these Model files can affect, among those that exist in `after`:
 * - a Machine file or `feature.md`: its own Feature;
 * - an Actor file: every Feature with a Machine that reacts to that Actor's Events, before or after;
 * - `system.md` changes no behaviour and affects none.
 */
export function affectedFeatures(before: Model, after: Model, paths: string[]): string[] {
  const features = new Set<string>();
  const actors = new Set<string>();
  for (const path of paths) {
    const parts = path.split("/");
    if (parts.length !== 2) continue;
    const id = (parts[1] as string).replace(/\.md$/, "");
    if (parts[0] === "actors") actors.add(id);
    else features.add(parts[0] as string);
  }
  if (actors.size > 0)
    for (const model of [before, after])
      for (const machine of model.machines.values())
        if (flattenStates(machine.states).some((s) => s.transitions.some((t) => actors.has(t.event.owner)))) features.add(machine.feature);
  return [...features].filter((f) => after.features.has(f)).sort();
}

/** The Features to re-scan once this open Proposal is approved, computed from the files it touches. */
export function proposalScope(p: Project, proposalId: string): string[] {
  const proposal = getProposal(p, proposalId);
  const paths = [...Object.keys(proposal.data.base), ...proposal.data.delete];
  return affectedFeatures(buildModel(readModelFiles(p)), buildModel(applied(p, proposal)), paths);
}
