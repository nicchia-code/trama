---
column: done
technical: false
refs:
  - proposal/Draft/agent.EDIT_PROPOSAL
  - proposal/Open/agent.EDIT_PROPOSAL
  - requirements/rules#proposal
drift: null
proposal: 3d6b3838
agent: false
created: 1970-01-01T00:00:00.022Z
---
# Send an open Proposal back to Draft when the agent registers, rewrites or deletes one of its files

A Draft and an open Proposal can be edited; approved, rejected and discarded ones cannot. Registering a file, writing it or marking one for deletion sends an open Proposal back to Draft, even when the file ends up the same, and tells the agent so; a Draft stays a Draft. The rule that editing a file again does not change what was recorded for it, and that deleting a file the Proposal already holds is refused, stays.
