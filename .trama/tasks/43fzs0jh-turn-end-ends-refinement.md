---
column: done
technical: false
refs:
  - raffinamento/Al lavoro/omp-acp.TURN_ENDED
drift: null
proposal: kv1x3wmx
agent: false
created: 2026-10-24T14:42:09.104Z
finished: 2026-10-24T15:32:46.337Z
---
# Turn end ends a refinement

When a refinement runs in an omp Chat conversation, its end is omp's answer over ACP to the refinement's prompt with the end of the turn (no developer message waiting), as the hook at rest is in a terminal; the hook no longer reports idle in conversations.

At that answer the refinement job ends through the same end of work as a terminal (`endAgentWork` in `extension/src/host/agent.ts`), and its end (`endRefinement` in `extension/src/host/controller.ts`) looks at the refined Proposal as the Machine says: delivered and not blocked it is approved (or waits for a Run of this window to end); delivered but stale again it rejoins the queue in Backlog order; delivered but blocked otherwise it stays Open with the reason; not delivered it goes back to refinable; rejected with Remove nothing is left. Then the first Proposal of the queue that is still refinable starts and the refinement stays Al lavoro; when none is left, or its instruction does not really start, the queue empties and the refinement goes back to Fermo.
