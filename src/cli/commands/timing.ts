import { z } from "zod";
import { getTask } from "../../core/work";
import { UsageError } from "../../core/errors";
import { PARALLEL_CHOICE_KINDS, recordTiming, TIMINGS_DEFAULT_LAST } from "../../core/timings";
import { defineCommand } from "../registry";
import { text } from "../result";
import { timingsView } from "../timings";
import { taskIds } from "./task";

const list = defineCommand({
  object: "timing",
  verb: "list",
  mode: "immediate",
  summary: "The phase timings of the newest jobs.",
  description: "Phases, machine comparisons, Tasks and queue waits of the newest jobs, newest first. Read-only.",
  input: z.strictObject({ last: z.number().int().min(1).optional().describe(`How many jobs. Default ${TIMINGS_DEFAULT_LAST}.`) }),
  output: z.object({ jobs: z.array(z.looseObject({})) }),
  example: { last: 3 },
  run: (ctx, input) => timingsView(ctx.project(false), input.last ?? TIMINGS_DEFAULT_LAST),
});

const create = defineCommand({
  object: "timing",
  verb: "new",
  mode: "immediate",
  summary: "Record a choice of the parallel execution.",
  description:
    "Records in the timings of the job a choice of the parallel run: `release` (Tasks started together although the free-places rule keeps them apart), `order` (the first Task waits for the others to be Done) or `conflict` (the sub-agent of the first Task stopped because it clashed with the others). `tasks` names at least two existing Tasks; `reason` is one line. Writes only from a Trama terminal or chat: elsewhere it writes nothing, says so and exits with 0.",
  input: z.strictObject({
    kind: z.enum(PARALLEL_CHOICE_KINDS).describe("`release`, `order` or `conflict`."),
    tasks: z.array(z.string().min(1)).min(2).describe("At least two Tasks: IDs, unique prefixes or short numbers; the first is the one the choice is about."),
    reason: z.string().trim().min(1).refine((reason) => !/[\r\n]/.test(reason), "must be one line").describe("Why, in one line."),
  }),
  output: z.object({ recorded: z.boolean(), kind: z.enum(PARALLEL_CHOICE_KINDS), tasks: z.array(z.string()), reason: z.string() }),
  example: { kind: "release", tasks: ["a1b2c3d4", "e5f6g7h8"], reason: "They touch different files." },
  effects: { writes: true },
  run(ctx, input) {
    const project = ctx.project();
    const ids = taskIds(ctx, input.tasks);
    if (ids.length < 2) throw new UsageError("tasks: needs at least two different Tasks");
    const named = ids.map((id) => ({ id, title: getTask(project, id).title }));
    // Like the Task moves that are timed, only the agent's own commands are recorded: a Trama terminal or a chat.
    const recorded = ctx.byAgent || ctx.origin.terminal !== undefined;
    const json = { recorded, kind: input.kind, tasks: ids, reason: input.reason };
    if (!recorded) return text("Nothing recorded: this is not a Trama terminal or chat.", json);
    recordTiming(project, ctx.origin, { event: "choice", kind: input.kind, tasks: named, reason: input.reason }, { job: ctx.job });
    return text(`Recorded ${input.kind} choice for ${ids.length} Tasks`, json);
  },
});

export const TIMING_COMMANDS = [list, create];
