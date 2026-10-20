import type { Snapshot } from "../../../../src/core/snapshot";
import type { FocusRequest } from "../../protocol";
import { buildScene } from "../diagram/scene";
import { diagramSteps } from "./diagram";
import { requirementSteps } from "./requirements";
import { focusSpec } from "./spec";
import { specsSteps } from "./specs";

export type FocusTab = "diagram" | "requirements" | "specs";

/**
 * How many steps a focus would have in a tab on this snapshot (`rules#focus`): a Proposal's on the Model drawn with it, a
 * Task's or a chip's on the Model without a Proposal. A View button shows only when this is at least 1; missing references do
 * not count. 0 when the Proposal is no longer open or the Task no longer exists.
 */
export function focusStepCount(snapshot: Snapshot, focus: FocusRequest, tab: FocusTab): number {
  const spec = focusSpec(snapshot, focus);
  if (!spec) return 0;
  if (tab === "diagram") return diagramSteps(buildScene(snapshot, spec.proposal), spec.refs).steps.length;
  if (tab === "requirements") return requirementSteps(snapshot, spec).steps.length;
  return specsSteps(snapshot, spec).steps.length;
}
