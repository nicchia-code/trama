---
column: done
technical: false
refs:
  - announcement/Verifying/agent.CHANGE_CHECK_PHASE
  - requirements/tech#announcement
drift: null
proposal: null
agent: false
created: 2026-10-11T05:23:07.131Z
finished: 2026-10-11T05:33:20.990Z
---
# Forward a check's move to Scanning to the editor over the local channel

When the agent moves a finished-or-running check from Verifying to Scanning, the editor is told over the local channel that the check changed phase, with the check's job when it has one, so the coordinator sees the scan start. A phase move that changes nothing is not forwarded. Nothing is written to a file for it.
