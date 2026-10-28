import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type AgentOrigin, announcementsDir, deliverCard } from "./announcements";
import { type Blocker, blockedByDrift, computeBlocked, concernSameThing, openExtent, refusalFor } from "./blocking";
import { TramaError } from "./errors";
import { clearProgress, readProgress, writeProgress } from "./progress";
import { approveProposal, discardAttachedProposal, type DriftDecision, type DriftDecisionKind, getProposal, type Proposal, pruneImages, rejectProposal, resolutionHolding } from "./proposals";
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
  /** True while the agent has taken the Task (it is working on it). Always true together with a `holder`; never true without one. */
  agent: boolean;
  /**
   * Who took it, kept in the `agent` field: the ID of the agent terminal that took it (an omp Chat conversation has the ID of the terminal it replaces).
   * Null when nobody holds the Task: free, or the `agent` field of the file holds anything but a terminal ID.
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

export type DriftResolution = "fix-code" | "proposal" | "dismissed" | "unified" | "differences";

/** How a difference of a unified Drift was decided: the code fixed, the Model adapted with the attached Proposal, or closed without changes. */
export type DifferenceDecision = "fix-code" | "proposal" | "dismissed";

/**
 * One difference of a unified Drift: what one of the Drifts it unifies said. `drift` is the permanent identity of that Drift and
 * identifies the difference everywhere; its text lives in the body (`## Difference <drift>: <title>`). Origins and precedents
 * are those of that Drift's own file. An open difference has no `decision`.
 */
export interface Difference {
  drift: string;
  refs: string[];
  /** The Proposal attached to this difference, or null. */
  proposal: string | null;
  /** The `drift` of the other differences of the same Drift this one is linked to: symmetric. */
  linked: string[];
  decision: DifferenceDecision | null;
  /** Only with `fix-code`: the number of the chosen fix option, from 1; null when the difference has none. */
  option: number | null;
  note: string | null;
  /** The fix Task of a `fix-code` decision, shared by the linked differences fixed together. */
  task: string | null;
  /** The resolution Proposal that decided it; null when closed by Dismiss Drift (or still open). */
  resolvedBy: string | null;
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
  /** The differences of a unified Drift written with them, one per Drift it unified (or per difference of a unified Drift with differences it gathered), in order; empty for any other Drift, and for a unified Drift written before they existed, which is read as one single difference. */
  differences: Difference[];
  /** The unified Drift this one was merged into, when its resolution is `unified`; null otherwise. */
  unifiedInto: string | null;
  /** True for a Drift filed by the scan after a Merge in Solo mode, whose Where in the code lies in files the merge brought: the code may be right. Set at creation and never changed. */
  merge: boolean;
  option: number | null;
  note: string | null;
  resolvedBy: string | null;
  created: string | null;
  /** The job (`TRAMA_JOB`) of the agent terminal that filed the Drift; set at creation and never changed. Null when none, and on Drifts written before the field. */
  job: string | null;
}

export type Task = Item<TaskData>;
export type Drift = Item<DriftData>;

const tasksDir = (p: Project) => join(p.dir, "tasks");
const driftsDir = (p: Project) => join(p.dir, "drifts");

const RESOLUTIONS: readonly DriftResolution[] = ["fix-code", "proposal", "dismissed", "unified", "differences"];
const DIFFERENCE_DECISIONS: readonly DifferenceDecision[] = ["fix-code", "proposal", "dismissed"];
const DRIFT_STATUSES: readonly DriftData["status"][] = ["open", "resolved"];

function parseTask(raw: Raw, where: string): TaskData {
  const data: TaskData = {
    column: enumField(raw, "column", COLUMNS, "todo", where),
    technical: boolField(raw, "technical", false, where),
    refs: stringList(raw, "refs", where),
    drift: idField(raw, "drift", where),
    proposal: idField(raw, "proposal", where),
    ...agentField(raw),
    created: createdField(raw, where),
    finished: instantField(raw, "finished", where),
    unchanged: textOrNull(raw, "unchanged", where),
  };
  checkTaskRefs(data.technical, data.refs, `${where}: `);
  return data;
}

/**
 * The `agent` field: the ID of the terminal or conversation that took the Task, or `false`. Any other value (`true`,
 * `editor`, `cursor`, `cursor:<conversation>`, anything that is not a terminal ID) is no error and is not read
 * specially: nobody holds the Task.
 */
function agentField(raw: Raw): { agent: boolean; holder: string | null } {
  const v = raw["agent"];
  const holder = typeof v === "string" ? v.trim() : "";
  if (holder === "" || holder === "true" || holder === "editor" || holder === "cursor" || holder.startsWith("cursor:")) return { agent: false, holder: null };
  return { agent: true, holder };
}

/** Task ownership belongs to agent terminals only: a command with no recognized terminal takes the Task with no holder. */
const holderOf = (origin: AgentOrigin): string | null => origin.terminal ?? null;

/** A card ID field that is a single value or a list of values; absent or null is an empty list. */
function idListField(raw: Raw, key: string, where: string): string[] {
  const v = raw[key];
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) return [idField(raw, key, where) as string];
  return v.map((item) => idField({ [key]: item }, key, where) ?? "").filter((id) => id !== "");
}

/** The `differences` of a unified Drift: absent or null is none. Each entry is read with the same field rules as a Drift; a `linked` name must be another difference of the same Drift. */
function parseDifferences(raw: Raw, where: string): Difference[] {
  const v = raw["differences"];
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.some((e) => typeof e !== "object" || e === null || Array.isArray(e))) throw new TramaError(`${where}: "differences" must be a list of differences { drift, refs, ... }`);
  const list = v.map((entry, i): Difference => {
    const at = `${where}: differences[${i}]`;
    const e = entry as Raw;
    const drift = idField(e, "drift", at);
    if (drift === null) throw new TramaError(`${at}: "drift" is required, the Drift the difference comes from`);
    return {
      drift,
      refs: stringList(e, "refs", at),
      proposal: idField(e, "proposal", at),
      linked: idListField(e, "linked", at),
      decision: enumOrNull(e, "decision", DIFFERENCE_DECISIONS, at),
      option: positiveIntOrNull(e, "option", at),
      note: textOrNull(e, "note", at),
      task: idField(e, "task", at),
      resolvedBy: idField(e, "resolvedBy", at),
    };
  });
  const names = new Set(list.map((d) => d.drift));
  if (names.size !== list.length) throw new TramaError(`${where}: "differences" names a Drift more than once`);
  for (const d of list) {
    const bad = d.linked.find((name) => name === d.drift || !names.has(name));
    if (bad !== undefined) throw new TramaError(`${where}: the difference of ${d.drift} is linked to ${bad}, which is not another difference of this Drift`);
  }
  return list;
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
    differences: parseDifferences(raw, where),
    merge: raw["merge"] === true,
    unifiedInto: idField(raw, "unifiedInto", where),
    option: positiveIntOrNull(raw, "option", where),
    note: textOrNull(raw, "note", where),
    resolvedBy: idField(raw, "resolvedBy", where),
    created: createdField(raw, where),
    job: textOrNull(raw, "job", where),
  };
  if (data.resolution === "unified" && data.unifiedInto === null) throw new TramaError(`${where}: resolution "unified" needs "unifiedInto", the Drift it was merged into`);
  if (data.unifiedInto !== null && data.resolution !== "unified") throw new TramaError(`${where}: "unifiedInto" goes only with resolution "unified", found ${JSON.stringify(data.resolution)}`);
  if (data.resolution === "differences" && (data.differences.length === 0 || data.differences.some((d) => d.decision === null)))
    throw new TramaError(`${where}: resolution "differences" needs "differences" with every difference decided`);
  return data;
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
  if (Array.isArray(copy["differences"])) {
    if (copy["differences"].length === 0) delete copy["differences"];
    else
      copy["differences"] = (copy["differences"] as Difference[]).map((d) => ({
        drift: d.drift,
        refs: d.refs,
        ...(d.proposal === null ? {} : { proposal: d.proposal }),
        ...(d.linked.length === 0 ? {} : { linked: d.linked }),
        ...(d.decision === null ? {} : { decision: d.decision }),
        ...(d.option === null ? {} : { option: d.option }),
        ...(d.note === null ? {} : { note: d.note }),
        ...(d.task === null ? {} : { task: d.task }),
        ...(d.resolvedBy === null ? {} : { resolvedBy: d.resolvedBy }),
      }));
  }
  if (copy["merge"] !== true) delete copy["merge"];
  if (copy["unifiedInto"] === null) delete copy["unifiedInto"];
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

/** The Task `id` names, or null when it no longer exists (a Task deleted with Clear); a file that does not read still fails. */
export function getTaskOrNull(p: Project, id: string): Task | null {
  return listCards(tasksDir(p), "file").some((card) => card.id === id) ? getTask(p, id) : null;
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
 * in Code to be fixed (or already dismissed by this Task), and the Drift becomes Dismissed in the same step. For the fix
 * Task of differences of a unified Drift, the differences it fixes (`task` is this Task) must be still fixed in the code
 * or already closed by this Task; they become dismissed, keeping their choice, and the Drift keeps its state. Refused,
 * nothing changes, when the Task is not such a fix Task, is already Done, or the note is empty.
 */
export function moveTask(p: Project, id: string, column: string, by: Mover, origin: AgentOrigin = {}, unchanged?: string): Task {
  if (!COLUMNS.includes(column as Column))
    throw new TramaError(`Unknown column "${column}" (expected ${COLUMNS.join(", ")})`);
  const task = getTask(p, id);
  if (by === "agent" && column === "doing" && holderOf(origin) === null)
    throw new TramaError(`Refused: only an agent launched by Trama can take a Task, and this command does not run in a Trama terminal or omp Chat conversation (TRAMA_TERMINAL is not set); Task ${cardName(p, "task", task.id)} was not taken or moved.`);
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
  const closing = unchanged === undefined ? null : unchangedDrift(p, task, column, unchanged);
  // Arriving in Done from another column records the instant; Done to Done keeps it; leaving Done forgets it.
  if (column !== "done") task.data.finished = null;
  else if (task.data.column !== "done") task.data.finished = createdNow();
  // The note of a closed-unchanged Task stays while it is in Done, and is forgotten when it leaves.
  if (column !== "done") task.data.unchanged = null;
  else if (unchanged !== undefined) task.data.unchanged = unchanged.trim();
  task.data.column = column as Column;
  if (by === "agent") {
    // Moving a taken Task to In progress again keeps the mark and who holds it; a move to To do or Done clears it.
    task.data.holder = column !== "doing" ? null : task.data.holder ?? holderOf(origin);
    task.data.agent = task.data.holder !== null;
  }
  saveItem(task.path, task.data, task.body);
  if (!task.data.agent) clearProgress(p, task.id);
  pruneImages(p);
  if (closing?.differences) {
    for (const difference of closing.differences) difference.decision = "dismissed";
    saveItem(closing.drift.path, closing.drift.data, closing.drift.body);
  } else if (closing) {
    closing.drift.data.status = "resolved";
    closing.drift.data.resolution = "dismissed";
    saveItem(closing.drift.path, closing.drift.data, closing.drift.body);
  }
  return task;
}

/** The outcome of a declaration of progress: the percentage kept, or the note saying why nothing changed. */
export type ProgressDeclaration = { declared: true; task: Task; progress: number } | { declared: false; task: Task; note: string };

/**
 * The agent declares how far along a Task it has taken is. Accepted only for a Task In progress and taken by the agent,
 * from the agent that holds it (the same terminal or omp Chat conversation, `TRAMA_TERMINAL`); every other declaration
 * changes nothing and says why. It never moves or takes the Task and does not touch its file.
 */
export function declareProgress(p: Project, id: string, value: number, by: Mover, origin: AgentOrigin = {}): ProgressDeclaration {
  const task = getTask(p, id);
  const name = cardName(p, "task", task.id);
  const ignored = (why: string): ProgressDeclaration => ({ declared: false, task, note: `Progress ignored: Task ${name} ${why}` });
  if (by !== "agent") return ignored("is not declared by the agent: only the agent that took a Task declares its progress");
  if (task.data.column !== "doing" || task.data.holder === null) return ignored("is not taken by the agent");
  if (holderOf(origin) === null) return ignored("is not declared from a Trama terminal or omp Chat conversation: only the agent that holds a Task declares its progress");
  if (task.data.holder !== holderOf(origin)) return ignored("is taken by another agent");
  writeProgress(p, task.id, value);
  return { declared: true, task, progress: value };
}

/** The percentage declared for a Task, or null: only a Task In progress and taken by the agent has one. */
export const taskProgress = (p: Project, task: Task): number | null => (task.data.column === "doing" && task.data.agent ? readProgress(p, task.id) : null);

/**
 * What closing a fix Task without changes changes, or a refusal saying why nothing may change: the Task must be moving to
 * Done from another column and come with a note. The Drift it fixes is in Code to be fixed (or already dismissed by it) and
 * becomes Dismissed; for a unified Drift with differences, `differences` are those the Task fixes, each still fixed in the
 * code by it or already closed by it, and the Drift keeps its state.
 */
function unchangedDrift(p: Project, task: Task, column: string, note: string): { drift: Drift; differences: Difference[] | null } {
  const name = cardName(p, "task", task.id);
  if (column !== "done") throw new TramaError(`Only a move to done can close Task ${name} without changes: nothing changed`);
  if (task.data.column === "done") throw new TramaError(`Task ${name} is already Done: nothing changed`);
  if (task.data.drift === null) throw new TramaError(`Task ${name} does not fix a Drift: only a fix Task can be closed without changes`);
  if (note.trim() === "") throw new TramaError(`Closing Task ${name} without changes needs a note saying what was checked`);
  const drift = getDrift(p, task.data.drift);
  const dname = cardName(p, "drift", drift.id);
  if (hasDifferences(drift)) {
    const fixed = drift.data.differences.filter((d) => d.task === task.id);
    if (fixed.length === 0) throw new TramaError(`Task ${name} fixes no difference of Drift ${dname}: only the fix Task of a difference can be closed without changes`);
    const other = fixed.find((d) => d.decision !== "fix-code" && d.decision !== "dismissed");
    if (other) throw new TramaError(`${driftLabel(p, drift, other.drift)} is not fixed in the code nor closed by Task ${name}: Task ${name} cannot be closed without changes`);
    return { drift, differences: fixed };
  }
  if (drift.data.status === "resolved" && drift.data.task !== null && drift.data.task !== task.id)
    throw new TramaError(`Drift ${dname} is fixed by Task ${cardName(p, "task", drift.data.task)}: only that Task can close it without changes, so Task ${name} cannot`);
  const inCodeToBeFixed = drift.data.status === "resolved" && drift.data.resolution === "fix-code";
  const dismissedHere = drift.data.status === "resolved" && drift.data.resolution === "dismissed" && drift.data.task === task.id;
  if (!inCodeToBeFixed && !dismissedHere)
    throw new TramaError(`Drift ${dname} is not in Code to be fixed nor dismissed by Task ${name}: Task ${name} cannot be closed without changes`);
  return { drift, differences: null };
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
export function scopedTodo(p: Project, filter: ProposalFilter, taskIds?: string[]) {
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
 * The agent's command ended in `origin` (an agent terminal, or an omp Chat conversation as the terminal it replaces), so
 * that agent is no longer working: the Tasks carrying its mark are released and go back to To do. Never another holder's
 * Task and never a Task with no holder; an origin with no terminal releases nothing.
 */
export function releaseTasks(p: Project, origin: AgentOrigin): Task[] {
  const holder = holderOf(origin);
  return releaseTaken(p, (task) => holder !== null && task.data.holder === holder);
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

/** The Drifts by identity; of two that share one, the first, as `find` over the list gives. A reader that has already read the Drifts builds it once and hands it to the lookups below. */
export type DriftIndex = ReadonlyMap<string, Drift>;

export function indexDrifts(drifts: readonly Drift[]): DriftIndex {
  const index = new Map<string, Drift>();
  for (const drift of drifts) if (!index.has(drift.id)) index.set(drift.id, drift);
  return index;
}

/**
 * The open Drift that holds Proposal `proposalId` (as its own, or as the attached Proposal of one of its open differences), or
 * null: a resolved Drift no longer holds it. The one decision of "attached to an open Drift". `drifts` are the Drifts already
 * read; `except` is a Drift that does not count.
 */
export function attachedDrift(p: Project, proposalId: string, drifts: readonly Drift[] = listDrifts(p), except?: string): Drift | null {
  return drifts.find((d) => d.id !== except && d.data.status === "open" && (d.data.proposal === proposalId || d.data.differences.some((x) => x.decision === null && x.proposal === proposalId))) ?? null;
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
  const designs = new Set(origins.flatMap((id) => {
    const origin = getTaskOrNull(p, id);
    return origin === null ? [] : [origin.data.proposal];
  }));
  const [only] = designs;
  return designs.size === 1 && only !== undefined ? only : null;
}

/** The origin Tasks that count for an open Drift now: its own, or, for a unified Drift with differences, those of its open differences (read from the Drifts they come from). Blocking, and the model a Resolve run takes, use them. */
export function liveOrigins(p: Project, drift: Drift): string[] {
  return hasDifferences(drift) ? openExtent(drift, indexDrifts(listDrifts(p))).origin : drift.data.origin;
}

/** A Drift a recurring Drift follows: its identity, its title and how it was decided (null when it is not resolved or its file is gone). */
export interface FollowedDrift {
  id: string;
  title: string;
  decision: DriftResolution | null;
}

/** The identity, title and decision of each Drift `drift` follows, when it is recurring; empty otherwise. A Drift whose file is gone keeps its identity as title. `all` are the Drifts already read; without them they are listed, only when there is something to look up. */
export function followedDrifts(p: Project, drift: Drift, all?: DriftIndex): FollowedDrift[] {
  if (drift.data.previous.length === 0) return [];
  const index = all ?? indexDrifts(listDrifts(p));
  return drift.data.previous.map((id) => {
    const found = index.get(id);
    return { id, title: found?.title ?? id, decision: found === undefined ? null : (closedOutcome(found, index)?.decision ?? found.data.resolution) };
  });
}

/** The identity and title of each Drift a unified Drift merged, in order; empty for any other Drift. `all` are the Drifts already read, as for `followedDrifts`. */
export function unifiedDrifts(p: Project, drift: Drift, all?: DriftIndex): { id: string; title: string }[] {
  if (drift.data.unifies.length === 0) return [];
  const index = all ?? indexDrifts(listDrifts(p));
  return drift.data.unifies.map((id) => ({ id, title: index.get(id)?.title ?? id }));
}

/** The identity and title of the unified Drift `drift` was merged into; null for a Drift that was not. `all` are the Drifts already read, as for `followedDrifts`. */
export function unifiedInto(p: Project, drift: Drift, all?: DriftIndex): { id: string; title: string } | null {
  const id = drift.data.unifiedInto;
  if (id === null) return null;
  return { id, title: (all ?? indexDrifts(listDrifts(p))).get(id)?.title ?? id };
}

/**
 * The fix Task that dismissed a Drift by being closed without changes, with its note while that Task is in Done; the
 * note is null once the Task has left Done. Null for any other Drift. Read from the files; the Drift itself stores nothing new.
 * `tasks` are the Tasks already read; without them they are listed, only for a Drift that has something to look up.
 */
export function closedUnchanged(p: Project, drift: Drift, tasks?: readonly Task[]): { task: string; note: string | null } | null {
  if (drift.data.resolution !== "dismissed" || drift.data.task === null) return null;
  const task = (tasks ?? listTasks(p)).find((t) => t.id === drift.data.task);
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
/** The `###` sections of a difference block. */
const BLOCK_HEADINGS: readonly string[] = [HAPPENS_HEADING, SHOULD_HEADING, OPTIONS_HEADING, WHERE_HEADING];
/** The heading of a difference block: `## Difference <drift>: <title>`. */
const DIFFERENCE_HEADING = /^## Difference (\S+): (.*?)\s*$/;

interface Block {
  title: string;
  sections: Map<string, string[]>;
}

/** A body cut at its structural headings: the Drift's own sections and, for a unified Drift with differences, the block of each difference. */
interface ParsedBody {
  /** The four sections of a Drift; for a unified Drift with differences only its Prepared question. */
  own: Map<string, string[]>;
  blocks: Map<string, Block>;
}

/**
 * The body split at the known headings: a Drift's `## ` sections, or, when it has differences, the `## Difference <drift>: <title>`
 * blocks (of the differences it lists) with their `### ` sections, then `## Prepared question`. Any other line, headings included,
 * belongs to the section it is in, so the text of one block never reaches another section or difference.
 */
function parseBody(drift: Drift): ParsedBody {
  const known = new Set(drift.data.differences.map((d) => d.drift));
  const own = new Map<string, string[]>();
  const blocks = new Map<string, Block>();
  let current: string[] | null = null;
  let block: Block | null = null;
  for (const line of drift.body.split("\n")) {
    if (known.size === 0) {
      const heading = /^## (.+?)\s*$/.exec(line)?.[1];
      if (heading !== undefined && SECTION_HEADINGS.includes(heading)) {
        current = [];
        own.set(heading, current);
      } else current?.push(line);
      continue;
    }
    const opened = DIFFERENCE_HEADING.exec(line);
    if (opened && known.has(opened[1] as string)) {
      block = { title: (opened[2] as string).trim(), sections: new Map() };
      blocks.set(opened[1] as string, block);
      current = null;
      continue;
    }
    if (/^## Prepared question\s*$/.test(line)) {
      block = null;
      current = [];
      own.set(PREPARED_HEADING, current);
      continue;
    }
    const section = block === null ? undefined : /^### (.+?)\s*$/.exec(line)?.[1];
    if (block !== null && section !== undefined && BLOCK_HEADINGS.includes(section)) {
      current = [];
      block.sections.set(section, current);
    } else current?.push(line);
  }
  return { own, blocks };
}

/** The sections of a Drift, or of its difference `difference` when it has differences: none for a Drift with differences asked without one. */
function driftSections(drift: Drift, difference?: string): Map<string, string[]> {
  const parsed = parseBody(drift);
  if (drift.data.differences.length === 0) return parsed.own;
  return difference === undefined ? new Map() : (parsed.blocks.get(difference)?.sections ?? new Map());
}

/** True for a unified Drift written with differences: it has no sides, options or where of its own, only its differences do. */
export const hasDifferences = (drift: Drift): boolean => drift.data.differences.length > 0;

/** The title of the difference of `drift` named `difference`, from its block heading; the identity when the block is missing. */
export function differenceTitle(drift: Drift, difference: string): string {
  return parseBody(drift).blocks.get(difference)?.title || difference;
}

/** The difference of `drift` named `difference` (the `drift` it comes from), or null. */
export const differenceOf = (drift: Drift, difference: string): Difference | null => drift.data.differences.find((d) => d.drift === difference) ?? null;

/** The differences of a unified Drift still open, in order; empty for any other Drift. */
export const openDifferences = (drift: Drift): Difference[] => drift.data.differences.filter((d) => d.decision === null);

/** The text of the Prepared question section of a Drift, heading excluded; null when it has none. */
export function preparedSectionText(drift: Drift): string | null {
  return parseBody(drift).own.get(PREPARED_HEADING)?.join("\n") ?? null;
}

/** The body without its Prepared question section, that section being everything up to the next heading that starts a section or a difference. */
export function withoutPrepared(body: string): string {
  const kept: string[] = [];
  let inPrepared = false;
  for (const line of body.split("\n")) {
    const heading = /^## (.+?)\s*$/.exec(line)?.[1];
    if (heading !== undefined && (SECTION_HEADINGS.includes(heading) || DIFFERENCE_HEADING.test(line))) inPrepared = heading === PREPARED_HEADING;
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

/** The sides of a Drift, or of its difference `difference`: what the code does and what the Model or Requirement says, and where in the code it was seen. Null for a Drift written before the two sections existed, and for a Drift with differences asked without one. */
export function driftSides(drift: Drift, difference?: string): DriftSides | null {
  const sections = driftSections(drift, difference);
  const text = (heading: string) => sections.get(heading)?.join("\n").trim() ?? "";
  const happens = text(HAPPENS_HEADING);
  const should = text(SHOULD_HEADING);
  return happens && should ? { happens, should, where: text(WHERE_HEADING) || null } : null;
}

/** The fix options of a Drift, or of its difference `difference`, in the order they are written, the first being the agent's recommendation. Empty for a Drift written before options existed, and for a Drift with differences asked without one. */
export function driftOptions(drift: Drift, difference?: string): DriftOption[] {
  const heading = hasDifferences(drift) ? /^#### (.+?)\s*$/ : /^### (.+?)\s*$/;
  const options: { title: string; lines: string[] }[] = [];
  for (const line of driftSections(drift, difference).get(OPTIONS_HEADING) ?? []) {
    const title = heading.exec(line)?.[1];
    if (title !== undefined) options.push({ title, lines: [] });
    else options.at(-1)?.lines.push(line);
  }
  return options.map((o) => ({ title: o.title, text: o.lines.join("\n").trim() }));
}

/** A difference of a unified Drift as the Snapshot and `drift show --json` carry it: its text read from its block, and `open` while it has no decision. `linked` are the `drift` of the differences it is linked to. */
export interface DifferenceView {
  drift: string;
  title: string;
  refs: string[];
  sides: DriftSides | null;
  where: string | null;
  options: DriftOption[];
  proposal: string | null;
  linked: string[];
  decision: DifferenceDecision | null;
  option: number | null;
  note: string | null;
  task: string | null;
  open: boolean;
}

/** The differences of a unified Drift as views, in order; empty for any other Drift and for a unified Drift written without them. */
export function differenceViews(drift: Drift): DifferenceView[] {
  return drift.data.differences.map((d) => {
    const sides = driftSides(drift, d.drift);
    return {
      drift: d.drift,
      title: differenceTitle(drift, d.drift),
      refs: d.refs,
      sides,
      where: sides?.where ?? null,
      options: driftOptions(drift, d.drift),
      proposal: d.proposal,
      linked: d.linked,
      decision: d.decision,
      option: d.option,
      note: d.note,
      task: d.task,
      open: d.decision === null,
    };
  });
}

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 5;

/**
 * The fix options a new Drift offers, checked and trimmed: two to five, each with title and text, titles that differ.
 * `nested` is true for those of a difference, whose body headings are one level deeper.
 */
function checkOptions(options: DriftOption[], nested = false): DriftOption[] {
  if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS)
    throw new TramaError(`A Drift needs from ${MIN_OPTIONS} to ${MAX_OPTIONS} fix options, the first being the one you recommend; found ${options.length}`);
  const checked = options.map((o, i) => {
    const title = o.title.trim();
    const text = o.text.trim();
    if (!title) throw new TramaError(`Fix option ${i + 1} needs its title: a few words naming that way to fix the code`);
    if (/\n/.test(title)) throw new TramaError(`The title of fix option ${i + 1} must be a single line`);
    if (!text) throw new TramaError(`Fix option ${i + 1} ("${title}") needs its text: what changes and what it costs, in terms of behaviour`);
    if ((nested ? /^#{2,4} /m : /^###? /m).test(text)) throw new TramaError(`The text of fix option ${i + 1} ("${title}") cannot contain headings`);
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
  const holder = attachedDrift(p, proposal.id, listDrifts(p), driftId);
  if (holder) throw new TramaError(`Proposal ${name} is already attached to Drift ${cardName(p, "drift", holder.id)}`);
}

/**
 * The unified Drift that now holds the difference of Drift `drift` (resolution `unified`), following the chain when that Drift was
 * unified again, with the difference itself; null for any other Drift and when the Drift it went into was written without differences.
 */
export function unifiedDifference(drift: Drift, all: DriftIndex): { holder: Drift; difference: Difference } | null {
  if (drift.data.resolution !== "unified") return null;
  const seen = new Set<string>();
  let holder = all.get(drift.data.unifiedInto as string);
  while (holder && holder.data.resolution === "unified" && !seen.has(holder.id)) {
    seen.add(holder.id);
    holder = all.get(holder.data.unifiedInto as string);
  }
  const difference = holder?.data.differences.find((d) => d.drift === drift.id);
  return holder && difference ? { holder, difference } : null;
}

/** How a resolved Drift counts among the already resolved ones: its decision, and the references it was decided on. */
export interface ClosedOutcome {
  decision: DifferenceDecision;
  refs: string[];
  note: string | null;
}

/**
 * How a Drift counts among the already resolved ones when a difference is to be filed or a Drift names a `previous`: a Drift
 * resolved by fixing the code, with a Proposal or without changes counts with that decision on its references; a Drift `unified`
 * counts only once its difference is decided, with that decision on the references of the difference. Null otherwise (an open Drift,
 * a Drift `unified` whose difference is open or unknown, a unified Drift whose differences are decided: its Drifts count instead).
 */
export function closedOutcome(drift: Drift, all: DriftIndex): ClosedOutcome | null {
  if (drift.data.status !== "resolved") return null;
  if (drift.data.resolution === "unified") {
    const found = unifiedDifference(drift, all);
    return found?.difference.decision == null ? null : { decision: found.difference.decision, refs: found.difference.refs, note: found.difference.note };
  }
  const { resolution } = drift.data;
  return resolution === "fix-code" || resolution === "proposal" || resolution === "dismissed" ? { decision: resolution, refs: drift.data.refs, note: drift.data.note } : null;
}

/** The Drifts a Task fixed the code of, by identity: its `drift`, or, for a unified Drift with differences, the Drift of each difference it fixes. */
function fixedDrifts(p: Project, taskId: string, all: DriftIndex): string[] {
  const id = getTask(p, taskId).data.drift;
  if (id === null) return [];
  const drift = all.get(id) ?? getDrift(p, id);
  return hasDifferences(drift) ? drift.data.differences.filter((d) => d.task === taskId).map((d) => d.drift) : [drift.id];
}

/**
 * The Drifts a new one follows, when it is recurring: the Drifts that the origin Task fixes, or else the one named with
 * `previous`. Each must be resolved by fixing the code or with a Proposal (a Drift `unified` by the decision of its difference);
 * otherwise, or when a named one differs from those of the origin, the creation is refused, saying why.
 */
function previousOf(p: Project, named: string | undefined, origin: string | null): string[] {
  const all = indexDrifts(listDrifts(p));
  const fixed = origin ? fixedDrifts(p, origin, all) : [];
  const chosen = named === undefined ? null : getDrift(p, named).id;
  if (fixed.length > 0 && chosen !== null && !fixed.includes(chosen))
    throw new TramaError(`The origin Task fixes Drift ${fixed.map((id) => cardName(p, "drift", id)).join(", ")}, so ${fixed.length === 1 ? "that is the previous Drift" : "those are the previous Drifts"}: drop "previous" or name ${fixed.length === 1 ? "that one" : "one of them"}`);
  const ids = chosen !== null ? [chosen] : fixed;
  return ids.map((id) => {
    const previous = all.get(id) ?? getDrift(p, id);
    const name = cardName(p, "drift", id);
    if (previous.data.status !== "resolved") throw new TramaError(`Drift ${name} is still open: a recurring Drift follows a Drift already resolved`);
    const outcome = closedOutcome(previous, all);
    if (outcome === null && previous.data.resolution === "unified") throw new TramaError(`Drift ${name} was unified and its difference is not decided: a recurring Drift follows a Drift already resolved`);
    const decision = outcome?.decision ?? previous.data.resolution;
    if (decision !== "fix-code" && decision !== "proposal")
      throw new TramaError(`Drift ${name} was ${decision ?? "resolved without a decision"}: a recurring Drift follows one resolved by fixing the code or by a Proposal`);
    return previous.id;
  });
}

/** The live Tasks a new Drift with these references and this origin would block: what `trama drift new` with `dryRun` lists. Refuses references that do not resolve; an origin Task that no longer exists (deleted with Clear) blocks nothing. */
export function driftCandidates(p: Project, refs: string[], origin: string[]): Task[] {
  checkRefs(p, refs);
  return blockedByDrift(loadProject(p), listTasks(p), refs, origin);
}

/** A Drift checked and built but not written: what `newDrift` writes, and what `trama comparison move` checks for every card before it writes any. */
export interface PlannedDrift {
  title: string;
  data: DriftData;
  body: string;
}

export function planDrift(
  p: Project,
  input: { title: string; refs: string[]; proposal?: string; origin?: string; previous?: string; happens: string; should: string; options: DriftOption[]; where: string; job?: string; merge?: boolean },
): PlannedDrift {
  const origin = input.origin ? getTask(p, input.origin).id : null;
  const previous = previousOf(p, input.previous, origin);
  return planDriftWith(p, input, origin === null ? [] : [origin], previous);
}

function planDriftWith(
  p: Project,
  input: { title: string; refs: string[]; proposal?: string; happens: string; should: string; options: DriftOption[]; where: string; job?: string; merge?: boolean },
  origin: string[],
  previous: string[],
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
  const data: DriftData = { status: "open", resolution: null, refs: input.refs, proposal, task: null, origin, previous, unifies: [], differences: [], unifiedInto: null, merge: input.merge === true, option: null, note: null, resolvedBy: null, created: createdNow(), job: input.job?.trim() || null };
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
  input: { title: string; refs: string[]; proposal?: string; origin?: string; previous?: string; happens: string; should: string; options: DriftOption[]; where: string; announcement?: string; job?: string; merge?: boolean },
): Drift {
  return writeDrift(p, planDrift(p, input), input.announcement);
}

/**
 * The Drifts a unified Drift would merge, named by identity, short number or unique prefix, in creation order. Refuses,
 * naming every problem and writing nothing, when they are fewer than two, repeated, missing, not open, in a resolution
 * being written or open, or a unified Drift with a decided difference.
 */
export function unifiedBy(p: Project, named: string[]): Drift[] {
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
      if (drift.data.differences.some((d) => d.decision !== null)) problems.push(`Drift ${name} is a unified Drift with a decided difference: it can be unified again only while none of its differences is decided`);
    }
  }
  for (const id of repeated) problems.push(`Drift ${cardName(p, "drift", id)} is named more than once in unifies`);
  if (named.length < 2) problems.push("Unifying needs at least two Drifts in unifies");
  if (problems.length > 0) throw new TramaError(problems.join("\n"));
  return listDrifts(p).filter((d) => found.has(d.id));
}

/** What a gathered Drift gives to the unified Drift: one difference named by its Drift, with the Proposal attached to it. A unified Drift with differences gives each of its own. */
export interface ExpectedDifference {
  drift: string;
  proposal: string | null;
}

/** The differences the gathered Drifts give, in order: one per Drift, or one per difference of a unified Drift with differences. */
export const expectedDifferences = (unified: readonly Drift[]): ExpectedDifference[] =>
  unified.flatMap((d) => (hasDifferences(d) ? d.data.differences.map((x) => ({ drift: x.drift, proposal: x.proposal })) : [{ drift: d.id, proposal: d.data.proposal }]));

/** The origins of a unified Drift: those of the Drifts it merges, without repeats, in the order of `unified`. */
const unifiedOrigins = (unified: Drift[]): string[] => [...new Set(unified.flatMap((d) => d.data.origin))];

/**
 * The Drifts a unified Drift follows: those of the merged Drifts, then each Drift a fix Task that is one of its origins
 * fixes (only one resolved by fixing the code or with a Proposal), without repeats.
 */
function unifiedPrevious(p: Project, unified: Drift[], origin: string[]): string[] {
  const all = indexDrifts(listDrifts(p));
  const fixed = origin.flatMap((id) => {
    if (getTaskOrNull(p, id) === null) return [];
    try {
      return fixedDrifts(p, id, all).filter((drift) => {
        const found = all.get(drift);
        const decision = found === undefined ? null : (closedOutcome(found, all)?.decision ?? found.data.resolution);
        return decision === "fix-code" || decision === "proposal";
      });
    } catch {
      return [];
    }
  });
  return [...new Set([...unified.flatMap((d) => d.data.previous), ...fixed])];
}

/** The live Tasks a unified Drift with these `refs` (by default those of the gathered Drifts) would block: the origins of its merged Drifts and every Task concerning the same thing. Writes nothing. */
export function unifiedCandidates(p: Project, named: string[], refs?: string[]): Task[] {
  const unified = unifiedBy(p, named);
  const all = refs ?? [...new Set(unified.flatMap((d) => d.data.refs))];
  if (refs !== undefined) checkRefs(p, refs);
  return blockedByDrift(loadProject(p), listTasks(p), all, unifiedOrigins(unified));
}

/** One difference of a unified Drift as `trama drift new` takes it: `drift` and `linked` are permanent identities or short numbers. */
export interface DifferenceInput {
  drift: string;
  title: string;
  refs: string[];
  happens: string;
  should: string;
  where: string;
  options?: DriftOption[];
  proposal?: string;
  linked?: string[];
}

/** Headings a text of a difference cannot hold, because they would start another section, difference or the prepared question. */
const STRUCTURAL_HEADING = /^(## Difference \S+: |## Prepared question\s*$|### (What happens|What should happen|Where in the code|Fix options)\s*$)/m;

/**
 * The unified Drift checked and built, not written. Every problem is named, one line each, in a single refusal: a difference
 * missing, repeated, out of order or unknown, a difference that breaks the rules of a new Drift's sections and options or has neither
 * fix options nor `proposal`, a `linked` name that is not another difference, a `proposal` that is neither the one attached to its Drift (or difference)
 * nor a Draft or open one attached to no open Drift.
 */
function planUnifiedDrift(
  p: Project,
  input: { title: string; differences: DifferenceInput[]; job?: string; merge?: boolean },
  unified: Drift[],
  origin: string[],
  previous: string[],
): PlannedDrift {
  const problems: string[] = [];
  const nm = (id: string) => cardName(p, "drift", id);
  const expected = expectedDifferences(unified);
  const known = new Map(expected.map((e) => [e.drift, e]));
  const identity = (arg: string, what: string): string | null => {
    try {
      return getDrift(p, arg, true).id;
    } catch (error) {
      problems.push(`${what}: ${error instanceof TramaError ? error.message : `Drift ${arg} cannot be read`}`);
      return null;
    }
  };
  const given = input.differences.map((d, i) => identity(d.drift, `differences[${i}].drift`));
  const seen = new Set<string>();
  for (const id of given) {
    if (id === null) continue;
    if (!known.has(id)) problems.push(`Difference ${nm(id)} is not one of the differences the gathered Drifts give`);
    else if (seen.has(id)) problems.push(`Difference ${nm(id)} is given more than once`);
    seen.add(id);
  }
  for (const e of expected) if (!seen.has(e.drift)) problems.push(`differences has no entry for ${nm(e.drift)}: one entry for each difference the gathered Drifts give`);
  if (problems.length === 0 && given.some((id, i) => id !== expected[i]?.drift))
    problems.push(`differences must follow the creation order of the Drifts they come from: ${expected.map((e) => nm(e.drift)).join(", ")}`);

  const named = new Set<string>();
  const links = new Map<string, Set<string>>(expected.map((e) => [e.drift, new Set()]));
  const differences: Difference[] = [];
  const blocks: string[] = [];
  input.differences.forEach((d, i) => {
    const id = given[i] ?? null;
    const on = `Difference ${id === null ? `differences[${i}]` : nm(id)}`;
    const refuse = (message: string) => problems.push(`${on}: ${message}`);
    const title = d.title.trim();
    const happens = d.happens.trim();
    const should = d.should.trim();
    const where = d.where.trim();
    if (!title || /\n/.test(title)) refuse("needs a title in one line");
    if (d.refs.length === 0) refuse("must reference the Model element closest to it with `refs`");
    for (const ref of d.refs) {
      try {
        resolveProjectRef(loadProject(p), ref);
      } catch (error) {
        refuse(error instanceof TramaError ? error.message : `reference ${ref} does not resolve`);
      }
    }
    for (const [heading, text, what] of [[HAPPENS_HEADING, happens, "what the code does, in terms of behaviour"], [SHOULD_HEADING, should, "what the Model or the Requirement says"], [WHERE_HEADING, where, "the files and code elements where the difference was seen in the code"]] as const) {
      if (!text) refuse(`needs its "${heading}" text: ${what}`);
      else if (STRUCTURAL_HEADING.test(text)) refuse(`the "${heading}" text cannot contain the headings of the sections of a difference`);
    }
    let options: DriftOption[] = [];
    if ((d.options ?? []).length > 0) {
      try {
        options = checkOptions(d.options as DriftOption[], true);
      } catch (error) {
        refuse(error instanceof TramaError ? error.message : "its fix options are not valid");
      }
    }
    let proposal: string | null = null;
    const held = id === null ? null : (known.get(id)?.proposal ?? null);
    if (d.proposal !== undefined) {
      try {
        const attached = getProposal(p, d.proposal, true);
        if (attached.id !== held) requireAttachable(p, attached);
        if (named.has(attached.id)) refuse(`Proposal ${cardName(p, "proposal", attached.id)} is the proposal of another difference too`);
        named.add(attached.id);
        proposal = attached.id;
      } catch (error) {
        refuse(error instanceof TramaError ? error.message : `proposal ${d.proposal} cannot be read`);
      }
    } else if (held !== null) {
      // Without a new Proposal in its place, the one attached to the gathered Drift stays, held by the difference.
      if (named.has(held)) refuse(`Proposal ${cardName(p, "proposal", held)} is the proposal of another difference too`);
      named.add(held);
      proposal = held;
    }
    if ((d.options ?? []).length === 0 && proposal === null && d.proposal === undefined) refuse("has no fix options and no attached Proposal: give two to five fix options, or `proposal` with the Draft that fixes the Model or the Requirements");
    for (const [j, arg] of (d.linked ?? []).entries()) {
      const other = identity(arg, `${on}: linked[${j}]`);
      if (other === null) continue;
      if (other === id || !known.has(other)) refuse(`is linked to ${nm(other)}, which is not another difference of this Drift`);
      else if (id !== null) {
        links.get(id)?.add(other);
        links.get(other)?.add(id);
      }
    }
    if (id === null) return;
    differences.push({ drift: id, refs: d.refs, proposal, linked: [], decision: null, option: null, note: null, task: null, resolvedBy: null });
    blocks.push(
      [
        `## Difference ${id}: ${title}`,
        `### ${HAPPENS_HEADING}\n\n${happens}`,
        `### ${SHOULD_HEADING}\n\n${should}`,
        `### ${WHERE_HEADING}\n\n${where}`,
        ...(options.length === 0 ? [] : [`### ${OPTIONS_HEADING}\n\n${options.map((o) => `#### ${o.title}\n\n${o.text}`).join("\n\n")}`]),
      ].join("\n\n"),
    );
  });
  if (problems.length > 0) throw new TramaError(problems.join("\n"));
  for (const difference of differences) difference.linked = differences.map((d) => d.drift).filter((id) => links.get(difference.drift)?.has(id));
  const refs = [...new Set(differences.flatMap((d) => d.refs))];
  const data: DriftData = { status: "open", resolution: null, refs, proposal: null, task: null, origin, previous, unifies: unified.map((d) => d.id), differences, unifiedInto: null, merge: input.merge === true, option: null, note: null, resolvedBy: null, created: createdNow(), job: input.job?.trim() || null };
  return { title: input.title, data, body: blocks.join("\n\n") };
}

/**
 * Files one Drift that merges the open Drifts named in `unifies`, with one difference for each, and closes them in the same step:
 * each becomes resolved as `unified` into the new Drift, keeping its fields, and loses its prepared question's validity. A Proposal
 * attached to a merged Drift stays attached, held by its difference, unless the agent attaches a new Proposal to that difference in
 * its place: the replaced one is then discarded without feedback. Everything is checked first; if a write fails the files already
 * written are restored.
 */
export function newUnifiedDrift(
  p: Project,
  input: { unifies: string[]; title: string; differences: DifferenceInput[]; announcement?: string; job?: string; merge?: boolean },
): { drift: Drift; unified: Drift[] } {
  const unified = unifiedBy(p, input.unifies);
  const origin = unifiedOrigins(unified);
  const plan = planUnifiedDrift(p, { ...input, merge: input.merge === true || unified.some((d) => d.data.merge) }, unified, origin, unifiedPrevious(p, unified, origin));
  const kept = new Set(plan.data.differences.flatMap((d) => (d.proposal === null ? [] : [d.proposal])));
  const attached = [...new Set(expectedDifferences(unified).flatMap((e) => (e.proposal === null || kept.has(e.proposal) ? [] : [e.proposal])))];
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

/**
 * The Proposal a developer-side command may attach to one open difference of an open unified Drift, when that difference has none: a Draft or open one
 * that no open Drift or difference holds. Refuses otherwise, saying why; writes nothing.
 */
export function checkDifferenceAttachment(p: Project, drift: Drift, difference: string, proposalId: string): Proposal {
  const found = differenceOf(drift, difference);
  if (drift.data.status !== "open") throw new TramaError(`Drift ${cardName(p, "drift", drift.id)} is already resolved: a Proposal is attached only to an open Drift`);
  if (found === null) throw new TramaError(`${cardName(p, "drift", difference)} is not a difference of Drift ${cardName(p, "drift", drift.id)}`);
  if (found.decision !== null) throw new TramaError(`The difference of ${driftLabel(p, drift, difference)} is already decided: a Proposal is attached only to an open difference`);
  if (found.proposal !== null) throw new TramaError(`${driftLabel(p, drift, difference)} already has the attached Proposal ${cardName(p, "proposal", found.proposal)}`);
  const proposal = getProposal(p, proposalId, true);
  requireAttachable(p, proposal);
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

/** A Drift for a message, or its difference `difference`: `Drift D3`, or `Drift D3 (difference "Title")`. */
function driftLabel(p: Project, drift: Drift, difference?: string): string {
  const name = `Drift ${cardName(p, "drift", drift.id)}`;
  return difference === undefined ? name : `${name} (difference "${differenceTitle(drift, difference)}")`;
}

/** The sections of a fix Task for a Drift, or for its difference `difference`: both sides, then the chosen option and the note, then where in the code. A Drift written before the sections existed keeps its free text. */
function fixSections(drift: Drift, option: DriftOption | null, note: string | null, heading: string, difference?: string): string[] {
  const sides = driftSides(drift, difference);
  const chosen = option ? [`${heading} Chosen option\n\n**${option.title}**\n\n${option.text}`] : [];
  const noted = note ? [`${heading} Note\n\n${note}`] : [];
  if (!sides) return [driftBody(drift), ...chosen, ...noted];
  const where = sides.where ? [`${heading} ${WHERE_HEADING}\n\n${sides.where}`] : [];
  return [`${heading} ${HAPPENS_HEADING}\n\n${sides.happens}`, `${heading} ${SHOULD_HEADING}\n\n${sides.should}`, ...chosen, ...noted, ...where];
}

/** The body of the Task that fixes the code: both sides, then the chosen option and the note, then where in the code. */
const fixTaskBody = (drift: Drift, option: DriftOption | null, note: string | null): string => fixSections(drift, option, note, "##").join("\n\n");

/** The body of the Task that fixes the code of one difference of a unified Drift, or, for linked differences fixed together, difference by difference: a block titled with the difference holds its two sides, the chosen option, the note and where in the code. */
function fixDifferencesBody(drift: Drift, parts: { difference: string; option: DriftOption | null; note: string | null }[]): string {
  const [only] = parts;
  if (parts.length === 1 && only) return fixSections(drift, only.option, only.note, "##", only.difference).join("\n\n");
  return parts.map((part) => [`## ${differenceTitle(drift, part.difference)}`, ...fixSections(drift, part.option, part.note, "###", part.difference)].join("\n\n")).join("\n\n");
}

/** The option the developer chose for a Drift (or a difference of it) that has options, or none for one that has none. Refuses a missing or unknown number, and an option for one without options. */
export function chosenOption(p: Project, drift: Drift, option: number | undefined, difference?: string): DriftOption | null {
  const options = driftOptions(drift, difference);
  const label = driftLabel(p, drift, difference);
  if (options.length === 0) {
    if (option !== undefined) throw new TramaError(`${label} has no fix options: fix its code without choosing one`);
    return null;
  }
  const chosen = option === undefined || !Number.isInteger(option) ? undefined : options[option - 1];
  if (!chosen) throw new TramaError(`An option must be chosen to fix the code of ${label}: give its number, from 1 to ${options.length}`);
  return chosen;
}

/** Closes every open difference of `drift` without changes, remembering that the code was kept; the Drift is then Differences decided. Nothing is saved. */
function dismissOpenDifferences(drift: Drift): void {
  for (const difference of openDifferences(drift)) {
    difference.decision = "dismissed";
    difference.proposal = null;
  }
  drift.data.resolution = "differences";
  drift.data.status = "resolved";
}

/**
 * The developer closes an open Drift from the panel with no change: the code is right and nothing changes. An attached Proposal,
 * a Draft or already handed over, is discarded with it, with no feedback; for a unified Drift with differences every open difference
 * is closed that way, with the Proposals attached to them, and the decided ones keep their outcome.
 * Like `resolveDrift` with `dismiss`, but the attached Proposal is not refused.
 */
export function dismissDrift(p: Project, id: string): Drift {
  const drift = getDrift(p, id);
  requireOpen(p, drift);
  const holding = resolutionHolding(p, drift.id);
  if (holding) throw new TramaError(`Drift ${cardName(p, "drift", drift.id)} is part of resolution ${cardName(p, "proposal", holding.id)}: decide it there`);
  if (hasDifferences(drift)) {
    for (const difference of openDifferences(drift)) if (difference.proposal !== null) discardAttachedProposal(p, difference.proposal);
    dismissOpenDifferences(drift);
    saveItem(drift.path, drift.data, drift.body);
    return drift;
  }
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
 * A unified Drift with differences is decided only by dismissing it, which closes every open difference without changes
 * and is refused when one of them has an attached Proposal; fixing the code or accepting a Proposal says to decide with Resolve.
 * Anything refused leaves the Drift open and changes nothing.
 */
export function resolveDrift(p: Project, id: string, how: "fix-code" | "accept-proposal" | "dismiss", skillsDirs: string[] = [], choice: FixChoice = {}): Drift {
  const drift = getDrift(p, id);
  requireOpen(p, drift);
  // A note is refused with accepting or dismissing even when empty: the check looks at the note as given, before it is cleaned.
  const note = choice.note?.trim() || null;
  if (how !== "fix-code" && (choice.option !== undefined || choice.note !== undefined))
    throw new TramaError(`Drift ${cardName(p, "drift", drift.id)}: ${choice.option !== undefined ? "an option" : "a note"} only goes with fixing the code, not with ${how === "dismiss" ? "dismissing" : "accepting the Proposal"}`);
  if (hasDifferences(drift)) {
    if (how !== "dismiss") throw new TramaError(`Drift ${cardName(p, "drift", drift.id)} has differences: decide them with Resolve`);
    const attached = openDifferences(drift).find((d) => d.proposal !== null);
    if (attached) throw new TramaError(`${driftLabel(p, drift, attached.drift)} has an attached Proposal (${cardName(p, "proposal", attached.proposal as string)}): decide the differences with Resolve, or close the Drift from the panel`);
    dismissOpenDifferences(drift);
    saveItem(drift.path, drift.data, drift.body);
    return drift;
  }
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
 * Why the code of a Drift, or of its difference `difference`, cannot be fixed, or null: it points to the Model but none of its Model elements is left,
 * not even a container, so the fix Task would have nothing to point at. The Drift can then only be dismissed or accepted.
 */
export function fixCodeRefusal(p: Project, drift: Drift, project: ProjectModel = loadProject(p), difference?: string): string | null {
  const isModel = (r: string) => parseRequirementRef(r) === null;
  const found = difference === undefined ? null : differenceOf(drift, difference);
  const refs = found?.refs ?? drift.data.refs;
  if (!refs.some(isModel) || liveRefs(p, refs, project).some(isModel)) return null;
  const label = driftLabel(p, drift, difference);
  if (difference !== undefined)
    return `The Model elements of ${label} no longer exist: its code cannot be fixed, the difference can only be closed by ${found?.proposal == null ? "closing it without changes" : "adopting its attached Proposal"}`;
  const close = drift.data.proposal === null ? "dismissing it (`drift move <id> dismissed`)" : "accepting its attached Proposal (`drift move <id> proposal-accepted`)";
  return `The Model elements of ${label} no longer exist: its code cannot be fixed, the Drift can only be closed by ${close}`;
}

/** Each Task in `origins` that is not Done goes back to To do and, until the fix Task is Done, is blocked (see computeBlocked). */
function sendOriginsBack(p: Project, origins: readonly string[]): void {
  for (const id of origins) {
    const origin = getTaskOrNull(p, id);
    if (origin === null) continue;
    if (origin.data.column === "done") continue;
    origin.data.column = "todo";
    origin.data.agent = false;
    origin.data.holder = null;
    saveItem(origin.path, origin.data, origin.body);
    clearProgress(p, origin.id);
  }
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
  sendOriginsBack(p, drift.data.origin);
}

/** Refuses a Drift that is not open: a unified one says where it went, because it was never decided there. */
function requireOpen(p: Project, drift: Drift): void {
  const name = cardName(p, "drift", drift.id);
  if (drift.data.resolution === "unified") {
    const into = cardName(p, "drift", drift.data.unifiedInto as string);
    const decided = closedOutcome(drift, indexDrifts(listDrifts(p))) !== null;
    throw new TramaError(`Drift ${name} was unified into Drift ${into}: ${decided ? "its difference is already decided there" : "it was not decided, decide that Drift instead"}`);
  }
  if (drift.data.status !== "open") throw new TramaError(`Drift ${name} is already resolved`);
}

/** Rejects the open Proposal attached to a Drift with `why` as feedback, discards a Draft, leaves a decided one. */
function setAsideAttached(p: Project, drift: Drift, why: string, proposalId: string | null = drift.data.proposal): void {
  const attached = proposalId ? getProposal(p, proposalId) : null;
  if (attached?.data.status === "open") rejectProposal(p, attached.id, `Drift ${drift.id} ${why}`);
  else if (attached?.data.status === "draft") discardAttachedProposal(p, attached.id);
}

/** What approving a resolution did to its listed Drifts: the decision applied, the fix Task created, or `skipped` when already resolved. `difference` is the one a unified Drift's entry decided, null for any other. */
export interface DriftOutcome {
  drift: string;
  difference: string | null;
  decision: DriftDecisionKind;
  task: string | null;
  skipped: boolean;
}

/** Resolves, in one step, every still-open Drift listed by the approved resolution `proposal` with its recorded decision, and every still-open difference an entry of it decides. */
export function resolveListedDrifts(p: Project, proposal: Proposal): DriftOutcome[] {
  const entries = proposal.data.drifts;
  const outcomes: DriftOutcome[] = [];
  const done = new Set<number>();
  entries.forEach((entry, i) => {
    if (done.has(i)) return;
    const { drift: id, decision, option, note } = entry;
    const drift = getDrift(p, id);
    if (entry.difference === undefined) {
      // A unified Drift with differences is decided only difference by difference: an entry without one decides nothing.
      if (drift.data.status !== "open" || hasDifferences(drift)) {
        outcomes[i] = { drift: id, difference: null, decision, task: null, skipped: true };
        return;
      }
      if (decision === "fix-code") fixCode(p, drift, option, note?.trim() || null);
      else drift.data.resolution = decision;
      setAsideAttached(p, drift, `resolved by Proposal ${proposal.id}`);
      drift.data.proposal = null;
      drift.data.status = "resolved";
      drift.data.resolvedBy = proposal.id;
      saveItem(drift.path, drift.data, drift.body);
      outcomes[i] = { drift: id, difference: null, decision, task: drift.data.task, skipped: false };
      return;
    }
    const at = entries.flatMap((e, j) => (e.drift === id && e.difference !== undefined ? [j] : []));
    for (const j of at) done.add(j);
    const decided = decideDifferences(p, drift, at.map((j) => entries[j] as DriftDecision), proposal);
    at.forEach((j, k) => {
      outcomes[j] = decided[k] as DriftOutcome;
    });
  });
  return outcomes;
}

/**
 * The groups of fix-code differences that share one fix Task: `linked` differences, directly or through other linked ones among
 * `fixing`, so the relation is restricted to them. Each group lists its differences in the order of the Drift, the groups in the order of their first.
 */
function linkedGroups(drift: Drift, fixing: readonly string[]): string[][] {
  const inOrder = drift.data.differences.map((d) => d.drift).filter((id) => fixing.includes(id));
  const groups: string[][] = [];
  for (const id of inOrder) {
    const joined = groups.filter((g) => g.some((other) => differenceOf(drift, id)?.linked.includes(other) || differenceOf(drift, other)?.linked.includes(id)));
    const merged = [id, ...joined.flat()];
    for (const g of joined) groups.splice(groups.indexOf(g), 1);
    groups.push(inOrder.filter((x) => merged.includes(x)));
  }
  return groups.sort((a, b) => inOrder.indexOf(a[0] as string) - inOrder.indexOf(b[0] as string));
}

/**
 * Gives each listed difference of a unified Drift that is still open the decision of its entry, under the approved resolution `proposal`.
 * `fix-code` differences get a fix Task each, except the linked ones fixed together, which share one: refs the union of theirs, a body
 * with each difference's two sides, where in the code, option and note, Technical when every ref is a Requirement, in the design of the
 * origins when they all share one. The origins of the differences fixed in the code go back to To do. The Proposal attached to every
 * decided difference is set aside. The Drift becomes Differences decided in the same write that decides its last open difference.
 */
function decideDifferences(p: Project, drift: Drift, entries: DriftDecision[], proposal: Proposal): DriftOutcome[] {
  const skipped = (e: DriftDecision): DriftOutcome => ({ drift: e.drift, difference: e.difference ?? null, decision: e.decision, task: null, skipped: true });
  if (drift.data.status !== "open") return entries.map(skipped);
  const live = entries.map((e) => {
    const difference = differenceOf(drift, e.difference as string);
    return difference !== null && difference.decision === null ? e : null;
  });
  const deciding = live.flatMap((e) => (e === null ? [] : [e]));
  const fixing = deciding.filter((e) => e.decision === "fix-code");
  const project = loadProject(p);
  const all = indexDrifts(listDrifts(p));
  // Everything is checked before the first Task is written.
  const chosen = new Map<string, DriftOption | null>();
  for (const e of fixing) {
    const difference = e.difference as string;
    chosen.set(difference, chosenOption(p, drift, e.option, difference));
    const refusal = fixCodeRefusal(p, drift, project, difference);
    if (refusal) throw new TramaError(refusal);
  }
  const entryOf = (difference: string) => fixing.find((e) => e.difference === difference) as DriftDecision;
  const originsOf = (difference: string) => all.get(difference)?.data.origin ?? [];
  const taskOf = new Map<string, string>();
  for (const group of linkedGroups(drift, fixing.map((e) => e.difference as string))) {
    const members = group.map((id) => differenceOf(drift, id) as Difference);
    const origins = [...new Set(group.flatMap(originsOf))];
    // A reference that no longer resolves stands for its nearest container still there.
    const refs = [...new Set(members.flatMap((d) => liveRefs(p, d.refs, project)))];
    // A fix of Requirements only changes no behaviour, so its Task is technical.
    const touchesModel = members.some((d) => d.refs.some((r) => parseRequirementRef(r) === null));
    const design = originDesign(p, origins);
    const plan = planTask(p, {
      title: `Fix code to match the ${touchesModel ? "Model" : "Requirements"}: ${group.map((id) => differenceTitle(drift, id)).join(" + ")}`,
      refs,
      technical: !touchesModel,
      ...(design ? { proposal: design } : {}),
      body: fixDifferencesBody(drift, group.map((id) => ({ difference: id, option: chosen.get(id) ?? null, note: entryOf(id).note?.trim() || null }))),
    });
    plan.data.drift = drift.id;
    const task = writeTask(p, plan);
    for (const id of group) taskOf.set(id, task.id);
    sendOriginsBack(p, origins);
  }
  for (const e of deciding) {
    const difference = differenceOf(drift, e.difference as string) as Difference;
    difference.decision = e.decision;
    difference.resolvedBy = proposal.id;
    if (e.decision === "fix-code") {
      difference.option = chosen.get(difference.drift) ? (e.option as number) : null;
      difference.note = e.note?.trim() || null;
      difference.task = taskOf.get(difference.drift) ?? null;
    }
    setAsideAttached(p, drift, `resolved by Proposal ${proposal.id}`, difference.proposal);
    difference.proposal = null;
  }
  if (drift.data.differences.every((d) => d.decision !== null)) {
    drift.data.resolution = "differences";
    drift.data.status = "resolved";
  }
  saveItem(drift.path, drift.data, drift.body);
  return entries.map((e, i) => (live[i] === null ? skipped(e) : { drift: e.drift, difference: e.difference ?? null, decision: e.decision, task: differenceOf(drift, e.difference as string)?.task ?? null, skipped: false }));
}
