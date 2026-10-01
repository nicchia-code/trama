import type { AreaView, ProposalView, Snapshot } from "../../../../src/core/snapshot";
import type { ViewName } from "../../protocol";

export const REQUIREMENTS_PREFIX = "requirements/";

/** Where a reference is shown: Requirement references in the Requirements tab, everything else on the Diagram. */
export const viewOfRef = (ref: string): ViewName => (ref.startsWith(REQUIREMENTS_PREFIX) ? "requirements" : "diagram");

/** `requirements/ui#order/Paid` → `{ area: "ui", section: "order/Paid" }`; a Model reference → `{ section: ref }`. */
export function parseTarget(ref: string): { area: string | null; section: string | null } {
  if (!ref.startsWith(REQUIREMENTS_PREFIX)) return { area: null, section: ref };
  const rest = ref.slice(REQUIREMENTS_PREFIX.length);
  const hash = rest.indexOf("#");
  return hash < 0 ? { area: rest, section: null } : { area: rest.slice(0, hash), section: rest.slice(hash + 1) };
}

/** Whether a section is the one a target points at; `General` matches the section without a reference. */
export function sectionMatches(sectionRef: string | null, target: string): boolean {
  if (sectionRef === null) return target.toLowerCase() === "general";
  return sectionRef.toLowerCase() === target.toLowerCase();
}

/** The Areas as they are, with those the Proposal touches replaced by their before-and-after view. */
export function areasWith(snapshot: Snapshot, proposal: ProposalView | undefined): AreaView[] {
  if (!proposal) return snapshot.areas;
  const touched = new Map(proposal.areas.map((a) => [a.id, a]));
  const shown = snapshot.areas.map((a) => touched.get(a.id) ?? a);
  for (const a of proposal.areas) if (!snapshot.areas.some((x) => x.id === a.id)) shown.push(a);
  return shown.sort((a, b) => a.id.localeCompare(b.id));
}

/** Whether a Proposal changes the Model, its Requirements, or both: decides which tab its "View" buttons open. */
export function proposalTouches(p: Pick<ProposalView, "changes">): { model: boolean; requirements: boolean } {
  const requirements = p.changes.some((c) => c.path.startsWith(REQUIREMENTS_PREFIX));
  const model = p.changes.some((c) => !c.path.startsWith(REQUIREMENTS_PREFIX));
  return { model, requirements };
}

/** Sections of an Area that say something, or that a Proposal adds, changes or removes. */
export const visibleSections = (area: AreaView) => area.sections.filter((s) => s.text !== "" || s.change !== "same" || s.before !== null);
