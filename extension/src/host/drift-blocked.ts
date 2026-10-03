import type { ApprovalBlock } from "../../../src/core/proposals";

/** The button of the warning for a stale Proposal: it asks the agent to write a new one. */
export const REWORK_PROPOSAL = "Rework Proposal";

/** What the editor warning says when the developer keeps what happens but the Drift's attached Proposal cannot be approved. */
export function driftBlockedMessage(block: ApprovalBlock): string {
  switch (block.kind) {
    case "draft":
      return `${block.reason} Wait until the agent hands it over.`;
    case "rejected":
    case "discarded":
      return `${block.reason} It will not change the Model: keep what should happen to have the code fixed.`;
    default:
      return block.reason;
  }
}
