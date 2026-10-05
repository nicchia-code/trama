---
column: done
technical: false
refs:
  - task
  - requirements/data#task
  - requirements/rules#task
drift: null
proposal: null
agent: false
created: 1970-01-01T00:00:00.001Z
---
# Let a Task carry the Proposal it comes from

A Task can be created linked to a Proposal (its design), from the command line and from the agent tool that creates Tasks. The Proposal must exist, in any status; a link to a missing Proposal is refused. The link is optional: Tasks without it, including every Task written before the field existed, keep loading and behaving as today. Task views (show, JSON summaries, the snapshot the Board uses) expose the link.
