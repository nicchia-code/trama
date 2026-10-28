import type { Snapshot } from "../../../../src/core/snapshot";
import type { GitHubIteration, ProjectFields } from "../../../../src/core/github";
import { absenceDaysIn, capacityIn, estimateField, lacksSprints, lastDayOf, loadIn, numberText, type OpenLoad, sprintsShown, workingDaysOf } from "../../../../src/core/sprints";
import type { IssueOnGitHub, IssueStatus, SignalKind } from "../../../../src/core/timeline";
import type { ReportRow, ReportSection } from "../../../../src/core/pr-check";
import { resolveRef } from "../../../../src/core/refs";
import { SPEC_FIELDS } from "../../../../src/core/specs";
import type { Model } from "../../../../src/core/types";
import type { PullRequestReportView, PullRequestView, ToWebview } from "../../protocol";
import { REQUIREMENTS_PREFIX } from "../requirements/logic";
import {
  type Absence,
  DEFAULT_CAPACITY,
  type Level,
  type PersonInput,
  firstName,
  type PersonView,
  sortAbsences,
  uniqueSkills,
} from "../../../../src/core/people";

/** The texts of the People tab (`ui#person`): English whatever `trama.language` says. */
export const EVERYONE_IS_IN = "Everyone you know is already in this team";
export const EMPTY_TITLE = "No one in this team yet";
export const EMPTY_TEXT = "Add the first person so the agent can propose assignees, reviewers and sprints that fit their capacity.";
export const DIALOG_DESCRIPTION = "Trama uses this to propose assignees, reviewers and sprint load.";
/** Under this width the table of people becomes a list. */
export const NARROW_PEOPLE = 640;
/** How long the `Undo` of `Remove from team` stays. */
export const UNDO_MS = 10_000;

/** `<n> people in this project's team`, `1 person in this project's team`. */
export const peopleCount = (count: number): string => `${count} ${count === 1 ? "person" : "people"} in this project's team`;

/** The line under the header for saved people that cannot be read. */
export const unreadableText = (count: number): string => `${count} saved people could not be read and are not shown.`;

/** `<name> left this team.` */
export const leftText = (name: string): string => `${name} left this team.`;

/** `4.5 d / sprint`. */
export const capacityText = (capacity: number): string => `${capacity} d / sprint`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

interface Day {
  year: number;
  month: string;
  day: number;
}

function parseDay(date: string): Day {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  return { year, month: MONTHS[month - 1] ?? "", day };
}

/**
 * A range of days as the table says it: `10–12 Nov`, `2 Nov`, `30 Oct – 2 Nov` across months, the year after the end only when it is not `year`
 * (a range across two years says each end's year unless it is the current one).
 */
export function rangeText(range: Absence, year: number): string {
  const from = parseDay(range.from);
  const to = parseDay(range.to);
  const yearOf = (day: Day): string => (day.year === year ? "" : ` ${day.year}`);
  if (range.from === range.to) return `${to.day} ${to.month}${yearOf(to)}`;
  if (from.year === to.year && from.month === to.month) return `${from.day}–${to.day} ${to.month}${yearOf(to)}`;
  return `${from.day} ${from.month}${yearOf(from)} – ${to.day} ${to.month}${yearOf(to)}`;
}

/** The absence as the table says it: `Off 10–12 Nov`, `Off 2 Nov`, `Off 30 Oct – 2 Nov`. */
export const absenceText = (absence: Absence, year: number): string => `Off ${rangeText(absence, year)}`;

/** The people whose name, handle, level or skills hold `query`, without case: what the search of `Add from other projects` leaves. */
export const personSearchValue = (person: PersonView): string => [person.name, person.handle, person.level, ...person.skills].join(" ");

export interface AbsenceDraft {
  /** Identifies the row while it is edited, whatever its place. */
  key: number;
  from: string;
  to: string;
}

/** What the person dialog holds while it is open. */
export interface PersonDraft {
  id?: string;
  name: string;
  handle: string;
  level: Level;
  /** What the number field holds, as text. */
  capacity: string;
  skills: string[];
  /** What was typed in the tag input and not yet added. */
  skillText: string;
  absences: AbsenceDraft[];
}

let nextKey = 1;
export const newAbsenceDraft = (): AbsenceDraft => ({ key: nextKey++, from: "", to: "" });

export const newDraft = (): PersonDraft => ({ name: "", handle: "", level: "mid", capacity: String(DEFAULT_CAPACITY), skills: [], skillText: "", absences: [] });

export const draftOf = (person: PersonView): PersonDraft => ({
  id: person.id,
  name: person.name,
  handle: person.handle,
  level: person.level,
  capacity: String(person.capacity),
  skills: [...person.skills],
  skillText: "",
  absences: sortAbsences(person.absences).map((absence) => ({ key: nextKey++, from: absence.from, to: absence.to })),
});

/** The skills of the draft with what is written in the tag input added: Enter or a comma add each part, a repeat (without case) is ignored. */
export function withSkills(skills: readonly string[], text: string): string[] {
  return uniqueSkills([...skills, ...text.split(",")]);
}

/** What `Save` checks and sends. What waits in the tag input counts as a skill. */
export function inputOf(draft: PersonDraft): PersonInput {
  const capacity = draft.capacity.trim() === "" ? Number.NaN : Number(draft.capacity);
  return {
    ...(draft.id === undefined ? {} : { id: draft.id }),
    name: draft.name,
    handle: draft.handle,
    level: draft.level,
    skills: withSkills(draft.skills, draft.skillText),
    capacity,
    absences: draft.absences.map(({ from, to }) => ({ from, to })),
  };
}

// ---- GitHub (`ui#github-project`) ----

/** What the host sent last about GitHub; null until it has. */
export type GitHubMessage = Extract<ToWebview, { type: "teamGitHub" }>;
/** A Project of the owner as the picker offers it. */
export type GitHubChoice = GitHubMessage["projects"][number];

/** The texts of the GitHub parts of the Team view: English whatever `trama.language` says. */
export const LINK_PAGE_TITLE = "Link a GitHub Project";
export const LINK_PAGE_TEXT = "Team publishes issues to a Project and reads its sprints from the Iteration field.";
export const NO_ITERATION_TEXT = "No Iteration field — add one on GitHub to use it";
export const LOADING_TEXT = "Loading from GitHub…";
export const GH_INSTALL_URL = "https://cli.github.com";

/** The page of the owner's Projects on GitHub, where `Create a Project on GitHub` goes. */
export const createProjectUrl = (owner: string): string => `https://github.com/${encodeURIComponent(owner)}?tab=projects`;

/** The owner of the repository (`<owner>/<repo>` → `<owner>`). */
export const ownerOf = (repository: string): string => repository.split("/")[0] ?? repository;

/** `<owner>/<repo>` for a Project linked to the repository, `<owner>` for any other: the part before ` · ` in the picker. */
export const choiceScope = (choice: GitHubChoice, repository: string | null): string => (choice.repository && repository !== null ? repository : choice.owner);

/** `Iteration · Estimate · Priority fields`: the fields Trama will use, the iteration field first. */
export const fieldsLine = (choice: GitHubChoice): string => `${choice.fields.join(" · ")} ${choice.fields.length === 1 ? "field" : "fields"}`;

/** The key of a Project in the picker. */
export const choiceKey = (choice: Pick<GitHubChoice, "owner" | "number">): string => `${choice.owner}#${choice.number}`;

/** The first Project that can be linked: the one the page starts on. */
export const firstUsable = (choices: readonly GitHubChoice[]): GitHubChoice | undefined => choices.find((choice) => choice.iteration);

/** `just now`, `2 min ago`, `1 h ago`, `3 d ago`: how long before `now` (milliseconds) the ISO time `from` was. */
export function timeAgo(from: string, now: number): string {
  const seconds = Math.max(0, Math.floor((now - Date.parse(from)) / 1000));
  if (Number.isNaN(seconds) || seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

/** `Updated 2 min ago`; empty before the first read that worked. */
export const updatedText = (readAt: string | null, now: number): string => (readAt === null ? "" : `Updated ${timeAgo(readAt, now)}`);

/** `Showing data from 1 h ago.`, or null when nothing was read before. */
export const staleText = (readAt: string | null, now: number): string | null => (readAt === null ? null : `Showing data from ${timeAgo(readAt, now)}.`);

/** What stands in place of the content of the tabs that need a linked Project: the skeleton during the first read, the page to link one, or nothing. */
export function gateOf(github: GitHubMessage | null, picking: boolean): "loading" | "link" | null {
  if (github === null) return null;
  if (github.state === "loading") return "loading";
  if (github.state !== "ready") return null;
  return github.linked === null || picking ? "link" : null;
}

// ---- the tabs of the view (`ui#panel/Team`) ----

/** The tabs of the Team view, in the order Manager mode shows them. */
export const TEAM_TABS = ["decisions", "issues", "pull-requests", "timeline", "people"] as const;
export type TeamTab = (typeof TEAM_TABS)[number];

/** The text of each tab: English whatever `trama.language` says. */
export const TEAM_TAB_LABELS: Record<TeamTab, string> = { decisions: "Decisions", issues: "Issues", "pull-requests": "Pull Requests", timeline: "Timeline", people: "People" };

/** The tabs the view has: with Manager mode on all of them (`Decisions`, `Issues`, `Pull Requests`, `Timeline`, `People`); with it off only `Pull Requests`. */
export const teamTabs = (manager: boolean): TeamTab[] => (manager ? [...TEAM_TABS] : ["pull-requests"]);

/** The tab the view shows: the one the developer chose while the view still has it, otherwise its first tab (`Decisions` with Manager mode on, `Pull Requests` with it off). */
export function shownTab(chosen: string | null, manager: boolean): TeamTab {
  const tabs = teamTabs(manager);
  return tabs.find((tab) => tab === chosen) ?? tabs[0] ?? "pull-requests";
}

/** The title of the box of a failed read without Manager mode, when the view reads only the pull requests: English whatever `trama.language` says. */
export const PULL_REQUESTS_READ_ERROR_TITLE = "Couldn't read the pull requests";

// ---- Decisions and Issues (`ui#proposal/Open`, `ui#issue`) ----

/** The texts of the Decisions and Issues tabs: English whatever `trama.language` says. */
export const DECISIONS_HEADING = "Waiting for your decision";
export const DECISIONS_HINT = "Approving publishes the issues on GitHub";
export const DECISIONS_EMPTY_TITLE = "No handoff waits for a decision";
export const DECISIONS_EMPTY_TEXT = "When the agent turns a request into issues for your team, its proposal appears here for you to approve.";
export const ISSUES_EMPTY = "No issues yet. Approve a handoff to publish its issues.";
export const FINISHING_REASON = "The agent is still finishing";
/** Under this width the Issues table becomes blocks, and the issue preview puts the fields under the body. */
export const NARROW_ISSUES = 640;
export const NARROW_PREVIEW = 720;

export type HandoffViewData = Snapshot["handoffs"][number];
export type HandoffIssueData = HandoffViewData["issues"][number];
export type IssueRowData = Snapshot["issues"][number];

const sameDay = (a: Date, b: Date): boolean => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** `12 min ago`, `1 h ago`, `yesterday`, then the date (`3 Oct`, with the year when it is not this one); null for a card that remembers no instant. `now` is in milliseconds. */
export function proposedAgo(created: string | null, now: number): string | null {
  if (created === null) return null;
  const then = new Date(created);
  if (Number.isNaN(then.getTime())) return null;
  const minutes = Math.max(0, Math.floor((now - then.getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} h ago`;
  const today = new Date(now);
  const yesterday = new Date(now);
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(then, yesterday)) return "yesterday";
  const day = `${then.getFullYear()}-${String(then.getMonth() + 1).padStart(2, "0")}-${String(then.getDate()).padStart(2, "0")}`;
  return rangeText({ from: day, to: day }, today.getFullYear());
}

const plural = (count: number, one: string, many: string): string => `${count} ${count === 1 ? one : many}`;

/** The second line of a handoff card: `Creates 3 issues · changes 2 Machines · proposed 12 min ago`. */
export function createsLine(handoff: Pick<HandoffViewData, "issues" | "files" | "machines" | "created">, now: number): string {
  const ago = proposedAgo(handoff.created, now);
  return [`Creates ${plural(handoff.issues.length, "issue", "issues")}`, handoff.files === 0 ? "changes nothing in the Model" : `changes ${plural(handoff.machines, "Machine", "Machines")}`, ...(ago === null ? [] : [`proposed ${ago}`])].join(" · ");
}

/** `1 warning`, `3 warnings`. */
export const warningsText = (count: number): string => plural(count, "warning", "warnings");

/** What a handoff card or the preview's bar shows of the decision: why Approve is disabled and why Reject (and its arrow) are, each null when it works. */
export interface DecisionState {
  approve: string | null;
  reject: string | null;
}

/** The decision buttons of an open handoff: the agent still finishing disables both; a handoff that is blocked (`Link a GitHub Project first`, stale…) disables Approve with its reason. */
export function decisionState(handoff: Pick<HandoffViewData, "id" | "block">, finishing: readonly string[]): DecisionState {
  const waiting = finishing.includes(handoff.id) ? FINISHING_REASON : null;
  return { approve: waiting ?? handoff.block?.reason ?? null, reject: waiting };
}

/** The place a preview is at, by the identity of the handoff and the index of the issue; both are checked against the snapshot before use. */
export interface PreviewAt {
  handoff: string;
  issue: number;
}

/** Where the preview is, now: null when the handoff is gone (decided) or has no issue; the index is brought inside the issues it has. */
export function previewOf(handoffs: readonly HandoffViewData[], at: PreviewAt | null): { handoff: HandoffViewData; issue: HandoffIssueData; index: number } | null {
  if (at === null) return null;
  const handoff = handoffs.find((h) => h.id === at.handoff);
  if (handoff === undefined || handoff.issues.length === 0) return null;
  const index = Math.min(Math.max(at.issue, 0), handoff.issues.length - 1);
  return { handoff, issue: handoff.issues[index] as HandoffIssueData, index };
}

/** `Alt+↓` goes to the next issue, `Alt+↑` to the previous one; at the ends it stays. */
export const stepIssue = (index: number, count: number, step: 1 | -1): number => Math.min(Math.max(index + step, 0), Math.max(count - 1, 0));

const endOf = (startDate: string, duration: number): string => new Date(Date.parse(`${startDate}T00:00:00Z`) + duration * 86_400_000).toISOString().slice(0, 10);

/** Today's date in the local time zone, `YYYY-MM-DD`. */
export const todayOf = (now: number): string => {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** `Sprint 14 · 2–6 Nov`: the title of an iteration and the days it runs. */
export function sprintLabel(iteration: { title: string; startDate: string; duration: number }, year: number): string {
  return `${iteration.title} · ${rangeText({ from: iteration.startDate, to: lastDayOf(iteration) }, year)}`;
}

/** The data types of the fields a Project has of its own, which the Manager never changes on an issue. */
const OWN_FIELD_TYPES = new Set(["TITLE", "ASSIGNEES", "LABELS", "LINKED_PULL_REQUESTS", "MILESTONE", "REPOSITORY", "REVIEWERS", "PARENT_ISSUE", "SUB_ISSUES_PROGRESS", "TRACKS", "TRACKED_BY"]);

/** One field of the preview's column: its label, what it is edited with, the value now and the agent's. */
export interface FieldEditor {
  /** `assignee`, `reviewer`, `estimate`, `sprint` or `fields.<name>`. */
  key: string;
  label: string;
  kind: "person" | "estimate" | "sprint" | "select" | "number" | "text";
  /** The value of the issue now, as text; empty for none. */
  value: string;
  /** The value the agent proposed, as text; empty for none. */
  agent: string;
  /** The Manager changed it. */
  changed: boolean;
  /** The choices of a `Select`: `value` is what is sent, `label` what is shown. */
  options: { value: string; label: string; person?: { initials: string; handle: string } }[];
}

const initialsOf = (handle: string): string => handle.slice(0, 2).toUpperCase();

/**
 * The fields of an issue's preview, in order: `Assignee`, `Reviewer`, `Estimate (days)`, `Sprint`, then every other field of the linked Project in the Project's order
 * (a single-select as a `Select`, a number or a text as an input); the iteration fields other than the sprint, the Project's estimate field (`Estimate (days)` fills it) and the
 * fields Trama cannot set are left out. Without a read Project only the four first fields stand, the sprint with the value it has and `No sprint`.
 */
export function fieldEditors(
  issue: Pick<HandoffIssueData, "values" | "agent" | "changed">,
  members: readonly Pick<PersonView, "handle" | "initials">[],
  project: GitHubMessage["project"],
  now: number,
): FieldEditor[] {
  const text = (value: string | number | null | undefined): string => (value === null || value === undefined ? "" : String(value));
  const people = (current: string): FieldEditor["options"] => {
    const handles = members.map((member) => ({ value: member.handle, label: `@${member.handle}`, person: { initials: member.initials, handle: member.handle } }));
    return current !== "" && !members.some((member) => member.handle.toLowerCase() === current.toLowerCase()) ? [...handles, { value: current, label: `@${current}`, person: { initials: initialsOf(current), handle: current } }] : handles;
  };
  const today = todayOf(now);
  const year = new Date(now).getFullYear();
  const iterations = project?.iterations ?? [];
  const sprints = iterations.filter((iteration) => today < endOf(iteration.startDate, iteration.duration) || iteration.title === issue.values.sprint).map((iteration) => ({ value: iteration.title, label: sprintLabel(iteration, year) }));
  const sprintValue = text(issue.values.sprint);
  const base = (key: string, label: string, kind: FieldEditor["kind"], value: string, agent: string, options: FieldEditor["options"] = []): FieldEditor => ({ key, label, kind, value, agent, changed: issue.changed.includes(key), options });
  const out: FieldEditor[] = [
    base("assignee", "Assignee", "person", text(issue.values.assignee), text(issue.agent.assignee), people(text(issue.values.assignee))),
    base("reviewer", "Reviewer", "person", text(issue.values.reviewer), text(issue.agent.reviewer), people(text(issue.values.reviewer))),
    base("estimate", "Estimate (days)", "estimate", text(issue.values.estimate), text(issue.agent.estimate)),
    base("sprint", "Sprint", "sprint", sprintValue, text(issue.agent.sprint), sprints.some((s) => s.value === sprintValue) || sprintValue === "" ? sprints : [...sprints, { value: sprintValue, label: sprintValue }]),
  ];
  const estimate = estimateField(project?.fields ?? []);
  for (const field of project?.fields ?? []) {
    // The iteration fields (the sprint is edited above), the estimate field (`Estimate (days)` above) and the fields a Project has of its own are not shown.
    if (field.type === "ITERATION" || field === estimate || OWN_FIELD_TYPES.has(field.type)) continue;
    const key = `fields.${field.name}`;
    const value = text(issue.values.fields[field.name]);
    const agent = text(issue.agent.fields[field.name]);
    if (field.type === "SINGLE_SELECT") out.push(base(key, field.name, "select", value, agent, (field.options ?? []).map((option) => ({ value: option.name, label: option.name }))));
    else if (field.type === "NUMBER") out.push(base(key, field.name, "number", value, agent));
    else if (field.type === "TEXT") out.push(base(key, field.name, "text", value, agent));
  }
  return out;
}

/** What the input of a field sends when it is left or chosen: `null` for nothing chosen, a number of days for an estimate that is one, the text otherwise. */
export function fieldValueToSend(editor: Pick<FieldEditor, "kind">, text: string): string | number | null {
  const trimmed = text.trim();
  if (editor.kind === "estimate") return trimmed !== "" && Number.isFinite(Number(trimmed)) ? Number(trimmed) : trimmed;
  return trimmed === "" ? null : trimmed;
}

/** An issue row as the Issues table shows it: the card of Trama with what GitHub says of its issue (`github`, null before it was read or when it is not published). */
export type IssueRow = IssueRowData & { github: IssueOnGitHub | null };

/**
 * The rows of the Issues table with what the last read of GitHub says: of a published issue the read has, the sprint, estimate and assignee are GitHub's, `null` when GitHub has
 * none (the values Trama published are only history); an issue the read does not have yet keeps the card's.
 */
export function withGitHub(rows: readonly IssueRowData[], issues: readonly IssueOnGitHub[]): IssueRow[] {
  const byNumber = new Map(issues.map((issue) => [issue.number, issue]));
  return rows.map((row) => {
    const github = row.state === "published" && row.number !== null ? (byNumber.get(row.number) ?? null) : null;
    return github === null ? { ...row, github } : { ...row, github, assignee: github.assignee, sprint: github.sprint, estimate: github.estimate };
  });
}

/** The epic's group of the Issues table: its label (`No epic` when the handoff had none), its issues in publication order, the days they add up to and how many are closed. */
export interface EpicGroup {
  label: string;
  rows: IssueRow[];
  days: number;
  closed: number;
}

/** The rows grouped by epic, the groups in the order of their oldest handoff: the rows come in the order of their handoffs and keep it. */
export function groupByEpic(rows: readonly IssueRow[]): EpicGroup[] {
  const groups = new Map<string, EpicGroup>();
  for (const row of rows) {
    const label = row.label === "" ? "No epic" : row.label;
    const group = groups.get(label) ?? { label, rows: [], days: 0, closed: 0 };
    group.rows.push(row);
    group.days += row.estimate ?? 0;
    if (row.github?.status === "Closed") group.closed++;
    groups.set(label, group);
  }
  return [...groups.values()];
}

/** `6 issues in 2 epics · ordered by dependencies`. */
export const issuesSummary = (groups: readonly EpicGroup[]): string => `${plural(groups.reduce((sum, g) => sum + g.rows.length, 0), "issue", "issues")} in ${plural(groups.length, "epic", "epics")} · ordered by dependencies`;

/** `9.5 d`, `5 d`. */
export const daysText = (days: number): string => `${Number.isInteger(days) ? days : days.toFixed(1).replace(/\.0$/, "")} d`;

/** `4 issues · 9.5 d`, and ` · 2 closed` after it when some are closed. */
export const groupText = (group: EpicGroup): string => `${plural(group.rows.length, "issue", "issues")} · ${daysText(group.days)}${group.closed > 0 ? ` · ${group.closed} closed` : ""}`;

/** The status of an issue as the Issues table says it (`ui#issue`, `ui#issue/Published`): the pill's text and which of its looks it wears. */
export interface IssueStatusView {
  label: "Publishing" | "Not published" | IssueStatus;
  look: "publishing" | "not-published" | "open" | "in-progress" | "in-review" | "closed" | "not-planned" | "not-found";
}

const GITHUB_LOOKS: Record<IssueStatus, IssueStatusView["look"]> = {
  Open: "open",
  "In progress": "in-progress",
  "In review": "in-review",
  Closed: "closed",
  "Not planned": "not-planned",
  "Not found on GitHub": "not-found",
};

/** What the pill says: `Publishing` or `Not published` before the issue is on GitHub; after it, where the last read found it, and `Open` while nothing has been read for it. */
export function issueStatus(row: Pick<IssueRowData, "state">, github: Pick<IssueOnGitHub, "status"> | null = null): IssueStatusView {
  switch (row.state) {
    case "publishing":
      return { label: "Publishing", look: "publishing" };
    case "not-published":
      return { label: "Not published", look: "not-published" };
    case "published":
      return github === null ? { label: "Open", look: "open" } : { label: github.status, look: GITHUB_LOOKS[github.status] };
  }
}

/** `Fields not set on GitHub: Priority, Sprint`. */
export const unsetText = (names: readonly string[]): string => `Fields not set on GitHub: ${names.join(", ")}`;

/** The two letters an assignee's avatar shows: the initials of the person in the team, otherwise the first two letters of the handle. */
export function avatarText(handle: string, members: readonly Pick<PersonView, "handle" | "initials">[]): string {
  return members.find((member) => member.handle.toLowerCase() === handle.toLowerCase())?.initials ?? initialsOf(handle);
}

/** A warning of an issue as the preview's box says it: the part in bold, the hint after it, and whether the box has `Split`. */
export function warningParts(warning: string): { strong: string; hint: string; split: boolean } {
  if (warning.startsWith("Estimated ")) return { strong: `${warning}.`, hint: "Split it so each part fits in a sprint.", split: true };
  return { strong: `${warning}.`, hint: warning.startsWith("Not covered:") ? "No issue of this handoff is about it." : "", split: false };
}

// ---- Timeline (`ui#github-project/Linked`) ----

/** The texts of the Timeline tab: English whatever `trama.language` says. */
export const TIMELINE_EMPTY = "No published issues yet: the timeline fills as handoffs are approved.";
export const TIMELINE_SCALE = "Block width = estimate (full width = 5 days)";
export const ADD_ITERATIONS = "Add iterations on GitHub";
export const NO_ITERATION = "No iteration";
export const UNASSIGNED = "Unassigned";
export const NOT_IN_TEAM = "Not in this team";
/** The days a block as wide as its cell stands for. */
export const FULL_BLOCK_DAYS = 5;

export type TimelineMode = "person" | "epic";

/** `The Project has no iteration after Sprint 16.`; without any iteration there is no sprint to name. */
export const missingSprintsText = (after: string | null): string => (after === null ? "The Project has no iteration." : `The Project has no iteration after ${after}.`);

/** The page where the Project's iterations are added: its settings; the owner's Projects when the read predates the address. */
export const projectSettingsUrl = (project: Pick<ProjectFields, "url"> | null, owner: string): string => (project?.url === undefined ? createProjectUrl(owner) : `${project.url.replace(/\/+$/, "")}/settings`);

/** A column of the grid: a sprint of the Project, or the last one, for the issues with no sprint. */
export interface TimelineColumn {
  key: string;
  title: string;
  /** `26–30 Oct` (the working days of the sprint), or `After 20 Nov` for the column of the issues with no sprint. */
  dates: string;
  current: boolean;
  /** The sprint; null for the column of the issues with no sprint. */
  iteration: GitHubIteration | null;
}

/** The block of an issue: its width is the estimate over 5 days of the cell's width. */
export interface IssueBlock {
  kind: "issue";
  key: string;
  number: number;
  title: string;
  /** The estimate; null when GitHub has none. */
  days: number | null;
  /** The share of the cell's width, from 0 to 1. */
  fraction: number;
  /** The epic of its handoff, empty for none: the dot's colour comes from it. */
  epic: string;
  closed: boolean;
  url: string | null;
  /** `#<n> <title> · <d> d · <status>`: the tooltip and the accessible name. */
  name: string;
  /** The first of the signals the issue has, whose colour is the block's left border. */
  signal: SignalKind | null;
}

/** An absence of a person: as wide as the working days it takes in the sprint. */
export interface AbsenceBlock {
  kind: "absence";
  key: string;
  /** `Off 10–12 Nov`. */
  text: string;
  fraction: number;
}

export type TimelineBlock = IssueBlock | AbsenceBlock;

/** What a person has in a sprint against their capacity in it. */
export interface CellLoad {
  days: number;
  capacity: number;
  over: boolean;
  /** How many of the items that make the load have no estimate. */
  unestimated: number;
}

export interface TimelineCell {
  blocks: TimelineBlock[];
  /** By person, in a sprint's cell of a member of the team. */
  load: CellLoad | null;
  /** By epic, the days the epic has in the sprint; null when it has no issue there. */
  epicDays: number | null;
}

export interface TimelineLane {
  key: string;
  kind: "member" | "unassigned" | "other" | "epic";
  /** The name, or the epic's label (`No epic` for none). */
  title: string;
  /** `5 d / sprint`, or `3 issues`; null for the lanes with none. */
  detail: string | null;
  /** The initials of a member's avatar. */
  initials: string | null;
  /** One cell per column. */
  cells: TimelineCell[];
}

export interface TimelineModel {
  columns: TimelineColumn[];
  lanes: TimelineLane[];
  /** No issue is published: the grid of the sprints is empty. */
  empty: boolean;
  /** The Project lacks sprints: the sprint the warning names, or null when it has no iteration at all; null when it has enough. */
  missing: { after: string | null } | null;
}

export interface TimelineInput {
  iterations: readonly GitHubIteration[];
  rows: readonly IssueRow[];
  loads: readonly OpenLoad[];
  members: readonly PersonView[];
  /** `YYYY-MM-DD`. */
  today: string;
  mode: TimelineMode;
  /** The signals of the open issues by GitHub number, as the host sent them. */
  signals?: Readonly<Record<number, readonly { kind: SignalKind }[]>>;
}

const isClosedRow = (row: IssueRow): boolean => {
  const look = issueStatus(row, row.github).look;
  return look === "closed" || look === "not-planned";
};

/** The sprint's own days as the column says them: `26–30 Oct`. */
function sprintDates(iteration: GitHubIteration, year: number): string {
  const days = workingDaysOf(iteration);
  return rangeText({ from: days[0] ?? iteration.startDate, to: days.at(-1) ?? lastDayOf(iteration) }, year);
}

const sameHandle = (a: string | null, b: string): boolean => a !== null && a.toLowerCase() === b.toLowerCase();

/**
 * The grid of the Timeline: the sprints shown (`rules#github-project/Linked`) and, by person or by epic, a lane for each with one cell per sprint and a last one for the open
 * issues with no sprint. The published issues the read still has are laid in their sprint in the order they were published, which is the order of their dependencies; a closed
 * issue is shown only in a sprint that is shown. A person's cell holds their absences first and their load against their capacity; an epic's cell the days of the epic.
 */
export function timelineOf(input: TimelineInput): TimelineModel {
  const { iterations, loads, members, today, mode, signals = {} } = input;
  const year = Number(today.slice(0, 4));
  const rows = input.rows.filter((row) => row.state === "published" && row.number !== null && row.github?.status !== "Not found on GitHub");
  const openSprints = new Set(rows.flatMap((row) => (row.sprint === null || isClosedRow(row) ? [] : [row.sprint])));
  const shown = sprintsShown(iterations, openSprints, today);
  const lastIteration = [...iterations].sort((a, b) => (a.startDate < b.startDate ? -1 : 1)).at(-1);
  const lastWorkingDay = lastIteration === undefined ? null : (workingDaysOf(lastIteration).at(-1) ?? lastDayOf(lastIteration));
  const columns: TimelineColumn[] = [
    ...shown.map((iteration) => ({ key: iteration.id, title: iteration.title, dates: sprintDates(iteration, year), current: iteration.startDate <= today && today <= lastDayOf(iteration), iteration })),
    { key: "no-iteration", title: NO_ITERATION, dates: lastWorkingDay === null ? "" : `After ${rangeText({ from: lastWorkingDay, to: lastWorkingDay }, year)}`, current: false, iteration: null },
  ];
  const noSprint = shown.length;
  const columnOf = (row: IssueRow): number | null => {
    const index = row.sprint === null ? -1 : shown.findIndex((iteration) => iteration.title === row.sprint);
    if (index >= 0) return index;
    if (isClosedRow(row)) return null;
    return row.sprint !== null && iterations.some((iteration) => iteration.title === row.sprint) ? null : noSprint;
  };

  const blockOf = (row: IssueRow): IssueBlock => {
    const number = row.number ?? 0;
    const status = row.github?.status ?? "Open";
    const days = row.estimate;
    return {
      kind: "issue",
      key: row.id,
      number,
      title: row.title,
      days,
      fraction: Math.min(Math.max(days ?? 0, 0) / FULL_BLOCK_DAYS, 1),
      epic: row.label,
      closed: isClosedRow(row),
      url: row.url,
      name: `#${number} ${row.title} · ${days === null ? "no estimate" : daysText(days)} · ${status}`,
      signal: signals[number]?.[0]?.kind ?? null,
    };
  };

  const cellsOf = (laneRows: readonly IssueRow[], member: PersonView | null, byEpic: boolean): TimelineCell[] =>
    columns.map((column, index) => {
      const here = laneRows.filter((row) => columnOf(row) === index);
      const { iteration } = column;
      const absences =
        member === null || iteration === null
          ? []
          : sortAbsences(member.absences).flatMap((absence): AbsenceBlock[] => {
              const taken = absenceDaysIn(absence, iteration);
              return taken === 0 ? [] : [{ kind: "absence", key: `off-${absence.from}-${absence.to}`, text: absenceText(absence, year), fraction: Math.min(taken / FULL_BLOCK_DAYS, 1) }];
            });
      const load: CellLoad | null =
        member === null || iteration === null
          ? null
          : (() => {
              const capacity = capacityIn(member, iteration);
              const { days, unestimated } = loadIn(loads, member.handle, iteration.title);
              return { days, capacity, over: days > capacity, unestimated };
            })();
      return { blocks: [...absences, ...here.map(blockOf)], load, epicDays: byEpic && here.length > 0 ? here.reduce((sum, row) => sum + (row.estimate ?? 0), 0) : null };
    });

  const lanes: TimelineLane[] = [];
  if (mode === "person") {
    for (const member of members) {
      lanes.push({ key: `member-${member.id}`, kind: "member", title: member.name, detail: capacityText(member.capacity), initials: member.initials, cells: cellsOf(rows.filter((row) => sameHandle(row.assignee, member.handle)), member, false) });
    }
    const unassigned = rows.filter((row) => row.assignee === null);
    const others = rows.filter((row) => row.assignee !== null && !members.some((member) => sameHandle(row.assignee, member.handle)));
    if (unassigned.length > 0) lanes.push({ key: "unassigned", kind: "unassigned", title: UNASSIGNED, detail: null, initials: null, cells: cellsOf(unassigned, null, false) });
    if (others.length > 0) lanes.push({ key: "other", kind: "other", title: NOT_IN_TEAM, detail: null, initials: null, cells: cellsOf(others, null, false) });
  } else {
    for (const group of groupByEpic(rows)) {
      lanes.push({ key: `epic-${group.label}`, kind: "epic", title: group.label, detail: plural(group.rows.length, "issue", "issues"), initials: null, cells: cellsOf(group.rows, null, true) });
    }
  }
  const lacking = lacksSprints(iterations, today);
  return { columns, lanes, empty: rows.length === 0, missing: lacking === undefined ? null : { after: lacking.last?.title ?? null } };
}

/** `3.5 / 5 d`, and ` · over` after it when the load is over the capacity. */
export const loadText = (load: Pick<CellLoad, "days" | "capacity" | "over">): string => `${numberText(load.days)} / ${numberText(load.capacity)} d${load.over ? " · over" : ""}`;

/** The load as a screen reader says it: `6 of 5 days, over capacity`. */
export const loadSpoken = (load: Pick<CellLoad, "days" | "capacity" | "over">): string => `${numberText(load.days)} of ${numberText(load.capacity)} days${load.over ? ", over capacity" : ""}`;

/** `2 items without estimate`: the note of a cell's tooltip, null when every item has one. */
export const unestimatedText = (count: number): string | null => (count === 0 ? null : `${plural(count, "item", "items")} without estimate`);

/** What the preview's `Sprint` field says under its value (`ui#issue/Published`): the assignee's load in that sprint, counting this issue and the open handoffs. */
export interface SprintLoadNote {
  text: string;
  over: boolean;
}

/**
 * `<first name> has <load> / <capacity> d in this sprint` for the assignee of an issue of a handoff and the sprint it is proposed for; null without a member of the team as
 * assignee, without a sprint of the Project or before the Project was read. The load adds up (`rules#issue/Published`): the open items of the Project assigned to the person in
 * that sprint (`loads`), this issue with the values it has now (`issue`, `estimate` as typed) and the other issues of every open handoff in `handoffs` (this one and the stale
 * ones included, never a Draft) assigned to the person in that sprint, each with the Manager's values applied (`values`) and an estimate that counts 0 when it has none. The
 * issue `issue.id` is never counted twice: its entry in `handoffs` is skipped, whatever values it holds there.
 */
export function sprintLoadNote(
  issue: { id: string; assignee: string; sprint: string; estimate: string },
  members: readonly PersonView[],
  iterations: readonly GitHubIteration[],
  loads: readonly OpenLoad[],
  handoffs: readonly HandoffViewData[],
): SprintLoadNote | null {
  const member = members.find((person) => sameHandle(issue.assignee, person.handle));
  const iteration = iterations.find((candidate) => candidate.title === issue.sprint);
  if (member === undefined || iteration === undefined) return null;
  const estimate = Number(issue.estimate);
  const own = issue.estimate.trim() !== "" && Number.isFinite(estimate) && estimate > 0 ? estimate : 0;
  const proposed = handoffs
    .flatMap((handoff) => handoff.issues)
    .filter((other) => other.id !== issue.id && other.values.sprint === iteration.title && sameHandle(other.values.assignee, member.handle))
    .reduce((sum, other) => sum + (other.values.estimate ?? 0), 0);
  const days = loadIn(loads, member.handle, iteration.title).days + own + proposed;
  const capacity = capacityIn(member, iteration);
  return { text: `${firstName(member.name)} has ${numberText(days)} / ${numberText(capacity)} d in this sprint`, over: days > capacity };
}

// ---- the Pull Requests tab (`ui#pull-request-check`) ----------------------------------------------------------------

/** What the host sent last about the pull requests. */
export type PullRequestsMessage = Extract<ToWebview, { type: "pullRequests" }>;

/** Under this width each row of the tab becomes a block. */
export const NARROW_PULL_REQUESTS = 640;

export const PULL_REQUESTS_EMPTY = "No open pull requests ready for review.";
export const OUTDATED_TOOLTIP = "New commits since this check";
export const CHECK_RUNNING_REASON = "A PR Check is running";
export const RUN_IN_PROGRESS_REASON = "A run is in progress";
export const CANNOT_READ_REASON = "Can't read GitHub";

/** `3 open pull requests ready for review`, `1 open pull request ready for review`. */
export const pullRequestsSummary = (count: number): string => `${count} open pull ${count === 1 ? "request" : "requests"} ready for review`;

/** The pull requests the highest number first; the order the host sends them in, kept here so the tab does not depend on it. */
export const orderPullRequests = (items: readonly PullRequestView[]): PullRequestView[] => [...items].sort((a, b) => b.number - a.number);

/** `ada · main ← feature`: the author, then the branch the pull request goes into and its own. */
export const pullRequestLine = (item: Pick<PullRequestView, "author" | "baseRefName" | "headRefName">): string => `${item.author} · ${branchesLine(item.baseRefName, item.headRefName)}`;

/** How a row says where its pull request is: the look decides the icon and the style, the label is always written, so the state is never told by colour alone. */
export interface PullRequestStatus {
  look: "not-checked" | "checking" | "checked";
  label: string;
  /** The `Outdated` badge: the pull request has new commits since the report on show. Never while the check runs. */
  outdated: boolean;
}

/** The status of a row: `Checking…` while its own PR Check runs, `Checked <time ago>` with a report (outdated or not) and `Not checked` otherwise. */
export function pullRequestStatus(item: Pick<PullRequestView, "number" | "report">, running: number | null, now: number): PullRequestStatus {
  if (running === item.number) return { look: "checking", label: "Checking…", outdated: false };
  if (item.report === null) return { look: "not-checked", label: "Not checked", outdated: false };
  return { look: "checked", label: `Checked ${timeAgo(item.report.checkedAt, now)}`, outdated: item.report.outdated };
}

/** Why `Check` is disabled on every row, or null: another PR Check of this window runs, a Run of this window is in progress, or the last read of GitHub failed, in this order. */
export function checkDisabledReason(message: Pick<PullRequestsMessage, "blocked" | "error">): string | null {
  if (message.blocked === "running") return CHECK_RUNNING_REASON;
  if (message.blocked === "run") return RUN_IN_PROGRESS_REASON;
  return message.error === null ? null : CANNOT_READ_REASON;
}

/** What a row offers: `stop` in place of `check` while its own PR Check runs; `check` is `Check again` with a report, disabled with `reason` as tooltip; `report` only with a report. */
export interface PullRequestActions {
  check: { label: "Check" | "Check again"; reason: string | null } | null;
  stop: boolean;
  report: boolean;
}

export function pullRequestActions(item: Pick<PullRequestView, "number" | "report">, message: Pick<PullRequestsMessage, "running" | "blocked" | "error">): PullRequestActions {
  const report = item.report !== null;
  if (message.running === item.number) return { check: null, stop: true, report };
  return { check: { label: report ? "Check again" : "Check", reason: checkDisabledReason(message) }, stop: false, report };
}

// ---- the report of a PR Check (`ui#pull-request-report`) ------------------------------------------------------------

/** Under this width each row of the report becomes a block. */
export const NARROW_REPORT = 640;

/** The sections of a report, in the order they are shown, with their names. */
export const REPORT_SECTIONS: readonly { id: ReportSection; name: string }[] = [
  { id: "model", name: "Model" },
  { id: "model-problems", name: "Model problems" },
  { id: "code", name: "Code" },
  { id: "open-work", name: "Open work" },
];

export const REPORT_OUTDATED = "The pull request has new commits since this check.";
export const REPORT_EMPTY = "No differences found.";
/** What an empty cell of the table shows. */
export const REPORT_NO_VALUE = "–";

/** A section of the table: its rows in the order they came, with its name; the number shown next to the name is `rows.length`. */
export interface ReportGroup {
  section: ReportSection;
  name: string;
  rows: ReportRow[];
}

/** The rows grouped by section in the order `Model`, `Model problems`, `Code`, `Open work`; a section with no rows is not there. Within a section the rows keep their order. */
export function groupReportRows(rows: readonly ReportRow[]): ReportGroup[] {
  return REPORT_SECTIONS.map(({ id, name }) => ({ section: id, name, rows: rows.filter((row) => row.section === id) })).filter((group) => group.rows.length > 0);
}

/** The line in the warning colour when the report is outdated (the head of the pull request moved since), else null. */
export const outdatedNote = (report: Pick<PullRequestReportView, "outdated">): string | null => (report.outdated ? REPORT_OUTDATED : null);

/** `#12 · Refund on cancel`. */
export const reportTitle = (number: number, title: string): string => `#${number} · ${title}`;

/** The first seven characters of a commit. */
export const shortCommit = (commit: string): string => commit.slice(0, 7);

/** The date and time a check was made, as the editor's language writes them; `timeZone` is for tests. */
export function checkedAtText(checkedAt: string, locale?: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", ...(timeZone === undefined ? {} : { timeZone }) }).format(new Date(checkedAt));
}

/** `Checked 28 Oct 2026, 10:30 on 1a2b3c4 · Solo`, or `· Collaborative`. */
export function checkedLine(report: Pick<PullRequestReportView, "checkedAt" | "head" | "variant">, locale?: string, timeZone?: string): string {
  return `Checked ${checkedAtText(report.checkedAt, locale, timeZone)} on ${shortCommit(report.head)} · ${report.variant === "solo" ? "Solo" : "Collaborative"}`;
}

/** `main ← feature`: the branch the pull request goes into, then its own. */
export const branchesLine = (base: string, head: string): string => `${base} ← ${head}`;

/** What a cell of the table shows: its text, or `–` when it is empty. */
export const reportCell = (value: string | null): string => (value === null || value.trim() === "" ? REPORT_NO_VALUE : value);

const modelOfView = new WeakMap<Snapshot, Model>();

/** The Model of the snapshot as `resolveRef` reads it: the Features, Machines and Actors of the open folder. */
function modelOf(snapshot: Snapshot): Model {
  let model = modelOfView.get(snapshot);
  if (model === undefined) {
    model = {
      system: { file: "system.md", name: snapshot.system.name, description: snapshot.system.description },
      actors: new Map(snapshot.actors.map((actor) => [actor.id, actor])),
      features: new Map(snapshot.features.map((feature) => [feature.id, feature])),
      machines: new Map(snapshot.machines.map((machine) => [machine.id, machine])),
      diagnostics: [],
    };
    modelOfView.set(snapshot, model);
  }
  return model;
}

/** Whether a reference of a row exists in the open folder: the Model element, the Area or section of the Requirements, the Specs or its field. Without a snapshot none does. */
export function referenceExists(snapshot: Snapshot | null, ref: string): boolean {
  if (snapshot === null) return false;
  if (ref === "specs") return snapshot.specsPresent;
  if (ref.startsWith("specs#")) return snapshot.specsPresent && (SPEC_FIELDS as readonly string[]).includes(ref.slice("specs#".length));
  if (ref.startsWith(REQUIREMENTS_PREFIX)) {
    const rest = ref.slice(REQUIREMENTS_PREFIX.length);
    const hash = rest.indexOf("#");
    const area = snapshot.areas.find((candidate) => candidate.id === (hash < 0 ? rest : rest.slice(0, hash)));
    if (area === undefined) return false;
    if (hash < 0) return true;
    const wanted = rest.slice(hash + 1).toLowerCase();
    return area.fragments.some((fragment) => fragment.sections.some((section) => (section.ref ?? "General").toLowerCase() === wanted));
  }
  try {
    resolveRef(modelOf(snapshot), ref);
    return true;
  } catch {
    return false;
  }
}
