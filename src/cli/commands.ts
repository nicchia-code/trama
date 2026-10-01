import { existsSync, mkdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { TramaError, UsageError } from "../core/errors";
import { installSkills, missingSkills, skillConflicts } from "./skills";
import {
  approveProposal,
  deleteInProposal,
  editInProposal,
  getProposal,
  newProposal,
  rejectProposal,
  validateProposal,
} from "../core/proposals";
import {
  findProject,
  TRAMA_DIR,
  loadModel,
  type Project,
  projectAt,
  writeFileEnsuringDir,
} from "../core/store";
import { getDrift, getTask, moveTask, newDrift, newTask, resolveDrift } from "../core/work";
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
import type { Result } from "./result";
import {
  boardView,
  driftListView,
  driftShowView,
  proposalListView,
  proposalShowView,
  taskListView,
  taskShowView,
} from "./work";

export type OptionSpec = { type: "string" | "boolean"; multiple?: boolean };
export type Values = Record<string, string | boolean | (string | boolean)[] | undefined>;

export interface Context {
  cwd: string;
  rootOption?: string;
  project(): Project;
}

export interface Command {
  name: string;
  /** Positional arguments: `<required>` and `[optional]`. */
  args: string;
  summary: string;
  /** Refused when run by an agent (the `TRAMA_AGENT` environment variable is set). */
  developerOnly?: true;
  options?: Record<string, OptionSpec>;
  run(ctx: Context, args: string[], opts: Values): Result;
}

const ref: OptionSpec = { type: "string", multiple: true };
const str = (v: Values[string]): string | undefined => (typeof v === "string" ? v : undefined);
const list = (v: Values[string]): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

function text(md: string, json: unknown = { message: md }): Result {
  return { md, json };
}

function required(value: string | undefined, flag: string): string {
  if (value === undefined) throw new UsageError(`Missing required option --${flag}`);
  return value;
}

export function makeContext(cwd: string, rootOption?: string): Context {
  return {
    cwd,
    rootOption,
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
      const skills = installSkills(skillsDir);
      return text(`Created ${project.dir}\nInstalled ${skills.length} skill files in ${skillsDir}`, { path: project.dir, skillsDir, skills });
    },
  },
  {
    name: "skills update",
    args: "",
    summary: "Install this version's agent skills into a project (--skills-dir, default .agents/skills), replacing older copies",
    options: { "skills-dir": { type: "string" } },
    run(ctx, _a, o) {
      const project = ctx.project();
      const skillsDir = resolve(project.root, str(o["skills-dir"]) ?? ".agents/skills");
      const changed = skillConflicts(skillsDir).concat(missingSkills(skillsDir));
      installSkills(skillsDir);
      const md = changed.length === 0 ? `Skills in ${skillsDir} are already up to date.` : `Updated ${changed.length} skill file(s) in ${skillsDir}:\n${changed.map((c) => `- ${c}`).join("\n")}`;
      return text(md, { skillsDir, changed });
    },
  },

  { name: "system", args: "", summary: "System description, Actors and Features", run: (ctx) => systemView(loadModel(ctx.project())) },
  { name: "feature", args: "<feature>", summary: "A Feature: its Machines and the Events reaching them", run: (ctx, a) => featureView(loadModel(ctx.project()), a[0] as string) },
  { name: "machine", args: "<machine>", summary: "A Machine: State tree, Transitions, Events and who receives them", run: (ctx, a) => machineView(loadModel(ctx.project()), a[0] as string) },
  { name: "state", args: "<machine/State>", summary: "A State: sub-States, outgoing (incl. inherited) and incoming Transitions", run: (ctx, a) => stateView(loadModel(ctx.project()), a[0] as string) },
  { name: "event", args: "<owner.EVENT>", summary: "An Event: owner and every Transition that reacts to it", run: (ctx, a) => eventView(loadModel(ctx.project()), a[0] as string) },
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
  { name: "search", args: "<text>", summary: "Search names and prose of the whole Model", run: (ctx, a) => searchView(loadModel(ctx.project()), a.join(" ")) },
  {
    name: "validate",
    args: "",
    summary: "Check the Model's internal consistency (never the code)",
    options: { proposal: { type: "string" } },
    run(ctx, _a, o) {
      const project = ctx.project();
      const id = str(o["proposal"]);
      if (id === undefined) return validateView(loadModel(project).diagnostics, "The Model");
      const proposal = getProposal(project, id);
      return validateView(validateProposal(project, proposal), `The Model with Proposal ${proposal.id} applied`);
    },
  },

  { name: "proposal new", args: "<title>", summary: "Open a new Proposal", options: { body: { type: "string" } }, run(ctx, a, o) {
      const p = newProposal(ctx.project(), a[0] as string, str(o["body"]));
      return text(`Created Proposal ${p.id} at ${p.dir}`, { id: p.id, path: p.dir });
    } },
  { name: "proposal edit", args: "<id> <model-path>", summary: "Make a Model file editable inside a Proposal; prints the path to edit", run(ctx, a) {
      const path = editInProposal(ctx.project(), a[0] as string, a[1] as string);
      return text(path, { path });
    } },
  { name: "proposal delete", args: "<id> <model-path>", summary: "Mark a Model file for deletion in a Proposal", run(ctx, a) {
      deleteInProposal(ctx.project(), a[0] as string, a[1] as string);
      return text(`Marked ${a[1]} for deletion in Proposal ${a[0]}`);
    } },
  { name: "proposal show", args: "<id>", summary: "A Proposal: staleness, structural changes, validation", run: (ctx, a) => proposalShowView(ctx.project(), getProposal(ctx.project(), a[0] as string)) },
  { name: "proposal list", args: "", summary: "Open Proposals (--all for every one)", options: { all: { type: "boolean" } }, run: (ctx, _a, o) => proposalListView(ctx.project(), o["all"] === true) },
  { name: "proposal approve", args: "<id>", summary: "Apply a Proposal to the Model", developerOnly: true, run(ctx, a) {
      const p = approveProposal(ctx.project(), a[0] as string);
      return text(`Approved Proposal ${p.id}`, { id: p.id, status: p.data.status });
    } },
  { name: "proposal reject", args: "<id>", summary: "Reject a Proposal with feedback", developerOnly: true, options: { feedback: { type: "string" } }, run(ctx, a, o) {
      const p = rejectProposal(ctx.project(), a[0] as string, required(str(o["feedback"]), "feedback"));
      return text(`Rejected Proposal ${p.id}`, { id: p.id, status: p.data.status });
    } },

  { name: "task new", args: "<title>", summary: "Create a Task in 'todo' (--ref … or --technical)", options: { ref, technical: { type: "boolean" }, drift: { type: "string" }, body: { type: "string" } }, run(ctx, a, o) {
      const t = newTask(ctx.project(), { title: a[0] as string, refs: list(o["ref"]), technical: o["technical"] === true, drift: str(o["drift"]), body: str(o["body"]) });
      return text(`Created Task ${t.id} at ${t.path}`, { id: t.id, path: t.path });
    } },
  { name: "task list", args: "", summary: "Tasks grouped by column", options: { column: { type: "string" } }, run: (ctx, _a, o) => taskListView(ctx.project(), str(o["column"])) },
  { name: "task show", args: "<id>", summary: "A Task with the current Model text of its references", run: (ctx, a) => taskShowView(ctx.project(), getTask(ctx.project(), a[0] as string)) },
  { name: "task move", args: "<id> <column>", summary: "Move a Task to todo, doing or done", run(ctx, a) {
      const t = moveTask(ctx.project(), a[0] as string, a[1] as string);
      return text(`Task ${t.id} is now ${t.data.column}`, { id: t.id, column: t.data.column });
    } },

  { name: "drift new", args: "<title>", summary: "Record an open Drift", options: { ref, proposal: { type: "string" }, body: { type: "string" } }, run(ctx, a, o) {
      const d = newDrift(ctx.project(), { title: a[0] as string, refs: list(o["ref"]), proposal: str(o["proposal"]), body: str(o["body"]) });
      return text(`Created Drift ${d.id} at ${d.path}`, { id: d.id, path: d.path });
    } },
  { name: "drift list", args: "", summary: "Open Drifts (--all for every one)", options: { all: { type: "boolean" } }, run: (ctx, _a, o) => driftListView(ctx.project(), o["all"] === true) },
  { name: "drift show", args: "<id>", summary: "A Drift with its references and attached Proposal", run: (ctx, a) => driftShowView(ctx.project(), getDrift(ctx.project(), a[0] as string)) },
  { name: "drift resolve", args: "<id>", summary: "Resolve with --fix-code, --accept-proposal or --dismiss", developerOnly: true, options: { "fix-code": { type: "boolean" }, "accept-proposal": { type: "boolean" }, dismiss: { type: "boolean" } }, run(ctx, a, o) {
      const chosen = (["fix-code", "accept-proposal", "dismiss"] as const).filter((k) => o[k] === true);
      if (chosen.length !== 1) throw new UsageError("Choose exactly one of --fix-code, --accept-proposal, --dismiss");
      const d = resolveDrift(ctx.project(), a[0] as string, chosen[0] as (typeof chosen)[number]);
      return text(`Drift ${d.id} resolved (${d.data.resolution})${d.data.task ? `; Task ${d.data.task} created` : ""}`, { id: d.id, resolution: d.data.resolution, task: d.data.task });
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
