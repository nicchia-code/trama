import { z } from "zod";
import { AGENT_ANNOUNCEMENT_KINDS, type AnnouncementKind, announce, CHECK_START_PHASES, type CheckPhase, changeCheckPhase, checkOutcome, declareNote, forgetCheck, getAnnouncement, NOTE_LENGTH } from "../../core/announcements";
import { TramaError, UsageError } from "../../core/errors";
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
    "Announce a card (`proposal`, `task` or `drift`) as soon as you know you will create it, so the Board shows a ghost of it; pass the printed ID as `announcement` when you create the card. Announce a final check or a scan with `kind: check` and its `phase` (`verifying` or `scanning`): it stays in In progress until `trama announcement move <id> delivered` or `failed`. `phase` is required for a check and refused for the other kinds. With `phase: scanning`, a scan check Trama announced at launch for this terminal and still waiting is taken instead of creating one. The announcement belongs to the agent terminal (`TRAMA_TERMINAL`); only an agent started by Trama can announce, so without the variable the command is refused with an error and writes nothing. Prints the announcement's ID. Never wait for the ghost to show.",
  input: z
    .strictObject({
      kind: z.enum(AGENT_ANNOUNCEMENT_KINDS as readonly [AnnouncementKind, ...AnnouncementKind[]]).describe("What is announced: `proposal`, `task`, `drift` or `check`."),
      title: z.string().min(1).describe("A short title: at most five words for a card; for a check, what the work is."),
      phase: z.enum(CHECK_START_PHASES as readonly [CheckPhase, ...CheckPhase[]]).optional().describe("Only for a check: `verifying` or `scanning`."),
    })
    .superRefine((input, ctx) => {
      if (input.kind === "check" && input.phase === undefined) ctx.addIssue({ code: "custom", path: ["phase"], message: `is required for a check: ${CHECK_START_PHASES.join(" or ")}` });
      if (input.kind !== "check" && input.phase !== undefined) ctx.addIssue({ code: "custom", path: ["phase"], message: "is only for a check" });
    }),
  output: z.object({ id: z.string(), kind: z.enum(AGENT_ANNOUNCEMENT_KINDS as readonly [AnnouncementKind, ...AnnouncementKind[]]), title: z.string(), phase: z.enum(CHECK_START_PHASES as readonly [CheckPhase, ...CheckPhase[]]).optional() }),
  example: { kind: "check", title: "Final check after all Tasks", phase: "verifying" },
  effects: { writes: true, activity: true },
  run(ctx, input) {
    if (ctx.origin.terminal === undefined) throw new TramaError("Refused: only an agent started by Trama can announce, and this command does not run in a Trama terminal (TRAMA_TERMINAL is not set); nothing was written.");
    const project = ctx.project();
    const announcement = announce(project, { kind: input.kind, title: input.title, ...(input.phase ? { phase: input.phase } : {}), ...ctx.origin });
    if (input.kind === "check" && announcement.phase)
      recordTiming(project, ctx.origin, { event: "phase-start", check: announcement.id, phase: announcement.phase, title: announcement.title }, { job: ctx.job, startsJob: announcement.phase === "scanning" });
    return text(announcement.id, { id: announcement.id, kind: announcement.kind, title: announcement.title, ...(announcement.phase ? { phase: announcement.phase } : {}) });
  },
});

const move = defineCommand({
  object: "announcement",
  verb: "move",
  mode: "immediate",
  summary: "Advance a check, deliver it, or report that it failed.",
  description:
    "`scanning` moves a check from Verifying to Scanning, and `history` from Verifying or Scanning to History, when the final run writes its History; a check only moves forward, so a backward move is refused and changes nothing, and a check already in that phase is left as it is and the command says so. `delivered` delivers a finished check and removes its ghost; `failed` does exactly the same, and only the phase timings tell the two outcomes apart. An ID that is unknown, already delivered or withdrawn, or not a check is not an error: the command says no check was found and changes nothing. Nothing tells whether a check is the final one of a run, so the command does not check that.",
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
  effects: { writes: true, activity: true },
  run(ctx, _input, [id, state]) {
    const project = ctx.project();
    if (state === "scanning" || state === "history") {
      const before = getAnnouncement(project, id as string);
      const outcome = changeCheckPhase(project, id as string, state);
      if (outcome === "refused") throw new UsageError(`Check ${id} cannot move back to ${state}; a check only moves forward (verifying, scanning, history); nothing changed.`);
      if (outcome === "changed" && before) recordTiming(project, ctx.origin, { event: "phase-start", check: id as string, phase: state, title: before.title }, { job: ctx.job });
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
    if (finished) forgetCheck(project, id as string);
    if (finished?.phase) recordTiming(project, ctx.origin, { event: "phase-end", check: id as string, phase: finished.phase, outcome: failed ? "failed" : "done" }, { job: ctx.job });
    const outcome = finished ? (failed ? "failed" : "done") : "missing";
    return text(finished ? `Check ${id} is ${outcome}` : `No check "${id}" was found (unknown, already finished or withdrawn, or not a check); nothing changed.`, { id, found: finished !== null, ...(finished ? { outcome } : {}) });
  },
});

const edit = defineCommand({
  object: "announcement",
  verb: "edit",
  mode: "immediate",
  summary: "Declare a note on the ghost of the work you are doing.",
  description:
    `Declares \`note\`, one short line about what you are doing and why, so the developer reads it on the ghost. With the announcement's ID the note goes only to that announcement, of any kind, comparisons included; without an ID it goes to every announcement still waiting that belongs to your terminal (\`TRAMA_TERMINAL\`), comparisons excepted; an agent without a terminal has no announcements. Line breaks become spaces and the ends are trimmed; an empty note is a usage error and saves nothing. A note over ${NOTE_LENGTH} characters is saved cut to the first ${NOTE_LENGTH - 1} followed by \`…\`, and the output says so. An announcement keeps its last 6 notes, each with the instant it arrived; a note equal to the previous one only renews that instant. A note changes nothing else (phase, title, delivery or withdrawal) and does not count as the agent's activity. With no announcement to go to the command says so and exits with 0; an unknown ID is an error and saves nothing.`,
  positionals: [{ name: "id", optional: true, description: "The announcement to write the note on; without it, every announcement waiting for your terminal except comparisons." }],
  input: z.strictObject({ note: z.string().describe(`One short line: what you are doing and why, for the developer. Cut to ${NOTE_LENGTH} characters.`) }),
  output: z.object({ announcements: z.array(z.string()).describe("The IDs of the announcements the note went to."), truncated: z.boolean().describe("True when the note was cut.") }),
  example: { note: "Compares the order Machine with its code before the Tasks run." },
  exampleArgs: ["a1b2c3"],
  effects: { writes: true },
  run(ctx, input, [id]) {
    const { announcements, truncated } = declareNote(ctx.project(), { text: input.note, ...(id === undefined ? {} : { id }), ...ctx.origin });
    const ids = announcements.map((a) => a.id);
    if (announcements.length === 0) return text("No announcement is waiting here; the note was not saved.", { announcements: ids, truncated });
    const lines = announcements.map((a) => `Note saved on ${a.id}: ${a.title}`);
    if (truncated) lines.push(`The note was longer than ${NOTE_LENGTH} characters and was saved cut to ${NOTE_LENGTH}.`);
    return text(lines.join("\n"), { announcements: ids, truncated });
  },
});

export const ANNOUNCEMENT_COMMANDS = [create, edit, move];
