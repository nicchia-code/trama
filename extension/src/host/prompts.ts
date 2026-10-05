import type { AgentAction } from "../protocol";

/** An action whose free text has been collected: the host asks for a missing design request first. */
export type ResolvedAction =
  | Exclude<AgentAction, { kind: "design" | "rework-drift" }>
  | { kind: "design"; prompt: string }
  /** A written design request, saved as `.trama/requests/<request>.md`. */
  | { kind: "written-design"; request: string }
  /** `proposal` is the stale Proposal attached to the Drift, found by the host. */
  | { kind: "rework-drift"; drift: string; proposal: string };

/** The one-line instruction that makes the external agent use the right Trama skill. */
export function buildPrompt(action: ResolvedAction): string {
  switch (action.kind) {
    case "design":
      return `Use the trama-design skill. ${action.prompt.trim()}`;
    case "written-design":
      return `Use the trama-design skill on the design request in \`.trama/requests/${action.request}.md\`. Bind the first Proposal you open to it with \`--request ${action.request}\`.`;
    case "rework-drift":
      return `Use the trama-design skill, without asking questions. Proposal ${action.proposal}, attached to Drift ${action.drift}, is stale: write a new Proposal that makes the same change on the current Model and Requirements, hand it over, and attach it to the Drift in place of the stale one.`;
    case "scan":
      return buildScanPrompt(action.feature === undefined ? [] : [action.feature]);
    case "implement":
      return `Use the trama-implement skill on Task ${action.task}.`;
    case "implement-all":
      return 'Use the trama-implement skill on every Task in the "todo" column. Take each one from `trama task next`, one after the other, until it says there is none.';
    case "implement-design":
      return `Use the trama-implement skill on every Task of Proposal ${action.proposal} that is in the "todo" column. Take each one from \`trama task next --proposal ${action.proposal}\`, one after the other, until it says there is none.`;
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

/**
 * The name of the agent terminal that receives `action`'s instruction: the short number of the Task or Proposal to
 * implement, as `short` gives it in this working copy, or a fixed English word. A free terminal is reused only for the same name.
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
    case "rework-drift":
      return "Design";
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
