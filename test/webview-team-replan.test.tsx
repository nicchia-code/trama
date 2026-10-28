import { afterEach, beforeAll, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Snapshot } from "../src/core/snapshot";
import type { ReplanView, ToHost } from "../extension/src/protocol";
import { mountTeam, TeamPage } from "../extension/src/webview/team";
import type { HandoffViewData } from "../extension/src/webview/team/logic";
import { REPLAN_DIALOG_TITLE, REPLAN_TOOLTIP, replanDialogText } from "../extension/src/webview/team/replan";
import { shopSnapshot } from "./diagram-fixture";

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

afterEach(cleanup);

const handoff = (id: string, title: string): HandoffViewData => ({ id, created: null, title, label: "checkout", issues: [], files: 0, machines: 0, warnings: 0, block: null });
const snapshotWith = (handoffs: HandoffViewData[]): Snapshot => ({ ...shopSnapshot(), handoffs, issues: [], numbers: { proposal: { hhhhhhh1: "P4", hhhhhhh2: "P5" }, task: {}, drift: {} } });
const available: ReplanView = { block: null, running: false, open: 2, stale: 0 };

function page(snapshot: Snapshot | null, replan: ReplanView | null) {
  const posted: ToHost[] = [];
  const utils = render(<TeamPage manager team={null} rejection={null} github={null} snapshot={snapshot} replan={replan} post={(message) => void posted.push(message)} />);
  return { posted, ...utils };
}
const two = () => snapshotWith([handoff("hhhhhhh1", "Guest checkout"), handoff("hhhhhhh2", "Saved carts")]);
const button = () => screen.getByRole("button", { name: "Replan" }) as HTMLButtonElement;

test("the confirmation says what the agent does for how many open handoffs, and names the stale ones that only count as load", () => {
  const plan = "The agent plans sprint, assignee, reviewer and estimate again for the issues of";
  const after = "keeping your changes. Each handoff it changes goes back to Draft until the agent hands it over again.";
  expect(replanDialogText(3, 0)).toBe(`${plan} 3 open handoffs, ${after}`);
  expect(replanDialogText(1, 0)).toBe(`${plan} 1 open handoff, ${after}`);
  expect(replanDialogText(3, 2)).toBe(`${plan} 3 open handoffs, ${after} 2 stale handoffs only count as load and do not change.`);
  expect(replanDialogText(2, 1)).toBe(`${plan} 2 open handoffs, ${after} 1 stale handoff only counts as load and does not change.`);
  expect(REPLAN_DIALOG_TITLE).toBe("Replan open handoffs?");
  expect(REPLAN_TOOLTIP).toBe("Plan sprints and people again for all open handoffs");
});

test("Replan sits between the hint and New handoff, and is enabled when the host sees no reason", () => {
  page(two(), available);
  expect(button().disabled).toBe(false);
  const bar = button().parentElement?.parentElement as HTMLElement;
  const order = [...bar.querySelectorAll("span.text-xs, button")].map((node) => node.textContent);
  expect(order).toEqual(["Approving publishes the issues on GitHub", "Replan", "New handoff"]);
});

test("the click only opens the confirmation: Cancel and Esc send nothing, the confirmation sends replanHandoffs once", () => {
  const { posted } = page(two(), { ...available, stale: 1 });
  fireEvent.click(button());
  expect(posted).toEqual([]);
  expect(screen.getByRole("dialog").textContent).toContain("Replan open handoffs?");
  expect(screen.getByRole("dialog").textContent).toContain("again for the issues of 2 open handoffs, keeping your changes.");
  expect(screen.getByRole("dialog").textContent).toContain("1 stale handoff only counts as load and does not change.");
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(button());
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(posted).toEqual([]);
  fireEvent.click(button());
  const confirm = screen.getAllByRole("button", { name: "Replan" }).find((candidate) => candidate.closest("[role=dialog]") !== null) as HTMLElement;
  fireEvent.click(confirm);
  expect(posted).toEqual([{ type: "replanHandoffs" }]);
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("a reason of the host disables it and is its description; nothing is sent", () => {
  const { posted } = page(two(), { ...available, block: "An agent is writing a handoff" });
  expect(button().disabled).toBe(true);
  expect(button().getAttribute("aria-description")).toBe("An agent is writing a handoff");
  fireEvent.click(button());
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(posted).toEqual([]);
});

test("while a Replan runs the loader turns, with motion-reduce, and the button says it is already running", () => {
  page(two(), { block: "Replan is already running", running: true, open: 2, stale: 0 });
  expect(button().disabled).toBe(true);
  expect(button().getAttribute("aria-description")).toBe("Replan is already running");
  const icon = button().querySelector("svg") as SVGElement;
  expect(icon.getAttribute("class")).toContain("lucide-loader-circle");
  expect(button().getAttribute("class")).toContain("[&_svg]:animate-spin");
  expect(button().getAttribute("class")).toContain("motion-reduce:[&_svg]:animate-none");
});

test("an available Replan shows the calendar icon and the plain tooltip text as its description", () => {
  page(two(), available);
  expect(button().querySelector("svg")?.getAttribute("class")).toContain("lucide-calendar-sync");
  expect(button().getAttribute("aria-description")).toBe("Plan sprints and people again for all open handoffs");
});

test("the empty Decisions and a view without the state of Replan show no Replan", () => {
  page(snapshotWith([]), available);
  expect(screen.queryByRole("button", { name: "Replan" })).toBeNull();
  cleanup();
  page(two(), null);
  expect(screen.queryByRole("button", { name: "Replan" })).toBeNull();
});

test("mountTeam takes the state of Replan with the snapshot and forgets it with the next one that has none", () => {
  const posted: ToHost[] = [];
  let node: ReactNode = null;
  const view = mountTeam((next) => void (node = next), { post: (message) => void posted.push(message), navigate: () => {}, openLink: () => {} });
  view.receiveManager(true);
  const shown = render(<>{node}</>);
  act(() => view.update(two(), available));
  shown.rerender(<>{node}</>);
  expect(button().disabled).toBe(false);
  act(() => view.update(two()));
  shown.rerender(<>{node}</>);
  expect(screen.queryByRole("button", { name: "Replan" })).toBeNull();
});
