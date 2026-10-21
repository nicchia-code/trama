import { expect, test } from "bun:test";
import { buildGraph } from "../extension/src/webview/diagram/levels";
import { buildScene } from "../extension/src/webview/diagram/scene";
import { layoutGraph, routeOf } from "../extension/src/webview/diagram/layout";
import { shopSnapshot } from "./diagram-fixture";

const scene = buildScene(shopSnapshot(), null);
const open = new Map<string, ReadonlySet<string>>([["order", new Set(["Paid"])]]);

test("layout is deterministic and flows left to right", async () => {
  const graph = buildGraph(scene, { kind: "machine", machine: "order" }, open);
  const a = await layoutGraph(graph);
  const b = await layoutGraph(graph);
  expect([...b.nodes]).toEqual([...a.nodes]);
  expect([...b.edges]).toEqual([...a.edges]);

  const x = (id: string) => a.nodes.get(id)?.x as number;
  expect(x("i:root")).toBeLessThan(x("s:Draft"));
  expect(x("s:Draft")).toBeLessThan(x("s:Awaiting payment"));
  expect(x("s:Awaiting payment")).toBeLessThan(x("s:Paid"));
  expect(x("s:Paid")).toBeLessThan(x("s:Cancelled"));
});

test("an expanded State is a box around its sub-States, and edges start and end on node borders", async () => {
  const graph = buildGraph(scene, { kind: "machine", machine: "order" }, open);
  const layout = await layoutGraph(graph);
  const paid = layout.nodes.get("s:Paid") as { x: number; y: number; width: number; height: number };
  for (const id of ["s:Preparing", "s:Ready to ship", "i:Paid"]) {
    const box = layout.nodes.get(id) as typeof paid;
    expect(box.x).toBeGreaterThanOrEqual(paid.x);
    expect(box.y).toBeGreaterThanOrEqual(paid.y);
    expect(box.x + box.width).toBeLessThanOrEqual(paid.x + paid.width);
    expect(box.y + box.height).toBeLessThanOrEqual(paid.y + paid.height);
  }
  for (const e of graph.edges) {
    const route = layout.edges.get(e.id);
    const from = layout.nodes.get(e.source) as typeof paid;
    const to = layout.nodes.get(e.target) as typeof paid;
    const start = route?.points[0] as { x: number; y: number };
    const end = route?.points.at(-1) as { x: number; y: number };
    const onBorder = (p: typeof start, b: typeof paid) => p.x >= b.x - 1 && p.x <= b.x + b.width + 1 && p.y >= b.y - 1 && p.y <= b.y + b.height + 1;
    expect(onBorder(start, from)).toBe(true);
    expect(onBorder(end, to)).toBe(true);
    if (e.label) expect(route?.label).not.toBeNull();
  }
});

test("the root is a grid of nodes with no arrows: Whole System first, then the Actors in Model order", async () => {
  const graph = buildGraph(scene, { kind: "system" }, new Map());
  const layout = await layoutGraph(graph);
  expect(graph.edges).toEqual([]);
  const ids = graph.nodes.map((n) => n.id);
  expect(ids).toEqual(["w:system", "a:courier", "a:stripe", "a:user", "a:warehouse"]);
  const boxes = ids.map((id) => layout.nodes.get(id) as { x: number; y: number; width: number; height: number });
  // Three columns for five nodes: the first row holds the first three in order, the second row the others.
  const middle = (b: (typeof boxes)[number] | undefined) => (b?.y ?? 0) + (b?.height ?? 0) / 2;
  expect(middle(boxes[0])).toBe(middle(boxes[1]));
  expect(middle(boxes[1])).toBe(middle(boxes[2]));
  expect(middle(boxes[3])).toBeGreaterThan(middle(boxes[0]));
  expect(boxes[0]?.x).toBeLessThan(boxes[1]?.x ?? 0);
  expect(boxes[1]?.x).toBeLessThan(boxes[2]?.x ?? 0);
  expect((boxes[3]?.x ?? 0) + (boxes[3]?.width ?? 0) / 2).toBeCloseTo((boxes[0]?.x ?? 0) + (boxes[0]?.width ?? 0) / 2, 5);
  for (const [i, a] of boxes.entries()) for (const b of boxes.slice(i + 1)) expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true);
});

test("Actors sit in the first layer of Whole System and of an Actor level", async () => {
  const actorLevel = await layoutGraph(buildGraph(scene, { kind: "actor", actor: "user" }, new Map()));
  expect(actorLevel.nodes.get("a:user")?.x).toBeLessThan(actorLevel.nodes.get("f:checkout")?.x as number);
  const graph = buildGraph(scene, { kind: "whole" }, new Map());
  const layout = await layoutGraph(graph);
  const feature = layout.nodes.get("f:checkout")?.x as number;
  for (const id of ["a:user", "a:stripe", "a:courier", "a:warehouse"]) expect(layout.nodes.get(id)?.x).toBeLessThan(feature);
});

test("a route becomes position and distance along the centre-to-centre line", () => {
  const source = { x: 0, y: 0, width: 100, height: 40 };
  const target = { x: 300, y: 100, width: 100, height: 40 };
  // Centres (50, 20) and (350, 120); the route leaves right, turns at x=200 and arrives at the left side.
  const route = routeOf([{ x: 100, y: 20 }, { x: 200, y: 20 }, { x: 200, y: 120 }, { x: 300, y: 120 }], source, target);
  expect(route?.sourceEndpoint).toEqual({ x: 50, y: 0 });
  expect(route?.targetEndpoint).toEqual({ x: -50, y: 0 });
  expect(route?.weights[0]).toBeCloseTo(0.45, 5);
  expect(route?.distances[0]).toBeCloseTo(-47.43, 2);
  expect(route?.weights[1]).toBeCloseTo(0.55, 5);
  expect(route?.distances[1]).toBeCloseTo(47.43, 2);
  expect(routeOf([{ x: 0, y: 0 }], source, source)).toBeNull();
});
