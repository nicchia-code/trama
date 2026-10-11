---
column: done
technical: false
refs:
  - drift-resolution/Running tasks
  - drift-resolution/Resolving
drift: null
proposal: null
agent: false
created: 2026-10-11T06:02:15.030Z
finished: 2026-10-11T06:13:40.225Z
---
# Read how an agent command ended, so an abnormal end is reported and does not start a Run

When the command Trama wrote for an automatic Run ends abnormally, the Tasks already done stay done, and the autopilot status reports the failure with its reason; the Tasks not yet done stay out of the automatic collection. When the command of the resolution agent ends abnormally, the approved fixes do not authorize an automatic Run: only a normal end does. The end status of the command is read to tell the two apart.
