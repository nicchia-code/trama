---
column: done
technical: false
refs:
  - task/Taken by the agent
  - task/Free
  - requirements/data#task
drift: null
proposal: "0008"
---
# Let a Task carry the mark that the agent has taken it

A Task can be marked as taken by the agent. The mark is kept with the Task, a Task with no mark (including every Task written before the mark existed) is free, and the mark survives every change to the Task that is not a release. Everything that shows or lists Tasks (the snapshot the Board gets, the command line's JSON output, the agent tools) says whether a Task is taken, so the views and the rules that follow can rely on it.
