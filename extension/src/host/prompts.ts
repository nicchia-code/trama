import type { AgentAction } from "../protocol";

/** An action whose free text has been collected: the host asks for a missing design request first. */
export type ResolvedAction = Exclude<AgentAction, { kind: "design" | "fix" }> | { kind: "design" | "fix"; prompt: string };

/** The one-line instruction that makes the external agent use the right Trama skill. */
export function buildPrompt(action: ResolvedAction): string {
  switch (action.kind) {
    case "design":
      return `Use the trama-design skill. ${action.prompt.trim()}`;
    case "fix":
      return `Use the trama-fix skill. ${action.prompt.trim()}`;
    case "scan":
      return buildScanPrompt(action.feature === undefined ? [] : [action.feature]);
    case "implement":
      return `Use the trama-implement skill on Task ${action.task}.`;
    case "implement-all":
      return 'Use the trama-implement skill on every Task in the "todo" column, in order, one after the other. Skip the Tasks that are blocked and go on with the others, also after you file a Drift; at the end list the Tasks you skipped with the Drift that blocks each.';
    case "implement-design":
      return `Use the trama-implement skill on every Task of Proposal ${action.proposal} that is in the "todo" column, in order, one after the other. Skip the Tasks that are blocked and go on with the others, also after you file a Drift; at the end list the Tasks you skipped with the Drift that blocks each.`;
    case "import":
      return "Use the trama-import skill on this repository.";
  }
}

/**
 * The scan prompt for several Features at once (after an approval); none means the whole System. After an approval,
 * `proposal` names the approved Proposal, so the agent links every Task it files to it; a scan started by hand names none.
 */
export function buildScanPrompt(features: string[], proposal?: string): string {
  const scope =
    features.length === 0
      ? "Use the trama-scan skill on the whole System."
      : `Use the trama-scan skill on the ${features.length === 1 ? "Feature" : "Features"} ${features.map((f) => `\`${f}\``).join(", ")}.`;
  return proposal === undefined ? scope : `${scope} The scan follows the approval of Proposal ${proposal}: link every Task you file to it with --proposal ${proposal}.`;
}
