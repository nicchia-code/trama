---
column: done
technical: false
refs:
  - drift-resolution/Resolving/proposal.APPROVED
  - requirements/rules#drift-resolution
drift: 1ivhwnhw
proposal: null
agent: false
created: 2026-10-11T06:29:21.466Z
finished: 2026-10-11T06:33:31.538Z
---
# Fix code to match the Model: Approval refusal fails every Drift of an automatic resolution

## What happens

When the automatic resolution Proposal is handed over and approval is refused because one of its Drifts can no longer be fixed, every Drift in that Proposal is marked as failed, including the Drifts whose fix is still possible. Their failure reason is the approval message, not the Drift that caused it.

## What should happen

A case that is not valid stays out and needs intervention, without holding back the other independent cases. Only the Drift whose fix no longer applies should fail; the valid ones should wait for the developer in the open Proposal.

## Chosen option

**Fail only the Drifts the refusal names**

Find which Drifts the refusal names and fail just those. The other Drifts stay open in the Proposal and wait for the developer, as the Model says. Cost: the approval code must map each refusal reason back to its Drift.

## Where in the code

extension/src/host/controller.ts: approveHandedOver, catch branch
