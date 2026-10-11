---
status: resolved
resolution: fix-code
refs:
  - drift-resolution/In attesa delle scansioni
  - requirements/rules#drift-resolution
proposal: null
task: mmb82irq
origin: null
critical: false
option: 1
note: null
resolvedBy: j3ku754e
created: 2026-10-11T06:02:02.821Z
---
# A scan's check declared after the scan ended still makes it a success

## What happens

A scan that ended without a successful check counts as failed. If its check is announced done afterwards, the scan is recorded as successful and its failure is erased from the status.

## What should happen

A scan counts as successful only when its check was declared finished before the scan ended; a check that comes later does not prove success.

## Fix options

### Discard a check that arrives after the end

A check that reaches the editor after its scan has ended is ignored for the autopilot. The scan stays failed, the wait still clears, and the developer sees the failure. Cost: a check that was really finished but delivered late is not credited, and the developer may have to rerun a scan to get a success.

### Show a late check as a note only

A late check is shown to the developer as a note on the scan, while the failure stays recorded and the scan does not count as successful. Cost: the developer reads two facts that seem to contradict each other, and the panel needs a new note to display.
