---
created: 2026-10-24T16:30:10.060Z
updated: 2026-10-24T16:30:10.060Z
summary: Stale Proposals refine in parallel on independent chains from one queue shared by Approve and the new Refine All, which the Board can cancel, and a Run holds approval of refined Proposals until it ends.
tasks:
  - 3unikug3
  - qi8v06xv
  - p78pzkxy
---
# Parallel refinements and Refine All

Refining stale Proposals is no longer one at a time. One in-memory queue per window, in Backlog order, is shared by Approve and the new Refine All. Queued Proposals and Proposals being refined are split into chains by shared touched files or requires, and independent chains work together, one refinement at a time inside a chain. The seats are shared out of the maxParallelAgents limit, 20 when unset, so the sub-agents of all refinements never exceed it. Each refinement is its own job with its own terminal or omp Chat conversation. It is not a Run or a resolution, so it blocks nothing else.

When a refinement ends, a delivered, open and unblocked Proposal is approved with the same function and follow-up steps as the panel's Approve. A Proposal that is stale again goes back in the queue. A blocked or undelivered one stays Open with its reasons.

Refine All queues every refinable Proposal at once, together with those held back only by required Proposals that are queued or being refined too. It is unavailable with the setting off or with nothing to refine, but not during a Run. Cancel Refine All empties the whole queue after 2 seconds and leaves running refinements to finish. The refineAll and cancelRefineAll messages are new, and the Board data now carries running, queued with the reason for each wait, and refineAll.

The Board has a second item in the arrow menu of + Add Work Item, after Unify Drifts. It reads Refine All (n) or Cancel Refine All, shows the reasons when disabled, and enables Cancel by itself after 2 seconds. Several cards can be refining together, and the queued badge says what each Proposal waits for: an approval, a chain predecessor or a free slot.

Single Approve is still refused during a Run with A run is in progress. Refine All is allowed during a Run, but the refined Proposals wait with the waiting for the run badge and are approved when the Run ends, so the Run works on a stable Model.
