---
status: resolved
resolution: fix-code
refs:
  - task/Taken by the agent/cursor-chat.AGENT_STOPPED
proposal: null
task: 8f025ba4
origin: 7b366b02
option: 1
note: Diamo per scontato che si usi un sistema alla volta (chat o terminal)
created: 1970-01-01T00:00:00.010Z
---
# Trama cannot tell which agent took a Task

## What happens

A taken Task only records **that** the agent has it, not **which** agent: the terminal Trama started and Cursor's chat mark it the same way. When a turn of a Trama conversation in Cursor ends, the only possible release is of **every** taken Task of the project, which is also what the Technology Requirement for cursor-chat asks (it acts on the project's taken Tasks). Nothing has been implemented for this Task yet.

## What should happen

The Model releases, on `AGENT_STOPPED`, `AGENT_INTERRUPTED` and `CONVERSATION_CLOSED`, **only** the Tasks taken by Cursor's chat agent. With an agent working in the Trama agent terminal at the same time, its Tasks must stay taken. That cannot be done without knowing who took each Task, and the Data Requirement for task gives the mark no such information.

## Fix options

### Release every taken Task

The end of a Trama conversation's turn in Cursor releases every Task of the project taken by any agent, as the end of the terminal command already does. The Model drops the condition **only for the Tasks taken by Cursor's chat agent**. Cost: a terminal agent working on the same project at the same moment loses its Tasks and takes them again when it next moves them.

### Record who took the Task

The mark says where the agent works (the terminal or Cursor's chat), and the end of a turn releases only the chat's Tasks. The Data Requirement for task gains this field; Tasks written before it count as the terminal's. Cost: a data change, and the terminal's end should then be reconsidered too, since today it releases the chat's Tasks as well.

## Where in the code

extension/src/host/agent.ts (release on the end of the terminal command); src/core/work.ts (the mark on the Task)
