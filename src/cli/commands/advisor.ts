import { z } from "zod";
import { ADVISOR_SCANNER_ENV } from "../../core/advisors";
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

export const ADVISOR_COMMANDS = [show];
