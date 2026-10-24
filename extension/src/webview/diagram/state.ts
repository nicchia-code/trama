import type { Snapshot } from "../../../../src/core/snapshot";
import { REFINEMENT_OFF } from "../board/logic";
import type { FocusRequest, NavigateOptions, RefinementView } from "../../protocol";
import { type Detail, containersOf, detailOfSelection, requirementItems } from "./details";
import { type Element, alwaysOpens, homeLevel, resolveElement, selectionFor, showsElement } from "./elements";
import { type GraphSpec, type Level, sameLevel } from "./graph";
import { buildGraph, drillTarget, validLevel } from "./levels";
import { type Scene, buildScene, pathTo } from "./scene";
import { type DiagramFocus, diagramFocus } from "../focus/diagram";
import { focusSpec } from "../focus/spec";

/** The Model reference of what a level shows, for the Requirements attached to it. */
const levelRef = (level: Level): string | null =>
  level.kind === "actor" ? level.actor : level.kind === "feature" ? level.feature : level.kind === "machine" ? level.machine : level.kind === "state" ? `${level.machine}/${level.state}` : null;

/** What the Diagram shows. A new object for every change, so React re-renders only when something did. */
export interface DiagramState {
  snapshot: Snapshot | null;
  scene: Scene | null;
  graph: GraphSpec | null;
  level: Level;
  /** The open Proposal drawn over the Model. */
  proposalId: string | null;
  selected: string | null;
  /** What the focus of this tab started from; null without one. A Proposal's focus also draws it, so `proposalId` is its. */
  focusRequest: FocusRequest | null;
  /** The focus as it stands on the level drawn: its steps, the current one, what is missing and what to highlight; null without one. */
  focus: DiagramFocus | null;
  /** Grows each time the drawing must be fitted to the view again. */
  fit: number;
  /** The nodes and edges the next fit is limited to; null fits the whole level. */
  fitTo: string[] | null;
  /** The reason Resolve Drifts is unavailable now, from the snapshot the Board also reads; null when it is available. */
  resolveBlocker: string | null;
  /** The Proposal refinement, as the host carries it; off when absent. */
  refinement: RefinementView;
}

export interface DiagramStore {
  get(): DiagramState;
  subscribe(listener: () => void): () => void;
  update(snapshot: Snapshot, resolveBlocker: string | null, refinement?: RefinementView): void;
  /** Called when the tab is shown or navigated to. */
  show(options: NavigateOptions): void;
  setLevel(target: Level): void;
  select(id: string | null): void;
  toggleState(state: string): void;
  /** The developer's choice in the Diagram's own selector: the Model is drawn with that Proposal, and a level it no longer has falls back. */
  chooseProposal(id: string | null): void;
  /** Goes to the level that shows the element, selects it and fits the view to it. */
  navigateRef(ref: string): void;
  /** A View button or a chip: replaces the focus and the Proposal drawn, goes to the first step and, but for a Proposal's focus, selects its first element. */
  focusOn(request: FocusRequest): void;
  /** The previous or the next step, never beyond the first or the last; from a level with no element of the focus, the first or the last. */
  stepFocus(delta: -1 | 1): void;
  /** Takes the focus off, keeping the level, the position and the Proposal drawn. */
  clearFocus(): void;
  navigateDrift(id: string): void;
  /** Where a node leads when drilled into. */
  drillOf(id: string): Level | null;
  /** The State a node stands for, to expand or collapse it. */
  stateOf(id: string): string | null;
  /** Asks for the drawing to fit the view (the Fit button). */
  refit(): void;
}

export function createDiagramStore(): DiagramStore {
  let state: DiagramState = {
    snapshot: null,
    scene: null,
    graph: null,
    level: { kind: "system" },
    proposalId: null,
    selected: null,
    focusRequest: null,
    focus: null,
    fit: 0,
    fitTo: null,
    resolveBlocker: null,
    refinement: REFINEMENT_OFF,
  };
  let pending: NavigateOptions | null = null;
  const expanded = new Map<string, Set<string>>();
  const listeners = new Set<() => void>();

  const emit = (patch: Partial<DiagramState>, fit = false) => {
    state = { ...state, ...patch, fit: fit ? state.fit + 1 : state.fit, fitTo: fit ? (patch.fitTo ?? null) : state.fitTo };
    for (const listener of listeners) listener();
  };

  /** Rebuilds the Scene and the graph of the current level from the state. */
  function compute(base: DiagramState = state): Pick<DiagramState, "scene" | "graph" | "level" | "selected" | "proposalId" | "focusRequest" | "focus"> {
    const { snapshot } = base;
    if (!snapshot) return { scene: null, graph: null, level: base.level, selected: base.selected, proposalId: base.proposalId, focusRequest: base.focusRequest, focus: null };
    const proposalId = base.proposalId && snapshot.proposals.some((p) => p.id === base.proposalId) ? base.proposalId : null;
    const scene = buildScene(snapshot, proposalId);
    const level = validLevel(scene, base.level);
    const graph = buildGraph(scene, level, expanded);
    const selected = base.selected && (scene.unified.some((d) => `u:${d.id}` === base.selected) || graph.nodes.some((n) => n.id === base.selected) || graph.edges.some((e) => e.id === base.selected)) ? base.selected : null;
    // A focus of a Proposal that is no longer open, or of a Task that is gone, ends here.
    const spec = base.focusRequest ? focusSpec(snapshot, base.focusRequest) : null;
    return { scene, graph, level, selected, proposalId, focusRequest: spec ? base.focusRequest : null, focus: spec ? diagramFocus(scene, graph, spec) : null };
  }

  /** Applies a change of the inputs and redraws. */
  const redraw = (patch: Partial<DiagramState>, fit = false) => emit({ ...patch, ...compute({ ...state, ...patch }) }, fit);

  /** Expands the States above a State or Transition, so the level shows it. */
  function expandAround(element: Element) {
    if (element.kind !== "state" && element.kind !== "transition") return;
    const set = expanded.get(element.machine.id) ?? new Set<string>();
    for (const name of pathTo(element.machine, element.state.name).slice(0, -1)) set.add(name);
    expanded.set(element.machine.id, set);
  }

  /**
   * Opens the level of the first element like a link, selects it (unless `select` is false) and fits the view to all `refs` that this level
   * draws. `level` forces the level, as a step of the focus does; without it the level stays when it already shows the element.
   */
  function openRefs(refs: string[], options: { drift?: string; select?: boolean; level?: Level } = {}) {
    const { drift, select = true } = options;
    const now = compute();
    if (!now.scene || !now.graph) return;
    const scene = now.scene;
    const elements = refs.map((r) => resolveElement(scene, r)).filter((e): e is Element => e !== null);
    const element = elements[0];
    if (!element) return;
    let level = now.level;
    if (options.level) {
      level = options.level;
      for (const e of elements) expandAround(e);
    } else if (alwaysOpens(element) || !showsElement(now.graph, element)) {
      // Staying on the level (with the origin it remembers) when it is the one the link leads to.
      const home = homeLevel(scene, element);
      level = sameLevel(now.level, home) ? now.level : home;
      expandAround(element);
    }
    const next = compute({ ...state, level });
    const graph = next.graph;
    if (!graph) return;
    const selected = drift !== undefined && graph.nodes.some((n) => n.id === `d:${drift}`) ? `d:${drift}` : select ? selectionFor(graph, element) : null;
    const fitTo = drift !== undefined ? null : [...new Set(elements.map((e) => selectionFor(graph, e)).filter((id): id is string => id !== null))];
    emit({ ...next, selected, fitTo }, true);
  }

  const navigateRef = (ref: string, drift?: string) => openRefs([ref], { drift });

  /**
   * Goes to where the open Drift is drawn (the level of its first reference that resolves) and selects it. A Drift that
   * points at no Model element is drawn floating on the System level, and that is where it is selected.
   */
  function navigateDrift(id: string) {
    const now = compute();
    if (now.scene?.unified.some((d) => d.id === id)) return redraw({ selected: `u:${id}` });
    const drift = now.scene?.drifts.find((d) => d.id === id);
    if (!now.scene || !drift) return redraw({});
    const scene = now.scene;
    const ref = drift.refs.find((r) => resolveElement(scene, r) !== null);
    if (ref) return navigateRef(ref, id);
    redraw({ level: { kind: "system" }, selected: `d:${id}` }, true);
  }

  /** A new focus replaces the old one and the Proposal drawn (only a Proposal's focus draws one), and goes to the first step. */
  function focusOn(request: FocusRequest) {
    const { snapshot } = state;
    const spec = snapshot ? focusSpec(snapshot, request) : null;
    if (!spec) return;
    state = { ...state, proposalId: spec.proposal, focusRequest: request };
    const first = compute().focus?.steps[0];
    if (first) openRefs(first.refs, { level: first.level, select: request.kind !== "proposal" });
    else redraw({ selected: null });
  }

  function apply(options: NavigateOptions) {
    if (options.focus) return focusOn(options.focus);
    const { snapshot } = state;
    if (options.proposal && snapshot && snapshot.proposals.some((p) => p.id === options.proposal)) state = { ...state, proposalId: options.proposal };
    if (options.drift) navigateDrift(options.drift);
    else if (options.ref) navigateRef(options.ref);
    else redraw({});
  }

  return {
    get: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update(snapshot, resolveBlocker, refinement = REFINEMENT_OFF) {
      const at = state.focus?.index ?? -1;
      const stepBefore = at >= 0 ? (state.focus?.steps[at]?.key ?? null) : null;
      state = { ...state, snapshot, resolveBlocker, refinement };
      if (pending) {
        const options = pending;
        pending = null;
        apply(options);
        return;
      }
      redraw({});
      // The focus is computed again on the new picture: it stays at its step while that exists, otherwise goes to the first.
      const first = state.focus?.steps[0];
      if (stepBefore !== null && first && !state.focus?.steps.some((s) => s.key === stepBefore)) openRefs(first.refs, { level: first.level, select: state.focusRequest?.kind !== "proposal" });
    },
    show(options) {
      if (!state.snapshot) {
        if (options.ref || options.proposal || options.drift || options.focus) pending = options;
        return;
      }
      if (options.ref || options.proposal || options.drift || options.focus) apply(options);
    },
    setLevel(target) {
      redraw({ level: target, selected: null }, !sameLevel(state.level, target));
    },
    select(id) {
      if (id !== state.selected) emit({ selected: id });
    },
    toggleState(name) {
      if (state.level.kind !== "machine") return;
      const set = expanded.get(state.level.machine) ?? new Set<string>();
      if (!set.delete(name)) set.add(name);
      expanded.set(state.level.machine, set);
      redraw({}, true);
    },
    chooseProposal(id) {
      redraw({ proposalId: id, focusRequest: null });
    },
    focusOn,
    stepFocus(delta) {
      const focus = state.focus;
      if (!focus || focus.steps.length === 0) return;
      const last = focus.steps.length - 1;
      // On a level with none of the focus, Previous goes to the first step and Next to the last.
      const to = focus.index < 0 ? (delta < 0 ? 0 : last) : Math.min(last, Math.max(0, focus.index + delta));
      const step = focus.steps[to];
      if (to !== focus.index && step) openRefs(step.refs, { level: step.level, select: state.focusRequest?.kind !== "proposal" });
    },
    clearFocus() {
      if (state.focusRequest) redraw({ focusRequest: null });
    },
    navigateRef: (ref) => navigateRef(ref),
    navigateDrift,
    drillOf(id) {
      const { scene, graph } = state;
      return scene && graph ? drillTarget(scene, graph, id) : null;
    },
    stateOf(id) {
      return state.graph?.nodes.find((n) => n.id === id)?.label ?? null;
    },
    refit() {
      emit({}, true);
    },
  };
}

/** The detail of the selection, or of the level, with the Requirement sections written for that element. */
export function currentDetail(state: DiagramState): Detail | null {
  const { scene, graph, selected, level, snapshot } = state;
  if (!scene || !graph) return null;
  const detail = detailOfSelection(scene, graph, selected);
  const node = graph.nodes.find((n) => n.id === selected);
  const edge = graph.edges.find((e) => e.id === selected);
  const levelOf = levelRef(level);
  // A Drift has no node reference of its own: its Requirements are those of what it points at.
  const own = detail.drift ? detail.drift.refs : node?.ref ? [node.ref] : edge ? edge.refs : selected === null && levelOf ? [levelOf] : [];
  const areas = snapshot?.areas ?? [];
  const items = requirementItems(areas, [...new Set(own)]);
  // A State or a Transition also shows the Requirements of what contains it, each under the name of its container.
  const inherited = containersOf(scene, node, edge).map((c) => ({ heading: `Requirements inherited from ${c.name}`, items: requirementItems(areas, [c.ref]) }));
  const sections = [...(items.length > 0 ? [{ heading: "Requirements", items }] : []), ...inherited.filter((s) => s.items.length > 0)];
  return sections.length === 0 ? detail : { ...detail, sections: [...detail.sections, ...sections] };
}
