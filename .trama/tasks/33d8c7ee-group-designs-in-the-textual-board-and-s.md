---
column: done
technical: true
refs:
  - requirements/ui#task
drift: null
proposal: null
agent: false
created: 1970-01-01T00:00:00.005Z
---
# Group designs in the textual board and show each Task's Proposal in the task list

trama board (and the matching agent tool) lists each design once in its derived column with the Proposal's ID and title and its Tasks underneath, each with its own column; Tasks without a design and designs of a single Task are listed as before. trama task list stays a flat list per column and shows the Proposal ID on every Task that has one, so the agent can still find every Task in todo. The JSON output carries the link and the grouping. Depends on the Task link.
