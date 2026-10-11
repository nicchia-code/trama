---
column: done
technical: false
refs:
  - drift-resolution/Free
  - requirements/quality#drift-resolution
drift: 93emt4dn
proposal: null
agent: false
created: 2026-10-11T06:03:57.708Z
finished: 2026-10-11T06:18:43.575Z
---
# Fix code to match the Model: A skipped question is later applied as an automatic fix

## What happens

A Drift whose question the developer skipped in a manual Resolve Drifts round stays open. Later, once autopilot is turned on or raised to yolo and Resolve Drifts is asked again, that Drift is picked up as eligible and its first recommended fix is applied without the developer answering it.

## What should happen

A skipped question leaves its Drift open and out of the resolution, and no recommended fix is applied to it without a new decision from the developer.

## Chosen option

**Keep skipped Drifts out for this session**

Record a skipped question like a failed case: the Drift stays out of automatic collections, with the reason shown on its card, until the developer changes the Drift, starts a scan, or answers its question in a later round. Cost: the exclusion lives in the window's memory, so after the editor reopens a skipped Drift can be picked again.

## Where in the code

extension/src/host/controller.ts (eligibleDrifts, launchAction resolve-drifts)
