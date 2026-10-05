/**
 * After a worktree command ends: the scan's follow-up runs only when that scan created Tasks and some Task of a
 * Proposal still in the round is not Done. Anything else, including the implement command itself, stops here.
 * Merging is a later step and is not decided here.
 */
export function shouldRunProposalTasks(input: {
  kind: "scan" | "implement";
  /** Task ids of this Proposal in the worktree before the command. */
  before: readonly string[];
  /** Task ids of this Proposal in the worktree after the command. */
  after: readonly string[];
  /** Columns of the Tasks of every Proposal still in the round. */
  columns: readonly string[];
}): boolean {
  if (input.kind !== "scan") return false;
  const known = new Set(input.before);
  const born = input.after.some((id) => !known.has(id));
  return born && input.columns.some((column) => column !== "done");
}
