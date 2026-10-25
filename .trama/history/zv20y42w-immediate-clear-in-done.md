---
created: 2026-10-24T14:06:35.242Z
updated: 2026-10-24T14:06:35.242Z
summary: Clear reads Proposals and History once per call and the Board hides the cleared cards at the click until the host finishes.
tasks:
  - w4iwzta1
cleared:
  w4iwzta1:
    title: Clear immediato in Done
    proposal: kbcic7up
    tag: Clear Done
    finished: 2026-10-24T13:58:50.277Z
    refs:
      - developer.CLEAR_DONE
      - requirements/ui#developer.CLEAR_DONE
      - requirements/tech#developer.CLEAR_DONE
      - requirements/quality#developer.CLEAR_DONE
---
# Immediate Clear in Done

Clear on a project with hundreds of Tasks took many seconds and looked like it did nothing. clearDoneTasks now reads Proposals, History entries and open Drifts once per call, and the Board removes the cards Clear deletes at the click and keeps them hidden until the host sends clearDoneEnded.
