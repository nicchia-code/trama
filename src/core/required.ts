// No Node imports: the webview shows the same reasons the CLI refuses with.

/** A required Proposal that is not yet part of the Model. */
export interface RequiredProposal {
  id: string;
  title: string;
  /** `missing`: no Proposal has that ID; `cycle`: it requires, directly or not, the Proposal that requires it. */
  status: "open" | "rejected" | "missing" | "cycle";
}

const REQUIRED_STATUS: Record<RequiredProposal["status"], string> = {
  open: "is not approved yet",
  rejected: "was rejected",
  missing: "does not exist",
  cycle: "requires this one back, in a cycle",
};

/** Why the required Proposals keep a Proposal from being approved, one line each. */
export const requiredReasons = (requires: RequiredProposal[]): string[] =>
  requires.map((r) => `Proposal ${r.id}${r.title ? ` "${r.title}"` : ""} ${REQUIRED_STATUS[r.status]}`);
