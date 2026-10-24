---
created: 2026-10-24T07:19:10.929Z
updated: 2026-10-24T07:19:10.929Z
summary: trama proposal edit with rebase records the current starting version of each file, so a stale Draft is no longer stale; it shows as refining until handed over.
tasks:
  - 97ddz769
---
# Rebase a stale Draft in place

A stale Proposal is one whose recorded starting version of a file no longer matches the Model. `rebase` in `trama proposal edit` records the current starting version again. The Proposal is marked refining until it is handed over, and `refining` is shown in proposal show, proposal list and project show, and in the snapshot as `ProposalView.refining`.
