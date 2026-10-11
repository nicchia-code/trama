---
column: done
technical: true
refs:
  - requirements/quality#drift-resolution
  - requirements/tech#agent-terminal
  - requirements/ui#panel/Board
drift: null
proposal: null
agent: false
created: 2026-10-11T04:40:57.006Z
finished: 2026-10-11T04:55:35.091Z
---
# Update the documentation and acceptance script for the autopilot scan rule, the run setting and the Done column (technical)

Describe in the documentation (docs/, CHANGELOG) and the acceptance script (docs/uat.md, including the row that says a failed scan suspends new automatic collections) that a failed or interrupted scan no longer suspends the autopilot, the setting trama.submitWhileRunning with its disabled Run buttons and the reason A run is in progress, and the collapsible Done column that starts collapsed.
