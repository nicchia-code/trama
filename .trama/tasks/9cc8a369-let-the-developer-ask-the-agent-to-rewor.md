---
column: done
technical: false
refs:
  - developer.ASK_AGENT
  - agent-terminal
  - requirements/rules#agent-terminal
drift: null
proposal: 80b32cae
agent: false
created: 1970-01-01T00:00:00.053Z
---
# Let the developer ask the agent to rework the stale Proposal of a Drift

A new request to the agent sends one line naming the design skill, without questions, that says Proposal <p>, attached to Drift <d>, is stale and asks for a new Proposal making the same change on the current Model and Requirements, handed over and attached to the Drift in place of the stale one. It is refused unless the Drift is open and its attached Proposal is open and stale. It goes through the same launcher (terminal or chat) as the other requests.
