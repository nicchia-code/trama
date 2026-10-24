import { withDrifts } from "./drifts";
import { type GraphSpec, type Level, type Origin, originOf, withOrigin } from "./graph";
import { machineGraph } from "./machine";
import { actorGraph, actorReach, featureGraph, rootGraph, wholeGraph } from "./overview";
import { type Scene, findMergedState, pathTo } from "./scene";

export interface Crumb {
  label: string;
  level: Level;
}

/** `System › user › checkout › order › Paid`, each part leading to its own level; the Actor or Whole System a Feature was opened from comes before it. */
export function breadcrumb(scene: Scene, level: Level): Crumb[] {
  const trail: Crumb[] = [{ label: "System", level: { kind: "system" } }];
  if (level.kind === "whole") trail.push({ label: "Whole System", level });
  if (level.kind === "actor") trail.push({ label: level.actor, level });
  const from = originOf(level);
  if (from?.kind === "whole") trail.push({ label: "Whole System", level: { kind: "whole" } });
  if (from?.kind === "actor") trail.push({ label: from.actor, level: { kind: "actor", actor: from.actor } });
  if (level.kind === "feature") trail.push({ label: level.feature, level });
  if (level.kind === "machine" || level.kind === "state") {
    const machine = scene.machine.get(level.machine);
    if (machine) trail.push({ label: machine.feature, level: withOrigin({ kind: "feature", feature: machine.feature }, from) });
    trail.push({ label: level.machine, level: withOrigin({ kind: "machine", machine: level.machine }, from) });
    if (machine && level.kind === "state") {
      for (const state of pathTo(machine, level.state)) trail.push({ label: state, level: withOrigin({ kind: "state", machine: level.machine, state }, from) });
    }
  }
  return trail;
}

/** The System has nothing to draw: no Feature and no Actor, the drawn Proposal included. Open Drifts alone do not count. */
export function isEmptyModel(scene: Scene): boolean {
  return scene.features.length === 0 && scene.actors.length === 0;
}

/** The origin a level remembers while it still exists: an Actor that is gone, or whose Events reach no Machine, drops out. */
function validOrigin(scene: Scene, from: Origin | undefined): Origin | undefined {
  return from?.kind === "actor" && actorReach(scene, from.actor).length === 0 ? undefined : from;
}

/** The level itself when the Scene still has what it shows; otherwise the closest level that exists. */
export function validLevel(scene: Scene, level: Level): Level {
  switch (level.kind) {
    case "system":
    case "whole":
      return level;
    case "actor":
      return actorReach(scene, level.actor).length > 0 ? level : { kind: "system" };
    case "feature":
      return scene.feature.has(level.feature) ? withOrigin(level, validOrigin(scene, level.from)) : { kind: "system" };
    case "machine":
      return scene.machine.has(level.machine) ? withOrigin(level, validOrigin(scene, level.from)) : { kind: "system" };
    case "state": {
      const machine = scene.machine.get(level.machine);
      if (!machine) return { kind: "system" };
      const from = validOrigin(scene, level.from);
      const state = findMergedState(machine, level.state);
      return state && state.children.length > 0 ? withOrigin({ ...level, state: state.name }, from) : withOrigin({ kind: "machine", machine: level.machine }, from);
    }
  }
}

/** Expanded States of each Machine, by Machine ID. */
export type Expanded = ReadonlyMap<string, ReadonlySet<string>>;

/** The graph of a level with today's open Drifts drawn over it. */
export function buildGraph(scene: Scene, level: Level, expanded: Expanded): GraphSpec {
  const none: ReadonlySet<string> = new Set();
  const base =
    level.kind === "system"
      ? rootGraph(scene)
      : level.kind === "whole"
        ? wholeGraph(scene)
        : level.kind === "actor"
          ? actorGraph(scene, level.actor)
          : level.kind === "feature"
            ? featureGraph(scene, level.feature)
            : machineGraph(scene, level.machine, level.kind === "state" ? level.state : null, level.kind === "machine" ? (expanded.get(level.machine) ?? none) : none);
  // The level as asked, with the origin it remembers.
  return withDrifts({ ...base, level }, scene);
}

/**
 * Where a node leads when drilled into; null for nodes with nothing below them. A Feature opened from Whole System or from an Actor's level remembers
 * it as its origin; a Machine of another Feature, drawn at the border, opens that Feature with no origin.
 */
export function drillTarget(scene: Scene, graph: GraphSpec, id: string): Level | null {
  const n = graph.nodes.find((x) => x.id === id);
  if (!n) return null;
  const level = graph.level;
  if (n.kind === "whole") return { kind: "whole" };
  if (n.kind === "actor") return n.opens && n.ref ? { kind: "actor", actor: n.ref } : null;
  if (!n.ref) return null;
  if (n.kind === "feature") return withOrigin({ kind: "feature", feature: n.ref }, level.kind === "whole" ? { kind: "whole" } : level.kind === "actor" ? { kind: "actor", actor: level.actor } : undefined);
  if (n.kind === "machine") {
    if (!n.external) return withOrigin({ kind: "machine", machine: n.ref }, originOf(level));
    const feature = scene.machine.get(n.ref)?.feature;
    return feature ? { kind: "feature", feature } : null;
  }
  if (n.kind === "state" && n.children > 0 && !n.external && (level.kind === "machine" || level.kind === "state")) {
    return withOrigin({ kind: "state", machine: level.machine, state: n.label }, originOf(level));
  }
  return null;
}
