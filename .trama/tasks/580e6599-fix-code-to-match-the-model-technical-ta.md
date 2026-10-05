---
column: done
technical: false
refs:
  - task
  - requirements/rules#task
drift: 70da3f38
proposal: null
agent: false
created: 1970-01-01T00:00:00.046Z
---
# Fix code to match the Model: Technical Tasks are grouped into designs although the Task Model excludes them

The Task Model explicitly says a Technical Task is not part of any design (.trama/model/work/task.md:5). The code accepts a Proposal link for technical Tasks without excluding them (src/core/work.ts:119-128) and groups all linked Tasks without checking technical status (src/core/design.ts:35-48). A disposable project probe created an open Proposal and two technical Tasks linked to it; the actual textual Board displayed one Proposal design with a 0/2 done counter containing both technical Tasks. This is observable design membership contrary to the Model. requirements/rules#task meanwhile says a Task may be linked to a Proposal at creation and that linked Tasks form a design, without an explicit exception for technical Tasks; that general wording must also be reconciled with the Model's exclusion. No open card covers this discrepancy. The developer must decide whether the code's eligibility is narrowed to the Model or the Model and Requirements are changed through a Proposal. No resolution is selected and no code or repository Model/Requirements changed during the probe.
