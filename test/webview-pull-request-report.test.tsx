import { afterEach, beforeAll, describe, expect, jest, test } from "bun:test";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { join } from "node:path";
import type { ReportRow } from "../src/core/pr-check";
import { buildSnapshot } from "../src/core/snapshot";
import { projectAt } from "../src/core/store";
import type { PullRequestReportView, PullRequestView } from "../extension/src/protocol";
import {
  branchesLine,
  checkedAtText,
  checkedLine,
  groupReportRows,
  NARROW_REPORT,
  outdatedNote,
  referenceExists,
  REPORT_OUTDATED,
  reportCell,
  reportTitle,
  shortCommit,
} from "../extension/src/webview/team/logic";
import { TooltipProvider } from "../extension/src/webview/ui/tooltip";
import { PullRequestReport, type ReportEnv } from "../extension/src/webview/team/pull-request-report";

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

const row = (section: ReportRow["section"], ref: string | null, finding: string, source = "Trama", where: string | null = null): ReportRow => ({ section, ref, finding, source, where });

const ROWS: ReportRow[] = [
  row("model", "order/Paid/user.CANCEL", "~ Transition Paid | user.CANCEL → Cancelled: prose changed"),
  row("model", "requirements/ui#order/Paid", "~ Requirements for order/Paid"),
  row("model-problems", "payment", "Changed without an approved Proposal"),
  row("code", "order/Paid", "Refund is partial", "Scan", "src/refund.ts:3"),
  row("code", "gone/Away", "Missing in the code: Something", "Scan"),
  row("open-work", null, "Proposal open: Cart badge"),
];

const REPORT: PullRequestReportView = { checkedAt: "2026-10-28T10:30:00.000Z", variant: "collaborative", head: `1a2b3c4${"d".repeat(33)}`, mergeBase: "c".repeat(40), outdated: false, rows: ROWS };

const ITEM: PullRequestView = {
  number: 7,
  title: "Refund on cancel",
  author: "ada",
  baseRefName: "main",
  headRefName: "feature/refund",
  headRefOid: REPORT.head,
  url: "https://github.com/acme/web/pull/7",
  report: REPORT,
};

const snapshot = buildSnapshot(projectAt(join(import.meta.dir, "../examples/shop")));

describe("the pure functions of the report", () => {
  test("rows are grouped by section in the order Model, Model problems, Code, Open work, an empty section is not there", () => {
    const groups = groupReportRows([...ROWS].reverse());
    expect(groups.map((group) => [group.name, group.rows.length])).toEqual([
      ["Model", 2],
      ["Model problems", 1],
      ["Code", 2],
      ["Open work", 1],
    ]);
    expect(groupReportRows(ROWS.filter((r) => r.section !== "model-problems")).map((group) => group.section)).toEqual(["model", "code", "open-work"]);
    expect(groupReportRows([])).toEqual([]);
    // Within a section the rows keep the order they came in.
    expect(groups[2]?.rows.map((r) => r.ref)).toEqual(["gone/Away", "order/Paid"]);
  });

  test("outdated has its line, up to date has none", () => {
    expect(outdatedNote({ outdated: true })).toBe("The pull request has new commits since this check.");
    expect(outdatedNote({ outdated: false })).toBeNull();
    expect(REPORT_OUTDATED).toBe("The pull request has new commits since this check.");
  });

  test("the title, the two lines under it and the empty cell", () => {
    expect(reportTitle(7, "Refund on cancel")).toBe("#7 · Refund on cancel");
    expect(shortCommit(REPORT.head)).toBe("1a2b3c4");
    expect(checkedAtText(REPORT.checkedAt, "en-GB", "UTC")).toMatch(/^28 Oct 2026(,| at) 10:30$/);
    expect(checkedLine(REPORT, "en-GB", "UTC")).toMatch(/^Checked 28 Oct 2026(,| at) 10:30 on 1a2b3c4 · Collaborative$/);
    expect(checkedLine({ ...REPORT, variant: "solo" }, "en-GB", "UTC")).toMatch(/ on 1a2b3c4 · Solo$/);
    expect(branchesLine("main", "feature/refund")).toBe("main ← feature/refund");
    expect(reportCell(null)).toBe("–");
    expect(reportCell("  ")).toBe("–");
    expect(reportCell("src/a.ts")).toBe("src/a.ts");
    expect(NARROW_REPORT).toBe(640);
  });

  test("a reference exists when the open folder has the Model element, the section of the Requirements or the Specs field", () => {
    expect(referenceExists(snapshot, "order")).toBe(true);
    expect(referenceExists(snapshot, "checkout")).toBe(true);
    expect(referenceExists(snapshot, "user")).toBe(true);
    expect(referenceExists(snapshot, "order/Paid")).toBe(true);
    expect(referenceExists(snapshot, "order/Paid/user.CANCEL")).toBe(true);
    expect(referenceExists(snapshot, "user.CANCEL")).toBe(true);
    expect(referenceExists(snapshot, "order/Gone")).toBe(false);
    expect(referenceExists(snapshot, "payment.EXPIRED")).toBe(false);
    expect(referenceExists(snapshot, "requirements/ui")).toBe(true);
    expect(referenceExists(snapshot, "requirements/ui#order/Paid")).toBe(true);
    expect(referenceExists(snapshot, "requirements/ui#General")).toBe(true);
    expect(referenceExists(snapshot, "requirements/ui#order/Gone")).toBe(false);
    expect(referenceExists(snapshot, "requirements/nothing")).toBe(false);
    expect(referenceExists(snapshot, "specs")).toBe(snapshot.specsPresent);
    expect(referenceExists(snapshot, "specs#nothing")).toBe(false);
    expect(referenceExists(null, "order")).toBe(false);
  });
});

function setup(item: PullRequestView = ITEM, report: PullRequestReportView = REPORT) {
  const navigate = jest.fn();
  const openLink = jest.fn();
  const onClose = jest.fn();
  const env: ReportEnv = { snapshot, navigate, openLink };
  render(
    <TooltipProvider>
      <PullRequestReport item={item} report={report} env={env} onClose={onClose} />
    </TooltipProvider>,
  );
  return { navigate, openLink, onClose };
}

describe("the window of a report", () => {
  test("has the title, the two lines under it and the table with its columns and groups", () => {
    setup();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("#7 · Refund on cancel")).toBeTruthy();
    expect(within(dialog).getByText(/^Checked .* on 1a2b3c4 · Collaborative$/)).toBeTruthy();
    expect(within(dialog).getByText("main ← feature/refund")).toBeTruthy();
    expect(within(dialog).queryByText(REPORT_OUTDATED)).toBeNull();
    const headers = within(dialog).getAllByRole("columnheader").map((header) => header.textContent);
    expect(headers).toEqual(["Section", "Reference", "Finding", "Source", "Where in the code"]);
    const groups = within(dialog).getAllByRole("rowheader").map((header) => header.textContent);
    expect(groups).toEqual(["Model 2", "Model problems 1", "Code 2", "Open work 1"]);
    expect(within(dialog).getByText("Refund is partial")).toBeTruthy();
    expect(within(dialog).getByText("src/refund.ts:3")).toBeTruthy();
  });

  test("a reference that exists in the open folder is a chip that opens its focus; one that does not is plain monospace text; none is a dash", () => {
    const { navigate } = setup();
    const chip = screen.getByRole("button", { name: "order/Paid/user.CANCEL" });
    fireEvent.click(chip);
    expect(navigate).toHaveBeenCalledWith("diagram", { focus: { kind: "ref", ref: "order/Paid/user.CANCEL" } });
    fireEvent.click(screen.getByRole("button", { name: "requirements/ui#order/Paid" }));
    expect(navigate).toHaveBeenLastCalledWith("requirements", { focus: { kind: "ref", ref: "requirements/ui#order/Paid" } });
    // `payment` has no row in this Model's check: it exists as a Machine, so it is a chip; `gone/Away` does not exist.
    expect(screen.queryByRole("button", { name: "gone/Away" })).toBeNull();
    const plain = screen.getByText("gone/Away");
    expect(plain.tagName).toBe("CODE");
    const openWork = screen.getByText("Proposal open: Cart badge").closest("tr") as HTMLElement;
    expect(within(openWork).getAllByText("–")).toHaveLength(2);
  });

  test("an outdated report has the line in the warning colour", () => {
    setup(ITEM, { ...REPORT, outdated: true });
    const note = screen.getByText(REPORT_OUTDATED);
    expect(note.closest("p")?.className).toContain("amber");
    expect(note.closest("p")?.getAttribute("role")).toBe("status");
  });

  test("a report with no rows shows No differences found, not the table", () => {
    setup(ITEM, { ...REPORT, rows: [] });
    expect(screen.getByText("No differences found.")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  test("Open on GitHub opens the address of the pull request and Close closes the window", () => {
    const { openLink, onClose } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Open on GitHub" }));
    expect(openLink).toHaveBeenCalledWith("https://github.com/acme/web/pull/7");
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close", hidden: false }));
    expect(onClose).toHaveBeenCalled();
  });

});
