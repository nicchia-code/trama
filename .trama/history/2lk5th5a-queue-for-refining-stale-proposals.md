---
created: 2026-10-24T07:19:11.268Z
updated: 2026-10-24T07:19:11.268Z
summary: With the auto-update setting on, approved stale Proposals are refined one at a time in Backlog order, then approved when delivered.
tasks:
  - p3qjuwk4
---
# Queue for refining stale Proposals

The refinement queue lives in the host. A Proposal is queued on approve when the setting is on and it can be refined. Each run refines the first queued Proposal. A delivered Proposal still stale after its run is queued again without a cap, as the Model says. A Proposal not delivered is dropped and stays open. A blocked one is kept with its reason. Turning the setting off clears the queue; a running refinement finishes. Cancel removes a queued Proposal. The live VS Code scenarios were not run; the queue functions were smoke-run with stubs for the approval path.
