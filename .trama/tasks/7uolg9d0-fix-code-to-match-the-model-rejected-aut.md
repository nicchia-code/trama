---
column: done
technical: false
refs:
  - drift-resolution/Resolving
  - requirements/rules#drift-resolution
drift: pvc9fe70
proposal: null
agent: false
created: 2026-10-11T06:29:21.481Z
finished: 2026-10-11T06:34:39.753Z
---
# Fix code to match the Model: Rejected automatic resolution marks its undecided Drifts as failed

## What happens

When the developer rejects or discards the automatic resolution Proposal, the Drifts it covered that were not already failed are marked as failed with the reason that no automatic fix decision was submitted. A decision was submitted; it was just not accepted by the developer.

## What should happen

A rejection does not authorize code from the incomplete group. Valid Drifts stay open and wait for the developer, without being failed or given a wrong reason. Only the invalid Drifts fail.

## Chosen option

**Leave undecided Drifts open after a rejection**

When the Proposal is rejected or discarded, release the Drifts that were not failed: they stay open, unmarked, and wait for the developer's own decision. Cost: nothing is marked as failed, so the developer must notice the rejected Proposal to act on those Drifts.

## Where in the code

extension/src/host/controller.ts: advanceCollection, awaiting Drift set and the failure loop
