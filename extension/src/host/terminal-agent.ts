import { SUB_AGENTS } from "../../../src/core/sub-agents";
import { quote, type ShellFamily } from "./quote";

/** The terminal agents Trama knows, in the order the developer is offered them, with the command each one starts. */
export const KNOWN_AGENTS = [
  { id: "omp", label: "omp", command: "omp" },
  { id: "claude", label: "Claude Code", command: "claude" },
  { id: "codex", label: "Codex", command: "codex" },
  { id: "copilot", label: "Copilot CLI", command: "copilot -i" },
  { id: "cursor", label: "Cursor CLI", command: "agent" },
] as const;

export type TerminalAgent = (typeof KNOWN_AGENTS)[number]["id"] | "custom";

/** The model roles (`trama.analysis`, `trama.scan`, `trama.execution`), trimmed; empty leaves the agent's default. */
export interface Models {
  analysis: string;
  scan: string;
  execution: string;
}
export type Role = keyof Models;

/**
 * The agent Trama starts in a terminal: `trama.terminalAgent` when chosen, otherwise `custom` when `trama.agentCommand`
 * is set, otherwise none (the developer is asked to choose).
 */
export function effectiveAgent(chosen: string, command: string): TerminalAgent | undefined {
  const agent = chosen.trim();
  if (agent === "custom" || KNOWN_AGENTS.some((known) => known.id === agent)) return agent as TerminalAgent;
  return command.trim() === "" ? undefined : "custom";
}

/** The command a known agent starts; undefined for `custom`, which runs `trama.agentCommand`. */
export const knownCommand = (agent: TerminalAgent): string | undefined => KNOWN_AGENTS.find((known) => known.id === agent)?.command;

/**
 * The role of an instruction, from the name of its terminal: `Design` and `Import` are analysis, `Scan` is scan, the
 * implement runs (a Task's or a Proposal's short number, `All tasks`) are execution.
 */
// ponytail: the role follows the terminal name, which the Requirements tie one-to-one to the kind of instruction; pass the role explicitly if a name ever serves two roles.
export const roleOf = (name: string): Role => (name === "Design" || name === "Import" ? "analysis" : name === "Scan" ? "scan" : "execution");

/** Whether instructions of `role` can scan (every scan and every implement run), so they triage and analyse with sub-agents. */
export const canScan = (role: Role): boolean => role !== "analysis";

/**
 * The template of the command line, with `{prompt}` where the quoted prompt goes: a known agent's own line with the run's
 * model and, for instructions that can scan, the sub-agents' models; for `custom`, `command` with every `{model}`
 * replaced by the quoted run's model, or by nothing when the role is empty.
 */
export function agentTemplate(agent: TerminalAgent, command: string, role: Role, models: Models, family: ShellFamily): string {
  const option = (flag: string, value: string) => (value === "" ? [] : [flag, quote(family, value)]);
  const model = models[role];
  if (agent === "custom") return command.split("{model}").join(model === "" ? "" : quote(family, model));
  const scanning = canScan(role);
  const words: string[] = (() => {
    switch (agent) {
      case "omp":
        return ["omp", ...option("--model", model), ...(scanning ? [...option("--smol", models.execution), ...option("--slow", models.analysis)] : [])];
      case "claude":
        return ["claude", ...option("--model", model), ...(scanning ? ["--agents", quote(family, claudeAgents(models))] : [])];
      case "codex":
        return ["codex", ...option("--model", model)];
      case "copilot":
        return ["copilot", ...option("--model", model), "-i"];
      case "cursor":
        return ["agent", ...option("--model", model)];
    }
  })();
  return [...words, "{prompt}"].join(" ");
}

/** Claude Code's `--agents`: the two sub-agents, each with its model only when its role is set. */
function claudeAgents(models: Models): string {
  const define = (name: keyof typeof SUB_AGENTS, model: string) => ({ ...SUB_AGENTS[name], ...(model === "" ? {} : { model }) });
  return JSON.stringify({ "trama-triage": define("trama-triage", models.execution), "trama-analysis": define("trama-analysis", models.analysis) });
}

/** The sentence about sub-agents that follows an instruction that can scan, sent to a terminal agent; undefined when there is none. */
export function subAgentSentence(agent: TerminalAgent, models: Models): string | undefined {
  if (agent === "omp" || agent === "claude") return "Triage each Machine with the trama-triage sub-agent and analyse every Machine in conflict with the trama-analysis sub-agent.";
  if (models.execution !== "" || models.analysis !== "") return "Your agent cannot give sub-agents their own model: triage and analyse on your own model, and say so in the report.";
  return undefined;
}
