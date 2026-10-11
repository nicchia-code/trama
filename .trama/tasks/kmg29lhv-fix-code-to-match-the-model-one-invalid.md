---
column: done
technical: false
refs:
  - drift-resolution/Resolving
  - requirements/rules#drift-resolution
drift: cvjzslzr
proposal: null
agent: false
created: 2026-10-11T06:03:57.731Z
finished: 2026-10-11T06:20:50.761Z
---
# Fix code to match the Model: One invalid decision fails every Drift of an automatic resolution

## What happens

An automatic resolution Proposal holds one decision that no longer applies. Its approval is refused, and every Drift in that Proposal is marked as autopilot failed, including the Drifts whose decisions were still valid.

## What should happen

The Proposal stays open and only the Drift whose decision does not apply stays out and needs intervention; the other independent Drifts keep going.

## Chosen option

**Fail only the invalid Drift**

Mark only the Drift whose decision does not apply as autopilot failed. The other Drifts stay in the open Proposal, shown as waiting for the developer's approval, which is still given for the whole Proposal by hand. Cost: approval stays all or nothing, so the developer must act on the whole Proposal before the valid Drifts go on.
