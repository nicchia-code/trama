import { cardLabel, noNumbers } from "../../../../src/core/card-names";
import type { Snapshot } from "../../../../src/core/snapshot";
import type { FocusRequest } from "../../protocol";

/** What a focus request starts from: the references its steps are computed from, and the Proposal it draws. */
export interface FocusSpec {
  request: FocusRequest;
  /** `Proposal P3 – title`, `Task T3 – title`, or the reference of a chip. */
  title: string;
  /** The Proposal's scope, the Task's references, or the chip's one reference (`rules#focus`). */
  refs: string[];
  /** The Proposal a Proposal focus draws; a Task or a chip draws none. */
  proposal: string | null;
}

/** The focus of a request on this snapshot; null when the Proposal is no longer open or the Task no longer exists. */
export function focusSpec(snapshot: Snapshot, request: FocusRequest): FocusSpec | null {
  const numbers = snapshot.numbers ?? noNumbers;
  if (request.kind === "proposal") {
    const proposal = snapshot.proposals.find((p) => p.id === request.id);
    if (!proposal) return null;
    return { request, title: `Proposal ${cardLabel(numbers, "proposal", proposal.id)} – ${proposal.title}`, refs: proposal.scope, proposal: proposal.id };
  }
  if (request.kind === "task") {
    const task = snapshot.tasks.find((t) => t.id === request.id);
    if (!task) return null;
    return { request, title: `Task ${cardLabel(numbers, "task", task.id)} – ${task.title}`, refs: task.refs, proposal: null };
  }
  return { request, title: request.ref, refs: [request.ref], proposal: null };
}

/** One step of a focus: `key` is stable across snapshots, so a focus can stay where it was when the picture changes. */
export interface Step {
  key: string;
  /** The level's name in the Diagram, the section, the Area or the field in the other tabs. */
  name: string;
}

/** The steps of a focus on one tab and the references it names that the tab does not have. */
export interface Steps<S extends Step> {
  steps: S[];
  missing: string[];
}

export const isSpecsRef = (ref: string): boolean => ref === "specs" || ref.startsWith("specs#");

/** The position of the step a focus is at: its own while it exists, otherwise the first (`rules#focus`); -1 with no step. */
export function stepIndex(steps: readonly Step[], key: string | null): number {
  const at = key === null ? -1 : steps.findIndex((s) => s.key === key);
  return at >= 0 ? at : steps.length > 0 ? 0 : -1;
}

/** The step before or after the current one, never beyond the first or the last. */
export function neighbour(steps: readonly Step[], key: string | null, delta: -1 | 1): Step | null {
  const at = stepIndex(steps, key);
  return at < 0 ? null : (steps[Math.min(steps.length - 1, Math.max(0, at + delta))] ?? null);
}
