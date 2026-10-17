import { loadProject, resolveProjectRef, type ProjectElement } from "./requirements";
import type { Project } from "./store";
import { closeScope, type ChangedEvent, type ChangedState, type ScanReason, type ScanScopeEntry } from "./scan-scope";
import { getTask, type ProposalFilter, runnableTasks, type Task } from "./work";
import { TramaError } from "./errors";

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
      } else if (element.section) changed.set(`requirements/${element.area.id}#General`, "changed");
    }
  return closeScope(project.model, changed, changedMachines, changedStates, changedEvents);
}

/**
 * The exact references the runnable Tasks of a scope name, for the pre-flight comparison: each reference once, a
 * Requirement section as the element it is about, no General section, Area, or Transition added. A reference that no
 * longer resolves is skipped. Chooses the Tasks as `trama task next` does, and returns them too.
 */
export function preflightScope(p: Project, filter: ProposalFilter = {}, taskIds?: string[]): { refs: string[]; tasks: Task[] } {
  const project = loadProject(p);
  const tasks = runnableTasks(p, filter, taskIds);
  const refs = new Set<string>();
  const resolve = (ref: string) => {
    try {
      return resolveProjectRef(project, ref);
    } catch (err) {
      if (err instanceof TramaError) return null;
      throw err;
    }
  };
  for (const task of tasks)
    for (const ref of task.data.refs) {
      const element = resolve(ref);
      if (element === null) continue;
      if (element.kind !== "requirement") refs.add(element.ref);
      else if (element.section?.ref) {
        const target = resolve(element.section.ref);
        if (target !== null && target.kind !== "requirement") refs.add(target.ref);
      }
    }
  return { refs: [...refs], tasks };
}
