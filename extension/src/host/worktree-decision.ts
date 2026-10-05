import { TramaError } from "../../../src/core/errors";
import type { Project } from "../../../src/core/store";
import { resolveDrift } from "../../../src/core/work";
import { roundWorktrees, worktreePath } from "../../../src/core/worktree-round";

/**
 * Writes a Drift decision into the worktree it belongs to. Accepting the attached Proposal
 * applies it there and does not open another round. Returns the worktree folder.
 */
export function applyWorktreeDecision(
  open: Project,
  proposalId: string,
  driftId: string,
  how: "fix-code" | "accept-proposal" | "dismiss",
  skillsDirs: string[] = [],
  choice: { option?: number; note?: string } = {},
): string {
  const folder = roundWorktrees(open).find((item) => item.proposal === proposalId);
  if (!folder) throw new TramaError(`Proposal ${proposalId} is not in a worktree.`);
  resolveDrift(folder.project, driftId, how, skillsDirs, choice);
  return worktreePath(open.root, proposalId);
}
