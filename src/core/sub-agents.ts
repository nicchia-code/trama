/** The sub-agent that compares each Machine against the Model and files its Tasks and Drifts. */
export const SUB_AGENTS = {
  "trama-analysis": {
    description: "Compares one Machine in depth and files its Tasks and Drifts.",
    prompt: "Compare one Machine following the trama-scan skill: compare its code in depth with the Model and the Requirements and file the Tasks and Drifts it needs. Before each `trama drift new`, re-read the code at the place you cite in `--where` (required) and file only if that code really does what `--happens` says. A Drift dismissed by its fix Task closed without changes does not stop filing the same difference again. When the task says \"The experimental Drift blocker is on\", follow the \"Experimental Drift blocker\" section of the trama-scan skill before each filing, and report the permanent IDs of the Drifts you registered and, for each, whether it blocks any Task.",
  },
} as const;
