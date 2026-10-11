---
column: done
technical: true
refs:
  - requirements/tech#proposal
drift: null
proposal: null
agent: false
created: 2026-10-11T06:57:35.780Z
finished: 2026-10-11T07:02:13.281Z
---
# Have trama-scan hand each sub-agent its open Tasks, open Drifts and scope references (technical)

The trama-scan skill must tell the agent that, when it gives a Machine's comparison to a sub-agent, it passes along the open Tasks and open Drifts that concern that Machine (read once from the Task and Drift lists) and, in a targeted scan, the scope references of that Machine to compare. Today the skill only says to give each Machine to a sub-agent that reads its full view, files its own cards and returns their list, so a sub-agent has no way to avoid duplicating open cards or to know which references it must compare. The rest of the Requirement already holds: at most N sub-agents at once, no triage, General Requirements kept by the main agent, one final report written by the main agent.
