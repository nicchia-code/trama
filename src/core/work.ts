import { join } from "node:path";
import { TramaError } from "./errors";
import { approveProposal, getProposal } from "./proposals";
import { resolveRef } from "./refs";
import { boolField, enumField, enumOrNull, idField, type Raw, stringList } from "./schema";
import {
  findNumbered,
  listNumbered,
  loadModel,
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
}

export type DriftResolution = "fix-code" | "proposal" | "dismissed";

interface DriftData {
  status: "open" | "resolved";
  resolution: DriftResolution | null;
  refs: string[];
  proposal: string | null;
  task: string | null;
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
  };
  if (data.technical && data.refs.length > 0) throw new TramaError(`${where}: a Technical Task cannot have "refs"`);
  if (!data.technical && data.refs.length === 0) throw new TramaError(`${where}: a Task needs at least one entry in "refs", or "technical: true"`);
  return data;
}

function parseDrift(raw: Raw, where: string): DriftData {
  return {
    status: enumField(raw, "status", DRIFT_STATUSES, "open", where),
    resolution: enumOrNull(raw, "resolution", RESOLUTIONS, where),
    refs: stringList(raw, "refs", where),
    proposal: idField(raw, "proposal", where),
    task: idField(raw, "task", where),
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

function checkRefs(p: Project, refs: string[]) {
  const model = loadModel(p);
  for (const ref of refs) resolveRef(model, ref);
}

export function listTasks(p: Project): Task[] {
  return listNumbered(tasksDir(p)).map((e) => load(tasksDir(p), e, parseTask));
}

export function getTask(p: Project, id: string): Task {
  return load(tasksDir(p), findNumbered(tasksDir(p), id, "Task"), parseTask);
}

export function newTask(
  p: Project,
  input: { title: string; refs: string[]; technical: boolean; drift?: string; body?: string },
): Task {
  if (input.technical && input.refs.length > 0) throw new TramaError("A Technical Task cannot reference the Model");
  if (!input.technical && input.refs.length === 0)
    throw new TramaError("A Task must reference the Model with --ref, or be marked --technical");
  checkRefs(p, input.refs);
  const drift = input.drift ? getDrift(p, input.drift).id : null;
  const data: TaskData = { column: "todo", technical: input.technical, refs: input.refs, drift };
  return create(tasksDir(p), input.title, data, input.body ?? "");
}

export function moveTask(p: Project, id: string, column: string): Task {
  if (!COLUMNS.includes(column as Column))
    throw new TramaError(`Unknown column "${column}" (expected ${COLUMNS.join(", ")})`);
  const task = getTask(p, id);
  task.data.column = column as Column;
  writeDocument(task.path, task.data, task.body);
  return task;
}

export function listDrifts(p: Project): Drift[] {
  return listNumbered(driftsDir(p)).map((e) => load(driftsDir(p), e, parseDrift));
}

export function getDrift(p: Project, id: string): Drift {
  return load(driftsDir(p), findNumbered(driftsDir(p), id, "Drift"), parseDrift);
}

export function newDrift(
  p: Project,
  input: { title: string; refs: string[]; proposal?: string; body?: string },
): Drift {
  if (input.refs.length === 0) throw new TramaError("A Drift must reference the Model element closest to it with --ref");
  checkRefs(p, input.refs);
  const proposal = input.proposal ? getProposal(p, input.proposal).id : null;
  const data: DriftData = { status: "open", resolution: null, refs: input.refs, proposal, task: null };
  return create(driftsDir(p), input.title, data, input.body ?? "");
}

export function resolveDrift(p: Project, id: string, how: "fix-code" | "accept-proposal" | "dismiss"): Drift {
  const drift = getDrift(p, id);
  if (drift.data.status !== "open") throw new TramaError(`Drift ${drift.id} is already resolved`);
  if (how === "fix-code") {
    const task = newTask(p, {
      title: `Fix code to match the Model: ${drift.title}`,
      refs: drift.data.refs,
      technical: false,
      drift: drift.id,
      body: drift.body.replace(/^#\s+.+\n+/, ""),
    });
    drift.data.task = task.id;
    drift.data.resolution = "fix-code";
  } else if (how === "accept-proposal") {
    if (!drift.data.proposal) throw new TramaError(`Drift ${drift.id} has no attached Proposal`);
    approveProposal(p, drift.data.proposal);
    drift.data.resolution = "proposal";
  } else drift.data.resolution = "dismissed";
  drift.data.status = "resolved";
  writeDocument(drift.path, drift.data, drift.body);
  return drift;
}
