import { flattenStates } from "./model";
import { receivers } from "./refs";
import { loadProject, resolveProjectRef } from "./requirements";
import type { Project } from "./store";
import type { ScanScopeEntry } from "./scan-scope";
import type { Machine, State } from "./types";
import { getTask } from "./work";

/** The targeted scan scope named by Tasks, including Transitions entering or reacting to named elements. */
export function taskScope(p: Project, ids: string[]): ScanScopeEntry[] {
  const project = loadProject(p);
  const out = new Map<string, ScanScopeEntry["reason"]>();
  const add = (ref: string, reason: ScanScopeEntry["reason"]) => {
    if (reason === "changed" || !out.has(ref)) out.set(ref, reason);
  };
  const changedStates: { machine: Machine; state: State }[] = [];
  const changedEvents: { owner: string; name: string }[] = [];
  for (const id of ids) {
    for (const ref of getTask(p, id, true).data.refs) {
      const element = resolveProjectRef(project, ref);
      if (element.kind === "requirement") {
        if (element.section?.ref) {
          const target = resolveProjectRef(project, element.section.ref);
          if (target.kind !== "requirement") add(target.ref, "changed");
          if (target.kind === "state") changedStates.push({ machine: target.machine, state: target.state });
          if (target.kind === "event") changedEvents.push({ owner: target.owner.id, name: target.event.name });
        }
        continue;
      }
      add(element.ref, "changed");
      if (element.kind === "state") changedStates.push({ machine: element.machine, state: element.state });
      if (element.kind === "event") changedEvents.push({ owner: element.owner.id, name: element.event.name });
    }
  }
  for (const { machine, state } of changedStates) {
    const targets = new Set(flattenStates([state]).map((s) => s.name.toLowerCase()));
    for (const source of flattenStates(machine.states))
      for (const transition of source.transitions)
        if (targets.has(transition.target.toLowerCase())) add(`${machine.id}/${source.name}/${transition.event.owner}.${transition.event.name}`, "leads into a change");
  }
  for (const { owner, name } of changedEvents)
    for (const receiver of receivers(project.model, owner, name)) add(`${receiver.machine.id}/${receiver.state.name}/${owner}.${name}`, "leads into a change");
  return [...out].map(([ref, reason]) => ({ ref, reason }));
}
