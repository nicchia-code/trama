import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Project } from "../src/core/store";
import { getProposal } from "../src/core/proposals";

/**
 * Fixture: the agent has finished writing and handed the Proposals over. Unlike `submitProposal` it checks nothing,
 * so a test can hand over a Proposal that is deliberately invalid. Call it after the last edit: an edit sends an open Proposal back to Draft.
 */
export function handOver(p: Project, ...ids: string[]) {
  for (const id of ids) {
    const file = join(getProposal(p, id).dir, "proposal.md");
    writeFileSync(file, readFileSync(file, "utf8").replace(/^status: draft$/m, "status: open"));
  }
}
