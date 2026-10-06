import { approvedScope } from "../../../src/core/scope";
import type { Project } from "../../../src/core/store";

export interface ApprovalOptions {
  project: Project;
  /** `trama.autoScan` */
  autoScan: boolean;
  /** Whether `trama.agentCommand` is set: without it nothing can be launched. */
  agentConfigured: boolean;
  /** Starts ONE agent run that scans what `proposal` (its ID, as stored) changed, after its approval. */
  launchScan(proposal: string): Promise<void>;
}

/**
 * Every way a Proposal becomes part of the Model goes through here, so the agreed rule holds for all of
 * them: after an approved Proposal, one Scan of the Features it affects. An import Proposal describes the code
 * as it is, so there is nothing to scan. `apply` does the approval (the Approve button, or accepting a Drift's
 * attached Proposal); if it throws, nothing is launched.
 */
export async function applyApprovedProposal(options: ApprovalOptions, proposalId: string, apply: () => void): Promise<void> {
  const { id, features } = approvedScope(options.project, proposalId, apply);
  if (features.length === 0 || !options.autoScan || !options.agentConfigured) return;
  await options.launchScan(id);
}
