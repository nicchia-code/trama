import { join } from "node:path";
import { type Blocker, computeBlocked, refusalFor } from "./blocking";
import { TramaError } from "./errors";
import { approveProposal, getProposal } from "./proposals";
import { loadProject, parseRequirementRef, resolveProjectRef } from "./requirements";
import { boolField, enumField, enumOrNull, idField, type Raw, stringList } from "./schema";
import {
  findNumbered,
  listNumbered,
  nextId,
  type Project,
  readDocument,
  slugify,
  writeDocument,
} from "./store";

export type Column = "todo" | "doing" | "done";
export const COLUMNS: readonly Column[] = ["todo", "doing", "done"];

export interface Item<D> {
  id: string;
  name: string;
  path: string;
  data: D;
  title: string;
  body: string;
}

interface TaskData {
  column: Column;
  technical: boolean;
  refs: string[];
  drift: string | null;
  /** The Proposal (the design) the Task comes from; absent in Tasks written before the link existed. */
  proposal: string | null;
  /** True while the agent has taken the Task (it is working on it); absent in Tasks written before the mark existed, which are free. */
  agent: boolean;
}

export type DriftResolution = "fix-code" | "proposal" | "dismissed";

interface DriftData {
  status: "open" | "resolved";
  resolution: DriftResolution | null;
  refs: string[];
  proposal: string | null;
  task: string | null;
  /** The Task the agent was implementing when it filed the Drift; none for a Scan or a Fix, and absent in Drifts written before the field existed. */
  origin: string | null;
}

export type Task = Item<TaskData>;
export type Drift = Item<DriftData>;

const tasksDir = (p: Project) => join(p.dir, "tasks");
const driftsDir = (p: Project) => join(p.dir, "drifts");

const RESOLUTIONS: readonly DriftResolution[] = ["fix-code", "proposal", "dismissed"];
const DRIFT_STATUSES: readonly DriftData["status"][] = ["open", "resolved"];

function parseTask(raw: Raw, where: string): TaskData {
  const data: TaskData = {
    column: enumField(raw, "column", COLUMNS, "todo", where),
    technical: boolField(raw, "technical", false, where),
    refs: stringList(raw, "refs", where),
    drift: idField(raw, "drift", where),
    proposal: idField(raw, "proposal", where),
    agent: boolField(raw, "agent", false, where),
  };
  checkTaskRefs(data.technical, data.refs, `${where}: `);
  return data;
}

function parseDrift(raw: Raw, where: string): DriftData {
  return {
    status: enumField(raw, "status", DRIFT_STATUSES, "open", where),
    resolution: enumOrNull(raw, "resolution", RESOLUTIONS, where),
    refs: stringList(raw, "refs", where),
    proposal: idField(raw, "proposal", where),
    task: idField(raw, "task", where),
    origin: idField(raw, "origin", where),
  };
}

function load<D>(dir: string, entry: { id: string; name: string }, parse: (raw: Raw, where: string) => D): Item<D> {
  const path = join(dir, entry.name);
  const doc = readDocument(path);
  const title = /^#\s+(.+)$/m.exec(doc.body)?.[1]?.trim() ?? entry.name;
  return { id: entry.id, name: entry.name, path, data: parse(doc.data, path), title, body: doc.body };
}

function create<D extends object>(dir: string, title: string, data: D, body: string): Item<D> {
  const id = nextId(dir);
  const name = `${id}-${slugify(title)}.md`;
  const text = `# ${title}\n\n${body.trim()}\n`.replace(/\n\n\n$/, "\n");
  const path = join(dir, name);
  writeDocument(path, data, text);
  return { id, name, path, data, title, body: text };
}

/** Model references, plus `requirements/<area>` or `requirements/<area>#<section>` for Requirements. */
function checkRefs(p: Project, refs: string[]) {
  const project = loadProject(p);
  for (const ref of refs) resolveProjectRef(project, ref);
}

/** A Technical Task changes no behaviour, so it references no Model element, only Requirements if any; any other Task references at least one Model element. */
function checkTaskRefs(technical: boolean, refs: string[], where = "") {
  const modelRefs = refs.filter((r) => parseRequirementRef(r) === null);
  if (technical && modelRefs.length > 0) throw new TramaError(`${where}a Technical Task cannot reference the Model (only Requirements): ${modelRefs.join(", ")}`);
  if (!technical && modelRefs.length === 0)
    throw new TramaError(`${where}a Task must reference at least one Model element in "refs", unless it is technical`);
}

export function listTasks(p: Project): Task[] {
  return listNumbered(tasksDir(p)).map((e) => load(tasksDir(p), e, parseTask));
}

export function getTask(p: Project, id: string): Task {
  return load(tasksDir(p), findNumbered(tasksDir(p), id, "Task"), parseTask);
}

export function newTask(
  p: Project,
  input: { title: string; refs: string[]; technical: boolean; drift?: string; proposal?: string; body?: string },
): Task {
  checkTaskRefs(input.technical, input.refs);
  checkRefs(p, input.refs);
  const drift = input.drift ? getDrift(p, input.drift).id : null;
  const proposal = input.proposal ? getProposal(p, input.proposal).id : null;
  const data: TaskData = { column: "todo", technical: input.technical, refs: input.refs, drift, proposal, agent: false };
  return create(tasksDir(p), input.title, data, input.body ?? "");
}

/** The blocked Tasks and why, by Task ID, worked out from the Drifts and Tasks as they are now. */
export const blockedTasks = (p: Project): Map<string, Blocker[]> => computeBlocked(loadProject(p), listTasks(p), listDrifts(p));

/** Who moves a Task: the agent (through its tools, or the command line in the terminal Trama started) or the developer. */
export type Mover = "agent" | "developer";

/**
 * Moves a Task. The agent takes it by moving it to In progress (and keeps it when it does so again); moving it to
 * To do or Done clears the mark. The developer never takes a Task and cannot move one the agent has taken.
 * The agent cannot start a blocked Task, from any column, nor keep one In progress; nothing changes then.
 */
export function moveTask(p: Project, id: string, column: string, by: Mover): Task {
  if (!COLUMNS.includes(column as Column))
    throw new TramaError(`Unknown column "${column}" (expected ${COLUMNS.join(", ")})`);
  const task = getTask(p, id);
  if (by === "developer" && task.data.agent)
    throw new TramaError(`The agent is working on Task ${task.id}, so it cannot be moved. Take it back first ("trama task take-back ${task.id}", or the Take back button on its card).`);
  if (by === "agent" && column === "doing") {
    const blockers = blockedTasks(p).get(task.id);
    if (blockers) throw new TramaError(refusalFor(task, blockers));
  }
  task.data.column = column as Column;
  if (by === "agent") task.data.agent = column === "doing";
  writeDocument(task.path, task.data, task.body);
  return task;
}

/** The developer's decision to get a Task back from the agent: the mark is cleared and the Task stays In progress. */
export function takeBackTask(p: Project, id: string): Task {
  const task = getTask(p, id);
  if (!task.data.agent) throw new TramaError(`The agent has not taken Task ${task.id}`);
  task.data.agent = false;
  writeDocument(task.path, task.data, task.body);
  return task;
}

/** The agent's command ended, so no agent can still be working: every Task it took is released, where it is. */
export function releaseTasks(p: Project): Task[] {
  const released = listTasks(p).filter((t) => t.data.agent);
  for (const task of released) {
    task.data.agent = false;
    writeDocument(task.path, task.data, task.body);
  }
  return released;
}

export function listDrifts(p: Project): Drift[] {
  return listNumbered(driftsDir(p)).map((e) => load(driftsDir(p), e, parseDrift));
}

export function getDrift(p: Project, id: string): Drift {
  return load(driftsDir(p), findNumbered(driftsDir(p), id, "Drift"), parseDrift);
}

export function newDrift(
  p: Project,
  input: { title: string; refs: string[]; proposal?: string; origin?: string; body?: string },
): Drift {
  if (input.refs.length === 0) throw new TramaError("A Drift must reference the Model element closest to it with --ref");
  checkRefs(p, input.refs);
  const proposal = input.proposal ? getProposal(p, input.proposal).id : null;
  const origin = input.origin ? getTask(p, input.origin).id : null;
  const data: DriftData = { status: "open", resolution: null, refs: input.refs, proposal, task: null, origin };
  return create(driftsDir(p), input.title, data, input.body ?? "");
}

export function resolveDrift(p: Project, id: string, how: "fix-code" | "accept-proposal" | "dismiss"): Drift {
  const drift = getDrift(p, id);
  if (drift.data.status !== "open") throw new TramaError(`Drift ${drift.id} is already resolved`);
  if (how === "fix-code") {
    // A Drift that only contradicts Requirements changes no behaviour, so its Task is technical.
    const touchesModel = drift.data.refs.some((r) => parseRequirementRef(r) === null);
    const task = newTask(p, {
      title: `Fix code to match the ${touchesModel ? "Model" : "Requirements"}: ${drift.title}`,
      refs: drift.data.refs,
      technical: !touchesModel,
      drift: drift.id,
      body: drift.body.replace(/^#\s+.+\n+/, ""),
    });
    drift.data.task = task.id;
    drift.data.resolution = "fix-code";
    // The Task the Drift came from goes back to To do and, until the fix Task is Done, is blocked (see computeBlocked).
    if (drift.data.origin) {
      const origin = getTask(p, drift.data.origin);
      if (origin.data.column !== "done") {
        origin.data.column = "todo";
        origin.data.agent = false;
        writeDocument(origin.path, origin.data, origin.body);
      }
    }
  } else if (how === "accept-proposal") {
    if (!drift.data.proposal) throw new TramaError(`Drift ${drift.id} has no attached Proposal`);
    approveProposal(p, drift.data.proposal);
    drift.data.resolution = "proposal";
  } else drift.data.resolution = "dismissed";
  drift.data.status = "resolved";
  writeDocument(drift.path, drift.data, drift.body);
  return drift;
}
