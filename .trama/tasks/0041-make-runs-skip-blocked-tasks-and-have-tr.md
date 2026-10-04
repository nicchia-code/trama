---
column: done
technical: false
refs:
  - task/To do/agent.MOVE_TASK_TO_DOING
  - requirements/rules#task
  - requirements/tech#task
drift: null
proposal: "0014"
agent: false
---
# Make runs skip blocked Tasks and have trama-implement file Drifts with their origin

Run all To do and Run this design no longer stop at the first Drift the agent files: they skip the Tasks that are blocked and go on with the others, and the agent's report lists the skipped Tasks with the Drift that blocks each. The skill used to implement Tasks files its Drift with the Task it was implementing as origin, leaves that Task In progress and goes on with the Tasks that are not blocked; the Scan and Fix skills file Drifts without an origin. The instructions Trama sends to the agent for the two run actions no longer say to stop at the first Drift.
