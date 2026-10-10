import type { DriftView } from "../../../src/core/snapshot";
import { renderMarkdown } from "./markdown";

export interface DriftComparison {
  happens: string;
  should: string;
  /** What the "should" side is: the Model, or the Requirements when the Drift points only to them. */
  shouldSource: "Model" | "Requirements";
}

const LEGACY_SHOULD = "Not stated: this Drift was written before the two sides existed.";

/** The two sides shown for an open Drift in the Diagram and on the Board. */
export function driftComparison(d: DriftView): DriftComparison {
  return {
    happens: d.sides?.happens ?? d.body,
    should: d.sides?.should ?? LEGACY_SHOULD,
    shouldSource: d.requirementsOnly ? "Requirements" : "Model",
  };
}

export interface DriftHandlers {
  /** An http or https link of a rendered text was followed. */
  openLink(url: string): void;
}

function column(heading: string, source: string | null, text: string, handlers: DriftHandlers): HTMLElement {
  const col = document.createElement("section");
  col.className = "drift-compare-col";
  const head = document.createElement("h4");
  head.className = "drift-compare-head";
  head.textContent = heading;
  if (source !== null) {
    const span = document.createElement("span");
    span.className = "drift-compare-source";
    span.textContent = source;
    head.append(" ", span);
  }
  const body = renderMarkdown(text, handlers.openLink);
  body.classList.add("drift-compare-text");
  col.append(head, body);
  return col;
}

/** The two sides of a Drift side by side, stacked (what happens first) when narrow. Nothing here decides on the Drift. */
export function renderDriftCompare(d: DriftView, handlers: DriftHandlers): HTMLElement {
  const c = driftComparison(d);
  const grid = document.createElement("div");
  grid.className = "drift-compare";
  grid.append(column("What happens", null, c.happens, handlers), column("What should happen", c.shouldSource, c.should, handlers));
  return grid;
}
