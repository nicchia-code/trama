import { existsSync, mkdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { TramaError, UsageError } from "../core/errors";
import { type AgentOrigin, ANNOUNCEMENT_KINDS, type AnnouncementKind, announce, announcementNote } from "../core/announcements";
import { installSkills, missingSkills, removeRetiredSkills, skillConflicts } from "./skills";
import {
  approveProposal,
  deleteInProposal,
  discardProposal,
  editInProposal,
  getProposal,
  newProposal,
  rejectProposal,
  submitProposal,
  validateProposal,
} from "../core/proposals";
import { createDefaultAreas, loadProject } from "../core/requirements";
import { syncRequirementSkills } from "../core/requirement-skills";
import {
  findProject,
  TRAMA_DIR,
  loadModel,
  type Project,
  projectAt,
  requirementsDir,
  writeFileEnsuringDir,
} from "../core/store";
import type { Model } from "../core/types";
import { rewriteNumberedCards } from "../core/rewrite-ids";
import { getDrift, getTask, moveTask, newDrift, newTask, replaceDriftProposal, resolveDrift, takeBackTask } from "../core/work";
import { withdrawFromRound } from "../core/worktree-round";
import { approvalBySwitch, readMultiBranch } from "../core/multi-branch";
import { approveWaitMs, EDITOR_UNAVAILABLE, waitApproveResult, writeApproveRequest } from "../core/approve-request";
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
  project(): Project;
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
  return {
    cwd,
    rootOption,
    byAgent,
    origin,
    project() {
      if (rootOption === undefined) return findProject(cwd);
      const project = projectAt(resolve(cwd, rootOption));
      if (!existsSync(project.dir)) throw new TramaError(`No ${TRAMA_DIR}/ in ${project.root}. Run "trama init".`);
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
      syncRequirementSkills(project, [skillsDir]);
      return text(`Created ${project.dir} with ${areas.length} Requirement Areas\nInstalled ${skills.length} skill files in ${skillsDir}`, { path: project.dir, skillsDir, skills, areas });
    },
  },
  {
    name: "skills update",
    args: "",
    summary: "Install this version's agent skills into a project (--skills-dir, default .agents/skills), add the starting Requirement Areas if the project has none, and regenerate the trama-req-* skills",
    options: { "skills-dir": { type: "string" } },
    run(ctx, _a, o) {
      const project = ctx.project();
      const skillsDir = resolve(project.root, str(o["skills-dir"]) ?? ".agents/skills");
      const changed = skillConflicts(skillsDir).concat(missingSkills(skillsDir));
      installSkills(skillsDir);
      const removed = removeRetiredSkills(project.root, [skillsDir]);
      const areas = existsSync(requirementsDir(project)) ? [] : createDefaultAreas(project);
      const generated = syncRequirementSkills(project, [skillsDir]);
      const lines = [
        changed.length === 0 ? `Skills in ${skillsDir} are already up to date.` : `Updated ${changed.length} skill file(s) in ${skillsDir}:\n${changed.map((c) => `- ${c}`).join("\n")}`,
        removed.length > 0 ? `Deleted the retired trama-fix skill: ${removed.join(", ")}` : "",
        areas.length > 0 ? `Created ${areas.length} Requirement Areas in ${requirementsDir(project)}: ${areas.join(", ")}` : "",
        generated.length > 0 ? `Regenerated ${generated.length} Requirement skill(s):\n${generated.map((c) => `- ${c}`).join("\n")}` : "",
      ];
      return text(lines.filter(Boolean).join("\n"), { skillsDir, changed, removed, areas, generated });
    },
  },

  {
    name: "ids rewrite",
    args: "",
    summary: "Give every numbered Proposal, Task and Drift its own identity, keeping number order. Refused while a worktree round is open, when two cards of one kind share a number, or when a new identity would collide. Does nothing when none are numbered",
    developerOnly: true,
    run(ctx) {
      const rewritten = rewriteNumberedCards(ctx.project());
      if (rewritten.length === 0) return text("No numbered Proposal, Task or Drift to rewrite.");
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
  { name: "analyze", args: "[machine]", summary: "Warnings: unreachable States, dead ends, Events nobody receives", run: (ctx, a) => analyzeView(loadModel(ctx.project()), a[0]) },
  { name: "search", args: "<text>", summary: "Search names and prose of the whole Model and its Requirements", run: (ctx, a) => searchView(loadProject(ctx.project()), a.join(" ")) },
  {
    name: "validate",
    args: "",
    summary: "Check the Model's and Requirements' internal consistency (never the code)",
    options: { proposal: { type: "string" } },
    run(ctx, _a, o) {
      const project = ctx.project();
      const id = str(o["proposal"]);
      if (id === undefined) return validateView(loadProject(project).diagnostics, "The Model and its Requirements");
      const proposal = getProposal(project, id, true);
      return validateView(validateProposal(project, proposal), `The Model and its Requirements with Proposal ${proposal.id} applied`);
    },
  },

  { name: "announce", args: "<kind> <title>", summary: "Say that you are about to create a card, so the Board shows a ghost of it: kind is proposal, task or drift. Prints the announcement ID; pass it as --announcement when you create the card", run(ctx, a) {
      const kind = a[0] as string;
      if (!(ANNOUNCEMENT_KINDS as readonly string[]).includes(kind)) throw new UsageError(`The kind must be one of ${ANNOUNCEMENT_KINDS.join(", ")}, not "${kind}"`);
      const announcement = announce(ctx.project(), { kind: kind as AnnouncementKind, title: a[1] as string, ...ctx.origin });
      return text(announcement.id, { id: announcement.id, kind: announcement.kind, title: announcement.title });
    } },
  { name: "proposal new", args: "<title>", summary: "Create a Draft Proposal (--requires <id> for dependencies; --import for existing code; --announcement <id> names the announcement of this Proposal; --request <id> binds it to the written design request it comes from); submit when finished", options: { body: { type: "string" }, requires: ref, import: { type: "boolean" }, announcement: { type: "string" }, request: { type: "string" } }, run(ctx, a, o) {
      const project = ctx.project();
      const note = announcementNote(project, str(o["announcement"]), "proposal");
      const request = str(o["request"]);
      const p = newProposal(project, a[0] as string, str(o["body"]), { requires: list(o["requires"]).map((id) => proposalArg(ctx, id)), kind: o["import"] === true ? "import" : "change", announcement: str(o["announcement"]), origin: ctx.origin, request });
      const requestNote = request !== undefined && p.data.request === null ? `Design request ${request} was not found; the Proposal is not bound to any request.` : "";
      const notes = [note, requestNote].filter(Boolean).join("\n");
      return text(`Created Draft Proposal ${p.id} at ${p.dir}. Submit it when finished.${notes ? `\n${notes}` : ""}`, { id: p.id, path: p.dir, status: p.data.status, request: p.data.request, ...(note ? { note } : {}), ...(requestNote ? { requestNote } : {}) });
    } },
  { name: "proposal edit", args: "<id> <model-path>", summary: "Make a Model file editable inside a Proposal; prints the path to edit", run(ctx, a) {
      const project = ctx.project();
      const id = proposalArg(ctx, a[0] as string);
      const returnedToDraft = getProposal(project, id).data.status === "open";
      const path = editInProposal(project, id, a[1] as string);
      return text(`${path}${returnedToDraft ? "\nProposal returned to Draft; submit it again when finished." : ""}`, { path, status: "draft", returnedToDraft });
    } },
  { name: "proposal delete", args: "<id> <model-path>", summary: "Mark a Model file for deletion in a Proposal", run(ctx, a) {
      const project = ctx.project();
      const id = proposalArg(ctx, a[0] as string);
      const returnedToDraft = getProposal(project, id).data.status === "open";
      deleteInProposal(project, id, a[1] as string);
      return text(`Marked ${a[1]} for deletion in Proposal ${id}.${returnedToDraft ? " Proposal returned to Draft; submit it again when finished." : ""}`, { status: "draft", returnedToDraft });
    } },
  { name: "proposal submit", args: "<id>", summary: "Hand a valid Draft over to the developer", run(ctx, a) {
      const p = submitProposal(ctx.project(), proposalArg(ctx, a[0] as string));
      const consumed = p.requestConsumed ? `\nDeleted design request ${p.data.request}: it is now consumed.` : "";
      return text(`Submitted Proposal ${p.id} for review${consumed}`, { id: p.id, status: p.data.status, request: p.data.request, requestConsumed: p.requestConsumed });
    } },
  { name: "proposal discard", args: "<id>", summary: "Discard a Draft the agent never finished", developerOnly: true, run(ctx, a) {
      const p = discardProposal(ctx.project(), proposalArg(ctx, a[0] as string));
      return text(`Discarded Proposal ${p.id}`, { id: p.id, status: p.data.status });
    } },
  { name: "proposal show", args: "<id>", summary: "A Proposal: staleness, structural changes, validation", run: (ctx, a) => proposalShowView(ctx.project(), getProposal(ctx.project(), a[0] as string, true)) },
  { name: "proposal list", args: "", summary: "Draft and open Proposals (--all for every one)", options: { all: { type: "boolean" } }, run: (ctx, _a, o) => proposalListView(ctx.project(), o["all"] === true) },
  { name: "proposal approve", args: "<id>", summary: "Accept an open Proposal. Off or unreadable applies it in this folder; on asks the open editor to run it in a worktree, as the panel does (--skills-dir adds the configured skills folder when it is applied here)", developerOnly: true, options: { "skills-dir": ref }, run(ctx, a, o) {
      const project = ctx.project();
      const id = proposalArg(ctx, a[0] as string);
      const skillsDirs = list(o["skills-dir"]);
      const decision = approvalBySwitch(readMultiBranch(project));
      if (decision.route === "folder") {
        const p = approveProposal(project, id, skillsDirs);
        const line = `Approved Proposal ${p.id}`;
        return text(decision.notice ? `${decision.notice}\n${line}` : line, { id: p.id, status: p.data.status, ...(decision.notice ? { notice: decision.notice } : {}) });
      }
      const request = writeApproveRequest(project, id, skillsDirs);
      const result = waitApproveResult(project, request.nonce, approveWaitMs());
      if (!result) throw new TramaError(EDITOR_UNAVAILABLE);
      if (!result.ok) throw new TramaError(result.message);
      return text(result.message, { id, worktree: true });
    } },
  { name: "proposal reject", args: "<id>", summary: "Reject a Proposal, optionally with feedback for the agent", developerOnly: true, options: { feedback: { type: "string" } }, run(ctx, a, o) {
      const p = rejectProposal(ctx.project(), proposalArg(ctx, a[0] as string), str(o["feedback"]));
      return text(`Rejected Proposal ${p.id}`, { id: p.id, status: p.data.status });
    } },
  { name: "proposal withdraw", args: "<id>", summary: "Remove one Proposal from the worktree round, before the round starts merging", developerOnly: true, run(ctx, a) {
      const id = proposalArg(ctx, a[0] as string);
      const { remaining } = withdrawFromRound(ctx.project(), id);
      const left = remaining === 0 ? "There is no round left." : `${remaining} ${remaining === 1 ? "Proposal remains" : "Proposals remain"} in the round.`;
      return text(`Removed Proposal ${id} from the round. It is open again. ${left}`, { id, remaining });
    } },

  { name: "task new", args: "<title>", summary: "Create a Task in 'todo' (--ref … or --technical; --proposal <id> links it to the design it comes from; --announcement <id> names the announcement of this Task)", options: { ref, technical: { type: "boolean" }, drift: { type: "string" }, proposal: { type: "string" }, body: { type: "string" }, announcement: { type: "string" } }, run(ctx, a, o) {
      const project = ctx.project();
      const note = announcementNote(project, str(o["announcement"]), "task");
      const t = newTask(project, { title: a[0] as string, refs: list(o["ref"]), technical: o["technical"] === true, drift: optionalArg(ctx, str(o["drift"]), driftArg), proposal: optionalArg(ctx, str(o["proposal"]), proposalArg), body: str(o["body"]), announcement: str(o["announcement"]) });
      return text(`Created Task ${t.id} at ${t.path}${note ? `\n${note}` : ""}`, { id: t.id, path: t.path, ...(note ? { note } : {}) });
    } },
  { name: "task list", args: "", summary: "Tasks grouped by column", options: { column: { type: "string" } }, run: (ctx, _a, o) => taskListView(ctx.project(), str(o["column"])) },
  { name: "task next", args: "", summary: "The next runnable Task (in To do, not blocked, oldest in creation order), moving nothing; --proposal <id> considers only the Tasks of that design. When none is runnable it says so and lists the Tasks in To do with what blocks them", options: { proposal: { type: "string" } }, run: (ctx, _a, o) => taskNextView(ctx.project(), optionalArg(ctx, str(o["proposal"]), proposalArg)) },
  { name: "task show", args: "<id>", summary: "A Task with the current Model text of its references", run: (ctx, a) => taskShowView(ctx.project(), getTask(ctx.project(), a[0] as string, true)) },
  { name: "task move", args: "<id> <column>", summary: "Move a Task to todo, doing or done", run(ctx, a) {
      const t = moveTask(ctx.project(), taskArg(ctx, a[0] as string), a[1] as string, ctx.byAgent ? "agent" : "developer");
      return text(`Task ${t.id} is now ${t.data.column}`, { id: t.id, column: t.data.column });
    } },
  { name: "task take-back", args: "<id>", summary: "Take a Task back from the agent that has it; it stays in progress", developerOnly: true, run(ctx, a) {
      const t = takeBackTask(ctx.project(), taskArg(ctx, a[0] as string));
      return text(`Task ${t.id} is yours again (still ${t.data.column})`, { id: t.id, column: t.data.column, agent: t.data.agent });
    } },

  { name: "drift new", args: "<title>", summary: "Record an open Drift with --happens (what the code does, in terms of behaviour) and --should (what the Model or Requirement says), both short Markdown; two to five fix options, each --option <title> followed by its --option-text <text>, the first being the one you recommend; --where (optional) says where in the code it was seen, the only place for files and code names; --task <id> names the Task you were implementing when you found it; --announcement <id> names the announcement of this Drift", options: { ref, proposal: { type: "string" }, task: { type: "string" }, happens: { type: "string" }, should: { type: "string" }, option: ref, "option-text": ref, where: { type: "string" }, announcement: { type: "string" } }, run(ctx, a, o) {
      const project = ctx.project();
      const note = announcementNote(project, str(o["announcement"]), "drift");
      const d = newDrift(project, { title: a[0] as string, refs: list(o["ref"]), proposal: optionalArg(ctx, str(o["proposal"]), proposalArg), origin: optionalArg(ctx, str(o["task"]), taskArg), happens: str(o["happens"]) ?? "", should: str(o["should"]) ?? "", options: fixOptions(list(o["option"]), list(o["option-text"])), announcement: str(o["announcement"]), ...(o["where"] !== undefined ? { where: str(o["where"]) ?? "" } : {}) });
      return text(`Created Drift ${d.id} at ${d.path}${note ? `\n${note}` : ""}`, { id: d.id, path: d.path, ...(note ? { note } : {}) });
    } },
  { name: "drift list", args: "", summary: "Open Drifts (--all for every one)", options: { all: { type: "boolean" } }, run: (ctx, _a, o) => driftListView(ctx.project(), o["all"] === true) },
  { name: "drift show", args: "<id>", summary: "A Drift with its references and attached Proposal", run: (ctx, a) => driftShowView(ctx.project(), getDrift(ctx.project(), a[0] as string, true)) },
  { name: "drift resolve", args: "<id>", summary: "Resolve with --fix-code, --accept-proposal or --dismiss. --fix-code takes --option <n> (the number of the chosen fix option, from 1) and the optional --note <text>; the other two take neither. --skills-dir adds the configured skills folder for the approval of --accept-proposal", developerOnly: true, options: { "fix-code": { type: "boolean" }, "accept-proposal": { type: "boolean" }, dismiss: { type: "boolean" }, option: { type: "string" }, note: { type: "string" }, "skills-dir": ref }, run(ctx, a, o) {
      const chosen = (["fix-code", "accept-proposal", "dismiss"] as const).filter((k) => o[k] === true);
      if (chosen.length !== 1) throw new UsageError("Choose exactly one of --fix-code, --accept-proposal, --dismiss");
      const d = resolveDrift(ctx.project(), driftArg(ctx, a[0] as string), chosen[0] as (typeof chosen)[number], list(o["skills-dir"]), {
        ...(o["option"] !== undefined ? { option: Number(str(o["option"])) } : {}),
        ...(o["note"] !== undefined ? { note: str(o["note"]) ?? "" } : {}),
      });
      return text(`Drift ${d.id} resolved (${d.data.resolution})${d.data.task ? `; Task ${d.data.task} created` : ""}`, { id: d.id, resolution: d.data.resolution, task: d.data.task, option: d.data.option, note: d.data.note });
    } },
  { name: "drift replace-proposal", args: "<id>", summary: "Attach a newer Proposal (--proposal <id>) to an open Drift in place of its stale one, which is rejected", options: { proposal: { type: "string" } }, run(ctx, a, o) {
      const id = driftArg(ctx, a[0] as string);
      const old = getDrift(ctx.project(), id).data.proposal;
      const d = replaceDriftProposal(ctx.project(), id, proposalArg(ctx, required(str(o["proposal"]), "proposal")));
      return text(`Drift ${d.id} now has Proposal ${d.data.proposal}; Proposal ${old} was rejected as replaced`, { id: d.id, proposal: d.data.proposal, replaced: old });
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
