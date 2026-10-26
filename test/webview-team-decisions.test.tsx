import { afterEach, beforeAll, expect, jest, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Snapshot } from "../src/core/snapshot";
import type { ToHost } from "../extension/src/protocol";
import { mountTeam, TeamPage } from "../extension/src/webview/team";
import {
  avatarText,
  createsLine,
  daysText,
  decisionState,
  type EpicGroup,
  fieldEditors,
  fieldValueToSend,
  groupByEpic,
  type GitHubMessage,
  groupText,
  type HandoffIssueData,
  type HandoffViewData,
  type IssueRow,
  issueStatus,
  issuesSummary,
  previewOf,
  proposedAgo,
  rangeText,
  sprintLabel,
  stepIssue,
  warningParts,
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

afterEach(() => {
  cleanup();
  jest.useRealTimers();
});

/** A fixed instant for the logic, which takes the time it is asked about. */
const NOW = Date.parse("2026-10-25T12:00:00Z");
const ago = (minutes: number): string => new Date(NOW - minutes * 60_000).toISOString();
/** The components read the clock themselves: what they draw is told relative to it. */
const recently = (minutes: number): string => new Date(Date.now() - minutes * 60_000).toISOString();

const emptyValues = { estimate: null, assignee: null, reviewer: null, sprint: null, fields: {} };
const issue = (over: Partial<HandoffIssueData> = {}): HandoffIssueData => ({
  id: "iiiiiii1",
  title: "Add a guest checkout path",
  body: "## Context\n\nShoppers who are not signed in leave.",
  refs: ["checkout/Cart", "requirements/checkout#General"],
  dependsOn: [],
  values: { estimate: 4, assignee: "giulia", reviewer: "sara", sprint: "Sprint 14", fields: { Priority: "P1" } },
  agent: { estimate: 4, assignee: "giulia", reviewer: "marco", sprint: "Sprint 14", fields: { Priority: "P1" } },
  changed: ["reviewer"],
  warnings: ["Estimated 4 d: more than 3 days per issue", "Not covered: checkout/Cart/START"],
  ...over,
});
const handoff = (over: Partial<HandoffViewData> = {}): HandoffViewData => ({
  id: "hhhhhhh1",
  created: recently(12),
  title: "Guest checkout",
  label: "checkout",
  issues: [issue(), issue({ id: "iiiiiii2", title: "Validate the guest email", warnings: [], changed: [], values: { ...emptyValues, estimate: 1 } })],
  files: 2,
  machines: 2,
  warnings: 2,
  block: null,
  ...over,
});
const snapshotWith = (over: Partial<Snapshot> = {}): Snapshot => ({ ...shopSnapshot(), handoffs: [], issues: [], numbers: { proposal: { hhhhhhh1: "P4" }, task: {}, drift: {} }, ...over });

const MEMBERS: TeamMessage["members"] = [
  { id: "aaaaaaa1", name: "Giulia Rossi", handle: "giulia", level: "senior", skills: [], capacity: 5, absences: [], repositories: ["acme/web"], initials: "GR", nextAbsence: null },
  { id: "bbbbbbb2", name: "Sara Conti", handle: "sara", level: "mid", skills: [], capacity: 5, absences: [], repositories: ["acme/web"], initials: "SC", nextAbsence: null },
];
const team = (): TeamMessage => ({ type: "team", members: MEMBERS, others: [], unreadable: 0, error: null });
const github = (extra: Partial<GitHubMessage> = {}): GitHubMessage => ({
  type: "teamGitHub",
  state: "ready",
  reading: false,
  repository: "acme/web",
  linked: { owner: "acme", number: 1, title: "Roadmap" },
  readAt: new Date().toISOString(),
  project: {
    fields: [
      { id: "F1", name: "Title", type: "TITLE" },
      { id: "F2", name: "Status", type: "SINGLE_SELECT", options: [{ id: "O1", name: "Todo" }, { id: "O2", name: "Done" }] },
      { id: "F3", name: "Sprint", type: "ITERATION" },
      { id: "F4", name: "Priority", type: "SINGLE_SELECT", options: [{ id: "P1", name: "P1" }, { id: "P2", name: "P2" }] },
      { id: "F5", name: "Points", type: "NUMBER" },
      { id: "F6", name: "Other", type: "ITERATION" },
    ],
    iterations: [
      { id: "I1", title: "Sprint 12", startDate: "2026-10-05", duration: 7 },
      { id: "I2", title: "Sprint 14", startDate: "2026-10-26", duration: 7 },
    ],
  },
  issues: [],
  loads: [],
  signals: {},
  actions: {},
  projects: [],
  error: null,
  ...extra,
});

function page(snapshot: Snapshot | null, over: { github?: GitHubMessage | null; fieldRejections?: Record<string, string>; notice?: string | null } = {}) {
  const posted: ToHost[] = [];
  const post = (message: ToHost) => void posted.push(message);
  const props = { team: team(), rejection: null, github: github(), snapshot, post, ...over };
  const utils = render(<TeamPage {...props} />);
  const again = (next: Snapshot | null, more: typeof over = over) => utils.rerender(<TeamPage {...props} snapshot={next} {...more} />);
  return { posted, again, ...utils };
}

// ---- The logic ----

test("when a handoff was proposed: just now, minutes, hours, yesterday, then the date", () => {
  expect(proposedAgo(null, NOW)).toBeNull();
  expect(proposedAgo(ago(0), NOW)).toBe("just now");
  expect(proposedAgo(ago(12), NOW)).toBe("12 min ago");
  expect(proposedAgo(ago(60), NOW)).toBe("1 h ago");
  expect(proposedAgo(ago(5 * 60), NOW)).toBe("5 h ago");
  const yesterday = new Date(NOW);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(9, 0, 0, 0);
  expect(proposedAgo(yesterday.toISOString(), NOW)).toBe("yesterday");
  const older = new Date(NOW);
  older.setDate(older.getDate() - 20);
  expect(proposedAgo(older.toISOString(), NOW)).toMatch(/^\d{1,2} [A-Z][a-z]{2}$/);
});

test("the second line of a card counts the issues and the Machines, or says it changes nothing", () => {
  expect(createsLine(handoff({ created: ago(12) }), NOW)).toBe("Creates 2 issues · changes 2 Machines · proposed 12 min ago");
  expect(createsLine(handoff({ created: ago(12), issues: [issue()], machines: 1 }), NOW)).toBe("Creates 1 issue · changes 1 Machine · proposed 12 min ago");
  expect(createsLine(handoff({ files: 0, machines: 0, created: null }), NOW)).toBe("Creates 2 issues · changes nothing in the Model");
});

test("the agent still finishing disables both decisions with its reason; a blocked handoff disables Approve only, with the first reason", () => {
  expect(decisionState(handoff(), [])).toEqual({ approve: null, reject: null });
  expect(decisionState(handoff(), ["hhhhhhh1"])).toEqual({ approve: "The agent is still finishing", reject: "The agent is still finishing" });
  const blocked = handoff({ block: { kind: "project", reason: "Link a GitHub Project first" } });
  expect(decisionState(blocked, [])).toEqual({ approve: "Link a GitHub Project first", reject: null });
});

test("the preview is where its handoff and index say, brought inside the issues, and gone with its handoff", () => {
  const handoffs = [handoff()];
  expect(previewOf(handoffs, null)).toBeNull();
  expect(previewOf(handoffs, { handoff: "gone", issue: 0 })).toBeNull();
  expect(previewOf(handoffs, { handoff: "hhhhhhh1", issue: 1 })?.issue.id).toBe("iiiiiii2");
  expect(previewOf(handoffs, { handoff: "hhhhhhh1", issue: 9 })?.index).toBe(1);
  expect(previewOf([handoff({ issues: [] })], { handoff: "hhhhhhh1", issue: 0 })).toBeNull();
  expect([stepIssue(0, 3, -1), stepIssue(0, 3, 1), stepIssue(2, 3, 1)]).toEqual([0, 1, 2]);
});

test("the warnings of an issue say what is wrong and what to do; only a long issue offers Split", () => {
  expect(warningParts("Estimated 4 d: more than 3 days per issue")).toEqual({ strong: "Estimated 4 d: more than 3 days per issue.", hint: "Split it so each part fits in a sprint.", split: true });
  expect(warningParts("Not covered: checkout/Cart")).toEqual({ strong: "Not covered: checkout/Cart.", hint: "No issue of this handoff is about it.", split: false });
});

test("the fields of the preview: people, estimate, sprint, then the Project's own in its order, iteration fields and the Project's own left out", () => {
  const editors = fieldEditors(issue(), MEMBERS, github().project, NOW);
  expect(editors.map((e) => `${e.key}:${e.kind}`)).toEqual(["assignee:person", "reviewer:person", "estimate:estimate", "sprint:sprint", "fields.Status:select", "fields.Priority:select", "fields.Points:number"]);
  const reviewer = editors[1];
  expect(reviewer).toMatchObject({ value: "sara", agent: "marco", changed: true });
  expect(reviewer?.options.map((o) => o.label)).toEqual(["@giulia", "@sara"]);
  expect(editors[0]?.changed).toBe(false);
  // Only the sprints that have not ended are offered, the chosen one always; each shows its days.
  expect(editors[3]?.options.map((o) => o.label)).toEqual(["Sprint 14 · 26 Oct – 1 Nov"]);
  expect(editors[4]?.options.map((o) => o.value)).toEqual(["Todo", "Done"]);
  // Without the Project read only the four fields stand.
  expect(fieldEditors(issue(), MEMBERS, null, NOW).map((e) => e.key)).toEqual(["assignee", "reviewer", "estimate", "sprint"]);
});

test("a handle that is not in the team is still shown as the value; an ended sprint already chosen stays in the choices", () => {
  const editors = fieldEditors(issue({ values: { ...issue().values, assignee: "visitor", sprint: "Sprint 12" } }), MEMBERS, github().project, NOW);
  expect(editors[0]?.options.map((o) => o.value)).toEqual(["giulia", "sara", "visitor"]);
  expect(editors[3]?.options.map((o) => o.value)).toEqual(["Sprint 12", "Sprint 14"]);
});

test("what a field sends: an estimate that is a number as a number, anything else as written; empty is nothing", () => {
  expect(fieldValueToSend({ kind: "estimate" }, " 3.5 ")).toBe(3.5);
  expect(fieldValueToSend({ kind: "estimate" }, "abc")).toBe("abc");
  expect(fieldValueToSend({ kind: "estimate" }, "")).toBe("");
  expect(fieldValueToSend({ kind: "text" }, "  ")).toBeNull();
  expect(fieldValueToSend({ kind: "text" }, "note")).toBe("note");
  expect(sprintLabel({ title: "Sprint 14", startDate: "2026-11-02", duration: 5 }, 2026)).toBe("Sprint 14 · 2–6 Nov");
  expect(rangeText({ from: "2026-10-30", to: "2026-11-02" }, 2026)).toBe("30 Oct – 2 Nov");
});

const row = (over: Partial<Snapshot["issues"][number]> = {}): Snapshot["issues"][number] => ({ id: "r1", title: "T", handoff: "h1", label: "checkout", state: "published", number: 126, url: "https://github.com/acme/web/issues/126", published: "2026-10-20T10:00:00.000Z", reason: null, unset: [], assignee: "giulia", sprint: "Sprint 12", estimate: 2, publishBlock: null, ...over });

test("the rows are grouped by epic in the order of the first handoff, adding up the days; no epic has its own group", () => {
  const groups = groupByEpic(withGitHub([row({ id: "a", label: "checkout", estimate: 2 }), row({ id: "b", label: "search", estimate: 1.5 }), row({ id: "c", label: "checkout", estimate: 7.5 }), row({ id: "d", label: "", estimate: null })], []));
  expect(groups.map((g) => [g.label, g.rows.map((r) => r.id), g.days])).toEqual([
    ["checkout", ["a", "c"], 9.5],
    ["search", ["b"], 1.5],
    ["No epic", ["d"], 0],
  ]);
  expect(issuesSummary(groups)).toBe("4 issues in 3 epics · ordered by dependencies");
  expect(issuesSummary(groupByEpic(withGitHub([row()], [])))).toBe("1 issue in 1 epic · ordered by dependencies");
  expect([daysText(9.5), daysText(5), daysText(0)]).toEqual(["9.5 d", "5 d", "0 d"]);
});

test("the status of an issue is a pill with words: Publishing, Not published, and once published where GitHub has it", () => {
  expect(issueStatus({ state: "publishing" })).toEqual({ label: "Publishing", look: "publishing" });
  expect(issueStatus({ state: "not-published" })).toEqual({ label: "Not published", look: "not-published" });
  expect(issueStatus({ state: "published" })).toEqual({ label: "Open", look: "open" });
  expect(issueStatus({ state: "published" }, { status: "In progress" })).toEqual({ label: "In progress", look: "in-progress" });
  expect(issueStatus({ state: "published" }, { status: "In review" })).toEqual({ label: "In review", look: "in-review" });
  expect(issueStatus({ state: "published" }, { status: "Closed" })).toEqual({ label: "Closed", look: "closed" });
  expect(issueStatus({ state: "published" }, { status: "Not planned" })).toEqual({ label: "Not planned", look: "not-planned" });
  expect(issueStatus({ state: "published" }, { status: "Not found on GitHub" })).toEqual({ label: "Not found on GitHub", look: "not-found" });
  expect(avatarText("giulia", MEMBERS)).toBe("GR");
  expect(avatarText("visitor", MEMBERS)).toBe("VI");
});

test("what GitHub says of a published issue replaces its published sprint, estimate and assignee, even with none; other rows keep their own", () => {
  const rows = [row({ id: "a", number: 126 }), row({ id: "b", number: 127 }), row({ id: "c", number: null, state: "not-published" })];
  const [a, b, c] = withGitHub(rows, [{ number: 126, status: "Closed", assignee: null, sprint: null, estimate: null }]);
  expect([a?.github?.status, a?.assignee, a?.sprint, a?.estimate]).toEqual(["Closed", null, null, null]);
  expect([b?.github, b?.assignee, b?.sprint, b?.estimate]).toEqual([null, "giulia", "Sprint 12", 2]);
  expect(c?.github).toBeNull();
  expect(groupText(groupByEpic([a as IssueRow, b as IssueRow])[0] as EpicGroup)).toBe("2 issues · 2 d · 1 closed");
});

// ---- The Decisions tab ----

test("Decisions: the heading, the hint, New handoff, and a card per open handoff with the number, the title, the epic and the counts", () => {
  const { posted } = page(snapshotWith({ handoffs: [handoff(), handoff({ id: "hhhhhhh2", title: "Rate-limit the search API", label: "search", created: recently(60), issues: [issue()], files: 0, machines: 0, warnings: 0 })] }));
  expect(screen.getByRole("heading", { name: "Waiting for your decision" })).not.toBeNull();
  expect(screen.getByText("Approving publishes the issues on GitHub")).not.toBeNull();
  const tab = screen.getByRole("tab", { name: "Decisions, 2 waiting" });
  expect(tab.textContent).toBe("Decisions2");
  const cards = screen.getAllByRole("listitem");
  expect(cards).toHaveLength(2);
  const first = within(cards[0] as HTMLElement);
  expect(first.getByRole("img", { name: "Short number (temporary) P4" }).textContent).toBe("P4");
  expect(first.getByRole("button", { name: "Guest checkout" })).not.toBeNull();
  expect(first.getByText("epic: checkout")).not.toBeNull();
  expect(first.getByText("Creates 2 issues · changes 2 Machines · proposed 12 min ago")).not.toBeNull();
  expect(first.getByText("2 warnings")).not.toBeNull();
  expect(within(cards[1] as HTMLElement).getByText("Creates 1 issue · changes nothing in the Model · proposed 1 h ago")).not.toBeNull();
  expect(within(cards[1] as HTMLElement).queryByText(/warning/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "New handoff" }));
  expect(posted).toEqual([{ type: "writeHandoffRequest" }]);
});

test("Approve and Reject send the decisions of the Board's cards for that handoff, and Rework with feedback… is in the arrow of Reject", () => {
  const { posted } = page(snapshotWith({ handoffs: [handoff()] }));
  fireEvent.click(screen.getByRole("button", { name: "Approve P4 Guest checkout" }));
  fireEvent.click(screen.getByRole("button", { name: "Reject P4 Guest checkout" }));
  expect(posted).toEqual([
    { type: "approveProposal", id: "hhhhhhh1" },
    { type: "rejectProposal", id: "hhhhhhh1" },
  ]);
  posted.length = 0;
  fireEvent.pointerDown(screen.getByRole("button", { name: "More ways to reject P4" }), { button: 0, ctrlKey: false });
  fireEvent.click(screen.getByRole("menuitem", { name: /Rework with feedback/ }));
  expect(posted).toEqual([{ type: "reworkProposal", proposal: "hhhhhhh1" }]);
});

test("a handoff blocked or still being finished shows why: Approve is disabled with the reason, the reasons stay under the card", () => {
  const blocked = handoff({ block: { kind: "project", reason: "Link a GitHub Project first" } });
  page(snapshotWith({ handoffs: [blocked], finishingProposals: [] }));
  expect((screen.getByRole("button", { name: "Approve P4 Guest checkout" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByText("Link a GitHub Project first")).not.toBeNull();
  expect((screen.getByRole("button", { name: "Reject P4 Guest checkout" }) as HTMLButtonElement).disabled).toBe(false);
  cleanup();
  page(snapshotWith({ handoffs: [handoff()], finishingProposals: ["hhhhhhh1"] }));
  expect((screen.getByRole("button", { name: "Approve P4 Guest checkout" }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole("button", { name: "Reject P4 Guest checkout" }) as HTMLButtonElement).disabled).toBe(true);
});

test("with no handoff waiting Decisions says so, offers New handoff and View published issues, which opens the Issues tab", () => {
  const { posted } = page(snapshotWith());
  expect(screen.getByText("No handoff waits for a decision")).not.toBeNull();
  expect(screen.getByText("When the agent turns a request into issues for your team, its proposal appears here for you to approve.")).not.toBeNull();
  expect(screen.getByRole("tab", { name: "Decisions" })).not.toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "New handoff" }));
  expect(posted).toEqual([{ type: "writeHandoffRequest" }]);
  fireEvent.click(screen.getByRole("button", { name: "View published issues" }));
  expect(screen.getByRole("tab", { name: "Issues" }).getAttribute("aria-selected")).toBe("true");
});

test("without a linked Project the cards stay, with the page Link a GitHub Project above them", () => {
  page(snapshotWith({ handoffs: [handoff({ block: { kind: "project", reason: "Link a GitHub Project first" } })] }), { github: github({ linked: null, project: null, projects: [{ owner: "acme", number: 1, title: "Roadmap", repository: true, iteration: true, fields: ["Iteration"] }] }) });
  expect(screen.getByRole("heading", { name: "Link a GitHub Project" })).not.toBeNull();
  expect(screen.getByRole("button", { name: "Guest checkout" })).not.toBeNull();
});

// ---- The issue preview ----

const open = (over: { github?: GitHubMessage | null } = {}) => {
  const view = page(snapshotWith({ handoffs: [handoff()] }), over);
  fireEvent.click(screen.getByRole("button", { name: "Guest checkout" }));
  return view;
};

test("a click on a card, or on its title, opens the preview of its first issue; the bar names the handoff and the place of the issue", () => {
  open();
  expect(screen.getByRole("button", { name: "Decisions" })).not.toBeNull();
  expect(screen.getByText("1 of 2")).not.toBeNull();
  expect(screen.getByRole("heading", { name: "Add a guest checkout path" })).not.toBeNull();
  expect(screen.getByText("Not published")).not.toBeNull();
  expect(screen.getByText("New issue in acme/web")).not.toBeNull();
  expect(screen.getByText("epic: checkout")).not.toBeNull();
  expect(screen.getByText("drafted from handoff P4 · preview of the GitHub issue body")).not.toBeNull();
  expect(screen.getByText("Shoppers who are not signed in leave.")).not.toBeNull();
  // The same Approve and Reject as the card.
  expect(screen.getByRole("button", { name: "Approve P4 Guest checkout" })).not.toBeNull();
});

test("the Sprint field says what the assignee has in that sprint counting this issue, in the destructive colour over their capacity", () => {
  open();
  // Giulia has capacity 5 and the issue is 4 days: nothing else in the Project yet.
  expect(screen.getByText("Giulia has 4 / 5 d in this sprint").className).toContain("text-muted-foreground");
  cleanup();
  open({ github: github({ loads: [{ assignee: "giulia", sprint: "Sprint 14", estimate: 3 }] }) });
  const over = screen.getByText("Giulia has 7 / 5 d in this sprint");
  expect(over.className).toContain("text-destructive");
  expect(over.className).not.toContain("text-muted-foreground");
});

test("the Sprint field counts the other issues of every open handoff, the issue shown once", () => {
  const other = handoff({ id: "hhhhhhh2", title: "Saved carts", issues: [issue({ id: "jjjjjjj1", values: { ...emptyValues, estimate: 2, assignee: "giulia", sprint: "Sprint 14" } })] });
  page(snapshotWith({ handoffs: [handoff(), other] }), {});
  fireEvent.click(screen.getByRole("button", { name: "Guest checkout" }));
  // The issue (4 d) and the one of the other handoff (2 d); the issue is also listed in its handoff and counts once.
  expect(screen.getByText("Giulia has 6 / 5 d in this sprint").className).toContain("text-destructive");
});

test("without a read Project the Sprint field says nothing of the load", () => {
  open({ github: github({ project: null, loads: [] }) });
  expect(screen.queryByText(/in this sprint/)).toBeNull();
});

test("the arrows and Alt+↓ and Alt+↑ move between the issues; Esc goes back to the cards", () => {
  open();
  expect((screen.getByRole("button", { name: "Previous issue · Alt+↑" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Next issue · Alt+↓" }));
  expect(screen.getByText("2 of 2")).not.toBeNull();
  expect(screen.getByRole("heading", { name: "Validate the guest email" })).not.toBeNull();
  expect((screen.getByRole("button", { name: "Next issue · Alt+↓" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.keyDown(document, { key: "ArrowUp", altKey: true });
  expect(screen.getByText("1 of 2")).not.toBeNull();
  fireEvent.keyDown(document, { key: "ArrowDown", altKey: true });
  expect(screen.getByText("2 of 2")).not.toBeNull();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.getByRole("heading", { name: "Waiting for your decision" })).not.toBeNull();
  // The focus is back on the card that was opened.
  expect(document.activeElement?.id).toBe("handoff-hhhhhhh1");
});

test("an estimate over three days has the Split warning, which asks the host to split that issue", () => {
  const { posted } = open();
  expect(screen.getByText("Estimated 4 d: more than 3 days per issue.")).not.toBeNull();
  expect(screen.getByText("Not covered: checkout/Cart/START.")).not.toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Split" }));
  expect(posted).toEqual([{ type: "splitIssue", handoff: "hhhhhhh1", issue: "iiiiiii1" }]);
});

test("the fields column: each field says who proposed it, and Undo of a changed one sends the agent's value", () => {
  const { posted } = open();
  expect(screen.getByLabelText("Estimate (days)")).toMatchObject({ value: "4" });
  expect(screen.getAllByText("Proposed by the agent").length).toBeGreaterThan(0);
  expect(screen.getByText(/Changed by you/)).not.toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(posted).toEqual([{ type: "setIssueField", handoff: "hhhhhhh1", issue: "iiiiiii1", key: "reviewer", value: "marco" }]);
});

test("an estimate is saved when the input loses focus, as a number, and not when it did not change; an estimate over three days has the warning border", () => {
  const { posted } = open();
  const input = screen.getByLabelText("Estimate (days)") as HTMLInputElement;
  expect(input.className).toContain("border-amber-600");
  fireEvent.blur(input);
  expect(posted).toEqual([]);
  fireEvent.change(input, { target: { value: "2.5" } });
  fireEvent.blur(input);
  expect(posted).toEqual([{ type: "setIssueField", handoff: "hhhhhhh1", issue: "iiiiiii1", key: "estimate", value: 2.5 }]);
});

test("a value the host refused keeps the input with the destructive border and the message under it, until the next change is sent", () => {
  const { posted, again } = open();
  again(snapshotWith({ handoffs: [handoff()] }), { fieldRejections: { "hhhhhhh1/iiiiiii1/estimate": "Enter 0.5 days or more, in steps of 0.5." } });
  const input = screen.getByLabelText("Estimate (days)") as HTMLInputElement;
  expect(input.getAttribute("aria-invalid")).toBe("true");
  expect(input.className).toContain("border-destructive");
  expect(screen.getByRole("alert").textContent).toBe("Enter 0.5 days or more, in steps of 0.5.");
  expect(posted).toEqual([]);
});

test("the references are folded; opened, they are the chips that go to the Diagram and Requirements", () => {
  open();
  expect(screen.getByText("2 items")).not.toBeNull();
  expect(screen.queryByRole("button", { name: /Show checkout\/Cart on the diagram/ })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Trama references/ }));
  expect(screen.getByRole("button", { name: "checkout/Cart" })).not.toBeNull();
  expect(screen.getByRole("button", { name: "requirements/checkout#General" })).not.toBeNull();
});

test("the preview goes back to the cards when its handoff is decided", () => {
  const { again } = open();
  expect(screen.getByText("1 of 2")).not.toBeNull();
  again(snapshotWith({ handoffs: [] }));
  expect(screen.getByText("No handoff waits for a decision")).not.toBeNull();
});

// ---- The Issues tab ----

const issuesPage = (rows: Snapshot["issues"], over: { github?: GitHubMessage | null } = {}) => {
  const view = page(snapshotWith({ issues: rows }), over);
  fireEvent.mouseDown(screen.getByRole("tab", { name: "Issues" }));
  return view;
};

test("Issues: the summary, the groups by epic with their counts and days, and a row with number, title, avatar, sprint and status", () => {
  const rows = [
    row({ id: "a", number: 126, title: "Extract the payment step", estimate: 2, assignee: "giulia", sprint: "Sprint 12" }),
    row({ id: "b", number: 128, title: "Move address entry", estimate: 7.5, label: "checkout", assignee: "sara", sprint: "Sprint 13" }),
    row({ id: "c", number: null, url: null, title: "Rank search results", label: "search", state: "not-published", reason: "label “epic: search” does not exist in acme/web", estimate: 2, assignee: null, sprint: null, publishBlock: null }),
  ];
  issuesPage(rows);
  expect(screen.getByText("3 issues in 2 epics · ordered by dependencies")).not.toBeNull();
  expect(screen.getByRole("table", { name: "Issues" })).not.toBeNull();
  expect(screen.getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual(["Issue", "Title", "Assignee", "Sprint", "Status", "Actions"]);
  expect(screen.getByText("2 issues · 9.5 d")).not.toBeNull();
  expect(screen.getByText("1 issue · 2 d")).not.toBeNull();
  const first = within(screen.getByText("Extract the payment step").closest("[role=row]") as HTMLElement);
  expect(first.getByText("#126").className).toContain("font-mono");
  expect(first.getByRole("img", { name: "Assigned to @giulia" }).textContent).toBe("GR");
  expect(first.getByText("Sprint 12")).not.toBeNull();
  expect(first.getByText("Open")).not.toBeNull();
  const notPublished = within(screen.getByText("Rank search results").closest("[role=row]") as HTMLElement);
  expect(notPublished.getByText("–", { selector: "span[role=cell]" })).not.toBeNull();
  expect(notPublished.getByRole("img", { name: "No assignee" })).not.toBeNull();
  expect(notPublished.getByText("No sprint")).not.toBeNull();
  expect(notPublished.getByText("Not published")).not.toBeNull();
  expect(notPublished.getByText("Publish failed: label “epic: search” does not exist in acme/web")).not.toBeNull();
});

test("a group folds with its chevron, named Fold <epic>, and unfolds", () => {
  issuesPage([row({ id: "a", title: "Row A" }), row({ id: "b", title: "Row B", label: "search" })]);
  fireEvent.click(screen.getByRole("button", { name: "Fold checkout" }));
  expect(screen.queryByText("Row A")).toBeNull();
  expect(screen.getByText("Row B")).not.toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Unfold checkout" }));
  expect(screen.getByText("Row A")).not.toBeNull();
});

test("the fields GitHub did not take are listed under the title; Open on GitHub opens the address of a published issue", () => {
  const { posted } = issuesPage([row({ id: "a", unset: ["Priority", "Sprint"] })]);
  expect(screen.getByText("Fields not set on GitHub: Priority, Sprint")).not.toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Open on GitHub" }));
  expect(posted).toEqual([{ type: "openLink", url: "https://github.com/acme/web/issues/126" }]);
});

test("a published issue shows where the last read of GitHub found it, with its sprint, estimate and assignee; one the read lacks is Not found on GitHub and only opens", () => {
  const rows = [
    row({ id: "a", number: 126, title: "Extracted", estimate: 2, assignee: "giulia", sprint: "Sprint 12" }),
    row({ id: "b", number: 128, title: "Moved", estimate: 2, assignee: "giulia", sprint: "Sprint 12" }),
    row({ id: "c", number: 129, title: "Reviewed", estimate: 1, assignee: null, sprint: null }),
    row({ id: "d", number: 130, title: "Dropped", estimate: 1, assignee: null, sprint: null }),
    row({ id: "e", number: 121, title: "Unplanned", estimate: 1, assignee: null, sprint: null }),
    row({ id: "f", number: 140, title: "Kept", estimate: 1, assignee: null, sprint: null }),
  ];
  const issues = [
    { number: 126, status: "Closed" as const, assignee: "giulia", sprint: "Sprint 12", estimate: 2 },
    { number: 128, status: "In progress" as const, assignee: "sara", sprint: "Sprint 13", estimate: 3.5 },
    { number: 129, status: "In review" as const, assignee: null, sprint: null, estimate: null },
    { number: 130, status: "Not found on GitHub" as const, assignee: null, sprint: null, estimate: null },
    { number: 121, status: "Not planned" as const, assignee: null, sprint: null, estimate: null },
  ];
  issuesPage(rows, { github: github({ issues }) });
  const rowOf = (title: string) => within(screen.getByText(title).closest("[role=row]") as HTMLElement);
  expect(rowOf("Extracted").getByText("Closed")).not.toBeNull();
  expect(rowOf("Moved").getByText("In progress")).not.toBeNull();
  // The sprint, estimate and assignee are GitHub's, not the ones published.
  expect(rowOf("Moved").getByText("Sprint 13")).not.toBeNull();
  expect(rowOf("Moved").getByRole("img", { name: "Assigned to @sara" })).not.toBeNull();
  expect(rowOf("Reviewed").getByText("In review")).not.toBeNull();
  expect(rowOf("Reviewed").getByText("No sprint")).not.toBeNull();
  expect(rowOf("Reviewed").getByRole("img", { name: "No assignee" })).not.toBeNull();
  expect(rowOf("Unplanned").getByText("Not planned")).not.toBeNull();
  expect(rowOf("Dropped").getByText("Not found on GitHub")).not.toBeNull();
  expect(rowOf("Dropped").queryByRole("button", { name: "Comment update" })).toBeNull();
  expect(rowOf("Dropped").getByRole("button", { name: "Open on GitHub" })).not.toBeNull();
  // An issue the read does not name yet is as it was published.
  expect(rowOf("Kept").getByText("Open")).not.toBeNull();
  // The group adds the days of GitHub's estimates (none counts 0; the issue the read lacks keeps its card's) and says how many issues are closed.
  expect(screen.getByText("6 issues · 6.5 d · 1 closed")).not.toBeNull();
});

test("Publish again is for an issue not published: it asks the host, and it is disabled while the handoff is being published or without a Project", () => {
  const { posted } = issuesPage([row({ id: "a", state: "not-published", number: null, url: null, publishBlock: null, reason: null }), row({ id: "b", state: "publishing", number: null, url: null, publishBlock: "The issues of this handoff are being published", title: "B" })]);
  const buttons = screen.getAllByRole("button", { name: "Publish again" }) as HTMLButtonElement[];
  expect(buttons.map((b) => b.disabled)).toEqual([false, true]);
  fireEvent.click(buttons[0] as HTMLElement);
  expect(posted).toEqual([{ type: "publishAgain", handoff: "h1" }]);
  expect(screen.getByText("Publishing")).not.toBeNull();
  const spinner = screen.getByText("Publishing").querySelector("svg");
  expect(spinner?.getAttribute("class")).toContain("motion-reduce:animate-none");
});

test("without an issue the tab says so", () => {
  issuesPage([]);
  expect(screen.getByText("No issues yet. Approve a handoff to publish its issues.")).not.toBeNull();
});

const found = (number: number, over: Partial<GitHubMessage["issues"][number]> = {}): GitHubMessage["issues"][number] => ({ number, status: "Open", assignee: "giulia", sprint: "Sprint 12", estimate: 2, ...over });

test("an open issue shows its signals under the title, each a badge with its word and its reason, in the order the host sent them", () => {
  const rows = [row({ id: "a", number: 128, title: "Moved" }), row({ id: "b", number: 129, title: "Reviewed" })];
  const signals = {
    128: [
      { kind: "stale" as const, reason: "The Model changed after publishing" },
      { kind: "carry-over" as const, reason: "From Sprint 12" },
      { kind: "overload" as const, reason: "Giulia 6 / 5 d" },
      { kind: "dependency" as const, reason: "Blocked by #129" },
    ],
  };
  issuesPage(rows, { github: github({ issues: [found(128, { status: "In progress" }), found(129)], signals }) });
  const moved = within(screen.getByText("Moved").closest("[role=row]") as HTMLElement);
  expect(moved.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
    "StaleThe Model changed after publishing",
    "Carry-overFrom Sprint 12",
    "OverloadGiulia 6 / 5 d",
    "DependencyBlocked by #129",
  ]);
  expect(within(screen.getByText("Reviewed").closest("[role=row]") as HTMLElement).queryByRole("list", { name: "Signals" })).toBeNull();
});

test("Comment update is on an open stale issue and Scan on a closed one, with Open on GitHub beside them as an icon; both ask the host with the issue's identity", () => {
  const rows = [row({ id: "a", number: 128, title: "Moved" }), row({ id: "b", number: 126, title: "Extracted" }), row({ id: "c", number: 129, title: "Plain" })];
  const signals = { 128: [{ kind: "stale" as const, reason: "The Model changed after publishing" }] };
  const { posted } = issuesPage(rows, { github: github({ issues: [found(128, { status: "In review" }), found(126, { status: "Closed" }), found(129)], signals }) });
  const rowOf = (title: string) => within(screen.getByText(title).closest("[role=row]") as HTMLElement);
  fireEvent.click(rowOf("Moved").getByRole("button", { name: "Comment update" }));
  fireEvent.click(rowOf("Extracted").getByRole("button", { name: "Scan" }));
  expect(posted).toEqual([{ type: "askIssueUpdate", issue: "a" }, { type: "scanIssue", issue: "b" }]);
  // The address still opens, from a button with no text but its name.
  expect(rowOf("Moved").getByRole("button", { name: "Open on GitHub" }).textContent).toBe("");
  expect(rowOf("Extracted").getByRole("button", { name: "Open on GitHub" }).textContent).toBe("");
  // An issue with no signal and no close has Open on GitHub alone, with its text.
  expect(rowOf("Plain").getByRole("button", { name: "Open on GitHub" }).textContent).toBe("Open on GitHub");
  expect(rowOf("Plain").queryByRole("button", { name: "Comment update" })).toBeNull();
  expect(rowOf("Plain").queryByRole("button", { name: "Scan" })).toBeNull();
  expect(rowOf("Moved").queryByRole("button", { name: "Scan" })).toBeNull();
  expect(rowOf("Extracted").queryByRole("button", { name: "Comment update" })).toBeNull();
});

test("an issue set aside or gone from GitHub has neither action; a closed issue as not planned is not scanned", () => {
  const rows = [row({ id: "a", number: 121, title: "Unplanned" }), row({ id: "b", number: 130, title: "Dropped" })];
  issuesPage(rows, { github: github({ issues: [found(121, { status: "Not planned" }), found(130, { status: "Not found on GitHub" })] }) });
  expect(screen.queryByRole("button", { name: "Scan" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Comment update" })).toBeNull();
});

test("an action is disabled with its reason while its job runs or a Run of this window is in progress, and nothing is sent", () => {
  const rows = [row({ id: "a", number: 128, title: "Moved" }), row({ id: "b", number: 126, title: "Extracted" })];
  const signals = { 128: [{ kind: "stale" as const, reason: "The Model changed after publishing" }] };
  const actions = { 128: { update: "Updating…", scan: null }, 126: { update: null, scan: "A run is in progress" } };
  const { posted } = issuesPage(rows, { github: github({ issues: [found(128), found(126, { status: "Closed" })], signals, actions }) });
  const update = screen.getByRole("button", { name: "Comment update" }) as HTMLButtonElement;
  const scan = screen.getByRole("button", { name: "Scan" }) as HTMLButtonElement;
  expect([update.disabled, scan.disabled]).toEqual([true, true]);
  fireEvent.click(update);
  fireEvent.click(scan);
  expect(posted).toEqual([]);
});

test("Issues shows the skeleton during the first read of GitHub, and the page to link a Project while none is linked", () => {
  issuesPage([row()], { github: github({ state: "loading", linked: null, readAt: null, project: null }) });
  expect(screen.getAllByText("Loading from GitHub…").length).toBeGreaterThan(0);
  expect(screen.queryByRole("table", { name: "Issues" })).toBeNull();
  cleanup();
  issuesPage([row()], { github: github({ linked: null, project: null, projects: [] }) });
  expect(screen.getByRole("heading", { name: "Link a GitHub Project" })).not.toBeNull();
  expect(screen.queryByRole("table", { name: "Issues" })).toBeNull();
  // People and the tab bar stay usable.
  fireEvent.mouseDown(screen.getByRole("tab", { name: "People" }));
  expect(screen.getByText("Add person")).not.toBeNull();
});

// ---- The view as the shell mounts it ----

test("mountTeam takes the snapshot, the refusals of a field and the notices from the host", () => {
  const posted: ToHost[] = [];
  let node: ReactNode = null;
  const view = mountTeam((next) => void (node = next), { post: (message) => void posted.push(message), navigate: () => {}, openLink: () => {} });
  const shown = render(<>{node}</>);
  act(() => view.update(snapshotWith({ handoffs: [handoff()] })));
  shown.rerender(<>{node}</>);
  expect(screen.getByRole("button", { name: "Guest checkout" })).not.toBeNull();
  act(() => view.notice("Trama could not publish again: nothing waits."));
  shown.rerender(<>{node}</>);
  expect(screen.getByRole("alert").textContent).toContain("Trama could not publish again: nothing waits.");
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  shown.rerender(<>{node}</>);
  expect(screen.queryByRole("alert")).toBeNull();
  // A refused field shows in the preview and goes when the same field is sent again.
  fireEvent.click(screen.getByRole("button", { name: "Guest checkout" }));
  act(() => view.receiveFieldRejected("hhhhhhh1", "iiiiiii1", "estimate", "Enter 0.5 days or more, in steps of 0.5."));
  shown.rerender(<>{node}</>);
  expect(screen.getByRole("alert").textContent).toBe("Enter 0.5 days or more, in steps of 0.5.");
  const input = screen.getByLabelText("Estimate (days)") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "2" } });
  fireEvent.blur(input);
  shown.rerender(<>{node}</>);
  expect(screen.queryByRole("alert")).toBeNull();
  expect(posted.at(-1)).toEqual({ type: "setIssueField", handoff: "hhhhhhh1", issue: "iiiiiii1", key: "estimate", value: 2 });
});
