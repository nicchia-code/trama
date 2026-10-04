---
status: resolved
resolution: dismissed
refs:
  - requirements/rules#proposal
  - proposal/Open/developer.REJECT_PROPOSAL
proposal: null
task: null
origin: null
---
# Proposal rejection accepts feedback with no text

requirements/rules#proposal says rejection needs feedback text. The editor input enforces nonblank feedback (extension/src/host/controller.ts:185-192), but the shared rejectProposal operation accepts whitespace-only feedback, changes status to rejected and appends an empty Feedback section (src/core/proposals.ts:312-317). The CLI only checks that --feedback is present, not that it contains text (src/cli/commands.ts:89-92,224-226), so it exposes the same permissive path. A disposable project probe submitted a valid Proposal and passed three spaces to rejectProposal; the persisted result was rejected with an empty Feedback section. The expected Requirement is refusal without changing the open Proposal when no feedback text is supplied. No open Task or Drift already covers this discrepancy. No code or repository Model/Requirements changed during the probe.
