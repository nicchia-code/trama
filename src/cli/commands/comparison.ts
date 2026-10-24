import { z } from "zod";
import { announce, keepUnownedComparison } from "../../core/announcements";
import { archiveComparison, briefing } from "../../core/compare";
import { codeFingerprint } from "../../core/compared";
import { filingOrigin, sendCoordinatorMessageSoon } from "../../core/question-channel";
import { recordTiming } from "../../core/timings";
import { archiveView, briefedTexts, briefingView } from "../compare";
import { defineCommand } from "../registry";

const cardLine = z.object({ id: z.string(), number: z.string().nullable(), title: z.string() });

const create = defineCommand({
  object: "comparison",
  verb: "new",
  mode: "immediate",
  summary: "Announce a comparison of a Machine and print its briefing.",
  description:
    "Announces the comparison and prints its ID first, then the references to compare (`refs` limits them to those of the Machine; without it, the whole Machine), their States, Events and Transitions, the Requirements that apply, the analysis, the open Tasks and Drifts on the same thing, and the resolved or dismissed Drifts on the same references. `candidates: true` adds the Tasks a Drift on each reference would block. Keep the ID: `comparison move` takes it. Without `TRAMA_TERMINAL` the briefing is the same but no announcement, and so no ghost, is made: the comparison data stay in a file of their own that `comparison move <id> delivered` deletes.",
  positionals: [{ name: "machine", description: "The Machine to compare." }],
  input: z.strictObject({
    refs: z.array(z.string().min(1)).optional().describe("Only these references, which must be of the Machine."),
    candidates: z.boolean().optional().describe("Add the Tasks a Drift on each reference would block."),
  }),
  output: z.object({
    announcement: z.string(),
    machine: z.string(),
    scope: z.array(z.string()),
    warnings: z.array(z.looseObject({})),
    openTasks: z.array(cardLine.extend({ column: z.string() })),
    openDrifts: z.array(cardLine.extend({ refs: z.array(z.string()) })),
    closedDrifts: z.array(cardLine.extend({ resolution: z.string().nullable(), note: z.string().nullable() })),
    candidates: z.record(z.string(), z.array(cardLine)).nullable(),
  }),
  example: { refs: ["order/Paid"], candidates: true },
  exampleArgs: ["order"],
  effects: { writes: true, activity: true },
  run(ctx, input, [machine]) {
    const project = ctx.project();
    const b = briefing(project, machine as string, input.refs ?? [], input.candidates === true);
    const code = codeFingerprint(project.root);
    const texts = code === null ? {} : briefedTexts(b);
    // Without a terminal no ghost is made: a ghost with no terminal would be withdrawn as an orphan, and nothing could say whose it is.
    const comparison =
      ctx.origin.terminal === undefined
        ? keepUnownedComparison(project, { code, texts })
        : announce(project, { kind: "comparison", title: `Comparing ${b.machine.name}`, machine: b.machine.id, refs: b.scope, code, texts, ...ctx.origin }).id;
    recordTiming(project, ctx.origin, { event: "compare-start", comparison, machine: b.machine.name, refs: b.scope.length }, { job: ctx.job });
    return briefingView(project, b, comparison);
  },
});

const move = defineCommand({
  object: "comparison",
  verb: "move",
  mode: "immediate",
  summary: "Deliver a comparison: file its Tasks and Drifts in one go.",
  description:
    "The input is what the comparison found: an optional `design` (the Proposal every Task is linked to), `tasks` (each `title`, `refs`, `body`, optional `technical`) and `drifts` (each `title`, `refs`, `happens`, `should`, `where`, `options` as a list of `{title, text}`, and optional `previous`, `proposal`, `notBlocking` as a list of `{task, reason}`); both lists may be empty. Every card follows the rules of `task new` and `drift new`. All cards are checked before any is written: if one is not valid nothing is written and every problem is listed per card. Otherwise the cards are created in order, the comparison is delivered and it is recorded as compared on this code.",
  positionals: [{ name: "id", description: "The comparison: the ID printed by `comparison new`." }, { name: "state", description: "Where the comparison goes.", choices: ["delivered"] }],
  input: z.strictObject({
    design: z.string().optional().describe("The Proposal every Task is linked to."),
    tasks: z.array(z.unknown()).describe("The Tasks found; may be empty."),
    drifts: z.array(z.unknown()).describe("The Drifts found; may be empty."),
  }),
  output: z.object({ comparison: z.string(), delivered: z.boolean(), tasks: z.array(cardLine), drifts: z.array(cardLine.extend({ previous: z.string().nullable() })) }),
  example: { tasks: [{ title: "Order cancel", refs: ["order/Paid"], body: "Cancel a paid order." }], drifts: [] },
  exampleArgs: ["a1b2c3d4", "delivered"],
  effects: { writes: true, activity: true, editor: true },
  run(ctx, input, [id]) {
    const project = ctx.project();
    const result = archiveComparison(project, id as string, JSON.stringify(input), ctx.job);
    recordTiming(project, ctx.origin, { event: "compare-end", comparison: id as string, tasks: result.tasks.length, drifts: result.drifts.length }, { job: ctx.job });
    // As with `task new` and `drift new`: the editor learns who holds each card filed by an agent, so it waits for that agent's turn.
    const filed = filingOrigin(ctx.origin);
    for (const t of result.tasks)
      if (ctx.byAgent && filed.holder !== undefined)
        sendCoordinatorMessageSoon(project, { type: "task-filed", root: project.root, task: t.id, ...filed }, (reason) => {
          process.stderr.write(`The editor did not learn that Task ${t.id} was filed by an agent (${reason}); Run and Resolve are not held for that agent's turn.\n`);
        });
    for (const d of result.drifts)
      if (filed.holder !== undefined)
        sendCoordinatorMessageSoon(project, { type: "drift-filed", root: project.root, drift: d.id, ...filed }, (reason) => {
          if (ctx.byAgent) process.stderr.write(`The editor did not learn that Drift ${d.id} was filed by an agent (${reason}); «Dismiss Drift» is not held for that agent's turn.\n`);
        });
    return archiveView(project, id as string, result);
  },
});

export const COMPARISON_COMMANDS = [create, move];
