---
column: done
technical: false
refs:
  - requirements/ui#drift-resolution
  - drift-resolution
drift: null
proposal: lzg4385e
agent: false
created: 2026-10-11T04:20:58.402Z
finished: 2026-10-11T04:27:24.044Z
---
# Show an autopilot failed badge on Drift and Task cards

A case the autopilot failed on or excluded shows a text badge `autopilot failed` next to the other badges (`blocked`, `waiting`) on its existing Drift card, Task card or Task row of a design card. The tooltip and accessible name are `Autopilot failed: <reason>`. The badge disappears when the case becomes evaluable again. No new cards are created and the two sides of the Drift are not copied. A manual critical Drift shows no automation error. The badge appearing does not move focus and does not open the panel.
