---
column: done
technical: false
refs:
  - announcement/Announced/terminal.CLOSED
  - announcement/Announced/agent-hook.IDLE
drift: ugxjrbs6
proposal: null
agent: false
created: 2026-10-11T06:03:57.690Z
finished: 2026-10-11T06:09:47.298Z
---
# Fix code to match the Model: Announcements of a resumed agent survive its terminal closing

## What happens

Once an agent terminal has gone quiet, its command has ended or its agent went idle, Trama stops following it, and the terminal stays open. If the developer then writes a new prompt there and the agent makes announcements, those announcements are not withdrawn when the terminal is closed, nor by a later idle signal from that agent. Their ghosts stay on the Board until the editor restarts.

## What should happen

Every announcement that belongs to an agent terminal and is still waiting is withdrawn, with the usual notice, when that terminal is closed, and when its agent goes idle. Whether or not the agent was resumed, closing its terminal ends the work it announced, so its waiting announcements must not survive the close.

## Chosen option

**Keep watching the terminal until it closes**

Trama keeps the terminal's identity for announcements after its command or agent has ended, and withdraws what is still waiting on the next idle signal or on closing. Costs: the editor remembers each opened terminal until it closes; no Run or Task is affected, since those still end with the first end.

## Where in the code

extension/src/host/agent.ts (terminal end, idle and close handling)
