import { z } from "zod";
import { TramaError, UsageError } from "../../core/errors";
import { currentIteration, findGh, type GitHubIteration, ghProblemMessage, iterationEnd, linkedGithubProject, localToday, NO_PROJECT_LINKED, readLinkedProject, sprintField } from "../../core/github";
import { estimateField } from "../../core/sprints";
import { changedSincePublishing } from "../../core/issue-changes";
import { editIssue, findIssue, type FoundIssue, githubBodyOf, effective, type Issue, ISSUE_STATES, type IssueState, listIssues, moveIssue, publicationOrder } from "../../core/issues";
import { requireTeam } from "../../core/manager-mode";
import { getProposal } from "../../core/proposals";
import { syncShortNumbers } from "../../core/short-numbers";
import type { Project } from "../../core/store";
import { defineCommand } from "../registry";
import { text } from "../result";

const state = z.enum(ISSUE_STATES);

const summary = z.object({
  id: z.string().describe("The permanent identity of the issue."),
  title: z.string(),
  handoff: z.string().describe("The identity of the handoff the issue comes from."),
  state: state,
  number: z.number().nullable().describe("GitHub's number, once published."),
  url: z.string().nullable().describe("GitHub's address, once published."),
  dependsOn: z.array(z.string()).describe("The identities of the issues it depends on."),
});

const summaryOf = (issue: Issue) => ({ id: issue.id, title: issue.title, handoff: issue.data.handoff, state: issue.data.state, number: issue.data.number, url: issue.data.url, dependsOn: issue.data.dependsOn });

const issueLine = (issue: Issue): string => `- \`${issue.id}\` ${issue.title} — ${issue.data.state === "published" ? `published as #${issue.data.number}` : issue.data.state}${issue.data.reason === null ? "" : ` (${issue.data.reason})`}`;

/** The text in a Markdown code block whose fence is longer than any run of backticks in it. */
function fenced(text: string): string {
  const fence = "`".repeat(Math.max(3, ...(text.match(/`+/g) ?? []).map((run) => run.length + 1)));
  return `${fence}markdown\n${text.trimEnd()}\n${fence}`;
}

const list = defineCommand({
  object: "issue",
  verb: "list",
  mode: "immediate",
  summary: "The issues of the approved handoffs, in the order of publication.",
  description:
    "Prints the issues of `.trama/issues/` grouped by handoff, each with its identity, title, state (`publishing`, `not-published` or `published`) and GitHub number. The order is the order of publication: the issues an issue depends on come first. `handoff` keeps the issues of one handoff (its identity, a unique prefix or its short number) and `state` those in one state. Read-only. Fails with the reason of Manager mode when Team is not available.",
  input: z.strictObject({
    handoff: z.string().min(1).optional().describe("Only the issues of this handoff: its ID, a unique prefix or its short number."),
    state: state.optional().describe("Only the issues in this state."),
  }),
  output: z.array(summary),
  example: { state: "not-published" },
  run(ctx, input) {
    const project = ctx.project();
    requireTeam(project);
    const handoff = input.handoff === undefined ? undefined : getProposal(project, input.handoff, true).id;
    const issues = publicationOrder(listIssues(project).filter((issue) => (handoff === undefined || issue.data.handoff === handoff) && (input.state === undefined || issue.data.state === input.state)));
    const numbers = syncShortNumbers(project);
    const groups = [...new Set(issues.map((issue) => issue.data.handoff))];
    const md = issues.length === 0 ? "No issue." : groups.map((id) => `## Handoff ${numbers.name("proposal", id)}\n${issues.filter((issue) => issue.data.handoff === id).map(issueLine).join("\n")}`).join("\n\n");
    return text(`# Issues\n\n${md}`, issues.map(summaryOf));
  },
});

const issueJson = z.object({
  ...summary.shape,
  approved: z.boolean().describe("False for an issue of a handoff that is not approved yet."),
  label: z.string().nullable().describe("The handoff's label: the epic."),
  body: z.string().describe("What the agent wrote for GitHub, without the title and without the lines Trama adds."),
  refs: z.array(z.string()),
  estimate: z.number().nullable().describe("Days."),
  assignee: z.string().nullable().describe("GitHub handle, without `@`."),
  reviewer: z.string().nullable().describe("GitHub handle, without `@`."),
  sprint: z.string().nullable(),
  fields: z.record(z.string(), z.string()),
  created: z.string().nullable(),
  published: z.string().nullable(),
  unset: z.array(z.string()).describe("The fields GitHub did not take."),
  reason: z.string().nullable().describe("Why the issue is not published."),
  updated: z.string().nullable().describe("When the last Comment update was recorded."),
  texts: z.record(z.string(), z.string()).describe("The text fingerprint of each reference when the issue was published or last updated."),
  githubBody: z.string().describe("The body to publish on GitHub, composed by Trama."),
  changed: z
    .array(z.object({ ref: z.string(), earlier: z.string().nullable(), current: z.string().nullable() }))
    .describe("The references of a published issue whose text is not what it was when the issue was published or last commented: the text they had (null when git does not have it) and the text they have (null when the reference no longer exists)."),
});

function showJson(project: Project, found: FoundIssue): z.infer<typeof issueJson> {
  const values = effective(found);
  const issue = found.issue;
  const card = found.kind === "card" ? found.issue.data : null;
  return {
    id: issue.id,
    title: issue.title,
    handoff: found.kind === "card" ? found.issue.data.handoff : found.issue.handoff,
    state: card?.state ?? "not-published",
    number: card?.number ?? null,
    url: card?.url ?? null,
    dependsOn: values.dependsOn,
    approved: card !== null,
    label: values.label,
    body: issue.body,
    refs: values.refs,
    estimate: values.estimate,
    assignee: values.assignee,
    reviewer: values.reviewer,
    sprint: values.sprint,
    fields: values.fields,
    created: issue.data.created,
    published: card?.published ?? null,
    unset: card?.unset ?? [],
    reason: card?.reason ?? null,
    updated: card?.updated ?? null,
    texts: card?.texts ?? {},
    githubBody: githubBodyOf(project, found),
    changed: found.kind === "card" ? changedSincePublishing(project, found.issue) : [],
  };
}

const show = defineCommand({
  object: "issue",
  verb: "show",
  mode: "immediate",
  summary: "One issue with every field and the body composed for GitHub.",
  description:
    "Prints one issue with every field and, under `## GitHub body`, the body Trama composes for GitHub (`**Reviewer:**` and `**Depends on:**` lines, the body the agent wrote and, except with Solo mode on, the folded block of references): the same text the Team view previews and the agent publishes. For a published issue whose references changed since it was published or last commented on, `## Changed since publishing` gives, for each changed reference, the text it had (when git has it; otherwise only the reference is named) and the text it has. `--json` has the same fields, `githubBody` and `changed`. It also accepts an issue of a handoff that is not approved yet, by its identity: its fields are then the agent's with the Manager's changes applied. Read-only. Fails with the reason of Manager mode when Team is not available.",
  positionals: [{ name: "id", description: "The issue: its ID or a unique prefix." }],
  input: z.strictObject({}),
  output: issueJson,
  exampleArgs: ["a1b2c3d4"],
  run(ctx, _input, [id]) {
    const project = ctx.project();
    requireTeam(project);
    const found = findIssue(project, id as string);
    const json = showJson(project, found);
    const list = (items: readonly string[]) => (items.length === 0 ? "none" : items.map((item) => `\`${item}\``).join(", "));
    const md = [
      `# ${json.title}`,
      "",
      `Issue \`${json.id}\` · handoff \`${json.handoff}\`${json.label === null ? "" : ` · label \`${json.label}\``} · ${json.approved ? json.state : "not approved yet"}${json.number === null ? "" : ` · #${json.number}`}${json.url === null ? "" : ` · ${json.url}`}`,
      ...(json.reason === null ? [] : ["", `Not published: ${json.reason}`]),
      "",
      `- Estimate: ${json.estimate === null ? "none" : `${json.estimate} d`}`,
      `- Assignee: ${json.assignee === null ? "none" : `@${json.assignee}`}`,
      `- Reviewer: ${json.reviewer === null ? "none" : `@${json.reviewer}`}`,
      `- Sprint: ${json.sprint ?? "none"}`,
      ...Object.entries(json.fields).map(([name, value]) => `- ${name}: ${value}`),
      `- Depends on: ${list(json.dependsOn)}`,
      `- References: ${list(json.refs)}`,
      ...(json.unset.length === 0 ? [] : [`- Not set on GitHub: ${list(json.unset)}`]),
      ...(json.created === null ? [] : [`- Created: ${json.created}`]),
      ...(json.published === null ? [] : [`- Published: ${json.published}`]),
      ...(json.updated === null ? [] : [`- Updated: ${json.updated}`]),
      ...(json.changed.length === 0
        ? []
        : [
            "",
            "## Changed since publishing",
            "",
            ...json.changed.flatMap((change) => [
              `### \`${change.ref}\``,
              "",
              ...(change.current === null ? ["This reference no longer exists in the Model or the Requirements.", ""] : []),
              "Earlier text:",
              "",
              change.earlier === null ? "_Not available: git does not have it._" : fenced(change.earlier),
              "",
              ...(change.current === null ? [] : ["Current text:", "", fenced(change.current), ""]),
            ]),
          ]),
      "",
      "## GitHub body",
      "",
      json.githubBody.trimEnd(),
    ].join("\n");
    return text(md, json);
  },
});

const move = defineCommand({
  object: "issue",
  verb: "move",
  mode: "immediate",
  summary: "Record that an issue was published on GitHub, or that it was not.",
  description:
    "`published` with `number` and `url` records that the agent created the issue on GitHub, right after creating it: Trama records the moment and the fingerprint of the text of each reference of the issue, so it can later tell whether the Model changed under it. `not-published` with `reason` records that GitHub refused it. `publishing` is refused: only Trama moves an issue there, when it asks the agent to publish. An issue that is already `published` is refused. Fails with the reason of Manager mode when Team is not available.",
  positionals: [
    { name: "id", description: "The issue: its ID or a unique prefix." },
    { name: "state", description: "Where the issue goes.", choices: ISSUE_STATES },
  ],
  input: z.strictObject({
    number: z.number().int().min(1).optional().describe("Only toward `published`: the number GitHub gave the issue."),
    url: z.string().min(1).optional().describe("Only toward `published`: the address of the issue on GitHub."),
    reason: z.string().min(1).optional().describe("Only toward `not-published`: why GitHub did not create the issue."),
  }),
  output: summary.extend({ reason: z.string().nullable() }),
  example: { number: 12, url: "https://github.com/acme/web/issues/12" },
  exampleArgs: ["a1b2c3d4", "published"],
  effects: { writes: true, activity: true },
  run(ctx, input, [id, to]) {
    const target = to as IssueState;
    if (target === "published") {
      if (input.number === undefined || input.url === undefined) throw new UsageError("number and url: required toward published");
      if (input.reason !== undefined) throw new UsageError("reason: only toward not-published");
    } else if (target === "not-published") {
      if (input.reason === undefined) throw new UsageError("reason: required toward not-published");
      if (input.number !== undefined || input.url !== undefined) throw new UsageError("number and url: only toward published");
    }
    const project = ctx.project();
    const issue = moveIssue(project, id as string, target, input);
    return text(`Issue ${issue.id} is now ${issue.data.state}${issue.data.number === null ? "" : ` as #${issue.data.number}`}`, { ...summaryOf(issue), reason: issue.data.reason });
  },
});

const edit = defineCommand({
  object: "issue",
  verb: "edit",
  mode: "immediate",
  summary: "Record the fields GitHub did not take, or a Comment update, on a published issue.",
  description:
    "`unset` lists the keys of the fields of the Project GitHub did not take (`assignee`, `reviewer`, `estimate`, `sprint` or `fields.<name>`) and replaces the earlier list; `updated: true` records that the agent wrote the Comment of an update on the issue, with the moment and the fingerprint of the text of its references now. Only a published issue is edited, and nothing else of an issue changes from the command line. Fails with the reason of Manager mode when Team is not available.",
  positionals: [{ name: "id", description: "The issue: its ID or a unique prefix." }],
  input: z.strictObject({
    unset: z.array(z.string().min(1)).optional().describe("The keys of the fields GitHub did not take: `assignee`, `reviewer`, `estimate`, `sprint` or `fields.<name>`. An empty list says every field was taken."),
    updated: z.literal(true).optional().describe("Records a Comment update."),
  }),
  output: summary.extend({ unset: z.array(z.string()), updated: z.string().nullable() }),
  example: { unset: ["sprint"] },
  exampleArgs: ["a1b2c3d4"],
  effects: { writes: true, activity: true },
  run(ctx, input, [id]) {
    const issue = editIssue(ctx.project(), id as string, input);
    return text(`Issue ${issue.id} recorded`, { ...summaryOf(issue), unset: issue.data.unset, updated: issue.data.updated });
  },
});

const fieldsJson = z.object({
  project: z.object({ owner: z.string(), number: z.number(), title: z.string() }).describe("The linked GitHub Project."),
  fields: z.array(z.object({ id: z.string(), name: z.string(), type: z.string().describe("GitHub's data type: `ITERATION`, `SINGLE_SELECT`, `NUMBER`, `TEXT`, `DATE`, …"), options: z.array(z.object({ id: z.string(), name: z.string() })).optional(), sprint: z.boolean().describe("Whether this is the sprint field: the first iteration field."), estimate: z.boolean().describe("Whether this is the estimate field: the first number field whose name contains `estimate` or `days`, without case. Publication fills it with the issue's estimate.") })),
  iterations: z.array(z.object({ id: z.string(), title: z.string(), startDate: z.string().describe("`YYYY-MM-DD`."), duration: z.number().describe("Days."), current: z.boolean().describe("Whether the iteration contains today.") })).describe("The iterations of the sprint field, oldest first."),
});

const lastDay = (iteration: GitHubIteration): string => new Date(Date.parse(`${iterationEnd(iteration)}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

const fields = defineCommand({
  object: "issue",
  verb: "fields",
  mode: "blocking",
  summary: "The fields and iterations of the linked GitHub Project.",
  description:
    "Reads, with the GitHub command line (`gh`), the fields of the GitHub Project linked in the Team view, each with its options, and the iterations of its sprint field with their dates, marking the sprint field (the first iteration field), the estimate field (the first number field whose name contains `estimate` or `days`, without case, which publication fills with the issue's estimate) and the current sprint (the one that contains today). Read-only, on GitHub and in the project. Fails, with exit code 1, when no Project is linked (`No GitHub Project is linked: link one in the Team view.`), when `gh` is not installed, is not logged in or cannot read Projects, with the reason the Team view shows, and with the reason of Manager mode when Team is not available.",
  input: z.strictObject({}),
  output: fieldsJson,
  async run(ctx, _input, _args, runtime) {
    const project = ctx.project();
    requireTeam(project);
    const linked = linkedGithubProject(project);
    if (linked === null) throw new TramaError(NO_PROJECT_LINKED);
    const read = await readLinkedProject(linked, { find: () => findGh(runtime.env) });
    if (!read.ok) throw new TramaError(ghProblemMessage(read.reason));
    const sprint = sprintField(read.project.fields);
    const estimate = estimateField(read.project.fields);
    const current = currentIteration(read.project.iterations, localToday());
    const json = {
      project: linked,
      fields: read.project.fields.map((field) => ({ ...field, sprint: field === sprint, estimate: field === estimate })),
      iterations: read.project.iterations.map((iteration) => ({ ...iteration, current: iteration === current })),
    };
    const md = [
      `# ${linked.owner} · ${linked.title}`,
      "",
      "## Fields",
      "",
      ...json.fields.map((field) => `- ${field.name} (${field.type})${field.sprint ? " — sprint field" : ""}${field.estimate ? " — estimate field" : ""}${field.options === undefined ? "" : `: ${field.options.length === 0 ? "no options" : field.options.map((option) => option.name).join(", ")}`}`),
      "",
      "## Iterations",
      "",
      ...(json.iterations.length === 0 ? ["No iteration."] : json.iterations.map((iteration) => `- ${iteration.title}: ${iteration.startDate} to ${lastDay(iteration)} (${iteration.duration} days)${iteration.current ? " — current sprint" : ""}`)),
    ].join("\n");
    return text(md, json);
  },
});

export const ISSUE_COMMANDS = [list, show, move, edit, fields];
