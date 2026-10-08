import { join } from "node:path";
import { type AgentOrigin, deliverCard, removeReworkOf } from "./announcements";
import { type Blocker, computeBlocked, concernSameThing, refusalFor } from "./blocking";
import { TramaError } from "./errors";
import { approveProposal, discardProposal, getProposal, health, type Proposal, rejectProposal } from "./proposals";
import { loadProject, parseRequirementRef, resolveProjectRef } from "./requirements";
import { boolField, createdField, enumField, enumOrNull, idField, instantField, positiveIntOrNull, type Raw, stringList, textOrNull } from "./schema";
import { cardName, identityOfShortNumber, syncShortNumbers } from "./short-numbers";
import {
  compareByCreation,
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
   * Null when free, and when taken before the holder was recorded or by an agent of unknown origin: any end releases it.
   */
  holder: string | null;
  /** When the Task was created, UTC ISO 8601. Absent on numbered Tasks written before the field existed. */
  created: string | null;
  /** When the Task arrived in Done from another column, UTC ISO 8601; absent outside Done and on Tasks that reached Done before the field existed. */
  finished: string | null;
}

export type DriftResolution = "fix-code" | "proposal" | "dismissed";

interface DriftData {
  status: "open" | "resolved";
  resolution: DriftResolution | null;
  refs: string[];
  proposal: string | null;
  task: string | null;
  /** The Task the agent was implementing when it filed the Drift; none for a Scan, and absent in Drifts written before the field existed. */
  origin: string | null;
  /** Number, counted from 1 in the order of the Fix options section, of the option chosen when the code was fixed; none otherwise and in Drifts without options. */
  option: number | null;
  /** The developer's note kept with the choice, when there was one. */
  note: string | null;
  /** When the Drift was created, UTC ISO 8601. Absent on numbered Drifts written before the field existed. */
  created: string | null;
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
    ...agentField(raw, where),
    created: createdField(raw, where),
    finished: instantField(raw, "finished", where),
  };
  checkTaskRefs(data.technical, data.refs, `${where}: `);
  return data;
}

/** The `agent` field: false, true, or the holder that took the Task (a terminal ID or `cursor`). */
function agentField(raw: Raw, where: string): { agent: boolean; holder: string | null } {
  const v = raw["agent"];
  if (typeof v === "string" && v.trim() !== "") return { agent: true, holder: v.trim() };
  return { agent: boolField(raw, "agent", false, where), holder: null };
}

/** The holder recorded for a Task taken from `origin`: the terminal wins over the chat, as in `originFromEnv`. */
const holderOf = (origin: AgentOrigin): string | null => origin.terminal ?? origin.chat ?? null;

function parseDrift(raw: Raw, where: string): DriftData {
  return {
    status: enumField(raw, "status", DRIFT_STATUSES, "open", where),
    resolution: enumOrNull(raw, "resolution", RESOLUTIONS, where),
    refs: stringList(raw, "refs", where),
    proposal: idField(raw, "proposal", where),
    task: idField(raw, "task", where),
    origin: idField(raw, "origin", where),
    option: positiveIntOrNull(raw, "option", where),
    note: textOrNull(raw, "note", where),
    created: createdField(raw, where),
  };
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

/** A Technical Task changes no behaviour, so it references no Model element, only Requirements if any; any other Task references at least one Model element. */
function checkTaskRefs(technical: boolean, refs: string[], where = "") {
  const modelRefs = refs.filter((r) => parseRequirementRef(r) === null);
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

export function newTask(
  p: Project,
  input: { title: string; refs: string[]; technical: boolean; drift?: string; proposal?: string; body?: string },
): Task {
  checkTaskRefs(input.technical, input.refs);
  checkRefs(p, input.refs);
  const drift = input.drift ? getDrift(p, input.drift).id : null;
  // The Proposal must exist, but a Technical Task is never part of a design, so it keeps no link to it,
  // unless it fixes a Drift: then it belongs to the design of the Task the Drift came from.
  const linked = input.proposal ? getProposal(p, input.proposal).id : null;
  const proposal = input.technical && drift === null ? null : linked;
  const data: TaskData = { column: "todo", technical: input.technical, refs: input.refs, drift, proposal, agent: false, holder: null, created: createdNow(), finished: null };
  return create(tasksDir(p), input.title, data, input.body ?? "", "Task");
}

/** The blocked Tasks and why, by Task ID, worked out from the Drifts and Tasks as they are now. */
export const blockedTasks = (p: Project): Map<string, Blocker[]> => computeBlocked(loadProject(p), listTasks(p), listDrifts(p));

/** Who moves a Task: the agent (the command line run in the terminal Trama started for it) or the developer. */
export type Mover = "agent" | "developer";

/**
 * Moves a Task. The agent takes it by moving it to In progress (and keeps it when it does so again); moving it to
 * To do or Done clears the mark. The developer never takes a Task and cannot move one the agent has taken.
 * The agent cannot start a blocked Task, from any column, nor keep one In progress; nothing changes then.
 */
export function moveTask(p: Project, id: string, column: string, by: Mover, origin: AgentOrigin = {}): Task {
  if (!COLUMNS.includes(column as Column))
    throw new TramaError(`Unknown column "${column}" (expected ${COLUMNS.join(", ")})`);
  const task = getTask(p, id);
  if (by === "developer" && task.data.agent) {
    const name = cardName(p, "task", task.id);
    throw new TramaError(`The agent is working on Task ${name}, so it cannot be moved. Take it back first with "trama task take-back ${name}".`);
  }
  if (by === "agent" && column === "doing") {
    // Judged as if the Task had already left Done: a Done Task is never blocked, but one taken from Done may be.
    const tasks = listTasks(p).map((t) => (t.id === task.id ? { ...t, data: { ...t.data, column: "doing" as Column } } : t));
    const blockers = computeBlocked(loadProject(p), tasks, listDrifts(p)).get(task.id);
    if (blockers) throw new TramaError(refusalFor(task, blockers, syncShortNumbers(p)));
  }
  // Arriving in Done from another column records the instant; Done to Done keeps it; leaving Done forgets it.
  if (column !== "done") task.data.finished = null;
  else if (task.data.column !== "done") task.data.finished = createdNow();
  task.data.column = column as Column;
  if (by === "agent") {
    // Moving a taken Task to In progress again keeps the mark and who holds it.
    task.data.holder = column !== "doing" ? null : task.data.agent ? task.data.holder : holderOf(origin);
    task.data.agent = column === "doing";
  }
  saveItem(task.path, task.data, task.body);
  return task;
}

/** Most Tasks a parallel run implements together. */
const BATCH_MAX = 4;

/** What a run can take: the next runnable Task, the group of a parallel run, and the Tasks in To do that wait, each with what blocks it. */
export interface RunQueue {
  next: Task | null;
  /**
   * The group of a parallel run, starting with `next`: each later runnable Task, oldest first, that concerns
   * the same thing as none already chosen, up to `BATCH_MAX`. Empty when no Task is runnable.
   */
  batch: Task[];
  /** Every Task in To do within the scope that is blocked, in order. */
  waiting: { task: Task; blockers: Blocker[] }[];
}

/**
 * The next runnable Task: the oldest Task in To do that is not blocked, worked out from the Tasks and Drifts as
 * they are now. With a Proposal it only considers the Tasks linked to it; the Proposal must exist.
 */
export function nextTask(p: Project, proposal?: string): RunQueue {
  const scope = proposal === undefined ? null : getProposal(p, proposal).id;
  const project = loadProject(p);
  const tasks = listTasks(p);
  const blocked = computeBlocked(project, tasks, listDrifts(p));
  const todo = tasks.filter((t) => t.data.column === "todo" && (scope === null || t.data.proposal === scope));
  const batch: Task[] = [];
  for (const task of todo) {
    if (batch.length === BATCH_MAX) break;
    if (!blocked.has(task.id) && !batch.some((chosen) => concernSameThing(project, chosen.data.refs, task.data.refs))) batch.push(task);
  }
  return {
    next: batch[0] ?? null,
    batch,
    waiting: todo.flatMap((task) => (blocked.has(task.id) ? [{ task, blockers: blocked.get(task.id) as Blocker[] }] : [])),
  };
}

/** The developer's decision to get a Task back from the agent: the mark is cleared and the Task stays In progress. */
export function takeBackTask(p: Project, id: string): Task {
  const task = getTask(p, id);
  if (!task.data.agent) throw new TramaError(`The agent has not taken Task ${cardName(p, "task", task.id)}`);
  task.data.agent = false;
  task.data.holder = null;
  saveItem(task.path, task.data, task.body);
  return task;
}

/**
 * The agent's command ended in `origin` (an agent terminal or Cursor's chat), so that agent is no longer working: the
 * Tasks it took are released and go back to To do. Tasks taken without a recorded holder count as any origin's.
 */
export function releaseTasks(p: Project, origin: AgentOrigin): Task[] {
  const holder = holderOf(origin);
  const released = listTasks(p).filter((t) => t.data.agent && (t.data.holder === null || t.data.holder === holder));
  for (const task of released) {
    task.data.agent = false;
    task.data.holder = null;
    task.data.column = "todo";
    saveItem(task.path, task.data, task.body);
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
  if (drift) throw new TramaError(`Proposal ${cardName(p, "proposal", proposalId)} is attached to Drift ${cardName(p, "drift", drift.id)}: decide on the Drift with trama drift resolve`);
}

/** The Drift `id` names. `asArgument` applies the command rules: digits cite only a numbered Drift, and a short number (`D3`) cites the live Drift that has it. */
export function getDrift(p: Project, id: string, asArgument = false): Drift {
  const cited = asArgument ? identityOfShortNumber(p, "drift", id) : null;
  return load(driftsDir(p), findCard(driftsDir(p), cited ?? id, "Drift", "file", asArgument && cited === null), parseDrift);
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

/** The body split at the known `## ` headings; any other line, `## ` ones included, belongs to the section it is in. */
function driftSections(drift: Drift): Map<string, string[]> {
  const sections = new Map<string, string[]>();
  let current: string[] | null = null;
  for (const line of drift.body.split("\n")) {
    const heading = /^## (.+?)\s*$/.exec(line)?.[1];
    if (heading === HAPPENS_HEADING || heading === SHOULD_HEADING || heading === OPTIONS_HEADING || heading === WHERE_HEADING) {
      current = [];
      sections.set(heading, current);
    } else current?.push(line);
  }
  return sections;
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

export function newDrift(
  p: Project,
  input: { title: string; refs: string[]; proposal?: string; origin?: string; happens: string; should: string; options: DriftOption[]; where?: string; announcement?: string },
): Drift {
  if (input.refs.length === 0) throw new TramaError("A Drift must reference the Model element closest to it with --ref");
  const happens = input.happens.trim();
  const should = input.should.trim();
  const where = input.where?.trim();
  if (!happens) throw new TramaError(`A Drift needs its "${HAPPENS_HEADING}" text: what the code does, in terms of behaviour`);
  if (!should) throw new TramaError(`A Drift needs its "${SHOULD_HEADING}" text: what the Model or the Requirement says`);
  const options = checkOptions(input.options);
  if (where === "") throw new TramaError(`The "${WHERE_HEADING}" text is optional, but when given it needs text: the files where the difference was seen`);
  checkRefs(p, input.refs);
  const attached = input.proposal ? getProposal(p, input.proposal) : null;
  if (attached) requireAttachable(p, attached);
  const proposal = attached?.id ?? null;
  const origin = input.origin ? getTask(p, input.origin).id : null;
  const data: DriftData = { status: "open", resolution: null, refs: input.refs, proposal, task: null, origin, option: null, note: null, created: createdNow() };
  const sections = [
    `## ${HAPPENS_HEADING}\n\n${happens}`,
    `## ${SHOULD_HEADING}\n\n${should}`,
    `## ${OPTIONS_HEADING}\n\n${options.map((o) => `### ${o.title}\n\n${o.text}`).join("\n\n")}`,
    ...(where ? [`## ${WHERE_HEADING}\n\n${where}`] : []),
  ];
  const drift = create(driftsDir(p), input.title, data, sections.join("\n\n"), "Drift");
  deliverCard(p, input.announcement, "drift");
  return drift;
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
  if (!sides) return [drift.body.replace(/^#\s+.+\n+/, "").trim(), ...chosen, ...noted].join("\n\n");
  const where = sides.where ? [`## ${WHERE_HEADING}\n\n${sides.where}`] : [];
  return [`## ${HAPPENS_HEADING}\n\n${sides.happens}`, `## ${SHOULD_HEADING}\n\n${sides.should}`, ...chosen, ...noted, ...where].join("\n\n");
}

/** The option the developer chose for a Drift that has options, or none for one that has none. Refuses a missing or unknown number, and an option for a Drift without options. */
function chosenOption(p: Project, drift: Drift, option: number | undefined): DriftOption | null {
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
 * The developer's decision on an open Drift. Fixing the code needs the number of a fix option when the Drift has
 * options, and takes an optional note; keeping what happens (accepting the Proposal, dismissing) takes neither.
 * Anything refused leaves the Drift open and changes nothing.
 */
export function resolveDrift(p: Project, id: string, how: "fix-code" | "accept-proposal" | "dismiss", skillsDirs: string[] = [], choice: FixChoice = {}): Drift {
  const drift = getDrift(p, id);
  if (drift.data.status !== "open") throw new TramaError(`Drift ${cardName(p, "drift", drift.id)} is already resolved`);
  const note = choice.note?.trim() || null;
  if (how !== "fix-code" && (choice.option !== undefined || note !== null))
    throw new TramaError(`Drift ${cardName(p, "drift", drift.id)}: ${choice.option !== undefined ? "an option" : "a note"} only goes with fixing the code, not with ${how === "dismiss" ? "dismissing" : "accepting the Proposal"}`);
  if (how === "fix-code") {
    const option = chosenOption(p, drift, choice.option);
    // A Drift that only contradicts Requirements changes no behaviour, so its Task is technical.
    const touchesModel = drift.data.refs.some((r) => parseRequirementRef(r) === null);
    // The fix belongs to the design of the Task the Drift came from, if any, even when it is technical.
    const origin = drift.data.origin ? getTask(p, drift.data.origin) : null;
    const design = origin?.data.proposal;
    const task = newTask(p, {
      title: `Fix code to match the ${touchesModel ? "Model" : "Requirements"}: ${drift.title}`,
      refs: drift.data.refs,
      technical: !touchesModel,
      drift: drift.id,
      ...(design ? { proposal: design } : {}),
      body: fixTaskBody(drift, option, note),
    });
    removeReworkOf(p, drift.id);
    drift.data.task = task.id;
    drift.data.resolution = "fix-code";
    drift.data.option = option ? (choice.option as number) : null;
    drift.data.note = note;
    // The Task the Drift came from goes back to To do and, until the fix Task is Done, is blocked (see computeBlocked).
    if (origin && origin.data.column !== "done") {
      origin.data.column = "todo";
      origin.data.agent = false;
      origin.data.holder = null;
      saveItem(origin.path, origin.data, origin.body);
    }
    // The attached Proposal is set aside with the Drift: an open one is rejected, a Draft discarded, a decided one stays.
    const attached = drift.data.proposal ? getProposal(p, drift.data.proposal) : null;
    if (attached?.data.status === "open") rejectProposal(p, attached.id, `Drift ${drift.id} resolved by fixing the code`);
    else if (attached?.data.status === "draft") discardProposal(p, attached.id);
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

/** The open, stale Proposal attached to an open Drift: the only kind that can be reworked and replaced. Refuses otherwise, saying why. */
export function staleAttachedProposal(p: Project, drift: Drift): Proposal {
  if (drift.data.status !== "open") throw new TramaError(`Drift ${cardName(p, "drift", drift.id)} is already resolved`);
  if (!drift.data.proposal) throw new TramaError(`Drift ${cardName(p, "drift", drift.id)} has no attached Proposal to replace`);
  const old = getProposal(p, drift.data.proposal);
  if (old.data.status !== "open") throw new TramaError(`Proposal ${cardName(p, "proposal", old.id)} is ${old.data.status}: only an open, stale Proposal can be replaced`);
  if (health(p, old).stale.length === 0) throw new TramaError(`Proposal ${cardName(p, "proposal", old.id)} is not stale: only a stale Proposal can be replaced`);
  return old;
}

/**
 * The agent attaches a newer Proposal to an open Drift in place of the stale one attached to it. The old Proposal is
 * rejected at once, saying it was replaced; Proposals that require it stay blocked (see `requiredProposals`).
 */
export function replaceDriftProposal(p: Project, id: string, proposalId: string): Drift {
  const drift = getDrift(p, id);
  const old = staleAttachedProposal(p, drift);
  const replacement = getProposal(p, proposalId);
  if (replacement.id === old.id) throw new TramaError(`Proposal ${cardName(p, "proposal", old.id)} is the one already attached; name a newer one`);
  requireAttachable(p, replacement, drift.id);
  rejectProposal(p, old.id, `Replaced by Proposal ${replacement.id}`);
  drift.data.proposal = replacement.id;
  saveItem(drift.path, drift.data, drift.body);
  return drift;
}
