---
column: done
technical: false
refs:
  - task/Taken by the agent
  - announcement/Announced
  - requirements/tech#cursor-chat
  - requirements/tech#agent-terminal
  - requirements/data#announcement
drift: null
proposal: "0030"
agent: false
---
# Treat Cursor's chat agent as the agent in the command line

The commands run from the shell of Cursor's agent, recognised by `CURSOR_AGENT=1` (Cursor sets it in its agent's shell and not in the developer's terminals), count as the agent's, exactly as with `TRAMA_AGENT=1`:

- moving a Task to In progress takes it, while the same move made by the developer does not;
- the developer-only commands (approve, reject, discard, resolve a Drift, take a Task back) are refused;
- an announcement made this way without `TRAMA_TERMINAL` carries the field `chat` set to `cursor` and no `terminal`. The field is absent otherwise, and announcements written before it existed still read.

The choice is recorded in a new ADR, with the reservation of ADR 0005: the guard stops an agent that makes a mistake, not one that clears the variable on purpose.
