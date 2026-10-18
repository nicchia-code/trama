/** The sub-agent that compares each Machine against the Model and files its Tasks and Drifts. */
export const SUB_AGENTS = {
  "trama-analysis": {
    description: "Compares one Machine in depth and files its Tasks and Drifts.",
    prompt: "Compare one Machine following the trama-compare skill, and do not read the trama-scan skill. Run `trama compare brief` for the Machine and its references, compare its code in depth with the briefing, and file all its Tasks and Drifts with one `trama compare file`. Re-read the code at each Drift's `where` before filing it. When the task says \"The experimental Drift blocker is on\", follow the \"Experimental Drift blocker\" section of the trama-compare skill, and report the permanent IDs of the cards you filed and, for each Drift, whether it blocks any Task.",
  },
} as const;
