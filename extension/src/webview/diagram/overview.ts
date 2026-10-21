import type { Change, MergedMachine } from "../../../../src/core/merge";
import { type EdgeItem, type GEdge, type GNode, type GraphSpec, type Level, aggregateChange, node } from "./graph";
import { type Scene, type SceneActor, type SceneFeature, actorChange, featureChange, flattenMerged, machineChange } from "./scene";

/** One Transition seen as an Event travelling from its owner to the Machine that reacts to it. */
export interface Flow {
  source: { kind: "actor" | "machine"; id: string };
  /** The receiving Machine. */
  machine: string;
  /** State the Transition is declared on. */
  state: string;
  target: string;
  /** `owner.NAME` */
  event: string;
  prose: string;
  change: Change;
}

/** Every Transition whose Event owner is known, in Model order. */
export function flows(scene: Scene): Flow[] {
  const out: Flow[] = [];
  for (const machine of scene.machines) {
    for (const state of flattenMerged(machine.states)) {
      for (const t of state.transitions) {
        const kind = scene.actor.has(t.event.owner) ? "actor" : scene.machine.has(t.event.owner) ? "machine" : null;
        if (!kind) continue;
        out.push({
          source: { kind, id: t.event.owner },
          machine: machine.id,
          state: state.name,
          target: t.target,
          event: `${t.event.owner}.${t.event.name}`,
          prose: t.prose,
          change: t.change,
        });
      }
    }
  }
  return out;
}

interface Pair {
  source: string;
  target: string;
  flows: Flow[];
}

/** Groups Flows by the pair of nodes they join, in first-seen order; Flows inside one node are dropped. */
function pairs(all: Flow[], nodeOf: (f: Flow) => { source: string; target: string } | null): Pair[] {
  const out = new Map<string, Pair>();
  for (const f of all) {
    const ends = nodeOf(f);
    if (!ends || ends.source === ends.target) continue;
    const key = `${ends.source}>${ends.target}`;
    let pair = out.get(key);
    if (!pair) out.set(key, (pair = { ...ends, flows: [] }));
    pair.flows.push(f);
  }
  return [...out.values()];
}

/** One item per distinct Event of a pair, saying which States receive it. */
function eventItems(fl: Flow[]): EdgeItem[] {
  const byEvent = new Map<string, Flow[]>();
  for (const f of fl) byEvent.set(f.event, [...(byEvent.get(f.event) ?? []), f]);
  return [...byEvent].map(([event, list]) => ({
    label: event,
    from: null,
    to: null,
    text: `received by ${[...new Set(list.map((f) => `${f.machine}/${f.state}`))].join(", ")}`,
    change: aggregateChange(list.map((f) => f.change)),
  }));
}

export const machineCount = (n: number) => `${n} ${n === 1 ? "machine" : "machines"}`;
export const stateCount = (m: MergedMachine) => {
  const n = flattenMerged(m.states).length;
  return `${n} ${n === 1 ? "state" : "states"}`;
};

function flowEdge(id: string, pair: Pair, label: string): GEdge {
  const items = eventItems(pair.flows);
  return { id, kind: "flow", source: pair.source, target: pair.target, label, change: aggregateChange(items.map((i) => i.change)), refs: [], items };
}

const featureOfMachine = (scene: Scene, id: string) => scene.machine.get(id)?.feature as string;

/** The Features that receive Events of an Actor, in Model order; empty when its Events reach no Machine. */
export function actorReach(scene: Scene, actorId: string): string[] {
  const reached = new Set(flows(scene).filter((f) => f.source.kind === "actor" && f.source.id === actorId).map((f) => featureOfMachine(scene, f.machine)));
  return scene.features.filter((f) => reached.has(f.id)).map((f) => f.id);
}

/** The Features that some Actor's Events reach. */
function reachedFeatures(scene: Scene): Set<string> {
  return new Set(flows(scene).filter((f) => f.source.kind === "actor").map((f) => featureOfMachine(scene, f.machine)));
}

const featureNode = (scene: Scene, f: SceneFeature): GNode => node({ id: `f:${f.id}`, kind: "feature", label: f.name, sub: machineCount(f.machines.length), ref: f.id, change: featureChange(scene, f), children: 0 });

/** The root: Whole System, the Actors in Model order and the Features no Actor reaches, as nodes with no arrows. */
export function rootGraph(scene: Scene): GraphSpec {
  const nodes: GNode[] = [];
  if (scene.features.length > 0 || scene.actors.length > 0) {
    nodes.push(node({ id: "w:system", kind: "whole", label: "Whole System", sub: "All Actors and Features" }));
  }
  for (const a of scene.actors) {
    const n = actorReach(scene, a.id).length;
    nodes.push(node({ id: `a:${a.id}`, kind: "actor", label: a.name, sub: n === 0 ? "No events received" : `${n} ${n === 1 ? "feature" : "features"}`, ref: a.id, change: actorChange(a), inert: n === 0, opens: n > 0 }));
  }
  const reached = reachedFeatures(scene);
  for (const f of scene.features) if (!reached.has(f.id)) nodes.push(featureNode(scene, f));
  return { level: { kind: "system" }, nodes, edges: [] };
}

const actorNode = (a: SceneActor): GNode => node({ id: `a:${a.id}`, kind: "actor", label: a.name, sub: `${a.events.length} ${a.events.length === 1 ? "event" : "events"}`, ref: a.id, change: actorChange(a), layer: "first" });

/** The Features with the Actors that send Events into them and the Events between Features; an edge's label is how many Events. */
function flowGraph(scene: Scene, level: Level, actors: SceneActor[], features: SceneFeature[]): GraphSpec {
  const nodes: GNode[] = [...actors.map(actorNode), ...features.map((f) => featureNode(scene, f))];
  const ids = new Set(nodes.map((n) => n.id));
  const edges = pairs(flows(scene), (f) => {
    const source = f.source.kind === "actor" ? `a:${f.source.id}` : `f:${featureOfMachine(scene, f.source.id)}`;
    const target = `f:${featureOfMachine(scene, f.machine)}`;
    return ids.has(source) && ids.has(target) ? { source, target } : null;
  }).map((p) => flowEdge(`e:${p.source}>${p.target}`, p, String(new Set(p.flows.map((f) => f.event)).size)));
  return { level, nodes, edges };
}

/** Whole System: every Actor and Feature, and the Events travelling between them. */
export function wholeGraph(scene: Scene): GraphSpec {
  return flowGraph(scene, { kind: "whole" }, scene.actors, scene.features);
}

/** One Actor, the Features that receive its Events and the Events those Features send each other. */
export function actorGraph(scene: Scene, actorId: string): GraphSpec {
  const actor = scene.actor.get(actorId);
  const reach = new Set(actorReach(scene, actorId));
  return flowGraph(scene, { kind: "actor", actor: actorId }, actor ? [actor] : [], scene.features.filter((f) => reach.has(f.id)));
}

/** `CANCEL, PICKED_UP +2`: the first two Event names and how many more there are. */
export function shortNames(names: string[]): string {
  const shown = names.slice(0, 2).join(", ");
  return names.length > 2 ? `${shown} +${names.length - 2}` : shown;
}

/** Level 2: the Machines of a Feature, with the Actors and other-Feature Machines that send Events in at the border. */
export function featureGraph(scene: Scene, featureId: string): GraphSpec {
  const feature = scene.feature.get(featureId);
  const own = new Set(feature?.machines ?? []);
  const inFeature = flows(scene).filter((f) => own.has(f.machine));
  const sourceNode = (f: Flow) => (f.source.kind === "actor" ? `a:${f.source.id}` : `m:${f.source.id}`);

  const nodes: GNode[] = [];
  for (const id of feature?.machines ?? []) {
    const m = scene.machine.get(id) as MergedMachine;
    nodes.push(node({ id: `m:${id}`, kind: "machine", label: m.name, sub: stateCount(m), ref: id, change: machineChange(m) }));
  }
  for (const f of inFeature) {
    const id = sourceNode(f);
    if (nodes.some((n) => n.id === id)) continue;
    if (f.source.kind === "actor") {
      const a = scene.actor.get(f.source.id);
      nodes.push(node({ id, kind: "actor", label: a?.name ?? f.source.id, sub: "", ref: f.source.id, change: a ? actorChange(a) : "same", external: true, layer: "first" }));
    } else {
      const m = scene.machine.get(f.source.id) as MergedMachine;
      nodes.push(node({ id, kind: "machine", label: m.name, sub: m.feature, ref: m.id, change: machineChange(m), external: true, layer: "first" }));
    }
  }

  const edges = pairs(inFeature, (f) => ({ source: sourceNode(f), target: `m:${f.machine}` })).map((p) =>
    flowEdge(`e:${p.source}>${p.target}`, p, shortNames([...new Set(p.flows.map((f) => f.event.slice(f.event.indexOf(".") + 1)))])),
  );

  return { level: { kind: "feature", feature: featureId }, nodes, edges };
}
