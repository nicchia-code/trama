import type { AgentAction, RunGroup } from "../protocol";

/** An action whose free text has been collected. */
export type ResolvedAction =
  | Exclude<AgentAction, { kind: "resolve-drifts" }>
  /** A written design request, saved as `.trama/requests/<request>.md`. */
  | { kind: "written-design"; request: string }
  /** A written design request that starts a project from scratch: the `trama-setup` skill, named `Setup`. */
  | { kind: "setup-request"; request: string }
  /** `automaticCollection` names the authorized snapshot; absent means the ordinary developer-question workflow. */
  | { kind: "resolve-drifts"; drifts: string[]; automaticCollection?: string; scoped?: boolean };

/** The one-line instruction that makes the external agent use the right Trama skill. */
export function buildPrompt(action: ResolvedAction): string {
  switch (action.kind) {
    case "setup-request":
      return `Use the trama-setup skill on the project request in \`.trama/requests/${action.request}.md\`. Bind the setup Proposal you open to it with \`--request ${action.request}\`.`;
    case "written-design":
      return `Use the trama-design skill on the design request in \`.trama/requests/${action.request}.md\`. Bind the first Proposal you open to it with \`--request ${action.request}\`.`;
    case "resolve-drifts":
      return action.automaticCollection === undefined
        ? `Use the trama-resolve-drifts skill on the open Drifts ${action.drifts.join(", ")}${action.scoped ? ", and on no other open Drift" : ""}: ask the developer what should happen for each one, then write one resolution Proposal.`
        : `Use the trama-resolve-drifts skill for automatic collection ${action.automaticCollection}, on only the named Drifts ${action.drifts.join(", ")}. Before each choice, run \`trama drift autopilot --json\` and use only Drifts still authorized for this collection. Choose only each Drift's first Fix option; never ask questions, edit the Model or Requirements, or implement code. If an authorized Drift cannot be resolved with that first Fix option, report it with \`trama agent-event failed --drift <id> --reason <reason>\` and omit it. Create and submit a resolution with \`trama proposal new --resolution --automatic\`, then hand control back to the host. Do not approve the Proposal or start a Run.`;
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

/** A restricted implementation Run: the agent reads the coordinator's current authorization before each group. `tasks` are the Tasks of this Run's model group, which is all it takes. */
export function buildAutomaticRunPrompt(collection: string, tasks?: readonly string[]): string {
  const scope = tasks === undefined ? "" : ` This Run takes only the Tasks ${tasks.map((id) => `\`${id}\``).join(", ")} among the authorized ones; no other authorized Task belongs to it.`;
  return `Use the trama-implement skill for automatic collection ${collection}.${scope} Before each group, run \`trama drift autopilot --json\` and take the authorized Task IDs from its \`tasks\` field, then select only those using \`trama task next --batch --task <id>… --max {maxParallelAgents}\`, passing each ID as a repeated \`--task\`. Do not use the general Task queue or start any other Task. If a Task cannot be started/completed or its check fails, report it with \`trama agent-event failed --task <id> --reason <reason>\`; if a Trama check was announced, also complete it with \`trama announce done <check-id> --failed\`. If the final check fails and you can tell which Task broke it, report that Task the same way after the failed check: the other authorized Tasks still go on. Stop when the authorized set has no runnable Tasks.`;
}

/** The scan prompt for one Feature, or the whole System when there is none, as the developer starts it by hand. It names no Proposal. */
export function buildScanPrompt(features: string[]): string {
  return features.length === 0
    ? "Use the trama-scan skill on the whole System."
    : `Use the trama-scan skill on the ${features.length === 1 ? "Feature" : "Features"} ${features.map((f) => `\`${f}\``).join(", ")}.`;
}

/** The Run all instruction: the plain one, or, for a group cut by Proposal, the one that names its Proposals and the filter `trama task next` takes them by. */
function runAllPrompt(group: RunGroup | undefined): string {
  const include = group?.include ?? [];
  const exclude = group?.exclude ?? [];
  const named = (ids: string[]) => `${ids.length === 1 ? "the Proposal" : "the Proposals"} ${ids.map((id) => `\`${id}\``).join(", ")}`;
  const flags = (flag: string, ids: string[]) => ids.map((id) => ` ${flag} ${id}`).join("");
  if (include.length > 0)
    return `Use the trama-implement skill on every Task in the "todo" column that belongs to ${named(include)}. Take them from \`trama task next --batch${flags("--proposal", include)} --max {maxParallelAgents}\`, one group at a time, until it says there is none.`;
  if (exclude.length > 0)
    return `Use the trama-implement skill on every Task in the "todo" column except those of ${named(exclude)}. Take them from \`trama task next --batch${flags("--not-proposal", exclude)} --max {maxParallelAgents}\`, one group at a time, until it says there is none.`;
  return 'Use the trama-implement skill on every Task in the "todo" column. Take them from `trama task next --batch --max {maxParallelAgents}`, one group at a time, until it says there is none.';
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

/** Whether the instruction for `action` has the agent ask the developer questions: designs, setup, import and a manual Resolve Drifts do; scans, implementations and the automatic collection do not. */
export function asksDeveloper(action: ResolvedAction): boolean {
  switch (action.kind) {
    case "written-design":
    case "setup-request":
    case "import":
      return true;
    case "resolve-drifts":
      return action.automaticCollection === undefined;
    case "scan":
    case "implement":
    case "implement-all":
      return false;
  }
}

/** Ends an instruction with the Drift blocker's sentence, on the same line, when `on`; otherwise the instruction is exactly as built. */
export function withDriftBlocker(prompt: string, on: boolean): string {
  return on ? `${prompt} ${DRIFT_BLOCKER_SENTENCE}` : prompt;
}
