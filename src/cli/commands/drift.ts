import { z } from "zod";
import { announcementNote } from "../../core/announcements";
import { UsageError } from "../../core/errors";
import { getProposal } from "../../core/proposals";
import { filingOrigin, sendCoordinatorMessageSoon } from "../../core/question-channel";
import { syncShortNumbers } from "../../core/short-numbers";
import { recordTiming } from "../../core/timings";
import { editDrift, preparedFlag, preparedStatus } from "../../core/prepared";
import { getDrift, getTask, newDrift, resolveDrift } from "../../core/work";
import type { Context } from "../context";
import { defineCommand } from "../registry";
import { text } from "../result";
import { driftCandidatesView, driftListView, driftShowView } from "../work";

const STATES = ["code-to-be-fixed", "proposal-accepted", "dismissed"] as const;
const HOW = { "code-to-be-fixed": "fix-code", "proposal-accepted": "accept-proposal", dismissed: "dismiss" } as const;
const card = z.looseObject({ id: z.string(), number: z.string().nullable() });

/** The short numbers of this working copy as they are now, read after a command has acted so a card it closed is already written by its identity. */
const numbersOf = (ctx: Context) => syncShortNumbers(ctx.project());

const create = defineCommand({
  object: "drift",
  verb: "new",
  mode: "immediate",
  summary: "Record an open Drift, or list the Tasks a new one would block.",
  description:
    "`happens` (what the code does, in terms of behaviour) and `should` (what the Model or Requirement says) are short Markdown; `where` is required and says where in the code the difference was seen (read that code before filing; files and code names go only there). `options` are from two to five fix options, the first being the one you recommend; without options the Drift is accepted only with an attached `proposal`. `task` names the Task you were implementing when you found the difference (the origin). `previous` is the resolved Drift this one follows. `notBlocking` names Tasks the Drift would block and leaves free, each with a one-line `reason`: the difference does not touch it (see `dryRun`). `announcement` is the ID printed by `trama announcement new`. With `dryRun: true` nothing is written: it prints the Tasks a Drift with these `refs` and this `task` would block, by number or identity and title; only `refs` and `task` are needed then.",
  input: z
    .strictObject({
      title: z.string().min(1).optional().describe("A short title: at most five words. Required unless `dryRun`."),
      refs: z.array(z.string().min(1)).describe("The Model elements and Requirement sections the Drift is about."),
      happens: z.string().optional().describe("What the code does, in terms of behaviour. Required unless `dryRun`."),
      should: z.string().optional().describe("What the Model or Requirement says. Required unless `dryRun`."),
      where: z.string().optional().describe("Where in the code the difference was seen. Required unless `dryRun`."),
      options: z.array(z.strictObject({ title: z.string().describe("A few words naming this way to fix the code."), text: z.string().describe("What changes and what it costs.") })).optional().describe("From 2 to 5 fix options, the recommended one first; none only with `proposal`."),
      task: z.string().min(1).optional().describe("The Task being implemented when the Drift was found: its ID or short number."),
      proposal: z.string().min(1).optional().describe("The Draft or open Proposal that goes with the Drift: its ID or short number."),
      previous: z.string().min(1).optional().describe("The resolved Drift this one follows: its ID or short number."),
      notBlocking: z.array(z.strictObject({ task: z.string().min(1).describe("The Task, by ID or short number."), reason: z.string().describe("Why the difference does not touch it, on one line.") })).optional().describe("Tasks the Drift would block and leaves free."),
      announcement: z.string().min(1).optional().describe("The announcement of this Drift."),
      dryRun: z.boolean().optional().describe("Write nothing: print the Tasks the Drift would block."),
    })
    .superRefine((input, ctx) => {
      if (input.dryRun === true) return;
      for (const field of ["title", "happens", "should", "where"] as const) if (input[field] === undefined) ctx.addIssue({ code: "custom", path: [field], message: "required" });
    }),
  output: z.union([
    card.extend({ path: z.string(), previous: z.string().nullable(), note: z.string().optional().describe("About the announcement, when it was not known.") }),
    z.object({ tasks: z.array(z.object({ id: z.string(), number: z.string().nullable(), title: z.string() })) }).describe("`dryRun`"),
  ]),
  example: {
    title: "Late refund",
    refs: ["order/Paid"],
    happens: "A paid order cannot be refunded after a day.",
    should: "A paid order can be refunded at any time.",
    where: "src/order.ts",
    options: [
      { title: "Remove the limit", text: "Refunds work at any time." },
      { title: "Warn instead", text: "Late refunds ask for confirmation." },
    ],
    task: "a1b2c3d4",
    announcement: "e5f6a7b8",
  },
  effects: { writes: true, activity: true, editor: true },
  run(ctx, input) {
    const project = ctx.project();
    if (input.dryRun === true) return driftCandidatesView(project, input.refs, input.task);
    const note = announcementNote(project, input.announcement, "drift");
    const origin = input.task === undefined ? undefined : getTask(project, input.task, true).id;
    const d = newDrift(project, {
      title: input.title as string,
      refs: input.refs,
      proposal: input.proposal === undefined ? undefined : getProposal(project, input.proposal, true).id,
      origin,
      previous: input.previous === undefined ? undefined : getDrift(project, input.previous, true).id,
      happens: input.happens as string,
      should: input.should as string,
      options: input.options ?? [],
      announcement: input.announcement,
      where: input.where as string,
      notBlocking: (input.notBlocking ?? []).map((n) => ({ task: getTask(project, n.task, true).id, reason: n.reason })),
      job: ctx.job,
    });
    if (origin !== undefined) recordTiming(project, ctx.origin, { event: "task-end", task: origin, title: getTask(project, origin, true).title, outcome: "drift", drift: d.id }, { job: ctx.job });
    // The agent that files a Drift keeps «Dismiss Drift» from it until its turn ends: the editor learns who holds it here. An agent Trama did not start and that does not say where it comes from files as the `editor` holder.
    const filed = filingOrigin(ctx.origin);
    if (filed.holder !== undefined)
      sendCoordinatorMessageSoon(project, { type: "drift-filed", root: project.root, drift: d.id, ...filed }, (reason) => {
        if (ctx.byAgent) process.stderr.write(`The editor did not learn that Drift ${d.id} was filed by an agent (${reason}); «Dismiss Drift» is not held for that agent's turn.\n`);
      });
    const n = numbersOf(ctx);
    const follows = d.data.previous === null ? "" : `; recurring, it follows Drift ${n.name("drift", d.data.previous)}`;
    return text(`Created Drift ${n.name("drift", d.id)} at ${d.path}${follows}${note ? `\n${note}` : ""}`, { id: d.id, number: n.label("drift", d.id), path: d.path, previous: d.data.previous, ...(note ? { note } : {}) });
  },
});

const show = defineCommand({
  object: "drift",
  verb: "show",
  mode: "immediate",
  summary: "A Drift with its references and attached Proposal.",
  description: "Both sides, the fix options, where in the code, the references with the Requirements that apply, the attached Proposal and, when the Drift has a prepared question, its status (`valid`, `stale: <reason>` or `unreadable`), the question, each option with its decision and the recommended one. Read-only.",
  positionals: [{ name: "id", description: "The Drift: its ID, a unique prefix or its short number." }],
  input: z.strictObject({}),
  output: card.extend({ title: z.string(), status: z.string(), job: z.string().nullable(), prepared: z.looseObject({ valid: z.boolean() }).nullable() }),
  exampleArgs: ["D3"],
  run: (ctx, _input, [id]) => driftShowView(ctx.project(), getDrift(ctx.project(), id as string, true)),
});

const list = defineCommand({
  object: "drift",
  verb: "list",
  mode: "immediate",
  summary: "The open Drifts, or every Drift.",
  description: "With `all: true`, every Drift. `refs` keeps only the Drifts that concern the same thing as one of the given references, as the Task blocks do; a reference that does not resolve is refused. `job` keeps the Drifts filed by that job (`TRAMA_JOB`). `currentJob: true` keeps the Drifts filed by the job of this command (its `TRAMA_JOB`, in a terminal and in Cursor's chat alike); without `TRAMA_JOB` it lists nothing, says so and exits with 0, and together with `job` it is a usage error. `unprepared: true` keeps the open Drifts that have no valid prepared question and are in no resolution being written or open. The filters combine. Read-only.",
  input: z.strictObject({
    all: z.boolean().optional().describe("Every Drift, not only the open ones."),
    refs: z.array(z.string().min(1)).optional().describe("Only the Drifts that concern the same thing as one of these references."),
    job: z.string().min(1).optional().describe("Only the Drifts filed by this job."),
    currentJob: z.boolean().optional().describe("Only the Drifts filed by the job of this command (`TRAMA_JOB`); nothing when there is none. Not together with `job`."),
    unprepared: z.boolean().optional().describe("Only the open Drifts without a valid prepared question, outside every resolution being written or open."),
  }),
  output: z.object({ drifts: z.array(card.extend({ title: z.string(), status: z.string(), job: z.string().nullable(), prepared: z.object({ valid: z.boolean() }).nullable() })) }),
  example: { all: true, refs: ["order/Paid"], unprepared: true },
  run(ctx, input) {
    if (input.currentJob === true && input.job !== undefined) throw new UsageError("`currentJob` and `job` cannot be used together");
    if (input.currentJob === true && ctx.job === undefined) return text("No TRAMA_JOB is set for this command, so no Drift can be listed as the current job's.", { drifts: [] });
    const job = input.currentJob === true ? ctx.job : input.job;
    return driftListView(ctx.project(), input.all === true, input.refs ?? [], { job, unprepared: input.unprepared === true });
  },
});

const edit = defineCommand({
  object: "drift",
  verb: "edit",
  mode: "immediate",
  summary: "Prepare the question of an open Drift, or attach a Proposal to it.",
  description:
    "At least one of `prepared` and `proposal`. `proposal` attaches a Draft or open Proposal that no other open Drift holds to an open Drift that has none (the rules of `drift new`); a Drift that already has one refuses it. `prepared` writes the Drift's **prepared question**, the one Resolve Drifts would ask the developer, replacing the earlier one: `question` is one question of `trama question new` (its `id` is the Drift's permanent identity, `multi` is `false`) and `decisions` has one decision for each of its options, in the same order. The `fix-code` decisions (`option` counted from 1) name every fix option of the Drift once, plus exactly one `proposal` or `dismissed`; a Drift without fix options has exactly one `proposal` and one `dismissed`. A `proposal` decision needs an attached Proposal, also one given in the same command. Trama records the fingerprint of the Model and Requirements text the Drift's references have now and the instant, so a later change of that text makes the question stale. A wrong input is a usage error naming the field, and nothing is written.",
  positionals: [{ name: "id", description: "The Drift: its ID, a unique prefix or its short number." }],
  input: z.strictObject({
    prepared: z
      .strictObject({
        question: z.looseObject({}).describe("The question, as in `trama question new`: `id` (the Drift's permanent identity), `question`, `context`, `options`, `recommended`, `multi: false`."),
        decisions: z
          .array(z.strictObject({ decision: z.enum(["fix-code", "proposal", "dismissed"]).describe("What picking the option does."), option: z.number().int().min(1).optional().describe("With `fix-code`: the number of the fix option, from 1.") }))
          .describe("One decision for each option of the question, in the same order."),
      })
      .optional()
      .describe("The prepared question and what each option does."),
    proposal: z.string().min(1).optional().describe("The Draft or open Proposal to attach: its ID or short number."),
  }),
  output: card.extend({ proposal: z.string().nullable(), prepared: z.object({ valid: z.boolean() }).nullable() }),
  example: {
    prepared: {
      question: {
        id: "a1b2c3d4",
        question: "A paid order cannot be refunded after a day. What should change?",
        context: "The Model says a paid order can be refunded at any time.",
        options: [
          { label: "Remove the limit", description: "Refunds work at any time.", details: "Fix the code to match the Model." },
          { label: "Keep the code", description: "Late refunds stay refused." },
        ],
        recommended: 0,
        multi: false,
      },
      decisions: [{ decision: "fix-code", option: 1 }, { decision: "dismissed" }],
    },
  },
  exampleArgs: ["D3"],
  effects: { writes: true },
  run(ctx, input, [id]) {
    const project = ctx.project();
    const d = editDrift(project, id as string, {
      ...(input.prepared === undefined ? {} : { prepared: input.prepared }),
      ...(input.proposal === undefined ? {} : { proposal: input.proposal }),
    });
    const n = numbersOf(ctx);
    const prepared = preparedFlag(preparedStatus(project, d));
    const did = [input.proposal === undefined ? "" : "Proposal attached", input.prepared === undefined ? "" : "prepared question written"].filter(Boolean).join(" and ");
    return text(`Drift ${n.name("drift", d.id)} edited: ${did}`, { id: d.id, number: n.label("drift", d.id), proposal: d.data.proposal, prepared });
  },
});

const move = defineCommand({
  object: "drift",
  verb: "move",
  mode: "immediate",
  summary: "Resolve a Drift: fix the code, accept its Proposal or dismiss it.",
  description:
    "Carries out a decision of the developer. `code-to-be-fixed` keeps what should happen: it creates the Fix Task and takes `option` (the number of the chosen fix option, from 1; required when the Drift has options, and in an interactive terminal without it the options are shown as a menu) and the optional `note`; it sets aside the attached Proposal (an open one is rejected, a Draft discarded). `proposal-accepted` approves the attached Proposal, and `skillsDir` adds the configured skills folder where the `trama-req-*` skills are regenerated. `dismissed` closes the Drift without changes. `option` and `note` toward the other two are refused. A resolved Drift is not resolved again.",
  positionals: [
    { name: "id", description: "The Drift: its ID, a unique prefix or its short number." },
    { name: "state", description: "How the Drift is resolved.", choices: STATES },
  ],
  input: z.strictObject({
    option: z.number().int().optional().describe("Only toward `code-to-be-fixed`: the number of the chosen fix option, from 1."),
    note: z.string().optional().describe("Only toward `code-to-be-fixed`: free text kept with the choice."),
    skillsDir: z.string().min(1).optional().describe("Only toward `proposal-accepted`: the configured skills folder to regenerate, besides the ones found."),
  }),
  output: card.extend({ resolution: z.string().nullable(), task: z.string().nullable(), option: z.number().nullable(), note: z.string().nullable(), proposal: z.string().optional(), proposalSetAside: z.string().optional() }),
  example: { option: 1, note: "Keep the log." },
  exampleArgs: ["D3", "code-to-be-fixed"],
  effects: { writes: true },
  run(ctx, input, [id, state]) {
    const project = ctx.project();
    if (input.skillsDir !== undefined && state !== "proposal-accepted") throw new UsageError(`skillsDir applies only toward proposal-accepted, not ${state}`);
    const driftId = getDrift(project, id as string, true).id;
    const how = HOW[state as (typeof STATES)[number]];
    const before = getDrift(project, driftId).data.proposal;
    const status = how === "fix-code" && before !== null ? getProposal(project, before).data.status : null;
    const setAside = status === "open" ? "rejected" : status === "draft" ? "discarded" : null;
    const d = resolveDrift(project, driftId, how, input.skillsDir === undefined ? [] : [input.skillsDir], {
      ...(input.option !== undefined ? { option: input.option } : {}),
      ...(input.note !== undefined ? { note: input.note } : {}),
    });
    const n = numbersOf(ctx);
    return text(`Drift ${n.name("drift", d.id)} resolved (${d.data.resolution})${d.data.task ? `; Task ${n.name("task", d.data.task)} created` : ""}${setAside ? `; attached Proposal ${n.name("proposal", before as string)} ${setAside}` : ""}`, {
      id: d.id,
      number: n.label("drift", d.id),
      resolution: d.data.resolution,
      task: d.data.task,
      option: d.data.option,
      note: d.data.note,
      ...(setAside ? { proposal: before, proposalSetAside: setAside } : {}),
    });
  },
});

export const DRIFT_COMMANDS = [create, show, list, edit, move];
