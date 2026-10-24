import { z } from "zod";
import { announcementNote, deliverCard } from "../../core/announcements";
import { TramaError, UsageError } from "../../core/errors";
import { deleteTask } from "../../core/delete-task";
import { getProposal } from "../../core/proposals";
import { checkTaskInEditor, filingOrigin, sendCoordinatorMessageSoon } from "../../core/question-channel";
import { syncShortNumbers } from "../../core/short-numbers";
import { preflightScope, taskScope } from "../../core/task-scope";
import { recordTiming } from "../../core/timings";
import { COLUMNS, declareProgress, getDrift, getTask, moveTask, newTask } from "../../core/work";
import { preflightCompared } from "../compare";
import type { Context } from "../context";
import { defineCommand } from "../registry";
import { text, type Result } from "../result";
import { taskGroupsView, taskListView, taskNextView, taskShowView } from "../work";

const stringList = z.array(z.string().min(1));
const card = z.looseObject({ id: z.string(), number: z.string().nullable(), title: z.string() });
const summary = z.looseObject({ id: z.string(), number: z.string().nullable(), title: z.string(), column: z.enum(COLUMNS) });

/** Task identities of a filter, resolved and deduplicated; one that names no Task is a usage error. */
export function taskIds(ctx: Context, ids: readonly string[]): string[] {
  const project = ctx.project();
  return [
    ...new Set(
      ids.map((id) => {
        try {
          return getTask(project, id, true).id;
        } catch (err) {
          if (!(err instanceof TramaError) || (!err.message.startsWith("No Task with ID ") && !err.message.startsWith("No live Task has the short number "))) throw err;
          throw new UsageError(`Task "${id}" was not found: ${err.message}`);
        }
      }),
    ),
  ];
}

const create = defineCommand({
  object: "task",
  verb: "new",
  mode: "immediate",
  summary: "Create a Task in To do.",
  description:
    "A Task that is not technical references at least one Model element (`refs`, which may add Requirement sections); a technical Task references only Requirements, if any. `proposal` links it to the design it comes from; with `drift` the design is that of the origin Task, and a different `proposal` is refused. `announcement` is the ID printed by `trama announcement new`.",
  input: z.strictObject({
    title: z.string().min(1).describe("A short title: at most five words."),
    refs: stringList.optional().describe("Model elements and Requirement sections the Task is about."),
    technical: z.boolean().optional().describe("A Technical Task: it references no Model element. Default false."),
    drift: z.string().min(1).optional().describe("The Drift this Task fixes: its ID or short number."),
    proposal: z.string().min(1).optional().describe("The Proposal the Task comes from: its ID or short number."),
    body: z.string().optional().describe("The text of the Task, in Markdown."),
    announcement: z.string().min(1).optional().describe("The announcement of this Task."),
  }),
  output: z.object({ id: z.string(), number: z.string().nullable(), path: z.string(), note: z.string().optional().describe("About the announcement, when it was not known.") }),
  example: { title: "Order cancel", refs: ["order/Paid"], body: "Cancel a paid order.", announcement: "a1b2c3d4" },
  effects: { writes: true, activity: true },
  run(ctx, input) {
    const project = ctx.project();
    const note = announcementNote(project, input.announcement, "task");
    const t = newTask(project, {
      title: input.title,
      refs: input.refs ?? [],
      technical: input.technical === true,
      drift: input.drift === undefined ? undefined : getDrift(project, input.drift, true).id,
      proposal: input.proposal === undefined ? undefined : getProposal(project, input.proposal, true).id,
      body: input.body,
    });
    deliverCard(project, input.announcement, "task");
    // The agent that files a Task keeps Run and Resolve of it waiting until its turn ends: the editor learns who holds it here.
    const filed = filingOrigin(ctx.origin);
    if (ctx.byAgent && filed.holder !== undefined)
      sendCoordinatorMessageSoon(project, { type: "task-filed", root: project.root, task: t.id, ...filed }, (reason) => {
        process.stderr.write(`The editor did not learn that Task ${t.id} was filed by an agent (${reason}); Run and Resolve are not held for that agent's turn.\n`);
      });
    const n = syncShortNumbers(ctx.project());
    return text(`Created Task ${n.name("task", t.id)} at ${t.path}${note ? `\n${note}` : ""}`, { id: t.id, number: n.label("task", t.id), path: t.path, ...(note ? { note } : {}) });
  },
});

const show = defineCommand({
  object: "task",
  verb: "show",
  mode: "immediate",
  summary: "A Task with its references and the Requirements to implement.",
  description: "Everything needed to carry the Task out, with no pointers to other commands or skills: the Model elements it references in full, and the Requirements that apply. Names each Drift or Task that blocks it. An `Images` block lists the absolute paths of the images tied to the Task, and `--json` carries them as `images`. Read-only.",
  positionals: [{ name: "id", description: "The Task: its ID, a unique prefix or its short number." }],
  input: z.strictObject({}),
  output: summary.extend({ body: z.string(), images: z.array(z.string()).describe("The absolute paths of the images tied to the Task; empty when it has none.") }),
  exampleArgs: ["T3"],
  run: (ctx, _input, [id]) => taskShowView(ctx.project(), getTask(ctx.project(), id as string, true)),
});

const held = z.looseObject({ id: z.string(), number: z.string().nullable(), title: z.string(), overlaps: z.array(z.object({ id: z.string(), number: z.string().nullable() })) });

const list = defineCommand({
  object: "task",
  verb: "list",
  mode: "immediate",
  summary: "The Tasks by column, the runnable ones, or the scope of a scan.",
  description:
    "Without `runnable`, every Task by column, filtered by `column` and `tasks`. With `runnable: true`, the next runnable Task (in To do, not blocked), or with `max` the Tasks for the free places of a parallel run: up to `max` of them, none concerning the same thing as another or as a Task In progress the agent has taken. `tasks` keeps only the named Tasks, `proposals` only those of the named Proposals and `notProposals` all but those (the Tasks with no Proposal included); the two never go together. When none is runnable it says so and lists the Tasks in To do with what blocks them. With `heldBack: true` it adds `## Held back`: the runnable Tasks the free-places rule left out because they concern the same thing as a chosen Task or a Task the agent has taken, each with the Tasks it overlaps; blocked Tasks and Tasks left out only for lack of places are not there. With `groups: true` it prints the runnable Tasks in groups instead: each `## Group <n>` holds Tasks that concern the same thing, directly or through other Tasks of the group, or name the same project file, with what they share; the largest group comes first, and `max` counts groups. Runnable Tasks that concern a Task the agent has taken are held back as above, and blocked Tasks take no part. With `scope: true` it adds the scope of a scan: with `runnable`, the exact references of the runnable Tasks (the pre-flight), the ones already compared on this code apart; without it, the scope of the Tasks named in `tasks`, which is then required. Moves nothing.",
  input: z
    .strictObject({
      column: z.enum(COLUMNS).optional().describe("Only the Tasks of this column. Not with `runnable`."),
      runnable: z.boolean().optional().describe("The runnable Tasks instead of every Task."),
      max: z.number().int().min(1).optional().describe("With `runnable`: up to this many Tasks, for a parallel run; with `groups`, up to this many groups."),
      tasks: stringList.optional().describe("Only these Tasks: IDs or short numbers; each must exist."),
      proposals: stringList.optional().describe("With `runnable`: only the Tasks of these Proposals."),
      notProposals: stringList.optional().describe("With `runnable`: every Task but those of these Proposals."),
      scope: z.boolean().optional().describe("Add the scope of the scan."),
      heldBack: z.boolean().optional().describe("With `runnable`, without `scope`: add the runnable Tasks kept out because they concern the same thing as a chosen or taken Task."),
      groups: z.boolean().optional().describe("With `runnable`: the runnable Tasks in groups for a parallel run: Tasks that concern the same thing, directly or through others, or name a common project file. `max` then counts groups. Not with `scope` or `heldBack`."),
    })
    .superRefine((input, ctx) => {
      const fail = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
      if (input.runnable !== true) {
        if (input.max !== undefined) fail("max", "applies only with runnable");
        if (input.heldBack !== undefined) fail("heldBack", "applies only with runnable");
        if (input.proposals !== undefined) fail("proposals", "applies only with runnable");
        if (input.notProposals !== undefined) fail("notProposals", "applies only with runnable");
        if (input.groups !== undefined) fail("groups", "applies only with runnable");
        if (input.scope === true && input.tasks === undefined) fail("tasks", "is required with scope unless runnable is true");
      } else if (input.column !== undefined) fail("column", "does not apply with runnable");
      if (input.proposals !== undefined && input.notProposals !== undefined) fail("notProposals", "cannot go together with proposals");
      if (input.scope === true && input.runnable === true && input.max !== undefined) fail("max", "does not apply with scope");
      if (input.scope === true && input.runnable === true && input.heldBack === true) fail("heldBack", "does not apply with scope");
      if (input.groups === true && input.scope === true) fail("scope", "does not apply with groups");
      if (input.groups === true && input.heldBack === true) fail("heldBack", "does not apply with groups");
    }),
  output: z.union([
    z.object({ tasks: z.array(summary) }).describe("Without `runnable`"),
    z.object({ next: card.nullable(), waiting: z.array(summary), heldBack: z.array(held).optional() }).describe("`runnable`; `heldBack` with `heldBack: true`"),
    z.object({ batch: z.array(card), waiting: z.array(summary), heldBack: z.array(held).optional() }).describe("`runnable` with `max`; `heldBack` with `heldBack: true`"),
    z.object({ groups: z.array(z.object({ tasks: z.array(card), refs: z.array(z.string()), files: z.array(z.string()) })), heldBack: z.array(held) }).describe("`runnable` with `groups`"),
    z.array(z.object({ ref: z.string(), reason: z.enum(["changed", "leads into a change"]) })).describe("`scope` with `tasks`"),
    z.object({ refs: z.array(z.object({ ref: z.string() })), alreadyCompared: z.array(z.object({ ref: z.string() })), tasks: z.array(card) }).describe("`scope` with `runnable`"),
  ]),
  example: { runnable: true, max: 3, proposals: ["a1b2c3d4"] },
  effects: { activity: false },
  run(ctx, input): Result {
    const project = ctx.project();
    const ids = input.tasks === undefined ? undefined : taskIds(ctx, input.tasks);
    if (input.runnable !== true) {
      if (input.scope !== true) return taskListView(project, input.column, ids === undefined ? undefined : new Set(ids));
      const scope = taskScope(project, ids as string[]);
      return text(scope.length ? `## Scan scope\n\n${scope.map(({ ref, reason }) => `- \`${ref}\` (${reason})`).join("\n")}` : "## Scan scope\n\n_Nothing to scan._", scope);
    }
    const filter = { include: (input.proposals ?? []).map((id) => getProposal(project, id, true).id), exclude: (input.notProposals ?? []).map((id) => getProposal(project, id, true).id) };
    if (input.groups === true) return taskGroupsView(project, filter, input.max, ids, { origin: ctx.origin, job: ctx.job });
    if (input.scope !== true) return taskNextView(project, filter, input.max !== undefined, input.max, ids, { origin: ctx.origin, job: ctx.job }, input.heldBack === true);
    const { refs, tasks } = preflightScope(project, filter, ids);
    const n = syncShortNumbers(project);
    const { remaining, already } = preflightCompared(project, refs);
    const body = remaining.length ? remaining.map((ref) => `- \`${ref}\``).join("\n") : "_Nothing to check._";
    const compared = already.length ? already.map((ref) => `- \`${ref}\``).join("\n") : "_None._";
    return text(`## Pre-flight scope\n\n${body}\n\n## Already compared\n\n${compared}`, {
      refs: remaining.map((ref) => ({ ref })),
      alreadyCompared: already.map((ref) => ({ ref })),
      tasks: tasks.map((t) => ({ id: t.id, number: n.label("task", t.id), title: t.title })),
    });
  },
});

const move = defineCommand({
  object: "task",
  verb: "move",
  mode: "immediate",
  summary: "Move a Task to To do, In progress or Done.",
  description:
    "Run as the agent (in the terminal Trama started, or in an omp Chat conversation, which counts as the terminal it replaces), a move to `doing` takes the Task and a move to `todo` or `done` clears that; without a recognised `TRAMA_TERMINAL` the move to `doing` is refused with an error saying that only an agent launched by Trama can take a Task, and the Task is neither taken nor moved. A move to `doing` is also refused, changing nothing, when the Task is blocked. Run as the developer, a move of a Task the agent has taken is refused, except to `doing`, which takes it back: the mark goes and the Task stays In progress. `unchanged` (a note saying what was checked) closes a fix Task into Done without changes when the code already does what the Drift's Model or Requirement says, and dismisses its Drift; it applies only to `done`. `progress` (0 to 100, in steps of 10) does not move anything: with `doing`, it only declares how far along the agent is on a Task it has taken, in place of the previous percentage. A declaration is accepted only from the terminal or conversation that holds the Task (its sub-agents included); one from another terminal or conversation, from an agent without a recognised `TRAMA_TERMINAL`, from the developer or on a Task not taken changes nothing and prints a note, with exit 0.",
  positionals: [
    { name: "id", description: "The Task: its ID, a unique prefix or its short number." },
    { name: "column", description: "Where the Task goes.", choices: COLUMNS },
  ],
  input: z.strictObject({
    unchanged: z.string().min(1).optional().describe("Only toward `done`: closes a fix Task without changes, with the note of what was checked."),
    progress: z.number().int().min(0).max(100).multipleOf(10).optional().describe("Only toward `doing`: declares the percentage of the Task the agent has taken, 0 to 100 in steps of 10; the Task is not moved, taken or released. Not with `unchanged`."),
  }),
  output: summary.pick({ id: true, number: true, column: true }).extend({ unchanged: z.string().nullable().optional(), drift: z.string().nullable().optional(), progress: z.number().nullable().optional(), note: z.string().optional() }),
  example: { progress: 40 },
  exampleArgs: ["T3", "doing"],
  effects: { writes: true, activity: true },
  run(ctx, input, [id, column]) {
    const project = ctx.project();
    if (input.progress !== undefined && column !== "doing") throw new UsageError(`progress applies only toward doing, not ${column as string}`);
    if (input.progress !== undefined && input.unchanged !== undefined) throw new UsageError("progress and unchanged cannot go together");
    if (input.progress !== undefined) {
      const d = declareProgress(project, getTask(project, id as string, true).id, input.progress, ctx.byAgent ? "agent" : "developer", ctx.origin);
      const n = syncShortNumbers(project);
      const base = { id: d.task.id, number: n.label("task", d.task.id), column: d.task.data.column };
      if (!d.declared) return text(d.note, { ...base, progress: null, note: d.note });
      return text(`Task ${n.name("task", d.task.id)} progress declared: ${d.progress}%`, { ...base, progress: d.progress });
    }
    const t = moveTask(project, getTask(project, id as string, true).id, column as string, ctx.byAgent ? "agent" : "developer", ctx.origin, input.unchanged);
    if (ctx.byAgent && t.data.column === "doing") recordTiming(project, ctx.origin, { event: "task-start", task: t.id, title: t.title }, { job: ctx.job });
    if (t.data.column === "done") recordTiming(project, ctx.origin, { event: "task-end", task: t.id, title: t.title, outcome: input.unchanged === undefined ? "done" : "unchanged" }, { job: ctx.job });
    const n = syncShortNumbers(ctx.project());
    const dismissed = input.unchanged === undefined || t.data.drift === null ? "" : `; Drift ${n.name("drift", t.data.drift)} dismissed`;
    return text(`Task ${n.name("task", t.id)} is now ${t.data.column}${dismissed}`, { id: t.id, number: n.label("task", t.id), column: t.data.column, ...(input.unchanged === undefined ? {} : { unchanged: t.data.unchanged, drift: t.data.drift }) });
  },
});

const check = defineCommand({
  object: "task",
  verb: "check",
  mode: "blocking",
  summary: "Ask about the health of whoever holds a Task the agent has taken.",
  description:
    "Reads the Task. If the agent has not taken it (a Task in To do or Done, or an In progress one the developer holds), answers `not-taken`, without contacting the editor and changing nothing. Otherwise it asks an open editor window of the project, found as `trama question new` does, to run at once the execution check of that Task and waits up to 5 seconds: the window answers `alive`, with the holder, or `released`, with the reason, after putting the Task back in To do with the notice on its Board. Without a reachable editor, or without an answer in time, it answers `unavailable`. It does not take or move the Task, writes no file, does not count as the agent's activity and anyone can run it. Exits with 0 for every outcome; a Task that does not exist is an error as in `task show`.",
  positionals: [{ name: "id", description: "The Task: its ID, a unique prefix or its short number." }],
  input: z.strictObject({}),
  output: z.object({
    task: z.string().describe("The permanent identity of the Task."),
    result: z.enum(["alive", "released", "not-taken", "unavailable"]),
    holder: z.string().optional().describe("Who holds the Task, with `alive`."),
    reason: z.string().optional().describe("Why the Task was put back in To do, with `released`."),
  }),
  exampleArgs: ["T3"],
  async run(ctx, _input, [id], runtime) {
    const project = ctx.project();
    const t = getTask(project, id as string, true);
    const n = syncShortNumbers(project);
    const name = n.name("task", t.id);
    if (t.data.column !== "doing" || t.data.holder === null) return text(`Task ${name} is not taken by the agent.`, { task: t.id, result: "not-taken" });
    const reply = await checkTaskInEditor(project, t.id, { env: runtime.env, ...(runtime.runtimeDir === undefined ? {} : { runtimeDir: runtime.runtimeDir }) });
    if (reply.result === "alive") return text(`Task ${name} is alive, held by ${reply.holder}.`, { task: t.id, result: "alive", holder: reply.holder });
    if (reply.result === "released") return text(`Task ${name} was released and is back in To do: ${reply.reason}`, { task: t.id, result: "released", reason: reply.reason });
    return text(`Task ${name} cannot be verified: no editor of the project answered in time.`, { task: t.id, result: "unavailable" });
  },
});

const del = defineCommand({
  object: "task",
  verb: "delete",
  mode: "immediate",
  summary: "Delete a Task in To do for good.",
  description:
    "Deletes the Task, its percentage and its images, with no confirmation and no way back. Only a Task in To do is deleted, blocked or not, and also one that went back to To do after the agent took it. It is refused, changing nothing and saying why, when the Task is In progress or Done, when an open Drift names it as an origin, or when it is the Task that fixes the code of a Drift in Code to be fixed. Writes nothing in History and does not count among the Tasks finished since the last global scan; its short number becomes free. Run it as the agent only when the developer asks for it explicitly in the conversation.",
  positionals: [{ name: "id", description: "The Task: its ID, a unique prefix or its short number." }],
  input: z.strictObject({}),
  output: z.object({ id: z.string().describe("The permanent identity of the deleted Task."), title: z.string() }),
  exampleArgs: ["T3"],
  effects: { writes: true },
  run(ctx, _input, [id]) {
    const project = ctx.project();
    const task = deleteTask(project, getTask(project, id as string, true).id);
    return text(`Deleted Task ${task.id} "${task.title}".`, { id: task.id, title: task.title });
  },
});

export const TASK_COMMANDS = [create, show, list, move, check, del];
