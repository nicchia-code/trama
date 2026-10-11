---
status: resolved
resolution: fix-code
refs:
  - drift-resolution/Resolving
  - requirements/rules#drift-resolution
proposal: null
task: nhpx3033
origin: null
critical: false
option: 1
note: null
resolvedBy: rvgvxbgd
created: 2026-10-11T06:42:01.759Z
---
# A resolution that ends without a Draft or abnormally replaces the reasons of its Drifts

## What happens

When the resolution agent ends without handing over a Draft, or ends abnormally, every Drift of the collection is marked as failed with one generic reason. The specific reason the agent had already reported for a Drift that could not be applied is lost, and Drifts already resolved by an approved Proposal of the same collection are marked as failed too.

## What should happen

A failure is shown with the identity of the Drift and **its own reason**. A collection with nothing applicable creates no resolution, and what was already reported or already resolved is kept: only Drifts with no recorded outcome take the generic reason.

## Fix options

### Mark only Drifts without an outcome

On such an end, skip Drifts that already carry a reported failure or were resolved by an approved Proposal of the collection, and mark the rest with the generic reason. Cost: a few more checks when the collection ends.

### Keep the generic reason but append the earlier one

Mark every Drift as today, but keep the reason the agent reported inside the new text. Cost: longer messages, and resolved Drifts still show a failure.

## Where in the code

extension/src/host/controller.ts (advanceCollection, failCollection); extension/src/host/drift-resolution.ts (recordAutopilotFailure)
