---
column: done
technical: false
refs:
  - agent-terminal
  - agent-terminal/No agent terminal/developer.ASK_AGENT
  - requirements/tech#agent-terminal
  - requirements/tech#General
  - requirements/rules#agent-terminal
  - requirements/quality#cursor-chat
drift: null
proposal: "0030"
agent: false
---
# Add the auto launcher and send the instruction to Cursor's chat by itself

Cursor is a first-class editor.

- `trama.agentLauncher` gains `auto`, the new default: the chat in Cursor, the terminal in every other editor. `terminal` and `chat` chosen by hand always win. In Cursor a ready launcher does not need `trama.agentCommand`. The setting's descriptions say so.
- In Cursor the chat launcher tries, in this order: a new chat that sends the instruction by itself (`composer.createNew` with `autoSubmit`); the prompt deeplink with `workspace` and `mode=agent`, which waits for the developer's confirmation and Enter, skipped when Cursor would refuse the text (empty, over 10,000 characters encoded, containing `.env` or similar); the clipboard with the paste notice.
- A step that is missing or fails moves to the next one silently; only the clipboard tells the developer. The same step is never tried twice for the same prompt.
- If the new chat was created but, with the hooks installed, no `PROMPT_SUBMITTED` arrives for that prompt within ten seconds, Trama tells the developer and does not retry.

The chat of other editors keeps working as before.
