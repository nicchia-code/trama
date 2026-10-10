import { approvedScope } from "../../../src/core/scope";
import type { Project } from "../../../src/core/store";

export interface ApprovalOptions {
  project: Project;
  /** `trama.autoScan` */
  autoScan: boolean;
  /** Starts ONE agent run that scans what `proposal` (its ID, as stored) changed, after its approval. */
  launchScan(proposal: string): Promise<void>;
  /** Shows a warning to the developer. */
  warn(message: string): void;
}

/**
 * Every way the panel makes a Proposal part of the Model goes through here: after an approved Proposal, one Scan
 * of the Features it affects. An import Proposal describes the code as it is, so there is nothing to scan.
 * `apply` does the approval (the Approve button, or accepting a Drift's attached Proposal); if it throws, nothing
 * is launched.
 */
export async function applyApprovedProposal(options: ApprovalOptions, proposalId: string, apply: () => void): Promise<void> {
  const { id, features } = approvedScope(options.project, proposalId, apply);
  if (features.length === 0 || !options.autoScan) return;
  await options.launchScan(id);
}
