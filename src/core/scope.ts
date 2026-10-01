import { flattenStates } from "./model";
import { applied, getProposal } from "./proposals";
import { type Area, buildProject, featuresOfRef, type ProjectModel } from "./requirements";
import { type Project, readTrackedFiles, REQUIREMENTS_PREFIX } from "./store";
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

/**
 * Features affected by changed Requirement files: the Features of the sections that changed, or every Feature
 * when a part that applies to the whole System (General, intro, description) changed.
 */
function affectedByRequirements(before: ProjectModel, after: ProjectModel, paths: string[]): string[] {
  const features = new Set<string>();
  for (const path of paths) {
    if (!path.startsWith(REQUIREMENTS_PREFIX)) continue;
    const id = path.slice(REQUIREMENTS_PREFIX.length).replace(/\.md$/, "");
    const was = before.areas.find((a) => a.id === id);
    const is = after.areas.find((a) => a.id === id);
    const text = (area: Area | undefined, ref: string | null) => area?.sections.find((s) => s.ref === ref)?.text ?? "";
    if (text(was, null) !== text(is, null) || was?.intro !== is?.intro) return [...after.model.features.keys()].sort();
    const refs = new Set([...(was?.sections ?? []), ...(is?.sections ?? [])].flatMap((s) => (s.ref === null ? [] : [s.ref])));
    for (const ref of refs) {
      if (text(was, ref) === text(is, ref)) continue;
      for (const f of [...featuresOfRef(before.model, ref), ...featuresOfRef(after.model, ref)]) features.add(f);
    }
  }
  return [...features].filter((f) => after.model.features.has(f));
}

/** The Features to re-scan once this open Proposal is approved, computed from the files it touches. */
export function proposalScope(p: Project, proposalId: string): string[] {
  const proposal = getProposal(p, proposalId);
  const paths = [...Object.keys(proposal.data.base), ...proposal.data.delete];
  const before = buildProject(readTrackedFiles(p));
  const after = buildProject(applied(p, proposal));
  const modelPaths = paths.filter((path) => !path.startsWith(REQUIREMENTS_PREFIX));
  return [...new Set([...affectedFeatures(before.model, after.model, modelPaths), ...affectedByRequirements(before, after, paths)])].sort();
}
