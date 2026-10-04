---
column: done
technical: true
refs:
  - requirements/tech#General
  - requirements/tech#agent-terminal
  - requirements/tech#cursor-chat
  - requirements/quality#cursor-chat
drift: null
proposal: null
agent: false
---
# Document Cursor as a first-class editor

The documentation, the README and the acceptance script describe Cursor as an editor supported like VS Code: the `auto` launcher and its default, the delivery to Cursor's chat with its fallbacks, the PATH line of the instruction, the Scan now notice, the hooks in `~/.cursor/hooks.json` written by Initialize and Update skills, what happens to taken Tasks, ghosts and ntfy notices at the end of a turn, the retry of `trama ask` outside the sandbox, the Cursor CLI as an agent command, and that Cursor's Agents Window is not supported.

The acceptance script has a Cursor smoke test (a design request and a `trama ask`) to run on every new Cursor version before declaring it supported; the tested versions are 3.22.12 and 3.23.12.
