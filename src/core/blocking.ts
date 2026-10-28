import { type ProjectModel, lineageRefs, parseRequirementRef } from "./requirements";
import { type Element, resolveRef } from "./refs";
import type { ShortNumbers } from "./short-numbers";
import type { Drift, Task } from "./work";

/** Why a Task is blocked: an open Drift blocks it, or it waits for the Task that fixes the code of its own Drift. */
export type Blocker =
  | { kind: "drift"; drift: string; title: string }
  | { kind: "fix"; task: string; title: string; drift: string; driftTitle: string };

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
export function extent(project: ProjectModel, ref: string): { self: string; containers: Set<string> } {
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
 * The live Tasks an open Drift with these references and these origins blocks: its origins, and every Task that is not
 * Done and concerns the same thing. The one rule of the blocks.
 */
export function blockedByDrift(project: ProjectModel, tasks: Task[], refs: string[], origin: string[]): Task[] {
  return tasks.filter((task) => task.data.column !== "done" && (origin.includes(task.id) || concernSameThing(project, refs, task.data.refs)));
}

/**
 * The references and origins an open Drift blocks with: its own, or, for a unified Drift with differences, those of its open
 * differences only; the origins of a difference are those of the Drift it comes from, read from that Drift's file in `all`.
 */
export function openExtent(drift: Drift, all: ReadonlyMap<string, Drift>): { refs: string[]; origin: string[] } {
  if (drift.data.differences.length === 0) return { refs: drift.data.refs, origin: drift.data.origin };
  const open = drift.data.differences.filter((d) => d.decision === null);
  return {
    refs: [...new Set(open.flatMap((d) => d.refs))],
    origin: [...new Set(open.flatMap((d) => all.get(d.drift)?.data.origin ?? []))],
  };
}

/**
 * The blocked Tasks and why, by Task ID. An open Drift blocks its origin Task and every Task that is not Done and
 * concerns the same thing (a unified Drift with differences, only with the references and origins of its open differences);
 * the origin of a Drift fixed in the code, or of a difference fixed in the code, waits for the Task created for the fix.
 * A Done Task is never blocked and a Drift that is not open blocks nothing by itself.
 */
export function computeBlocked(project: ProjectModel, tasks: Task[], drifts: Drift[]): Map<string, Blocker[]> {
  const blocked = new Map<string, Blocker[]>();
  const add = (task: Task, blocker: Blocker) => blocked.set(task.id, [...(blocked.get(task.id) ?? []), blocker]);
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const all = new Map<string, Drift>();
  for (const drift of drifts) if (!all.has(drift.id)) all.set(drift.id, drift);
  for (const drift of drifts) {
    if (drift.data.status === "open") {
      const { refs, origin } = openExtent(drift, all);
      for (const task of blockedByDrift(project, tasks, refs, origin)) add(task, { kind: "drift", drift: drift.id, title: drift.title });
    }
    if (drift.data.status === "resolved" && drift.data.resolution === "fix-code" && drift.data.task !== null) waitsFor(drift, drift.data.task, drift.data.origin);
    // Each difference fixed in the code makes the origins of its own Drift wait for its fix Task, shared with the differences linked to it.
    for (const difference of drift.data.differences) if (difference.decision === "fix-code" && difference.task !== null) waitsFor(drift, difference.task, all.get(difference.drift)?.data.origin ?? []);
  }
  return blocked;

  function waitsFor(drift: Drift, taskId: string, origins: readonly string[]) {
    const fix = byId.get(taskId);
    for (const id of origins) {
      const origin = byId.get(id);
      const waiting = blocked.get(id)?.some((b) => b.kind === "fix" && b.task === taskId);
      if (origin && fix && !waiting && origin.data.column !== "done" && fix.data.column !== "done") add(origin, { kind: "fix", task: fix.id, title: fix.title, drift: drift.id, driftTitle: drift.title });
    }
  }
}

/** What the agent is told when it tries to start a blocked Task: each blocker by name (short number, else identity) and title, and whose decision it is. */
export function refusalFor(task: Task, blockers: Blocker[], numbers: ShortNumbers): string {
  const why = blockers.map((b) =>
    b.kind === "drift"
      ? `Drift ${numbers.name("drift", b.drift)} "${b.title}"`
      : `Task ${numbers.name("task", b.task)} "${b.title}", which fixes the code for Drift ${numbers.name("drift", b.drift)}`,
  );
  return `Task ${numbers.name("task", task.id)} is blocked, so it was not started: it is blocked by ${why.join("; ")}. The developer must decide.`;
}
