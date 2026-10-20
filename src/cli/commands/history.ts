import { z } from "zod";
import { addHistory, getHistory, listHistory, updateHistory } from "../../core/history";
import { syncShortNumbers } from "../../core/short-numbers";
import { COLUMNS, listTasks } from "../../core/work";
import { defineCommand } from "../registry";
import { text } from "../result";

const written = z.object({ id: z.string(), title: z.string(), file: z.string() });
const idDescription = "The entry: its ID.";
const tasks = z.array(z.string());

const create = defineCommand({
  object: "history",
  verb: "new",
  mode: "immediate",
  summary: "Write a History entry for finished Tasks.",
  description:
    "`tasks` names the Tasks the entry tells, by ID or short number: each must be Done and not closed without changes. The file always carries the IDs. Refused, writing nothing, with every problem listed, when the title is empty or on several lines, the summary is empty, on several lines or longer than 280 characters, no Task is named, or a Task does not exist, is not Done or was closed without changes. Prints the new entry's ID.",
  input: z.strictObject({
    title: z.string().describe("One line."),
    summary: z.string().describe("One line of at most 280 characters, inline Markdown only."),
    body: z.string().optional().describe("The full text, in Markdown. Default empty."),
    tasks: tasks.describe("The Tasks the entry names, at least one."),
  }),
  output: written,
  example: { title: "Order cancellation", summary: "Customers can cancel a paid order.", body: "Longer text.", tasks: ["a1b2c3d4"] },
  effects: { writes: true },
  run(ctx, input) {
    const entry = addHistory(ctx.project(), input);
    return text(`Added history entry ${entry.id}: ${entry.title}`, { id: entry.id, title: entry.title, file: `history/${entry.name}` });
  },
});

const edit = defineCommand({
  object: "history",
  verb: "edit",
  mode: "immediate",
  summary: "Change a History entry.",
  description:
    "`title`, `summary` and `body` replace their field. `tasks` adds Tasks to those the entry already names, by ID or short number, and never removes one. Refused, leaving the file as it was, when a new value or a new Task is not valid. The entry's date is the instant of the command, even when nothing changes.",
  positionals: [{ name: "id", description: idDescription }],
  input: z.strictObject({
    title: z.string().optional().describe("The new title, one line."),
    summary: z.string().optional().describe("The new summary, one line of at most 280 characters."),
    body: z.string().optional().describe("The new full text, in Markdown."),
    tasks: tasks.optional().describe("Tasks to add to those the entry names: Done and not closed without changes."),
  }),
  output: written,
  example: { summary: "Customers can cancel a paid order and get a refund.", tasks: ["a1b2c3d4"] },
  exampleArgs: ["a1b2c3d4"],
  effects: { writes: true },
  run(ctx, input, [id]) {
    const entry = updateHistory(ctx.project(), id as string, { ...input, tasks: input.tasks ?? [] });
    return text(`Updated history entry ${entry.id}: ${entry.title}`, { id: entry.id, title: entry.title, file: `history/${entry.name}` });
  },
});

const list = defineCommand({
  object: "history",
  verb: "list",
  mode: "immediate",
  summary: "The History entries, the most recent first.",
  description: "Each entry with its identity, date and title. Read-only.",
  input: z.strictObject({}),
  output: z.array(z.object({ id: z.string(), title: z.string(), summary: z.string(), created: z.string(), updated: z.string(), file: z.string() })),
  run(ctx) {
    const entries = listHistory(ctx.project());
    const md = entries.length === 0 ? "No history entries." : entries.map((e) => `- ${e.id}  ${e.updated}  ${e.title}`).join("\n");
    return text(md, entries.map((e) => ({ id: e.id, title: e.title, summary: e.summary, created: e.created, updated: e.updated, file: `history/${e.name}` })));
  },
});

const show = defineCommand({
  object: "history",
  verb: "show",
  mode: "immediate",
  summary: "A History entry with the Tasks it names.",
  description: "The title, dates, summary and text of the entry, and the Tasks it names with their state. Read-only.",
  positionals: [{ name: "id", description: idDescription }],
  input: z.strictObject({}),
  output: z.object({
    id: z.string(),
    title: z.string(),
    created: z.string(),
    updated: z.string(),
    summary: z.string(),
    body: z.string(),
    file: z.string(),
    tasks: z.array(z.object({ id: z.string(), number: z.string().describe("The short number, or the ID when the Task has none."), exists: z.boolean(), title: z.string().nullable(), column: z.enum(COLUMNS).nullable(), unchanged: z.string().nullable() })),
  }),
  exampleArgs: ["a1b2c3d4"],
  run(ctx, _input, [id]) {
    const project = ctx.project();
    const entry = getHistory(project, id as string);
    const all = listTasks(project);
    const numbers = syncShortNumbers(project);
    const cited = entry.tasks.map((taskId) => {
      const t = all.find((x) => x.id === taskId);
      return { id: taskId, number: numbers.name("task", taskId), exists: t !== undefined, title: t?.title ?? null, column: t?.data.column ?? null, unchanged: t?.data.unchanged ?? null };
    });
    const lines = cited.map((c) => (c.exists ? `- ${numbers.name("task", c.id)}: ${c.title} (${c.column}${c.unchanged === null ? "" : ", no changes"})` : `- ${c.id}: Task no longer exists`));
    const md = [`# ${entry.title}`, `Updated ${entry.updated}, created ${entry.created}`, "", entry.summary, "", entry.body, "", "## Tasks", ...(lines.length === 0 ? ["_No Tasks._"] : lines)];
    return text(md.join("\n").trim(), { id: entry.id, title: entry.title, created: entry.created, updated: entry.updated, summary: entry.summary, body: entry.body, file: `history/${entry.name}`, tasks: cited });
  },
});

export const HISTORY_COMMANDS = [create, edit, list, show];
