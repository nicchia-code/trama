---
column: done
technical: false
refs:
  - proposal/Draft/agent.SUBMIT_PROPOSAL
  - proposal/Draft/developer.DISCARD_PROPOSAL
  - requirements/tech#proposal
  - requirements/tech#agent-terminal
drift: null
proposal: "0010"
agent: false
---
# Add the commands trama proposal submit and trama proposal discard (the second developer-only)

The command line can hand a Proposal over and discard a Draft. Discard is refused while TRAMA_AGENT is set, like approve and reject. The command line's help and docs/cli.md list both, and say that a new Proposal is a draft and that registering a file sends an open Proposal back to Draft.
