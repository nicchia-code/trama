---
column: done
technical: false
refs:
  - terminal.COMMAND_ENDED
  - task/Taken by the agent
  - task/Free
  - agent-terminal/Agent running
  - agent-terminal/Agent idle
  - requirements/rules#task
drift: null
proposal: dc81bbfc
agent: false
created: 1970-01-01T00:00:00.010Z
---
# Release every taken Task when the agent terminal's command ends

When the command running in the "Trama agent" terminal ends, every Task that carries the mark is released: it stays where it is (In progress) and becomes the developer's. A Task is not released when the terminal cannot report that a command ended (no shell integration). Depends on the mark.
