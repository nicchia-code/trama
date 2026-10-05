---
column: done
technical: false
refs:
  - task
  - requirements/ui#task
drift: null
proposal: 94f35a4f
agent: false
created: 1970-01-01T00:00:00.039Z
---
# Show blocked Tasks in the textual board, task list, task show and agent tools

A blocked Task is marked "(blocked by Drift <id>)", or "(waiting for Task <id>)" when it waits for the Task that fixes its Drift, in the textual board, the flat Task list, the view of one Task and the output of the agent tools; when several Drifts block it all are listed. The view of a Drift does not list the Tasks it blocks.
