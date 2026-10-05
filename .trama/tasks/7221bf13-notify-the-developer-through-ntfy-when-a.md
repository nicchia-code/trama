---
column: done
technical: false
refs:
  - notice/Waiting
  - notice/Waiting/cursor-chat.PROMPT_SUBMITTED
  - cursor-chat.AGENT_STOPPED
  - cursor-chat.AGENT_INTERRUPTED
  - requirements/rules#notice
  - requirements/ui#notice
  - requirements/data#notice
drift: null
proposal: e45e35f3
agent: false
created: 1970-01-01T00:00:00.143Z
---
# Notify the developer through ntfy when a turn of a Trama conversation in Cursor ends

With an ntfy topic set, every end of turn of a Trama conversation in Cursor's chat gives birth to an end notice, whether the turn ended normally, was interrupted or failed; closing the conversation gives birth to none. Two turns ending in two conversations give two notices. A conversation the developer started by typing a Trama skill counts as Trama's.

- The notice has the usual title and Board summary; its outcome line is `The agent stopped and may be waiting for you.` (priority 3, tag `white_check_mark`) after a normal end, and `The agent was interrupted or failed.` (priority 4, tag `warning`) otherwise.
- Every new prompt sent to a Trama conversation cancels the end notices of the same project still waiting.
- The description of the ntfy setting says that it also covers Trama's conversations in Cursor's chat, at the end of each turn, and not the chat of other editors.
