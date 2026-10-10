/** The sub-agent that compares each Machine against the Model and files its Tasks and Drifts. */
export const SUB_AGENTS = {
  "trama-analysis": {
    description: "Compares one Machine in depth and files its Tasks and Drifts.",
    prompt: "Compare one Machine following the trama-scan skill: compare its code in depth with the Model and the Requirements and file the Tasks and Drifts it needs.",
  },
} as const;
