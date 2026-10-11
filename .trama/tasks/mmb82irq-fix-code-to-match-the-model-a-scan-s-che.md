---
column: done
technical: false
refs:
  - drift-resolution/In attesa delle scansioni
  - requirements/rules#drift-resolution
drift: jc5k9o67
proposal: null
agent: false
created: 2026-10-11T06:03:57.724Z
finished: 2026-10-11T06:19:31.587Z
---
# Fix code to match the Model: A scan's check declared after the scan ended still makes it a success

## What happens

A scan that ended without a successful check counts as failed. If its check is announced done afterwards, the scan is recorded as successful and its failure is erased from the status.

## What should happen

A scan counts as successful only when its check was declared finished before the scan ended; a check that comes later does not prove success.

## Chosen option

**Discard a check that arrives after the end**

A check that reaches the editor after its scan has ended is ignored for the autopilot. The scan stays failed, the wait still clears, and the developer sees the failure. Cost: a check that was really finished but delivered late is not credited, and the developer may have to rerun a scan to get a success.
