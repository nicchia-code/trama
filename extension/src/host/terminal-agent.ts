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


/**
 * The role of an instruction, from the name of its terminal: `Design` and `Import` are analysis, `Scan` is scan, the
 * implement runs (a Task's or a Proposal's short number, `All tasks`) are execution.
 */
// ponytail: the role follows the terminal name, which the Requirements tie one-to-one to the kind of instruction; pass the role explicitly if a name ever serves two roles.
export const roleOf = (name: string): Role => (name === "Design" || name === "Import" || name === "Drifts" ? "analysis" : name === "Scan" ? "scan" : "execution");

/** Whether instructions of `role` can scan (every scan and every implement run) and use the analysis sub-agent. */
export const canScan = (role: Role): boolean => role !== "analysis";

/**
 * The template of the command line, with `{prompt}` where the quoted prompt goes: an agent's own line with the run's
 * model; for instructions that can scan, the comparison sub-agent uses the scan role.
 * `ompHook` tells omp when it is idle and `tramaPath` is the bundled CLI Claude Code uses for its session hooks.
 */
export function agentTemplate(agent: TerminalAgent, role: Role, models: Models, family: ShellFamily, ompHook?: string, tramaPath?: string): string {
  const option = (flag: string, value: string) => (value === "" ? [] : [flag, quote(family, value)]);
  const model = models[role];
  const scanning = canScan(role);
  const words: string[] = (() => {
    switch (agent) {
      case "omp":
        return ["omp", ...(ompHook === undefined ? [] : ["--hook", quote(family, ompHook)]), ...option("--model", model), ...(scanning ? option("--slow", models.scan) : [])];
      case "claude": {
        const hooks: string[] = [];
        if (tramaPath !== undefined) {
          const hook = [{ hooks: [{ type: "command", command: `${hookProgram(tramaPath, family)} agent-event idle`, timeout: 3 }] }];
          hooks.push("--settings", quote(family, JSON.stringify({ hooks: { Stop: hook, SessionEnd: hook } })));
        }
        return ["claude", ...hooks, ...option("--model", model), ...(scanning ? ["--agents", quote(family, claudeAgents(models))] : [])];
      }
    }
  })();
  return [...words, "{prompt}"].join(" ");
}

/** Claude Code's Machine-comparison sub-agent, with the scan model only when its role is set. */
function claudeAgents(models: Models): string {
  return JSON.stringify({ "trama-analysis": { ...SUB_AGENTS["trama-analysis"], ...(models.scan === "" ? {} : { model: models.scan }) } });
}

