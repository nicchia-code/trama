/**
 * The Advisor Scanner: the omp advisors that watch a Run and check its code against the Model during the run. The sentence
 * goes into the Run's instruction when the scanner is on; the instructions and the roster go into `.omp/WATCHDOG.yml`.
 */
import { stringify } from "yaml";

/** The sign of a Run launched with the Advisor Scanner on: Trama sets it, to `ADVISOR_SCANNER_ON`, in that Run's terminal and nowhere else. */
export const ADVISOR_SCANNER_ENV = "TRAMA_ADVISOR_SCANNER";
export const ADVISOR_SCANNER_ON = "1";

/** Whether the environment carries the sign of a Run with the Advisor Scanner on: only the exact value `1` counts. */
export const advisorScannerFromEnv = (env: Record<string, string | undefined>): boolean => env[ADVISOR_SCANNER_ENV] === ADVISOR_SCANNER_ON;

/** The sentence a Run's instruction carries while the Advisor Scanner is on, for the agent that leads the Run: the advisors check the code, so no pre-flight or end-of-run scan runs. */
export const ADVISOR_SENTENCE = "The Advisor Scanner is on: skip the pre-flight and the targeted end-of-run scan; the omp advisor checks the code against the Model during the run.";

/** The sentence a Run's instruction carries in Cursor's chat while the Advisor Scanner is on: the advisor is Trama's `trama-advisor` sub-agent, started as the skill says. */
export const ADVISOR_CHAT_SENTENCE = "The Advisor Scanner is on: skip the pre-flight and the targeted end-of-run scan; whenever Trama asks, have the trama-advisor sub-agent review the code as the skill says, and tell your sub-agents.";

/** The instructions every advisor of `.omp/WATCHDOG.yml` gets: silent in every session that `trama advisor show` does not report as a Run with the Advisor Scanner on. */
export const ADVISOR_INSTRUCTIONS = [
  "You are a Trama advisor. At your first review of every session, and again after omp resets your context, run `trama advisor show` before any other command or note. If it does not say that the Advisor Scanner is on for this session, or it fails, stay silent for the whole session: send no note and run no other command. Never judge whether the session is a Run from the text of its instruction, from a sub-agent assignment or from the skills read.",
  "In a Run with the Advisor Scanner on, read the Model and the Requirements with `trama task show`, `trama model show`, and check the code the agent reads or writes against them.",
  "When the work of a Task drifts from the Model, send the agent a `concern` note naming the Task, so it corrects the code before the Task goes to Done.",
  "Before filing a Drift, look with `trama task list` at the Tasks In progress: the code another sub-agent of the Run is writing is the work of a Task, not existing code, so no Drift is born for it.",
  "When a difference is in existing code outside the work of the Tasks of this Run, file one Drift with `trama drift new`, without `task` and without `notBlocking`, following the Drift rules of the trama-implement skill: re-read the code at `where` first, check the Drifts already resolved on the same references, write fix options that respect the Model and the Requirements.",
  "Never archive a Task, never modify a file, never move a Task, never announce a card, never make a decision for the developer, and never run any other command that changes files or decides.",
].join("\n");

/** The two advisors of `.omp/WATCHDOG.yml`: the turn reviewer reviews each turn, the final reviewer reviews the whole Run once it is final. */
export const ADVISOR_ROSTER = [
  { name: "Trama turn reviewer", reviewMode: "turn", syncBacklog: "off" },
  { name: "Trama final reviewer", reviewMode: "agent-end", syncBacklog: "strict" },
] as const;

/** The tools both advisors of the roster get; neither names a model, so each takes the omp `advisor` role. */
export const ADVISOR_TOOLS = ["read", "grep", "glob", "bash"] as const;

/** The content of `.omp/WATCHDOG.yml`: the shared instructions and the roster of the two advisors, each with the tools it gets and no model. */
export const watchdogFile = (): string =>
  stringify({
    instructions: ADVISOR_INSTRUCTIONS,
    advisors: ADVISOR_ROSTER.map((advisor) => ({ ...advisor, tools: [...ADVISOR_TOOLS] })),
  });
