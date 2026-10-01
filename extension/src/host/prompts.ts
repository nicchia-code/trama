import type { AgentAction } from "../protocol";

/** An action whose free text has been collected: the host asks for a missing design request first. */
export type ResolvedAction = Exclude<AgentAction, { kind: "design" }> | { kind: "design"; prompt: string };

/** The one-line instruction that makes the external agent use the right Trama skill. */
export function buildPrompt(action: ResolvedAction): string {
  switch (action.kind) {
    case "design":
      return `Use the trama-design skill. ${action.prompt.trim()}`;
    case "scan":
      return buildScanPrompt(action.feature === undefined ? [] : [action.feature]);
    case "implement":
      return `Use the trama-implement skill on Task ${action.task}.`;
    case "implement-all":
      return 'Use the trama-implement skill on every Task in the "todo" column, in order, one after the other. Stop at the first Drift you file.';
  }
}

/** The scan prompt for several Features at once (after an approval); none means the whole System. */
export function buildScanPrompt(features: string[]): string {
  if (features.length === 0) return "Use the trama-scan skill on the whole System.";
  return `Use the trama-scan skill on the ${features.length === 1 ? "Feature" : "Features"} ${features.map((f) => `\`${f}\``).join(", ")}.`;
}
