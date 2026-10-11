---
status: resolved
resolution: fix-code
refs:
  - drift-resolution/Resolving
  - requirements/rules#drift-resolution
proposal: null
task: 7uolg9d0
origin: null
critical: false
option: 1
note: null
resolvedBy: v7dgtq79
created: 2026-10-11T06:27:54.944Z
---
# Rejected automatic resolution marks its undecided Drifts as failed

## What happens

When the developer rejects or discards the automatic resolution Proposal, the Drifts it covered that were not already failed are marked as failed with the reason that no automatic fix decision was submitted. A decision was submitted; it was just not accepted by the developer.

## What should happen

A rejection does not authorize code from the incomplete group. Valid Drifts stay open and wait for the developer, without being failed or given a wrong reason. Only the invalid Drifts fail.

## Fix options

### Leave undecided Drifts open after a rejection

When the Proposal is rejected or discarded, release the Drifts that were not failed: they stay open, unmarked, and wait for the developer's own decision. Cost: nothing is marked as failed, so the developer must notice the rejected Proposal to act on those Drifts.

### Keep the failure but give the true reason

Keep the current failure marks on undecided Drifts, but change the reason to say that the automatic resolution was rejected. Cost: the Drifts still show an autopilot failure badge that the developer did not cause by a fault in the Drift.

### Mark only the Drifts the developer rejected

Treat a rejection as a decision on the whole Proposal, so Drifts it did not mention in a rejected decision stay open. Cost: the rule to tell rejected decisions apart from undecided ones needs a new record in the Proposal.

## Where in the code

extension/src/host/controller.ts: advanceCollection, awaiting Drift set and the failure loop
