import type { DriftView } from "../../../src/core/snapshot";

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
