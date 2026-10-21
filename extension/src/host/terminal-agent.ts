import { ADVISOR_SCANNER_ENV, ADVISOR_SCANNER_ON } from "../../../src/core/advisors";
import { TERMINAL_ENV } from "../../../src/core/announcements";
import { QUESTION_ENDPOINT_ENV } from "../../../src/core/question-channel";
import { quote, type ShellFamily } from "./quote";

export type TerminalAgent = "omp";

/** The model roles (`trama.analysis`, `trama.scan`, `trama.execution`), trimmed; empty leaves the agent's default. */
export interface Models {
  analysis: string;
  scan: string;
  execution: string;
}
export type Role = keyof Models;

/** The model a run uses: `trama.<role>`, or the model of a Proposal; empty leaves the agent's default. */
export interface RunModel {
  model: string;
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
 * The template of omp's command line, with `{prompt}` where the quoted prompt goes: `--model` is the run's model; for
 * instructions that can scan, `--slow` is `scan`, the scan model. `ompHook` tells omp when it is idle. `advisorConfig` is
 * the overlay of a Run with the Advisor Scanner on: omp then runs its advisors with that overlay instead of `--slow`,
 * which the caller leaves out for such a Run.
 */
export function agentTemplate(scanning: boolean, models: { model: string; scan: string }, family: ShellFamily, ompHook?: string, advisorConfig?: string): string {
  const option = (flag: string, value: string) => (value === "" ? [] : [flag, quote(family, value)]);
  const words = ["omp", ...(ompHook === undefined ? [] : ["--hook", quote(family, ompHook)]), ...(advisorConfig === undefined ? [] : ["--advisor", "--config", quote(family, advisorConfig)]), ...option("--model", models.model), ...(scanning ? option("--slow", models.scan) : [])];
  return [...words, "{prompt}"].join(" ");
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

/**
 * The environment of an agent's terminal: the marks of an agent Trama started, the editor's question endpoint and the
 * terminal's ID, the autopilot job when there is one and, only for a Run launched with the Advisor Scanner on (`advisorConfig`
 * is its overlay), `TRAMA_ADVISOR_SCANNER=1`, which Trama's advisors read through `trama advisor show`.
 */
export function terminalEnv(endpoint: string, terminalId: string, jobId?: string, advisorConfig?: string): Record<string, string> {
  return {
    TRAMA_AGENT: "1",
    [QUESTION_ENDPOINT_ENV]: endpoint,
    [TERMINAL_ENV]: terminalId,
    ...(jobId === undefined ? {} : { TRAMA_JOB: jobId }),
    ...(advisorConfig === undefined ? {} : { [ADVISOR_SCANNER_ENV]: ADVISOR_SCANNER_ON }),
  };
}

