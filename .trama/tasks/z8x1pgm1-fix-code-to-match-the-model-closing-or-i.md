---
column: done
technical: false
refs:
  - drift-resolution/Resolving
drift: gpo36r35
proposal: null
agent: false
created: 2026-10-11T06:03:57.698Z
finished: 2026-10-11T06:15:29.419Z
---
# Fix code to match the Model: Closing or interrupting the resolution agent still starts its automatic Run

## What happens

The automatic resolution was approved, and then the terminal or chat of its agent is closed, interrupted or its conversation is closed before the agent finishes. The automatic Run of the approved fixes and their origins starts anyway.

## What should happen

Closing, interrupting or closing the conversation of the resolution agent never starts a Run; only its normal end does. The approved fixes then wait for the developer, and no Run starts unattended.

## Chosen option

**Start the Run only after a normal end**

The Run starts only when the resolution agent ends normally: its hook reports idle, its command ends, or its chat turn stops. A closed, interrupted or abandoned resolution keeps its approved fixes in To do and ends the automatic collection, so the developer starts them by hand. Cost: a closed window can leave approved fixes waiting for a manual start.

## Where in the code

extension/src/host/controller.ts (advanceCollection); extension/src/host/agent.ts (finishAgentTerminal, chat end handlers)
