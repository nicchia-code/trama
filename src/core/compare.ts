import { deliverComparison, getAnnouncement } from "./announcements";
import { concernSameThing, extent } from "./blocking";
import { recordComparison } from "./compared";
import { TramaError } from "./errors";
import { flattenStates } from "./model";
import { getProposal } from "./proposals";
import { loadProject, type ProjectModel, resolveProjectRef } from "./requirements";
import type { Machine } from "./types";
import type { Project } from "./store";
import {
  type Drift,
  type DriftOption,
  driftCandidates,
  type NotBlocking,
  getDrift,
  getTask,
  listDrifts,
  listTasks,
  type PlannedDrift,
  type PlannedTask,
  planDrift,
  planTask,
  type Task,
  writeDrift,
  writeTask,
} from "./work";

/** What `trama comparison new` gathers for one Machine: the references, what concerns them, and their candidates. */
export interface Briefing {
  project: ProjectModel;
  machine: Machine;
  scope: string[];
  openTasks: Task[];
  openDrifts: Drift[];
  closedDrifts: Drift[];
  /** The Tasks a Drift on each reference would block, when asked for; null otherwise. */
  candidates: Map<string, Task[]> | null;
}

/** The references of a Machine when none is named: the Machine, its States and its Events. */
function wholeMachine(machine: Machine): string[] {
  return [machine.id, ...flattenStates(machine.states).map((s) => `${machine.id}/${s.name}`), ...machine.events.map((e) => `${machine.id}.${e.name}`)];
}

export function briefing(p: Project, machineId: string, refs: string[], candidates: boolean): Briefing {
  const project = loadProject(p);
  const machine = project.model.machines.get(machineId);
  if (!machine) throw new TramaError(`Unknown Machine "${machineId}"`);
  for (const ref of refs) {
    try {
      resolveProjectRef(project, ref);
    } catch {
      throw new TramaError(`Reference "${ref}" does not resolve`);
    }
    if (!extent(project, ref).containers.has(machine.id)) throw new TramaError(`Reference "${ref}" is not in Machine "${machine.id}"`);
  }
  const scope = refs.length > 0 ? refs : wholeMachine(machine);
  const concerns = (card: { data: { refs: string[] } }) => concernSameThing(project, card.data.refs, scope);
  const tasks = listTasks(p).filter((t) => t.data.column !== "done" && concerns(t));
  const drifts = listDrifts(p).filter(concerns);
  return {
    project,
    machine,
    scope,
    openTasks: tasks,
    openDrifts: drifts.filter((d) => d.data.status === "open"),
    closedDrifts: drifts.filter((d) => d.data.status === "resolved"),
    candidates: candidates ? new Map(scope.map((ref) => [ref, driftCandidates(p, [ref], null)])) : null,
  };
}

/** One Task of a comparison file, as `trama comparison move` reads it. */
export interface ComparisonTask {
  title: string;
  refs: string[];
  body?: string;
  technical?: boolean;
}

/** One Drift of a comparison file; `notBlocking` names Tasks by identity or short number. */
export interface ComparisonDrift {
  title: string;
  refs: string[];
  happens: string;
  should: string;
  where: string;
  options: DriftOption[];
  previous?: string;
  proposal?: string;
  notBlocking?: NotBlocking[];
}

export interface ComparisonFile {
  design?: string;
  tasks: ComparisonTask[];
  drifts: ComparisonDrift[];
}

export interface ArchiveResult {
  tasks: Task[];
  drifts: Drift[];
  /** True when `comparisonId` was a waiting comparison, and it is now delivered. */
  delivered: boolean;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");
const optional = (v: unknown, ok: (x: unknown) => boolean) => v === undefined || ok(v);

/** The shape problems of one card; an empty list means the card has the expected fields. */
function taskShape(c: Record<string, unknown>): string[] {
  const out: string[] = [];
  if (typeof c["title"] !== "string") out.push("title must be a string");
  if (!isStrings(c["refs"])) out.push("refs must be a list of strings");
  if (!optional(c["body"], (x) => typeof x === "string")) out.push("body must be a string");
  if (!optional(c["technical"], (x) => typeof x === "boolean")) out.push("technical must be true or false");
  return out;
}

const DRIFT_FIELDS = new Set(["title", "refs", "happens", "should", "where", "options", "previous", "proposal", "notBlocking"]);

function driftShape(c: Record<string, unknown>): string[] {
  const out: string[] = [];
  for (const field of ["title", "happens", "should", "where"]) if (typeof c[field] !== "string") out.push(`${field} must be a string`);
  if (!isStrings(c["refs"])) out.push("refs must be a list of strings");
  if (!Array.isArray(c["options"]) || !c["options"].every((o) => isObject(o) && typeof o["title"] === "string" && typeof o["text"] === "string")) out.push("options must be a list of {title, text} strings");
  for (const field of Object.keys(c)) if (!DRIFT_FIELDS.has(field)) out.push(`unknown field ${field}`);
  for (const field of ["previous", "proposal"]) if (!optional(c[field], (x) => typeof x === "string")) out.push(`${field} must be a string`);
  if (!optional(c["notBlocking"], (x) => Array.isArray(x) && x.every((n) => isObject(n) && typeof n["task"] === "string" && typeof n["reason"] === "string"))) out.push("notBlocking must be a list of {task, reason} strings");
  return out;
}

/** Reads a comparison file's text, a JSON object with `tasks` and `drifts` lists; throws when its top level is wrong. */
export function parseComparisonFile(raw: string): ComparisonFile {
  let json: unknown;
  try {
    json = JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch (err) {
    throw new TramaError(`The comparison file is not valid JSON: ${(err as Error).message}`);
  }
  if (!isObject(json)) throw new TramaError("The comparison file must be a JSON object with a tasks list and a drifts list");
  if (!Array.isArray(json["tasks"]) || !Array.isArray(json["drifts"])) throw new TramaError('The comparison file needs a "tasks" list and a "drifts" list, empty if there is nothing to file');
  if (!optional(json["design"], (x) => typeof x === "string")) throw new TramaError('"design" must be the ID of a Proposal');
  return json as unknown as ComparisonFile;
}

const titleOf = (c: unknown, fallback: string) => (isObject(c) && typeof c["title"] === "string" ? c["title"] : fallback);

/** Checks every card of a comparison file and writes them only when all pass; a comparison waiting for `comparisonId` is delivered. */
export function archiveComparison(p: Project, comparisonId: string, raw: string): ArchiveResult {
  const file = parseComparisonFile(raw);
  const problems: string[] = [];
  let design: string | undefined;
  if (file.design !== undefined) {
    try {
      design = getProposal(p, file.design).id;
    } catch (err) {
      problems.push(`design: ${(err as Error).message}`);
    }
  }
  const tasks: PlannedTask[] = [];
  file.tasks.forEach((c, i) => {
    const label = `Task ${i + 1} "${titleOf(c, "")}"`;
    if (!isObject(c)) return problems.push(`${label}: must be an object`);
    const shape = taskShape(c);
    if (shape.length > 0) return problems.push(...shape.map((m) => `${label}: ${m}`));
    try {
      tasks.push(planTask(p, { title: c["title"] as string, refs: c["refs"] as string[], technical: c["technical"] === true, proposal: design, body: c["body"] as string | undefined }));
    } catch (err) {
      problems.push(`${label}: ${(err as Error).message}`);
    }
  });
  const drifts: PlannedDrift[] = [];
  const proposals = new Set<string>();
  file.drifts.forEach((c, i) => {
    const label = `Drift ${i + 1} "${titleOf(c, "")}"`;
    if (!isObject(c)) return problems.push(`${label}: must be an object`);
    const shape = driftShape(c);
    if (shape.length > 0) return problems.push(...shape.map((m) => `${label}: ${m}`));
    try {
      const proposal = c["proposal"] === undefined ? undefined : getProposal(p, c["proposal"] as string).id;
      if (proposal !== undefined && proposals.has(proposal)) throw new TramaError(`Proposal ${proposal} is already attached to another Drift of this file`);
      if (proposal !== undefined) proposals.add(proposal);
      const previous = c["previous"] === undefined ? undefined : getDrift(p, c["previous"] as string, true).id;
      const notBlocking = ((c["notBlocking"] ?? []) as { task: string; reason: string }[]).map((n) => ({ task: getTask(p, n.task, true).id, reason: n.reason }));
      drifts.push(planDrift(p, {
        title: c["title"] as string,
        refs: c["refs"] as string[],
        proposal,
        previous,
        happens: c["happens"] as string,
        should: c["should"] as string,
        options: c["options"] as DriftOption[],
        where: c["where"] as string,
        notBlocking,
      }));
    } catch (err) {
      problems.push(`${label}: ${(err as Error).message}`);
    }
  });
  if (problems.length > 0) throw new TramaError(`The comparison file has problems; nothing was written:\n${problems.map((m) => `- ${m}`).join("\n")}`);
  const waiting = getAnnouncement(p, comparisonId);
  const written = { tasks: tasks.map((t) => writeTask(p, t)), drifts: drifts.map((d) => writeDrift(p, d)) };
  // A comparison briefed on a code fingerprint records what it compared now that its cards are written.
  if (waiting?.kind === "comparison" && waiting.code !== null) recordComparison(p, waiting.code, waiting.texts);
  const delivered = waiting?.kind === "comparison";
  deliverComparison(p, comparisonId);
  return { ...written, delivered };
}
