---
column: done
technical: false
refs:
  - task/Taken by the agent/cursor-chat.AGENT_STOPPED
  - task/Taken by the agent/cursor-chat.AGENT_INTERRUPTED
  - task/Taken by the agent/cursor-chat.CONVERSATION_CLOSED
  - requirements/tech#cursor-chat
  - requirements/rules#agent-terminal
drift: null
proposal: "0030"
agent: false
---
# Release the Tasks taken by Cursor's chat agent when its turn ends

In Cursor's chat the agent has no command that ends. Every Task of the project taken by Cursor's chat agent goes back to To do as soon as the turn of a Trama conversation of the same project ends, normally or interrupted or in error, and when such a conversation is closed, even if the agent is only waiting for a text reply. When the agent resumes, it moves the Task it needs to In progress again and takes it again.

Conversations that are not Trama's release nothing.
