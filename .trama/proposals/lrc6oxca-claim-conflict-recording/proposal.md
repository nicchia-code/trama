---
status: approved
kind: resolution
drifts:
  - drift: 3qayh3mn
    decision: proposal
base:
  requirements/data/prenotazioni.md: 424d25557529e848a30cd5b9635eaf064056903ba52a04b74d55ed89a02effc7
  requirements/rules/prenotazioni.md: ae1e848d3eff308cd33bfd305fc144a0da1a6b3cbbc1405d7626b510a20f7fe8
  requirements/tech/prenotazioni.md: 7a39b4e3c0fad8714cdfbf26ab2297fc5cbbcd69fb6053aa9f03eea24c31cc9d
delete: []
created: 2026-10-24T09:18:15.687Z
---
# Claim conflict recording

Resolves:

- D1 – Writer Task of multi-Task Runs: `proposal`. The Requirements now say who records the conflict when a claimed file stops a sub-agent with Parallel Execution on: the hook in a Run of a single Task, the main agent in a Run over several Tasks, from the stopped sub-agent's report. The claim may keep the Task of the holder's Run when the Run implements a single Task.
