---
column: done
technical: false
refs:
  - drift-resolution/Free/developer.ASK_AGENT
  - requirements/tech#drift-resolution
drift: null
proposal: null
agent: false
created: 2026-10-11T05:45:19.821Z
finished: 2026-10-11T05:51:24.598Z
---
# Forward a Resolve Drifts request to the project coordinator

In a window that does not coordinate the project, pressing Resolve Drifts only resumes this window, so the automatic part waits for the coordinator, which stays unresumed until one of its own scans ends. The request must reach the coordinator, which resumes the delegation and starts the automatic collection there. Until a coordinator has resumed, the window says why the automatic part waits. The manual part is unchanged.
