---
column: done
technical: false
refs:
  - omp-chat-general/Kept after switch-off
drift: b7ynmi87
proposal: null
agent: false
created: 2026-10-24T20:01:48.052Z
finished: 2026-10-24T20:47:04.634Z
---
# Fix code to match the Model: General clears on re-enable

## What happens

When omp Chat is turned back on while General is kept with its agent still in a turn, the System stops that agent, drops its conversation and starts a new empty omp, without asking the developer.

## What should happen

General returns to its normal state as it was: its agent keeps its turn and its conversation, and the tab shows the eraser again. Nothing is stopped or cleared without the developer's order.

## Chosen option

**Keep the running agent**

When omp Chat comes back on, General goes straight to Ready with its running agent and its conversation, and the tab shows the eraser again. Nothing is stopped or cleared. The kept process then follows the normal rules of a Ready General: its exit, its stop and the window closing. This changes the transition from kept on a switch-on, and the host no longer restarts omp in that case.

## Where in the code

src/core/omp-chat-general.ts, the kept case of transition (line 119) and the ready case that enters kept (line 97); extension/src/host/omp-chat/general.ts, the effects stop, discard, cleared and start run on that transition.
