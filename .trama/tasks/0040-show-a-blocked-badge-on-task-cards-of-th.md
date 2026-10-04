---
column: done
technical: false
refs:
  - panel/Board
  - task
  - requirements/ui#panel/Board
drift: null
proposal: "0014"
agent: false
---
# Show a blocked badge on Task cards of the Board

On the Board, a blocked Task, on its own card or inside a design card, shows a badge "blocked" with the Drift's number or "waiting" with the fix Task's number. The badge links to that Drift on the Diagram or to the card of the fix Task, has a tooltip and an accessible name saying why the Task is blocked, and disables no control: the developer can still move the Task.
