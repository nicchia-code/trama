import { z } from "zod";
import { ADVISOR_SCANNER_ENV } from "../../core/advisors";
import { sendCoordinatorMessage } from "../../core/question-channel";
import { defineCommand } from "../registry";
import { text } from "../result";

const show = defineCommand({
  object: "advisor",
  verb: "show",
  mode: "immediate",
  summary: "Whether this session is a Run with the Advisor Scanner on.",
  description: `Says whether this session belongs to a Run launched by Trama with the Advisor Scanner on: it reads only \`${ADVISOR_SCANNER_ENV}\`, which is \`1\` in that Run's terminal and absent elsewhere. Any other value counts as off. Trama's advisors ask it before anything else and stay silent when the answer is no. It does not read \`.trama/\`, does not contact the editor, does not count as the agent's activity and exits with 0 either way. Read-only.`,
  input: z.strictObject({}),
  output: z.object({ advisorScanner: z.boolean().describe("True when the Advisor Scanner is on for this session.") }),
  run: (ctx) =>
    text(
      ctx.advisorScanner ? "The Advisor Scanner is on for this session." : "The Advisor Scanner is not on for this session: Trama's advisors stay silent.",
      { advisorScanner: ctx.advisorScanner },
    ),
});

const review = defineCommand({
  object: "advisor",
  verb: "review",
  mode: "blocking",
  summary: "Hand the editor the result of a review by the trama-advisor sub-agent.",
  description:
    "Run by Trama's `trama-advisor` sub-agent in Cursor's chat to end every review: `review` is the identity the request carried, `clean` says whether the code matches the Task, the Model and the Requirements, and `notes` (required when `clean` is `false`, refused when it is `true`) says what the code of the Task does differently. It sends the result to the editor window of the project on the local question channel and prints one line saying that it arrived or that the editor no longer expects it (an editor without that review, or none at all). It exits with 0 in both cases; an invalid input is a usage error (exit 2) and sends nothing. It writes nothing under `.trama/`.",
  stdin: "Reads the JSON result on standard input.",
  input: z.strictObject({
    review: z.string().min(1).describe("The identity of the review request, as its text gave it."),
    clean: z.boolean().describe("True when the code has no difference to report."),
    notes: z.string().optional().describe("What the code of the Task does differently from the Task, the Model or the Requirements. Required when `clean` is false, refused when it is true."),
  }).superRefine((value, ctx) => {
    if (value.clean && value.notes !== undefined) ctx.addIssue({ code: "custom", path: ["notes"], message: "notes are refused when clean is true" });
    if (!value.clean && (value.notes === undefined || value.notes.trim() === "")) ctx.addIssue({ code: "custom", path: ["notes"], message: "notes are required, and not empty, when clean is false" });
  }),
  output: z.object({ delivered: z.boolean().describe("True when an editor window of the project was waiting for this review.") }),
  example: { review: "r7k2", clean: false, notes: "The Task asks for X; the code does Y." },
  run: async (ctx, input, _args, runtime) => {
    const sent = await sendCoordinatorMessage(
      ctx.project(),
      { type: "advisor-reviewed", review: input.review, clean: input.clean, ...(input.notes === undefined ? {} : { notes: input.notes }) },
      runtime.runtimeDir === undefined ? {} : { runtimeDir: runtime.runtimeDir },
    ).catch(() => undefined);
    const delivered = sent !== undefined && sent.delivered > (sent.unexpected ?? 0);
    return text(
      delivered ? `Review ${input.review} reached the editor.` : `Review ${input.review} reached no editor that expects it.`,
      { delivered },
    );
  },
});

export const ADVISOR_COMMANDS = [show, review];
