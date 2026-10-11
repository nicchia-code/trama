---
column: done
technical: false
refs:
  - drift-resolution/Running tasks/agent.FINISH_CHECK
  - requirements/rules#drift-resolution
drift: 87fnebdi
proposal: null
agent: false
created: 2026-10-11T05:30:20.001Z
finished: 2026-10-11T05:34:58.120Z
---
# Fix code to match the Model: A developer's Run releases failed automatic cases as if it were a developer scan

## What happens

A failed or interrupted automatic case becomes evaluable again when a check of any Run started by the developer is declared, not only when a scan the developer started itself ends. The end-of-run check of a Run belongs to that Run, and the code counts it as a developer scan.

## What should happen

A failed case is re-evaluated only by an explicit request, a change of the Drift, or a scan the developer starts; the end-of-run check stays inside its Run, and an automatic scan does not clear failed cases.

## Chosen option

**Release only for developer scans**

Count only scan jobs started by the developer as releasing failed cases. A developer Run keeps its failed automatic cases excluded until one of the three explicit ways happens. Small change in the scan release rule.

## Where in the code

extension/src/host/drift-resolution.ts: receiveCheck and releaseForDeveloperScan use the origin of the job, not its kind
