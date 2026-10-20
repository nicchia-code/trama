import type { Snapshot } from "../../../../src/core/snapshot";
import type { NavigateOptions } from "../../protocol";
import { type Detail, containersOf, detailOfSelection, requirementItems } from "./details";
import { homeLevel, resolveElement, selectionFor, showsElement } from "./elements";
import { type GraphSpec, type Level, sameLevel } from "./graph";
import { buildGraph, drillTarget, validLevel } from "./levels";
import { type Scene, buildScene, pathTo } from "./scene";

/** The Model reference of what a level shows, for the Requirements attached to it. */
const levelRef = (level: Level): string | null =>
  level.kind === "feature" ? level.feature : level.kind === "machine" ? level.machine : level.kind === "state" ? `${level.machine}/${level.state}` : null;

/** What the Diagram shows. A new object for every change, so React re-renders only when something did. */
export interface DiagramState {
  snapshot: Snapshot | null;
  scene: Scene | null;
  graph: GraphSpec | null;
  level: Level;
  /** The open Proposal drawn over the Model. */
  proposalId: string | null;
  selected: string | null;
  /** Grows each time the drawing must be fitted to the view again. */
  fit: number;
  /** The reason Resolve Drifts is unavailable now, from the snapshot the Board also reads; null when it is available. */
  resolveBlocker: string | null;
  /** Whether the Advisor Scanner is on: the Scan button is then disabled. */
  advisorScanner: boolean;
}

export interface DiagramStore {
  get(): DiagramState;
  subscribe(listener: () => void): () => void;
  update(snapshot: Snapshot, resolveBlocker: string | null, advisorScanner: boolean): void;
  /** Called when the tab is shown or navigated to. */
  show(options: NavigateOptions): void;
  setLevel(target: Level): void;
  select(id: string | null): void;
  toggleState(state: string): void;
  chooseProposal(id: string | null): void;
  /** Goes to the level that shows the element and selects it. */
  navigateRef(ref: string): void;
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
    fit: 0,
    resolveBlocker: null,
    advisorScanner: false,
  };
  let pending: NavigateOptions | null = null;
  const expanded = new Map<string, Set<string>>();
  const listeners = new Set<() => void>();

  const emit = (patch: Partial<DiagramState>, fit = false) => {
    state = { ...state, ...patch, fit: fit ? state.fit + 1 : state.fit };
    for (const listener of listeners) listener();
  };

  /** Rebuilds the Scene and the graph of the current level from the state. */
  function compute(base: DiagramState = state): Pick<DiagramState, "scene" | "graph" | "level" | "selected" | "proposalId"> {
    const { snapshot } = base;
    if (!snapshot) return { scene: null, graph: null, level: base.level, selected: base.selected, proposalId: base.proposalId };
    const proposalId = base.proposalId && snapshot.proposals.some((p) => p.id === base.proposalId) ? base.proposalId : null;
    const scene = buildScene(snapshot, proposalId);
    const level = validLevel(scene, base.level);
    const graph = buildGraph(scene, level, expanded);
    const selected = base.selected && (graph.nodes.some((n) => n.id === base.selected) || graph.edges.some((e) => e.id === base.selected)) ? base.selected : null;
    return { scene, graph, level, selected, proposalId };
  }

  /** Applies a change of the inputs and redraws. */
  const redraw = (patch: Partial<DiagramState>, fit = false) => emit({ ...patch, ...compute({ ...state, ...patch }) }, fit);

  function navigateRef(ref: string, drift?: string) {
    const now = compute();
    if (!now.scene || !now.graph) return;
    const element = resolveElement(now.scene, ref);
    if (!element) return;
    let level = now.level;
    if (!showsElement(now.graph, element)) {
      level = homeLevel(element);
      if (element.kind === "state" || element.kind === "transition") {
        const set = expanded.get(element.machine.id) ?? new Set<string>();
        for (const name of pathTo(element.machine, element.state.name).slice(0, -1)) set.add(name);
        expanded.set(element.machine.id, set);
      }
    }
    const next = compute({ ...state, level });
    if (!next.graph) return;
    const selected = drift !== undefined && next.graph.nodes.some((n) => n.id === `d:${drift}`) ? `d:${drift}` : selectionFor(next.graph, element);
    emit({ ...next, selected }, true);
  }

  /**
   * Goes to where the open Drift is drawn (the level of its first reference that resolves) and selects it. A Drift that
   * points at no Model element is drawn floating on the System level, and that is where it is selected.
   */
  function navigateDrift(id: string) {
    const now = compute();
    const drift = now.scene?.drifts.find((d) => d.id === id);
    if (!now.scene || !drift) return redraw({});
    const scene = now.scene;
    const ref = drift.refs.find((r) => resolveElement(scene, r) !== null);
    if (ref) return navigateRef(ref, id);
    redraw({ level: { kind: "system" }, selected: `d:${id}` }, true);
  }

  function apply(options: NavigateOptions) {
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
    update(snapshot, resolveBlocker, advisorScanner) {
      state = { ...state, snapshot, resolveBlocker, advisorScanner };
      if (pending) {
        const options = pending;
        pending = null;
        apply(options);
      } else redraw({});
    },
    show(options) {
      if (!state.snapshot) {
        if (options.ref || options.proposal || options.drift) pending = options;
        return;
      }
      if (options.ref || options.proposal || options.drift) apply(options);
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
      redraw({ proposalId: id });
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
