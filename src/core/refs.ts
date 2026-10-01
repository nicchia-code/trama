import { TramaError } from "./errors";
import { eventOwner, findEvent, findState, flattenStates } from "./model";
import type { Actor, EventDecl, Feature, Machine, Model, State, Transition } from "./types";

export type Element =
  | { kind: "feature"; ref: string; feature: Feature }
  | { kind: "machine"; ref: string; machine: Machine }
  | { kind: "actor"; ref: string; actor: Actor }
  | { kind: "state"; ref: string; machine: Machine; state: State }
  | { kind: "transition"; ref: string; machine: Machine; state: State; event: string; transitions: Transition[] }
  | { kind: "event"; ref: string; owner: Machine | Actor; event: EventDecl };

const EVENT_REF = /^(?:([a-z][a-z0-9]*(?:-[a-z0-9]+)*)\.)?([A-Z][A-Z0-9_]*)$/;

/** Resolves `order`, `order/Paid`, `order/Paid/user.CANCEL` or `user.CANCEL`. */
export function resolveRef(model: Model, ref: string): Element {
  const parts = ref.split("/");
  const fail = (why: string): never => {
    throw new TramaError(`Cannot resolve "${ref}": ${why}`);
  };

  if (parts.length === 1) {
    if (EVENT_REF.test(ref) && ref.includes(".")) {
      const [ownerId, name] = ref.split(".") as [string, string];
      const owner = eventOwner(model, ownerId);
      if (!owner) return fail(`no Machine or Actor "${ownerId}"`);
      const event = findEvent(model, ownerId, name);
      if (!event) return fail(`"${ownerId}" does not declare Event ${name}`);
      return { kind: "event", ref, owner, event };
    }
    const feature = model.features.get(ref);
    if (feature) return { kind: "feature", ref, feature };
    const machine = model.machines.get(ref);
    if (machine) return { kind: "machine", ref, machine };
    const actor = model.actors.get(ref);
    if (actor) return { kind: "actor", ref, actor };
    return fail("no Feature, Machine or Actor with that ID");
  }

  if (parts.length > 3) return fail("expected machine/State or machine/State/owner.EVENT");
  const machine = model.machines.get(parts[0] as string);
  if (!machine) return fail(`no Machine "${parts[0]}"`);
  const state = findState(machine, parts[1] as string);
  if (!state) return fail(`Machine "${machine.id}" has no State "${parts[1]}"`);
  if (parts.length === 2) return { kind: "state", ref, machine, state };

  const m = EVENT_REF.exec(parts[2] as string);
  if (!m) return fail(`"${parts[2]}" is not an Event reference`);
  const owner = m[1] ?? machine.id;
  const event = `${owner}.${m[2]}`;
  const transitions = state.transitions.filter((t) => t.event.owner === owner && t.event.name === m[2]);
  if (transitions.length === 0) return fail(`State "${state.name}" has no Transition on ${event}`);
  return { kind: "transition", ref, machine, state, event, transitions };
}

/** Every Transition in the Model that reacts to this Event. */
export function receivers(model: Model, owner: string, name: string) {
  const out: { machine: Machine; state: State; transition: Transition }[] = [];
  for (const machine of model.machines.values())
    for (const state of flattenStates(machine.states))
      for (const transition of state.transitions)
        if (transition.event.owner === owner && transition.event.name === name)
          out.push({ machine, state, transition });
  return out;
}
