// No Node imports: the Board in the webview and the textual board give the same reasons.
import { identityNamer, type Namer } from "./card-names";

export type TaskColumn = "todo" | "doing" | "done";

/**
 * Why Run all (given its Tasks) is unavailable because the agent has taken a
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
 * Why Run all, given these Tasks in creation order, is unavailable, or null. Every reason that holds comes, in
 * order: the agent has taken one of them; then, when none is in To do, that is said; otherwise, when every one in To
 * do is blocked, the Drift or the fix Task of the first.
 */
export function runBlocker(tasks: { id: string; column: TaskColumn; agent: boolean; blockedBy: readonly Waits[] }[], name: Namer = identityNamer): string | null {
  const todo = tasks.filter((t) => t.column === "todo");
  const first = todo[0];
  let idle: string | null = null;
  if (first === undefined) idle = "No Task is in To do";
  else if (todo.every((t) => t.blockedBy.length > 0)) {
    const why = first.blockedBy[0];
    const reason = why?.kind === "fix" ? `waiting for Task ${name("task", why.task)}, which fixes its Drift` : `blocked by Drift ${why === undefined ? "" : name("drift", why.drift)}`;
    idle = `All the Tasks in To do are blocked: Task ${name("task", first.id)} is ${reason}`;
  }
  return joinReasons([takenBlocker(tasks, name), idle]);
}

/** Why every Run is disabled while one launched by Trama is going; the Board's Clear says it too. */
export const RUN_IN_PROGRESS = "A run is in progress";

/** The reasons that hold, in the order given, as one text (each reason a sentence); null when none holds. */
export function joinReasons(reasons: readonly (string | null)[]): string | null {
  const held = reasons.filter((r): r is string => r !== null);
  return held.length === 0 ? null : held.join(". ");
}
