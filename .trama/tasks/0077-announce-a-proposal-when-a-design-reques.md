---
column: done
technical: false
refs:
  - agent-terminal/No agent terminal/developer.ASK_AGENT
  - agent-terminal/Agent running/developer.ASK_AGENT
  - agent-terminal/Agent idle/developer.ASK_AGENT
  - requirements/rules#announcement
drift: null
proposal: "0020"
agent: false
---
# Announce a Proposal when a design request is sent from the terminal launcher

Sending a design request announces a Proposal at once, so the Board has its ghost before the agent has done anything.

- It applies to every design request sent from the terminal launcher, in the three States of the agent terminal, and only when the instruction is actually sent: a request that is left empty, or a cancelled prompt for the agent command, announces nothing.
- The title is the developer's request; for the rework of the stale Proposal of a Drift it is "Rework of Proposal <id>".
- With the chat launcher no announcement is made at the request; the ghost appears when the agent starts the Proposal.
- Fix, scan, implement and import requests announce nothing by themselves.
