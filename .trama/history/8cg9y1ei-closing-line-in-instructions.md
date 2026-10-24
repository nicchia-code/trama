---
created: 2026-10-24T11:23:03.586Z
updated: 2026-10-24T11:23:03.586Z
summary: With trama.autoExit on, instructions ask the agent to end with one short line, and the sentence follows the setting at send time.
tasks:
  - fz9ohos9
cleared:
  fz9ohos9:
    title: Frasi dell'istruzione
    proposal: srkyrbvl
    tag: Chat & panel polish
    finished: 2026-10-24T11:03:44.567Z
    refs:
      - agent-terminal
      - agent-launching
      - requirements/rules#agent-terminal
      - requirements/tech#agent-terminal
      - requirements/ui#agent-terminal
---
# Closing line in instructions

With trama.autoExit on, each instruction sent through the hook, omp Chat included, and each run of a sequence asks the agent to end with one short line and no summary, because Trama closes the terminal when the agent finishes. The sentence follows the setting at send time. Implemented by Task fz9ohos9, together with the disabled language setting of Task vbcq0fwu.
