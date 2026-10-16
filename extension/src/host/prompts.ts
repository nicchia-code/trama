import type { AgentAction } from "../protocol";

/** An action whose free text has been collected: the host asks for a missing design request first. */
export type ResolvedAction =
  | Exclude<AgentAction, { kind: "design" | "resolve-drifts" }>
  | { kind: "design"; prompt: string }
  /** A written design request, saved as `.trama/requests/<request>.md`. */
  | { kind: "written-design"; request: string }
  /** A written design request that starts a project from scratch: the `trama-setup` skill, named `Setup`. */
  | { kind: "setup-request"; request: string }
  /** `automaticCollection` names the authorized snapshot; absent means the ordinary developer-question workflow. */
  | { kind: "resolve-drifts"; drifts: string[]; automaticCollection?: string };

/** The one-line instruction that makes the external agent use the right Trama skill. */
export function buildPrompt(action: ResolvedAction): string {
  switch (action.kind) {
    case "design":
      return `Use the trama-design skill. ${action.prompt.trim()}`;
    case "setup-request":
      return `Use the trama-setup skill on the project request in \`.trama/requests/${action.request}.md\`. Bind the setup Proposal you open to it with \`--request ${action.request}\`.`;
    case "written-design":
      return `Use the trama-design skill on the design request in \`.trama/requests/${action.request}.md\`. Bind the first Proposal you open to it with \`--request ${action.request}\`.`;
    case "resolve-drifts":
      return action.automaticCollection === undefined
        ? `Use the trama-resolve-drifts skill on the open Drifts ${action.drifts.join(", ")}: ask the developer what should happen for each one, then write one resolution Proposal.`
        : `Use the trama-resolve-drifts skill for automatic collection ${action.automaticCollection}, on only the named Drifts ${action.drifts.join(", ")}. Before each choice, run \`trama drift autopilot --json\` and use only Drifts still authorized for this collection. Choose only each Drift's first Fix option; never ask questions, edit the Model or Requirements, or implement code. If an authorized Drift cannot be resolved with that first Fix option, report it with \`trama agent-event failed --drift <id> --reason <reason>\` and omit it. Create and submit a resolution with \`trama proposal new --resolution --automatic\`, then hand control back to the host. Do not approve the Proposal or start a Run.`;
    case "scan":
      return buildScanPrompt(action.feature === undefined ? [] : [action.feature]);
    case "implement":
      return `Use the trama-implement skill on Task ${action.task}.`;
    case "implement-all":
      return 'Use the trama-implement skill on every Task in the "todo" column. Take them from `trama task next --batch --max {maxParallelAgents}`, one group at a time, until it says there is none.';
    case "import":
      return "Use the trama-import skill on this repository.";
  }
}

/** A restricted implementation Run: the Task identities are not named here, the agent reads the coordinator's current authorization before each group. */
export function buildAutomaticRunPrompt(collection: string): string {
  return `Use the trama-implement skill for automatic collection ${collection}. Before each group, run \`trama drift autopilot --json\` and take the authorized Task IDs from its \`tasks\` field, then select only those using \`trama task next --batch --task <id>… --max {maxParallelAgents}\`, passing each ID as a repeated \`--task\`. Do not use the general Task queue or start any other Task. If a Task cannot be started/completed or its check fails, report it with \`trama agent-event failed --task <id> --reason <reason>\`; if a Trama check was announced, also complete it with \`trama announce done <check-id> --failed\`. Stop when the authorized set has no runnable Tasks.`;
}

/** The scan prompt for one Feature, or the whole System when there is none, as the developer starts it by hand. It names no Proposal. */
export function buildScanPrompt(features: string[]): string {
  return features.length === 0
    ? "Use the trama-scan skill on the whole System."
    : `Use the trama-scan skill on the ${features.length === 1 ? "Feature" : "Features"} ${features.map((f) => `\`${f}\``).join(", ")}.`;
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
    case "implement-all":
      return "All tasks";
    case "import":
      return "Import";
    case "scan":
      return "Scan";
    case "design":
    case "written-design":
      return "Design";
    case "setup-request":
      return "Setup";
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
