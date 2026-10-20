import { SPEC_FIELDS, type SpecField } from "../../../../src/core/specs";
import type { Snapshot } from "../../../../src/core/snapshot";
import { specsView } from "../specs/logic";
import { type FocusSpec, type Step, type Steps, isSpecsRef } from "./spec";

/** A field of the Specs, in the order of the page. */
export interface SpecStep extends Step {
  field: SpecField;
}

/**
 * The fields of the focus: the ones its `specs#<field>` references name, or every field for `specs`. A field that is empty or
 * absent in the drawn Specs is missing; references that are not about the Specs are not for this tab.
 */
export function specsSteps(snapshot: Snapshot, spec: FocusSpec): Steps<SpecStep> {
  const proposal = snapshot.proposals.find((p) => p.id === spec.proposal);
  const fields = specsView(snapshot, proposal);
  const wanted = new Set<SpecField>();
  const missing: string[] = [];
  for (const ref of spec.refs) {
    if (!isSpecsRef(ref)) continue;
    if (ref === "specs") {
      if (fields.length === 0) missing.push(ref);
      for (const view of fields) wanted.add(view.field);
      continue;
    }
    const field = SPEC_FIELDS.find((f) => f === ref.slice("specs#".length));
    if (field !== undefined && fields.some((view) => view.field === field)) wanted.add(field);
    else missing.push(ref);
  }
  return { steps: fields.filter((view) => wanted.has(view.field)).map((view) => ({ key: view.field, name: view.title, field: view.field })), missing };
}
