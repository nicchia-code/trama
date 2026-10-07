/** The two sub-agents a scan uses: one triages each Machine, the other analyses each Machine in conflict. */
export const SUB_AGENTS = {
  "trama-triage": {
    description: "Decides whether one Machine's code is in conflict with the Model and the Requirements.",
    prompt: "Triage one Machine following the trama-scan skill: decide only whether its code is in conflict with the Model and the Requirements, and answer conflict or no-conflict.",
  },
  "trama-analysis": {
    description: "Compares one Machine in conflict in depth and files its Tasks and Drifts.",
    prompt: "Analyse one Machine in conflict following the trama-scan skill: compare its code in depth with the Model and the Requirements and file the Tasks and Drifts it needs.",
  },
} as const;
