import { TramaError } from "./errors";
import { findState, flattenStates } from "./model";
import type { Machine, Model, State, Transition } from "./types";

/** A Transition as seen from a leaf State: it may be declared on an ancestor. */
export interface Edge {
  /** State that declares the Transition. */
  source: State;
  transition: Transition;
  /** The leaf State the Machine ends up in. */
  to: State;
}

function parentOf(machine: Machine, state: State): State | undefined {
  return state.parent ? findState(machine, state.parent) : undefined;
}

/** The State itself, then its parents up to the top level. */
export function lineage(machine: Machine, state: State): State[] {
  const out: State[] = [];
  for (let s: State | undefined = state; s; s = parentOf(machine, s)) out.push(s);
  return out;
}

/** Entering a State with sub-States enters its initial sub-State, recursively. */
export function enter(state: State): State {
  let s = state;
  for (;;) {
    const initial = s.children.find((c) => c.initial) ?? s.children[0];
    if (!initial) return s;
    s = initial;
  }
}

export function leavesOf(state: State): State[] {
  return state.children.length === 0 ? [state] : state.children.flatMap(leavesOf);
}

export function initialLeaf(machine: Machine): State | undefined {
  const initial = machine.states.find((s) => s.initial) ?? machine.states[0];
  return initial ? enter(initial) : undefined;
}

/** Every way out of a leaf State, including Transitions inherited from its parents. */
export function edgesFrom(machine: Machine, leaf: State): Edge[] {
  const edges: Edge[] = [];
  for (const source of lineage(machine, leaf)) {
    for (const transition of source.transitions) {
      const target = findState(machine, transition.target);
      if (target) edges.push({ source, transition, to: enter(target) });
    }
  }
  return edges;
}

export function reachableStates(machine: Machine): Set<string> {
  const start = initialLeaf(machine);
  const reached = new Set<string>();
  if (!start) return reached;
  const queue = [start];
  const seen = new Set<string>([start.name]);
  while (queue.length > 0) {
    const leaf = queue.shift() as State;
    for (const s of lineage(machine, leaf)) reached.add(s.name);
    for (const edge of edgesFrom(machine, leaf)) {
      if (!seen.has(edge.to.name)) {
        seen.add(edge.to.name);
        queue.push(edge.to);
      }
    }
  }
  return reached;
}

export interface Warning {
  machine: string | null;
  kind: "unreachable-state" | "dead-end" | "unreceived-event" | "large-fragment";
  subject: string;
  message: string;
}

export function analyze(model: Model, machineId?: string): Warning[] {
  let machines = [...model.machines.values()];
  if (machineId !== undefined) {
    const machine = model.machines.get(machineId);
    if (!machine) throw new TramaError(`Unknown Machine "${machineId}"`);
    machines = [machine];
  }
  const warnings: Warning[] = [];
  for (const machine of machines) {
    const reached = reachableStates(machine);
    for (const state of flattenStates(machine.states)) {
      if (!reached.has(state.name))
        warnings.push({
          machine: machine.id,
          kind: "unreachable-state",
          subject: `${machine.id}/${state.name}`,
          message: `State "${state.name}" cannot be reached from the initial State`,
        });
      if (state.children.length === 0 && !state.final && edgesFrom(machine, state).length === 0)
        warnings.push({
          machine: machine.id,
          kind: "dead-end",
          subject: `${machine.id}/${state.name}`,
          message: `State "${state.name}" is not final but has no way out`,
        });
    }
  }

  const received = new Set<string>();
  for (const machine of model.machines.values())
    for (const state of flattenStates(machine.states))
      for (const t of state.transitions) received.add(`${t.event.owner}.${t.event.name}`);
  const owners = machineId !== undefined ? machines : [...model.machines.values(), ...model.actors.values()];
  for (const owner of owners)
    for (const event of owner.events)
      if (!received.has(`${owner.id}.${event.name}`))
        warnings.push({
          machine: owner.id,
          kind: "unreceived-event",
          subject: `${owner.id}.${event.name}`,
          message: `Event ${owner.id}.${event.name} is declared but no Transition reacts to it`,
        });
  return warnings;
}

export interface PathStep {
  /** Leaf State reached after this step. */
  state: string;
  /** Absent on the first step. */
  via?: { source: string; event: string; prose: string };
}

export interface PathsResult {
  paths: PathStep[][];
  /** True when the search stopped at `max` paths. */
  limited: boolean;
}

const EXPANSION_BUDGET = 200_000;

/** Simple paths (no leaf State twice), shortest first. */
export function findPaths(machine: Machine, fromName: string, toName: string, max: number): PathsResult {
  const from = findState(machine, fromName);
  if (!from) throw new TramaError(`Unknown State "${fromName}" in Machine "${machine.id}"`);
  const to = findState(machine, toName);
  if (!to) throw new TramaError(`Unknown State "${toName}" in Machine "${machine.id}"`);

  const targets = new Set(leavesOf(to).map((s) => s.name));
  const queue: { steps: PathStep[]; seen: Set<string>; last: State }[] = leavesOf(from).map((leaf) => ({
    steps: [{ state: leaf.name }],
    seen: new Set([leaf.name]),
    last: leaf,
  }));
  const paths: PathStep[][] = [];
  let head = 0;
  let budget = EXPANSION_BUDGET;
  while (head < queue.length && paths.length < max && budget-- > 0) {
    const cur = queue[head++] as (typeof queue)[number];
    if (targets.has(cur.last.name)) {
      paths.push(cur.steps);
      continue;
    }
    for (const edge of edgesFrom(machine, cur.last)) {
      if (cur.seen.has(edge.to.name)) continue;
      queue.push({
        steps: [
          ...cur.steps,
          {
            state: edge.to.name,
            via: {
              source: edge.source.name,
              event: `${edge.transition.event.owner}.${edge.transition.event.name}`,
              prose: edge.transition.prose,
            },
          },
        ],
        seen: new Set([...cur.seen, edge.to.name]),
        last: edge.to,
      });
    }
  }
  return { paths, limited: paths.length >= max || head < queue.length };
}
