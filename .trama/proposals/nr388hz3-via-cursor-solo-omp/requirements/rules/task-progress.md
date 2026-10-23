---
description: "Use when implementing the percentage the agent declares on a Task it has taken."
---
# Task progress rules

## task/Taken by the agent
- A declared percentage is an integer from 0 to 100 that is a multiple of 10 (eleven values). Any other value is a usage error and changes nothing. 100 is allowed while the Task is still In progress: only Done means finished.
- A declaration is accepted only when the Task is In progress and taken by the agent, and the declaration comes from the agent that holds it: the same Trama terminal (`TRAMA_TERMINAL`, its sub-agents included) for a Task taken in a terminal or in an omp Chat conversation, any agent for a Task taken without a known terminal. The agent is recognised as for the other agent moves (`TRAMA_AGENT=1`).
- Every other declaration, on a Task in To do, Free In progress or Done, on a blocked Task not taken, on a Task held by another terminal, or made by the developer, changes nothing: it does not move, take or take back the Task, prints a note that says why, and exits with 0.
- An accepted declaration replaces the previous percentage, also with a lower value. It does not move the Task, does not change its front matter and records no timing.
- The percentage is forgotten whenever the Task leaves Taken by the agent (`data#task/Taken by the agent`). A Task taken again has no percentage until the agent declares one.
