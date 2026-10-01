import type { Change } from "../../../../src/core/merge";

/** Which part of the Model the Diagram shows. */
export type Level =
  | { kind: "system" }
  | { kind: "feature"; feature: string }
  | { kind: "machine"; machine: string }
  /** The sub-Machine inside one State. */
  | { kind: "state"; machine: string; state: string };

export type NodeKind = "feature" | "actor" | "machine" | "state" | "marker" | "drift";

export interface GNode {
  /** Unique within one graph: `f:checkout`, `a:user`, `m:order`, `s:Paid`, `i:root`, `d:0003`. */
  id: string;
  kind: NodeKind;
  label: string;
  /** Second line of the label. */
  sub: string;
  /** Element reference this node stands for (`checkout`, `order/Paid`), null for markers and Drift ghosts. */
  ref: string | null;
  /** Container (an expanded State) this node is drawn in. */
  parent: string | null;
  change: Change;
  initial: boolean;
  final: boolean;
  /** Dimmed: drawn only because it sends Events in, or is the far end of a Transition. */
  external: boolean;
  /** Drawn in the first or last layer, so senders sit on the outer border. */
  layer: "first" | "last" | null;
  /** Number of sub-States; above zero the node can be expanded and drilled into. */
  children: number;
  expanded: boolean;
  /** Open Drifts that point at this node or at something inside it. */
  drifts: string[];
  /** ID of the Drift a ghost node stands for. */
  drift: string | null;
}

export type EdgeKind = "flow" | "transition" | "initial" | "drift";

/** One line in the side panel of an edge: an Event, or a Transition. */
export interface EdgeItem {
  label: string;
  from: string | null;
  to: string | null;
  /** Condition and consequence of a Transition, or who receives an Event. */
  text: string;
  change: Change;
}

export interface GEdge {
  /** Unique within one graph. */
  id: string;
  kind: EdgeKind;
  source: string;
  target: string;
  label: string;
  change: Change;
  /** Transition references (`order/Paid/user.CANCEL`) this edge draws. */
  refs: string[];
  items: EdgeItem[];
}

export interface GraphSpec {
  level: Level;
  nodes: GNode[];
  edges: GEdge[];
}

export const sameLevel = (a: Level, b: Level): boolean =>
  a.kind === b.kind &&
  (a.kind === "system" ||
    (a.kind === "feature" && b.kind === "feature" && a.feature === b.feature) ||
    (a.kind === "machine" && b.kind === "machine" && a.machine === b.machine) ||
    (a.kind === "state" && b.kind === "state" && a.machine === b.machine && a.state === b.state));

export function node(init: Partial<GNode> & Pick<GNode, "id" | "kind" | "label">): GNode {
  return {
    sub: "",
    ref: null,
    parent: null,
    change: "same",
    initial: false,
    final: false,
    external: false,
    layer: null,
    children: 0,
    expanded: false,
    drifts: [],
    drift: null,
    ...init,
  };
}

/** Changes of the parts of one element: one kind means that kind, a mix means the element itself was changed. */
export function aggregateChange(changes: Iterable<Change>): Change {
  const set = new Set(changes);
  if (set.size === 0) return "same";
  if (set.size === 1) return [...set][0] as Change;
  return "changed";
}

/** Nodes that carry the drill-in button (and, for States with sub-States, the expand button) on their right. */
export const hasHandles = (n: GNode): boolean => n.kind === "feature" || n.kind === "machine" || (n.kind === "state" && n.children > 0 && !n.external);
