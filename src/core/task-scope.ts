import { loadProject, resolveProjectRef, type ProjectElement } from "./requirements";
import type { Project } from "./store";
import { closeScope, type ChangedEvent, type ChangedState, type ScanReason, type ScanScopeEntry } from "./scan-scope";
import { getTask } from "./work";

/**
 * The targeted scan scope named by finished Tasks: the same computation as a Proposal's `scanScope`, fed with the
 * elements the Tasks' references name. A Requirement section names the Model element it is about; an Area names nothing.
 */
export function taskScope(p: Project, ids: string[]): ScanScopeEntry[] {
  const project = loadProject(p);
  const changed = new Map<string, ScanReason>();
  const changedMachines = new Set<string>();
  const changedStates: ChangedState[] = [];
  const changedEvents: ChangedEvent[] = [];
  const named = (element: Exclude<ProjectElement, { kind: "requirement" }>) => {
    changed.set(element.ref, "changed");
    if (element.kind === "machine") changedMachines.add(element.machine.id);
    if (element.kind === "state") changedStates.push({ machine: element.machine, state: element.state });
    if (element.kind === "event") changedEvents.push({ owner: element.owner.id, name: element.event.name });
  };
  for (const id of ids)
    for (const ref of getTask(p, id, true).data.refs) {
      const element = resolveProjectRef(project, ref);
      if (element.kind !== "requirement") named(element);
      else if (element.section?.ref) {
        const target = resolveProjectRef(project, element.section.ref);
        if (target.kind !== "requirement") named(target);
      }
    }
  return closeScope(project.model, changed, changedMachines, changedStates, changedEvents);
}
