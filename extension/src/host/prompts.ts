import type { AgentAction, RunGroup } from "../protocol";

/** An action whose free text has been collected. */
export type ResolvedAction =
  | Exclude<AgentAction, { kind: "resolve-drifts" }>
  /** A written design request, saved as `.trama/requests/<request>.md`. */
  | { kind: "written-design"; request: string }
  /** A written design request that starts a project from scratch: the `trama-setup` skill, named `Setup`. */
  | { kind: "setup-request"; request: string }
  /** Resolve Drifts on the one Drift the developer chose: always a manual request, answered with a round of questions. */
  | { kind: "resolve-drifts"; drift: string };

/** The one-line instruction that makes the external agent use the right Trama skill. */
export function buildPrompt(action: ResolvedAction): string {
  switch (action.kind) {
    case "setup-request":
      return `Use the trama-setup skill on the project request in \`.trama/requests/${action.request}.md\`. Bind the setup Proposal you open to it with the \`request\` field.`;
    case "written-design":
      return `Use the trama-design skill on the design request in \`.trama/requests/${action.request}.md\`. Bind the first Proposal you open to it with the \`request\` field.`;
    case "resolve-drifts":
      return `Use the trama-resolve-drifts skill on the open Drift ${action.drift}, and on no other open Drift: ask the developer what should happen for it, then write one resolution Proposal.`;
    case "scan":
      return buildScanPrompt(action.feature === undefined ? [] : [action.feature]);
    case "implement":
      return `Use the trama-implement skill on Task ${action.task}.`;
    case "implement-all":
      return runAllPrompt(action.group);
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

/** The Run all instruction: the plain one, or, for a group cut by Proposal, the one that names its Proposals and the filters `trama task list` takes them by. */
function runAllPrompt(group: RunGroup | undefined): string {
  const include = group?.include ?? [];
  const exclude = group?.exclude ?? [];
  const named = (ids: string[]) => `${ids.length === 1 ? "the Proposal" : "the Proposals"} ${ids.map((id) => `\`${id}\``).join(", ")}`;
  const list = (field: "proposals" | "notProposals", ids: string[]) => `\`trama task list --input '{"runnable":true,"${field}":[${ids.map((id) => `"${id}"`).join(",")}],"max":{maxParallelAgents}}'\``;
  if (include.length > 0)
    return `Use the trama-implement skill on every Task in the "todo" column that belongs to ${named(include)}. Take them from ${list("proposals", include)}, one group at a time, until it says there is none.`;
  if (exclude.length > 0)
    return `Use the trama-implement skill on every Task in the "todo" column except those of ${named(exclude)}. Take them from ${list("notProposals", exclude)}, one group at a time, until it says there is none.`;
  return 'Use the trama-implement skill on every Task in the "todo" column. Take them from `trama task list --input \'{"runnable":true,"max":{maxParallelAgents}}\'`, one group at a time, until it says there is none.';
}

/** The name of a Run all terminal: `All tasks` for the Settings group, `All tasks · <model>` for a sequence group, its model as written, trimmed. */
export function runTerminalName(model?: string): string {
  const name = model?.trim() ?? "";
  return name === "" ? "All tasks" : `All tasks · ${name}`;
}

/**
 * The name of the agent terminal that receives `action`'s instruction: the short number of the Task to implement, as
 * `short` gives it in this working copy (short number while live, else permanent identity), or a fixed English word.
 * A free terminal is reused only for the same name.
 */
export function terminalName(action: ResolvedAction, short: (kind: "task" | "proposal", id: string) => string): string {
  switch (action.kind) {
    case "implement":
      return short("task", action.task);
    case "implement-all":
      return runTerminalName(action.group?.model);
    case "import":
      return "Import";
    case "scan":
      return "Scan";
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

/** The sentence the experimental Drift blocker adds to an instruction whose agent may file Drifts (`trama.experimentalDriftBlocker`). */
export const DRIFT_BLOCKER_SENTENCE = "The experimental Drift blocker is on: follow its steps whenever you file a Drift, and tell your sub-agents.";

/** The sentence the experimental parallel execution adds to the instruction of a run over several Tasks (`trama.experimentalParallelExecution`). */
export const PARALLEL_EXECUTION_SENTENCE = 'The experimental parallel execution is on: follow the "Experimental parallel execution" section of the trama-implement skill.';

/** The sentence every instruction carries: the agent asks the developer only through `trama question new`, never with its own question tool. */
export const ASK_DEVELOPER_SENTENCE = "Ask the developer only with `trama question new`, as the skill says, never with your own question tool.";

/** Whether the instruction for `action` lets the agent file Drifts: scans, implementations and imports do; designs and Resolve Drifts do not. */
export function mayFileDrifts(action: ResolvedAction): boolean {
  switch (action.kind) {
    case "scan":
    case "implement":
    case "implement-all":
    case "import":
      return true;
    case "written-design":
    case "setup-request":
    case "resolve-drifts":
      return false;
  }
}

/** Ends an instruction with the Drift blocker's sentence, on the same line, when `on`; otherwise the instruction is exactly as built. */
export function withDriftBlocker(prompt: string, on: boolean): string {
  return on ? `${prompt} ${DRIFT_BLOCKER_SENTENCE}` : prompt;
}
