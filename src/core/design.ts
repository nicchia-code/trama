// No Node imports: the Board in the webview and the textual board group Tasks with the same rules.
import { identityNamer, type Namer } from "./card-names";

export type TaskColumn = "todo" | "doing" | "done";

/** A design (the Tasks of one Proposal) needs at least this many Tasks to be shown as a group. */
export const MIN_DESIGN_TASKS = 2;

/** To do while every Task is in To do, Done once every Task is done, In progress otherwise (a mix of To do and Done included). */
export function designColumn(columns: TaskColumn[]): TaskColumn {
  if (columns.every((c) => c === "todo")) return "todo";
  if (columns.every((c) => c === "done")) return "done";
  return "doing";
}

/**
 * Why Run all To do, or Run this design (given the design's Tasks), is unavailable because the agent has taken a
 * Task: the message names the Task, or says an agent is working. Null when none is taken.
 */
export function takenBlocker(tasks: { id: string; agent: boolean }[], name: Namer = identityNamer): string | null {
  const taken = tasks.filter((t) => t.agent).map((t) => name("task", t.id));
  if (taken.length === 0) return null;
  return taken.length === 1 ? `An agent is working on Task ${taken[0]}` : `An agent is working on Tasks ${taken.join(", ")}`;
}

/** What a Task waits for, as far as a run's availability cares: an open Drift, or the Task that fixes its Drift. */
export type Waits = { kind: "drift"; drift: string } | { kind: "fix"; task: string };

/**
 * Why a run over these Tasks, in creation order, is unavailable, or null. Run all To do gets every Task, Run this
 * design the design's. Every reason that holds comes, in order: the agent has taken one of them; then, when none is
 * in To do, that is said; otherwise, when every one in To do is blocked, the Drift or the fix Task of the first.
 */
export function runBlocker(tasks: { id: string; column: TaskColumn; agent: boolean; blockedBy: readonly Waits[] }[], scope: "all" | "design", name: Namer = identityNamer): string | null {
  const todo = tasks.filter((t) => t.column === "todo");
  const first = todo[0];
  let idle: string | null = null;
  if (first === undefined) idle = scope === "all" ? "No Task is in To do" : "No Task of this design is in To do";
  else if (todo.every((t) => t.blockedBy.length > 0)) {
    const why = first.blockedBy[0];
    const reason = why?.kind === "fix" ? `waiting for Task ${name("task", why.task)}, which fixes its Drift` : `blocked by Drift ${why === undefined ? "" : name("drift", why.drift)}`;
    idle = `All the Tasks ${scope === "all" ? "in To do" : "of this design in To do"} are blocked: Task ${name("task", first.id)} is ${reason}`;
  }
  return joinReasons([takenBlocker(tasks, name), idle]);
}

/** The reasons that hold, in the order given, as one text (each reason a sentence); null when none holds. */
export function joinReasons(reasons: readonly (string | null)[]): string | null {
  const held = reasons.filter((r): r is string => r !== null);
  return held.length === 0 ? null : held.join(". ");
}

/** What stands in a column of the Board: a Task on its own, or a design with its Tasks in creation order. */
export type Placed<T> =
  | { design: false; task: T; column: TaskColumn }
  | { design: true; proposal: string; tasks: T[]; column: TaskColumn };

/**
 * Places Tasks (in creation order) the way the Board shows them. The Tasks linked to one Proposal become one design
 * once there are enough of them; it takes the place of the design's first Task and stands in the derived column.
 * Tasks with no Proposal, and designs with too few Tasks, stay on their own.
 */
export function placeTasks<T extends { proposal: string | null; column: TaskColumn }>(tasks: T[]): Placed<T>[] {
  const designs = new Map<string, T[]>();
  for (const task of tasks) if (task.proposal !== null) designs.set(task.proposal, [...(designs.get(task.proposal) ?? []), task]);
  const placed: Placed<T>[] = [];
  const shown = new Set<string>();
  for (const task of tasks) {
    const group = task.proposal === null ? undefined : designs.get(task.proposal);
    if (task.proposal === null || group === undefined || group.length < MIN_DESIGN_TASKS) {
      placed.push({ design: false, task, column: task.column });
      continue;
    }
    if (shown.has(task.proposal)) continue;
    shown.add(task.proposal);
    placed.push({ design: true, proposal: task.proposal, tasks: group, column: designColumn(group.map((t) => t.column)) });
  }
  return placed;
}
