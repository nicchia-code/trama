import type { AgentAction } from "../protocol";

/** An action whose free text has been collected: the host asks for a missing design request first. */
export type ResolvedAction =
  | Exclude<AgentAction, { kind: "design" | "resolve-drifts" }>
  | { kind: "design"; prompt: string }
  /** A written design request, saved as `.trama/requests/<request>.md`. */
  | { kind: "written-design"; request: string }
  /** `drifts` are the Drifts open when the instruction is built, in creation order: the ones this run covers. */
  | { kind: "resolve-drifts"; drifts: string[] };

/** The one-line instruction that makes the external agent use the right Trama skill. */
export function buildPrompt(action: ResolvedAction): string {
  switch (action.kind) {
    case "design":
      return `Use the trama-design skill. ${action.prompt.trim()}`;
    case "written-design":
      return `Use the trama-design skill on the design request in \`.trama/requests/${action.request}.md\`. Bind the first Proposal you open to it with \`--request ${action.request}\`.`;
    case "resolve-drifts":
      return `Use the trama-resolve-drifts skill on the open Drifts ${action.drifts.join(", ")}: ask the developer what should happen for each one, then write one resolution Proposal.`;
    case "scan":
      return buildScanPrompt(action.feature === undefined ? [] : [action.feature]);
    case "implement":
      return `Use the trama-implement skill on Task ${action.task}.`;
    case "implement-all":
      return 'Use the trama-implement skill on every Task in the "todo" column. Take them from `trama task next --batch`, one group at a time, until it says there is none.';
    case "implement-design":
      return `Use the trama-implement skill on every Task of Proposal ${action.proposal} that is in the "todo" column. Take them from \`trama task next --batch --proposal ${action.proposal}\`, one group at a time, until it says there is none.`;
    case "import":
      return "Use the trama-import skill on this repository.";
  }
}

/** The scan prompt for one Feature, or the whole System when there is none, as the developer starts it by hand. It names no Proposal. */
export function buildScanPrompt(features: string[]): string {
  return features.length === 0
    ? "Use the trama-scan skill on the whole System."
    : `Use the trama-scan skill on the ${features.length === 1 ? "Feature" : "Features"} ${features.map((f) => `\`${f}\``).join(", ")}.`;
}

/**
 * The automatic scan after an approval: only what the Proposal changed, read from its scan scope. The run
 * stops after the scan; the Tasks it files stay in "todo".
 */
export function buildApprovalScanPrompt(proposal: string): string {
  return `Use the trama-scan skill on what Proposal ${proposal} changed: its scan scope is in \`trama proposal show ${proposal}\`. Link every Task you file to it with --proposal ${proposal}.`;
}

/** The scan that turning Hold scan off sends: one run over what the held Proposals changed, oldest first. One Proposal is the automatic scan's instruction. */
export function buildHeldScanPrompt(proposals: readonly string[]): string {
  if (proposals.length === 1) return buildApprovalScanPrompt(proposals[0] as string);
  return `Use the trama-scan skill on what Proposals ${proposals.join(", ")} changed: each scan scope is in \`trama proposal show <id>\`. Compare every reference once, against the current Model, and link every Task you file with --proposal to the most recent of those Proposals whose scan scope covers it.`;
}

/**
 * The name of the agent terminal that receives `action`'s instruction: the name of the Task or Proposal to implement, as
 * `short` gives it in this working copy (short number while live, else permanent identity: a design runs from an approved
 * Proposal, which has no number), or a fixed English word. A free terminal is reused only for the same name.
 */
export function terminalName(action: ResolvedAction, short: (kind: "task" | "proposal", id: string) => string): string {
  switch (action.kind) {
    case "implement":
      return short("task", action.task);
    case "implement-design":
      return short("proposal", action.proposal);
    case "implement-all":
      return "All tasks";
    case "import":
      return "Import";
    case "scan":
      return "Scan";
    case "design":
    case "written-design":
      return "Design";
    case "resolve-drifts":
      return "Drifts";
  }
}

/**
 * Ends an instruction with the request to write in `language` (`trama.language`), on the same line. Empty or blank text
 * asks nothing, so the instruction is exactly as built. The language is used trimmed, as typed.
 */
export function withLanguage(prompt: string, language: string): string {
  const typed = language.trim();
  return typed === "" ? prompt : `${prompt} Write everything you generate in ${typed}, except code, which always stays in English.`;
}
