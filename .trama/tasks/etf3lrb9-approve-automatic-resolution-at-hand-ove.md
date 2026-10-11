---
column: done
technical: false
refs:
  - drift-resolution
  - proposal
  - requirements/rules#drift-resolution
  - requirements/tech#drift-resolution
drift: null
proposal: lzg4385e
agent: false
created: 2026-10-11T04:35:37.222Z
finished: 2026-10-11T04:47:44.918Z
---
# Approve automatic resolution at hand-over

When the resolution Proposal of an automatic collection is handed over while the collection is still in the Resolving state and the automatic approval is still authorized and valid, approve it at once (ordinary approval). Today the approval only happens after the resolution agent job has ended, inside the autopilot coordination, so the Model transition on proposal SUBMITTED is not done at hand-over. An approval that no longer applies keeps the Proposal open and reports that intervention is required.
