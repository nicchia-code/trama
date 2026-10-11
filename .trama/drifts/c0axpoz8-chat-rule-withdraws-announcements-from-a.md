---
status: resolved
resolution: proposal
refs:
  - announcement/Announced/editor-chat.AGENT_STOPPED
proposal: null
task: null
origin: null
critical: false
option: null
note: null
resolvedBy: kma581p8
created: 2026-10-11T06:01:14.795Z
---
# Chat rule withdraws announcements from agents Trama did not start

## What happens

An announcement made from a terminal that Trama did not start, with no Cursor marker, is marked as made by the editor chat. When a Copilot chat turn of the project ends, every such announcement is withdrawn, with the notice, although the agent in that terminal may still be working.

## What should happen

The Model says that an announcement made by an agent Trama did not start belongs to no terminal and is withdrawn only when the editor starts. It also says that the announcements of the editor chat's agent are withdrawn when a chat turn ends, and the Copilot chat cannot be told apart from such a terminal, because it does not mark its agent's commands. The two statements cannot both hold.

## Fix options

### Keep the chat rule and correct the Model sentence

Every announcement without a Trama terminal is withdrawn when a Copilot chat turn ends, as now, and the Model sentence on agents Trama did not start is rewritten to say so. Costs: an announcement from an external terminal can vanish while its agent still works; the card still arrives when it is filed.

### Withdraw these only when the editor starts

Announcements without a Trama terminal and without the Cursor marker are kept until the card arrives or the editor starts, and Copilot chat turns no longer withdraw them. Costs: a Copilot chat turn that ends without delivering leaves its ghost on the Board until the editor restarts.
