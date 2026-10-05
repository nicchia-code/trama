---
column: done
technical: false
refs:
  - agent-terminal
  - requirements/rules#agent-terminal
  - requirements/tech#project
drift: null
proposal: e45e35f3
agent: false
created: 1970-01-01T00:00:00.139Z
---
# Tell Cursor's chat agent where the trama program is

Cursor starts its agent's commands without the PATH the extension adds to the editor's terminals, so every instruction sent to Cursor's chat has a second line, after the language sentence when there is one: `The trama command may not be on your PATH. Before anything else run: export PATH="<folder of the trama program shipped in the extension>:$PATH"`.

Without a program shipped for this platform the line is not there. With the terminal launcher and with the chat of other editors the instruction stays one line.
