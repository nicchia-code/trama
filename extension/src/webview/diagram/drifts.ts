import { cardLabel } from "../../../../src/core/card-names";
import { type Element, anchorIn, refResolves, resolveElement } from "./elements";
import type { GEdge, GNode, GraphSpec } from "./graph";
import { node } from "./graph";
import type { Scene } from "./scene";

export interface UnresolvedRef {
  drift: string;
  ref: string;
}

/** Drift references that point at nothing in the Scene. */
export function unresolvedRefs(scene: Scene): UnresolvedRef[] {
  return scene.drifts.flatMap((d) => d.refs.filter((ref) => !refResolves(scene, ref)).map((ref) => ({ drift: d.id, ref })));
}

/** True when the Drift's element lies below the node that shows it, so the node gets a badge instead of an exact outline. */
function isInside(n: GNode, el: Element): boolean {
  if (n.kind === "state") return (el.kind === "state" || el.kind === "transition") && el.state.name !== n.label;
  return n.ref !== el.ref;
}

const badge = (n: number) => `⚠ ${n} ${n === 1 ? "drift" : "drifts"} inside`;

/**
 * Draws open Drifts over a graph: a red ghost node joined to the element the first resolvable reference shows at this
 * level, and a red outline on every element any reference shows. Elements that only contain the Drift get a badge.
 * A Drift with no such element (only Requirements, or nothing that exists) floats as a ghost without an edge on the
 * System level, so every open Drift has a node and its details there.
 */
export function withDrifts(graph: GraphSpec, scene: Scene): GraphSpec {
  const nodes: GNode[] = graph.nodes.map((n) => ({ ...n, drifts: [] }));
  const inside = new Map<string, Set<string>>();
  const ghosts: GNode[] = [];
  const edges: GEdge[] = [...graph.edges];
  const ghostOf = (id: string): GNode => node({ id: `d:${id}`, kind: "drift", label: `Drift ${cardLabel(scene.numbers, "drift", id)}`, drift: id });

  for (const drift of scene.drifts) {
    let placed = false;
    for (const ref of drift.refs) {
      const el = resolveElement(scene, ref);
      const anchor = el ? anchorIn(graph, el) : null;
      if (!el || !anchor) continue;
      if (anchor !== "self") {
        const target = nodes.find((n) => n.id === anchor.node) as GNode;
        if (!target.drifts.includes(drift.id)) target.drifts.push(drift.id);
        if (isInside(target, el)) inside.set(target.id, (inside.get(target.id) ?? new Set<string>()).add(drift.id));
      }
      if (placed) continue;
      placed = true;
      ghosts.push(ghostOf(drift.id));
      if (anchor !== "self") {
        edges.push({ id: `de:${drift.id}`, kind: "drift", source: `d:${drift.id}`, target: anchor.node, label: "", change: "same", refs: [], items: [] });
      }
    }
    if (!placed && graph.level.kind === "system") ghosts.push(ghostOf(drift.id));
  }

  for (const n of nodes) {
    const count = inside.get(n.id)?.size;
    if (count) n.sub = n.sub ? `${n.sub} · ${badge(count)}` : badge(count);
  }
  return { ...graph, nodes: [...nodes, ...ghosts], edges };
}
