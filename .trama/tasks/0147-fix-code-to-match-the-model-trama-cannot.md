---
column: done
technical: false
refs:
  - task/Taken by the agent/cursor-chat.AGENT_STOPPED
drift: "0010"
proposal: null
agent: false
---
# Fix code to match the Model: Trama cannot tell which agent took a Task

## What happens

A taken Task only records **that** the agent has it, not **which** agent: the terminal Trama started and Cursor's chat mark it the same way. When a turn of a Trama conversation in Cursor ends, the only possible release is of **every** taken Task of the project, which is also what the Technology Requirement for cursor-chat asks (it acts on the project's taken Tasks). Nothing has been implemented for this Task yet.

## What should happen

The Model releases, on `AGENT_STOPPED`, `AGENT_INTERRUPTED` and `CONVERSATION_CLOSED`, **only** the Tasks taken by Cursor's chat agent. With an agent working in the Trama agent terminal at the same time, its Tasks must stay taken. That cannot be done without knowing who took each Task, and the Data Requirement for task gives the mark no such information.

## Chosen option

**Release every taken Task**

The end of a Trama conversation's turn in Cursor releases every Task of the project taken by any agent, as the end of the terminal command already does. The Model drops the condition **only for the Tasks taken by Cursor's chat agent**. Cost: a terminal agent working on the same project at the same moment loses its Tasks and takes them again when it next moves them.

## Note

Diamo per scontato che si usi un sistema alla volta (chat o terminal)

## Where in the code

extension/src/host/agent.ts (release on the end of the terminal command); src/core/work.ts (the mark on the Task)
