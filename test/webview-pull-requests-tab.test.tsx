import { afterEach, beforeAll, describe, expect, jest, test } from "bun:test";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { PullRequestView, ToHost } from "../extension/src/protocol";
import {
  checkDisabledReason,
  NARROW_PULL_REQUESTS,
  orderPullRequests,
  type PullRequestsMessage,
  pullRequestActions,
  pullRequestLine,
  pullRequestsSummary,
  pullRequestStatus,
} from "../extension/src/webview/team/logic";
import { TeamPage } from "../extension/src/webview/team";
import { TooltipProvider } from "../extension/src/webview/ui/tooltip";
import { PullRequestsTab } from "../extension/src/webview/team/pull-requests-tab";

// Radix uses browser APIs that happy-dom does not have.
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

const NOW = Date.parse("2026-10-28T12:00:00.000Z");

const pr = (number: number, extra: Partial<PullRequestView> = {}): PullRequestView => ({
  number,
  title: `Title ${number}`,
  author: "ada",
  baseRefName: "main",
  headRefName: `feature/${number}`,
  headRefOid: "a".repeat(40),
  url: `https://github.com/acme/web/pull/${number}`,
  report: null,
  ...extra,
});

const report = (outdated = false, checkedAt = "2026-10-28T11:00:00.000Z"): NonNullable<PullRequestView["report"]> => ({ checkedAt, variant: "solo", head: "b".repeat(40), mergeBase: "c".repeat(40), outdated, rows: [] });

const message = (items: PullRequestView[], extra: Partial<PullRequestsMessage> = {}): PullRequestsMessage => ({ type: "pullRequests", readAt: new Date().toISOString(), error: null, items, running: null, blocked: null, ...extra });

describe("the pure functions of the tab", () => {
  test("the summary counts the pull requests and the highest number comes first", () => {
    expect(pullRequestsSummary(3)).toBe("3 open pull requests ready for review");
    expect(pullRequestsSummary(1)).toBe("1 open pull request ready for review");
    expect(orderPullRequests([pr(3), pr(12), pr(7)]).map((item) => item.number)).toEqual([12, 7, 3]);
    expect(pullRequestLine(pr(3))).toBe("ada · main ← feature/3");
    expect(NARROW_PULL_REQUESTS).toBe(640);
  });

  test("a row is Not checked, Checking… or Checked with its time, and Outdated only for a report that is and a check that is not running", () => {
    expect(pullRequestStatus(pr(1), null, NOW)).toEqual({ look: "not-checked", label: "Not checked", outdated: false });
    expect(pullRequestStatus(pr(1), 1, NOW)).toEqual({ look: "checking", label: "Checking…", outdated: false });
    expect(pullRequestStatus(pr(1), 2, NOW)).toEqual({ look: "not-checked", label: "Not checked", outdated: false });
    expect(pullRequestStatus(pr(1, { report: report() }), null, NOW)).toEqual({ look: "checked", label: "Checked 1 h ago", outdated: false });
    expect(pullRequestStatus(pr(1, { report: report(true) }), null, NOW)).toEqual({ look: "checked", label: "Checked 1 h ago", outdated: true });
    expect(pullRequestStatus(pr(1, { report: report(true) }), 1, NOW)).toEqual({ look: "checking", label: "Checking…", outdated: false });
  });

  test("the reason Check is disabled: a PR Check of the window, a Run of the window, then a failed read", () => {
    expect(checkDisabledReason({ blocked: null, error: null })).toBeNull();
    expect(checkDisabledReason({ blocked: "running", error: null })).toBe("A PR Check is running");
    expect(checkDisabledReason({ blocked: "run", error: null })).toBe("A run is in progress");
    expect(checkDisabledReason({ blocked: null, error: "boom" })).toBe("Can't read GitHub");
    expect(checkDisabledReason({ blocked: "run", error: "boom" })).toBe("A run is in progress");
  });

  test("a row has Check, or Check again with a report, Stop in its place while its own check runs, and Report only with a report", () => {
    const none = { running: null, blocked: null, error: null } as const;
    expect(pullRequestActions(pr(1), none)).toEqual({ check: { label: "Check", reason: null }, stop: false, report: false });
    expect(pullRequestActions(pr(1, { report: report() }), none)).toEqual({ check: { label: "Check again", reason: null }, stop: false, report: true });
    expect(pullRequestActions(pr(1, { report: report() }), { running: 1, blocked: "running", error: null })).toEqual({ check: null, stop: true, report: true });
    expect(pullRequestActions(pr(2), { running: 1, blocked: "running", error: null })).toEqual({ check: { label: "Check", reason: "A PR Check is running" }, stop: false, report: false });
  });
});

const posting = () => {
  const posted: ToHost[] = [];
  return { posted, post: (m: ToHost) => void posted.push(m) };
};

const renderTab = (pullRequests: PullRequestsMessage | null, post: (m: ToHost) => void = () => {}) =>
  render(
    <TooltipProvider>
      <PullRequestsTab pullRequests={pullRequests} post={post} />
    </TooltipProvider>,
  );

describe("the tab", () => {
  test("without pull requests, or before the host sent them, it says so in secondary text", () => {
    renderTab(message([]));
    expect(screen.getByText("No open pull requests ready for review.").className).toContain("text-muted-foreground");
    cleanup();
    renderTab(null);
    expect(screen.getByText("No open pull requests ready for review.")).not.toBeNull();
  });

  test("it has a header and one row per pull request, the highest number first, with number, title and branches", () => {
    renderTab(message([pr(3), pr(12), pr(7)]));
    expect(screen.getByText("3 open pull requests ready for review").className).toContain("text-muted-foreground");
    const rows = within(screen.getByRole("list", { name: "Pull requests" })).getAllByRole("listitem");
    expect(rows.map((row) => row.textContent?.slice(0, 3))).toEqual(["#12", "#7T", "#3T"]);
    const first = rows[0] as HTMLElement;
    expect(within(first).getByText("#12").className).toContain("font-mono");
    expect(within(first).getByText("Title 12").className).toContain("font-medium");
    expect(within(first).getByText("ada · main ← feature/12")).not.toBeNull();
  });

  test("the header says 1 open pull request for one", () => {
    renderTab(message([pr(1)]));
    expect(screen.getByText("1 open pull request ready for review")).not.toBeNull();
  });

  test("the status pills say their words: Not checked dashed, Checking… turning and stopping with motion-reduce, Checked with its time and Outdated", () => {
    renderTab(message([pr(4), pr(3, { report: report(true) }), pr(2, { report: report() }), pr(1)], { running: 4, blocked: "running" }));
    const checking = screen.getByText("Checking…");
    expect(checking.querySelector("svg")?.getAttribute("class")).toContain("animate-spin");
    expect(checking.querySelector("svg")?.getAttribute("class")).toContain("motion-reduce:animate-none");
    expect(screen.getByText("Not checked").className).toContain("border-dashed");
    expect(screen.getAllByText(/^Checked /).length).toBe(2);
    const outdated = screen.getAllByText("Outdated");
    expect(outdated.length).toBe(1);
    expect(outdated[0]?.className).toContain("amber");
  });

  test("Check posts checkPullRequest with the number, Check again on a pull request with a report", () => {
    const { posted, post } = posting();
    renderTab(message([pr(2, { report: report() }), pr(1)]), post);
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    fireEvent.click(screen.getByRole("button", { name: "Check again" }));
    expect(posted).toEqual([
      { type: "checkPullRequest", number: 1 },
      { type: "checkPullRequest", number: 2 },
    ]);
  });

  test("while a check runs its row has Stop in place of Check, which posts stopPullRequestCheck, and the other rows have Check disabled", () => {
    const { posted, post } = posting();
    renderTab(message([pr(2), pr(1)], { running: 2, blocked: "running" }), post);
    const rows = within(screen.getByRole("list", { name: "Pull requests" })).getAllByRole("listitem");
    expect(within(rows[0] as HTMLElement).queryByRole("button", { name: "Check" })).toBeNull();
    fireEvent.click(within(rows[0] as HTMLElement).getByRole("button", { name: "Stop" }));
    expect(posted).toEqual([{ type: "stopPullRequestCheck", number: 2 }]);
    const other = within(rows[1] as HTMLElement).getByRole("button", { name: "Check" }) as HTMLButtonElement;
    expect(other.disabled).toBe(true);
    expect(within(rows[1] as HTMLElement).queryByRole("button", { name: "Stop" })).toBeNull();
  });

  test("Check is disabled while a Run is in progress or after a failed read, and a click posts nothing", () => {
    const { posted, post } = posting();
    renderTab(message([pr(1)], { blocked: "run" }), post);
    const run = screen.getByRole("button", { name: "Check" }) as HTMLButtonElement;
    expect(run.disabled).toBe(true);
    fireEvent.click(run);
    cleanup();
    renderTab(message([pr(1)], { error: "gh failed" }), post);
    expect((screen.getByRole("button", { name: "Check" }) as HTMLButtonElement).disabled).toBe(true);
    expect(posted).toEqual([]);
  });

  test("the reasons are the tooltips of the disabled Check", async () => {
    renderTab(message([pr(1)], { blocked: "run" }));
    const button = screen.getByRole("button", { name: "Check" });
    fireEvent.pointerMove(button.parentElement as HTMLElement);
    expect((await screen.findByRole("tooltip")).textContent).toBe("A run is in progress");
  });

  test("Report shows only with a report and opens its window, Open on GitHub posts the link", () => {
    const { posted, post } = posting();
    renderTab(message([pr(2, { report: report() }), pr(1)]), post);
    expect(screen.getAllByRole("button", { name: "Report" }).length).toBe(1);
    expect(screen.getAllByRole("button", { name: "Open on GitHub" }).length).toBe(2);
    fireEvent.click(screen.getAllByRole("button", { name: "Open on GitHub" })[1] as HTMLElement);
    expect(posted).toEqual([{ type: "openLink", url: "https://github.com/acme/web/pull/1" }]);
    fireEvent.click(screen.getByRole("button", { name: "Report" }));
    expect(screen.getByRole("dialog")).not.toBeNull();
    expect(screen.getByText("#2 · Title 2")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("the window of a report goes when the pull request or its report is gone", () => {
    const view = (items: PullRequestView[]) => (
      <TooltipProvider>
        <PullRequestsTab pullRequests={message(items)} post={() => {}} />
      </TooltipProvider>
    );
    const { rerender } = render(view([pr(2, { report: report() })]));
    fireEvent.click(screen.getByRole("button", { name: "Report" }));
    expect(screen.getByRole("dialog")).not.toBeNull();
    rerender(view([pr(2)]));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("the view", () => {
  test("the tab takes the message of the host with Manager mode off", () => {
    render(<TeamPage manager={false} team={null} rejection={null} pullRequests={message([pr(5)])} post={() => {}} />);
    expect(screen.getByText("1 open pull request ready for review")).not.toBeNull();
    expect(screen.getByText("Title 5")).not.toBeNull();
  });
});
