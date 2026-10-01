import { flattenStates } from "./model";
import type { EventDecl, Machine, State, Transition } from "./types";

export type Change = "same" | "added" | "removed" | "changed";

export interface MergedTransition extends Transition {
  change: Change;
}

export interface MergedState extends Omit<State, "transitions" | "children"> {
  change: Change;
  /** Why a `changed` State changed: "initial", "final", "parent", "description". */
  changes: string[];
  transitions: MergedTransition[];
  children: MergedState[];
}

export interface MergedEvent extends EventDecl {
  change: Change;
}

/** A Machine as it is today and as a Proposal would leave it, drawn as one. */
export interface MergedMachine {
  id: string;
  feature: string;
  name: string;
  description: string;
  change: Change;
  states: MergedState[];
  events: MergedEvent[];
}

const key = (name: string) => name.toLowerCase();
const tKey = (state: string, t: Transition) => `${key(state)}|${t.event.owner}.${t.event.name}|${key(t.target)}`;

function mergeTransitions(name: string, before: Transition[], after: Transition[]): MergedTransition[] {
  const out: MergedTransition[] = [];
  const old = [...before];
  const added: Transition[] = [];
  for (const t of after) {
    const i = old.findIndex((o) => tKey(name, o) === tKey(name, t) && o.prose === t.prose);
    if (i >= 0) {
      old.splice(i, 1);
      out.push({ ...t, change: "same" });
    } else added.push(t);
  }
  for (const t of added) {
    const i = old.findIndex((o) => tKey(name, o) === tKey(name, t));
    if (i >= 0) {
      old.splice(i, 1);
      out.push({ ...t, change: "changed" });
    } else out.push({ ...t, change: "added" });
  }
  for (const t of old) out.push({ ...t, change: "removed" });
  return out;
}

/**
 * Overlays a Machine's two versions. The hierarchy follows `after` where a State still exists
 * there, and `before` for removed States. Either side may be absent (added or removed Machine).
 */
export function mergeMachine(before: Machine | undefined, after: Machine | undefined): MergedMachine {
  const base = (after ?? before) as Machine;
  const was = new Map(flattenStates(before?.states ?? []).map((s) => [key(s.name), s]));
  const is = new Map(flattenStates(after?.states ?? []).map((s) => [key(s.name), s]));

  /** `side` says which version's hierarchy `s` came from: `after`, or `before` for a State that was removed. */
  const build = (s: State, side: "after" | "before"): MergedState => {
    const old = was.get(key(s.name));
    const now = is.get(key(s.name));
    const changes: string[] = [];
    let change: Change = "same";
    if (!old) change = "added";
    else if (!now) change = "removed";
    else {
      if (old.initial !== now.initial) changes.push("initial");
      if (old.final !== now.final) changes.push("final");
      if (old.parent !== now.parent) changes.push("parent");
      if (old.description !== now.description) changes.push("description");
      if (changes.length > 0) change = "changed";
    }
    // A removed State's children that survive elsewhere are drawn where they now live, not twice.
    const kids = side === "before" ? s.children.filter((c) => !is.has(key(c.name))) : s.children;
    const children = kids.map((c) => build(c, side));
    // Removed States that used to live directly under a surviving State stay visible under it.
    if (side === "after") for (const o of old?.children ?? []) if (!is.has(key(o.name))) children.push(build(o, "before"));
    const { transitions: _t, children: _c, ...rest } = s;
    return {
      ...rest,
      change,
      changes,
      children,
      transitions: mergeTransitions(s.name, old?.transitions ?? [], now?.transitions ?? []),
    };
  };

  const states = (after?.states ?? []).map((s) => build(s, "after"));
  for (const o of before?.states ?? []) if (!is.has(key(o.name))) states.push(build(o, "before"));

  const oldEvents = new Map((before?.events ?? []).map((e) => [e.name, e]));
  const newEvents = new Map((after?.events ?? []).map((e) => [e.name, e]));
  const events: MergedEvent[] = [];
  for (const e of after?.events ?? []) {
    const o = oldEvents.get(e.name);
    events.push({ ...e, change: !o ? "added" : o.description !== e.description ? "changed" : "same" });
  }
  for (const e of before?.events ?? []) if (!newEvents.has(e.name)) events.push({ ...e, change: "removed" });

  return {
    id: base.id,
    feature: base.feature,
    name: base.name,
    description: base.description,
    change: !before ? "added" : !after ? "removed" : "same",
    states,
    events,
  };
}
