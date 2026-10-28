import type { DriftView } from "../../../src/core/snapshot";
type DifferenceView = DriftView["differences"][number];

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

/** The two sides of one difference of a unified Drift: `Requirements` when every reference of the difference is a Requirement reference, as for a Drift. */
export function differenceComparison(d: DifferenceView): DriftComparison {
  return {
    happens: d.sides?.happens ?? "Not stated.",
    should: d.sides?.should ?? "Not stated.",
    shouldSource: d.refs.every((r) => r.startsWith("requirements/")) ? "Requirements" : "Model",
  };
}
