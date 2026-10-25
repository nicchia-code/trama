import { z } from "zod";
import { TramaError } from "../../core/errors";
import { byName, LEVEL_LABELS, LEVELS, localDate, upcomingAbsences } from "../../core/people";
import { askTeam, TEAM_NO_ANSWER } from "../../core/question-channel";
import { defineCommand } from "../registry";
import { text } from "../result";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** What the editor gives for each member: the fields `trama team show` prints (`data#person`). */
const member = z.object({
  name: z.string().describe("The person's name."),
  handle: z.string().describe("The person's GitHub handle, without the `@`."),
  level: z.enum(LEVELS).describe("`junior`, `mid` or `senior`."),
  skills: z.array(z.string()).describe("The person's skills, in the order they were written."),
  capacity: z.number().describe("The days of work the person has in a sprint."),
  absences: z.array(z.object({ from: date.describe("First day, `YYYY-MM-DD`."), to: date.describe("Last day, `YYYY-MM-DD`.") })).describe("The absences that end today or later, in date order."),
});

const days = (capacity: number): string => `${capacity} ${capacity === 1 ? "day" : "days"} per sprint`;

const show = defineCommand({
  object: "team",
  verb: "show",
  mode: "blocking",
  summary: "The people of this project's team.",
  description:
    "Prints the members of the current project's team, ordered by name: for each, name, `@handle`, level, skills, capacity per sprint in days and the absences that end today or later. The people live only in the Manager's editor, so the command asks the editor window that launched the agent, through the endpoint and secret of `trama question new`: it works only in an agent started by Trama. It has no input and never writes. Fails, with exit code 1, with `trama team show needs the editor: only an agent started by Trama can read the team.` without the editor's endpoint and a recognised terminal, with `The editor did not answer: open the project in the editor with Trama.` when the editor stays silent for 10 seconds, and with the reason of Manager mode when Team is not available. A team with no one prints `No one in this project's team.` (`--json`: `[]`) and exits with 0.",
  input: z.strictObject({}),
  output: z.array(member),
  async run(ctx, _input, _args, runtime) {
    const reply = await askTeam(ctx.project(false), { env: runtime.env, ...(runtime.runtimeDir === undefined ? {} : { runtimeDir: runtime.runtimeDir }) });
    if (!reply.ok) throw new TramaError(reply.reason);
    const parsed = z.array(member).safeParse(reply.members);
    if (!parsed.success) throw new TramaError(TEAM_NO_ANSWER);
    const today = localDate(new Date());
    const members = parsed.data.sort(byName).map((person) => ({ ...person, absences: upcomingAbsences(person.absences, today) }));
    if (members.length === 0) return text("No one in this project's team.", []);
    const md = members
      .map((person) =>
        [
          `## ${person.name} (@${person.handle})`,
          "",
          `- Level: ${LEVEL_LABELS[person.level]}`,
          `- Skills: ${person.skills.length === 0 ? "none" : person.skills.join(", ")}`,
          `- Capacity: ${days(person.capacity)}`,
          `- Absences: ${person.absences.length === 0 ? "none" : person.absences.map((absence) => (absence.from === absence.to ? absence.from : `${absence.from} to ${absence.to}`)).join("; ")}`,
        ].join("\n"),
      )
      .join("\n\n");
    return text(`# Team\n\n${md}`, members);
  },
});

export const TEAM_COMMANDS = [show];
