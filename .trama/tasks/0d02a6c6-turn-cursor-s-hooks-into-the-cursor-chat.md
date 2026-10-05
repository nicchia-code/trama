---
column: done
technical: false
refs:
  - cursor-chat.PROMPT_SUBMITTED
  - cursor-chat.AGENT_STOPPED
  - cursor-chat.AGENT_INTERRUPTED
  - cursor-chat.CONVERSATION_CLOSED
  - requirements/tech#cursor-chat
  - requirements/quality#cursor-chat
  - requirements/rules#agent-terminal
drift: null
proposal: e45e35f3
agent: false
created: 1970-01-01T00:00:00.136Z
---
# Turn Cursor's hooks into the cursor-chat Events

Trama follows the conversations of Cursor's chat through Cursor's hooks.

- A new command `trama cursor-hook` reads the JSON that Cursor passes to the hook on standard input. It finds the editor of the project (the first folder of `workspace_roots` that holds `.trama/model/system.md`) through the same local records as `trama ask`, sends it the event, the conversation and the project folder, never the prompt, and ends at once. It never blocks Cursor: it answers `{"continue": true}` to `beforeSubmitPrompt` and `{}` to the others, gives up after one second without an editor, always exits with 0, and writes nothing to disk.
- The editor marks a conversation as Trama's when a prompt starts with «Use the trama-» or «/trama-», whether Trama or the developer wrote it. From then on every prompt is `PROMPT_SUBMITTED`; `stop` with `completed` is `AGENT_STOPPED`, with `aborted` or `error` `AGENT_INTERRUPTED`; `sessionEnd` with `window_close` or `user_close` is `CONVERSATION_CLOSED` and the conversation is no longer Trama's, other reasons produce nothing.
- Events of conversations that are not Trama's are ignored. The list of Trama's conversations lives only in the editor's memory and is lost when it restarts.
