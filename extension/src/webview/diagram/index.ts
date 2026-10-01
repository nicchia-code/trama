import type { Snapshot } from "../../../../src/core/snapshot";
import type { NavigateOptions } from "../../protocol";
import type { MountView, View } from "../types";
import { createCanvas } from "./canvas";
import { detailOfSelection, tooltipOf } from "./details";
import { homeLevel, resolveElement, selectionFor, showsElement } from "./elements";
import { type GraphSpec, type Level, sameLevel } from "./graph";
import { breadcrumb, buildGraph, drillTarget, scanFeature, validLevel } from "./levels";
import { createPanel } from "./panel";
import { type Scene, buildScene, pathTo } from "./scene";
import css from "./diagram.css" with { type: "text" };

const TEMPLATE = `
  <div class="dg-toolbar">
    <nav class="dg-crumbs" aria-label="Zoom level"></nav>
    <span class="dg-spacer"></span>
    <label class="dg-field">Proposal <select class="dg-select" data-proposal aria-label="Proposal to draw over the Model"></select></label>
    <span class="dg-group" role="group" aria-label="Zoom">
      <button type="button" class="trama-btn" data-zoom-out aria-label="Zoom out" title="Zoom out (-)">−</button>
      <button type="button" class="trama-btn" data-zoom-in aria-label="Zoom in" title="Zoom in (+)">+</button>
      <button type="button" class="trama-btn" data-fit aria-label="Fit to view" title="Fit to view (0)">Fit</button>
    </span>
    <button type="button" class="trama-btn" data-design title="Ask an agent to design a change">Design…</button>
    <button type="button" class="trama-btn" data-scan>Scan</button>
  </div>
  <div class="dg-main">
    <div class="dg-stage" tabindex="0" aria-label="Diagram">
      <div class="dg-canvas"></div>
      <div class="dg-empty" hidden>The Model is empty. Use Design… to have an agent describe the System.</div>
      <details class="dg-legend" open>
        <summary>Legend</summary>
        <ul>
          <li><span class="dg-sw added"></span>Proposal adds it</li>
          <li><span class="dg-sw removed"></span>Proposal removes it</li>
          <li><span class="dg-sw changed"></span>Proposal changes it</li>
          <li><span class="dg-sw drift"></span>Drift</li>
          <li><span class="dg-sw initial"></span>Initial State</li>
          <li><span class="dg-sw final"></span>Final State</li>
        </ul>
      </details>
    </div>
    <aside class="dg-panel" aria-label="Details"></aside>
  </div>`;

/** Mounts the read-only Diagram. Everything it changes goes through `context.post`; the Model is never edited here. */
export const mountDiagram: MountView = (root, context) => {
  const style = document.createElement("style");
  style.textContent = css;
  document.head.append(style);

  root.classList.add("dg-root");
  root.innerHTML = TEMPLATE;
  const $ = <T extends HTMLElement>(selector: string) => root.querySelector(selector) as T;
  const stage = $("div.dg-stage");
  const crumbs = $("nav.dg-crumbs");
  const select = $<HTMLSelectElement>("select[data-proposal]");
  const scan = $<HTMLButtonElement>("button[data-scan]");

  let snapshot: Snapshot | null = null;
  let scene: Scene | null = null;
  let graph: GraphSpec | null = null;
  let level: Level = { kind: "system" };
  let proposalId: string | null = null;
  let selected: string | null = null;
  let pending: NavigateOptions | null = null;
  const expanded = new Map<string, Set<string>>();

  const panel = createPanel($("aside.dg-panel"), {
    jump: (ref) => navigateRef(ref),
    openFile: (path) => context.post({ type: "openModelFile", path }),
    drill: (target) => setLevel(target),
    toggle: (state) => toggleState(state),
    approve: (id) => context.post({ type: "approveProposal", id }),
    reject: (id) => context.post({ type: "rejectProposal", id }),
    resolveDrift: (id, how) => context.post({ type: "resolveDrift", id, how }),
  });

  const canvas = createCanvas(stage, $("div.dg-canvas"), {
    select: (id) => selectId(id),
    drill: (id) => {
      const target = graph && drillTarget(graph, id);
      if (target) setLevel(target);
    },
    toggle: (id) => {
      const n = graph?.nodes.find((x) => x.id === id);
      if (n) toggleState(n.label);
    },
    tooltip: (id) => (scene && graph ? tooltipOf(detailOfSelection(scene, graph, id)) : ""),
  });

  /** Rebuilds the Scene and the graph of the current level from the state above. */
  function compute() {
    if (!snapshot) return;
    if (proposalId && !snapshot.proposals.some((p) => p.id === proposalId)) proposalId = null;
    scene = buildScene(snapshot, proposalId);
    level = validLevel(scene, level);
    graph = buildGraph(scene, level, expanded);
    if (selected && !graph.nodes.some((n) => n.id === selected) && !graph.edges.some((e) => e.id === selected)) selected = null;
  }

  function renderChrome() {
    if (!snapshot || !scene || !graph) return;
    crumbs.replaceChildren();
    const trail = breadcrumb(scene, level);
    trail.forEach((crumb, i) => {
      if (i > 0) crumbs.append(Object.assign(document.createElement("span"), { className: "dg-sep", textContent: "›" }));
      const last = i === trail.length - 1;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "dg-crumb";
      b.textContent = crumb.label;
      if (crumb.label === "System") b.title = scene?.system.name ?? "";
      if (last) b.setAttribute("aria-current", "page");
      b.addEventListener("click", () => setLevel(crumb.level));
      crumbs.append(b);
    });

    select.replaceChildren(new Option("None", ""));
    for (const p of snapshot.proposals) {
      const marks = [p.stale.length > 0 ? "stale" : "", p.unbased.length > 0 ? "unbased" : "", p.errors.length > 0 ? "invalid" : ""].filter(Boolean);
      select.append(new Option(`${p.id} · ${p.title}${marks.length > 0 ? ` ⚠ ${marks.join(", ")}` : ""}`, p.id));
    }
    select.value = proposalId ?? "";

    const feature = scanFeature(scene, level);
    scan.title = feature ? `Ask an agent to scan the code against Feature ${feature}` : "Ask an agent to scan the code against the whole System";
    $("div.dg-empty").hidden = graph.nodes.length > 0;
    panel.render(detailOfSelection(scene, graph, selected));
  }

  function draw(fit: boolean) {
    compute();
    if (!graph) return;
    renderChrome();
    canvas.select(selected);
    void canvas.render(graph, fit);
  }

  function setLevel(target: Level) {
    const changed = !sameLevel(level, target);
    level = target;
    selected = null;
    draw(changed);
  }

  function selectId(id: string | null) {
    selected = id;
    const drift = scene?.drifts.find((d) => `d:${d.id}` === id);
    // Looking at a Drift that comes with a Proposal shows what accepting it would do.
    if (drift?.proposal && drift.proposal !== proposalId && snapshot?.proposals.some((p) => p.id === drift.proposal)) {
      proposalId = drift.proposal;
      draw(false);
      return;
    }
    canvas.select(id);
    if (scene && graph) panel.render(detailOfSelection(scene, graph, selected));
  }

  function toggleState(state: string) {
    if (level.kind !== "machine" && level.kind !== "state") return;
    const set = expanded.get(level.machine) ?? new Set<string>();
    if (!set.delete(state)) set.add(state);
    expanded.set(level.machine, set);
    draw(true);
  }

  /** Goes to the level that shows the element and selects it. Does nothing for references that resolve to nothing. */
  function navigateRef(ref: string) {
    compute();
    if (!scene || !graph) return;
    const element = resolveElement(scene, ref);
    if (!element) return;
    if (!showsElement(graph, element)) {
      level = homeLevel(element);
      if (element.kind === "state" || element.kind === "transition") {
        const set = expanded.get(element.machine.id) ?? new Set<string>();
        for (const name of pathTo(element.machine, element.state.name).slice(0, -1)) set.add(name);
        expanded.set(element.machine.id, set);
      }
    }
    compute();
    if (!graph) return;
    selected = selectionFor(graph, element);
    draw(true);
  }

  function apply(options: NavigateOptions) {
    if (options.proposal && snapshot?.proposals.some((p) => p.id === options.proposal)) proposalId = options.proposal;
    if (options.ref) navigateRef(options.ref);
    else draw(false);
  }

  select.addEventListener("change", () => {
    proposalId = select.value || null;
    draw(false);
  });
  $("button[data-zoom-in]").addEventListener("click", () => canvas.zoomBy(1.25));
  $("button[data-zoom-out]").addEventListener("click", () => canvas.zoomBy(0.8));
  $("button[data-fit]").addEventListener("click", () => canvas.fit());
  $("button[data-design]").addEventListener("click", () => context.post({ type: "launch", action: { kind: "design" } }));
  scan.addEventListener("click", () => {
    const feature = scene ? scanFeature(scene, level) : undefined;
    context.post({ type: "launch", action: feature ? { kind: "scan", feature } : { kind: "scan" } });
  });
  // Cytoscape handles pointer events itself and blurs the page on mousedown, so the stage is focused once the button is released; otherwise the shortcuts below never fire.
  stage.addEventListener("pointerup", () => stage.focus({ preventScroll: true }));
  stage.addEventListener("keydown", (e) => {
    if (e.key === "+" || e.key === "=") canvas.zoomBy(1.25);
    else if (e.key === "-") canvas.zoomBy(0.8);
    else if (e.key === "0") canvas.fit();
    else if (e.key === "Escape") selectId(null);
  });
  new ResizeObserver(() => canvas.resize()).observe(stage);
  const recolour = new MutationObserver(() => canvas.restyle());
  recolour.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
  recolour.observe(document.body, { attributes: true, attributeFilter: ["class", "style"] });

  const view: View = {
    update(next) {
      snapshot = next;
      if (pending) {
        const options = pending;
        pending = null;
        apply(options);
      } else draw(false);
    },
    show(options) {
      if (!snapshot) {
        if (options.ref || options.proposal) pending = options;
        return;
      }
      if (options.ref || options.proposal) apply(options);
      canvas.resize();
    },
  };
  return view;
};
