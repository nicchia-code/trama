import { renderResolves } from "../extension/src/webview/resolves";
import { describe, expect, test } from "bun:test";
import type { CardNumbers } from "../src/core/card-names";
import { renderCard } from "../extension/src/webview/board/render";
import type { ProposalCard, TaskCard } from "../extension/src/webview/board/logic";

class Node {
  children: Node[] = [];
  dataset: Record<string, string> = {};
  attributes: Record<string, string> = {};
  listeners: Record<string, (() => void)[]> = {};
  className = "";
  title = "";
  disabled = false;
  type = "";
  tabIndex = 0;
  hidden = false;
  private text = "";
  get textContent(): string { return this.text || this.children.map((child) => child.textContent).join(""); }
  set textContent(value: string) { this.text = value; this.children = []; }
  constructor(readonly tagName: string) {}
  append(...nodes: Node[]) { this.children.push(...nodes); }
  prepend(...nodes: Node[]) { this.children.unshift(...nodes); }
  setAttribute(key: string, value: string) { this.attributes[key] = value; }
  addEventListener(type: string, listener: () => void) { (this.listeners[type] ??= []).push(listener); }
  click() { for (const listener of this.listeners["click"] ?? []) listener(); }
  get all(): Node[] { return [this, ...this.children.flatMap((child) => child.all)]; }
  get renderedText(): string { return this.text + this.children.map((child) => child.renderedText).join(""); }
}

const numbers: CardNumbers = { proposal: { live: "P2" }, task: { liveTask: "T3" }, drift: { liveDrift: "D4" } };
const env = (overrides: Partial<{ post: (value: unknown) => void; navigate: (...args: unknown[]) => void; showCard: (...args: unknown[]) => void }> = {}) => ({
  context: { post: overrides.post ?? (() => {}), navigate: overrides.navigate ?? (() => {}), openLink: () => {} } as never,
  isExpanded: () => false, setExpanded: () => {}, showCard: overrides.showCard ?? (() => {}),
  numbers: () => numbers, resolvingReason: () => null,
});
const proposal: ProposalCard = {
  kind: "proposal", key: "proposal:live", id: "live", name: { text: "P2", isNumber: true }, heading: "Proposal P2", title: "A proposal",
  badges: [{ label: "requires old", tooltip: "Requires Proposal old", tone: "info", card: { kind: "proposal", id: "old" } }],
  resolution: false, changes: { files: [], more: 0 }, blocker: "Resolve the requirement first", touches: { model: true, requirements: false }, resolves: [],
};
const task: TaskCard = {
  kind: "task", key: "task:liveTask", id: "liveTask", name: { text: "T3", isNumber: true }, title: "A task", technical: false,
  refs: [], drift: "liveDrift", driftName: "D4", proposal: null, agent: false, blocks: [{ label: "blocked D4", tooltip: "Blocked by Drift D4", target: { kind: "diagram", drift: "liveDrift" } }],
  blockedBy: [], body: "", file: "task.md", column: "todo", finished: null, autopilotFailed: null,
};

describe("Board card rendering", () => {
  test("renders live and permanent IDs with accessible names, preserves blocker controls, and tags Drift origins", () => {
    const previous = (globalThis as { document?: unknown }).document;
    (globalThis as { document?: unknown }).document = {
      createElement: (tag: string) => new Node(tag),
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
      createTextNode: (text: string) => Object.assign(new Node("#text"), { textContent: text }),
    };
    try {
      const rows = renderResolves("board", "Resolve", [
        { drift: "liveDrift", name: { text: "D4", isNumber: true }, title: "Urgent", critical: true, previous: null, decision: "Fix code", autopilotFailed: null },
        { drift: "ordinary", name: { text: "D5", isNumber: true }, title: "Ordinary", critical: false, previous: null, decision: "Dismissed", autopilotFailed: null },
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
      createTextNode: (text: string) => Object.assign(new Node("#text"), { textContent: text }),
    };
    try {
      const rows = renderResolves("board", "Resolve", [
        { drift: "failed", name: { text: "D4", isNumber: true }, title: "Refunds", critical: false, previous: null, decision: "Fix code", autopilotFailed: "Not authorized any more" },
        { drift: "ordinary", name: { text: "D5", isNumber: true }, title: "Ordinary", critical: false, previous: null, decision: "Dismissed", autopilotFailed: null },
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
      createTextNode: (text: string) => Object.assign(new Node("#text"), { textContent: text }),
    };
    try {
      const resolution: ProposalCard = {
        ...proposal, heading: "Resolution Proposal P2", resolution: true,
        resolves: [{ drift: "liveDrift", name: { text: "D4", isNumber: true }, title: "Code refunds late", critical: false, previous: null, decision: "Closed, nothing changes", autopilotFailed: null }],
      };
      const rendered = renderCard(resolution, env() as never) as unknown as Node;
      expect(rendered.className).toContain("board-card-resolution");
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
      createTextNode: (text: string) => Object.assign(new Node("#text"), { textContent: text }),
    });
    try {
      const rows = renderResolves("board", "Resolve", [
        { drift: "liveDrift", name: { text: "D4", isNumber: true }, title: "Again", critical: false, previous: { id: "0001", title: "Earlier" }, decision: "Fix code", autopilotFailed: null },
        { drift: "ordinary", name: { text: "D5", isNumber: true }, title: "Ordinary", critical: false, previous: null, decision: "Dismissed", autopilotFailed: null },
      ], () => {});
      const badges = rows.flatMap((row) => (row instanceof Node ? row.all : [])).filter((node) => node.className.includes("recurring"));
      expect(badges.map((badge) => [badge.textContent, badge.title, badge.attributes["aria-label"]])).toEqual([["recurring", "Recurring: follows Drift 0001 – Earlier", "Recurring: follows Drift 0001 – Earlier"]]);
    } finally {
      if (saved === undefined) Reflect.deleteProperty(globalThis, "document");
      else Reflect.set(globalThis, "document", saved);
    }
  });
});
