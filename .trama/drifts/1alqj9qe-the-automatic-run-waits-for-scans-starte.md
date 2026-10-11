---
status: resolved
resolution: fix-code
refs:
  - drift-resolution/Resolving
  - requirements/rules#drift-resolution
proposal: null
task: rqme5log
origin: null
critical: false
option: 1
note: null
resolvedBy: ej18oyqh
created: 2026-10-11T05:03:14.167Z
---
# The automatic Run waits for scans started after the collection

## What happens

After the resolution agent ends and its Proposal is approved, the automatic Run of the corrections does not start while any scan of the project is still running, even one launched after the collection was photographed. It starts only when that scan ends.

## What should happen

A scan started after the collection does not interrupt preparation, approval or the Run of that collection. Only Runs and the resolution agent exclude the Run; the new scan's Drifts go to the next cycle, which waits for it.

## Fix options

### Ignore later scans for the Run

Only a Run or a resolution job blocks the automatic Run. Small change in the launch conditions; a Run and a scan then work together, as manual Runs already allow.

### Keep waiting and change the Model

Say in the Resolving transitions that the Run waits for every scan. Cheap, but the delay contradicts the rule that later scans do not interrupt the collection.

## Where in the code

extension/src/host/controller.ts (automatic Run start and its send check)
