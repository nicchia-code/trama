---
column: done
technical: false
refs:
  - proposal/Draft/agent.SUBMIT_PROPOSAL
  - requirements/rules#proposal
drift: null
proposal: "0010"
agent: false
---
# Let the agent hand a Draft over with a submit that checks it first

Only a Draft can be handed over; it becomes open. The hand-over is refused, and the Proposal stays a Draft, when the Model and Requirements with the Proposal applied (on top of the Proposals it requires) would have errors or when a file it holds was never registered with it; the refusal names each problem. Being stale, or requiring Proposals that are not approved yet, does not refuse the hand-over. Handing over a Proposal that is not a Draft is refused.
