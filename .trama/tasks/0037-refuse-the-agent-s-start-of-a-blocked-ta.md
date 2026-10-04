---
column: done
technical: false
refs:
  - task/To do/agent.MOVE_TASK_TO_DOING
  - task/In progress/agent.MOVE_TASK_TO_DOING
  - task/Done/agent.MOVE_TASK_TO_DOING
  - requirements/rules#task
  - requirements/tech#task
drift: null
proposal: "0014"
agent: false
---
# Refuse the agent's start of a blocked Task

When the agent moves a blocked Task to In progress, from any column and also to keep one already In progress, nothing changes and the refusal names each blocking Drift by ID and title, or the fix Task the Task waits for, and says the developer must decide. This holds for the agent tools and for the command line in the agent terminal. Moves by the developer, and moves by the agent to To do or Done, are never refused for this reason. A blocked Task already In progress is not moved.
