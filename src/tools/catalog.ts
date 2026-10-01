import { writeFileSync } from "node:fs";
import { analyzeView, eventView, featureView, machineView, pathsView, searchView, stateView, systemView, validateView } from "../cli/explore";
import type { Result } from "../cli/result";
import { boardView, driftShowView, proposalShowView, taskShowView } from "../cli/work";
import { TramaError, UsageError } from "../core/errors";
import { deleteInProposal, editInProposal, getProposal, newProposal, validateProposal } from "../core/proposals";
import { resolveRef } from "../core/refs";
import { loadModel, type Project } from "../core/store";
import { getDrift, getTask, moveTask, newDrift, newTask } from "../core/work";
import { formatDiagnostic } from "../core/model";

/**
 * The operations an agent may perform on a Trama project, shared by the MCP server (`trama mcp`) and the VS Code
 * language-model tools. The developer's decisions (approving or rejecting a Proposal, resolving a Drift) are
 * deliberately absent: an agent using these tools cannot make them (ADR 0006).
 */
export interface ToolSpec {
  /** Unique, `snake_case`, starts with `trama_`. */
  name: string;
  title: string;
  /** What the model reads to decide when to call the tool. */
  description: string;
  /** JSON Schema of the arguments (an object). */
  inputSchema: { type: "object"; properties: Record<string, object>; required?: string[]; additionalProperties: false };
  /** Whether the tool changes files under `.trama/`. */
  writes: boolean;
  run(project: Project, input: Record<string, unknown>): string;
}

export interface ToolOutcome {
  text: string;
  isError: boolean;
}

const string = (description: string) => ({ type: "string", description });
const stringList = (description: string) => ({ type: "array", items: { type: "string" }, description });
const REF = "Element reference: `checkout` (Feature), `order` (Machine), `user` (Actor), `order/Paid` (State), `order/Paid/user.CANCEL` (Transitions on an Event), `user.CANCEL` (Event).";

function text(input: Record<string, unknown>, key: string): string {
  const v = input[key];
  if (typeof v !== "string" || v.trim() === "") throw new UsageError(`"${key}" must be a non-empty string`);
  return v;
}
function optionalText(input: Record<string, unknown>, key: string): string | undefined {
  const v = input[key];
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v !== "string") throw new UsageError(`"${key}" must be a string`);
  return v;
}
function texts(input: Record<string, unknown>, key: string): string[] {
  const v = input[key];
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.some((x) => typeof x !== "string")) throw new UsageError(`"${key}" must be a list of strings`);
  return v as string[];
}
const md = (r: Result) => r.md.replace(/\n{3,}/g, "\n\n").trimEnd();

function view(project: Project, ref: string | undefined): string {
  const model = loadModel(project);
  if (ref === undefined) return md(systemView(model));
  const el = resolveRef(model, ref);
  switch (el.kind) {
    case "feature":
      return md(featureView(model, el.feature.id));
    case "machine":
      return md(machineView(model, el.machine.id));
    case "state":
      return md(stateView(model, ref));
    case "transition":
      return md(stateView(model, `${el.machine.id}/${el.state.name}`));
    case "event":
      return md(eventView(model, ref));
    case "actor":
      return [`# ${el.actor.name} (actor \`${el.actor.id}\`)`, "", el.actor.description, "", ...el.actor.events.map((e) => md(eventView(model, `${el.actor.id}.${e.name}`)))].join("\n");
  }
}

export const TOOLS: ToolSpec[] = [
  {
    name: "trama_view",
    title: "View the Model",
    description: `Shows part of the project's Trama Model, the source of truth for how the software behaves. Without \`ref\`: the System, its Actors and Features. With \`ref\`: that element with its States, Transitions (condition and consequence in prose), Events and who receives them. ${REF}`,
    inputSchema: { type: "object", properties: { ref: string(REF) }, additionalProperties: false },
    writes: false,
    run: (p, i) => view(p, optionalText(i, "ref")),
  },
  {
    name: "trama_paths",
    title: "Paths between States",
    description: "Lists the simple paths between two States of one Machine, shortest first, with the Event and prose of each step.",
    inputSchema: {
      type: "object",
      properties: { machine: string("Machine ID, e.g. `order`"), from: string("State name"), to: string("State name"), max: { type: "integer", minimum: 1, description: "Most paths to list (default 20)" } },
      required: ["machine", "from", "to"],
      additionalProperties: false,
    },
    writes: false,
    run: (p, i) => {
      const max = i["max"] === undefined ? 20 : Number(i["max"]);
      if (!Number.isInteger(max) || max < 1) throw new UsageError('"max" must be a positive integer');
      return md(pathsView(loadModel(p), text(i, "machine"), text(i, "from"), text(i, "to"), max));
    },
  },
  {
    name: "trama_analyze",
    title: "Analyze the Model",
    description: "Warnings about the Model: unreachable States, non-final States with no way out, Events nobody receives. For one Machine or the whole System.",
    inputSchema: { type: "object", properties: { machine: string("Machine ID; omit for the whole System") }, additionalProperties: false },
    writes: false,
    run: (p, i) => md(analyzeView(loadModel(p), optionalText(i, "machine"))),
  },
  {
    name: "trama_search",
    title: "Search the Model",
    description: "Case-insensitive search over names and prose of the whole Model; each hit with its element reference.",
    inputSchema: { type: "object", properties: { text: string("Text to look for") }, required: ["text"], additionalProperties: false },
    writes: false,
    run: (p, i) => md(searchView(loadModel(p), text(i, "text"))),
  },
  {
    name: "trama_board",
    title: "Board",
    description: "The work board: open Proposals and Drifts waiting for the developer's decision, then Tasks to do, in progress and done.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    writes: false,
    run: (p) => md(boardView(p)),
  },
  {
    name: "trama_validate",
    title: "Validate",
    description: "Checks the Model's internal consistency, or the Model with an open Proposal applied. Never looks at code.",
    inputSchema: { type: "object", properties: { proposal: string("Proposal ID; omit to validate the current Model") }, additionalProperties: false },
    writes: false,
    run: (p, i) => {
      const id = optionalText(i, "proposal");
      if (id === undefined) return md(validateView(loadModel(p).diagnostics, "The Model"));
      const proposal = getProposal(p, id);
      return md(validateView(validateProposal(p, proposal), `The Model with Proposal ${proposal.id} applied`));
    },
  },
  {
    name: "trama_proposal_new",
    title: "Open a Proposal",
    description: "Opens a new Proposal: the only way to change the Model. Then write each changed Model file with trama_proposal_write. Only the developer can approve it.",
    inputSchema: { type: "object", properties: { title: string("Short title"), body: string("Why the change is needed") }, required: ["title"], additionalProperties: false },
    writes: true,
    run: (p, i) => {
      const proposal = newProposal(p, text(i, "title"), optionalText(i, "body") ?? "");
      return `Opened Proposal ${proposal.id}. Write each new or changed Model file with trama_proposal_write.`;
    },
  },
  {
    name: "trama_proposal_write",
    title: "Write a Model file in a Proposal",
    description: "Writes the complete new version of one Model file inside an open Proposal (the Model itself is untouched until the developer approves). `path` is relative to `.trama/model/`, e.g. `checkout/order.md` or `actors/user.md`. Returns the validation of the Model with the Proposal applied.",
    inputSchema: {
      type: "object",
      properties: { proposal: string("Proposal ID"), path: string("Model file, relative to .trama/model/"), content: string("The complete file in the Trama Model format") },
      required: ["proposal", "path", "content"],
      additionalProperties: false,
    },
    writes: true,
    run: (p, i) => {
      const id = text(i, "proposal");
      const file = editInProposal(p, id, text(i, "path"));
      const content = i["content"];
      if (typeof content !== "string") throw new UsageError('"content" must be a string');
      writeFileSync(file, content.endsWith("\n") ? content : `${content}\n`);
      const errors = validateProposal(p, getProposal(p, id));
      return errors.length === 0
        ? `Wrote ${i["path"]} in Proposal ${id}. The Model with the Proposal applied is valid.`
        : `Wrote ${i["path"]} in Proposal ${id}. The Model with the Proposal applied has ${errors.length} error(s):\n${errors.map((d) => `- ${formatDiagnostic(d)}`).join("\n")}`;
    },
  },
  {
    name: "trama_proposal_delete_file",
    title: "Delete a Model file in a Proposal",
    description: "Marks a Model file for deletion in an open Proposal. `path` is relative to `.trama/model/`.",
    inputSchema: { type: "object", properties: { proposal: string("Proposal ID"), path: string("Model file, relative to .trama/model/") }, required: ["proposal", "path"], additionalProperties: false },
    writes: true,
    run: (p, i) => {
      deleteInProposal(p, text(i, "proposal"), text(i, "path"));
      return `Marked ${i["path"]} for deletion in Proposal ${i["proposal"]}.`;
    },
  },
  {
    name: "trama_proposal_show",
    title: "Show a Proposal",
    description: "A Proposal: status, whether it is stale, its structural changes, validation, and the developer's feedback if it was rejected.",
    inputSchema: { type: "object", properties: { proposal: string("Proposal ID") }, required: ["proposal"], additionalProperties: false },
    writes: false,
    run: (p, i) => md(proposalShowView(p, getProposal(p, text(i, "proposal")))),
  },
  {
    name: "trama_task_new",
    title: "Create a Task",
    description: "Creates a Task in To do. A Task references the Model elements it implements in `refs`, unless it is technical (no behaviour change, no refs). The body says in domain words what must be true when done.",
    inputSchema: {
      type: "object",
      properties: {
        title: string("What to implement"),
        refs: stringList(`Model elements the Task covers. ${REF}`),
        technical: { type: "boolean", description: "True for work that changes no behaviour (refactor, dependencies); then refs must be empty" },
        drift: string("ID of the Drift this Task resolves, if any"),
        body: string("What must be true when done, in domain words"),
      },
      required: ["title"],
      additionalProperties: false,
    },
    writes: true,
    run: (p, i) => {
      const t = newTask(p, { title: text(i, "title"), refs: texts(i, "refs"), technical: i["technical"] === true, drift: optionalText(i, "drift"), body: optionalText(i, "body") });
      return `Created Task ${t.id}.`;
    },
  },
  {
    name: "trama_task_show",
    title: "Show a Task",
    description: "A Task with the current Model text of every element it references.",
    inputSchema: { type: "object", properties: { task: string("Task ID") }, required: ["task"], additionalProperties: false },
    writes: false,
    run: (p, i) => md(taskShowView(p, getTask(p, text(i, "task")))),
  },
  {
    name: "trama_task_move",
    title: "Move a Task",
    description: "Moves a Task to `todo`, `doing` or `done`. Move it to `doing` when you start and to `done` when the behaviour matches the Model.",
    inputSchema: { type: "object", properties: { task: string("Task ID"), column: { type: "string", enum: ["todo", "doing", "done"] } }, required: ["task", "column"], additionalProperties: false },
    writes: true,
    run: (p, i) => {
      const t = moveTask(p, text(i, "task"), text(i, "column"));
      return `Task ${t.id} is now ${t.data.column}.`;
    },
  },
  {
    name: "trama_drift_new",
    title: "Record a Drift",
    description: "Records a Drift: the code differs from the Model in a way that would change the Diagram. File it exactly once. If the code handles an important case the Model forgot, first open a Proposal and pass its ID in `proposal`. Only the developer resolves Drifts.",
    inputSchema: {
      type: "object",
      properties: {
        title: string("Short title"),
        refs: stringList(`The Model elements closest to the difference. ${REF}`),
        proposal: string("ID of a Proposal that would fix the Model, if the code is right"),
        body: string("What the code does, what the Model says, where in the code"),
      },
      required: ["title", "refs"],
      additionalProperties: false,
    },
    writes: true,
    run: (p, i) => {
      const d = newDrift(p, { title: text(i, "title"), refs: texts(i, "refs"), proposal: optionalText(i, "proposal"), body: optionalText(i, "body") });
      return `Recorded Drift ${d.id}. The developer will decide on it.`;
    },
  },
  {
    name: "trama_drift_show",
    title: "Show a Drift",
    description: "A Drift with its references and its attached Proposal, if any.",
    inputSchema: { type: "object", properties: { drift: string("Drift ID") }, required: ["drift"], additionalProperties: false },
    writes: false,
    run: (p, i) => md(driftShowView(p, getDrift(p, text(i, "drift")))),
  },
];

/** Runs one tool. Domain and input problems come back as an error result the model can read, never as an exception. */
export function callTool(project: Project | (() => Project), name: string, input: unknown): ToolOutcome {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) return { text: `Unknown tool "${name}".`, isError: true };
  if (input !== undefined && input !== null && (typeof input !== "object" || Array.isArray(input))) return { text: "Arguments must be an object.", isError: true };
  try {
    const p = typeof project === "function" ? project() : project;
    return { text: tool.run(p, (input ?? {}) as Record<string, unknown>), isError: false };
  } catch (err) {
    if (err instanceof TramaError || err instanceof UsageError) return { text: err.message, isError: true };
    throw err;
  }
}
