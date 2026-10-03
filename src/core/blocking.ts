import { type ProjectModel, lineageRefs, parseRequirementRef } from "./requirements";
import { type Element, resolveRef } from "./refs";
import type { Drift, Task } from "./work";

/** Why a Task is blocked: an open Drift blocks it, or it waits for the Task that fixes the code of its own Drift. */
export type Blocker =
  | { kind: "drift"; drift: string; title: string }
  | { kind: "fix"; task: string; title: string; drift: string };

/** The same element always has the same key, however its reference was written. */
function elementKey(el: Element): string {
  switch (el.kind) {
    case "feature":
      return el.feature.id;
    case "machine":
      return el.machine.id;
    case "actor":
      return el.actor.id;
    case "state":
      return `${el.machine.id}/${el.state.name}`;
    case "transition":
      return `${el.machine.id}/${el.state.name}/${el.event}`;
    case "event":
      return `${el.owner.id}.${el.event.name}`;
  }
}

/**
 * What a reference stands for, as the key of the thing itself and the keys of everything that contains it.
 * A Requirement section of an element stands for that element; the General section of an Area, and an Area as a
 * whole, stand only for themselves.
 */
function extent(project: ProjectModel, ref: string): { self: string; containers: Set<string> } {
  const req = parseRequirementRef(ref);
  let modelRef = ref;
  if (req) {
    const area = project.areas.find((a) => a.id === req.area);
    const section = req.section === null ? undefined : area?.sections.find((s) => s.ref !== null && s.ref.toLowerCase() === (req.section as string).toLowerCase());
    if (!section?.ref) {
      const own = `requirements/${req.area}#${(req.section ?? "").toLowerCase()}`;
      return { self: own, containers: new Set([own]) };
    }
    modelRef = section.ref;
  }
  try {
    const element = resolveRef(project.model, modelRef);
    const keys = lineageRefs(project.model, element).map((r) => elementKey(resolveRef(project.model, r)));
    return { self: elementKey(element), containers: new Set(keys) };
  } catch {
    return { self: ref, containers: new Set([ref]) };
  }
}

/** Two sets of references concern the same thing when one reference is the same as, or inside, one of the other's. */
export function concernSameThing(project: ProjectModel, a: string[], b: string[]): boolean {
  const left = a.map((r) => extent(project, r));
  const right = b.map((r) => extent(project, r));
  return left.some((l) => right.some((r) => l.containers.has(r.self) || r.containers.has(l.self)));
}

/**
 * The blocked Tasks and why, by Task ID. An open Drift blocks its origin Task and every Task that is not Done and
 * concerns the same thing; the origin of a Drift fixed in the code waits for the Task created for the fix.
 * A Done Task is never blocked and a Drift that is not open blocks nothing by itself.
 */
export function computeBlocked(project: ProjectModel, tasks: Task[], drifts: Drift[]): Map<string, Blocker[]> {
  const blocked = new Map<string, Blocker[]>();
  const add = (task: Task, blocker: Blocker) => blocked.set(task.id, [...(blocked.get(task.id) ?? []), blocker]);
  const live = tasks.filter((t) => t.data.column !== "done");
  const byId = new Map(tasks.map((t) => [t.id, t]));
  for (const drift of drifts) {
    if (drift.data.status === "open") {
      for (const task of live)
        if (drift.data.origin === task.id || concernSameThing(project, drift.data.refs, task.data.refs)) add(task, { kind: "drift", drift: drift.id, title: drift.title });
    } else if (drift.data.resolution === "fix-code" && drift.data.origin !== null && drift.data.task !== null) {
      const origin = byId.get(drift.data.origin);
      const fix = byId.get(drift.data.task);
      if (origin && fix && origin.data.column !== "done" && fix.data.column !== "done") add(origin, { kind: "fix", task: fix.id, title: fix.title, drift: drift.id });
    }
  }
  return blocked;
}

/** What the agent is told when it tries to start a blocked Task: each blocker by ID and title, and whose decision it is. */
export function refusalFor(task: Task, blockers: Blocker[]): string {
  const why = blockers.map((b) => (b.kind === "drift" ? `Drift ${b.drift} "${b.title}"` : `Task ${b.task} "${b.title}", which fixes the code for Drift ${b.drift}`));
  return `Task ${task.id} is blocked, so it was not started: it is blocked by ${why.join("; ")}. The developer must decide.`;
}
