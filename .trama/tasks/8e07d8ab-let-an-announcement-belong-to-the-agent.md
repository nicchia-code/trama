---
column: done
technical: false
refs:
  - announcement
  - agent-terminal
  - requirements/data#announcement
  - requirements/rules#announcement
  - requirements/tech#announcement
drift: null
proposal: 5cda85ec
agent: false
created: 1970-01-01T00:00:00.086Z
---
# Let an announcement belong to the agent terminal it runs in

Every terminal Trama starts for an agent has an identity of its own, six random lowercase letters and digits, that stays with it for as long as it exists, including when it is reused. An announcement can carry the identity of the terminal it belongs to, or none; announcements written before this existed belong to none. What the agent announces from such a terminal, with the command line or the tools, and a Proposal the agent starts that makes an announcement of its own, belong to that terminal; an agent started outside Trama, or from the editor's chat, announces cards that belong to none. The announcement Trama makes for a design request, including the rework of a stale Proposal, belongs to the terminal the instruction is typed into. The Draft still takes the oldest waiting announcement of a design request, whatever its terminal.
