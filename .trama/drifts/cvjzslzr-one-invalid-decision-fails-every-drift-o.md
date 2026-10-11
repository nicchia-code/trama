---
status: resolved
resolution: fix-code
refs:
  - drift-resolution/Resolving
  - requirements/rules#drift-resolution
proposal: null
task: kmg29lhv
origin: null
critical: false
option: 1
note: null
resolvedBy: j3ku754e
created: 2026-10-11T06:02:08.976Z
---
# One invalid decision fails every Drift of an automatic resolution

## What happens

An automatic resolution Proposal holds one decision that no longer applies. Its approval is refused, and every Drift in that Proposal is marked as autopilot failed, including the Drifts whose decisions were still valid.

## What should happen

The Proposal stays open and only the Drift whose decision does not apply stays out and needs intervention; the other independent Drifts keep going.

## Fix options

### Fail only the invalid Drift

Mark only the Drift whose decision does not apply as autopilot failed. The other Drifts stay in the open Proposal, shown as waiting for the developer's approval, which is still given for the whole Proposal by hand. Cost: approval stays all or nothing, so the developer must act on the whole Proposal before the valid Drifts go on.

### Remove the invalid decision before approval

Before approving, the host removes the decision that no longer applies from the automatic Proposal and approves the rest. Cost: the host edits a Draft the agent wrote and approves something other than what the agent submitted, which weakens the rule that only the submitted decisions are applied.
