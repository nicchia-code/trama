---
status: resolved
resolution: fix-code
refs:
  - requirements/rules#agent-terminal
proposal: null
task: cb87c028
origin: null
option: null
note: null
created: 1970-01-01T00:00:00.008Z
---
# Run instructions skip blocked Tasks, the Requirement says stop

## What happens

The instructions sent for **implement all** and **implement a design** tell the agent to skip the Tasks that are blocked, go on with the others even after it files a Drift, and list at the end the skipped Tasks with the Drift that blocks each. This matches what the rules of the Task say about running a design.

## What should happen

The Requirement for the instructions sent to the agent still words both as "one after the other. Stop at the first Drift you file.", so the agent is told to stop at the first Drift. The two texts disagree: one of them is out of date.

## Where in the code

extension/src/host/prompts.ts (buildPrompt, cases implement-all and implement-design)
