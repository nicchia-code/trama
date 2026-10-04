---
column: done
technical: false
refs:
  - question-round
  - question-round/Unanswered
  - requirements/tech#question-round
drift: null
proposal: "0030"
agent: false
---
# Teach the skills to retry trama ask outside Cursor's sandbox and to wait for its result

The skills that ask the developer through `trama ask` tell the agent:

- when `trama ask` answers that the editor is not reachable while the command runs in Cursor's sandbox (`CURSOR_SANDBOX` set), to repeat it once outside the sandbox, asking Cursor for permission, and only then to use its own questions;
- that Cursor moves a command lasting more than 30 seconds to the background, so it waits for `trama ask` until its result, without treating it as failed or repeating it.
