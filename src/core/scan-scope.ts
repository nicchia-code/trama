import { flattenStates } from "./model";
import { receivers } from "./refs";
import type { ProjectModel } from "./requirements";
import type { EventDecl, Machine, Model, State } from "./types";

export type ScanReason = "changed" | "removed, its container" | "leads into a change";

export const SCAN_REASONS: readonly ScanReason[] = ["changed", "removed, its container", "leads into a change"];

/** One reference a targeted scan compares with the code, written as `--ref` takes it, and why it is there. */
export interface ScanScopeEntry {
  ref: string;
  reason: ScanReason;
}

/**
 * What a targeted scan compares after a Proposal, from the Model and Requirements before and after it:
 * - every State, Transition (by State and Event) and Event added or changed; a State brings what it contains;
 * - a Machine, Feature or Actor whose own name or description changed, alone; a new Machine whole;
 * - every Requirement section added or changed, compared by Area and reference whichever fragment holds it;
 *   a changed Area introduction as the Area;
 * - an element removed, as its nearest container that still exists (none for a removed Feature, Actor or Area);
 * - the Transitions of any Machine that enter a changed State or react to a changed Event.
 * The System description and fragment titles and descriptions add nothing.
 */
export function scanScope(before: ProjectModel, after: ProjectModel): ScanScopeEntry[] {
  const was = before.model;
  const is = after.model;
  const out = new Map<string, ScanReason>();
  const add = (ref: string, reason: ScanReason) => {
    const held = out.get(ref);
    if (held === undefined || SCAN_REASONS.indexOf(reason) < SCAN_REASONS.indexOf(held)) out.set(ref, reason);
  };
  const changedEvents: { owner: string; name: string }[] = [];
  const changedStates: { machine: Machine; state: State }[] = [];
  /** Machines whose whole content a changed Machine reference covers: its entries come with it. */
  const changedMachines = new Set<string>();

  const diffEvents = (owner: string, old: EventDecl[] | undefined, now: EventDecl[]) => {
    const oldByName = new Map((old ?? []).map((e) => [e.name, e]));
    for (const e of now)
      if (oldByName.get(e.name)?.description !== e.description) {
        add(`${owner}.${e.name}`, "changed");
        changedEvents.push({ owner, name: e.name });
      }
    if ((old ?? []).some((e) => !now.some((n) => n.name === e.name))) add(owner, "removed, its container");
  };

  for (const f of is.features.values()) {
    const o = was.features.get(f.id);
    if (o?.name !== f.name || o.description !== f.description) add(f.id, "changed");
  }
  for (const a of is.actors.values()) {
    const o = was.actors.get(a.id);
    if (o?.name !== a.name || o.description !== a.description) add(a.id, "changed");
    diffEvents(a.id, o?.events, a.events);
  }

  for (const m of is.machines.values()) {
    const o = was.machines.get(m.id);
    if (!o) {
      changedMachines.add(m.id);
      add(m.id, "changed");
      diffEvents(m.id, undefined, m.events);
      continue;
    }
    if (o.name !== m.name || o.description !== m.description) {
      changedMachines.add(m.id);
      add(m.id, "changed");
    }
    const oldStates = new Map(flattenStates(o.states).map((s) => [s.name.toLowerCase(), s]));
    const newStates = new Map(flattenStates(m.states).map((s) => [s.name.toLowerCase(), s]));
    for (const [key, s] of newStates) {
      const os = oldStates.get(key);
      if (!os || os.description !== s.description || os.initial !== s.initial || os.final !== s.final || os.parent?.toLowerCase() !== s.parent?.toLowerCase()) {
        add(`${m.id}/${s.name}`, "changed");
        changedStates.push({ machine: m, state: s });
        continue;
      }
      const oldGroups = transitionGroups(os);
      const newGroups = transitionGroups(s);
      for (const [event, text] of newGroups) if (oldGroups.get(event) !== text) add(`${m.id}/${s.name}/${event}`, "changed");
      for (const event of oldGroups.keys()) if (!newGroups.has(event)) add(`${m.id}/${s.name}`, "removed, its container");
    }
    for (const [key, os] of oldStates) {
      if (newStates.has(key)) continue;
      let container: State | undefined;
      for (let parent = os.parent; parent !== null && !container; parent = oldStates.get(parent.toLowerCase())?.parent ?? null) container = newStates.get(parent.toLowerCase());
      add(container ? `${m.id}/${container.name}` : m.id, "removed, its container");
    }
    diffEvents(m.id, o.events, m.events);
  }
  for (const o of was.machines.values()) if (!is.machines.has(o.id) && is.features.has(o.feature)) add(o.feature, "removed, its container");

  return [...closeScope(is, out, changedMachines, changedStates, changedEvents), ...requirementScope(before, after)];
}

/** A changed State, by its Machine, as the Model holds it after the change. */
export interface ChangedState {
  machine: Machine;
  state: State;
}

/** A changed Event, by its owner's ID and its name. */
export interface ChangedEvent {
  owner: string;
  name: string;
}

/**
 * The scope a targeted scan compares, from the elements that changed or were removed (`changed`) and the Model they belong to.
 * A Proposal and a finished Task both call it, so the same named elements give the same scope:
 * - a changed Machine covers everything inside it (States, Transitions, Events): those entries are dropped;
 * - a changed State covers the States and Transitions inside it: those entries are dropped;
 * - the Transitions of any Machine that enter a changed State or react to a changed Event are added, as `leads into a change`.
 */
export function closeScope(model: Model, changed: ReadonlyMap<string, ScanReason>, changedMachines: ReadonlySet<string>, changedStates: ChangedState[], changedEvents: ChangedEvent[]): ScanScopeEntry[] {
  const out = new Map(changed);
  const add = (ref: string, reason: ScanReason) => {
    const held = out.get(ref);
    if (held === undefined || SCAN_REASONS.indexOf(reason) < SCAN_REASONS.indexOf(held)) out.set(ref, reason);
  };
  for (const { machine, state } of changedStates) {
    const targets = new Set(flattenStates([state]).map((s) => s.name.toLowerCase()));
    for (const s of flattenStates(machine.states))
      for (const t of s.transitions) if (targets.has(t.target.toLowerCase())) add(`${machine.id}/${s.name}/${t.event.owner}.${t.event.name}`, "leads into a change");
  }
  for (const { owner, name } of changedEvents)
    for (const r of receivers(model, owner, name)) add(`${r.machine.id}/${r.state.name}/${owner}.${name}`, "leads into a change");

  /** `machine/state` keys (lowercase) of the States inside a changed State: its entry already brings them. */
  const inside = new Set<string>();
  for (const { machine, state } of changedStates) for (const d of flattenStates(state.children)) inside.add(`${machine.id}/${d.name.toLowerCase()}`);
  const changedKeys = new Set(changedStates.map(({ machine, state }) => `${machine.id}/${state.name.toLowerCase()}`));
  return [...out]
    .filter(([ref]) => {
      const parts = ref.split("/");
      const head = parts[0] as string;
      if (parts.length === 1) return !(head.includes(".") && changedMachines.has(head.split(".")[0] as string));
      if (changedMachines.has(head)) return false;
      const state = `${head}/${(parts[1] as string).toLowerCase()}`;
      if (inside.has(state)) return false;
      return parts.length === 2 || !changedKeys.has(state);
    })
    .map(([ref, reason]) => ({ ref, reason }));
}

/** A State's Transitions grouped by Event, as `--ref` names them, each group as comparable text. */
function transitionGroups(state: State): Map<string, string> {
  const groups = new Map<string, { target: string; prose: string }[]>();
  for (const t of state.transitions) {
    const key = `${t.event.owner}.${t.event.name}`;
    groups.set(key, [...(groups.get(key) ?? []), { target: t.target.toLowerCase(), prose: t.prose }]);
  }
  return new Map([...groups].map(([key, list]) => [key, JSON.stringify(list)]));
}

/** Requirement sections added or changed, Areas whose introduction changed, and Areas that lost a section. */
function requirementScope(before: ProjectModel, after: ProjectModel): ScanScopeEntry[] {
  const sections = (pm: ProjectModel) =>
    new Map(pm.areas.flatMap((a) => a.sections.map((s) => [`${a.id}#${s.ref === null ? "" : s.ref.toLowerCase()}`, { area: a.id, ref: s.ref ?? "General", text: s.text }] as const)));
  const old = sections(before);
  const now = sections(after);
  const out: ScanScopeEntry[] = [];
  for (const a of after.areas) {
    const o = before.areas.find((x) => x.id === a.id);
    if ((o?.intro ?? "") !== a.intro) out.push({ ref: `requirements/${a.id}`, reason: "changed" });
  }
  for (const [key, s] of now) if ((old.get(key)?.text ?? "") !== s.text) out.push({ ref: `requirements/${s.area}#${s.ref}`, reason: "changed" });
  const lost = new Set<string>();
  for (const [key, s] of old) if (!now.has(key) && s.text !== "" && after.areas.some((a) => a.id === s.area)) lost.add(s.area);
  for (const area of lost) if (!out.some((e) => e.ref === `requirements/${area}`)) out.push({ ref: `requirements/${area}`, reason: "removed, its container" });
  return out;
}
