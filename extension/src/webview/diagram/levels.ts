import { withDrifts } from "./drifts";
import type { GraphSpec, Level } from "./graph";
import { machineGraph } from "./machine";
import { featureGraph, systemGraph } from "./overview";
import { type Scene, findMergedState, pathTo } from "./scene";

export interface Crumb {
  label: string;
  level: Level;
}

/** `System › checkout › order › Paid`, each part leading to its own level. */
export function breadcrumb(scene: Scene, level: Level): Crumb[] {
  const trail: Crumb[] = [{ label: "System", level: { kind: "system" } }];
  if (level.kind === "feature") trail.push({ label: level.feature, level });
  if (level.kind === "machine" || level.kind === "state") {
    const machine = scene.machine.get(level.machine);
    if (machine) trail.push({ label: machine.feature, level: { kind: "feature", feature: machine.feature } });
    trail.push({ label: level.machine, level: { kind: "machine", machine: level.machine } });
    if (machine && level.kind === "state") {
      for (const state of pathTo(machine, level.state)) trail.push({ label: state, level: { kind: "state", machine: level.machine, state } });
    }
  }
  return trail;
}

/** The level itself when the Scene still has what it shows; otherwise the closest level that exists. */
export function validLevel(scene: Scene, level: Level): Level {
  switch (level.kind) {
    case "system":
      return level;
    case "feature":
      return scene.feature.has(level.feature) ? level : { kind: "system" };
    case "machine":
      return scene.machine.has(level.machine) ? level : { kind: "system" };
    case "state": {
      const machine = scene.machine.get(level.machine);
      if (!machine) return { kind: "system" };
      const state = findMergedState(machine, level.state);
      return state && state.children.length > 0 ? { ...level, state: state.name } : { kind: "machine", machine: level.machine };
    }
  }
}

/** The Feature a Scan started here would be limited to; undefined scans the whole System. */
export function scanFeature(scene: Scene, level: Level): string | undefined {
  if (level.kind === "feature") return level.feature;
  if (level.kind === "machine" || level.kind === "state") return scene.machine.get(level.machine)?.feature;
  return undefined;
}

/** Expanded States of each Machine, by Machine ID. */
export type Expanded = ReadonlyMap<string, ReadonlySet<string>>;

/** The graph of a level with today's open Drifts drawn over it. */
export function buildGraph(scene: Scene, level: Level, expanded: Expanded): GraphSpec {
  const none: ReadonlySet<string> = new Set();
  const base =
    level.kind === "system"
      ? systemGraph(scene)
      : level.kind === "feature"
        ? featureGraph(scene, level.feature)
        : machineGraph(scene, level.machine, level.kind === "state" ? level.state : null, level.kind === "machine" ? (expanded.get(level.machine) ?? none) : none);
  return withDrifts(base, scene);
}

/** Where a node leads when drilled into; null for nodes with nothing below them. */
export function drillTarget(graph: GraphSpec, id: string): Level | null {
  const n = graph.nodes.find((x) => x.id === id);
  if (!n?.ref) return null;
  if (n.kind === "feature") return { kind: "feature", feature: n.ref };
  if (n.kind === "machine") return { kind: "machine", machine: n.ref };
  if (n.kind === "state" && n.children > 0 && !n.external && (graph.level.kind === "machine" || graph.level.kind === "state")) {
    return { kind: "state", machine: graph.level.machine, state: n.label };
  }
  return null;
}
