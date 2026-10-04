import { writeFileSync } from "node:fs";
import { analyzeView, eventView, featureView, machineView, pathsView, searchView, stateView, systemView, validateView } from "../cli/explore";
import { requirementsView, withRequirements } from "../cli/requirements";
import type { Result } from "../cli/result";
import { boardView, driftShowView, proposalShowView, taskShowView } from "../cli/work";
import { ANNOUNCEMENT_KINDS, type AnnouncementKind, announce, announcementNote } from "../core/announcements";
import { TramaError, UsageError } from "../core/errors";
import { askEditor } from "../core/question-channel";
import { parseQuestionRequest, QUESTION_SCHEMA, questionFailure, type QuestionContext, type QuestionHandler } from "../core/questions";
import { deleteInProposal, editInProposal, getProposal, newProposal, submitProposal, validateProposal } from "../core/proposals";
import { resolveRef } from "../core/refs";
import { loadProject } from "../core/requirements";
import { loadModel, type Project } from "../core/store";
import { getDrift, getTask, moveTask, newDrift, newTask, replaceDriftProposal } from "../core/work";
import { formatDiagnostic } from "../core/model";

/**
 * The operations an agent may perform on a Trama project, shared by the MCP server (`trama mcp`) and the VS Code
 * language-model tools. The developer's decisions (approving, rejecting or discarding a Proposal, resolving a Drift) are
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
  run(project: Project, input: Record<string, unknown>, options: ToolOptions): string | Promise<string>;
}

export interface ToolOutcome {
  text: string;
  isError: boolean;
}

export interface ToolOptions {
  questionHandler?: QuestionHandler;
  context?: QuestionContext;
  /** The agent terminal the calling agent runs in (`TRAMA_TERMINAL`), so the cards it announces belong to it. */
  terminal?: string;
}

const string = (description: string) => ({ type: "string", description });
const stringList = (description: string) => ({ type: "array", items: { type: "string" }, description });
const REF = "Element reference: `checkout` (Feature), `order` (Machine), `user` (Actor), `order/Paid` (State), `order/Paid/user.CANCEL` (Transitions on an Event), `user.CANCEL` (Event).";
const REQ_REF = "Requirements: `requirements/ui` (a whole Area) or `requirements/ui#order/Paid` (one section; `#General` for the general one).";
const PATH = "Model file relative to `.trama/model/` (`checkout/order.md`, `actors/user.md`), or a Requirement Area `requirements/<area>.md`";

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
function fixOptions(input: Record<string, unknown>): { title: string; text: string }[] {
  const v = input["options"];
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw new UsageError('"options" must be a list of {title, text}');
  return v.map((o, n) => {
    if (typeof o !== "object" || o === null || Array.isArray(o)) throw new UsageError(`"options" item ${n + 1} must be an object with a title and a text`);
    const { title, text } = o as Record<string, unknown>;
    if ((title !== undefined && typeof title !== "string") || (text !== undefined && typeof text !== "string")) throw new UsageError(`"options" item ${n + 1}: title and text must be strings`);
    return { title: title ?? "", text: text ?? "" };
  });
}
const md = (r: Result) => r.md.replace(/\n{3,}/g, "\n\n").trimEnd();

function view(project: Project, ref: string | undefined): string {
  const pm = loadProject(project);
  const model = pm.model;
  if (ref === undefined) return md(systemView(model));
  if (ref === "requirements" || ref.startsWith("requirements/")) return md(requirementsView(pm, ref === "requirements" ? undefined : ref));
  const el = resolveRef(model, ref);
  const attach = (r: Result) => md(withRequirements(r, pm, ref));
  switch (el.kind) {
    case "feature":
      return attach(featureView(model, el.feature.id));
    case "machine":
      return attach(machineView(model, el.machine.id));
    case "state":
      return attach(stateView(model, ref));
    case "transition":
      return attach(stateView(model, `${el.machine.id}/${el.state.name}`));
    case "event":
      return attach(eventView(model, ref));
    case "actor":
      return [`# ${el.actor.name} (actor \`${el.actor.id}\`)`, "", el.actor.description, "", ...el.actor.events.map((e) => md(eventView(model, `${el.actor.id}.${e.name}`)))].join("\n");
  }
}

export const TOOLS: ToolSpec[] = [
  {
    name: "trama_ask",
    title: "Ask the developer",
    description: "Present a complete question round in the project's editor and wait for answers. Only an initial unavailable result permits your own question tool. An editor-interrupted error stops this workflow without fallback, retry, rerouting or resumption.",
    inputSchema: QUESTION_SCHEMA,
    writes: false,
    run: async (project, input, options) => {
      const request = parseQuestionRequest(input);
      const result = await (options.questionHandler ?? askEditor)(project, request, options.context ?? { agent: "Agent" });
      return JSON.stringify(result);
    },
  },
  {
    name: "trama_view",
    title: "View the Model and Requirements",
    description: `Shows part of the project's Trama Model, the source of truth for how the software behaves, with the Requirements that say how it must be built. Without \`ref\`: the System, its Actors and Features. With \`ref\`: that element with its States, Transitions (condition and consequence in prose), Events, who receives them, and the Requirements attached to it. \`requirements\` lists the Requirement Areas; ${REQ_REF} ${REF}`,
    inputSchema: { type: "object", properties: { ref: string(`${REF} Or \`requirements\`, or ${REQ_REF}`) }, additionalProperties: false },
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
    title: "Search the Model and Requirements",
    description: "Case-insensitive search over names and prose of the whole Model and its Requirements; each hit with its reference.",
    inputSchema: { type: "object", properties: { text: string("Text to look for") }, required: ["text"], additionalProperties: false },
    writes: false,
    run: (p, i) => md(searchView(loadProject(p), text(i, "text"))),
  },
  {
    name: "trama_board",
    title: "Board",
    description: "The work board: Draft Proposals in writing, handed-over (open) Proposals and Drifts waiting for the developer's decision, then Tasks to do, in progress and done.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    writes: false,
    run: (p) => md(boardView(p)),
  },
  {
    name: "trama_validate",
    title: "Validate",
    description: "Checks the internal consistency of the Model and its Requirements (every Requirement section must name an existing element), or of both with a Draft or open Proposal applied. Never looks at code.",
    inputSchema: { type: "object", properties: { proposal: string("Proposal ID; omit to validate the current Model") }, additionalProperties: false },
    writes: false,
    run: (p, i) => {
      const id = optionalText(i, "proposal");
      if (id === undefined) return md(validateView(loadProject(p).diagnostics, "The Model and its Requirements"));
      const proposal = getProposal(p, id);
      return md(validateView(validateProposal(p, proposal), `The Model and its Requirements with Proposal ${proposal.id} applied`));
    },
  },
  {
    name: "trama_announce",
    title: "Announce a card you are about to create",
    description: "Say that you are about to create a Proposal, a Task or a Drift, as soon as you know it, so the developer's Board shows a ghost of it meanwhile. Returns an announcement ID: pass it as `announcement` when you create that card (trama_proposal_new, trama_task_new, trama_drift_new). Never wait for the ghost to show, and never skip creating the card because of it.",
    inputSchema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["proposal", "task", "drift"], description: "What kind of card is coming" },
        title: string("The title the card will have"),
      },
      required: ["kind", "title"],
      additionalProperties: false,
    },
    writes: true,
    run: (p, i, o) => {
      const kind = text(i, "kind");
      if (!(ANNOUNCEMENT_KINDS as readonly string[]).includes(kind)) throw new UsageError(`"kind" must be one of ${ANNOUNCEMENT_KINDS.join(", ")}`);
      const a = announce(p, { kind: kind as AnnouncementKind, title: text(i, "title"), ...(o.terminal ? { terminal: o.terminal } : {}) });
      return `Announced a ${a.kind}: announcement ${a.id}. Pass it as "announcement" when you create the card.`;
    },
  },
  {
    name: "trama_proposal_new",
    title: "Create a Draft Proposal",
    description: "Creates a Draft Proposal: the only way to change the Model or its Requirements. Write each changed Model or Requirement file with trama_proposal_write, then validate, review the changes and hand it over with trama_proposal_submit when finished. Only the developer can approve it after submission. A large change can be split into Proposals that build on each other: list the earlier ones in `requires`; this one is written and validated on top of them and can only be approved after them.",
    inputSchema: {
      type: "object",
      properties: {
        title: string("Short title"),
        body: string("Why the change is needed"),
        requires: stringList("IDs of Draft, open or approved Proposals this one builds on"),
        import: { type: "boolean", description: "True when the Proposal describes existing code (trama-import skill); approving it starts no Scan" },
        announcement: string("ID given by trama_announce for this Proposal, if you announced it"),
      },
      required: ["title"],
      additionalProperties: false,
    },
    writes: true,
    run: (p, i, o) => {
      const note = announcementNote(p, optionalText(i, "announcement"), "proposal");
      const proposal = newProposal(p, text(i, "title"), optionalText(i, "body") ?? "", { requires: texts(i, "requires"), kind: i["import"] === true ? "import" : "change", announcement: optionalText(i, "announcement"), terminal: o.terminal });
      return `Created Draft Proposal ${proposal.id}${proposal.data.requires.length > 0 ? ` on top of ${proposal.data.requires.join(", ")}` : ""}. Write each new or changed Model or Requirement file with trama_proposal_write, then hand it over with trama_proposal_submit when finished.${note ? ` ${note}` : ""}`;
    },
  },
  {
    name: "trama_proposal_write",
    title: "Write a Model or Requirement file in a Proposal",
    description: `Writes the complete new version of one Model or Requirement file inside a Draft or open Proposal (nothing changes until the developer approves). An open Proposal returns to Draft before the write; hand it over again with trama_proposal_submit when finished. \`path\`: ${PATH}. Returns validation; a Requirement section naming a State the Proposal removes or renames is an error, so update that Requirement in the same Proposal.`,
    inputSchema: {
      type: "object",
      properties: { proposal: string("Proposal ID"), path: string(PATH), content: string("The complete file in the Trama Model or Requirements format") },
      required: ["proposal", "path", "content"],
      additionalProperties: false,
    },
    writes: true,
    run: (p, i) => {
      const id = text(i, "proposal");
      const content = i["content"];
      if (typeof content !== "string") throw new UsageError('"content" must be a string');
      const returnedToDraft = getProposal(p, id).data.status === "open";
      const file = editInProposal(p, id, text(i, "path"));
      writeFileSync(file, content.endsWith("\n") ? content : `${content}\n`);
      const errors = validateProposal(p, getProposal(p, id));
      const withdrawal = `${returnedToDraft ? " Proposal returned to Draft." : " Proposal is a Draft."} Hand it over with trama_proposal_submit when finished.`;
      return errors.length === 0
        ? `Wrote ${i["path"]} in Proposal ${id}.${withdrawal} The Model and Requirements with the Proposal applied are valid.`
        : `Wrote ${i["path"]} in Proposal ${id}.${withdrawal} The Model and Requirements with the Proposal applied have ${errors.length} error(s):\n${errors.map((d) => `- ${formatDiagnostic(d)}`).join("\n")}`;
    },
  },
  {
    name: "trama_proposal_delete_file",
    title: "Delete a Model or Requirement file in a Proposal",
    description: `Marks a Model or Requirement file for deletion in a Draft or open Proposal. An open Proposal returns to Draft; hand it over again with trama_proposal_submit when finished. \`path\`: ${PATH}.`,
    inputSchema: { type: "object", properties: { proposal: string("Proposal ID"), path: string(PATH) }, required: ["proposal", "path"], additionalProperties: false },
    writes: true,
    run: (p, i) => {
      const returnedToDraft = getProposal(p, text(i, "proposal")).data.status === "open";
      deleteInProposal(p, text(i, "proposal"), text(i, "path"));
      return `Marked ${i["path"]} for deletion in Proposal ${i["proposal"]}.${returnedToDraft ? " Proposal returned to Draft." : " Proposal is a Draft."} Hand it over with trama_proposal_submit when finished.`;
    },
  },
  {
    name: "trama_proposal_submit",
    title: "Hand a Proposal over",
    description: "Hands a Draft Proposal over to the developer, making it open for review. Call only after finishing every file, validating and reviewing the changes. Refuses invalid Model or Requirements and unregistered files, leaving it Draft; staleness and waiting for required approvals do not prevent submission.",
    inputSchema: { type: "object", properties: { proposal: string("Draft Proposal ID") }, required: ["proposal"], additionalProperties: false },
    writes: true,
    run: (p, i) => {
      const proposal = submitProposal(p, text(i, "proposal"));
      return `Submitted Proposal ${proposal.id} for the developer to review.`;
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
    description: "Creates a Task in To do. A Task references the Model elements it implements in `refs`, plus any Requirement it must satisfy. A technical Task (no behaviour change) references no Model element, only Requirements if any. The body says in domain words what must be true when done.",
    inputSchema: {
      type: "object",
      properties: {
        title: string("What to implement"),
        refs: stringList(`Model elements the Task covers, and Requirements it must satisfy. ${REF} ${REQ_REF}`),
        technical: { type: "boolean", description: "True for work that changes no behaviour (refactor, dependencies, applying a Requirement); then refs may only name Requirements" },
        drift: string("ID of the Drift this Task resolves, if any"),
        proposal: string("ID of the Proposal (the design) this Task comes from, when you file it after that Proposal was approved; it must exist"),
        body: string("What must be true when done, in domain words"),
        announcement: string("ID given by trama_announce for this Task, if you announced it"),
      },
      required: ["title"],
      additionalProperties: false,
    },
    writes: true,
    run: (p, i) => {
      const note = announcementNote(p, optionalText(i, "announcement"), "task");
      const t = newTask(p, { title: text(i, "title"), refs: texts(i, "refs"), technical: i["technical"] === true, drift: optionalText(i, "drift"), proposal: optionalText(i, "proposal"), body: optionalText(i, "body"), announcement: optionalText(i, "announcement") });
      return `Created Task ${t.id}.${note ? ` ${note}` : ""}`;
    },
  },
  {
    name: "trama_task_show",
    title: "Show a Task",
    description: "A Task with the current text of every Model element and Requirement it references, and the Requirements that apply to those elements. Says which Drifts, or which fix Task, block it.",
    inputSchema: { type: "object", properties: { task: string("Task ID") }, required: ["task"], additionalProperties: false },
    writes: false,
    run: (p, i) => md(taskShowView(p, getTask(p, text(i, "task")))),
  },
  {
    name: "trama_task_move",
    title: "Move a Task",
    description: "Moves a Task to `todo`, `doing` or `done`. Moving it to `doing` takes it: the developer cannot move it until the Task leaves `doing` or the developer takes it back. A blocked Task (an open Drift blocks it, or it waits for the Task that fixes its Drift) cannot be moved to `doing` by you: the move is refused and the Drift or Task is named. Move it to `doing` when you start and to `done` when the behaviour matches the Model and the code follows its Requirements.",
    inputSchema: { type: "object", properties: { task: string("Task ID"), column: { type: "string", enum: ["todo", "doing", "done"] } }, required: ["task", "column"], additionalProperties: false },
    writes: true,
    run: (p, i) => {
      const t = moveTask(p, text(i, "task"), text(i, "column"), "agent");
      return `Task ${t.id} is now ${t.data.column}.`;
    },
  },
  {
    name: "trama_drift_new",
    title: "Record a Drift",
    description: "Records a Drift: the code differs from the Model in a way that would change the Diagram, or contradicts a Requirement. File it exactly once. If the code handles an important case the Model forgot, first open a Proposal and pass its ID in `proposal`. Only the developer resolves Drifts.",
    inputSchema: {
      type: "object",
      properties: {
        title: string("Short title"),
        refs: stringList(`The Model elements or Requirements closest to the difference. ${REF} ${REQ_REF}`),
        proposal: string("ID of a Proposal that would fix the Model, if the code is right"),
        task: string("ID of the Task you were implementing when you found the difference; leave out for a Scan or a Fix"),
        happens: string("What happens: what the code does, in terms of behaviour and domain words, for a programmer reading at a glance. Short Markdown, about 100 words. Name a variable, function, class, field or file only when the difference cannot be understood without it, as inline code; code locations go in `where`"),
        should: string("What should happen: what the Model or the Requirement says, in the same style"),
        options: {
          type: "array",
          minItems: 2,
          maxItems: 5,
          description: "From two to five different ways to fix the code so it does what should happen, the one you recommend first. Each is a different way to reach it, not a step of one plan, and says in terms of behaviour what changes and what it costs. Titles differ",
          items: {
            type: "object",
            properties: { title: string("A few words naming this way to fix the code"), text: string("Short Markdown, about 60 words: what changes and what it costs. No headings or tables") },
            required: ["title", "text"],
            additionalProperties: false,
          },
        },
        where: string("Optional: where in the code the difference was seen (files, and the code element when it helps; no line numbers, no long code). The only place for code locations"),
        announcement: string("ID given by trama_announce for this Drift, if you announced it"),
      },
      required: ["title", "refs", "happens", "should", "options"],
      additionalProperties: false,
    },
    writes: true,
    run: (p, i) => {
      const note = announcementNote(p, optionalText(i, "announcement"), "drift");
      const d = newDrift(p, { title: text(i, "title"), refs: texts(i, "refs"), proposal: optionalText(i, "proposal"), origin: optionalText(i, "task"), happens: text(i, "happens"), should: text(i, "should"), options: fixOptions(i), announcement: optionalText(i, "announcement"), ...(i["where"] != null ? { where: text(i, "where") } : {}) });
      return `Recorded Drift ${d.id}. The developer will decide on it.${note ? ` ${note}` : ""}`;
    },
  },
  {
    name: "trama_drift_replace_proposal",
    title: "Replace the stale Proposal of a Drift",
    description: "Attaches a newer Proposal to an open Drift in place of the stale one attached to it, after the developer asked you to rework it. First write the new Proposal on the current Model and hand it over (trama_proposal_submit). The old Proposal is rejected as replaced. Refused unless the attached Proposal is open and stale.",
    inputSchema: {
      type: "object",
      properties: { drift: string("Drift ID"), proposal: string("ID of the new Proposal") },
      required: ["drift", "proposal"],
      additionalProperties: false,
    },
    writes: true,
    run: (p, i) => {
      const old = getDrift(p, text(i, "drift")).data.proposal;
      const d = replaceDriftProposal(p, text(i, "drift"), text(i, "proposal"));
      return `Drift ${d.id} now has Proposal ${d.data.proposal}; Proposal ${old} was rejected as replaced.`;
    },
  },
  {
    name: "trama_drift_show",
    title: "Show a Drift",
    description: "A Drift with its references, the Requirements that apply, and its attached Proposal, if any.",
    inputSchema: { type: "object", properties: { drift: string("Drift ID") }, required: ["drift"], additionalProperties: false },
    writes: false,
    run: (p, i) => md(driftShowView(p, getDrift(p, text(i, "drift")))),
  },
];

/** Runs one tool. Domain and input problems come back as an error result the model can read, never as an exception. */
export async function callTool(project: Project | (() => Project), name: string, input: unknown, options: ToolOptions = {}): Promise<ToolOutcome> {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) return { text: `Unknown tool "${name}".`, isError: true };
  if (name !== "trama_ask" && input !== undefined && input !== null && (typeof input !== "object" || Array.isArray(input))) return { text: "Arguments must be an object.", isError: true };
  try {
    const p = typeof project === "function" ? project() : project;
    return { text: await tool.run(p, (input ?? {}) as Record<string, unknown>, options), isError: false };
  } catch (err) {
    if (name === "trama_ask") return { text: JSON.stringify(questionFailure(err)), isError: true };
    if (err instanceof TramaError || err instanceof UsageError) return { text: err.message, isError: true };
    throw err;
  }
}
