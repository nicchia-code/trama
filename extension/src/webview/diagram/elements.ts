import type { Change, MergedMachine, MergedState, MergedTransition } from "../../../../src/core/merge";
import type { GraphSpec, Level } from "./graph";
import { REQUIREMENTS_PREFIX, parseTarget, sectionMatches } from "../requirements/logic";
import { type Scene, type SceneActor, type SceneFeature, findMergedState, pathTo } from "./scene";

export type EventOwner = { kind: "machine"; machine: MergedMachine } | { kind: "actor"; actor: SceneActor };

/** A part of the Model, found by its reference. */
export type Element =
  | { kind: "feature"; ref: string; feature: SceneFeature }
  | { kind: "machine"; ref: string; machine: MergedMachine }
  | { kind: "actor"; ref: string; actor: SceneActor }
  | { kind: "state"; ref: string; machine: MergedMachine; state: MergedState }
  | { kind: "transition"; ref: string; machine: MergedMachine; state: MergedState; owner: string; event: string; transitions: MergedTransition[] }
  | { kind: "event"; ref: string; owner: EventOwner; name: string; change: Change };

const EVENT_REF = /^(?:([a-z][a-z0-9]*(?:-[a-z0-9]+)*)\.)?([A-Z][A-Z0-9_]*)$/;

/** Whether a Drift reference points at something that exists: a Model element of the Scene, or a Requirement Area or section. */
export function refResolves(scene: Scene, ref: string): boolean {
  if (!ref.startsWith(REQUIREMENTS_PREFIX)) return resolveElement(scene, ref) !== null;
  const target = parseTarget(ref);
  const area = scene.areas.find((a) => a.id === target.area);
  if (!area) return false;
  const section = target.section;
  return section === null || area.fragments.some((f) => f.sections.some((s) => sectionMatches(s.ref, section)));
}

/** Resolves `order`, `order/Paid`, `order/Paid/user.CANCEL` or `user.CANCEL` against the Scene; null when nothing matches. */
export function resolveElement(scene: Scene, ref: string): Element | null {
  const parts = ref.trim().split("/");
  if (parts.length === 1) {
    const id = parts[0] as string;
    if (id.includes(".") && EVENT_REF.test(id)) {
      const [ownerId, name] = id.split(".") as [string, string];
      const machine = scene.machine.get(ownerId);
      if (machine) {
        const event = machine.events.find((e) => e.name === name);
        return event ? { kind: "event", ref: id, owner: { kind: "machine", machine }, name, change: event.change } : null;
      }
      const actor = scene.actor.get(ownerId);
      const event = actor?.events.find((e) => e.name === name);
      return actor && event ? { kind: "event", ref: id, owner: { kind: "actor", actor }, name, change: event.change } : null;
    }
    const feature = scene.feature.get(id);
    if (feature) return { kind: "feature", ref: id, feature };
    const machine = scene.machine.get(id);
    if (machine) return { kind: "machine", ref: id, machine };
    const actor = scene.actor.get(id);
    return actor ? { kind: "actor", ref: id, actor } : null;
  }

  if (parts.length > 3) return null;
  const machine = scene.machine.get(parts[0] as string);
  const state = machine && findMergedState(machine, parts[1] as string);
  if (!machine || !state) return null;
  if (parts.length === 2) return { kind: "state", ref: `${machine.id}/${state.name}`, machine, state };

  const m = EVENT_REF.exec(parts[2] as string);
  if (!m) return null;
  const owner = m[1] ?? machine.id;
  const event = m[2] as string;
  const transitions = state.transitions.filter((t) => t.event.owner === owner && t.event.name === event);
  if (transitions.length === 0) return null;
  return { kind: "transition", ref: `${machine.id}/${state.name}/${owner}.${event}`, machine, state, owner, event, transitions };
}

/** The level a reference is reached at when nothing else says otherwise. */
export function homeLevel(element: Element): Level {
  switch (element.kind) {
    case "feature":
    case "actor":
      return { kind: "system" };
    case "machine":
      return { kind: "feature", feature: element.machine.feature };
    case "state":
    case "transition":
      return { kind: "machine", machine: element.machine.id };
    case "event":
      return element.owner.kind === "actor" ? { kind: "system" } : { kind: "feature", feature: element.owner.machine.feature };
  }
}

/** Where an element is found in a graph: a node, the whole level (it is what the level shows), or nowhere. */
export type Anchor = { node: string } | "self" | null;

function stateAnchor(graph: GraphSpec, machine: MergedMachine, state: string): Anchor {
  const level = graph.level;
  if (level.kind !== "machine" && level.kind !== "state") return null;
  if (level.machine !== machine.id) return null;
  const path = pathTo(machine, state);
  for (let i = path.length - 1; i >= 0; i--) {
    const name = path[i] as string;
    if (level.kind === "state" && name === level.state) return "self";
    const id = `s:${name}`;
    if (graph.nodes.some((n) => n.id === id)) return { node: id };
  }
  return null;
}

/** Finds the node that shows an element in this graph, climbing to the nearest visible ancestor for hidden States. */
export function anchorIn(graph: GraphSpec, element: Element): Anchor {
  const level = graph.level;
  const has = (id: string): Anchor => (graph.nodes.some((n) => n.id === id) ? { node: id } : null);
  const machineOf = (e: Element): MergedMachine | null => (e.kind === "machine" || e.kind === "state" || e.kind === "transition" ? e.machine : null);
  const owner = element.kind === "event" ? element.owner : null;

  switch (level.kind) {
    case "system": {
      if (element.kind === "actor") return has(`a:${element.actor.id}`);
      if (owner?.kind === "actor") return has(`a:${owner.actor.id}`);
      if (element.kind === "feature") return has(`f:${element.feature.id}`);
      const machine = machineOf(element) ?? (owner?.kind === "machine" ? owner.machine : null);
      return machine ? has(`f:${machine.feature}`) : null;
    }
    case "feature": {
      if (element.kind === "feature") return element.feature.id === level.feature ? "self" : null;
      if (element.kind === "actor") return has(`a:${element.actor.id}`);
      if (owner?.kind === "actor") return has(`a:${owner.actor.id}`);
      const machine = machineOf(element) ?? (owner?.kind === "machine" ? owner.machine : null);
      return machine ? has(`m:${machine.id}`) : null;
    }
    case "machine":
    case "state": {
      if (element.kind === "machine") return element.machine.id === level.machine ? "self" : null;
      if (owner?.kind === "machine") return owner.machine.id === level.machine ? "self" : null;
      if (element.kind === "state" || element.kind === "transition") return stateAnchor(graph, element.machine, element.state.name);
      return null;
    }
  }
}

/** The node or edge to select in a graph for an element; Transitions select their edge. */
export function selectionFor(graph: GraphSpec, element: Element): string | null {
  if (element.kind === "transition") {
    const edge = graph.edges.find((e) => e.refs.includes(element.ref));
    if (edge) return edge.id;
  }
  const anchor = anchorIn(graph, element);
  return anchor && anchor !== "self" ? anchor.node : null;
}

/** True when the graph draws exactly this element (or, for an Event, its owner), not merely something that contains it. */
export function showsElement(graph: GraphSpec, element: Element): boolean {
  if (element.kind === "transition") return graph.edges.some((e) => e.refs.includes(element.ref));
  const anchor = anchorIn(graph, element);
  if (!anchor || anchor === "self") return false;
  const shown = graph.nodes.find((n) => n.id === anchor.node)?.ref;
  return shown === (element.kind === "event" ? (element.owner.kind === "actor" ? element.owner.actor.id : element.owner.machine.id) : element.ref);
}
