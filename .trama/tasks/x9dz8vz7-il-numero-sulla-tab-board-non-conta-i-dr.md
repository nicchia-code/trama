---
column: done
technical: false
refs:
  - panel/Board
drift: null
proposal: null
agent: false
created: 2026-10-17T11:56:25.952Z
finished: 2026-10-17T11:58:37.866Z
---
# Il numero sulla tab Board non conta i Drift in Blocked

## What happens

The number on the Board tab counts only the cards of Backlog. The open Drifts that wait for a decision in Blocked are not counted, so the tab can show a smaller number than the decisions the developer has to take.

## What should happen

The number on the Board tab is the sum of the cards of Backlog and of the Drift cards of Blocked: an open resolution counts once, the waiting cards of fix Tasks and the ghosts do not count.
