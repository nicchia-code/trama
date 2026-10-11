---
column: done
technical: false
refs:
  - drift-resolution/Free/developer.ASK_AGENT
  - requirements/data#drift-resolution
  - requirements/rules#drift-resolution
drift: null
proposal: null
agent: false
created: 2026-10-11T06:28:34.479Z
finished: 2026-10-11T06:32:06.263Z
---
# Keep a skipped Drift out of automatic resolution in every editor window

A Drift whose question the developer skipped must stay out of automatic collections whichever editor window runs the Resolve Drifts round. Today the skip is recorded only in the window that ran the round, so the window that coordinates the project can still pick the Drift. Forward the skip to the coordinator, so it keeps the failed case with its reason until the Drift changes, a developer scan starts, or its question is answered in a later round.
