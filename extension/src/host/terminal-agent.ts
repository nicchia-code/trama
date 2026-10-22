import { stringify } from "yaml";
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
 * scan, the implement runs (a Task's short number, `All tasks`) are execution. The role
 * only tells whether the instruction can scan: its model comes from the launch (`RunModel`).
 */
// ponytail: the role follows the terminal name, which the Requirements tie one-to-one to the kind of instruction; pass the role explicitly if a name ever serves two roles.
export const roleOf = (name: string): Role => (name === "Design" || name === "Setup" || name === "Import" || name === "Drifts" ? "analysis" : name === "Scan" ? "scan" : "execution");

/** Whether instructions of `role` can scan (every scan and every implement run) and use the analysis sub-agent. */
export const canScan = (role: Role): boolean => role !== "analysis";

/**
 * The template of omp's command line, with `{prompt}` where the quoted prompt goes: `--model` is the run's model; for
 * instructions that can scan, `--slow` is `scan`, the scan model. `ompHook` tells omp when it is idle. `config` is the
 * overlay file omp loads with `--config` (only when it has content); `advisor` is a Run with the Advisor Scanner on, which
 * adds `--advisor` and which the caller launches without `--slow`. `attachment` is the absolute path of a file omp attaches
 * to the first message with `@<path>` (Unify Drifts' instructions), given before the prompt.
 */
export function agentTemplate(scanning: boolean, models: { model: string; scan: string }, family: ShellFamily, ompHook?: string, config?: string, advisor = false, attachment?: string): string {
  const option = (flag: string, value: string) => (value === "" ? [] : [flag, quote(family, value)]);
  const words = ["omp", ...(ompHook === undefined ? [] : ["--hook", quote(family, ompHook)]), ...(advisor ? ["--advisor"] : []), ...(config === undefined ? [] : ["--config", quote(family, config)]), ...option("--model", models.model), ...(scanning ? option("--slow", models.scan) : [])];
  return [...words, ...(attachment === undefined ? [] : [quote(family, `@${attachment}`)]), "{prompt}"].join(" ");
}

/** The command line of a Quick Task's terminal: `omp`, with `--model <m>` only when the execution role has a model; no hook, overlay, `--slow`, `--advisor` or prompt. */
export const quickCommandLine = (model: string, family: ShellFamily): string => ["omp", ...(model === "" ? [] : ["--model", quote(family, model)])].join(" ");

/** What an omp launch overlay holds: the advisor role and advisors of a Run with the Advisor Scanner on, and the instruction files omp must not read. */
export interface LaunchOverlay {
  /** Set for a Run with the Advisor Scanner on: the advisor model role (`trama.scan`, may be empty) and the task advisors, on. */
  advisor?: { scan: string };
  /** The `disabledExtensions` omp loads, the developer's followed by Trama's; empty when Trama excludes nothing. */
  disabledExtensions: readonly string[];
}

/**
 * The text of the overlay an omp launch loads with `--config`, or `undefined` when it has nothing to say. It is YAML written with the
 * `yaml` library, every string double-quoted, so no value can change its structure.
 */
export function launchOverlay({ advisor, disabledExtensions }: LaunchOverlay): string | undefined {
  const config: Record<string, unknown> = {};
  if (advisor !== undefined) {
    if (advisor.scan !== "") config.modelRoles = { advisor: advisor.scan };
    config.task = { agentAdvisor: { task: "on" } };
  }
  if (disabledExtensions.length > 0) config.disabledExtensions = [...disabledExtensions];
  return Object.keys(config).length === 0 ? undefined : stringify(config, { defaultStringType: "QUOTE_DOUBLE", defaultKeyType: "PLAIN" });
}

/**
 * The environment of an agent's terminal: the marks of an agent Trama started, the editor's question endpoint and the
 * terminal's ID, the job ID (`TRAMA_JOB`, which only times the phases of its work) and, only for a Run launched with the Advisor Scanner on (`advisor`),
 * `TRAMA_ADVISOR_SCANNER=1`, which Trama's advisors read through `trama advisor show`.
 */
export function terminalEnv(endpoint: string, terminalId: string, jobId?: string, advisor = false): Record<string, string> {
  return {
    TRAMA_AGENT: "1",
    [QUESTION_ENDPOINT_ENV]: endpoint,
    [TERMINAL_ENV]: terminalId,
    ...(jobId === undefined ? {} : { TRAMA_JOB: jobId }),
    ...(advisor ? { [ADVISOR_SCANNER_ENV]: ADVISOR_SCANNER_ON } : {}),
  };
}
