---
column: done
technical: false
refs:
  - proposal/Draft
  - proposal/Discarded
  - requirements/data#proposal
  - requirements/rules#proposal
drift: null
proposal: "0010"
agent: false
---
# Give Proposals the Draft and Discarded statuses and start every new Proposal as a Draft

A Proposal can be a draft, open, approved, rejected or discarded. A Proposal file without a status counts as open, so existing Proposals stay handed over. Every new Proposal starts as a Draft, whether ordinary, import or attached to a Drift. A new Proposal may not require a rejected or a discarded one. A Proposal that requires a Draft or a discarded Proposal is blocked, and the reasons given for the block say "still being written" or "was discarded" (in the command line, the agent tools and the editor). A Draft that is required is not applied under the Proposals that require it as if approved only because it is open: it stays blocking. Update docs/model-format.md and docs/cli.md for the new statuses.
