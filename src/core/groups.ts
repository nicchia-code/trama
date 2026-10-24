import { statSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { concernSameThing } from "./blocking";
import type { Project } from "./store";
import { scopedTodo, type ProposalFilter, type Task } from "./work";

/** Runnable Tasks that a parallel run takes together: they concern the same thing, directly or through other Tasks of the group, or name a common project file. */
export interface TaskGroup {
  /** Oldest first. */
  tasks: Task[];
  /** The references that tie two Tasks of the group together, in order of appearance. */
  refs: string[];
  /** The project files named by two or more Tasks of the group, in order of appearance. */
  files: string[];
}

export interface TaskGroups {
  /** The groups a run may start, largest first, then by their oldest Task; at most `max` of them. */
  groups: TaskGroup[];
  /** Runnable Tasks kept out of every group because they concern, or name a file of, a Task In progress the agent has taken. */
  heldBack: { task: Task; overlaps: Task[] }[];
  /** To do Tasks in scope that no group lists: blocked ones included, and those of the groups past `max`. */
  remaining: number;
}

/** The project files a Task body names: each path between backticks that is a file inside the project root when this runs. Paths outside the root, missing paths and text outside backticks do not count. */
export function namedFiles(root: string, body: string): string[] {
  const named = new Set<string>();
  for (const match of body.matchAll(/`([^`\n]+)`/g)) {
    const path = (match[1] ?? "").trim();
    if (path === "" || isAbsolute(path)) continue;
    const abs = resolve(root, path);
    const rel = relative(root, abs);
    if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) continue;
    if (!isFile(abs)) continue;
    named.add(rel.split(sep).join("/"));
  }
  return [...named];
}

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

/** The connected components of `tasks` under `linked`: each keeps the order of `tasks`, and the components follow the order of their oldest Task. */
function components(tasks: Task[], linked: (a: Task, b: Task) => boolean): Task[][] {
  const seen = new Set<string>();
  const out: Task[][] = [];
  for (const start of tasks) {
    if (seen.has(start.id)) continue;
    seen.add(start.id);
    const found = new Set<string>([start.id]);
    const stack: Task[] = [start];
    for (let task = stack.pop(); task !== undefined; task = stack.pop()) {
      for (const other of tasks) {
        if (seen.has(other.id) || !linked(task, other)) continue;
        seen.add(other.id);
        found.add(other.id);
        stack.push(other);
      }
    }
    out.push(tasks.filter((t) => found.has(t.id)));
  }
  return out;
}

/** The runnable Tasks of a scope in groups for a parallel run, moving nothing. Blocked Tasks take no part; a runnable Task that concerns a Task In progress the agent has taken is held back. `max` counts groups. */
export function parallelGroups(p: Project, filter: ProposalFilter = {}, max?: number, taskIds?: string[]): TaskGroups {
  const { project, blocked, todo, taken } = scopedTodo(p, filter, taskIds);
  const runnable = todo.filter((t) => !blocked.has(t.id));
  const files = new Map<string, string[]>();
  for (const task of [...runnable, ...taken]) files.set(task.id, namedFiles(p.root, task.body));
  const linked = (a: Task, b: Task) =>
    concernSameThing(project, a.data.refs, b.data.refs) || (files.get(a.id) ?? []).some((f) => (files.get(b.id) ?? []).includes(f));

  const heldBack: TaskGroups["heldBack"] = [];
  const free: Task[] = [];
  for (const task of runnable) {
    const overlaps = taken.filter((t) => linked(t, task));
    if (overlaps.length > 0) heldBack.push({ task, overlaps });
    else free.push(task);
  }

  const ordered = components(free, linked).sort((a, b) => b.length - a.length);
  const groups = (max === undefined ? ordered : ordered.slice(0, max)).map((tasks): TaskGroup => {
    const refs = new Set<string>();
    tasks.forEach((a, i) => {
      for (const b of tasks.slice(i + 1)) {
        for (const r of a.data.refs) if (concernSameThing(project, [r], b.data.refs)) refs.add(r);
        for (const r of b.data.refs) if (concernSameThing(project, [r], a.data.refs)) refs.add(r);
      }
    });
    const count = new Map<string, number>();
    for (const task of tasks) for (const f of files.get(task.id) ?? []) count.set(f, (count.get(f) ?? 0) + 1);
    const shared = [...count].filter(([, n]) => n >= 2).map(([f]) => f);
    return { tasks, refs: [...refs], files: shared };
  });
  const given = groups.reduce((n, g) => n + g.tasks.length, 0);
  return { groups, heldBack, remaining: todo.length - given };
}
