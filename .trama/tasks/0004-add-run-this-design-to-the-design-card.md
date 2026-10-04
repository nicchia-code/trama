---
column: done
technical: false
refs:
  - developer.ASK_AGENT
  - panel/Board
  - requirements/rules#agent-terminal
  - requirements/rules#task
drift: null
---
# Add Run this design to the design card

The design card has a button that asks the agent to implement the design's Tasks that are in To do, in order, stopping at the first Drift. The instruction names the Proposal and is refused if the Proposal does not exist. The button is not available when the design has no Task in To do. Depends on the design card.
