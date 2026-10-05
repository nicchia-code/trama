---
column: done
technical: false
refs:
  - drift/Open/developer.DISMISS_DRIFT
  - drift/Open/developer.ACCEPT_DRIFT_PROPOSAL
  - requirements/rules#drift
drift: null
proposal: 80b32cae
agent: false
created: 1970-01-01T00:00:00.051Z
---
# Refuse to dismiss a Drift that has a Proposal, and name why an attached Proposal cannot be accepted

Dismissing a Drift with an attached Proposal, in any state, changes nothing and says to accept that Proposal or to fix the code. Accepting through a Drift is refused with the reason the Proposal cannot be approved: still being written, rejected, discarded, already approved, stale, invalid or waiting for others. Dismissing a Drift without a Proposal closes it with nothing changed, as before.
