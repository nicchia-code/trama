import { type KeyboardEvent, type RefObject, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cardLabel, noNumbers } from "../../../../src/core/card-names";
import { REFINEMENT_OFF, refineStatus } from "../board/logic";
import { FocusBar } from "../focus/bar";
import { FOCUSED_REASON } from "../proposal-select";
import type { MountView, ViewContext } from "../types";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { type Canvas, type HandleBox, createCanvas } from "./canvas";
import { detailOfSelection, tooltipOf } from "./details";
import { canExpand } from "./graph";
import { breadcrumb, isEmptyModel } from "./levels";
import { ActionButton, DiagramDetails } from "./panel";
import { type DiagramStore, createDiagramStore } from "./state";

const NO_PROPOSAL = "none";

const LEGEND: { swatch: string; label: string }[] = [
  { swatch: "w-6 h-3 border-2 border-dashed border-blue-600 bg-blue-600/15 dark:border-blue-400 dark:bg-blue-400/15", label: "Proposal adds it" },
  { swatch: "w-6 h-3 border-2 border-dashed border-red-600 opacity-55 dark:border-red-400", label: "Proposal removes it" },
  { swatch: "w-6 h-3 border-[3px] border-solid border-blue-600 dark:border-blue-400", label: "Proposal changes it" },
  { swatch: "w-6 h-3 rounded-[7px] border-2 border-dashed border-red-600 bg-red-600/15 dark:border-red-400 dark:bg-red-400/15", label: "Drift" },
  { swatch: "w-3 h-3 mx-1.5 rounded-full bg-foreground", label: "Initial State" },
  { swatch: "w-6 h-3.5 rounded border-[5px] border-double border-foreground", label: "Final State" },
];

/** The cytoscape drawing: the instance is created once and every picture of the Model only updates it. */
function DiagramCanvas({ store, stage, canvasRef }: { store: DiagramStore; stage: RefObject<HTMLDivElement | null>; canvasRef: RefObject<Canvas | null> }) {
  const state = useSyncExternalStore(store.subscribe, store.get);
  const container = useRef<HTMLDivElement>(null);
  const fitSeen = useRef(0);
  const [handles, setHandles] = useState<HandleBox[]>([]);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);

  useEffect(() => {
    const el = container.current;
    const host = stage.current;
    if (!el || !host) return;
    const canvas = createCanvas(el, {
      select: (id) => store.select(id),
      drill: (id) => {
        const target = store.drillOf(id);
        if (target) store.setLevel(target);
      },
      hover(target) {
        if (!target) return setTip(null);
        const { scene, graph } = store.get();
        const text = scene && graph ? tooltipOf(detailOfSelection(scene, graph, target.id)) : "";
        setTip(text ? { text, x: Math.min(target.x + 14, host.clientWidth - 280), y: target.y + 16 } : null);
      },
      handles: setHandles,
    });
    canvasRef.current = canvas;
    const resize = new ResizeObserver(() => canvas.resize());
    resize.observe(host);
    // The theme is the class `dark` of the root; the canvas takes the new colours when it changes.
    const recolour = new MutationObserver(() => canvas.restyle());
    recolour.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      resize.disconnect();
      recolour.disconnect();
      canvas.destroy();
      canvasRef.current = null;
    };
  }, [store, stage, canvasRef]);

  useEffect(() => {
    canvasRef.current?.select(state.selected);
  }, [state.selected, canvasRef]);

  useEffect(() => {
    const { graph, fit, fitTo, fitSmooth, focus } = state;
    if (!graph) return;
    const refit = fit !== fitSeen.current;
    fitSeen.current = fit;
    void canvasRef.current?.render(graph, refit, fitTo, focus?.highlight, fitSmooth);
  }, [state.graph, state.fit, state.fitTo, state.fitSmooth, state.focus, canvasRef]);

  const graph = state.graph;
  return (
    <>
      {/* Inline, not Tailwind classes: cytoscape adds its own unlayered `position: relative` to the container, which beats Tailwind's layered utilities and would leave the canvas with no height. */}
      <div ref={container} style={{ position: "absolute", inset: 0 }} />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {graph
          ? handles.map((box) => {
              const node = graph.nodes.find((n) => n.id === box.id);
              if (!node) return null;
              return (
                <div key={box.id} className="pointer-events-auto absolute flex gap-0.5" style={{ left: box.right, top: box.top, transform: "translateX(-100%)" }}>
                  {canExpand(graph, node) ? <HandleButton glyph={node.expanded ? "▾" : "▸"} title={`${node.expanded ? "Collapse" : "Expand"} ${node.label}`} onClick={() => store.toggleState(node.label)} /> : null}
                  <HandleButton
                    glyph="↗"
                    title={`Drill into ${node.label}`}
                    onClick={() => {
                      const target = store.drillOf(node.id);
                      if (target) store.setLevel(target);
                    }}
                  />
                </div>
              );
            })
          : null}
      </div>
      {tip ? (
        <div className="pointer-events-none absolute z-30 max-w-[270px] rounded-md border bg-popover px-2 py-1.5 text-xs whitespace-pre-wrap text-popover-foreground shadow-lg" style={{ left: tip.x, top: tip.y }}>
          {tip.text}
        </div>
      ) : null}
    </>
  );
}

function HandleButton({ glyph, title, onClick }: { glyph: string; title: string; onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          className="size-5 rounded p-0 text-xs leading-none"
          aria-label={title}
          onClick={(event) => {
            event.stopPropagation();
            onClick();
          }}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          {glyph}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  );
}

export function DiagramView({ store, context }: { store: DiagramStore; context: ViewContext }) {
  const state = useSyncExternalStore(store.subscribe, store.get);
  const stage = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<Canvas | null>(null);
  const { snapshot, scene, graph, level } = state;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "+" || e.key === "=") canvasRef.current?.zoomBy(1.25);
    else if (e.key === "-") canvasRef.current?.zoomBy(0.8);
    else if (e.key === "0") canvasRef.current?.fit();
    // With an element selected the first Esc takes only the selection off; the focus goes with the next one, handled by the whole tab.
    else if (e.key === "Escape" && state.selected !== null) {
      store.select(null);
      e.preventDefault();
    }
  };

  const trail = scene ? breadcrumb(scene, level) : [];

  return (
    <TooltipProvider>
      <div
        tabIndex={-1}
        className="flex h-full flex-col overflow-hidden outline-none"
        onKeyDown={(e) => {
          // A modal, drop-down, popover or tooltip that is open takes the Esc first and marks the event handled.
          if (e.key === "Escape" && state.focus && !e.defaultPrevented) store.clearFocus();
        }}
      >
        <div className="flex flex-wrap items-center gap-2 border-b px-2.5 py-1.5">
          <nav className="flex min-w-0 flex-wrap items-center gap-0.5" aria-label="Zoom level">
            {trail.map((crumb, i) => {
              const last = i === trail.length - 1;
              return (
                <span key={i} className="flex items-center">
                  {i > 0 ? <span className="px-0.5 opacity-50">›</span> : null}
                  <Button variant="ghost" size="sm" className={last ? "font-semibold" : ""} aria-current={last ? "page" : undefined} title={crumb.label === "System" ? (scene?.system.name ?? "") : undefined} onClick={() => store.setLevel(crumb.level)}>
                    {crumb.label}
                  </Button>
                </span>
              );
            })}
          </nav>
          <span className="flex-1" />
          <label className="flex items-center gap-1.5 text-muted-foreground">
            Proposal
            <Select value={state.proposalId ?? NO_PROPOSAL} disabled={state.focus !== null} onValueChange={(value) => store.chooseProposal(value === NO_PROPOSAL ? null : value)}>
              <SelectTrigger className="max-w-[380px]" aria-label="Proposal to draw over the Model" aria-description={state.focus ? FOCUSED_REASON : undefined}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PROPOSAL}>None</SelectItem>
                {(snapshot?.proposals ?? []).map((p) => {
                  const marks = [refineStatus(p, state.refinement) === "to-refine" ? "to refine" : p.stale.length > 0 ? "stale" : "", p.unbased.length > 0 ? "unbased" : "", p.errors.length > 0 ? "invalid" : "", p.unfixable.length > 0 ? "unfixable" : ""].filter(Boolean);
                  return (
                    <SelectItem key={p.id} value={p.id}>
                      {`${cardLabel(snapshot?.numbers ?? noNumbers, "proposal", p.id)} · ${p.title}${marks.length > 0 ? ` ⚠ ${marks.join(", ")}` : ""}`}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </label>
          <span className="inline-flex gap-0.5" role="group" aria-label="Zoom">
            <ZoomButton label="−" name="Zoom out" tooltip="Zoom out (-)" onClick={() => canvasRef.current?.zoomBy(0.8)} />
            <ZoomButton label="+" name="Zoom in" tooltip="Zoom in (+)" onClick={() => canvasRef.current?.zoomBy(1.25)} />
            <ZoomButton label="Fit" name="Fit to view" tooltip="Fit to view (0)" onClick={() => canvasRef.current?.fit()} />
          </span>
        </div>
        {state.focus ? (
          <FocusBar
            title={state.focus.title}
            stepName={state.focus.steps[state.focus.index]?.name ?? ""}
            index={state.focus.index}
            count={state.focus.steps.length}
            missing={state.focus.missing}
            onPrevious={() => store.stepFocus(-1)}
            onNext={() => store.stepFocus(1)}
            onClear={() => store.clearFocus()}
          />
        ) : null}
        <div className="flex min-h-0 flex-1">
          {/* Cytoscape handles pointer events itself and blurs the page on mousedown, so the stage is focused once the button is released; otherwise the shortcuts never fire. */}
          <div
            ref={stage}
            tabIndex={0}
            aria-label="Diagram"
            className="relative min-w-0 flex-1 bg-background outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            onPointerUp={(e) => e.currentTarget.focus({ preventScroll: true })}
            onKeyDown={onKeyDown}
          >
            <DiagramCanvas store={store} stage={stage} canvasRef={canvasRef} />
            {scene && isEmptyModel(scene) ? (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-start gap-3 p-6 text-center text-muted-foreground">
                <p className="pointer-events-auto max-w-[60ch]">
                  The Model is empty. Import the existing code or start from scratch; later, design changes from the{" "}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="link" className="h-auto p-0" aria-label="Open the Board" onClick={() => context.navigate("board")}>
                        Board
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Open the Board</TooltipContent>
                  </Tooltip>
                  .
                </p>
                <div className="pointer-events-auto flex justify-center gap-2">
                  <ActionButton label="Import from Code" tooltip="Open the guided setup to describe the existing code as Proposals" onClick={() => context.post({ type: "openGuidedSetup", choice: "import" })} />
                  <ActionButton label="Start from Scratch" tooltip="Open the guided setup to describe the project you want to build" onClick={() => context.post({ type: "openGuidedSetup", choice: "scratch" })} />
                </div>
              </div>
            ) : null}
            <details open className="absolute bottom-2.5 left-2.5 z-10 rounded-md border bg-card px-2.5 py-1 text-xs text-card-foreground shadow-sm">
              <summary className="cursor-pointer text-muted-foreground">Legend</summary>
              <ul className="mt-1.5 mb-0.5">
                {LEGEND.map((row) => (
                  <li key={row.label} className="my-1 flex items-center gap-2">
                    <span className={`inline-block flex-none box-border ${row.swatch}`} />
                    {row.label}
                  </li>
                ))}
              </ul>
            </details>
          </div>
          <aside aria-label="Details" className="w-[340px] flex-none overflow-auto border-l bg-card px-3.5 pt-3 pb-6 text-card-foreground">
            {graph ? <DiagramDetails store={store} context={context} /> : null}
          </aside>
        </div>
      </div>
    </TooltipProvider>
  );
}

function ZoomButton({ label, name, tooltip, onClick }: { label: string; name: string; tooltip: string; onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" size="sm" aria-label={name} onClick={onClick}>
          {label}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

/** Mounts the read-only Diagram. Everything it changes goes through `context.post`; the Model is never edited here. */
export const mountDiagram: MountView = (slot, context: ViewContext) => {
  const store = createDiagramStore();
  slot(<DiagramView store={store} context={context} />);
  return {
    update(next, _asking, resolve, refinement) {
      store.update(next, resolve?.blocker ?? null, refinement ?? REFINEMENT_OFF);
    },
    show(options) {
      store.show(options);
    },
  };
};
