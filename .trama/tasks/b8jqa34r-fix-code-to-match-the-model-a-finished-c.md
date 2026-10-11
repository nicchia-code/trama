---
column: done
technical: false
refs:
  - requirements/tech#announcement
  - announcement/Checking/agent.FINISH_CHECK
drift: oft1dgty
proposal: null
agent: false
created: 2026-10-11T05:30:19.982Z
finished: 2026-10-11T05:35:39.593Z
---
# Fix code to match the Model: A finished check removes its ghost before its outcome is sent to the editor

## What happens

When the agent says a check is done, its ghost is removed first, and only then is the outcome sent to the editor over the local channel.

## What should happen

The outcome is sent to the editor first, and only then the ghost goes; the ghost still goes at once when no editor is there.

## Chosen option

**Send first, then remove the ghost**

The outcome is sent to the editor before the ghost is removed. The ghost still goes at once when no editor answers, because the removal does not wait for an answer. Costs a short wait for the send before the ghost disappears.
