---
column: done
technical: false
refs:
  - panel/Board
  - task/Taken by the agent
  - developer.ASK_AGENT
  - requirements/ui#panel/Board
  - requirements/rules#task
drift: null
proposal: dc81bbfc
agent: false
created: 1970-01-01T00:00:00.012Z
---
# Make Run all To do and Run this design unavailable while a relevant Task is taken

Run all To do is unavailable while any Task is taken by the agent, and Run this design while any Task of that design is taken. Each disabled button has a tooltip naming the Task or saying that an agent is working. Depends on the mark.
