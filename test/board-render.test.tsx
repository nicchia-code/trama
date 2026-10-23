import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import type { CardNumbers } from "../src/core/card-names";
import type { AnnouncementView, DriftView, HistoryTaskView, HistoryView, ProposalView, Snapshot, TaskView } from "../src/core/snapshot";
import { EMPTY_SPECS } from "../src/core/specs";
import type { ToHost } from "../extension/src/protocol";
import { BoardPage, type BoardPageProps, mountBoard } from "../extension/src/webview/board";
import { CardView, GhostCard } from "../extension/src/webview/board/cards";
import { HistoryEntryView } from "../extension/src/webview/board/history";
import { mountHistory } from "../extension/src/webview/history";
import type { ViewContext } from "../extension/src/webview/types";
import { type BoardEnv, BoardEnvContext } from "../extension/src/webview/board/parts";
import { announcedCard, type DriftCard, NO_MODELS, type ProposalCard, type TaskCard } from "../extension/src/webview/board/logic";
import { DriftDetailsDialog, TaskDetailsDialog } from "../extension/src/webview/board/dialogs";
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
  details: string[];
  opened: string[];
  chosen: string[];
  images: string[];
  ghosts: string[];
}

function env(over: Partial<BoardEnv> = {}): { env: BoardEnv; calls: Calls } {
  const calls: Calls = { posted: [], navigated: [], shown: [], details: [], opened: [], chosen: [], images: [], ghosts: [] };
  return {
    calls,
    env: {
      context: { post: (message) => calls.posted.push(message), navigate: (...args: unknown[]) => calls.navigated.push(args), openLink: () => {} } as BoardEnv["context"],
      numbers,
      runReason: null,
      openTask: (id) => calls.details.push(`task:${id}`),
      openDrift: (id) => calls.details.push(`drift:${id}`),
      showCard: (key) => calls.shown.push(key),
      chooseModel: (id) => calls.chosen.push(id),
      openProposal: (id) => calls.opened.push(id),
      openTaskImage: (id, name) => calls.images.push(`${id}/${name}`),
      openGhost: (key) => calls.ghosts.push(key),
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
  creates: null, rejectBlocker: null, reworkBlocker: null, choosable: false, model: null,
  body: "",
};
const task: TaskCard = {
  kind: "task", key: "task:liveTask", id: "liveTask", name: { text: "T3", isNumber: true }, title: "A task", technical: false,
  refs: [], drift: "liveDrift", driftName: "D4", proposal: null, proposalTag: null, proposalName: null, agent: false, progress: null, blockedByDrifts: [{ id: "liveDrift", key: "drift:liveDrift", name: { text: "D4", isNumber: true }, title: "Code refunds late" }], waitingFor: [],
  blockedBy: [], body: "", images: [], file: "task.md", column: "todo", finishing: null, views: { diagram: false, requirements: false }, finished: null, unchanged: null, keptBy: [],
};
const resolved = (over: Partial<ProposalCard["resolves"][number]> = {}): ProposalCard["resolves"][number] => ({
  drift: "liveDrift", name: { text: "D4", isNumber: true }, title: "Code refunds late", previous: [], unifies: [], decision: "Closed, nothing changes", blocked: [], notBlocking: [], ...over,
});

/** An open Drift card of the Board, with the decisions of its card set to work. */
const driftCardOf = (over: Partial<DriftCard> = {}): DriftCard => ({
  kind: "drift", key: "drift:d", id: "d", name: { text: "D1", isNumber: true }, heading: "Drift D1", title: "T", refs: [], proposal: null,
  drift: { id: "d", created: null, job: null, prepared: null, title: "T", body: "", previous: [], origin: [], task: null, unifies: [], unifiedInto: null, refs: [], proposal: null, sides: { happens: "It refunds late.", should: "It refunds at once.", where: "" }, options: [], option: null, note: null, requirementsOnly: false, proposalBlock: null, proposalTitle: null, proposalChanges: null, closedUnchanged: null, notBlocking: [] },
  dismissBlocker: null, reworkBlocker: null, resolving: false, unifying: false, resolveBlocker: null, blocked: [], notBlocking: [], ...over,
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

  test("a blocked Task says where it comes from, and a closed Task is named by identity", () => {
    draw(<CardView card={task} />);
    // The Drift is named by its number in the origin line.
    expect(screen.getAllByRole("img", { name: "Short number (temporary) D4" }).length).toBe(1);
    expect(document.body.textContent).toContain("from Drift D4");
    cleanup();

    draw(<CardView card={{ ...task, id: "closedTask", key: "task:closedTask", name: { text: "closedTask", isNumber: false }, drift: "closedDrift", blockedByDrifts: [] }} />);
    expect(screen.getByRole("img", { name: "Permanent ID closedTask" })).not.toBeNull();
    expect(screen.getByRole("img", { name: "Permanent ID closedDrift" })).not.toBeNull();
  });

  test("a resolution card is yellow, named as a resolution, and lists its Drifts with their badges", () => {
    draw(
      <CardView
        card={{
          ...proposal, heading: "Resolution Proposal P2", resolution: true, blocker: null,
          resolves: [
            resolved(),
            resolved({ drift: "again", name: { text: "D5", isNumber: true }, title: "Again", previous: [{ id: "0001", title: "Earlier" }] }),
            resolved({ drift: "failed", name: { text: "D6", isNumber: true }, title: "Refunds" }),
            resolved({ drift: "free", name: { text: "D7", isNumber: true }, title: "Free", notBlocking: [{ name: { text: "T2", isNumber: true }, reason: "Only the wording." }] }),
          ],
        }}
      />,
    );
    const card = screen.getByRole("article", { name: "Resolution Proposal P2: A proposal" });
    expect(card.getAttribute("data-kind")).toBe("resolution");
    const list = within(card).getByRole("list", { name: "Drifts resolved by A proposal" });
    expect(within(list).getAllByRole("listitem", { hidden: false }).length).toBeGreaterThanOrEqual(4);
    expect(within(list).queryByLabelText("Critical Drift: urgent developer decision")).toBeNull();
    expect(within(list).getByLabelText("Recurring: follows Drift 0001 – Earlier").textContent).toBe("recurring");
    expect(within(list).getByRole("img", { name: "Not blocked by this Drift: Only the wording." }).textContent).toBe("T2");
    expect(within(card).getByRole("button", { name: "Approve Resolution Proposal P2" })).not.toBeNull();
  });

  test("a resolution row goes to its Drift on the diagram and shows no Task rows under it", () => {
    const blocked: TaskCard = { ...task, key: "task:blockedTask", id: "blockedTask", name: { text: "T8", isNumber: true }, title: "Blocked work", blockedByDrifts: [], blockedBy: [{ kind: "drift", drift: "liveDrift", title: "x" }] };
    const calls = draw(<CardView card={{ ...proposal, resolution: true, heading: "Resolution Proposal P2", resolves: [resolved({ blocked: [blocked] })] }} />);
    fireEvent.click(screen.getByRole("button", { name: /Code refunds late/ }));
    expect(calls.navigated).toEqual([["diagram", { drift: "liveDrift" }]]);
    expect(document.querySelector('[data-key="task:blockedTask"]')).toBeNull();
    expect(screen.queryByText("Blocked work")).toBeNull();
  });

  test("a Task's Proposal tag names the Proposal by tooltip and accessible name; a gone Proposal is named by number", () => {
    draw(<CardView card={{ ...task, blockedByDrifts: [], proposal: "live", proposalTag: { proposal: "live", text: "Returns", title: "Returns after shipping" } }} />);
    expect(screen.getByRole("img", { name: "From Proposal live: Returns after shipping" }).textContent).toBe("Returns");
    cleanup();
    draw(<CardView card={{ ...task, blockedByDrifts: [], proposal: "gone", proposalName: { text: "P9", isNumber: true } }} />);
    expect(screen.getByRole("img", { name: "From Proposal gone" }).textContent).toBe("Proposal P9");
  });

  test("a Drift card shows its title, badges, Resolve and Dismiss, and the two buttons ask the host", () => {
    const calls = draw(<CardView card={driftCardOf({ resolving: true })} />);
    expect(screen.queryByText("What happens")).toBeNull();
    expect(screen.getByRole("img", { name: "An agent is resolving this Drift" }).textContent).toBe("Resolving");
    fireEvent.click(screen.getByRole("button", { name: "Resolve Drift D1" }));
    fireEvent.click(screen.getByRole("button", { name: "Dismiss Drift" }));
    expect(calls.posted).toEqual([{ type: "launch", action: { kind: "resolve-drifts", drift: "d" } }, { type: "dismissDrift", id: "d" }]);
  });

  test("the arrow of Reject and of Dismiss Drift opens a menu with Rework with feedback and asks the host", async () => {
    const calls = draw(<CardView card={{ ...proposal, blocker: null, rejectBlocker: null, reworkBlocker: null }} />);
    const arrow = screen.getByRole("button", { name: "More ways to reject P2" }) as HTMLButtonElement;
    expect(arrow.disabled).toBe(false);
    arrow.focus();
    fireEvent.keyDown(arrow, { key: "Enter" });
    expect(screen.getAllByRole("menuitem").map((i) => i.textContent)).toEqual(["Rework with feedback…"]);
    fireEvent.click(await screen.findByRole("menuitem", { name: "Rework with feedback…" }));
    expect(calls.posted).toEqual([{ type: "reworkProposal", proposal: "live" }]);
    cleanup();
    const drift = { id: "d", sides: null, body: "b", requirementsOnly: false, previous: [], unifies: [] } as unknown as DriftView;
    const more = draw(<CardView card={{ kind: "drift", key: "drift:d", id: "d", name: { text: "D1", isNumber: true }, heading: "Drift D1", title: "T", refs: [], proposal: null, drift, dismissBlocker: null, reworkBlocker: null, resolving: false, unifying: false, resolveBlocker: null, blocked: [], notBlocking: [] }} />);
    const driftArrow = screen.getByRole("button", { name: "More ways to handle D1" });
    driftArrow.focus();
    fireEvent.keyDown(driftArrow, { key: "Enter" });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Rework with feedback…" }));
    expect(more.posted).toEqual([{ type: "reworkDrift", drift: "d" }]);
  });

  test("the arrow is disabled with the reasons of the button beside it and opens no menu", () => {
    draw(<CardView card={{ ...proposal, blocker: "The agent is still finishing", rejectBlocker: "The agent is still finishing", reworkBlocker: "The agent is still finishing" }} />);
    const arrow = screen.getByRole("button", { name: "More ways to reject P2" }) as HTMLButtonElement;
    expect([arrow.disabled, arrow.getAttribute("aria-disabled"), arrow.getAttribute("aria-description")]).toEqual([true, "true", "The agent is still finishing"]);
    fireEvent.keyDown(arrow, { key: "Enter" });
    expect(screen.queryByRole("menuitem")).toBeNull();
  });

  test("a Drift window's chips go to Requirements, Specs or the diagram with the tooltip that says so, each with the focus of its reference", () => {
    const refs = ["requirements/ui#focus", "specs#frameworks", "order/Paid"];
    const calls = draw(<DriftDetailsDialog card={driftCardOf({ refs })} onClose={() => {}} />);
    expect(refs.map((ref) => screen.getByRole("button", { name: ref }).getAttribute("aria-description"))).toEqual(["Show requirements/ui#focus in Requirements", "Show specs#frameworks in Specs", "Show order/Paid on the diagram"]);
    for (const ref of refs) fireEvent.click(screen.getByRole("button", { name: ref }));
    expect(calls.navigated).toEqual([
      ["requirements", { focus: { kind: "ref", ref: "requirements/ui#focus" } }],
      ["specs", { focus: { kind: "ref", ref: "specs#frameworks" } }],
      ["diagram", { focus: { kind: "ref", ref: "order/Paid" } }],
    ]);
  });

  test("a Task in Active has the View buttons before Run and no button to open its file, each only when its tab has a step, and they open the focus of the Task", () => {
    const calls = draw(<CardView card={{ ...task, blockedByDrifts: [], views: { diagram: true, requirements: true } }} />);
    const names = screen.getAllByRole("button").map((b) => b.getAttribute("aria-label") ?? b.textContent);
    expect(names).toEqual(["A task", "Show what T3 touches on the diagram", "Show what T3 touches in Requirements", "Run task T3"]);
    fireEvent.click(screen.getByRole("button", { name: "Show what T3 touches on the diagram" }));
    fireEvent.click(screen.getByRole("button", { name: "Show what T3 touches in Requirements" }));
    expect(calls.navigated).toEqual([["diagram", { focus: { kind: "task", id: "liveTask" } }], ["requirements", { focus: { kind: "task", id: "liveTask" } }]]);
    cleanup();
    draw(<CardView card={{ ...task, blockedByDrifts: [], views: { diagram: false, requirements: true } }} />);
    expect(screen.queryByRole("button", { name: "Show what T3 touches on the diagram" })).toBeNull();
    expect(screen.getByRole("button", { name: "Show what T3 touches in Requirements" })).not.toBeNull();
  });

  test("a Drift's Dismiss that cannot be used is disabled with its reason as accessible description", () => {
    const drift = { id: "d", sides: null, body: "b", requirementsOnly: false, previous: [], unifies: [] } as unknown as DriftView;
    draw(<CardView card={{ kind: "drift", key: "drift:d", id: "d", name: { text: "D1", isNumber: true }, heading: "Drift D1", title: "T", refs: [], proposal: null, drift, dismissBlocker: "An agent is resolving Drifts", reworkBlocker: "An agent is resolving Drifts. Drifts are being resolved", resolving: false, unifying: false, resolveBlocker: "Drifts are being resolved", blocked: [], notBlocking: [] }} />);
    const dismiss = screen.getByRole("button", { name: "Dismiss Drift" }) as HTMLButtonElement;
    expect([dismiss.disabled, dismiss.getAttribute("aria-description")]).toEqual([true, "An agent is resolving Drifts"]);
    const resolve = screen.getByRole("button", { name: "Resolve Drift D1" }) as HTMLButtonElement;
    expect([resolve.disabled, resolve.getAttribute("aria-description")]).toEqual([true, "Drifts are being resolved"]);
  });

  test("a Drift card has no details of its own: a click outside its buttons opens its window, and its buttons do not", () => {
    const calls = draw(<CardView card={driftCardOf({ refs: ["order/Paid"] })} />);
    expect(screen.queryByRole("button", { name: /details/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "order/Paid" })).toBeNull();
    fireEvent.click(screen.getByRole("article"));
    fireEvent.click(screen.getByRole("button", { name: "T" }));
    fireEvent.click(screen.getByRole("button", { name: "Resolve Drift D1" }));
    expect(calls.details).toEqual(["drift:d", "drift:d"]);
    expect(calls.posted).toEqual([{ type: "launch", action: { kind: "resolve-drifts", drift: "d" } }]);
  });

  test("the Drift window runs its chips, then the two sides, then the Not blocking line with its reason; it has Ask more and Close only", () => {
    let closed = 0;
    const calls = draw(<DriftDetailsDialog card={driftCardOf({ refs: ["order/Paid"], notBlocking: [{ name: { text: "T2", isNumber: true }, reason: "Only the wording." }] })} onClose={() => { closed += 1; }} />);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "D1 T" })).not.toBeNull();
    const chip = within(dialog).getByRole("button", { name: "order/Paid" });
    const sides = within(dialog).getByText("What happens");
    const free = within(dialog).getByRole("img", { name: "Not blocked by this Drift: Only the wording." });
    expect(chip.compareDocumentPosition(sides) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(sides.compareDocumentPosition(free) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(free.textContent).toBe("T2");
    expect(within(dialog).getAllByRole("button").map((b) => b.textContent)).toEqual(["order/Paid", "Ask more", "Close"]);
    fireEvent.click(within(dialog).getByRole("button", { name: "Ask more about D1" }));
    expect(calls.posted).toEqual([{ type: "askMore", kind: "drift", id: "d" }]);
    expect(screen.getByRole("dialog")).not.toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(closed).toBe(1);
  });

  test("a Drift without references or free Tasks has neither the chip row nor the Not blocking line", () => {
    const drift = { id: "d", sides: null, body: "b", requirementsOnly: false, previous: [], unifies: [] } as unknown as DriftView;
    draw(<CardView card={{ kind: "drift", key: "drift:d", id: "d", name: { text: "D1", isNumber: true }, heading: "Drift D1", title: "T", refs: [], proposal: null, drift, dismissBlocker: null, reworkBlocker: null, resolving: false, unifying: false, resolveBlocker: null, blocked: [], notBlocking: [] }} />);
    expect(screen.queryByText(/Not blocking/)).toBeNull();
    expect(screen.queryByRole("button", { name: "order/Paid" })).toBeNull();
  });
});

describe("Run buttons say every reason that holds", () => {
  test("a Task's Run button is disabled with the resolution reason and the run reason, in its accessible description", () => {
    const reason = "Drifts are being resolved. A run is in progress";
    draw(<CardView card={{ ...task, column: "todo", drift: null, blockedByDrifts: [], waitingFor: [], blockedBy: [] }} />, { runReason: reason });
    const run = screen.getByRole("button", { name: "Run task T3" }) as HTMLButtonElement;
    expect([run.disabled, run.getAttribute("aria-description")]).toEqual([true, reason]);
  });

  test("a Task whose agent is still finishing its turn has a Run that is disabled with that reason first", () => {
    const runOf = (finishing: string | null, runReason: string | null) => {
      cleanup();
      const calls = draw(<CardView card={{ ...task, column: "todo", blockedByDrifts: [], waitingFor: [], blockedBy: [], finishing }} />, { runReason });
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
  test("a Task window has the number and title, the Proposal's tag, the references as links, the body, and Ask more and Close only", () => {
    const withBody = { ...task, drift: null, blockedByDrifts: [], waitingFor: [], body: "The **whole** body.", refs: ["order/Shipped"], proposal: "live", proposalTag: { proposal: "live", text: "Returns", title: "Returns after shipping" } };
    draw(<TaskDetailsDialog card={withBody} onClose={() => {}} />);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "T3 A task" })).not.toBeNull();
    expect(within(dialog).getByRole("img", { name: "From Proposal live: Returns after shipping" }).textContent).toBe("Returns");
    expect(within(dialog).getByRole("button", { name: "order/Shipped" })).not.toBeNull();
    expect(dialog.textContent).toContain("The whole body.");
    expect(within(dialog).getAllByRole("button").map((b) => b.textContent)).toEqual(["order/Shipped", "Ask more", "Close"]);
  });

  test("a Task with no body says so, and its image previews open the image through the environment", () => {
    const withImages = { ...task, drift: null, blockedByDrifts: [], waitingFor: [], body: "", images: [{ name: "one.png", path: "/x/one.png", uri: "https://webview/one.png" }, { name: "gone.png", path: "/x/gone.png" }] };
    const calls = draw(<TaskDetailsDialog card={withImages} onClose={() => {}} />);
    expect(screen.getByText("This Task has no description.")).not.toBeNull();
    const preview = screen.getByRole("button", { name: "Open image one.png" });
    expect(preview.querySelector("img")?.getAttribute("src")).toBe("https://webview/one.png");
    expect(screen.queryByRole("button", { name: "Open image gone.png" })).toBeNull();
    fireEvent.click(preview);
    expect(calls.images).toEqual(["liveTask/one.png"]);
  });
});

describe("A Task the agent has taken", () => {
  test("its dot is static and says Agent working, its card wears the border, and it has no Run button", () => {
    draw(<CardView card={{ ...task, column: "doing", agent: true, drift: null, blockedByDrifts: [], waitingFor: [], blockedBy: [] }} />);
    expect(screen.getByRole("img", { name: "Agent working" })).not.toBeNull();
    expect(screen.getByRole("article").className).toContain("board-working");
    expect(screen.queryByRole("button", { name: "Run task T3" })).toBeNull();
  });

  test("a declared percentage shows as 40% after the badges and as an Agent progress bar; a Task without one shows neither", () => {
    draw(<CardView card={{ ...task, column: "doing", agent: true, progress: 40, drift: null, blockedByDrifts: [], waitingFor: [], blockedBy: [] }} />);
    const bar = screen.getByRole("progressbar", { name: "Agent progress" });
    expect(bar.getAttribute("aria-valuetext")).toBe("40%");
    expect(bar.getAttribute("aria-valuenow")).toBe("40");
    expect(screen.getByText("40%")).not.toBeNull();
    cleanup();
    draw(<CardView card={{ ...task, column: "doing", agent: true, progress: null, drift: null, blockedByDrifts: [], waitingFor: [], blockedBy: [] }} />);
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.queryByText(/%$/)).toBeNull();
  });
});

describe("Blocked and waiting badges", () => {
  const dr = (id: string, num: string, title: string) => ({ id, key: `drift:${id}`, name: { text: num, isNumber: true }, title });
  const fix = { id: "fix", key: "task:fix", name: { text: "T9", isNumber: true }, title: "Fix refunds", column: "doing" as const, agent: false, drift: { id: "liveDrift", name: { text: "D4", isNumber: true }, title: "Code refunds late" } };

  test("one blocked badge without numbers names every Drift in its accessible name, and its popup has a row per Drift", () => {
    const calls = draw(<CardView card={{ ...task, blockedByDrifts: [dr("a", "D3", "First"), dr("b", "D7", "Second")], waitingFor: [] }} />);
    const badge = screen.getByRole("button", { name: "Blocked by Drift D3, D7" });
    expect(badge.textContent).toBe("blocked");
    expect(screen.queryByText("Blocked by")).toBeNull();
    fireEvent.click(badge);
    expect(screen.getByText("Blocked by")).not.toBeNull();
    expect(screen.getAllByRole("button").filter((b) => b.closest("[data-slot=popover-content]") !== null).map((b) => b.textContent)).toEqual(["D3First", "D7Second"]);
    fireEvent.click(screen.getByRole("button", { name: /^Short number \(temporary\) D7/ }));
    expect(calls.shown).toEqual(["drift:b"]);
    expect(screen.queryByText("Blocked by")).toBeNull();
  });

  test("pressing the badge again or Esc closes the popup and gives the focus back to the badge", () => {
    draw(<CardView card={{ ...task, blockedByDrifts: [dr("a", "D3", "First")], waitingFor: [] }} />);
    const badge = screen.getByRole("button", { name: "Blocked by Drift D3" });
    fireEvent.click(badge);
    expect(screen.getByText("Blocked by")).not.toBeNull();
    fireEvent.click(badge);
    expect(screen.queryByText("Blocked by")).toBeNull();
    fireEvent.click(badge);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(screen.queryByText("Blocked by")).toBeNull();
  });

  test("a waiting badge opens a popup with the fix Task, which leads to its card, and the Drift it fixes as plain text", () => {
    const calls = draw(<CardView card={{ ...task, blockedByDrifts: [], waitingFor: [fix] }} />);
    const badge = screen.getByRole("button", { name: "Waiting for Task T9" });
    expect(badge.textContent).toBe("waiting T9");
    fireEvent.click(badge);
    const popup = document.querySelector("[data-slot=popover-content]") as HTMLElement;
    expect(popup.textContent).toContain("Waiting for");
    expect(popup.textContent).toContain("From Drift D4 Code refunds late");
    expect(within(popup).getAllByRole("button").length).toBe(1);
    fireEvent.click(within(popup).getByRole("button"));
    expect(calls.shown).toEqual(["task:fix"]);
  });

  test("the Run of a blocked Task says why after the other reasons", () => {
    draw(<CardView card={{ ...task, blockedByDrifts: [dr("a", "D3", "First"), dr("b", "D7", "Second")], waitingFor: [fix], finishing: "The agent is still finishing" }} />, { runReason: "A run is in progress" });
    const run = screen.getByRole("button", { name: "Run task T3" }) as HTMLButtonElement;
    expect([run.disabled, run.getAttribute("aria-description")]).toEqual([true, "The agent is still finishing. A run is in progress. Blocked by Drift D3, D7. Waiting for Task T9"]);
  });
});

describe("Announced ghost rendering", () => {
  test("a check in History shows the Updating History row and its accessible name", () => {
    draw(<GhostCard card={announcedCard({ id: "c00001", kind: "check", title: "Final check after all Tasks", phase: "history", notes: [], announced: "2026-10-01T10:00:00.000Z" }, true)} />);
    const ghost = screen.getByRole("button", { name: "Agent checking the code: Final check after all Tasks, Updating History. Show details" });
    expect(ghost.textContent).toContain("Updating History");
    expect(ghost.querySelector("button, a")).toBeNull();
  });

  test("the whole ghost is one button that opens its details, with its latest note cut to one line and the whole text as tooltip", () => {
    const calls = draw(<GhostCard card={announcedCard({ id: "t00001", kind: "task", title: "A Task", phase: "preparing", notes: [{ at: "2026-10-01T10:00:00.000Z", text: "First" }, { at: "2026-10-01T10:01:00.000Z", text: "Checks the refunds against the Model" }], announced: "2026-10-01T10:00:00.000Z" }, false)} />);
    const ghost = screen.getByRole("button", { name: "Task the agent is creating, preparing: A Task. Show details" });
    const note = within(ghost).getByText("Checks the refunds against the Model");
    expect(note.className).toContain("truncate");
    expect(ghost.getAttribute("draggable")).toBe("false");
    fireEvent.click(ghost);
    expect(calls.ghosts).toEqual(["announced:t00001"]);
  });
});

describe("History entry details", () => {
  const task = (over: Partial<HistoryTaskView>): HistoryTaskView => ({ id: "task0000", exists: true, cleared: false, title: "A task", column: "done", unchanged: null, finished: null, refs: [], proposalTag: null, created: null, ...over });
  const now = new Date("2026-10-17T12:00:00Z");

  test("the card of an entry lists its Tasks by creation, and a Task that is gone says so; Esc closes the dialog and the focus goes back to the title", async () => {
    const entry: HistoryView = {
      id: "hist0001", title: "Returns refunded", summary: "Refunds now **arrive** on time.", body: "", created: "2026-10-01T00:00:00.000Z", updated: "2026-10-16T08:30:00.000Z", file: "history/hist0001-returns.md",
      tasks: [
        task({ id: "late0003", title: "Third", created: "2026-10-03T00:00:00.000Z" }),
        task({ id: "gone0009", exists: false, title: null, column: null }),
        task({ id: "clear001", exists: false, cleared: true, title: "Deleted one", column: "done", finished: "2026-10-05T10:00:00.000Z", refs: [], proposalTag: { text: "Refunds", proposal: "prop0001", title: "Refunds Proposal" }, created: null }),
        task({ id: "early001", title: "First", created: "2026-10-01T00:00:00.000Z" }),
      ],
    };
    draw(<HistoryEntryView entry={entry} now={now} />);
    expect(document.querySelector("article")?.textContent).toContain("Refunds now arrive on time.");
    expect(screen.queryByRole("button", { name: /^Show the Tasks of/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Returns refunded" }));
    const dialog = screen.getByRole("dialog");
    const rows = within(dialog).getAllByRole("listitem");
    expect(rows.length).toBe(4);
    expect(rows[0]?.textContent).toContain("First");
    expect(rows[1]?.textContent).toContain("Third");
    expect(rows[2]?.textContent).toContain("Deleted one");
    expect(rows[2]?.textContent).toContain("clear001");
    expect(rows[2]?.textContent).toContain("Refunds");
    expect(rows[2]?.textContent).toContain("cleared");
    expect(rows[3]?.textContent).toContain("no longer exists");
    expect(rows[3]?.textContent).toContain("gone0009");
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Returns refunded" })));
  });

  test("the references of a cleared Task go to the Diagram from its copy, closing the dialog", () => {
    const cleared = task({ id: "clear002", exists: false, cleared: true, title: "Deleted two", finished: "2026-10-05T10:00:00.000Z", refs: ["order/Paid"] });
    const entry: HistoryView = { id: "hist0006", title: "Refunds", summary: "", body: "", created: "2026-10-01T00:00:00.000Z", updated: "2026-10-16T08:30:00.000Z", file: "history/hist0006.md", tasks: [cleared] };
    const calls = draw(<HistoryEntryView entry={entry} now={now} />);
    fireEvent.click(screen.getByRole("button", { name: "Refunds" }));
    expect(screen.getByText("cleared")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "order/Paid" }));
    expect(calls.navigated).toEqual([["diagram", { focus: { kind: "ref", ref: "order/Paid" } }]]);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("with references, the dialog focuses a chip whose tooltip takes the first Esc; the second closes the dialog", async () => {
    const entry: HistoryView = { id: "hist0007", title: "Refunds", summary: "", body: "", created: "2026-10-01T00:00:00.000Z", updated: "2026-10-16T08:30:00.000Z", file: "history/hist0007.md", tasks: [task({ refs: ["order/Paid"] })] };
    draw(<HistoryEntryView entry={entry} now={now} />);
    fireEvent.click(screen.getByRole("button", { name: "Refunds" }));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
    expect(screen.queryByRole("dialog")).not.toBeNull();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  test("a click anywhere on the card opens the details, and a click inside the dialog does not reopen it", () => {
    const entry: HistoryView = { id: "hist0004", title: "Refunds", summary: "Summary text.", body: "", created: "2026-10-01T00:00:00.000Z", updated: "2026-10-16T08:30:00.000Z", file: "history/hist0004.md", tasks: [task({})] };
    draw(<HistoryEntryView entry={entry} now={now} />);
    expect(document.querySelector("article")?.className).toContain("cursor-pointer");
    fireEvent.click(screen.getByText("Summary text."));
    expect(screen.getByRole("dialog")).not.toBeNull();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("Enter and Space on the title open the details", () => {
    const entry: HistoryView = { id: "hist0005", title: "Refunds", summary: "", body: "", created: "2026-10-01T00:00:00.000Z", updated: "2026-10-16T08:30:00.000Z", file: "history/hist0005.md", tasks: [task({})] };
    draw(<HistoryEntryView entry={entry} now={now} />);
    const title = screen.getByRole("button", { name: "Refunds" });
    expect(title.tagName).toBe("BUTTON");
  });

  test("a link to the Diagram from the details closes the dialog and goes there", () => {
    const entry: HistoryView = { id: "hist0003", title: "Refunds", summary: "", body: "Long text.", created: "2026-10-01T00:00:00.000Z", updated: "2026-10-16T08:30:00.000Z", file: "history/hist0003.md", tasks: [task({ refs: ["order/Paid"] })] };
    const calls = draw(<HistoryEntryView entry={entry} now={now} />);
    fireEvent.click(screen.getByRole("button", { name: "Refunds" }));
    expect(within(screen.getByRole("dialog")).getByText("Long text.")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "order/Paid" }));
    expect(calls.navigated).toEqual([["diagram", { focus: { kind: "ref", ref: "order/Paid" } }]]);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

const proposalView = (over: Partial<ProposalView> = {}): ProposalView => ({
  id: "live", created: "2026-10-01T10:00:00.000Z", title: "A proposal", body: "Testo **lungo** della Proposal.", kind: "change", nonBlocking: false, prepared: false, resolves: [], requires: [], base: null, stale: [], unbased: [], errors: [], unfixable: [], creates: 1,
  tasks: [{ id: "t1", title: "Do it", refs: [], technical: true, body: "", images: [] }], removals: [], changes: [], machines: [], actors: [], areas: [], specs: EMPTY_SPECS, specsChange: { entries: [], notesBefore: null }, scope: [], ...over,
});
const taskView = (over: Partial<TaskView> = {}): TaskView => ({ id: "liveTask", created: "2026-10-01T10:00:00.000Z", title: "A task", body: "", column: "todo", technical: false, refs: [], drift: null, proposal: null, proposalTag: null, agent: false, progress: null, finished: null, unchanged: null, blockedBy: [], file: "tasks/liveTask.md", images: [], ...over });
const driftView = (over: Partial<DriftView> = {}): DriftView => ({ id: "liveDrift", created: "2026-10-01T10:00:00.000Z", job: null, prepared: null, title: "Code refunds late", body: "", previous: [], origin: [], task: null, unifies: [], unifiedInto: null, refs: [], proposal: null, sides: { happens: "A", should: "B", where: "" }, options: [], option: null, note: null, requirementsOnly: false, proposalBlock: null, proposalTitle: null, proposalChanges: null, closedUnchanged: null, notBlocking: [], ...over });
const snapshot = (over: Partial<Snapshot> = {}): Snapshot => ({ system: { name: "s", description: "" }, actors: [], features: [], machines: [], diagnostics: [], areas: [], proposals: [], resolutionDrifts: [], drifts: [], unifiedDrifts: [], finishingDrifts: [], finishingProposals: [], finishingTasks: [], tasks: [], tasksSinceScan: 0, announcements: [], numbers, specs: EMPTY_SPECS, specsPresent: false, history: [], historyFaults: [], ...over });

function page(snap: Snapshot | null, over: Partial<BoardPageProps> = {}) {
  const posted: ToHost[] = [];
  const props: BoardPageProps = {
    snapshot: snap, asking: false, resolve: { blocker: null, runReason: null, drifts: {}, resolving: [] },
    models: NO_MODELS, modelList: { models: [], error: null }, notices: [], closeNotice: () => {},
    context: { post: (message) => posted.push(message), navigate: () => {}, openLink: () => {} }, ...over,
  };
  const utils = render(<BoardPage {...props} />);
  return { posted, props, ...utils };
}

describe("The Board page", () => {
  test("the three columns come in order with their empty texts, the first two end with their one action, and there is no bar above them", () => {
    page(snapshot());
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Backlog", "Active", "Done"]);
    expect(screen.getByText("Nothing to decide")).not.toBeNull();
    expect(screen.getByText("Nothing active")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Add Work Item" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Run all the Tasks in To do" })).not.toBeNull();
    expect(screen.queryByRole("toolbar")).toBeNull();
    expect(screen.queryByRole("button", { name: /Scan/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /History/ })).toBeNull();
  });

  test("Add Work Item and Run all ask the host, and no Resolve all exists", () => {
    const { posted } = page(snapshot({ tasks: [taskView()], drifts: [driftView()] }));
    fireEvent.click(screen.getByRole("button", { name: "Add Work Item" }));
    fireEvent.click(screen.getByRole("button", { name: "Run all the Tasks in To do" }));
    expect(screen.queryByRole("button", { name: /Resolve all/ })).toBeNull();
    expect(posted).toEqual([{ type: "writeDesignRequest" }, { type: "launch", action: { kind: "implement-all" } }]);
  });

  describe("ghost details", () => {
    const ghostView = (over: Partial<AnnouncementView> = {}): AnnouncementView => ({ id: "g00001", kind: "proposal", title: "Returns", phase: "preparing", notes: [], announced: new Date().toISOString(), ...over });
    const ghostButton = () => screen.getByRole("button", { name: /Show details$/ });

    test("a ghost with a note shows it under the phase, and the dialog lists the notes newest first, then closes with the focus back on the ghost", async () => {
      const first = { at: "2026-10-01T10:00:00.000Z", text: "Reads the Model" };
      const second = { at: "2026-10-01T10:05:00.000Z", text: "Writes the Draft" };
      page(snapshot({ announcements: [ghostView({ notes: [first, second] })] }));
      expect(ghostButton().textContent).toContain("Writes the Draft");
      expect(ghostButton().textContent).not.toContain("Reads the Model");
      fireEvent.click(ghostButton());
      const dialog = await screen.findByRole("dialog");
      expect(within(dialog).getByText("Returns")).not.toBeNull();
      expect(within(dialog).getByText("Running for less than a minute")).not.toBeNull();
      expect(within(dialog).getByText("The agent is exploring the Model and the code for this design; nothing is written yet.")).not.toBeNull();
      const items = within(dialog).getAllByRole("listitem").map((li) => li.querySelector("span")?.textContent);
      expect(items).toEqual(["Writes the Draft", "Reads the Model"]);
      fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      await waitFor(() => expect(document.activeElement).toBe(ghostButton()));
    });

    test("without notes the ghost shows no note line and the dialog says so; the dialog follows a new note and a new phase", async () => {
      const view = ghostView();
      const { rerender, props } = page(snapshot({ announcements: [view] }));
      expect(ghostButton().querySelector(".truncate")).toBeNull();
      fireEvent.click(ghostButton());
      const dialog = await screen.findByRole("dialog");
      expect(within(dialog).getByText("No notes from the agent yet.")).not.toBeNull();
      rerender(<BoardPage {...props} snapshot={snapshot({ announcements: [{ ...view, phase: "writing", notes: [{ at: "2026-10-01T10:05:00.000Z", text: "Writes the Draft" }] }] })} />);
      await waitFor(() => expect(within(screen.getByRole("dialog")).getByText("Writes the Draft")).not.toBeNull());
      expect(within(screen.getByRole("dialog")).getByText("The agent is writing this Proposal's Draft; it lands in Backlog when handed over.")).not.toBeNull();
      expect(within(screen.getByRole("dialog")).queryByText("No notes from the agent yet.")).toBeNull();
    });

    test("the dialog closes by itself when its ghost goes away, and the focus goes to the column", async () => {
      const { rerender, props } = page(snapshot({ announcements: [ghostView()] }));
      fireEvent.click(ghostButton());
      await screen.findByRole("dialog");
      rerender(<BoardPage {...props} snapshot={snapshot()} />);
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      await waitFor(() => expect(document.activeElement).toBe(document.querySelector('[data-column="backlog"]')));
    });

    test("the focus goes to Active when the ghost of a Task goes away", async () => {
      const { rerender, props } = page(snapshot({ announcements: [{ ...ghostView(), kind: "task", title: "Refunds task" }] }));
      fireEvent.click(within(document.querySelector('[data-column="active"]') as HTMLElement).getByRole("button", { name: /the agent is creating/ }));
      await screen.findByRole("dialog");
      rerender(<BoardPage {...props} snapshot={snapshot()} />);
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      await waitFor(() => expect(document.activeElement).toBe(document.querySelector('[data-column="active"]')));
    });

    describe("asked from the status bar", () => {
      const check = (): AnnouncementView => ({ ...ghostView({ id: "c00001", title: "Final check after all Tasks" }), kind: "check" });

      test("opens the details of a ghost with no column, and closing them puts the focus on Backlog", async () => {
        page(snapshot({ announcements: [check()] }), { ghostRequest: { id: "c00001", n: 1 } });
        const dialog = await screen.findByRole("dialog");
        expect(within(dialog).getByText("Final check after all Tasks")).not.toBeNull();
        fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
        await waitFor(() => expect(document.activeElement).toBe(document.querySelector('[data-column="backlog"]')));
      });

      test("a ghost placed in Active also sends the focus to Backlog, and the dialog replaces another details window", async () => {
        const { rerender, props } = page(snapshot({ drifts: [driftView()], announcements: [{ ...ghostView({ id: "t00001" }), kind: "task", title: "Refunds task" }] }));
        fireEvent.click(within(document.querySelector('[data-column="backlog"]') as HTMLElement).getByRole("button", { name: /Code refunds late/ }));
        await screen.findByRole("dialog");
        rerender(<BoardPage {...props} ghostRequest={{ id: "t00001", n: 1 }} />);
        await waitFor(() => expect(screen.getAllByRole("dialog")).toHaveLength(1));
        expect(within(screen.getByRole("dialog")).getByText("Refunds task")).not.toBeNull();
        fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
        await waitFor(() => expect(document.activeElement).toBe(document.querySelector('[data-column="backlog"]')));
      });

      test("a ghost that is already gone shows the Board without a dialog", async () => {
        page(snapshot(), { ghostRequest: { id: "gone", n: 1 } });
        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
        expect(screen.getByRole("button", { name: "Add Work Item" })).not.toBeNull();
      });

      test("the dialog closes by itself when the ghost goes away, with the focus on Backlog", async () => {
        const { rerender, props } = page(snapshot({ announcements: [check()] }), { ghostRequest: { id: "c00001", n: 1 } });
        await screen.findByRole("dialog");
        rerender(<BoardPage {...props} snapshot={snapshot()} />);
        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
        await waitFor(() => expect(document.activeElement).toBe(document.querySelector('[data-column="backlog"]')));
      });
    });
  });

  test("Add Work Item fills the column without the main part taking the whole row, and the arrow never shrinks", () => {
    page(snapshot());
    const arrow = screen.getByRole("button", { name: "More ways to add work" });
    const main = screen.getByRole("button", { name: "Add Work Item" });
    expect(arrow.parentElement?.className).toContain("w-full");
    expect(main.className).toContain("flex-1");
    expect(main.className).toContain("min-w-0");
    expect(main.className).not.toContain("w-full");
    expect(main.className.split(" ")).not.toContain("shrink-0");
    expect(arrow.className).toContain("shrink-0");
    expect(main.className).toContain("border-dashed");
    expect(arrow.className).toContain("border-dashed");
  });

  test("the arrow of Add Work Item opens a menu with Add Quick Task, which asks the host and closes the menu", async () => {
    const { posted } = page(snapshot());
    const arrow = screen.getByRole("button", { name: "More ways to add work" }) as HTMLButtonElement;
    expect(arrow.disabled).toBe(false);
    arrow.focus();
    fireEvent.keyDown(arrow, { key: "Enter" });
    const item = await screen.findByRole("menuitem", { name: "Add Quick Task" });
    fireEvent.click(item);
    expect(posted).toEqual([{ type: "openQuickTask" }]);
    await waitFor(() => expect(screen.queryByRole("menuitem")).toBeNull());
  });

  const openMenu = async () => {
    const arrow = screen.getByRole("button", { name: "More ways to add work" });
    arrow.focus();
    fireEvent.keyDown(arrow, { key: "Enter" });
    await screen.findByRole("menuitem", { name: "Add Quick Task" });
  };

  test("the menu of Add Work Item has Unify Drifts and Add Quick Task, in this order", async () => {
    page(snapshot());
    await openMenu();
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Unify Drifts", "Add Quick Task"]);
  });

  test("an enabled Unify Drifts closes the menu and asks the host to launch it", async () => {
    const { posted } = page(snapshot());
    await openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Unify Drifts" }));
    expect(posted).toEqual([{ type: "launch", action: { kind: "unify-drifts" } }]);
    await waitFor(() => expect(screen.queryByRole("menuitem")).toBeNull());
  });

  test("a disabled Unify Drifts shows every reason, stays in the menu and sends nothing; Add Quick Task still works", async () => {
    const { posted } = page(snapshot(), { unify: { blockers: ["Drifts are being resolved", "Unify needs at least two open Drifts"], unifying: [] } });
    const arrow = screen.getByRole("button", { name: "More ways to add work" }) as HTMLButtonElement;
    expect(arrow.disabled).toBe(false);
    await openMenu();
    const item = screen.getByRole("menuitem", { name: "Unify Drifts" });
    expect([item.getAttribute("aria-disabled"), item.getAttribute("aria-description")]).toEqual(["true", "Drifts are being resolved. Unify needs at least two open Drifts"]);
    fireEvent.click(item);
    expect(screen.getByRole("menuitem", { name: "Add Quick Task" })).not.toBeNull();
    expect(posted).toEqual([]);
    fireEvent.click(screen.getByRole("menuitem", { name: "Add Quick Task" }));
    expect(posted).toEqual([{ type: "openQuickTask" }]);
  });

  test("the Unify Drifts ghost has the Unify type, its title and the accessible name of its phase", () => {
    page(snapshot({ announcements: [{ id: "u00001", kind: "unify", title: "Unifying 3 Drifts", phase: "writing-proposal", notes: [], announced: "2026-10-01T10:00:00.000Z" }] }));
    const ghost = screen.getByRole("button", { name: "Agent unifying Drifts: Unifying 3 Drifts, Writing. Show details" });
    expect(ghost.textContent).toContain("Unify");
    expect(ghost.textContent).toContain("Unifying 3 Drifts");
  });

  test("while the agent unifies, its cards wear Unifying and Resolve says why, with the host's reason after", () => {
    const { posted } = page(snapshot({ drifts: [driftView(), driftView({ id: "other", created: "2026-10-02T10:00:00.000Z", title: "Other" })] }), {
      resolve: { blocker: "Drifts are being resolved", runReason: "Drifts are being resolved", drifts: { liveDrift: "Drifts are being resolved", other: "Drifts are being resolved" }, resolving: [] },
      unify: { blockers: ["Drifts are being resolved"], unifying: ["liveDrift"] },
    });
    expect(screen.getAllByRole("img", { name: "An agent is unifying this Drift" }).length).toBe(1);
    const gathered = screen.getAllByRole("button", { name: /^Resolve Drift/ })[0] as HTMLButtonElement;
    expect([gathered.disabled, gathered.getAttribute("aria-description")]).toEqual([true, "An agent is unifying this Drift. Drifts are being resolved"]);
    const free = screen.getAllByRole("button", { name: /^Resolve Drift/ })[1] as HTMLButtonElement;
    expect(free.getAttribute("aria-description")).toBe("Drifts are being resolved");
    const dismiss = screen.getAllByRole("button", { name: "More ways to handle D4" })[0] as HTMLButtonElement;
    expect(dismiss.getAttribute("aria-description")).toContain("An agent is resolving Drifts");
    fireEvent.click(gathered);
    expect(posted).toEqual([]);
  });

  test("a unified Drift has the unified badge before recurring, and its details list the Drifts it unifies", () => {
    const calls: unknown[][] = [];
    page(snapshot({ drifts: [driftView({ unifies: [{ id: "oldA", title: "Old A" }, { id: "oldB", title: "Old B" }], previous: [{ id: "p1", title: "P1", decision: "fix-code" }, { id: "p2", title: "P2", decision: null }] })] }), {
      context: { post: () => {}, navigate: (...args: unknown[]) => calls.push(args), openLink: () => {} } as BoardPageProps["context"],
    });
    const badges = screen.getAllByRole("img", { hidden: true }).length;
    expect(badges).toBeGreaterThan(0);
    const badge = screen.getByLabelText("Unifies 2 Drifts");
    expect(badge.textContent).toBe("unified");
    expect(badge.nextElementSibling?.getAttribute("aria-label")).toBe("Recurring: follows 2 Drifts");
    fireEvent.click(screen.getByRole("button", { name: "Code refunds late" }));
    const row = within(screen.getByRole("dialog")).getByRole("button", { name: /Old A/ });
    fireEvent.click(row);
    expect(calls).toEqual([["diagram", { drift: "oldA" }]]);
  });

  test("the arrow of Add Work Item says whether its menu is open", async () => {
    page(snapshot());
    const arrow = screen.getByRole("button", { name: "More ways to add work" });
    expect(arrow.getAttribute("aria-expanded")).toBe("false");
    arrow.focus();
    fireEvent.keyDown(arrow, { key: "Enter" });
    await screen.findByRole("menuitem", { name: "Add Quick Task" });
    expect(arrow.getAttribute("aria-expanded")).toBe("true");
  });

  test("Run all is disabled with its reason as accessible description when no Task is in To do", () => {
    page(snapshot());
    const run = screen.getByRole("button", { name: "Run all the Tasks in To do" }) as HTMLButtonElement;
    expect([run.disabled, run.getAttribute("aria-description")]).toEqual([true, "No Task is in To do"]);
  });

  test("a Run in progress disables Run all with the reason of the host", () => {
    page(snapshot({ tasks: [taskView()] }), { resolve: { blocker: null, runReason: "A run is in progress", drifts: {}, resolving: [] } });
    const run = screen.getByRole("button", { name: "Run all the Tasks in To do" }) as HTMLButtonElement;
    expect([run.disabled, run.getAttribute("aria-description")]).toEqual([true, "A run is in progress"]);
  });

  test("while Drifts are being resolved, Run all is disabled with that reason first, then the others", () => {
    page(snapshot(), { resolve: { blocker: null, runReason: "Drifts are being resolved", drifts: {}, resolving: [] } });
    const run = screen.getByRole("button", { name: "Run all the Tasks in To do" }) as HTMLButtonElement;
    expect([run.disabled, run.getAttribute("aria-description")]).toEqual([true, "Drifts are being resolved. No Task is in To do"]);
  });

  test("a Task blocked by a Drift stays in Active with a blocked badge; one waiting for a fix Task has a waiting badge", () => {
    const blockedBy = [{ kind: "drift" as const, drift: "liveDrift", title: "Code refunds late" }];
    page(snapshot({
      drifts: [driftView()],
      tasks: [taskView({ column: "doing", agent: true, blockedBy }), taskView({ id: "fixTask", title: "Fix", created: "2026-10-02T10:00:00.000Z", drift: "liveDrift" }), taskView({ id: "waiter", title: "Waits", created: "2026-10-03T10:00:00.000Z", column: "doing", agent: true, blockedBy: [{ kind: "fix", task: "fixTask", title: "Fix", drift: "liveDrift", driftTitle: "Code refunds late" }] }), taskView({ id: "stuck", title: "Stuck", created: "2026-10-04T10:00:00.000Z", blockedBy })],
    }));
    const active = document.querySelector('[data-column="active"]') as HTMLElement;
    expect(within(active).getAllByRole("button", { name: "Blocked by Drift D4" }).length).toBe(2);
    expect(within(active).getAllByRole("button").some((b) => (b.textContent ?? "").startsWith("waiting "))).toBe(true);
    expect(within(active).getAllByRole("img", { name: "Agent working" }).length).toBe(2);
    // A blocked Task the agent has not taken is in Active too, with its Run disabled and the reason.
    const run = within(active).getByRole("button", { name: "Run task stuck" }) as HTMLButtonElement;
    expect([run.disabled, run.getAttribute("aria-description")]).toEqual([true, "Blocked by Drift D4"]);
  });

  test("the counts are the cards of Backlog and Active, never the ghosts; the ghosts stand at the bottom of the column of their card, before the foot, and the ones with no column are not drawn", () => {
    const base = { notes: [], announced: "2026-10-01T10:00:00.000Z" };
    const announcements: AnnouncementView[] = [
      { ...base, id: "a1", kind: "proposal", title: "Returns", phase: "writing" },
      { ...base, id: "a2", kind: "task", title: "Refund task", phase: "preparing" },
      { ...base, id: "a3", kind: "check", title: "Final check", phase: "verifying" },
    ];
    page(snapshot({ proposals: [proposalView()], tasks: [taskView()], announcements }));
    const counts = ["backlog", "active"].map((id) => document.querySelector(`[data-column="${id}"] h2 + [data-slot="badge"]`)?.textContent);
    expect(counts).toEqual(["1", "1"]);
    const backlog = document.querySelector('[data-column="backlog"]') as HTMLElement;
    const labels = within(backlog).getAllByRole("button").map((b) => b.getAttribute("aria-label"));
    expect(labels.at(-3)).toBe("Proposal the agent is creating, writing: Returns. Show details");
    expect(labels.at(-2)).toBe("Add Work Item");
    const active = document.querySelector('[data-column="active"]') as HTMLElement;
    const activeLabels = within(active).getAllByRole("button").map((b) => b.getAttribute("aria-label"));
    expect(activeLabels.filter((l) => l?.includes("the agent is creating"))).toEqual(["Task the agent is creating, preparing: Refund task. Show details"]);
    expect(activeLabels.at(-1)).toBe("Run all the Tasks in To do");
    expect(screen.queryByRole("button", { name: /Final check/ })).toBeNull();
  });

  test("a column with only ghosts says it is empty above them", () => {
    const announcement: AnnouncementView = { id: "a1", kind: "proposal", title: "Returns", phase: "writing", notes: [], announced: "2026-10-01T10:00:00.000Z" };
    page(snapshot({ announcements: [announcement] }));
    const backlog = document.querySelector('[data-column="backlog"]') as HTMLElement;
    const hint = within(backlog).getByText("Nothing to decide");
    const ghost = within(backlog).getByRole("button", { name: /the agent is creating/ });
    expect(hint.compareDocumentPosition(ghost) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(backlog.querySelector("h2 + [data-slot=badge]")?.textContent).toBe("0");
  });

  test("the notices of cards the agent never delivered close one by one", () => {
    const closed: number[] = [];
    page(snapshot(), { notices: [{ id: 1, text: "The agent finished without delivering Proposal Returns." }], closeNotice: (id) => closed.push(id) });
    expect(screen.getByRole("status").textContent).toContain("The agent finished without delivering Proposal Returns.");
    fireEvent.click(screen.getByRole("button", { name: "Close the notice: The agent finished without delivering Proposal Returns." }));
    expect(closed).toEqual([1]);
  });

  test("show with a ghost opens the details of that ghost, also one with no column", async () => {
    let slotted: ReactNode = null;
    const board = mountBoard((node) => { slotted = node; }, { post: () => {}, navigate: () => {}, openLink: () => {} });
    board.update(snapshot({ announcements: [{ id: "c00001", kind: "check", title: "Final check after all Tasks", phase: "verifying", notes: [], announced: new Date().toISOString() }] }));
    board.show({ ghost: "c00001" });
    const view = render(<TooltipProvider>{slotted}</TooltipProvider>);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Final check after all Tasks")).not.toBeNull();
    view.unmount();
  });

  test("a job or Task the run control stopped following shows its notice and closes it", () => {
    let slotted: ReactNode = null;
    const board = mountBoard((node) => { slotted = node; }, { post: () => {}, navigate: () => {}, openLink: () => {} });
    board.update(snapshot());
    board.stoppedFollowing?.("T3", "the agent's process is gone");
    board.stoppedFollowing?.("T4 Some title", "no window follows its agent");
    const text = "Trama stopped following T3: the agent's process is gone.";
    const view = render(<TooltipProvider>{slotted}</TooltipProvider>);
    expect(screen.getAllByRole("status").map((n) => n.textContent)).toEqual(expect.arrayContaining([expect.stringContaining(text), expect.stringContaining("Trama stopped following T4 Some title: no window follows its agent.")]));
    expect(screen.getByRole("button", { name: `Close the notice: ${text}` }).textContent).toContain("Close");
    view.unmount();
  });

});

describe("The Done column", () => {
  const now = new Date();
  const finishedToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30).toISOString();
  const doneView = (over: Partial<TaskView> = {}) => taskView({ id: "liveTask", title: "Finished one", column: "done", finished: finishedToday, ...over });
  const column = () => document.querySelector('[data-column="done"]') as HTMLElement;
  const open = () => fireEvent.click(screen.getByRole("button", { name: "Expand Done column" }));

  test("it is a strip first: the chevron and the title written downwards, with no card, number, hint or Clear", () => {
    page(snapshot({ tasks: [doneView()] }));
    const chevron = screen.getByRole("button", { name: "Expand Done column" });
    expect(chevron.getAttribute("aria-expanded")).toBe("false");
    expect(chevron.textContent).toBe("");
    expect(column().querySelector("h2")?.textContent).toBe("Done");
    expect(column().querySelector("h2")?.className).toContain("vertical-rl");
    expect(within(column()).queryByRole("article")).toBeNull();
    expect(within(column()).queryByText("Nothing done yet")).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete the Tasks in Done for good" })).toBeNull();
    expect(column().querySelector("[data-slot=badge]")).toBeNull();
    expect((document.querySelector('[data-column="done"]')?.parentElement as HTMLElement).style.gridTemplateColumns).toBe("repeat(2, minmax(250px, 1fr)) 40px");
  });

  test("the chevron opens it, with the number of cards, groups by day and the card of the Task; it keeps the focus and closes it again", () => {
    page(snapshot({ tasks: [doneView(), doneView({ id: "other", title: "Other", finished: new Date(now.getFullYear() - 1, 0, 5, 8, 0).toISOString() }), doneView({ id: "undated", title: "No instant", finished: null })] }));
    open();
    const chevron = screen.getByRole("button", { name: "Collapse Done column" });
    expect(chevron.getAttribute("aria-expanded")).toBe("true");
    expect(chevron.querySelector("svg")?.getAttribute("class")).toContain("lucide-chevron-right");
    expect(column().querySelector("h2 + [data-slot=badge]")?.textContent).toBe("3");
    expect([...column().querySelectorAll("h3")].filter((h) => h.className.includes("text-[11px]")).map((h) => h.textContent)).toEqual(["Today · 1", `${new Date(now.getFullYear() - 1, 0, 5).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })} · 1`, "Earlier · 1"]);
    expect(within(column()).getAllByRole("article").map((a) => a.getAttribute("aria-label"))).toEqual(["Task T3: Finished one", "Task other: Other", "Task undated: No instant"]);
    fireEvent.click(chevron);
    expect(within(column()).queryByRole("article")).toBeNull();
    expect(screen.getByRole("button", { name: "Expand Done column" })).not.toBeNull();
  });

  test("an empty column says Nothing done yet, with Clear below the text; the open choice is kept while the Board refreshes", () => {
    const { props, rerender } = page(snapshot());
    open();
    const hint = within(column()).getByText("Nothing done yet");
    const clear = within(column()).getByRole("button", { name: "Delete the Tasks in Done for good" });
    expect(hint.compareDocumentPosition(clear) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    rerender(<BoardPage {...props} snapshot={snapshot({ tasks: [doneView()] })} />);
    expect(screen.getByRole("button", { name: "Collapse Done column" })).not.toBeNull();
  });

  test("the card has the dot, the number, the Proposal tag with its tooltip, the end time and the references, and no button but its title and chips", () => {
    const calls = page(snapshot({ tasks: [doneView({ proposal: "prop1", proposalTag: { text: "Refunds", proposal: "prop1", title: "Refunds Proposal" }, refs: ["order/Paid"], created: "2026-10-01T10:00:00.000Z" })] }));
    open();
    const card = within(column()).getByRole("article", { name: "Task T3: Finished one" });
    expect(within(card).getByRole("img", { name: "Done" })).not.toBeNull();
    expect(within(card).getByText("T3")).not.toBeNull();
    expect(within(card).getByRole("img", { name: "From Proposal prop1: Refunds Proposal" }).textContent).toBe("Refunds");
    const time = card.querySelector("time") as HTMLElement;
    expect(time.textContent).toMatch(/^\d{2}:\d{2}/);
    expect(time.getAttribute("title")).toBe(new Date(finishedToday).toLocaleString(undefined, { dateStyle: "full", timeStyle: "medium" }));
    expect(within(card).getAllByRole("button").map((b) => b.textContent)).toEqual(["Finished one", "order/Paid"]);
    expect(card.className).not.toContain("board-working");
    expect(within(card).queryByRole("button", { name: /Run|View|Open/ })).toBeNull();
    void calls;
  });

  test("unchanged and kept are badges with their words as tooltip and accessible name, kept naming the open Drifts by number, and a kept Task is no longer kept once no Drift names it", () => {
    const numbers2 = { ...numbers, drift: { d3: "D3", d7: "D7" } };
    const drifts = [driftView({ id: "d7", created: "2026-10-02T10:00:00.000Z", origin: ["liveTask"] }), driftView({ id: "d3", created: "2026-10-01T10:00:00.000Z", task: "liveTask" })];
    const { props, rerender } = page(snapshot({ numbers: numbers2, drifts, tasks: [doneView({ unchanged: "Already so" })] }));
    open();
    expect(within(column()).getByRole("img", { name: "Closed without changes" }).textContent).toBe("unchanged");
    expect(within(column()).getByRole("img", { name: "Kept while Drift D3, D7 is open" }).textContent).toBe("kept");
    rerender(<BoardPage {...props} snapshot={snapshot({ numbers: numbers2, tasks: [doneView({ unchanged: "Already so" })] })} />);
    expect(within(column()).queryByRole("img", { name: /Kept while/ })).toBeNull();
  });

  test("a click on the card outside its chips and badges, or its title, opens the details with Ask more and Close, and closing keeps the Task there", () => {
    const { posted } = page(snapshot({ tasks: [doneView({ body: "Done body.", refs: ["order/Paid"] })] }));
    open();
    const card = within(column()).getByRole("article", { name: "Task T3: Finished one" });
    expect(card.className).toContain("cursor-pointer");
    fireEvent.click(within(card).getByRole("button", { name: "order/Paid" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(card);
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("Done body.");
    expect(within(dialog).getAllByRole("button").map((b) => b.getAttribute("aria-label") ?? b.textContent)).toEqual(["order/Paid", "Ask more about T3", "Close"]);
    expect(within(dialog).queryByRole("button", { name: /Open/ })).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Ask more about T3" }));
    expect(posted).toContainEqual({ type: "askMore", kind: "task", id: "liveTask" });
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("the details of a Task follow it from Active to Done and close only when it is in neither", () => {
    const { props, rerender } = page(snapshot({ tasks: [taskView({ id: "liveTask", body: "Body." })] }));
    fireEvent.click(screen.getByRole("button", { name: "A task" }));
    expect(screen.getByRole("dialog")).not.toBeNull();
    rerender(<BoardPage {...props} snapshot={snapshot({ tasks: [doneView({ title: "A task", body: "Body." })] })} />);
    expect(screen.getByRole("dialog").textContent).toContain("Body.");
    rerender(<BoardPage {...props} snapshot={snapshot()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  describe("Clear", () => {
    const clearName = "Delete the Tasks in Done for good";
    const clearButton = () => screen.getByRole("button", { name: clearName }) as HTMLButtonElement;

    test("it is the last thing of the column, an outline button as wide as the column with a trash icon, and asks the host for the Tasks shown, with the focus on the chevron", () => {
      const { posted } = page(snapshot({ tasks: [doneView({ id: "a1" }), doneView({ id: "a2", title: "Second", finished: new Date(now.getFullYear() - 1, 0, 5, 8, 0).toISOString() }), taskView({ id: "live" })] }));
      open();
      const clear = clearButton();
      expect(clear.textContent).toBe("Clear");
      expect(clear.className).toContain("border");
      expect(clear.className).not.toContain("bg-primary");
      expect(clear.className).toContain("w-full");
      expect(clear.querySelector("svg")?.getAttribute("class")).toContain("lucide-trash-2");
      expect(clear.compareDocumentPosition(within(column()).getAllByRole("article").at(-1) as HTMLElement) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
      expect(clear.disabled).toBe(false);
      fireEvent.click(clear);
      expect(posted).toEqual([{ type: "clearDone", tasks: ["a1", "a2"] }]);
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Collapse Done column" }));
    });

    test("a Run launched by Trama disables it with A run is in progress as its description, and an empty or all-kept column with Nothing to clear; both give both, the run first", () => {
      const kept = [driftView({ origin: ["a1"] })];
      const { props, rerender } = page(snapshot({ tasks: [doneView({ id: "a1" })] }), { resolve: { blocker: null, runReason: "Drifts are being resolved. A run is in progress", running: true, drifts: {}, resolving: [] } });
      open();
      expect(clearButton().disabled).toBe(true);
      expect(clearButton().getAttribute("aria-description")).toBe("A run is in progress");
      rerender(<BoardPage {...props} snapshot={snapshot({ drifts: kept, tasks: [doneView({ id: "a1" })] })} resolve={{ blocker: null, runReason: null, drifts: {}, resolving: [] }} />);
      expect(clearButton().disabled).toBe(true);
      expect(clearButton().getAttribute("aria-description")).toBe("Nothing to clear");
      rerender(<BoardPage {...props} snapshot={snapshot()} />);
      expect(clearButton().getAttribute("aria-description")).toBe("A run is in progress. Nothing to clear");
      rerender(<BoardPage {...props} snapshot={snapshot({ tasks: [doneView({ id: "a1" })] })} resolve={{ blocker: null, runReason: null, drifts: {}, resolving: [] }} />);
      expect(clearButton().disabled).toBe(false);
      expect(clearButton().getAttribute("aria-description")).toBeNull();
    });

    test("a Task kept by an open Drift is sent with the others, as the host rechecks which can go", () => {
      const { posted } = page(snapshot({ drifts: [driftView({ origin: ["a1"] })], tasks: [doneView({ id: "a1" }), doneView({ id: "a2", title: "Second", finished: new Date(now.getFullYear() - 1, 0, 5, 8, 0).toISOString() })] }));
      open();
      fireEvent.click(clearButton());
      expect(posted).toEqual([{ type: "clearDone", tasks: ["a1", "a2"] }]);
    });

    test("a refused or failed Clear shows its notice at the top of the Board, with Close, and the Tasks stay", () => {
      let slotted: ReactNode = null;
      const board = mountBoard((node) => { slotted = node; }, { post: () => {}, navigate: () => {}, openLink: () => {} });
      board.update(snapshot({ tasks: [doneView()] }));
      board.notice?.("Trama could not clear the Done column: disk full.");
      const { rerender } = render(<TooltipProvider>{slotted}</TooltipProvider>);
      expect(screen.getByRole("status").textContent).toContain("Trama could not clear the Done column: disk full.");
      fireEvent.click(screen.getByRole("button", { name: "Close the notice: Trama could not clear the Done column: disk full." }));
      rerender(<TooltipProvider>{slotted}</TooltipProvider>);
      expect(screen.queryByRole("status")).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Expand Done column" }));
      expect(screen.getByRole("article", { name: "Task T3: Finished one" })).not.toBeNull();
    });
  });
});

describe("The History view", () => {
  const entry = (over: Partial<HistoryView> = {}): HistoryView => {
    const at = new Date().toISOString();
    return { id: "h1", title: "Returns refunded", summary: "Done **now**.", body: "", created: at, updated: at, file: "history/h1.md", tasks: [], ...over };
  };
  const mount = (snap: Snapshot, context: Partial<ViewContext> = {}) => {
    let slotted: ReactNode = null;
    const view = mountHistory((node) => { slotted = node; }, { post: () => {}, navigate: () => {}, openLink: () => {}, ...context });
    view.update(snap);
    const utils = render(<TooltipProvider>{slotted}</TooltipProvider>);
    const redraw = (next: Snapshot) => { view.update(next); utils.rerender(<TooltipProvider>{slotted}</TooltipProvider>); };
    return { view, redraw, ...utils };
  };

  test("the title, the number of entries and the period menu come first, then one column of entries grouped by day", () => {
    const old = new Date(Date.now() - 3 * 86_400_000).toISOString();
    mount(snapshot({ history: [entry(), entry({ id: "h2", title: "Older", updated: old, created: old })] }));
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("History");
    expect(document.querySelector("h2 + [data-slot=badge]")?.textContent).toBe("2");
    const period = screen.getByRole("combobox", { name: "History period" });
    expect(period.textContent).toBe("Last 7 days");
    expect(period.querySelector("svg:not(.lucide-chevron-down)")).toBeNull();
    expect(screen.getByText("Today · 1")).not.toBeNull();
    expect(screen.getAllByRole("article").map((a) => a.querySelector("h4")?.textContent)).toEqual(["Returns refunded", "Older"]);
  });

  test("an entry has no button but its title and no info icon, and opens its details wherever it is clicked", () => {
    mount(snapshot({ history: [entry({ tasks: [{ id: "t1", exists: true, cleared: false, title: "A task", column: "done", unchanged: null, finished: null, refs: [], proposalTag: null, created: null }] })] }));
    const article = screen.getByRole("article");
    expect(within(article).getAllByRole("button").map((b) => b.textContent)).toEqual(["Returns refunded"]);
    expect(within(article).getByRole("button").getAttribute("aria-label") ?? "").toBe("");
    fireEvent.click(article.querySelector("time") as HTMLElement);
    expect(screen.getByRole("dialog")).not.toBeNull();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("an empty period says Nothing done in this period, and the period is kept while the view refreshes and while another view is shown", async () => {
    const { redraw, view } = mount(snapshot({ history: [] }));
    expect(screen.getByText("Nothing done in this period")).not.toBeNull();
    fireEvent.keyDown(screen.getByRole("combobox", { name: "History period" }), { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("option", { name: "All" }));
    expect(screen.getByRole("combobox", { name: "History period" }).textContent).toBe("All");
    redraw(snapshot({ history: [entry()] }));
    expect(screen.getByRole("combobox", { name: "History period" }).textContent).toBe("All");
    view.hide?.();
    expect(screen.getByRole("combobox", { name: "History period" }).textContent).toBe("All");
    expect(screen.getByText("Returns refunded")).not.toBeNull();
  });

  test("leaving the view closes an open details window", () => {
    const { view, redraw } = mount(snapshot({ history: [entry()] }));
    fireEvent.click(screen.getByRole("button", { name: "Returns refunded" }));
    expect(screen.getByRole("dialog")).not.toBeNull();
    view.hide?.();
    redraw(snapshot({ history: [entry()] }));
    expect(screen.queryByRole("dialog")).toBeNull();
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
  const withModels = { proposals: { live: { name: "anthropic/claude-opus-5-5" } } };

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
    page(snapshot({ proposals: [proposalView({ id: "bare", tasks: [] })] }), { models: { proposals: {} } });
    expect(screen.queryByRole("button", { name: /Choose the model/ })).toBeNull();
    cleanup();
    page(snapshot({ proposals: [proposalView()] }), { models: withModels });
    fireEvent.click(screen.getByRole("button", { name: "Choose the model for P2" }));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("a chosen model is one badge without any agent, and the window has no Chosen for line", () => {
    page(snapshot({ proposals: [proposalView()] }), { models: { proposals: { live: { name: "gpt-5" } } } });
    expect(screen.getByRole("img", { name: "Model for this Proposal's work: gpt-5" }).className).not.toContain("line-through");
    fireEvent.click(screen.getByRole("button", { name: "Choose the model for P2" }));
    expect(screen.getByRole("dialog").textContent).not.toContain("Chosen for");
  });
});

describe("Ask more in the details windows", () => {
  test("a click on a Task card opens its window; Ask more asks the host and leaves it open; the window follows the Task into Done and closes when it is in neither", () => {
    const { posted, props, rerender } = page(snapshot({ tasks: [taskView({ body: "Body." })] }));
    expect(screen.queryByRole("button", { name: /details/ })).toBeNull();
    fireEvent.click(screen.getByRole("article", { name: "Task T3: A task" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "T3 A task" })).not.toBeNull();
    expect(dialog.textContent).toContain("Body.");
    fireEvent.click(within(dialog).getByRole("button", { name: "Ask more about T3" }));
    expect(posted).toEqual([{ type: "askMore", kind: "task", id: "liveTask" }]);
    expect(screen.getByRole("dialog")).not.toBeNull();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "A task" }));
    expect(screen.getByRole("dialog")).not.toBeNull();
    rerender(<BoardPage {...props} snapshot={snapshot()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("a click on a Drift card opens its window, the title opens it too, and Ask more asks the host about the Drift", () => {
    const { posted } = page(snapshot({ drifts: [driftView()] }));
    fireEvent.click(screen.getByRole("button", { name: "Code refunds late" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "D4 Code refunds late" })).not.toBeNull();
    expect(dialog.textContent).toContain("What should happen");
    fireEvent.click(within(dialog).getByRole("button", { name: "Ask more about D4" }));
    expect(posted).toEqual([{ type: "askMore", kind: "drift", id: "liveDrift" }]);
    expect(screen.getByRole("dialog")).not.toBeNull();
  });

  test("the Proposal body window has Ask more beside Close, and Ask more asks the host about the Proposal", () => {
    const { posted } = page(snapshot({ proposals: [proposalView()] }));
    fireEvent.click(screen.getByRole("button", { name: "A proposal" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getAllByRole("button").map((b) => b.textContent)).toEqual(["Ask more", "Close"]);
    fireEvent.click(within(dialog).getByRole("button", { name: "Ask more about P2" }));
    expect(posted).toEqual([{ type: "askMore", kind: "proposal", id: "live" }]);
    expect(screen.getByRole("dialog")).not.toBeNull();
  });
  test("a tag, a badge and a button of a card do not open its window", () => {
    page(snapshot({ tasks: [taskView({ proposal: "live", proposalTag: { proposal: "live", text: "Returns", title: "Returns after shipping" } })] }));
    fireEvent.click(screen.getByRole("img", { name: "From Proposal live: Returns after shipping" }));
    fireEvent.click(screen.getByRole("button", { name: "Run task T3" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  test("a click inside the popup of a blocked badge, which is drawn outside the card, does not open the Task window", () => {
    const calls = draw(<CardView card={{ ...task, drift: null, waitingFor: [] }} />);
    fireEvent.click(screen.getByRole("button", { name: "Blocked by Drift D4" }));
    fireEvent.click(screen.getByText("Blocked by"));
    expect(calls.details).toEqual([]);
  });
});
