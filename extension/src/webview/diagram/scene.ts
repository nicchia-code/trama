import type { Change, MergedMachine, MergedState } from "../../../../src/core/merge";
import type { DriftView, ProposalView, Snapshot } from "../../../../src/core/snapshot";
import type { Machine, State } from "../../../../src/core/types";

export interface SceneEvent {
  name: string;
  description: string;
  change: Change;
}

export interface SceneActor {
  id: string;
  name: string;
  description: string;
  change: Change;
  events: SceneEvent[];
}

export interface SceneFeature {
  id: string;
  name: string;
  description: string;
  change: Change;
  /** Machine IDs, sorted. */
  machines: string[];
}

/** The Model as the Diagram draws it: today's, or with one open Proposal overlaid. */
export interface Scene {
  system: { name: string; description: string };
  features: SceneFeature[];
  actors: SceneActor[];
  machines: MergedMachine[];
  feature: Map<string, SceneFeature>;
  actor: Map<string, SceneActor>;
  machine: Map<string, MergedMachine>;
  /** Model file (relative to `.trama/model/`) of every Machine that exists today. */
  files: Map<string, string>;
  proposal: ProposalView | null;
  drifts: DriftView[];
}

function mergedState(s: State): MergedState {
  const { transitions, children, ...rest } = s;
  return {
    ...rest,
    change: "same",
    changes: [],
    transitions: transitions.map((t) => ({ ...t, change: "same" })),
    children: children.map(mergedState),
  };
}

/** A Machine nobody proposes to change: the same tree, every part `same`. */
export function toMerged(m: Machine): MergedMachine {
  return {
    id: m.id,
    feature: m.feature,
    name: m.name,
    description: m.description,
    change: "same",
    states: m.states.map(mergedState),
    events: m.events.map((e) => ({ ...e, change: "same" })),
  };
}

export function buildScene(snapshot: Snapshot, proposalId: string | null): Scene {
  const proposal = snapshot.proposals.find((p) => p.id === proposalId) ?? null;
  // A Proposal that requires open ones is drawn over the Model with those applied, as if already approved.
  const model = proposal?.base ?? snapshot;

  const machines = new Map<string, MergedMachine>(model.machines.map((m) => [m.id, toMerged(m)]));
  for (const m of proposal?.machines ?? []) machines.set(m.id, m);

  const actors: SceneActor[] = model.actors.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    change: "same",
    events: a.events.map((e) => ({ name: e.name, description: e.description, change: "same" })),
  }));
  for (const change of proposal?.actors ?? []) {
    let actor = actors.find((a) => a.id === change.id);
    if (!actor) {
      actor = { id: change.id, name: change.id, description: "", change: "same", events: [] };
      actors.push(actor);
    }
    actor.change = change.change === "modified" ? "same" : change.change;
    for (const e of change.events) {
      const known = actor.events.find((x) => x.name === e.name);
      if (known) known.change = e.change;
      else actor.events.push({ name: e.name, description: "", change: e.change });
    }
  }

  const ids = new Set<string>(model.features.map((f) => f.id));
  for (const m of machines.values()) ids.add(m.feature);
  const features: SceneFeature[] = [...ids].sort().map((id) => {
    const known = model.features.find((f) => f.id === id);
    const own = [...machines.values()].filter((m) => m.feature === id);
    const gone = own.length > 0 && own.every((m) => m.change === "removed");
    return {
      id,
      name: known?.name ?? id,
      description: known?.description ?? "",
      change: !known ? "added" : gone ? "removed" : "same",
      machines: own.map((m) => m.id).sort(),
    };
  });

  return {
    system: model.system,
    features,
    actors,
    machines: [...machines.values()],
    feature: new Map(features.map((f) => [f.id, f])),
    actor: new Map(actors.map((a) => [a.id, a])),
    machine: machines,
    files: new Map(model.machines.map((m) => [m.id, m.file])),
    proposal,
    drifts: snapshot.drifts,
  };
}

export const flattenMerged = (states: MergedState[]): MergedState[] => states.flatMap((s) => [s, ...flattenMerged(s.children)]);

export function findMergedState(machine: MergedMachine, name: string): MergedState | undefined {
  const key = name.toLowerCase();
  return flattenMerged(machine.states).find((s) => s.name.toLowerCase() === key);
}

/** State name -> name of its parent in the drawn tree (null for top-level States). */
export function parentMap(machine: MergedMachine): Map<string, string | null> {
  const out = new Map<string, string | null>();
  const walk = (states: MergedState[], parent: string | null) => {
    for (const s of states) {
      out.set(s.name, parent);
      walk(s.children, s.name);
    }
  };
  walk(machine.states, null);
  return out;
}

/** From the top-level State down to the State itself. Empty for an unknown name. */
export function pathTo(machine: MergedMachine, name: string): string[] {
  const parents = parentMap(machine);
  const path: string[] = [];
  for (let at = findMergedState(machine, name)?.name ?? null; at !== null; at = parents.get(at) ?? null) path.unshift(at);
  return path;
}

/** How a Machine shows at the Feature and System levels: added or removed as a whole, or changed inside. */
export function machineChange(m: MergedMachine): Change {
  if (m.change !== "same") return m.change;
  const inside = [
    ...m.events.map((e) => e.change),
    ...flattenMerged(m.states).flatMap((s) => [s.change, ...s.transitions.map((t) => t.change)]),
  ];
  return inside.some((c) => c !== "same") ? "changed" : "same";
}

export function featureChange(scene: Scene, f: SceneFeature): Change {
  if (f.change !== "same") return f.change;
  return f.machines.some((id) => machineChange(scene.machine.get(id) as MergedMachine) !== "same") ? "changed" : "same";
}

export function actorChange(a: SceneActor): Change {
  if (a.change !== "same") return a.change;
  return a.events.some((e) => e.change !== "same") ? "changed" : "same";
}
