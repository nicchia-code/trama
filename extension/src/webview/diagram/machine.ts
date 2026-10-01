import type { Change, MergedMachine, MergedState } from "../../../../src/core/merge";
import { type EdgeItem, type GEdge, type GNode, type GraphSpec, aggregateChange, node } from "./graph";
import { type Scene, findMergedState, flattenMerged, pathTo } from "./scene";

/** A collapsed State whose hidden part was touched shows as changed itself. */
function stateChange(s: MergedState, collapsed: boolean): Change {
  if (s.change !== "same" || !collapsed) return s.change;
  const inside = flattenMerged(s.children).flatMap((c) => [c.change, ...c.transitions.map((t) => t.change)]);
  return inside.some((c) => c !== "same") ? "changed" : "same";
}

/** The State a State is drawn as: itself, or its nearest ancestor that is collapsed. Null when it is not below `root`. */
export function visibleState(machine: MergedMachine, name: string, root: string | null, expanded: ReadonlySet<string>): string | null {
  const path = pathTo(machine, name);
  const start = root === null ? 0 : path.indexOf(root) + 1;
  if (start === 0 && root !== null) return null;
  for (let i = start; i < path.length; i++) {
    const s = path[i] as string;
    const state = findMergedState(machine, s) as MergedState;
    if (i === path.length - 1 || !(state.children.length > 0 && expanded.has(s))) return s;
  }
  return null;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Levels 3 and 4: the States of a Machine (`root` null) or of one State's sub-Machine as nodes, Transitions as edges.
 * States in `expanded` are drawn as containers holding their sub-States. A Transition whose end is hidden inside a
 * collapsed State attaches to that State; one declared on a parent is drawn once, from the parent.
 */
export function machineGraph(scene: Scene, machineId: string, root: string | null, expanded: ReadonlySet<string>): GraphSpec {
  const level = root === null ? ({ kind: "machine", machine: machineId } as const) : ({ kind: "state", machine: machineId, state: root } as const);
  const machine = scene.machine.get(machineId);
  const rootState = root === null || !machine ? null : (findMergedState(machine, root) ?? null);
  if (!machine || (root !== null && !rootState)) return { level, nodes: [], edges: [] };

  const nodes: GNode[] = [];
  const edges: GEdge[] = [];
  const isOpen = (s: MergedState) => s.children.length > 0 && expanded.has(s.name);

  const emit = (states: MergedState[], parent: string | null, key: string) => {
    const marker = `i:${key}`;
    if (states.some((s) => s.initial)) nodes.push(node({ id: marker, kind: "marker", label: "", parent, initial: true }));
    for (const s of states) {
      const open = isOpen(s);
      nodes.push(
        node({
          id: `s:${s.name}`,
          kind: "state",
          label: s.name,
          sub: s.children.length > 0 && !open ? plural(s.children.length, "sub-state") : "",
          ref: `${machine.id}/${s.name}`,
          parent,
          change: stateChange(s, !open),
          initial: s.initial,
          final: s.final,
          children: s.children.length,
          expanded: open,
        }),
      );
      if (s.initial) edges.push({ id: `ie:${marker}>${s.name}`, kind: "initial", source: marker, target: `s:${s.name}`, label: "", change: s.change === "added" || s.change === "removed" ? s.change : "same", refs: [], items: [] });
      if (open) emit(s.children, `s:${s.name}`, s.name);
    }
  };
  emit(rootState ? rootState.children : machine.states, null, "root");

  const grouped = new Map<string, GEdge>();
  const external = new Map<string, GNode>();
  const declaring = rootState ? flattenMerged(rootState.children) : flattenMerged(machine.states);
  for (const s of declaring) {
    const from = visibleState(machine, s.name, root, expanded) as string;
    for (const t of s.transitions) {
      const target = findMergedState(machine, t.target);
      if (!target) continue;
      const to = visibleState(machine, target.name, root, expanded);
      if (to === from && from !== s.name && to !== target.name) continue;
      let dst = `s:${to}`;
      if (to === null) {
        dst = `x:${target.name}`;
        if (!external.has(dst)) external.set(dst, node({ id: dst, kind: "state", label: target.name, ref: `${machine.id}/${target.name}`, final: target.final, external: true, layer: "last", change: target.change }));
      }
      const event = `${t.event.owner}.${t.event.name}`;
      const id = `t:s:${from}>${dst}#${event}`;
      let edge = grouped.get(id);
      if (!edge) grouped.set(id, (edge = { id, kind: "transition", source: `s:${from}`, target: dst, label: event, change: "same", refs: [], items: [] }));
      const ref = `${machine.id}/${s.name}/${event}`;
      if (!edge.refs.includes(ref)) edge.refs.push(ref);
      edge.items.push({ label: event, from: s.name, to: target.name, text: t.prose, change: t.change });
      edge.change = aggregateChange(edge.items.map((i) => i.change));
    }
  }
  nodes.push(...external.values());
  edges.push(...grouped.values());
  return { level, nodes, edges };
}
