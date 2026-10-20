import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import type { CardNumbers } from "../src/core/card-names";
import type { AnnouncementView, DriftView, HistoryTaskView, HistoryView, ProposalView, Snapshot, TaskView } from "../src/core/snapshot";
import { EMPTY_SPECS } from "../src/core/specs";
import type { ToHost } from "../extension/src/protocol";
import { BoardPage, type BoardPageProps } from "../extension/src/webview/board";
import { CardView, GhostCard } from "../extension/src/webview/board/cards";
import { HistoryEntryView } from "../extension/src/webview/board/history";
import { type BoardEnv, BoardEnvContext } from "../extension/src/webview/board/parts";
import { announcedCard, NO_MODELS, type ProposalCard, type TaskCard, type WaitingCard } from "../extension/src/webview/board/logic";
import { TooltipProvider } from "../extension/src/webview/ui/tooltip";

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

afterEach(cleanup);

const numbers: CardNumbers = { proposal: { live: "P2" }, task: { liveTask: "T3" }, drift: { liveDrift: "D4" } };

interface Calls {
  posted: ToHost[];
  navigated: unknown[][];
  shown: string[];
  toggled: string[];
  opened: string[];
  chosen: string[];
}

function env(over: Partial<BoardEnv> = {}): { env: BoardEnv; calls: Calls } {
  const calls: Calls = { posted: [], navigated: [], shown: [], toggled: [], opened: [], chosen: [] };
  return {
    calls,
    env: {
      context: { post: (message) => calls.posted.push(message), navigate: (...args: unknown[]) => calls.navigated.push(args), openLink: () => {} } as BoardEnv["context"],
      numbers,
      runReason: null,
      isExpanded: () => false,
      toggleExpanded: (key) => calls.toggled.push(key),
      showCard: (key) => calls.shown.push(key),
      chooseModel: (id) => calls.chosen.push(id),
      openProposal: (id) => calls.opened.push(id),
      ...over,
    },
  };
}

/** A card or a ghost in the environment the Board gives it. */
function draw(node: ReactNode, over: Partial<BoardEnv> = {}) {
  const { env: value, calls } = env(over);
  render(
    <TooltipProvider>
      <BoardEnvContext.Provider value={value}>{node}</BoardEnvContext.Provider>
    </TooltipProvider>,
  );
  return calls;
}

const proposal: ProposalCard = {
  kind: "proposal", key: "proposal:live", id: "live", name: { text: "P2", isNumber: true }, heading: "Proposal P2", title: "A proposal",
  badges: [{ label: "requires old", tooltip: "Requires Proposal old", tone: "info", card: { kind: "proposal", id: "old" } }],
  resolution: false, changes: { files: [], more: 0 }, blocker: "Resolve the requirement first", views: { diagram: true, requirements: false }, resolves: [],
  creates: null, rejectBlocker: null, choosable: false, model: null,
  body: "",
};
const task: TaskCard = {
  kind: "task", key: "task:liveTask", id: "liveTask", name: { text: "T3", isNumber: true }, title: "A task", technical: false,
  refs: [], drift: "liveDrift", driftName: "D4", proposal: null, proposalTag: null, proposalName: null, agent: false, blocks: [{ label: "blocked D4", tooltip: "Blocked by Drift D4", target: { kind: "diagram", drift: "liveDrift" } }],
  blockedBy: [], body: "", file: "task.md", column: "todo", autopilotFailed: null, finishing: null, views: { diagram: false, requirements: false },
};
const resolved = (over: Partial<ProposalCard["resolves"][number]> = {}): ProposalCard["resolves"][number] => ({
  drift: "liveDrift", name: { text: "D4", isNumber: true }, title: "Code refunds late", critical: false, previous: null, decision: "Closed, nothing changes", autopilotFailed: null, blocked: [], notBlocking: [], ...over,
});

describe("Board card rendering", () => {
  test("a Proposal names its requirement by number or identity and keeps its blocked Approve with the reason", () => {
    const calls = draw(<CardView card={proposal} />);
    expect(screen.getByRole("img", { name: "Short number (temporary) P2" }).textContent).toBe("P2");
    expect(screen.getByRole("img", { name: "Permanent ID old" }).textContent).toBe("old");
    const approve = screen.getByRole("button", { name: "Approve Proposal P2" }) as HTMLButtonElement;
    expect([approve.textContent, approve.disabled, approve.getAttribute("aria-description")]).toEqual(["Approve", true, "Resolve the requirement first"]);
    fireEvent.click(approve);
    expect(calls.posted).toEqual([]);
  });

  test("an approvable Proposal sends its decisions and its links, and a click outside the buttons opens its body", () => {
    const calls = draw(<CardView card={{ ...proposal, blocker: null, views: { diagram: true, requirements: true } }} />);
    fireEvent.click(screen.getByRole("button", { name: "Approve Proposal P2" }));
    fireEvent.click(screen.getByRole("button", { name: "Reject Proposal P2" }));
    fireEvent.click(screen.getByRole("button", { name: "Show what P2 changes on the diagram" }));
    fireEvent.click(screen.getByRole("button", { name: "Show what P2 changes in Requirements" }));
    expect(calls.posted).toEqual([{ type: "approveProposal", id: "live" }, { type: "rejectProposal", id: "live" }]);
    expect(calls.navigated).toEqual([["diagram", { focus: { kind: "proposal", id: "live" } }], ["requirements", { focus: { kind: "proposal", id: "live" } }]]);
    expect(calls.opened).toEqual([]);
    fireEvent.click(screen.getByRole("article"));
    fireEvent.click(screen.getByRole("button", { name: "A proposal" }));
    expect(calls.opened).toEqual(["live", "live"]);
  });

  test("a Task blocked by a Drift links to it, says where it comes from, and a closed Task is named by identity", () => {
    const calls = draw(<CardView card={task} />);
    // The Drift is named by its number in the origin line and in the blocked badge.
    expect(screen.getAllByRole("img", { name: "Short number (temporary) D4" }).length).toBe(2);
    expect(document.body.textContent).toContain("from Drift D4");
    const blocker = screen.getByRole("button", { name: "Blocked by Drift D4 (Short number (temporary) D4)" });
    expect(blocker.textContent).toBe("blocked D4");
    fireEvent.click(blocker);
    expect(calls.navigated).toEqual([["diagram", { drift: "liveDrift" }]]);
    cleanup();

    draw(<CardView card={{ ...task, id: "closedTask", key: "task:closedTask", name: { text: "closedTask", isNumber: false }, drift: "closedDrift", blocks: [] }} />);
    expect(screen.getByRole("img", { name: "Permanent ID closedTask" })).not.toBeNull();
    expect(screen.getByRole("img", { name: "Permanent ID closedDrift" })).not.toBeNull();
  });

  test("a waiting badge goes to the card of the fix Task", () => {
    const calls = draw(<CardView card={{ ...task, drift: null, blocks: [{ label: "waiting T9", tooltip: "Waiting for Task T9", target: { kind: "card", key: "task:fix" } }] }} />);
    fireEvent.click(screen.getByRole("button", { name: /Waiting for Task T9/ }));
    expect(calls.shown).toEqual(["task:fix"]);
  });

  test("a resolution card is yellow, named as a resolution, and lists its Drifts with their badges", () => {
    draw(
      <CardView
        card={{
          ...proposal, heading: "Resolution Proposal P2", resolution: true, blocker: null,
          resolves: [
            resolved({ critical: true }),
            resolved({ drift: "again", name: { text: "D5", isNumber: true }, title: "Again", previous: { id: "0001", title: "Earlier" } }),
            resolved({ drift: "failed", name: { text: "D6", isNumber: true }, title: "Refunds", autopilotFailed: "Not authorized any more" }),
            resolved({ drift: "free", name: { text: "D7", isNumber: true }, title: "Free", notBlocking: [{ name: { text: "T2", isNumber: true }, reason: "Only the wording." }] }),
          ],
        }}
      />,
    );
    const card = screen.getByRole("article", { name: "Resolution Proposal P2: A proposal" });
    expect(card.getAttribute("data-kind")).toBe("resolution");
    const list = within(card).getByRole("list", { name: "Drifts resolved by A proposal" });
    expect(within(list).getAllByRole("listitem", { hidden: false }).length).toBeGreaterThanOrEqual(4);
    expect(within(list).getByLabelText("Critical Drift: urgent developer decision").textContent).toBe("Critical");
    expect(within(list).getByLabelText("Recurring: follows Drift 0001 – Earlier").textContent).toBe("recurring");
    expect(within(list).getByRole("img", { name: "Autopilot failed: Not authorized any more" }).textContent).toBe("autopilot failed");
    expect(within(list).getByRole("img", { name: "Not blocked by this Drift: Only the wording." }).textContent).toBe("T2");
    expect(within(card).getByRole("button", { name: "Approve Resolution Proposal P2" })).not.toBeNull();
  });

  test("a resolution row goes to its Drift on the diagram and lists the Tasks the Drift blocks, indented", () => {
    const blocked: TaskCard = { ...task, key: "task:blockedTask", id: "blockedTask", name: { text: "T8", isNumber: true }, title: "Blocked work", blocks: [], blockedBy: [{ kind: "drift", drift: "liveDrift", title: "x" }, { kind: "drift", drift: "other", title: "y" }] };
    const calls = draw(<CardView card={{ ...proposal, resolution: true, heading: "Resolution Proposal P2", resolves: [resolved({ blocked: [blocked] })] }} />);
    fireEvent.click(screen.getByRole("button", { name: /Code refunds late/ }));
    expect(calls.navigated).toEqual([["diagram", { drift: "liveDrift" }]]);
    const row = document.querySelector('[data-key="task:blockedTask"]') as HTMLElement;
    expect(row.textContent).toContain("Blocked work");
    expect(within(row).getByRole("img", { name: "To do" })).not.toBeNull();
    // `other` is a Drift of this Task that the row does not sit under; D4 is the containing one and is left out.
    expect(within(row).getByRole("img", { name: /^Also blocked by / })).not.toBeNull();
    expect(within(row).queryByRole("button")).toBeNull();
  });

  test("a Task's Proposal tag names the Proposal by tooltip and accessible name; a gone Proposal is named by number", () => {
    draw(<CardView card={{ ...task, blocks: [], proposal: "live", proposalTag: { proposal: "live", text: "Returns", title: "Returns after shipping" } }} />);
    expect(screen.getByRole("img", { name: "From Proposal live: Returns after shipping" }).textContent).toBe("Returns");
    cleanup();
    draw(<CardView card={{ ...task, blocks: [], proposal: "gone", proposalName: { text: "P9", isNumber: true } }} />);
    expect(screen.getByRole("img", { name: "From Proposal gone" }).textContent).toBe("Proposal P9");
  });

  test("a Drift card shows its two sides and Resolve and Dismiss ask the host", () => {
    const drift: DriftView = { id: "liveDrift", created: null, title: "Code refunds late", body: "", critical: false, previous: null, refs: ["order/Shipped"], proposal: null, sides: { happens: "It refunds late.", should: "It refunds at once.", where: "" }, options: [], option: null, note: null, requirementsOnly: false, proposalBlock: null, proposalTitle: null, proposalChanges: null, closedUnchanged: null, notBlocking: [] };
    const calls = draw(
      <CardView
        card={{ kind: "drift", key: "drift:liveDrift", id: "liveDrift", name: { text: "D4", isNumber: true }, heading: "Drift D4", title: "Code refunds late", refs: ["order/Shipped"], proposal: null, drift, autopilotFailed: null, dismissBlocker: null, resolving: true, resolveNote: "Autopilot is off.", resolveBlocker: null, blocked: [], notBlocking: [] }}
      />,
    );
    expect(screen.getByText("What happens")).not.toBeNull();
    expect(screen.getByText("It refunds at once.")).not.toBeNull();
    expect(screen.getByRole("img", { name: "An agent is resolving this Drift" }).textContent).toBe("Resolving");
    fireEvent.click(screen.getByRole("button", { name: "order/Shipped" }));
    expect(calls.navigated).toEqual([["diagram", { focus: { kind: "ref", ref: "order/Shipped" } }]]);
    fireEvent.click(screen.getByRole("button", { name: "Resolve Drift D4" }));
    fireEvent.click(screen.getByRole("button", { name: "Dismiss Drift" }));
    expect(calls.posted).toEqual([{ type: "launch", action: { kind: "resolve-drifts", drift: "liveDrift" } }, { type: "dismissDrift", id: "liveDrift" }]);
  });

  test("a Drift's chips go to Requirements, Specs or the diagram with the tooltip that says so, each with the focus of its reference", () => {
    const drift = { id: "d", sides: null, body: "b", requirementsOnly: false, critical: false, previous: null } as unknown as DriftView;
    const refs = ["requirements/ui#focus", "specs#frameworks", "order/Paid"];
    const calls = draw(<CardView card={{ kind: "drift", key: "drift:d", id: "d", name: { text: "D1", isNumber: true }, heading: "Drift D1", title: "T", refs, proposal: null, drift, autopilotFailed: null, dismissBlocker: null, resolving: false, resolveNote: "", resolveBlocker: null, blocked: [], notBlocking: [] }} />);
    expect(refs.map((ref) => screen.getByRole("button", { name: ref }).getAttribute("aria-description"))).toEqual(["Show requirements/ui#focus in Requirements", "Show specs#frameworks in Specs", "Show order/Paid on the diagram"]);
    for (const ref of refs) fireEvent.click(screen.getByRole("button", { name: ref }));
    expect(calls.navigated).toEqual([
      ["requirements", { focus: { kind: "ref", ref: "requirements/ui#focus" } }],
      ["specs", { focus: { kind: "ref", ref: "specs#frameworks" } }],
      ["diagram", { focus: { kind: "ref", ref: "order/Paid" } }],
    ]);
  });

  test("a Task in Active has the View buttons before Run and Open, each only when its tab has a step, and they open the focus of the Task", () => {
    const calls = draw(<CardView card={{ ...task, blocks: [], views: { diagram: true, requirements: true } }} />);
    const names = screen.getAllByRole("button").map((b) => b.getAttribute("aria-label") ?? b.textContent);
    expect(names).toEqual(["Show what T3 touches on the diagram", "Show what T3 touches in Requirements", "Run task T3", "Open file of task T3"]);
    fireEvent.click(screen.getByRole("button", { name: "Show what T3 touches on the diagram" }));
    fireEvent.click(screen.getByRole("button", { name: "Show what T3 touches in Requirements" }));
    expect(calls.navigated).toEqual([["diagram", { focus: { kind: "task", id: "liveTask" } }], ["requirements", { focus: { kind: "task", id: "liveTask" } }]]);
    cleanup();
    draw(<CardView card={{ ...task, blocks: [], views: { diagram: false, requirements: true } }} />);
    expect(screen.queryByRole("button", { name: "Show what T3 touches on the diagram" })).toBeNull();
    expect(screen.getByRole("button", { name: "Show what T3 touches in Requirements" })).not.toBeNull();
  });

  test("a Drift's Dismiss that cannot be used is disabled with its reason as accessible description", () => {
    const drift = { id: "d", sides: null, body: "b", requirementsOnly: false, critical: false, previous: null } as unknown as DriftView;
    draw(<CardView card={{ kind: "drift", key: "drift:d", id: "d", name: { text: "D1", isNumber: true }, heading: "Drift D1", title: "T", refs: [], proposal: null, drift, autopilotFailed: null, dismissBlocker: "An agent is resolving Drifts", resolving: false, resolveNote: "", resolveBlocker: "Drifts are being resolved", blocked: [], notBlocking: [] }} />);
    const dismiss = screen.getByRole("button", { name: "Dismiss Drift" }) as HTMLButtonElement;
    expect([dismiss.disabled, dismiss.getAttribute("aria-description")]).toEqual([true, "An agent is resolving Drifts"]);
    const resolve = screen.getByRole("button", { name: "Resolve Drift D1" }) as HTMLButtonElement;
    expect([resolve.disabled, resolve.getAttribute("aria-description")]).toEqual([true, "Drifts are being resolved"]);
  });
});

describe("Run buttons say every reason that holds", () => {
  test("a Task's Run button is disabled with the resolution reason and the run reason, in its accessible description", () => {
    const reason = "Drifts are being resolved. A run is in progress";
    draw(<CardView card={{ ...task, column: "todo", drift: null, blocks: [], blockedBy: [] }} />, { runReason: reason });
    const run = screen.getByRole("button", { name: "Run task T3" }) as HTMLButtonElement;
    expect([run.disabled, run.getAttribute("aria-description")]).toEqual([true, reason]);
  });

  test("a Task whose agent is still finishing its turn has a Run that is disabled with that reason first", () => {
    const runOf = (finishing: string | null, runReason: string | null) => {
      cleanup();
      const calls = draw(<CardView card={{ ...task, column: "todo", blocks: [], blockedBy: [], finishing }} />, { runReason });
      return { run: screen.getByRole("button", { name: "Run task T3" }) as HTMLButtonElement, calls };
    };
    const waiting = runOf("The agent is still finishing", "A run is in progress").run;
    expect([waiting.disabled, waiting.getAttribute("aria-description")]).toEqual([true, "The agent is still finishing. A run is in progress"]);
    const free = runOf(null, null);
    expect(free.run.disabled).toBe(false);
    fireEvent.click(free.run);
    expect(free.calls.posted).toEqual([{ type: "launch", action: { kind: "implement", task: "liveTask" } }]);
  });
});

describe("Task details", () => {
  test("the details of a Task are closed until Show details, and the choice is kept by the page", () => {
    const withBody = { ...task, drift: null, blocks: [], body: "The **whole** body." };
    const calls = draw(<CardView card={withBody} />);
    const toggle = screen.getByRole("button", { name: "Show details of task T3" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(document.getElementById("board-details-liveTask")?.hidden).toBe(true);
    fireEvent.click(toggle);
    expect(calls.toggled).toEqual(["task:liveTask:details"]);
    cleanup();
    draw(<CardView card={withBody} />, { isExpanded: () => true });
    expect(screen.getByRole("button", { name: "Hide details of task T3" }).getAttribute("aria-expanded")).toBe("true");
    expect(document.getElementById("board-details-liveTask")?.hidden).toBe(false);
  });
});

describe("A Task the agent has taken", () => {
  test("its dot is static and says Agent working, its card wears the border, and it has no Run button", () => {
    draw(<CardView card={{ ...task, column: "doing", agent: true, drift: null, blocks: [], blockedBy: [] }} />);
    expect(screen.getByRole("img", { name: "Agent working" })).not.toBeNull();
    expect(screen.getByRole("article").className).toContain("board-working");
    expect(screen.queryByRole("button", { name: "Run task T3" })).toBeNull();
  });
});

describe("Tasks waiting in the Board", () => {
  test("a waiting card lists the Tasks waiting for its fix Task, each as a row of its own, with no Run button", () => {
    const waiter: TaskCard = { ...task, key: "task:waiter", id: "waiter", name: { text: "T9", isNumber: true }, blockedBy: [{ kind: "fix", task: "liveTask", title: "Fix refunds", drift: "liveDrift" }] };
    const waiting: WaitingCard = { kind: "waiting", key: "waiting:liveTask", task, waiting: [waiter] };
    const calls = draw(<CardView card={waiting} />);
    const card = screen.getByRole("article", { name: "Waiting for T3 A task" });
    expect(card.getAttribute("data-kind")).toBe("waiting");
    expect([...card.querySelectorAll("[data-key]")].map((n) => n.getAttribute("data-key"))).toEqual(["task:waiter"]);
    expect(within(card).queryByRole("button", { name: /^Run/ })).toBeNull();
    fireEvent.click(within(card).getByRole("button", { name: "Go to the card of this Task in Active" }));
    expect(calls.shown).toEqual(["task:liveTask"]);
  });
});

describe("Announced ghost rendering", () => {
  test("a check in History shows the Updating History row and its accessible name", () => {
    draw(<GhostCard card={announcedCard({ id: "c00001", kind: "check", title: "Final check after all Tasks", phase: "history" }, true)} />);
    const ghost = screen.getByRole("img", { name: "Agent checking the code: Final check after all Tasks, Updating History" });
    expect(ghost.textContent).toContain("Updating History");
    expect(within(ghost as HTMLElement).queryByRole("button")).toBeNull();
  });
});

describe("History entry details", () => {
  const task = (over: Partial<HistoryTaskView>): HistoryTaskView => ({ id: "task0000", exists: true, title: "A task", column: "done", unchanged: null, finished: null, refs: [], proposalTag: null, created: null, ...over });
  const now = new Date("2026-10-17T12:00:00Z");

  test("the «i» of an entry lists its Tasks by creation, and a Task that is gone says so; Esc closes the dialog", () => {
    const entry: HistoryView = {
      id: "hist0001", title: "Returns refunded", summary: "Refunds now **arrive** on time.", body: "", created: "2026-10-01T00:00:00.000Z", updated: "2026-10-16T08:30:00.000Z", file: "history/hist0001-returns.md",
      tasks: [
        task({ id: "late0003", title: "Third", created: "2026-10-03T00:00:00.000Z" }),
        task({ id: "gone0009", exists: false, title: null, column: null }),
        task({ id: "early001", title: "First", created: "2026-10-01T00:00:00.000Z" }),
      ],
    };
    draw(<HistoryEntryView entry={entry} now={now} />);
    expect(document.querySelector("article")?.textContent).toContain("Refunds now arrive on time.");
    fireEvent.click(screen.getByRole("button", { name: "Show the Tasks of Returns refunded" }));
    const dialog = screen.getByRole("dialog");
    const rows = within(dialog).getAllByRole("listitem");
    expect(rows.length).toBe(3);
    expect(rows[0]?.textContent).toContain("First");
    expect(rows[1]?.textContent).toContain("Third");
    expect(rows[2]?.textContent).toContain("no longer exists");
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("a link to the Diagram from the details closes the dialog and goes there", () => {
    const entry: HistoryView = { id: "hist0003", title: "Refunds", summary: "", body: "Long text.", created: "2026-10-01T00:00:00.000Z", updated: "2026-10-16T08:30:00.000Z", file: "history/hist0003.md", tasks: [task({ refs: ["order/Paid"] })] };
    const calls = draw(<HistoryEntryView entry={entry} now={now} />);
    fireEvent.click(screen.getByRole("button", { name: "Show the Tasks of Refunds" }));
    expect(within(screen.getByRole("dialog")).getByText("Long text.")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "order/Paid" }));
    expect(calls.navigated).toEqual([["diagram", { focus: { kind: "ref", ref: "order/Paid" } }]]);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

const proposalView = (over: Partial<ProposalView> = {}): ProposalView => ({
  id: "live", created: "2026-10-01T10:00:00.000Z", title: "A proposal", body: "Testo **lungo** della Proposal.", kind: "change", automatic: false, nonBlocking: false, resolves: [], requires: [], base: null, stale: [], unbased: [], errors: [], unfixable: [], creates: 1,
  tasks: [{ id: "t1", title: "Do it", refs: [], technical: true, body: "" }], removals: [], changes: [], machines: [], actors: [], areas: [], specs: EMPTY_SPECS, specsChange: { entries: [], notesBefore: null }, scope: [], ...over,
});
const taskView = (over: Partial<TaskView> = {}): TaskView => ({ id: "liveTask", created: "2026-10-01T10:00:00.000Z", title: "A task", body: "", column: "todo", technical: false, refs: [], drift: null, proposal: null, proposalTag: null, agent: false, finished: null, unchanged: null, blockedBy: [], file: "tasks/liveTask.md", ...over });
const driftView = (over: Partial<DriftView> = {}): DriftView => ({ id: "liveDrift", created: "2026-10-01T10:00:00.000Z", title: "Code refunds late", body: "", critical: false, previous: null, refs: [], proposal: null, sides: { happens: "A", should: "B", where: "" }, options: [], option: null, note: null, requirementsOnly: false, proposalBlock: null, proposalTitle: null, proposalChanges: null, closedUnchanged: null, notBlocking: [], ...over });
const snapshot = (over: Partial<Snapshot> = {}): Snapshot => ({ system: { name: "s", description: "" }, actors: [], features: [], machines: [], diagnostics: [], areas: [], proposals: [], resolutionDrifts: [], drifts: [], finishingDrifts: [], finishingProposals: [], finishingTasks: [], tasks: [], tasksSinceScan: 0, announcements: [], numbers, specs: EMPTY_SPECS, specsPresent: false, history: [], historyFaults: [], ...over });

function page(snap: Snapshot | null, over: Partial<BoardPageProps> = {}) {
  const posted: ToHost[] = [];
  const props: BoardPageProps = {
    snapshot: snap, asking: false, resolve: { blocker: null, runReason: null, autopilot: { mode: "disabled", phase: "manual", reason: null, failures: [] }, drifts: {}, resolving: [] },
    advisorScanner: false, models: NO_MODELS, modelList: { models: [], error: null }, notices: [], closeNotice: () => {},
    context: { post: (message) => posted.push(message), navigate: () => {}, openLink: () => {} }, ...over,
  };
  const utils = render(<BoardPage {...props} />);
  return { posted, props, ...utils };
}

describe("The Board page", () => {
  test("the four columns come in order with their empty texts, and each of the first three ends with its one action", () => {
    page(snapshot());
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Backlog", "Active", "Blocked", "History"]);
    expect(screen.getByText("No proposals")).not.toBeNull();
    expect(screen.getByText("Nothing active")).not.toBeNull();
    expect(screen.getByText("Nothing blocked")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Add Work Item" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Run all the Tasks in To do" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Resolve all the open Drifts" })).not.toBeNull();
    expect(screen.getByRole("toolbar", { name: "Board actions" }).querySelectorAll("button").length).toBe(1);
  });

  test("Add Work Item, Run all, Resolve all and Scan System ask the host", () => {
    const { posted } = page(snapshot({ tasks: [taskView()], drifts: [driftView()] }));
    fireEvent.click(screen.getByRole("button", { name: "Add Work Item" }));
    fireEvent.click(screen.getByRole("button", { name: "Run all the Tasks in To do" }));
    fireEvent.click(screen.getByRole("button", { name: "Resolve all the open Drifts" }));
    fireEvent.click(screen.getByRole("button", { name: "Scan System" }));
    expect(posted).toEqual([{ type: "writeDesignRequest" }, { type: "launch", action: { kind: "implement-all" } }, { type: "launch", action: { kind: "resolve-drifts" } }, { type: "launch", action: { kind: "scan" } }]);
  });

  test("Run all is disabled with its reason as accessible description when no Task is in To do", () => {
    page(snapshot());
    const run = screen.getByRole("button", { name: "Run all the Tasks in To do" }) as HTMLButtonElement;
    expect([run.disabled, run.getAttribute("aria-description")]).toEqual([true, "No Task is in To do"]);
  });

  test("a Run in progress disables Run all with the reason of the host", () => {
    page(snapshot({ tasks: [taskView()] }), { resolve: { blocker: null, runReason: "A run is in progress", autopilot: { mode: "disabled", phase: "manual", reason: null, failures: [] }, drifts: {}, resolving: [] } });
    const run = screen.getByRole("button", { name: "Run all the Tasks in To do" }) as HTMLButtonElement;
    expect([run.disabled, run.getAttribute("aria-description")]).toEqual([true, "A run is in progress"]);
  });

  test("a Task the agent has taken and a Drift blocks stays in Active with a blocked badge; one waiting for a fix Task has a waiting badge", () => {
    const blockedBy = [{ kind: "drift" as const, drift: "liveDrift", title: "Code refunds late" }];
    page(snapshot({
      drifts: [driftView()],
      tasks: [taskView({ column: "doing", agent: true, blockedBy }), taskView({ id: "fixTask", title: "Fix", created: "2026-10-02T10:00:00.000Z", drift: "liveDrift" }), taskView({ id: "waiter", title: "Waits", created: "2026-10-03T10:00:00.000Z", column: "doing", agent: true, blockedBy: [{ kind: "fix", task: "fixTask", title: "Fix", drift: "liveDrift" }] })],
    }));
    const active = document.querySelector('[data-column="active"]') as HTMLElement;
    expect(within(active).getByRole("button", { name: "Blocked by Drift D4: Code refunds late. Show it on the diagram. (Short number (temporary) D4)" })).not.toBeNull();
    expect(within(active).getAllByRole("button").some((b) => (b.textContent ?? "").startsWith("waiting "))).toBe(true);
    expect(within(active).getAllByRole("img", { name: "Agent working" }).length).toBe(2);
  });

  test("the column counts are the cards of each column, never the ghosts, and a ghost stands in Active", () => {
    const announcement: AnnouncementView = { id: "a1", kind: "proposal", title: "Returns", phase: "writing" } as AnnouncementView;
    page(snapshot({ proposals: [proposalView()], tasks: [taskView()], announcements: [announcement] }));
    const counts = ["backlog", "active", "blocked"].map((id) => document.querySelector(`[data-column="${id}"] h2 + [data-slot="badge"]`)?.textContent);
    expect(counts).toEqual(["1", "1", "0"]);
    expect(within(document.querySelector('[data-column="active"]') as HTMLElement).getByRole("img", { name: /Proposal the agent is creating, writing: Returns/ })).not.toBeNull();
  });

  test("the Scan System button carries the number of finished Tasks, and is disabled with the Advisor Scanner", () => {
    page(snapshot({ tasksSinceScan: 2 }));
    expect(screen.getByRole("button", { name: "Scan System · 2. 2 Tasks finished since the last scan of the System" }).textContent).toBe("Scan System · 2");
    cleanup();
    page(snapshot({ tasksSinceScan: 2 }), { advisorScanner: true });
    expect((screen.getByRole("button", { name: /^Scan System\./ }) as HTMLButtonElement).disabled).toBe(true);
  });

  test("the notices of cards the agent never delivered close one by one", () => {
    const closed: number[] = [];
    page(snapshot(), { notices: [{ id: 1, text: "The agent finished without delivering Proposal Returns." }], closeNotice: (id) => closed.push(id) });
    expect(screen.getByRole("status").textContent).toContain("The agent finished without delivering Proposal Returns.");
    fireEvent.click(screen.getByRole("button", { name: "Close the notice: The agent finished without delivering Proposal Returns." }));
    expect(closed).toEqual([1]);
  });

  test("History is collapsed first; the chevron opens it, with its period menu and its count, and closes it again", () => {
    const entry: HistoryView = { id: "h1", title: "Returns refunded", summary: "Done.", body: "", created: new Date().toISOString(), updated: new Date().toISOString(), file: "history/h1.md", tasks: [] };
    page(snapshot({ history: [entry] }));
    const expand = screen.getByRole("button", { name: "Expand History column" });
    expect(expand.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("combobox", { name: "History period" })).toBeNull();
    expect(screen.queryByText("Returns refunded")).toBeNull();
    fireEvent.click(expand);
    expect(screen.getByRole("combobox", { name: "History period" }).textContent).toBe("Last 7 days");
    expect(screen.getByText("Returns refunded")).not.toBeNull();
    expect(screen.getByText("Today · 1")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Collapse History column" }));
    expect(screen.queryByText("Returns refunded")).toBeNull();
  });

  test("an empty period says Nothing done in this period", () => {
    page(snapshot());
    fireEvent.click(screen.getByRole("button", { name: "Expand History column" }));
    expect(screen.getByText("Nothing done in this period")).not.toBeNull();
  });
});

describe("Backlog Proposal body window", () => {
  test("a click on the card opens the body under its number and title; Esc closes it and the Board stays", () => {
    page(snapshot({ proposals: [proposalView()] }));
    fireEvent.click(screen.getByRole("article", { name: "Proposal P2: A proposal" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "P2 A proposal" })).not.toBeNull();
    expect(dialog.textContent).toContain("Testo lungo della Proposal.");
    expect(within(dialog).queryByRole("button", { name: /Approve|Reject/ })).toBeNull();
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("article", { name: "Proposal P2: A proposal" })).not.toBeNull();
  });

  test("Close shuts it, and a Proposal with no body says it has no description", () => {
    page(snapshot({ proposals: [proposalView({ body: "  " })] }));
    fireEvent.click(screen.getByRole("button", { name: "A proposal" }));
    expect(screen.getByRole("dialog").textContent).toContain("This Proposal has no description.");
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("the window closes by itself when its Proposal leaves Backlog", () => {
    const { props, rerender } = page(snapshot({ proposals: [proposalView()] }));
    fireEvent.click(screen.getByRole("button", { name: "A proposal" }));
    expect(screen.getByRole("dialog")).not.toBeNull();
    rerender(<BoardPage {...props} snapshot={snapshot()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("Model window of a Proposal", () => {
  const withModels = { agent: "omp" as const, proposals: { live: { name: "anthropic/claude-opus-5-5", agent: "omp" as const, applies: true } } };

  test("the card shows the chosen model; the gear opens the window, which asks for the model names and shows the model in the field", () => {
    const { posted } = page(snapshot({ proposals: [proposalView()] }), { models: withModels });
    expect(screen.getByRole("img", { name: "Model for this Proposal's work: anthropic/claude-opus-5-5" })).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Choose the model for P2" }));
    expect(posted).toEqual([{ type: "modelSuggestionsWanted" }]);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Model for P2 A proposal" })).not.toBeNull();
    expect((within(dialog).getByRole("combobox", { name: "Model" }) as HTMLInputElement).value).toBe("anthropic/claude-opus-5-5");
  });

  test("a confirmed name saves at once for that Proposal, an emptied field goes back to the Settings roles, and the window stays open", () => {
    const { posted } = page(snapshot({ proposals: [proposalView()] }), { models: withModels, modelList: { models: [{ value: "openai/gpt-5" }], error: null } });
    fireEvent.click(screen.getByRole("button", { name: "Choose the model for P2" }));
    posted.length = 0;
    const field = screen.getByRole("combobox", { name: "Model" }) as HTMLInputElement;
    fireEvent.change(field, { target: { value: "my/model" } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(posted).toEqual([{ type: "setProposalModel", proposal: "live", model: "my/model" }]);
    fireEvent.change(field, { target: { value: "" } });
    fireEvent.blur(field);
    expect(posted.at(-1)).toEqual({ type: "setProposalModel", proposal: "live", model: "" });
    expect(screen.getByRole("dialog")).not.toBeNull();
  });

  test("Esc closes the window, and the gear is there with no Task-less Proposal", () => {
    page(snapshot({ proposals: [proposalView({ id: "bare", tasks: [] })] }), { models: { agent: "omp", proposals: {} } });
    expect(screen.queryByRole("button", { name: /Choose the model/ })).toBeNull();
    cleanup();
    page(snapshot({ proposals: [proposalView()] }), { models: withModels });
    fireEvent.click(screen.getByRole("button", { name: "Choose the model for P2" }));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("a model chosen for another agent is shown struck, and the window says the Settings roles apply", () => {
    page(snapshot({ proposals: [proposalView()] }), { models: { agent: "claude", proposals: { live: { name: "gpt-5", agent: "omp", applies: false } } } });
    expect(screen.getByRole("img", { name: "Chosen for omp: the Settings roles apply" }).className).toContain("line-through");
    fireEvent.click(screen.getByRole("button", { name: "Choose the model for P2" }));
    expect(screen.getByRole("dialog").textContent).toContain("Chosen for omp: the Settings roles apply. Confirm a model to use it with Claude Code.");
  });
});
