import { getProposal } from "../../../src/core/proposals";
import { proposalScope } from "../../../src/core/scope";
import type { Project } from "../../../src/core/store";
import { loadModel } from "../../../src/core/store";

export interface ApprovalOptions {
  project: Project;
  /** `trama.autoScan` */
  autoScan: boolean;
  /** Whether `trama.agentCommand` is set: without it nothing can be launched. */
  agentConfigured: boolean;
  /** Starts ONE agent run that scans these Features. */
  launchScan(features: string[]): Promise<void>;
}

/**
 * Every way a Proposal becomes part of the Model goes through here, so the agreed rule holds for all of
 * them: after an approved Proposal, one Scan of the Features it affects. An import Proposal describes the code
 * as it is, so there is nothing to scan. `apply` does the approval (the Approve button, or accepting a Drift's
 * attached Proposal); if it throws, nothing is launched.
 */
export async function applyApprovedProposal(options: ApprovalOptions, proposalId: string, apply: () => void): Promise<void> {
  const { project } = options;
  const isImport = getProposal(project, proposalId).data.kind === "import";
  const scope = proposalScope(project, proposalId);
  apply();
  if (isImport || !options.autoScan || !options.agentConfigured) return;
  const existing = loadModel(project).features;
  const features = scope.filter((f) => existing.has(f));
  if (features.length > 0) await options.launchScan(features);
}
