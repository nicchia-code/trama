import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type AgentOrigin, announcementsDir, deliverCard } from "./announcements";
import { type Blocker, blockedByDrift, computeBlocked, concernSameThing, refusalFor } from "./blocking";
import { TramaError } from "./errors";
import { clearProgress, readProgress, writeProgress } from "./progress";
import { approveProposal, discardAttachedProposal, type DriftDecisionKind, getProposal, type Proposal, pruneImages, rejectProposal, resolutionHolding } from "./proposals";
import type { RemovedElement } from "./scan-scope";
import { loadProject, parseRequirementRef, type ProjectModel, resolveProjectRef } from "./requirements";
import { boolField, compareByCreation, createdField, enumField, enumOrNull, idField, instantField, positiveIntOrNull, type Raw, stringList, textOrNull } from "./schema";
import { cardName, identityOfShortNumber, syncShortNumbers } from "./short-numbers";
import { isSpecsRef } from "./specs";
import {
  createdNow,
  findCard,
  listCards,
  newCardId,
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
  /**
   * Who took it, kept in the `agent` field instead of `true`: the agent terminal's ID, or `cursor` for Cursor's chat.
   * Null when free, taken before the holder was recorded, taken from an unknown origin, or read from legacy `editor`;
   * any end releases it.
   */
  holder: string | null;
  /** When the Task was created, UTC ISO 8601. Absent on numbered Tasks written before the field existed. */
  created: string | null;
  /** When the Task arrived in Done from another column, UTC ISO 8601; absent outside Done and on Tasks that reached Done before the field existed. */
  finished: string | null;
  /**
   * The note of a fix Task closed without changes (the code already did what the Drift says), with what was checked;
   * null otherwise. Set only when arriving in Done that way, and forgotten when the Task leaves Done.
   */
  unchanged: string | null;
}

export type DriftResolution = "fix-code" | "proposal" | "dismissed" | "unified";

/** A Task an open Drift leaves free at creation, and the reason it gives on one line; the list is written only at creation. */
export interface NotBlocking {
  task: string;
  reason: string;
}

interface DriftData {
  status: "open" | "resolved";
  resolution: DriftResolution | null;
  refs: string[];
  proposal: string | null;
  task: string | null;
  /** The Tasks this Drift remembers as its origin, in order: none, one, or several for a unified Drift. Written as one value or a list. */
  origin: string[];
  /** The Drifts this one follows, when it is recurring: set at creation and never changed. A unified Drift can follow several. */
  previous: string[];
  /** The Drifts a unified Drift merged, in creation order; empty for any other Drift. */
  unifies: string[];
  /** The unified Drift this one was merged into, when its resolution is `unified`; null otherwise. */
  unifiedInto: string | null;
  option: number | null;
  note: string | null;
  resolvedBy: string | null;
  created: string | null;
  /** The Tasks this Drift leaves free, in the order they were named: not blocked by it. Empty when it blocks as always. */
  notBlocking: NotBlocking[];
  /** The job (`TRAMA_JOB`) of the agent terminal that filed the Drift; set at creation and never changed. Null when none, and on Drifts written before the field. */
  job: string | null;
}

export type Task = Item<TaskData>;
export type Drift = Item<DriftData>;

const tasksDir = (p: Project) => join(p.dir, "tasks");
const driftsDir = (p: Project) => join(p.dir, "drifts");

const RESOLUTIONS: readonly DriftResolution[] = ["fix-code", "proposal", "dismissed", "unified"];
const DRIFT_STATUSES: readonly DriftData["status"][] = ["open", "resolved"];

function parseTask(raw: Raw, where: string): TaskData {
  const data: TaskData = {
    column: enumField(raw, "column", COLUMNS, "todo", where),
    technical: boolField(raw, "technical", false, where),
    refs: stringList(raw, "refs", where),
    drift: idField(raw, "drift", where),
    proposal: idField(raw, "proposal", where),
    ...agentField(raw, where),
    created: createdField(raw, where),
    finished: instantField(raw, "finished", where),
    unchanged: textOrNull(raw, "unchanged", where),
  };
  checkTaskRefs(data.technical, data.refs, `${where}: `);
  return data;
}

/** The `agent` field: false, true, or the holder that took the Task (a terminal ID or `cursor`). */
function agentField(raw: Raw, where: string): { agent: boolean; holder: string | null } {
  const v = raw["agent"];
  if (typeof v === "string" && v.trim() !== "") {
    const holder = v.trim();
    return { agent: true, holder: holder === "editor" ? null : holder };
  }
  return { agent: boolField(raw, "agent", false, where), holder: null };
}

/** Task ownership recognizes agent terminals and Cursor's chat: `cursor:<conversation>`, or `cursor` for the project's chat without a known conversation. */
const holderOf = (origin: AgentOrigin): string | null =>
  origin.terminal ?? (origin.chat === "cursor" ? (origin.conversation ? `cursor:${origin.conversation}` : "cursor") : null);

/** A card ID field that is a single value or a list of values; absent or null is an empty list. */
function idListField(raw: Raw, key: string, where: string): string[] {
  const v = raw[key];
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) return [idField(raw, key, where) as string];
  return v.map((item) => idField({ [key]: item }, key, where) ?? "").filter((id) => id !== "");
}

function parseDrift(raw: Raw, where: string): DriftData {
  const data: DriftData = {
    status: enumField(raw, "status", DRIFT_STATUSES, "open", where),
    resolution: enumOrNull(raw, "resolution", RESOLUTIONS, where),
    refs: stringList(raw, "refs", where),
    proposal: idField(raw, "proposal", where),
    task: idField(raw, "task", where),
    origin: idListField(raw, "origin", where),
    previous: idListField(raw, "previous", where),
    unifies: idListField(raw, "unifies", where),
    unifiedInto: idField(raw, "unifiedInto", where),
    option: positiveIntOrNull(raw, "option", where),
    note: textOrNull(raw, "note", where),
    resolvedBy: idField(raw, "resolvedBy", where),
    created: createdField(raw, where),
    notBlocking: notBlockingField(raw, where),
    job: textOrNull(raw, "job", where),
  };
  if (data.resolution === "unified" && data.unifiedInto === null) throw new TramaError(`${where}: resolution "unified" needs "unifiedInto", the Drift it was merged into`);
  if (data.unifiedInto !== null && data.resolution !== "unified") throw new TramaError(`${where}: "unifiedInto" goes only with resolution "unified", found ${JSON.stringify(data.resolution)}`);
  return data;
}

/** The `notBlocking` list of a Drift: each item a Task identity and a reason on one line; absent or null is none. */
function notBlockingField(raw: Raw, where: string): NotBlocking[] {
  const v = raw["notBlocking"];
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw new TramaError(`${where}: "notBlocking" must be a list of { task, reason }, found ${JSON.stringify(v)}`);
  return v.map((item: unknown, i) => {
    const entry: Raw = typeof item === "object" && item !== null && !Array.isArray(item) ? { ...item } : {};
    const task = idField(entry, "task", where);
    const reason = textOrNull(entry, "reason", where)?.trim() ?? "";
    if (task === null || reason === "") throw new TramaError(`${where}: "notBlocking" item ${i + 1} needs a "task" and a "reason"`);
    return { task, reason };
  });
}

function load<D>(dir: string, entry: { id: string; name: string }, parse: (raw: Raw, where: string) => D): Item<D> {
  const path = join(dir, entry.name);
  const doc = readDocument(path);
  const title = /^#\s+(.+)$/m.exec(doc.body)?.[1]?.trim() ?? entry.name;
  return { id: entry.id, name: entry.name, path, data: parse(doc.data, path), title, body: doc.body };
}

/** Writes a card. A numbered card has no `created`, and a Task outside Done no `finished`; the key stays absent so a later edit does not invent an instant. */
function saveItem(path: string, data: object, body: string) {
  const copy: Record<string, unknown> = { ...data };
  if (copy["created"] == null) delete copy["created"];
  if (copy["finished"] === null) delete copy["finished"];
  if (copy["unchanged"] === null) delete copy["unchanged"];
  // One value is written as a string, several as a list; a Drift with no origin keeps `origin: null`, one with no precedent or merge has no such key.
  for (const key of ["origin", "previous"] as const) {
    const v = copy[key];
    if (Array.isArray(v)) copy[key] = v.length === 0 ? (key === "origin" ? null : undefined) : v.length === 1 ? v[0] : v;
    if (copy[key] === undefined) delete copy[key];
  }
  if (Array.isArray(copy["unifies"]) && copy["unifies"].length === 0) delete copy["unifies"];
  if (copy["unifiedInto"] === null) delete copy["unifiedInto"];
  if (Array.isArray(copy["notBlocking"]) && copy["notBlocking"].length === 0) delete copy["notBlocking"];
  if (copy["job"] === null) delete copy["job"];
  if (copy["resolvedBy"] === null) delete copy["resolvedBy"];
  if ("holder" in copy) {
    if (copy["agent"] === true && typeof copy["holder"] === "string") copy["agent"] = copy["holder"];
    delete copy["holder"];
  }
  writeDocument(path, copy, body);
}

function create<D extends object>(dir: string, title: string, data: D, body: string, kind: string): Item<D> {
  const id = newCardId(dir, "file", kind);
  const name = `${id}-${slugify(title)}.md`;
  const text = `# ${title}\n\n${body.trim()}\n`.replace(/\n\n\n$/, "\n");
  const path = join(dir, name);
  saveItem(path, data, text);
  return { id, name, path, data, title, body: text };
}

/** Model references, plus `requirements/<area>` or `requirements/<area>#<section>` for Requirements. */
function checkRefs(p: Project, refs: string[]) {
  const project = loadProject(p);
  for (const ref of refs) resolveProjectRef(project, ref);
}

/**
 * The references a fix Task points at: those of the Drift that still resolve, and for each that no longer does its
 * nearest container still there (`order/Gone/user.CANCEL` becomes `order`, `requirements/ui#Gone` becomes `requirements/ui`).
 * A reference with no container left is dropped; duplicates are folded.
 */
function liveRefs(p: Project, refs: string[], project: ProjectModel = loadProject(p)): string[] {
  const resolves = (ref: string) => {
    try {
      resolveProjectRef(project, ref);
      return true;
    } catch {
      return false;
    }
  };
  const nearest = (ref: string) => {
    const parts = ref.split("/");
    // An Event whose owner is gone has no container but the owner itself.
    const up = parseRequirementRef(ref)
      ? [ref.split("#")[0] as string]
      : parts.length > 1
        ? parts.slice(0, -1).map((_, i) => parts.slice(0, parts.length - 1 - i).join("/"))
        : [ref.split(".")[0] as string];
    return up.filter((c) => c !== ref).find(resolves);
  };
  return [...new Set(refs.flatMap((ref) => (resolves(ref) ? [ref] : (nearest(ref) ?? []))))];
}

/** A Technical Task changes no behaviour, so it references no Model element, only Requirements if any; any other Task references at least one Model element. */
function checkTaskRefs(technical: boolean, refs: string[], where = "") {
  const modelRefs = refs.filter((r) => parseRequirementRef(r) === null && !isSpecsRef(r));
  if (technical && modelRefs.length > 0) throw new TramaError(`${where}a Technical Task cannot reference the Model (only Requirements): ${modelRefs.join(", ")}`);
  if (!technical && modelRefs.length === 0)
    throw new TramaError(`${where}a Task must reference at least one Model element in "refs", unless it is technical`);
}

export function listTasks(p: Project): Task[] {
  return listCards(tasksDir(p), "file")
    .map((e) => load(tasksDir(p), e, parseTask))
    .sort((a, b) => compareByCreation({ id: a.id, created: a.data.created }, { id: b.id, created: b.data.created }));
}

/** The Task `id` names. `asArgument` applies the command rules: digits cite only a numbered Task, and a short number (`T3`) cites the live Task that has it. */
export function getTask(p: Project, id: string, asArgument = false): Task {
  const cited = asArgument ? identityOfShortNumber(p, "task", id) : null;
  return load(tasksDir(p), findCard(tasksDir(p), cited ?? id, "Task", "file", asArgument && cited === null), parseTask);
}

/** A Task checked and built but not written: what `newTask` writes, and what `trama comparison move` checks for every card before it writes any. */
export interface PlannedTask {
  title: string;
  data: TaskData;
  body: string;
}

export function planTask(
  p: Project,
  input: { title: string; refs: string[]; technical: boolean; drift?: string; proposal?: string; body?: string },
): PlannedTask {
  checkTaskRefs(input.technical, input.refs);
  checkRefs(p, input.refs);
  const drift = input.drift ? getDrift(p, input.drift) : null;
  // The Proposal must exist. A Task written with a Proposal belongs to its design, Technical or not.
  // A Task that fixes a Drift belongs to the design of the Task the Drift came from, whoever creates it.
  const linked = input.proposal ? getProposal(p, input.proposal).id : null;
  let proposal = linked;
  if (drift) {
    const origin = originDesign(p, drift.data.origin);
    if (linked !== null && linked !== origin)
      throw new TramaError(
        origin
          ? `A Task fixing Drift ${cardName(p, "drift", drift.id)} belongs to Proposal ${cardName(p, "proposal", origin)}, the design of its origin Task: drop --proposal or pass that one`
          : `Drift ${cardName(p, "drift", drift.id)} did not come from a Task of a design, so its fix Task belongs to no Proposal: drop --proposal`,
      );
    proposal = origin;
  }
  const data: TaskData = { column: "todo", technical: input.technical, refs: input.refs, drift: drift?.id ?? null, proposal, agent: false, holder: null, created: createdNow(), finished: null, unchanged: null };
  return { title: input.title, data, body: input.body ?? "" };
}

export function writeTask(p: Project, plan: PlannedTask): Task {
  return create(tasksDir(p), plan.title, plan.data, plan.body, "Task");
}

export function newTask(p: Project, input: { title: string; refs: string[]; technical: boolean; drift?: string; proposal?: string; body?: string }): Task {
  return writeTask(p, planTask(p, input));
}

/** A Task an ordinary Proposal creates when it is approved: the file it will be, in To do. */
export interface ApprovalTask {
  name: string;
  data: TaskData;
  body: string;
}

const REMOVED_NOUN: Record<RemovedElement["kind"], string> = {
  feature: "the Feature",
  actor: "the Actor",
  machine: "the Machine",
  state: "the State",
  transition: "the Transition",
  event: "the Event",
};

/**
 * The Tasks an ordinary Proposal creates when it is approved, all in To do and all created at `created`: one per Task
 * file of the Proposal, under its own identity, and one `Remove code of <ref>` per removed element. Refuses, before
 * anything is written, a Task identity the project already has.
 */
export function planApprovalTasks(p: Project, proposal: Proposal, removed: RemovedElement[], created: string): ApprovalTask[] {
  const taken = new Set(listCards(tasksDir(p), "file").map((c) => c.id));
  const planned: ApprovalTask[] = [];
  for (const task of proposal.tasks) {
    if (taken.has(task.id))
      throw new TramaError(`Task ${task.id} of Proposal ${cardName(p, "proposal", proposal.id)} is already a Task of the project: nothing changed`);
    taken.add(task.id);
    const data: TaskData = { column: "todo", technical: task.technical, refs: task.refs, drift: null, proposal: proposal.id, agent: false, holder: null, created, finished: null, unchanged: null };
    planned.push({ name: task.name, data, body: `${task.body.trim()}\n` });
  }
  const taskDirs = [tasksDir(p), ...listCards(join(p.dir, "proposals"), "folder").map((e) => join(p.dir, "proposals", e.name, "tasks"))];
  for (const element of removed) {
    let id: string;
    do id = newCardId(taskDirs, "file", "Task");
    while (taken.has(id));
    taken.add(id);
    const title = `Remove code of ${element.ref}`;
    const technical = element.container === null;
    const data: TaskData = { column: "todo", technical, refs: technical ? [] : [element.container as string], drift: null, proposal: proposal.id, agent: false, holder: null, created, finished: null, unchanged: null };
    const body = `# ${title}\n\nTogli dal codice ${REMOVED_NOUN[element.kind]} \`${element.ref}\`, che la Proposal rimuove dal Modello.\n`;
    planned.push({ name: `${id}-${slugify(title)}.md`, data, body });
  }
  return planned;
}

/** Writes the Tasks planned by `planApprovalTasks`. */
export function writeApprovalTasks(p: Project, tasks: ApprovalTask[]) {
  for (const task of tasks) saveItem(join(tasksDir(p), task.name), task.data, task.body);
}

/** The blocked Tasks and why, by Task ID, worked out from the Drifts and Tasks as they are now. */
export const blockedTasks = (p: Project): Map<string, Blocker[]> => computeBlocked(loadProject(p), listTasks(p), listDrifts(p));

/** Who moves a Task: the agent (the command line run in the terminal Trama started for it) or the developer. */
export type Mover = "agent" | "developer";

/**
 * Moves a Task. The agent takes it by moving it to In progress (and keeps it when it does so again); moving it to
 * To do or Done clears the mark. The developer never takes a Task; moving one the agent has taken to In progress
 * takes it back (the mark goes, the Task stays In progress and is the developer's), and any other move of it is refused.
 * The agent cannot start a blocked Task, from any column, nor keep one In progress; nothing changes then.
 *
 * `unchanged` closes a fix Task into Done without changes, with the note of what was checked: only from a Drift still
 * in Code to be fixed (or already dismissed by this Task), and the Drift becomes Dismissed in the same step. Refused,
 * nothing changes, when the Task is not a fix Task of such a Drift, is already Done, or the note is empty.
 */
export function moveTask(p: Project, id: string, column: string, by: Mover, origin: AgentOrigin = {}, unchanged?: string): Task {
  if (!COLUMNS.includes(column as Column))
    throw new TramaError(`Unknown column "${column}" (expected ${COLUMNS.join(", ")})`);
  const task = getTask(p, id);
  const taken = by === "developer" && task.data.agent;
  if (taken && column !== "doing") {
    const name = cardName(p, "task", task.id);
    throw new TramaError(`The agent is working on Task ${name}, so it cannot be moved. Take it back with "trama task move ${name} doing".`);
  }
  if (taken) {
    task.data.agent = false;
    task.data.holder = null;
  }
  if (by === "agent" && column === "doing") {
    // Judged as if the Task had already left Done: a Done Task is never blocked, but one taken from Done may be.
    const tasks = listTasks(p).map((t) => (t.id === task.id ? { ...t, data: { ...t.data, column: "doing" as Column } } : t));
    const blockers = computeBlocked(loadProject(p), tasks, listDrifts(p)).get(task.id);
    if (blockers) throw new TramaError(refusalFor(task, blockers, syncShortNumbers(p)));
  }
  const drift = unchanged === undefined ? null : unchangedDrift(p, task, column, unchanged);
  // Arriving in Done from another column records the instant; Done to Done keeps it; leaving Done forgets it.
  if (column !== "done") task.data.finished = null;
  else if (task.data.column !== "done") task.data.finished = createdNow();
  // The note of a closed-unchanged Task stays while it is in Done, and is forgotten when it leaves.
  if (column !== "done") task.data.unchanged = null;
  else if (unchanged !== undefined) task.data.unchanged = unchanged.trim();
  task.data.column = column as Column;
  if (by === "agent") {
    // Moving a taken Task to In progress again keeps the mark and who holds it.
    task.data.holder = column !== "doing" ? null : task.data.agent ? task.data.holder : holderOf(origin);
    task.data.agent = column === "doing";
  }
  saveItem(task.path, task.data, task.body);
  if (!task.data.agent) clearProgress(p, task.id);
  pruneImages(p);
  if (drift) {
    drift.data.status = "resolved";
    drift.data.resolution = "dismissed";
    saveItem(drift.path, drift.data, drift.body);
  }
  return task;
}

/** The outcome of a declaration of progress: the percentage kept, or the note saying why nothing changed. */
export type ProgressDeclaration = { declared: true; task: Task; progress: number } | { declared: false; task: Task; note: string };

/**
 * The agent declares how far along a Task it has taken is. Accepted only for a Task In progress and taken by the agent,
 * from the agent that holds it (any agent when it was taken without a known terminal or chat); every other declaration
 * changes nothing and says why. It never moves or takes the Task and does not touch its file.
 */
export function declareProgress(p: Project, id: string, value: number, by: Mover, origin: AgentOrigin = {}): ProgressDeclaration {
  const task = getTask(p, id);
  const name = cardName(p, "task", task.id);
  const ignored = (why: string): ProgressDeclaration => ({ declared: false, task, note: `Progress ignored: Task ${name} ${why}` });
  if (by !== "agent") return ignored("is not declared by the agent: only the agent that took a Task declares its progress");
  if (task.data.column !== "doing" || !task.data.agent) return ignored("is not taken by the agent");
  if (task.data.holder !== null && task.data.holder !== holderOf(origin)) return ignored("is taken by another agent");
  writeProgress(p, task.id, value);
  return { declared: true, task, progress: value };
}

/** The percentage declared for a Task, or null: only a Task In progress and taken by the agent has one. */
export const taskProgress = (p: Project, task: Task): number | null => (task.data.column === "doing" && task.data.agent ? readProgress(p, task.id) : null);

/**
 * The Drift a fix Task closed without changes dismisses, or a refusal saying why nothing may change: the Task must be
 * moving to Done from another column, be the fix Task registered in a Drift in Code to be fixed (or already dismissed
 * by it), and come with a note.
 */
function unchangedDrift(p: Project, task: Task, column: string, note: string): Drift {
  const name = cardName(p, "task", task.id);
  if (column !== "done") throw new TramaError(`Only a move to done can close Task ${name} without changes: nothing changed`);
  if (task.data.column === "done") throw new TramaError(`Task ${name} is already Done: nothing changed`);
  if (task.data.drift === null) throw new TramaError(`Task ${name} does not fix a Drift: only a fix Task can be closed without changes`);
  if (note.trim() === "") throw new TramaError(`Closing Task ${name} without changes needs a note saying what was checked`);
  const drift = getDrift(p, task.data.drift);
  const dname = cardName(p, "drift", drift.id);
  if (drift.data.status === "resolved" && drift.data.task !== null && drift.data.task !== task.id)
    throw new TramaError(`Drift ${dname} is fixed by Task ${cardName(p, "task", drift.data.task)}: only that Task can close it without changes, so Task ${name} cannot`);
  const inCodeToBeFixed = drift.data.status === "resolved" && drift.data.resolution === "fix-code";
  const dismissedHere = drift.data.status === "resolved" && drift.data.resolution === "dismissed" && drift.data.task === task.id;
  if (!inCodeToBeFixed && !dismissedHere)
    throw new TramaError(`Drift ${dname} is not in Code to be fixed nor dismissed by Task ${name}: Task ${name} cannot be closed without changes`);
  return drift;
}

/** Most Tasks a parallel run implements together without a configured limit. */
export const BATCH_DEFAULT = 20;

/** What a run can take: the next runnable Task, a bounded group for parallel work, and waiting Tasks. */
export interface RunQueue {
  next: Task | null;
  /**
   * The group of a parallel run, starting with `next`: each later runnable Task, oldest first, that concerns
   * the same thing as none already chosen nor any Task the agent has taken, up to the requested maximum. Empty when
   * no Task is runnable.
   */
  batch: Task[];
  /** Every Task in To do within the scope that the batch leaves out, blocked or not. */
  remaining: number;
  /**
   * The runnable Tasks the batch rule left out because they concern the same thing as a Task of the batch or as a Task
   * In progress the agent has taken, each with those Tasks. A Task left out only for lack of places, a blocked Task and
   * a Task that overlaps nothing chosen are not here.
   */
  heldBack: { task: Task; overlaps: Task[] }[];
  /** Every Task in To do within the scope that is blocked, in order. */
  waiting: { task: Task; blockers: Blocker[] }[];
}

/**
 * The Proposals a run takes its Tasks from. `include` keeps only the Tasks of the named Proposals; `exclude` keeps every
 * Task but those of the named Proposals, and the Tasks with no Proposal. Both empty is no filter; both set is refused.
 * Every identity must name an existing Proposal.
 */
export interface ProposalFilter {
  include?: string[];
  exclude?: string[];
}

/**
 * The next runnable Task(s) in creation order: only To do, unblocked Tasks in scope, grouped by distinct concerns, and
 * none concerning a Task In progress the agent has taken. The Proposal filter and an optional identity set intersect;
 * every identity must name an existing card.
 */
export function nextTask(p: Project, filter: ProposalFilter = {}, max = BATCH_DEFAULT, taskIds?: string[]): RunQueue {
  const { project, blocked, todo, taken } = scopedTodo(p, filter, taskIds);
  const batch: Task[] = [];
  for (const task of todo) {
    if (batch.length === max) break;
    if (blocked.has(task.id)) continue;
    if (batch.some((chosen) => concernSameThing(project, chosen.data.refs, task.data.refs))) continue;
    if (taken.some((t) => concernSameThing(project, t.data.refs, task.data.refs))) continue;
    batch.push(task);
  }
  const chosen = new Set(batch.map((t) => t.id));
  const heldBack = todo.flatMap((task) => {
    if (blocked.has(task.id) || chosen.has(task.id)) return [];
    const overlaps = [...batch, ...taken].filter((other) => concernSameThing(project, other.data.refs, task.data.refs));
    return overlaps.length === 0 ? [] : [{ task, overlaps }];
  });
  return {
    next: batch[0] ?? null,
    batch,
    remaining: todo.length - batch.length,
    heldBack,
    waiting: todo.flatMap((task) => (blocked.has(task.id) ? [{ task, blockers: blocked.get(task.id) as Blocker[] }] : [])),
  };
}

/** The runnable Tasks of a scope in creation order: To do and unblocked. `nextTask` also leaves out those concerning a taken Task. */
export function runnableTasks(p: Project, filter: ProposalFilter = {}, taskIds?: string[]): Task[] {
  const { blocked, todo } = scopedTodo(p, filter, taskIds);
  return todo.filter((t) => !blocked.has(t.id));
}

/** The To do Tasks of a scope with the blocking of every Task. Every Proposal and identity must exist. */
function scopedTodo(p: Project, filter: ProposalFilter, taskIds?: string[]) {
  if ((filter.include?.length ?? 0) > 0 && (filter.exclude?.length ?? 0) > 0) throw new TramaError("--proposal and --not-proposal cannot be used together");
  const include = filter.include?.length ? new Set(filter.include.map((id) => getProposal(p, id).id)) : null;
  const exclude = filter.exclude?.length ? new Set(filter.exclude.map((id) => getProposal(p, id).id)) : null;
  const selected = taskIds === undefined ? null : new Set(taskIds.map((id) => getTask(p, id, true).id));
  const tasks = listTasks(p);
  const project = loadProject(p);
  const blocked = computeBlocked(project, tasks, listDrifts(p));
  const inScope = (task: Task): boolean => {
    const proposal = task.data.proposal;
    if (include !== null) return proposal !== null && include.has(proposal);
    if (exclude !== null) return proposal === null || !exclude.has(proposal);
    return true;
  };
  const todo = tasks.filter((t) => t.data.column === "todo" && inScope(t) && (selected === null || selected.has(t.id)));
  const taken = tasks.filter((t) => t.data.column === "doing" && t.data.agent);
  return { project, blocked, todo, taken };
}

/**
 * The agent's command ended in `origin` (an agent terminal or Cursor's chat), so that agent is no longer working: the
 * Tasks it took are released and go back to To do. Tasks taken without a recorded holder count as any origin's.
 */
export function releaseTasks(p: Project, origin: AgentOrigin): Task[] {
  const holder = holderOf(origin);
  // The project's chat holder (`cursor`) is released by any conversation's end.
  const chatHolder = origin.chat === "cursor" && origin.terminal === undefined ? "cursor" : null;
  return releaseTaken(p, (task) => task.data.holder === null || task.data.holder === holder || task.data.holder === chatHolder);
}

/**
 * Sends back to To do the Tasks of `held` (identity and holder) that are still taken by that very holder when the files
 * are written, and returns them: a Task someone else took meanwhile, or took back, stays as it is.
 */
export function releaseHeldTasks(p: Project, held: readonly { id: string; holder: string }[]): Task[] {
  const holders = new Map(held.map((h) => [h.id, h.holder]));
  return releaseTaken(p, (task) => task.data.holder !== null && holders.get(task.id) === task.data.holder);
}

/** Sends back to To do the Tasks marked as taken that `matches` selects, and returns them. */
function releaseTaken(p: Project, matches: (task: Task) => boolean): Task[] {
  const released = listTasks(p).filter((task) => task.data.agent && matches(task));
  for (const task of released) {
    task.data.agent = false;
    task.data.holder = null;
    task.data.column = "todo";
    saveItem(task.path, task.data, task.body);
    clearProgress(p, task.id);
  }
  return released;
}

export function listDrifts(p: Project): Drift[] {
  return listCards(driftsDir(p), "file")
    .map((e) => load(driftsDir(p), e, parseDrift))
    .sort((a, b) => compareByCreation({ id: a.id, created: a.data.created }, { id: b.id, created: b.data.created }));
}

/** The open Drift that holds Proposal `proposalId`, or null: a resolved Drift no longer holds it. The one decision of "attached to an open Drift". */
export function attachedDrift(p: Project, proposalId: string): Drift | null {
  return listDrifts(p).find((d) => d.data.status === "open" && d.data.proposal === proposalId) ?? null;
}

/** Refuses a direct approval or rejection of a Proposal attached to an open Drift; the developer decides it through the Drift. */
export function requireNotAttached(p: Project, proposalId: string): void {
  const drift = attachedDrift(p, proposalId);
  if (drift) throw new TramaError(`Proposal ${cardName(p, "proposal", proposalId)} is attached to Drift ${cardName(p, "drift", drift.id)}: decide on the Drift with trama drift move`);
}

/** The Drift `id` names. `asArgument` applies the command rules: digits cite only a numbered Drift, and a short number (`D3`) cites the live Drift that has it. */
export function getDrift(p: Project, id: string, asArgument = false): Drift {
  const cited = asArgument ? identityOfShortNumber(p, "drift", id) : null;
  return load(driftsDir(p), findCard(driftsDir(p), cited ?? id, "Drift", "file", asArgument && cited === null), parseDrift);
}

/**
 * The Proposal every origin Task of a Drift belongs to: null when there is no origin, an origin belongs to no design, or
 * the origins belong to different designs. The design a fix Task joins, and whose model Resolve uses.
 */
export function originDesign(p: Project, origins: string[]): string | null {
  const designs = new Set(origins.map((id) => getTask(p, id).data.proposal));
  const [only] = designs;
  return designs.size === 1 && only !== undefined ? only : null;
}

/** A Drift a recurring Drift follows: its identity, its title and how it was decided (null when it is not resolved or its file is gone). */
export interface FollowedDrift {
  id: string;
  title: string;
  decision: DriftResolution | null;
}

/** The identity, title and decision of each Drift `drift` follows, when it is recurring; empty otherwise. A Drift whose file is gone keeps its identity as title. */
export function followedDrifts(p: Project, drift: Drift): FollowedDrift[] {
  if (drift.data.previous.length === 0) return [];
  const all = listDrifts(p);
  return drift.data.previous.map((id) => {
    const found = all.find((d) => d.id === id);
    return { id, title: found?.title ?? id, decision: found?.data.resolution ?? null };
  });
}

/** The identity and title of each Drift a unified Drift merged, in order; empty for any other Drift. */
export function unifiedDrifts(p: Project, drift: Drift): { id: string; title: string }[] {
  if (drift.data.unifies.length === 0) return [];
  const all = listDrifts(p);
  return drift.data.unifies.map((id) => ({ id, title: all.find((d) => d.id === id)?.title ?? id }));
}

/** The identity and title of the unified Drift `drift` was merged into; null for a Drift that was not. */
export function unifiedInto(p: Project, drift: Drift): { id: string; title: string } | null {
  const id = drift.data.unifiedInto;
  if (id === null) return null;
  return { id, title: listDrifts(p).find((d) => d.id === id)?.title ?? id };
}

/**
 * The fix Task that dismissed a Drift by being closed without changes, with its note while that Task is in Done; the
 * note is null once the Task has left Done. Null for any other Drift. Read from the files; the Drift itself stores nothing new.
 */
export function closedUnchanged(p: Project, drift: Drift, tasks: Task[] = listTasks(p)): { task: string; note: string | null } | null {
  if (drift.data.resolution !== "dismissed" || drift.data.task === null) return null;
  const task = tasks.find((t) => t.id === drift.data.task);
  return { task: drift.data.task, note: task?.data.column === "done" ? task.data.unchanged : null };
}

const HAPPENS_HEADING = "What happens";
const SHOULD_HEADING = "What should happen";
const WHERE_HEADING = "Where in the code";
const OPTIONS_HEADING = "Fix options";

export interface DriftSides {
  happens: string;
  should: string;
  /** Where in the code the difference was seen; null when the Drift has no such section. */
  where: string | null;
}

/** One way to fix the code, written by the agent: a title and a Markdown text. */
export interface DriftOption {
  title: string;
  text: string;
}

const PREPARED_HEADING = "Prepared question";
const SECTION_HEADINGS: readonly string[] = [HAPPENS_HEADING, SHOULD_HEADING, OPTIONS_HEADING, WHERE_HEADING, PREPARED_HEADING];

/** The body split at the known `## ` headings; any other line, `## ` ones included, belongs to the section it is in. */
function driftSections(drift: Drift): Map<string, string[]> {
  const sections = new Map<string, string[]>();
  let current: string[] | null = null;
  for (const line of drift.body.split("\n")) {
    const heading = /^## (.+?)\s*$/.exec(line)?.[1];
    if (heading !== undefined && SECTION_HEADINGS.includes(heading)) {
      current = [];
      sections.set(heading, current);
    } else current?.push(line);
  }
  return sections;
}

/** The text of the Prepared question section of a Drift, heading excluded; null when it has none. */
export function preparedSectionText(drift: Drift): string | null {
  return driftSections(drift).get(PREPARED_HEADING)?.join("\n") ?? null;
}

/** The body without its Prepared question section, that section being everything up to the next known heading. */
export function withoutPrepared(body: string): string {
  const kept: string[] = [];
  let inPrepared = false;
  for (const line of body.split("\n")) {
    const heading = /^## (.+?)\s*$/.exec(line)?.[1];
    if (heading !== undefined && SECTION_HEADINGS.includes(heading)) inPrepared = heading === PREPARED_HEADING;
    if (!inPrepared) kept.push(line);
  }
  return kept.join("\n");
}

/** The body of a Drift with its Prepared question section, if any, replaced by one holding `json` (a JSON text), after all the other sections. */
export function withPreparedSection(drift: Drift, json: string): string {
  return `${withoutPrepared(drift.body).trimEnd()}\n\n## ${PREPARED_HEADING}\n\n\`\`\`json\n${json}\n\`\`\`\n`;
}

/** The free text of a Drift without its title and without the Prepared question section: what a Drift written before the sides existed says. */
export function driftBody(drift: Drift): string {
  return withoutPrepared(drift.body).replace(/^#\s+.+\n+/, "").trim();
}

/** The sides of a Drift: what the code does and what the Model or Requirement says, and where in the code it was seen. Null for a Drift written before the two sections existed. */
export function driftSides(drift: Drift): DriftSides | null {
  const sections = driftSections(drift);
  const text = (heading: string) => sections.get(heading)?.join("\n").trim() ?? "";
  const happens = text(HAPPENS_HEADING);
  const should = text(SHOULD_HEADING);
  return happens && should ? { happens, should, where: text(WHERE_HEADING) || null } : null;
}

/** The fix options of a Drift in the order they are written, the first being the agent's recommendation. Empty for a Drift written before options existed. */
export function driftOptions(drift: Drift): DriftOption[] {
  const options: { title: string; lines: string[] }[] = [];
  for (const line of driftSections(drift).get(OPTIONS_HEADING) ?? []) {
    const title = /^### (.+?)\s*$/.exec(line)?.[1];
    if (title !== undefined) options.push({ title, lines: [] });
    else options.at(-1)?.lines.push(line);
  }
  return options.map((o) => ({ title: o.title, text: o.lines.join("\n").trim() }));
}

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 5;

/** The fix options a new Drift offers, checked and trimmed: two to five, each with title and text, titles that differ. */
function checkOptions(options: DriftOption[]): DriftOption[] {
  if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS)
    throw new TramaError(`A Drift needs from ${MIN_OPTIONS} to ${MAX_OPTIONS} fix options, the first being the one you recommend; found ${options.length}`);
  const checked = options.map((o, i) => {
    const title = o.title.trim();
    const text = o.text.trim();
    if (!title) throw new TramaError(`Fix option ${i + 1} needs its title: a few words naming that way to fix the code`);
    if (/\n/.test(title)) throw new TramaError(`The title of fix option ${i + 1} must be a single line`);
    if (!text) throw new TramaError(`Fix option ${i + 1} ("${title}") needs its text: what changes and what it costs, in terms of behaviour`);
    if (/^###? /m.test(text)) throw new TramaError(`The text of fix option ${i + 1} ("${title}") cannot contain headings`);
    return { title, text };
  });
  const seen = new Set<string>();
  for (const { title } of checked) {
    if (seen.has(title)) throw new TramaError(`Two fix options are titled "${title}": titles must differ`);
    seen.add(title);
  }
  return checked;
}

/** A Proposal can be attached to a Drift only if it is a Draft or open, and no other open Drift names it (a resolved Drift holds nothing). Refuses otherwise, saying why. */
function requireAttachable(p: Project, proposal: Proposal, driftId?: string) {
  const name = cardName(p, "proposal", proposal.id);
  const { status } = proposal.data;
  if (status !== "draft" && status !== "open") throw new TramaError(`Proposal ${name} was ${status}: only a Draft or open Proposal can be attached to a Drift`);
  const holder = listDrifts(p).find((d) => d.id !== driftId && d.data.status === "open" && d.data.proposal === proposal.id);
  if (holder) throw new TramaError(`Proposal ${name} is already attached to Drift ${cardName(p, "drift", holder.id)}`);
}

/**
 * The Drift a new one follows, when it is recurring: the Drift that the origin Task fixes, or else the one named with
 * `previous`. That Drift must be resolved by fixing the code or with a Proposal; otherwise, or when a named one differs
 * from the origin's, the creation is refused, saying why.
 */
function previousOf(p: Project, named: string | undefined, origin: string | null): string | null {
  const fixed = origin ? getTask(p, origin).data.drift : null;
  const chosen = named === undefined ? null : getDrift(p, named).id;
  if (fixed !== null && chosen !== null && chosen !== fixed)
    throw new TramaError(`The origin Task fixes Drift ${cardName(p, "drift", fixed)}, so that is the previous Drift: drop "previous" or name that one`);
  const id = fixed ?? chosen;
  if (id === null) return null;
  const previous = getDrift(p, id);
  if (previous.data.status !== "resolved") throw new TramaError(`Drift ${cardName(p, "drift", id)} is still open: a recurring Drift follows a Drift already resolved`);
  if (previous.data.resolution !== "fix-code" && previous.data.resolution !== "proposal")
    throw new TramaError(`Drift ${cardName(p, "drift", id)} was ${previous.data.resolution ?? "resolved without a decision"}: a recurring Drift follows one resolved by fixing the code or by a Proposal`);
  return previous.id;
}

/** A Task a Drift leaves free, with its title: null once the Task no longer exists, which the list keeps all the same. */
export interface FreedTask extends NotBlocking {
  title: string | null;
}

/** The Tasks a Drift leaves free, in the order they were named. A Task that no longer exists stays in the list, with no title. */
export function freedTasks(drift: Drift, tasks: Task[]): FreedTask[] {
  return drift.data.notBlocking.map((n) => ({ ...n, title: tasks.find((t) => t.id === n.task)?.title ?? null }));
}

/** The live Tasks a new Drift with these references and this origin would block: what `trama drift new` with `dryRun` lists. Refuses references that do not resolve and an origin that is not a Task. */
export function driftCandidates(p: Project, refs: string[], origin: string[]): Task[] {
  checkRefs(p, refs);
  for (const id of origin) getTask(p, id);
  return blockedByDrift(loadProject(p), listTasks(p), refs, origin);
}

/**
 * The Tasks a new Drift may leave free: each one a Task the Drift would block (the origin included), named once, with
 * a reason on one line. Refuses, naming the Task, anything else.
 */
function checkNotBlocking(p: Project, named: NotBlocking[], refs: string[], origin: string[]): NotBlocking[] {
  const existing = listTasks(p);
  const wouldBlock = blockedByDrift(loadProject(p), existing, refs, origin);
  const seen = new Set<string>();
  return named.map(({ task, reason }) => {
    if (task === "") throw new TramaError("A reason for a Task was given with no Task before it: each `reason` of `notBlocking` goes with its `task`");
    if (!existing.some((t) => t.id === task)) throw new TramaError(`Task ${task} does not exist, so the Drift cannot leave it free`);
    const name = cardName(p, "task", task);
    if (seen.has(task)) throw new TramaError(`Task ${name} is named more than once in notBlocking`);
    seen.add(task);
    const text = reason.trim();
    if (!text) throw new TramaError(`Task ${name} needs its reason, in one line: why the difference does not touch it`);
    if (/\n/.test(text)) throw new TramaError(`The reason for Task ${name} must be a single line`);
    if (!wouldBlock.some((t) => t.id === task)) throw new TramaError(`The Drift would not block Task ${name}, so it cannot leave it free`);
    return { task, reason: text };
  });
}

/** A Drift checked and built but not written: what `newDrift` writes, and what `trama comparison move` checks for every card before it writes any. */
export interface PlannedDrift {
  title: string;
  data: DriftData;
  body: string;
}

export function planDrift(
  p: Project,
  input: { title: string; refs: string[]; proposal?: string; origin?: string; previous?: string; happens: string; should: string; options: DriftOption[]; where: string; notBlocking?: NotBlocking[]; job?: string },
): PlannedDrift {
  const origin = input.origin ? getTask(p, input.origin).id : null;
  const previous = previousOf(p, input.previous, origin);
  return planDriftWith(p, input, origin === null ? [] : [origin], previous === null ? [] : [previous], []);
}

function planDriftWith(
  p: Project,
  input: { title: string; refs: string[]; proposal?: string; happens: string; should: string; options: DriftOption[]; where: string; notBlocking?: NotBlocking[]; job?: string },
  origin: string[],
  previous: string[],
  unifies: string[],
): PlannedDrift {
  if (input.refs.length === 0) throw new TramaError("A Drift must reference the Model element closest to it with `refs`");
  const happens = input.happens.trim();
  const should = input.should.trim();
  const where = input.where.trim();
  if (!happens) throw new TramaError(`A Drift needs its "${HAPPENS_HEADING}" text: what the code does, in terms of behaviour`);
  if (!should) throw new TramaError(`A Drift needs its "${SHOULD_HEADING}" text: what the Model or the Requirement says`);
  const options = input.options.length === 0 ? [] : checkOptions(input.options);
  if (!where) throw new TramaError(`A Drift needs its "${WHERE_HEADING}" text: the files and code elements where the difference was seen in the code`);
  checkRefs(p, input.refs);
  const attached = input.proposal ? getProposal(p, input.proposal) : null;
  if (attached) requireAttachable(p, attached);
  if (options.length === 0 && attached === null) throw new TramaError("A Drift without Fix options needs an attached Proposal that fixes the Model or the Requirements: give `proposal` with its Draft, or two to five fix options");
  const proposal = attached?.id ?? null;
  const notBlocking = checkNotBlocking(p, input.notBlocking ?? [], input.refs, origin);
  const data: DriftData = { status: "open", resolution: null, refs: input.refs, proposal, task: null, origin, previous, unifies, unifiedInto: null, option: null, note: null, resolvedBy: null, created: createdNow(), notBlocking, job: input.job?.trim() || null };
  const sections = [
    `## ${HAPPENS_HEADING}\n\n${happens}`,
    `## ${SHOULD_HEADING}\n\n${should}`,
    ...(options.length === 0 ? [] : [`## ${OPTIONS_HEADING}\n\n${options.map((o) => `### ${o.title}\n\n${o.text}`).join("\n\n")}`]),
    ...(where ? [`## ${WHERE_HEADING}\n\n${where}`] : []),
  ];
  return { title: input.title, data, body: sections.join("\n\n") };
}

export function writeDrift(p: Project, plan: PlannedDrift, announcement?: string): Drift {
  const drift = create(driftsDir(p), plan.title, plan.data, plan.body, "Drift");
  deliverCard(p, announcement, "drift");
  return drift;
}

export function newDrift(
  p: Project,
  input: { title: string; refs: string[]; proposal?: string; origin?: string; previous?: string; happens: string; should: string; options: DriftOption[]; where: string; announcement?: string; notBlocking?: NotBlocking[]; job?: string },
): Drift {
  return writeDrift(p, planDrift(p, input), input.announcement);
}

/**
 * The Drifts a unified Drift would merge, named by identity, short number or unique prefix, in creation order. Refuses,
 * naming every problem and writing nothing, when they are fewer than two, repeated, missing, not open or in a resolution
 * being written or open, or when `proposal` is attached to one of them.
 */
export function unifiedBy(p: Project, named: string[], proposal?: string): Drift[] {
  const problems: string[] = [];
  const found = new Map<string, Drift>();
  const repeated = new Set<string>();
  for (const arg of named) {
    let drift: Drift;
    try {
      drift = getDrift(p, arg, true);
    } catch (error) {
      problems.push(error instanceof TramaError ? error.message : `Drift ${arg} cannot be read`);
      continue;
    }
    if (found.has(drift.id)) {
      repeated.add(drift.id);
      continue;
    }
    found.set(drift.id, drift);
    const name = cardName(p, "drift", drift.id);
    if (drift.data.status !== "open") problems.push(`Drift ${name} is already resolved: only an open Drift can be unified`);
    else {
      const holding = resolutionHolding(p, drift.id);
      if (holding) problems.push(`Drift ${name} is part of resolution ${cardName(p, "proposal", holding.id)}, which is being written or open: it cannot be unified`);
    }
  }
  for (const id of repeated) problems.push(`Drift ${cardName(p, "drift", id)} is named more than once in unifies`);
  if (named.length < 2) problems.push("Unifying needs at least two Drifts in unifies");
  if (proposal !== undefined) {
    const attached = getProposal(p, proposal, true);
    for (const drift of found.values())
      if (drift.data.proposal === attached.id) problems.push(`Proposal ${cardName(p, "proposal", attached.id)} is attached to Drift ${cardName(p, "drift", drift.id)}, which is being unified: give a Proposal of its own`);
  }
  if (problems.length > 0) throw new TramaError(problems.join("\n"));
  return listDrifts(p).filter((d) => found.has(d.id));
}

/** The origins of a unified Drift: those of the Drifts it merges, without repeats, in the order of `unified`. */
const unifiedOrigins = (unified: Drift[]): string[] => [...new Set(unified.flatMap((d) => d.data.origin))];

/**
 * The Drifts a unified Drift follows: those of the merged Drifts, then each Drift a fix Task that is one of its origins
 * fixes (only one resolved by fixing the code or with a Proposal), without repeats.
 */
function unifiedPrevious(p: Project, unified: Drift[], origin: string[]): string[] {
  const fixed = origin.flatMap((id) => {
    const drift = getTask(p, id).data.drift;
    if (drift === null) return [];
    try {
      const resolution = getDrift(p, drift).data.resolution;
      return resolution === "fix-code" || resolution === "proposal" ? [drift] : [];
    } catch {
      return [];
    }
  });
  return [...new Set([...unified.flatMap((d) => d.data.previous), ...fixed])];
}

/** The live Tasks a unified Drift with these `refs` would block: the origins of its merged Drifts and every Task concerning the same thing. Writes nothing. */
export function unifiedCandidates(p: Project, named: string[], refs: string[]): Task[] {
  return driftCandidates(p, refs, unifiedOrigins(unifiedBy(p, named)));
}

/**
 * Files one Drift that merges the open Drifts named in `unifies`, and closes them in the same step: each becomes resolved
 * as `unified` into the new Drift, loses its prepared question's validity, and its attached Proposal, in writing or open,
 * is discarded without feedback. Everything is checked first; if a write fails the files already written are restored.
 */
export function newUnifiedDrift(
  p: Project,
  input: { unifies: string[]; title: string; refs: string[]; proposal?: string; happens: string; should: string; options: DriftOption[]; where: string; announcement?: string; notBlocking?: NotBlocking[]; job?: string },
): { drift: Drift; unified: Drift[] } {
  const unified = unifiedBy(p, input.unifies, input.proposal);
  const origin = unifiedOrigins(unified);
  const plan = planDriftWith(p, input, origin, unifiedPrevious(p, unified, origin), unified.map((d) => d.id));
  const attached = [...new Set(unified.flatMap((d) => (d.data.proposal === null ? [] : [d.data.proposal])))];
  const saved = [
    ...unified.map((d) => ({ path: d.path, text: readFileSync(d.path, "utf8") })),
    ...attached.map((id) => {
      const path = join(getProposal(p, id).dir, "proposal.md");
      return { path, text: readFileSync(path, "utf8") };
    }),
    // Discarding a Proposal also removes the announcements bound to it: they are restored with the files.
    ...announcementFiles(p),
  ];
  let drift: Drift | null = null;
  try {
    drift = create(driftsDir(p), plan.title, plan.data, plan.body, "Drift");
    for (const d of unified) {
      d.data.status = "resolved";
      d.data.resolution = "unified";
      d.data.unifiedInto = drift.id;
      d.data.proposal = null;
      saveItem(d.path, d.data, d.body);
    }
    for (const id of attached) discardAttachedProposal(p, id);
  } catch (error) {
    for (const { path, text } of saved) if (!existsSync(path) || readFileSync(path, "utf8") !== text) writeFileSync(path, text);
    if (drift !== null) rmSync(drift.path, { force: true });
    throw error;
  }
  deliverCard(p, input.announcement, "drift");
  return { drift, unified };
}

/** Every announcement file with its text, for a rollback. */
function announcementFiles(p: Project): { path: string; text: string }[] {
  const dir = announcementsDir(p);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => ({ path: join(dir, name), text: readFileSync(join(dir, name), "utf8") }));
}

/**
 * The Proposal a developer-side command may attach to an open Drift after its creation: a Draft or open one that no other open Drift holds,
 * for a Drift that has none. Refuses otherwise, saying why; writes nothing.
 */
export function checkAttachment(p: Project, drift: Drift, proposalId: string): Proposal {
  if (drift.data.status !== "open") throw new TramaError(`Drift ${cardName(p, "drift", drift.id)} is already resolved: a Proposal is attached only to an open Drift`);
  if (drift.data.proposal !== null) throw new TramaError(`Drift ${cardName(p, "drift", drift.id)} already has the attached Proposal ${cardName(p, "proposal", drift.data.proposal)}`);
  const proposal = getProposal(p, proposalId, true);
  requireAttachable(p, proposal, drift.id);
  return proposal;
}

/** Writes a Drift as it now stands: its data and its body. */
export function saveDrift(drift: Drift): void {
  saveItem(drift.path, drift.data, drift.body);
}

/** What the developer adds when fixing the code of a Drift: the number of the chosen fix option (from 1) and a free note. */
export interface FixChoice {
  option?: number;
  note?: string;
}

/** The body of the Task that fixes the code: both sides, then the chosen option and the note, then where in the code. A Drift written before the sections existed keeps its free text. */
function fixTaskBody(drift: Drift, option: DriftOption | null, note: string | null): string {
  const sides = driftSides(drift);
  const chosen = option ? [`## Chosen option\n\n**${option.title}**\n\n${option.text}`] : [];
  const noted = note ? [`## Note\n\n${note}`] : [];
  if (!sides) return [driftBody(drift), ...chosen, ...noted].join("\n\n");
  const where = sides.where ? [`## ${WHERE_HEADING}\n\n${sides.where}`] : [];
  return [`## ${HAPPENS_HEADING}\n\n${sides.happens}`, `## ${SHOULD_HEADING}\n\n${sides.should}`, ...chosen, ...noted, ...where].join("\n\n");
}

/** The option the developer chose for a Drift that has options, or none for one that has none. Refuses a missing or unknown number, and an option for a Drift without options. */
export function chosenOption(p: Project, drift: Drift, option: number | undefined): DriftOption | null {
  const options = driftOptions(drift);
  if (options.length === 0) {
    if (option !== undefined) throw new TramaError(`Drift ${cardName(p, "drift", drift.id)} has no fix options: fix its code without choosing one`);
    return null;
  }
  const chosen = option === undefined || !Number.isInteger(option) ? undefined : options[option - 1];
  if (!chosen) throw new TramaError(`An option must be chosen to fix the code of Drift ${cardName(p, "drift", drift.id)}: give its number, from 1 to ${options.length}`);
  return chosen;
}

/**
 * The developer closes an open Drift from the panel with no change: the code is right and nothing changes. An attached Proposal,
 * a Draft or already handed over, is discarded with it, with no feedback. Like `resolveDrift` with `dismiss`, but the attached Proposal is not refused.
 */
export function dismissDrift(p: Project, id: string): Drift {
  const drift = getDrift(p, id);
  requireOpen(p, drift);
  const holding = resolutionHolding(p, drift.id);
  if (holding) throw new TramaError(`Drift ${cardName(p, "drift", drift.id)} is part of resolution ${cardName(p, "proposal", holding.id)}: decide it there`);
  if (drift.data.proposal) discardAttachedProposal(p, drift.data.proposal);
  drift.data.resolution = "dismissed";
  drift.data.proposal = null;
  drift.data.status = "resolved";
  saveItem(drift.path, drift.data, drift.body);
  return drift;
}

/**
 * The developer's decision on an open Drift. Fixing the code needs the number of a fix option when the Drift has
 * options, and takes an optional note; keeping what happens (accepting the Proposal, dismissing) takes neither.
 * Anything refused leaves the Drift open and changes nothing.
 */
export function resolveDrift(p: Project, id: string, how: "fix-code" | "accept-proposal" | "dismiss", skillsDirs: string[] = [], choice: FixChoice = {}): Drift {
  const drift = getDrift(p, id);
  requireOpen(p, drift);
  // A note is refused with accepting or dismissing even when empty: the check looks at the note as given, before it is cleaned.
  const note = choice.note?.trim() || null;
  if (how !== "fix-code" && (choice.option !== undefined || choice.note !== undefined))
    throw new TramaError(`Drift ${cardName(p, "drift", drift.id)}: ${choice.option !== undefined ? "an option" : "a note"} only goes with fixing the code, not with ${how === "dismiss" ? "dismissing" : "accepting the Proposal"}`);
  if (how === "fix-code") {
    fixCode(p, drift, choice.option, note);
    // The attached Proposal is set aside with the Drift: an open one is rejected, a Draft discarded, a decided one stays.
    setAsideAttached(p, drift, "resolved by fixing the code");
  } else if (how === "accept-proposal") {
    if (!drift.data.proposal) throw new TramaError(`Drift ${cardName(p, "drift", drift.id)} has no attached Proposal`);
    approveProposal(p, drift.data.proposal, skillsDirs);
    drift.data.resolution = "proposal";
  } else {
    if (drift.data.proposal)
      throw new TramaError(`Drift ${cardName(p, "drift", drift.id)} has an attached Proposal (${cardName(p, "proposal", drift.data.proposal)}): accept that Proposal to keep the code, or fix the code`);
    drift.data.resolution = "dismissed";
  }
  // A resolved Drift no longer holds its Proposal.
  drift.data.proposal = null;
  drift.data.status = "resolved";
  saveItem(drift.path, drift.data, drift.body);
  return drift;
}

/**
 * Why the code of a Drift cannot be fixed, or null: it points to the Model but none of its Model elements is left, not even a container, so the fix
 * Task would have nothing to point at. The Drift can then only be dismissed or accepted.
 */
export function fixCodeRefusal(p: Project, drift: Drift, project: ProjectModel = loadProject(p)): string | null {
  const isModel = (r: string) => parseRequirementRef(r) === null;
  if (!drift.data.refs.some(isModel) || liveRefs(p, drift.data.refs, project).some(isModel)) return null;
  const close = drift.data.proposal === null ? "dismissing it (`drift move <id> dismissed`)" : "accepting its attached Proposal (`drift move <id> proposal-accepted`)";
  return `The Model elements of Drift ${cardName(p, "drift", drift.id)} no longer exist: its code cannot be fixed, the Drift can only be closed by ${close}`;
}

/** Creates the fix Task of a Drift and moves its origin back to To do; records option, note and the resolution on the Drift (not saved). */
function fixCode(p: Project, drift: Drift, optionNumber: number | undefined, note: string | null): void {
  const option = chosenOption(p, drift, optionNumber);
  const refusal = fixCodeRefusal(p, drift);
  if (refusal) throw new TramaError(refusal);
  // A reference that no longer resolves stands for its nearest container still there.
  const refs = liveRefs(p, drift.data.refs);
  // A Drift that only contradicts Requirements changes no behaviour, so its Task is technical.
  const touchesModel = drift.data.refs.some((r) => parseRequirementRef(r) === null);
  // The design of the origin Tasks, when they all share one: the fix belongs to it, even when it is technical.
  const design = originDesign(p, drift.data.origin);
  const task = newTask(p, {
    title: `Fix code to match the ${touchesModel ? "Model" : "Requirements"}: ${drift.title}`,
    refs,
    technical: !touchesModel,
    drift: drift.id,
    ...(design ? { proposal: design } : {}),
    body: fixTaskBody(drift, option, note),
  });
  drift.data.task = task.id;
  drift.data.resolution = "fix-code";
  drift.data.option = option ? (optionNumber as number) : null;
  drift.data.note = note;
  // Each Task the Drift came from goes back to To do and, until the fix Task is Done, is blocked (see computeBlocked);
  // an origin the Drift left free is not held by it, so it stays where it is.
  for (const id of drift.data.origin) {
    const origin = getTask(p, id);
    if (origin.data.column === "done" || drift.data.notBlocking.some((n) => n.task === origin.id)) continue;
    origin.data.column = "todo";
    origin.data.agent = false;
    origin.data.holder = null;
    saveItem(origin.path, origin.data, origin.body);
    clearProgress(p, origin.id);
  }
}

/** Refuses a Drift that is not open: a unified one says where it went, because it was never decided. */
function requireOpen(p: Project, drift: Drift): void {
  const name = cardName(p, "drift", drift.id);
  if (drift.data.resolution === "unified") throw new TramaError(`Drift ${name} was unified into Drift ${cardName(p, "drift", drift.data.unifiedInto as string)}: it was not decided, decide that Drift instead`);
  if (drift.data.status !== "open") throw new TramaError(`Drift ${name} is already resolved`);
}

/** Rejects the open Proposal attached to a Drift with `why` as feedback, discards a Draft, leaves a decided one. */
function setAsideAttached(p: Project, drift: Drift, why: string): void {
  const attached = drift.data.proposal ? getProposal(p, drift.data.proposal) : null;
  if (attached?.data.status === "open") rejectProposal(p, attached.id, `Drift ${drift.id} ${why}`);
  else if (attached?.data.status === "draft") discardAttachedProposal(p, attached.id);
}

/** What approving a resolution did to its listed Drifts: the decision applied, the fix Task created, or `skipped` when already resolved. */
export interface DriftOutcome {
  drift: string;
  decision: DriftDecisionKind;
  task: string | null;
  skipped: boolean;
}

/** Resolves, in one step, every still-open Drift listed by the approved resolution `proposal` with its recorded decision. */
export function resolveListedDrifts(p: Project, proposal: Proposal): DriftOutcome[] {
  return proposal.data.drifts.map(({ drift: id, decision, option, note }) => {
    const drift = getDrift(p, id);
    if (drift.data.status !== "open") return { drift: id, decision, task: null, skipped: true };
    if (decision === "fix-code") fixCode(p, drift, option, note?.trim() || null);
    else drift.data.resolution = decision;
    setAsideAttached(p, drift, `resolved by Proposal ${proposal.id}`);
    drift.data.proposal = null;
    drift.data.status = "resolved";
    drift.data.resolvedBy = proposal.id;
    saveItem(drift.path, drift.data, drift.body);
    return { drift: id, decision, task: drift.data.task, skipped: false };
  });
}
