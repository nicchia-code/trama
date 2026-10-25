import { describe, expect, test } from "bun:test";
import type { GitHubItem, GitHubProject } from "../src/core/github";
import { RUN_IN_PROGRESS } from "../src/core/design";
import type { GitHubIteration } from "../src/core/github";
import {
  assigneeOf,
  changedReferences,
  estimateField,
  estimateOf,
  eventsBetween,
  githubEvents,
  type GitHubRead,
  type IssueOnGitHub,
  type IssueStatus,
  issueActions,
  issueJobs,
  issueSignals,
  issuesOnGitHub,
  openLoads,
  SCANNING_REASON,
  scanBlock,
  type SignalInput,
  type SignalIssue,
  type SignalMember,
  sprintOf,
  STALE_REASON,
  statusOf,
  UPDATING_REASON,
  updateBlock,
} from "../src/core/timeline";

const item = (over: Partial<GitHubItem> = {}): GitHubItem => ({ number: 1, title: "T", state: "OPEN", stateReason: null, assignees: [], values: {}, pullRequests: [], branches: [], ...over });

const FIELDS: GitHubProject["fields"] = [
  { id: "F1", name: "Status", type: "SINGLE_SELECT", options: [{ id: "O1", name: "Todo" }, { id: "O2", name: "In progress" }] },
  { id: "F2", name: "Sprint", type: "ITERATION" },
  { id: "F3", name: "Points", type: "NUMBER" },
  { id: "F4", name: "Estimate (days)", type: "NUMBER" },
];

describe("the state of an issue from what was read", () => {
  test("closed as completed is Closed, closed as not planned is Not planned, whatever pull requests it has", () => {
    expect(statusOf(item({ state: "CLOSED", stateReason: "COMPLETED" }))).toBe("Closed");
    expect(statusOf(item({ state: "CLOSED", stateReason: null }))).toBe("Closed");
    expect(statusOf(item({ state: "CLOSED", stateReason: "NOT_PLANNED", pullRequests: [{ state: "OPEN", draft: false }] }))).toBe("Not planned");
  });

  test("an open issue with an open pull request that is not a draft is In review, before anything that says In progress", () => {
    expect(statusOf(item({ pullRequests: [{ state: "OPEN", draft: false }] }))).toBe("In review");
    expect(statusOf(item({ pullRequests: [{ state: "OPEN", draft: true }, { state: "OPEN", draft: false }], branches: ["fix"], values: { Status: "Doing" } }))).toBe("In review");
  });

  test("a draft pull request, a linked branch, or a status of In progress or Doing in any case is In progress", () => {
    expect(statusOf(item({ pullRequests: [{ state: "OPEN", draft: true }] }))).toBe("In progress");
    expect(statusOf(item({ branches: ["123-guest-checkout"] }))).toBe("In progress");
    expect(statusOf(item({ values: { Status: "In progress" } }))).toBe("In progress");
    expect(statusOf(item({ values: { status: "DOING" } }))).toBe("In progress");
    expect(statusOf(item({ values: { Status: " doing " } }))).toBe("In progress");
  });

  test("anything else is Open: a status that is not one of the two, a closed or merged pull request, another field that says In progress", () => {
    expect(statusOf(item())).toBe("Open");
    expect(statusOf(item({ values: { Status: "Todo" } }))).toBe("Open");
    expect(statusOf(item({ values: { Phase: "In progress" } }))).toBe("Open");
    expect(statusOf(item({ pullRequests: [{ state: "CLOSED", draft: false }, { state: "MERGED", draft: false }] }))).toBe("Open");
  });
});

describe("the Events of github are the differences between two reads", () => {
  const between = (from: IssueStatus, to: IssueStatus) => eventsBetween(from, to);

  test("each transition of the Model has its Event", () => {
    expect(between("Open", "In progress")).toEqual(["WORK_STARTED"]);
    expect(between("Open", "In review")).toEqual(["REVIEW_REQUESTED"]);
    expect(between("In progress", "In review")).toEqual(["REVIEW_REQUESTED"]);
    expect(between("In review", "In progress")).toEqual(["REVIEW_DROPPED"]);
    expect(between("In progress", "Open")).toEqual(["WORK_STOPPED"]);
    expect(between("In review", "Open")).toEqual(["WORK_STOPPED"]);
    for (const from of ["Open", "In progress", "In review"] as const) {
      expect(between(from, "Closed")).toEqual(["ISSUE_CLOSED"]);
      expect(between(from, "Not planned")).toEqual(["ISSUE_NOT_PLANNED"]);
    }
    expect(between("Closed", "Open")).toEqual(["ISSUE_REOPENED"]);
    expect(between("Not planned", "Open")).toEqual(["ISSUE_REOPENED"]);
  });

  test("a closed issue that is back with work on it was reopened and then moved on; closed in another way was reopened and closed", () => {
    expect(between("Closed", "In progress")).toEqual(["ISSUE_REOPENED", "WORK_STARTED"]);
    expect(between("Closed", "In review")).toEqual(["ISSUE_REOPENED", "REVIEW_REQUESTED"]);
    expect(between("Closed", "Not planned")).toEqual(["ISSUE_REOPENED", "ISSUE_NOT_PLANNED"]);
    expect(between("Not planned", "Closed")).toEqual(["ISSUE_REOPENED", "ISSUE_CLOSED"]);
  });

  test("the same state, or an issue the Project does not have, has none", () => {
    expect(between("Open", "Open")).toEqual([]);
    expect(between("Closed", "Closed")).toEqual([]);
    expect(between("Not found on GitHub", "Open")).toEqual([]);
    expect(between("Open", "Not found on GitHub")).toEqual([]);
  });

  test("two reads give the Events of the issues both have, only for the issues asked for, and the first read gives none", () => {
    const before = [item({ number: 1 }), item({ number: 2, branches: ["b"] }), item({ number: 3 })];
    const after = [item({ number: 1, state: "CLOSED" }), item({ number: 2, pullRequests: [{ state: "OPEN", draft: false }] }), item({ number: 3 }), item({ number: 4, state: "CLOSED" })];
    expect(githubEvents(before, after)).toEqual([
      { issue: 1, event: "ISSUE_CLOSED" },
      { issue: 2, event: "REVIEW_REQUESTED" },
    ]);
    expect(githubEvents(before, after, [2, 4])).toEqual([{ issue: 2, event: "REVIEW_REQUESTED" }]);
    expect(githubEvents(null, after)).toEqual([]);
  });
});

describe("the sprint, estimate and assignee of an item", () => {
  test("the estimate field is the first number field whose name has estimate or days, without case", () => {
    expect(estimateField(FIELDS)?.name).toBe("Estimate (days)");
    expect(estimateField([{ id: "a", name: "Story points", type: "NUMBER" }])).toBeUndefined();
    expect(estimateField([{ id: "a", name: "Estimate", type: "TEXT" }, { id: "b", name: "DAYS left", type: "NUMBER" }, { id: "c", name: "estimate", type: "NUMBER" }])?.id).toBe("b");
  });

  test("the values come from the item's fields, and are null when it has none", () => {
    const full = item({ assignees: ["giulia", "sara"], values: { Sprint: "Sprint 14", "Estimate (days)": 2.5, Points: 8 } });
    expect(sprintOf(full, FIELDS)).toBe("Sprint 14");
    expect(estimateOf(full, FIELDS)).toBe(2.5);
    expect(assigneeOf(full)).toBe("giulia");
    expect(sprintOf(item(), FIELDS)).toBeNull();
    expect(estimateOf(item(), FIELDS)).toBeNull();
    expect(estimateOf(full, [{ id: "a", name: "Points", type: "NUMBER" }])).toBeNull();
    expect(assigneeOf(item())).toBeNull();
  });
});

describe("what the last read says of the issues Trama published", () => {
  const project = (items: GitHubItem[], fields = FIELDS): GitHubProject => ({ fields, iterations: [], items });
  const read = (items: GitHubItem[], fields = FIELDS): GitHubRead => ({ readAt: "2026-10-25T10:00:00.000Z", project: project(items, fields) });
  const published = (number: number, at: string | null = "2026-10-20T10:00:00.000Z", estimate: number | null = 1) => ({ number, published: at, estimate });

  test("the sprint, estimate and assignee are GitHub's, and none when GitHub has none: the published ones are not used", () => {
    const issues = issuesOnGitHub([published(1, undefined, 3), published(2, undefined, 3)], read([item({ number: 1, assignees: ["giulia"], values: { Sprint: "Sprint 14", "Estimate (days)": 2 } }), item({ number: 2 })]));
    expect(issues).toEqual([
      { number: 1, status: "Open", assignee: "giulia", sprint: "Sprint 14", estimate: 2 },
      { number: 2, status: "Open", assignee: null, sprint: null, estimate: null },
    ]);
  });

  test("without an estimate field the estimates are those of Trama's cards", () => {
    const noEstimate = FIELDS.filter((field) => field.name !== "Estimate (days)");
    expect(issuesOnGitHub([published(1, undefined, 3)], read([item({ number: 1 })], noEstimate))).toMatchObject([{ number: 1, estimate: 3 }]);
  });

  test("an issue the read lacks is Not found on GitHub, unless it was published after the read", () => {
    const issues = issuesOnGitHub([published(7), published(8, "2026-10-25T10:00:01.000Z"), published(9, null)], read([]));
    expect(issues.map((issue) => [issue.number, issue.status])).toEqual([
      [7, "Not found on GitHub"],
      [9, "Not found on GitHub"],
    ]);
  });

  test("with nothing read, no linked Project or a read that never worked, no issue is told", () => {
    expect(issuesOnGitHub([published(1)], null)).toEqual([]);
    expect(issuesOnGitHub([published(1)], { readAt: "2026-10-25T10:00:00.000Z", project: null })).toEqual([]);
    expect(issuesOnGitHub([published(1)], { readAt: null, project: project([]) })).toEqual([]);
  });
});

describe("what the open items of the Project add to the load of their assignees", () => {
  const read = (items: GitHubItem[], fields = FIELDS): GitHubRead => ({ readAt: "2026-10-25T10:00:00.000Z", project: { fields, iterations: [], items } });
  const withValues = (number: number, assignee: string | null, sprint: string | null, estimate: number | null, over: Partial<GitHubItem> = {}): GitHubItem =>
    item({ number, assignees: assignee === null ? [] : [assignee], values: { ...(sprint === null ? {} : { Sprint: sprint }), ...(estimate === null ? {} : { "Estimate (days)": estimate }) }, ...over });

  test("an open item with an assignee and a sprint counts its estimate, Trama's issue or not", () => {
    const items = [withValues(1, "giulia", "Sprint 13", 3), withValues(90, "marco", "Sprint 14", 2)];
    expect(openLoads([{ number: 1, published: null, estimate: 9 }], read(items))).toEqual([
      { assignee: "giulia", sprint: "Sprint 13", estimate: 3 },
      { assignee: "marco", sprint: "Sprint 14", estimate: 2 },
    ]);
  });

  test("a closed item, one without assignee and one without sprint count nothing", () => {
    const items = [withValues(1, "giulia", "Sprint 13", 3, { state: "CLOSED", stateReason: "COMPLETED" }), withValues(2, null, "Sprint 13", 3), withValues(3, "giulia", null, 3)];
    expect(openLoads([], read(items))).toEqual([]);
  });

  test("an item without a value in the estimate field has no estimate; the first assignee is the one that counts", () => {
    const items = [withValues(1, "giulia", "Sprint 13", null, { assignees: ["giulia", "marco"] })];
    expect(openLoads([], read(items))).toEqual([{ assignee: "giulia", sprint: "Sprint 13", estimate: null }]);
  });

  test("without an estimate field Trama's issues count the estimate of their card and the other items none", () => {
    const fields = FIELDS.filter((field) => field.name !== "Estimate (days)");
    const items = [withValues(1, "giulia", "Sprint 13", null), withValues(90, "giulia", "Sprint 13", null)];
    expect(openLoads([{ number: 1, published: null, estimate: 2 }], read(items, fields))).toEqual([
      { assignee: "giulia", sprint: "Sprint 13", estimate: 2 },
      { assignee: "giulia", sprint: "Sprint 13", estimate: null },
    ]);
  });

  test("nothing read, or no linked Project, has no load", () => {
    expect(openLoads([], null)).toEqual([]);
    expect(openLoads([], { readAt: null, project: null })).toEqual([]);
  });
});

describe("the signals of an open published issue", () => {
  // Weekly sprints from Monday 19 October: Sprint 12 ended on Sunday 25, Sprint 13 is the current one on Tuesday 27.
  const sprint = (n: number, startDate: string): GitHubIteration => ({ id: `I${n}`, title: `Sprint ${n}`, startDate, duration: 7 });
  const ITERATIONS = [sprint(12, "2026-10-19"), sprint(13, "2026-10-26"), sprint(14, "2026-11-02"), sprint(15, "2026-11-09")];
  const GIULIA: SignalMember = { name: "Giulia Rossi", handle: "giulia", capacity: 5, absences: [] };
  const issue = (over: Partial<SignalIssue> = {}): SignalIssue => ({ id: "iiiiiii1", title: "Move address entry", number: 1, refs: ["order/Paid"], texts: { "order/Paid": "aaa" }, dependsOn: [], sprint: null, assignee: null, ...over });
  const onGitHub = (number: number, over: Partial<IssueOnGitHub> = {}): IssueOnGitHub => ({ number, status: "Open", assignee: null, sprint: null, estimate: null, ...over });
  const input = (over: Partial<SignalInput> = {}): SignalInput => ({ issues: [issue()], github: [onGitHub(1)], loads: [], members: [GIULIA], iterations: ITERATIONS, current: { "order/Paid": "aaa" }, today: "2026-10-27", ...over });

  test("a reference whose fingerprint differs from the recorded one, or that is gone, makes the issue Stale; one with none recorded never does", () => {
    expect(issueSignals(input())).toEqual({});
    expect(issueSignals(input({ current: { "order/Paid": "bbb" } }))).toEqual({ 1: [{ kind: "stale", reason: STALE_REASON }] });
    expect(issueSignals(input({ current: {} }))[1]?.[0]?.kind).toBe("stale");
    expect(issueSignals(input({ issues: [issue({ texts: {} })], current: { "order/Paid": "bbb" } }))).toEqual({});
    expect(issueSignals(input({ issues: [issue({ texts: {} })], current: {} }))).toEqual({});
    expect(changedReferences(["a", "b", "c"], { a: "1", b: "2" }, { a: "1", b: "3" })).toEqual(["b"]);
  });

  test("a closed or not planned issue, and one GitHub no longer has, have no signal; one not read yet is open", () => {
    for (const status of ["Closed", "Not planned", "Not found on GitHub"] as const) {
      expect(issueSignals(input({ github: [onGitHub(1, { status })], current: {} }))).toEqual({});
    }
    for (const status of ["Open", "In progress", "In review"] as const) {
      expect(issueSignals(input({ github: [onGitHub(1, { status })], current: {} }))[1]).toHaveLength(1);
    }
    expect(issueSignals(input({ github: [], current: {} }))[1]?.[0]?.kind).toBe("stale");
    expect(issueSignals(input({ issues: [issue({ number: null })], github: [], current: {} }))).toEqual({});
  });

  test("Carry-over: its sprint ended before today, and it names that sprint", () => {
    expect(issueSignals(input({ github: [onGitHub(1, { sprint: "Sprint 12" })] }))).toEqual({ 1: [{ kind: "carry-over", reason: "From Sprint 12" }] });
    expect(issueSignals(input({ github: [onGitHub(1, { sprint: "Sprint 13" })] }))).toEqual({});
    expect(issueSignals(input({ github: [onGitHub(1, { sprint: "Sprint 14" })] }))).toEqual({});
    expect(issueSignals(input({ github: [onGitHub(1, { sprint: "Sprint 99" })] }))).toEqual({});
    // On the last day of the sprint the sprint has not ended yet.
    expect(issueSignals(input({ github: [onGitHub(1, { sprint: "Sprint 12" })], today: "2026-10-25" }))).toEqual({});
    // The sprint of the card stands in for an issue the read does not have yet.
    expect(issueSignals(input({ issues: [issue({ sprint: "Sprint 12" })], github: [] }))[1]?.[0]).toEqual({ kind: "carry-over", reason: "From Sprint 12" });
  });

  test("Overload: the load of its assignee in its sprint is over their capacity there, and it says the first name, the load and the capacity", () => {
    const at = { assignee: "giulia", sprint: "Sprint 13" };
    const loads = [{ assignee: "giulia", sprint: "Sprint 13", estimate: 4 }, { assignee: "Giulia", sprint: "Sprint 13", estimate: 2 }];
    expect(issueSignals(input({ github: [onGitHub(1, at)], loads }))).toEqual({ 1: [{ kind: "overload", reason: "Giulia 6 / 5 d" }] });
    // Exactly the capacity is not over; another sprint's load does not count.
    expect(issueSignals(input({ github: [onGitHub(1, at)], loads: [{ assignee: "giulia", sprint: "Sprint 13", estimate: 5 }, { assignee: "giulia", sprint: "Sprint 14", estimate: 9 }] }))).toEqual({});
    // Items without estimate count nothing.
    expect(issueSignals(input({ github: [onGitHub(1, at)], loads: [{ assignee: "giulia", sprint: "Sprint 13", estimate: null }] }))).toEqual({});
  });

  test("Overload uses the capacity of the sprint with the absences taken away; somebody outside the team has none", () => {
    const away: SignalMember = { ...GIULIA, absences: [{ from: "2026-10-28", to: "2026-10-30" }] };
    const at = { assignee: "giulia", sprint: "Sprint 13" };
    const loads = [{ assignee: "giulia", sprint: "Sprint 13", estimate: 3 }];
    expect(issueSignals(input({ github: [onGitHub(1, at)], loads, members: [away] }))).toEqual({ 1: [{ kind: "overload", reason: "Giulia 3 / 2 d" }] });
    expect(issueSignals(input({ github: [onGitHub(1, at)], loads, members: [GIULIA] }))).toEqual({});
    expect(issueSignals(input({ github: [onGitHub(1, { assignee: "zoe", sprint: "Sprint 13" })], loads: [{ assignee: "zoe", sprint: "Sprint 13", estimate: 30 }] }))).toEqual({});
    expect(issueSignals(input({ github: [onGitHub(1, { assignee: "giulia", sprint: null })], loads }))).toEqual({});
  });

  describe("Dependency", () => {
    const dependent = (over: Partial<SignalIssue> = {}) => issue({ id: "iiiiiii2", title: "Send the confirmation", number: 2, dependsOn: ["iiiiiii1"], ...over });
    const first = (over: Partial<SignalIssue> = {}) => issue({ refs: [], texts: {}, ...over });
    const run = (mine: Partial<IssueOnGitHub>, theirs: Partial<IssueOnGitHub>, over: Partial<SignalInput> = {}) =>
      issueSignals(input({ issues: [first(), dependent()], github: [onGitHub(1, theirs), onGitHub(2, mine)], ...over }))[2];

    test("an issue it depends on that is open and has no sprint blocks it", () => {
      expect(run({ sprint: "Sprint 13" }, { sprint: null })).toEqual([{ kind: "dependency", reason: "Blocked by #1" }]);
      expect(run({ sprint: null }, { sprint: null })).toEqual([{ kind: "dependency", reason: "Blocked by #1" }]);
    });

    test("a later sprint blocks it; the same or an earlier one does not", () => {
      expect(run({ sprint: "Sprint 13" }, { sprint: "Sprint 14" })?.[0]?.kind).toBe("dependency");
      expect(run({ sprint: "Sprint 14" }, { sprint: "Sprint 13" })).toBeUndefined();
      expect(run({ sprint: "Sprint 14", assignee: "ada" }, { sprint: "Sprint 13", assignee: "bob" })).toBeUndefined();
    });

    test("the same sprint blocks it with another assignee, and does not with the same one, without case", () => {
      expect(run({ sprint: "Sprint 13", assignee: "ada" }, { sprint: "Sprint 13", assignee: "bob" })?.[0]?.kind).toBe("dependency");
      expect(run({ sprint: "Sprint 13", assignee: "ada" }, { sprint: "Sprint 13", assignee: null })?.[0]?.kind).toBe("dependency");
      expect(run({ sprint: "Sprint 13", assignee: "ada" }, { sprint: "Sprint 13", assignee: "ADA" })).toBeUndefined();
    });

    test("an issue with no sprint is not blocked by one that has a sprint", () => {
      expect(run({ sprint: null }, { sprint: "Sprint 14" })).toBeUndefined();
    });

    test("a closed, not planned or missing dependency does not block; a dependency that does not exist is ignored", () => {
      for (const status of ["Closed", "Not planned", "Not found on GitHub"] as const) expect(run({ sprint: "Sprint 13" }, { sprint: null, status })).toBeUndefined();
      expect(issueSignals(input({ issues: [dependent({ dependsOn: ["zzzzzzzz"] })], github: [onGitHub(2)] }))[2]).toBeUndefined();
    });

    test("a dependency that is not published is named by its title; the first that blocks is the one told", () => {
      const unpublished = first({ number: null, title: "Validate the email" });
      expect(issueSignals(input({ issues: [unpublished, dependent()], github: [onGitHub(2)] }))[2]).toEqual([{ kind: "dependency", reason: "Blocked by Validate the email" }]);
      const other = issue({ id: "iiiiiii3", number: 3, refs: [], texts: {} });
      const both = dependent({ dependsOn: ["iiiiiii1", "iiiiiii3"] });
      expect(issueSignals(input({ issues: [first(), other, both], github: [onGitHub(1, { status: "Closed" }), onGitHub(3), onGitHub(2)] }))[2]).toEqual([{ kind: "dependency", reason: "Blocked by #3" }]);
    });
  });

  test("the signals come in the order Stale, Carry-over, Overload, Dependency", () => {
    const blocker = issue({ id: "iiiiiii9", number: 9, refs: [], texts: {} });
    const late = issue({ id: "iiiiiii2", number: 2, dependsOn: ["iiiiiii9"] });
    const signals = issueSignals(
      input({ issues: [blocker, late], github: [onGitHub(9), onGitHub(2, { assignee: "giulia", sprint: "Sprint 12" })], loads: [{ assignee: "giulia", sprint: "Sprint 12", estimate: 9 }], current: { "order/Paid": "changed" } }),
    );
    expect(signals[2]?.map((signal) => signal.kind)).toEqual(["stale", "carry-over", "overload", "dependency"]);
  });
});

describe("Comment update and Scan", () => {
  test("the jobs running are the live announcements named after the issue: work for Updating, check for Scanning", () => {
    const jobs = issueJobs([
      { kind: "work", title: "Updating #7" },
      { kind: "check", title: "Scanning #8" },
      { kind: "check", title: "Scanning System" },
      { kind: "work", title: "Scanning #9" },
      { kind: "check", title: "Updating #10" },
      { kind: "work", title: "Updating #11 now" },
    ]);
    expect(jobs).toEqual({ updating: [7], scanning: [8] });
  });

  test("an action is unavailable while its own job runs, with that job's word, or while a Run of this window is in progress", () => {
    expect(issueActions(7, { updating: [7], scanning: [] }, false)).toEqual({ update: UPDATING_REASON, scan: null });
    expect(issueActions(8, { updating: [], scanning: [8] }, false)).toEqual({ update: null, scan: SCANNING_REASON });
    expect(issueActions(9, { updating: [7], scanning: [8] }, false)).toEqual({ update: null, scan: null });
    expect(issueActions(9, { updating: [], scanning: [] }, true)).toEqual({ update: RUN_IN_PROGRESS, scan: RUN_IN_PROGRESS });
    expect(issueActions(7, { updating: [7], scanning: [] }, true).update).toBe(UPDATING_REASON);
    expect(UPDATING_REASON).toBe("Updating…");
    expect(SCANNING_REASON).toBe("Scanning…");
    expect(RUN_IN_PROGRESS).toBe("A run is in progress");
  });

  const facts = (over: Partial<Parameters<typeof updateBlock>[0]> = {}) => ({ team: null, status: "Open" as IssueStatus | null, stale: true, actions: { update: null, scan: null }, ...over });

  test("Comment update is available on a published, open, stale issue only, with Team and no job or Run in the way", () => {
    expect(updateBlock(facts())).toBeNull();
    expect(updateBlock(facts({ status: "In review" }))).toBeNull();
    expect(updateBlock(facts({ team: "Manager Mode is off in this working copy." }))).toBe("Manager Mode is off in this working copy.");
    expect(updateBlock(facts({ status: null }))).toBe("The issue is not published");
    for (const status of ["Closed", "Not planned", "Not found on GitHub"] as const) expect(updateBlock(facts({ status }))).toBe("The issue is not open");
    expect(updateBlock(facts({ stale: false }))).toBe("The Model did not change after the issue was published");
    expect(updateBlock(facts({ actions: { update: UPDATING_REASON, scan: null } }))).toBe(UPDATING_REASON);
    expect(updateBlock(facts({ actions: { update: RUN_IN_PROGRESS, scan: null } }))).toBe(RUN_IN_PROGRESS);
  });

  test("Scan is available on a closed issue only, with Team and no job or Run in the way", () => {
    expect(scanBlock(facts({ status: "Closed", stale: false }))).toBeNull();
    expect(scanBlock(facts({ status: "Closed", team: "Manager Mode is off in this working copy." }))).toBe("Manager Mode is off in this working copy.");
    expect(scanBlock(facts({ status: null }))).toBe("The issue is not published");
    for (const status of ["Open", "In progress", "In review", "Not planned", "Not found on GitHub"] as const) expect(scanBlock(facts({ status }))).toBe("Only a closed issue can be scanned");
    expect(scanBlock(facts({ status: "Closed", actions: { update: null, scan: SCANNING_REASON } }))).toBe(SCANNING_REASON);
    expect(scanBlock(facts({ status: "Closed", actions: { update: null, scan: RUN_IN_PROGRESS } }))).toBe(RUN_IN_PROGRESS);
  });
});
