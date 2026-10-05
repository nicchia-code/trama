---
column: done
technical: false
refs:
  - question-round
  - notice/Waiting
  - requirements/rules#notice
  - requirements/tech#question-round
drift: null
proposal: e45e35f3
agent: false
created: 1970-01-01T00:00:00.144Z
---
# Notify about the questions asked by Cursor's chat agent

`trama ask` run from the shell of Cursor's agent (`CURSOR_AGENT=1`) tells the editor that the round comes from Cursor's agent. The round belongs to the most recently active window with the project open, since the chat agent does not carry the window that launched it.

With an ntfy topic set, when such a round becomes the one presented to the developer, a question notice is born exactly as for a round asked from a Trama terminal: one per round, cancelled when the round closes.
