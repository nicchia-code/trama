import { z } from "zod";
import { AGENT_ANNOUNCEMENT_KINDS, type AnnouncementKind, announce, CHECK_START_PHASES, type CheckPhase, changeCheckPhase, checkOutcome, forgetCheck, getAnnouncement } from "../../core/announcements";
import { UsageError } from "../../core/errors";
import { sendCoordinatorMessageSoon } from "../../core/question-channel";
import { recordTiming } from "../../core/timings";
import { defineCommand } from "../registry";
import { text } from "../result";

const MOVES = ["scanning", "history", "delivered", "failed"] as const;

const create = defineCommand({
  object: "announcement",
  verb: "new",
  mode: "immediate",
  summary: "Announce a card, or a check, that you are about to create.",
  description:
    "Announce a card (`proposal`, `task` or `drift`) as soon as you know you will create it, so the Board shows a ghost of it; pass the printed ID as `announcement` when you create the card. Announce a final check or a scan with `kind: check` and its `phase` (`verifying` or `scanning`): it stays in In progress until `trama announcement move <id> delivered` or `failed`. `phase` is required for a check and refused for the other kinds. With `phase: scanning`, a scan check Trama announced at launch for this terminal or chat and still waiting is taken instead of creating one. `job` (only for a check) names the autopilot job the check belongs to; it defaults to the terminal's own (`TRAMA_JOB`). Prints the announcement's ID. Never wait for the ghost to show.",
  input: z
    .strictObject({
      kind: z.enum(AGENT_ANNOUNCEMENT_KINDS as readonly [AnnouncementKind, ...AnnouncementKind[]]).describe("What is announced: `proposal`, `task`, `drift` or `check`."),
      title: z.string().min(1).describe("A short title: at most five words for a card; for a check, what the work is."),
      phase: z.enum(CHECK_START_PHASES as readonly [CheckPhase, ...CheckPhase[]]).optional().describe("Only for a check: `verifying` or `scanning`."),
      job: z.string().min(1).optional().describe("Only for a check: the autopilot job it belongs to."),
    })
    .superRefine((input, ctx) => {
      if (input.kind === "check" && input.phase === undefined) ctx.addIssue({ code: "custom", path: ["phase"], message: `is required for a check: ${CHECK_START_PHASES.join(" or ")}` });
      if (input.kind !== "check" && input.phase !== undefined) ctx.addIssue({ code: "custom", path: ["phase"], message: "is only for a check" });
      if (input.kind !== "check" && input.job !== undefined) ctx.addIssue({ code: "custom", path: ["job"], message: "is only for a check" });
    }),
  output: z.object({ id: z.string(), kind: z.enum(AGENT_ANNOUNCEMENT_KINDS as readonly [AnnouncementKind, ...AnnouncementKind[]]), title: z.string(), phase: z.enum(CHECK_START_PHASES as readonly [CheckPhase, ...CheckPhase[]]).optional(), job: z.string().optional() }),
  example: { kind: "check", title: "Final check after all Tasks", phase: "verifying" },
  effects: { writes: true, activity: true },
  run(ctx, input) {
    const project = ctx.project();
    const job = input.job ?? (input.kind === "check" ? ctx.job : undefined);
    const announcement = announce(project, { kind: input.kind, title: input.title, ...(input.phase ? { phase: input.phase } : {}), ...(job ? { job } : {}), ...ctx.origin });
    if (input.kind === "check" && announcement.phase)
      recordTiming(project, ctx.origin, { event: "phase-start", check: announcement.id, phase: announcement.phase, title: announcement.title }, { job: announcement.job ?? undefined, startsJob: announcement.phase === "scanning" });
    return text(announcement.id, { id: announcement.id, kind: announcement.kind, title: announcement.title, ...(announcement.phase ? { phase: announcement.phase } : {}), ...(announcement.job ? { job: announcement.job } : {}) });
  },
});

const move = defineCommand({
  object: "announcement",
  verb: "move",
  mode: "immediate",
  summary: "Advance a check, deliver it, or report that it failed.",
  description:
    "`scanning` moves a check from Verifying to Scanning, and `history` from Verifying or Scanning to History, when the final run writes its History; a check only moves forward, so a backward move is refused and changes nothing, and a check already in that phase is left as it is and the command says so. `delivered` delivers a finished check and removes its ghost, and tells the editor's coordinator it succeeded; `failed` does the same but tells it the check failed. An ID that is unknown, already delivered or withdrawn, or not a check is not an error: the command says no check was found, changes nothing, and reports no outcome to the coordinator. Nothing tells whether a check is the final one of a run, so the command does not check that.",
  positionals: [
    { name: "id", description: "The announcement of the check." },
    { name: "state", description: "Where the check goes.", choices: MOVES },
  ],
  input: z.strictObject({}),
  output: z.union([
    z.object({ id: z.string(), outcome: z.enum(["changed", "unchanged", "missing"]) }).describe("`scanning` or `history`"),
    z.object({ id: z.string(), found: z.boolean(), outcome: z.enum(["done", "failed"]).optional() }).describe("`delivered` or `failed`"),
  ]),
  exampleArgs: ["a1b2c3", "history"],
  effects: { writes: true, activity: true, coordinator: true },
  run(ctx, _input, [id, state]) {
    const project = ctx.project();
    if (state === "scanning" || state === "history") {
      const before = getAnnouncement(project, id as string);
      const outcome = changeCheckPhase(project, id as string, state);
      if (outcome === "refused") throw new UsageError(`Check ${id} cannot move back to ${state}; a check only moves forward (verifying, scanning, history); nothing changed.`);
      if (outcome === "changed" && before) recordTiming(project, ctx.origin, { event: "phase-start", check: id as string, phase: state, title: before.title }, { job: before.job ?? undefined });
      if (outcome === "changed")
        sendCoordinatorMessageSoon(project, { type: "check-phase", root: project.root, id: id as string, phase: state, ...(before?.job ? { job: before.job } : {}) }, (reason) => {
          process.stderr.write(`The editor did not receive the phase change of check ${id} (${reason}).\n`);
        });
      const md =
        outcome === "changed"
          ? `Check ${id} is now ${state}`
          : outcome === "unchanged"
            ? `Check ${id} is already ${state}; nothing changed.`
            : `No check "${id}" was found (unknown, already finished or withdrawn, or not a check); nothing changed.`;
      return text(md, { id, outcome });
    }
    const failed = state === "failed";
    const finished = checkOutcome(project, id as string, failed);
    if (finished)
      sendCoordinatorMessageSoon(
        project,
        { type: "check", root: project.root, ...finished },
        (reason) => {
          process.stderr.write(`The editor did not receive the outcome of check ${id} (${reason}); no success is assumed.\n`);
        },
        () => forgetCheck(project, id as string),
      );
    if (finished?.phase) recordTiming(project, ctx.origin, { event: "phase-end", check: id as string, phase: finished.phase, outcome: failed ? "failed" : "done" }, { job: finished.job ?? undefined });
    const outcome = finished ? (failed ? "failed" : "done") : "missing";
    return text(finished ? `Check ${id} is ${outcome}` : `No check "${id}" was found (unknown, already finished or withdrawn, or not a check); nothing changed.`, { id, found: finished !== null, ...(finished ? { outcome } : {}) });
  },
});

export const ANNOUNCEMENT_COMMANDS = [create, move];
