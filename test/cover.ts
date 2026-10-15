import { writeFileSync } from "node:fs";
import { editInProposal } from "../src/core/proposals";
import type { Project } from "../src/core/store";

/**
 * Fixture: an ordinary Proposal gets one Task naming `refs`, so that its scope is covered. Call it before the hand-over:
 * writing a Task sends an open Proposal back to Draft.
 */
export function coverWithTask(p: Project, id: string, ...refs: string[]) {
  const file = editInProposal(p, id, "tasks/cover.md");
  writeFileSync(file, `---\ntechnical: false\nrefs: [${refs.join(", ")}]\n---\n\n# Cover\n`);
}
