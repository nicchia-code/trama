import { expect, test } from "bun:test";
import { buildGraph } from "../extension/src/webview/diagram/levels";
import { buildScene } from "../extension/src/webview/diagram/scene";
import { shopSnapshot } from "./diagram-fixture";

// elkjs takes Bun's global scope for a web worker unless a `document` exists while it loads.
const scope = globalThis as { document?: unknown };
const hadDocument = "document" in scope;
scope.document = {};
const { layoutGraph, routeOf } = await import("../extension/src/webview/diagram/layout");
if (!hadDocument) delete scope.document;

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

test("Actors sit in the first layer of the System level", async () => {
  const graph = buildGraph(scene, { kind: "system" }, new Map());
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
