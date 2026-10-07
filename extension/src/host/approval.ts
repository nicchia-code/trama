import { holdApproved, SCAN_HOLD_SAVE_FAILED } from "../../../src/core/scan-hold";
import { approvedScope } from "../../../src/core/scope";
import type { Project } from "../../../src/core/store";

export interface ApprovalOptions {
  project: Project;
  /** `trama.autoScan` */
  autoScan: boolean;
  /** Whether an agent can be started without asking anything (the chat, or a chosen terminal agent or command): otherwise nothing is launched. */
  agentConfigured: boolean;
  /** Starts ONE agent run that scans what `proposal` (its ID, as stored) changed, after its approval. */
  launchScan(proposal: string): Promise<void>;
  /** Shows a warning to the developer. */
  warn(message: string): void;
}

/**
 * Every way the panel makes a Proposal part of the Model goes through here, so the agreed rule holds for all of
 * them: after an approved Proposal, one Scan of the Features it affects. An import Proposal describes the code
 * as it is, so there is nothing to scan. With Hold scan on, the scan waits: the Proposal is held instead, even
 * without an agent command. `apply` does the approval (the Approve button, or accepting a Drift's
 * attached Proposal); if it throws, nothing is launched.
 */
export async function applyApprovedProposal(options: ApprovalOptions, proposalId: string, apply: () => void): Promise<void> {
  const { id, features } = approvedScope(options.project, proposalId, apply);
  if (features.length === 0 || !options.autoScan) return;
  try {
    if (holdApproved(options.project, id)) return;
  } catch {
    // The switch is on but the held list could not be written: the scan still waits, the developer is told.
    options.warn(SCAN_HOLD_SAVE_FAILED);
    return;
  }
  if (!options.agentConfigured) return;
  await options.launchScan(id);
}
