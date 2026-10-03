// No Node imports: the Board in the webview and the textual board group Tasks with the same rules.

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
export function takenBlocker(tasks: { id: string; agent: boolean }[]): string | null {
  const taken = tasks.filter((t) => t.agent).map((t) => t.id);
  if (taken.length === 0) return null;
  return taken.length === 1 ? `An agent is working on Task ${taken[0]}` : `An agent is working on Tasks ${taken.join(", ")}`;
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
