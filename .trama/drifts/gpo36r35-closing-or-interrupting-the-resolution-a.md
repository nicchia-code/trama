---
status: resolved
resolution: fix-code
refs:
  - drift-resolution/Resolving
proposal: null
task: z8x1pgm1
origin: null
critical: false
option: 1
note: null
resolvedBy: j3ku754e
created: 2026-10-11T06:01:50.906Z
---
# Closing or interrupting the resolution agent still starts its automatic Run

## What happens

The automatic resolution was approved, and then the terminal or chat of its agent is closed, interrupted or its conversation is closed before the agent finishes. The automatic Run of the approved fixes and their origins starts anyway.

## What should happen

Closing, interrupting or closing the conversation of the resolution agent never starts a Run; only its normal end does. The approved fixes then wait for the developer, and no Run starts unattended.

## Fix options

### Start the Run only after a normal end

The Run starts only when the resolution agent ends normally: its hook reports idle, its command ends, or its chat turn stops. A closed, interrupted or abandoned resolution keeps its approved fixes in To do and ends the automatic collection, so the developer starts them by hand. Cost: a closed window can leave approved fixes waiting for a manual start.

### Keep the authorization for the next request

A closed or interrupted resolution starts no Run at once. Its approved fixes and origins stay an authorized collection, and the next explicit Resolve Drifts request starts their Run once no agent works. Cost: the authorization outlives the window, so the coordinator must keep it and check it again before any step.

## Where in the code

extension/src/host/controller.ts (advanceCollection); extension/src/host/agent.ts (finishAgentTerminal, chat end handlers)
