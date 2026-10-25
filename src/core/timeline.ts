import type { Announcement } from "./announcements";
import { RUN_IN_PROGRESS } from "./design";
import { type GitHubField, type GitHubItem, type GitHubIteration, type GitHubProject, sprintField } from "./github";
import { type Absence, firstName } from "./people";
import { capacityIn, lastDayOf, loadIn, numberText, type OpenLoad } from "./sprints";

/*
 * The pure logic of the Team view that follows the issues Trama published (`rules#issue/Published`, `tech#issue/Published`): where an issue is, from what the last read of
 * GitHub found; the Events of the Actor `github`, which are the differences between two reads; the sprint, estimate and assignee an issue has on GitHub; and the load of the
 * people from the open items of the Project. The calendar the Timeline and the signals lay out is in `sprints.ts`, which the webview can also import. It depends on
 * no clock and on no file: a date is a parameter, and what was read comes in as data.
 */

/** The signals of an open published issue, in the order the Issues tab shows them. */
export const SIGNALS = ["stale", "carry-over", "overload", "dependency"] as const;
export type SignalKind = (typeof SIGNALS)[number];

/** Where a published issue is. `Not found on GitHub` is an issue of the last read that the Project no longer has. */
export const ISSUE_STATUSES = ["Open", "In progress", "In review", "Closed", "Not planned", "Not found on GitHub"] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

/** The Events of the Actor `github` (`.trama/model/actors/github.md`). */
export const GITHUB_EVENTS = ["WORK_STARTED", "WORK_STOPPED", "REVIEW_REQUESTED", "REVIEW_DROPPED", "ISSUE_CLOSED", "ISSUE_NOT_PLANNED", "ISSUE_REOPENED"] as const;
export type GitHubEvent = (typeof GITHUB_EVENTS)[number];

/** An Event a read found, for the issue with this GitHub number. */
export interface IssueEvent {
  issue: number;
  event: GitHubEvent;
}

/** The states of an issue that is closed on GitHub. */
export const isClosedStatus = (status: IssueStatus): boolean => status === "Closed" || status === "Not planned";

/** An option of the `Status` field of the Project (the field's name, without case) that says the work is in progress: `In progress` or `Doing`, without case. */
const IN_PROGRESS = /^(in progress|doing)$/i;

/**
 * The state of an issue from what was read of its item: closed as completed is `Closed`, as not planned `Not planned`; open with an open pull request that is not a draft and
 * closes it is `In review`; open with a draft pull request, a linked branch or a status of `In progress` or `Doing` is `In progress`; otherwise `Open`.
 */
export function statusOf(item: GitHubItem): IssueStatus {
  if (item.state === "CLOSED") return item.stateReason === "NOT_PLANNED" ? "Not planned" : "Closed";
  const open = item.pullRequests.filter((pr) => pr.state === "OPEN");
  if (open.some((pr) => !pr.draft)) return "In review";
  const status = Object.entries(item.values).find(([name]) => name.trim().toLowerCase() === "status")?.[1];
  if (open.length > 0 || item.branches.length > 0 || (typeof status === "string" && IN_PROGRESS.test(status.trim()))) return "In progress";
  return "Open";
}

/** The Events a change of state is, in the order they happened: a closed issue that is open again was reopened first, then moved on. */
export function eventsBetween(from: IssueStatus, to: IssueStatus): GitHubEvent[] {
  if (from === to || from === "Not found on GitHub" || to === "Not found on GitHub") return [];
  const events: GitHubEvent[] = [];
  let at = from;
  if (isClosedStatus(from)) {
    events.push("ISSUE_REOPENED");
    at = "Open";
  }
  if (to === "Closed") return [...events, "ISSUE_CLOSED"];
  if (to === "Not planned") return [...events, "ISSUE_NOT_PLANNED"];
  if (at === to) return events;
  if (to === "Open") return [...events, "WORK_STOPPED"];
  if (to === "In review") return [...events, "REVIEW_REQUESTED"];
  // `to` is `In progress`: from `Open` the work started, from `In review` the pull request was dropped.
  return [...events, at === "In review" ? "REVIEW_DROPPED" : "WORK_STARTED"];
}

/**
 * The Events between two reads of the items of the Project, for the issues of `numbers` (all of them when omitted) that both reads have: an issue that only one read has, and
 * every issue when there is no earlier read, has none. An Event is not seen when it happens on GitHub but at the next read.
 */
export function githubEvents(before: readonly GitHubItem[] | null, after: readonly GitHubItem[], numbers?: Iterable<number>): IssueEvent[] {
  if (before === null) return [];
  const wanted = numbers === undefined ? null : new Set(numbers);
  const earlier = new Map(before.map((item) => [item.number, item]));
  return after.flatMap((item) => {
    const was = earlier.get(item.number);
    if (was === undefined || (wanted !== null && !wanted.has(item.number))) return [];
    return eventsBetween(statusOf(was), statusOf(item)).map((event) => ({ issue: item.number, event }));
  });
}

/** The estimate field of a Project: its first number field whose name contains `estimate` or `days`, without case; none when it has no such field. */
export const estimateField = (fields: readonly GitHubField[]): GitHubField | undefined => fields.find((field) => field.type === "NUMBER" && /estimate|days/i.test(field.name));

/** The sprint an item is in: the title of its iteration in the sprint field, or null. */
export function sprintOf(item: GitHubItem, fields: readonly GitHubField[]): string | null {
  const field = sprintField(fields);
  const value = field === undefined ? undefined : item.values[field.name];
  return typeof value === "string" && value !== "" ? value : null;
}

/** The estimate of an item in days, from the Project's estimate field; null when the Project has no such field or the item has no value in it. */
export function estimateOf(item: GitHubItem, fields: readonly GitHubField[]): number | null {
  const field = estimateField(fields);
  const value = field === undefined ? undefined : item.values[field.name];
  return typeof value === "number" ? value : null;
}

/** The first assignee of an item, or null. */
export const assigneeOf = (item: GitHubItem): string | null => item.assignees[0] ?? null;

/** A published issue of Trama as the join with GitHub needs it: its number, when it was published, and the estimate its card has. */
export interface PublishedIssue {
  number: number;
  /** When the agent recorded the publication, ISO 8601; null for a card written before the field existed. */
  published: string | null;
  /** The estimate of Trama's card, used only while the Project has no estimate field. */
  estimate: number | null;
}

/** What Trama read of GitHub last: when, and the linked Project with its items; `project` is null without a linked Project. */
export interface GitHubRead {
  readAt: string | null;
  project: GitHubProject | null;
}

/** What the last read says of one published issue (`rules#issue/Published`): where it is and the sprint, estimate and assignee it has on GitHub. */
export interface IssueOnGitHub {
  number: number;
  status: IssueStatus;
  assignee: string | null;
  sprint: string | null;
  estimate: number | null;
}

/**
 * What the last read says of each published issue. Sprint, estimate and assignee are the ones read from GitHub: with no value there, none (the published ones are not used);
 * only when the Project has no estimate field the estimate is the one of Trama's card. An issue the read does not have is `Not found on GitHub`, unless it was published after
 * the read, which could not have seen it: it is left out, and so is every issue while nothing was read or no Project is linked.
 */
export function issuesOnGitHub(published: readonly PublishedIssue[], read: GitHubRead | null): IssueOnGitHub[] {
  const project = read?.project ?? null;
  if (read === null || project === null || read.readAt === null) return [];
  const readAt = Date.parse(read.readAt);
  const items = new Map(project.items.map((item) => [item.number, item]));
  const hasEstimateField = estimateField(project.fields) !== undefined;
  return published.flatMap((issue): IssueOnGitHub[] => {
    const item = items.get(issue.number);
    if (item !== undefined) return [{ number: issue.number, status: statusOf(item), assignee: assigneeOf(item), sprint: sprintOf(item, project.fields), estimate: hasEstimateField ? estimateOf(item, project.fields) : issue.estimate }];
    if (issue.published !== null && Date.parse(issue.published) > readAt) return [];
    return [{ number: issue.number, status: "Not found on GitHub", assignee: null, sprint: null, estimate: null }];
  });
}

/**
 * What every open item of the linked Project adds to the load of its assignee in its sprint, Trama's issues or not (`rules#issue/Published`): items of other Projects are never
 * read. The estimate is the one of the Project's estimate field; without such a field Trama's issues count the estimate of their card and the other items none. Nothing read,
 * no linked Project, and so no items, give an empty list.
 */
export function openLoads(published: readonly PublishedIssue[], read: GitHubRead | null): OpenLoad[] {
  const project = read?.project ?? null;
  if (project === null) return [];
  const hasEstimateField = estimateField(project.fields) !== undefined;
  const cards = new Map(published.map((issue) => [issue.number, issue.estimate]));
  return project.items.flatMap((item): OpenLoad[] => {
    const assignee = assigneeOf(item);
    const sprint = sprintOf(item, project.fields);
    if (item.state === "CLOSED" || assignee === null || sprint === null) return [];
    return [{ assignee, sprint, estimate: hasEstimateField ? estimateOf(item, project.fields) : (cards.get(item.number) ?? null) }];
  });
}

// ---- the signals of an open published issue (`rules#issue/Published`) ----

/** A signal of an issue and the short reason the Issues tab shows after its badge: `The Model changed after publishing`, `From Sprint 12`, `Giulia 6 / 5 d`, `Blocked by #128`. */
export interface IssueSignal {
  kind: SignalKind;
  reason: string;
}

/** The signals of the open published issues, by GitHub number, each list in the order of `SIGNALS`; an issue with none has no entry. */
export type IssueSignals = Record<number, IssueSignal[]>;

export const STALE_REASON = "The Model changed after publishing";

/** What the signals need of an issue card. `sprint` and `assignee` are the card's: they stand for an issue the last read of GitHub does not have yet. */
export interface SignalIssue {
  id: string;
  title: string;
  number: number | null;
  refs: readonly string[];
  /** The text fingerprint of each reference when the issue was published or last commented. */
  texts: Readonly<Record<string, string>>;
  dependsOn: readonly string[];
  sprint: string | null;
  assignee: string | null;
}

/** A member of the team as the signals need them. */
export interface SignalMember {
  name: string;
  handle: string;
  capacity: number;
  absences: readonly Absence[];
}

/**
 * The references of an issue whose text is not what it was when the issue was published or last commented: its fingerprint differs from the one recorded, or the reference
 * had one and no longer exists. `current` has the fingerprint of each reference as the Model and Requirements are now, none for a reference that is not there. A reference
 * with no recorded fingerprint (an issue published before they were kept) is never changed.
 */
export function changedReferences(refs: readonly string[], recorded: Readonly<Record<string, string>>, current: Readonly<Record<string, string>>): string[] {
  return refs.filter((ref) => {
    const then = recorded[ref];
    const now = current[ref];
    return then !== undefined && now !== then;
  });
}

/** Whether an issue is still to be done: not closed, not set aside and still on GitHub. */
const isOpenStatus = (status: IssueStatus): boolean => !isClosedStatus(status) && status !== "Not found on GitHub";

/** Everything the signals are computed from. `today` is `YYYY-MM-DD`. */
export interface SignalInput {
  /** Every issue card of the project. */
  issues: readonly SignalIssue[];
  /** Where each published issue is, from the last read (`issuesOnGitHub`). */
  github: readonly IssueOnGitHub[];
  loads: readonly OpenLoad[];
  members: readonly SignalMember[];
  iterations: readonly GitHubIteration[];
  /** The text fingerprint of each reference of the issues as the Model and Requirements are now. */
  current: Readonly<Record<string, string>>;
  today: string;
}

/**
 * The signals of the open published issues, from the last read and the cards as they are now, in this order: `Stale` (the text of a reference changed or the reference is
 * gone), `Carry-over` (its sprint ended before today), `Overload` (its assignee has more in its sprint than their capacity there) and `Dependency` (an issue it depends on is open
 * and has no sprint, a later sprint, or the same sprint and another assignee). A closed or not planned issue has none. Signals only tell: nothing changes.
 */
export function issueSignals(input: SignalInput): IssueSignals {
  const { issues, github, loads, members, iterations, current, today } = input;
  const read = new Map(github.map((issue) => [issue.number, issue]));
  const byId = new Map(issues.map((issue) => [issue.id, issue]));
  const iteration = (title: string | null): GitHubIteration | undefined => (title === null ? undefined : iterations.find((candidate) => candidate.title === title));
  const sameHandle = (a: string | null, b: string | null): boolean => a === b || (a !== null && b !== null && a.toLowerCase() === b.toLowerCase());
  /** Where an issue is and what it has now: the read's; a published issue the read does not have yet is open with the card's sprint and assignee. */
  const factsOf = (issue: SignalIssue): { status: IssueStatus; sprint: string | null; assignee: string | null } | null => {
    if (issue.number === null) return null;
    const found = read.get(issue.number);
    return found ?? { status: "Open", sprint: issue.sprint, assignee: issue.assignee };
  };
  const blockedBy = (issue: SignalIssue, facts: { sprint: string | null; assignee: string | null }): string | null => {
    const mine = iteration(facts.sprint);
    for (const id of issue.dependsOn) {
      const dependency = byId.get(id);
      if (dependency === undefined) continue;
      const label = dependency.number === null ? dependency.title : `#${dependency.number}`;
      const there = factsOf(dependency);
      // An issue that is not published yet is open and has no sprint.
      if (there === null) return label;
      if (!isOpenStatus(there.status)) continue;
      const theirs = iteration(there.sprint);
      const later = mine !== undefined && theirs !== undefined && theirs.startDate > mine.startDate;
      const together = facts.sprint !== null && there.sprint === facts.sprint && !sameHandle(there.assignee, facts.assignee);
      if (there.sprint === null || later || together) return label;
    }
    return null;
  };
  const signals: IssueSignals = {};
  for (const issue of issues) {
    const facts = factsOf(issue);
    if (facts === null || issue.number === null || !isOpenStatus(facts.status)) continue;
    const found: IssueSignal[] = [];
    if (changedReferences(issue.refs, issue.texts, current).length > 0) found.push({ kind: "stale", reason: STALE_REASON });
    const sprint = iteration(facts.sprint);
    if (sprint !== undefined && lastDayOf(sprint) < today) found.push({ kind: "carry-over", reason: `From ${sprint.title}` });
    const member = facts.assignee === null ? undefined : members.find((person) => sameHandle(person.handle, facts.assignee));
    if (sprint !== undefined && member !== undefined) {
      const load = loadIn(loads, member.handle, sprint.title).days;
      const capacity = capacityIn(member, sprint);
      if (load > capacity) found.push({ kind: "overload", reason: `${firstName(member.name)} ${numberText(load)} / ${numberText(capacity)} d` });
    }
    const blocker = blockedBy(issue, facts);
    if (blocker !== null) found.push({ kind: "dependency", reason: `Blocked by ${blocker}` });
    if (found.length > 0) signals[issue.number] = found;
  }
  return signals;
}

// ---- Comment update and the Scan of a closed issue (`rules#developer.ASK_ISSUE_UPDATE`, `rules#developer.SCAN_ISSUE`) ----

/** The issues, by GitHub number, that an agent of this window is commenting on or scanning now. */
export interface IssueJobs {
  updating: number[];
  scanning: number[];
}

/** The titles of the announcements of the two jobs: the ghost of the job while it runs, which is how Trama knows it runs. */
export const updatingTitle = (number: number): string => `Updating #${number}`;
export const scanningTitle = (number: number): string => `Scanning #${number}`;

/** The jobs of the live announcements: the ones whose title is one of `updatingTitle` (work) or `scanningTitle` (check). */
export function issueJobs(announcements: readonly Pick<Announcement, "kind" | "title">[]): IssueJobs {
  const numberIn = (announcement: Pick<Announcement, "title">, word: string): number[] => {
    const found = new RegExp(`^${word} #(\\d+)$`).exec(announcement.title);
    return found === null ? [] : [Number(found[1])];
  };
  return {
    updating: announcements.filter((announcement) => announcement.kind === "work").flatMap((announcement) => numberIn(announcement, "Updating")),
    scanning: announcements.filter((announcement) => announcement.kind === "check").flatMap((announcement) => numberIn(announcement, "Scanning")),
  };
}

/** Why each action of a published issue is not available, or null when it is. */
export interface IssueActions {
  update: string | null;
  scan: string | null;
}

export const UPDATING_REASON = "Updating…";
export const SCANNING_REASON = "Scanning…";

/** The reasons of the two actions of the issue with this GitHub number: its own job runs (`Updating…`, `Scanning…`) or a Run of this window is in progress. */
export function issueActions(number: number, jobs: IssueJobs, running: boolean): IssueActions {
  return {
    update: jobs.updating.includes(number) ? UPDATING_REASON : running ? RUN_IN_PROGRESS : null,
    scan: jobs.scanning.includes(number) ? SCANNING_REASON : running ? RUN_IN_PROGRESS : null,
  };
}

/** What the host knows when the Manager presses one of the two actions. `team` is why Team is not available, null when it is; `status` is null for an issue not published. */
export interface ActionFacts {
  team: string | null;
  status: IssueStatus | null;
  stale: boolean;
  actions: IssueActions;
}

/** Why Comment update is not available: Team is not, the issue is not published or is not open, the Model did not change under it, or the action's own reason; null when it is. */
export function updateBlock(facts: ActionFacts): string | null {
  if (facts.team !== null) return facts.team;
  if (facts.status === null) return "The issue is not published";
  if (!isOpenStatus(facts.status)) return "The issue is not open";
  if (!facts.stale) return "The Model did not change after the issue was published";
  return facts.actions.update;
}

/** Why Scan is not available: Team is not, the issue is not published or is not closed (`Closed`, not `Not planned`), or the action's own reason; null when it is. */
export function scanBlock(facts: ActionFacts): string | null {
  if (facts.team !== null) return facts.team;
  if (facts.status === null) return "The issue is not published";
  if (facts.status !== "Closed") return "Only a closed issue can be scanned";
  return facts.actions.scan;
}
