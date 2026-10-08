import { existsSync, mkdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { TramaError, UsageError } from "../core/errors";
import { type AgentOrigin, ANNOUNCEMENT_KINDS, type AnnouncementKind, announce, announcementNote, CHECK_PHASES, type CheckPhase, changeCheckPhase, deliverCard, finishCheck } from "../core/announcements";
import { installOmpAgents, installSkills, missingSkills, removeRetiredSkills, skillConflicts } from "./skills";
import {
  approveProposal,
  deleteInProposal,
  discardProposal,
  editInProposal,
  getProposal,
  newProposal,
  rejectProposal,
  proposalWarnings,
  submitProposal,
  validateProposal,
  warningsText,
} from "../core/proposals";
import { convertSingleFileAreas, createDefaultAreas, largeFragmentMessage, largeFragments, loadProject } from "../core/requirements";
import { describeRequirementSkillSync, syncRequirementSkills } from "../core/requirement-skills";
import { syncShortNumbers } from "../core/short-numbers";
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
import { rewriteNumberedCards } from "../core/rewrite-ids";
import { type Drift, getDrift, getTask, moveTask, newDrift, newTask, replaceDriftProposal, requireNotAttached, resolveDrift, takeBackTask } from "../core/work";
import { writeApprovedNotice } from "../core/approve-request";
import { approvedScope } from "../core/scope";
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
  project(assignNumbers?: boolean): Project;
}

export interface Command {
  name: string;
  /** Positional arguments: `<required>` and `[optional]`. */
  args: string;
  summary: string;
  /** Refused when run by an agent (`TRAMA_AGENT` or `CURSOR_AGENT` is set). */
  developerOnly?: true;
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
const list = (v: Values[string]): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
/** A command argument: digits cite only a numbered card, and a unique prefix is enough. */
const proposalArg = (ctx: Context, id: string) => getProposal(ctx.project(), id, true).id;
const taskArg = (ctx: Context, id: string) => getTask(ctx.project(), id, true).id;
const driftArg = (ctx: Context, id: string) => getDrift(ctx.project(), id, true).id;
const optionalArg = (ctx: Context, id: string | undefined, resolve: (ctx: Context, id: string) => string) => (id === undefined ? undefined : resolve(ctx, id));
/** The short numbers of this working copy as they are now, read after a command has acted so a card it closed is already written by its identity. */
const numbersOf = (ctx: Context) => syncShortNumbers(ctx.project());
/** Each `--option <title>` is followed by its `--option-text <text>`: the n-th title goes with the n-th text. A title without text, or text without a title, is left empty for the Drift to refuse. */
const fixOptions = (titles: string[], texts: string[]) => Array.from({ length: Math.max(titles.length, texts.length) }, (_, i) => ({ title: titles[i] ?? "", text: texts[i] ?? "" }));

function text(md: string, json: unknown = { message: md }): Result {
  return { md, json };
}

function required(value: string | undefined, flag: string): string {
  if (value === undefined) throw new UsageError(`Missing required option --${flag}`);
  return value;
}

export function makeContext(cwd: string, rootOption?: string, byAgent = false, origin: AgentOrigin = {}): Context {
  let numbered = false;
  return {
    cwd,
    rootOption,
    byAgent,
    origin,
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
    summary: "Create .trama/ and install the agent skills (--skills-dir, default .agents/skills; .claude/skills for Claude Code; --force overwrites customised skills)",
    options: { "skills-dir": { type: "string" }, force: { type: "boolean" } },
    run(ctx, _a, o) {
      const root = resolve(ctx.cwd, ctx.rootOption ?? ".");
      const project = projectAt(root);
      if (existsSync(project.dir)) throw new TramaError(`${project.dir} already exists`);
      const skillsDir = resolve(root, str(o["skills-dir"]) ?? ".agents/skills");
      const conflicts = o["force"] === true ? [] : skillConflicts(skillsDir);
      if (conflicts.length > 0)
        throw new TramaError(`Refusing to overwrite skill files that differ from Trama's:\n${conflicts.map((c) => `- ${c}`).join("\n")}\nNothing was created. Move them, pick another --skills-dir, or pass --force.`);
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
      const areas = existsSync(requirementsDir(project)) ? [] : createDefaultAreas(project);
      const conversion = convertSingleFileAreas(project);
      const generated = syncRequirementSkills(project, [skillsDir]);
      const lines = [
        changed.length === 0 ? `Skills in ${skillsDir} are already up to date.` : `Updated ${changed.length} skill file(s) in ${skillsDir}:\n${changed.map((c) => `- ${c}`).join("\n")}`,
        removed.length > 0 ? `Deleted the retired trama-fix skill: ${removed.join(", ")}` : "",
        `Installed omp's sub-agent definitions: ${agents.join(", ")}`,
        areas.length > 0 ? `Created ${areas.length} Requirement Areas in ${requirementsDir(project)}: ${areas.join(", ")}` : "",
        conversion.converted.length > 0
          ? `Converted ${conversion.converted.length} single-file Requirement Area(s) to Area folders (area.md, and main.md with the sections): ${conversion.converted.join(", ")}`
          : "",
        conversion.skipped.length > 0 ? `Left ${conversion.skipped.length} single-file Requirement Area(s) as they were: ${conversion.skipped.map((s) => `${s.id} (${s.reason})`).join(", ")}` : "",
        describeRequirementSkillSync(generated),
      ];
      return text(lines.filter(Boolean).join("\n"), { skillsDir, changed, removed, agents, areas, conversion, generated });
    },
  },

  {
    name: "ids rewrite",
    args: "",
    summary: "Give every numbered Proposal, Task and Drift its own identity, keeping number order. Refused when two cards of one kind share a number, or when a new identity would collide. Does nothing when none are numbered",
    developerOnly: true,
    run(ctx) {
      const project = ctx.project(false);
      const rewritten = rewriteNumberedCards(project);
      if (rewritten.length === 0) return text("No numbered Proposal, Task or Drift to rewrite.");
      syncShortNumbers(project);
      const lines = rewritten.map((card) => `- ${card.kind} ${card.from} → ${card.to}`);
      return text(`Rewrote ${rewritten.length} numbered ${rewritten.length === 1 ? "card" : "cards"}.\n${lines.join("\n")}`, { rewritten });
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
      return validateView(validateProposal(project, proposal), `The Model and its Requirements with Proposal ${numbersOf(ctx).name("proposal", proposal.id)} applied`, proposalWarnings(project, proposal));
    },
  },

  { name: "announce", args: "<kind> <title>", summary: "Say that you are about to create a card, so the Board shows a ghost of it: kind is proposal, task or drift. Prints the announcement ID; pass it as --announcement when you create the card. Kind check (with --phase verifying or scanning) announces a final check or a scan instead, shown in In progress until announce done", options: { phase: { type: "string" } }, run(ctx, a, o) {
      const kind = a[0] as string;
      if (!(ANNOUNCEMENT_KINDS as readonly string[]).includes(kind)) throw new UsageError(`The kind must be one of ${ANNOUNCEMENT_KINDS.join(", ")}, not "${kind}"`);
      const phase = str(o["phase"]);
      if (kind === "check" && phase === undefined) throw new UsageError(`A check needs --phase ${CHECK_PHASES.join(" or ")}`);
      if (kind !== "check" && phase !== undefined) throw new UsageError("--phase is only for a check");
      if (phase !== undefined && !(CHECK_PHASES as readonly string[]).includes(phase)) throw new UsageError(`--phase must be one of ${CHECK_PHASES.join(", ")}, not "${phase}"`);
      const announcement = announce(ctx.project(), { kind: kind as AnnouncementKind, title: a[1] as string, ...(phase ? { phase: phase as CheckPhase } : {}), ...ctx.origin });
      return text(announcement.id, { id: announcement.id, kind: announcement.kind, title: announcement.title, ...(announcement.phase ? { phase: announcement.phase } : {}) });
    } },
  { name: "announce phase", args: "<id> <phase>", summary: "Move a check you announced from verifying to scanning, when the scan of the whole System starts", run(ctx, a) {
      const id = a[0] as string;
      if (a[1] !== "scanning") throw new UsageError(`A check can only move to scanning, not "${a[1]}"`);
      const outcome = changeCheckPhase(ctx.project(), id, "scanning");
      const md = outcome === "changed" ? `Check ${id} is now scanning` : outcome === "unchanged" ? `Check ${id} is already scanning; nothing changed.` : `No check "${id}" was found (unknown, already finished or withdrawn, or not a check); nothing changed.`;
      return text(md, { id, outcome });
    } },
  { name: "announce done", args: "<id>", summary: "Say that a check you announced is finished, before you report: its ghost goes away with no notice", run(ctx, a) {
      const id = a[0] as string;
      const found = finishCheck(ctx.project(), id);
      return text(found ? `Check ${id} is done` : `No check "${id}" was found (unknown, already finished or withdrawn, or not a check); nothing changed.`, { id, found });
    } },
  { name: "proposal new", args: "<title>", summary: "Create a Draft Proposal (--requires <id> for dependencies; --import for existing code; --announcement <id> names the announcement of this Proposal; --request <id> binds it to the written design request it comes from); submit when finished", options: { body: { type: "string" }, requires: ref, import: { type: "boolean" }, announcement: { type: "string" }, request: { type: "string" } }, run(ctx, a, o) {
      const project = ctx.project();
      const note = announcementNote(project, str(o["announcement"]), "proposal");
      const request = str(o["request"]);
      const p = newProposal(project, a[0] as string, str(o["body"]), { requires: list(o["requires"]).map((id) => proposalArg(ctx, id)), kind: o["import"] === true ? "import" : "change", announcement: str(o["announcement"]), origin: ctx.origin, request });
      const requestNote = request !== undefined && p.data.request === null ? `Design request ${request} was not found; the Proposal is not bound to any request.` : "";
      const notes = [note, requestNote].filter(Boolean).join("\n");
      const n = numbersOf(ctx);
      return text(`Created Draft Proposal ${n.name("proposal", p.id)} at ${p.dir}. Submit it when finished.${notes ? `\n${notes}` : ""}`, { id: p.id, number: n.label("proposal", p.id), path: p.dir, status: p.data.status, request: p.data.request, ...(note ? { note } : {}), ...(requestNote ? { requestNote } : {}) });
    } },
  { name: "proposal edit", args: "<id> <model-path>", summary: "Make a Model file editable inside a Proposal; prints the path to edit", run(ctx, a) {
      const project = ctx.project();
      const id = proposalArg(ctx, a[0] as string);
      const returnedToDraft = getProposal(project, id).data.status === "open";
      const path = editInProposal(project, id, a[1] as string);
      return text(`${path}${returnedToDraft ? "\nProposal returned to Draft; submit it again when finished." : ""}`, { id, number: numbersOf(ctx).label("proposal", id), path, status: "draft", returnedToDraft });
    } },
  { name: "proposal delete", args: "<id> <model-path>", summary: "Mark a Model file for deletion in a Proposal", run(ctx, a) {
      const project = ctx.project();
      const id = proposalArg(ctx, a[0] as string);
      const returnedToDraft = getProposal(project, id).data.status === "open";
      deleteInProposal(project, id, a[1] as string);
      const n = numbersOf(ctx);
      return text(`Marked ${a[1]} for deletion in Proposal ${n.name("proposal", id)}.${returnedToDraft ? " Proposal returned to Draft; submit it again when finished." : ""}`, { id, number: n.label("proposal", id), status: "draft", returnedToDraft });
    } },
  { name: "proposal submit", args: "<id>", summary: "Hand a valid Draft over to the developer", run(ctx, a) {
      const p = submitProposal(ctx.project(), proposalArg(ctx, a[0] as string));
      const consumed = p.requestConsumed ? `\nDeleted design request ${p.data.request}: it is now consumed.` : "";
      const n = numbersOf(ctx);
      return text(`Submitted Proposal ${n.name("proposal", p.id)} for review${consumed}${warningsText(p.warnings)}`, { id: p.id, number: n.label("proposal", p.id), status: p.data.status, request: p.data.request, requestConsumed: p.requestConsumed, warnings: p.warnings });
    } },
  { name: "proposal discard", args: "<id>", summary: "Discard a Draft the agent never finished", developerOnly: true, run(ctx, a) {
      const p = discardProposal(ctx.project(), proposalArg(ctx, a[0] as string));
      const n = numbersOf(ctx);
      return text(`Discarded Proposal ${n.name("proposal", p.id)}`, { id: p.id, number: n.label("proposal", p.id), status: p.data.status });
    } },
  { name: "proposal show", args: "<id>", summary: "A Proposal: staleness, structural changes, validation", run: (ctx, a) => proposalShowView(ctx.project(), getProposal(ctx.project(), a[0] as string, true)) },
  { name: "proposal list", args: "", summary: "Draft and open Proposals (--all for every one)", options: { all: { type: "boolean" } }, run: (ctx, _a, o) => proposalListView(ctx.project(), o["all"] === true) },
  { name: "proposal approve", args: "<id>", summary: "Accept an open Proposal and apply it in this folder (--skills-dir adds the configured skills folder)", developerOnly: true, options: { "skills-dir": ref }, run(ctx, a, o) {
      const project = ctx.project();
      const id = proposalArg(ctx, a[0] as string);
      requireNotAttached(project, id);
      const { id: approved, features } = approvedScope(project, id, () => approveProposal(project, id, list(o["skills-dir"])));
      if (features.length > 0) writeApprovedNotice(project, approved);
      return text(`Approved Proposal ${numbersOf(ctx).name("proposal", approved)}`, { id: approved, number: numbersOf(ctx).label("proposal", approved), status: "approved" });
    } },
  { name: "proposal reject", args: "<id>", summary: "Reject a Proposal, optionally with feedback for the agent", developerOnly: true, options: { feedback: { type: "string" } }, run(ctx, a, o) {
      const id = proposalArg(ctx, a[0] as string);
      requireNotAttached(ctx.project(), id);
      const p = rejectProposal(ctx.project(), id, str(o["feedback"]));
      const n = numbersOf(ctx);
      return text(`Rejected Proposal ${n.name("proposal", p.id)}`, { id: p.id, number: n.label("proposal", p.id), status: p.data.status });
    } },

  { name: "task new", args: "<title>", summary: "Create a Task in 'todo' (--ref … or --technical; --proposal <id> links it to the design it comes from; --announcement <id> names the announcement of this Task)", options: { ref, technical: { type: "boolean" }, drift: { type: "string" }, proposal: { type: "string" }, body: { type: "string" }, announcement: { type: "string" } }, run(ctx, a, o) {
      const project = ctx.project();
      const note = announcementNote(project, str(o["announcement"]), "task");
      const t = newTask(project, { title: a[0] as string, refs: list(o["ref"]), technical: o["technical"] === true, drift: optionalArg(ctx, str(o["drift"]), driftArg), proposal: optionalArg(ctx, str(o["proposal"]), proposalArg), body: str(o["body"]) });
      deliverCard(project, str(o["announcement"]), "task");
      const n = numbersOf(ctx);
      return text(`Created Task ${n.name("task", t.id)} at ${t.path}${note ? `\n${note}` : ""}`, { id: t.id, number: n.label("task", t.id), path: t.path, ...(note ? { note } : {}) });
    } },
  { name: "task list", args: "", summary: "Tasks grouped by column", options: { column: { type: "string" } }, run: (ctx, _a, o) => taskListView(ctx.project(), str(o["column"])) },
  { name: "task next", args: "", summary: "The next runnable Task (in To do, not blocked, oldest in creation order), moving nothing; --proposal <id> considers only the Tasks of that design; --batch prints instead the group of a parallel run, up to four runnable Tasks that concern different things, one per line, the first being the next one. When none is runnable it says so and lists the Tasks in To do with what blocks them", options: { proposal: { type: "string" }, batch: { type: "boolean" } }, run: (ctx, _a, o) => taskNextView(ctx.project(), optionalArg(ctx, str(o["proposal"]), proposalArg), o["batch"] === true) },
  { name: "task show", args: "<id>", summary: "A Task with the current Model text of its references", run: (ctx, a) => taskShowView(ctx.project(), getTask(ctx.project(), a[0] as string, true)) },
  { name: "task move", args: "<id> <column>", summary: "Move a Task to todo, doing or done", run(ctx, a) {
      const t = moveTask(ctx.project(), taskArg(ctx, a[0] as string), a[1] as string, ctx.byAgent ? "agent" : "developer", ctx.origin);
      const n = numbersOf(ctx);
      return text(`Task ${n.name("task", t.id)} is now ${t.data.column}`, { id: t.id, number: n.label("task", t.id), column: t.data.column });
    } },
  { name: "task take-back", args: "<id>", summary: "Take a Task back from the agent that has it; it stays in progress", developerOnly: true, run(ctx, a) {
      const t = takeBackTask(ctx.project(), taskArg(ctx, a[0] as string));
      const n = numbersOf(ctx);
      return text(`Task ${n.name("task", t.id)} is yours again (still ${t.data.column})`, { id: t.id, number: n.label("task", t.id), column: t.data.column, agent: t.data.agent });
    } },

  { name: "drift new", args: "<title>", summary: "Record an open Drift with --happens (what the code does, in terms of behaviour) and --should (what the Model or Requirement says), both short Markdown; two to five fix options, each --option <title> followed by its --option-text <text>, the first being the one you recommend; --where (optional) says where in the code it was seen, the only place for files and code names; --task <id> names the Task you were implementing when you found it; --announcement <id> names the announcement of this Drift", options: { ref, proposal: { type: "string" }, task: { type: "string" }, happens: { type: "string" }, should: { type: "string" }, option: ref, "option-text": ref, where: { type: "string" }, announcement: { type: "string" } }, run(ctx, a, o) {
      const project = ctx.project();
      const note = announcementNote(project, str(o["announcement"]), "drift");
      const d = newDrift(project, { title: a[0] as string, refs: list(o["ref"]), proposal: optionalArg(ctx, str(o["proposal"]), proposalArg), origin: optionalArg(ctx, str(o["task"]), taskArg), happens: str(o["happens"]) ?? "", should: str(o["should"]) ?? "", options: fixOptions(list(o["option"]), list(o["option-text"])), announcement: str(o["announcement"]), ...(o["where"] !== undefined ? { where: str(o["where"]) ?? "" } : {}) });
      const n = numbersOf(ctx);
      return text(`Created Drift ${n.name("drift", d.id)} at ${d.path}${note ? `\n${note}` : ""}`, { id: d.id, number: n.label("drift", d.id), path: d.path, ...(note ? { note } : {}) });
    } },
  { name: "drift list", args: "", summary: "Open Drifts (--all for every one)", options: { all: { type: "boolean" } }, run: (ctx, _a, o) => driftListView(ctx.project(), o["all"] === true) },
  { name: "drift show", args: "<id>", summary: "A Drift with its references and attached Proposal", run: (ctx, a) => driftShowView(ctx.project(), getDrift(ctx.project(), a[0] as string, true)) },
  { name: "drift resolve", args: "<id>", summary: "Resolve with --fix-code, --accept-proposal or --dismiss. --fix-code takes --option <n> (the number of the chosen fix option, from 1) and the optional --note <text>; the other two take neither. --skills-dir adds the configured skills folder for the approval of --accept-proposal", developerOnly: true, options: { "fix-code": { type: "boolean" }, "accept-proposal": { type: "boolean" }, dismiss: { type: "boolean" }, option: { type: "string" }, note: { type: "string" }, "skills-dir": ref }, run(ctx, a, o) {
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
      const attached = how === "accept-proposal" ? before : null;
      const status = how === "fix-code" && before !== null ? getProposal(project, before).data.status : null;
      const setAside = status === "open" ? "rejected" : status === "draft" ? "discarded" : null;
      let d!: Drift;
      if (attached === null) d = resolve();
      else {
        const scanned = approvedScope(project, attached, () => (d = resolve()));
        if (scanned.features.length > 0) writeApprovedNotice(project, scanned.id);
      }
      const n = numbersOf(ctx);
      return text(`Drift ${n.name("drift", d.id)} resolved (${d.data.resolution})${d.data.task ? `; Task ${n.name("task", d.data.task)} created` : ""}${setAside ? `; attached Proposal ${n.name("proposal", before as string)} ${setAside}` : ""}`, { id: d.id, number: n.label("drift", d.id), resolution: d.data.resolution, task: d.data.task, option: d.data.option, note: d.data.note, ...(setAside ? { proposal: before, proposalSetAside: setAside } : {}) });
    } },
  { name: "drift replace-proposal", args: "<id>", summary: "Attach a newer Proposal (--proposal <id>) to an open Drift in place of its stale one, which is rejected", options: { proposal: { type: "string" } }, run(ctx, a, o) {
      const id = driftArg(ctx, a[0] as string);
      const old = getDrift(ctx.project(), id).data.proposal;
      const d = replaceDriftProposal(ctx.project(), id, proposalArg(ctx, required(str(o["proposal"]), "proposal")));
      const n = numbersOf(ctx);
      return text(`Drift ${n.name("drift", d.id)} now has Proposal ${n.name("proposal", d.data.proposal as string)}; Proposal ${n.name("proposal", old as string)} was rejected as replaced`, { id: d.id, number: n.label("drift", d.id), proposal: d.data.proposal, replaced: old });
    } },

  { name: "board", args: "", summary: "To decide, To do, In progress, Done", run: (ctx) => boardView(ctx.project()) },
];

/** Bounds on the number of positional arguments, from the `args` string. */
export function arity(command: Command): { min: number; max: number } {
  const tokens = command.args.split(/\s+/).filter(Boolean);
  const min = tokens.filter((t) => t.startsWith("<")).length;
  const variadic = command.name === "search";
  return { min, max: variadic ? Number.POSITIVE_INFINITY : tokens.length };
}
