---
column: done
technical: true
refs:
  - requirements/rules#agent-terminal
drift: cdbe0584
proposal: null
agent: false
created: 1970-01-01T00:00:00.085Z
---
# Fix code to match the Requirements: Run instructions skip blocked Tasks, the Requirement says stop

The code and the Requirement behave the same way, and the way chosen is to stop at Drifts. The instructions sent for **implement all** and **implement a design** tell the agent to work on the Tasks in the "todo" column in order, one after the other, and to stop at the first Drift it files, exactly as the Requirement words them. They no longer tell the agent to skip the blocked Tasks, to go on after filing a Drift, or to list the skipped Tasks at the end.

Where in the code: extension/src/host/prompts.ts (buildPrompt, cases implement-all and implement-design).
