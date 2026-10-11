---
status: resolved
resolution: fix-code
refs:
  - drift-resolution/Resolving/proposal.APPROVED
  - requirements/rules#drift-resolution
proposal: null
task: 3iedd5fk
origin: null
critical: false
option: 1
note: null
resolvedBy: v7dgtq79
created: 2026-10-11T06:27:54.525Z
---
# Approval refusal fails every Drift of an automatic resolution

## What happens

When the automatic resolution Proposal is handed over and approval is refused because one of its Drifts can no longer be fixed, every Drift in that Proposal is marked as failed, including the Drifts whose fix is still possible. Their failure reason is the approval message, not the Drift that caused it.

## What should happen

A case that is not valid stays out and needs intervention, without holding back the other independent cases. Only the Drift whose fix no longer applies should fail; the valid ones should wait for the developer in the open Proposal.

## Fix options

### Fail only the Drifts the refusal names

Find which Drifts the refusal names and fail just those. The other Drifts stay open in the Proposal and wait for the developer, as the Model says. Cost: the approval code must map each refusal reason back to its Drift.

### Check each fix before handing over

Before approving, check every fix against the Model as it will be after the Proposal, so a refused Drift is known per Drift and the Proposal is kept open with only that case failed. Cost: the check runs twice, once before and once in the approval, and must follow the approval rules exactly.

### Keep failing the whole Proposal and say so in the Model

Leave the code as it is and change the Model so that an approval refusal fails every Drift of the automatic resolution. Cost: the Model would then allow a valid Drift to fail because of another one, which weakens the rule that only invalid cases leave the collection.

## Where in the code

extension/src/host/controller.ts: approveHandedOver, catch branch
