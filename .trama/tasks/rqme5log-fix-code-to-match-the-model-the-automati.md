---
column: done
technical: false
refs:
  - drift-resolution/Resolving
  - requirements/rules#drift-resolution
drift: 1alqj9qe
proposal: null
agent: false
created: 2026-10-11T05:07:16.528Z
finished: 2026-10-11T05:16:41.442Z
---
# Fix code to match the Model: The automatic Run waits for scans started after the collection

## What happens

After the resolution agent ends and its Proposal is approved, the automatic Run of the corrections does not start while any scan of the project is still running, even one launched after the collection was photographed. It starts only when that scan ends.

## What should happen

A scan started after the collection does not interrupt preparation, approval or the Run of that collection. Only Runs and the resolution agent exclude the Run; the new scan's Drifts go to the next cycle, which waits for it.

## Chosen option

**Ignore later scans for the Run**

Only a Run or a resolution job blocks the automatic Run. Small change in the launch conditions; a Run and a scan then work together, as manual Runs already allow.

## Where in the code

extension/src/host/controller.ts (automatic Run start and its send check)
