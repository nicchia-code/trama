---
status: resolved
resolution: fix-code
refs:
  - requirements/tech#announcement
  - announcement/Checking/agent.FINISH_CHECK
proposal: null
task: b8jqa34r
origin: null
critical: false
option: 1
note: null
resolvedBy: yrcijkdi
created: 2026-10-11T05:23:07.876Z
---
# A finished check removes its ghost before its outcome is sent to the editor

## What happens

When the agent says a check is done, its ghost is removed first, and only then is the outcome sent to the editor over the local channel.

## What should happen

The outcome is sent to the editor first, and only then the ghost goes; the ghost still goes at once when no editor is there.

## Fix options

### Send first, then remove the ghost

The outcome is sent to the editor before the ghost is removed. The ghost still goes at once when no editor answers, because the removal does not wait for an answer. Costs a short wait for the send before the ghost disappears.

### Keep the current order

The ghost goes at once and the outcome is sent afterwards. This is simpler and fast, but it breaks the stated order of the Requirement; it changes the Requirement's wording to match the code.
