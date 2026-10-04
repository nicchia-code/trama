---
column: done
technical: true
refs:
  - requirements/tech#announcement
  - requirements/ui#panel/Board
  - requirements/data#announcement
drift: null
proposal: null
agent: false
---
# Update the documentation and acceptance script for announcements and the ghost

The documentation and the manual acceptance script describe the new behaviour.

- The command line and tool reference and the file format reference cover the announce command and tool, the announcement option of the commands that create a card, and the announcements folder with its ignore file.
- The acceptance script covers the ghost after a design request with the terminal launcher and with the chat launcher, the phases, its replacement by the real card, the notice when the agent ends or stops, and that the ghost is not counted.
- The acceptance script no longer expects a ghost when a Task is moved.
