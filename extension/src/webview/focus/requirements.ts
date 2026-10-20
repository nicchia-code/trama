import type { AreaView, FragmentView, SectionView, Snapshot } from "../../../../src/core/snapshot";
import { type Element, resolveElement } from "../diagram/elements";
import { type Scene, buildScene, pathTo } from "../diagram/scene";
import { REQUIREMENTS_PREFIX, areasWith, parseTarget, sectionMatches, visibleSections } from "../requirements/logic";
import { type FocusSpec, type Step, type Steps, isSpecsRef } from "./spec";

/** A Requirement section or a whole Area, in the order of the page. */
export interface RequirementStep extends Step {
  area: string;
  /** Null for a whole Area. */
  section: string | null;
}

/** A section as the page draws it. */
export interface PageSection {
  area: AreaView;
  fragment: FragmentView;
  section: SectionView;
  key: string;
}

/** The key of a section, the same however the reference is written: `<area>#<section>`, `General` for the one without a reference. */
export const sectionKey = (area: string, ref: string | null): string => `${area.toLowerCase()}#${(ref ?? "General").toLowerCase()}`;

/** The key of an Area taken whole. */
export const areaKey = (area: string): string => area.toLowerCase();

/** Every section the Requirements tab draws, from the top of the page down. */
export function pageSections(areas: readonly AreaView[]): PageSection[] {
  return areas.flatMap((area) => area.fragments.flatMap((fragment) => visibleSections(fragment.sections).map((section) => ({ area, fragment, section, key: sectionKey(area.id, section.ref) }))));
}

/** Whether `element` is `named` or something it contains: a Feature its Machines and what they contain, a Machine its States, Transitions and Events, a State its sub-States and the Transitions that leave it or them, an Actor its Events. */
export function contains(named: Element, element: Element): boolean {
  if (named.kind === element.kind && named.ref === element.ref) return true;
  switch (named.kind) {
    case "feature":
      if (element.kind === "machine" || element.kind === "state" || element.kind === "transition") return element.machine.feature === named.feature.id;
      return element.kind === "event" && element.owner.kind === "machine" && element.owner.machine.feature === named.feature.id;
    case "machine":
      if (element.kind === "state" || element.kind === "transition") return element.machine.id === named.machine.id;
      return element.kind === "event" && element.owner.kind === "machine" && element.owner.machine.id === named.machine.id;
    case "actor":
      return element.kind === "event" && element.owner.kind === "actor" && element.owner.actor.id === named.actor.id;
    case "state":
      return (element.kind === "state" || element.kind === "transition") && element.machine.id === named.machine.id && pathTo(element.machine, element.state.name).includes(named.state.name);
    default:
      return false;
  }
}

/**
 * The sections and Areas of the focus, in the order of the page, and the references the tab does not have. A Proposal's focus is
 * its scope's sections and Areas plus every section it adds, changes, removes or moves; a Task's (or a chip's) is the sections
 * and Areas it names plus, for each Model element it names, the sections titled to it or to something it contains, in every Area.
 */
export function requirementSteps(snapshot: Snapshot, spec: FocusSpec): Steps<RequirementStep> {
  const proposal = snapshot.proposals.find((p) => p.id === spec.proposal);
  const areas = areasWith(snapshot, proposal);
  const page = pageSections(areas);
  const wholeAreas = new Set<string>();
  const sections = new Set<string>();
  const missing: string[] = [];
  let scene: Scene | null = null;
  const titled = (ref: string) => resolveElement((scene ??= buildScene(snapshot, spec.proposal)), ref);

  for (const ref of spec.refs) {
    if (isSpecsRef(ref)) continue;
    if (ref.startsWith(REQUIREMENTS_PREFIX)) {
      const target = parseTarget(ref);
      const area = areas.find((a) => a.id === target.area);
      if (!area) {
        missing.push(ref);
        continue;
      }
      if (target.section === null) {
        wholeAreas.add(area.id);
        continue;
      }
      const section = target.section;
      const hits = page.filter((p) => p.area.id === area.id && sectionMatches(p.section.ref, section));
      if (hits.length === 0) missing.push(ref);
      for (const hit of hits) sections.add(hit.key);
      continue;
    }
    if (spec.proposal !== null) continue;
    const named = titled(ref);
    if (!named) {
      missing.push(ref);
      continue;
    }
    for (const p of page) {
      const element = p.section.ref === null ? null : titled(p.section.ref);
      if (element && contains(named, element)) sections.add(p.key);
    }
  }
  if (spec.proposal !== null) for (const p of page) if (p.section.change !== "same" || p.section.movedFrom !== null) sections.add(p.key);

  const steps: RequirementStep[] = [];
  for (const area of areas) {
    if (wholeAreas.has(area.id)) {
      steps.push({ key: areaKey(area.id), name: area.title || area.id, area: area.id, section: null });
      continue;
    }
    for (const p of page) {
      if (p.area.id === area.id && sections.has(p.key)) steps.push({ key: p.key, name: p.section.ref ?? `General (${area.id})`, area: area.id, section: p.section.ref ?? "General" });
    }
  }
  return { steps, missing };
}
