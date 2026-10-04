---
column: done
technical: true
refs:
  - requirements/tech#task
  - requirements/rules#task
drift: null
proposal: null
agent: false
---
# Make trama-implement stop at the first Drift

The skill that implements Tasks stops the run at the first Drift, always. When it files a Drift, it leaves the Task In progress, takes no further Task, blocked or not, and reports what it implemented and the Drift that stopped it. When the move of a Task to In progress is refused because the Task is blocked, whether it is the one it was given or the next in the run, it stops too and reports the Task and the Drift (or fix Task) the refusal names, without skipping it or going on with another. Picking the next Task of a run no longer skips the ones marked blocked: a blocked one ends the run. The skill's description, introduction, steps, the section on filing a Drift and the final report all say the same, with no leftover wording about skipping or going on.
