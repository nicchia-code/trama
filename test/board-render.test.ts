import { renderResolves } from "../extension/src/webview/resolves";
import { describe, expect, test } from "bun:test";
import type { CardNumbers } from "../src/core/card-names";
import { announcedCard, type ProposalCard, type TaskCard, type WaitingCard } from "../extension/src/webview/board/logic";
import { renderAnnounced, renderCard } from "../extension/src/webview/board/render";
import { historyEntryNode } from "../extension/src/webview/board/history-entry";
import type { HistoryTaskView, HistoryView } from "../src/core/snapshot";

class Node {
  children: Node[] = [];
  dataset: Record<string, string> = {};
  attributes: Record<string, string> = {};
  listeners: Record<string, (() => void)[]> = {};
  className = "";
  classList = { add: () => {} };
  title = "";
  disabled = false;
  type = "";
  tabIndex = 0;
  hidden = false;
  open = false;
  private text = "";
  get textContent(): string { return this.text || this.children.map((child) => child.textContent).join(""); }
  set textContent(value: string) { this.text = value; this.children = []; }
  constructor(readonly tagName: string) {}
  append(...nodes: Node[]) { this.children.push(...nodes); }
  replaceChildren(...nodes: Node[]) { this.children = nodes; this.text = ""; }
  prepend(...nodes: Node[]) { this.children.unshift(...nodes); }
  setAttribute(key: string, value: string) { this.attributes[key] = value; }
  addEventListener(type: string, listener: () => void) { (this.listeners[type] ??= []).push(listener); }
  showModal() { this.open = true; }
  close() { this.open = false; for (const listener of this.listeners["close"] ?? []) listener(); }
  focus() {}
  click() { for (const listener of this.listeners["click"] ?? []) listener(); }
  get all(): Node[] { return [this, ...this.children.flatMap((child) => child.all)]; }
  get renderedText(): string { return this.text + this.children.map((child) => child.renderedText).join(""); }
}

const numbers: CardNumbers = { proposal: { live: "P2" }, task: { liveTask: "T3" }, drift: { liveDrift: "D4" } };
const env = (overrides: Partial<{ post: (value: unknown) => void; navigate: (...args: unknown[]) => void; showCard: (...args: unknown[]) => void }> = {}) => ({
  context: { post: overrides.post ?? (() => {}), navigate: overrides.navigate ?? (() => {}), openLink: () => {} } as never,
  isExpanded: () => false, setExpanded: () => {}, showCard: overrides.showCard ?? (() => {}),
  numbers: () => numbers, runReason: () => null,
});
const proposal: ProposalCard = {
  kind: "proposal", key: "proposal:live", id: "live", name: { text: "P2", isNumber: true }, heading: "Proposal P2", title: "A proposal",
  badges: [{ label: "requires old", tooltip: "Requires Proposal old", tone: "info", card: { kind: "proposal", id: "old" } }],
  resolution: false, changes: { files: [], more: 0 }, blocker: "Resolve the requirement first", touches: { model: true, requirements: false }, resolves: [],
  creates: null, rejectBlocker: null, choosable: false, model: null,
};
const task: TaskCard = {
  kind: "task", key: "task:liveTask", id: "liveTask", name: { text: "T3", isNumber: true }, title: "A task", technical: false,
  refs: [], drift: "liveDrift", driftName: "D4", proposal: null, proposalTag: null, proposalName: null, agent: false, blocks: [{ label: "blocked D4", tooltip: "Blocked by Drift D4", target: { kind: "diagram", drift: "liveDrift" } }],
  blockedBy: [], body: "", file: "task.md", column: "todo", autopilotFailed: null, finishing: null,
};

describe("Board card rendering", () => {
  test("renders live and permanent IDs with accessible names, preserves blocker controls, and tags Drift origins", () => {
    const previous = (globalThis as { document?: unknown }).document;
    (globalThis as { document?: unknown }).document = {
      createElement: (tag: string) => new Node(tag),
      createElementNS: (_ns: string, tag: string) => new Node(tag),
      createTextNode: (text: string) => Object.assign(new Node("#text"), { textContent: text }),
    };
    try {
      let posted: unknown;
      const renderedProposal = renderCard(proposal, env({ post: (value) => { posted = value; } }) as never) as unknown as Node;
      const tags = renderedProposal.all.filter((node) => node.attributes["role"] === "img");
      expect(tags.map((tag) => [tag.textContent, tag.title, tag.attributes["aria-label"]])).toContainEqual(["P2", "Short number (temporary)", "Short number (temporary) P2"]);
      expect(tags.map((tag) => [tag.textContent, tag.title, tag.attributes["aria-label"]])).toContainEqual(["old", "Permanent ID", "Permanent ID old"]);
      const approve = renderedProposal.all.find((node) => node.dataset["action"] === "approve")!;
      expect([approve.renderedText, approve.attributes["aria-label"], approve.disabled, approve.title, approve.attributes["aria-description"]]).toEqual(["Approve", "Approve Proposal P2", true, "Resolve the requirement first", "Resolve the requirement first"]);
      approve.click();
      expect(posted).toEqual({ type: "approveProposal", id: "live" });

      let navigated: unknown[] | undefined;
      const renderedTask = renderCard(task, env({ navigate: (...args) => { navigated = args; } }) as never) as unknown as Node;
      const taskTags = renderedTask.all.filter((node) => node.attributes["role"] === "img");
      expect(taskTags.map((tag) => [tag.textContent, tag.title, tag.attributes["aria-label"]])).toContainEqual(["D4", "Short number (temporary)", "Short number (temporary) D4"]);
      const origin = renderedTask.all.find((node) => node.className.includes("board-origin"))!;
      expect(origin.renderedText).toBe("from Drift D4");
      const blocker = renderedTask.all.find((node) => node.dataset["action"] === "blocked:diagram:liveDrift")!;
      expect([blocker.renderedText, blocker.title, blocker.attributes["aria-label"]]).toEqual(["blocked D4", "Blocked by Drift D4 (Short number (temporary) D4)", "Blocked by Drift D4 (Short number (temporary) D4)"]);
      blocker.click();
      expect(navigated).toEqual(["diagram", { drift: "liveDrift" }]);

      const permanentTask = { ...task, id: "closedTask", key: "task:closedTask", name: { text: "closedTask", isNumber: false }, drift: "closedDrift", blocks: [] };
      const renderedPermanent = renderCard(permanentTask, env() as never) as unknown as Node;
      const permanentTags = renderedPermanent.all.filter((node) => node.attributes["role"] === "img");
      expect(permanentTags.map((tag) => [tag.textContent, tag.title, tag.attributes["aria-label"]])).toContainEqual(["closedTask", "Permanent ID", "Permanent ID closedTask"]);
      expect(permanentTags.map((tag) => [tag.textContent, tag.title, tag.attributes["aria-label"]])).toContainEqual(["closedDrift", "Permanent ID", "Permanent ID closedDrift"]);
    } finally {
      if (previous === undefined) delete (globalThis as { document?: unknown }).document;
      else (globalThis as { document?: unknown }).document = previous;
    }
  });
  test("marks critical Drift resolution rows with an accessible urgency badge", () => {
    const previous = (globalThis as { document?: unknown }).document;
    (globalThis as { document?: unknown }).document = {
      createElement: (tag: string) => new Node(tag),
      createElementNS: (_ns: string, tag: string) => new Node(tag),
      createTextNode: (text: string) => Object.assign(new Node("#text"), { textContent: text }),
    };
    try {
      const rows = renderResolves("board", "Resolve", [
        { drift: "liveDrift", name: { text: "D4", isNumber: true }, title: "Urgent", critical: true, previous: null, decision: "Fix code", autopilotFailed: null, blocked: [], notBlocking: [] },
        { drift: "ordinary", name: { text: "D5", isNumber: true }, title: "Ordinary", critical: false, previous: null, decision: "Dismissed", autopilotFailed: null, blocked: [], notBlocking: [] },
      ], () => {});
      const badges = rows.flatMap((row) => (row as unknown as Node).all).filter((node) => node.className.includes("critical"));
      expect(badges.map((badge) => [badge.textContent, badge.title, badge.attributes["aria-label"]])).toEqual([["Critical", "Urgent developer decision", "Critical Drift: urgent developer decision"]]);
    } finally {
      if (previous === undefined) delete (globalThis as { document?: unknown }).document;
      else (globalThis as { document?: unknown }).document = previous;
    }
  });
  test("shows the autopilot failed badge beside a failed resolution row, with the reason in its tooltip and name", () => {
    const previous = (globalThis as { document?: unknown }).document;
    (globalThis as { document?: unknown }).document = {
      createElement: (tag: string) => new Node(tag),
      createElementNS: (_ns: string, tag: string) => new Node(tag),
      createTextNode: (text: string) => Object.assign(new Node("#text"), { textContent: text }),
    };
    try {
      const rows = renderResolves("board", "Resolve", [
        { drift: "failed", name: { text: "D4", isNumber: true }, title: "Refunds", critical: false, previous: null, decision: "Fix code", autopilotFailed: "Not authorized any more", blocked: [], notBlocking: [] },
        { drift: "ordinary", name: { text: "D5", isNumber: true }, title: "Ordinary", critical: false, previous: null, decision: "Dismissed", autopilotFailed: null, blocked: [], notBlocking: [] },
      ], () => {});
      const badges = rows.flatMap((row) => (row as unknown as Node).all).filter((node) => node.className.includes("board-badge error"));
      expect(badges.map((badge) => [badge.textContent, badge.title, badge.attributes["aria-label"]])).toEqual([["autopilot failed", "Autopilot failed: Not authorized any more", "Autopilot failed: Not authorized any more"]]);
    } finally {
      if (previous === undefined) delete (globalThis as { document?: unknown }).document;
      else (globalThis as { document?: unknown }).document = previous;
    }
  });
  test("marks a resolution card accessibly and retains its resolution rows and controls", () => {
    const previous = (globalThis as { document?: unknown }).document;
    (globalThis as { document?: unknown }).document = {
      createElement: (tag: string) => new Node(tag),
      createElementNS: (_ns: string, tag: string) => new Node(tag),
      createTextNode: (text: string) => Object.assign(new Node("#text"), { textContent: text }),
    };
    try {
      const resolution: ProposalCard = {
        ...proposal, heading: "Resolution Proposal P2", resolution: true,
        resolves: [{ drift: "liveDrift", name: { text: "D4", isNumber: true }, title: "Code refunds late", critical: false, previous: null, decision: "Closed, nothing changes", autopilotFailed: null, blocked: [], notBlocking: [] }],
      };
      const rendered = renderCard(resolution, env() as never) as unknown as Node;
      expect(rendered.className).toContain("board-card-resolution");
      expect(rendered.className).not.toContain("board-card-proposal");
      expect(rendered.attributes["aria-label"]).toBe("Resolution Proposal P2: A proposal");
      expect(rendered.all.some((node) => node.dataset["action"] === "approve")).toBe(true);
      expect(rendered.renderedText).toContain("Code refunds late");
      expect(rendered.all.some((node) => node.dataset["action"] === "resolves:liveDrift")).toBe(true);
    } finally {
      if (previous === undefined) delete (globalThis as { document?: unknown }).document;
      else (globalThis as { document?: unknown }).document = previous;
    }
  });
  test("marks a recurring Drift row with a recurring badge whose tooltip and name say which Drift it follows", () => {
    const saved = Reflect.get(globalThis, "document");
    Reflect.set(globalThis, "document", {
      createElement: (tag: string) => new Node(tag),
      createElementNS: (_ns: string, tag: string) => new Node(tag),
      createTextNode: (text: string) => Object.assign(new Node("#text"), { textContent: text }),
    });
    try {
      const rows = renderResolves("board", "Resolve", [
        { drift: "liveDrift", name: { text: "D4", isNumber: true }, title: "Again", critical: false, previous: { id: "0001", title: "Earlier" }, decision: "Fix code", autopilotFailed: null, blocked: [], notBlocking: [] },
        { drift: "ordinary", name: { text: "D5", isNumber: true }, title: "Ordinary", critical: false, previous: null, decision: "Dismissed", autopilotFailed: null, blocked: [], notBlocking: [] },
      ], () => {});
      const badges = rows.flatMap((row) => (row instanceof Node ? row.all : [])).filter((node) => node.className.includes("recurring"));
      expect(badges.map((badge) => [badge.textContent, badge.title, badge.attributes["aria-label"]])).toEqual([["recurring", "Recurring: follows Drift 0001 – Earlier", "Recurring: follows Drift 0001 – Earlier"]]);
    } finally {
      if (saved === undefined) Reflect.deleteProperty(globalThis, "document");
      else Reflect.set(globalThis, "document", saved);
    }
  });
});

describe("Run buttons say every reason that holds", () => {
  test("a Task's Run button is disabled with the resolution reason and the run reason, in tooltip and accessible description", () => {
    const previous = (globalThis as { document?: unknown }).document;
    (globalThis as { document?: unknown }).document = {
      createElement: (tag: string) => new Node(tag),
      createElementNS: (_ns: string, tag: string) => new Node(tag),
      createTextNode: (text: string) => Object.assign(new Node("#text"), { textContent: text }),
    };
    try {
      const reason = "Drifts are being resolved. A run is in progress";
      const rendered = renderCard({ ...task, column: "todo", drift: null, blocks: [], blockedBy: [] }, { ...env(), runReason: () => reason } as never) as unknown as Node;
      const run = rendered.all.find((node) => node.dataset["action"] === "run")!;
      expect([run.disabled, run.title, run.attributes["aria-description"]]).toEqual([true, reason, reason]);
    } finally {
      if (previous === undefined) Reflect.deleteProperty(globalThis, "document");
      else Reflect.set(globalThis, "document", previous);
    }
  });

  test("a Task whose agent is still finishing its turn has a Run that is disabled with that reason first", () => {
    const previous = (globalThis as { document?: unknown }).document;
    (globalThis as { document?: unknown }).document = {
      createElement: (tag: string) => new Node(tag),
      createElementNS: (_ns: string, tag: string) => new Node(tag),
      createTextNode: (text: string) => Object.assign(new Node("#text"), { textContent: text }),
    };
    try {
      const runOf = (card: TaskCard, runReason: string | null) => (renderCard(card, { ...env(), runReason: () => runReason } as never) as unknown as Node).all.find((node) => node.dataset["action"] === "run")!;
      const waiting = runOf({ ...task, column: "todo", blocks: [], blockedBy: [], finishing: "The agent is still finishing" }, "A run is in progress");
      expect([waiting.disabled, waiting.title, waiting.attributes["aria-description"]]).toEqual([true, "The agent is still finishing. A run is in progress", "The agent is still finishing. A run is in progress"]);
      const free = runOf({ ...task, column: "todo", blocks: [], blockedBy: [], finishing: null }, null);
      expect(free.disabled).toBe(false);
    } finally {
      if (previous === undefined) Reflect.deleteProperty(globalThis, "document");
      else Reflect.set(globalThis, "document", previous);
    }
  });
});

describe("A Task the agent has taken", () => {
  const withDom = <T>(run: () => T): T => {
    const previous = (globalThis as { document?: unknown }).document;
    (globalThis as { document?: unknown }).document = {
      createElement: (tag: string) => new Node(tag),
      createElementNS: (_ns: string, tag: string) => new Node(tag),
      createTextNode: (text: string) => Object.assign(new Node("#text"), { textContent: text }),
    };
    try {
      return run();
    } finally {
      if (previous === undefined) Reflect.deleteProperty(globalThis, "document");
      else Reflect.set(globalThis, "document", previous);
    }
  };

  test("its dot is static and says Agent working, and its card has no Run button", () => {
    withDom(() => {
      const rendered = renderCard({ ...task, column: "doing", agent: true, drift: null, blocks: [], blockedBy: [] }, env() as never) as unknown as Node;
      expect(rendered.all.filter((n) => n.className.startsWith("board-dot")).map((n) => [n.className, n.attributes["aria-label"]])).toEqual([["board-dot is-doing", "Agent working"]]);
      expect(rendered.all.some((n) => n.dataset["action"] === "run")).toBe(false);
    });
  });
});

describe("Tasks waiting in the Board", () => {
  const withDom = <T>(run: () => T): T => {
    const previous = Reflect.get(globalThis, "document");
    Reflect.set(globalThis, "document", {
      createElement: (tag: string) => new Node(tag),
      createElementNS: (_ns: string, tag: string) => new Node(tag),
      createTextNode: (text: string) => Object.assign(new Node("#text"), { textContent: text }),
    });
    try {
      return run();
    } finally {
      if (previous === undefined) Reflect.deleteProperty(globalThis, "document");
      else Reflect.set(globalThis, "document", previous);
    }
  };

  test("a waiting card lists the Tasks waiting for its fix Task, each as a row of its own, with no Run button", () => {
    withDom(() => {
      const waiter: TaskCard = { ...task, key: "task:waiter", id: "waiter", name: { text: "T9", isNumber: true }, blockedBy: [{ kind: "fix", task: "liveTask", title: "Fix refunds", drift: "liveDrift" }] };
      const waiting: WaitingCard = { kind: "waiting", key: "waiting:liveTask", task, waiting: [waiter] };
      const rendered = renderCard(waiting, env() as never) as unknown as Node;
      expect(rendered.className).toContain("board-card-waiting");
      expect(rendered.all.filter((n) => n.className === "board-blocked-task").map((n) => n.dataset["key"])).toEqual(["task:waiter"]);
      expect(rendered.all.some((n) => n.dataset["action"] === "run")).toBe(false);
    });
  });
});

describe("Announced ghost rendering", () => {
  test("a check in History shows the Updating History row and its accessible name", () => {
    const previous = (globalThis as { document?: unknown }).document;
    (globalThis as { document?: unknown }).document = {
      createElement: (tag: string) => new Node(tag),
      createElementNS: (_ns: string, tag: string) => new Node(tag),
      createTextNode: (text: string) => Object.assign(new Node("#text"), { textContent: text }),
    };
    try {
      const card = announcedCard({ id: "c00001", kind: "check", title: "Final check after all Tasks", phase: "history" }, true);
      const node = renderAnnounced(card) as unknown as Node;
      expect(node.attributes["aria-label"]).toBe("Agent checking the code: Final check after all Tasks, Updating History");
      expect(node.attributes["role"]).toBe("img");
      expect(node.all.filter((n) => n.className === "board-announced-phase").map((n) => n.textContent)).toEqual(["Updating History"]);
    } finally {
      if (previous === undefined) delete (globalThis as { document?: unknown }).document;
      else (globalThis as { document?: unknown }).document = previous;
    }
  });
});

describe("History entry details", () => {
  test("the «i» of an entry lists its Tasks by creation, and a Task that is gone says so", () => {
    const scope = globalThis as { document?: unknown };
    const previous = scope.document;
    scope.document = {
      createElement: (tag: string) => new Node(tag),
      createElementNS: (_ns: string, tag: string) => new Node(tag),
      createTextNode: (text: string) => Object.assign(new Node("#text"), { textContent: text }),
    };
    try {
      const task = (over: Partial<HistoryTaskView>): HistoryTaskView => ({ id: "task0000", exists: true, title: "A task", column: "done", unchanged: null, finished: null, refs: [], proposalTag: null, created: null, ...over });
      const entry: HistoryView = {
        id: "hist0001", title: "Returns refunded", summary: "Refunds now **arrive** on time.", body: "", created: "2026-10-01T00:00:00.000Z", updated: "2026-10-16T08:30:00.000Z", file: "history/hist0001-returns.md",
        tasks: [
          task({ id: "late0003", title: "Third", created: "2026-10-03T00:00:00.000Z" }),
          task({ id: "gone0009", exists: false, title: null, column: null }),
          task({ id: "early001", title: "First", created: "2026-10-01T00:00:00.000Z" }),
        ],
      };
      const view = historyEntryNode({ post: () => {}, navigate: () => {}, openLink: () => {} } as never);
      view.update(entry, numbers, new Date("2026-10-17T12:00:00Z"));
      const rendered = view.node as unknown as Node;
      const info = rendered.all.find((n) => n.className === "board-history-info");
      expect(info?.attributes["aria-label"]).toBe("Show the Tasks of Returns refunded");
      expect(rendered.all.find((n) => n.className === "board-history-summary")?.renderedText).toBe("Refunds now arrive on time.");
      info?.click();
      const dialog = rendered.all.find((n) => n.tagName === "dialog");
      expect(dialog?.open).toBe(true);
      const rows = dialog?.all.filter((n) => n.className === "board-history-task") ?? [];
      expect(rows.length).toBe(3);
      expect(rows[0]?.renderedText).toContain("First");
      expect(rows[1]?.renderedText).toContain("Third");
      expect(rows[2]?.renderedText).toContain("no longer exists");
    } finally {
      if (previous === undefined) delete scope.document;
      else scope.document = previous;
    }
  });
});

test("a row names the Tasks its Drift leaves free by number, each with its reason as tooltip and accessible name", () => {
  const saved = Reflect.get(globalThis, "document");
  Reflect.set(globalThis, "document", {
    createElement: (tag: string) => new Node(tag),
    createElementNS: (_ns: string, tag: string) => new Node(tag),
    createTextNode: (text: string) => Object.assign(new Node("#text"), { textContent: text }),
  });
  try {
    const rows = renderResolves("board", "Resolve", [
      { drift: "liveDrift", name: { text: "D4", isNumber: true }, title: "Again", critical: false, previous: null, decision: "Fix code", autopilotFailed: null, blocked: [], notBlocking: [{ name: { text: "T2", isNumber: true }, reason: "Only the wording." }] },
    ], () => {});
    const named = rows.flatMap((row) => (row instanceof Node ? row.all : [])).filter((node) => node.className.includes("board-not-blocking-task"));
    expect(named.map((node) => [node.textContent, node.title, node.attributes["aria-label"]])).toEqual([["T2", "Not blocked by this Drift: Only the wording.", "Not blocked by this Drift: Only the wording."]]);
  } finally {
    if (saved === undefined) Reflect.deleteProperty(globalThis, "document");
    else Reflect.set(globalThis, "document", saved);
  }
});
