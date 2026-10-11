---
status: resolved
resolution: fix-code
refs:
  - drift-resolution/Free/drift-resolution.COLLECTION_STARTED
  - requirements/rules#drift-resolution
proposal: null
task: rkue8avj
origin: null
critical: false
option: 1
note: null
resolvedBy: n3pqhhy2
created: 2026-10-11T05:45:10.098Z
---
# A refused automatic start marks its Drifts or Tasks as failed

## What happens

When the automatic start is refused at the last moment, because a developer scan or a Run began or the mode changed, the Drifts of the collection, or the Tasks of the Run, are recorded as failed with the reason not delivered to an agent. They stay out until the developer asks again.

## What should happen

A refused start only releases its reservation and leaves no unfinished work. The cases did not fail, so they stay open and eligible for the next cycle. Only a case whose fix really fails is recorded as failed.

## Fix options

### Leave refused cases eligible

A refused start releases the reservation and records nothing against the cases. The next cycle, after the blocking scan or Run ends, takes them again. Cost: a start refused for a lasting reason is retried quietly at each check until its cause goes away.

### Keep marking refused cases as failed

Keep the current rule: the refusal is recorded with its reason and the cases wait for an explicit request. Cost: a scan started at the same moment holds the Drifts back silently until the developer presses Resolve Drifts.

## Where in the code

extension/src/host/controller.ts (startAutomaticResolution, startAuthorizedRun, failCollection)
