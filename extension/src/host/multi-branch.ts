import { multiBranchOn, readMultiBranch } from "../../../src/core/multi-branch";
import type { Project } from "../../../src/core/store";

/** The switch is on only when this working copy's file reads as `on`. A settings key is never read. */
export const projectMultiBranch = (project: Project): boolean => multiBranchOn(readMultiBranch(project));

/**
 * The user settings have no `trama.worktreeAgent` key yet.
 * An empty string is already a value and must be left as it is, so writing the default does not erase a command.
 */
export function worktreeAgentMissing(globalValue: unknown): boolean {
  return globalValue === undefined;
}

/** A Drift's Proposal is applied in the open folder even when multi-branch is on. */
export function approvalRoute(multiBranch: boolean, viaDrift: boolean): "worktree" | "folder" {
  return multiBranch && !viaDrift ? "worktree" : "folder";
}
