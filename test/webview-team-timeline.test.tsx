import { afterEach, beforeAll, beforeEach, expect, setSystemTime, test } from "bun:test";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { GitHubIteration } from "../src/core/github";
import type { OpenLoad } from "../src/core/sprints";
import type { Snapshot } from "../src/core/snapshot";
import type { IssueOnGitHub } from "../src/core/timeline";
import type { ToHost } from "../extension/src/protocol";
import { TeamPage } from "../extension/src/webview/team";
import {
  type GitHubMessage,
  type HandoffViewData,
  type IssueRow,
  type IssueRowData,
  loadSpoken,
  loadText,
  missingSprintsText,
  projectSettingsUrl,
  sprintLoadNote,
  timelineOf,
  type TimelineInput,
  unestimatedText,
  withGitHub,
} from "../extension/src/webview/team/logic";
import type { TeamMessage } from "../extension/src/webview/team/people-tab";
import { shopSnapshot } from "./diagram-fixture";

// Radix and cmdk use browser APIs that happy-dom does not have.
beforeAll(() => {
  const proto = globalThis.Element.prototype as unknown as Record<string, unknown>;
  proto.hasPointerCapture ??= () => false;
  proto.setPointerCapture ??= () => {};
  proto.releasePointerCapture ??= () => {};
  proto.scrollIntoView ??= () => {};
  (globalThis as unknown as Record<string, unknown>).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

// The components read the clock themselves: Tuesday 27 October 2026 is inside Sprint 13.
beforeEach(() => setSystemTime(new Date(2026, 9, 27, 10, 0, 0)));
afterEach(() => {
  cleanup();
  setSystemTime();
});

const sprint = (n: number, startDate: string): GitHubIteration => ({ id: `I${n}`, title: `Sprint ${n}`, startDate, duration: 7 });
const SPRINTS = [sprint(12, "2026-10-19"), sprint(13, "2026-10-26"), sprint(14, "2026-11-02"), sprint(15, "2026-11-09"), sprint(16, "2026-11-16")];

type Member = TeamMessage["members"][number];
const member = (id: string, name: string, handle: string, capacity: number, absences: Member["absences"] = []): Member => ({
  id,
  name,
  handle,
  level: "mid",
  skills: [],
  capacity,
  absences,
  repositories: ["acme/web"],
  initials: name
    .split(" ")
    .map((part) => part[0])
    .join(""),
  nextAbsence: absences[0] ?? null,
});
const GIULIA = member("aaaaaaa1", "Giulia Rossi", "giulia", 5, [{ from: "2026-11-10", to: "2026-11-12" }]);
const MARCO = member("bbbbbbb2", "Marco Bianchi", "marco", 5);
const SARA = member("ccccccc3", "Sara Conti", "sara", 4);
const MEMBERS = [GIULIA, MARCO, SARA];

const gh = (over: Partial<IssueOnGitHub> = {}): IssueOnGitHub => ({ number: 128, status: "In progress", assignee: "giulia", sprint: "Sprint 13", estimate: 4, ...over });
const rowData = (over: Partial<IssueRowData> = {}): IssueRowData => ({
  id: "iiiiiii1",
  title: "Move address entry",
  handoff: "hhhhhhh1",
  label: "checkout",
  state: "published",
  number: 128,
  url: "https://github.com/acme/web/issues/128",
  published: "2026-10-20T10:00:00.000Z",
  reason: null,
  unset: [],
  assignee: null,
  sprint: null,
  estimate: null,
  publishBlock: null,
  ...over,
});
/** An issue as the page draws it: the card of Trama with what the last read of GitHub says. */
const row = (over: Partial<IssueRowData> = {}, github: Partial<IssueOnGitHub> = {}): IssueRow => {
  const data = rowData(over);
  return withGitHub([data], [gh({ number: data.number ?? 0, ...github })])[0] as IssueRow;
};

/** The issue blocks of the whole grid, without the absences. */
const issueNumbers = (model: ReturnType<typeof timelineOf>): number[] => model.lanes.flatMap((lane) => lane.cells.flatMap((cell) => cell.blocks.flatMap((b) => (b.kind === "issue" ? [b.number] : []))));

const input = (rows: IssueRow[], over: Partial<TimelineInput> = {}): TimelineInput => ({ iterations: SPRINTS, rows, loads: [], members: MEMBERS, today: "2026-10-27", mode: "person", ...over });

// ---- The grid ----

test("the sprints shown start at the current sprint and end at the last iteration, with a last column for the issues with no sprint", () => {
  const model = timelineOf(input([row()]));
  expect(model.columns.map((c) => c.title)).toEqual(["Sprint 13", "Sprint 14", "Sprint 15", "Sprint 16", "No iteration"]);
  expect(model.columns.map((c) => c.dates)).toEqual(["26–30 Oct", "2–6 Nov", "9–13 Nov", "16–20 Nov", "After 20 Nov"]);
  expect(model.columns.map((c) => c.current)).toEqual([true, false, false, false, false]);
  expect(model.empty).toBe(false);
});

test("the grid starts at the earliest past sprint that holds an open issue, and a closed issue of an earlier sprint is not shown", () => {
  const open = row({ id: "iiiiiii1", number: 126 }, { number: 126, sprint: "Sprint 12", status: "Open" });
  const closedEarlier = row({ id: "iiiiiii2", number: 127 }, { number: 127, sprint: "Sprint 12", status: "Closed" });
  expect(timelineOf(input([open])).columns[0]?.title).toBe("Sprint 12");
  const model = timelineOf(input([closedEarlier]));
  expect(model.columns[0]?.title).toBe("Sprint 13");
  expect(issueNumbers(model)).toEqual([]);
});

test("a person's lane has their issues in the sprint the read says, a block as wide as the estimate over 5 days, and the name and accessible name of the issue", () => {
  const model = timelineOf(input([row()]));
  const lane = model.lanes.find((l) => l.title === "Giulia Rossi");
  expect(lane).toMatchObject({ kind: "member", detail: "5 d / sprint", initials: "GR" });
  const block = lane?.cells[0]?.blocks[0];
  expect(block).toMatchObject({ kind: "issue", number: 128, days: 4, fraction: 0.8, closed: false, epic: "checkout", name: "#128 Move address entry · 4 d · In progress" });
  expect(model.lanes.map((l) => l.title)).toEqual(["Giulia Rossi", "Marco Bianchi", "Sara Conti"]);
});

test("an estimate over 5 days fills the cell, none is the narrowest block, and its name says so", () => {
  const model = timelineOf(input([row({ id: "iiiiiii1", number: 1 }, { number: 1, estimate: 7 }), row({ id: "iiiiiii2", number: 2, title: "No idea" }, { number: 2, estimate: null })]));
  const [big, none] = model.lanes[0]?.cells[0]?.blocks ?? [];
  expect(big).toMatchObject({ fraction: 1, name: "#1 Move address entry · 7 d · In progress" });
  expect(none).toMatchObject({ days: null, fraction: 0, name: "#2 No idea · no estimate · In progress" });
});

test("a block's width is its share of the cell, whatever the estimate says", () => {
  const model = timelineOf(input([row({ id: "iiiiiii1", number: 14 }, { number: 14, estimate: 2 }), row({ id: "iiiiiii2", number: 13 }, { number: 13, estimate: 3 }), row({ id: "iiiiiii3", number: 15, title: "No idea" }, { number: 15, estimate: null })]));
  const [two, three, none] = model.lanes[0]?.cells[0]?.blocks ?? [];
  expect(two).toMatchObject({ fraction: 0.4 });
  expect(three).toMatchObject({ fraction: 0.6 });
  expect(none).toMatchObject({ days: null, fraction: 0 });
});

test("a narrow block is never narrower than its content, which keeps its number and estimate whole and a title that gives way", () => {
  const { open } = page();
  open();
  const block = screen.getByRole("button", { name: "#129 Address form · 2 d · Closed" });
  expect(block.style.width).toBe("40%");
  expect(block.className).toContain("min-w-max");
  expect(within(block).getByText("#129").className).toContain("shrink-0");
  expect(within(block).getByText("2 d").className).toContain("shrink-0");
  // The title has no width of its own, so the block's content width is the dot, the number and the estimate only.
  const title = within(block).getByText("Address form");
  expect(title.className).toContain("truncate");
  expect(title.parentElement?.className).toContain("w-0");
});

test("the blocks of a cell keep the order the issues were published in, which is the order of their dependencies", () => {
  const rows = [row({ id: "iiiiiii1", number: 130 }, { number: 130 }), row({ id: "iiiiiii2", number: 129 }, { number: 129 }), row({ id: "iiiiiii3", number: 140 }, { number: 140 })];
  const numbers = timelineOf(input(rows)).lanes[0]?.cells[0]?.blocks.map((b) => (b.kind === "issue" ? b.number : 0));
  expect(numbers).toEqual([130, 129, 140]);
});

test("a closed issue is a closed block, an open one without sprint is in the last column, and a closed one without sprint is left out", () => {
  const closed = row({ id: "iiiiiii1", number: 126 }, { number: 126, status: "Closed" });
  const floating = row({ id: "iiiiiii2", number: 131 }, { number: 131, sprint: null, status: "Open" });
  const lostClosed = row({ id: "iiiiiii3", number: 132 }, { number: 132, sprint: null, status: "Not planned" });
  const model = timelineOf(input([closed, floating, lostClosed]));
  const cells = model.lanes[0]?.cells ?? [];
  expect(cells[0]?.blocks[0]).toMatchObject({ number: 126, closed: true });
  expect(cells.at(-1)?.blocks.map((b) => (b.kind === "issue" ? b.number : 0))).toEqual([131]);
  expect(cells.flatMap((c) => c.blocks).some((b) => b.kind === "issue" && b.number === 132)).toBe(false);
});

test("an issue that is not published, or that GitHub no longer has, is not on the timeline; a published one is when no read has it yet", () => {
  const unpublished = withGitHub([rowData({ id: "iiiiiii1", state: "not-published", number: null, assignee: "giulia" })], [])[0] as IssueRow;
  const gone = row({ id: "iiiiiii2", number: 150 }, { number: 150, status: "Not found on GitHub", sprint: null, assignee: null, estimate: null });
  const fresh = withGitHub([rowData({ id: "iiiiiii3", number: 151, assignee: "giulia", sprint: "Sprint 14", estimate: 2 })], [])[0] as IssueRow;
  const model = timelineOf(input([unpublished, gone, fresh]));
  expect(issueNumbers(model)).toEqual([151]);
  expect(model.empty).toBe(false);
  expect(timelineOf(input([unpublished, gone])).empty).toBe(true);
});

test("the lanes Unassigned and Not in this team stand only when an issue needs them", () => {
  expect(timelineOf(input([row()])).lanes.map((l) => l.title)).toEqual(["Giulia Rossi", "Marco Bianchi", "Sara Conti"]);
  const stray = row({ id: "iiiiiii2", number: 160 }, { number: 160, assignee: null });
  const outsider = row({ id: "iiiiiii3", number: 161 }, { number: 161, assignee: "zoe" });
  const lanes = timelineOf(input([stray, outsider])).lanes;
  expect(lanes.map((l) => [l.kind, l.title])).toEqual([["member", "Giulia Rossi"], ["member", "Marco Bianchi"], ["member", "Sara Conti"], ["unassigned", "Unassigned"], ["other", "Not in this team"]]);
  expect(lanes[3]?.cells[0]?.load).toBeNull();
});

test("an assignee is matched to a person by handle, without case", () => {
  const model = timelineOf(input([row({}, { assignee: "GiuLia" })]));
  expect(model.lanes[0]?.cells[0]?.blocks).toHaveLength(1);
  expect(model.lanes.some((l) => l.kind === "other")).toBe(false);
});

test("the absences of a person are blocks as wide as the working days they take, before the issues, in every sprint they touch", () => {
  const model = timelineOf(input([row({}, { sprint: "Sprint 15" })]));
  const cells = model.lanes[0]?.cells ?? [];
  expect(cells[2]?.blocks[0]).toEqual({ kind: "absence", key: "off-2026-11-10-2026-11-12", text: "Off 10–12 Nov", fraction: 0.6 });
  expect(cells[2]?.blocks[1]).toMatchObject({ kind: "issue", number: 128 });
  expect(cells[0]?.blocks).toEqual([]);
  expect(model.lanes[1]?.cells[2]?.blocks).toEqual([]);
});

test("the load of a person is every open item of the Project assigned to them in the sprint against their capacity there, over when it is more", () => {
  const loads: OpenLoad[] = [
    { assignee: "giulia", sprint: "Sprint 13", estimate: 4 },
    { assignee: "giulia", sprint: "Sprint 13", estimate: 2 },
    { assignee: "giulia", sprint: "Sprint 15", estimate: 1 },
    { assignee: "sara", sprint: "Sprint 13", estimate: null },
    { assignee: "sara", sprint: "Sprint 13", estimate: 3 },
  ];
  const model = timelineOf(input([row()], { loads }));
  const [giulia, , sara] = model.lanes;
  expect(giulia?.cells[0]?.load).toEqual({ days: 6, capacity: 5, over: true, unestimated: 0 });
  expect(giulia?.cells[2]?.load).toEqual({ days: 1, capacity: 2, over: false, unestimated: 0 });
  expect(sara?.cells[0]?.load).toEqual({ days: 3, capacity: 4, over: false, unestimated: 1 });
  // The column of the issues with no sprint has no load.
  expect(giulia?.cells.at(-1)?.load).toBeNull();
});

test("a load is told as <load> / <capacity> d, with ' · over' after it when it is over, and read in words", () => {
  expect(loadText({ days: 3.5, capacity: 5, over: false })).toBe("3.5 / 5 d");
  expect(loadText({ days: 6, capacity: 5, over: true })).toBe("6 / 5 d · over");
  expect(loadSpoken({ days: 3.5, capacity: 5, over: false })).toBe("3.5 of 5 days");
  expect(loadSpoken({ days: 6, capacity: 5, over: true })).toBe("6 of 5 days, over capacity");
  expect(unestimatedText(0)).toBeNull();
  expect(unestimatedText(1)).toBe("1 item without estimate");
  expect(unestimatedText(3)).toBe("3 items without estimate");
});

test("by epic there is a lane for each epic in the order of the Issues tab, with the days the epic has in each sprint", () => {
  const rows = [
    row({ id: "iiiiiii1", number: 1, label: "checkout" }, { number: 1, estimate: 2 }),
    row({ id: "iiiiiii2", number: 2, label: "search" }, { number: 2, estimate: 3, sprint: "Sprint 14" }),
    row({ id: "iiiiiii3", number: 3, label: "checkout" }, { number: 3, estimate: 1.5 }),
    row({ id: "iiiiiii4", number: 4, label: "" }, { number: 4, estimate: 1, sprint: null, status: "Open" }),
  ];
  const model = timelineOf(input(rows, { mode: "epic" }));
  expect(model.lanes.map((l) => [l.title, l.detail])).toEqual([["checkout", "2 issues"], ["search", "1 issue"], ["No epic", "1 issue"]]);
  expect(model.lanes[0]?.cells.map((c) => c.epicDays)).toEqual([3.5, null, null, null, null]);
  expect(model.lanes[1]?.cells.map((c) => c.epicDays)).toEqual([null, 3, null, null, null]);
  expect(model.lanes[2]?.cells.at(-1)?.epicDays).toBe(1);
  expect(model.lanes.every((lane) => lane.cells.every((cell) => cell.load === null))).toBe(true);
});

test("an issue with a signal carries the first one; closed ones carry none because the host sends none for them", () => {
  const model = timelineOf(input([row()], { signals: { 128: [{ kind: "carry-over" }, { kind: "overload" }] } }));
  expect(model.lanes[0]?.cells[0]?.blocks[0]).toMatchObject({ signal: "carry-over" });
  expect(timelineOf(input([row()])).lanes[0]?.cells[0]?.blocks[0]).toMatchObject({ signal: null });
});

test("the Project lacks sprints when its last iteration ends less than three weeks after today, and the warning names it", () => {
  expect(timelineOf(input([row()])).missing).toBeNull();
  const late = timelineOf(input([row()], { today: "2026-11-10" }));
  expect(late.missing).toEqual({ after: "Sprint 16" });
  expect(missingSprintsText("Sprint 16")).toBe("The Project has no iteration after Sprint 16.");
  expect(timelineOf(input([], { iterations: [] })).missing).toEqual({ after: null });
  expect(missingSprintsText(null)).toBe("The Project has no iteration.");
});

test("without iterations the grid has only the column of the issues with no sprint", () => {
  const model = timelineOf(input([row({}, { sprint: null })], { iterations: [] }));
  expect(model.columns.map((c) => [c.title, c.dates])).toEqual([["No iteration", ""]]);
  expect(model.lanes[0]?.cells[0]?.blocks).toHaveLength(1);
});

test("the settings of the Project are its address plus /settings; a read that predates the address leaves the owner's Projects", () => {
  expect(projectSettingsUrl({ url: "https://github.com/orgs/acme/projects/3" }, "acme")).toBe("https://github.com/orgs/acme/projects/3/settings");
  expect(projectSettingsUrl({ url: "https://github.com/users/luca/projects/3/" }, "luca")).toBe("https://github.com/users/luca/projects/3/settings");
  expect(projectSettingsUrl({}, "acme")).toBe("https://github.com/acme?tab=projects");
  expect(projectSettingsUrl(null, "acme")).toBe("https://github.com/acme?tab=projects");
});

// ---- The preview's Sprint field ----

const handoffIssue = (id: string, over: Partial<HandoffViewData["issues"][number]["values"]> = {}): HandoffViewData["issues"][number] => {
  const values = { estimate: 2, assignee: "giulia", reviewer: null, sprint: "Sprint 13", fields: {}, ...over };
  return { id, title: id, body: "", refs: [], dependsOn: [], values, agent: values, changed: [], warnings: [] };
};
const handoffOf = (id: string, issues: HandoffViewData["issues"], over: Partial<HandoffViewData> = {}): HandoffViewData => ({ id, created: null, title: id, label: null, issues, files: 0, machines: 0, warnings: 0, block: null, ...over });
const here = (over: Partial<{ id: string; assignee: string; sprint: string; estimate: string }> = {}) => ({ id: "this0001", assignee: "giulia", sprint: "Sprint 13", estimate: "1.5", ...over });

test("the preview says the load of the assignee in the sprint counting the issue, over their capacity in the sprint", () => {
  const loads: OpenLoad[] = [{ assignee: "giulia", sprint: "Sprint 13", estimate: 3 }, { assignee: "giulia", sprint: "Sprint 15", estimate: 1 }];
  expect(sprintLoadNote(here(), MEMBERS, SPRINTS, loads, [])).toEqual({ text: "Giulia has 4.5 / 5 d in this sprint", over: false });
  expect(sprintLoadNote(here({ estimate: "3" }), MEMBERS, SPRINTS, loads, [])).toEqual({ text: "Giulia has 6 / 5 d in this sprint", over: true });
  // Her absence of three days in Sprint 15 leaves two days of capacity.
  expect(sprintLoadNote(here({ sprint: "Sprint 15", estimate: "2" }), MEMBERS, SPRINTS, loads, [])).toEqual({ text: "Giulia has 3 / 2 d in this sprint", over: true });
  expect(sprintLoadNote(here({ assignee: "GIULIA", sprint: "Sprint 14", estimate: "" }), MEMBERS, SPRINTS, loads, [])).toEqual({ text: "Giulia has 0 / 5 d in this sprint", over: false });
});

test("the preview says nothing without a member as assignee, without a sprint of the Project or without a read Project", () => {
  expect(sprintLoadNote(here({ assignee: "zoe", estimate: "2" }), MEMBERS, SPRINTS, [], [])).toBeNull();
  expect(sprintLoadNote(here({ assignee: "", estimate: "2" }), MEMBERS, SPRINTS, [], [])).toBeNull();
  expect(sprintLoadNote(here({ sprint: "", estimate: "2" }), MEMBERS, SPRINTS, [], [])).toBeNull();
  expect(sprintLoadNote(here({ sprint: "Sprint 99", estimate: "2" }), MEMBERS, SPRINTS, [], [])).toBeNull();
  expect(sprintLoadNote(here({ estimate: "2" }), MEMBERS, [], [], [])).toBeNull();
});

test("the load adds the other issues of every open handoff assigned to the person in that sprint, this issue once", () => {
  const loads: OpenLoad[] = [{ assignee: "giulia", sprint: "Sprint 13", estimate: 1 }];
  const handoffs = [
    // This handoff: the issue shown is skipped whatever it holds here; its sibling counts.
    handoffOf("hhhhhhh1", [handoffIssue("this0001", { estimate: 9 }), handoffIssue("sibling1", { estimate: 0.5 })]),
    // Another open handoff, with the person written in another case.
    handoffOf("hhhhhhh2", [handoffIssue("other001", { estimate: 1, assignee: "GIULIA" }), handoffIssue("other002", { estimate: null })]),
  ];
  expect(sprintLoadNote(here(), MEMBERS, SPRINTS, loads, handoffs)).toEqual({ text: "Giulia has 4 / 5 d in this sprint", over: false });
  expect(sprintLoadNote(here({ estimate: "2.5" }), MEMBERS, SPRINTS, loads, handoffs)).toEqual({ text: "Giulia has 5 / 5 d in this sprint", over: false });
  expect(sprintLoadNote(here({ estimate: "3" }), MEMBERS, SPRINTS, loads, handoffs)).toEqual({ text: "Giulia has 5.5 / 5 d in this sprint", over: true });
});

test("the issues of the handoffs of other people, other sprints or without assignee or sprint add nothing", () => {
  const handoffs = [
    handoffOf("hhhhhhh1", [
      handoffIssue("a0000001", { assignee: "marco" }),
      handoffIssue("a0000002", { sprint: "Sprint 14" }),
      handoffIssue("a0000003", { assignee: null }),
      handoffIssue("a0000004", { sprint: null }),
    ]),
  ];
  expect(sprintLoadNote(here(), MEMBERS, SPRINTS, [], handoffs)).toEqual({ text: "Giulia has 1.5 / 5 d in this sprint", over: false });
});

test("the issue shown counts with the values it has now, not the ones its handoff holds", () => {
  // The Manager just moved it to Marco: Giulia keeps only her sibling; the handoff still lists it for her.
  const handoffs = [handoffOf("hhhhhhh1", [handoffIssue("this0001", { estimate: 4 }), handoffIssue("sibling1", { estimate: 1 })])];
  expect(sprintLoadNote(here({ assignee: "marco", estimate: "2" }), MEMBERS, SPRINTS, [], handoffs)).toEqual({ text: "Marco has 2 / 5 d in this sprint", over: false });
});

// ---- The tab ----

const TEAM: TeamMessage = { type: "team", members: MEMBERS, others: [], unreadable: 0, error: null };

const github = (issues: IssueOnGitHub[], extra: Partial<GitHubMessage> = {}): GitHubMessage => ({
  type: "teamGitHub",
  state: "ready",
  reading: false,
  repository: "acme/web",
  linked: { owner: "acme", number: 1, title: "Roadmap" },
  readAt: new Date().toISOString(),
  project: { fields: [{ id: "F1", name: "Sprint", type: "ITERATION" }], iterations: SPRINTS, url: "https://github.com/orgs/acme/projects/1" },
  issues,
  loads: [
    { assignee: "giulia", sprint: "Sprint 13", estimate: 4 },
    { assignee: "giulia", sprint: "Sprint 13", estimate: 2 },
  ],
  signals: {},
  actions: {},
  projects: [],
  error: null,
  ...extra,
});

const snapshotOf = (rows: IssueRowData[]): Snapshot => ({ ...shopSnapshot(), handoffs: [], issues: rows, numbers: { proposal: {}, task: {}, drift: {} } });

function page(over: { github?: GitHubMessage | null; snapshot?: Snapshot | null } = {}) {
  const posted: ToHost[] = [];
  const props = {
    manager: true,
    team: TEAM,
    rejection: null,
    github: github([gh(), gh({ number: 129, assignee: "sara", sprint: "Sprint 14", status: "Closed", estimate: 2 })]),
    snapshot: snapshotOf([rowData(), rowData({ id: "iiiiiii2", number: 129, title: "Address form", url: "https://github.com/acme/web/issues/129", label: "search" })]),
    post: (message: ToHost) => void posted.push(message),
    ...over,
  };
  const utils = render(<TeamPage {...props} />);
  const open = () => fireEvent.mouseDown(screen.getByRole("tab", { name: "Timeline" }));
  return { posted, open, ...utils };
}

test("the tabs are Decisions, Issues, Pull Requests, Timeline and People, in this order", () => {
  page();
  expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Decisions", "Issues", "Pull Requests", "Timeline", "People"]);
});

test("the Timeline tab shows By person, selected, and the scale note at the right", () => {
  const { open } = page();
  open();
  expect(screen.getByRole("tab", { name: "By person" }).getAttribute("aria-selected")).toBe("true");
  expect(screen.getByRole("tab", { name: "By epic" }).getAttribute("aria-selected")).toBe("false");
  expect(screen.getByText("Block width = estimate (full width = 5 days)")).not.toBeNull();
});

test("the grid is a table with sprint and lane headers, and the current sprint has its badge", () => {
  const { open } = page();
  open();
  const table = screen.getByRole("table", { name: "Issues by person and sprint" });
  const columns = within(table).getAllByRole("columnheader");
  expect(columns.map((c) => c.textContent)).toEqual(["Person", "Sprint 13Current26–30 Oct", "Sprint 142–6 Nov", "Sprint 159–13 Nov", "Sprint 1616–20 Nov", "No iterationAfter 20 Nov"]);
  expect(within(table).getAllByRole("rowheader").map((c) => c.textContent)).toEqual(["GRGiulia Rossi5 d / sprint", "MBMarco Bianchi5 d / sprint", "SCSara Conti4 d / sprint"]);
  expect(within(columns[1] as HTMLElement).getByText("Current")).not.toBeNull();
});

test("a block is a button named #<n> <title> · <d> d · <status> that opens the issue on GitHub", () => {
  const { open, posted } = page();
  open();
  fireEvent.click(screen.getByRole("button", { name: "#128 Move address entry · 4 d · In progress" }));
  expect(posted).toEqual([{ type: "openLink", url: "https://github.com/acme/web/issues/128" }]);
  expect(screen.getByRole("button", { name: "#129 Address form · 2 d · Closed" })).not.toBeNull();
});

test("a person's load shows at the bottom of the cell, in words too, over when it is over capacity", () => {
  const { open } = page();
  open();
  expect(screen.getByText("6 / 5 d · over").parentElement?.className).toContain("text-destructive");
  expect(screen.getByText("6 of 5 days, over capacity")).not.toBeNull();
  expect(screen.getAllByText("0 / 5 d").length).toBeGreaterThan(0);
});

test("By epic shows a lane for each epic with its days in each sprint, and the choice stays across the tabs", () => {
  const { open } = page();
  open();
  fireEvent.mouseDown(screen.getByRole("tab", { name: "By epic" }));
  const table = screen.getByRole("table", { name: "Issues by epic and sprint" });
  expect(within(table).getByText("epic: checkout")).not.toBeNull();
  expect(within(table).getByText("epic: search")).not.toBeNull();
  expect(within(table).getAllByText("1 issue")).toHaveLength(2);
  // The days of the epic in the sprint, besides the estimate on the block.
  expect(within(table).getAllByText("4 d")).toHaveLength(2);
  fireEvent.mouseDown(screen.getByRole("tab", { name: "Issues" }));
  fireEvent.mouseDown(screen.getByRole("tab", { name: "Timeline" }));
  expect(screen.getByRole("tab", { name: "By epic" }).getAttribute("aria-selected")).toBe("true");
});

test("when the Project lacks sprints a warning names the last one and Add iterations on GitHub opens the Project's settings", () => {
  setSystemTime(new Date(2026, 10, 10, 10, 0, 0));
  const { open, posted } = page();
  open();
  expect(screen.getByText("The Project has no iteration after Sprint 16.")).not.toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Add iterations on GitHub" }));
  expect(posted).toEqual([{ type: "openLink", url: "https://github.com/orgs/acme/projects/1/settings" }]);
});

test("with enough sprints there is no warning", () => {
  const { open } = page();
  open();
  expect(screen.queryByText(/The Project has no iteration/)).toBeNull();
  expect(screen.queryByRole("button", { name: "Add iterations on GitHub" })).toBeNull();
});

test("with no published issue it says so above the empty grid of the sprints", () => {
  const { open } = page({ github: github([]), snapshot: snapshotOf([]) });
  open();
  expect(screen.getByText("No published issues yet: the timeline fills as handoffs are approved.")).not.toBeNull();
  const table = screen.getByRole("table", { name: "Issues by person and sprint" });
  expect(within(table).getAllByRole("columnheader")).toHaveLength(6);
});

test("without a linked Project the tab is the page Link a GitHub Project", () => {
  const { open } = page({ github: github([], { linked: null, project: null }) });
  open();
  expect(screen.getAllByText("Link a GitHub Project").length).toBeGreaterThan(0);
  expect(screen.queryByRole("table", { name: "Issues by person and sprint" })).toBeNull();
});
