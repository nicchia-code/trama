---
column: done
technical: false
refs:
  - drift-resolution/In attesa delle scansioni/agent.FINISH_CHECK
  - requirements/rules#drift-resolution
  - requirements/tech#drift-resolution
drift: null
proposal: null
agent: false
created: 2026-10-11T05:03:13.744Z
finished: 2026-10-11T05:10:05.215Z
---
# Report the last failed scan in the autopilot status

When the developer asks the autopilot for its status, the answer also tells the last scan of the project that failed or was interrupted, as plain information. It never changes the phase, never adds a new warning, and a later successful scan started by the developer clears it. It appears in both the readable and the JSON output.
