import { join } from "node:path";
import { deliverCard } from "./announcements";
import { type Blocker, computeBlocked, refusalFor } from "./blocking";
import { TramaError } from "./errors";
import { approveProposal, getProposal, health, type Proposal, rejectProposal } from "./proposals";
import { loadProject, parseRequirementRef, resolveProjectRef } from "./requirements";
import { boolField, enumField, enumOrNull, idField, positiveIntOrNull, type Raw, stringList, textOrNull } from "./schema";
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
  /** The Task the agent was implementing when it filed the Drift; none for a Scan, and absent in Drifts written before the field existed. */
  origin: string | null;
  /** Number, counted from 1 in the order of the Fix options section, of the option chosen when the code was fixed; none otherwise and in Drifts without options. */
  option: number | null;
  /** The developer's note kept with the choice, when there was one. */
  note: string | null;
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
    option: positiveIntOrNull(raw, "option", where),
    note: textOrNull(raw, "note", where),
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
  input: { title: string; refs: string[]; technical: boolean; drift?: string; proposal?: string; body?: string; announcement?: string },
): Task {
  checkTaskRefs(input.technical, input.refs);
  checkRefs(p, input.refs);
  const drift = input.drift ? getDrift(p, input.drift).id : null;
  // The Proposal must exist, but a Technical Task is never part of a design, so it keeps no link to it.
  const linked = input.proposal ? getProposal(p, input.proposal).id : null;
  const proposal = input.technical ? null : linked;
  const data: TaskData = { column: "todo", technical: input.technical, refs: input.refs, drift, proposal, agent: false };
  const task = create(tasksDir(p), input.title, data, input.body ?? "");
  deliverCard(p, input.announcement, "task");
  return task;
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
  const proposal = input.proposal ? getProposal(p, input.proposal).id : null;
  const origin = input.origin ? getTask(p, input.origin).id : null;
  const data: DriftData = { status: "open", resolution: null, refs: input.refs, proposal, task: null, origin, option: null, note: null };
  const sections = [
    `## ${HAPPENS_HEADING}\n\n${happens}`,
    `## ${SHOULD_HEADING}\n\n${should}`,
    `## ${OPTIONS_HEADING}\n\n${options.map((o) => `### ${o.title}\n\n${o.text}`).join("\n\n")}`,
    ...(where ? [`## ${WHERE_HEADING}\n\n${where}`] : []),
  ];
  const drift = create(driftsDir(p), input.title, data, sections.join("\n\n"));
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
function chosenOption(drift: Drift, option: number | undefined): DriftOption | null {
  const options = driftOptions(drift);
  if (options.length === 0) {
    if (option !== undefined) throw new TramaError(`Drift ${drift.id} has no fix options: fix its code without choosing one`);
    return null;
  }
  const chosen = option === undefined || !Number.isInteger(option) ? undefined : options[option - 1];
  if (!chosen) throw new TramaError(`An option must be chosen to fix the code of Drift ${drift.id}: give its number, from 1 to ${options.length}`);
  return chosen;
}

/**
 * The developer's decision on an open Drift. Fixing the code needs the number of a fix option when the Drift has
 * options, and takes an optional note; keeping what happens (accepting the Proposal, dismissing) takes neither.
 * Anything refused leaves the Drift open and changes nothing.
 */
export function resolveDrift(p: Project, id: string, how: "fix-code" | "accept-proposal" | "dismiss", skillsDirs: string[] = [], choice: FixChoice = {}): Drift {
  const drift = getDrift(p, id);
  if (drift.data.status !== "open") throw new TramaError(`Drift ${drift.id} is already resolved`);
  const note = choice.note?.trim() || null;
  if (how !== "fix-code" && (choice.option !== undefined || note !== null))
    throw new TramaError(`Drift ${drift.id}: ${choice.option !== undefined ? "an option" : "a note"} only goes with fixing the code, not with ${how === "dismiss" ? "dismissing" : "accepting the Proposal"}`);
  if (how === "fix-code") {
    const option = chosenOption(drift, choice.option);
    // A Drift that only contradicts Requirements changes no behaviour, so its Task is technical.
    const touchesModel = drift.data.refs.some((r) => parseRequirementRef(r) === null);
    const task = newTask(p, {
      title: `Fix code to match the ${touchesModel ? "Model" : "Requirements"}: ${drift.title}`,
      refs: drift.data.refs,
      technical: !touchesModel,
      drift: drift.id,
      body: fixTaskBody(drift, option, note),
    });
    drift.data.task = task.id;
    drift.data.resolution = "fix-code";
    drift.data.option = option ? (choice.option as number) : null;
    drift.data.note = note;
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
    approveProposal(p, drift.data.proposal, skillsDirs);
    drift.data.resolution = "proposal";
  } else {
    if (drift.data.proposal)
      throw new TramaError(`Drift ${drift.id} has an attached Proposal (${drift.data.proposal}): accept that Proposal to keep the code, or fix the code`);
    drift.data.resolution = "dismissed";
  }
  drift.data.status = "resolved";
  writeDocument(drift.path, drift.data, drift.body);
  return drift;
}

/** The open, stale Proposal attached to an open Drift: the only kind that can be reworked and replaced. Refuses otherwise, saying why. */
export function staleAttachedProposal(p: Project, drift: Drift): Proposal {
  if (drift.data.status !== "open") throw new TramaError(`Drift ${drift.id} is already resolved`);
  if (!drift.data.proposal) throw new TramaError(`Drift ${drift.id} has no attached Proposal to replace`);
  const old = getProposal(p, drift.data.proposal);
  if (old.data.status !== "open") throw new TramaError(`Proposal ${old.id} is ${old.data.status}: only an open, stale Proposal can be replaced`);
  if (health(p, old).stale.length === 0) throw new TramaError(`Proposal ${old.id} is not stale: only a stale Proposal can be replaced`);
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
  if (replacement.id === old.id) throw new TramaError(`Proposal ${old.id} is the one already attached; name a newer one`);
  if (replacement.data.status === "rejected" || replacement.data.status === "discarded")
    throw new TramaError(`Proposal ${replacement.id} was ${replacement.data.status}: it cannot replace the attached one`);
  rejectProposal(p, old.id, `Replaced by Proposal ${replacement.id}`);
  drift.data.proposal = replacement.id;
  writeDocument(drift.path, drift.data, drift.body);
  return drift;
}
