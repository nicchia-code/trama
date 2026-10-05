---
column: done
technical: false
refs:
  - announcement/Announced/cursor-chat.AGENT_INTERRUPTED
  - announcement/Announced/cursor-chat.CONVERSATION_CLOSED
  - requirements/rules#announcement
  - requirements/data#announcement
  - requirements/tech#cursor-chat
drift: null
proposal: e45e35f3
agent: false
created: 1970-01-01T00:00:00.142Z
---
# Withdraw the ghosts announced by Cursor's chat agent when its conversation is interrupted or closed

An announcement made by Cursor's chat agent (with `chat`) belongs to no terminal but to the project.

- An interrupted or failed turn of a Trama conversation of the same project withdraws it: the ghost disappears at once and the developer is told that the agent stopped without delivering what it announced, as at the end of the command.
- Closing a Trama conversation of the same project withdraws it without any notice.
- A turn that ends normally withdraws nothing: the arrival of the card or the fifteen minutes of quiet take care of it.
