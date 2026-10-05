---
column: done
technical: false
refs:
  - developer.ASK_AGENT
  - agent-terminal/No agent terminal
  - agent-terminal/Agent running
  - agent-terminal/Agent idle
  - requirements/rules#agent-terminal
  - requirements/tech#agent-terminal
drift: null
proposal: "01636896"
agent: false
created: 1970-01-01T00:00:00.015Z
---
# Let the developer ask the agent to fix a problem

Asking for a fix is a new way of asking the agent to work, launched exactly like a design request: the developer's description of the problem is asked for in an input box when the button did not carry one, an empty description sends nothing, and the instruction sent is one line, "Use the trama-fix skill. <the developer's description of the problem>". It goes through the same terminal rules as every other request (new terminal when the last one is busy, reuse when idle) and through the chat launcher when that is set. It can also be asked from a command, "Trama: Fix with Agent…", without opening the panel.
