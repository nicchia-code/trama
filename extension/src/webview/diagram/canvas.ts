import cytoscape from "cytoscape";
import { type GEdge, type GNode, type GraphSpec, hasHandles } from "./graph";
import { type Layout, type Route, edgeLabelSize, layoutGraph, nodeLines, routeOf } from "./layout";
import { type Palette, mix, readPalette } from "./theme";

export interface CanvasHandlers {
  /** A node or an edge was clicked (`null`: the background). */
  select(id: string | null): void;
  /** Double-click or drill button on a node. */
  drill(id: string): void;
  /** Expand or collapse button on a State. */
  toggle(id: string): void;
  /** Text shown while the pointer rests on a node or an edge. */
  tooltip(id: string): string;
}

export interface Canvas {
  /** Draws a graph. The viewport stays where it is unless the graph's nodes and edges changed or `fit` is set. */
  render(graph: GraphSpec, fit: boolean): Promise<void>;
  select(id: string | null): void;
  zoomBy(factor: number): void;
  fit(): void;
  /** The container became visible or changed size. */
  resize(): void;
  /** Colours changed (theme switch). */
  restyle(): void;
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
    { selector: "node.sel", style: { "border-color": p.focus, "border-width": 3, "border-style": "solid", "overlay-color": p.focus, "overlay-opacity": 0.14, "overlay-padding": 4 } },
    { selector: "edge.sel", style: { "line-color": p.focus, "target-arrow-color": p.focus, width: 3 } },
  ];
  return sheet as unknown as cytoscape.StylesheetJson;
}

const nodeClasses = (n: GNode): string =>
  [`kind-${n.kind}`, `change-${n.change}`, n.external && "external", n.final && "final", n.expanded && "container", hasHandles(n) && !n.expanded && "handled", n.drifts.length > 0 && "drifted"].filter(Boolean).join(" ");

/** What decides whether two graphs need different boxes. */
function layoutKey(g: GraphSpec): string {
  return JSON.stringify([
    g.nodes.map((n) => [n.id, n.kind, nodeLines(n), n.parent, n.children, n.expanded, n.layer]),
    g.edges.map((e) => [e.id, e.source, e.target, e.label]),
  ]);
}

function labelId(edge: GEdge): string {
  return `${edge.id}#label`;
}

export function createCanvas(stage: HTMLElement, container: HTMLElement, handlers: CanvasHandlers): Canvas {
  const cy = cytoscape({
    container,
    style: stylesheet(readPalette(stage)),
    wheelSensitivity: 0.25,
    minZoom: 0.08,
    maxZoom: 2.5,
    boxSelectionEnabled: false,
    autoungrabify: true,
    autounselectify: true,
  });

  const handles = document.createElement("div");
  handles.className = "dg-handles";
  const tip = document.createElement("div");
  tip.className = "dg-tip";
  tip.hidden = true;
  stage.append(handles, tip);

  let drawn: { key: string; graph: GraphSpec; layout: Layout } | null = null;
  let ticket = 0;
  let selected: string | null = null;

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
    const text = drawn?.graph.nodes.find((n) => n.id === id)?.kind === "marker" ? "" : handlers.tooltip(id);
    if (!text) return;
    tip.textContent = text;
    tip.hidden = false;
    const at = event.renderedPosition as { x: number; y: number };
    tip.style.left = `${Math.min(at.x + 14, stage.clientWidth - 280)}px`;
    tip.style.top = `${at.y + 16}px`;
  });
  cy.on("mouseout pan zoom", () => {
    tip.hidden = true;
  });

  /** Drill and expand buttons sit over the nodes that can use them. */
  let frame = 0;
  const placeHandles = () => {
    frame = 0;
    for (const group of handles.querySelectorAll<HTMLElement>(".dg-handle-group")) {
      const n = cy.getElementById(group.dataset["node"] as string);
      if (n.empty()) continue;
      const box = n.renderedBoundingBox({ includeLabels: false, includeOverlays: false, includeEdges: false });
      const wide = box.w >= 64;
      group.hidden = !wide;
      if (!wide) continue;
      const w = group.offsetWidth || 44;
      const container = n.hasClass("container");
      group.style.left = `${box.x2 - w - 6}px`;
      group.style.top = `${container ? box.y1 + 6 : (box.y1 + box.y2) / 2 - 10}px`;
    }
  };
  const scheduleHandles = () => {
    if (!frame) frame = requestAnimationFrame(placeHandles);
  };
  cy.on("render", scheduleHandles);

  const button = (glyph: string, title: string, onClick: () => void) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "dg-handle";
    b.textContent = glyph;
    b.title = title;
    b.setAttribute("aria-label", title);
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick();
    });
    b.addEventListener("dblclick", (e) => e.stopPropagation());
    return b;
  };

  const buildHandles = (graph: GraphSpec) => {
    handles.replaceChildren();
    for (const n of graph.nodes) {
      const drill = hasHandles(n);
      if (!drill) continue;
      const group = document.createElement("div");
      group.className = "dg-handle-group";
      group.dataset["node"] = n.id;
      if (n.kind === "state") group.append(button(n.expanded ? "▾" : "▸", `${n.expanded ? "Collapse" : "Expand"} ${n.label}`, () => handlers.toggle(n.id)));
      group.append(button("↗", `Drill into ${n.label}`, () => handlers.drill(n.id)));
      handles.append(group);
    }
  };

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
    buildHandles(graph);
    scheduleHandles();
  };

  /** A fit asked for while the container has no size (the tab is hidden) happens when it gets one. */
  let fitPending = false;
  const fit = () => {
    cy.resize();
    if (cy.width() === 0 || cy.height() === 0) {
      fitPending = true;
      return;
    }
    fitPending = false;
    if (cy.elements().empty()) return;
    cy.fit(undefined, FIT_PADDING);
    if (cy.zoom() > MAX_FIT_ZOOM) {
      cy.zoom(MAX_FIT_ZOOM);
      cy.center();
    }
  };

  const select = (id: string | null) => {
    selected = id;
    cy.elements(".sel").removeClass("sel");
    if (id === null) return;
    cy.getElementById(id).addClass("sel");
    cy.getElementById(`${id}#label`).addClass("sel");
  };

  return {
    async render(graph, refit) {
      const mine = ++ticket;
      const key = layoutKey(graph);
      const layout = drawn?.key === key ? drawn.layout : await layoutGraph(graph);
      if (mine !== ticket) return;
      const changed = drawn?.key !== key;
      drawn = { key, graph, layout };
      sync(graph, layout);
      select(selected);
      if (changed || refit) fit();
    },
    select,
    zoomBy(factor) {
      cy.zoom({ level: cy.zoom() * factor, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
    },
    fit,
    resize() {
      if (fitPending) fit();
      else cy.resize();
      scheduleHandles();
    },
    restyle() {
      cy.style(stylesheet(readPalette(stage)));
    },
  };
}
