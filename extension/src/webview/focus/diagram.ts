import { type Element, homeLevel, resolveElement, selectionFor } from "../diagram/elements";
import { type GraphSpec, type Level, sameLevel } from "../diagram/graph";
import { breadcrumb } from "../diagram/levels";
import type { Scene } from "../diagram/scene";
import { REQUIREMENTS_PREFIX, parseTarget } from "../requirements/logic";
import { type FocusSpec, type Step, type Steps, isSpecsRef } from "./spec";

/** A level that shows elements of the focus, with all of them. */
export interface DiagramStep extends Step {
  level: Level;
  /** The references of the elements of the focus this level shows, as the Model writes them. */
  refs: string[];
  elements: Element[];
}

const levelKey = (level: Level): string => {
  switch (level.kind) {
    case "system":
    case "whole":
      return level.kind;
    case "actor":
      return `actor:${level.actor}`;
    case "feature":
      return `feature:${level.feature}`;
    case "machine":
      return `machine:${level.machine}`;
    case "state":
      return `state:${level.machine}/${level.state}`;
  }
};

/** The element a focus reference stands for in the Diagram: a Model element, or the one a Requirement section is titled to. Null when it has none (an Area, `General`, Specs). */
function elementRef(ref: string): string | null {
  if (isSpecsRef(ref)) return null;
  if (!ref.startsWith(REQUIREMENTS_PREFIX)) return ref;
  const { section } = parseTarget(ref);
  return section === null || section.toLowerCase() === "general" ? null : section;
}

/**
 * The levels that show elements of the focus, in the order of the Model: the root, then each Actor level, then each Feature followed by its
 * Machines. A reference whose element is not in the drawn Model is missing; Areas, `General` sections and Specs entries are not
 * Diagram elements and are neither a step nor missing.
 */
export function diagramSteps(scene: Scene, refs: readonly string[]): Steps<DiagramStep> {
  const found = new Map<string, Element>();
  const missing: string[] = [];
  for (const ref of refs) {
    const target = elementRef(ref);
    if (target === null) continue;
    const element = resolveElement(scene, target);
    if (element) {
      found.set(`${element.kind}:${element.ref}`, element);
      // A Feature stands for its Machines too: its own level shows them all as elements of the focus.
      if (element.kind === "feature") {
        for (const id of element.feature.machines) {
          const machine = scene.machine.get(id);
          if (machine) found.set(`machine:${id}`, { kind: "machine", ref: id, machine });
        }
      }
    } else if (!missing.includes(ref)) missing.push(ref);
  }
  const byLevel = new Map<string, Element[]>();
  for (const element of found.values()) {
    const key = levelKey(homeLevel(scene, element));
    byLevel.set(key, [...(byLevel.get(key) ?? []), element]);
  }
  const order: Level[] = [{ kind: "system" }, ...scene.actors.map((actor): Level => ({ kind: "actor", actor: actor.id }))];
  for (const feature of scene.features) {
    order.push({ kind: "feature", feature: feature.id });
    for (const machine of feature.machines) order.push({ kind: "machine", machine });
  }
  const steps: DiagramStep[] = [];
  for (const level of order) {
    const elements = byLevel.get(levelKey(level));
    if (!elements) continue;
    const trail = breadcrumb(scene, level);
    steps.push({ key: levelKey(level), name: level.kind === "actor" ? trail.map((c) => c.label).join(" › ") : (trail.at(-1)?.label ?? "System"), level, refs: elements.map((e) => e.ref), elements });
  }
  return { steps, missing };
}

/** The nodes and edges of the graph that are elements of the focus: those whose home level is the level drawn. Empty when the level has none. */
export function highlightedIds(graph: GraphSpec, steps: readonly DiagramStep[]): string[] {
  const ids = new Set<string>();
  for (const step of steps) {
    if (!sameLevel(step.level, graph.level)) continue;
    for (const element of step.elements) {
      const id = selectionFor(graph, element);
      if (id !== null) ids.add(id);
    }
  }
  return [...ids];
}

/** The focus as the Diagram shows it: its steps, what is missing, the step of the level drawn and what to highlight there. */
export interface DiagramFocus {
  title: string;
  steps: DiagramStep[];
  missing: string[];
  /** Position of the step whose level is drawn; -1 on a level (opened by hand) with no element of the focus. */
  index: number;
  /** Nodes and edges of the level drawn that are elements of the focus; empty when it has none, and then nothing is dimmed. */
  highlight: string[];
}

export function diagramFocus(scene: Scene, graph: GraphSpec, spec: FocusSpec): DiagramFocus {
  const { steps, missing } = diagramSteps(scene, spec.refs);
  return { title: spec.title, steps, missing, index: steps.findIndex((s) => sameLevel(s.level, graph.level)), highlight: highlightedIds(graph, steps) };
}
