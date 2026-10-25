---
created: 2026-10-24T07:19:11.102Z
updated: 2026-10-24T20:56:02.145Z
summary: The Board shows a stale Proposal being refined as queued, running or stopped, with reasons on Approve and a Cancel button for queued ones.
tasks:
  - o1b3e307
  - 29oktgs5
cleared:
  o1b3e307:
    title: Scheda da raffinare
    proposal: 7p3ekjn9
    tag: Auto-update Stale
    finished: 2026-10-24T06:53:56.982Z
    refs:
      - panel
      - requirements/ui#panel/Board
      - requirements/ui#panel/Settings
      - requirements/ui#raffinamento
      - requirements/rules#setup-wizard
  29oktgs5:
    title: Link refinement ghost to its Proposal
    finished: 2026-10-24T20:48:17.129Z
    refs:
      - raffinamento
      - requirements/tech#raffinamento
      - requirements/ui#raffinamento
---
# Board card for refining Proposals

The card shows the refinement status and its queue position. Approve is disabled while the Proposal is queued or running and says why. A queued Proposal has a Cancel button that takes it out of the queue. A running card shows the phase and the agent's note. The Diagram changed-files block has a heading for each status.
