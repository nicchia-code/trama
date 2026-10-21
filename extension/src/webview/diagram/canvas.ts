import cytoscape from "cytoscape";
import { type GEdge, type GNode, type GraphSpec, hasHandles } from "./graph";
import { type Layout, type Route, edgeLabelSize, layoutGraph, nodeLines, routeOf } from "./layout";
import { type Palette, mix, readPalette } from "./theme";

/** Where the drill and expand buttons of a node sit, in pixels of the stage: its right edge and its top. */
export interface HandleBox {
  id: string;
  right: number;
  top: number;
}

export interface CanvasHandlers {
  /** A node or an edge was clicked (`null`: the background). */
  select(id: string | null): void;
  /** Double-click on a node. */
  drill(id: string): void;
  /** The pointer rests on a node or an edge (`id`, at `x`, `y` of the stage), or left it (`null`). */
  hover(target: { id: string; x: number; y: number } | null): void;
  /** The drawing moved or was redrawn: where the buttons of the nodes that have them are now. */
  handles(boxes: HandleBox[]): void;
}

export interface Canvas {
  /**
   * Draws a graph. The viewport stays where it is unless the graph's nodes and edges changed or `fit` is set; `fitIds` narrows that fit to those nodes and edges.
   * `focusIds` are the nodes and edges of the focus: they are drawn in the colour of the focus (or keep the colours of their change) and everything else
   * drops to 30% opacity; null or empty draws the level as it is.
   */
  render(graph: GraphSpec, fit: boolean, fitIds?: readonly string[] | null, focusIds?: readonly string[] | null): Promise<void>;
  select(id: string | null): void;
  zoomBy(factor: number): void;
  /** Fits the view to the whole drawing, or to the given nodes and edges. */
  fit(ids?: readonly string[] | null): void;
  /** The container became visible or changed size. */
  resize(): void;
  /** Colours changed (theme switch). */
  restyle(): void;
  /** Removes the instance. */
  destroy(): void;
}

const FIT_PADDING = 36;
const MAX_FIT_ZOOM = 1.2;

function stylesheet(p: Palette): cytoscape.StylesheetJson {
  const tint = (c: string) => mix(c, p.node, 0.18);
  const sheet = [
    {
      selector: "node",
      style: {
        shape: "round-rectangle",
        "corner-radius": 8,
        "background-color": p.node,
        "border-width": 1.5,
        "border-color": p.line,
        "border-style": "solid",
        label: "data(text)",
        color: p.fg,
        "font-family": p.font,
        "font-size": 12,
        "line-height": 1.3,
        "text-wrap": "wrap",
        "text-valign": "center",
        "text-halign": "center",
        width: "data(w)",
        height: "data(h)",
        "z-index-compare": "manual",
        "z-index": 5,
      },
    },
    { selector: "node.kind-feature", style: { "corner-radius": 4, "border-width": 2 } },
    { selector: "node.kind-machine", style: { "corner-radius": 12 } },
    { selector: "node.kind-actor", style: { "corner-radius": 30, "border-color": p.purple, "border-width": 2, "background-color": mix(p.purple, p.node, 0.16) } },
    { selector: "node.kind-whole", style: { "corner-radius": 4, "border-width": 2, "border-style": "double" } },
    { selector: "node.inert", style: { "border-style": "dashed", color: p.muted } },
    { selector: "node.kind-marker", style: { shape: "ellipse", "background-color": p.fg, "border-width": 0, label: "" } },
    { selector: "node.final", style: { "border-style": "double", "border-width": 5 } },
    {
      selector: "node.container",
      style: { "background-color": mix(p.fg, p.bg, 0.06), "text-valign": "top", "text-margin-y": 21, "z-index": 1, "font-weight": "bold" },
    },
    { selector: "node.external", style: { opacity: 0.5 } },
    { selector: "node.handled", style: { "text-margin-x": -20 } },
    { selector: "node.change-added", style: { "border-style": "dashed", "border-color": p.blue, "border-width": 2, "background-color": tint(p.blue) } },
    { selector: "node.change-removed", style: { "border-style": "dashed", "border-color": p.red, "border-width": 2, opacity: 0.7 } },
    { selector: "node.change-changed", style: { "border-style": "solid", "border-color": p.blue, "border-width": 3 } },
    { selector: "node.final.change-added, node.final.change-removed, node.final.change-changed", style: { "border-style": "double", "border-width": 5 } },
    { selector: "node.drifted", style: { "outline-width": 3, "outline-style": "solid", "outline-color": p.red, "outline-offset": 3 } },
    {
      selector: "node.kind-drift",
      style: { shape: "round-rectangle", "corner-radius": 15, "background-color": tint(p.red), "border-style": "dashed", "border-color": p.red, "border-width": 2, color: p.red, "font-weight": "bold" },
    },
    {
      selector: "node.edge-label",
      style: {
        shape: "round-rectangle",
        "corner-radius": 4,
        "background-color": p.bg,
        "border-width": 1,
        "border-color": mix(p.line, p.bg, 0.5),
        "font-size": 11,
        color: mix(p.fg, p.bg, 0.9),
        "z-index": 8,
      },
    },
    { selector: "node.edge-label.change-added", style: { color: p.blue, "border-color": p.blue, "border-style": "dashed", "background-color": p.bg } },
    { selector: "node.edge-label.change-removed", style: { color: p.red, "border-color": p.red, "border-style": "dashed", opacity: 0.6 } },
    { selector: "node.edge-label.change-changed", style: { color: p.blue, "border-color": p.blue, "border-style": "solid" } },
    {
      selector: "edge",
      style: {
        "curve-style": "straight",
        width: 1.5,
        "line-color": p.line,
        "line-style": "solid",
        "target-arrow-shape": "triangle",
        "target-arrow-color": p.line,
        "arrow-scale": 1,
        "edge-distances": "node-position",
        "z-index-compare": "manual",
        "z-index": 3,
      },
    },
    { selector: "edge.routed", style: { "curve-style": "segments" } },
    { selector: "edge.loop", style: { "curve-style": "bezier", "loop-direction": "-90deg", "loop-sweep": "50deg", "control-point-step-size": 50 } },
    { selector: "edge.kind-initial", style: { "line-color": p.fg, "target-arrow-color": p.fg } },
    { selector: "edge.change-added", style: { "line-style": "dashed", "line-dash-pattern": [6, 4], "line-color": p.blue, "target-arrow-color": p.blue } },
    { selector: "edge.change-removed", style: { "line-style": "dashed", "line-dash-pattern": [6, 4], "line-color": p.red, "target-arrow-color": p.red, opacity: 0.6 } },
    { selector: "edge.change-changed", style: { "line-color": p.blue, "target-arrow-color": p.blue, width: 2.5 } },
    { selector: "edge.kind-drift", style: { "line-style": "dashed", "line-dash-pattern": [6, 4], "line-color": p.red, "target-arrow-shape": "none", "z-index": 2 } },
    { selector: "node.dim, edge.dim", style: { opacity: 0.3 } },
    { selector: "node.focus", style: { "border-color": p.cyan, "border-width": 4, "border-style": "solid", "background-color": tint(p.cyan) } },
    { selector: "node.final.focus", style: { "border-style": "double", "border-width": 5 } },
    { selector: "node.edge-label.focus", style: { "border-width": 2, color: p.cyan, "background-color": p.bg } },
    { selector: "edge.focus", style: { "line-color": p.cyan, "target-arrow-color": p.cyan, width: 3.5 } },
    { selector: "node.sel", style: { "border-color": p.focus, "border-width": 3, "border-style": "solid", "overlay-color": p.focus, "overlay-opacity": 0.14, "overlay-padding": 4 } },
    { selector: "edge.sel", style: { "line-color": p.focus, "target-arrow-color": p.focus, width: 3 } },
  ];
  return sheet as unknown as cytoscape.StylesheetJson;
}

const nodeClasses = (n: GNode): string =>
  [`kind-${n.kind}`, `change-${n.change}`, n.external && "external", n.inert && "inert", n.final && "final", n.expanded && "container", hasHandles(n) && !n.expanded && "handled", n.drifts.length > 0 && "drifted"].filter(Boolean).join(" ");

/** What decides whether two graphs need different boxes. */
function layoutKey(g: GraphSpec): string {
  return JSON.stringify([
    g.nodes.map((n) => [n.id, n.kind, nodeLines(n), n.parent, n.children, n.expanded, n.layer, n.opens]),
    g.edges.map((e) => [e.id, e.source, e.target, e.label]),
  ]);
}

function labelId(edge: GEdge): string {
  return `${edge.id}#label`;
}

export function createCanvas(container: HTMLElement, handlers: CanvasHandlers): Canvas {
  const cy = cytoscape({
    container,
    style: stylesheet(readPalette()),
    wheelSensitivity: 0.25,
    minZoom: 0.08,
    maxZoom: 2.5,
    boxSelectionEnabled: false,
    autoungrabify: true,
    autounselectify: true,
  });

  let drawn: { key: string; graph: GraphSpec; layout: Layout } | null = null;
  let ticket = 0;
  let selected: string | null = null;
  /** The nodes that have drill and expand buttons in the graph drawn. */
  let handled: string[] = [];
  /** The nodes and edges of the focus in the graph drawn; null when the level is drawn as it is. */
  let focused: readonly string[] | null = null;

  const elementId = (el: cytoscape.SingularElementReturnValue): string => (el.data("edge") as string | undefined) ?? el.id();

  cy.on("tap", (event) => {
    if (event.target === cy) return handlers.select(null);
    const el = event.target as cytoscape.SingularElementReturnValue;
    const id = elementId(el);
    const graph = drawn?.graph;
    const edge = graph?.edges.find((e) => e.id === id);
    if (edge) return handlers.select(edge.kind === "drift" ? edge.source : edge.kind === "initial" ? null : id);
    if (graph?.nodes.find((n) => n.id === id)?.kind !== "marker") handlers.select(id);
  });
  cy.on("dbltap", "node", (event) => {
    const n = drawn?.graph.nodes.find((x) => x.id === event.target.id());
    if (n) handlers.drill(n.id);
  });
  cy.on("mouseover", "node, edge", (event) => {
    const id = elementId(event.target);
    if (drawn?.graph.nodes.find((n) => n.id === id)?.kind === "marker") return;
    const at = event.renderedPosition as { x: number; y: number };
    handlers.hover({ id, x: at.x, y: at.y });
  });
  cy.on("mouseout pan zoom", () => handlers.hover(null));

  /** Drill and expand buttons sit over the nodes that can use them. */
  let frame = 0;
  const placeHandles = () => {
    frame = 0;
    const boxes: HandleBox[] = [];
    for (const id of handled) {
      const n = cy.getElementById(id);
      if (n.empty()) continue;
      const box = n.renderedBoundingBox({ includeLabels: false, includeOverlays: false, includeEdges: false });
      if (box.w < 64) continue;
      boxes.push({ id, right: box.x2 - 6, top: n.hasClass("container") ? box.y1 + 6 : (box.y1 + box.y2) / 2 - 10 });
    }
    handlers.handles(boxes);
  };
  const scheduleHandles = () => {
    if (!frame) frame = requestAnimationFrame(placeHandles);
  };
  cy.on("render", scheduleHandles);

  const sync = (graph: GraphSpec, layout: Layout) => {
    const nodes: cytoscape.ElementDefinition[] = [];
    const edges: cytoscape.ElementDefinition[] = [];
    const routes = new Map<string, Route>();
    for (const n of graph.nodes) {
      const box = layout.nodes.get(n.id);
      if (!box) continue;
      nodes.push({
        group: "nodes",
        data: { id: n.id, text: nodeLines(n).join("\n"), w: box.width, h: box.height },
        position: { x: box.x + box.width / 2, y: box.y + box.height / 2 },
        classes: nodeClasses(n),
      });
    }
    for (const e of graph.edges) {
      const geometry = layout.edges.get(e.id);
      const from = layout.nodes.get(e.source);
      const to = layout.nodes.get(e.target);
      if (!geometry || !from || !to) continue;
      const loop = e.source === e.target;
      const route = loop ? null : routeOf(geometry.points, from, to);
      if (route) routes.set(e.id, route);
      edges.push({ group: "edges", data: { id: e.id, source: e.source, target: e.target }, classes: [`kind-${e.kind}`, `change-${e.change}`, loop && "loop", route && route.weights.length > 0 && "routed"].filter(Boolean).join(" ") });
      if (e.label && geometry.label) {
        const l = geometry.label;
        const size = edgeLabelSize(e);
        nodes.push({
          group: "nodes",
          data: { id: labelId(e), edge: e.id, text: e.label, w: size.width, h: size.height },
          position: { x: l.x + l.width / 2, y: l.y + l.height / 2 },
          classes: `edge-label change-${e.change}`,
        });
      }
    }
    cy.batch(() => {
      cy.elements().remove();
      cy.add([...nodes, ...edges]);
      for (const [id, r] of routes) {
        const el = cy.getElementById(id);
        el.style("source-endpoint", `${r.sourceEndpoint.x}px ${r.sourceEndpoint.y}px`);
        el.style("target-endpoint", `${r.targetEndpoint.x}px ${r.targetEndpoint.y}px`);
        if (r.weights.length > 0) {
          el.style("segment-weights", r.weights.join(" "));
          el.style("segment-distances", r.distances.join(" "));
        }
      }
    });
    handled = graph.nodes.filter(hasHandles).map((n) => n.id);
    scheduleHandles();
  };

  /** A fit asked for while the container has no size (the tab is hidden) happens when it gets one. */
  let fitIsPending = false;
  let fitPending: readonly string[] | null = null;
  const fit = (ids?: readonly string[] | null) => {
    cy.resize();
    if (cy.width() === 0 || cy.height() === 0) {
      fitPending = ids ?? null;
      fitIsPending = true;
      return;
    }
    fitIsPending = false;
    fitPending = null;
    if (cy.elements().empty()) return;
    const wanted = ids && ids.length > 0 ? cy.elements().filter((el) => ids.includes(el.id())) : null;
    cy.fit(wanted && wanted.nonempty() ? wanted : undefined, FIT_PADDING);
    if (cy.zoom() > MAX_FIT_ZOOM) {
      cy.zoom(MAX_FIT_ZOOM);
      if (wanted && wanted.nonempty()) {
        const box = wanted.boundingBox();
        cy.pan({ x: cy.width() / 2 - ((box.x1 + box.x2) / 2) * cy.zoom(), y: cy.height() / 2 - ((box.y1 + box.y2) / 2) * cy.zoom() });
      } else cy.center();
    }
  };

  /** Dims everything but the elements of the focus; those a change colours keep their colours, the others take the colour of the focus. */
  const applyFocus = () => {
    cy.batch(() => {
      cy.elements().removeClass("dim focus");
      if (focused === null || focused.length === 0) return;
      const ids = new Set(focused);
      cy.elements().forEach((el) => {
        if (!ids.has(elementId(el))) el.addClass("dim");
        else if (!el.is(".change-added, .change-removed, .change-changed")) el.addClass("focus");
      });
    });
  };

  const select = (id: string | null) => {
    selected = id;
    cy.elements(".sel").removeClass("sel");
    if (id === null) return;
    cy.getElementById(id).addClass("sel");
    cy.getElementById(`${id}#label`).addClass("sel");
  };

  return {
    async render(graph, refit, fitIds, focusIds) {
      const mine = ++ticket;
      const key = layoutKey(graph);
      const layout = drawn?.key === key ? drawn.layout : await layoutGraph(graph);
      if (mine !== ticket) return;
      const changed = drawn?.key !== key;
      drawn = { key, graph, layout };
      sync(graph, layout);
      select(selected);
      focused = focusIds ?? null;
      applyFocus();
      if (changed || refit) fit(fitIds);
    },
    select,
    zoomBy(factor) {
      cy.zoom({ level: cy.zoom() * factor, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
    },
    fit,
    resize() {
      if (fitIsPending) fit(fitPending);
      else cy.resize();
      scheduleHandles();
    },
    restyle() {
      cy.style(stylesheet(readPalette()));
    },
    destroy() {
      if (frame) cancelAnimationFrame(frame);
      cy.destroy();
    },
  };
}
