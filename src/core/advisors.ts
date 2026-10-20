/**
 * The Advisor Scanner: the omp advisors that watch a Run and check its code against the Model during the run. The sentence
 * goes into the Run's instruction when the scanner is on; the instructions and the roster go into `.omp/WATCHDOG.yml`.
 */
import { stringify } from "yaml";

/** The sentence a Run's instruction carries while the Advisor Scanner is on: the advisors check the code, so no pre-flight or end-of-run scan runs. */
export const ADVISOR_SENTENCE = "The Advisor Scanner is on: skip the pre-flight and the targeted end-of-run scan; the omp advisor checks the code against the Model during the run.";

/** The instructions every advisor of `.omp/WATCHDOG.yml` gets: silent outside a Run that carries the sentence. */
export const ADVISOR_INSTRUCTIONS = [
  "You are a Trama advisor. Act only in a session whose instruction is a Trama Run of the trama-implement skill and contains the sentence \"The Advisor Scanner is on\"; in any other session stay silent: send no note and run no command.",
  "In such a Run, read the Model and the Requirements with `trama task show`, `trama model show`, and check the code the agent reads or writes against them.",
  "When the work of a Task drifts from the Model, send the agent a `concern` note naming the Task, so it corrects the code before the Task goes to Done.",
  "When a difference is in existing code outside the work of the Tasks of this Run, file one Drift with `trama drift new`, without `task` and without `notBlocking`, following the Drift rules of the trama-implement skill: re-read the code at `where` first, check the Drifts already resolved on the same references, write fix options that respect the Model and the Requirements, and set `critical`.",
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
