// No Node imports: the webview shows the same reasons the CLI refuses with.

/** A required Proposal that is not yet part of the Model. */
export interface RequiredProposal {
  id: string;
  title: string;
  /**
   * `draft`: the agent is still writing it; `open`: handed over, not approved yet; `missing`: no Proposal has that ID;
   * `cycle`: it requires, directly or not, the Proposal that requires it.
   */
  status: "draft" | "open" | "rejected" | "discarded" | "missing" | "cycle";
}

/** Why a required Proposal blocks, after its name. */
export const REQUIRED_STATUS: Record<RequiredProposal["status"], string> = {
  draft: "is still being written",
  open: "is not approved yet",
  rejected: "was rejected",
  discarded: "was discarded",
  missing: "does not exist",
  cycle: "requires this one back, in a cycle",
};

/** Why the required Proposals keep a Proposal from being approved, one line each. `name` says how a Proposal is written: by its short number, or by its identity by default. */
export const requiredReasons = (requires: RequiredProposal[], name: (id: string) => string = (id) => id): string[] =>
  requires.map((r) => `Proposal ${name(r.id)}${r.title ? ` "${r.title}"` : ""} ${REQUIRED_STATUS[r.status]}`);

/** Whether a Proposal that requires this one is written, drawn and validated on top of it: only live Proposals are applied. */
export const appliesUnder = (status: RequiredProposal["status"]): boolean => status === "draft" || status === "open";
