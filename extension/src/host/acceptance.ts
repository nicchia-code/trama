import { acceptIntoWorktree } from "../../../src/core/worktree-round";
import type { Project } from "../../../src/core/store";
import { buildScanPrompt, withLanguage } from "./prompts";

export interface OrdinaryAcceptance {
  project: Project;
  autoScan: boolean;
  worktreeAgent: string;
  /** `trama.language`, already trimmed by the caller when it wants; blank asks for no language. */
  language: string;
  warn(message: string): void;
  /** Starts the worktree agent with the scan instruction. The open folder is already unchanged. */
  startAgent(worktree: string, prompt: string): Promise<void>;
}

/**
 * Accepts one ordinary Proposal into a worktree and starts its agent on the scan of the Features it affects.
 * A refusal leaves the Proposal open and tells the developer why. Returns whether the agent was started.
 */
export async function acceptOrdinaryProposal(options: OrdinaryAcceptance, proposalId: string): Promise<boolean> {
  const result = acceptIntoWorktree(options.project, proposalId, {
    autoScan: options.autoScan,
    worktreeAgent: options.worktreeAgent,
  });
  if (!result.ok) {
    options.warn(result.message);
    return false;
  }
  const prompt = withLanguage(buildScanPrompt(result.acceptance.features, proposalId), options.language);
  await options.startAgent(result.acceptance.worktree, prompt);
  return true;
}
