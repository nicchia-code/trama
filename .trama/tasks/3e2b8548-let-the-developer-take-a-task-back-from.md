---
column: done
technical: false
refs:
  - developer.TAKE_BACK_TASK
  - task/Taken by the agent
  - task/Free
  - requirements/rules#task
  - requirements/tech#agent-terminal
drift: null
proposal: dc81bbfc
agent: false
created: 1970-01-01T00:00:00.009Z
---
# Let the developer take a Task back from the agent

Taking back clears the mark, leaves the Task In progress and gives it to the developer again. It has a command, task take-back <id>, which is refused when TRAMA_AGENT is set (and so to an agent), and it can be asked from the Board through the editor. Depends on the mark.
