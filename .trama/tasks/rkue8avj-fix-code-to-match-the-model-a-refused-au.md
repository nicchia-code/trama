---
column: done
technical: false
refs:
  - drift-resolution/Free/drift-resolution.COLLECTION_STARTED
  - requirements/rules#drift-resolution
drift: 6vgjf04b
proposal: null
agent: false
created: 2026-10-11T05:47:15.570Z
finished: 2026-10-11T05:54:22.697Z
---
# Fix code to match the Model: A refused automatic start marks its Drifts or Tasks as failed

## What happens

When the automatic start is refused at the last moment, because a developer scan or a Run began or the mode changed, the Drifts of the collection, or the Tasks of the Run, are recorded as failed with the reason not delivered to an agent. They stay out until the developer asks again.

## What should happen

A refused start only releases its reservation and leaves no unfinished work. The cases did not fail, so they stay open and eligible for the next cycle. Only a case whose fix really fails is recorded as failed.

## Chosen option

**Leave refused cases eligible**

A refused start releases the reservation and records nothing against the cases. The next cycle, after the blocking scan or Run ends, takes them again. Cost: a start refused for a lasting reason is retried quietly at each check until its cause goes away.

## Where in the code

extension/src/host/controller.ts (startAutomaticResolution, startAuthorizedRun, failCollection)
