---
column: done
technical: false
refs:
  - drift/Open/agent.REPLACE_DRIFT_PROPOSAL
  - drift.PROPOSAL_REPLACED
  - agent.REPLACE_DRIFT_PROPOSAL
  - proposal/Open/drift.PROPOSAL_REPLACED
  - requirements/rules#drift
  - requirements/tech#drift
drift: null
proposal: 80b32cae
agent: false
created: 1970-01-01T00:00:00.052Z
---
# Let the agent replace the stale Proposal of a Drift, rejecting the old one

The agent can name a newer Proposal for an open Drift whose attached Proposal is open and stale. The new Proposal is attached in place of the old one; the old one is rejected at once with the feedback that it was replaced by the new one, and the Proposals that require it stay blocked saying it was rejected. The command and the agent tool refuse when the Drift is resolved, the attached Proposal is not open and stale, or the new Proposal does not exist, is the attached one, or was rejected or discarded. The command is not developer-only.
