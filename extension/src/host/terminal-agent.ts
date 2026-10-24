import { stringify } from "yaml";
import { ADVISOR_SCANNER_ENV, ADVISOR_SCANNER_ON } from "../../../src/core/advisors";
import { TERMINAL_ENV } from "../../../src/core/announcements";
import { PARALLEL_ENV, PARALLEL_ON, RUN_ENV, RUN_ON, TASK_ENV } from "../../../src/core/claims";
import { QUESTION_ENDPOINT_ENV } from "../../../src/core/question-channel";
import { quote, quoteProgram, type ShellFamily } from "./quote";

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
 * The options of an omp job in the order of the command line, each as its flag and, when it has one, its value, unquoted: `--hook <module>` (`ompHook` tells omp
 * when it is idle), `--advisor` (a Run with the Advisor Scanner on, launched without `--slow`), `--config <overlay>` (the overlay file; missing only when it could not be written),
 * `--model <m>` (the run's model) and, for instructions that can scan, `--slow <scan model>`. The terminal quotes the values for its shell (`agentTemplate`);
 * a conversation of omp Chat passes them as array elements (`ompArguments`).
 */
export function ompOptions(scanning: boolean, models: { model: string; scan: string }, ompHook?: string, config?: string, advisor = false): string[][] {
  const option = (flag: string, value: string) => (value === "" ? [] : [[flag, value]]);
  return [...(ompHook === undefined ? [] : [["--hook", ompHook]]), ...(advisor ? [["--advisor"]] : []), ...(config === undefined ? [] : [["--config", config]]), ...option("--model", models.model), ...(scanning ? option("--slow", models.scan) : [])];
}

/** The options of an Ask more conversation or terminal: `--model <m>` only when the analysis role has a model; no hook, overlay, `--slow` or `--advisor`. */
export const askMoreOptions = (model: string): string[][] => (model === "" ? [] : [["--model", model]]);

/** The approval of an omp Chat conversation: `ask` (omp asks permission, the default) or `yolo`. */
export type OmpApproval = "ask" | "yolo";

/** The arguments of a conversation's `omp` process: the job's options as they are, then `acp`, and `--yolo` only with the `yolo` approval. */
export const ompArguments = (options: string[][], approval: OmpApproval): string[] => [...options.flat(), "acp", ...(approval === "yolo" ? ["--yolo"] : [])];

const quoted = (family: ShellFamily, options: string[][]): string[] => options.flatMap(([flag, value]) => (value === undefined ? [flag as string] : [flag as string, quote(family, value)]));

/**
 * The template of omp's command line, with `{prompt}` where the quoted prompt goes: `omp` (the program Trama runs, quoted for the shell as a command) and the options
 * of `ompOptions`, quoted for the shell. `attachment` is the absolute path of a file omp attaches to the first message with `@<path>` (Unify Drifts' instructions),
 * given before the prompt.
 */
export function agentTemplate(omp: string, scanning: boolean, models: { model: string; scan: string }, family: ShellFamily, ompHook?: string, config?: string, advisor = false, attachment?: string): string {
  const words = [quoteProgram(family, omp), ...quoted(family, ompOptions(scanning, models, ompHook, config, advisor))];
  return [...words, ...(attachment === undefined ? [] : [quote(family, `@${attachment}`)]), "{prompt}"].join(" ");
}

/** The command line of an Ask more terminal: `omp` (the program Trama runs, quoted), with `--model <m>` only when the analysis role has a model; no hook, overlay, `--slow`, `--advisor` or prompt. */
export const askMoreCommandLine = (omp: string, model: string, family: ShellFamily): string => [quoteProgram(family, omp), ...quoted(family, askMoreOptions(model))].join(" ");

/** What an omp launch overlay holds besides `bash.autoBackground.enabled: false`: the advisor role and advisors of a Run with the Advisor Scanner on, and the instruction files omp must not read. */
export interface LaunchOverlay {
  /** Set for a Run with the Advisor Scanner on: the advisor model role (`trama.scan`, may be empty) and the task advisors, on. */
  advisor?: { scan: string };
  /** The `disabledExtensions` omp loads, the developer's followed by Trama's; empty when Trama excludes nothing. */
  disabledExtensions: readonly string[];
}

/**
 * The text of the overlay an omp launch loads with `--config`. It always turns omp's `bash.autoBackground` off, so a long bash command stays in the foreground and
 * a question round never closes midway; the advisor parts and `disabledExtensions` follow when present. It is YAML written with the `yaml` library, every string
 * double-quoted, so no value can change its structure.
 */
export function launchOverlay({ advisor, disabledExtensions }: LaunchOverlay): string {
  const config: Record<string, unknown> = { bash: { autoBackground: { enabled: false } } };
  if (advisor !== undefined) {
    if (advisor.scan !== "") config.modelRoles = { advisor: advisor.scan };
    config.task = { agentAdvisor: { task: "on" } };
  }
  if (disabledExtensions.length > 0) config.disabledExtensions = [...disabledExtensions];
  return stringify(config, { defaultStringType: "QUOTE_DOUBLE", defaultKeyType: "PLAIN" });
}

/**
 * The environment of an agent's terminal: the marks of an agent Trama started, the editor's question endpoint and the
 * terminal's ID, the job ID (`TRAMA_JOB`, which only times the phases of its work) and, only for a Run launched with the Advisor Scanner on (`advisor`),
 * `TRAMA_ADVISOR_SCANNER=1`, which Trama's advisors read through `trama advisor show`. A Run (`run`) also carries `TRAMA_RUN=1`, which makes the
 * write tools of its agents claim the files they write; with `task`, the Task it implements (`TRAMA_TASK`), and with `parallel`, the parallel
 * execution is on (`TRAMA_PARALLEL=1`): a sub-agent stopped by a claim then records the clash.
 */
export function terminalEnv(endpoint: string, terminalId: string, jobId?: string, advisor = false, run = false, task?: string, parallel = false): Record<string, string> {
  return {
    TRAMA_AGENT: "1",
    [QUESTION_ENDPOINT_ENV]: endpoint,
    [TERMINAL_ENV]: terminalId,
    ...(jobId === undefined ? {} : { TRAMA_JOB: jobId }),
    ...(advisor ? { [ADVISOR_SCANNER_ENV]: ADVISOR_SCANNER_ON } : {}),
    ...(run ? { [RUN_ENV]: RUN_ON } : {}),
    ...(run && task !== undefined ? { [TASK_ENV]: task } : {}),
    ...(run && parallel ? { [PARALLEL_ENV]: PARALLEL_ON } : {}),
  };
}
