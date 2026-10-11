---
column: done
technical: false
refs:
  - agent-terminal/Agent running
  - requirements/rules#agent-terminal
drift: null
proposal: null
agent: false
created: 2026-10-11T05:02:21.766Z
finished: 2026-10-11T05:08:28.110Z
---
# Announce the automatic resolution's Proposal as Resolve Drifts when its terminal starts

When the autopilot starts the automatic resolution of Drifts (the step that opens a new agent terminal for the collection), the Board shows a ghost of the Proposal named Resolve Drifts as soon as the instruction is written in the terminal, belonging to that terminal, exactly as for a manual Resolve Drifts request. When the agent opens its Draft the ghost becomes that Draft, and it is withdrawn if the terminal's agent finishes or the terminal closes without delivering it. Nothing is announced when the instruction is not delivered.
