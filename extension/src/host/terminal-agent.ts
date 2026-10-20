import { SUB_AGENTS } from "../../../src/core/sub-agents";
import { hookProgram, quote, type ShellFamily } from "./quote";

export type TerminalAgent = "omp" | "claude";

/** The model roles (`trama.analysis`, `trama.scan`, `trama.execution`), trimmed; empty leaves the agent's default. */
export interface Models {
  analysis: string;
  scan: string;
  execution: string;
}
export type Role = keyof Models;

/** The model a run uses and where it comes from: `trama.<role>`, or `Proposal <label>` for the model of a Proposal. */
export interface RunModel {
  model: string;
  from: string;
}


/**
 * The role of an instruction, from the name of its terminal: `Design`, `Setup`, `Import` and `Drifts` are analysis, `Scan` is
 * scan, the implement runs (a Task's short number, `All tasks`, which the automatic Run uses too) are execution. The role
 * only tells whether the instruction can scan: its model comes from the launch (`RunModel`).
 */
// ponytail: the role follows the terminal name, which the Requirements tie one-to-one to the kind of instruction; pass the role explicitly if a name ever serves two roles.
export const roleOf = (name: string): Role => (name === "Design" || name === "Setup" || name === "Import" || name === "Drifts" ? "analysis" : name === "Scan" ? "scan" : "execution");

/** Whether instructions of `role` can scan (every scan and every implement run) and use the analysis sub-agent. */
export const canScan = (role: Role): boolean => role !== "analysis";

/**
 * The template of the command line, with `{prompt}` where the quoted prompt goes: an agent's own line with the run's
 * `model`; for instructions that can scan, the comparison sub-agent and `--slow` use `scan`, the scan model.
 * `ompHook` tells omp when it is idle and `tramaPath` is the bundled CLI Claude Code uses for its session hooks.
 * `advisorConfig` is the overlay of an omp Run with the Advisor Scanner on: omp then runs its advisors with that overlay
 * instead of `--slow`, which the caller leaves out for such a Run.
 */
export function agentTemplate(agent: TerminalAgent, scanning: boolean, models: { model: string; scan: string }, family: ShellFamily, ompHook?: string, tramaPath?: string, advisorConfig?: string): string {
  const option = (flag: string, value: string) => (value === "" ? [] : [flag, quote(family, value)]);
  const words: string[] = (() => {
    switch (agent) {
      case "omp":
        return ["omp", ...(ompHook === undefined ? [] : ["--hook", quote(family, ompHook)]), ...(advisorConfig === undefined ? [] : ["--advisor", "--config", quote(family, advisorConfig)]), ...option("--model", models.model), ...(scanning ? option("--slow", models.scan) : [])];
      case "claude": {
        const hooks: string[] = [];
        if (tramaPath !== undefined) {
          const hook = [{ hooks: [{ type: "command", command: `${hookProgram(tramaPath, family)} hook idle`, timeout: 3 }] }];
          const refuse = [{ matcher: "AskUserQuestion", hooks: [{ type: "command", command: `${hookProgram(tramaPath, family)} hook claude-question-tool`, timeout: 3 }] }];
          hooks.push("--settings", quote(family, JSON.stringify({ hooks: { Stop: hook, SessionEnd: hook, PreToolUse: refuse } })));
        }
        return ["claude", ...hooks, ...option("--model", models.model), ...(scanning ? ["--agents", quote(family, claudeAgents(models.scan))] : [])];
      }
    }
  })();
  return [...words, "{prompt}"].join(" ");
}

/** Claude Code's Machine-comparison sub-agent, with the scan model only when it is set. */
function claudeAgents(scan: string): string {
  return JSON.stringify({ "trama-analysis": { ...SUB_AGENTS["trama-analysis"], ...(scan === "" ? {} : { model: scan }) } });
}

/**
 * The overlay an omp Run loads with `--config`: the advisor model role from `trama.scan` (when set) and the advisors of the
 * task, on. Its text is YAML; the scan model is written as a double-quoted YAML string.
 */
export function advisorOverlay(scan: string): string {
  return [
    ...(scan === "" ? [] : ["modelRoles:", `  advisor: ${JSON.stringify(scan)}`]),
    "task:",
    "  agentAdvisor:",
    '    task: "on"',
    "",
  ].join("\n");
}

