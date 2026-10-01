import "./elk-shim";
import ELK, { type ElkExtendedEdge, type ElkNode } from "elkjs/lib/elk-api.js";
import { Worker as ElkWorker } from "elkjs/lib/elk-worker.min.js";
import { type GEdge, type GNode, type GraphSpec, hasHandles } from "./graph";

export interface Point {
  x: number;
  y: number;
}

/** Top-left corner and size. */
export interface Box extends Point {
  width: number;
  height: number;
}

export interface EdgeLayout {
  /** Start, bend points and end, in diagram coordinates. */
  points: Point[];
  /** Where the label goes, null for an edge without label. */
  label: Box | null;
}

export interface Layout {
  nodes: Map<string, Box>;
  edges: Map<string, EdgeLayout>;
}

/** Rough width of a text in px: upper case and digits are wider than lower case. */
export function textWidth(text: string, fontSize: number): number {
  let em = 0;
  for (const ch of text) em += /[A-Z0-9_@%]/.test(ch) ? 0.7 : /[ilj.,:'|!]/.test(ch) ? 0.3 : /[mw]/.test(ch) ? 0.85 : 0.56;
  return Math.ceil(em * fontSize);
}

export const LABEL_FONT = 13;
export const SUB_FONT = 11;
export const EDGE_FONT = 11;
export const CONTAINER_HEADER = 38;
const CONTAINER_PADDING = 14;

const STRIKE = "\u0336";

/** The lines of text drawn in a node: name (struck through when a Proposal removes it), then the sub line and the `removed` tag. */
export function nodeLines(n: GNode): string[] {
  if (n.kind === "marker") return [];
  const name = n.change === "removed" && n.kind !== "drift" ? [...n.label].map((c) => c + STRIKE).join("") : n.label;
  return [name, ...(n.sub ? [n.sub] : []), ...(n.change === "removed" ? ["removed"] : [])];
}

/** Size of a node that is not a container. */
export function nodeSize(n: GNode): { width: number; height: number } {
  if (n.kind === "marker") return { width: 14, height: 14 };
  const lines = nodeLines(n);
  const text = Math.max(textWidth(n.label, LABEL_FONT), ...lines.slice(1).map((l) => textWidth(l, SUB_FONT)));
  const height = 14 + lines.length * 17;
  switch (n.kind) {
    case "drift":
      return { width: text + 28, height: 30 };
    case "feature":
    case "machine":
      return { width: Math.max(150, text + 36 + 44), height: Math.max(56, height) };
    case "actor":
      return { width: Math.max(110, text + 44), height: Math.max(40, height) };
    case "state":
      return { width: Math.max(96, text + 30 + (hasHandles(n) ? 44 : 0)), height: Math.max(38, height) };
  }
}

export function edgeLabelSize(e: GEdge): { width: number; height: number } {
  return { width: textWidth(e.label, EDGE_FONT) + 12, height: 18 };
}

const OPTIONS = {
  "elk.algorithm": "layered",
  "elk.direction": "RIGHT",
  "elk.hierarchyHandling": "INCLUDE_CHILDREN",
  "elk.edgeRouting": "ORTHOGONAL",
  "elk.layered.spacing.nodeNodeBetweenLayers": "48",
  "elk.layered.spacing.edgeNodeBetweenLayers": "24",
  "elk.layered.spacing.edgeEdgeBetweenLayers": "14",
  "elk.spacing.nodeNode": "32",
  "elk.spacing.edgeNode": "22",
  "elk.spacing.edgeEdge": "14",
  "elk.spacing.edgeLabel": "6",
  "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
  "elk.randomSeed": "1",
  "elk.json.edgeCoords": "ROOT",
  "elk.json.shapeCoords": "ROOT",
};

/** Lays the graph out left to right. Deterministic: the same graph always gives the same boxes. */
export async function layoutGraph(graph: GraphSpec): Promise<Layout> {
  // Edges spread along the side of a node: give every one of them room for its arrowhead.
  const sides = new Map<string, number>();
  for (const e of graph.edges) {
    if (e.source === e.target) continue;
    for (const key of [`in:${e.target}`, `out:${e.source}`]) sides.set(key, (sides.get(key) ?? 0) + 1);
  }
  const elkNodes = new Map<string, ElkNode>();
  for (const n of graph.nodes) {
    const size = nodeSize(n);
    const crowd = 14 + 14 * Math.max(sides.get(`in:${n.id}`) ?? 0, sides.get(`out:${n.id}`) ?? 0);
    const elk: ElkNode = { id: n.id, width: size.width, height: n.kind === "marker" ? size.height : Math.max(size.height, crowd) };
    if (n.layer) elk.layoutOptions = { "org.eclipse.elk.layered.layering.layerConstraint": n.layer === "first" ? "FIRST" : "LAST" };
    elkNodes.set(n.id, elk);
  }
  const root: ElkNode = { id: "root", layoutOptions: OPTIONS, children: [], edges: [] };
  for (const n of graph.nodes) {
    const elk = elkNodes.get(n.id) as ElkNode;
    const parent = n.parent ? elkNodes.get(n.parent) : undefined;
    if (!parent) {
      root.children?.push(elk);
      continue;
    }
    if (!parent.children) {
      const header = Math.max(textWidth(graph.nodes.find((x) => x.id === n.parent)?.label ?? "", LABEL_FONT) + 100, 160);
      parent.children = [];
      delete parent.width;
      delete parent.height;
      parent.layoutOptions = {
        "elk.padding": `[top=${CONTAINER_HEADER},left=${CONTAINER_PADDING},bottom=${CONTAINER_PADDING},right=${CONTAINER_PADDING}]`,
        "elk.nodeSize.constraints": "MINIMUM_SIZE",
        "elk.nodeSize.minimum": `(${header}, 90)`,
      };
    }
    parent.children.push(elk);
  }
  for (const e of graph.edges) {
    const edge: ElkExtendedEdge = { id: e.id, sources: [e.source], targets: [e.target] };
    if (e.label) edge.labels = [{ id: `${e.id}:label`, text: e.label, ...edgeLabelSize(e), layoutOptions: { "elk.edgeLabels.placement": "CENTER", "elk.edgeLabels.inline": "true" } }];
    root.edges?.push(edge);
  }

  const result = await new ELK({ workerFactory: () => new ElkWorker() }).layout(root);

  const nodes = new Map<string, Box>();
  const edges = new Map<string, EdgeLayout>();
  const walk = (n: ElkNode) => {
    for (const c of n.children ?? []) {
      nodes.set(c.id, { x: c.x ?? 0, y: c.y ?? 0, width: c.width ?? 0, height: c.height ?? 0 });
      walk(c);
    }
  };
  walk(result);
  for (const e of result.edges ?? []) {
    const section = e.sections?.[0];
    const l = e.labels?.[0];
    edges.set(e.id, {
      points: section ? [section.startPoint, ...(section.bendPoints ?? []), section.endPoint] : [],
      label: l ? { x: l.x ?? 0, y: l.y ?? 0, width: l.width ?? 0, height: l.height ?? 0 } : null,
    });
  }
  return { nodes, edges };
}

/** Cytoscape `segments` parameters that draw the given route between two nodes. */
export interface Route {
  /** Offsets from the node centres where the edge starts and ends. */
  sourceEndpoint: Point;
  targetEndpoint: Point;
  /** Each bend point as position along and distance from the centre-to-centre line. */
  weights: number[];
  distances: number[];
}

const centre = (b: Box): Point => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });

/** Null for an edge that starts and ends at the same node or has no route. */
export function routeOf(points: Point[], source: Box, target: Box): Route | null {
  const s = centre(source);
  const t = centre(target);
  const vx = t.x - s.x;
  const vy = t.y - s.y;
  const len2 = vx * vx + vy * vy;
  const first = points[0];
  const last = points.at(-1);
  if (len2 < 1 || !first || !last) return null;
  const len = Math.sqrt(len2);
  const bends = points.slice(1, -1);
  return {
    sourceEndpoint: { x: first.x - s.x, y: first.y - s.y },
    targetEndpoint: { x: last.x - t.x, y: last.y - t.y },
    weights: bends.map((p) => ((p.x - s.x) * vx + (p.y - s.y) * vy) / len2),
    distances: bends.map((p) => ((p.x - s.x) * -vy + (p.y - s.y) * vx) / len),
  };
}
