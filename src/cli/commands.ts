import { existsSync, mkdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { TramaError, UsageError } from "../core/errors";
import { type AgentOrigin, AGENT_ANNOUNCEMENT_KINDS, type AnnouncementKind, announce, announcementNote, CHECK_PHASES, CHECK_START_PHASES, type CheckPhase, changeCheckPhase, checkOutcome, deliverCard, forgetCheck, getAnnouncement } from "../core/announcements";
import { installOmpAgents, installSkills, missingSkills, ompAgentConflicts, removeRetiredOmpAgents, removeRetiredSkills, skillConflicts } from "./skills";
import {
  approveProposal,
  deleteInProposal,
  discardProposal,
  editInProposal,
  getProposal,
  newProposal,
  setProposalLabel,
  rejectProposal,
  withProposalLock,
  proposalWarnings,
  driftListProblems,
  unfixableDrifts,
  submitProposal,
  validateProposal,
  warningsText,
} from "../core/proposals";
import { sendCoordinatorMessageSoon } from "../core/question-channel";
import { resolveDriftInProposal } from "../core/resolution";
import type { DriftDecisionKind } from "../core/proposals";
import { convertSingleFileAreas, createDefaultAreas, largeFragmentMessage, largeFragments, loadProject } from "../core/requirements";
import { describeRequirementSkillSync, syncRequirementSkills } from "../core/requirement-skills";
import { syncShortNumbers } from "../core/short-numbers";
import { rewriteNumberedCards } from "../core/rewrite-ids";
import {
  findProject,
  TRAMA_DIR,
  loadModel,
  type Project,
  projectAt,
  readTrackedFiles,
  requirementsDir,
  writeFileEnsuringDir,
} from "../core/store";
import type { Model } from "../core/types";
import type { Warning } from "../core/graph";
import { getDrift, getTask, listTasks, moveTask, newDrift, newTask, requireNotAttached, resolveDrift, takeBackTask } from "../core/work";
import { addHistory, getHistory, listHistory, updateHistory } from "../core/history";
import { preflightScope, taskScope } from "../core/task-scope";
import { requestExists } from "../core/design-requests";
import {
  analyzeView,
  eventView,
  featureView,
  machineView,
  pathsView,
  searchView,
  stateView,
  systemView,
  validateView,
} from "./explore";
import { requirementsView, withRequirements } from "./requirements";
import type { Result } from "./result";
import {
  boardView,
  driftCandidatesView,
  driftListView,
  driftShowView,
  proposalListView,
  proposalShowView,
  taskListView,
  taskNextView,
  taskShowView,
} from "./work";

export type OptionSpec = { type: "string" | "boolean"; multiple?: boolean };
export type Values = Record<string, string | boolean | (string | boolean)[] | undefined>;

export interface Context {
  cwd: string;
  rootOption?: string;
  /** True when the command runs as the agent: in the terminal Trama started for it (`TRAMA_AGENT`) or in Cursor's chat (`CURSOR_AGENT`). */
  byAgent: boolean;
  /** The agent terminal (`TRAMA_TERMINAL`) or the chat (`CURSOR_AGENT`) the command runs in, when either is known. */
  origin: AgentOrigin;
  /** The autopilot job this agent terminal was started for (`TRAMA_JOB`), when there is one. */
  job?: string;
  project(assignNumbers?: boolean): Project;
}

export interface Command {
  name: string;
  /** Positional arguments: `<required>` and `[optional]`. */
  args: string;
  summary: string;

  options?: Record<string, OptionSpec>;
  run(ctx: Context, args: string[], opts: Values): Result;
}

const ref: OptionSpec = { type: "string", multiple: true };

/** An explore view of a Model element followed by the Requirements attached to it. */
function explore(ctx: Context, target: string, view: (model: Model, ref: string) => Result): Result {
  const project = loadProject(ctx.project());
  return withRequirements(view(project.model, target), project, target);
}

const str = (v: Values[string]): string | undefined => (typeof v === "string" ? v : undefined);
/** The autopilot job of the agent's terminal (`TRAMA_JOB`), when the environment names one. */
export const jobFromEnv = (env: Record<string, string | undefined>): string | undefined => env["TRAMA_JOB"]?.trim() || undefined;
const list = (v: Values[string]): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const DECISIONS: readonly string[] = ["proposal", "dismissed", "fix-code"];

/** A command argument: digits cite only a numbered card, and a unique prefix is enough. */
const proposalArg = (ctx: Context, id: string) => getProposal(ctx.project(), id, true).id;
const taskArg = (ctx: Context, id: string) => getTask(ctx.project(), id, true).id;
const driftArg = (ctx: Context, id: string) => getDrift(ctx.project(), id, true).id;
const optionalArg = (ctx: Context, id: string | undefined, resolve: (ctx: Context, id: string) => string) => (id === undefined ? undefined : resolve(ctx, id));
/** The `--proposal` and `--not-proposal` filters of a command: repeated Proposal IDs or short numbers, never both. */
const proposalFilter = (ctx: Context, o: Values): { include: string[]; exclude: string[] } => {
  const include = list(o["proposal"]);
  const exclude = list(o["not-proposal"]);
  if (include.length > 0 && exclude.length > 0) throw new UsageError("--proposal and --not-proposal cannot be used together");
  return { include: include.map((id) => proposalArg(ctx, id)), exclude: exclude.map((id) => proposalArg(ctx, id)) };
};
/** The short numbers of this working copy as they are now, read after a command has acted so a card it closed is already written by its identity. */
const numbersOf = (ctx: Context) => syncShortNumbers(ctx.project());
/** Each `--option <title>` is followed by its `--option-text <text>`: the n-th title goes with the n-th text. A title without text, or text without a title, is left empty for the Drift to refuse. */
const fixOptions = (titles: string[], texts: string[]) => Array.from({ length: Math.max(titles.length, texts.length) }, (_, i) => ({ title: titles[i] ?? "", text: texts[i] ?? "" }));
/** Each `--not-blocking <task>` is followed by its `--not-blocking-reason <text>`: the n-th Task goes with the n-th reason. A missing one is left empty for the Drift to refuse. */
const notBlockingPairs = (ctx: Context, tasks: string[], reasons: string[]) =>
  Array.from({ length: Math.max(tasks.length, reasons.length) }, (_, i) => {
    const id = tasks[i];
    return { task: id === undefined ? "" : taskArg(ctx, id), reason: reasons[i] ?? "" };
  });

function text(md: string, json: unknown = { message: md }): Result {
  return { md, json };
}

function required(value: string | undefined, flag: string): string {
  if (value === undefined) throw new UsageError(`Missing required option --${flag}`);
  return value;
}

export function makeContext(cwd: string, rootOption?: string, byAgent = false, origin: AgentOrigin = {}, job?: string): Context {
  let numbered = false;
  return {
    cwd,
    rootOption,
    byAgent,
    origin,
    job,
    project(assignNumbers = true) {
      const project = rootOption === undefined ? findProject(cwd) : projectAt(resolve(cwd, rootOption));
      if (rootOption !== undefined && !existsSync(project.dir)) throw new TramaError(`No ${TRAMA_DIR}/ in ${project.root}. Run "trama init".`);
      // A command is a reading of the working copy: cards it has not seen yet take their short number before it acts.
      if (assignNumbers && !numbered) {
        numbered = true;
        syncShortNumbers(project);
      }
      return project;
    },
  };
}

export const COMMANDS: Command[] = [
  {
    name: "init",
    args: "",
    summary: "Create .trama/ and install the agent skills and omp's sub-agent definitions (--skills-dir, default .agents/skills; .claude/skills for Claude Code; --force overwrites customised skills and definitions)",
    options: { "skills-dir": { type: "string" }, force: { type: "boolean" } },
    run(ctx, _a, o) {
      const root = resolve(ctx.cwd, ctx.rootOption ?? ".");
      const project = projectAt(root);
      if (existsSync(project.dir)) throw new TramaError(`${project.dir} already exists`);
      const skillsDir = resolve(root, str(o["skills-dir"]) ?? ".agents/skills");
      const conflicts = o["force"] === true ? [] : [...skillConflicts(skillsDir), ...ompAgentConflicts(root)];
      if (conflicts.length > 0)
        throw new TramaError(`Refusing to overwrite agent files that differ from Trama's:\n${conflicts.map((c) => `- ${c}`).join("\n")}\nNothing was created. Move them, pick another --skills-dir, or pass --force.`);
      for (const d of ["model/actors", "proposals", "tasks", "drifts"]) {
        mkdirSync(join(project.dir, d), { recursive: true });
        writeFileEnsuringDir(join(project.dir, d, ".gitkeep"), "");
      }
      const name = basename(root).replace(/[-_]+/g, " ").replace(/^./, (c) => c.toUpperCase());
      writeFileEnsuringDir(join(project.dir, "model", "system.md"), `# ${name}\n\nDescribe what this System is and who it is for.\n`);
      const areas = createDefaultAreas(project);
      const skills = installSkills(skillsDir);
      const agents = installOmpAgents(root);
      syncRequirementSkills(project, [skillsDir]);
      return text(`Created ${project.dir} with ${areas.length} Requirement Areas\nInstalled ${skills.length} skill files in ${skillsDir}\nInstalled omp's sub-agent definitions: ${agents.join(", ")}`, { path: project.dir, skillsDir, skills, agents, areas });
    },
  },
  {
    name: "skills update",
    args: "",
    summary: "Install this version's agent skills into a project (--skills-dir, default .agents/skills), add the starting Requirement Areas if the project has none, move single-file Areas into Area folders, and regenerate the trama-req-* skills",
    options: { "skills-dir": { type: "string" } },
    run(ctx, _a, o) {
      const project = ctx.project();
      const skillsDir = resolve(project.root, str(o["skills-dir"]) ?? ".agents/skills");
      const changed = skillConflicts(skillsDir).concat(missingSkills(skillsDir));
      installSkills(skillsDir);
      const agents = installOmpAgents(project.root);
      const removed = removeRetiredSkills(project.root, [skillsDir]);
      const removedAgents = removeRetiredOmpAgents(project.root);
      const areas = existsSync(requirementsDir(project)) ? [] : createDefaultAreas(project);
      const conversion = convertSingleFileAreas(project);
      const generated = syncRequirementSkills(project, [skillsDir]);
      const lines = [
        changed.length === 0 ? `Skills in ${skillsDir} are already up to date.` : `Updated ${changed.length} skill file(s) in ${skillsDir}:\n${changed.map((c) => `- ${c}`).join("\n")}`,
        removed.length > 0 ? `Deleted the retired trama-fix skill: ${removed.join(", ")}` : "",
        removedAgents.length > 0 ? `Deleted the retired omp sub-agent definition: ${removedAgents.join(", ")}` : "",
        `Installed omp's sub-agent definitions: ${agents.join(", ")}`,
        areas.length > 0 ? `Created ${areas.length} Requirement Areas in ${requirementsDir(project)}: ${areas.join(", ")}` : "",
        conversion.converted.length > 0
          ? `Converted ${conversion.converted.length} single-file Requirement Area(s) to Area folders (area.md, and main.md with the sections): ${conversion.converted.join(", ")}`
          : "",
        conversion.skipped.length > 0 ? `Left ${conversion.skipped.length} single-file Requirement Area(s) as they were: ${conversion.skipped.map((s) => `${s.id} (${s.reason})`).join(", ")}` : "",
        describeRequirementSkillSync(generated),
      ];
      return text(lines.filter(Boolean).join("\n"), { skillsDir, changed, removed, removedAgents, agents, areas, conversion, generated });
    },
  },

  {
    name: "ids rewrite",
    args: "",
    summary: "Give every numbered Proposal, Task and Drift its own identity, keeping number order. Refused when two cards of one kind share a number, or when a new identity would collide. Does nothing when none are numbered",
    run(ctx) {
      const project = ctx.project(false);
      const rewritten = rewriteNumberedCards(project);
      if (rewritten.length === 0) return text("No numbered Proposal, Task or Drift to rewrite.");
      const numbers = syncShortNumbers(project);
      const lines = rewritten.map((card) => `- ${card.kind} ${card.from} → ${numbers.name(card.kind, card.to)}`);
      return text(`Rewrote ${rewritten.length} numbered ${rewritten.length === 1 ? "card" : "cards"}.\n${lines.join("\n")}`, { rewritten });
    },
  },
  {
    name: "history add",
    args: "<title>",
    summary: "Write a History entry for the finished Tasks it cites: --task <id> (repeated, a Task that is Done and not closed unchanged), --summary <one line>, optional --body <text>. Refused, writing nothing, with every problem listed",
    options: { summary: { type: "string" }, body: { type: "string" }, task: { type: "string", multiple: true } },
    run(ctx, a, o) {
      const entry = addHistory(ctx.project(), { title: a[0] as string, summary: str(o["summary"]) ?? "", body: str(o["body"]), tasks: list(o["task"]) });
      return text(`Added history entry ${entry.id}: ${entry.title}`, { id: entry.id, title: entry.title, file: `history/${entry.name}` });
    },
  },
  {
    name: "history update",
    args: "<id>",
    summary: "Change a History entry: --title, --summary and --body replace their field; repeated --task adds Tasks, never removes one. Refused, leaving the file as it was, when a new value or a new Task is not valid",
    options: { title: { type: "string" }, summary: { type: "string" }, body: { type: "string" }, task: { type: "string", multiple: true } },
    run(ctx, a, o) {
      const entry = updateHistory(ctx.project(), a[0] as string, { title: str(o["title"]), summary: str(o["summary"]), body: str(o["body"]), tasks: list(o["task"]) });
      return text(`Updated history entry ${entry.id}: ${entry.title}`, { id: entry.id, title: entry.title, file: `history/${entry.name}` });
    },
  },
  {
    name: "history list",
    args: "",
    summary: "History entries, the most recent first, with identity, date and title",
    options: {},
    run(ctx) {
      const entries = listHistory(ctx.project());
      const md = entries.length === 0 ? "No history entries." : entries.map((e) => `- ${e.id}  ${e.updated}  ${e.title}`).join("\n");
      return text(md, entries.map((e) => ({ id: e.id, title: e.title, summary: e.summary, created: e.created, updated: e.updated, file: `history/${e.name}` })));
    },
  },
  {
    name: "history show",
    args: "<id>",
    summary: "A History entry: title, date, summary, text, and the Tasks it cites with their state",
    run(ctx, a) {
      const project = ctx.project();
      const entry = getHistory(project, a[0] as string);
      const tasks = listTasks(project);
      const numbers = syncShortNumbers(project);
      const cited = entry.tasks.map((id) => {
        const t = tasks.find((x) => x.id === id);
        return { id, number: numbers.name("task", id), exists: t !== undefined, title: t?.title ?? null, column: t?.data.column ?? null, unchanged: t?.data.unchanged ?? null };
      });
      const lines = cited.map((c) => (c.exists ? `- ${c.number}: ${c.title} (${c.column}${c.unchanged === null ? "" : ", no changes"})` : `- ${c.id}: Task no longer exists`));
      const md = [`# ${entry.title}`, `Updated ${entry.updated}, created ${entry.created}`, "", entry.summary, "", entry.body, "", "## Tasks", ...(lines.length === 0 ? ["_No Tasks._"] : lines)];
      return text(md.join("\n").trim(), { id: entry.id, title: entry.title, created: entry.created, updated: entry.updated, summary: entry.summary, body: entry.body, file: `history/${entry.name}`, tasks: cited });
    },
  },
  { name: "system", args: "", summary: "System description, Actors and Features", run: (ctx) => systemView(loadModel(ctx.project())) },
  { name: "feature", args: "<feature>", summary: "A Feature: its Machines, the Events reaching them and its Requirements", run: (ctx, a) => explore(ctx, a[0] as string, featureView) },
  { name: "machine", args: "<machine>", summary: "A Machine: State tree, Transitions, Events, who receives them and its Requirements", run: (ctx, a) => explore(ctx, a[0] as string, machineView) },
  { name: "state", args: "<machine/State>", summary: "A State: sub-States, outgoing (incl. inherited) and incoming Transitions, Requirements", run: (ctx, a) => explore(ctx, a[0] as string, stateView) },
  { name: "event", args: "<owner.EVENT>", summary: "An Event: owner and every Transition that reacts to it", run: (ctx, a) => eventView(loadModel(ctx.project()), a[0] as string) },
  {
    name: "requirements",
    args: "[area|ref]",
    summary: "Requirement Areas; one Area in full (ui or requirements/ui); or the Requirements that apply to a Model element (order/Paid)",
    run: (ctx, a) => requirementsView(loadProject(ctx.project()), a[0]),
  },
  {
    name: "paths",
    args: "<machine> <from> <to>",
    summary: "Simple paths between two States, shortest first",
    options: { max: { type: "string" } },
    run(ctx, a, o) {
      const raw = str(o["max"]);
      const max = raw === undefined ? 20 : Number(raw);
      if (!Number.isInteger(max) || max < 1) throw new UsageError("--max must be a positive integer");
      return pathsView(loadModel(ctx.project()), a[0] as string, a[1] as string, a[2] as string, max);
    },
  },
  {
    name: "analyze",
    args: "[machine]",
    summary: "Warnings: unreachable States, dead ends, Events nobody receives, Requirement fragments larger than 12 KB",
    run(ctx, a) {
      const project = ctx.project();
      const large = largeFragments(readTrackedFiles(project)).map((f): Warning => ({ machine: null, kind: "large-fragment", subject: f.file, message: `${f.file}: ${largeFragmentMessage(f)}` }));
      return analyzeView(loadModel(project), a[0], large);
    },
  },
  { name: "search", args: "<text>", summary: "Search names and prose of the whole Model and its Requirements", run: (ctx, a) => searchView(loadProject(ctx.project()), a.join(" ")) },
  {
    name: "validate",
    args: "",
    summary: "Check the Model's and Requirements' internal consistency (never the code)",
    options: { proposal: { type: "string" } },
    run(ctx, _a, o) {
      const project = ctx.project();
      const id = str(o["proposal"]);
      if (id === undefined) return validateView(loadProject(project).diagnostics, "The Model and its Requirements", largeFragments(readTrackedFiles(project)).map((f) => ({ file: f.file, line: 0, message: largeFragmentMessage(f) })));
      const proposal = getProposal(project, id, true);
      const listProblems = [...driftListProblems(project, proposal).map((message) => `Drift list: ${message}`), ...unfixableDrifts(project, proposal)].map((message) => ({ file: "proposal.md", line: 0, message }));
      return validateView([...validateProposal(project, proposal), ...listProblems], `The Model and its Requirements with Proposal ${numbersOf(ctx).name("proposal", proposal.id)} applied`, proposalWarnings(project, proposal));
    },
  },

  { name: "announce", args: "<kind> <title>", summary: "Say that you are about to create a card, so the Board shows a ghost of it: kind is proposal, task or drift. Prints the announcement ID; pass it as --announcement when you create the card. Kind check (with --phase verifying or scanning, optionally --job <id>) announces a final check or a scan instead, shown in In progress until announce done", options: { phase: { type: "string" }, job: { type: "string" } }, run(ctx, a, o) {
      const kind = a[0] as string;
      if (!(AGENT_ANNOUNCEMENT_KINDS as readonly string[]).includes(kind)) throw new UsageError(`The kind must be one of ${AGENT_ANNOUNCEMENT_KINDS.join(", ")}, not "${kind}"`);
      const phase = str(o["phase"]);
      const job = str(o["job"]) ?? (kind === "check" ? ctx.job : undefined);
      if (kind === "check" && phase === undefined) throw new UsageError(`A check needs --phase ${CHECK_START_PHASES.join(" or ")}`);
      if (kind !== "check" && phase !== undefined) throw new UsageError("--phase is only for a check");
      if (kind !== "check" && job !== undefined) throw new UsageError("--job is only for a check");
      if (phase !== undefined && !(CHECK_START_PHASES as readonly string[]).includes(phase)) throw new UsageError(`--phase must be one of ${CHECK_START_PHASES.join(", ")}, not "${phase}"`);
      const announcement = announce(ctx.project(), { kind: kind as AnnouncementKind, title: a[1] as string, ...(phase ? { phase: phase as CheckPhase } : {}), ...(job ? { job } : {}), ...ctx.origin });
      return text(announcement.id, { id: announcement.id, kind: announcement.kind, title: announcement.title, ...(announcement.phase ? { phase: announcement.phase } : {}), ...(announcement.job ? { job: announcement.job } : {}) });
    } },
  { name: "announce phase", args: "<id> <phase>", summary: "Move a check you announced forward: from verifying to scanning when the scan of the whole System starts, or from verifying or scanning to history when the final run updates the History (phase is scanning or history; a backward move is refused)", run(ctx, a) {
      const id = a[0] as string;
      const phase = a[1] as string;
      if (!(CHECK_PHASES as readonly string[]).includes(phase)) throw new UsageError(`A check phase must be one of ${CHECK_PHASES.join(", ")}, not "${phase}"`);
      const project = ctx.project();
      const before = getAnnouncement(project, id);
      const outcome = changeCheckPhase(project, id, phase as CheckPhase);
      if (outcome === "refused") throw new UsageError(`Check ${id} cannot move back to ${phase}; a check only moves forward (verifying, scanning, history); nothing changed.`);
      if (outcome === "changed") sendCoordinatorMessageSoon(project, { type: "check-phase", root: project.root, id, phase, ...(before?.job ? { job: before.job } : {}) }, (reason) => {
        process.stderr.write(`The editor did not receive the phase change of check ${id} (${reason}).\n`);
      });
      const md = outcome === "changed" ? `Check ${id} is now ${phase}`
        : outcome === "unchanged" ? `Check ${id} is already ${phase}; nothing changed.`
        : `No check "${id}" was found (unknown, already finished or withdrawn, or not a check); nothing changed.`;
      return text(md, { id, outcome });
    } },
  { name: "announce done", args: "<id>", summary: "Deliver a finished check; --failed reports its failure to the coordinator", options: { failed: { type: "boolean" } }, run(ctx, a, o) {
      const id = a[0] as string;
      const failed = o["failed"] === true;
      const project = ctx.project();
      const finished = checkOutcome(project, id, failed);
      if (finished) sendCoordinatorMessageSoon(project, { type: "check", root: project.root, ...finished }, (reason) => {
        process.stderr.write(`The editor did not receive the outcome of check ${id} (${reason}); no success is assumed.\n`);
      }, () => forgetCheck(project, id));
      const outcome = finished ? (failed ? "failed" : "done") : "missing";
      return text(finished ? `Check ${id} is ${outcome}` : `No check "${id}" was found (unknown, already finished or withdrawn, or not a check); nothing changed.`, { id, found: finished !== null, ...(finished ? { outcome } : {}) });
    } },
  { name: "proposal new", args: "<title>", summary: "Create a Draft Proposal (--label <text> gives its short label, required before a Proposal with Tasks is handed over; --requires <id> for dependencies; --import for existing code; --resolution for a resolution of Drifts; --non-blocking only with --resolution, for a resolution whose Drifts block no Task; --setup for the first Proposal of an empty Model; --automatic only with --resolution; --job <id> binds an automatic resolution Draft to its autopilot job; --announcement <id> names the announcement of this Proposal; --request <id> binds it to the written design request it comes from); submit when finished", options: { body: { type: "string" }, label: { type: "string" }, requires: ref, import: { type: "boolean" }, resolution: { type: "boolean" }, setup: { type: "boolean" }, automatic: { type: "boolean" }, "non-blocking": { type: "boolean" }, job: { type: "string" }, announcement: { type: "string" }, request: { type: "string" } }, run(ctx, a, o) {
      const project = ctx.project();
      if (o["import"] === true && o["resolution"] === true) throw new UsageError("--import and --resolution cannot go together: a Proposal is one or the other");
      if (o["job"] !== undefined && (o["automatic"] !== true || o["resolution"] !== true)) throw new UsageError("--job can only be used with --automatic --resolution");
      if (o["non-blocking"] === true && (o["resolution"] !== true || o["automatic"] === true)) throw new UsageError("--non-blocking can only be used with --resolution, and not with --automatic");
      if (o["setup"] === true && (o["import"] === true || o["resolution"] === true)) throw new UsageError("--setup cannot go together with --import or --resolution");
      if (o["setup"] === true) {
        const model = loadModel(project);
        if (model.features.size > 0 || model.actors.size > 0) throw new TramaError("--setup needs an empty Model: the Model is not empty (it has Features or Actors)");
      }
      const note = announcementNote(project, str(o["announcement"]), "proposal");
      const request = str(o["request"]);
      const job = str(o["job"]) ?? (o["automatic"] === true && o["resolution"] === true ? ctx.job : undefined);
      const p = newProposal(project, a[0] as string, str(o["body"]), { requires: list(o["requires"]).map((id) => proposalArg(ctx, id)), kind: o["import"] === true ? "import" : o["resolution"] === true ? "resolution" : o["setup"] === true ? "setup" : "change", automatic: o["automatic"] === true, nonBlocking: o["non-blocking"] === true, announcement: str(o["announcement"]), origin: ctx.origin, request, ...(str(o["label"]) === undefined ? {} : { label: str(o["label"]) }) });
      if (job !== undefined) sendCoordinatorMessageSoon(project, { type: "proposal-draft", proposal: p.id, job }, (reason) => {
        process.stderr.write(`Could not bind automatic resolution Draft ${p.id} to autopilot job ${job}: ${reason}\n`);
      });
      const requestNote = request !== undefined && p.data.request === null ? (requestExists(project, request) ? `Design request ${request} is already bound to another Proposal; the Proposal is not bound to any request.` : `Design request ${request} was not found; the Proposal is not bound to any request.`) : "";
      const notes = [note, requestNote].filter(Boolean).join("\n");
      const n = numbersOf(ctx);
      return text(`Created Draft Proposal ${n.name("proposal", p.id)} at ${p.dir}. Submit it when finished.${notes ? `\n${notes}` : ""}`, { id: p.id, number: n.label("proposal", p.id), path: p.dir, status: p.data.status, request: p.data.request, ...(note ? { note } : {}), ...(requestNote ? { requestNote } : {}) });
    } },
  { name: "proposal label", args: "<id> <label>", summary: "Write or change the short label of a Proposal (1 to 30 characters, one line); an open Proposal returns to Draft", run(ctx, a) {
      const project = ctx.project();
      const { proposal, returnedToDraft } = withProposalLock(project, a[0] as string, (id) => setProposalLabel(project, id, a[1] as string), true);
      const id = proposal.id;
      const n = numbersOf(ctx);
      return text(`Label of Proposal ${n.name("proposal", id)} is "${proposal.data.label}".${returnedToDraft ? "\nProposal returned to Draft; submit it again when finished." : ""}`, { id, number: n.label("proposal", id), label: proposal.data.label, status: proposal.data.status, returnedToDraft });
    } },
  { name: "proposal edit", args: "<id> <model-path>", summary: "Make a Model file, or specs.yaml, editable inside a Proposal; prints the path to edit", run(ctx, a) {
      const project = ctx.project();
      const { id, path, returnedToDraft } = withProposalLock(project, a[0] as string, (proposalId) => {
        const wasOpen = getProposal(project, proposalId).data.status === "open";
        return { id: proposalId, path: editInProposal(project, proposalId, a[1] as string), returnedToDraft: wasOpen };
      }, true);
      return text(`${path}${returnedToDraft ? "\nProposal returned to Draft; submit it again when finished." : ""}`, { id, number: numbersOf(ctx).label("proposal", id), path, status: "draft", returnedToDraft });
    } },
  { name: "proposal resolve-drift", args: "<id> <drift>", summary: "Record or replace, in a resolution Proposal, the decision on an open Drift (--decision proposal|dismissed|fix-code; --option <n> and --note <text> only with fix-code); --remove takes the Drift out of the list. Returns an open resolution to Draft", options: { decision: { type: "string" }, option: { type: "string" }, note: { type: "string" }, remove: { type: "boolean" } }, run(ctx, a, o) {
      const project = ctx.project();
      const decision = str(o["decision"]);
      const remove = o["remove"] === true;
      if (!remove && !DECISIONS.includes(decision as DriftDecisionKind)) throw new UsageError(`--decision must be one of ${DECISIONS.join(", ")}`);
      if (remove && (decision !== undefined || o["option"] !== undefined || o["note"] !== undefined)) throw new UsageError("--remove takes no decision, option or note");
      const option = o["option"] === undefined ? undefined : Number(str(o["option"]));
      if (option !== undefined && !Number.isInteger(option)) throw new UsageError("--option must be a whole number");
      const { proposal, returnedToDraft, drift } = withProposalLock(project, a[0] as string, (id) => {
        const driftId = driftArg(ctx, a[1] as string);
        return { drift: driftId, ...resolveDriftInProposal(project, id, driftId, { ...(decision ? { decision: decision as DriftDecisionKind } : {}), ...(option !== undefined ? { option } : {}), ...(o["note"] !== undefined ? { note: str(o["note"]) ?? "" } : {}), remove }) };
      }, true);
      const n = numbersOf(ctx);
      return text(`${remove ? "Removed" : "Recorded"} Drift ${n.name("drift", drift)} ${remove ? "from" : `as ${decision} in`} Proposal ${n.name("proposal", proposal.id)}.${returnedToDraft ? " Proposal returned to Draft; submit it again when finished." : ""}`, { id: proposal.id, number: n.label("proposal", proposal.id), drift, status: proposal.data.status, returnedToDraft, drifts: proposal.data.drifts });
    } },
  { name: "proposal delete", args: "<id> <model-path>", summary: "Mark a Model file, or specs.yaml, for deletion in a Proposal", run(ctx, a) {
      const project = ctx.project();
      const { id, returnedToDraft } = withProposalLock(project, a[0] as string, (proposalId) => {
        const wasOpen = getProposal(project, proposalId).data.status === "open";
        deleteInProposal(project, proposalId, a[1] as string);
        return { id: proposalId, returnedToDraft: wasOpen };
      }, true);
      const n = numbersOf(ctx);
      return text(`Marked ${a[1]} for deletion in Proposal ${n.name("proposal", id)}.${returnedToDraft ? " Proposal returned to Draft; submit it again when finished." : ""}`, { id, number: n.label("proposal", id), status: "draft", returnedToDraft });
    } },
  { name: "proposal submit", args: "<id>", summary: "Hand a valid Draft over to the developer; a setup Proposal on an empty Model is approved at once (--skills-dir adds the configured skills folder)", options: { "skills-dir": ref }, run(ctx, a, o) {
      const project = ctx.project();
      const p = submitProposal(project, proposalArg(ctx, a[0] as string), list(o["skills-dir"]));
      if (p.data.automatic) sendCoordinatorMessageSoon(project, { type: "proposal-submitted", proposal: p.id }, (reason) => {
        process.stderr.write(`Could not hand over automatic resolution Proposal ${p.id} to the autopilot: ${reason}\n`);
      });
      // Approve and Reject wait for the end of the turn of the agent that delivered the Proposal; a Proposal approved at hand-over has nothing to wait for.
      const holder = ctx.origin.terminal ?? ctx.origin.chat;
      if (ctx.byAgent && holder !== undefined && !p.approvedAtHandOver) sendCoordinatorMessageSoon(project, { type: "proposal-delivered", root: project.root, proposal: p.id, holder }, (reason) => {
        process.stderr.write(`The editor did not learn that Proposal ${p.id} was delivered by an agent (${reason}); Approve and Reject are not held for that agent's turn.\n`);
      });
      const consumed = p.requestConsumed ? `\nDeleted design request ${p.data.request}: it is now consumed.` : "";
      const n = numbersOf(ctx);
      const head = p.approvedAtHandOver ? `Submitted and approved Proposal ${n.name("proposal", p.id)}` : `Submitted Proposal ${n.name("proposal", p.id)} for review`;
      const kept = p.openReason === null ? "" : `\nKept open for the developer: ${p.openReason}`;
      return text(`${head}${consumed}${kept}${warningsText(p.warnings)}`, { id: p.id, number: n.label("proposal", p.id), status: p.data.status, request: p.data.request, requestConsumed: p.requestConsumed, warnings: p.warnings, approvedAtHandOver: p.approvedAtHandOver, openReason: p.openReason });
    } },
  { name: "proposal discard", args: "<id>", summary: "Discard a Draft the agent never finished", run(ctx, a) {
      const project = ctx.project();
      const id = proposalArg(ctx, a[0] as string);
      const p = discardProposal(project, id);
      const n = numbersOf(ctx);
      return text(`Discarded Proposal ${n.name("proposal", p.id)}`, { id: p.id, number: n.label("proposal", p.id), status: p.data.status });
    } },
  { name: "proposal show", args: "<id>", summary: "A Proposal: staleness, structural changes, validation", run: (ctx, a) => proposalShowView(ctx.project(), getProposal(ctx.project(), a[0] as string, true)) },
  { name: "proposal list", args: "", summary: "Draft and open Proposals (--all for every one)", options: { all: { type: "boolean" } }, run: (ctx, _a, o) => proposalListView(ctx.project(), o["all"] === true) },
  { name: "proposal approve", args: "<id>", summary: "Accept an open Proposal and apply it in this folder (--skills-dir adds the configured skills folder)", options: { "skills-dir": ref }, run(ctx, a, o) {
      const project = ctx.project();
      const id = proposalArg(ctx, a[0] as string);
      requireNotAttached(project, id);
      const { id: approved, resolved } = approveProposal(project, id, list(o["skills-dir"]));
      const n = numbersOf(ctx);
      const lines = resolved.map((d) => `- Drift ${n.name("drift", d.drift)}: ${d.skipped ? "skipped, already resolved" : d.decision === "fix-code" ? `code to be fixed, Task ${d.task ? n.name("task", d.task) : ""} created` : d.decision === "proposal" ? "Model updated to match the code" : "dismissed"}`);
      return text([`Approved Proposal ${n.name("proposal", approved)}`, ...lines].join("\n"), { id: approved, number: n.label("proposal", approved), status: "approved", resolved });
    } },
  { name: "proposal reject", args: "<id>", summary: "Reject a Proposal, optionally with feedback for the agent", options: { feedback: { type: "string" } }, run(ctx, a, o) {
      const id = proposalArg(ctx, a[0] as string);
      requireNotAttached(ctx.project(), id);
      const p = rejectProposal(ctx.project(), id, str(o["feedback"]));
      const n = numbersOf(ctx);
      return text(`Rejected Proposal ${n.name("proposal", p.id)}`, { id: p.id, number: n.label("proposal", p.id), status: p.data.status });
    } },

  { name: "task new", args: "<title>", summary: "Create a Task in 'todo' (--ref … or --technical; --proposal <id> links it to the design it comes from; with --drift the design is the origin Task's, and a different --proposal is refused; --announcement <id> names the announcement of this Task)", options: { ref, technical: { type: "boolean" }, drift: { type: "string" }, proposal: { type: "string" }, body: { type: "string" }, announcement: { type: "string" } }, run(ctx, a, o) {
      const project = ctx.project();
      const note = announcementNote(project, str(o["announcement"]), "task");
      const t = newTask(project, { title: a[0] as string, refs: list(o["ref"]), technical: o["technical"] === true, drift: optionalArg(ctx, str(o["drift"]), driftArg), proposal: optionalArg(ctx, str(o["proposal"]), proposalArg), body: str(o["body"]) });
      deliverCard(project, str(o["announcement"]), "task");
      // The agent that files a Task keeps Run and Resolve of it waiting until its turn ends: the editor learns who holds it here.
      const holder = ctx.origin.terminal ?? ctx.origin.chat;
      if (ctx.byAgent && holder !== undefined) sendCoordinatorMessageSoon(project, { type: "task-filed", root: project.root, task: t.id, holder }, (reason) => {
        process.stderr.write(`The editor did not learn that Task ${t.id} was filed by an agent (${reason}); Run and Resolve are not held for that agent's turn.\n`);
      });
      const n = numbersOf(ctx);
      return text(`Created Task ${n.name("task", t.id)} at ${t.path}${note ? `\n${note}` : ""}`, { id: t.id, number: n.label("task", t.id), path: t.path, ...(note ? { note } : {}) });
    } },
  { name: "task show", args: "<id>", summary: "A Task with its references and the Requirements to implement", run: (ctx, a) => taskShowView(ctx.project(), getTask(ctx.project(), a[0] as string, true)) },
  { name: "task list", args: "", summary: "Tasks grouped by column", options: { column: { type: "string" } }, run: (ctx, _a, o) => taskListView(ctx.project(), str(o["column"])) },
  { name: "task next", args: "", summary: "The next runnable Task(s), optionally filtered by repeated --task <id>, --proposal <id> or --not-proposal <id>; moves nothing", options: { task: { type: "string", multiple: true }, proposal: { type: "string", multiple: true }, "not-proposal": { type: "string", multiple: true }, batch: { type: "boolean" }, max: { type: "string" } }, run: (ctx, _a, o) => {
      const raw = str(o["max"]);
      const max = raw === undefined ? undefined : Number(raw);
      if (max !== undefined && (!Number.isInteger(max) || max < 1)) throw new UsageError("--max must be a positive integer");
      return taskNextView(ctx.project(), proposalFilter(ctx, o), o["batch"] === true, max, o["task"] === undefined ? undefined : list(o["task"]));
    } },
  { name: "task scope", args: "[<id>…]", summary: "The scan scope of the named Tasks, or with --pre-flight the exact references of the runnable Tasks in To do (filtered by repeated --proposal, --not-proposal and --task); moves nothing", options: { "pre-flight": { type: "boolean" }, proposal: { type: "string", multiple: true }, "not-proposal": { type: "string", multiple: true }, task: { type: "string", multiple: true } }, run(ctx, args, o) {
      const project = ctx.project();
      if (o["pre-flight"] === true) {
        if (args.length > 0) throw new UsageError("--pre-flight takes no Task ID: filter the runnable Tasks with --proposal, --not-proposal or --task");
        const { refs, tasks } = preflightScope(project, proposalFilter(ctx, o), o["task"] === undefined ? undefined : list(o["task"]));
        const n = numbersOf(ctx);
        const body = refs.length ? refs.map((ref) => `- \`${ref}\``).join("\n") : "_Nothing to check._";
        return text(`## Pre-flight scope\n\n${body}`, { refs: refs.map((ref) => ({ ref })), tasks: tasks.map((t) => ({ id: t.id, number: n.label("task", t.id), title: t.title })) });
      }
      if (args.length === 0) throw new UsageError("Name at least one Task ID, or pass --pre-flight");
      if (o["proposal"] !== undefined || o["not-proposal"] !== undefined || o["task"] !== undefined) throw new UsageError("--proposal, --not-proposal and --task apply only with --pre-flight");
      const ids = args.map((id) => {
        try {
          return getTask(project, id, true).id;
        } catch (err) {
          if (!(err instanceof TramaError) || (!err.message.startsWith("No Task with ID ") && !err.message.startsWith("No live Task has the short number "))) throw err;
          throw new UsageError(`Task "${id}" was not found: ${err.message}`);
        }
      });
      const scope = taskScope(project, ids);
      return text(scope.length
        ? `## Scan scope\n\n${scope.map(({ ref, reason }) => `- \`${ref}\` (${reason})`).join("\n")}`
        : "## Scan scope\n\n_Nothing to scan._", scope);
    } },
  { name: "task move", args: "<id> <column>", summary: "Move a Task to todo, doing or done; --unchanged <note> closes a fix Task into done without changes (its Drift in Code to be fixed becomes Dismissed)", options: { unchanged: { type: "string" } }, run(ctx, a, o) {
      const unchanged = str(o["unchanged"]);
      const t = moveTask(ctx.project(), taskArg(ctx, a[0] as string), a[1] as string, ctx.byAgent ? "agent" : "developer", ctx.origin, unchanged);
      const n = numbersOf(ctx);
      const dismissed = unchanged === undefined || t.data.drift === null ? "" : `; Drift ${n.name("drift", t.data.drift)} dismissed`;
      return text(`Task ${n.name("task", t.id)} is now ${t.data.column}${dismissed}`, { id: t.id, number: n.label("task", t.id), column: t.data.column, ...(unchanged === undefined ? {} : { unchanged: t.data.unchanged, drift: t.data.drift }) });
    } },
  { name: "task take-back", args: "<id>", summary: "Take a Task back from the agent that has it; it stays in progress", run(ctx, a) {
      const t = takeBackTask(ctx.project(), taskArg(ctx, a[0] as string));
      const n = numbersOf(ctx);
      return text(`Task ${n.name("task", t.id)} is yours again (still ${t.data.column})`, { id: t.id, number: n.label("task", t.id), column: t.data.column, agent: t.data.agent });
    } },

  { name: "drift new", args: "<title>", summary: "Record an open Drift with --happens (what the code does, in terms of behaviour) and --should (what the Model or Requirement says), both short Markdown; two to five fix options, each --option <title> followed by its --option-text <text>, the first being the one you recommend; --critical marks an urgent developer decision; --where is required and says where in the code the difference was seen (read that code before filing; files and code names go only there); --task <id> names the Task you were implementing when you found it; --not-blocking <id> (repeatable) with its --not-blocking-reason <text> names a Task that this Drift would block and leaves free, because the difference does not touch it (see drift candidates); --previous <id> names the resolved Drift this one follows, making it recurring (given by itself when --task names a fix Task); --announcement <id> names the announcement of this Drift", options: { ref, proposal: { type: "string" }, task: { type: "string" }, happens: { type: "string" }, should: { type: "string" }, option: ref, "option-text": ref, "not-blocking": ref, "not-blocking-reason": ref, critical: { type: "boolean" }, where: { type: "string" }, previous: { type: "string" }, announcement: { type: "string" } }, run(ctx, a, o) {
      const project = ctx.project();
      const note = announcementNote(project, str(o["announcement"]), "drift");
      const d = newDrift(project, { title: a[0] as string, refs: list(o["ref"]), proposal: optionalArg(ctx, str(o["proposal"]), proposalArg), origin: optionalArg(ctx, str(o["task"]), taskArg), previous: optionalArg(ctx, str(o["previous"]), driftArg), happens: str(o["happens"]) ?? "", should: str(o["should"]) ?? "", options: fixOptions(list(o["option"]), list(o["option-text"])), critical: o["critical"] === true, announcement: str(o["announcement"]), where: str(o["where"]) ?? "", notBlocking: notBlockingPairs(ctx, list(o["not-blocking"]), list(o["not-blocking-reason"])) });
      // The agent that files a Drift keeps «Dismiss Drift» from it until its turn ends: the editor learns who holds it here. Copilot chat gives its agent no identity, so its filings arrive as the editor's chat holder and only the window with an open Copilot turn holds them.
      const holder = ctx.origin.terminal ?? ctx.origin.chat;
      if (holder !== undefined) sendCoordinatorMessageSoon(project, { type: "drift-filed", root: project.root, drift: d.id, holder }, (reason) => {
        if (ctx.byAgent) process.stderr.write(`The editor did not learn that Drift ${d.id} was filed by an agent (${reason}); «Dismiss Drift» is not held for that agent's turn.\n`);
      });
      const n = numbersOf(ctx);
      const follows = d.data.previous === null ? "" : `; recurring, it follows Drift ${n.name("drift", d.data.previous)}`;
      return text(`Created Drift ${n.name("drift", d.id)} at ${d.path}${follows}${note ? `\n${note}` : ""}`, { id: d.id, number: n.label("drift", d.id), path: d.path, critical: d.data.critical, previous: d.data.previous, ...(note ? { note } : {}) });
    } },
  { name: "drift list", args: "", summary: "Open Drifts (--all for every one); --ref <ref>, repeatable, keeps only the Drifts that concern the same thing as one of the given references, as the Task blocks do", options: { all: { type: "boolean" }, ref }, run: (ctx, _a, o) => driftListView(ctx.project(), o["all"] === true, list(o["ref"])) },
  { name: "drift candidates", args: "", summary: "The Tasks a new Drift with --ref <ref> (repeatable) and --task <origin> would block, by number or identity and title, from which --not-blocking names the ones it leaves free; writes nothing", options: { ref, task: { type: "string" } }, run: (ctx, _a, o) => driftCandidatesView(ctx.project(), list(o["ref"]), str(o["task"])) },
  { name: "drift show", args: "<id>", summary: "A Drift with its references and attached Proposal", run: (ctx, a) => driftShowView(ctx.project(), getDrift(ctx.project(), a[0] as string, true)) },
  { name: "drift resolve", args: "<id>", summary: "Resolve with --fix-code, --accept-proposal or --dismiss. --fix-code takes --option <n> (the number of the chosen fix option, from 1) and the optional --note <text>; the other two take neither. --skills-dir adds the configured skills folder for the approval of --accept-proposal", options: { "fix-code": { type: "boolean" }, "accept-proposal": { type: "boolean" }, dismiss: { type: "boolean" }, option: { type: "string" }, note: { type: "string" }, "skills-dir": ref }, run(ctx, a, o) {
      const chosen = (["fix-code", "accept-proposal", "dismiss"] as const).filter((k) => o[k] === true);
      if (chosen.length !== 1) throw new UsageError("Choose exactly one of --fix-code, --accept-proposal, --dismiss");
      const project = ctx.project();
      const driftId = driftArg(ctx, a[0] as string);
      const how = chosen[0] as (typeof chosen)[number];
      const resolve = () => resolveDrift(project, driftId, how, list(o["skills-dir"]), {
        ...(o["option"] !== undefined ? { option: Number(str(o["option"])) } : {}),
        ...(o["note"] !== undefined ? { note: str(o["note"]) ?? "" } : {}),
      });
      const before = getDrift(project, driftId).data.proposal;
      const status = how === "fix-code" && before !== null ? getProposal(project, before).data.status : null;
      const setAside = status === "open" ? "rejected" : status === "draft" ? "discarded" : null;
      const d = resolve();
      const n = numbersOf(ctx);
      return text(`Drift ${n.name("drift", d.id)} resolved (${d.data.resolution})${d.data.task ? `; Task ${n.name("task", d.data.task)} created` : ""}${setAside ? `; attached Proposal ${n.name("proposal", before as string)} ${setAside}` : ""}`, { id: d.id, number: n.label("drift", d.id), resolution: d.data.resolution, task: d.data.task, option: d.data.option, note: d.data.note, ...(setAside ? { proposal: before, proposalSetAside: setAside } : {}) });
    } },

  { name: "board", args: "", summary: "To decide, To do, In progress, Done", run: (ctx) => boardView(ctx.project()) },
];

/** Bounds on the number of positional arguments, from the `args` string. */
export function arity(command: Command): { min: number; max: number } {
  const tokens = command.args.split(/\s+/).filter(Boolean);
  const min = tokens.filter((t) => t.startsWith("<")).length;
  const variadic = command.name === "search" || command.name === "task scope";
  return { min, max: variadic ? Number.POSITIVE_INFINITY : tokens.length };
}
