import { TramaError } from "../../../src/core/errors";
import { cardName } from "../../../src/core/short-numbers";
import type { Project } from "../../../src/core/store";
import { resolveDrift } from "../../../src/core/work";
import { mergeWorktreeOpen, roundWorktrees, worktreePath } from "../../../src/core/worktree-round";

/**
 * Writes a Drift decision into the worktree it belongs to. Accepting the attached Proposal
 * applies it there and does not open another round. A fix Task born there belongs to the worktree's Proposal,
 * so the resumed run takes it and the merge waits for it. Returns the worktree folder.
 * Refused once the round has started merging: the merge would throw away whatever the decision starts.
 */
export function applyWorktreeDecision(
  open: Project,
  proposalId: string,
  driftId: string,
  how: "fix-code" | "accept-proposal" | "dismiss",
  skillsDirs: string[] = [],
  choice: { option?: number; note?: string } = {},
): string {
  if (mergeWorktreeOpen(open.root)) throw new TramaError("The worktree round has started merging, so its Drifts can no longer be decided.");
  const folder = roundWorktrees(open).find((item) => item.proposal === proposalId);
  if (!folder) throw new TramaError(`Proposal ${cardName(open, "proposal", proposalId)} is not in a worktree.`);
  resolveDrift(folder.project, driftId, how, skillsDirs, how === "fix-code" ? { ...choice, proposal: proposalId } : choice);
  return worktreePath(open.root, proposalId);
}
